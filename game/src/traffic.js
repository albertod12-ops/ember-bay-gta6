// Traffic: 16 cars, 3 motorbikes and 36 pedestrians, all seeded.
// Cars follow the road grid, turn at intersections and stop at red lights.
import * as THREE from 'three';
import { makeCar, makeBike } from './vehicles.js';
import { WORLD } from './city.js';

const KINDS = ['sedan', 'sedan', 'taxi', 'van', 'pickup', 'sedan', 'lowrider'];

function pedFigure(G, x, z) {
  const rng = G.rng;
  const g = new THREE.Group();
  const skin = [0xd9a066, 0xb07a4a, 0xe8b98a, 0x8a5a34][rng.int(0, 3)];
  const shirt = [0xd83a2a, 0x2a6fd8, 0x2fae4e, 0xe8b820, 0x8a6fd8, 0xdddddd, 0x222831][rng.int(0, 6)];
  const std = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), std(0x2a3a5a));
  const legR = legL.clone();
  const hipL = new THREE.Group(); hipL.position.set(-0.18, 0.8, 0); hipL.add(legL); legL.position.y = -0.4;
  const hipR = new THREE.Group(); hipR.position.set(0.18, 0.8, 0); hipR.add(legR); legR.position.y = -0.4;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.45), std(shirt));
  torso.position.y = 1.3;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), std(skin));
  head.position.y = 2.05;
  g.add(hipL, hipR, torso, head);
  if (rng.chance(0.4)) {
    const hat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.52), std(rng.pick([0xe02030, 0x222831, 0xe8b820])));
    hat.position.y = 2.32; g.add(hat);
  }
  g.position.set(x, 0, z);
  return { group: g, hipL, hipR, pos: new THREE.Vector3(x, 0, z), target: new THREE.Vector3(x, 0, z), speed: rng.range(1.2, 2.4), phase: rng.range(0, 6) };
}

function lightState(light, t) {
  // 12 s cycle: 0-5 NS green, 5-6 NS yellow, 6-11 EW green, 11-12 EW yellow.
  const c = (t + light.phase) % 12;
  const nsGreen = c < 5; const ewGreen = c >= 6 && c < 11;
  const nsYellow = c >= 5 && c < 6; const ewYellow = c >= 11;
  return { ns: nsGreen ? 'green' : nsYellow ? 'yellow' : 'red', ew: ewGreen ? 'green' : ewYellow ? 'yellow' : 'red' };
}

export function initTraffic(G) {
  const { scene, rng, city } = G;
  const T = { cars: [], bikes: [], peds: [] };
  const roadLines = WORLD.roadAt;

  const spawnOnRoad = () => {
    const alongNS = rng.chance(0.5);
    const line = rng.pick(roadLines);
    const along = rng.range(-430, 430);
    const dir = rng.chance(0.5) ? 1 : -1;
    if (alongNS) return { x: line + (dir > 0 ? -3.5 : 3.5), z: along, heading: dir > 0 ? 0 : Math.PI, axis: 'ns', dir };
    return { x: along, z: line + (dir > 0 ? 3.5 : -3.5), heading: dir > 0 ? Math.PI / 2 : -Math.PI / 2, axis: 'ew', dir };
  };

  for (let i = 0; i < 16; i++) {
    const kind = rng.pick(KINDS);
    const v = makeCar(G, kind, rng.int(0, 3));
    const s = spawnOnRoad();
    v.group.position.set(s.x, 0, s.z);
    v.group.rotation.y = s.heading;
    scene.add(v.group);
    T.cars.push({
      ...v, pos: v.group.position, heading: s.heading, targetHeading: s.heading,
      axis: s.axis, dir: s.dir, speed: rng.range(10, 16), cruise: rng.range(11, 17),
      decidedAt: -1,
    });
  }
  for (let i = 0; i < 3; i++) {
    const v = makeBike(G, rng.pick([0xd81a1a, 0x2a6fd8, 0x222831]));
    const s = spawnOnRoad();
    v.group.position.set(s.x, 0, s.z);
    v.group.rotation.y = s.heading;
    scene.add(v.group);
    T.bikes.push({
      ...v, pos: v.group.position, heading: s.heading, targetHeading: s.heading,
      axis: s.axis, dir: s.dir, speed: rng.range(14, 20), cruise: rng.range(15, 21), decidedAt: -1,
    });
  }
  for (let i = 0; i < 36; i++) {
    const p = pedFigure(G, rng.range(-430, 430), rng.range(-430, 430));
    scene.add(p.group);
    T.peds.push(p);
  }

  const nearestLight = (x, z, axis) => {
    let best = null; let bestD = 1e9;
    for (const l of city.lights) {
      const dx = l.pos.x - x, dz = l.pos.z - z;
      const d = Math.hypot(dx, dz);
      if (d < bestD) { bestD = d; best = l; }
    }
    return { light: best, dist: bestD };
  };

  T.update = (dt, time) => {
    const stepCar = (c) => {
      // find next intersection ahead along current axis
      const fx = Math.sin(c.heading), fz = Math.cos(c.heading);
      let distToCross = 1e9;
      for (const line of roadLines) {
        const d = c.axis === 'ns' ? (line - c.pos.z) * c.dir : (line - c.pos.x) * c.dir;
        if (d > 2 && d < distToCross) distToCross = d;
      }
      // decide a turn once per intersection
      const crossKey = Math.round((c.axis === 'ns' ? c.pos.z : c.pos.x) / 100);
      if (distToCross < 10 && c.decidedAt !== crossKey) {
        c.decidedAt = crossKey;
        const roll = rng.next();
        let turn = 0; // 0 straight, -1 left, +1 right
        if (roll > 0.62) turn = rng.chance(0.5) ? -1 : 1;
        if (turn !== 0) {
          c.targetHeading = c.heading + turn * Math.PI / 2;
          // axis flips after the turn completes
          c.pendingAxis = c.axis === 'ns' ? 'ew' : 'ns';
        }
      }
      // steer toward target heading
      let dh = c.targetHeading - c.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      c.heading += dh * Math.min(1, dt * 3);
      if (Math.abs(dh) < 0.05 && c.pendingAxis) {
        c.axis = c.pendingAxis; c.pendingAxis = null;
        // recompute travel direction from the new heading
        if (c.axis === 'ns') c.dir = Math.cos(c.heading) >= 0 ? 1 : -1;
        else c.dir = Math.sin(c.heading) >= 0 ? 1 : -1;
      }
      // red light ahead?
      let want = c.cruise;
      const { light, dist } = nearestLight(c.pos.x + fx * 14, c.pos.z + fz * 14, c.axis);
      if (light && dist < 26) {
        const st = lightState(light, time).ns;
        const my = c.axis === 'ns' ? st : lightState(light, time).ew;
        if (my !== 'green' && distToCross < 24) want = 0;
      }
      c.speed += (want - c.speed) * Math.min(1, dt * (want > c.speed ? 1.2 : 4));
      c.pos.x += Math.sin(c.heading) * c.speed * dt;
      c.pos.z += Math.cos(c.heading) * c.speed * dt;
      // wrap around the map edges
      if (c.pos.x > 455) c.pos.x = -455;
      if (c.pos.x < -455) c.pos.x = 455;
      if (c.pos.z > 455) c.pos.z = -455;
      if (c.pos.z < -455) c.pos.z = 455;
      c.group.position.copy(c.pos);
      c.group.rotation.y = c.heading;
      for (const w of c.wheels) w.rotation.x += (c.speed * dt) / 0.42;
    };
    for (const c of T.cars) stepCar(c);
    for (const c of T.bikes) stepCar(c);
    // pedestrians: stroll between sidewalk waypoints
    for (const p of T.peds) {
      const dx = p.target.x - p.pos.x, dz = p.target.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 2) {
        p.target.set(rng.range(-430, 430), 0, rng.range(-430, 430));
      } else {
        const vx = dx / d, vz = dz / d;
        p.pos.x += vx * p.speed * dt;
        p.pos.z += vz * p.speed * dt;
        p.group.rotation.y = Math.atan2(vx, vz);
        p.phase += dt * p.speed * 2.2;
        const s = Math.sin(p.phase) * 0.5;
        p.hipL.rotation.x = s; p.hipR.rotation.x = -s;
      }
      p.group.position.copy(p.pos);
    }
    // traffic light lamps
    for (const l of city.lights) {
      const st = lightState(l, time);
      const setLamp = (i, color, on) => {
        l.lamps[i].material.emissive.setHex(on ? color : 0x111111);
        l.lamps[i].material.color.setHex(on ? color : 0x111111);
      };
      // lamp order: red(0), yellow(1), green(2) — show NS state on this head
      const ns = st.ns;
      setLamp(0, 0xff2211, ns === 'red');
      setLamp(1, 0xffb020, ns === 'yellow');
      setLamp(2, 0x22ff55, ns === 'green');
    }
  };
  return T;
}
