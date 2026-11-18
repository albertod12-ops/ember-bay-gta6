// Ember Bay v8 — HUD: mission banner, EBPD panel, weapon slots with ammo
// and locks, dialogue box with blocky portraits, car + radio panels,
// drift panel, crosshair, and the full city map overlay (M key).
import { ROADS, DISTRICTS, DIAGONALS, ROUNDABOUT, MINOR_SEGS, FREEWAY, GOLF_RECT, STADIUM, RAIL_X, nsPlain, ewPlain, crossing, districtAt } from './city.js';

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

// Character portraits, painted on a canvas — smooth vector faces now
// (v9): round head, hair shapes, eyes with whites, brows, nose, lips,
// collar and shading, one look per character.
function drawPortrait(canvas, who) {
  const g = canvas.getContext('2d');
  const S = canvas.width;
  const u = S / 8; // one cell
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
  // background + soft vignette
  rect(0, 0, S, S, st.bg);
  const vg = g.createRadialGradient(cx, S * 0.4, S * 0.1, cx, S * 0.4, S * 0.7);
  vg.addColorStop(0, 'rgba(255,255,255,0.10)');
  vg.addColorStop(1, 'rgba(0,0,0,0.25)');
  g.fillStyle = vg; g.fillRect(0, 0, S, S);
  // shoulders / top with collar
  g.fillStyle = st.top;
  g.beginPath();
  g.moveTo(u * 0.6, S);
  g.quadraticCurveTo(u * 0.8, u * 6.1, u * 2.2, u * 6.2);
  g.lineTo(u * 5.8, u * 6.2);
  g.quadraticCurveTo(u * 7.2, u * 6.1, u * 7.4, S);
  g.closePath(); g.fill();
  // collar V
  g.fillStyle = st.acc;
  g.beginPath(); g.moveTo(u * 3.4, u * 6.2); g.lineTo(cx, u * 7.1); g.lineTo(u * 4.6, u * 6.2); g.closePath(); g.fill();
  // neck
  rect(u * 3.4, u * 5.6, u * 1.2, u * 0.8, st.skin);
  // head: round, slightly narrow chin
  ell(cx, u * 3.9, u * 1.85, u * 2.05, st.skin);
  // side shading
  ell(cx + u * 0.9, u * 4.1, u * 0.7, u * 1.5, 'rgba(0,0,0,0.08)');
  // ears
  ell(u * 2.05, u * 4.0, u * 0.28, u * 0.5, st.skin);
  ell(u * 5.95, u * 4.0, u * 0.28, u * 0.5, st.skin);
  // hair
  g.fillStyle = st.hair;
  if (who === 'mara') {
    g.beginPath(); g.ellipse(cx, u * 2.2, u * 1.95, u * 1.15, 0, Math.PI, 0); g.fill();
    rect(u * 2.0, u * 2.4, u * 0.55, u * 2.8, st.hair);
    rect(u * 5.45, u * 2.4, u * 0.55, u * 2.8, st.hair);
  } else if (who === 'deke') {
    g.beginPath(); g.ellipse(cx, u * 2.3, u * 1.9, u * 0.95, 0, Math.PI, 0); g.fill();
    rect(u * 2.1, u * 2.9, u * 3.8, u * 0.35, st.hair); // bandana edge
    rect(u * 2.9, u * 5.9, u * 2.2, u * 0.5, '#3a2a22'); // beard
  } else if (who === 'vic') {
    g.beginPath(); g.ellipse(cx, u * 2.35, u * 1.85, u * 0.7, 0, Math.PI, 0); g.fill();
    rect(u * 2.3, u * 5.9, u * 3.4, u * 0.6, '#dddddd'); // gray beard
    // glasses
    g.strokeStyle = '#222222'; g.lineWidth = u * 0.14;
    g.strokeRect(u * 2.55, u * 3.5, u * 1.1, u * 0.9);
    g.strokeRect(u * 4.35, u * 3.5, u * 1.1, u * 0.9);
    g.beginPath(); g.moveTo(u * 3.65, u * 3.9); g.lineTo(u * 4.35, u * 3.9); g.stroke();
  } else if (who === 'rosa') {
    g.beginPath(); g.ellipse(cx, u * 2.1, u * 2.0, u * 1.2, 0, Math.PI, 0); g.fill();
    rect(u * 1.7, u * 2.4, u * 0.6, u * 3.6, st.hair);
    rect(u * 5.7, u * 2.4, u * 0.6, u * 3.6, st.hair);
  } else { // kip
    g.beginPath(); g.ellipse(cx, u * 2.3, u * 1.9, u * 0.95, 0, Math.PI, 0); g.fill();
    rect(u * 2.2, u * 2.6, u * 3.6, u * 0.35, st.acc); // headband
  }
  // eyes: white + pupil
  for (const ex of [u * 3.05, u * 4.55]) {
    ell(ex + u * 0.2, u * 3.9, u * 0.34, u * 0.28, '#ffffff');
    ell(ex + u * 0.2, u * 3.92, u * 0.16, u * 0.18, '#141414');
  }
  // brows
  g.strokeStyle = st.hair; g.lineWidth = u * 0.14; g.lineCap = 'round';
  g.beginPath(); g.moveTo(u * 2.85, u * 3.45); g.lineTo(u * 3.65, u * 3.35); g.stroke();
  g.beginPath(); g.moveTo(u * 4.35, u * 3.35); g.lineTo(u * 5.15, u * 3.45); g.stroke();
  // nose
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = u * 0.1;
  g.beginPath(); g.moveTo(cx, u * 4.1); g.lineTo(cx + u * 0.12, u * 4.75); g.lineTo(cx - u * 0.1, u * 4.8); g.stroke();
  // mouth
  g.strokeStyle = '#8a3a2a'; g.lineWidth = u * 0.16; g.lineCap = 'round';
  g.beginPath(); g.moveTo(u * 3.35, u * 5.25); g.quadraticCurveTo(cx, u * 5.45, u * 4.65, u * 5.25); g.stroke();
  // accessories
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
      // v9 SA-style map: the graphic itself reads like GTA San Andreas'
      // in-game map — white building blocks filling the land, black road
      // lines with a clear hierarchy (thick majors, thin minors), green
      // parks, blue water + tan beach on the west edge, bold white district
      // labels with a black outline, safehouse / blip icons, player arrow.
      const c = mapCtx;
      const W = el.mapCanvas.width, Ht = el.mapCanvas.height;
      const S = 600, ox = (W - S) / 2, oy = (Ht - S) / 2;
      const toMap = (x, z) => [ox + ((x + 460) / 920) * S, oy + ((z + 460) / 920) * S];
      const m2p = (m) => (m / 920) * S; // metres -> map pixels
      c.clearRect(0, 0, W, Ht);
      c.fillStyle = '#0d1a20'; c.fillRect(0, 0, W, Ht);
      // Land base (SA gray-green) over the whole city square.
      const [lx, ly] = toMap(-460, -460);
      c.fillStyle = '#8b9a78';
      c.fillRect(lx, ly, S, S);
      // Ocean west of the land + tan beach strip on the edge.
      c.fillStyle = '#4d8fb5';
      c.fillRect(0, 0, lx, Ht);
      c.fillStyle = '#d9c08a';
      c.fillRect(lx, ly, m2p(40), S);
      // --- Building blocks: one white block per road cell, inset by the
      // road half-width, with a light-gray roof detail inside. ---
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
          // skip the roundabout cell — the island reads as road, not block
          const midX = pts.reduce((s, p) => s + p.x, 0) / 4;
          const midZ = pts.reduce((s, p) => s + p.z, 0) / 4;
          if (Math.hypot(midX - ROUNDABOUT.cx, midZ - ROUNDABOUT.cz) < 55) continue;
          poly(insetPoly(pts, 8));
          c.fillStyle = '#f4f4f4'; c.fill();
          poly(insetPoly(pts, 20));
          c.fillStyle = '#dcdcdc'; c.fill();
          // tiny roof details: two small gray squares inside the block
          const in1 = insetPoly(pts, 34);
          poly([in1[0], { x: in1[0].x + 14, z: in1[0].z }, { x: in1[0].x + 14, z: in1[0].z + 14 }, { x: in1[0].x, z: in1[0].z + 14 }]);
          c.fillStyle = '#c4c4c4'; c.fill();
        }
      }
      // --- Parks + golf + stadium. ---
      c.fillStyle = '#5f9a4a';
      {
        const [ax, ay] = toMap(GOLF_RECT[0], GOLF_RECT[1]);
        const [bx, by] = toMap(GOLF_RECT[2], GOLF_RECT[3]);
        c.fillRect(ax, ay, bx - ax, by - ay);
        c.fillStyle = '#7ab85e';
        c.fillRect(ax + 12, ay + 10, (bx - ax) - 24, 14); // fairway
        c.fillStyle = '#e8dd9a';
        c.beginPath(); c.arc(ax + 30, ay + 60, 6, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(bx - 30, by - 40, 6, 0, Math.PI * 2); c.fill();
      }
      // two neighbourhood parks
      c.fillStyle = '#5f9a4a';
      {
        const [ax, ay] = toMap(-60, 100);
        c.fillRect(ax, ay, m2p(90), m2p(60));
        const [bx, by] = toMap(220, -260);
        c.fillRect(bx, by, m2p(70), m2p(50));
      }
      // stadium: white oval with a gray ring
      {
        const [sx, sy] = toMap(STADIUM.x, STADIUM.z);
        c.fillStyle = '#f4f4f4';
        c.beginPath(); c.ellipse(sx, sy, m2p(STADIUM.r), m2p(STADIUM.r) * 0.8, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#9a9a9a'; c.lineWidth = 3;
        c.beginPath(); c.ellipse(sx, sy, m2p(STADIUM.r) * 0.6, m2p(STADIUM.r) * 0.45, 0, 0, Math.PI * 2); c.stroke();
      }
      // --- Roads: black lines, hierarchy thick -> thin. ---
      const strokePts = (pts, width) => {
        c.strokeStyle = '#111111'; c.lineWidth = width; c.lineJoin = 'round';
        c.beginPath();
        pts.forEach(([x, z], i) => { const [mx, mz] = toMap(x, z); if (i === 0) c.moveTo(mx, mz); else c.lineTo(mx, mz); });
        c.stroke();
      };
      // minor streets first (thin, under the majors)
      c.lineWidth = 2;
      for (const [ax, az, bx, bz] of MINOR_SEGS) strokePts([[ax, az], [bx, bz]], 2);
      // freeway ring (thick black band with a gray median)
      {
        const pts = FREEWAY.pts.map((p) => [p.x, p.z]);
        pts.push(pts[0]);
        strokePts(pts, 6);
        c.strokeStyle = '#8a8a8a'; c.lineWidth = 2;
        c.beginPath();
        pts.forEach(([x, z], i) => { const [mx, mz] = toMap(x, z); if (i === 0) c.moveTo(mx, mz); else c.lineTo(mx, mz); });
        c.stroke();
      }
      // major avenues
      for (const road of ROADS.ns) {
        const pts = [];
        for (let z = -460; z <= 460; z += 20) pts.push([nsPlain(road, z), z]);
        strokePts(pts, 5);
      }
      for (const road of ROADS.ew) {
        const pts = [];
        for (let x = -460; x <= 460; x += 20) pts.push([x, ewPlain(road, x)]);
        strokePts(pts, 5);
      }
      for (const [ax, az, bx, bz] of DIAGONALS) strokePts([[ax, az], [bx, bz]], 4);
      {
        const [rx, rz] = toMap(ROUNDABOUT.cx, ROUNDABOUT.cz);
        c.strokeStyle = '#111111'; c.lineWidth = 5;
        c.beginPath(); c.arc(rx, rz, m2p(ROUNDABOUT.r), 0, Math.PI * 2); c.stroke();
      }
      // rail line (dark red, like SA)
      {
        const [ax, ay] = toMap(RAIL_X, -460);
        const [bx, by] = toMap(RAIL_X, 460);
        c.strokeStyle = '#7a2a2a'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
      }
      // --- District labels: bold white with a black outline. Narrow
      // districts (the beach strips) get their label shifted right into
      // the land instead of centred off the edge.
      c.textAlign = 'center'; c.textBaseline = 'middle';
      for (const [x0, z0, x1, z1, name] of DISTRICTS) {
        const [ax, ay] = toMap(x0, z0);
        const [bx, by] = toMap(x1, z1);
        const w = bx - ax;
        const cx = w < 70 ? bx + 34 : (ax + bx) / 2;
        c.font = `bold ${w < 90 ? 10 : 13}px Verdana`;
        c.lineWidth = 4; c.strokeStyle = '#111111';
        c.strokeText(name.toUpperCase(), cx, (ay + by) / 2);
        c.fillStyle = '#ffffff';
        c.fillText(name.toUpperCase(), cx, (ay + by) / 2);
      }
      // --- Markers + labels (white with black outline). ---
      const dot = (x, z, color, r = 5) => {
        const [mx, mz] = toMap(x, z);
        c.fillStyle = color;
        c.beginPath(); c.arc(mx, mz, r, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#111111'; c.lineWidth = 2; c.stroke();
      };
      const label = (x, z, text, dy = -10) => {
        const [mx, mz] = toMap(x, z);
        c.font = 'bold 10px Verdana';
        c.lineWidth = 3; c.strokeStyle = '#111111';
        c.strokeText(text, mx, mz + dy);
        c.fillStyle = '#ffffff';
        c.fillText(text, mx, mz + dy);
      };
      // green safehouse icons (house = square + roof triangle)
      const house = (x, z) => {
        const [mx, mz] = toMap(x, z);
        c.fillStyle = '#7dff5e';
        c.fillRect(mx - 5, mz - 2, 10, 8);
        c.beginPath(); c.moveTo(mx - 6, mz - 2); c.lineTo(mx, mz - 8); c.lineTo(mx + 6, mz - 2); c.closePath(); c.fill();
        c.strokeStyle = '#111111'; c.lineWidth = 1.5; c.stroke();
      };
      house(-300, 300); label(-300, 300, 'SAFEHOUSE');
      house(200, -300); label(200, -300, 'SAFEHOUSE');
      dot(150, 150, '#ff9de2'); label(150, 150, 'EMBER ARMS');
      dot(-100, 300, '#2fd8ff'); label(-100, 300, 'SPRAY & GO');
      dot(350, -350, '#ffd24d', 6); label(350, -350, 'MIDNIGHT MILE');
      dot(0, 200, '#ffffff'); label(0, 200, 'EMBER GENERAL');
      dot(0, 0, '#6ec6ff'); label(0, 0, 'EBPD HQ');
      dot(-60, -60, '#ffe14d', 6); label(-60, -60, "MARA'S BAR", 16);
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
