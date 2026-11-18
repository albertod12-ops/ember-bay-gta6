// Ember Bay v5 — recorded re-apply under R7; behaviour unchanged
// Ember Bay city v5: an organic coastal city — curved avenues, diagonal
// boulevards, a curved coast road, a roundabout, plazas, varied blocks.
// Everything is built from a seeded RNG, so a fixed seed builds the same city.
import * as THREE from 'three';

export const WORLD = { min: -460, max: 460 };

// 14 districts: [x0, z0, x1, z1, name, type] (unchanged from v4)
export const DISTRICTS = [
  [-380, -460, -100, -200, 'Old Town', 'brick'],
  [-100, -460, 180, -180, 'Glass Mile', 'downtown'],
  [180, -460, 460, -180, 'Northgate', 'residential'],
  [-380, -200, -100, 0, 'Marina Point', 'marina'],
  [-100, -180, 180, 180, 'Downtown Core', 'downtown'],
  [180, -180, 460, 60, 'Hillcrest', 'hill'],
  [-380, 0, -100, 200, 'Sunset Row', 'residential'],
  [-380, 200, -100, 330, 'Hoodside', 'hood'],
  [-380, 330, -100, 460, 'Coral Row', 'hood'],
  [-100, 180, 180, 460, 'Central Avenues', 'residential'],
  [180, 60, 460, 260, 'Craneside', 'docks'],
  [180, 260, 460, 460, 'Port Ember', 'docks'],
  [-460, -460, -380, 0, 'Palms Beach', 'beach'],
  [-460, 0, -380, 460, 'Boardwalk', 'beach'],
];

export function districtAt(x, z) {
  if (x < -460) return { name: 'Ember Ocean', type: 'ocean' };
  for (const d of DISTRICTS) {
    if (x >= d[0] && x < d[2] && z >= d[1] && z < d[3]) return { name: d[4], type: d[5] };
  }
  return { name: 'Ember Bay', type: 'residential' };
}

// --- Road network ---------------------------------------------------------
// A road bends gently: centre(along) = base + amp * sin(along * freq + phase).
// NS roads run along z (centre is an x), EW roads along x (centre is a z).
// Spacing is uneven on purpose: blocks come in many sizes, like a real city.
export const ROADS = {
  ns: [
    { base: -440, amp: 14, freq: Math.PI / 520, phase: 0.4 }, // coast road
    { base: -300, amp: 12, freq: Math.PI / 460, phase: 1.7 },
    { base: -140, amp: 10, freq: Math.PI / 500, phase: 3.1 },
    { base: -20, amp: 14, freq: Math.PI / 430, phase: 5.0, rb: true },
    { base: 150, amp: 11, freq: Math.PI / 480, phase: 2.2 },
    { base: 320, amp: 13, freq: Math.PI / 540, phase: 4.4 },
  ],
  ew: [
    { base: -360, amp: 12, freq: Math.PI / 500, phase: 0.9 },
    { base: -180, amp: 14, freq: Math.PI / 450, phase: 2.8 },
    { base: 40, amp: 10, freq: Math.PI / 520, phase: 5.5, rb: true },
    { base: 210, amp: 12, freq: Math.PI / 470, phase: 1.3 },
    { base: 380, amp: 15, freq: Math.PI / 560, phase: 3.9 },
  ],
};
export const ROAD_W = 14;
export const RB_R = 18; // roundabout bulge: how far the road swings around the island
export const RB_ISLAND = 10; // roundabout island radius

// Diagonal avenues: [x0, z0, x1, z1]. Visual boulevards with parked cars
// and pedestrians — no traffic lanes, so they read as grand diagonals.
export const DIAGONALS = [
  [-430, 300, 300, -430], // Sunset Diagonal, NW-SE across the city
  [180, 260, 420, 430], // Docks Diagonal, short, through Craneside
];

export function nsPlain(road, z) { return road.base + road.amp * Math.sin(z * road.freq + road.phase); }
export function ewPlain(road, x) { return road.base + road.amp * Math.sin(x * road.freq + road.phase); }

export function crossing(n, e) {
  let x = n.base, z = e.base;
  for (let i = 0; i < 5; i++) { x = nsPlain(n, z); z = ewPlain(e, x); }
  return { x, z };
}

const RB_NS = ROADS.ns[3];
const RB_EW = ROADS.ew[2];
export const ROUNDABOUT = (() => {
  const c = crossing(RB_NS, RB_EW);
  return { cx: c.x, cz: c.z, r: RB_R };
})();

// --- Minor streets (visual layer) ----------------------------------------
// A thin street down the middle of every big block, so the map reads as a
// dense real city (SA-map style) instead of a few huge empty slabs. They
// are visual only — traffic stays on the six major avenues. Segments are
// [x0, z0, x1, z1]; buildings keep clear of them (see place() in buildCity).
export const MINOR_SEGS = (() => {
  const segs = [];
  const push = (pts) => {
    for (let i = 0; i < pts.length - 1; i++) segs.push([pts[i].x, pts[i].z, pts[i + 1].x, pts[i + 1].z]);
  };
  for (let ix = 0; ix < ROADS.ns.length - 1; ix++) {
    for (let iz = 0; iz < ROADS.ew.length - 1; iz++) {
      const z0 = ROADS.ew[iz].base, z1 = ROADS.ew[iz + 1].base;
      const midZ = (z0 + z1) / 2;
      const pts = [];
      for (let z = z0; z < z1; z += 20) {
        pts.push({ x: (nsPlain(ROADS.ns[ix], z) + nsPlain(ROADS.ns[ix + 1], z)) / 2, z });
      }
      pts.push({ x: (nsPlain(ROADS.ns[ix], z1) + nsPlain(ROADS.ns[ix + 1], z1)) / 2, z: z1 });
      if (Math.hypot(pts[Math.floor(pts.length / 2)].x - ROUNDABOUT.cx, midZ - ROUNDABOUT.cz) > 55) push(pts);
      const x0 = ROADS.ns[ix].base, x1 = ROADS.ns[ix + 1].base;
      const midX = (x0 + x1) / 2;
      const pts2 = [];
      for (let x = x0; x < x1; x += 20) {
        pts2.push({ x, z: (ewPlain(ROADS.ew[iz], x) + ewPlain(ROADS.ew[iz + 1], x)) / 2 });
      }
      pts2.push({ x: x1, z: (ewPlain(ROADS.ew[iz], x1) + ewPlain(ROADS.ew[iz + 1], x1)) / 2 });
      if (Math.hypot(midX - ROUNDABOUT.cx, pts2[Math.floor(pts2.length / 2)].z - ROUNDABOUT.cz) > 55) push(pts2);
    }
  }
  return segs;
})();

// Freeway ring around the downtown core (SA-map style): a wide loop the
// map reads at a glance. Visual only — traffic stays on the avenues.
export const FREEWAY = (() => {
  const cx = 40, cz = 0, rx = 210, rz = 190;
  const pts = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * rx, z: cz + Math.sin(a) * rz });
  }
  return { cx, cz, rx, rz, pts };
})();

// Landmarks (SA-map style): golf course, airport runway, stadium, rail.
export const GOLF_RECT = [-100, 280, 160, 440]; // x0, z0, x1, z1
export const STADIUM = { x: 330, z: 140, r: 30 };
export const RAIL_X = 405;

// Roundabout bulge: a smooth bump that swings the road around the island.
// bump(t) is 0 at the ends and 1 in the middle, with zero slope at the ends,
// so the road joins the straight bend smoothly on both sides.
function bump(along, c) {
  const t = (along - (c - RB_R)) / (2 * RB_R);
  if (t <= 0 || t >= 1) return 0;
  return Math.sin(Math.PI * t) ** 2;
}
function bumpSlope(along, c) {
  const t = (along - (c - RB_R)) / (2 * RB_R);
  if (t <= 0 || t >= 1) return 0;
  return (Math.PI / (2 * RB_R)) * Math.sin(2 * Math.PI * t);
}

// Arc-aware centreline: on the two roundabout roads the centreline swings
// around the island — east arc for +z traffic, west arc for -z traffic
// (clockwise circulation, left-hand traffic), north/south arcs for EW.
export function nsCenter(road, z, dir = 1) {
  let x = nsPlain(road, z);
  if (road.rb) x += dir * RB_R * bump(z, ROUNDABOUT.cz);
  return x;
}
export function ewCenter(road, x, dir = 1) {
  let z = ewPlain(road, x);
  if (road.rb) z -= dir * RB_R * bump(x, ROUNDABOUT.cx);
  return z;
}
// Tangent slope of the centreline (dx/dz for NS, dz/dx for EW).
export function nsSlope(road, z, dir = 1) {
  let d = road.amp * road.freq * Math.cos(z * road.freq + road.phase);
  if (road.rb) d += dir * RB_R * bumpSlope(z, ROUNDABOUT.cz);
  return d;
}
export function ewSlope(road, x, dir = 1) {
  let d = road.amp * road.freq * Math.cos(x * road.freq + road.phase);
  if (road.rb) d -= dir * RB_R * bumpSlope(x, ROUNDABOUT.cx);
  return d;
}
// Heading of a vehicle driving along the road (forward = (sin h, cos h)).
export function nsHeading(road, z, dir = 1) {
  const d = nsSlope(road, z, dir);
  return dir > 0 ? Math.atan2(d, 1) : Math.atan2(-d, -1);
}
export function ewHeading(road, x, dir = 1) {
  const d = ewSlope(road, x, dir);
  return dir > 0 ? Math.atan2(1, d) : Math.atan2(-1, -d);
}
// A point on a road, facing along it (dir +1 = +z for NS, +x for EW).
export function roadPoint(axis, idx, along, dir = 1) {
  if (axis === 'ns') {
    const road = ROADS.ns[idx];
    return { x: nsCenter(road, along, dir), z: along, heading: nsHeading(road, along, dir) };
  }
  const road = ROADS.ew[idx];
  return { x: along, z: ewCenter(road, along, dir), heading: ewHeading(road, along, dir) };
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

// Road surface. The length axis runs along the canvas Y, so the double-yellow
// centre line always runs ALONG the road, never across it. The texture tiles
// every 24 m along the ribbon (see roadRibbon).
function roadTexture() {
  const t = canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = '#2e2e33'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#33333a';
    for (let i = 0; i < 200; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    // worn patches
    g.fillStyle = '#28282d';
    for (let i = 0; i < 6; i++) g.fillRect(Math.random() * w, Math.random() * h, 18 + Math.random() * 22, 10 + Math.random() * 18);
    // double yellow centre
    g.fillStyle = '#e8b820';
    g.fillRect(w / 2 - 6, 0, 4, h); g.fillRect(w / 2 + 2, 0, 4, h);
    // dashed white lane lines
    g.fillStyle = '#e8e8e8';
    for (let d = 0; d < h; d += 32) {
      g.fillRect(w / 4 - 1, d, 2, 16); g.fillRect((3 * w) / 4 - 1, d, 2, 16);
    }
    // edge lines
    g.fillStyle = '#cccccc';
    g.fillRect(3, 0, 2, h); g.fillRect(w - 5, 0, 2, h);
  });
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

function windowTexture(base, lit) {
  return canvasTexture(64, 128, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 6; y < h - 6; y += 12) {
      for (let x = 6; x < w - 6; x += 10) {
        g.fillStyle = Math.random() < 0.55 ? lit : '#1c2433';
        g.fillRect(x, y, 6, 7);
      }
    }
  });
}

function billboardTexture(lines, bg, fg) {
  return canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 34px Verdana';
    lines.forEach((ln, i) => g.fillText(ln, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 40));
  });
}

// v8 neon sign: glowing text on a dark panel (MeshBasicMaterial, so it
// reads at night without a light). Original Ember Bay business names.
function neonTexture(text, color) {
  return canvasTexture(512, 128, (g, w, h) => {
    g.fillStyle = '#0a0614'; g.fillRect(0, 0, w, h);
    g.strokeStyle = color; g.lineWidth = 5;
    g.shadowColor = color; g.shadowBlur = 22;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 52px Verdana';
    g.fillText(text, w / 2, h / 2 + 2);
    g.shadowBlur = 0;
    g.fillStyle = '#ffffff';
    g.font = 'bold 50px Verdana';
    g.globalAlpha = 0.35;
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

const MAT = {};
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!MAT[key]) MAT[key] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...opts });
  return MAT[key];
}

function box(w, h, d, material, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function pyramidRoof(w, d, h, color, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.72, h, 4), mat(color, { roughness: 0.9 }));
  m.position.set(x, y + h / 2, z);
  m.rotation.y = Math.PI / 4;
  m.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
  parent.add(m);
  return m;
}

function makePalm(rng, x, z, parent, scale = 1, trunkColor = 0x8a6b46, trunkScale = 1) {
  const g = new THREE.Group();
  const lean = rng.range(-0.12, 0.12);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * scale * trunkScale, 0.55 * scale * trunkScale, 7 * scale, 6), mat(trunkColor));
  trunk.position.y = 3.5 * scale; trunk.rotation.z = lean;
  trunk.castShadow = true;
  g.add(trunk);
  for (let i = 0; i < 6; i++) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.9 * scale, 4.2 * scale, 4), mat(0x2f8f4e));
    const a = (i / 6) * Math.PI * 2;
    frond.position.set(Math.cos(a) * 1.7 * scale, 7 * scale, Math.sin(a) * 1.7 * scale);
    frond.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
    frond.scale.set(1, 1, 0.28);
    frond.castShadow = true;
    g.add(frond);
  }
  g.position.set(x, 0, z);
  parent.add(g);
  return g;
}

function makeTree(rng, x, z, parent, scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.32 * scale, 2.6 * scale, 6), mat(0x6b4a2a));
  trunk.position.y = 1.3 * scale;
  trunk.castShadow = true;
  g.add(trunk);
  const greens = [0x3a7d44, 0x4a8f3c, 0x2f6b3a, 0x5a9a4a];
  const c1 = new THREE.Mesh(new THREE.SphereGeometry(1.9 * scale, 8, 6), mat(rng.pick(greens)));
  c1.position.y = 3.6 * scale; c1.scale.y = 0.85;
  c1.castShadow = true;
  g.add(c1);
  const c2 = new THREE.Mesh(new THREE.SphereGeometry(1.2 * scale, 8, 6), mat(rng.pick(greens)));
  c2.position.set(0.9 * scale, 4.4 * scale, 0.4 * scale);
  c2.castShadow = true;
  g.add(c2);
  g.position.set(x, 0, z);
  parent.add(g);
  return g;
}

function makeUmbrella(rng, x, z, parent) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 6), mat(0xdddddd));
  pole.position.y = 1.3; g.add(pole);
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.9, 8), mat(rng.pick([0xff6fa5, 0xff8c42, 0x7fd4ff, 0xffe14d])));
  top.position.y = 2.8; top.castShadow = true; g.add(top);
  g.position.set(x, 0, z);
  parent.add(g);
  return g;
}

// A flat ribbon of road following a list of centreline points. UV v runs
// along the road so the texture tiles every 24 m.
function roadRibbon(points, width, material, y, parent) {
  const n = points.length;
  const pos = new Float32Array(n * 2 * 3);
  const uv = new Float32Array(n * 2 * 2);
  const idx = [];
  let dist = 0;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const q = points[Math.min(i + 1, n - 1)];
    const r = points[Math.max(i - 1, 0)];
    let tx = q.x - r.x, tz = q.z - r.z;
    const len = Math.hypot(tx, tz) || 1;
    tx /= len; tz /= len;
    const px = -tz, pz = tx;
    const hw = width / 2;
    pos[i * 6] = p.x - px * hw; pos[i * 6 + 1] = y; pos[i * 6 + 2] = p.z - pz * hw;
    pos[i * 6 + 3] = p.x + px * hw; pos[i * 6 + 4] = y; pos[i * 6 + 5] = p.z + pz * hw;
    if (i > 0) dist += Math.hypot(p.x - points[i - 1].x, p.z - points[i - 1].z);
    uv[i * 4] = 0; uv[i * 4 + 1] = dist / 24;
    uv[i * 4 + 2] = 1; uv[i * 4 + 3] = dist / 24;
    if (i < n - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// Sample a road centreline from `from` to `to` (inclusive endpoints).
function sampleRoad(axis, road, from, to, step, dir = 1) {
  const pts = [];
  for (let a = from; a < to; a += step) {
    if (axis === 'ns') pts.push({ x: nsCenter(road, a, dir), z: a });
    else pts.push({ x: a, z: ewCenter(road, a, dir) });
  }
  if (axis === 'ns') pts.push({ x: nsCenter(road, to, dir), z: to });
  else pts.push({ x: to, z: ewCenter(road, to, dir) });
  return pts;
}

function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz || 1;
  let t = ((px - ax) * dx + (pz - az) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

export function buildCity(G) {
  const { scene, rng } = G;
  const root = new THREE.Group();
  scene.add(root);
  const out = { root, districts: DISTRICTS, lights: [], palms: [] };

  // Sky dome: golden-hour gradient, warm at the horizon.
  const skyTex = canvasTexture(32, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#241a4a'); grad.addColorStop(0.4, '#6e356e');
    grad.addColorStop(0.62, '#c95a3d'); grad.addColorStop(0.78, '#ff8a3d');
    grad.addColorStop(0.9, '#ffb36b'); grad.addColorStop(1, '#ffe0a8');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  });
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1600, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }),
  );
  root.add(sky);
  out.sky = sky;

  // Ground base (light sidewalk tone, so the map reads like the SA map:
  // pale blocks, dark roads, green parks) + ocean + sand.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), mat(0xa39c92));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05;
  ground.receiveShadow = true;
  root.add(ground);
  // v7.1: ocean/sand/boardwalk sit well above the ground plane (0.8 /
  // 0.5 / 0.9, was 0.1 / 0.02 / 0.06) — at 700 m the 0.15 m gaps
  // z-fought into horizontal moire bands on the map shot.
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1400, 2000), mat(0x2195a8, { roughness: 0.25, metalness: 0.15 }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(-1300, 0.8, 0);
  root.add(ocean);
  out.ocean = ocean;
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(150, 1040), mat(0xe2c491));
  sand.rotation.x = -Math.PI / 2; sand.position.set(-535, 0.5, 0);
  sand.receiveShadow = true;
  root.add(sand);
  // Boardwalk planks along the beach edge, west of the coast road.
  const boardwalk = new THREE.Mesh(new THREE.PlaneGeometry(14, 940), mat(0x9a6b42));
  boardwalk.rotation.x = -Math.PI / 2; boardwalk.position.set(-470, 0.9, 0);
  boardwalk.receiveShadow = true;
  root.add(boardwalk);

  // Roads: curved ribbons. The two roundabout roads split into two arcs
  // around the island; a flat ring underneath fills the quadrants.
  const roadMat = new THREE.MeshStandardMaterial({ map: roadTexture(), roughness: 0.95 });
  const { cx: RBX, cz: RBZ } = ROUNDABOUT;
  for (const road of ROADS.ns) {
    if (road.rb) {
      roadRibbon(sampleRoad('ns', road, -460, RBZ - RB_R, 20), ROAD_W, roadMat, 0.1, root);
      roadRibbon(sampleRoad('ns', road, RBZ - RB_R, RBZ + RB_R, 8, 1), ROAD_W, roadMat, 0.1, root);
      roadRibbon(sampleRoad('ns', road, RBZ - RB_R, RBZ + RB_R, 8, -1), ROAD_W, roadMat, 0.1, root);
      roadRibbon(sampleRoad('ns', road, RBZ + RB_R, 460, 20), ROAD_W, roadMat, 0.1, root);
    } else {
      roadRibbon(sampleRoad('ns', road, -460, 460, 20), ROAD_W, roadMat, 0.1, root);
    }
  }
  for (const road of ROADS.ew) {
    if (road.rb) {
      roadRibbon(sampleRoad('ew', road, -460, RBX - RB_R, 20), ROAD_W, roadMat, 0.1, root);
      roadRibbon(sampleRoad('ew', road, RBX - RB_R, RBX + RB_R, 8, 1), ROAD_W, roadMat, 0.1, root);
      roadRibbon(sampleRoad('ew', road, RBX - RB_R, RBX + RB_R, 8, -1), ROAD_W, roadMat, 0.1, root);
      roadRibbon(sampleRoad('ew', road, RBX + RB_R, 460, 20), ROAD_W, roadMat, 0.1, root);
    } else {
      roadRibbon(sampleRoad('ew', road, -460, 460, 20), ROAD_W, roadMat, 0.1, root);
    }
  }
  // Diagonal avenues (slightly above the other roads to avoid z-fighting).
  for (const [ax, az, bx, bz] of DIAGONALS) {
    const pts = [];
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      pts.push({ x: ax + ((bx - ax) * i) / steps, z: az + ((bz - az) * i) / steps });
    }
    roadRibbon(pts, ROAD_W, roadMat, 0.11, root);
  }
  // Minor streets: thin ribbons down the middle of every block (visual
  // layer — the map reads dense, SA-map style, instead of empty slabs).
  const minorMat = new THREE.MeshStandardMaterial({
    map: canvasTexture(64, 128, (g, w, h) => {
      g.fillStyle = '#33333a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8e8e8';
      for (let d = 0; d < h; d += 32) g.fillRect(w / 2 - 1, d, 2, 16);
    }), roughness: 0.95,
  });
  minorMat.map.wrapS = THREE.RepeatWrapping;
  minorMat.map.wrapT = THREE.RepeatWrapping;
  for (const [ax, az, bx, bz] of MINOR_SEGS) {
    // Minors ride just above the block slabs (slab top 0.4), so they read
    // on the map instead of being buried under the sidewalk blocks.
    roadRibbon([{ x: ax, z: az }, { x: bx, z: bz }], 8, minorMat, 0.42, root);
  }
  // Freeway ring around the downtown core (closed loop, wide, on top —
  // a raised freeway, SA-map style).
  roadRibbon([...FREEWAY.pts, FREEWAY.pts[0]], 20, roadMat, 0.45, root);
  // Rail line on the east edge: two dark rails + ties + a small station.
  const railMat = mat(0x4a2a2a, { roughness: 0.9 });
  for (const rx of [RAIL_X - 2, RAIL_X + 2]) {
    const pts = [];
    for (let z = -460; z <= 460; z += 40) pts.push({ x: rx, z });
    roadRibbon(pts, 2.5, railMat, 0.13, root);
  }
  for (let z = -450; z <= 450; z += 14) {
    box(7, 0.3, 1.4, mat(0x3a2a22), RAIL_X, 0.15, z, root);
  }
  box(10, 1, 24, mat(0x9a958a), RAIL_X + 9, 0.5, 0, root); // station platform
  box(10, 0.5, 24, mat(0x4a6a8a), RAIL_X + 9, 4.5, 0, root); // station roof
  for (const pz of [-10, 10]) {
    box(0.5, 4, 0.5, mat(0x555555), RAIL_X + 6, 2.5, pz, root);
    box(0.5, 4, 0.5, mat(0x555555), RAIL_X + 12, 2.5, pz, root);
  }
  // Roundabout ring + island + fountain.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(RB_ISLAND - 0.5, RB_R + 8, 40),
    new THREE.MeshStandardMaterial({ map: roadTexture(), roughness: 0.95 }),
  );
  ring.rotation.x = -Math.PI / 2; ring.position.set(RBX, 0.08, RBZ);
  ring.receiveShadow = true;
  root.add(ring);
  const island = new THREE.Mesh(new THREE.CylinderGeometry(RB_ISLAND, RB_ISLAND + 0.6, 0.7, 24), mat(0x9a938a));
  island.position.set(RBX, 0.35, RBZ);
  island.castShadow = true; island.receiveShadow = true;
  root.add(island);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 0.9, 16), mat(0x7a7a7a));
  basin.position.set(RBX, 1.1, RBZ); basin.castShadow = true;
  root.add(basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.2, 16), mat(0x3a9ab8, { roughness: 0.15, metalness: 0.3 }));
  water.position.set(RBX, 1.55, RBZ);
  root.add(water);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 2.2, 8), mat(0xcccccc));
  spout.position.set(RBX, 2.4, RBZ); spout.castShadow = true;
  root.add(spout);
  for (const [px, pz] of [[-5, -5], [5, -5], [0, 6]]) {
    const p = makePalm(rng, RBX + px, RBZ + pz, root, 0.7);
    p.position.y = 0.7;
  }

  // Crosswalks at eight main intersections (was four — v10: more
  // crossings so the streets read busy, and more traffic lights too).
  const crossMat = mat(0xe8e8e8);
  const crossPts = [
    crossing(ROADS.ns[1], ROADS.ew[1]),
    crossing(ROADS.ns[4], ROADS.ew[3]),
    crossing(ROADS.ns[2], ROADS.ew[3]),
    crossing(ROADS.ns[4], ROADS.ew[1]),
    crossing(ROADS.ns[1], ROADS.ew[3]),
    crossing(ROADS.ns[2], ROADS.ew[1]),
    crossing(ROADS.ns[4], ROADS.ew[0]),
    crossing(ROADS.ns[5], ROADS.ew[3]),
  ];
  for (const c of crossPts) {
    for (let i = -2; i <= 2; i++) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 5), crossMat);
      s.rotation.x = -Math.PI / 2; s.position.set(c.x + i * 2.6, 0.14, c.z + 9);
      s.receiveShadow = true; root.add(s);
      const s2 = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.2), crossMat);
      s2.rotation.x = -Math.PI / 2; s2.position.set(c.x + 9, 0.14, c.z + i * 2.6);
      s2.receiveShadow = true; root.add(s2);
    }
  }

  // Buildings, block by block. Blocks are the irregular quadrilaterals
  // between neighbouring curved roads — varied sizes, like a real city.
  const winTexA = windowTexture('#3a4a63', '#ffd9a0');
  const winTexB = windowTexture('#5a3a4a', '#ffe9b0');
  const winTexC = windowTexture('#6a4a3a', '#ffd9a0');
  // v10: TILE the window texture per building size — a stretched
  // 64x128 texture over a 190 m tower made the windows 19 m tall, so
  // close towers read as giant blank walls. Cloning + repeating keeps
  // every window ~13 m of facade, at any height.
  const towerMat = (tex, w = 20, h = 40) => {
    const t = tex.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(Math.max(1, Math.round(w / 13)), Math.max(1, Math.round(h / 13)));
    t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({
      map: t, emissiveMap: t, emissive: 0xff9a40, emissiveIntensity: 0.5,
      roughness: 0.4, metalness: 0.35,
    });
  };
  const hoodColors = [0xd98a5f, 0xc9b458, 0x9ab87a, 0xb06a8a, 0x7fa8b8];
  const pastel = [0xffc9d6, 0xa8e6e0, 0xffe9a8, 0xd6c2ff, 0xffd0a8];
  const slabTones = [0xc4beb0, 0xbcb6a8, 0xcdc7b8];
  // v10: plazas sit AWAY from the staging avenue — '3,1'/'3,2' were the
  // two blocks immediately east of the chase avenue, so every shot
  // showed a giant empty tan slab on the right (a plaza is just a slab
  // + fountain, no buildings). Moved to Old Town north-west and Port
  // Ember south-east, where an open square reads as intentional.
  const plazas = new Set(['1,0', '4,4']);
  const parks = new Set(['1,2', '4,1']);
  const blockCenters = [];
  for (let ix = 0; ix < ROADS.ns.length - 1; ix++) {
    for (let iz = 0; iz < ROADS.ew.length - 1; iz++) {
      const c00 = crossing(ROADS.ns[ix], ROADS.ew[iz]);
      const c01 = crossing(ROADS.ns[ix], ROADS.ew[iz + 1]);
      const c10 = crossing(ROADS.ns[ix + 1], ROADS.ew[iz]);
      const c11 = crossing(ROADS.ns[ix + 1], ROADS.ew[iz + 1]);
      const cx = (c00.x + c01.x + c10.x + c11.x) / 4;
      const cz = (c00.z + c01.z + c10.z + c11.z) / 4;
      const gapX = Math.abs(c10.x - c00.x);
      const gapZ = Math.abs(c01.z - c00.z);
      blockCenters.push([cx, cz]);
      const d = districtAt(cx, cz);
      const key = `${ix},${iz}`;
      // v7: slabs hug the roads (14 m setback, was 22) so blocks read as
      // built-up city from above instead of empty sidewalk.
      const slabW = Math.max(30, gapX - 14);
      const slabD = Math.max(30, gapZ - 14);
      const isPlaza = plazas.has(key);
      // Golf course blocks (SA-map style): green + sand traps + pond +
      // clubhouse instead of buildings.
      const inGolf = cx > GOLF_RECT[0] && cx < GOLF_RECT[2] && cz > GOLF_RECT[1] && cz < GOLF_RECT[3];
      if (inGolf) {
        const green = box(slabW, 0.4, slabD, mat(0x6fae5a), cx, 0.2, cz, root);
        green.receiveShadow = true;
        for (const [tx, tz, tr] of [[-14, -10, 7], [12, 8, 9], [0, -16, 6]]) {
          const trap = new THREE.Mesh(new THREE.CylinderGeometry(tr, tr, 0.4, 12), mat(0xe8d8a0));
          trap.position.set(cx + tx, 0.45, cz + tz); trap.scale.z = 0.6; root.add(trap);
        }
        const pond = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.3, 12), mat(0x3a9ab8, { roughness: 0.15 }));
        pond.position.set(cx + 16, 0.4, cz - 12); pond.scale.z = 0.7; root.add(pond);
        box(14, 6, 10, mat(0xf2f2f2), cx - slabW / 2 + 12, 3.4, cz + slabD / 2 - 10, root); // clubhouse
        for (let i = 0; i < 8; i++) {
          makeTree(rng, cx + rng.range(-slabW / 2 + 8, slabW / 2 - 8), cz + rng.range(-slabD / 2 + 8, slabD / 2 - 8), root, rng.range(0.9, 1.3));
        }
        continue;
      }
      // Pocket parks: green + trees instead of buildings.
      if (parks.has(key)) {
        const green = box(slabW, 0.4, slabD, mat(0x5a9a4a), cx, 0.2, cz, root);
        green.receiveShadow = true;
        for (let i = 0; i < 8; i++) {
          makeTree(rng, cx + rng.range(-slabW / 2 + 8, slabW / 2 - 8), cz + rng.range(-slabD / 2 + 8, slabD / 2 - 8), root, rng.range(0.9, 1.3));
        }
        continue;
      }
      // v7: blocks the diagonal avenue cuts through get houses in the
      // corners clear of the road (inline clearance — place() is defined
      // below), not just trees — no more empty blocks along the diagonal.
      const nearDiag = DIAGONALS.some(([ax, az, bx, bz]) => distToSegment(cx, cz, ax, az, bx, bz) < 42);
      if (nearDiag) {
        const clearDiag = (x, z) => {
          if (DIAGONALS.some(([ax, az, bx, bz]) => distToSegment(x, z, ax, az, bx, bz) < 16)) return false;
          if (Math.hypot(x - RBX, z - RBZ) < 30) return false;
          if (FREEWAY.pts.some((p) => Math.hypot(x - p.x, z - p.z) < 17)) return false;
          return true;
        };
        for (let i = 0; i < 8; i++) {
          const w = rng.range(14, 20), dep = rng.range(12, 16), hgt = rng.range(6, 12);
          const hx = cx + rng.range(-slabW / 2 + 12, slabW / 2 - 12);
          const hz = cz + rng.range(-slabD / 2 + 12, slabD / 2 - 12);
          if (!clearDiag(hx, hz)) continue;
          const b = box(w, hgt, dep, mat(rng.pick(pastel)), hx, hgt / 2 + 0.4, hz, root);
          b.rotation.y = rng.range(-0.06, 0.06); b.castShadow = true;
          pyramidRoof(w, dep, rng.range(3, 5), rng.pick([0xa03a2a, 0x3a5a8a, 0xd8a03c, 0xc94f3d]), hx, hgt + 0.4, hz, root);
        }
        for (let i = 0; i < 4; i++) {
          makeTree(rng, cx + rng.range(-slabW / 2 + 8, slabW / 2 - 8), cz + rng.range(-slabD / 2 + 8, slabD / 2 - 8), root, rng.range(0.9, 1.3));
        }
        continue;
      }
      // Block slab (sidewalk). Plazas get warm stone.
      const slab = box(slabW, 0.4, slabD, mat(isPlaza ? 0xb8a88a : rng.pick(slabTones)), cx, 0.2, cz, root);
      slab.receiveShadow = true;
      if (isPlaza) {
        const basin2 = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.5, 1, 16), mat(0x7a7a7a));
        basin2.position.set(cx, 0.9, cz); basin2.castShadow = true;
        root.add(basin2);
        const w2 = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.2, 16), mat(0x3a9ab8, { roughness: 0.15, metalness: 0.3 }));
        w2.position.set(cx, 1.4, cz);
        root.add(w2);
        for (let i = 0; i < 6; i++) {
          makeTree(rng, cx + rng.range(-slabW / 2 + 8, slabW / 2 - 8), cz + rng.range(-slabD / 2 + 8, slabD / 2 - 8), root, rng.range(0.9, 1.2));
        }
        // benches
        for (const [bx, bz, ry] of [[-8, 0, 0], [8, 0, Math.PI], [0, -8, Math.PI / 2], [0, 8, -Math.PI / 2]]) {
          const b = box(4, 0.5, 1.2, mat(0x6b4a2a), cx + bx, 0.7, cz + bz, root);
          b.rotation.y = ry; b.castShadow = true;
        }
        continue;
      }
      const nearRb = Math.hypot(cx - RBX, cz - RBZ) < 55;
      if (nearRb) continue; // keep the roundabout clear
      const localAngle = nsHeading(ROADS.ns[ix], cz);
      const diagNear = DIAGONALS.some(([ax, az, bx, bz]) => distToSegment(cx, cz, ax, az, bx, bz) < 70);
      const place = (x, z) => {
        if (DIAGONALS.some(([ax, az, bx, bz]) => distToSegment(x, z, ax, az, bx, bz) < 16)) return false;
        if (Math.hypot(x - RBX, z - RBZ) < 30) return false;
        // v7: houses may sit 6.5 m from a minor street (was 9) — they line
        // the narrow streets like the dense-city references.
        if (MINOR_SEGS.some(([ax, az, bx, bz]) => distToSegment(x, z, ax, az, bx, bz) < 6.5)) return false;
        if (FREEWAY.pts.some((p) => Math.hypot(x - p.x, z - p.z) < 17)) return false;
        return true;
      };
      if (d.type === 'downtown') {
        // v10 LIVING CITY: eight towers on a 4x2 grid (was six), much
        // taller (70-190 m, was 40-120) with varied heights, rooftop
        // AC boxes and antennas on the tallest — the skyline reads as a
        // real city wall from the street, not a toy town. Plus two
        // mid-rise slabs filling the gaps.
        for (let i = 0; i < 8; i++) {
          const w = rng.range(16, 26), dep = rng.range(16, 26), hgt = rng.range(70, 190);
          const hx = cx + ((i % 4) - 1.5) * slabW / 4 + rng.range(-5, 5);
          const hz = cz + (i < 4 ? -1 : 1) * slabD / 4 + rng.range(-5, 5);
          if (!place(hx, hz)) continue;
          const t = new THREE.Mesh(
            new THREE.BoxGeometry(w, hgt, dep),
            towerMat(rng.chance(0.5) ? winTexA : winTexB, w, hgt),
          );
          t.position.set(hx, hgt / 2 + 0.4, hz);
          t.rotation.y = diagNear ? Math.PI / 4 : rng.range(-0.06, 0.06);
          t.castShadow = true; t.receiveShadow = true;
          root.add(t);
          box(w + 2, 3, dep + 2, mat(0x2a2a33), hx, hgt + 1.5, hz, root);
          // Rooftop detail: AC boxes + a mast on the tallest towers.
          box(rng.range(3, 5), 1.6, rng.range(3, 5), mat(0x8a8a8a), hx + rng.range(-4, 4), hgt + 3.6, hz + rng.range(-4, 4), root);
          if (hgt > 140) {
            const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 14, 6), mat(0x555555));
            mast.position.set(hx, hgt + 10, hz); mast.castShadow = true; root.add(mast);
            const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff2211, emissive: 0xff2211, emissiveIntensity: 1.5 }));
            beacon.position.set(hx, hgt + 17.5, hz); root.add(beacon);
          }
        }
        for (let i = 0; i < 2; i++) {
          const w = rng.range(20, 26), dep = rng.range(14, 18), hgt = rng.range(30, 55);
          const hx = cx + (i === 0 ? -slabW / 3 : slabW / 3) + rng.range(-4, 4);
          const hz = cz + rng.range(-6, 6);
          if (!place(hx, hz)) continue;
          const m = new THREE.Mesh(
            new THREE.BoxGeometry(w, hgt, dep),
            towerMat(rng.chance(0.5) ? winTexA : winTexC, w, hgt),
          );
          m.position.set(hx, hgt / 2 + 0.4, hz);
          m.rotation.y = diagNear ? Math.PI / 4 : rng.range(-0.06, 0.06);
          m.castShadow = true; m.receiveShadow = true;
          root.add(m);
        }
      } else if (d.type === 'docks') {
        const cols = [0xc94f3d, 0x3d7fc9, 0x4fc94f, 0xd8a03c, 0x8a6fd8];
        for (let i = 0; i < rng.int(5, 8); i++) {
          const stack = rng.int(1, 3);
          for (let s = 0; s < stack; s++) {
            const hx = cx + rng.range(-slabW / 2 + 8, slabW / 2 - 8);
            const hz = cz + rng.range(-slabD / 2 + 8, slabD / 2 - 8);
            if (!place(hx, hz)) continue;
            const c = box(12, 2.6, 2.6, mat(rng.pick(cols)), hx, 1.5 + s * 2.7, hz, root);
            c.rotation.y = rng.range(-0.1, 0.1); c.castShadow = true;
          }
        }
        // Warehouses: long low sheds with a roof ridge.
        for (let i = 0; i < 2; i++) {
          const hx = cx + (i === 0 ? -slabW / 4 : slabW / 4);
          const hz = cz + (i === 0 ? slabD / 4 : -slabD / 4);
          if (!place(hx, hz)) continue;
          const wh = box(30, 8, 18, mat(0x8a8578), hx, 4.4, hz, root);
          wh.castShadow = true;
          box(32, 1, 20, mat(0x5a5a5a), hx, 8.8, hz, root);
        }
      } else if (d.type === 'beach') {
        // v7: six beach houses (was four), 3x2 grid.
        for (let i = 0; i < 6; i++) {
          const w = rng.range(11, 16), hgt = rng.range(7, 12);
          const hx = cx + ((i % 3) - 1) * slabW / 3 + rng.range(-4, 4);
          const hz = cz + (i < 3 ? -1 : 1) * slabD / 4 + rng.range(-4, 4);
          if (!place(hx, hz)) continue;
          const b = box(w, hgt, rng.range(12, 16), mat(rng.pick(pastel)), hx, hgt / 2 + 0.4, hz, root);
          b.rotation.y = rng.range(-0.06, 0.06); b.castShadow = true;
        }
        makePalm(rng, cx + rng.range(-slabW / 2 + 8, slabW / 2 - 8), cz + rng.range(-slabD / 2 + 8, slabD / 2 - 8), root);
      } else if (d.type === 'hill') {
        // v7: five hill houses (was three).
        for (let i = 0; i < 5; i++) {
          const w = rng.range(14, 20), hgt = rng.range(8, 14);
          const hx = cx + rng.range(-slabW / 2 + 10, slabW / 2 - 10);
          const hz = cz + rng.range(-slabD / 2 + 10, slabD / 2 - 10);
          if (!place(hx, hz)) continue;
          const lift = Math.max(0, (hx - 180) / 280) * 14;
          const b = box(w, hgt, 16, mat(rng.pick(hoodColors)), hx, hgt / 2 + 0.4 + lift, hz, root);
          b.rotation.y = rng.range(-0.06, 0.06); b.castShadow = true;
          pyramidRoof(w, 16, 4, 0x7a4a3a, hx, hgt + 0.4 + lift, hz, root);
        }
      } else {
        // v7.1: THIRTY houses per block in a 5x6 grid (was 5x5) — tighter
        // in z so no empty strips show between rows from above.
        const roofCols = [0xa03a2a, 0x3a5a8a, 0x4a7a3a, 0xd8a03c, 0x2a8a8a, 0x8a8a8a, 0xe8dcc0, 0xc94f3d];
        for (let i = 0; i < 30; i++) {
          const col = i % 5, row = Math.floor(i / 5);
          const w = rng.range(15, 21), dep = rng.range(14, 18), hgt = d.type === 'brick' ? rng.range(18, 30) : rng.range(6, 10);
          const hx = cx + (col - 2) * slabW / 5 + rng.range(-3, 3);
          const hz = cz + (row - 2.5) * slabD / 6 + rng.range(-3, 3);
          if (!place(hx, hz)) continue;
          const colr = d.type === 'hood' ? rng.pick(hoodColors) : d.type === 'brick' ? 0x9a5a44 : rng.pick(pastel);
          let b;
          if (d.type === 'brick') {
            // v10: Old Town brick blocks taller (18-30 m, was 12-22).
            b = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, dep), towerMat(winTexC, w, hgt));
            b.position.set(hx, hgt / 2 + 0.4, hz);
            root.add(b);
          } else {
            b = box(w, hgt, dep, mat(colr), hx, hgt / 2 + 0.4, hz, root);
          }
          b.rotation.y = diagNear ? Math.PI / 4 : localAngle + rng.range(-0.05, 0.05);
          b.castShadow = true; b.receiveShadow = true;
          if (d.type !== 'brick') pyramidRoof(w, dep, rng.range(3, 5), rng.pick(roofCols), hx, hgt + 0.4, hz, root);
          else box(w + 1, 1.2, dep + 1, mat(0x5a3a30), hx, hgt + 1, hz, root);
        }
        // v10: six mid-rise apartment blocks per residential block
        // (was four), taller (22-34 m, was 13-18) — no more flat roofs.
        if (d.type === 'residential' || d.type === 'marina') {
          for (let i = 0; i < 6; i++) {
            const w = rng.range(20, 26), dep = rng.range(15, 18), hgt = rng.range(22, 34);
            const hx = cx + (i % 2 === 0 ? -slabW / 2 + 14 : slabW / 2 - 14);
            const hz = cz + (Math.floor(i / 2) - 1) * slabD / 3;
            if (!place(hx, hz)) continue;
            const m = new THREE.Mesh(
              new THREE.BoxGeometry(w, hgt, dep),
              towerMat(rng.chance(0.5) ? winTexA : winTexB, w, hgt),
            );
            m.position.set(hx, hgt / 2 + 0.4, hz);
            m.rotation.y = diagNear ? Math.PI / 4 : localAngle + rng.range(-0.05, 0.05);
            m.castShadow = true; m.receiveShadow = true;
            root.add(m);
            box(w + 1, 1, dep + 1, mat(0x5a3a30), hx, hgt + 0.9, hz, root);
          }
        }
      }
      // Beach houses along the coast road (west column of blocks).
      if (ix === 0) {
        for (let i = 0; i < 2; i++) {
          const hx = cx - slabW / 2 + 12;
          const hz = cz + (i === 0 ? -slabD / 4 : slabD / 4);
          if (!place(hx, hz)) continue;
          const w = rng.range(12, 16), hgt = rng.range(7, 11);
          const b = box(w, hgt, rng.range(12, 15), mat(rng.pick(pastel)), hx, hgt / 2 + 0.4, hz, root);
          b.rotation.y = rng.range(-0.06, 0.06); b.castShadow = true;
          pyramidRoof(w, 14, 3.5, rng.pick([0x7a4a3a, 0x4a5a7a]), hx, hgt + 0.4, hz, root);
        }
        makePalm(rng, cx - slabW / 2 + 8, cz, root, 0.9);
      }
    }
  }

  // Hillside slope mesh (north-east).
  const hill = new THREE.Mesh(new THREE.PlaneGeometry(280, 240), mat(0x7a8a5a));
  hill.rotation.x = -Math.PI / 2; hill.rotation.z = 0.05;
  hill.position.set(320, 7, -60);
  hill.receiveShadow = true;
  root.add(hill);

  // Docks crane + container stacks in the eastern strip.
  const crane = new THREE.Group();
  box(4, 46, 4, mat(0xd8a03c), 0, 23, 0, crane);
  box(4, 46, 4, mat(0xd8a03c), 26, 23, 0, crane);
  box(34, 4, 4, mat(0xd8a03c), 13, 46, 0, crane);
  box(20, 3, 3, mat(0x3a3a3a), -6, 42, 0, crane);
  const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 14, 6), mat(0x333333));
  hook.position.set(-14, 34, 0); crane.add(hook);
  box(3, 3, 3, mat(0xc94f3d), -14, 26, 0, crane);
  crane.position.set(370, 0, 170);
  crane.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  root.add(crane);
  const dockCols = [0xc94f3d, 0x3d7fc9, 0x4fc94f, 0xd8a03c];
  for (let i = 0; i < 10; i++) {
    const hx = rng.range(345, 435), hz = rng.range(80, 430);
    // Keep the docks clear of the runway strip and the stadium.
    if (hx > 220 && hx < 440 && hz > 360 && hz < 400) continue;
    if (Math.hypot(hx - STADIUM.x, hz - STADIUM.z) < 42) continue;
    const stack = rng.int(1, 3);
    for (let s = 0; s < stack; s++) {
      const c = box(12, 2.6, 2.6, mat(rng.pick(dockCols)), hx, 1.5 + s * 2.7, hz, root);
      c.rotation.y = rng.range(-0.08, 0.08); c.castShadow = true;
    }
  }

  // Ember Bay International — runway, terminal, tower, parked planes
  // (SA-map style landmark in the south-east corner).
  const runway = new THREE.Mesh(new THREE.PlaneGeometry(220, 26), mat(0x2a2a30, { roughness: 0.95 }));
  runway.rotation.x = -Math.PI / 2; runway.position.set(330, 0.12, 380);
  runway.receiveShadow = true; root.add(runway);
  for (let x = 230; x <= 430; x += 20) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.5), mat(0xffffff));
    dash.rotation.x = -Math.PI / 2; dash.position.set(x, 0.14, 380);
    root.add(dash);
  }
  for (const ex of [232, 428]) {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(2, 24), mat(0xffffff));
    bar.rotation.x = -Math.PI / 2; bar.position.set(ex, 0.14, 380);
    root.add(bar);
  }
  box(110, 9, 26, mat(0xe8e8e8), 330, 4.5, 335, root); // terminal
  box(110, 1, 30, mat(0x4a6a8a), 330, 9.5, 335, root); // terminal roof band
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4.5, 26, 10), mat(0xcccccc));
  tower.position.set(395, 13, 330); tower.castShadow = true; root.add(tower);
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 4, 10), mat(0x14202e, { roughness: 0.12, metalness: 0.6 }));
  cab.position.set(395, 28, 330); root.add(cab);
  // Parked planes: fuselage + wings + tail fin.
  for (const [px, pz] of [[300, 352], [362, 354]]) {
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 26, 10), mat(0xf2f2f2));
    fus.rotation.z = Math.PI / 2; fus.position.set(px, 2.5, pz); fus.castShadow = true; root.add(fus);
    box(6, 0.4, 22, mat(0xf2f2f2), px, 2.5, pz, root); // wings
    box(0.4, 5, 4, mat(0x2a6fd8), px - 12, 5, pz, root); // tail fin
    box(26, 0.5, 1, mat(0x2a6fd8), px, 1.2, pz + 2.1, root); // cheatline
  }

  // Ember Bowl stadium (SA-map style white circle, east side).
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(30, 32, 9, 28), mat(0xf2f2f2));
  bowl.position.set(STADIUM.x, 4.5, STADIUM.z); bowl.castShadow = true; root.add(bowl);
  const field = new THREE.Mesh(new THREE.CylinderGeometry(24, 24, 0.6, 28), mat(0x4a8f3c));
  field.position.set(STADIUM.x, 9.2, STADIUM.z); root.add(field);
  const ringTop = new THREE.Mesh(new THREE.TorusGeometry(27, 1.2, 6, 28), mat(0x2a6fd8));
  ringTop.rotation.x = Math.PI / 2; ringTop.position.set(STADIUM.x, 9.4, STADIUM.z); root.add(ringTop);

  // Palms on the sand + along the beachfront, umbrellas on the sand.
  for (let z = -420; z <= 420; z += 70) {
    makePalm(rng, -475 + rng.range(-6, 6), z + rng.range(-15, 15), root);
    makePalm(rng, -490 + rng.range(-8, 8), z + 35, root, 0.9);
  }
  for (let i = 0; i < 12; i++) {
    makeUmbrella(rng, rng.range(-590, -480), rng.range(-420, 420), root);
  }
  for (const [bx, bz] of [[-350, -350], [-350, 150], [150, -350], [150, 350], [-50, -50]]) {
    makePalm(rng, bx, bz, root, 0.9);
  }

  // Street trees along every road, just off the asphalt.
  for (const road of ROADS.ns) {
    for (let z = -420; z <= 420; z += 110) {
      const side = (Math.round(z / 110) % 2 === 0) ? 1 : -1;
      const x = nsPlain(road, z) + side * 11;
      if (Math.hypot(x - RBX, z - RBZ) < 32) continue;
      if (DIAGONALS.some(([ax, az, bx, bz]) => distToSegment(x, z, ax, az, bx, bz) < 12)) continue;
      makeTree(rng, x, z, root, rng.range(0.9, 1.25));
    }
  }
  for (const road of ROADS.ew) {
    for (let x = -420; x <= 420; x += 110) {
      const side = (Math.round(x / 110) % 2 === 0) ? 1 : -1;
      const z = ewPlain(road, x) + side * 11;
      if (Math.hypot(x - RBX, z - RBZ) < 32) continue;
      if (DIAGONALS.some(([ax, az, bx, bz]) => distToSegment(x, z, ax, az, bx, bz) < 12)) continue;
      makeTree(rng, x, z, root, rng.range(0.9, 1.25));
    }
  }

  // Billboards with original copy, on block centres facing the city.
  const boardBlocks = [[0, 0], [4, 0], [0, 3], [4, 2], [2, 0], [1, 3]];
  const boardCopy = [
    [['EMBER BAY', 'WELCOME TO THE BAY'], '#1c2a4d', '#ffd24d'],
    [['BAY FM 98.2', 'SUNSET DRIVE'], '#4d1c2a', '#7fd4ff'],
    [['SUNSET TAPES', 'FIND ALL 20'], '#2a4d1c', '#ff9de2'],
    [['PIER 9', 'FISH & CHIPS'], '#4d3a1c', '#ffe14d'],
    [['LOWRIDER NIGHTS', 'EVERY FRIDAY'], '#3a1c4d', '#ff6fa5'],
    [['PORT EMBER', 'CRANES · CRATES · CASH'], '#1c4d4d', '#ffffff'],
  ];
  boardBlocks.forEach(([bix, biz], i) => {
    const [bx, bz] = blockCenters[bix * (ROADS.ew.length - 1) + biz];
    const [lines, bg, fg] = boardCopy[i % boardCopy.length];
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 12, 6), mat(0x555555));
    pole.position.y = 6; pole.castShadow = true; g.add(pole);
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(20, 10, 0.6),
      new THREE.MeshStandardMaterial({ map: billboardTexture(lines, bg, fg), roughness: 0.6 }),
    );
    panel.position.y = 15; panel.castShadow = true; g.add(panel);
    g.position.set(bx, 0, bz);
    g.rotation.y = Math.atan2(-bx, -bz);
    root.add(g);
  });

  // v8 neon signs along the Sunset Row avenue (NS road 3, the staging
  // avenue): glowing shop signs that read at night. Original names.
  const NEON_SIGNS = [
    ['CLUB EMBER', '#ff2d95', -130, 7],
    ['NEON MOTEL', '#2fd8ff', -70, 9],
    ['BAY ARCADE', '#ffd24d', -10, 7],
    ['SUNSET LIQUOR', '#ff7a3d', 50, 8],
    ['PIER 9 DINER', '#7dff5e', 110, 7],
  ];
  for (const [text, color, z, y] of NEON_SIGNS) {
    const sx = nsPlain(ROADS.ns[3], z) + 11;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 3.2),
      new THREE.MeshBasicMaterial({ map: neonTexture(text, color) }),
    );
    sign.position.set(sx, y, z);
    sign.rotation.y = -Math.PI / 2; // face west, onto the avenue
    root.add(sign);
    const back = box(13.4, 3.6, 0.3, mat(0x0a0614), sx + 0.2, y, z, root);
    back.rotation.y = -Math.PI / 2;
  }

  // Street lamps along the avenues, lamps on for golden hour.
  for (const road of ROADS.ns) {
    for (let z = -400; z <= 400; z += 120) {
      const side = (Math.round(z / 120) % 2 === 0) ? 1 : -1;
      const x = nsPlain(road, z) + side * 8.5;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 9, 6), mat(0x3a3a3a));
      pole.position.set(x, 4.5, z); root.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffd24d, emissiveIntensity: 0.9 }));
      lamp.position.set(x, 9.2, z); root.add(lamp);
    }
  }
  for (const road of ROADS.ew) {
    for (let x = -400; x <= 400; x += 120) {
      const side = (Math.round(x / 120) % 2 === 0) ? 1 : -1;
      const z = ewPlain(road, x) + side * 8.5;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 9, 6), mat(0x3a3a3a));
      pole.position.set(x, 4.5, z); root.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffd24d, emissiveIntensity: 0.9 }));
      lamp.position.set(x, 9.2, z); root.add(lamp);
    }
  }

  // Traffic lights at eight intersections (never at the roundabout).
  for (const c of crossPts) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 7, 6), mat(0x2a2a2a));
    pole.position.y = 3.5; g.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3, 1.2), mat(0x1a1a1a));
    head.position.y = 7.4; g.add(head);
    const lamps = [];
    for (let i = 0; i < 3; i++) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x111111 }));
      l.position.set(0, 8.3 - i * 0.85, 0.65); g.add(l); lamps.push(l);
    }
    g.position.set(c.x + 9, 0, c.z + 9);
    root.add(g);
    out.lights.push({ pos: new THREE.Vector3(c.x + 9, 0, c.z + 9), axis: 'ns', phase: rng.range(0, 12), lamps, head });
  }

  // v10 STREET LIFE — the staging avenue reads like top-1's boulevard:
  // a row of BIG palms with red trunks down both sides, parked cars
  // lining the curbs, bus-stop shelters, and two more neon signs.
  const stageRoad = ROADS.ns[3];
  const nearCrossing = (x, z, m = 16) => crossPts.some((c) => Math.hypot(x - c.x, z - c.z) < m);
  for (let z = -400; z <= 400; z += 34) {
    for (const side of [-1, 1]) {
      const x = nsPlain(stageRoad, z) + side * 12;
      if (Math.hypot(x - RBX, z - RBZ) < 34) continue;
      if (nearCrossing(x, z)) continue;
      if (DIAGONALS.some(([ax, az, bx, bz]) => distToSegment(x, z, ax, az, bx, bz) < 12)) continue;
      // v10: slender red trunks (trunkScale 0.55) — the fat trunks read
      // as giant red columns when the chase camera passes close by.
      makePalm(rng, x, z, root, rng.range(1.15, 1.45), 0xc23a2e, 0.55);
    }
  }
  // Lightweight parked car (~10 meshes): body + cabin + 4 wheels +
  // lamps. Static — never updated by traffic.
  const parkedColors = [0x2a6fd8, 0xd83a2a, 0xcccccc, 0x222831, 0xff6a00, 0x2fd05a, 0xe8b820, 0x8a6fd8];
  const makeParkedCar = (x, z, heading, color) => {
    const g = new THREE.Group();
    const paint = mat(color, { roughness: 0.45, metalness: 0.35 });
    const glass = mat(0x14202e, { roughness: 0.12, metalness: 0.65 });
    const dark = mat(0x1a1a1a, { roughness: 0.8 });
    box(2.0, 0.55, 4.6, paint, 0, 0.55, 0, g);
    box(1.75, 0.55, 2.0, glass, 0, 1.08, -0.3, g);
    box(1.8, 0.08, 1.9, paint, 0, 1.38, -0.3, g);
    for (const [wx, wz] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), dark);
      w.rotation.z = Math.PI / 2; w.position.set(wx, 0.42, wz); g.add(w);
    }
    box(0.55, 0.14, 0.08, mat(0xfff2b0, { emissive: 0xffe9a0, emissiveIntensity: 0.8 }), -0.65, 0.62, 2.32, g);
    box(0.55, 0.14, 0.08, mat(0xfff2b0, { emissive: 0xffe9a0, emissiveIntensity: 0.8 }), 0.65, 0.62, 2.32, g);
    box(0.6, 0.14, 0.08, mat(0xd81a1a, { emissive: 0xaa0000, emissiveIntensity: 0.8 }), -0.65, 0.62, -2.32, g);
    box(0.6, 0.14, 0.08, mat(0xd81a1a, { emissive: 0xaa0000, emissiveIntensity: 0.8 }), 0.65, 0.62, -2.32, g);
    g.position.set(x, 0, z);
    g.rotation.y = heading;
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    root.add(g);
    return g;
  };
  // Parked rows along the staging avenue curbs (both sides, gaps at
  // intersections and the roundabout), plus a few on the cross avenues.
  const parkOnRoad = (axis, road, from, to, step) => {
    for (let a = from; a <= to; a += step) {
      const p = axis === 'ns'
        ? { x: nsPlain(road, a), z: a, h: 0 }
        : { x: a, z: ewPlain(road, a), h: Math.PI / 2 };
      for (const side of [-1, 1]) {
        if (rng.chance(0.25)) continue; // gaps in the row
        const off = 9.6;
        const x = axis === 'ns' ? p.x + side * off : p.x;
        const z = axis === 'ns' ? p.z : p.z + side * off;
        if (Math.hypot(x - RBX, z - RBZ) < 34) continue;
        if (nearCrossing(x, z, 20)) continue;
        if (DIAGONALS.some(([ax, az, bx, bz]) => distToSegment(x, z, ax, az, bx, bz) < 12)) continue;
        const heading = p.h + (side < 0 ? Math.PI : 0) + rng.range(-0.03, 0.03);
        makeParkedCar(x, z, heading, rng.pick(parkedColors));
      }
    }
  };
  parkOnRoad('ns', ROADS.ns[3], -420, 420, 26);
  parkOnRoad('ns', ROADS.ns[2], -420, 420, 52);
  parkOnRoad('ns', ROADS.ns[4], -420, 420, 52);
  parkOnRoad('ew', ROADS.ew[1], -420, 420, 52);
  parkOnRoad('ew', ROADS.ew[3], -420, 420, 52);
  // Bus-stop shelters at four intersections.
  for (const c of [crossPts[0], crossPts[1], crossPts[4], crossPts[5]]) {
    const g = new THREE.Group();
    box(0.25, 3, 0.25, mat(0x3a3a3a), -2.2, 1.5, 0, g);
    box(0.25, 3, 0.25, mat(0x3a3a3a), 2.2, 1.5, 0, g);
    box(5.2, 0.25, 2.2, mat(0x2a6fd8), 0, 3.1, 0, g);
    box(4.6, 0.5, 1.0, mat(0x6b4a2a), 0, 0.7, 0, g);
    g.position.set(c.x + 11, 0, c.z + 11);
    g.rotation.y = rng.range(0, Math.PI);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    root.add(g);
  }
  // Two more neon signs on the staging avenue (v8 had five).
  const NEON_EXTRA = [
    ['EMBER TACOS', '#ff5e2d', -190, 8],
    ['HOTEL CORALIE', '#2fd8ff', 190, 8],
  ];
  for (const [text, color, z, y] of NEON_EXTRA) {
    const sx = nsPlain(ROADS.ns[3], z) + 11;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 3.2),
      new THREE.MeshBasicMaterial({ map: neonTexture(text, color) }),
    );
    sign.position.set(sx, y, z);
    sign.rotation.y = -Math.PI / 2;
    root.add(sign);
    const back = box(13.4, 3.6, 0.3, mat(0x0a0614), sx + 0.2, y, z, root);
    back.rotation.y = -Math.PI / 2;
  }

  return out;
}
