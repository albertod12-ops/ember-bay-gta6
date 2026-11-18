import * as THREE from 'three';

function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts });
}
function box(w, h, d, material, x, y, z, parent, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}
function limb(ax, ay, az, bx, by, bz, r, material, parent, seg = 8) {
  const a = new THREE.Vector3(ax, ay, az);
  const b = new THREE.Vector3(bx, by, bz);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, len, seg), material);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  parent.add(m);
  return m;
}

export function makePerson(G, opts = {}) {
  const {
    skin = 0xd9a066, shirt = 0xff7a1a, shirt2 = null, pants = 0x2a3a5a,
    shoes = 0x222222, hair = 0x14141c, hairStyle = 'short', hat = null,
    jacket = null, vest = null, badge = false, h = 1.8, build = 1,
    sleeves = 'short', hoodie = false, backpack = null,
  } = opts;
  const g = new THREE.Group();
  const skinM = std(skin);
  const shirtM = std(shirt);
  const pantsM = std(pants, { roughness: 0.9 });
  const shoeM = std(shoes, { roughness: 0.6 });
  const soleM = std(0xe8e8e8, { roughness: 0.7 });
  const armM = sleeves === 'long' ? shirtM : skinM;

  const makeLeg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.1, 0.98, 0);
    limb(0, 0, 0, 0, -0.46, 0, 0.085, pantsM, hip);
    limb(0, -0.46, 0, 0, -0.88, 0.02, 0.066, pantsM, hip);
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), pantsM);
    knee.position.set(0, -0.46, 0.03); hip.add(knee);
    box(0.15, 0.08, 0.3, shoeM, 0, -0.93, 0.05, hip);
    box(0.16, 0.03, 0.31, soleM, 0, -0.97, 0.05, hip);
    g.add(hip);
    return hip;
  };
  const hipL = makeLeg(-1);
  const hipR = makeLeg(1);

  box(0.38, 0.18, 0.22, pantsM, 0, 1.04, 0, g);
  box(0.4, 0.06, 0.24, std(0x3a2a1a, { roughness: 0.6 }), 0, 1.14, 0, g);
  box(0.08, 0.05, 0.03, std(0xd8d8d8, { metalness: 0.8, roughness: 0.3 }), 0, 1.14, 0.13, g);
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.19, 0.42, 10), shirtM);
  chest.position.set(0, 1.34, 0);
  chest.scale.set(1, 1, 0.62);
  g.add(chest);
  const shoulderBar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.46, 8), shirtM);
  shoulderBar.rotation.z = Math.PI / 2;
  shoulderBar.position.set(0, 1.52, 0);
  shoulderBar.scale.set(1, 1, 0.7);
  g.add(shoulderBar);
  for (const sx of [-0.24, 0.24]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), shirtM);
    cap.position.set(sx, 1.52, 0);
    g.add(cap);
  }
  box(0.14, 0.1, 0.05, shirtM, -0.2, 1.52, 0.02, g, 0, 0, 0.3);
  box(0.14, 0.1, 0.05, shirtM, 0.2, 1.52, 0.02, g, 0, 0, -0.3);
  if (shirt2 !== null) {
    box(0.28, 0.3, 0.03, std(shirt2), 0, 1.36, 0.13, g);
  }
  if (hoodie) {
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8, 0, Math.PI * 2, 0, 1.4), shirtM);
    hood.position.set(0, 1.56, -0.12);
    hood.scale.set(1.1, 0.9, 0.8);
    g.add(hood);
    box(0.26, 0.16, 0.04, std(shirt2 || 0x222831), 0, 1.2, 0.14, g);
  }
  if (backpack) {
    box(0.3, 0.38, 0.12, std(backpack, { roughness: 0.9 }), 0, 1.36, -0.17, g);
    box(0.05, 0.3, 0.03, std(0x222222), -0.12, 1.38, 0.13, g);
    box(0.05, 0.3, 0.03, std(0x222222), 0.12, 1.38, 0.13, g);
  }
  if (jacket) {
    const jm = std(jacket, { roughness: 0.9 });
    box(0.12, 0.42, 0.05, jm, -0.16, 1.34, 0.12, g);
    box(0.12, 0.42, 0.05, jm, 0.16, 1.34, 0.12, g);
    box(0.4, 0.06, 0.24, jm, 0, 1.53, 0, g);
    box(0.09, 0.07, 0.05, jm, -0.11, 1.58, 0.13, g);
    box(0.09, 0.07, 0.05, jm, 0.11, 1.58, 0.13, g);
  }
  if (vest) {
    box(0.42, 0.32, 0.06, std(vest, { roughness: 0.7 }), 0, 1.36, 0.12, g);
    box(0.42, 0.05, 0.06, std(0x111111), 0, 1.2, 0.12, g);
  }
  if (badge) {
    box(0.07, 0.09, 0.02, std(0xd8a03c, { metalness: 0.85, roughness: 0.3 }), -0.12, 1.46, 0.15, g);
  }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.1, 8), skinM);
  neck.position.set(0, 1.58, 0);
  g.add(neck);

  const makeArm = (side) => {
    const sh = new THREE.Group();
    sh.position.set(side * 0.27, 1.5, 0);
    sh.rotation.z = -side * 0.1;
    limb(0, 0, 0, 0, -0.28, 0.01, 0.062, shirtM, sh);
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 6), shirtM);
    elbow.position.set(0, -0.28, 0.01);
    sh.add(elbow);
    limb(0, -0.28, 0.01, 0, -0.56, 0.02, 0.05, armM, sh);
    box(0.09, 0.12, 0.05, skinM, 0, -0.62, 0.02, sh);
    g.add(sh);
    return sh;
  };
  const shL = makeArm(-1);
  const shR = makeArm(1);

  const head = new THREE.Group();
  head.position.set(0, 1.7, 0);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), skinM);
  skull.scale.set(0.92, 1.05, 0.98);
  head.add(skull);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), skinM);
  jaw.position.set(0, -0.06, 0.02);
  jaw.scale.set(0.85, 0.7, 0.9);
  head.add(jaw);
  for (const ex of [-0.108, 0.108]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), skinM);
    ear.position.set(ex, -0.01, 0);
    ear.scale.set(0.5, 1, 0.8);
    head.add(ear);
  }
  const eyeM = std(0x141414, { roughness: 0.4 });
  box(0.026, 0.018, 0.012, eyeM, -0.042, 0.015, 0.108, head);
  box(0.026, 0.018, 0.012, eyeM, 0.042, 0.015, 0.108, head);
  box(0.045, 0.01, 0.012, std(hair, { roughness: 0.9 }), -0.042, 0.05, 0.108, head);
  box(0.045, 0.01, 0.012, std(hair, { roughness: 0.9 }), 0.042, 0.05, 0.108, head);
  box(0.028, 0.045, 0.028, skinM, 0, -0.025, 0.115, head);
  box(0.055, 0.01, 0.012, std(0x8a3a2a, { roughness: 0.8 }), 0, -0.075, 0.106, head);
  const hairM = std(hair, { roughness: 0.95 });
  if (hairStyle === 'short') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.117, 12, 8, 0, Math.PI * 2, 0, 1.25), hairM);
    cap.position.set(0, 0.018, -0.007);
    head.add(cap);
  } else if (hairStyle === 'long') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.117, 12, 8, 0, Math.PI * 2, 0, 1.25), hairM);
    cap.position.set(0, 0.018, -0.007);
    head.add(cap);
    box(0.18, 0.28, 0.05, hairM, 0, -0.11, -0.09, head);
  } else if (hairStyle === 'afro') {
    const afro = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), hairM);
    afro.position.set(0, 0.04, -0.01);
    afro.scale.set(1, 0.9, 1);
    head.add(afro);
  } else if (hairStyle === 'bun') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.117, 12, 8, 0, Math.PI * 2, 0, 1.25), hairM);
    cap.position.set(0, 0.018, -0.007);
    head.add(cap);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), hairM);
    bun.position.set(0, 0.1, -0.11);
    head.add(bun);
  } else if (hairStyle === 'buzz') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.116, 12, 8, 0, Math.PI * 2, 0, 0.9), hairM);
    cap.position.set(0, 0.02, -0.005);
    head.add(cap);
  } else if (hairStyle === 'cap' || hat) {
    const c = hat ?? hair;
    const capM = std(c, { roughness: 0.8 });
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.125, 0.06, 12), capM);
    crown.position.set(0, 0.1, 0);
    head.add(crown);
    box(0.14, 0.018, 0.11, capM, 0, 0.075, 0.14, head);
  } else if (hairStyle === 'bandana') {
    box(0.23, 0.05, 0.23, std(hair, { roughness: 0.9 }), 0, 0.09, 0, head);
    box(0.05, 0.12, 0.02, std(hair, { roughness: 0.9 }), 0.09, 0.02, -0.115, head);
  }
  g.add(head);

  g.scale.set(build, h / 1.8, build);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  return { group: g, hipL, hipR, shL, shR, head, height: h };
}

