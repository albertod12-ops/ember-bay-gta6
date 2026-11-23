import * as THREE from 'three';
import { makeCar, makeBike, createDrive } from './vehicles.js';
import { makePoliceCar, makeHeli } from './police.js';
import { ROADS, roadPoint, nsCenter, nsHeading, ewCenter, ewHeading } from './city.js';
const STAGE_ROAD = 3;
const COVER_ROAD = 3; // downtown: dense towers + billboards read better than the coastal road (ns[0] was tried — flat wall, sparse chase)
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
  if (name === 'title') {
    G.setClock(19.8);
    G.mode = 'playing';
    G.hud.setMenu(true);
    G.player.group.visible = false;
    const pt = roadPoint('ns', STAGE_ROAD, -30, 1);
    enterSport(G, pt.x, pt.z, pt.heading, 38);
    G._titleCops = [];
    for (let i = 0; i < 2; i++) {
      const cop = makePoliceCar(G);
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
  const pt = roadPoint('ns', G.shot === 'cover' ? COVER_ROAD : STAGE_ROAD, -30, 1);
  if (name === 'cover') {
    G.setClock(19.8);
    enterSport(G, pt.x, pt.z, pt.heading, 38);
    G.missions.startId(5);
    G.hud.dialogue('MARA VOSS', 'FIXER', 'Three stars and counting. Stay hot for 45 seconds and they\'ll know your name.', 'mara', true);
  } else if (name === 'combat') {
    G.setClock(21.7);
    const cpt = roadPoint('ns', STAGE_ROAD, -30, -1);
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
    G.camOverride = {
      pos: [cpt.x - fx * 1.7 - rx * 2.0, 1.75, cpt.z - fz * 1.7 - rz * 2.0],
      look: [cpt.x + fx * 8, 1.2, cpt.z + fz * 8],
    };
  }
}
export function updateShot(G, dt) {
  if (!G.shot || G.shot === 'map') return;
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
        const back = -(4 + i * 3);
        const side = i === 0 ? 2 : -2;
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
      const tHeld = [...tSports, ...tOthers];
      const tSlots = [[16, 0.5], [22, 4.5], [32, 0.5], [42, 4.5]];
      tSlots.forEach(([fwd, side], i) => {
        const tc = tHeld[i];
        if (!tc) return;
        tc.pos.set(car.pos.x + rx * side + fx * fwd, 0, car.pos.z + rz * side + fz * fwd);
        tc.heading = car.heading;
        tc.group.position.copy(tc.pos);
        tc.group.rotation.y = car.heading;
      });
      G.traffic.cars.forEach((c, i) => { if (!tHeld.includes(c)) parkFar(c, i); });
      G.traffic.bikes.forEach((c, i) => parkFar(c, i));
      G.camOverride = {
        pos: [car.pos.x - fx * 10 + rx * 1.2, 3.2, car.pos.z - fz * 10 + rz * 1.2],
        look: [car.pos.x + fx * 8, 1.6, car.pos.z + fz * 8],
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
    const holdTraffic = (car, fwd, side) => {
      if (!car) return;
      car.pos.set(pp.x + rx * side + fx * fwd, 0, pp.z + rz * side + fz * fwd);
      car.heading = ph;
      car.group.position.copy(car.pos);
      car.group.rotation.y = ph;
    };
    const sports = G.traffic.cars.filter((c) => c.kind === 'sport' && c.color !== 0xffc21c);
    const others = G.traffic.cars.filter((c) => c.kind !== 'sport' || c.color === 0xffc21c);
    const held = [...sports, ...others];
    holdTraffic(held[0], 18, -4);
    holdTraffic(held[1], 14, 4);
    holdTraffic(held[2], 24, -2);
    holdTraffic(held[3], 30, 3);
    G.traffic.cars.forEach((c, i) => { if (!held.includes(c)) parkFar(c, i); });
    const bikeA = G.traffic.bikes[0];
    if (bikeA) {
      bikeA.pos.set(pp.x + rx * 4, 0, pp.z + rz * 4 + fz * 18);
      bikeA.heading = ph; bikeA.group.position.copy(bikeA.pos); bikeA.group.rotation.y = ph;
    }
    const bikeB = G.traffic.bikes[1];
    if (bikeB) {
      bikeB.pos.set(pp.x - rx * 4, 0, pp.z - rz * 4 + fz * 22);
      bikeB.heading = ph; bikeB.group.position.copy(bikeB.pos); bikeB.group.rotation.y = ph;
    }
    G.traffic.bikes.forEach((c, i) => { if (c !== bikeA && c !== bikeB) parkFar(c, i); });
    const cars = P.units.filter((u) => u.kind === 'car');
    const carSlots = [[-3, 9], [4, 14], [-3, 20], [3, 24], [-4, 28], [4, 32]];
    cars.forEach((c, i) => {
      const [side, fwd] = carSlots[i % carSlots.length];
      c.pos.set(pp.x + rx * side + fx * fwd, 0, pp.z + rz * side + fz * fwd);
      c.heading = ph; c.group.position.copy(c.pos); c.group.rotation.y = ph;
    });
    const pb = P.units.find((u) => u.kind === 'bike');
    if (pb) { pb.pos.set(pp.x - rx * 6 + fx * 18, 0, pp.z - rz * 6 + fz * 18); pb.heading = ph; pb.group.position.copy(pb.pos); pb.group.rotation.y = ph; }
    if (P.heli) P.heli.group.position.set(pp.x + fx * 24, 24, pp.z + fz * 24);
    return;
  }
  const road = ROADS.ns[G.shot === 'cover' ? COVER_ROAD : STAGE_ROAD];
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
  const rx = Math.cos(ph), rz = -Math.sin(ph);
  const holdTraffic = (car, fwd, side) => {
    if (!car) return;
    car.pos.set(pp.x + rx * side + fx * fwd, 0, pp.z + rz * side + fz * fwd);
    car.heading = ph;
    car.group.position.copy(car.pos);
    car.group.rotation.y = ph;
  };
  const sports = G.traffic.cars.filter((c) => c.kind === 'sport' && c.color !== 0xffc21c);
  const others = G.traffic.cars.filter((c) => c.kind !== 'sport' || c.color === 0xffc21c);
  const held = [...sports, ...others];
  const slots = [[18, 4.5], [24, -4.5], [32, 4.5], [40, -4.5], [50, 4.5], [60, -4.5]];
  slots.forEach(([fwd, side], i) => holdTraffic(held[i], fwd, side));
  G.traffic.cars.forEach((c, i) => { if (!held.includes(c)) parkFar(c, i); });
  const cars = P.units.filter((u) => u.kind === 'car');
  const copSlots = [[4.5, 14], [-4.5, 20], [4.5, 26]];
  cars.forEach((c, i) => {
    const [side, fwd] = copSlots[i % copSlots.length];
    c.pos.set(pp.x + rx * side + fx * fwd, 0, pp.z + rz * side + fz * fwd);
    c.heading = ph; c.group.position.copy(c.pos); c.group.rotation.y = ph;
  });
  const pbikes = P.units.filter((u) => u.kind === 'bike');
  pbikes.forEach((b, i) => {
    const side = i % 2 === 0 ? 4.5 : -4.5;
    const fwd = 32 + i * 6;
    b.pos.set(pp.x + rx * side + fx * fwd, 0, pp.z + rz * side + fz * fwd);
    b.heading = ph; b.group.position.copy(b.pos); b.group.rotation.y = ph;
  });
  const bike = G.traffic.bikes[0];
  if (bike) {
    bike.pos.set(pp.x + rx * -3.5, 0, pp.z + rz * -3.5 + fz * 30);
    bike.heading = ph; bike.group.position.copy(bike.pos); bike.group.rotation.y = ph;
  }
  const bike2 = G.traffic.bikes[1];
  if (bike2) {
    bike2.pos.set(pp.x + rx * 3.5, 0, pp.z + rz * 3.5 + fz * 38);
    bike2.heading = ph; bike2.group.position.copy(bike2.pos); bike2.group.rotation.y = ph;
  }
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
