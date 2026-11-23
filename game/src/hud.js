import { ROADS, DIAGONALS, ROUNDABOUT, MINOR_SEGS, FREEWAY, GOLF_RECT, STADIUM, RAIL_X, nsPlain, ewPlain, crossing, districtAt, standingLabel } from './city.js';

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

function drawPortrait(canvas, who) {
  const g = canvas.getContext('2d');
  const S = canvas.width;
  const u = S / 8;
  const styles = {
    mara: { bg: '#7a2a4a', skin: '#d9a066', hair: '#14141c', acc: '#ffd24d', top: '#3a2a4a' },
    deke: { bg: '#2a4a7a', skin: '#b07a4a', hair: '#e02030', acc: '#2a2a2a', top: '#1c2733' },
    vic: { bg: '#3a3a3a', skin: '#e8b98a', hair: '#cccccc', acc: '#2a2a2a', top: '#222831' },
    rosa: { bg: '#4a2a6a', skin: '#d9a066', hair: '#2a1410', acc: '#ffd24d', top: '#5a2a4a' },
    kip: { bg: '#2a6a4a', skin: '#e8b98a', hair: '#e8c820', acc: '#ff2d55', top: '#1c4a3a' },
  };
  const st = styles[who] || styles.mara;
  const cx = S / 2;
  const ell = (x, y, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  rect(0, 0, S, S, st.bg);
  const vg = g.createRadialGradient(cx, S * 0.4, S * 0.1, cx, S * 0.4, S * 0.7);
  vg.addColorStop(0, 'rgba(255,255,255,0.10)');
  vg.addColorStop(1, 'rgba(0,0,0,0.25)');
  g.fillStyle = vg; g.fillRect(0, 0, S, S);
  g.fillStyle = st.top;
  g.beginPath();
  g.moveTo(u * 0.6, S);
  g.quadraticCurveTo(u * 0.8, u * 6.1, u * 2.2, u * 6.2);
  g.lineTo(u * 5.8, u * 6.2);
  g.quadraticCurveTo(u * 7.2, u * 6.1, u * 7.4, S);
  g.closePath(); g.fill();
  g.fillStyle = st.acc;
  g.beginPath(); g.moveTo(u * 3.4, u * 6.2); g.lineTo(cx, u * 7.1); g.lineTo(u * 4.6, u * 6.2); g.closePath(); g.fill();
  rect(u * 3.4, u * 5.6, u * 1.2, u * 0.8, st.skin);
  ell(cx, u * 3.9, u * 1.85, u * 2.05, st.skin);
  ell(cx + u * 0.9, u * 4.1, u * 0.7, u * 1.5, 'rgba(0,0,0,0.08)');
  ell(u * 2.05, u * 4.0, u * 0.28, u * 0.5, st.skin);
  ell(u * 5.95, u * 4.0, u * 0.28, u * 0.5, st.skin);
  g.fillStyle = st.hair;
  if (who === 'mara') {
    g.beginPath(); g.ellipse(cx, u * 2.2, u * 1.95, u * 1.15, 0, Math.PI, 0); g.fill();
    rect(u * 2.0, u * 2.4, u * 0.55, u * 2.8, st.hair);
    rect(u * 5.45, u * 2.4, u * 0.55, u * 2.8, st.hair);
  } else if (who === 'deke') {
    g.beginPath(); g.ellipse(cx, u * 2.3, u * 1.9, u * 0.95, 0, Math.PI, 0); g.fill();
    rect(u * 2.1, u * 2.9, u * 3.8, u * 0.35, st.hair);
    rect(u * 2.9, u * 5.9, u * 2.2, u * 0.5, '#3a2a22');
  } else if (who === 'vic') {
    g.beginPath(); g.ellipse(cx, u * 2.35, u * 1.85, u * 0.7, 0, Math.PI, 0); g.fill();
    rect(u * 2.3, u * 5.9, u * 3.4, u * 0.6, '#dddddd');
    g.strokeStyle = '#222222'; g.lineWidth = u * 0.14;
    g.strokeRect(u * 2.55, u * 3.5, u * 1.1, u * 0.9);
    g.strokeRect(u * 4.35, u * 3.5, u * 1.1, u * 0.9);
    g.beginPath(); g.moveTo(u * 3.65, u * 3.9); g.lineTo(u * 4.35, u * 3.9); g.stroke();
  } else if (who === 'rosa') {
    g.beginPath(); g.ellipse(cx, u * 2.1, u * 2.0, u * 1.2, 0, Math.PI, 0); g.fill();
    rect(u * 1.7, u * 2.4, u * 0.6, u * 3.6, st.hair);
    rect(u * 5.7, u * 2.4, u * 0.6, u * 3.6, st.hair);
  } else {
    g.beginPath(); g.ellipse(cx, u * 2.3, u * 1.9, u * 0.95, 0, Math.PI, 0); g.fill();
    rect(u * 2.2, u * 2.6, u * 3.6, u * 0.35, st.acc);
  }
  for (const ex of [u * 3.05, u * 4.55]) {
    ell(ex + u * 0.2, u * 3.9, u * 0.34, u * 0.28, '#ffffff');
    ell(ex + u * 0.2, u * 3.92, u * 0.16, u * 0.18, '#141414');
  }
  g.strokeStyle = st.hair; g.lineWidth = u * 0.14; g.lineCap = 'round';
  g.beginPath(); g.moveTo(u * 2.85, u * 3.45); g.lineTo(u * 3.65, u * 3.35); g.stroke();
  g.beginPath(); g.moveTo(u * 4.35, u * 3.35); g.lineTo(u * 5.15, u * 3.45); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = u * 0.1;
  g.beginPath(); g.moveTo(cx, u * 4.1); g.lineTo(cx + u * 0.12, u * 4.75); g.lineTo(cx - u * 0.1, u * 4.8); g.stroke();
  g.strokeStyle = '#8a3a2a'; g.lineWidth = u * 0.16; g.lineCap = 'round';
  g.beginPath(); g.moveTo(u * 3.35, u * 5.25); g.quadraticCurveTo(cx, u * 5.45, u * 4.65, u * 5.25); g.stroke();
  if (who === 'mara' || who === 'rosa') {
    ell(u * 2.1, u * 4.9, u * 0.16, u * 0.16, st.acc);
    ell(u * 5.9, u * 4.9, u * 0.16, u * 0.16, st.acc);
  }
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
    rankLine: $('rankLine'), crewChips: $('crewChips'),
    radioStation: $('radioStation'), radioSong: $('radioSong'),
    carPanel: $('carPanel'), carName: $('carName'), carCondFill: $('carCondFill'), carCondTxt: $('carCondTxt'),
    carSpeed: $('carSpeed'), carGear: $('carGear'),
    driftPanel: $('driftPanel'), driftPts: $('driftPts'), driftCombo: $('driftCombo'), driftBanked: $('driftBanked'),
    dialogue: $('dialogue'), dlgPortrait: $('dlgPortrait'), dlgName: $('dlgName'), dlgRole: $('dlgRole'), dlgLine: $('dlgLine'),
    crosshair: $('crosshair'), speedlines: $('speedlines'), banner: $('banner'), toast: $('toast'),
    title: $('title'), crewRow: $('crewRow'),
    mapOverlay: $('mapOverlay'), mapCanvas: $('mapCanvas'), mapStoryList: $('mapStoryList'),
    mapJob: $('mapJob'), mapLegend: $('mapLegend'), mapStats: $('mapStats'),
    mapProgress: $('mapProgress'), mapRank: $('mapRank'), mapCareer: $('mapCareer'), mapSlots: $('mapSlots'),
  };
  const mm = el.minimap.getContext('2d');
  const mapCtx = el.mapCanvas.getContext('2d');
  let toastTimer = 0;
  let dlgTimer = 0;

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

  // Crew ability chips under the weapons panel: portrait + key + name,
  // dimmed with seconds while on cooldown.
  const ABILITIES = [
    { key: 'Z', who: 'mara', name: 'MARA', ab: 'HOT TIP', cd: () => G.abilities.hotTip.cd },
    { key: 'X', who: 'deke', name: 'DEKE', ab: 'NITRO', cd: () => G.abilities.nitro.cd },
    { key: 'C', who: 'rosa', name: 'ROSA', ab: 'EYES OUT', cd: () => G.abilities.eyesOut.cd },
  ];
  const chipEls = ABILITIES.map((a) => {
    const d = document.createElement('div');
    d.className = 'chip';
    const cv = document.createElement('canvas');
    cv.width = 28; cv.height = 28;
    drawPortrait(cv, a.who);
    const tx = document.createElement('div');
    tx.className = 'ctx';
    tx.innerHTML = `<b>${a.key} · ${a.name}</b><span>${a.ab}</span>`;
    const st = document.createElement('i');
    st.textContent = 'READY';
    d.append(cv, tx, st);
    el.crewChips.appendChild(d);
    return { d, st, cd: a.cd };
  });

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
      if (M.active) {
        const b = M.banner();
        const d = Math.round(Math.hypot(G.playerPos.x - (M.marker ? M.marker.position.x : 0), G.playerPos.z - (M.marker ? M.marker.position.z : 0)));
        el.mapJob.innerHTML = `<b>${b.name.toUpperCase()}</b> — CH ${b.chapter}<br>${b.objective}<br>STAGE ${b.stage}/${b.stages} · GPS ${d} m`;
      } else {
        el.mapJob.textContent = 'No job running — press E to start the next one.';
      }
      const legend = [
        ['#ff2d55', '▶', 'You are here'], ['#ffe14d', '●', 'Story contact'], ['#ffe14d', '◆', 'Job objective'],
        ['#7dff5e', '⌂', 'Safehouse'], ['#ff9de2', '✚', 'Weapons'], ['#2fd8ff', '◐', 'Respray (clears heat)'],
        ['#ffd24d', '⚑', 'Street race'], ['#c07dff', '★', 'Property'], ['#ffffff', '+', 'Hospital'],
        ['#6ec6ff', '⬢', 'Police'], ['#ff6fa5', '▣', 'Sunset Tape'],
      ];
      el.mapLegend.innerHTML = legend.map(([c, s, t]) => `<div><span style="color:${c}">${s}</span> ${t}</div>`).join('');
      const lvl = 1 + Math.floor(G.respect / 20);
      const r = G.rankInfo();
      el.mapStats.innerHTML =
        `Cash <span class="stat"><b>$${G.money}</b></span><br>` +
        `Respect level <span class="stat"><b>${lvl}</b></span><br>` +
        `Rank <span class="stat"><b>${r.name}</b></span> (${r.disp}/${r.next ?? 'MAX'})<br>` +
        `Sunset Tapes <span class="stat"><b>${G.tapesFound} / 20</b></span><br>` +
        `Properties <span class="stat"><b>0 / 2</b></span>`;
      // PROGRESS: completion % = mean of story, tapes and FRIENDLY districts.
      // Properties and drift are tracked below but not counted — properties
      // cannot be bought yet, so counting them would cap completion at 75%.
      const friendly = Object.values(G.standing).filter((v) => v >= 70).length;
      const pct = Math.round(100 * ((M.done.size / 8) + (G.tapesFound / 20) + (friendly / 14)) / 3);
      const bar = (label, have, total, suffix = '') => {
        const w = Math.min(100, Math.round((have / total) * 100));
        return `<div class="prow">${label} <b>${have}/${total}${suffix}</b><div class="pbar"><i style="width:${w}%"></i></div></div>`;
      };
      el.mapProgress.innerHTML = `<h2>PROGRESS — ${pct}% COMPLETE</h2>` +
        bar('Story missions', M.done.size, 8) +
        bar('Sunset Tapes', G.tapesFound, 20) +
        bar('Districts FRIENDLY', friendly, 14) +
        bar('Properties', 0, 2) +
        `<div class="prow">Drift banked <b>$${G.driftBanked || 0}</b></div>`;
      el.mapRank.innerHTML = `<h2>RANK</h2>` +
        `<div class="rname">RANK ${r.lvl} · ${r.name}</div>` +
        (r.next
          ? `<div>${r.disp} / ${r.next} RP · NEXT ${r.nextName}</div><div>Unlocks ${r.unlock}</div>`
          : `<div>TOP RANK · ${r.disp} RP · ${r.unlock}</div>`);
      const st = G.stats;
      el.mapCareer.innerHTML = `<h2>CAREER</h2>` +
        `Cars stolen <span class="stat"><b>${st.carsStolen}</b></span><br>` +
        `Cops escaped <span class="stat"><b>${st.copsEscaped}</b></span><br>` +
        `Distance driven <span class="stat"><b>${(st.distanceDriven / 1000).toFixed(1)} km</b></span><br>` +
        `People taken out <span class="stat"><b>${st.takenOut}</b></span><br>` +
        `Longest drift <span class="stat"><b>$${st.longestDrift}</b></span>`;
      const fmtClock = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
      el.mapSlots.innerHTML = `<h2>SAVE SLOTS</h2>` + G.slotInfo().map((s) => s.empty
        ? `<div class="slot">SLOT ${s.slot + 1} · EMPTY</div>`
        : `<div class="slot${s.slot === G.slot ? ' cur' : ''}">${s.slot === G.slot ? '● ' : ''}SLOT ${s.slot + 1} · Ch.${s.chapter} · $${s.money} · Day ${s.day} · ${s.missions}/8 · ${fmtClock(s.clock)}</div>`).join('') +
        `<button id="mapSaveBtn">SAVE — SLOT ${G.slot + 1}</button>`;
      const saveBtn = document.getElementById('mapSaveBtn');
      if (saveBtn) saveBtn.addEventListener('click', () => { G.saveGame(); H.renderMap(); });
      H.drawMap();
    },
    drawMap() {
      const c = mapCtx;
      const W = el.mapCanvas.width, Ht = el.mapCanvas.height;
      const S = 580, ox = (W - S) / 2, oy = (Ht - S) / 2;
      const toMap = (x, z) => [ox + ((x + 460) / 920) * S, oy + ((z + 460) / 920) * S];
      const m2p = (m) => (m / 920) * S;
      const coastX = (z) => -465 + 12 * Math.sin(z * 0.006 + 0.8) + 8 * Math.sin(z * 0.017 + 2.2);
      const inBay = (x, z) => ((x + 240) / 110) ** 2 + ((z - 455) / 48) ** 2 < 1;
      const onLand = (x, z) => x > coastX(z) + 26 && !inBay(x, z) && x < 460 && z > -460 && z < 460;
      c.clearRect(0, 0, W, Ht);
      const sea = c.createLinearGradient(0, 0, W, Ht);
      sea.addColorStop(0, '#1c5a78'); sea.addColorStop(1, '#2a7a9a');
      c.fillStyle = sea; c.fillRect(0, 0, W, Ht);
      const landPath = () => {
        c.beginPath();
        let [mx, mz] = toMap(coastX(-460), -460);
        c.moveTo(mx, mz);
        for (let z = -440; z <= 460; z += 20) { [mx, mz] = toMap(coastX(z), z); c.lineTo(mx, mz); }
        [mx, mz] = toMap(-350, 460); c.lineTo(mx, mz);
        const [bx, by] = toMap(-240, 407);
        const [ex, ey] = toMap(-130, 460);
        c.quadraticCurveTo(bx, by, ex, ey);
        [mx, mz] = toMap(460, 460); c.lineTo(mx, mz);
        [mx, mz] = toMap(460, -460); c.lineTo(mx, mz);
        c.closePath();
      };
      landPath();
      c.fillStyle = '#98a684'; c.fill();
      c.save();
      c.strokeStyle = '#d9c08a'; c.lineWidth = m2p(12); c.lineJoin = 'round';
      c.beginPath();
      for (let z = -460; z <= 460; z += 20) { const [mx, mz] = toMap(coastX(z) + 5, z); if (z === -460) c.moveTo(mx, mz); else c.lineTo(mx, mz); }
      c.stroke();
      c.beginPath();
      {
        const [ax, ay] = toMap(-350, 460); c.moveTo(ax, ay);
        const [bx, by] = toMap(-240, 407); const [ex, ey] = toMap(-130, 460);
        c.quadraticCurveTo(bx, by, ex, ey);
      }
      c.stroke();
      c.restore();
      {
        const [cx0, cz0] = toMap(coastX(-20), -20);
        const [wx, wy] = toMap(coastX(-20) - 16, -20);
        c.strokeStyle = '#8a6a42'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(cx0, cz0); c.lineTo(wx, wy); c.stroke();
        c.strokeStyle = '#2fd8ff'; c.lineWidth = 2;
        c.beginPath(); c.arc(wx, wy, 6, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.moveTo(wx - 6, wy); c.lineTo(wx + 6, wy); c.moveTo(wx, wy - 6); c.lineTo(wx, wy + 6); c.stroke();
      }
      landPath(); c.save(); c.clip();
      const cell = (ix, iz) => {
        const a = crossing(ROADS.ns[ix], ROADS.ew[iz]);
        const b = crossing(ROADS.ns[ix + 1], ROADS.ew[iz]);
        const d = crossing(ROADS.ns[ix + 1], ROADS.ew[iz + 1]);
        const e = crossing(ROADS.ns[ix], ROADS.ew[iz + 1]);
        return [a, b, d, e];
      };
      const insetPoly = (pts, m) => {
        const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const cz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
        return pts.map((p) => {
          const dx = p.x - cx, dz = p.z - cz;
          const len = Math.hypot(dx, dz) || 1;
          return { x: p.x - (dx / len) * m, z: p.z - (dz / len) * m };
        });
      };
      const poly = (pts) => {
        c.beginPath();
        pts.forEach((p, i) => { const [mx, mz] = toMap(p.x, p.z); if (i === 0) c.moveTo(mx, mz); else c.lineTo(mx, mz); });
        c.closePath();
      };
      for (let ix = 0; ix < ROADS.ns.length - 1; ix++) {
        for (let iz = 0; iz < ROADS.ew.length - 1; iz++) {
          const pts = cell(ix, iz);
          const midX = pts.reduce((s, p) => s + p.x, 0) / 4;
          const midZ = pts.reduce((s, p) => s + p.z, 0) / 4;
          if (Math.hypot(midX - ROUNDABOUT.cx, midZ - ROUNDABOUT.cz) < 55) continue;
          if (!onLand(midX, midZ)) continue;
          poly(insetPoly(pts, 4));
          c.fillStyle = (ix * 5 + iz * 3) % 9 === 0 ? '#7ab85e' : '#e8d8b8'; c.fill();
          poly(insetPoly(pts, 10));
          c.fillStyle = '#b8b8a8'; c.fill();
          const inner = insetPoly(pts, 14);
          poly(inner);
          c.save();
          c.clip();
          const mpts = inner.map((p) => toMap(p.x, p.z));
          const minX = Math.min(...mpts.map((p) => p[0])), maxX = Math.max(...mpts.map((p) => p[0]));
          const minY = Math.min(...mpts.map((p) => p[1])), maxY = Math.max(...mpts.map((p) => p[1]));
          const shades = ['#7a9ab8', '#a88a6a', '#c98a9a', '#7ab85e', '#d8b86a', '#8a7ab8'];
          const n = 4 + ((ix * 3 + iz) % 3);
          const m = 4 + ((ix + iz * 2) % 2);
          for (let gx = 0; gx < n; gx++) {
            for (let gy = 0; gy < m; gy++) {
              const bw = (maxX - minX) / n, bh = (maxY - minY) / m;
              c.fillStyle = shades[(ix * 7 + iz * 3 + gx * 2 + gy * 5) % shades.length];
              c.fillRect(minX + gx * bw + 2, minY + gy * bh + 2, bw - 4, bh - 4);
            }
          }
          c.restore();
        }
      }
      c.fillStyle = '#5f9a4a';
      {
        const [ax, ay] = toMap(GOLF_RECT[0], GOLF_RECT[1]);
        const [bx, by] = toMap(GOLF_RECT[2], GOLF_RECT[3]);
        c.fillRect(ax, ay, bx - ax, by - ay);
        c.fillStyle = '#7ab85e';
        c.fillRect(ax + 12, ay + 10, (bx - ax) - 24, 14);
        c.fillStyle = '#e8dd9a';
        c.beginPath(); c.arc(ax + 30, ay + 60, 6, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(bx - 30, by - 40, 6, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = '#5f9a4a';
      {
        const [ax, ay] = toMap(-60, 100);
        c.fillRect(ax, ay, m2p(90), m2p(60));
        const [bx, by] = toMap(220, -260);
        c.fillRect(bx, by, m2p(70), m2p(50));
      }
      c.fillStyle = '#4a7a3a';
      for (const [tx, ty] of [[-40, 115], [-20, 135], [235, -245], [260, -235], [250, -225]]) {
        const [mx, mz] = toMap(tx, ty);
        c.beginPath(); c.arc(mx, mz, 3, 0, Math.PI * 2); c.fill();
      }
      {
        const [sx, sy] = toMap(STADIUM.x, STADIUM.z);
        c.fillStyle = '#f4f4f4';
        c.beginPath(); c.ellipse(sx, sy, m2p(STADIUM.r), m2p(STADIUM.r) * 0.8, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#9a9a9a'; c.lineWidth = 3;
        c.beginPath(); c.ellipse(sx, sy, m2p(STADIUM.r) * 0.6, m2p(STADIUM.r) * 0.45, 0, 0, Math.PI * 2); c.stroke();
      }
      const strokePts = (pts, width) => {
        c.strokeStyle = '#111111'; c.lineWidth = width; c.lineJoin = 'round';
        c.beginPath();
        pts.forEach(([x, z], i) => { const [mx, mz] = toMap(x, z); if (i === 0) c.moveTo(mx, mz); else c.lineTo(mx, mz); });
        c.stroke();
      };
      c.lineWidth = 2;
      for (const [ax, az, bx, bz] of MINOR_SEGS) strokePts([[ax, az], [bx, bz]], 3);
      {
        const pts = FREEWAY.pts.map((p) => [p.x, p.z]);
        pts.push(pts[0]);
        strokePts(pts, 3);
      }
      for (const road of ROADS.ns) {
        const pts = [];
        for (let z = -460; z <= 460; z += 20) pts.push([nsPlain(road, z), z]);
        strokePts(pts, 4);
      }
      for (const road of ROADS.ew) {
        const pts = [];
        for (let x = -460; x <= 460; x += 20) pts.push([x, ewPlain(road, x)]);
        strokePts(pts, 4);
      }
      for (const [ax, az, bx, bz] of DIAGONALS) strokePts([[ax, az], [bx, bz]], 3);
      {
        const [rx, rz] = toMap(ROUNDABOUT.cx, ROUNDABOUT.cz);
        c.strokeStyle = '#111111'; c.lineWidth = 3;
        c.beginPath(); c.arc(rx, rz, m2p(ROUNDABOUT.r), 0, Math.PI * 2); c.stroke();
      }
      {
        const [ax, ay] = toMap(RAIL_X, -460);
        const [bx, by] = toMap(RAIL_X, 460);
        c.strokeStyle = '#7a2a2a'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
      }
      c.restore();
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const stFor = (n) => {
        const k = Object.keys(G.standing).find((kk) => kk.toUpperCase() === n);
        return k != null ? G.standing[k] : null;
      };
      const stLine = (x, y, name) => {
        const st = stFor(name);
        if (st == null) return;
        c.font = 'bold 10px Verdana';
        c.lineWidth = 3; c.strokeStyle = '#111111';
        const txt = `${standingLabel(st)} · ${st}`;
        c.strokeText(txt, x, y);
        c.fillStyle = st >= 70 ? '#7dff5e' : st >= 40 ? '#ffd24d' : '#ff5a3d';
        c.fillText(txt, x, y);
      };
      const dlabel = (x, z, name, size = 13) => {
        const [mx, mz] = toMap(x, z);
        c.font = `bold ${size}px Verdana`;
        c.lineWidth = 4; c.strokeStyle = '#111111';
        c.strokeText(name, mx, mz);
        c.fillStyle = '#ffffff';
        c.fillText(name, mx, mz);
        stLine(mx, mz + 14, name);
      };
      dlabel(-240, -330, 'OLD TOWN');
      dlabel(40, -320, 'GLASS MILE');
      dlabel(320, -320, 'NORTHGATE');
      dlabel(-240, -100, 'MARINA POINT');
      dlabel(40, -150, 'DOWNTOWN CORE');
      dlabel(320, -60, 'HILLCREST');
      dlabel(-240, 100, 'SUNSET ROW');
      dlabel(-240, 265, 'HOODSIDE');
      dlabel(-240, 395, 'CORAL ROW');
      dlabel(40, 320, 'CENTRAL AVENUES');
      dlabel(320, 160, 'CRANESIDE');
      dlabel(340, 300, 'PORT EMBER');
      const vlabel = (x, z, name) => {
        const [mx, mz] = toMap(x, z);
        c.save(); c.translate(mx, mz); c.rotate(-Math.PI / 2);
        c.font = 'bold 11px Verdana';
        c.lineWidth = 3; c.strokeStyle = '#111111';
        c.strokeText(name, 0, 0);
        c.fillStyle = '#ffffff';
        c.fillText(name, 0, 0);
        stLine(0, 14, name);
        c.restore();
      };
      vlabel(-420, -230, 'PALMS BEACH');
      vlabel(-420, 230, 'BOARDWALK');
      const dot = (x, z, color, r = 5) => {
        const [mx, mz] = toMap(x, z);
        c.fillStyle = color;
        c.beginPath(); c.arc(mx, mz, r, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#111111'; c.lineWidth = 2; c.stroke();
      };
      const house = (x, z) => {
        const [mx, mz] = toMap(x, z);
        c.fillStyle = '#7dff5e';
        c.fillRect(mx - 5, mz - 2, 10, 8);
        c.beginPath(); c.moveTo(mx - 6, mz - 2); c.lineTo(mx, mz - 8); c.lineTo(mx + 6, mz - 2); c.closePath(); c.fill();
        c.strokeStyle = '#111111'; c.lineWidth = 1.5; c.stroke();
      };
      house(-340, 320);
      house(200, -300);
      dot(150, 150, '#ff9de2');
      dot(-100, 300, '#2fd8ff');
      dot(400, -120, '#ffd24d', 6);
      dot(0, 200, '#ffffff');
      dot(0, 0, '#6ec6ff');
      dot(-60, -60, '#ffe14d', 6);
      dot(-280, -280, '#ffd24d');
      dot(260, 230, '#ff9de2');
      dot(-350, 50, '#ffffff');
      dot(140, -260, '#c07dff');
      dot(320, 60, '#6ec6ff');
      dot(-120, -350, '#ff6fa5');
      dot(140, 400, '#ffd24d');
      dot(220, 120, '#2fd8ff');
      c.font = 'bold 12px Verdana'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = '#9ab8c8';
      for (let i = 0; i < 6; i++) {
        c.fillText(String.fromCharCode(65 + i), ox + (i + 0.5) * (S / 6), oy - 10);
        c.fillText(String(i + 1), ox - 12, oy + (i + 0.5) * (S / 6));
      }
      c.fillStyle = '#ff6fa5';
      for (const t of G.tapes.items.slice(0, 6)) {
        const [mx, mz] = toMap(t.x, t.z);
        c.fillRect(mx - 3, mz - 3, 6, 6);
      }
      const obj = G.missions.active && G.missions.marker
        ? [G.missions.marker.position.x, G.missions.marker.position.z]
        : null;
      if (obj) {
        const px = G.playerPos.x, pz = G.playerPos.z;
        const nsNear = ROADS.ns.reduce((best, r) => Math.abs(nsPlain(r, pz) - px) < Math.abs(nsPlain(best, pz) - px) ? r : best);
        const ewNear = ROADS.ew.reduce((best, r) => Math.abs(ewPlain(r, obj[0]) - obj[1]) < Math.abs(ewPlain(best, obj[0]) - obj[1]) ? r : best);
        const zMid = ewNear.base;
        const pts = [[px, pz], [nsPlain(nsNear, pz), pz]];
        for (let z = pz; zMid > pz ? z <= zMid : z >= zMid; z += zMid > pz ? 20 : -20) pts.push([nsPlain(nsNear, z), z]);
        pts.push([nsPlain(nsNear, zMid), zMid]);
        const x0 = nsPlain(nsNear, zMid);
        for (let x = x0; obj[0] > x0 ? x <= obj[0] : x >= obj[0]; x += obj[0] > x0 ? 20 : -20) pts.push([x, ewPlain(ewNear, x)]);
        pts.push([obj[0], ewPlain(ewNear, obj[0])], [obj[0], obj[1]]);
        const trace = (width, style, dash) => {
          c.strokeStyle = style; c.lineWidth = width; c.lineJoin = 'round';
          c.setLineDash(dash || []);
          c.beginPath();
          pts.forEach(([x, z], i) => { const [mx, mz] = toMap(x, z); if (i === 0) c.moveTo(mx, mz); else c.lineTo(mx, mz); });
          c.stroke();
        };
        trace(5, '#ffffff');
        trace(3, '#ffd24d', [8, 5]);
        c.setLineDash([]);
        const [ox2, oz2] = toMap(obj[0], obj[1]);
        c.fillStyle = '#ffe14d';
        c.beginPath(); c.moveTo(ox2, oz2 - 8); c.lineTo(ox2 + 6, oz2); c.lineTo(ox2, oz2 + 8); c.lineTo(ox2 - 6, oz2); c.closePath(); c.fill();
      }
      {
        const [cx, cy] = toMap(420, -420);
        c.fillStyle = '#ffffff'; c.font = 'bold 14px Verdana'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('N', cx, cy - 16);
        c.beginPath(); c.moveTo(cx, cy - 10); c.lineTo(cx + 6, cy + 8); c.lineTo(cx - 6, cy + 8); c.closePath(); c.fill();
        c.strokeStyle = '#ffffff'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(cx - m2p(50), cy + 20); c.lineTo(cx + m2p(50), cy + 20); c.stroke();
        c.font = 'bold 10px Verdana'; c.fillText('100 m', cx, cy + 32);
      }
      const [px, pz] = toMap(G.playerPos.x, G.playerPos.z);
      c.save();
      c.translate(px, pz);
      c.rotate(Math.atan2(Math.sin(G.playerHeading), Math.cos(G.playerHeading)));
      c.fillStyle = '#ff2d55';
      c.beginPath(); c.moveTo(0, -9); c.lineTo(7, 8); c.lineTo(-7, 8); c.closePath(); c.fill();
      c.strokeStyle = '#111111'; c.lineWidth = 1.5; c.stroke();
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
      const r = G.rankInfo();
      el.respectLvl.textContent = r.lvl;
      el.respectTxt.textContent = `${r.disp} / ${r.next ?? 'MAX'}`;
      el.rankLine.textContent = r.next
        ? `RANK ${r.lvl} · ${r.name} — NEXT ${r.nextName} · unlocks ${r.unlock}`
        : `RANK ${r.lvl} · ${r.name} · TOP RANK — ${r.unlock}`;
      for (const ch of chipEls) {
        const cd = ch.cd();
        ch.st.textContent = cd > 0 ? `${Math.ceil(cd)}s` : 'READY';
        ch.d.classList.toggle('cool', cd > 0);
      }
      el.tapes.textContent = `Sunset Tapes ${G.tapesFound}/20`;
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
      const d = veh && veh.drift;
      if (d && (d.active || d.points > 0)) {
        el.driftPanel.classList.remove('hidden');
        el.driftPts.textContent = Math.round(d.points * d.combo);
        el.driftCombo.textContent = `x${d.combo}`;
        el.driftBanked.textContent = G.driftBanked || 0;
      } else {
        el.driftPanel.classList.add('hidden');
      }
      el.crosshair.classList.toggle('hidden', !(G.mode === 'playing' && !veh && !G.mapOpen));
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
      const rows = G.police.ebpd();
      if (rows.length > 0) {
        el.ebpd.classList.remove('hidden');
        const shown = rows.slice(0, 5);
        const cls = { RAMMING: 'ram', PURSUIT: 'pur', ROADBLOCK: 'blk', SEARCHING: 'src', OVERHEAD: 'src', BLOCKING: 'blk' };
        el.ebpd.innerHTML = `<b>🚨 EBPD RESPONSE</b> — ${rows.length} UNIT${rows.length > 1 ? 'S' : ''}, CODE ${G.police.wanted}<br>` +
          shown.map((r) => `<div class="unit">${r.callsign} · ${r.dist}m · <b class="${cls[r.status] || 'pur'}">${r.status}</b></div>`).join('') +
          (rows.length > 5 ? `<div>+${rows.length - 5} more units in the search zone</div>` : '') +
          (G.police.wanted > 0 ? `<div class="wstate">${G.police.inSight ? 'IN SIGHT — EBPD has eyes on you' : 'SEARCHING — lose them to clear the heat'}</div>` : '') +
          (G.police.wanted > 0 ? `<div>Lose them — EVADING ${Math.round(G.police.evading)}%</div>` : '');
      } else {
        el.ebpd.classList.add('hidden');
      }
      const S = 170, W2 = 920;
      const toMap = (x, z) => [((x + 460) / W2) * S, ((z + 460) / W2) * S];
      mm.clearRect(0, 0, S, S);
      mm.fillStyle = '#0c2b12'; mm.fillRect(0, 0, S, S);
      mm.fillStyle = '#1a7f8e';
      mm.beginPath(); mm.moveTo(0, 0);
      for (let y = 0; y <= S; y += 10) mm.lineTo(4 + 3 * Math.sin(y * 0.05), y);
      mm.lineTo(0, S); mm.closePath(); mm.fill();
      mm.beginPath(); mm.ellipse(((-240 + 460) / W2) * S, S, 22, 10, 0, Math.PI, 0); mm.fill();
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
        // Units only show when close, unless ROSA's EYES OUT is revealing them.
        if (G.revealT <= 0 && Math.hypot(u.pos.x - G.playerPos.x, u.pos.z - G.playerPos.z) > 120) continue;
        const [ux, uz] = toMap(u.pos.x, u.pos.z);
        mm.beginPath(); mm.arc(ux, uz, 3, 0, Math.PI * 2); mm.fill();
      }
      if (G.police.heli && (G.revealT > 0 || Math.hypot(G.police.heli.group.position.x - G.playerPos.x, G.police.heli.group.position.z - G.playerPos.z) <= 120)) {
        const [hx, hz] = toMap(G.police.heli.group.position.x, G.police.heli.group.position.z);
        mm.fillStyle = '#ffffff';
        mm.beginPath(); mm.arc(hx, hz, 3.5, 0, Math.PI * 2); mm.fill();
      }
      if (G.tapeMark) {
        const [tx, tz] = toMap(G.tapeMark.x, G.tapeMark.z);
        mm.fillStyle = '#ff6fa5';
        mm.beginPath(); mm.moveTo(tx, tz - 6); mm.lineTo(tx + 5, tz); mm.lineTo(tx, tz + 6); mm.lineTo(tx - 5, tz); mm.closePath(); mm.fill();
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
      const dst = G.standing[dist.name];
      el.district.textContent = dst != null ? `${dist.name} · ${standingLabel(dst)} ${dst}` : dist.name;
      if (G.mapOpen) H.drawMap();
    },
  };
  return H;
}
