import * as THREE from 'three';
import { makeBike, wheel, fender } from './vehicles.js';
import { makePerson } from './people.js';

const CALLSIGNS = ['KESTREL-39', 'FALCON-12', 'VIPER-07', 'COBRA-21', 'HAVOC-55'];

function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: .45, metalness: .3, ...opts });
}
function box(w, h, d, material, x, y, z, parent, rx = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.rotation.x = rx;
  parent.add(m);
  return m;
}

export function makePoliceCar(G, variant = -1) {
  const g = new THREE.Group();
  const black = std(0x14161c);
  const white = std(0xf2f2f2, { roughness: .4, emissive: 0xbfc8d8, emissiveIntensity: .5 });
  const glass = std(0x14202e, { roughness: .12, metalness: .65 });
  const dark = std(0x1a1a1a, { roughness: .8 });
  const chrome = std(0xd8d8d8, { metalness: .5, roughness: .35, emissive: 0x555555, emissiveIntensity: .3 });
  const head = std(0xfff2b0, { emissive: 0xffe9a0, emissiveIntensity: 1.4 });
  const tailBar = std(0xd81a1a, { emissive: 0xaa0000, emissiveIntensity: 1.1 });
  const steel = std(0x888888, { metalness: .8, roughness: .3 });
  const orange = std(0xff7a1a, { emissive: 0xcc5500, emissiveIntensity: .8 });
  const wheels = [];
  const v = variant < 0 ? G.rng.int(0, 1) : variant;
  const P = [
[1.7,.42,5,0,.52,0,0],[2,.08,1.9,0,.76,1.5,0,.1],[1.95,.25,.8,0,.8,-2.1,0],[.06,.42,1.7,-1.08,.7,.1,1],[.06,.42,1.7,1.08,.7,.1,1],[.06,.55,1.7,-1.06,1.18,-.1,2],[.06,.55,1.7,1.06,1.18,-.1,2],[1.7,.12,4.6,0,.74,0,0],[2,.16,4.6,0,.26,0,3],[1.6,.25,.08,0,.55,2.52,4],[.6,.16,.08,-.7,.62,2.52,5],[.6,.16,.08,.7,.62,2.52,5],[.3,.12,.08,-.98,.55,2.52,8],[.3,.12,.08,.98,.55,2.52,8],[1.7,.28,.12,0,.48,2.5,4],[2,.16,.1,0,.32,2.52,4],[1.9,.18,.08,0,.7,-2.52,6],[1.9,.24,.28,0,.34,-2.38,4],[.065,.08,2.4,-.99,.5,.15,3],[.065,.08,2.4,.99,.5,.15,3],[.05,.05,.2,-1.06,.98,.55,3],[.05,.05,.2,1.06,.98,.55,3]];
  const M = [black, white, glass, dark, chrome, head, tailBar, steel, orange];
  for (const p of P) box(p[0], p[1], p[2], M[p[6]], p[3], p[4], p[5], g, p[7] || 0);
  const roofY = v === 0 ? 1.42 : 1.54;
  if (v === 0) {
    box(1.9, .06, 1.05, glass, 0, 1.12, .7, g, .68);
    box(1.8, .06, 1.1, glass, 0, 1.15, -1.45, g, -.59);
    box(2.2, .18, 1.4, white, 0, 1.36, -.3, g);
    for(const sx of[-1.12,1.12])for(const[dy,c]of[[.07,0xd83a2a],[0,0xf2f2f2],[-.07,0x2a6fd8]])box(.02,.06,.34,std(c),sx,.85+dy,1.15,g);
    box(1.5, .05, .05, chrome, 0, .6, 2.55, g);
  } else {
    box(1.9, .06, .95, glass, 0, 1.15, .78, g, .82);
    box(1.8, .06, .95, glass, 0, 1.18, -1.65, g, -.75);
    box(2.2, .18, 1.9, white, 0, 1.48, -.45, g);
    box(1.6, .04, .7, white, 0, .8, 1.6, g, .12);
    box(.04, .7, .04, chrome, .85, 1.5, -1.9, g);
  }
  for (const ex of [-.35, .35]) {
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .2, 8), chrome);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(ex, .42, -2.5);
    g.add(tip);
  }
  const red = box(.7, .22, .4, std(0xff2211, { emissive: 0xff2211, emissiveIntensity: 2 }), -.45, roofY + .13, -.2, g);
  const blue = box(.7, .22, .4, std(0x2244ff, { emissive: 0x2244ff, emissiveIntensity: 2 }), .45, roofY + .13, -.2, g);
  box(1.7, .1, .5, std(0x222222), 0, roofY + .03, -.2, g);
  box(1.6,.12,.08,dark,0,.5,2.62,g);box(.08,.35,.08,dark,-.55,.4,2.62,g);box(.08,.35,.08,dark,.55,.4,2.62,g);
  for (const [x, z] of [[-.91, 1.5], [.91, 1.5], [-.91, -1.5], [.91, -1.5]]) {
    const w = wheel(.38);
    w.position.set(x, .38, z);
    g.add(w);
    wheels.push(w);
    fender(g, x, z, .38, black);
  }
  for (const sx of [-1.11, 1.11]) {
    box(.02, .42, .03, dark, sx, .72, .3, g);
    box(.02, .42, .03, dark, sx, .72, -.9, g);
  }
  for (const gx of [-.3, 0, .3]) box(.07, .1, .03, chrome, gx, .5, 2.46, g);
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = false;
    }
  });
  return { group: g, red, blue, wheels };
}

export function makePolicePed(G, female = false) {
  // Uniformed officer on the CJ body: navy uniform + peaked cap + badge.
  return makePerson(G, {
    skin: 0xc98d64, shirt: female ? 0x8ab4d8 : 0x1a2a4a, shirt2: null,
    pants: 0x1a2a4a, shoes: 0x111111, hair: 0x14141c, hairStyle: 'cap',
    hat: 0x1a2a4a, badge: true, h: female ? 1.7 : 1.84,
    build: female ? .95 : 1.08, sleeves: female ? 0 : 1,
  });
}

export function makeHeli(G) {
  const g = new THREE.Group();
  const body = std(0x1c2733, { roughness: .4, metalness: .4 });
  box(2.4, 1.8, 4.4, body, 0, 0, 0, g);
  box(1.8, 1.1, 1.2, std(0x9fd4e8, { roughness: .1, metalness: .5 }), 0, .1, 2.4, g);
  box(1.0, .9, 5.2, body, 0, .3, -4.2, g);
  const fin = box(.3, 1.6, 1.2, std(0xd8a03c), 0, 1.0, -6.6, g);
  const tailRotor = new THREE.Group();
  const tr1 = box(.12, 2.4, .12, std(0x222222), 0, 0, 0, tailRotor);
  const tr2 = box(.12, .12, 2.4, std(0x222222), 0, 0, 0, tailRotor);
  tailRotor.position.set(.25, .9, -6.6);
  g.add(tailRotor);
  const rotor = new THREE.Group();
  const b1 = box(.3, .08, 11, std(0x222222), 0, 0, 0, rotor);
  const b2 = box(11, .08, .3, std(0x222222), 0, 0, 0, rotor);
  rotor.position.y = 1.25;
  g.add(rotor);
  for (const x of [-1.1, 1.1]) {
    box(.14, .14, 4.6, std(0x888888, { metalness: .8 }), x, -1.25, 0, g);
    box(.12, .9, .12, std(0x888888, { metalness: .8 }), x, -.85, 1.2, g);
    box(.12, .9, .12, std(0x888888, { metalness: .8 }), x, -.85, -1.2, g);
  }
  const spot = new THREE.SpotLight(0xfff2b0, 900, 160, .32, .45, 1.2);
  spot.position.set(0, -1, 1.6);
  g.add(spot);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(5, 42, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: .10, side: THREE.DoubleSide, depthWrite: false }),
  );
  return { group: g, rotor, tailRotor, spot, cone };
}

export function initPolice(G) {
  const { scene } = G;
  const P = {
    wanted: 0,
    evading: 0,
    inSight: false,
    units: [],
    heli: null,
    roadblock: null,
    unseenTimer: 0,
    flashT: 0,
    setWanted(n) {
      if (n === 0 && P.wanted > 0 && G.stats) G.stats.copsEscaped++;
      P.wanted = Math.max(0, Math.min(5, Math.round(n)));
      if (P.wanted === 0) {
        P.evading = 0;
        P.clearUnits();
      }
    },
    addHeat(n) { P.setWanted(P.wanted + n); },
    clearUnits() {
      for (const u of P.units) scene.remove(u.group);
      P.units = [];
      P.removeHeli();
      if (P.roadblock) {
        for (const c of P.roadblock.cars) scene.remove(c.group);
        P.roadblock = null;
      }
    },
    removeHeli() {
      if (!P.heli) return;
      scene.remove(P.heli.group);
      scene.remove(P.heli.cone);
      scene.remove(P.heli.spot.target);
      P.heli = null;
    },
    spawnCar(callsign) {
      const v = makePoliceCar(G);
      const a = G.rng.range(0, Math.PI * 2);
      const x = G.playerPos.x + Math.sin(a) * 90;
      const z = G.playerPos.z + Math.cos(a) * 90;
      v.group.position.set(Math.max(-450, Math.min(450, x)), 0, Math.max(-450, Math.min(450, z)));
      scene.add(v.group);
      P.units.push({ kind: 'car', ...v, pos: v.group.position, heading: 0, speed: 0, callsign, cruise: 30 });
    },
    spawnBike(callsign) {
      const v = makeBike(G, 0x14161c);
      const a = G.rng.range(0, Math.PI * 2);
      v.group.position.set(G.playerPos.x + Math.sin(a) * 80, 0, G.playerPos.z + Math.cos(a) * 80);
      scene.add(v.group);
      P.units.push({ kind: 'bike', ...v, pos: v.group.position, heading: 0, speed: 0, callsign, cruise: 40 });
    },
    spawnHeli() {
      P.heli = makeHeli(G);
      P.heli.group.position.set(G.playerPos.x + 30, 26, G.playerPos.z - 20);
      scene.add(P.heli.group);
      scene.add(P.heli.cone);
      scene.add(P.heli.spot.target);
    },
    placeRoadblock() {
      const heading = G.playerHeading;
      const cx = G.playerPos.x + Math.sin(heading) * 70;
      const cz = G.playerPos.z + Math.cos(heading) * 70;
      const cars = [];
      for (let i = -1; i <= 1; i += 2) {
        const v = makePoliceCar(G);
        const px = cx + Math.cos(heading) * i * 6;
        const pz = cz - Math.sin(heading) * i * 6;
        v.group.position.set(px, 0, pz);
        v.group.rotation.y = heading + Math.PI / 2;
        scene.add(v.group);
        cars.push(v);
      }
      P.roadblock = { cars, pos: new THREE.Vector3(cx, 0, cz), placedAt: G.time };
    },
    ebpd() {
      const rows = [];
      for (const u of P.units) {
        const d = Math.round(u.pos.distanceTo(G.playerPos));
        let status = 'PURSUIT';
        if (d < 10) status = 'RAMMING';
        else if (d > 110) status = 'SEARCHING';
        rows.push({ callsign: u.callsign, dist: d, status });
      }
      if (P.heli) {
        rows.push({ callsign: 'KESTREL-AIR', dist: Math.round(P.heli.group.position.distanceTo(G.playerPos)), status: 'OVERHEAD' });
      }
      if (P.wanted >= 4) {
        rows.push({ callsign: 'ROADBLOCK', dist: P.roadblock ? Math.round(P.roadblock.pos.distanceTo(G.playerPos)) : 0, status: 'BLOCKING' });
      }
      return rows;
    },
    update(dt) {
      if (P.wanted === 0) return;
      const wantCars = Math.min(P.wanted, 3) + (P.wanted >= 4 ? 1 : 0);
      const cars = P.units.filter((u) => u.kind === 'car').length;
      const bikes = P.units.filter((u) => u.kind === 'bike').length;
      if (cars < wantCars) P.spawnCar(CALLSIGNS[P.units.length % CALLSIGNS.length]);
      if (P.wanted >= 2 && bikes < 1) P.spawnBike(CALLSIGNS[(P.units.length + 1) % CALLSIGNS.length]);
      if (P.wanted >= 3 && !P.heli) P.spawnHeli();
      if (P.wanted >= 4 && !P.roadblock) P.placeRoadblock();
      if (P.wanted < 4 && P.roadblock) {
        for (const c of P.roadblock.cars) scene.remove(c.group);
        P.roadblock = null;
      }
      if (P.wanted < 3 && P.heli) P.removeHeli();

      P.flashT += dt;
      const flash = Math.sin(P.flashT * 14) > 0;
      let nearest = 1e9;
      for (const u of P.units) {
        const dx = G.playerPos.x - u.pos.x, dz = G.playerPos.z - u.pos.z;
        const d = Math.hypot(dx, dz);
        nearest = Math.min(nearest, d);
        const targetHeading = Math.atan2(dx, dz);
        let dh = targetHeading - u.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        u.heading += dh * Math.min(1, dt * 2.2);
        const want = d > 12 ? u.cruise : u.cruise * .55;
        u.speed += (want - u.speed) * Math.min(1, dt * 1.5);
        u.pos.x += Math.sin(u.heading) * u.speed * dt;
        u.pos.z += Math.cos(u.heading) * u.speed * dt;
        u.group.position.copy(u.pos);
        u.group.rotation.y = u.heading;
        if (u.kind === 'bike') u.group.rotation.z = -dh * .2;
        if (u.red) {
          u.red.material.emissiveIntensity = flash ? 2.4 : .25;
          u.blue.material.emissiveIntensity = flash ? .25 : 2.4;
        }
        if (d < 7) {
          G.damage(4 * dt * 10, 'ram');
          if (G.vehicle) G.vehicle.speed *= Math.max(0, 1 - dt * 1.5);
        }
      }
      if (P.heli) {
        const h = P.heli;
        const t = G.time * .45;
        const hx = G.playerPos.x + Math.sin(t) * 32;
        const hz = G.playerPos.z + Math.cos(t) * 32;
        h.group.position.set(hx, 26 + Math.sin(t * .7) * 2, hz);
        h.group.rotation.y = Math.atan2(G.playerPos.x - hx, G.playerPos.z - hz);
        h.rotor.rotation.y += dt * 22;
        h.tailRotor.rotation.x += dt * 30;
        h.spot.target.position.copy(G.playerPos);
        h.spot.target.updateMatrixWorld();
        const hp = h.group.position;
        const dir = new THREE.Vector3(G.playerPos.x - hp.x, -hp.y, G.playerPos.z - hp.z);
        const len = dir.length();
        dir.normalize();
        h.cone.position.set(hp.x + dir.x * len / 2, hp.y + dir.y * len / 2, hp.z + dir.z * len / 2);
        h.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
        h.cone.scale.set(1, len / 42, 1);
      }
      if (P.roadblock && P.roadblock.pos.distanceTo(G.playerPos) > 140) {
        for (const c of P.roadblock.cars) scene.remove(c.group);
        P.roadblock = null;
      }
      P.inSight = P.wanted > 0 && nearest < 60;
      if (nearest > 60) {
        P.evading = Math.min(100, P.evading + dt * 9);
        P.unseenTimer += dt;
        if (P.unseenTimer > 25) {
          P.setWanted(P.wanted - 1);
          P.unseenTimer = 0;
          P.evading = 0;
        }
      } else {
        P.evading = Math.max(0, P.evading - dt * 30);
        P.unseenTimer = 0;
      }
    },
  };
  return P;
}
