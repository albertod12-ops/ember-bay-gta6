// Ember Bay v6 — reference-based vehicles.
// Cars rebuilt after sedan side profiles (Corolla / Accord): long hood,
// glasshouse with pillars and tinted windows, short trunk, wheels at the
// corners with multi-spoke rims, mirrors, character line, swept lamps.
// Bikes rebuilt after classic / cruiser / naked side profiles: two equal
// wheels with rims and brake discs, raked fork, teardrop tank, long seat,
// raised tail, engine block, low exhaust, fenders — with a rider sitting
// ON the bike, leaning forward, hands on the bars, feet on the pegs.
// Arcade driving physics unchanged. Car top speed ~38, bike ~52.
import * as THREE from 'three';

export const CAR_TOP_SPEED = 38;
export const BIKE_TOP_SPEED = 52;

const CAR_COLORS = {
  sedan: [0x2a6fd8, 0xd83a2a, 0xcccccc, 0x222831],
  taxi: [0xffc21c],
  van: [0x8a97a8, 0x5a6a7a, 0xffffff],
  pickup: [0x7a4a2a, 0x2a7a4a, 0x9a2a2a],
  truck: [0x3a6a8a, 0x8a8a8a],
  lowrider: [0x35d05a, 0xae2f7a, 0x2f7aae],
};

function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.35, ...opts });
}
function box(w, h, d, material, x, y, z, parent, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}
// Cylinder between two points (arms, legs, fork tubes, exhaust runs).
function limb(ax, ay, az, bx, by, bz, r, material, parent, seg = 6) {
  const a = new THREE.Vector3(ax, ay, az);
  const b = new THREE.Vector3(bx, by, bz);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), material);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  parent.add(m);
  return m;
}

// A real wheel: tire + alloy rim + 5 spokes + hub + brake disc.
// Returned as a group whose local X is the axle — spinning rotation.x
// rolls it. Caller positions it at (x, r, z).
function wheel(r = 0.42) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.3, 16), std(0x141414, { roughness: 0.92, metalness: 0 }));
  tire.rotation.z = Math.PI / 2;
  g.add(tire);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, 0.32, 12), std(0xc8c8c8, { metalness: 0.85, roughness: 0.25 }));
  rim.rotation.z = Math.PI / 2;
  g.add(rim);
  const spokeMat = std(0x8a8a8a, { metalness: 0.8, roughness: 0.35 });
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.34, r * 0.55, 0.07), spokeMat);
    const a = (i / 5) * Math.PI * 2;
    s.position.set(0, Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
    s.rotation.x = -a;
    g.add(s);
  }
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.4, r * 0.4, 0.34, 12), std(0x666666, { metalness: 0.7, roughness: 0.4 }));
  disc.rotation.z = Math.PI / 2;
  g.add(disc);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.14, r * 0.14, 0.36, 8), std(0x222222, { metalness: 0.6, roughness: 0.4 }));
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  return g;
}

function lamps(g, frontZ, rearZ, y = 0.85) {
  const lamp = std(0xfff2b0, { emissive: 0xffe9a0, emissiveIntensity: 1.2 });
  box(0.55, 0.16, 0.1, lamp, -0.68, y, frontZ, g, 0, -0.2, 0);
  box(0.55, 0.16, 0.1, lamp, 0.68, y, frontZ, g, 0, 0.2, 0);
  const tail = std(0xd81a1a, { emissive: 0xaa0000, emissiveIntensity: 0.9 });
  box(0.6, 0.16, 0.1, tail, -0.65, y + 0.04, rearZ, g, 0, 0.12, 0);
  box(0.6, 0.16, 0.1, tail, 0.65, y + 0.04, rearZ, g, 0, -0.12, 0);
}

export function makeCar(G, kind, colorIdx = 0) {
  const g = new THREE.Group();
  const color = (CAR_COLORS[kind] || CAR_COLORS.sedan)[colorIdx % (CAR_COLORS[kind] || []).length];
  const paint = std(color);
  const glass = std(0x14202e, { roughness: 0.12, metalness: 0.65 });
  const dark = std(0x1a1a1a, { roughness: 0.8, metalness: 0.1 });
  const chrome = std(0xd8d8d8, { metalness: 0.9, roughness: 0.2 });
  const wheels = [];
  const addWheel = (x, z, r = 0.42) => {
    const w = wheel(r);
    w.position.set(x, r, z);
    g.add(w); wheels.push(w);
  };
  const mirror = (x, z) => {
    box(0.05, 0.05, 0.22, dark, x * 1.0, 1.04, z, g);
    box(0.14, 0.1, 0.2, dark, x * 1.08, 1.08, z, g);
  };
  if (kind === 'truck') {
    // Cab with sloped windshield + grille, then the long cargo box.
    box(2.4, 1.5, 2.0, paint, 0, 1.25, 2.7, g); // cab lower
    box(2.3, 0.9, 1.1, glass, 0, 2.35, 2.9, g, 0.18, 0, 0); // windshield slope
    box(2.35, 0.5, 1.9, paint, 0, 2.9, 2.55, g); // cab roof
    box(1.6, 0.5, 0.1, dark, 0, 0.85, 3.72, g); // grille
    box(2.4, 0.4, 0.3, dark, 0, 0.45, 3.68, g); // bumper
    box(2.5, 2.6, 5.2, std(0xd8d8d8, { roughness: 0.6, metalness: 0.2 }), 0, 1.9, -1.6, g); // cargo
    mirror(-1, 3.1); mirror(1, 3.1);
    addWheel(-1.15, 2.6); addWheel(1.15, 2.6);
    addWheel(-1.15, -1.2); addWheel(1.15, -1.2);
    addWheel(-1.15, -2.6); addWheel(1.15, -2.6);
    lamps(g, 3.74, -4.22, 0.95);
  } else if (kind === 'van') {
    box(2.3, 1.9, 5.4, paint, 0, 1.35, 0, g);
    box(2.0, 0.8, 0.9, glass, 0, 1.85, 2.0, g, 0.28, 0, 0); // sloped windshield
    box(0.06, 0.7, 3.0, glass, -1.16, 1.55, -0.4, g); // side windows L
    box(0.06, 0.7, 3.0, glass, 1.16, 1.55, -0.4, g); // side windows R
    box(2.0, 0.7, 0.1, glass, 0, 1.55, -2.68, g); // rear window
    box(2.3, 0.35, 0.3, dark, 0, 0.45, 2.68, g); // front bumper
    box(2.3, 0.35, 0.3, dark, 0, 0.45, -2.68, g); // rear bumper
    box(2.32, 0.08, 5.0, chrome, 0, 0.95, 0, g); // character line
    mirror(-1, 2.2); mirror(1, 2.2);
    addWheel(-1.1, 1.8); addWheel(1.1, 1.8);
    addWheel(-1.1, -1.8); addWheel(1.1, -1.8);
    lamps(g, 2.72, -2.72, 0.95);
  } else if (kind === 'pickup') {
    box(2.3, 0.85, 5.2, paint, 0, 0.8, 0, g); // lower body
    box(2.2, 0.1, 1.4, paint, 0, 1.28, 1.6, g, 0.1, 0, 0); // hood slope
    box(1.95, 0.75, 1.5, glass, 0, 1.65, 1.55, g); // cabin glass
    box(2.0, 0.08, 1.45, paint, 0, 2.06, 1.55, g); // cabin roof
    box(0.08, 0.75, 0.1, dark, -0.98, 1.65, 1.55, g); // B-pillar L
    box(0.08, 0.75, 0.1, dark, 0.98, 1.65, 1.55, g); // B-pillar R
    box(2.3, 0.55, 0.12, paint, 0, 1.05, -2.55, g); // tailgate
    box(0.1, 0.55, 2.6, paint, -1.12, 1.05, -1.25, g); // bed wall L
    box(0.1, 0.55, 2.6, paint, 1.12, 1.05, -1.25, g); // bed wall R
    box(2.2, 0.08, 2.5, dark, 0, 0.82, -1.25, g); // bed floor
    box(2.3, 0.35, 0.3, dark, 0, 0.45, 2.58, g); // front bumper
    box(2.32, 0.06, 4.6, chrome, 0, 0.85, 0, g); // character line
    mirror(-1, 2.1); mirror(1, 2.1);
    addWheel(-1.1, 1.8); addWheel(1.1, 1.8);
    addWheel(-1.1, -1.8); addWheel(1.1, -1.8);
    lamps(g, 2.62, -2.62, 0.9);
  } else {
    // Sedan profile (sedan / taxi / lowrider): long hood, glasshouse with
    // pillars, short trunk — after the Corolla / Accord side profiles.
    const low = kind === 'lowrider';
    const drop = low ? 0.14 : 0;
    const bodyY = 0.55 - drop;
    box(2.0, 0.5, 4.6, paint, 0, bodyY, 0, g); // lower body
    box(1.95, 0.1, 1.5, paint, 0, bodyY + 0.3, 1.5, g, 0.1, 0, 0); // hood slope
    box(2.0, 0.35, 0.35, dark, 0, bodyY - 0.12, 2.2, g); // front valance
    box(2.0, 0.35, 0.35, dark, 0, bodyY - 0.12, -2.2, g); // rear valance
    // Glasshouse: tinted glass + roof + sloped windshield + rear glass.
    box(1.75, 0.55, 2.1, glass, 0, bodyY + 0.53, -0.35, g);
    box(1.8, 0.08, 1.9, paint, 0, bodyY + 0.83, -0.35, g); // roof
    box(1.7, 0.05, 0.85, glass, 0, bodyY + 0.6, 0.68, g, 0.5, 0, 0); // windshield
    box(1.7, 0.05, 0.8, glass, 0, bodyY + 0.58, -1.38, g, -0.42, 0, 0); // rear glass
    box(0.08, 0.55, 0.1, dark, -0.88, bodyY + 0.53, -0.35, g); // B-pillar L
    box(0.08, 0.55, 0.1, dark, 0.88, bodyY + 0.53, -0.35, g); // B-pillar R
    box(0.1, 0.5, 0.1, dark, -0.85, bodyY + 0.55, 0.62, g, 0.5, 0, 0); // A-pillar L
    box(0.1, 0.5, 0.1, dark, 0.85, bodyY + 0.55, 0.62, g, 0.5, 0, 0); // A-pillar R
    // Short trunk with a lip.
    box(1.95, 0.42, 0.95, paint, 0, bodyY + 0.28, -1.82, g);
    box(1.95, 0.06, 0.2, paint, 0, bodyY + 0.5, -2.24, g); // trunk lip
    box(2.04, 0.06, 4.3, chrome, 0, bodyY + 0.22, 0, g); // character line
    // Door handles.
    box(0.04, 0.05, 0.28, chrome, -1.01, bodyY + 0.36, 0.25, g);
    box(0.04, 0.05, 0.28, chrome, 1.01, bodyY + 0.36, 0.25, g);
    box(0.04, 0.05, 0.28, chrome, -1.01, bodyY + 0.36, -0.85, g);
    box(0.04, 0.05, 0.28, chrome, 1.01, bodyY + 0.36, -0.85, g);
    mirror(-1, 0.72); mirror(1, 0.72);
    if (low) {
      box(2.06, 0.1, 4.66, chrome, 0, bodyY - 0.28, 0, g); // chrome side trim
      box(1.1, 0.09, 0.5, dark, 0, bodyY + 0.38, 1.55, g); // hood scoop
    }
    if (kind === 'taxi') {
      box(0.9, 0.3, 0.5, std(0xffc21c, { emissive: 0xaa7700, emissiveIntensity: 0.6 }), 0, bodyY + 0.98, -0.35, g); // roof sign
      box(2.02, 0.24, 4.62, dark, 0, bodyY - 0.02, 0, g); // check band
    }
    const wr = low ? 0.38 : 0.42;
    addWheel(-1.05, 1.45, wr); addWheel(1.05, 1.45, wr);
    addWheel(-1.05, -1.45, wr); addWheel(1.05, -1.45, wr);
    // Grille between the headlights.
    box(0.9, 0.14, 0.08, dark, 0, bodyY + 0.24, 2.31, g);
    lamps(g, 2.32, -2.32, bodyY + 0.3);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  return { group: g, kind, wheels, color };
}

export function makeBike(G, color = 0xd81a1a) {
  const g = new THREE.Group();
  const paint = std(color);
  const dark = std(0x1a1a1a, { roughness: 0.85, metalness: 0.1 });
  const metal = std(0x9a9a9a, { metalness: 0.85, roughness: 0.3 });
  const chrome = std(0xd8d8d8, { metalness: 0.9, roughness: 0.2 });
  const wheels = [];
  // Real wheels: tire + rim + spokes + brake disc, axle along X.
  const mkWheel = (z) => {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.16, 18), dark);
    tire.rotation.z = Math.PI / 2;
    w.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.17, 12), std(0xb8b8b8, { metalness: 0.85, roughness: 0.25 }));
    rim.rotation.z = Math.PI / 2;
    w.add(rim);
    const spokeMat = std(0x777777, { metalness: 0.8, roughness: 0.35 });
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.05), spokeMat);
      const a = (i / 5) * Math.PI * 2;
      s.position.set(0, Math.cos(a) * 0.14, Math.sin(a) * 0.14);
      s.rotation.x = -a;
      w.add(s);
    }
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.18, 12), std(0x555555, { metalness: 0.7, roughness: 0.4 }));
    disc.rotation.z = Math.PI / 2;
    w.add(disc);
    w.position.set(0, 0.42, z);
    g.add(w); wheels.push(w);
  };
  mkWheel(0.95); mkWheel(-0.95);
  // Fenders: half-rings over the wheels (torus arc, plane YZ).
  for (const z of [0.95, -0.95]) {
    const f = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.055, 6, 12, Math.PI), paint);
    f.rotation.y = Math.PI / 2;
    f.position.set(0, 0.42, z);
    g.add(f);
  }
  // Engine block with cooling fins, low and central.
  box(0.44, 0.5, 0.62, std(0x333333, { metalness: 0.6, roughness: 0.5 }), 0, 0.55, 0.0, g);
  for (const fy of [0.42, 0.55, 0.68]) box(0.48, 0.04, 0.6, metal, 0, fy, 0.0, g);
  // Backbone frame tube, steering head to rear.
  limb(0, 0.62, -0.8, 0, 1.08, 0.68, 0.05, dark, g);
  // Teardrop tank, sloping down toward the front.
  box(0.46, 0.34, 0.72, paint, 0, 0.98, 0.28, g, 0.08, 0, 0);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 8), chrome);
  cap.position.set(0, 1.16, 0.15); g.add(cap);
  // Long seat + raised tail with red taillight.
  box(0.42, 0.1, 0.8, dark, 0, 0.94, -0.42, g);
  box(0.4, 0.16, 0.42, paint, 0, 1.0, -0.82, g, -0.12, 0, 0);
  box(0.3, 0.1, 0.06, std(0xd81a1a, { emissive: 0xaa0000, emissiveIntensity: 1.0 }), 0, 1.02, -1.04, g);
  // Raked front fork: two tubes from the steering head down-forward
  // to the front axle (~21 deg from vertical, like the references).
  for (const x of [-0.09, 0.09]) limb(x, 1.12, 0.68, x, 0.42, 0.95, 0.045, metal, g);
  // Wide handlebar with grips + mirrors.
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.78, 6), dark);
  bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.18, 0.66); g.add(bar);
  for (const x of [-0.36, 0.36]) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.16, 6), dark);
    grip.rotation.z = Math.PI / 2; grip.position.set(x, 1.18, 0.66); g.add(grip);
    limb(x * 0.85, 1.2, 0.64, x * 0.9, 1.34, 0.6, 0.02, metal, g);
    box(0.16, 0.1, 0.04, dark, x * 0.92, 1.36, 0.6, g);
  }
  // Round headlight + small flyscreen (naked-bike look).
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 12), std(0xfff2b0, { emissive: 0xffe9a0, emissiveIntensity: 1.2 }));
  lamp.rotation.x = Math.PI / 2; lamp.position.set(0, 1.0, 0.92); g.add(lamp);
  box(0.34, 0.3, 0.03, std(0x223344, { roughness: 0.15, metalness: 0.4 }), 0, 1.22, 0.82, g, -0.3, 0, 0);
  // Low exhaust: pipe + chrome muffler on the right side.
  limb(0.2, 0.34, 0.25, 0.2, 0.34, -0.55, 0.08, metal, g);
  const muff = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.55, 10), chrome);
  muff.rotation.x = Math.PI / 2; muff.position.set(0.2, 0.36, -0.72); g.add(muff);
  // Rider: seated ON the bike, leaning forward, hands on the bars,
  // feet on the pegs — not a box stack.
  const rider = new THREE.Group();
  const jacket = std(0x2a3a5a);
  const pants = std(0x222831);
  const skin = std(0xd9a066, { roughness: 0.8 });
  box(0.5, 0.55, 0.34, jacket, 0, 1.32, -0.12, rider, 0.38, 0, 0); // leaning torso
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), std(0xe02030, { roughness: 0.3 }));
  helmet.position.set(0, 1.62, 0.02); rider.add(helmet);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8, 0, Math.PI * 2, 0, 1.1), std(0x14202e, { roughness: 0.1, metalness: 0.6 }));
  visor.position.set(0, 1.62, 0.06); visor.rotation.x = -0.35; rider.add(visor);
  // Arms: shoulders -> grips.
  limb(-0.26, 1.5, -0.05, -0.36, 1.18, 0.66, 0.07, jacket, rider);
  limb(0.26, 1.5, -0.05, 0.36, 1.18, 0.66, 0.07, jacket, rider);
  // Legs: hips -> knees -> pegs.
  limb(-0.2, 1.0, -0.35, -0.24, 0.72, 0.05, 0.09, pants, rider);
  limb(0.2, 1.0, -0.35, 0.24, 0.72, 0.05, 0.09, pants, rider);
  limb(-0.24, 0.72, 0.05, -0.26, 0.48, 0.12, 0.08, pants, rider);
  limb(0.24, 0.72, 0.05, 0.26, 0.48, 0.12, 0.08, pants, rider);
  box(0.1, 0.06, 0.28, dark, -0.26, 0.46, 0.14, rider); // footpeg L
  box(0.1, 0.06, 0.28, dark, 0.26, 0.46, 0.14, rider); // footpeg R
  g.add(rider);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  return { group: g, kind: 'bike', wheels, color, rider };
}

// Arcade drive controller shared by player-driven and traffic vehicles.
export function createDrive(G, vehicle, opts = {}) {
  const topSpeed = opts.topSpeed ?? (vehicle.kind === 'bike' ? BIKE_TOP_SPEED : CAR_TOP_SPEED);
  const D = {
    vehicle,
    group: vehicle.group,
    pos: new THREE.Vector3(0, 0, 0),
    heading: 0,
    speed: 0,
    topSpeed,
    accel: opts.accel ?? 16,
    steer: 0,
    place(x, z, heading = 0) {
      D.pos.set(x, 0, z); D.heading = heading; D.speed = 0; D.sync();
    },
    sync() {
      D.group.position.copy(D.pos);
      D.group.rotation.y = D.heading;
    },
    // input: {f, b, l, r, brake}; dt seconds.
    update(dt, input) {
      const fwd = input.f ? 1 : 0;
      const back = input.b ? 1 : 0;
      if (fwd) D.speed += D.accel * dt;
      else if (back) D.speed -= (D.speed > 0.5 ? 26 : 10) * dt;
      else D.speed -= Math.sign(D.speed) * Math.min(Math.abs(D.speed), 8 * dt);
      if (input.brake) D.speed -= Math.sign(D.speed) * Math.min(Math.abs(D.speed), 34 * dt);
      D.speed = Math.max(-12, Math.min(topSpeed, D.speed));
      const steerIn = (input.l ? 1 : 0) - (input.r ? 1 : 0);
      const spdFactor = Math.min(1, Math.abs(D.speed) / 14);
      D.steer += (steerIn - D.steer) * Math.min(1, dt * 10);
      D.heading += D.steer * 1.9 * spdFactor * Math.sign(D.speed || 1) * dt;
      D.pos.x += Math.sin(D.heading) * D.speed * dt;
      D.pos.z += Math.cos(D.heading) * D.speed * dt;
      D.pos.x = Math.max(-455, Math.min(455, D.pos.x));
      D.pos.z = Math.max(-455, Math.min(455, D.pos.z));
      // wheels spin + bike lean
      for (const w of vehicle.wheels) {
        w.rotation.x += (D.speed * dt) / 0.42;
      }
      if (vehicle.kind === 'bike') {
        D.group.rotation.z = -D.steer * 0.28 * spdFactor;
      }
      D.sync();
    },
  };
  return D;
}
