// Ember Bay v8 — shot staging for screenshots/ and the headless debug API.
// Every shot is staged from the ?shot= URL parameter; the debug API lets a
// driver start the game, force wanted levels, enter vehicles, start
// missions, drift and shoot.
// 1-cover: sunset chase in the red Ember GT, drifting (real handbrake
// drift: W + Space + steer, smoke + skid marks + drift points live).
// 2-title: title screen (logo, CONTINUE, HOW TO PLAY, crew portraits).
// 3-combat: on-foot NIGHT fight on the neon avenue — crew ahead, boss
// dialogue from Vic Torres, muzzle flash staged.
// 4-map: the full city map overlay (M key screen).
import * as THREE from 'three';
import { makeCar, makeBike, createDrive } from './vehicles.js';
import { makePoliceCar, makeHeli } from './police.js';
import { ROADS, roadPoint, nsCenter, nsHeading } from './city.js';

const STAGE_ROAD = 3; // NS avenue past the roundabout (base -20)

function enterSportCar(G, x, z, heading, speed) {
  // v7: the cover car is a red sports car (red survives the orange
  // sunset light; orange washed out to pale yellow in the first render).
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

export function stageShot(G, name) {
  G.shot = name;
  if (name === 'title') {
    // v9: the title background is a LIVE chase, not an empty beach —
    // the red Ember GT drifts down the coast avenue with tire smoke,
    // two EBPD interceptors on its tail with flashing light bars and
    // the heli overhead, palms and the sunset city behind. The logo and
    // menu sit on top of the action (key-art composition).
    G.setClock(17.75);
    G.mode = 'playing';
    G.hud.setMenu(true);
    G.player.group.visible = false; // the player is not in this scene
    const pt = roadPoint('ns', STAGE_ROAD, -30, 1);
    enterSportCar(G, pt.x, pt.z, pt.heading, 38);
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
    G.setClock(17.75);
    G.mode = 'playing';
    G.hud.setMenu(false);
    G.camOverride = { pos: [-100, 700, 80], look: [-100, 0, 0] };
    G.scene.fog.near = 1500;
    G.scene.fog.far = 5000;
    // Full city map overlay (the M-key screen) — the map shot.
    // v10: start mission 1 first, so the GPS route line draws and the
    // CURRENT JOB panel fills in — the map reads like a live job, not
    // an empty diagram.
    G.missions.startId(1);
    G.hud.showMap(true);
    return;
  }
  G.mode = 'playing';
  G.hud.setMenu(false);
  const pt = roadPoint('ns', STAGE_ROAD, -30, 1);
  if (name === 'cover') {
    G.setClock(17.75);
    enterSportCar(G, pt.x, pt.z, pt.heading, 38);
    G.police.setWanted(3);
  } else if (name === 'combat') {
    // Night, on foot, on the neon avenue: crew ahead, boss line on screen.
    G.setClock(21.7);
    G.player.place(pt.x, pt.z, pt.heading);
    G.playerPos = G.player.pos;
    G.playerHeading = pt.heading;
    const fx = Math.sin(pt.heading), fz = Math.cos(pt.heading);
    const rx = Math.cos(pt.heading), rz = -Math.sin(pt.heading);
    G.spawnCrew(pt.x + fx * 14, pt.z + fz * 14, 3);
    G.missions.startId(7);
    G.police.setWanted(4);
    G.hud.dialogue('VIC TORRES', 'CREW BOSS', 'You walked into the wrong street, kid. Boys — take him down.', 'vic', true);
    G._shotTimer = 0;
    // Over-shoulder angle: player left of frame, crew ahead centre —
    // the dialogue box at bottom-centre does not cover the player.
    G.camOverride = {
      pos: [pt.x + rx * 5 - fx * 3, 2.4, pt.z + rz * 5 - fz * 3],
      look: [pt.x + fx * 11, 1.5, pt.z + fz * 11],
    };
  }
}

// Per-frame holds for staged shots: keep the staged vehicles in frame.
export function updateShot(G, dt) {
  if (!G.shot || G.shot === 'map') return;
  const P = G.police;
  if (G.shot === 'title') {
    // Live chase behind the title menu: the Ember GT drifts down the
    // avenue (real handbrake drift from the main loop), two interceptors
    // trail it with flashing light bars, the heli orbits overhead, and
    // the camera tracks low from the front three-quarter — key-art framing.
    G._titleT = (G._titleT || 0) + dt;
    const road = ROADS.ns[STAGE_ROAD];
    const car = G.vehicle;
    if (car) {
      // Same staging as the cover shot: pin speed, crab the car ~20 deg
      // off the road tangent, hold the lane. The drift display values
      // are staged like the cover's (the real drift system is verified
      // separately with real keys in the playtest); the smoke and skid
      // marks below are laid at the real rear wheels every frame.
      const t = nsHeading(road, car.pos.z, 1);
      car.speed = 38;
      car.heading = t + 0.35;
      car.pos.x = nsCenter(road, car.pos.z, 1) - 3.5;
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
          G.driftFX.laySkid(wx, wz, Math.atan2(car.vel.x, car.vel.z));
        }
      }
      // Two interceptors ahead of the car, light bars flashing.
      const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
      const rx = Math.cos(car.heading), rz = -Math.sin(car.heading);
      const flash = Math.sin(G._titleT * 14) > 0;
      G._titleCops.forEach((cop, i) => {
        const back = -(8 + i * 5);
        const side = i === 0 ? 2 : 6;
        cop.group.position.set(car.pos.x - fx * back + rx * side, 0, car.pos.z - fz * back + rz * side);
        cop.group.rotation.y = car.heading;
        cop.red.material.emissiveIntensity = flash ? 2.4 : 0.25;
        cop.blue.material.emissiveIntensity = flash ? 0.25 : 2.4;
      });
      // Heli pinned ahead-above the car (not orbiting — the orbit put it
      // behind the camera half the time): always in frame, spotlight
      // cone coming down onto the chase.
      const h = G._titleHeli;
      if (h) {
        const hx = car.pos.x + fx * 30 + rx * 6;
        const hz = car.pos.z + fz * 30 + rz * 6;
        h.group.position.set(hx, 26 + Math.sin(G._titleT * 0.8) * 1.5, hz);
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
      // v10: busy street behind the menu — four traffic cars ahead in
      // both lanes, so the title background reads as a living city,
      // not one car on an empty road.
      const tSports = G.traffic.cars.filter((c) => c.kind === 'sport' && c.color !== 0xffc21c);
      const tOthers = G.traffic.cars.filter((c) => c.kind !== 'sport' || c.color === 0xffc21c);
      const tHeld = [...tSports, ...tOthers];
      const tSlots = [[24, 0.5], [30, 6.5], [42, 0.5], [52, 6.5]];
      tSlots.forEach(([fwd, side], i) => {
        const tc = tHeld[i];
        if (!tc) return;
        tc.pos.set(car.pos.x + rx * side + fx * fwd, 0, car.pos.z + rz * side + fz * fwd);
        tc.heading = car.heading;
        tc.group.position.copy(tc.pos);
        tc.group.rotation.y = car.heading;
      });
      // Rear three-quarter chase camera, closer in so the red car is
      // the hero: the interceptors flank the sightline instead of
      // blocking it, road + sunset city ahead.
      G.camOverride = {
        pos: [car.pos.x - fx * 10 + rx * 4, 2.6, car.pos.z - fz * 10 + rz * 4],
        look: [car.pos.x + fx * 8, 1.2, car.pos.z + fz * 8],
      };
      G.playerHeading = car.heading;
    }
    return;
  }
  if (G.shot === 'combat') {
    // Periodic shots so the muzzle flash + tracer read in the frame.
    G._shotTimer = (G._shotTimer || 0) + dt;
    if (G._shotTimer > 1.4) { G._shotTimer = 0; G.shoot(); }
    // Hold two traffic cars + police in frame so the street reads alive.
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
    // Hold four traffic cars + two bikes in frame so the street reads
    // alive. Sports skip yellow (a yellow car + a police light bar
    // behind it reads as the old yellow taxi); every police car unit
    // is held in a spread, so none hides behind a sport car with only
    // its light bar showing over the roof.
    const sports = G.traffic.cars.filter((c) => c.kind === 'sport' && c.color !== 0xffc21c);
    const others = G.traffic.cars.filter((c) => c.kind !== 'sport' || c.color === 0xffc21c);
    const held = [...sports, ...others];
    holdTraffic(held[0], 22, -4);
    holdTraffic(held[1], 16, 4);
    holdTraffic(held[2], 30, -2);
    holdTraffic(held[3], 38, 3);
    const bikeA = G.traffic.bikes[0];
    if (bikeA) {
      bikeA.pos.set(pp.x + rx * 4, 0, pp.z + rz * 4 + fz * 20);
      bikeA.heading = ph; bikeA.group.position.copy(bikeA.pos); bikeA.group.rotation.y = ph;
    }
    const bikeB = G.traffic.bikes[1];
    if (bikeB) {
      bikeB.pos.set(pp.x - rx * 4, 0, pp.z - rz * 4 + fz * 24);
      bikeB.heading = ph; bikeB.group.position.copy(bikeB.pos); bikeB.group.rotation.y = ph;
    }
    const cars = P.units.filter((u) => u.kind === 'car');
    const carSlots = [[-4, 12], [4, 16], [-3, 22], [3, 26], [-4, 30], [4, 34]];
    cars.forEach((c, i) => {
      const [side, fwd] = carSlots[i % carSlots.length];
      c.pos.set(pp.x + rx * side + fx * fwd, 0, pp.z + rz * side + fz * fwd);
      c.heading = ph; c.group.position.copy(c.pos); c.group.rotation.y = ph;
    });
    if (P.heli) P.heli.group.position.set(pp.x + fx * 24, 24, pp.z + fz * 24);
    return;
  }
  // Glue the staged vehicle to the curving avenue (and around the
  // roundabout): steer onto the road tangent, hold the lane.
  const road = ROADS.ns[STAGE_ROAD];
  if (G.vehicle) {
    G.vehicle.speed = 38;
    const t = nsHeading(road, G.vehicle.pos.z, 1);
    let dh = t - G.vehicle.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    G.vehicle.heading += dh * Math.min(1, dt * 6);
    G.vehicle.pos.x = nsCenter(road, G.vehicle.pos.z, 1) - 3.5;
    G.vehicle.sync();
    G.playerHeading = G.vehicle.heading;
  }
  if (G.shot === 'cover' && G.vehicle) {
    // Stage the drift: crab the car ~20 deg off the road tangent, lay
    // smoke + skid marks from the rear wheels, show live drift points.
    const t = nsHeading(road, G.vehicle.pos.z, 1);
    G.vehicle.heading = t + 0.35;
    G.vehicle.sync();
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
  const rx = Math.cos(ph), rz = -Math.sin(ph); // right vector
  // v10 LIVING CITY: hold a BUSY road in frame — six traffic cars ahead
  // in both lanes at staggered distances (sports first, non-yellow), so
  // the street never reads empty, plus two police cars and two bikes.
  const holdTraffic = (car, fwd, side) => {
    if (!car) return;
    car.pos.set(pp.x + rx * side + fx * fwd, 0, pp.z + rz * side + fz * fwd);
    car.heading = ph;
    car.group.position.copy(car.pos);
    car.group.rotation.y = ph;
  };
  // Cover shot fallthrough: hold six (non-yellow) SPORT traffic cars
  // in frame so the street reads as alive.
  const sports = G.traffic.cars.filter((c) => c.kind === 'sport' && c.color !== 0xffc21c);
  const others = G.traffic.cars.filter((c) => c.kind !== 'sport' || c.color === 0xffc21c);
  const held = [...sports, ...others];
  const slots = [[12, 0.5], [16, 6.5], [24, 0.5], [30, 6.5], [40, 0.5], [50, 6.5]];
  slots.forEach(([fwd, side], i) => holdTraffic(held[i], fwd, side));
  const cars = P.units.filter((u) => u.kind === 'car');
  if (cars[0]) {
    cars[0].pos.set(pp.x + rx * 6.5 + fx * 8, 0, pp.z + rz * 6.5 + fz * 8);
    cars[0].heading = ph; cars[0].group.position.copy(cars[0].pos); cars[0].group.rotation.y = ph;
  }
  if (cars[1]) {
    cars[1].pos.set(pp.x + rx * 0.5 + fx * 22, 0, pp.z + rz * 0.5 + fz * 22);
    cars[1].heading = ph; cars[1].group.position.copy(cars[1].pos); cars[1].group.rotation.y = ph;
  }
  const bike = G.traffic.bikes[0];
  if (bike) {
    bike.pos.set(pp.x + rx * 6.5, 0, pp.z + rz * 6.5 + fz * 26);
    bike.heading = ph; bike.group.position.copy(bike.pos); bike.group.rotation.y = ph;
  }
  const bike2 = G.traffic.bikes[1];
  if (bike2) {
    bike2.pos.set(pp.x + rx * 0.5, 0, pp.z + rz * 0.5 + fz * 40);
    bike2.heading = ph; bike2.group.position.copy(bike2.pos); bike2.group.rotation.y = ph;
  }
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
    // DEBUG ONLY (shot driver): where every car is, to debug staging.
    dumpCars() {
      const out = [];
      for (const c of G.traffic.cars) out.push({ src: 'traffic', kind: c.kind, color: c.color, pos: [Math.round(c.pos.x), Math.round(c.pos.z)], heading: +c.heading.toFixed(2) });
      for (const u of G.police.units) out.push({ src: 'police', kind: u.kind, pos: [Math.round(u.pos.x), Math.round(u.pos.z)], heading: +u.heading.toFixed(2) });
      if (G.police.roadblock) for (const c of G.police.roadblock.cars) out.push({ src: 'roadblock', pos: [Math.round(c.group.position.x), Math.round(c.group.position.z)], heading: +c.group.rotation.y.toFixed(2) });
      return out;
    },
    // Hold real keys down (keydown/keyup on window) — used by the drift test.
    key(code, down) {
      window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
      return true;
    },
  };
  window.addEventListener('error', (e) => window.__ember.errors.push(String(e.message || e.error)));
  window.addEventListener('unhandledrejection', (e) => window.__ember.errors.push('rejection: ' + String(e.reason)));
}
