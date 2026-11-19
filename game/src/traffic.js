import * as THREE from 'three';
import { makeCar, makeBike } from './vehicles.js';
import { makePerson } from './people.js';
import { ROADS, ROUNDABOUT, nsPlain, ewPlain, nsCenter, ewCenter, nsHeading, ewHeading } from './city.js';

const KINDS = ['sport', 'sport', 'sport', 'taxi', 'van', 'pickup', 'sport', 'sedan', 'sport', 'truck'];

function laneOffset(axis, dir) {
  if (axis === 'ns') return dir > 0 ? -3.5 : 3.5;
  return dir > 0 ? 3.5 : -3.5;
}

function pedFigure(G, x, z) {
  const rng = G.rng;
  const fig = makePerson(G, {
    skin: rng.pick([0xd9a066, 0xb07a4a, 0xe8b98a, 0x8a5a34, 0xc98a5e, 0x6e4530]),
    shirt: rng.pick([0x2a3a5a, 0x5a6a3a, 0x7a2a2a, 0x3a3a3a, 0x4a6a6a, 0xc9c2b2, 0x1c1c22, 0x2a6fd8, 0x8a6fd8, 0xb06a3a]),
    shirt2: rng.chance(0.4) ? rng.pick([0xffffff, 0x222831, 0xd83a2a, 0x2a3a5a]) : null,
    pants: rng.pick([0x2a3a5a, 0x3a3a3a, 0x5a4a3a, 0x2a4a2a, 0x1c222e, 0x6a5a4a]),
    shoes: rng.pick([0x222222, 0x8a2a2a, 0xdddddd, 0x2a3a5a, 0x3a2a1a]),
    hair: rng.pick([0x14141c, 0x3a2a1a, 0x8a8a8a, 0xe8c820, 0x2a1410, 0x5a3a22]),
    hairStyle: rng.pick(['short', 'short', 'long', 'bald', 'bandana', 'afro', 'bun', 'buzz']),
    hat: rng.chance(0.3) ? rng.pick([0xe02030, 0x222831, 0xe8b820]) : null,
    jacket: rng.chance(0.25) ? rng.pick([0x2a6fd8, 0x8a6fd8, 0x3a3a3a, 0x5a3a2a]) : null,
    h: rng.range(1.62, 1.92),
    build: rng.range(0.92, 1.08),
    sleeves: rng.chance(0.55) ? 'long' : 'short',
    hoodie: rng.chance(0.2),
    backpack: rng.chance(0.18) ? rng.pick([0x2a6fd8, 0xd83a2a, 0x3a3a3a, 0x2fae4e]) : null,
  });
  const g = fig.group;
  g.position.set(x, 0, z);
  return {
    group: g, hipL: fig.hipL, hipR: fig.hipR, shL: fig.shL, shR: fig.shR,
    pos: new THREE.Vector3(x, 0, z), speed: rng.range(1.2, 2.4), phase: rng.range(0, 6),
  };
}

function lightState(light, t) {
  const c = (t + light.phase) % 12;
  const nsGreen = c < 5;
  const ewGreen = c >= 6 && c < 11;
  const nsYellow = c >= 5 && c < 6;
  const ewYellow = c >= 11;
  return {
    ns: nsGreen ? 'green' : nsYellow ? 'yellow' : 'red',
    ew: ewGreen ? 'green' : ewYellow ? 'yellow' : 'red',
  };
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

  for (let i = 0; i < 48; i++) {
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
  for (let i = 0; i < 12; i++) {
    const v = makeBike(G, rng.pick([0xffd400, 0x2a6fd8, 0xff6a00]));
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
  const pedWalk = () => {
    const axis = rng.chance(0.5) ? 'ns' : 'ew';
    const road = rng.pick(ROADS[axis]);
    const side = rng.chance(0.5) ? 1 : -1;
    return {
      axis, road, side, off: rng.range(7.6, 8.9) * side,
      along: rng.range(-430, 430), dir: rng.chance(0.5) ? 1 : -1, targetAlong: 0,
    };
  };
  for (let i = 0; i < 90; i++) {
    const w = pedWalk();
    w.targetAlong = w.along + w.dir * rng.range(40, 140);
    const x = w.axis === 'ns' ? nsCenter(w.road, w.along, w.dir) + w.off : w.along;
    const z = w.axis === 'ns' ? w.along : ewCenter(w.road, w.along, w.dir) + w.off;
    const p = pedFigure(G, x, z);
    Object.assign(p, w);
    scene.add(p.group);
    T.peds.push(p);
  }

  const nearestLight = (x, z) => {
    let best = null;
    let bestD = 1e9;
    for (const l of city.lights) {
      const dx = l.pos.x - x, dz = l.pos.z - z;
      const d = Math.hypot(dx, dz);
      if (d < bestD) { bestD = d; best = l; }
    }
    return { light: best, dist: bestD };
  };

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
      const crossKey = Math.round((c.axis === 'ns' ? c.pos.z : c.pos.x) / 100);
      const isRbCross = c.road.rb && nextRoad && nextRoad.rb;
      if (distToCross < 10 && c.decidedAt !== crossKey && !c.pendingAxis) {
        c.decidedAt = crossKey;
        if (!isRbCross) {
          const roll = rng.next();
          let turn = 0;
          if (roll > 0.62) turn = rng.chance(0.5) ? -1 : 1;
          if (turn !== 0 && nextRoad) {
            c.targetHeading = c.heading + turn * Math.PI / 2;
            c.pendingAxis = c.axis === 'ns' ? 'ew' : 'ns';
            c.turnRoad = nextRoad;
          }
        }
      }
      let dh = c.targetHeading - c.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      const turning = !!c.pendingAxis;
      if (turning) c.heading += dh * Math.min(1, dt * 5);
      if (Math.abs(dh) < 0.05 && c.pendingAxis) {
        c.axis = c.pendingAxis;
        c.pendingAxis = null;
        c.road = c.turnRoad;
        c.turnRoad = null;
        if (c.axis === 'ns') c.dir = Math.cos(c.heading) >= 0 ? 1 : -1;
        else c.dir = Math.sin(c.heading) >= 0 ? 1 : -1;
        snapToRoad(c);
      } else if (!turning) {
        snapToRoad(c);
      }
      let want = c.cruise;
      if (turning) want = Math.min(want, 6);
      const { light, dist } = nearestLight(c.pos.x + fx * 14, c.pos.z + fz * 14);
      if (light && dist < 26) {
        const st = lightState(light, time);
        const my = c.axis === 'ns' ? st.ns : st.ew;
        if (my !== 'green' && distToCross < 24) want = 0;
      }
      c.speed += (want - c.speed) * Math.min(1, dt * (want > c.speed ? 1.2 : 4));
      c.pos.x += Math.sin(c.heading) * c.speed * dt;
      c.pos.z += Math.cos(c.heading) * c.speed * dt;
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
    for (const p of T.peds) {
      p.along += p.dir * p.speed * dt;
      if ((p.dir > 0 && p.along >= p.targetAlong) || (p.dir < 0 && p.along <= p.targetAlong)) {
        if (p.along > 420 || p.along < -420) p.dir *= -1;
        p.targetAlong = p.along + p.dir * rng.range(40, 140);
        if (p.targetAlong > 430) p.targetAlong = 430;
        if (p.targetAlong < -430) p.targetAlong = -430;
      }
      if (p.axis === 'ns') {
        p.pos.x = nsCenter(p.road, p.along, p.dir) + p.off;
        p.pos.z = p.along;
        p.group.rotation.y = nsHeading(p.road, p.along, p.dir);
      } else {
        p.pos.x = p.along;
        p.pos.z = ewCenter(p.road, p.along, p.dir) + p.off;
        p.group.rotation.y = ewHeading(p.road, p.along, p.dir);
      }
      p.phase += dt * p.speed * 2.2;
      const s = Math.sin(p.phase) * 0.5;
      p.hipL.rotation.x = s;
      p.hipR.rotation.x = -s;
      p.shL.rotation.x = -s * 0.8;
      p.shR.rotation.x = s * 0.8;
      p.group.position.copy(p.pos);
    }
    for (const l of city.lights) {
      const st = lightState(l, time);
      const setLamp = (i, color, on) => {
        l.lamps[i].material.emissive.setHex(on ? color : 0x111111);
        l.lamps[i].material.color.setHex(on ? color : 0x111111);
      };
      const ns = st.ns;
      setLamp(0, 0xff2211, ns === 'red');
      setLamp(1, 0xffb020, ns === 'yellow');
      setLamp(2, 0x22ff55, ns === 'green');
    }
  };
  return T;
}
