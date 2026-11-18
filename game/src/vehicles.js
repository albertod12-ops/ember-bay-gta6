// Ember Bay v5 — recorded re-apply under R7; behaviour unchanged
// Vehicles: 6 car kinds + motorbikes, built from boxes, wheels, glass and
// lights, with simple arcade driving physics. Car top speed ~38, bike ~52.
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
function wheel(r = 0.42) {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.32, 12), std(0x151515, { roughness: 0.9, metalness: 0 }));
  w.rotation.z = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.34, 8), std(0xc0c0c0, { metalness: 0.8, roughness: 0.3 }));
  hub.rotation.z = Math.PI / 2;
  const g = new THREE.Group();
  g.add(w, hub);
  return g;
}
function box(w, h, d, material, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

export function makeCar(G, kind, colorIdx = 0) {
  const g = new THREE.Group();
  const color = (CAR_COLORS[kind] || CAR_COLORS.sedan)[colorIdx % (CAR_COLORS[kind] || []).length];
  const paint = std(color);
  const glass = std(0x1a2a3a, { roughness: 0.15, metalness: 0.6 });
  const wheels = [];
  const addWheel = (x, z, r = 0.42) => {
    const w = wheel(r);
    w.position.set(x, r, z);
    g.add(w); wheels.push(w);
  };
  if (kind === 'truck') {
    box(2.4, 2.2, 2.2, paint, 0, 1.6, 2.6, g); // cab
    box(2.2, 1.4, 1.4, glass, 0, 2.2, 2.4, g);
    box(2.5, 2.6, 5.2, std(0xd8d8d8, { roughness: 0.6, metalness: 0.2 }), 0, 1.9, -1.6, g); // cargo
    addWheel(-1.15, 2.6); addWheel(1.15, 2.6); addWheel(-1.15, -2.6); addWheel(1.15, -2.6);
    addWheel(-1.15, -1.2); addWheel(1.15, -1.2);
  } else if (kind === 'van') {
    box(2.3, 1.9, 5.4, paint, 0, 1.35, 0, g);
    box(2.1, 0.8, 1.6, glass, 0, 1.9, 1.8, g);
    box(2.0, 0.7, 0.9, glass, 0, 1.8, -2.2, g);
    addWheel(-1.1, 1.8); addWheel(1.1, 1.8); addWheel(-1.1, -1.8); addWheel(1.1, -1.8);
  } else if (kind === 'pickup') {
    box(2.3, 0.9, 5.2, paint, 0, 0.85, 0, g);
    box(2.1, 0.9, 1.6, paint, 0, 1.7, 1.8, g);
    box(2.0, 0.7, 1.2, glass, 0, 1.9, 1.6, g);
    box(2.2, 0.5, 2.4, std(0x222222, { roughness: 0.9 }), 0, 1.15, -1.2, g); // bed
    addWheel(-1.1, 1.8); addWheel(1.1, 1.8); addWheel(-1.1, -1.8); addWheel(1.1, -1.8);
  } else {
    const low = kind === 'lowrider';
    const bodyH = low ? 0.62 : 0.8;
    const bodyY = low ? 0.55 : 0.8;
    box(2.1, bodyH, 4.6, paint, 0, bodyY, 0, g);
    box(1.9, 0.72, 2.3, glass, 0, bodyY + bodyH / 2 + 0.32, -0.2, g);
    if (low) {
      box(2.16, 0.14, 4.7, std(0xd8d8d8, { metalness: 0.9, roughness: 0.2 }), 0, bodyY - 0.32, 0, g); // chrome trim
      box(1.2, 0.1, 0.5, std(0x111111), 0, 1.32, 1.6, g); // hood scoop
    }
    if (kind === 'taxi') {
      box(0.9, 0.3, 0.5, std(0xffc21c, { emissive: 0xaa7700, emissiveIntensity: 0.6 }), 0, 1.62, -0.2, g); // roof sign
      box(2.12, 0.28, 4.62, std(0x111111), 0, bodyY + 0.1, 0, g); // check band
    }
    addWheel(-1.05, 1.55, low ? 0.38 : 0.42); addWheel(1.05, 1.55, low ? 0.38 : 0.42);
    addWheel(-1.05, -1.55, low ? 0.38 : 0.42); addWheel(1.05, -1.55, low ? 0.38 : 0.42);
  }
  // headlights + taillights
  const lamp = std(0xfff2b0, { emissive: 0xffe9a0, emissiveIntensity: 1.2 });
  box(0.42, 0.22, 0.08, lamp, -0.7, 0.85, 2.32, g);
  box(0.42, 0.22, 0.08, lamp, 0.7, 0.85, 2.32, g);
  const tail = std(0xd81a1a, { emissive: 0xaa0000, emissiveIntensity: 0.9 });
  box(0.42, 0.22, 0.08, tail, -0.7, 0.85, -2.32, g);
  box(0.42, 0.22, 0.08, tail, 0.7, 0.85, -2.32, g);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  return { group: g, kind, wheels, color };
}

export function makeBike(G, color = 0xd81a1a) {
  const g = new THREE.Group();
  const paint = std(color);
  const dark = std(0x1a1a1a, { roughness: 0.85, metalness: 0.1 });
  const wheels = [];
  const mkWheel = (z) => {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.13, 8, 18), dark);
    w.position.set(0, 0.42, z);
    g.add(w); wheels.push(w);
  };
  mkWheel(0.95); mkWheel(-0.95);
  box(0.3, 0.22, 1.7, paint, 0, 0.85, 0, g); // tank + frame
  box(0.5, 0.12, 0.7, dark, 0, 0.95, -0.55, g); // seat
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6), dark);
  bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.05, 0.85); g.add(bar);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), std(0xfff2b0, { emissive: 0xffe9a0, emissiveIntensity: 1.2 }));
  lamp.position.set(0, 0.9, 1.05); g.add(lamp);
  // rider: simple torso + helmet
  const rider = new THREE.Group();
  box(0.5, 0.6, 0.35, std(0x2a3a5a), 0, 1.35, -0.15, rider);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), std(0xe02030, { roughness: 0.3 }));
  helmet.position.set(0, 1.85, -0.1); rider.add(helmet);
  g.add(rider);
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
        if (vehicle.kind === 'bike') w.rotation.x += (D.speed * dt) / 0.42;
        else w.rotation.x += (D.speed * dt) / 0.42;
      }
      if (vehicle.kind === 'bike') {
        D.group.rotation.z = -D.steer * 0.28 * spdFactor;
      }
      D.sync();
    },
  };
  return D;
}
