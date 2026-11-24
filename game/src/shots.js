import * as THREE from 'three';
import { makeCar, makeBike, createDrive } from './vehicles.js';
import { makePoliceCar, makeHeli, makePolicePed } from './police.js';
import { ROADS, roadPoint, nsCenter, nsHeading, ewCenter, ewHeading } from './city.js';
// v18.2: guns are LIGHT steel + oversized so the barrel reads at a glance
// against navy uniforms and the street; rifle held near-horizontal.
function armCop(ped, gun, pose) {
  const steel = new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.3, metalness: 0.75 });
  const gripM = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.4 });
  const g = new THREE.Group();
  const bx = (w, h, d, x, y, z, m) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m || steel);
    mesh.position.set(x, y, z);
    g.add(mesh);
  };
  if (gun === 'rifle') {
    bx(0.13, 1.15, 0.12, 0, -0.5, 0);
    bx(0.11, 0.22, 0.14, 0, 0.08, -0.02);
    bx(0.09, 0.2, 0.1, 0, -0.18, 0.07, gripM);
    bx(0.14, 0.1, 0.13, 0, -1.02, 0);
  } else {
    bx(0.13, 0.62, 0.11, 0, -0.28, 0);
    bx(0.11, 0.2, 0.12, 0, 0.06, 0.02, gripM);
  }
  g.position.set(0, -0.62, 0.02);
  ped.shR.add(g);
  if (pose === 'aim') {
    ped.shL.rotation.x = -1.35; ped.shR.rotation.x = -1.4;
    ped.shL.rotation.z = 0.3; ped.shR.rotation.z = -0.3;
    ped.hipL.rotation.x = 0.15; ped.hipR.rotation.x = -0.12;
    ped.group.rotation.x = 0.06;
  } else {
    ped.shR.rotation.x = -1.3;
    ped.shL.rotation.x = 0.7;
    ped.hipL.rotation.x = -0.8; ped.hipR.rotation.x = 0.8;
    ped.hipL.rotation.z = 0.3; ped.hipR.rotation.z = -0.3;
    ped.group.rotation.x = 0.2;
  }
}
const STAGE_ROAD = 3;
const COVER_ROAD = 0; // Palms Beach (ns[0], z=-70): low pastel beach buildings + palms + ocean-side district read as a different place from downtown (ns[3]); cover and title must not share one street
const COVER_Z = -70; // Palms Beach stretch
// v18.8: put a staged car ON the road, not on the player's heading tangent.
// The tangent drifts off the curving centreline by ~fwd*sin(drift) (cover
// drift is +0.2 rad, so a car 26 ahead sat ~5 units off-centre and the
// 4.5 lane put it past the 6-wide road edge, half inside a building), and
// police/traffic slot tables shared coordinates — combat had an exact
// duplicate at (14,+4), green + black/red + orange in one pile. z follows
// the road, x the centreline at that z, heading the road heading there.
function roadPlace(c, road, dir, anchorZ, fwd, side) {
  const z = anchorZ + dir * fwd;
  const h = nsHeading(road, z, dir);
  c.pos.set(nsCenter(road, z, dir) + side * Math.cos(h), 0, z);
  c.heading = h;
  c.group.position.copy(c.pos);
  c.group.rotation.y = h;
}
function parkFar(c, i) {
  const far = (i % 2 === 0 ? -1 : 1) * (380 + (i % 5) * 8);
  if (c.axis === 'ns') {
    c.pos.z = far;
    c.pos.x = nsCenter(c.road, far, c.dir) + (c.dir > 0 ? -3.5 : 3.5);
    c.heading = nsHeading(c.road, far, c.dir);
  } else {
    c.pos.x = far;
    c.pos.z = ewCenter(c.road, far, c.dir) + (c.dir > 0 ? 3.5 : -3.5);
    c.heading = ewHeading(c.road, far, c.dir);
  }
  c.targetHeading = c.heading;
  c.group.position.copy(c.pos);
  c.group.rotation.y = c.heading;
}
let parkedCache = null;
function parkedCars(G) {
  if (!parkedCache) parkedCache = G.city.root.children.filter((o) => o.userData && o.userData.parkedCar);
  return parkedCache;
}
function enterSport(G, x, z, heading, speed) {
  const v = makeCar(G, 'sport', 2);
  G.scene.add(v.group);
  const d = createDrive(G, v, {});
  d.place(x, z, heading);
  d.speed = speed;
  G.enterVehicle(d);
  return d;
}
function enterBike(G, x, z, heading, speed) {
  const v = makeBike(G, 0xd81a1a);
  G.scene.add(v.group);
  const d = createDrive(G, v, {});
  d.place(x, z, heading);
  d.speed = speed;
  G.enterVehicle(d);
  return d;
}
function flashSprite(G) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const cx = cv.getContext('2d');
  const g = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,230,1)');
  g.addColorStop(0.35, 'rgba(255,205,80,0.95)');
  g.addColorStop(1, 'rgba(255,130,0,0)');
  cx.fillStyle = g; cx.fillRect(0, 0, 64, 64);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.visible = false; G.scene.add(s); return s;
}
export function stageShot(G, name) {
  G.shot = name;
  G._aimPose = false;
  if (name.startsWith('showcase')) {
    // Diagnostic only (never a submission shot): one car, large in frame,
    // front 3/4, clean street, no HUD — to compare the silhouette with the
    // 3D-model reference. Name: showcase-<kind>, kind = sport|muscle|wedge|
    // boxy|stripe|police0|police1. showcase-side-<kind> = pure profile view
    // (wheel-fit check: tire top vs fender line, side flush).
    let kind = name.slice(9);
    const side = kind.startsWith('side-');
    if (side) kind = kind.slice(5);
    G.setClock(13); // v18.4: bright midday for the diagnostic — at 17:00 the
    // car's front sat in shadow and the lime read as dark olive, which hid
    // the shape. Submission shots keep their own clocks.
    G.mode = 'playing';
    G.hud.setMenu(false);
    for (const id of ['hud', 'ebpd', 'missionBanner', 'dialogue', 'title']) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    }
    G.player.group.visible = false;
    const pt = roadPoint('ns', STAGE_ROAD, -70, 1);
    const fx = Math.sin(pt.heading), fz = Math.cos(pt.heading);
    const rx = Math.cos(pt.heading), rz = -Math.sin(pt.heading);
    if (kind === 'police0' || kind === 'police1') {
      const v = makePoliceCar(G, kind === 'police0' ? 0 : 1);
      G.scene.add(v.group);
      v.group.position.set(pt.x, 0, pt.z);
      v.group.rotation.y = pt.heading;
    } else {
      const ci = { sport: 2, muscle: 0, wedge: 0, boxy: 0, stripe: 0 }[kind] ?? 0;
      const v = makeCar(G, kind, ci);
      G.scene.add(v.group);
      const d = createDrive(G, v, {});
      d.place(pt.x, pt.z, pt.heading);
      d.speed = 0;
    }
    G.traffic.cars.forEach((c, i) => parkFar(c, i));
    G.traffic.bikes.forEach((c, i) => parkFar(c, i));
    for (const g of parkedCars(G)) g.visible = false;
    G.camOverride = side ? {
      pos: [pt.x + rx * 5.5, 0.75, pt.z + rz * 5.5],
      look: [pt.x, 0.45, pt.z],
    } : {
      pos: [pt.x + fx * 5 + rx * 2.5, 2.2, pt.z + fz * 5 + rz * 2.5],
      look: [pt.x, 0.5, pt.z],
    };
    return;
  }
  if (name === 'title') {
    G.setClock(19.8);
    G.mode = 'playing';
    G.hud.setMenu(true);
    G.player.group.visible = false;
    // v18.6: start far south (z=-247) so that at the 6.5 s capture the car
    // is near z=0, the heart of Downtown Core (tall buildings both sides),
    // instead of z≈177 at the district edge (flat, buildings set back).
    const pt = roadPoint('ns', STAGE_ROAD, -247, 1);
    enterSport(G, pt.x, pt.z, pt.heading, 38);
    G._titleCops = [];
    for (let i = 0; i < 2; i++) {
      const cop = makePoliceCar(G, i);
      G.scene.add(cop.group);
      G._titleCops.push(cop);
    }
    G._titleHeli = makeHeli(G);
    G.scene.add(G._titleHeli.group);
    G.scene.add(G._titleHeli.cone);
    G.scene.add(G._titleHeli.spot.target);
    G._titleT = 0;
    return;
  }
  if (name === 'map') {
    G.setClock(19.8);
    G.mode = 'playing';
    G.hud.setMenu(false);
    G.camOverride = { pos: [-100, 700, 80], look: [-100, 0, 0] };
    G.scene.fog.near = 1500;
    G.scene.fog.far = 5000;
    G.missions.startId(1);
    G.hud.showMap(true);
    return;
  }
  G.mode = 'playing';
  G.hud.setMenu(false);
  const pt = roadPoint('ns', COVER_ROAD, COVER_Z, 1);
  if (name === 'cover') {
    G.setClock(19.8);
    enterSport(G, pt.x, pt.z, pt.heading, 38);
    G.missions.startId(5);
    G.hud.dialogue('MARA VOSS', 'FIXER', 'Three stars and counting. Stay hot for 45 seconds and they\'ll know your name.', 'mara', true);
  } else if (name === 'combat') {
    G.setClock(21.7);
    const cpt = roadPoint('ns', STAGE_ROAD, -70, -1);
    G.player.place(cpt.x, cpt.z, cpt.heading);
    G.playerPos = G.player.pos;
    G.playerHeading = cpt.heading;
    const fx = Math.sin(cpt.heading), fz = Math.cos(cpt.heading);
    const rx = Math.cos(cpt.heading), rz = -Math.sin(cpt.heading);
    G.missions.startId(7); // step 1/2 spawns Vic's guards ahead of the player
    G.police.setWanted(4);
    G.hud.dialogue('VIC TORRES', 'CREW BOSS', 'You walked into the wrong street, kid. Boys — take him down.', 'vic', true);
    G._shotTimer = 1.35;
    G._aimPose = true;
    G._muzzle = flashSprite(G);
    G._combatCops = [];
    for (let i = 0; i < 2; i++) {
      const ped = makePolicePed(G, i === 1);
      // v18.2: both cops on the camera-right side, clear of CJ's muzzle flash
      // (flash sits screen-left); cop 1 advances from beside the cruiser.
      const fwd = 5.5 + i * 3.5;
      const side = i === 0 ? -2 : -5;
      ped.group.position.set(cpt.x + fx * fwd + rx * side, 0, cpt.z + fz * fwd + rz * side);
      ped.group.rotation.y = cpt.heading + Math.PI;
      // Cop 0 aims a rifle two-handed; cop 1 advances mid-stride, pistol up.
      armCop(ped, i === 0 ? 'rifle' : 'pistol', i === 0 ? 'aim' : 'advance');
      G.scene.add(ped.group);
      G._combatCops.push(ped);
    }
    G.camOverride = {
      pos: [cpt.x - fx * 1.7 - rx * 2.0, 1.75, cpt.z - fz * 1.7 - rz * 2.0],
      look: [cpt.x + fx * 8, 1.2, cpt.z + fz * 8],
    };
  }
}
export function updateShot(G, dt) {
  if (!G.shot || G.shot === 'map' || G.shot.startsWith('showcase')) return;
  const P = G.police;
  if (G.shot !== 'combat') for (const g of parkedCars(G)) g.visible = true;
  if (G.shot === 'title') {
    G._titleT = (G._titleT || 0) + dt;
    const road = ROADS.ns[STAGE_ROAD];
    const car = G.vehicle;
    if (car) {
      const t = nsHeading(road, car.pos.z, 1);
      car.speed = 38;
      car.heading = t + 0.12;
      car.pos.x = nsCenter(road, car.pos.z, 1) - 2.5;
      car.sync();
      const d = car.drift;
      d.active = true;
      d.angle = 20;
      d.combo = Math.max(d.combo, 2);
      d.points += 320 * dt;
      if (G.driftFX) {
        const hx = Math.sin(car.heading), hz = Math.cos(car.heading);
        const rx = Math.cos(car.heading), rz = -Math.sin(car.heading);
        for (const side of [-1, 1]) {
          const wx = car.pos.x - hx * 1.5 + rx * side;
          const wz = car.pos.z - hz * 1.5 + rz * side;
          G.driftFX.spawnSmoke(wx, 0.4, wz, 1);
          G.driftFX.spawnSmoke(wx - hx * 0.7, 0.5, wz - hz * 0.7, 1);
          G.driftFX.laySkid(wx, wz, Math.atan2(car.vel.x, car.vel.z));
        }
      }
      const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
      const rx = Math.cos(car.heading), rz = -Math.sin(car.heading);
      const flash = Math.sin(G._titleT * 14) > 0;
      G._titleCops.forEach((cop, i) => {
        const back = 8 + i * 3.5; // v18.4: FAR behind the car — at back 4 the
        // cruiser's front overlapped the Ultima's wing/rear in the title shot.
        const side = i === 0 ? 3 : -3;
        cop.group.position.set(car.pos.x - fx * back + rx * side, 0, car.pos.z - fz * back + rz * side);
        cop.group.rotation.y = car.heading;
        cop.red.material.emissiveIntensity = flash ? 2.4 : 0.25;
        cop.blue.material.emissiveIntensity = flash ? 0.25 : 2.4;
      });
      const h = G._titleHeli;
      if (h) {
        const hx = car.pos.x + fx * 26 + rx * 4;
        const hz = car.pos.z + fz * 26 + rz * 4;
        h.group.position.set(hx, 15 + Math.sin(G._titleT * 0.8) * 1.2, hz);
        h.group.rotation.y = Math.atan2(car.pos.x - hx, car.pos.z - hz);
        h.rotor.rotation.y += dt * 22;
        h.tailRotor.rotation.x += dt * 30;
        h.spot.target.position.set(car.pos.x, 0, car.pos.z);
        h.spot.target.updateMatrixWorld();
        const hp = h.group.position;
        const dir = new THREE.Vector3(car.pos.x - hp.x, -hp.y, car.pos.z - hp.z);
        const len = dir.length();
        dir.normalize();
        h.cone.position.set(hp.x + dir.x * len / 2, hp.y + dir.y * len / 2, hp.z + dir.z * len / 2);
        h.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
        h.cone.scale.set(1, len / 42, 1);
      }
      const tSports = G.traffic.cars.filter((c) => c.kind === 'sport' && c.color !== 0xffc21c);
      const tOthers = G.traffic.cars.filter((c) => c.kind !== 'sport' || c.color === 0xffc21c);
      const tSlots = [[16, 0.5], [22, 4.5], [32, 0.5], [42, 4.5]];
      // v18.8: sports+others is EVERY car, so the old un-sliced held made
      // the park-the-rest loop a no-op and free traffic drove through the
      // staged shot. Slice to the slots actually used.
      const tHeld = [...tSports, ...tOthers].slice(0, tSlots.length);
      tSlots.forEach(([fwd, side], i) => { if (tHeld[i]) roadPlace(tHeld[i], ROADS.ns[STAGE_ROAD], 1, car.pos.z, fwd, side); });
      G.traffic.cars.forEach((c, i) => { if (!tHeld.includes(c)) parkFar(c, i); });
      G.traffic.bikes.forEach((c, i) => parkFar(c, i));
      // v18.3: camera CLOSER than v18.2 (was fx*9+rx*4, y 2.7) so the
      // rebuilt Ultima is LARGE in frame — the user must see the shape.
      G.camOverride = {
        pos: [car.pos.x + fx * 6.5 + rx * 3, 2.2, car.pos.z + fz * 6.5 + rz * 3],
        look: [car.pos.x - fx * 2, 1.4, car.pos.z - fz * 2],
      };
      G.playerHeading = car.heading;
    }
    return;
  }
  if (G.shot === 'combat') {
    G._shotTimer = (G._shotTimer || 0) + dt;
    if (G._shotTimer > 1.4) { G._shotTimer = 0; G.shoot(); }
    if (G._flash && G._shotTimer < 0.6) G._flash.t = 0.12;
    const pp = G.playerPos;
    const ph = G.playerHeading;
    for (const g of parkedCars(G)) g.visible = Math.hypot(g.position.x - pp.x, g.position.z - pp.z) > 25;
    const fx = Math.sin(ph), fz = Math.cos(ph);
    if (G._muzzle) {
      const m = G._muzzle;
      m.position.set(pp.x + fx * 1.4, 1.35, pp.z + fz * 1.4);
      const on = G._shotTimer < 0.6;
      m.visible = on;
      if (on) { const sc = 1.0 - G._shotTimer * 0.7; m.scale.set(sc, sc, 1); }
    }
    const rx = Math.cos(ph), rz = -Math.sin(ph);
    // v18.8: every car on the road (dir -1: ahead is -z) on its own grid
    // point — police 16..38, traffic 44..64, bikes centre lane 40/54,
    // police bike 26. Old tables shared (14,+4) exactly and sat 2-4 apart
    // elsewhere, so green + black/red + orange piled at one point; and
    // un-held traffic was never parked (see the slice note in title), so
    // free cars drove through the shot too.
    const road3 = ROADS.ns[STAGE_ROAD];
    const sports = G.traffic.cars.filter((c) => c.kind === 'sport' && c.color !== 0xffc21c);
    const others = G.traffic.cars.filter((c) => c.kind !== 'sport' || c.color === 0xffc21c);
    const cSlots = [[44, -4], [50, 4], [58, -4], [64, 4]];
    const held = [...sports, ...others].slice(0, cSlots.length);
    cSlots.forEach(([fwd, side], i) => { if (held[i]) roadPlace(held[i], road3, -1, pp.z, fwd, side); });
    G.traffic.cars.forEach((c, i) => { if (!held.includes(c)) parkFar(c, i); });
    const bikeA = G.traffic.bikes[0];
    if (bikeA) roadPlace(bikeA, road3, -1, pp.z, 40, 0);
    const bikeB = G.traffic.bikes[1];
    if (bikeB) roadPlace(bikeB, road3, -1, pp.z, 54, 0);
    G.traffic.bikes.forEach((c, i) => { if (c !== bikeA && c !== bikeB) parkFar(c, i); });
    const cars = P.units.filter((u) => u.kind === 'car');
    const carSlots = [[-3.5, 16], [3.5, 22], [-3.5, 30], [3.5, 38], [-3.5, 46], [3.5, 52]];
    cars.forEach((c, i) => {
      const [side, fwd] = carSlots[i % carSlots.length];
      roadPlace(c, road3, -1, pp.z, fwd, side);
    });
    const pb = P.units.find((u) => u.kind === 'bike');
    if (pb) roadPlace(pb, road3, -1, pp.z, 26, 0);
    // v18.8: the wanted-4 roadblock is spawned on the straight tangent 70
    // ahead, so one of its cars sat 7.6 off-centre (off the road) and 3.6
    // from the farthest traffic car. Pull both cars onto the road at fwd
    // 70, ±3 across it; keep their across-road rotation and P.roadblock.pos
    // (HUD distance + removal range) untouched.
    if (P.roadblock) {
      const rz70 = pp.z - 70;
      const rh = nsHeading(road3, rz70, -1);
      P.roadblock.cars.forEach((rb, i) => {
        rb.group.position.set(nsCenter(road3, rz70, -1) + (i === 0 ? -3 : 3) * Math.cos(rh), 0, rz70);
      });
    }
    if (P.heli) P.heli.group.position.set(pp.x + fx * 24, 24, pp.z + fz * 24);
    return;
  }
  const road = ROADS.ns[COVER_ROAD];
  if (G.vehicle) {
    G.vehicle.speed = 38;
    const t = nsHeading(road, G.vehicle.pos.z, 1);
    let dh = t - G.vehicle.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    G.vehicle.heading += dh * Math.min(1, dt * 6);
    G.vehicle.pos.x = nsCenter(road, G.vehicle.pos.z, 1);
    G.vehicle.sync();
    G.playerHeading = G.vehicle.heading;
  }
  if (G.shot === 'cover' && G.vehicle) {
    const t = nsHeading(road, G.vehicle.pos.z, 1);
    G.vehicle.heading = t + 0.22;
    G.vehicle.sync();
    const hx = Math.sin(G.vehicle.heading), hz = Math.cos(G.vehicle.heading);
    const rx2 = Math.cos(G.vehicle.heading), rz2 = -Math.sin(G.vehicle.heading);
    G.camOverride = {
      pos: [G.vehicle.pos.x - hx * 6.5 + rx2 * 1.5, 2.8, G.vehicle.pos.z - hz * 6.5 + rz2 * 1.5],
      look: [G.vehicle.pos.x + hx * 10, 1.4, G.vehicle.pos.z + hz * 10],
    };
    const d = G.vehicle.drift;
    d.active = true;
    d.angle = 20;
    d.combo = Math.max(d.combo, 2);
    d.points += 320 * dt;
    if (G.driftFX) {
      const hx = Math.sin(G.vehicle.heading), hz = Math.cos(G.vehicle.heading);
      const rx = Math.cos(G.vehicle.heading), rz = -Math.sin(G.vehicle.heading);
      for (const side of [-1, 1]) {
        const wx = G.vehicle.pos.x - hx * 1.5 + rx * side;
        const wz = G.vehicle.pos.z - hz * 1.5 + rz * side;
        G.driftFX.spawnSmoke(wx, 0.4, wz, 1);
        G.driftFX.laySkid(wx, wz, Math.atan2(G.vehicle.vel.x, G.vehicle.vel.z));
      }
    }
  }
  const pp = G.playerPos;
  const ph = G.playerHeading;
  const fx = Math.sin(ph), fz = Math.cos(ph);
  // v18.8: all staged vehicles on the road (dir +1: ahead is +z), each on
  // its own grid point. Old tangent placement pushed far cars off the
  // centreline (cop at (4.5,26) sat ~9.5 off-centre, half inside the brown
  // building left of the road) and cop/traffic slots sat 4-6 apart in the
  // same lane. Cops 10..22, traffic 26..66, bikes centre lane 30/44.
  const road0 = ROADS.ns[COVER_ROAD];
  const az = G.vehicle ? G.vehicle.pos.z : pp.z;
  const sports = G.traffic.cars.filter((c) => c.kind === 'sport' && c.color !== 0xffc21c);
  const others = G.traffic.cars.filter((c) => c.kind !== 'sport' || c.color === 0xffc21c);
  const slots = [[26, 4.5], [32, -4.5], [40, 4.5], [48, -4.5], [58, 4.5], [66, -4.5]];
  const held = [...sports, ...others].slice(0, slots.length);
  slots.forEach(([fwd, side], i) => { if (held[i]) roadPlace(held[i], road0, 1, az, fwd, side); });
  G.traffic.cars.forEach((c, i) => { if (!held.includes(c)) parkFar(c, i); });
  const cars = P.units.filter((u) => u.kind === 'car');
  const copSlots = [[-4.5, 10], [4.5, 16], [-4.5, 22]];
  cars.forEach((c, i) => {
    const [side, fwd] = copSlots[i % copSlots.length];
    roadPlace(c, road0, 1, az, fwd, side);
  });
  const pbikes = P.units.filter((u) => u.kind === 'bike');
  pbikes.forEach((b, i) => roadPlace(b, road0, 1, az, 36 + i * 16, 0));
  const bike = G.traffic.bikes[0];
  if (bike) roadPlace(bike, road0, 1, az, 30, 0);
  const bike2 = G.traffic.bikes[1];
  if (bike2) roadPlace(bike2, road0, 1, az, 44, 0);
  G.traffic.bikes.forEach((c, i) => { if (c !== bike && c !== bike2) parkFar(c, i); });
  if (P.heli) P.heli.group.position.set(pp.x + fx * 26, 24, pp.z + fz * 26);
}
export function installDebugApi(G) {
  window.__ember = {
    errors: [],
    ready: false,
    state() {
      const d = G.vehicle && G.vehicle.drift;
      return {
        mode: G.mode, money: G.money, wanted: G.police.wanted, health: Math.round(G.health),
        pos: [Math.round(G.playerPos.x), Math.round(G.playerPos.z)],
        heading: G.playerHeading, vehicle: G.vehicle ? (G.vehicle.vehicle ? G.vehicle.vehicle.kind : G.vehicle.kind) : null,
        vehicleName: G.vehicle ? G.vehicle.name : null,
        speed: G.vehicle ? Math.round(G.vehicle.speed) : Math.round(G.player.speed),
        mission: G.missions.active ? G.missions.active.def.name : null,
        missionsDone: [...G.missions.done], tapes: G.tapesFound,
        police: G.police.units.length, heli: !!G.police.heli,
        policeBikes: G.police.units.filter((u) => u.kind === 'bike').length,
        roadblock: !!G.police.roadblock, clock: G.clock,
        drift: d ? { active: d.active, angle: Math.round(d.angle), points: Math.round(d.points), combo: d.combo } : null,
        driftBanked: G.driftBanked || 0,
        ammo: G.ammo[G.weaponIdx] || null,
        mapOpen: !!G.mapOpen, crew: G.crew.length,
      };
    },
    start() { if (G.mode === 'menu') G.startGame(); return G.mode; },
    setWanted(n) { G.police.setWanted(n); return G.police.wanted; },
    teleport(x, z) { G.player.place(x, z, 0); if (G.vehicle) { G.exitVehicle(); G.player.place(x, z, 0); } return [G.playerPos.x, G.playerPos.z]; },
    enterNearestCar() { return G.tryEnterExit(); },
    mountBike() { return G.tryEnterExit(); },
    enterSport() {
      if (G.vehicle) G.exitVehicle();
      const v = makeCar(G, 'sport', 2);
      G.scene.add(v.group);
      const d = createDrive(G, v, {});
      d.place(G.playerPos.x, G.playerPos.z, G.playerHeading);
      d.speed = 0;
      G.enterVehicle(d);
      return d.name;
    },
    bikeNear() {
      let best = null; let bestD = 1e9;
      for (const b of G.traffic.bikes) {
        const d = Math.hypot(G.playerPos.x - b.pos.x, G.playerPos.z - b.pos.z);
        if (d < bestD) { bestD = d; best = b; }
      }
      if (!best) return null;
      if (G.vehicle) G.exitVehicle();
      G.player.place(best.pos.x + 3, best.pos.z, 0);
      return { dist: Math.round(bestD), pos: [Math.round(best.pos.x), Math.round(best.pos.z)] };
    },
    startMission() { return G.missions.startNext(); },
    startMissionId(id) { return G.missions.startId(id); },
    setClock(h) { G.setClock(h); return G.clock; },
    setSpeed(n) { if (G.vehicle) G.vehicle.speed = n; return G.vehicle ? G.vehicle.speed : null; },
    camPos() { return [Math.round(G.camera.position.x), Math.round(G.camera.position.y), Math.round(G.camera.position.z)]; },
    shoot() { return G.shoot(); },
    showMap(open) { G.hud.showMap(open); return G.mapOpen; },
    dumpCars() {
      const out = [];
      for (const c of G.traffic.cars) out.push({ src: 'traffic', kind: c.kind, color: c.color, pos: [Math.round(c.pos.x), Math.round(c.pos.z)], heading: +c.heading.toFixed(2) });
      for (const u of G.police.units) out.push({ src: 'police', kind: u.kind, pos: [Math.round(u.pos.x), Math.round(u.pos.z)], heading: +u.heading.toFixed(2) });
      if (G.police.roadblock) for (const c of G.police.roadblock.cars) out.push({ src: 'roadblock', pos: [Math.round(c.group.position.x), Math.round(c.group.position.z)], heading: +c.group.rotation.y.toFixed(2) });
      return out;
    },
    key(code, down) {
      window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
      return true;
    },
  };
  window.addEventListener('error', (e) => window.__ember.errors.push(String(e.message || e.error)));
  window.addEventListener('unhandledrejection', (e) => window.__ember.errors.push('rejection: ' + String(e.reason)));
}
