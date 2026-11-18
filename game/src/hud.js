// Ember Bay v8 — HUD: mission banner, EBPD panel, weapon slots with ammo
// and locks, dialogue box with blocky portraits, car + radio panels,
// drift panel, crosshair, and the full city map overlay (M key).
import { ROADS, DISTRICTS, DIAGONALS, ROUNDABOUT, nsPlain, ewPlain, crossing, districtAt } from './city.js';

// Weapons: mag / reserve ammo, and the respect needed to unlock.
const WEAPONS = [
  { key: '1', name: 'FISTS', mag: '∞', lock: 0 },
  { key: '2', name: 'PISTOL', mag: 12, reserve: 60, lock: 0 },
  { key: '3', name: 'SMG', mag: 32, reserve: 160, lock: 20 },
  { key: '4', name: 'RIFLE', mag: 30, reserve: 120, lock: 40 },
  { key: '5', name: 'SHOTGUN', mag: 8, reserve: 24, lock: 60 },
];

const CREW = [
  { who: 'mara', name: 'MARA VOSS', role: 'FIXER' },
  { who: 'deke', name: 'DEKE RAMOS', role: 'WHEELMAN' },
  { who: 'vic', name: 'VIC TORRES', role: 'CREW BOSS' },
  { who: 'rosa', name: 'ROSA DELGADO', role: 'LOOKOUT' },
  { who: 'kip', name: 'KIP MARLOWE', role: 'RUNNER' },
];

// Blocky pixel portraits, painted on a canvas — one look per character.
function drawPortrait(canvas, who) {
  const g = canvas.getContext('2d');
  const S = canvas.width;
  const u = S / 8; // one cell
  const styles = {
    mara: { bg: '#7a2a4a', skin: '#d9a066', hair: '#14141c', acc: '#ffd24d' },
    deke: { bg: '#2a4a7a', skin: '#b07a4a', hair: '#e02030', acc: '#2a2a2a' },
    vic: { bg: '#3a3a3a', skin: '#e8b98a', hair: '#cccccc', acc: '#2a2a2a' },
    rosa: { bg: '#4a2a6a', skin: '#d9a066', hair: '#2a1410', acc: '#ffd24d' },
    kip: { bg: '#2a6a4a', skin: '#e8b98a', hair: '#e8c820', acc: '#ff2d55' },
  };
  const st = styles[who] || styles.mara;
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x * u, y * u, w * u, h * u); };
  g.fillStyle = st.bg; g.fillRect(0, 0, S, S);
  // shoulders / jacket
  R(1, 6.4, 6, 1.6, who === 'vic' ? '#222831' : '#3a2a4a');
  // face
  R(2.2, 2.2, 3.6, 4, st.skin);
  // hair
  if (who === 'mara') { R(2, 1.2, 4, 1.4, st.hair); R(2, 2.2, 0.7, 2.6, st.hair); R(5.3, 2.2, 0.7, 2.6, st.hair); }
  else if (who === 'deke') { R(2, 1.2, 4, 1, st.hair); R(1.8, 2.2, 4.4, 0.5, st.hair); R(2.8, 4.6, 2.4, 0.7, '#3a2a22'); }
  else if (who === 'vic') { R(2.2, 1.4, 3.6, 0.9, st.hair); R(2.2, 5.4, 3.6, 0.8, '#dddddd'); }
  else if (who === 'rosa') { R(1.6, 1, 4.8, 1.6, st.hair); R(1.6, 2.6, 0.8, 3.8, st.hair); R(5.6, 2.6, 0.8, 3.8, st.hair); }
  else { R(2.2, 1.4, 3.6, 1, st.hair); R(2.2, 2.2, 3.6, 0.4, st.acc); }
  // eyes
  R(2.9, 3.4, 0.7, 0.7, '#141414');
  R(4.4, 3.4, 0.7, 0.7, '#141414');
  if (who === 'vic') { g.strokeStyle = '#222222'; g.lineWidth = u * 0.18; g.strokeRect(2.6 * u, 3.2 * u, 1.2 * u, 1.1 * u); g.strokeRect(4.2 * u, 3.2 * u, 1.2 * u, 1.1 * u); }
  // mouth
  R(3.2, 5, 1.6, 0.45, '#8a3a2a');
  // accessories
  if (who === 'mara') { R(2, 5.6, 0.4, 0.4, st.acc); R(5.6, 5.6, 0.4, 0.4, st.acc); }
  if (who === 'rosa') { R(1.9, 5.2, 0.5, 0.5, st.acc); R(5.6, 5.2, 0.5, 0.5, st.acc); }
  if (who === 'kip') { R(2.2, 2.4, 3.6, 0.35, st.acc); }
}

export function initHud(G) {
  const $ = (id) => document.getElementById(id);
  const el = {
    hud: $('hud'), ebpd: $('ebpd'), missionBanner: $('missionBanner'),
    mbCh: $('mbCh'), mbName: $('mbName'), mbTimer: $('mbTimer'), mbObj: $('mbObj'),
    mbHint: $('mbHint'), mbStageFill: $('mbStageFill'), mbNext: $('mbNext'),
    clock: $('clock'), money: $('money'), stars: $('stars'), insight: $('insight'),
    weapons: $('weapons'), minimap: $('minimap'), district: $('district'), tapes: $('tapes'),
    healthBar: $('healthBar'), armourBar: $('armourBar'), respectBar: $('respectBar'),
    healthTxt: $('healthTxt'), armourTxt: $('armourTxt'), respectTxt: $('respectTxt'), respectLvl: $('respectLvl'),
    radioStation: $('radioStation'), radioSong: $('radioSong'),
    carPanel: $('carPanel'), carName: $('carName'), carCondFill: $('carCondFill'), carCondTxt: $('carCondTxt'),
    carSpeed: $('carSpeed'), carGear: $('carGear'),
    driftPanel: $('driftPanel'), driftPts: $('driftPts'), driftCombo: $('driftCombo'), driftBanked: $('driftBanked'),
    dialogue: $('dialogue'), dlgPortrait: $('dlgPortrait'), dlgName: $('dlgName'), dlgRole: $('dlgRole'), dlgLine: $('dlgLine'),
    crosshair: $('crosshair'), speedlines: $('speedlines'), banner: $('banner'), toast: $('toast'),
    title: $('title'), crewRow: $('crewRow'),
    mapOverlay: $('mapOverlay'), mapCanvas: $('mapCanvas'), mapStoryList: $('mapStoryList'),
    mapJob: $('mapJob'), mapLegend: $('mapLegend'), mapStats: $('mapStats'),
  };
  const mm = el.minimap.getContext('2d');
  const mapCtx = el.mapCanvas.getContext('2d');
  let toastTimer = 0;
  let dlgTimer = 0;

  // Crew portraits on the title screen.
  for (const c of CREW) {
    const d = document.createElement('div');
    d.className = 'crew';
    const cv = document.createElement('canvas');
    cv.width = 56; cv.height = 56;
    drawPortrait(cv, c.who);
    const nm = document.createElement('div');
    nm.className = 'cn2'; nm.textContent = c.name.split(' ')[0];
    const rl = document.createElement('div');
    rl.className = 'cr'; rl.textContent = c.role;
    d.append(cv, nm, rl);
    el.crewRow.appendChild(d);
  }

  const H = {
    showMission() { /* banner is driven by missions.banner() in update() */ },
    toast(text) {
      el.toast.textContent = text;
      toastTimer = 3;
    },
    banner(main, sub, sticky = false) {
      el.banner.innerHTML = `${main}${sub ? `<small>${sub}</small>` : ''}`;
      el.banner.classList.remove('hidden');
      if (!sticky) setTimeout(() => el.banner.classList.add('hidden'), 2600);
    },
    dialogue(name, role, line, who, sticky = false) {
      drawPortrait(el.dlgPortrait, who || 'mara');
      el.dlgName.firstChild.textContent = name + ' ';
      el.dlgRole.textContent = role;
      el.dlgLine.textContent = line;
      el.dialogue.classList.remove('hidden');
      dlgTimer = sticky ? -1 : 4.5;
    },
    setMenu(menu) {
      el.title.classList.toggle('hidden', !menu);
      el.hud.classList.toggle('hidden', menu);
    },
    showMap(open) {
      el.mapOverlay.classList.toggle('hidden', !open);
      el.hud.classList.toggle('hidden', open);
      G.mapOpen = open;
      if (open) H.renderMap();
    },
    renderMap() {
      // Story job list.
      const M = G.missions;
      el.mapStoryList.innerHTML = '';
      const whoFor = { 1: 'mara', 2: 'deke', 3: 'deke', 4: 'mara', 5: 'mara', 6: 'deke', 7: 'vic', 8: 'mara' };
      M.defs.forEach((d, i) => {
        const done = M.done.has(d.id);
        const active = M.active && M.active.def.id === d.id;
        const locked = !done && !active && (i > 0 && !M.done.has(M.defs[i - 1].id));
        const row = document.createElement('div');
        row.className = 'job' + (done ? ' done' : active ? ' active' : locked ? ' locked' : '');
        const cv = document.createElement('canvas');
        cv.width = 34; cv.height = 34;
        drawPortrait(cv, whoFor[d.id]);
        const tx = document.createElement('div');
        tx.innerHTML = `<div class="jn">${d.id}. ${d.name.toUpperCase()}</div><div class="js">${done ? 'Complete' : active ? 'In progress' : locked ? 'Locked' : 'Available'}</div>`;
        const pay = document.createElement('div');
        pay.className = 'jp'; pay.textContent = `$${d.payout}`;
        row.append(cv, tx, pay);
        el.mapStoryList.appendChild(row);
      });
      // Current job.
      if (M.active) {
        const b = M.banner();
        const d = Math.round(Math.hypot(G.playerPos.x - (M.marker ? M.marker.position.x : 0), G.playerPos.z - (M.marker ? M.marker.position.z : 0)));
        el.mapJob.innerHTML = `<b>${b.name.toUpperCase()}</b> — CH ${b.chapter}<br>${b.objective}<br>STAGE ${b.stage}/${b.stages} · GPS ${d} m`;
      } else {
        el.mapJob.textContent = 'No job running — press E to start the next one.';
      }
      // Legend.
      const legend = [
        ['#ff2d55', '▶', 'You are here'], ['#ffe14d', '●', 'Story contact'], ['#ffe14d', '◆', 'Job objective'],
        ['#7dff5e', '⌂', 'Safehouse'], ['#ff9de2', '✚', 'Weapons'], ['#2fd8ff', '◐', 'Respray (clears heat)'],
        ['#ffd24d', '⚑', 'Street race'], ['#c07dff', '★', 'Property'], ['#ffffff', '+', 'Hospital'],
        ['#6ec6ff', '⬢', 'Police'], ['#ff6fa5', '▣', 'Sunset Tape'],
      ];
      el.mapLegend.innerHTML = legend.map(([c, s, t]) => `<div><span style="color:${c}">${s}</span> ${t}</div>`).join('');
      // Stats.
      const lvl = 1 + Math.floor(G.respect / 20);
      el.mapStats.innerHTML =
        `Cash <span class="stat"><b>$${G.money}</b></span><br>` +
        `Respect level <span class="stat"><b>${lvl}</b></span><br>` +
        `Sunset Tapes <span class="stat"><b>${G.tapesFound} / 20</b></span><br>` +
        `Properties <span class="stat"><b>0 / 2</b></span>`;
      H.drawMap();
    },
    drawMap() {
      const c = mapCtx;
      const W = el.mapCanvas.width, Ht = el.mapCanvas.height;
      const S = 600, ox = (W - S) / 2, oy = (Ht - S) / 2;
      const toMap = (x, z) => [ox + ((x + 460) / 920) * S, oy + ((z + 460) / 920) * S];
      c.clearRect(0, 0, W, Ht);
      c.fillStyle = '#12303a'; c.fillRect(0, 0, W, Ht);
      // land mass
      c.fillStyle = '#b8ac96';
      const [lx, ly] = toMap(-460, -460);
      c.fillRect(lx, ly, S, S);
      // ocean strip west
      c.fillStyle = '#1a7f8e';
      c.fillRect(0, 0, lx, Ht);
      // district blocks + labels
      for (const [x0, z0, x1, z1, name] of DISTRICTS) {
        const [ax, ay] = toMap(x0, z0);
        const [bx, by] = toMap(x1, z1);
        c.fillStyle = 'rgba(90,110,70,0.25)';
        c.fillRect(ax, ay, bx - ax, by - ay);
        c.strokeStyle = 'rgba(255,255,255,0.25)';
        c.strokeRect(ax, ay, bx - ax, by - ay);
        c.fillStyle = '#fff';
        c.font = 'bold 11px Verdana';
        c.textAlign = 'center';
        c.fillText(name.toUpperCase(), (ax + bx) / 2, (ay + by) / 2);
      }
      // roads
      c.strokeStyle = '#e8d27a'; c.lineWidth = 3;
      const strokeRoad = (pts) => {
        c.beginPath();
        pts.forEach(([x, z], i) => { const [mx, mz] = toMap(x, z); if (i === 0) c.moveTo(mx, mz); else c.lineTo(mx, mz); });
        c.stroke();
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
        c.beginPath(); c.arc(rx, rz, (ROUNDABOUT.r / 920) * S, 0, Math.PI * 2); c.stroke();
      }
      // markers
      const dot = (x, z, color, r = 5) => {
        const [mx, mz] = toMap(x, z);
        c.fillStyle = color;
        c.beginPath(); c.arc(mx, mz, r, 0, Math.PI * 2); c.fill();
      };
      const label = (x, z, text) => {
        const [mx, mz] = toMap(x, z);
        c.fillStyle = '#fff'; c.font = 'bold 10px Verdana'; c.textAlign = 'center';
        c.fillText(text, mx, mz - 8);
      };
      // points of interest (original Ember Bay spots)
      dot(-300, 300, '#7dff5e'); label(-300, 300, 'SAFEHOUSE');
      dot(200, -300, '#7dff5e'); label(200, -300, 'SAFEHOUSE');
      dot(150, 150, '#ff9de2'); label(150, 150, 'EMBER ARMS');
      dot(-100, 300, '#2fd8ff'); label(-100, 300, 'SPRAY & GO');
      dot(350, -350, '#ffd24d', 6); label(350, -350, 'MIDNIGHT MILE');
      dot(0, 200, '#ffffff'); label(0, 200, 'EMBER GENERAL');
      dot(0, 0, '#6ec6ff'); label(0, 0, 'EBPD HQ');
      dot(-60, -60, '#ffe14d', 6); label(-60, -60, "MARA'S BAR");
      // remaining tapes
      c.fillStyle = '#ff6fa5';
      for (const t of G.tapes.items.slice(0, 6)) {
        const [mx, mz] = toMap(t.x, t.z);
        c.fillRect(mx - 3, mz - 3, 6, 6);
      }
      // route: player -> objective
      const obj = G.missions.active && G.missions.marker
        ? [G.missions.marker.position.x, G.missions.marker.position.z]
        : null;
      if (obj) {
        const [px, pz] = toMap(G.playerPos.x, G.playerPos.z);
        const [ox2, oz2] = toMap(obj[0], obj[1]);
        c.strokeStyle = '#ffd24d'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(px, pz);
        c.lineTo((px + ox2) / 2, (pz + oz2) / 2 - 20); c.lineTo(ox2, oz2); c.stroke();
        c.fillStyle = '#ffe14d';
        c.beginPath(); c.moveTo(ox2, oz2 - 8); c.lineTo(ox2 + 6, oz2); c.lineTo(ox2, oz2 + 8); c.lineTo(ox2 - 6, oz2); c.closePath(); c.fill();
      }
      // player arrow
      const [px, pz] = toMap(G.playerPos.x, G.playerPos.z);
      c.save();
      c.translate(px, pz);
      c.rotate(Math.atan2(Math.sin(G.playerHeading), Math.cos(G.playerHeading)));
      c.fillStyle = '#ff2d55';
      c.beginPath(); c.moveTo(0, -9); c.lineTo(7, 8); c.lineTo(-7, 8); c.closePath(); c.fill();
      c.restore();
    },
    update(dt) {
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) el.toast.textContent = '';
      }
      if (dlgTimer > 0) {
        dlgTimer -= dt;
        if (dlgTimer <= 0) el.dialogue.classList.add('hidden');
      }
      const hrs = Math.floor(G.clock);
      const mins = Math.floor((G.clock - hrs) * 60);
      const hh = String(hrs).padStart(2, '0');
      const mmn = String(mins).padStart(2, '0');
      const station = G.audio.station();
      el.clock.textContent = `DAY ${G.day} · ${hh}:${mmn} · ${station.name} — ${station.song}`;
      el.money.textContent = `$${G.money}`;
      let stars = '';
      for (let i = 0; i < 5; i++) stars += `<span class="${i < G.police.wanted ? 'on' : 'off'}">★</span>`;
      el.stars.innerHTML = stars;
      el.insight.classList.toggle('hidden', !(G.police.wanted > 0 && G.police.inSight));
      // weapons with ammo + locks
      el.weapons.innerHTML = WEAPONS.map((w, i) => {
        const locked = G.respect < w.lock;
        const ammo = G.ammo[i];
        const ammoHtml = w.mag === '∞' ? '<span class="ammo">∞</span>'
          : `<span class="ammo">${ammo ? ammo[0] : w.mag}/${ammo ? ammo[1] : w.reserve}</span>`;
        return `<span class="${i === G.weaponIdx ? 'sel' : ''} ${locked ? 'locked' : ''}">${i + 1} ${w.name}${ammoHtml}${locked ? '<span class="lk">LOCKED</span>' : ''}</span>`;
      }).join('');
      el.healthBar.firstElementChild.style.width = `${Math.max(0, G.health)}%`;
      el.armourBar.firstElementChild.style.width = `${Math.max(0, G.armour)}%`;
      el.respectBar.firstElementChild.style.width = `${G.respect}%`;
      el.healthTxt.textContent = Math.round(G.health);
      el.armourTxt.textContent = Math.round(G.armour);
      const lvl = 1 + Math.floor(G.respect / 20);
      el.respectLvl.textContent = lvl;
      el.respectTxt.textContent = `${Math.round(G.respect * 13)} / 1300`;
      el.tapes.textContent = `Sunset Tapes ${G.tapesFound}/20`;
      // radio + car panels
      el.radioStation.textContent = station.name;
      el.radioSong.textContent = station.song;
      const veh = G.vehicle;
      const kmh = veh ? Math.round(Math.hypot(veh.vel.x, veh.vel.z) * 2.5) : Math.round(Math.abs(G.player.speed) * 2.5);
      const spd = veh ? Math.abs(veh.speed) : Math.abs(G.player.speed);
      const gear = Math.min(veh && veh.vehicle.kind === 'bike' ? 5 : 6, 1 + Math.floor(spd / 7));
      el.carName.textContent = veh ? veh.name.toUpperCase() : 'ON FOOT';
      el.carCondTxt.textContent = `${Math.max(0, Math.round(veh ? veh.condition : 100))}%`;
      el.carCondFill.style.width = `${Math.max(0, veh ? veh.condition : 100)}%`;
      el.carSpeed.innerHTML = `${kmh} <small>km/h</small>`;
      el.carGear.textContent = veh ? `G${gear}` : '';
      el.speedlines.style.opacity = veh && Math.abs(veh.speed) > 24 ? String(Math.min(0.8, (Math.abs(veh.speed) - 24) / 20)) : '0';
      // drift panel
      const d = veh && veh.drift;
      if (d && (d.active || d.points > 0)) {
        el.driftPanel.classList.remove('hidden');
        el.driftPts.textContent = Math.round(d.points * d.combo);
        el.driftCombo.textContent = `x${d.combo}`;
        el.driftBanked.textContent = G.driftBanked || 0;
      } else {
        el.driftPanel.classList.add('hidden');
      }
      // crosshair on foot only
      el.crosshair.classList.toggle('hidden', !(G.mode === 'playing' && !veh && !G.mapOpen));
      // mission banner
      const b = G.missions.banner();
      if (b) {
        el.missionBanner.classList.remove('hidden');
        el.mbCh.textContent = `CH ${b.chapter}`;
        el.mbName.textContent = b.name.toUpperCase();
        el.mbTimer.textContent = b.timer !== null ? `${Math.floor(b.timer / 60)}:${String(b.timer % 60).padStart(2, '0')}` : '';
        el.mbObj.textContent = b.objective;
        el.mbHint.textContent = b.hint;
        el.mbStageFill.style.width = `${(b.stage / b.stages) * 100}%`;
        el.mbNext.textContent = `STAGE ${b.stage}/${b.stages} · NEXT ${b.next}`;
      } else {
        el.missionBanner.classList.add('hidden');
      }
      // EBPD panel
      const rows = G.police.ebpd();
      if (rows.length > 0) {
        el.ebpd.classList.remove('hidden');
        const shown = rows.slice(0, 5);
        const cls = { RAMMING: 'ram', PURSUIT: 'pur', ROADBLOCK: 'blk', SEARCHING: 'src', OVERHEAD: 'src', BLOCKING: 'blk' };
        el.ebpd.innerHTML = `<b>🚨 EBPD RESPONSE</b> — ${rows.length} UNIT${rows.length > 1 ? 'S' : ''}, CODE ${G.police.wanted}<br>` +
          shown.map((r) => `<div class="unit">${r.callsign} · ${r.dist}m · <b class="${cls[r.status] || 'pur'}">${r.status}</b></div>`).join('') +
          (rows.length > 5 ? `<div>+${rows.length - 5} more units in the search zone</div>` : '') +
          (G.police.wanted > 0 ? `<div>Lose them — EVADING ${Math.round(G.police.evading)}%</div>` : '');
      } else {
        el.ebpd.classList.add('hidden');
      }
      // minimap
      const S = 170, W2 = 920;
      const toMap = (x, z) => [((x + 460) / W2) * S, ((z + 460) / W2) * S];
      mm.clearRect(0, 0, S, S);
      mm.fillStyle = '#0c2b12'; mm.fillRect(0, 0, S, S);
      mm.fillStyle = '#1a7f8e'; mm.fillRect(0, 0, 5, S);
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
      if (G.missions.active && G.missions.marker) {
        const [mx, mz] = toMap(G.missions.marker.position.x, G.missions.marker.position.z);
        mm.fillStyle = '#ffe14d';
        mm.beginPath(); mm.moveTo(mx, mz - 6); mm.lineTo(mx + 5, mz); mm.lineTo(mx, mz + 6); mm.lineTo(mx - 5, mz); mm.closePath(); mm.fill();
      }
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
      const [px, pz] = toMap(G.playerPos.x, G.playerPos.z);
      mm.save();
      mm.translate(px, pz);
      mm.rotate(Math.atan2(Math.sin(G.playerHeading), Math.cos(G.playerHeading)));
      mm.fillStyle = '#ff2d55';
      mm.beginPath(); mm.moveTo(0, -7); mm.lineTo(5, 6); mm.lineTo(-5, 6); mm.closePath(); mm.fill();
      mm.restore();
      mm.fillStyle = '#fff'; mm.font = 'bold 11px Verdana'; mm.textAlign = 'center';
      mm.fillText('N', S / 2, 12);
      const dist = districtAt(G.playerPos.x, G.playerPos.z);
      el.district.textContent = dist.name;
      // keep the map overlay fresh while it is open
      if (G.mapOpen) H.drawMap();
    },
  };
  return H;
}
