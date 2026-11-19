import * as THREE from 'three';
import { makePerson } from './people.js';

export function createPlayer(G) {
  const fig = makePerson(G, {
    skin: 0xd9a066, shirt: 0x2a2a2a, shirt2: 0x2a2a2a, pants: 0x2a3a5a,
    shoes: 0x222222, hair: 0x14141c, hairStyle: 'cap', hat: 0xe02030,
    jacket: 0xff7a1a,
  });
  const g = fig.group;
  const { hipL, hipR, shL, shR } = fig;

  const P = {
    group: g,
    pos: new THREE.Vector3(0, 0, 40),
    heading: 0,
    speed: 0,
    walkPhase: 0,
    place(x, z, heading = 0) {
      P.pos.set(x, 0, z);
      P.heading = heading;
      P.sync();
    },
    sync() {
      g.position.copy(P.pos);
      g.rotation.y = P.heading;
    },
    update(dt, input, camHeading) {
      let mx = 0, mz = 0;
      if (input.f) mz -= 1;
      if (input.b) mz += 1;
      if (input.l) mx -= 1;
      if (input.r) mx += 1;
      const moving = mx !== 0 || mz !== 0;
      const top = input.run ? 11 : 6.5;
      if (moving) {
        const len = Math.hypot(mx, mz);
        mx /= len; mz /= len;
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
      hipL.rotation.x = s * swing;
      hipR.rotation.x = -s * swing;
      shL.rotation.x = -s * swing * 0.8;
      shR.rotation.x = s * swing * 0.8;
      if (G._aimPose) {
        shL.rotation.x = -1.35; shR.rotation.x = -1.25;
        shL.rotation.z = 0.3; shR.rotation.z = -0.3;
        hipL.rotation.x = 0.15; hipR.rotation.x = -0.12;
      }
      P.pos.x = Math.max(-455, Math.min(455, P.pos.x));
      P.pos.z = Math.max(-455, Math.min(455, P.pos.z));
      P.sync();
    },
  };
  P.sync();
  return P;
}
