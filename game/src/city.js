import * as THREE from 'three';


export const WORLD = { min: -460, max: 460 };

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

export const ROADS = {
  ns: [
    { base: -440, amp: 14, freq: Math.PI / 520, phase: 0.4 },
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
export const ROAD_W = 12;
export const RB_R = 18;
export const RB_ISLAND = 10;

export const DIAGONALS = [
  [-430, 300, 300, -430],
  [180, 260, 420, 430],
];

export function nsPlain(road, z) { return road.base + road.amp * Math.sin(z * road.freq + road.phase); }
export function ewPlain(road, x) { return road.base + road.amp * Math.sin(x * road.freq + road.phase); }

export function crossing(n, e) {
  let x = n.base, z = e.base;
  for (let i = 0; i < 5; i++) {
    x = nsPlain(n, z);
    z = ewPlain(e, x);
  }
  return { x, z };
}

const RB_NS = ROADS.ns[3];
const RB_EW = ROADS.ew[2];
export const ROUNDABOUT = (() => {
  const c = crossing(RB_NS, RB_EW);
  return { cx: c.x, cz: c.z, r: RB_R };
})();

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

export const FREEWAY = (() => {
  const cx = 40, cz = 0, rx = 210, rz = 190;
  const pts = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * rx, z: cz + Math.sin(a) * rz });
  }
  return { cx, cz, rx, rz, pts };
})();

export const GOLF_RECT = [-100, 280, 160, 440];
export const STADIUM = { x: 330, z: 140, r: 30 };
export const RAIL_X = 405;

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
export function nsHeading(road, z, dir = 1) {
  const d = nsSlope(road, z, dir);
  return dir > 0 ? Math.atan2(d, 1) : Math.atan2(-d, -1);
}
export function ewHeading(road, x, dir = 1) {
  const d = ewSlope(road, x, dir);
  return dir > 0 ? Math.atan2(1, d) : Math.atan2(-1, -d);
}
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
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

function roadTexture() {
  const t = canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = '#232327';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#33333a';
    for (let i = 0; i < 200; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    g.fillStyle = '#28282d';
    for (let i = 0; i < 6; i++) g.fillRect(Math.random() * w, Math.random() * h, 18 + Math.random() * 22, 10 + Math.random() * 18);
    g.fillStyle = '#e8b820';
    g.fillRect(w / 2 - 6, 0, 4, h);
    g.fillRect(w / 2 + 2, 0, 4, h);
    g.fillStyle = '#e8e8e8';
    for (let d = 0; d < h; d += 32) {
      g.fillRect(w / 4 - 1, d, 2, 16);
      g.fillRect((3 * w) / 4 - 1, d, 2, 16);
    }
    g.fillStyle = '#cccccc';
    g.fillRect(3, 0, 2, h);
    g.fillRect(w - 5, 0, 2, h);
  });
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

function facade(kind, seed) {
  let s = (seed * 2654435761) >>> 0;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  return canvasTexture(128, 256, (g, w, h) => {
    if (kind === 0) {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#0e1c2c');
      gr.addColorStop(1, '#0a1420');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 16) {
        g.fillStyle = '#05070c';
        g.fillRect(x, 0, 2, h);
      }
      for (let y = 0; y < h; y += 16) {
        g.fillStyle = '#05070c';
        g.fillRect(0, y, w, 1);
        for (let x = 4; x < w; x += 16) {
          const r = rnd();
          g.fillStyle = r < 0.2 ? '#cfe8ff' : r < 0.3 ? '#ffd9a0' : r < 0.36 ? '#9fd8ff' : '#0d1a26';
          g.fillRect(x, y + 3, 10, 11);
        }
      }
      g.fillStyle = 'rgba(140,190,230,0.12)';
      for (let x = 8; x < w; x += 32) g.fillRect(x, 0, 6, h);
    } else if (kind === 1) {
      g.fillStyle = '#4a3626';
      g.fillRect(0, 0, w, h);
      const warm = ['#ffd9a0', '#ff9a40', '#ffe9b0', '#ff7a3d'];
      for (let y = 6; y < h - 6; y += 14) {
        const lit = 0.25 + rnd() * 0.65;
        g.fillStyle = '#2a2018';
        g.fillRect(0, y + 11, w, 3);
        for (let x = 6; x < w - 6; x += 12) {
          g.fillStyle = rnd() < lit ? warm[(rnd() * 4) | 0] : '#141c28';
          g.fillRect(x, y, rnd() < 0.2 ? 16 : 8, 8);
        }
      }
    } else if (kind === 2) {
      g.fillStyle = '#0d1119';
      g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 8) {
        g.fillStyle = '#04060a';
        g.fillRect(x, 0, 2, h);
      }
      for (let y = 8; y < h - 8; y += 16) {
        const band = (y / 16) % 3 === 0;
        for (let x = 4; x < w - 4; x += 12) {
          const r = rnd();
          g.fillStyle = band && r < 0.55 ? '#ffd9a0' : band && r < 0.7 ? '#cfe8ff' : r < 0.12 ? '#8fc4e8' : '#101623';
          g.fillRect(x, y, 8, 10);
        }
      }
      g.fillStyle = '#2a3a4a';
      g.fillRect(0, 0, w, 3);
    } else {
      g.fillStyle = '#c8bc9c';
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 32) {
        g.fillStyle = '#6a4a3a';
        g.fillRect(0, y, w, 3);
      }
      for (let y = 10; y < h - 6; y += 16) {
        for (let x = 8; x < w - 6; x += 16) {
          g.fillStyle = rnd() < 0.2 ? '#ffd9a0' : '#23232e';
          g.fillRect(x, y, 8, 9);
        }
      }
    }
  });
}

function billboardTexture(lines, bg, fg) {
  return canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = fg;
    g.lineWidth = 6;
    g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'bold 34px Verdana';
    lines.forEach((ln, i) => g.fillText(ln, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 40));
  });
}

function neonTexture(text, color) {
  return canvasTexture(512, 128, (g, w, h) => {
    g.fillStyle = '#0a0614';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = color;
    g.lineWidth = 5;
    g.shadowColor = color;
    g.shadowBlur = 22;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = color;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'bold 52px Verdana';
    g.fillText(text, w / 2, h / 2 + 2);
    g.shadowBlur = 0;
    g.fillStyle = '#ffffff';
    g.font = 'bold 50px Verdana';
    g.globalAlpha = 0.35;
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

const SHOP_TEX = {};
function shopfrontTexture(color) {
  if (SHOP_TEX[color]) return SHOP_TEX[color];
  const t = canvasTexture(128, 64, (g, w, h) => {
    g.fillStyle = '#14161e';
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      g.fillStyle = (x / 16) % 2 ? color : '#f2ede0';
      g.fillRect(x, 0, 16, 14);
    }
    g.fillStyle = '#0a0d14';
    g.fillRect(0, 14, w, 4);
    for (let x = 6; x < w - 6; x += 24) {
      g.fillStyle = ['#ffd9a0', '#ff9a40', '#cfe8ff', '#ffe9b0'][(x / 24 | 0) % 4];
      g.fillRect(x, 24, 16, 26);
      g.fillStyle = '#05070c';
      g.fillRect(x + 7, 24, 2, 26);
    }
    g.fillStyle = '#3a3f4a';
    g.fillRect(0, 54, w, 10);
  });
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  SHOP_TEX[color] = t;
  return t;
}
function shopMat(color, w = 20) {
  const t = shopfrontTexture(color);
  t.repeat.set(Math.max(1, Math.round(w / 13)), 1);
  return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.6, metalness: 0.1 });
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
  trunk.position.y = 3.5 * scale;
  trunk.rotation.z = lean;
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
  c1.position.y = 3.6 * scale;
  c1.scale.y = 0.85;
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
  pole.position.y = 1.3;
  g.add(pole);
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.9, 8), mat(rng.pick([0xff6fa5, 0xff8c42, 0x7fd4ff, 0xffe14d])));
  top.position.y = 2.8;
  top.castShadow = true;
  g.add(top);
  g.position.set(x, 0, z);
  parent.add(g);
  return g;
}


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
    tx /= len;
    tz /= len;
    const px = -tz, pz = tx;
    const hw = width / 2;
    pos[i * 6] = p.x - px * hw;
    pos[i * 6 + 1] = y;
    pos[i * 6 + 2] = p.z - pz * hw;
    pos[i * 6 + 3] = p.x + px * hw;
    pos[i * 6 + 4] = y;
    pos[i * 6 + 5] = p.z + pz * hw;
    if (i > 0) dist += Math.hypot(p.x - points[i - 1].x, p.z - points[i - 1].z);
    uv[i * 4] = 0;
    uv[i * 4 + 1] = dist / 24;
    uv[i * 4 + 2] = 1;
    uv[i * 4 + 3] = dist / 24;
    if (i < n - 1) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
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

  const skyTex = canvasTexture(32, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#2a1a4e');
    grad.addColorStop(0.4, '#8a3a55');
    grad.addColorStop(0.62, '#e06030');
    grad.addColorStop(0.78, '#ff8a3d');
    grad.addColorStop(0.9, '#ffb36b');
    grad.addColorStop(1, '#ffe0a8');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1600, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }),
  );
  root.add(sky);
  out.sky = sky;

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), mat(0x6b6a58));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  root.add(ground);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1400, 2000), mat(0x2195a8, { roughness: 0.25, metalness: 0.15 }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(-1300, 0.8, 0);
  root.add(ocean);
  out.ocean = ocean;
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(150, 1040), mat(0xe2c491));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-535, 0.5, 0);
  sand.receiveShadow = true;
  root.add(sand);
  const boardwalk = new THREE.Mesh(new THREE.PlaneGeometry(14, 940), mat(0x9a6b42));
  boardwalk.rotation.x = -Math.PI / 2;
  boardwalk.position.set(-470, 0.9, 0);
  boardwalk.receiveShadow = true;
  root.add(boardwalk);
  const sunTex = canvasTexture(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, 'rgba(255,250,220,1)');
    gr.addColorStop(0.35, 'rgba(255,180,80,0.9)');
    gr.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  const sunDisc = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), new THREE.MeshBasicMaterial({ map: sunTex, transparent: true, fog: false, depthWrite: false }));
  sunDisc.position.set(-350, 60, 800);
  sunDisc.rotation.y = Math.PI;
  root.add(sunDisc);
  for (const [mx, mz, mr, mh] of [[-500, -720, 170, 130], [-100, -780, 200, 160], [300, -720, 160, 120], [720, -300, 180, 140], [720, 300, 160, 110]]) {
    const mtn = new THREE.Mesh(new THREE.ConeGeometry(mr, mh, 7), mat(0x5a4a7a, { roughness: 1 }));
    mtn.position.set(mx, mh / 2 - 4, mz);
    root.add(mtn);
  }
  const hillMound = new THREE.Mesh(new THREE.ConeGeometry(150, 70, 4), mat(0x4a5a3a, { roughness: 1 }));
  hillMound.position.set(-20, 30, 565);
  hillMound.rotation.y = Math.PI / 4;
  hillMound.scale.set(2.2, 1, 1.6);
  root.add(hillMound);
  const signTex = canvasTexture(1024, 192, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = 'bold 128px Verdana';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 14;
    g.strokeStyle = '#1a2a1a';
    g.strokeText('EMBER BAY', w / 2, h / 2);
    g.fillStyle = '#f5e8c8';
    g.fillText('EMBER BAY', w / 2, h / 2);
  });
  const signGroup = new THREE.Group();
  signGroup.position.set(-20, 42, 488.5);
  signGroup.rotation.y = Math.PI;
  const signBack = new THREE.Mesh(new THREE.PlaneGeometry(210, 38), mat(0x2a3a22, { roughness: 1 }));
  signBack.position.z = -0.6;
  signBack.rotation.x = -0.28;
  signGroup.add(signBack);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(200, 34), new THREE.MeshBasicMaterial({ map: signTex, transparent: true, fog: false }));
  sign.rotation.x = -0.28;
  signGroup.add(sign);
  root.add(signGroup);

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
  for (const [ax, az, bx, bz] of DIAGONALS) {
    const pts = [];
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      pts.push({ x: ax + ((bx - ax) * i) / steps, z: az + ((bz - az) * i) / steps });
    }
    roadRibbon(pts, ROAD_W, roadMat, 0.11, root);
  }
  const offsetPts = (pts, d) => pts.map((p, i) => {
    const q = pts[Math.min(i + 1, pts.length - 1)];
    const r = pts[Math.max(i - 1, 0)];
    let tx = q.x - r.x, tz = q.z - r.z;
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    return { x: p.x - tz * d, z: p.z + tx * d };
  });
  const roadSegments = (axis, road) => {
    if (!road.rb) return [sampleRoad(axis, road, -460, 460, 20)];
    if (axis === 'ns') return [sampleRoad('ns', road, -460, RBZ - RB_R, 20), sampleRoad('ns', road, RBZ - RB_R, RBZ + RB_R, 8, 1), sampleRoad('ns', road, RBZ - RB_R, RBZ + RB_R, 8, -1), sampleRoad('ns', road, RBZ + RB_R, 460, 20)];
    return [sampleRoad('ew', road, -460, RBX - RB_R, 20), sampleRoad('ew', road, RBX - RB_R, RBX + RB_R, 8, 1), sampleRoad('ew', road, RBX - RB_R, RBX + RB_R, 8, -1), sampleRoad('ew', road, RBX + RB_R, 460, 20)];
  };
  const walkMat = mat(0xb5ad9c, { roughness: 0.95 });
  const curbMat = mat(0x3a3a3a, { roughness: 0.9 });
  for (const axis of ['ns', 'ew']) {
    for (const road of ROADS[axis]) {
      for (const seg of roadSegments(axis, road)) {
        for (const s of [-1, 1]) {
          roadRibbon(offsetPts(seg, s * (ROAD_W / 2 + 1.75)), 3.5, walkMat, 0.12, root);
          roadRibbon(offsetPts(seg, s * (ROAD_W / 2 + 0.3)), 0.6, curbMat, 0.14, root);
        }
      }
    }
  }
  const minorMat = new THREE.MeshStandardMaterial({
    map: canvasTexture(64, 128, (g, w, h) => {
      g.fillStyle = '#33333a';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8e8e8';
      for (let d = 0; d < h; d += 32) g.fillRect(w / 2 - 1, d, 2, 16);
    }), roughness: 0.95,
  });
  minorMat.map.wrapS = THREE.RepeatWrapping;
  minorMat.map.wrapT = THREE.RepeatWrapping;
  for (const [ax, az, bx, bz] of MINOR_SEGS) {
    roadRibbon([{ x: ax, z: az }, { x: bx, z: bz }], 8, minorMat, 0.42, root);
  }
  roadRibbon([...FREEWAY.pts, FREEWAY.pts[0]], 20, roadMat, 0.45, root);
  const railMat = mat(0x4a2a2a, { roughness: 0.9 });
  for (const rx of [RAIL_X - 2, RAIL_X + 2]) {
    const pts = [];
    for (let z = -460; z <= 460; z += 40) pts.push({ x: rx, z });
    roadRibbon(pts, 2.5, railMat, 0.13, root);
  }
  for (let z = -450; z <= 450; z += 14) {
    box(7, 0.3, 1.4, mat(0x3a2a22), RAIL_X, 0.15, z, root);
  }
  box(10, 1, 24, mat(0x9a958a), RAIL_X + 9, 0.5, 0, root);
  box(10, 0.5, 24, mat(0x4a6a8a), RAIL_X + 9, 4.5, 0, root);
  for (const pz of [-10, 10]) {
    box(0.5, 4, 0.5, mat(0x555555), RAIL_X + 6, 2.5, pz, root);
    box(0.5, 4, 0.5, mat(0x555555), RAIL_X + 12, 2.5, pz, root);
  }
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(RB_ISLAND - 0.5, RB_R + 8, 40),
    new THREE.MeshStandardMaterial({ map: roadTexture(), roughness: 0.95 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(RBX, 0.08, RBZ);
  ring.receiveShadow = true;
  root.add(ring);
  const island = new THREE.Mesh(new THREE.CylinderGeometry(RB_ISLAND, RB_ISLAND + 0.6, 0.7, 24), mat(0x9a938a));
  island.position.set(RBX, 0.35, RBZ);
  island.castShadow = true;
  island.receiveShadow = true;
  root.add(island);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 0.9, 16), mat(0x7a7a7a));
  basin.position.set(RBX, 1.1, RBZ);
  basin.castShadow = true;
  root.add(basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.2, 16), mat(0x3a9ab8, { roughness: 0.15, metalness: 0.3 }));
  water.position.set(RBX, 1.55, RBZ);
  root.add(water);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 2.2, 8), mat(0xcccccc));
  spout.position.set(RBX, 2.4, RBZ);
  spout.castShadow = true;
  root.add(spout);
  for (const [px, pz] of [[-5, -5], [5, -5], [0, 6]]) {
    const p = makePalm(rng, RBX + px, RBZ + pz, root, 0.7);
    p.position.y = 0.7;
  }

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
      s.rotation.x = -Math.PI / 2;
      s.position.set(c.x + i * 2.6, 0.14, c.z + 9);
      s.receiveShadow = true;
      root.add(s);
      const s2 = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.2), crossMat);
      s2.rotation.x = -Math.PI / 2;
      s2.position.set(c.x + 9, 0.14, c.z + i * 2.6);
      s2.receiveShadow = true;
      root.add(s2);
    }
  }


  const FACADES = [0, 1, 2, 3].flatMap((k) => [facade(k, k * 7 + 1), facade(k, k * 7 + 5)]);
  const towerMat = (tex, w = 20, h = 40) => {
    const t = tex.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(Math.max(1, Math.round(w / 13)), Math.max(1, Math.round(h / 13)));
    t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({
      map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.35,
      roughness: 0.4, metalness: 0.35,
    });
  };
  const hoodColors = [0xd98a5f, 0xc9b458, 0x9ab87a, 0xb06a8a, 0x7fa8b8];
  const pastel = [0xffc9d6, 0xa8e6e0, 0xffe9a8, 0xd6c2ff, 0xffd0a8];
  const slabTones = [0xc4beb0, 0xbcb6a8, 0xcdc7b8];
  const HEROES = [
    [-44, -20, 26, 24, 210, 0, 0],
    [3, -10, 24, 24, 230, 0, 1],
    [-44, 95, 28, 26, 180, 2, 2],
    [4, 100, 28, 28, 170, 0, 3],
    [-44, 160, 24, 22, 150, 0, 4],
  ];
  const nearHero = (x, z) => HEROES.some(([hx, hz]) => Math.hypot(x - hx, z - hz) < 45);
  for (const [hx, hz, hw, hd, hh, fk, top] of HEROES) {
    const fi = (fk * 2 + (top % 2)) % FACADES.length;
    if (top === 3) {
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(hw / 2, hw / 2, hh, 20), towerMat(FACADES[fi], hw, hh));
      cyl.position.set(hx, hh / 2 + 0.4, hz);
      cyl.castShadow = true;
      cyl.receiveShadow = true;
      root.add(cyl);
      for (const ry of [hh * 0.3, hh * 0.6, hh * 0.88]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(hw / 2 + 0.3, 0.5, 6, 28), new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffd24d, emissiveIntensity: 1.2 }));
        ring.rotation.x = Math.PI / 2;
        ring.position.set(hx, ry, hz);
        root.add(ring);
      }
      box(hw * 0.5, 4, hd * 0.5, mat(0x2a2a33), hx, hh + 2, hz, root);
    } else {
      const t = new THREE.Mesh(new THREE.BoxGeometry(hw, hh, hd), towerMat(FACADES[fi], hw, hh));
      t.position.set(hx, hh / 2 + 0.4, hz);
      t.castShadow = true;
      t.receiveShadow = true;
      root.add(t);
      if (top === 0) {
        const c1 = new THREE.Mesh(new THREE.BoxGeometry(hw * 0.68, 6, hd * 0.68), towerMat(FACADES[(fi + 1) % FACADES.length], hw * 0.68, 6));
        c1.position.set(hx, hh + 3.4, hz);
        c1.castShadow = true;
        root.add(c1);
        const c2 = new THREE.Mesh(new THREE.BoxGeometry(hw * 0.42, 5, hd * 0.42), towerMat(FACADES[fi], hw * 0.42, 5));
        c2.position.set(hx, hh + 8.5, hz);
        c2.castShadow = true;
        root.add(c2);
        box(hw * 0.7, 1, 1, new THREE.MeshStandardMaterial({ color: 0xcfe8ff, emissive: 0x9fd8ff, emissiveIntensity: 1.4 }), hx, hh + 6.4, hz + hd * 0.35, root);
      } else if (top === 1) {
        const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.4, 30, 6), mat(0x888888));
        sp.position.set(hx, hh + 15, hz);
        sp.castShadow = true;
        root.add(sp);
        const bc = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff2211, emissive: 0xff2211, emissiveIntensity: 1.5 }));
        bc.position.set(hx, hh + 30.5, hz);
        root.add(bc);
        box(hw + 2, 3, hd + 2, mat(0x2a2a33), hx, hh + 1.5, hz, root);
      } else if (top === 2) {
        for (const [s, sh] of [[0.74, 8], [0.5, 7], [0.3, 6]]) {
          const st = new THREE.Mesh(new THREE.BoxGeometry(hw * s, sh, hd * s), towerMat(FACADES[(fi + 1) % FACADES.length], hw * s, sh));
          st.position.set(hx, hh + sh / 2 + (s === 0.74 ? 0 : s === 0.5 ? 8 : 15), hz);
          st.castShadow = true;
          root.add(st);
        }
      } else {
        for (let i = 0; i < 5; i++) {
          const fx = hx - hw / 2 + 3 + i * (hw - 6) / 4;
          box(0.5, hh, 1.2, mat(0x1a2028, { roughness: 0.3, metalness: 0.6 }), fx, hh / 2 + 0.4, hz + hd / 2 + 0.4, root);
        }
        box(hw + 2, 2.5, hd + 2, mat(0x2a2a33), hx, hh + 1.2, hz, root);
      }
    }
    box(hw + 1.5, 4, hd + 1.5, shopMat(['#1c4a6a', '#6a1c3a', '#2a5a3a', '#6a5a1c', '#3a2a5a'][top], hw + 1.5), hx, 2.4, hz, root);
    box(3, 1.6, 3, mat(0x8a8a8a), hx + 5, hh + 3.6, hz - 4, root);
    if (hh > 140) {
      const bc = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff2211, emissive: 0xff2211, emissiveIntensity: 1.5 }));
      bc.position.set(hx, hh + 17.5, hz);
      root.add(bc);
    }
  }
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
      const slabW = Math.max(30, gapX - 19);
      const slabD = Math.max(30, gapZ - 19);
      const isPlaza = plazas.has(key);
      const inGolf = cx > GOLF_RECT[0] && cx < GOLF_RECT[2] && cz > GOLF_RECT[1] && cz < GOLF_RECT[3];
      if (inGolf) {
        const green = box(slabW, 0.4, slabD, mat(0x6fae5a), cx, 0.2, cz, root);
        green.receiveShadow = true;
        for (const [tx, tz, tr] of [[-14, -10, 7], [12, 8, 9], [0, -16, 6]]) {
          const trap = new THREE.Mesh(new THREE.CylinderGeometry(tr, tr, 0.4, 12), mat(0xe8d8a0));
          trap.position.set(cx + tx, 0.45, cz + tz);
          trap.scale.z = 0.6;
          root.add(trap);
        }
        const pond = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.3, 12), mat(0x3a9ab8, { roughness: 0.15 }));
        pond.position.set(cx + 16, 0.4, cz - 12);
        pond.scale.z = 0.7;
        root.add(pond);
        box(14, 6, 10, mat(0xf2f2f2), cx - slabW / 2 + 12, 3.4, cz + slabD / 2 - 10, root);
        for (let i = 0; i < 8; i++) {
          makeTree(rng, cx + rng.range(-slabW / 2 + 8, slabW / 2 - 8), cz + rng.range(-slabD / 2 + 8, slabD / 2 - 8), root, rng.range(0.9, 1.3));
        }
        continue;
      }
      if (parks.has(key)) {
        const green = box(slabW, 0.4, slabD, mat(0x5a9a4a), cx, 0.2, cz, root);
        green.receiveShadow = true;
        for (let i = 0; i < 8; i++) {
          makeTree(rng, cx + rng.range(-slabW / 2 + 8, slabW / 2 - 8), cz + rng.range(-slabD / 2 + 8, slabD / 2 - 8), root, rng.range(0.9, 1.3));
        }
        continue;
      }
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
          b.rotation.y = rng.range(-0.06, 0.06);
          b.castShadow = true;
          pyramidRoof(w, dep, rng.range(3, 5), rng.pick([0xa03a2a, 0x3a5a8a, 0xd8a03c, 0xc94f3d]), hx, hgt + 0.4, hz, root);
        }
        for (let i = 0; i < 4; i++) {
          makeTree(rng, cx + rng.range(-slabW / 2 + 8, slabW / 2 - 8), cz + rng.range(-slabD / 2 + 8, slabD / 2 - 8), root, rng.range(0.9, 1.3));
        }
        continue;
      }
      const slab = box(slabW, 0.4, slabD, mat(isPlaza ? 0xb8a88a : rng.pick(slabTones)), cx, 0.2, cz, root);
      slab.receiveShadow = true;
      if (isPlaza) {
        const basin2 = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.5, 1, 16), mat(0x7a7a7a));
        basin2.position.set(cx, 0.9, cz);
        basin2.castShadow = true;
        root.add(basin2);
        const w2 = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.2, 16), mat(0x3a9ab8, { roughness: 0.15, metalness: 0.3 }));
        w2.position.set(cx, 1.4, cz);
        root.add(w2);
        for (let i = 0; i < 6; i++) {
          makeTree(rng, cx + rng.range(-slabW / 2 + 8, slabW / 2 - 8), cz + rng.range(-slabD / 2 + 8, slabD / 2 - 8), root, rng.range(0.9, 1.2));
        }
        for (const [bx, bz, ry] of [[-8, 0, 0], [8, 0, Math.PI], [0, -8, Math.PI / 2], [0, 8, -Math.PI / 2]]) {
          const b = box(4, 0.5, 1.2, mat(0x6b4a2a), cx + bx, 0.7, cz + bz, root);
          b.rotation.y = ry;
          b.castShadow = true;
        }
        continue;
      }
      const nearRb = Math.hypot(cx - RBX, cz - RBZ) < 55;
      if (nearRb) continue;
      const localAngle = nsHeading(ROADS.ns[ix], cz);
      const diagNear = DIAGONALS.some(([ax, az, bx, bz]) => distToSegment(cx, cz, ax, az, bx, bz) < 70);
      const place = (x, z) => {
        if (DIAGONALS.some(([ax, az, bx, bz]) => distToSegment(x, z, ax, az, bx, bz) < 16)) return false;
        if (Math.hypot(x - RBX, z - RBZ) < 30) return false;
        if (MINOR_SEGS.some(([ax, az, bx, bz]) => distToSegment(x, z, ax, az, bx, bz) < 6.5)) return false;
        if (FREEWAY.pts.some((p) => Math.hypot(x - p.x, z - p.z) < 17)) return false;
        return true;
      };
      if (d.type === 'downtown') {
        for (let i = 0; i < 8; i++) {
          const w = rng.range(16, 26), dep = rng.range(16, 26), hgt = rng.range(70, 190);
          const col = i % 4, ex = slabW / 2 - 4 - w / 2, ez = slabD / 2 - 4 - dep / 2;
          const hx = cx + (col === 0 ? -ex : col === 3 ? ex : (col - 1.5) * slabW / 4) + rng.range(-5, 5);
          const hz = cz + (i < 4 ? -ez : ez) + rng.range(-5, 5);
          if (!place(hx, hz) || nearHero(hx, hz)) continue;
          const fi = (ix * 5 + iz * 3 + i * 3) % FACADES.length;
          const stepped = i % 2 === 0;
          const t = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, dep), towerMat(FACADES[fi], w, hgt));
          t.position.set(hx, hgt / 2 + 0.4, hz);
          t.rotation.y = diagNear ? Math.PI / 4 : rng.range(-0.06, 0.06);
          t.castShadow = true;
          t.receiveShadow = true;
          root.add(t);
          box(w + 1.5, 4, dep + 1.5, shopMat([0x1c4a6a, 0x6a1c3a, 0x6a5a1c, 0x2a5a3a, 0x8a7a6a][fi % 5], w + 1.5), hx, 2.4, hz, root);
          if (stepped) {
            const sw = w * 0.55, sd = dep * 0.55, sh = rng.range(6, 14);
            const st = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), towerMat(FACADES[(fi + 1) % FACADES.length], sw, sh));
            st.position.set(hx, hgt + sh / 2 + 0.4, hz);
            st.castShadow = true;
            root.add(st);
          } else {
            box(w + 2, 3, dep + 2, mat(0x2a2a33), hx, hgt + 1.5, hz, root);
          }
          if (i === 0) {
            const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.2, 22, 6), mat(0x888888));
            sp.position.set(hx, hgt + 14, hz);
            sp.castShadow = true;
            root.add(sp);
          }
          if (!stepped && !G._heliPad && hgt > 160) {
            G._heliPad = true;
            const pad = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(w, dep) * 0.45, Math.min(w, dep) * 0.45, 0.8, 16), mat(0x2a2a33));
            pad.position.set(hx, hgt + 3.4, hz);
            root.add(pad);
            box(0.8, 0.2, 6, mat(0xffffff), hx, hgt + 3.9, hz, root);
            box(6, 0.2, 0.8, mat(0xffffff), hx, hgt + 3.9, hz, root);
          }
          box(rng.range(3, 5), 1.6, rng.range(3, 5), mat(0x8a8a8a), hx + rng.range(-4, 4), hgt + 3.6, hz + rng.range(-4, 4), root);
          if (hgt > 140) {
            const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 14, 6), mat(0x555555));
            mast.position.set(hx, hgt + 10, hz);
            mast.castShadow = true;
            root.add(mast);
            const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff2211, emissive: 0xff2211, emissiveIntensity: 1.5 }));
            beacon.position.set(hx, hgt + 17.5, hz);
            root.add(beacon);
          }
        }
        for (let i = 0; i < 2; i++) {
          const w = rng.range(20, 26), dep = rng.range(14, 18), hgt = rng.range(30, 55);
          const hx = cx + (i === 0 ? -1 : 1) * slabW / 8 + rng.range(-4, 4);
          const hz = cz + (i === 0 ? -1 : 1) * (slabD / 2 - 4 - dep / 2);
          if (!place(hx, hz) || nearHero(hx, hz)) continue;
          const m = new THREE.Mesh(
            new THREE.BoxGeometry(w, hgt, dep),
            towerMat(FACADES[(ix * 3 + iz + i * 2) % FACADES.length], w, hgt),
          );
          m.position.set(hx, hgt / 2 + 0.4, hz);
          m.rotation.y = diagNear ? Math.PI / 4 : rng.range(-0.06, 0.06);
          m.castShadow = true;
          m.receiveShadow = true;
          root.add(m);
          box(w + 1.5, 4, dep + 1.5, shopMat([0x1c4a6a, 0x6a1c3a, 0x6a5a1c, 0x2a5a3a][(ix + i) % 4], w + 1.5), hx, 2.4, hz, root);
          if (rng.chance(0.5)) {
            const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3.4, 10), mat(0x8a7a5a));
            tank.position.set(hx + rng.range(-5, 5), hgt + 2.1, hz + rng.range(-4, 4));
            tank.castShadow = true;
            root.add(tank);
          }
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
            c.rotation.y = rng.range(-0.1, 0.1);
            c.castShadow = true;
          }
        }
        for (let i = 0; i < 2; i++) {
          const hx = cx + (i === 0 ? -slabW / 4 : slabW / 4);
          const hz = cz + (i === 0 ? slabD / 4 : -slabD / 4);
          if (!place(hx, hz)) continue;
          const wh = box(30, 8, 18, mat(0x8a8578), hx, 4.4, hz, root);
          wh.castShadow = true;
          box(32, 1, 20, mat(0x5a5a5a), hx, 8.8, hz, root);
        }
      } else if (d.type === 'beach') {
        for (let i = 0; i < 6; i++) {
          const w = rng.range(11, 16), hgt = rng.range(7, 12);
          const hx = cx + ((i % 3) - 1) * (slabW / 2 - 3 - w / 2) + rng.range(-4, 4);
          const hz = cz + (i < 3 ? -1 : 1) * (slabD / 2 - 10) + rng.range(-4, 4);
          if (!place(hx, hz)) continue;
          const b = box(w, hgt, rng.range(12, 16), mat(rng.pick(pastel)), hx, hgt / 2 + 0.4, hz, root);
          b.rotation.y = rng.range(-0.06, 0.06);
          b.castShadow = true;
        }
        makePalm(rng, cx + rng.range(-slabW / 2 + 8, slabW / 2 - 8), cz + rng.range(-slabD / 2 + 8, slabD / 2 - 8), root);
      } else if (d.type === 'hill') {
        for (let i = 0; i < 5; i++) {
          const w = rng.range(14, 20), hgt = rng.range(8, 14);
          const hx = cx + rng.range(-slabW / 2 + 10, slabW / 2 - 10);
          const hz = cz + rng.range(-slabD / 2 + 10, slabD / 2 - 10);
          if (!place(hx, hz)) continue;
          const lift = Math.max(0, (hx - 180) / 280) * 14;
          const b = box(w, hgt, 16, mat(rng.pick(hoodColors)), hx, hgt / 2 + 0.4 + lift, hz, root);
          b.rotation.y = rng.range(-0.06, 0.06);
          b.castShadow = true;
          pyramidRoof(w, 16, 4, 0x7a4a3a, hx, hgt + 0.4 + lift, hz, root);
        }
      } else {
        const roofCols = [0xa03a2a, 0x3a5a8a, 0x4a7a3a, 0xd8a03c, 0x2a8a8a, 0x8a8a8a, 0xe8dcc0, 0xc94f3d];
        for (let i = 0; i < 30; i++) {
          const col = i % 5, row = Math.floor(i / 5);
          const w = rng.range(15, 21), dep = rng.range(14, 18), hgt = d.type === 'brick' ? rng.range(18, 30) : rng.range(6, 10);
          const hx = cx + (col === 0 ? -(slabW / 2 - 3 - w / 2) : col === 4 ? slabW / 2 - 3 - w / 2 : (col - 2) * slabW / 5) + rng.range(-3, 3);
          const hz = cz + (row === 0 ? -(slabD / 2 - 3 - dep / 2) : row === 5 ? slabD / 2 - 3 - dep / 2 : (row - 2.5) * slabD / 6) + rng.range(-3, 3);
          if (!place(hx, hz)) continue;
          const colr = d.type === 'hood' ? rng.pick(hoodColors) : d.type === 'brick' ? 0x9a5a44 : rng.pick(pastel);
          let b;
          if (d.type === 'brick') {
            b = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, dep), towerMat(FACADES[[2, 3, 6, 7][(ix + iz + i) % 4]], w, hgt));
            b.position.set(hx, hgt / 2 + 0.4, hz);
            root.add(b);
          } else {
            b = box(w, hgt, dep, mat(colr), hx, hgt / 2 + 0.4, hz, root);
          }
          b.rotation.y = diagNear ? Math.PI / 4 : localAngle + rng.range(-0.05, 0.05);
          b.castShadow = true;
          b.receiveShadow = true;
          if (d.type !== 'brick') pyramidRoof(w, dep, rng.range(3, 5), rng.pick(roofCols), hx, hgt + 0.4, hz, root);
          else box(w + 1, 1.2, dep + 1, mat(0x5a3a30), hx, hgt + 1, hz, root);
        }
        if (d.type === 'residential' || d.type === 'marina') {
          for (let i = 0; i < 6; i++) {
            const w = rng.range(20, 26), dep = rng.range(15, 18), hgt = rng.range(22, 34);
            const hx = cx + (i % 2 === 0 ? -slabW / 2 + 14 : slabW / 2 - 14);
            const hz = cz + (Math.floor(i / 2) - 1) * slabD / 3;
            if (!place(hx, hz)) continue;
            const m = new THREE.Mesh(
              new THREE.BoxGeometry(w, hgt, dep),
              towerMat(FACADES[(ix * 2 + iz * 5 + i) % FACADES.length], w, hgt),
            );
            m.position.set(hx, hgt / 2 + 0.4, hz);
            m.rotation.y = diagNear ? Math.PI / 4 : localAngle + rng.range(-0.05, 0.05);
            m.castShadow = true;
            m.receiveShadow = true;
            root.add(m);
            box(w + 1, 1, dep + 1, mat(0x5a3a30), hx, hgt + 0.9, hz, root);
            if (rng.chance(0.4)) {
              const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 3, 10), mat(0x8a7a5a));
              tank.position.set(hx + rng.range(-5, 5), hgt + 2, hz + rng.range(-4, 4));
              tank.castShadow = true;
              root.add(tank);
            }
          }
        }
      }
      if (ix === 0) {
        for (let i = 0; i < 2; i++) {
          const hx = cx - slabW / 2 + 12;
          const hz = cz + (i === 0 ? -slabD / 4 : slabD / 4);
          if (!place(hx, hz)) continue;
          const w = rng.range(12, 16), hgt = rng.range(7, 11);
          const b = box(w, hgt, rng.range(12, 15), mat(rng.pick(pastel)), hx, hgt / 2 + 0.4, hz, root);
          b.rotation.y = rng.range(-0.06, 0.06);
          b.castShadow = true;
          pyramidRoof(w, 14, 3.5, rng.pick([0x7a4a3a, 0x4a5a7a]), hx, hgt + 0.4, hz, root);
        }
        makePalm(rng, cx - slabW / 2 + 8, cz, root, 0.9);
      }
    }
  }

  const hill = new THREE.Mesh(new THREE.PlaneGeometry(280, 240), mat(0x7a8a5a));
  hill.rotation.x = -Math.PI / 2;
  hill.rotation.z = 0.05;
  hill.position.set(320, 7, -60);
  hill.receiveShadow = true;
  root.add(hill);

  const crane = new THREE.Group();
  box(4, 46, 4, mat(0xd8a03c), 0, 23, 0, crane);
  box(4, 46, 4, mat(0xd8a03c), 26, 23, 0, crane);
  box(34, 4, 4, mat(0xd8a03c), 13, 46, 0, crane);
  box(20, 3, 3, mat(0x3a3a3a), -6, 42, 0, crane);
  const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 14, 6), mat(0x333333));
  hook.position.set(-14, 34, 0);
  crane.add(hook);
  box(3, 3, 3, mat(0xc94f3d), -14, 26, 0, crane);
  crane.position.set(370, 0, 170);
  crane.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  root.add(crane);
  const dockCols = [0xc94f3d, 0x3d7fc9, 0x4fc94f, 0xd8a03c];
  for (let i = 0; i < 10; i++) {
    const hx = rng.range(345, 435), hz = rng.range(80, 430);
    if (hx > 220 && hx < 440 && hz > 360 && hz < 400) continue;
    if (Math.hypot(hx - STADIUM.x, hz - STADIUM.z) < 42) continue;
    const stack = rng.int(1, 3);
    for (let s = 0; s < stack; s++) {
      const c = box(12, 2.6, 2.6, mat(rng.pick(dockCols)), hx, 1.5 + s * 2.7, hz, root);
      c.rotation.y = rng.range(-0.08, 0.08);
      c.castShadow = true;
    }
  }

  const runway = new THREE.Mesh(new THREE.PlaneGeometry(220, 26), mat(0x2a2a30, { roughness: 0.95 }));
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(330, 0.12, 380);
  runway.receiveShadow = true;
  root.add(runway);
  for (let x = 230; x <= 430; x += 20) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.5), mat(0xffffff));
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(x, 0.14, 380);
    root.add(dash);
  }
  for (const ex of [232, 428]) {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(2, 24), mat(0xffffff));
    bar.rotation.x = -Math.PI / 2;
    bar.position.set(ex, 0.14, 380);
    root.add(bar);
  }
  box(110, 9, 26, mat(0xe8e8e8), 330, 4.5, 335, root);
  box(110, 1, 30, mat(0x4a6a8a), 330, 9.5, 335, root);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4.5, 26, 10), mat(0xcccccc));
  tower.position.set(395, 13, 330);
  tower.castShadow = true;
  root.add(tower);
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 4, 10), mat(0x14202e, { roughness: 0.12, metalness: 0.6 }));
  cab.position.set(395, 28, 330);
  root.add(cab);
  for (const [px, pz] of [[300, 352], [362, 354]]) {
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 26, 10), mat(0xf2f2f2));
    fus.rotation.z = Math.PI / 2;
    fus.position.set(px, 2.5, pz);
    fus.castShadow = true;
    root.add(fus);
    box(6, 0.4, 22, mat(0xf2f2f2), px, 2.5, pz, root);
    box(0.4, 5, 4, mat(0x2a6fd8), px - 12, 5, pz, root);
    box(26, 0.5, 1, mat(0x2a6fd8), px, 1.2, pz + 2.1, root);
  }

  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(30, 32, 9, 28), mat(0xf2f2f2));
  bowl.position.set(STADIUM.x, 4.5, STADIUM.z);
  bowl.castShadow = true;
  root.add(bowl);
  const field = new THREE.Mesh(new THREE.CylinderGeometry(24, 24, 0.6, 28), mat(0x4a8f3c));
  field.position.set(STADIUM.x, 9.2, STADIUM.z);
  root.add(field);
  const ringTop = new THREE.Mesh(new THREE.TorusGeometry(27, 1.2, 6, 28), mat(0x2a6fd8));
  ringTop.rotation.x = Math.PI / 2;
  ringTop.position.set(STADIUM.x, 9.4, STADIUM.z);
  root.add(ringTop);

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
    pole.position.y = 6;
    pole.castShadow = true;
    g.add(pole);
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(20, 10, 0.6),
      new THREE.MeshStandardMaterial({ map: billboardTexture(lines, bg, fg), roughness: 0.6 }),
    );
    panel.position.y = 15;
    panel.castShadow = true;
    g.add(panel);
    g.position.set(bx, 0, bz);
    g.rotation.y = Math.atan2(-bx, -bz);
    root.add(g);
  });

  const NEON_SIGNS = [
    ['CLUB EMBER', '#ff2d95', -130, 7],
    ['NEON MOTEL', '#2fd8ff', -70, 9],
    ['BAY ARCADE', '#ffd24d', -10, 7],
    ['SUNSET LIQUOR', '#ff7a3d', 50, 8],
    ['PIER 9 DINER', '#7dff5e', 110, 7],
  ];
  for (const [text, color, z, y] of NEON_SIGNS) {
    const sx = nsPlain(ROADS.ns[3], z) + 10;
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

  for (const road of ROADS.ns) {
    for (let z = -400; z <= 400; z += 120) {
      const side = (Math.round(z / 120) % 2 === 0) ? 1 : -1;
      const x = nsPlain(road, z) + side * 10;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 9, 6), mat(0x3a3a3a));
      pole.position.set(x, 4.5, z);
      root.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffd24d, emissiveIntensity: 0.9 }));
      lamp.position.set(x, 9.2, z);
      root.add(lamp);
    }
  }
  for (const road of ROADS.ew) {
    for (let x = -400; x <= 400; x += 120) {
      const side = (Math.round(x / 120) % 2 === 0) ? 1 : -1;
      const z = ewPlain(road, x) + side * 10;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 9, 6), mat(0x3a3a3a));
      pole.position.set(x, 4.5, z);
      root.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffd24d, emissiveIntensity: 0.9 }));
      lamp.position.set(x, 9.2, z);
      root.add(lamp);
    }
  }

  for (const c of crossPts) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 7, 6), mat(0x2a2a2a));
    pole.position.y = 3.5;
    g.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3, 1.2), mat(0x1a1a1a));
    head.position.y = 7.4;
    g.add(head);
    const lamps = [];
    for (let i = 0; i < 3; i++) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x111111 }));
      l.position.set(0, 8.3 - i * 0.85, 0.65);
      g.add(l);
      lamps.push(l);
    }
    g.position.set(c.x + 9, 0, c.z + 9);
    root.add(g);
    out.lights.push({ pos: new THREE.Vector3(c.x + 9, 0, c.z + 9), axis: 'ns', phase: rng.range(0, 12), lamps, head });
  }

  const stageRoad = ROADS.ns[3];
  const nearCrossing = (x, z, m = 16) => crossPts.some((c) => Math.hypot(x - c.x, z - c.z) < m);
  for (let z = -400; z <= 400; z += 34) {
    for (const side of [-1, 1]) {
      const x = nsPlain(stageRoad, z) + side * 10;
      if (Math.hypot(x - RBX, z - RBZ) < 34) continue;
      if (nearCrossing(x, z)) continue;
      if (DIAGONALS.some(([ax, az, bx, bz]) => distToSegment(x, z, ax, az, bx, bz) < 12)) continue;
      makePalm(rng, x, z, root, rng.range(1.15, 1.45), 0xc23a2e, 0.55);
    }
  }
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
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.42, wz);
      g.add(w);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.09, 6, 12, Math.PI), dark);
      arch.rotation.y = Math.PI / 2;
      arch.position.set(wx, 0.42, wz);
      g.add(arch);
    }
    box(1.2, 0.14, 0.08, dark, 0, 0.62, 2.32, g);
    box(2.04, 0.12, 4.4, dark, 0, 0.3, 0, g);
    box(0.55, 0.14, 0.08, mat(0xfff2b0, { emissive: 0xffe9a0, emissiveIntensity: 0.8 }), -0.65, 0.62, 2.32, g);
    box(0.55, 0.14, 0.08, mat(0xfff2b0, { emissive: 0xffe9a0, emissiveIntensity: 0.8 }), 0.65, 0.62, 2.32, g);
    box(0.6, 0.14, 0.08, mat(0xd81a1a, { emissive: 0xaa0000, emissiveIntensity: 0.8 }), -0.65, 0.62, -2.32, g);
    box(0.6, 0.14, 0.08, mat(0xd81a1a, { emissive: 0xaa0000, emissiveIntensity: 0.8 }), 0.65, 0.62, -2.32, g);
    g.position.set(x, 0, z);
    g.rotation.y = heading;
    g.userData.parkedCar = true;
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    root.add(g);
    return g;
  };
  const parkOnRoad = (axis, road, from, to, step) => {
    for (let a = from; a <= to; a += step) {
      const p = axis === 'ns'
        ? { x: nsPlain(road, a), z: a, h: 0 }
        : { x: a, z: ewPlain(road, a), h: Math.PI / 2 };
      for (const side of [-1, 1]) {
        if (rng.chance(0.25)) continue;
        const off = 4.4;
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
  for (const c of [crossPts[0], crossPts[1], crossPts[4], crossPts[5]]) {
    const g = new THREE.Group();
    box(0.25, 3, 0.25, mat(0x3a3a3a), -2.2, 1.5, 0, g);
    box(0.25, 3, 0.25, mat(0x3a3a3a), 2.2, 1.5, 0, g);
    box(5.2, 0.25, 2.2, mat(0x2a6fd8), 0, 3.1, 0, g);
    box(4.6, 0.5, 1.0, mat(0x6b4a2a), 0, 0.7, 0, g);
    g.position.set(c.x + 9, 0, c.z + 9);
    g.rotation.y = 0;
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    root.add(g);
  }
  const NEON_EXTRA = [
    ['EMBER TACOS', '#ff5e2d', -190, 8],
    ['HOTEL CORALIE', '#2fd8ff', 190, 8],
  ];
  for (const [text, color, z, y] of NEON_EXTRA) {
    const sx = nsPlain(ROADS.ns[3], z) + 10;
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
  const pier = new THREE.Group();
  const deckMat = mat(0x8a6a42, { roughness: 0.9 });
  const deck = box(140, 1.5, 30, deckMat, -530, 2, -20, pier);
  deck.receiveShadow = true;
  for (let x = -595; x <= -465; x += 14) {
    for (const dz of [-13, 13]) {
      const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 6, 8), mat(0x4a3a28));
      pile.position.set(x, -0.5, -20 + dz);
      pier.add(pile);
    }
  }
  for (const [sx, sz, sw, col] of [[-480, -30, 14, 0xff6fa5], [-480, -10, 12, 0x2fd8ff], [-520, -30, 12, 0xffd24d]]) {
    box(sw, 6, 10, mat(col), sx, 6, sz, pier);
    box(sw + 1, 1, 11, mat(0x2a2a33), sx, 9.5, sz, pier);
  }
  const wheel = new THREE.Group();
  wheel.rotation.y = Math.PI / 2;
  const spin = new THREE.Group();
  wheel.add(spin);
  const rimC = new THREE.MeshBasicMaterial({ color: 0x2fd8ff });
  const rimM = new THREE.MeshBasicMaterial({ color: 0xff2d95 });
  spin.add(new THREE.Mesh(new THREE.TorusGeometry(22, 0.7, 8, 48), rimC));
  const rim2 = new THREE.Mesh(new THREE.TorusGeometry(22, 0.7, 8, 48), rimM);
  rim2.position.z = -1.2;
  spin.add(rim2);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 4, 12), mat(0x2a2a33));
  hub.rotation.x = Math.PI / 2;
  spin.add(hub);
  const cabCols = [0xffd24d, 0xff6fa5, 0x7dff5e, 0x2fd8ff];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 22, 6), rimC);
    sp.position.set(0, Math.sin(a) * 11, Math.cos(a) * 11);
    sp.rotation.x = Math.PI / 2 - a;
    spin.add(sp);
    box(2.4, 2.4, 2.4, mat(cabCols[i % 4]), 0, Math.sin(a) * 22, Math.cos(a) * 22, spin);
  }
  wheel.position.set(-590, 30, -20);
  pier.add(wheel);
  out.wheel = spin;
  for (const [lz, tilt] of [[-29, 0.3], [-11, -0.3]]) {
    const leg = box(1.4, 32, 1.4, mat(0x3a3a3a), -590, 15, lz, pier);
    leg.rotation.x = tilt;
  }
  const coaster = new THREE.Mesh(new THREE.TorusGeometry(26, 0.6, 6, 24, Math.PI * 0.75), mat(0xffd24d, { roughness: 0.4, metalness: 0.4 }));
  coaster.position.set(-555, 10, 42);
  coaster.rotation.y = Math.PI / 2;
  pier.add(coaster);
  for (const [px, pz] of [[-575, 42], [-540, 42], [-555, 20]]) {
    const sup = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 12, 6), mat(0x3a3a3a));
    sup.position.set(px, 8, pz);
    pier.add(sup);
  }
  root.add(pier);

  return out;
}
