import * as THREE from 'three';

export const CAR_TOP_SPEED = 38;
export const BIKE_TOP_SPEED = 52;

const CAR_COLORS = {
  sedan: [0x2a6fd8, 0xd83a2a, 0xcccccc, 0x222831],
  sport: [0xff6a00, 0xffc21c, 0xd8e021, 0x2fd05a, 0x2a6fd8],
  muscle: [0xff7a1a, 0x2a6fd8, 0xd83a2a, 0xcccccc],
  wedge: [0xff6a00, 0xf2f2f2, 0xe02030],
  boxy: [0xe02030, 0x2a6fd8, 0x222831],
  stripe: [0xffc21c, 0xff6a00, 0x2fd05a],
  taxi: [0xffc21c],
  van: [0x8a97a8, 0x5a6a7a, 0xffffff],
  pickup: [0x7a4a2a, 0x2a7a4a, 0x9a2a2a],
  truck: [0x3a6a8a, 0x8a8a8a],
  lowrider: [0x35d05a, 0xae2f7a, 0x2f7aae],
};

export const CAR_NAMES = {
  sport: 'Ultima GTR', sedan: 'Marina S', taxi: 'Bay Cab', van: 'Harbor Van',
  pickup: 'Dune Pickup', truck: 'Crate Hauler', lowrider: 'Sunset Low', bike: 'Ember GP',
  muscle: 'Sunset Muscle', wedge: 'Ember Wedge', boxy: 'Craneside GT', stripe: 'Stripe GT',
};

function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.35, ...opts });
}
function box(w, h, d, material, x, y, z, parent, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}
function limb(ax, ay, az, bx, by, bz, r, material, parent, seg = 6) {
  const a = new THREE.Vector3(ax, ay, az);
  const b = new THREE.Vector3(bx, by, bz);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), material);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  parent.add(m);
  return m;
}
function parts(g, L, M) {
  for (const p of L) box(p[0], p[1], p[2], M[p[6]], p[3], p[4], p[5], g, p[7] || 0, 0, 0);
}

export function wheel(r = 0.42) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.3, 16), std(0x141414, { roughness: 0.92, metalness: 0 }));
  tire.rotation.z = Math.PI / 2;
  g.add(tire);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.68, r * 0.68, 0.32, 12), std(0xd8d8d8, { metalness: 0.5, roughness: 0.3, emissive: 0x666666, emissiveIntensity: 0.35 }));
  rim.rotation.z = Math.PI / 2;
  g.add(rim);
  const spokeMat = std(0x8a8a8a, { metalness: 0.8, roughness: 0.35 });
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.34, r * 0.55, 0.07), spokeMat);
    const a = (i / 5) * Math.PI * 2;
    s.position.set(0, Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
    s.rotation.x = -a;
    g.add(s);
  }
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.4, r * 0.4, 0.34, 12), std(0x666666, { metalness: 0.7, roughness: 0.4 }));
  disc.rotation.z = Math.PI / 2;
  g.add(disc);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.14, r * 0.14, 0.36, 8), std(0x222222, { metalness: 0.6, roughness: 0.4 }));
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  return g;
}

export function arch(g, x, y, z, r = 0.55, m) {
  const a = new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 6, 12, Math.PI), m || std(0x141414, { roughness: 0.9 }));
  a.rotation.y = Math.PI / 2;
  a.position.set(x, y, z);
  g.add(a);
  return a;
}

function lamps(g, frontZ, rearZ, y = 0.85) {
  const lamp = std(0xfff2b0, { emissive: 0xffe9a0, emissiveIntensity: 1.2 });
  box(0.55, 0.16, 0.1, lamp, -0.68, y, frontZ, g, 0, -0.2, 0);
  box(0.55, 0.16, 0.1, lamp, 0.68, y, frontZ, g, 0, 0.2, 0);
  const tail = std(0xd81a1a, { emissive: 0xaa0000, emissiveIntensity: 0.9 });
  box(0.6, 0.16, 0.1, tail, -0.65, y + 0.04, rearZ, g, 0, 0.12, 0);
  box(0.6, 0.16, 0.1, tail, 0.65, y + 0.04, rearZ, g, 0, -0.12, 0);
}

export function sportWheel(r = 0.46, caliperColor = 0xffc21c) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.32, 18), std(0x141414, { roughness: 0.92, metalness: 0 }));
  tire.rotation.z = Math.PI / 2;
  g.add(tire);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.68, r * 0.68, 0.34, 14), std(0x999999, { metalness: 0.55, roughness: 0.3, emissive: 0x555555, emissiveIntensity: 0.3 }));
  rim.rotation.z = Math.PI / 2;
  g.add(rim);
  const spokeMat = std(0x888888, { metalness: 0.6, roughness: 0.3 });
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.36, r * 0.6, 0.06), spokeMat);
    const a = (i / 7) * Math.PI * 2;
    s.position.set(0, Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32);
    s.rotation.x = -a;
    g.add(s);
  }
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.36, 14), std(0xaaaaaa, { metalness: 0.6, roughness: 0.35 }));
  disc.rotation.z = Math.PI / 2;
  g.add(disc);
  const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.1), std(caliperColor, { metalness: 0.4, roughness: 0.4 }));
  caliper.position.set(0, r * 0.3, 0);
  g.add(caliper);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.12, r * 0.12, 0.38, 8), std(0x111111, { metalness: 0.6, roughness: 0.4 }));
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  return g;
}

export function makeCar(G, kind, colorIdx = 0) {
  const g = new THREE.Group();
  const color = (CAR_COLORS[kind] || CAR_COLORS.sedan)[colorIdx % (CAR_COLORS[kind] || []).length];
  const paint = std(color, { roughness: 0.3, metalness: 0.55 });
  const glass = std(0x14202e, { roughness: 0.12, metalness: 0.65 });
  const dark = std(0x1a1a1a, { roughness: 0.8, metalness: 0.1 });
  const chrome = std(0xd8d8d8, { metalness: 0.5, roughness: 0.35, emissive: 0x555555, emissiveIntensity: 0.3 });
  const head = std(0xfff2b0, { emissive: 0xffe9a0, emissiveIntensity: 1.4 });
  const tail = std(0xd81a1a, { emissive: 0xaa0000, emissiveIntensity: 1.1 });
  const wht = std(0xf2f2f2);
  const addSW = (x, z, r = 0.46) => {
    const w = sportWheel(r, 0xffc21c);
    w.position.set(x, r, z);
    g.add(w);
    wheels.push(w);
  };
  const wheels = [];
  const addWheel = (x, z, r = 0.42) => {
    const w = wheel(r);
    w.position.set(x, r, z);
    g.add(w);
    wheels.push(w);
  };
  const mirror = (x, z) => {
    box(0.05, 0.05, 0.22, dark, x * 1.0, 1.04, z, g);
    box(0.14, 0.1, 0.2, dark, x * 1.08, 1.08, z, g);
  };
  if (kind === 'truck') {
    box(2.4, 1.5, 2.0, paint, 0, 1.25, 2.7, g);
    box(2.3, 0.9, 1.1, glass, 0, 2.35, 2.9, g, 0.18, 0, 0);
    box(2.35, 0.5, 1.9, paint, 0, 2.9, 2.55, g);
    box(1.6, 0.5, 0.1, dark, 0, 0.85, 3.72, g);
    box(2.4, 0.4, 0.3, dark, 0, 0.45, 3.68, g);
    box(2.5, 2.6, 5.2, std(0xd8d8d8, { roughness: 0.6, metalness: 0.2 }), 0, 1.9, -1.6, g);
    mirror(-1, 3.1);
    mirror(1, 3.1);
    addWheel(-1.15, 2.6);
    addWheel(1.15, 2.6);
    addWheel(-1.15, -1.2);
    addWheel(1.15, -1.2);
    addWheel(-1.15, -2.6);
    addWheel(1.15, -2.6);
    lamps(g, 3.74, -4.22, 0.95);
  } else if (kind === 'van') {
    box(2.3, 1.9, 5.4, paint, 0, 1.35, 0, g);
    box(2.34, 0.1, 5.2, paint, 0, 1.0, 0, g);
    box(2.2, 0.16, 5.2, dark, 0, 0.42, 0, g);
    box(2.0, 0.8, 0.9, glass, 0, 1.85, 2.0, g, 0.28, 0, 0);
    box(0.06, 0.7, 3.0, glass, -1.16, 1.55, -0.4, g);
    box(0.06, 0.7, 3.0, glass, 1.16, 1.55, -0.4, g);
    box(2.0, 0.7, 0.1, glass, 0, 1.55, -2.68, g);
    box(2.3, 0.35, 0.3, dark, 0, 0.45, 2.68, g);
    box(2.3, 0.35, 0.3, dark, 0, 0.45, -2.68, g);
    box(2.32, 0.08, 5.0, chrome, 0, 0.95, 0, g);
    mirror(-1, 2.2);
    mirror(1, 2.2);
    addWheel(-1.1, 1.8);
    addWheel(1.1, 1.8);
    addWheel(-1.1, -1.8);
    addWheel(1.1, -1.8);
    for (const sx of [-1.16, 1.16]) {
      box(0.02, 0.9, 0.03, dark, sx, 1.55, 0.9, g);
      box(0.02, 0.9, 0.03, dark, sx, 1.55, -1.6, g);
    }
    lamps(g, 2.72, -2.72, 0.95);
  } else if (kind === 'pickup') {
    box(2.3, 0.85, 5.2, paint, 0, 0.8, 0, g);
    box(2.34, 0.12, 5.0, paint, 0, 1.02, 0, g);
    box(2.2, 0.16, 5.0, dark, 0, 0.42, 0, g);
    box(2.2, 0.1, 1.4, paint, 0, 1.28, 1.6, g, 0.1, 0, 0);
    box(1.95, 0.75, 1.5, glass, 0, 1.65, 1.55, g);
    box(2.0, 0.08, 1.45, paint, 0, 2.06, 1.55, g);
    box(0.08, 0.75, 0.1, dark, -0.98, 1.65, 1.55, g);
    box(0.08, 0.75, 0.1, dark, 0.98, 1.65, 1.55, g);
    box(2.3, 0.55, 0.12, paint, 0, 1.05, -2.55, g);
    box(0.1, 0.55, 2.6, paint, -1.12, 1.05, -1.25, g);
    box(0.1, 0.55, 2.6, paint, 1.12, 1.05, -1.25, g);
    box(2.2, 0.08, 2.5, dark, 0, 0.82, -1.25, g);
    box(2.3, 0.35, 0.3, dark, 0, 0.45, 2.58, g);
    box(2.32, 0.06, 4.6, chrome, 0, 0.85, 0, g);
    mirror(-1, 2.1);
    mirror(1, 2.1);
    addWheel(-1.1, 1.8);
    addWheel(1.1, 1.8);
    addWheel(-1.1, -1.8);
    addWheel(1.1, -1.8);
    box(1.1, 0.16, 0.08, dark, 0, 0.85, 2.6, g);
    for (const gx of [-0.35, 0, 0.35]) box(0.07, 0.13, 0.03, chrome, gx, 0.85, 2.62, g);
    lamps(g, 2.62, -2.62, 0.9);
  } else if (kind === 'sport') {
    parts(g,[
[2.4,.3,5.2,0,.32,0,0],[2.2,.07,1.5,0,.52,.85,0,.3],[2,.07,1.2,0,.3,2,0,.45],[1.9,.08,.2,0,.14,2.62,2],[1.5,.12,.07,0,.22,2.66,2],[.85,.24,.75,-.6,.48,2,3,.3],[.85,.24,.75,.6,.48,2,3,.3],[.14,.12,.06,-.78,.52,2.32,5,.3],[.14,.12,.06,-.5,.52,2.32,5,.3],[.14,.12,.06,.5,.52,2.32,5,.3],[.14,.12,.06,.78,.52,2.32,5,.3],[.12,.1,.06,-.64,.5,2.34,6,.3],[.12,.1,.06,.64,.5,2.34,6,.3],[1.9,.06,1.2,0,.72,.45,1,.55],[1.3,.05,.6,0,1.02,-.35,0],[1.5,.06,1,0,.85,-1.1,1,-.5],[.06,.42,1.7,-.92,.72,-.3,1,.15],[.06,.42,1.7,.92,.72,-.3,1,.15],[1.9,.06,1,0,.8,-2.15,0,-.45],[.3,.25,1.5,-1.05,.5,1.4,0],[.3,.25,1.5,1.05,.5,1.4,0],[.3,.25,1.6,-1.05,.52,-1.4,0],[.3,.25,1.6,1.05,.52,-1.4,0],[.06,.3,.9,-1.21,.5,-.3,2],[.06,.3,.9,1.21,.5,-.3,2],[2.42,.1,4.4,0,.24,0,2],[2.4,.08,.55,0,1.6,-2.4,0,-.1],[.06,.4,.55,-1.2,1.6,-2.4,0],[.06,.4,.55,1.2,1.6,-2.4,0],[.08,.85,.08,-.7,1.2,-2.4,2],[.08,.85,.08,.7,1.2,-2.4,2],[1.9,.12,.06,0,.6,-2.58,6],[1.8,.12,.2,0,.28,-2.5,2]],[paint,glass,dark,chrome,wht,head,tail]);
    addSW(-1,1.5,.45);addSW(1,1.5,.45);addSW(-1,-1.5,.45);addSW(1,-1.5,.45);
} else if (kind === 'muscle') {
    parts(g,[
[2,.5,4.8,0,.52,0,0],[2.04,.1,4.6,0,.28,0,2],[1.9,.1,2.3,0,.78,1.25,0,.12],[.5,.08,.9,0,.83,1.2,2],[1.75,.06,.85,0,1.08,-.25,1,.42],[1.7,.07,1.5,0,1.22,-.9,0],[.06,.42,1.3,-.98,1,-.85,1],[.06,.42,1.3,.98,1,-.85,1],[1.7,.05,.7,0,1.02,-1.75,1,-.45],[1.8,.3,.6,0,.72,-2.2,0],[2,.3,.3,0,.45,2.45,3],[2,.3,.3,0,.45,-2.45,3],[1.9,.28,.1,0,.6,2.42,2],[.22,.18,.08,-.8,.62,2.46,4],[.22,.18,.08,-.45,.62,2.46,4],[.22,.18,.08,.45,.62,2.46,4],[.22,.18,.08,.8,.62,2.46,4],[1.8,.16,.08,0,.6,-2.46,5],[2.04,.06,4.5,0,.74,0,3],[.05,.05,.2,-1.06,1,.5,2],[.05,.05,.2,1.06,1,.5,2]],[paint,glass,dark,chrome,head,tail]);
    addWheel(-1.05,1.45);addWheel(1.05,1.45);addWheel(-1.05,-1.45);addWheel(1.05,-1.45);
} else if (kind === 'wedge') {
    const tg=std(0x3a9a9a,{roughness:.12,metalness:.5});
    parts(g,[
[2,.4,4.2,0,.48,0,0],[1.8,.1,1.4,0,.5,1.4,4,.25],[1.7,.06,1.3,0,.9,0,1,.45],[1.4,.06,1.2,0,1.12,-.3,4],[.4,.1,.7,0,.72,.9,2],[1.7,.06,.4,0,.95,-1.9,2],[.06,.3,.06,-.6,.78,-1.9,2],[.06,.3,.06,.6,.78,-1.9,2],[.4,.1,.08,-.6,.55,2.12,5],[.4,.1,.08,.6,.55,2.12,5],[1.6,.14,.08,0,.6,-2.12,6],[.3,.02,1.4,0,.68,1.2,4],[2.02,.08,4,0,.28,0,2]],[paint,tg,dark,chrome,wht,head,tail]);
    addSW(-1,1.35,.4);addSW(1,1.35,.4);addSW(-1,-1.35,.4);addSW(1,-1.35,.4);
} else if (kind === 'boxy') {
    const bg=std(0x5a9fd8,{roughness:.12,metalness:.5});
    parts(g,[
[2.1,.7,4.6,0,.6,0,0],[2,.55,2.2,0,1.15,-.3,1],[1.9,.08,2,0,1.45,-.3,0],[2.12,.12,4.4,0,.3,0,2],[1.9,.3,.25,0,.5,2.32,3],[1.9,.3,.25,0,.5,-2.32,3],[.45,.16,.08,-.62,.72,2.34,4],[.45,.16,.08,.62,.72,2.34,4],[.45,.16,.08,-.62,.5,2.34,4],[.45,.16,.08,.62,.5,2.34,4],[1.7,.16,.08,0,.7,-2.34,5],[.06,.5,1.8,-1.06,.9,-.3,2],[.06,.5,1.8,1.06,.9,-.3,2],[2,.35,.3,0,.45,2.3,0]],[paint,bg,dark,chrome,head,tail]);
    addWheel(-1.05,1.45,.55);addWheel(1.05,1.45,.55);addWheel(-1.05,-1.45,.55);addWheel(1.05,-1.45,.55);
} else if (kind === 'stripe') {
    parts(g,[
[2.2,.42,4.8,0,.52,0,0],[2,.1,1.8,0,.68,1.4,0,.18],[.28,.03,1.6,-.3,.75,1.5,4,.18],[.28,.03,1.6,.3,.75,1.5,4,.18],[.5,.08,.7,0,.75,1.3,2],[1.7,.06,1.4,0,.9,-.1,1,.5],[1.6,.07,1.3,0,1.16,-.2,0],[.28,.03,1.4,-.3,1.2,-.2,4],[.28,.03,1.4,.3,1.2,-.2,4],[1.9,.06,1,0,1,-1.5,0,-.3],[.28,.03,.9,-.3,1.04,-1.5,4,-.3],[.28,.03,.9,.3,1.04,-1.5,4,-.3],[.78,.22,.7,-.68,.68,2.05,2,.18],[.78,.22,.7,.68,.68,2.05,2,.18],[1.9,.06,.4,0,.95,-2.2,0],[.06,.3,.06,-.6,.78,-2.2,2],[.06,.3,.06,.6,.78,-2.2,2],[1.9,.18,.08,0,.72,-2.42,6],[2,.16,4.5,0,.26,0,2],[1,.12,.08,0,.5,2.44,2]],[paint,glass,dark,chrome,wht,head,tail]);
    addSW(-1.02,1.5,.44);addSW(1.02,1.5,.44);addSW(-1.02,-1.5,.44);addSW(1.02,-1.5,.44);
} else {
    const low = kind === 'lowrider';
    const drop = low ? 0.14 : 0;
    const bodyY = 0.52 - drop;
    box(2.0, 0.5, 4.6, paint, 0, bodyY, 0, g);
    box(2.04, 0.1, 4.4, dark, 0, bodyY - 0.26, 0, g);
    box(2.06, 0.12, 4.4, paint, 0, bodyY + 0.26, 0, g);
    box(1.9, 0.16, 4.4, dark, 0, bodyY - 0.3, 0, g);
    box(1.95, 0.1, 1.7, paint, 0, bodyY + 0.3, 1.5, g, 0.18, 0, 0);
    box(1.85, 0.26, 0.5, paint, 0, bodyY + 0.22, 2.2, g, -0.28, 0, 0);
    box(2.0, 0.35, 0.35, dark, 0, bodyY - 0.12, 2.2, g);
    box(2.0, 0.35, 0.35, dark, 0, bodyY - 0.12, -2.2, g);
    box(1.75, 0.48, 2.1, glass, 0, bodyY + 0.5, -0.35, g);
    box(1.7, 0.08, 1.9, paint, 0, bodyY + 0.78, -0.35, g);
    box(1.7, 0.05, 0.85, glass, 0, bodyY + 0.58, 0.68, g, 0.5, 0, 0);
    box(1.7, 0.05, 0.8, glass, 0, bodyY + 0.56, -1.38, g, -0.42, 0, 0);
    box(0.08, 0.55, 0.1, dark, -0.88, bodyY + 0.53, -0.35, g);
    box(0.08, 0.55, 0.1, dark, 0.88, bodyY + 0.53, -0.35, g);
    box(0.1, 0.5, 0.1, dark, -0.85, bodyY + 0.55, 0.62, g, 0.5, 0, 0);
    box(0.1, 0.5, 0.1, dark, 0.85, bodyY + 0.55, 0.62, g, 0.5, 0, 0);
    box(1.95, 0.42, 0.95, paint, 0, bodyY + 0.28, -1.82, g, -0.12, 0, 0);
    box(1.9, 0.1, 0.3, paint, 0, bodyY + 0.5, -2.26, g, -0.12, 0, 0);
    box(1.95, 0.06, 0.2, paint, 0, bodyY + 0.5, -2.24, g);
    box(2.04, 0.06, 4.3, chrome, 0, bodyY + 0.22, 0, g);
    box(0.04, 0.05, 0.28, chrome, -1.01, bodyY + 0.36, 0.25, g);
    box(0.04, 0.05, 0.28, chrome, 1.01, bodyY + 0.36, 0.25, g);
    box(0.04, 0.05, 0.28, chrome, -1.01, bodyY + 0.36, -0.85, g);
    box(0.04, 0.05, 0.28, chrome, 1.01, bodyY + 0.36, -0.85, g);
    mirror(-1, 0.72);
    mirror(1, 0.72);
    if (low) {
      box(2.06, 0.1, 4.66, chrome, 0, bodyY - 0.28, 0, g);
      box(1.1, 0.09, 0.5, dark, 0, bodyY + 0.38, 1.55, g);
    }
    if (kind === 'taxi') {
      box(0.9, 0.3, 0.5, std(0xffc21c, { emissive: 0xaa7700, emissiveIntensity: 0.6 }), 0, bodyY + 0.98, -0.35, g);
      box(2.02, 0.24, 4.62, dark, 0, bodyY - 0.02, 0, g);
    }
    const wr = low ? 0.38 : 0.42;
    addWheel(-1.05, 1.45, wr);
    addWheel(1.05, 1.45, wr);
    addWheel(-1.05, -1.45, wr);
    addWheel(1.05, -1.45, wr);
    for (const sx of [-1.01, 1.01]) {
      box(0.02, 0.5, 0.03, dark, sx, bodyY + 0.36, 0.25, g);
      box(0.02, 0.5, 0.03, dark, sx, bodyY + 0.36, -0.85, g);
    }
    box(0.9, 0.14, 0.08, dark, 0, bodyY + 0.24, 2.31, g);
    for (const gx of [-0.28, 0, 0.28]) box(0.06, 0.12, 0.03, chrome, gx, bodyY + 0.24, 2.33, g);
    lamps(g, 2.32, -2.32, bodyY + 0.3);
  }
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = false;
    }
  });
  for (const w of wheels) arch(g, w.position.x, w.position.y, w.position.z, w.position.y + 0.03, paint);
  return { group: g, kind, wheels, color };
}

export function makeBike(G, color = 0xd81a1a) {
  const g = new THREE.Group();
  const paint = std(color);
  const accentColor = {
    0xffd400: 0xe02030, 0x2a6fd8: 0xffffff, 0xff6a00: 0x1a1a1a,
    0xd81a1a: 0xffffff, 0x14161c: 0x2a6fd8, 0xe02030: 0xffc21c,
  }[color] ?? 0xffffff;
  const accent = std(accentColor);
  const dark = std(0x1a1a1a, { roughness: 0.85, metalness: 0.1 });
  const metal = std(0x9a9a9a, { metalness: 0.85, roughness: 0.3 });
  const gold = std(0xd8a03c, { metalness: 0.9, roughness: 0.25 });
  const chrome = std(0xd8d8d8, { metalness: 0.5, roughness: 0.35, emissive: 0x555555, emissiveIntensity: 0.3 });
  const glass = std(0x223344, { roughness: 0.12, metalness: 0.5 });
  const wheels = [];
  const mkWheel = (z, width) => {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, width, 18), std(0x0e0e0e, { roughness: 0.95, metalness: 0 }));
    tire.rotation.z = Math.PI / 2;
    w.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, width + 0.01, 12), std(0x2a2a2a, { metalness: 0.85, roughness: 0.25 }));
    rim.rotation.z = Math.PI / 2;
    w.add(rim);
    const spokeMat = std(0x555555, { metalness: 0.8, roughness: 0.35 });
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(width + 0.02, 0.5, 0.05), spokeMat);
      const a = (i / 5) * Math.PI * 2;
      s.position.set(0, Math.cos(a) * 0.14, Math.sin(a) * 0.14);
      s.rotation.x = -a;
      w.add(s);
    }
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, width + 0.02, 12), std(0x777777, { metalness: 0.7, roughness: 0.4 }));
    disc.rotation.z = Math.PI / 2;
    w.add(disc);
    w.position.set(0, 0.42, z);
    g.add(w);
    wheels.push(w);
  };
  mkWheel(0.95, 0.16);
  mkWheel(-0.95, 0.28);
  box(0.5, 0.34, 0.78, paint, 0, 0.98, 0.78, g, -0.32, 0, 0);
  box(0.06, 0.62, 1.35, paint, -0.27, 0.72, 0.05, g);
  box(0.06, 0.62, 1.35, paint, 0.27, 0.72, 0.05, g);
  box(0.065, 0.18, 1.3, accent, -0.28, 0.88, 0.05, g);
  box(0.065, 0.18, 1.3, accent, 0.28, 0.88, 0.05, g);
  box(0.42, 0.22, 1.2, paint, 0, 0.42, 0.0, g);
  box(0.44, 0.08, 1.2, dark, 0, 0.3, 0.0, g);
  box(0.44, 0.46, 0.04, glass, 0, 1.34, 0.66, g, -0.55, 0, 0);
  box(0.24, 0.04, 0.32, paint, -0.36, 0.98, 0.72, g);
  box(0.24, 0.04, 0.32, paint, 0.36, 0.98, 0.72, g);
  box(0.32, 0.06, 0.06, std(0xfff2b0, { emissive: 0xffe9a0, emissiveIntensity: 1.4 }), 0, 1.02, 1.14, g);
  box(0.4, 0.4, 0.5, std(0x333333, { metalness: 0.6, roughness: 0.5 }), 0, 0.55, -0.05, g);
  for (const x of [-0.1, 0.1]) limb(x, 1.12, 0.6, x, 0.42, 0.95, 0.05, gold, g);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.62, 6), dark);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 1.12, 0.58);
  g.add(bar);
  for (const x of [-0.3, 0.3]) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 6), dark);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(x, 1.12, 0.58);
    g.add(grip);
  }
  box(0.08, 0.12, 0.85, metal, -0.16, 0.45, -0.6, g);
  box(0.08, 0.12, 0.85, metal, 0.16, 0.45, -0.6, g);
  box(0.03, 0.06, 0.9, gold, 0.24, 0.52, -0.5, g);
  box(0.36, 0.08, 0.5, dark, 0, 0.98, -0.45, g);
  box(0.38, 0.22, 0.55, paint, 0, 1.06, -0.82, g, -0.18, 0, 0);
  box(0.4, 0.06, 0.5, accent, 0, 1.18, -0.82, g, -0.18, 0, 0);
  box(0.3, 0.08, 0.05, std(0xd81a1a, { emissive: 0xaa0000, emissiveIntensity: 1.0 }), 0, 1.06, -1.1, g);
  const muff = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.42, 10), chrome);
  muff.rotation.x = Math.PI / 2;
  muff.position.set(0.2, 0.42, -0.78);
  g.add(muff);
  const rider = new THREE.Group();
  const jacket = std(color);
  const pants = std(0x222831);
  const skin = std(0xd9a066, { roughness: 0.8 });
  box(0.5, 0.28, 0.62, jacket, 0, 1.3, -0.08, rider, 0.95, 0, 0);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), std(accentColor, { roughness: 0.3 }));
  helmet.position.set(0, 1.46, 0.38);
  rider.add(helmet);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 8, 0, Math.PI * 2, 0, 1.1), std(0x14202e, { roughness: 0.1, metalness: 0.6 }));
  visor.position.set(0, 1.46, 0.42);
  visor.rotation.x = -0.5;
  rider.add(visor);
  limb(-0.26, 1.42, 0.05, -0.3, 1.12, 0.58, 0.07, jacket, rider);
  limb(0.26, 1.42, 0.05, 0.3, 1.12, 0.58, 0.07, jacket, rider);
  limb(-0.2, 1.02, -0.35, -0.3, 0.82, 0.1, 0.09, pants, rider);
  limb(0.2, 1.02, -0.35, 0.3, 0.82, 0.1, 0.09, pants, rider);
  limb(-0.3, 0.82, 0.1, -0.28, 0.58, -0.32, 0.08, pants, rider);
  limb(0.3, 0.82, 0.1, 0.28, 0.58, -0.32, 0.08, pants, rider);
  box(0.1, 0.06, 0.24, dark, -0.28, 0.56, -0.34, rider);
  box(0.1, 0.06, 0.24, dark, 0.28, 0.56, -0.34, rider);
  g.add(rider);
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = false;
    }
  });
  return { group: g, kind: 'bike', wheels, color, rider };
}

export function createDrive(G, vehicle, opts = {}) {
  const topSpeed = opts.topSpeed ?? (vehicle.kind === 'bike' ? BIKE_TOP_SPEED : CAR_TOP_SPEED);
  const D = {
    vehicle,
    group: vehicle.group,
    pos: new THREE.Vector3(0, 0, 0),
    heading: 0,
    speed: 0,
    topSpeed,
    accel: opts.accel ?? 16,
    steer: 0,
    vel: new THREE.Vector3(0, 0, 0),
    name: CAR_NAMES[vehicle.kind] || 'Ember GT',
    condition: 100,
    drift: { active: false, angle: 0, points: 0, combo: 1, comboTime: 0, endTimer: 0, hadSlip: false, skidTimer: 0 },
    bankDrift() {
      const d = D.drift;
      if (d.points >= 25) {
        const cash = Math.round(d.points * d.combo);
        G.money += cash;
        G.respect = Math.min(100, G.respect + Math.min(6, cash / 400));
        G.driftBanked += cash;
        if (G.stats) G.stats.longestDrift = Math.max(G.stats.longestDrift, cash);
        if (G.toast) G.toast(`DRIFT +$${cash} (x${d.combo})`);
      }
      d.points = 0;
      d.combo = 1;
      d.comboTime = 0;
      d.endTimer = 0;
      d.angle = 0;
      d.hadSlip = false;
    },
    place(x, z, heading = 0) {
      D.pos.set(x, 0, z);
      D.heading = heading;
      D.speed = 0;
      D.vel.set(0, 0, 0);
      D.drift.active = false;
      D.drift.points = 0;
      D.drift.combo = 1;
      D.sync();
    },
    sync() {
      D.group.position.copy(D.pos);
      D.group.rotation.y = D.heading;
    },
    update(dt, input) {
      const fwd = input.f ? 1 : 0;
      const back = input.b ? 1 : 0;
      const isBike = vehicle.kind === 'bike';
      if (fwd) D.speed += D.accel * dt;
      else if (back) D.speed -= (D.speed > 0.5 ? 26 : 10) * dt;
      else D.speed -= Math.sign(D.speed) * Math.min(Math.abs(D.speed), 8 * dt);
      const spdFactor = Math.min(1, Math.abs(D.speed) / 14);
      const wantDrift = input.brake && Math.abs(D.speed) > 12;
      if (wantDrift && !D.drift.active) {
        D.drift.active = true;
        D.drift.comboTime = 0;
        D.drift.points = 0;
        D.drift.combo = 1;
        D.drift.endTimer = 0;
        D.drift.hadSlip = false;
      }
      if (D.drift.active) {
        D.speed -= Math.sign(D.speed) * Math.min(Math.abs(D.speed), 6 * dt);
        if (Math.abs(D.speed) < 8) {
          D.drift.active = false;
          D.bankDrift();
        }
      } else if (input.brake) {
        D.speed -= Math.sign(D.speed) * Math.min(Math.abs(D.speed), 34 * dt);
      }
      D.speed = Math.max(-12, Math.min(topSpeed, D.speed));
      const steerIn = (input.l ? 1 : 0) - (input.r ? 1 : 0);
      D.steer += (steerIn - D.steer) * Math.min(1, dt * 10);
      const yawRate = D.drift.active ? (isBike ? 2.9 : 3.6) : 1.9;
      D.heading += D.steer * yawRate * spdFactor * Math.sign(D.speed || 1) * dt;
      const fx = Math.sin(D.heading), fz = Math.cos(D.heading);
      const targetVx = fx * D.speed, targetVz = fz * D.speed;
      if (D.drift.active) {
        const grip = isBike ? 3.2 : 2.0;
        D.vel.x += (targetVx - D.vel.x) * Math.min(1, grip * dt);
        D.vel.z += (targetVz - D.vel.z) * Math.min(1, grip * dt);
      } else {
        D.vel.x = targetVx;
        D.vel.z = targetVz;
      }
      D.pos.x += D.vel.x * dt;
      D.pos.z += D.vel.z * dt;
      D.pos.x = Math.max(-455, Math.min(455, D.pos.x));
      D.pos.z = Math.max(-455, Math.min(455, D.pos.z));
      for (const w of vehicle.wheels) {
        w.rotation.x += (D.speed * dt) / 0.42;
      }
      if (vehicle.kind === 'bike') {
        D.group.rotation.z = -D.steer * 0.28 * spdFactor;
      }
      if (D.drift.active) {
        const vMag = Math.hypot(D.vel.x, D.vel.z);
        const vdx = vMag > 0.1 ? D.vel.x / vMag : fx;
        const vdz = vMag > 0.1 ? D.vel.z / vMag : fz;
        const slip = Math.acos(Math.max(-1, Math.min(1, vdx * fx + vdz * fz)));
        const slipDeg = slip * 180 / Math.PI;
        D.drift.angle = slipDeg;
        if (slip > 1.25) {
          D.drift.active = false;
          D.drift.points = 0;
          D.drift.combo = 1;
          D.drift.hadSlip = false;
          D.speed *= 0.25;
          D.vel.multiplyScalar(0.25);
          if (G.toast) G.toast('SPUN OUT — drift combo lost');
        } else if (vMag > 8 && slipDeg > 8) {
          D.drift.hadSlip = true;
          D.drift.endTimer = 0;
          D.drift.comboTime += dt;
          D.drift.combo = Math.min(5, 1 + Math.floor(D.drift.comboTime / 2.5));
          D.drift.points += slipDeg * vMag * dt * 0.6;
          const rx = Math.cos(D.heading), rz = -Math.sin(D.heading);
          D.drift.skidTimer -= dt;
          const lay = D.drift.skidTimer <= 0;
          if (lay) D.drift.skidTimer = 0.1;
          for (const side of [-1, 1]) {
            const wx = D.pos.x - fx * 1.5 + rx * side * 1.0;
            const wz = D.pos.z - fz * 1.5 + rz * side * 1.0;
            if (G.driftFX) {
              G.driftFX.spawnSmoke(wx, 0.4, wz, 1);
              if (lay) G.driftFX.laySkid(wx, wz, Math.atan2(D.vel.x, D.vel.z));
            }
          }
        } else if (D.drift.hadSlip) {
          D.drift.endTimer += dt;
          if (D.drift.endTimer > 0.4) {
            D.drift.active = false;
            D.bankDrift();
          }
        }
      }
      D.sync();
    },
  };
  return D;
}
