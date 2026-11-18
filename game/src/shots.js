// Shot staging for screenshots/ and the headless debug API. A shot is
// staged from the ?shot= URL parameter; the debug API lets a driver start
// the game, force wanted levels, enter vehicles and start missions.
import { makeCar, makeBike, createDrive } from './vehicles.js';

function enterLowrider(G, x, z, heading, speed) {
  const v = makeCar(G, 'lowrider', 0);
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
    G.setClock(18.5);
    G.mode = 'menu';
    G.hud.setMenu(true);
    // fixed diagonal along the shoreline: ocean left, sand centre, palms right
    G.camOverride = { pos: [-480, 22, -120], look: [-650, 4, 120] };
    return;
  }
  G.mode = 'playing';
  G.hud.setMenu(false);
  if (name === 'cover') {
    G.setClock(18.5);
    enterLowrider(G, 0, 60, 0, 38);
    G.police.setWanted(3);
  } else if (name === 'combat') {
    G.setClock(23.2);
    enterBike(G, 0, 60, 0, 40);
    G.police.setWanted(4);
  } else if (name === 'map') {
    G.setClock(14);
    G.camOverride = { pos: [-100, 850, 80], look: [-100, 0, 0] };
    G.scene.fog.far = 3200;
    G.hud.banner('EMBER BAY', '14 DISTRICTS · 8 STORY JOBS · TAPES 0/20', true);
  }
}

// Per-frame holds for staged shots: keep the staged vehicles in frame.
export function updateShot(G, dt) {
  if (!G.shot || G.shot === 'title' || G.shot === 'map') return;
  const P = G.police;
  const pp = G.playerPos;
  const ph = G.playerHeading;
  const fx = Math.sin(ph), fz = Math.cos(ph);
  const rx = Math.cos(ph), rz = -Math.sin(ph); // right vector
  if (G.shot === 'cover') {
    if (G.vehicle) G.vehicle.speed = 38;
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
  } else if (G.shot === 'combat') {
    if (G.vehicle) G.vehicle.speed = 40;
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
  }
}

export function installDebugApi(G) {
  window.__ember = {
    errors: [],
    ready: false,
    state() {
      return {
        mode: G.mode, money: G.money, wanted: G.police.wanted, health: Math.round(G.health),
        pos: [Math.round(G.playerPos.x), Math.round(G.playerPos.z)],
        heading: G.playerHeading, vehicle: G.vehicle ? (G.vehicle.vehicle ? G.vehicle.vehicle.kind : G.vehicle.kind) : null,
        speed: G.vehicle ? Math.round(G.vehicle.speed) : Math.round(G.player.speed),
        mission: G.missions.active ? G.missions.active.def.name : null,
        missionsDone: [...G.missions.done], tapes: G.tapesFound,
        police: G.police.units.length, heli: !!G.police.heli,
        policeBikes: G.police.units.filter((u) => u.kind === 'bike').length,
        roadblock: !!G.police.roadblock, clock: G.clock,
      };
    },
    start() { if (G.mode === 'menu') G.startGame(); return G.mode; },
    setWanted(n) { G.police.setWanted(n); return G.police.wanted; },
    teleport(x, z) { G.player.place(x, z, 0); if (G.vehicle) { G.exitVehicle(); G.player.place(x, z, 0); } return [G.playerPos.x, G.playerPos.z]; },
    enterNearestCar() { return G.tryEnterExit(); },
    mountBike() { return G.tryEnterExit(); },
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
    setClock(h) { G.setClock(h); return G.clock; },
  };
  window.addEventListener('error', (e) => window.__ember.errors.push(String(e.message || e.error)));
  window.addEventListener('unhandledrejection', (e) => window.__ember.errors.push('rejection: ' + String(e.reason)));
}
