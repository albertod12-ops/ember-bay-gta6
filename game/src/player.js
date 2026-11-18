// The player on foot: orange jacket, red cap. Walk / run with leg swing,
// movement relative to the camera heading.
import * as THREE from 'three';

const SKIN = 0xd9a066;
const JACKET = 0xff7a1a;
const PANTS = 0x2a3a5a;
const CAP = 0xe02030;

export function createPlayer(G) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.85, 0.34), mat(PANTS));
  const legR = legL.clone();
  legL.position.set(-0.2, 0.43, 0); legR.position.set(0.2, 0.43, 0);
  // pivot legs at the hip: wrap each in a group positioned at hip height.
  const hipL = new THREE.Group(); hipL.position.set(-0.2, 0.85, 0); hipL.add(legL); legL.position.y = -0.43;
  const hipR = new THREE.Group(); hipR.position.set(0.2, 0.85, 0); hipR.add(legR); legR.position.y = -0.43;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.05, 0.5), mat(JACKET));
  torso.position.y = 1.4;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.26), mat(JACKET));
  const armR = armL.clone();
  const shL = new THREE.Group(); shL.position.set(-0.62, 1.85, 0); shL.add(armL); armL.position.y = -0.42;
  const shR = new THREE.Group(); shR.position.set(0.62, 1.85, 0); shR.add(armR); armR.position.y = -0.42;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mat(SKIN));
  head.position.y = 2.2;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.16, 0.56), mat(CAP));
  cap.position.y = 2.5;
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.06, 0.3), mat(CAP));
  brim.position.set(0, 2.44, 0.38);
  g.add(hipL, hipR, torso, shL, shR, head, cap, brim);

  const P = {
    group: g,
    pos: new THREE.Vector3(0, 0, 40),
    heading: 0,
    speed: 0,
    walkPhase: 0,
    place(x, z, heading = 0) {
      P.pos.set(x, 0, z); P.heading = heading; P.sync();
    },
    sync() {
      g.position.copy(P.pos);
      g.rotation.y = P.heading;
    },
    // input: {f, b, l, r, run} in camera space; camHeading is the camera yaw.
    update(dt, input, camHeading) {
      let mx = 0, mz = 0;
      if (input.f) { mz -= 1; } if (input.b) { mz += 1; }
      if (input.l) { mx -= 1; } if (input.r) { mx += 1; }
      const moving = mx !== 0 || mz !== 0;
      const top = input.run ? 11 : 6.5;
      if (moving) {
        const len = Math.hypot(mx, mz); mx /= len; mz /= len;
        // camera-relative: forward is (sin h, cos h), screen-right is (-cos h, sin h).
        const sin = Math.sin(camHeading), cos = Math.cos(camHeading);
        const wx = -mx * cos - mz * sin;
        const wz = mx * sin - mz * cos;
        const target = Math.atan2(wx, wz);
        let d = target - P.heading;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        P.heading += d * Math.min(1, dt * 12);
        P.speed += (top - P.speed) * Math.min(1, dt * 8);
        P.pos.x += Math.sin(P.heading) * P.speed * dt;
        P.pos.z += Math.cos(P.heading) * P.speed * dt;
        P.walkPhase += dt * P.speed * 1.6;
      } else {
        P.speed += (0 - P.speed) * Math.min(1, dt * 10);
      }
      const swing = Math.min(1, P.speed / 6) * 0.7;
      const s = Math.sin(P.walkPhase);
      hipL.rotation.x = s * swing; hipR.rotation.x = -s * swing;
      shL.rotation.x = -s * swing * 0.8; shR.rotation.x = s * swing * 0.8;
      P.pos.x = Math.max(-455, Math.min(455, P.pos.x));
      P.pos.z = Math.max(-455, Math.min(455, P.pos.z));
      P.sync();
    },
  };
  P.sync();
  return P;
}
