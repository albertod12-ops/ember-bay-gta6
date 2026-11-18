// Traffic v5: 22 cars, 7 motorbikes and 48 pedestrians, all seeded.
// Cars follow the curved roads, turn at intersections and stop at red
// lights. At the roundabout they swing around the island and carry on —
// nobody turns on the ring.
import * as THREE from 'three';
import { makeCar, makeBike } from './vehicles.js';
import { ROADS, ROUNDABOUT, nsPlain, ewPlain, nsCenter, ewCenter, nsHeading, ewHeading } from './city.js';

const KINDS = ['sedan', 'sedan', 'taxi', 'van', 'pickup', 'sedan', 'lowrider'];

// Left-hand traffic (Indonesia): the lane offset is on the left of the
// direction of travel.
function laneOffset(axis, dir) {
  if (axis === 'ns') return dir > 0 ? -3.5 : 3.5;
  return dir > 0 ? 3.5 : -3.5;
}

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

  const spawnOnRoad = () => {
    const alongNS = rng.chance(0.5);
    const dir = rng.chance(0.5) ? 1 : -1;
    const along = rng.range(-430, 430);
    if (alongNS) {
      const road = rng.pick(ROADS.ns);
      const x = nsCenter(road, along, dir) + laneOffset('ns', dir);
      return { x, z: along, heading: nsHeading(road, along, dir), axis: 'ns', road, dir };
    }
    const road = rng.pick(ROADS.ew);
    const z = ewCenter(road, along, dir) + laneOffset('ew', dir);
    return { x: along, z, heading: ewHeading(road, along, dir), axis: 'ew', road, dir };
  };

  for (let i = 0; i < 22; i++) {
    const kind = rng.pick(KINDS);
    const v = makeCar(G, kind, rng.int(0, 3));
    const s = spawnOnRoad();
    v.group.position.set(s.x, 0, s.z);
    v.group.rotation.y = s.heading;
    scene.add(v.group);
    T.cars.push({
      ...v, pos: v.group.position, heading: s.heading, targetHeading: s.heading,
      axis: s.axis, road: s.road, dir: s.dir, speed: rng.range(10, 16), cruise: rng.range(11, 17),
      decidedAt: -1, pendingAxis: null, turnRoad: null,
    });
  }
  for (let i = 0; i < 7; i++) {
    const v = makeBike(G, rng.pick([0xd81a1a, 0x2a6fd8, 0x222831]));
    const s = spawnOnRoad();
    v.group.position.set(s.x, 0, s.z);
    v.group.rotation.y = s.heading;
    scene.add(v.group);
    T.bikes.push({
      ...v, pos: v.group.position, heading: s.heading, targetHeading: s.heading,
      axis: s.axis, road: s.road, dir: s.dir, speed: rng.range(14, 20), cruise: rng.range(15, 21),
      decidedAt: -1, pendingAxis: null, turnRoad: null,
    });
  }
  const pedSpot = () => {
    let x, z;
    do {
      x = rng.range(-430, 430); z = rng.range(-430, 430);
    } while (Math.hypot(x - ROUNDABOUT.cx, z - ROUNDABOUT.cz) < 26);
    return [x, z];
  };
  for (let i = 0; i < 48; i++) {
    const [x, z] = pedSpot();
    const p = pedFigure(G, x, z);
    scene.add(p.group);
    T.peds.push(p);
  }

  const nearestLight = (x, z) => {
    let best = null; let bestD = 1e9;
    for (const l of city.lights) {
      const dx = l.pos.x - x, dz = l.pos.z - z;
      const d = Math.hypot(dx, dz);
      if (d < bestD) { bestD = d; best = l; }
    }
    return { light: best, dist: bestD };
  };

  // Keep a car glued to its road centreline (curves included).
  const snapToRoad = (c) => {
    if (c.axis === 'ns') {
      c.pos.x = nsCenter(c.road, c.pos.z, c.dir) + laneOffset('ns', c.dir);
      c.heading = nsHeading(c.road, c.pos.z, c.dir);
    } else {
      c.pos.z = ewCenter(c.road, c.pos.x, c.dir) + laneOffset('ew', c.dir);
      c.heading = ewHeading(c.road, c.pos.x, c.dir);
    }
    c.targetHeading = c.heading;
  };

  T.update = (dt, time) => {
    const stepCar = (c) => {
      // find next intersection ahead along current axis
      const fx = Math.sin(c.heading), fz = Math.cos(c.heading);
      let distToCross = 1e9;
      let nextRoad = null;
      if (c.axis === 'ns') {
        for (const road of ROADS.ew) {
          const d = (ewPlain(road, c.pos.x) - c.pos.z) * c.dir;
          if (d > 2 && d < distToCross) { distToCross = d; nextRoad = road; }
        }
      } else {
        for (const road of ROADS.ns) {
          const d = (nsPlain(road, c.pos.z) - c.pos.x) * c.dir;
          if (d > 2 && d < distToCross) { distToCross = d; nextRoad = road; }
        }
      }
      // decide a turn once per intersection — never on the roundabout ring
      const crossKey = Math.round((c.axis === 'ns' ? c.pos.z : c.pos.x) / 100);
      const isRbCross = c.road.rb && nextRoad && nextRoad.rb;
      if (distToCross < 10 && c.decidedAt !== crossKey && !c.pendingAxis) {
        c.decidedAt = crossKey;
        if (!isRbCross) {
          const roll = rng.next();
          let turn = 0; // 0 straight, -1 left, +1 right
          if (roll > 0.62) turn = rng.chance(0.5) ? -1 : 1;
          if (turn !== 0 && nextRoad) {
            c.targetHeading = c.heading + turn * Math.PI / 2;
            c.pendingAxis = c.axis === 'ns' ? 'ew' : 'ns';
            c.turnRoad = nextRoad;
          }
        }
      }
      // steer toward target heading
      let dh = c.targetHeading - c.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      const turning = !!c.pendingAxis;
      if (turning) c.heading += dh * Math.min(1, dt * 3);
      if (Math.abs(dh) < 0.05 && c.pendingAxis) {
        c.axis = c.pendingAxis; c.pendingAxis = null;
        c.road = c.turnRoad; c.turnRoad = null;
        if (c.axis === 'ns') c.dir = Math.cos(c.heading) >= 0 ? 1 : -1;
        else c.dir = Math.sin(c.heading) >= 0 ? 1 : -1;
        snapToRoad(c);
      } else if (!turning) {
        snapToRoad(c);
      }
      // red light ahead?
      let want = c.cruise;
      const { light, dist } = nearestLight(c.pos.x + fx * 14, c.pos.z + fz * 14);
      if (light && dist < 26) {
        const st = lightState(light, time);
        const my = c.axis === 'ns' ? st.ns : st.ew;
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
    // pedestrians: stroll between sidewalk waypoints (never on the island)
    for (const p of T.peds) {
      const dx = p.target.x - p.pos.x, dz = p.target.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 2) {
        let tx, tz;
        do {
          tx = rng.range(-430, 430); tz = rng.range(-430, 430);
        } while (Math.hypot(tx - ROUNDABOUT.cx, tz - ROUNDABOUT.cz) < 26);
        p.target.set(tx, 0, tz);
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
