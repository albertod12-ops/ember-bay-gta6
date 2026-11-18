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
import { makeCar, makeBike, createDrive } from './vehicles.js';
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
    G.setClock(17.75);
    G.mode = 'menu';
    G.hud.setMenu(true);
    // fixed diagonal along the shoreline: ocean left, sand centre, palms right
    G.camOverride = { pos: [-480, 22, -120], look: [-650, 4, 120] };
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
      pos: [pt.x + rx * 6 - fx * 4, 2.8, pt.z + rz * 6 - fz * 4],
      look: [pt.x + fx * 11, 1.5, pt.z + fz * 11],
    };
  }
}

// Per-frame holds for staged shots: keep the staged vehicles in frame.
export function updateShot(G, dt) {
  if (!G.shot || G.shot === 'title' || G.shot === 'map') return;
  const P = G.police;
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
    holdTraffic(G.traffic.cars[0], 22, -12);
    holdTraffic(G.traffic.cars[1], 16, 13);
    const cars = P.units.filter((u) => u.kind === 'car');
    if (cars[0]) {
      cars[0].pos.set(pp.x - rx * 16 + fx * 26, 0, pp.z - rz * 16 + fz * 26);
      cars[0].heading = ph; cars[0].group.position.copy(cars[0].pos); cars[0].group.rotation.y = ph;
    }
    if (cars[1]) {
      cars[1].pos.set(pp.x + rx * 17 + fx * 30, 0, pp.z + rz * 17 + fz * 30);
      cars[1].heading = ph; cars[1].group.position.copy(cars[1].pos); cars[1].group.rotation.y = ph;
    }
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
  // Hold two traffic cars in frame so the street reads as alive.
  const holdTraffic = (car, fwd, side) => {
    if (!car) return;
    car.pos.set(pp.x + rx * side + fx * fwd, 0, pp.z + rz * side + fz * fwd);
    car.heading = ph;
    car.group.position.copy(car.pos);
    car.group.rotation.y = ph;
  };
  holdTraffic(G.traffic.cars[0], 22, -12);
  holdTraffic(G.traffic.cars[1], 16, 13);
  const cars = P.units.filter((u) => u.kind === 'car');
  if (cars[0]) {
    cars[0].pos.set(pp.x - rx * 15 + fx * 20, 0, pp.z - rz * 15 + fz * 20);
    cars[0].heading = ph; cars[0].group.position.copy(cars[0].pos); cars[0].group.rotation.y = ph;
  }
  if (cars[1]) {
    cars[1].pos.set(pp.x + rx * 15 + fx * 24, 0, pp.z + rz * 15 + fz * 24);
    cars[1].heading = ph; cars[1].group.position.copy(cars[1].pos); cars[1].group.rotation.y = ph;
  }
  const bike = G.traffic.bikes[0];
  if (bike) {
    bike.pos.set(pp.x + rx * 14, 0, pp.z + rz * 14 + fz * 32);
    bike.heading = ph; bike.group.position.copy(bike.pos); bike.group.rotation.y = ph;
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
    // Hold real keys down (keydown/keyup on window) — used by the drift test.
    key(code, down) {
      window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
      return true;
    },
  };
  window.addEventListener('error', (e) => window.__ember.errors.push(String(e.message || e.error)));
  window.addEventListener('unhandledrejection', (e) => window.__ember.errors.push('rejection: ' + String(e.reason)));
}
