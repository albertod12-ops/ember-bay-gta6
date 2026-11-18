// Ember Bay city: a coastal open world on a road grid, 14 named districts.
// Everything is built from a seeded RNG, so a fixed seed builds the same city.
import * as THREE from 'three';

export const WORLD = { min: -460, max: 460, roadAt: [-400, -300, -200, -100, 0, 100, 200, 300, 400] };

// 14 districts: [x0, z0, x1, z1, name, type]
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

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

// Road surface. The length axis runs along the canvas Y for avenues
// (north-south) and along the canvas X for streets (east-west), so the
// double-yellow centre line always runs ALONG the road, never across it.
function roadTexture(alongX) {
  return canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = '#2e2e33'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#33333a';
    for (let i = 0; i < 200; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    const line = (vertical) => {
      // double yellow centre
      g.fillStyle = '#e8b820';
      if (vertical) { g.fillRect(w / 2 - 6, 0, 4, h); g.fillRect(w / 2 + 2, 0, 4, h); }
      else { g.fillRect(0, h / 2 - 6, w, 4); g.fillRect(0, h / 2 + 2, w, 4); }
      // dashed white lane lines
      g.fillStyle = '#e8e8e8';
      for (let d = 0; d < h; d += 32) {
        if (vertical) { g.fillRect(w / 4 - 1, d, 2, 16); g.fillRect((3 * w) / 4 - 1, d, 2, 16); }
        else { g.fillRect(d, h / 4 - 1, 16, 2); g.fillRect(d, (3 * h) / 4 - 1, 16, 2); }
      }
      // edge lines
      g.fillStyle = '#cccccc';
      if (vertical) { g.fillRect(3, 0, 2, h); g.fillRect(w - 5, 0, 2, h); }
      else { g.fillRect(0, 3, w, 2); g.fillRect(0, h - 5, w, 2); }
    };
    line(!alongX);
  });
}

function windowTexture(base, lit) {
  return canvasTexture(64, 128, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 6; y < h - 6; y += 12) {
      for (let x = 6; x < w - 6; x += 10) {
        g.fillStyle = Math.random() < 0.45 ? lit : '#1c2433';
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

function makePalm(rng, x, z, parent, scale = 1) {
  const g = new THREE.Group();
  const lean = rng.range(-0.12, 0.12);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * scale, 0.55 * scale, 7 * scale, 6), mat(0x8a6b46));
  trunk.position.y = 3.5 * scale; trunk.rotation.z = lean;
  g.add(trunk);
  for (let i = 0; i < 6; i++) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.9 * scale, 4.2 * scale, 4), mat(0x2f8f4e));
    const a = (i / 6) * Math.PI * 2;
    frond.position.set(Math.cos(a) * 1.7 * scale, 7 * scale, Math.sin(a) * 1.7 * scale);
    frond.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
    frond.scale.set(1, 1, 0.28);
    g.add(frond);
  }
  g.position.set(x, 0, z);
  parent.add(g);
  return g;
}

function makeUmbrella(rng, x, z, parent) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 6), mat(0xdddddd));
  pole.position.y = 1.3; g.add(pole);
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.9, 8), mat(rng.pick([0xff6fa5, 0xff8c42, 0x7fd4ff, 0xffe14d])));
  top.position.y = 2.8; g.add(top);
  g.position.set(x, 0, z);
  parent.add(g);
  return g;
}

export function buildCity(G) {
  const { scene, rng } = G;
  const root = new THREE.Group();
  scene.add(root);
  const out = { root, districts: DISTRICTS, lights: [], palms: [] };

  // Sky dome: sunset gradient.
  const skyTex = canvasTexture(32, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#2b1b4d'); grad.addColorStop(0.45, '#7a3d7e');
    grad.addColorStop(0.7, '#ff7a3d'); grad.addColorStop(0.85, '#ffb36b'); grad.addColorStop(1, '#ffd9a0');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  });
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1600, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }),
  );
  root.add(sky);
  out.sky = sky;

  // Ground base (sidewalk tone) + ocean + sand.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), mat(0x8f887c));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05;
  root.add(ground);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1400, 2000), mat(0x2195a8, { roughness: 0.25, metalness: 0.15 }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(-1300, 0.1, 0);
  root.add(ocean);
  out.ocean = ocean;
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(150, 1040), mat(0xe2c491));
  sand.rotation.x = -Math.PI / 2; sand.position.set(-535, 0.02, 0);
  root.add(sand);
  // Boardwalk planks along the beach edge.
  const boardwalk = new THREE.Mesh(new THREE.PlaneGeometry(22, 940), mat(0x9a6b42));
  boardwalk.rotation.x = -Math.PI / 2; boardwalk.position.set(-449, 0.06, 0);
  root.add(boardwalk);

  // Roads.
  const texNS = roadTexture(false);
  const texEW = roadTexture(true);
  for (const x of WORLD.roadAt) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(14, 920), new THREE.MeshStandardMaterial({ map: texNS, roughness: 0.95 }));
    r.rotation.x = -Math.PI / 2; r.position.set(x, 0.1, 0);
    root.add(r);
  }
  for (const z of WORLD.roadAt) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(920, 14), new THREE.MeshStandardMaterial({ map: texEW, roughness: 0.95 }));
    r.rotation.x = -Math.PI / 2; r.position.set(0, 0.11, z);
    root.add(r);
  }
  // Crosswalks at every intersection.
  const crossMat = mat(0xe8e8e8);
  for (const x of WORLD.roadAt) {
    for (const z of WORLD.roadAt) {
      for (let i = -2; i <= 2; i++) {
        const s = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 5), crossMat);
        s.rotation.x = -Math.PI / 2; s.position.set(x + i * 2.6, 0.14, z + 9);
        root.add(s);
        const s2 = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.2), crossMat);
        s2.rotation.x = -Math.PI / 2; s2.position.set(x + 9, 0.14, z + i * 2.6);
        root.add(s2);
      }
    }
  }

  // Buildings, block by block.
  const winTexA = windowTexture('#3a4a63', '#ffd9a0');
  const winTexB = windowTexture('#5a3a4a', '#ffe9b0');
  const blockCenters = [];
  for (let ix = 0; ix < WORLD.roadAt.length - 1; ix++) {
    for (let iz = 0; iz < WORLD.roadAt.length - 1; iz++) {
      const cx = (WORLD.roadAt[ix] + WORLD.roadAt[ix + 1]) / 2;
      const cz = (WORLD.roadAt[iz] + WORLD.roadAt[iz + 1]) / 2;
      blockCenters.push([cx, cz]);
    }
  }
  const hoodColors = [0xd98a5f, 0xc9b458, 0x9ab87a, 0xb06a8a, 0x7fa8b8];
  const pastel = [0xffc9d6, 0xa8e6e0, 0xffe9a8, 0xd6c2ff, 0xffd0a8];
  for (const [cx, cz] of blockCenters) {
    const d = districtAt(cx, cz);
    // Block slab.
    box(86, 0.4, 86, mat(d.type === 'downtown' ? 0x6f6a72 : d.type === 'hood' ? 0x8a7a6a : 0x97907f), cx, 0.2, cz, root);
    if (d.type === 'downtown') {
      const n = rng.int(1, 2);
      for (let i = 0; i < n; i++) {
        const w = rng.range(22, 34), dep = rng.range(22, 34), hgt = rng.range(42, 120);
        const t = new THREE.Mesh(
          new THREE.BoxGeometry(w, hgt, dep),
          new THREE.MeshStandardMaterial({ map: rng.chance(0.5) ? winTexA : winTexB, roughness: 0.4, metalness: 0.35 }),
        );
        t.position.set(cx + rng.range(-18, 18), hgt / 2 + 0.4, cz + rng.range(-18, 18));
        root.add(t);
        box(w + 2, 3, dep + 2, mat(0x2a2a33), t.position.x, hgt + 1.5, t.position.z, root);
      }
    } else if (d.type === 'docks') {
      const cols = [0xc94f3d, 0x3d7fc9, 0x4fc94f, 0xd8a03c, 0x8a6fd8];
      for (let i = 0; i < rng.int(5, 8); i++) {
        const stack = rng.int(1, 3);
        for (let s = 0; s < stack; s++) {
          box(12, 2.6, 2.6, mat(rng.pick(cols)), cx + rng.range(-30, 30), 1.5 + s * 2.7, cz + rng.range(-30, 30), root);
        }
      }
    } else if (d.type === 'beach') {
      for (let i = 0; i < 3; i++) {
        const w = rng.range(12, 18), hgt = rng.range(7, 12);
        box(w, hgt, rng.range(12, 16), mat(rng.pick(pastel)), cx + rng.range(-24, 24), hgt / 2 + 0.4, cz + rng.range(-24, 24), root);
      }
      makePalm(rng, cx + rng.range(-30, 30), cz + rng.range(-30, 30), root);
    } else if (d.type === 'hill') {
      for (let i = 0; i < 3; i++) {
        const w = rng.range(14, 20), hgt = rng.range(8, 14);
        const hx = cx + rng.range(-26, 26), hz = cz + rng.range(-26, 26);
        const lift = Math.max(0, (hx - 180) / 280) * 14;
        box(w, hgt, 16, mat(rng.pick(hoodColors)), hx, hgt / 2 + 0.4 + lift, hz, root);
        pyramidRoof(w, 16, 4, 0x7a4a3a, hx, hgt + 0.4 + lift, hz, root);
      }
    } else {
      // brick / residential / marina / hood: houses with pyramid roofs.
      const n = d.type === 'hood' ? rng.int(3, 4) : rng.int(2, 3);
      for (let i = 0; i < n; i++) {
        const w = rng.range(13, 20), dep = rng.range(12, 18), hgt = d.type === 'brick' ? rng.range(12, 22) : rng.range(6, 10);
        const hx = cx + rng.range(-26, 26), hz = cz + rng.range(-26, 26);
        const col = d.type === 'hood' ? rng.pick(hoodColors) : d.type === 'brick' ? 0x9a5a44 : rng.pick(pastel);
        box(w, hgt, dep, mat(col), hx, hgt / 2 + 0.4, hz, root);
        if (d.type !== 'brick') pyramidRoof(w, dep, rng.range(3, 5), rng.pick([0x7a4a3a, 0x4a5a7a, 0x5a7a4a]), hx, hgt + 0.4, hz, root);
        else box(w + 1, 1.2, dep + 1, mat(0x5a3a30), hx, hgt + 1, hz, root);
      }
    }
  }

  // Hillside slope mesh (north-east).
  const hill = new THREE.Mesh(new THREE.PlaneGeometry(280, 240), mat(0x7a8a5a));
  hill.rotation.x = -Math.PI / 2; hill.rotation.z = 0.05;
  hill.position.set(320, 7, -60);
  root.add(hill);

  // Docks crane.
  const crane = new THREE.Group();
  box(4, 46, 4, mat(0xd8a03c), 0, 23, 0, crane);
  box(4, 46, 4, mat(0xd8a03c), 26, 23, 0, crane);
  box(34, 4, 4, mat(0xd8a03c), 13, 46, 0, crane);
  box(20, 3, 3, mat(0x3a3a3a), -6, 42, 0, crane);
  const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 14, 6), mat(0x333333));
  hook.position.set(-14, 34, 0); crane.add(hook);
  box(3, 3, 3, mat(0xc94f3d), -14, 26, 0, crane);
  crane.position.set(330, 0, 160);
  root.add(crane);

  // Palms + umbrellas on the sand, palms along the beachfront avenue.
  for (let z = -420; z <= 420; z += 70) {
    makePalm(rng, -480 + rng.range(-8, 8), z + rng.range(-15, 15), root);
    makePalm(rng, -440 + rng.range(-6, 6), z + 35, root, 0.9);
  }
  for (let i = 0; i < 12; i++) {
    makeUmbrella(rng, rng.range(-590, -480), rng.range(-420, 420), root);
  }
  for (const [bx, bz] of [[-350, -350], [-350, 150], [150, -350], [150, 350], [-50, -50]]) {
    makePalm(rng, bx, bz, root, 0.9);
  }

  // Billboards with original copy.
  const boards = [
    [[-390, -390], ['EMBER BAY', 'WELCOME TO THE BAY'], '#1c2a4d', '#ffd24d'],
    [[390, -390], ['BAY FM 98.2', 'SUNSET DRIVE'], '#4d1c2a', '#7fd4ff'],
    [[-390, 390], ['SUNSET TAPES', 'FIND ALL 20'], '#2a4d1c', '#ff9de2'],
    [[390, 390], ['PIER 9', 'FISH & CHIPS'], '#4d3a1c', '#ffe14d'],
    [[0, -390], ['LOWRIDER NIGHTS', 'EVERY FRIDAY'], '#3a1c4d', '#ff6fa5'],
    [[0, 390], ['PORT EMBER', 'CRANES · CRATES · CASH'], '#1c4d4d', '#ffffff'],
  ];
  for (const [[bx, bz], lines, bg, fg] of boards) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 12, 6), mat(0x555555));
    pole.position.y = 6; g.add(pole);
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(20, 10, 0.6),
      new THREE.MeshStandardMaterial({ map: billboardTexture(lines, bg, fg), roughness: 0.6 }),
    );
    panel.position.y = 15; g.add(panel);
    g.position.set(bx, 0, bz);
    g.rotation.y = Math.atan2(-bx, -bz);
    root.add(g);
  }

  // Street lamps along the avenues.
  for (const x of [-400, -200, 0, 200, 400]) {
    for (let z = -400; z <= 400; z += 100) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 9, 6), mat(0x3a3a3a));
      pole.position.set(x + 8, 4.5, z); root.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffd24d, emissiveIntensity: 0.9 }));
      lamp.position.set(x + 8, 9.2, z); root.add(lamp);
    }
  }

  // Traffic lights at 16 intersections.
  for (const x of [-300, -100, 100, 300]) {
    for (const z of [-300, -100, 100, 300]) {
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
      g.position.set(x + 9, 0, z + 9);
      root.add(g);
      out.lights.push({ pos: new THREE.Vector3(x + 9, 0, z + 9), axis: (x + z) % 200 === 0 ? 'ns' : 'ew', phase: rng.range(0, 12), lamps, head });
    }
  }

  return out;
}
