// Ember Bay v9 — realistic low-poly people, after the CJ proportion
// references: head ~1/7 of height, shoulders wider than hips, two-segment
// limbs with hip/shoulder pivots, sneakers with soles, belt + buckle,
// jacket / shirt colour blocks, hair styles, simple faces (eyes, nose,
// mouth, brows). One builder for the player, crew, peds and police — the
// blocky box figures are gone. Total height ~1.8 m, which also matches
// the cars (a person is ~1.5x a car's height, not 2x).
import * as THREE from 'three';

const HEIGHT = 1.8;

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
// Cylinder between two points (limb segments).
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

// opts: skin, shirt, shirt2 (under-shirt / chest panel), pants, shoes,
// jacket (colour or null), vest (colour or null), hair (colour), hairStyle
// ('short' | 'long' | 'cap' | 'bald' | 'bandana'), hat (cap colour or null),
// badge (police badge), gloves (colour or null).
export function makePerson(G, opts = {}) {
  const {
    skin = 0xd9a066, shirt = 0xff7a1a, shirt2 = null, pants = 0x2a3a5a,
    shoes = 0x222222, hair = 0x14141c, hairStyle = 'short', hat = null,
    jacket = null, vest = null, badge = false,
  } = opts;
  const g = new THREE.Group();
  const skinM = std(skin);
  const shirtM = std(shirt);
  const pantsM = std(pants, { roughness: 0.9 });
  const shoeM = std(shoes, { roughness: 0.6 });
  const soleM = std(0xe8e8e8, { roughness: 0.7 });

  // --- Legs: thigh + shin + sneaker, hip pivot at y 0.95. ---
  const makeLeg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.11, 0.95, 0);
    // thigh: hip -> knee (0.95 -> 0.52)
    limb(0, 0, 0, 0, -0.43, 0, 0.085, pantsM, hip);
    // shin: knee -> ankle (0.52 -> 0.1), slightly slimmer
    limb(0, -0.43, 0, 0, -0.85, 0.02, 0.07, pantsM, hip);
    // knee cap hint
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), pantsM);
    knee.position.set(0, -0.43, 0.03); hip.add(knee);
    // sneaker: foot box + white sole + lace stripe
    box(0.16, 0.09, 0.32, shoeM, 0, -0.9, 0.06, hip);
    box(0.17, 0.035, 0.33, soleM, 0, -0.945, 0.06, hip);
    box(0.17, 0.02, 0.1, soleM, 0, -0.85, 0.12, hip);
    g.add(hip);
    return hip;
  };
  const hipL = makeLeg(-1);
  const hipR = makeLeg(1);

  // --- Torso: waist -> chest, shoulders wider than hips. ---
  // waist / hips
  box(0.4, 0.2, 0.24, pantsM, 0, 1.02, 0, g);
  // belt + buckle
  box(0.42, 0.07, 0.26, std(0x3a2a1a, { roughness: 0.6 }), 0, 1.13, 0, g);
  box(0.09, 0.05, 0.03, std(0xd8d8d8, { metalness: 0.8, roughness: 0.3 }), 0, 1.13, 0.14, g);
  // chest: tapered — wider at the shoulders, narrower at the waist
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.21, 0.4, 4), shirtM);
  chest.position.set(0, 1.36, 0);
  chest.rotation.y = Math.PI / 4;
  chest.scale.set(1, 1, 0.62);
  g.add(chest);
  // under-shirt / chest panel (colour block on the front)
  if (shirt2 !== null) {
    box(0.3, 0.3, 0.03, std(shirt2), 0, 1.38, 0.14, g);
  }
  // open jacket: two front panels + collar, shirt showing in the middle
  if (jacket) {
    const jm = std(jacket, { roughness: 0.9 });
    box(0.13, 0.42, 0.05, jm, -0.17, 1.36, 0.13, g);
    box(0.13, 0.42, 0.05, jm, 0.17, 1.36, 0.13, g);
    box(0.44, 0.07, 0.26, jm, 0, 1.54, 0, g); // shoulders / collar bar — slim, no plank shelf
    box(0.1, 0.08, 0.05, jm, -0.12, 1.6, 0.14, g); // collar L
    box(0.1, 0.08, 0.05, jm, 0.12, 1.6, 0.14, g); // collar R
  }
  // police vest: dark panel + badge
  if (vest) {
    box(0.44, 0.34, 0.06, std(vest, { roughness: 0.7 }), 0, 1.38, 0.13, g);
    box(0.44, 0.06, 0.06, std(0x111111), 0, 1.2, 0.13, g);
  }
  if (badge) {
    box(0.07, 0.09, 0.02, std(0xd8a03c, { metalness: 0.85, roughness: 0.3 }), -0.13, 1.48, 0.16, g);
  }
  // neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8), skinM);
  neck.position.set(0, 1.6, 0);
  g.add(neck);

  // --- Arms: upper + forearm + hand, shoulder pivot at y 1.5. ---
  const makeArm = (side) => {
    const sh = new THREE.Group();
    sh.position.set(side * 0.3, 1.5, 0);
    // upper arm: shoulder -> elbow
    limb(0, 0, 0, 0, -0.3, 0, 0.06, shirtM, sh);
    // forearm: elbow -> wrist (skin)
    limb(0, -0.3, 0, 0, -0.58, 0, 0.05, skinM, sh);
    // hand: small box + thumb hint
    box(0.09, 0.12, 0.05, skinM, 0, -0.64, 0.01, sh);
    g.add(sh);
    return sh;
  };
  const shL = makeArm(-1);
  const shR = makeArm(1);

  // --- Head: skull + hair + simple face. ---
  const head = new THREE.Group();
  head.position.set(0, 1.72, 0);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), skinM);
  skull.scale.set(0.92, 1.05, 0.98);
  head.add(skull);
  // jaw / chin hint
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), skinM);
  jaw.position.set(0, -0.07, 0.02);
  jaw.scale.set(0.85, 0.7, 0.9);
  head.add(jaw);
  // eyes: dark, slightly inset on the face (+z is forward)
  const eyeM = std(0x141414, { roughness: 0.4 });
  box(0.028, 0.02, 0.012, eyeM, -0.048, 0.015, 0.122, head);
  box(0.028, 0.02, 0.012, eyeM, 0.048, 0.015, 0.122, head);
  // brows
  box(0.05, 0.012, 0.012, std(hair, { roughness: 0.9 }), -0.048, 0.055, 0.122, head);
  box(0.05, 0.012, 0.012, std(hair, { roughness: 0.9 }), 0.048, 0.055, 0.122, head);
  // nose
  box(0.03, 0.05, 0.03, skinM, 0, -0.03, 0.13, head);
  // mouth
  box(0.06, 0.012, 0.012, std(0x8a3a2a, { roughness: 0.8 }), 0, -0.085, 0.12, head);
  // hair styles
  const hairM = std(hair, { roughness: 0.95 });
  if (hairStyle === 'short') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.132, 12, 8, 0, Math.PI * 2, 0, 1.25), hairM);
    cap.position.set(0, 0.02, -0.008);
    head.add(cap);
  } else if (hairStyle === 'long') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.132, 12, 8, 0, Math.PI * 2, 0, 1.25), hairM);
    cap.position.set(0, 0.02, -0.008);
    head.add(cap);
    box(0.2, 0.3, 0.06, hairM, 0, -0.12, -0.1, head); // back hair
  } else if (hairStyle === 'cap' || hat) {
    const c = hat ?? hair;
    const capM = std(c, { roughness: 0.8 });
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.14, 0.07, 12), capM);
    crown.position.set(0, 0.11, 0);
    head.add(crown);
    box(0.16, 0.02, 0.12, capM, 0, 0.085, 0.16, head); // brim
  } else if (hairStyle === 'bandana') {
    box(0.26, 0.06, 0.26, std(hair, { roughness: 0.9 }), 0, 0.1, 0, head);
    box(0.06, 0.14, 0.02, std(hair, { roughness: 0.9 }), 0.1, 0.02, -0.13, head); // knot tail
  }
  // 'bald' adds nothing.
  g.add(head);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  return { group: g, hipL, hipR, shL, shR, head, height: HEIGHT };
}
