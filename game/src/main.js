// Ember Bay v5 — recorded re-apply under R7; behaviour unchanged
// Ember Bay — open-world crime game. Boot, game loop, camera, input, save.
// Built fresh for the gta6-01 bounty: Three.js open world, 14 districts,
// 8 story missions, wanted level with police + helicopter, motorbikes.
import * as THREE from 'three';
import { makeRng, hashStr } from './rng.js';
import { buildCity, districtAt, roadPoint } from './city.js';
import { createPlayer } from './player.js';
import { makeCar, makeBike, createDrive } from './vehicles.js';
import { initTraffic } from './traffic.js';
import { initPolice } from './police.js';
import { initMissions } from './missions.js';
import { initHud } from './hud.js';
import { initAudio } from './audio.js';
import { initTapes } from './collectibles.js';
import { initDriftFX } from './drift.js';
import { makePerson } from './people.js';
import { stageShot, updateShot, installDebugApi } from './shots.js';

const params = new URLSearchParams(location.search);
const seed = parseInt(params.get('seed') || '1', 10) || 1;
const shotName = params.get('shot');
const rng = makeRng((seed ^ hashStr('ember-bay')) >>> 0);

const SAVE_KEY = 'ember-bay-v5';
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.classList.add('webgl');
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe07a45, 320, 1300);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 4000);

const hemi = new THREE.HemisphereLight(0xffd9a0, 0x4a3a55, 0.7);
const sun = new THREE.DirectionalLight(0xff8a3d, 1.9);
sun.position.set(-850, 130, 320);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -420; sun.shadow.camera.right = 420;
sun.shadow.camera.top = 420; sun.shadow.camera.bottom = -420;
sun.shadow.camera.near = 10; sun.shadow.camera.far = 2600;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.5;
scene.add(hemi, sun, sun.target);

const G = {
  scene, camera, renderer, rng, seed,
  time: 0, clock: 17.75, day: 1,
  money: 500, health: 100, armour: 50, respect: 0,
  weaponIdx: 1, mode: 'menu',
  vehicle: null, parked: [], camOverride: null, shot: null,
  save: loadSave(),
  tapesFound: 0,
  driftBanked: 0,
  // mag / reserve ammo per weapon (index 1-4; fists need none)
  ammo: { 1: [12, 60], 2: [32, 160], 3: [30, 120], 4: [8, 24] },
  mapOpen: false, camClassic: false, soundOn: true,
  crew: [], // hostile crew NPCs (combat staging / boss fights)
};
if (G.save) {
  G.money = G.save.money ?? 500;
  G.day = G.save.day ?? 1;
}

G.setClock = (h) => {
  G.clock = ((h % 24) + 24) % 24;
  const night = G.clock >= 19.5 || G.clock < 6;
  const sunset = !night && G.clock >= 16.5;
  if (night) {
    sun.position.set(300, 400, -200);
    sun.intensity = 0.35; sun.color.setHex(0x8aa0ff);
    hemi.intensity = 0.35;
    scene.fog.color.setHex(0x14142e); scene.fog.near = 200; scene.fog.far = 900;
    if (G.city?.sky) G.city.sky.material.color.setHex(0x35355e);
  } else if (sunset) {
    // Golden hour: low warm sun in the west, long shadows, warm haze.
    sun.position.set(-850, 130, 320);
    sun.intensity = 1.9; sun.color.setHex(0xff8a3d);
    hemi.intensity = 0.7;
    scene.fog.color.setHex(0xe07a45); scene.fog.near = 320; scene.fog.far = 1300;
    if (G.city?.sky) G.city.sky.material.color.setHex(0xffffff);
  } else {
    sun.position.set(-400, 500, 250);
    sun.intensity = 1.4; sun.color.setHex(0xfff0c0);
    hemi.intensity = 0.9;
    scene.fog.color.setHex(0xcfd8e8); scene.fog.near = 420; scene.fog.far = 1500;
    if (G.city?.sky) G.city.sky.material.color.setHex(0xffffff);
  }
};

G.toast = (t) => { if (G.hud) G.hud.toast(t); };
G.saveGame = () => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: G.money, day: G.day,
      missionsDone: G.missions ? [...G.missions.done] : [],
      tapesFound: G.tapes ? [...G.tapes.found] : [],
    }));
  } catch { /* storage unavailable — play on without saving */ }
};
G.damage = (amount, cause) => {
  const absorbed = Math.min(G.armour, amount * 0.6);
  G.armour -= absorbed;
  G.health -= (amount - absorbed);
  if (G.vehicle) G.vehicle.condition = Math.max(0, G.vehicle.condition - amount * 0.4);
  if (G.health <= 0) {
    G.health = 100; G.armour = 50;
    G.money = Math.max(0, G.money - 100);
    G.police.setWanted(0);
    if (G.vehicle) G.exitVehicle();
    G.player.place(0, 40, 0);
    G.toast('BUSTED — you woke up at the clinic, -$100');
  }
};

// Build the world.
G.city = buildCity(G);
G.player = createPlayer(G);
G.scene.add(G.player.group);
const startPt = roadPoint('ns', 3, -60);
G.player.place(startPt.x, startPt.z, startPt.heading);
G.playerHeading = startPt.heading;
G.playerPos = G.player.pos;
G.playerHeading = 0;
G.traffic = initTraffic(G);
G.police = initPolice(G);
G.missions = initMissions(G);
G.hud = initHud(G);
G.audio = initAudio(G);
G.tapes = initTapes(G);
G.driftFX = initDriftFX(G);

// Parked cars along the roads, ready to steal — each on a real road.
const PARKED_DEFS = [
  ['ns', 0, 120, 1], ['ns', 1, -200, -1], ['ns', 2, 300, 1], ['ns', 3, 150, -1],
  ['ns', 4, -80, 1], ['ns', 5, 220, -1], ['ew', 0, -100, 1], ['ew', 1, 260, -1],
  ['ew', 2, -300, 1], ['ew', 3, 80, -1], ['ew', 4, -180, 1], ['ns', 1, 60, 1],
];
const PARKED_KINDS = ['sport', 'sport', 'taxi', 'pickup', 'sport', 'van', 'sport', 'sport', 'sport', 'taxi', 'pickup', 'sport'];
PARKED_DEFS.forEach(([axis, idx, along, dir], i) => {
  const pt = roadPoint(axis, idx, along, dir);
  const v = makeCar(G, PARKED_KINDS[i], i % 3);
  G.scene.add(v.group);
  const d = createDrive(G, v, {});
  // park on the right-hand side of the road
  const side = axis === 'ns' ? (dir > 0 ? 5.5 : -5.5) : 0;
  const sideZ = axis === 'ew' ? (dir > 0 ? -5.5 : 5.5) : 0;
  d.place(pt.x + (axis === 'ns' ? side : 0), pt.z + (axis === 'ew' ? sideZ : 0), pt.heading);
  d.owned = false;
  G.parked.push(d);
});
// One yellow sports car parked on the Sunset Diagonal.
{
  const v = makeCar(G, 'sport', 1);
  G.scene.add(v.group);
  const d = createDrive(G, v, {});
  d.place(-138, 8, Math.PI * 3 / 4);
  d.owned = false;
  G.parked.push(d);
}

G.enterVehicle = (drive) => {
  if (G.vehicle) return false;
  G.vehicle = drive;
  G.player.group.visible = false;
  G.playerPos = drive.pos;
  return true;
};
G.exitVehicle = () => {
  const d = G.vehicle;
  if (!d) return false;
  d.speed = 0;
  const side = d.pos.clone();
  side.x += Math.cos(d.heading) * 3.5;
  side.z -= Math.sin(d.heading) * 3.5;
  G.player.group.visible = true;
  G.player.place(side.x, side.z, d.heading);
  G.playerPos = G.player.pos;
  d.owned = true;
  if (!G.parked.includes(d)) G.parked.push(d);
  G.vehicle = null;
  return true;
};
G.tryEnterExit = () => {
  if (G.vehicle) { G.exitVehicle(); return 'exited'; }
  const pp = G.playerPos;
  let best = null; let bestD = 7;
  const consider = (d) => {
    const dist = Math.hypot(pp.x - d.pos.x, pp.z - d.pos.z);
    if (dist < bestD) { bestD = dist; best = d; }
  };
  for (const d of G.parked) consider(d);
  for (const c of G.traffic.cars) consider(c);
  for (const b of G.traffic.bikes) consider(b);
  if (!best) return 'nothing near';
  // pull a traffic vehicle out of circulation
  G.traffic.cars = G.traffic.cars.filter((c) => c !== best);
  G.traffic.bikes = G.traffic.bikes.filter((b) => b !== best);
  G.parked = G.parked.filter((d) => d !== best);
  const stolen = !best.owned;
  // kind lives at best.vehicle.kind for drive controllers and at best.kind
  // for plain traffic vehicles.
  const kind = best.vehicle ? best.vehicle.kind : best.kind;
  // Parked cars are already drive controllers; traffic cars/bikes are plain
  // vehicle objects, so wrap them in a drive controller first — the game
  // loop calls .update on whatever the player is driving.
  let drive = best;
  if (typeof best.update !== 'function') {
    drive = createDrive(G, best, {});
    drive.pos.copy(best.pos);
    drive.heading = best.heading;
    drive.speed = best.speed || 0;
    drive.owned = best.owned || false;
  }
  G.enterVehicle(drive);
  if (stolen) {
    best.owned = true;
    G.police.addHeat(1);
    G.toast(kind === 'bike' ? 'Stole a bike — 1 star!' : 'Stole a car — 1 star!');
  }
  return kind;
};

// Weapon lock thresholds (respect) — mirrors the HUD weapon list.
const WEAPON_LOCKS = [0, 0, 20, 40, 60];
const WEAPON_MAGS = [0, 12, 32, 30, 8];
const WEAPON_NAMES = ['FISTS', 'PISTOL', 'SMG', 'RIFLE', 'SHOTGUN'];

G.selectWeapon = (i) => {
  if (G.respect < WEAPON_LOCKS[i]) {
    G.toast(`${WEAPON_NAMES[i]} locked — reach respect ${WEAPON_LOCKS[i]} to unlock`);
    return false;
  }
  G.weaponIdx = i;
  return true;
};
G.interact = () => {
  if (G.mapOpen) { G.toggleMap(); return; }
  if (G.missions.active) { G.toast('Mission running: ' + G.missions.active.def.name); return; }
  G.missions.startNext();
};
G.toggleMap = () => {
  if (G.mode !== 'playing') return;
  G.hud.showMap(!G.mapOpen);
};
G.reload = () => {
  const idx = G.weaponIdx;
  if (idx === 0 || G.vehicle) return;
  const ammo = G.ammo[idx];
  if (!ammo) return;
  const need = WEAPON_MAGS[idx] - ammo[0];
  if (need <= 0) { G.toast('Magazine full'); return; }
  const take = Math.min(need, ammo[1]);
  if (take <= 0) { G.toast('No reserve ammo'); return; }
  ammo[0] += take; ammo[1] -= take;
  G.toast(`Reloaded ${WEAPON_NAMES[idx]} — ${ammo[0]}/${ammo[1]}`);
};

// Muzzle flash + tracer, created once and reused.
const flashLight = new THREE.PointLight(0xffe9a0, 0, 40);
scene.add(flashLight);
const tracerGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
const tracer = new THREE.Line(tracerGeo, new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0 }));
tracer.visible = false;
scene.add(tracer);
G._flash = { light: flashLight, tracer, t: 0 };

// Hostile crew NPCs — v9: real figures via makePerson (red shirts, caps,
// varied skin/hair), ~1.8 m like the player instead of 2.5 m boxes.
G.spawnCrew = (x, z, count = 3) => {
  const skins = [0xd9a066, 0xb07a4a, 0xe8b98a];
  const hairs = [0x14141c, 0x3a2a1a, 0x8a8a8a];
  for (let i = 0; i < count; i++) {
    const fig = makePerson(G, {
      skin: skins[i % skins.length], shirt: 0xc22a2a, shirt2: 0x222831,
      pants: 0x222831, shoes: 0x222222, hair: hairs[i % hairs.length],
      hairStyle: 'cap', hat: 0x14161c, jacket: null,
    });
    const g = fig.group;
    const px = x + (i - (count - 1) / 2) * 4;
    const pz = z + (i % 2) * 3;
    g.position.set(px, 0, pz);
    g.rotation.y = Math.PI;
    scene.add(g);
    G.crew.push({ group: g, pos: new THREE.Vector3(px, 0, pz), down: false });
  }
  return G.crew.length;
};
G.clearCrew = () => {
  for (const c of G.crew) scene.remove(c.group);
  G.crew = [];
};

// Shooting on foot: click fires the selected weapon — muzzle flash,
// tracer, ammo, and a hit check against crew NPCs.
G.shoot = () => {
  if (G.mode !== 'playing' || G.vehicle || G.mapOpen) return false;
  const idx = G.weaponIdx;
  if (idx === 0) { G.toast('Fists only — pick a weapon (1-5)'); return false; }
  const ammo = G.ammo[idx];
  if (!ammo || ammo[0] <= 0) { G.toast('Empty — press R to reload'); return false; }
  ammo[0]--;
  const h = G.playerHeading;
  const fx = Math.sin(h), fz = Math.cos(h);
  const gx = G.playerPos.x + fx * 1.4, gz = G.playerPos.z + fz * 1.4;
  flashLight.position.set(gx, 1.35, gz);
  flashLight.intensity = 80;
  const tp = tracer.geometry.attributes.position;
  tp.setXYZ(0, gx, 1.32, gz);
  tp.setXYZ(1, G.playerPos.x + fx * 50, 1.25, G.playerPos.z + fz * 50);
  tp.needsUpdate = true;
  tracer.material.opacity = 0.9;
  tracer.visible = true;
  G._flash.t = 0.12;
  // hit check: crew within 40 m and within 2 m of the shot line
  for (const c of G.crew) {
    if (c.down) continue;
    const dx = c.pos.x - G.playerPos.x, dz = c.pos.z - G.playerPos.z;
    const along = dx * fx + dz * fz;
    if (along < 0 || along > 40) continue;
    const lat = Math.abs(dx * fz - dz * fx);
    if (lat < 2) {
      c.down = true;
      c.group.rotation.x = -Math.PI / 2;
      c.group.position.y = 0.4;
      G.respect = Math.min(100, G.respect + 2);
      G.toast('Crew down! +2 respect');
    }
  }
  return true;
};

G.startGame = () => {
  G.mode = 'playing';
  G.camOverride = null;
  G.hud.setMenu(false);
  G.audio.start();
  if (!G.save) G.hud.banner('EMBER BAY', 'PRESS E TO START A MISSION');
  const btn = document.getElementById('btnContinue');
  if (G.save) {
    btn.classList.remove('hidden');
    document.getElementById('contDay').textContent = G.day;
    document.getElementById('contMoney').textContent = G.money;
    document.getElementById('contChapter').textContent = (G.missions.done.size + 1);
  }
};
if (G.save) {
  const btn = document.getElementById('btnContinue');
  btn.classList.remove('hidden');
  document.getElementById('contDay').textContent = G.day;
  document.getElementById('contMoney').textContent = G.money;
  document.getElementById('contChapter').textContent = (G.missions.done.size + 1);
}
document.getElementById('btnStart').addEventListener('click', () => G.startGame());
document.getElementById('btnContinue').addEventListener('click', () => G.startGame());
document.getElementById('btnNew').addEventListener('click', () => {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  location.reload();
});
document.getElementById('btnControls').addEventListener('click', () => {
  const h = document.getElementById('howto');
  h.classList.toggle('hidden');
});
document.getElementById('btnSettings').addEventListener('click', () => {
  const on = !G.soundOn;
  G.audio.setSound(on);
  document.getElementById('settingsState').textContent = on ? 'Sound: ON' : 'Sound: OFF';
});

// Input.
const keys = new Set();
const input = () => ({
  f: keys.has('KeyW') || keys.has('ArrowUp'),
  b: keys.has('KeyS') || keys.has('ArrowDown'),
  l: keys.has('KeyA') || keys.has('ArrowLeft'),
  r: keys.has('KeyD') || keys.has('ArrowRight'),
  brake: keys.has('Space'),
  run: keys.has('ShiftLeft') || keys.has('ShiftRight'),
});
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === 'KeyF') G.tryEnterExit();
  if (e.code === 'KeyE') G.interact();
  if (e.code === 'KeyM') G.toggleMap();
  if (e.code === 'KeyR') G.reload();
  if (e.code === 'KeyQ') G.audio.prevStation();
  if (e.code === 'KeyV') { G.camClassic = !G.camClassic; G.toast(G.camClassic ? 'Classic camera' : 'Chase camera'); }
  if (e.code === 'Escape' && G.mapOpen) G.toggleMap();
  if (e.code === 'Enter' && G.mode === 'menu') G.startGame();
  if (e.code.startsWith('Digit')) {
    const n = Number(e.code.slice(5));
    if (n >= 1 && n <= 5) G.selectWeapon(n - 1);
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('mousedown', (e) => {
  if (e.button === 0 && G.mode === 'playing' && !G.mapOpen) G.shoot();
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Camera. The lerp uses REAL frame time (rawDt), not the clamped game dt:
// at 1 fps in a headless renderer the clamped dt would leave the camera
// stranded far from the player for seconds; real time converges in ~0.5 s
// at any frame rate, and is identical at 60 fps.
const desired = new THREE.Vector3();
function updateCamera(dt) {
  if (G.camOverride) {
    camera.position.set(...G.camOverride.pos);
    camera.lookAt(...G.camOverride.look);
    return;
  }
  const pp = G.playerPos;
  if (G.mode === 'menu') {
    const a = G.time * 0.05;
    camera.position.set(-420 + Math.cos(a) * 110, 55, Math.sin(a) * 110);
    camera.lookAt(-750, 2, 0);
    if (Math.abs(camera.fov - 58) > 0.1) { camera.fov = 58; camera.updateProjectionMatrix(); }
    return;
  }
  const h = G.playerHeading;
  const fx = Math.sin(h), fz = Math.cos(h);
  // Bikes are narrow, so the chase camera sits closer on a bike than in a
  // car — the rider reads big in frame instead of a speck. V toggles the
  // classic far camera.
  const isBike = G.vehicle && G.vehicle.vehicle && G.vehicle.vehicle.kind === 'bike';
  const dist = G.camClassic ? 16 : (G.vehicle ? (isBike ? 5.5 : 8) : 6.5);
  const height = G.camClassic ? 7 : (G.vehicle ? (isBike ? 2.2 : 2.8) : 2.6);
  desired.set(pp.x - fx * dist, height, pp.z - fz * dist);
  camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
  camera.lookAt(pp.x + fx * 10, 1.8, pp.z + fz * 10);
  const top = G.vehicle ? G.vehicle.topSpeed : 0;
  const targetFov = 62 + (G.vehicle ? (Math.abs(G.vehicle.speed) / top) * 12 : 0);
  if (Math.abs(camera.fov - targetFov) > 0.05) {
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 4);
    camera.updateProjectionMatrix();
  }
}

// Main loop.
const clockT = new THREE.Clock();
let firstFrame = true;
function loop() {
  requestAnimationFrame(loop);
  const rawDt = clockT.getDelta();
  const dt = Math.min(rawDt, 0.05);
  G.time += dt;
  G.clock += dt / 150;
  if (G.clock >= 24) { G.clock -= 24; G.day++; }
  const inp = input();
  if (G.mode === 'playing' && !G.mapOpen) {
    if (G.vehicle) {
      // Cover / title shots: stage a real handbrake drift (W + Space + steer).
      const inp2 = (G.shot === 'cover' || G.shot === 'title') ? { ...inp, f: true, brake: true, l: true } : inp;
      G.vehicle.update(dt, inp2);
      G.playerHeading = G.vehicle.heading;
    } else {
      const camYaw = Math.atan2(G.playerPos.x - camera.position.x, G.playerPos.z - camera.position.z);
      G.player.update(dt, inp, camYaw);
      G.playerHeading = G.player.heading;
    }
    G.traffic.update(dt, G.time);
    G.police.update(dt);
    G.missions.update(dt);
    G.tapes.update(dt);
    G.audio.update(dt);
    // slow health regen when clean
    if (G.police.wanted === 0 && G.health < 100) G.health = Math.min(100, G.health + dt * 1.5);
    updateShot(G, dt);
  }
  if (G.driftFX) G.driftFX.update(dt);
  // muzzle flash + tracer decay
  if (G._flash && G._flash.t > 0) {
    G._flash.t -= dt;
    G._flash.light.intensity = Math.max(0, G._flash.t * 650);
    G._flash.tracer.material.opacity = Math.max(0, G._flash.t * 7);
    if (G._flash.t <= 0) { G._flash.light.intensity = 0; G._flash.tracer.visible = false; }
  }
  G.hud.update(dt);
  updateCamera(rawDt);
  renderer.render(scene, camera);
  if (firstFrame) {
    firstFrame = false;
    window.__emberReady = true;
    if (window.__ember) window.__ember.ready = true;
  }
}

installDebugApi(G);
G.setClock(G.clock);
if (shotName) stageShot(G, shotName);
loop();
