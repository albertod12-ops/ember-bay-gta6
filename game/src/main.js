import * as THREE from 'three';
import { makeRng, hashStr } from './rng.js';
import { buildCity, districtAt, roadPoint, STANDING } from './city.js';
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
const SLOTS_KEY = 'ember-bay-v5-slots';
const ACTIVE_KEY = 'ember-bay-v5-active';
function loadSlots() {
  try {
    const raw = localStorage.getItem(SLOTS_KEY);
    if (raw) { const a = JSON.parse(raw); if (Array.isArray(a) && a.length === 3) return a; }
    const leg = localStorage.getItem(SAVE_KEY);
    if (leg) {
      const s = JSON.parse(leg);
      return [{ ...s, respect: 0, standing: null, clock: 19.8, savedAt: Date.now(), chapter: (s.missionsDone?.length || 0) + 1 }, null, null];
    }
  } catch {}
  return [null, null, null];
}
function loadActive(slots) {
  try {
    const a = Number(localStorage.getItem(ACTIVE_KEY));
    if (a >= 0 && a < 3 && slots[a]) return a;
  } catch {}
  let best = -1, bestT = -1;
  slots.forEach((s, i) => { if (s && (s.savedAt || 0) > bestT) { bestT = s.savedAt || 0; best = i; } });
  return best >= 0 ? best : 0;
}
const SLOTS = loadSlots();
const G_SLOT = loadActive(SLOTS);
function loadSave() { return SLOTS[G_SLOT] || null; }
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.classList.add('webgl');
document.getElementById('app').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x241a3e, 320, 1300);
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
  time: 0, clock: 19.8, day: 1,
  money: 500, health: 100, armour: 50, respect: 0,
  weaponIdx: 1, mode: 'menu',
  vehicle: null, parked: [], camOverride: null, shot: null,
  save: loadSave(),
  tapesFound: 0,
  driftBanked: 0,
  ammo: { 1: [12, 60], 2: [32, 160], 3: [30, 120], 4: [8, 24] },
  mapOpen: false, camClassic: false, soundOn: true,
  crew: [],
  slot: G_SLOT,
  standing: { ...STANDING, ...(loadSave()?.standing || {}) },
  stats: { carsStolen: 0, copsEscaped: 0, distanceDriven: 0, takenOut: 0, longestDrift: 0 },
  abilities: { hotTip: { cd: 0, max: 30 }, nitro: { cd: 0, max: 20 }, eyesOut: { cd: 0, max: 45 } },
  nitroT: 0, revealT: 0, tapeMark: null,
};
if (G.save) {
  G.money = G.save.money ?? 500; G.day = G.save.day ?? 1;
  G.respect = G.save.respect ?? 0; G.clock = G.save.clock ?? 19.8;
}
G.setClock = (h) => {
  G.clock = ((h % 24) + 24) % 24;
  const night = G.clock >= 19.5 || G.clock < 6;
  const sunset = !night && G.clock >= 16.5;
  if (night) {
    sun.position.set(300, 400, -200);
    sun.intensity = 0.35; sun.color.setHex(0x8aa0ff);
    hemi.intensity = 0.5;
    scene.fog.color.setHex(0x241a3e); scene.fog.near = 200; scene.fog.far = 1100;
    if (G.city?.sky) G.city.sky.material.color.setHex(0x4a2a6e);
  } else if (sunset) {
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
    SLOTS[G.slot] = {
      money: G.money, day: G.day,
      missionsDone: G.missions ? [...G.missions.done] : [],
      tapesFound: G.tapes ? [...G.tapes.found] : [],
      respect: G.respect, standing: { ...G.standing }, clock: G.clock,
      savedAt: Date.now(), chapter: (G.missions ? G.missions.done.size : 0) + 1,
    };
    localStorage.setItem(SLOTS_KEY, JSON.stringify(SLOTS));
    localStorage.setItem(ACTIVE_KEY, String(G.slot));
  } catch {}
};
G.slotInfo = () => SLOTS.map((s, i) => (s ? {
  slot: i, chapter: s.chapter || 1, money: s.money, day: s.day,
  missions: (s.missionsDone || []).length, clock: s.clock ?? 19.8, savedAt: s.savedAt || 0,
} : { slot: i, empty: true }));
// Rank on round(respect*13), max ~1300: FIXER/SHOT CALLER unreachable yet.
const RANKS = [[300, 'ROOKIE'], [750, 'RUNNER'], [1500, 'WHEELMAN'], [3000, 'FIXER'], [Infinity, 'SHOT CALLER']];
const WUNLOCK = [[260, 'SMG'], [520, 'RIFLE'], [780, 'SHOTGUN']];
G.rankInfo = () => {
  const disp = Math.round(G.respect * 13);
  let i = 0;
  while (disp >= RANKS[i][0]) i++;
  const nextW = WUNLOCK.find(([t]) => disp < t);
  return {
    lvl: 1 + Math.floor(G.respect / 20), name: RANKS[i][1], disp,
    next: RANKS[i][0] === Infinity ? null : RANKS[i][0],
    nextName: i + 1 < RANKS.length ? RANKS[i + 1][1] : null,
    unlock: nextW ? `${nextW[1]} at ${nextW[0]}` : 'all weapons unlocked',
  };
};
G.useAbility = (key) => {
  if (G.mode !== 'playing' || G.mapOpen) return false;
  const a = G.abilities[key];
  if (!a || a.cd > 0) return false;
  if (key === 'hotTip') {
    let best = null, bd = 1e9;
    for (const t of G.tapes.items) {
      const d = Math.hypot(t.x - G.playerPos.x, t.z - G.playerPos.z);
      if (d < bd) { bd = d; best = t; }
    }
    if (!best) { G.toast('No tapes left to find'); return false; }
    G.tapeMark = { x: best.x, z: best.z, t: 15 };
    a.cd = a.max;
    G.toast('MARA: nearest tape marked — 15s');
  } else if (key === 'nitro') {
    G.nitroT = 3;
    a.cd = a.max;
    G.toast('DEKE: nitro!');
  } else if (key === 'eyesOut') {
    G.police.setWanted(Math.max(0, G.police.wanted - 1));
    G.revealT = 10;
    a.cd = a.max;
    G.toast('ROSA: eyes out — heat down, cops marked 10s');
  }
  return true;
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
G.city = buildCity(G);
G.player = createPlayer(G);
G.scene.add(G.player.group);
const sp = roadPoint('ns', 3, -60);
G.player.place(sp.x, sp.z, sp.heading);
G.playerHeading = sp.heading;
G.playerPos = G.player.pos;
G.playerHeading = 0;
G.traffic = initTraffic(G);
G.police = initPolice(G);
G.missions = initMissions(G);
G.hud = initHud(G);
G.audio = initAudio(G);
G.tapes = initTapes(G);
G.driftFX = initDriftFX(G);
const PDEFS = [
  ['ns', 0, 120, 1], ['ns', 1, -200, -1], ['ns', 2, 300, 1], ['ns', 3, 150, -1],
  ['ns', 4, -80, 1], ['ns', 5, 220, -1], ['ew', 0, -100, 1], ['ew', 1, 260, -1],
  ['ew', 2, -300, 1], ['ew', 3, 80, -1], ['ew', 4, -180, 1], ['ns', 1, 60, 1],
];
const PKINDS = ['sport', 'muscle', 'taxi', 'pickup', 'wedge', 'van', 'boxy', 'stripe', 'sport', 'taxi', 'pickup', 'muscle'];
PDEFS.forEach(([axis, idx, along, dir], i) => {
  const pt = roadPoint(axis, idx, along, dir);
  const v = makeCar(G, PKINDS[i], i % 3);
  G.scene.add(v.group);
  const d = createDrive(G, v, {});
  const side = axis === 'ns' ? (dir > 0 ? 4.4 : -4.4) : 0;
  const sideZ = axis === 'ew' ? (dir > 0 ? -4.4 : 4.4) : 0;
  d.place(pt.x + (axis === 'ns' ? side : 0), pt.z + (axis === 'ew' ? sideZ : 0), pt.heading);
  d.owned = false;
  G.parked.push(d);
});
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
  G.traffic.cars = G.traffic.cars.filter((c) => c !== best);
  G.traffic.bikes = G.traffic.bikes.filter((b) => b !== best);
  G.parked = G.parked.filter((d) => d !== best);
  const stolen = !best.owned;
  const kind = best.vehicle ? best.vehicle.kind : best.kind;
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
    G.stats.carsStolen++;
    G.police.addHeat(1);
    G.toast(kind === 'bike' ? 'Stole a bike — 1 star!' : 'Stole a car — 1 star!');
  }
  return kind;
};
const WLOCK = [0, 0, 20, 40, 60];
const WMAG = [0, 12, 32, 30, 8];
const WNAME = ['FISTS', 'PISTOL', 'SMG', 'RIFLE', 'SHOTGUN'];
G.selectWeapon = (i) => {
  if (G.respect < WLOCK[i]) {
    G.toast(`${WNAME[i]} locked — reach respect ${WLOCK[i]} to unlock`);
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
  const need = WMAG[idx] - ammo[0];
  if (need <= 0) { G.toast('Magazine full'); return; }
  const take = Math.min(need, ammo[1]);
  if (take <= 0) { G.toast('No reserve ammo'); return; }
  ammo[0] += take; ammo[1] -= take;
  G.toast(`Reloaded ${WNAME[idx]} — ${ammo[0]}/${ammo[1]}`);
};
const flash = new THREE.PointLight(0xffe9a0, 0, 40);
scene.add(flash);
const tracerGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
const tracer = new THREE.Line(tracerGeo, new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0 }));
tracer.visible = false;
scene.add(tracer);
G._flash = { light: flash, tracer, t: 0 };
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
  flash.position.set(gx, 1.35, gz);
  flash.intensity = 80;
  const tp = tracer.geometry.attributes.position;
  tp.setXYZ(0, gx, 1.32, gz);
  tp.setXYZ(1, G.playerPos.x + fx * 50, 1.25, G.playerPos.z + fz * 50);
  tp.needsUpdate = true;
  tracer.material.opacity = 0.9;
  tracer.visible = true;
  G._flash.t = 0.12;
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
      G.stats.takenOut++;
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
  try {
    const slots = G.slotInfo();
    let target = slots.findIndex((s) => s.empty);
    if (target < 0) {
      let oldest = 0;
      slots.forEach((s, i) => { if ((s.savedAt || 0) < (slots[oldest].savedAt || 0)) oldest = i; });
      target = oldest;
    }
    SLOTS[target] = null;
    localStorage.setItem(SLOTS_KEY, JSON.stringify(SLOTS));
    localStorage.setItem(ACTIVE_KEY, String(target));
  } catch {}
  location.reload();
});
// Title-screen save slots: occupied loads that slot (reload + auto-start),
// empty starts a fresh game in it.
{
  const list = document.getElementById('slotList');
  const fmtClock = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
  G.slotInfo().forEach((s) => {
    const row = document.createElement('div');
    row.className = 'slotRow' + (s.empty ? ' empty' : '') + (s.slot === G.slot && !s.empty ? ' cur' : '');
    row.textContent = s.empty
      ? `SLOT ${s.slot + 1} · EMPTY`
      : `SLOT ${s.slot + 1} · Ch.${s.chapter} · $${s.money} · Day ${s.day} · ${s.missions}/8 missions · ${fmtClock(s.clock)}`;
    row.addEventListener('click', () => {
      try {
        localStorage.setItem(ACTIVE_KEY, String(s.slot));
        if (s.empty) {
          SLOTS[s.slot] = null;
          localStorage.setItem(SLOTS_KEY, JSON.stringify(SLOTS));
        }
        sessionStorage.setItem('ember-autostart', '1');
      } catch {}
      location.reload();
    });
    list.appendChild(row);
  });
}
document.getElementById('btnControls').addEventListener('click', () => {
  const h = document.getElementById('howto');
  h.classList.toggle('hidden');
});
document.getElementById('btnSettings').addEventListener('click', () => {
  const on = !G.soundOn;
  G.audio.setSound(on);
  document.getElementById('settingsState').textContent = on ? 'Sound: ON' : 'Sound: OFF';
});
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
  if (e.code === 'KeyZ') G.useAbility('hotTip');
  if (e.code === 'KeyX') G.useAbility('nitro');
  if (e.code === 'KeyC') G.useAbility('eyesOut');
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
const des = new THREE.Vector3();
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
  const isBike = G.vehicle && G.vehicle.vehicle && G.vehicle.vehicle.kind === 'bike';
  const dist = G.camClassic ? 16 : (G.vehicle ? (isBike ? 5.5 : 5.5) : 6.5);
  const height = G.camClassic ? 7 : (G.vehicle ? (isBike ? 2.2 : 2.2) : 2.6);
  des.set(pp.x - fx * dist, height, pp.z - fz * dist);
  camera.position.lerp(des, 1 - Math.pow(0.001, dt));
  camera.lookAt(pp.x + fx * 10, 1.8, pp.z + fz * 10);
  const top = G.vehicle ? G.vehicle.topSpeed : 0;
  const targetFov = 62 + (G.vehicle ? (Math.abs(G.vehicle.speed) / top) * 6 : 0);
  if (Math.abs(camera.fov - targetFov) > 0.05) {
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 4);
    camera.updateProjectionMatrix();
  }
}
const clk = new THREE.Clock();
let first = true;
function loop() {
  requestAnimationFrame(loop);
  const rawDt = clk.getDelta();
  const dt = Math.min(rawDt, 0.05);
  G.time += dt;
  if (G.city.wheel) G.city.wheel.rotation.x += dt * 0.06;
  G.clock += dt / 150;
  if (G.clock >= 24) { G.clock -= 24; G.day++; }
  const inp = input();
  if (G.mode === 'playing' && !G.mapOpen) {
    for (const a of Object.values(G.abilities)) if (a.cd > 0) a.cd = Math.max(0, a.cd - dt);
    if (G.tapeMark) { G.tapeMark.t -= dt; if (G.tapeMark.t <= 0) G.tapeMark = null; }
    if (G.revealT > 0) G.revealT -= dt;
    if (G.nitroT > 0) G.nitroT -= dt;
    if (G.vehicle) {
      const wantNitro = G.nitroT > 0;
      if (wantNitro && !G.vehicle._nitroOn) { G.vehicle._nitroOn = true; G.vehicle.topSpeed *= 1.4; }
      if (!wantNitro && G.vehicle._nitroOn) { G.vehicle._nitroOn = false; G.vehicle.topSpeed /= 1.4; }
      G.stats.distanceDriven += Math.abs(G.vehicle.speed) * dt;
    }
    if (G.vehicle) {
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
    if (G.police.wanted === 0 && G.health < 100) G.health = Math.min(100, G.health + dt * 1.5);
    updateShot(G, dt);
  }
  if (G.driftFX) G.driftFX.update(dt);
  if (G._flash && G._flash.t > 0) {
    G._flash.t -= dt;
    G._flash.light.intensity = Math.max(0, G._flash.t * 650);
    G._flash.tracer.material.opacity = Math.max(0, G._flash.t * 7);
    if (G._flash.t <= 0) { G._flash.light.intensity = 0; G._flash.tracer.visible = false; }
  }
  G.hud.update(dt);
  updateCamera(rawDt);
  renderer.render(scene, camera);
  if (first) {
    first = false;
    window.__emberReady = true;
    if (window.__ember) window.__ember.ready = true;
  }
}
installDebugApi(G);
G.setClock(G.clock);
if (shotName) stageShot(G, shotName);
else {
  try {
    if (sessionStorage.getItem('ember-autostart')) {
      sessionStorage.removeItem('ember-autostart');
      G.startGame();
    }
  } catch {}
}
loop();
