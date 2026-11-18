// Ember Bay v5 — recorded re-apply under R7; behaviour unchanged
// HUD: money, stars, weapons, bars, EBPD panel, mission line, speed and the
// round minimap with compass, district label and unit markers.
import { ROADS, DIAGONALS, ROUNDABOUT, nsPlain, ewPlain, crossing, districtAt } from './city.js';

const WEAPONS = [
  { key: '1', name: 'FISTS' },
  { key: '2', name: 'PISTOL 30' },
  { key: '3', name: 'SMG' },
  { key: '4', name: 'RIFLE' },
  { key: '5', name: 'SHOTGUN' },
];

export function initHud(G) {
  const $ = (id) => document.getElementById(id);
  const el = {
    hud: $('hud'), ebpd: $('ebpd'), mission: $('mission'), clock: $('clock'),
    money: $('money'), stars: $('stars'), weapons: $('weapons'),
    minimap: $('minimap'), district: $('district'), tapes: $('tapes'),
    healthBar: $('healthBar'), armourBar: $('armourBar'), respectBar: $('respectBar'),
    healthTxt: $('healthTxt'), armourTxt: $('armourTxt'), respectTxt: $('respectTxt'),
    speed: $('speed'), speedlines: $('speedlines'), banner: $('banner'), toast: $('toast'),
    title: $('title'),
  };
  const mm = el.minimap.getContext('2d');
  let toastTimer = 0;

  const H = {
    showMission(text) { el.mission.textContent = text; },
    toast(text) {
      el.toast.textContent = text;
      toastTimer = 3;
    },
    banner(main, sub, sticky = false) {
      el.banner.innerHTML = `${main}${sub ? `<small>${sub}</small>` : ''}`;
      el.banner.classList.remove('hidden');
      if (!sticky) setTimeout(() => el.banner.classList.add('hidden'), 2600);
    },
    setMenu(menu) {
      el.title.classList.toggle('hidden', !menu);
      el.hud.classList.toggle('hidden', menu);
    },
    update(dt) {
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) el.toast.textContent = '';
      }
      const hrs = Math.floor(G.clock);
      const mins = Math.floor((G.clock - hrs) * 60);
      const hh = String(hrs).padStart(2, '0');
      const mmn = String(mins).padStart(2, '0');
      el.clock.textContent = `DAY ${G.day} · ${hh}:${mmn} · BAY FM 98.2 — Sunset Drive`;
      el.money.textContent = `$${G.money}`;
      let stars = '';
      for (let i = 0; i < 5; i++) stars += `<span class="${i < G.police.wanted ? 'on' : 'off'}">★</span>`;
      el.stars.innerHTML = stars;
      el.weapons.innerHTML = WEAPONS.map((w, i) =>
        `<span class="${i === G.weaponIdx ? 'sel' : ''}">${i + 1} ${w.name}</span>`).join('');
      el.healthBar.firstElementChild.style.width = `${Math.max(0, G.health)}%`;
      el.armourBar.firstElementChild.style.width = `${Math.max(0, G.armour)}%`;
      el.respectBar.firstElementChild.style.width = `${G.respect}%`;
      el.healthTxt.textContent = Math.round(G.health);
      el.armourTxt.textContent = Math.round(G.armour);
      el.respectTxt.textContent = `${Math.round(G.respect)}%`;
      el.tapes.textContent = `Sunset Tapes ${G.tapesFound}/20`;
      const kmh = G.vehicle ? Math.round(Math.abs(G.vehicle.speed) * 2.5) : Math.round(Math.abs(G.player.speed) * 2.5);
      el.speed.innerHTML = `${kmh} <small>km/h</small>`;
      el.speedlines.style.opacity = G.vehicle && Math.abs(G.vehicle.speed) > 24 ? String(Math.min(0.8, (Math.abs(G.vehicle.speed) - 24) / 20)) : '0';
      // EBPD panel
      const rows = G.police.ebpd();
      if (rows.length > 0) {
        el.ebpd.classList.remove('hidden');
        el.ebpd.innerHTML = `<b>🚨 EBPD RESPONSE</b> — ${rows.length} UNIT${rows.length > 1 ? 'S' : ''}, CODE ${G.police.wanted}<br>` +
          rows.map((r) => `<div class="unit">${r.callsign} · ${r.dist}m · <b>${r.status}</b></div>`).join('') +
          (G.police.wanted > 0 ? `<div>Lose them — EVADING ${Math.round(G.police.evading)}%</div>` : '');
      } else {
        el.ebpd.classList.add('hidden');
      }
      // minimap
      const S = 170, W2 = 920; // world -460..460 maps to 0..170
      const toMap = (x, z) => [((x + 460) / W2) * S, ((z + 460) / W2) * S];
      mm.clearRect(0, 0, S, S);
      mm.fillStyle = '#0c2b12'; mm.fillRect(0, 0, S, S);
      // ocean strip on the west edge
      mm.fillStyle = '#1a7f8e'; mm.fillRect(0, 0, 5, S);
      // blocks (irregular quadrilaterals between the curved roads)
      mm.fillStyle = '#3a4a2f';
      for (let ix = 0; ix < ROADS.ns.length - 1; ix++) {
        for (let iz = 0; iz < ROADS.ew.length - 1; iz++) {
          const c00 = crossing(ROADS.ns[ix], ROADS.ew[iz]);
          const c01 = crossing(ROADS.ns[ix], ROADS.ew[iz + 1]);
          const c10 = crossing(ROADS.ns[ix + 1], ROADS.ew[iz]);
          const c11 = crossing(ROADS.ns[ix + 1], ROADS.ew[iz + 1]);
          const p = [c00, c10, c11, c01].map((c) => toMap(c.x, c.z));
          mm.beginPath();
          mm.moveTo(p[0][0], p[0][1]);
          for (let i = 1; i < 4; i++) mm.lineTo(p[i][0], p[i][1]);
          mm.closePath(); mm.fill();
        }
      }
      // roads: curved polylines, diagonals, roundabout ring
      mm.strokeStyle = '#c9b458'; mm.lineWidth = 2;
      const strokeRoad = (pts) => {
        mm.beginPath();
        pts.forEach(([x, z], i) => { const [mx, mz] = toMap(x, z); if (i === 0) mm.moveTo(mx, mz); else mm.lineTo(mx, mz); });
        mm.stroke();
      };
      for (const road of ROADS.ns) {
        const pts = [];
        for (let z = -460; z <= 460; z += 20) pts.push([nsPlain(road, z), z]);
        strokeRoad(pts);
      }
      for (const road of ROADS.ew) {
        const pts = [];
        for (let x = -460; x <= 460; x += 20) pts.push([x, ewPlain(road, x)]);
        strokeRoad(pts);
      }
      for (const [ax, az, bx, bz] of DIAGONALS) strokeRoad([[ax, az], [bx, bz]]);
      {
        const [rx, rz] = toMap(ROUNDABOUT.cx, ROUNDABOUT.cz);
        mm.beginPath(); mm.arc(rx, rz, (ROUNDABOUT.r / W2) * S, 0, Math.PI * 2); mm.stroke();
      }
      // mission marker
      if (G.missions.active && G.missions.marker) {
        const [mx, mz] = toMap(G.missions.marker.position.x, G.missions.marker.position.z);
        mm.fillStyle = '#ffe14d';
        mm.beginPath(); mm.moveTo(mx, mz - 6); mm.lineTo(mx + 5, mz); mm.lineTo(mx, mz + 6); mm.lineTo(mx - 5, mz); mm.closePath(); mm.fill();
      }
      // police dots
      mm.fillStyle = '#6ec6ff';
      for (const u of G.police.units) {
        const [ux, uz] = toMap(u.pos.x, u.pos.z);
        mm.beginPath(); mm.arc(ux, uz, 3, 0, Math.PI * 2); mm.fill();
      }
      if (G.police.heli) {
        const [hx, hz] = toMap(G.police.heli.group.position.x, G.police.heli.group.position.z);
        mm.fillStyle = '#ffffff';
        mm.beginPath(); mm.arc(hx, hz, 3.5, 0, Math.PI * 2); mm.fill();
      }
      // player arrow
      const [px, pz] = toMap(G.playerPos.x, G.playerPos.z);
      mm.save();
      mm.translate(px, pz);
      mm.rotate(Math.atan2(Math.sin(G.playerHeading), Math.cos(G.playerHeading)));
      mm.fillStyle = '#ff2d55';
      mm.beginPath(); mm.moveTo(0, -7); mm.lineTo(5, 6); mm.lineTo(-5, 6); mm.closePath(); mm.fill();
      mm.restore();
      // compass N
      mm.fillStyle = '#fff'; mm.font = 'bold 11px Verdana'; mm.textAlign = 'center';
      mm.fillText('N', S / 2, 12);
      const d = districtAt(G.playerPos.x, G.playerPos.z);
      el.district.textContent = d.name;
    },
  };
  return H;
}
