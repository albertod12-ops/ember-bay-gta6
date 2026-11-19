import * as THREE from 'three';

function smokeTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.5, 'rgba(220,220,220,0.35)');
  grad.addColorStop(1, 'rgba(200,200,200,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function initDriftFX(G) {
  const { scene, rng } = G;
  const tex = smokeTexture();

  const SMOKE_N = 140;
  const smoke = [];
  for (let i = 0; i < SMOKE_N; i++) {
    const m = new THREE.SpriteMaterial({
      map: tex, color: 0xcccccc, transparent: true, opacity: 0, depthWrite: false,
    });
    const s = new THREE.Sprite(m);
    s.visible = false;
    scene.add(s);
    smoke.push({ s, life: 0, max: 1, grow: 1 });
  }
  let si = 0;

  const SKID_N = 260;
  const skidGeo = new THREE.PlaneGeometry(0.6, 1.7);
  const skids = [];
  for (let i = 0; i < SKID_N; i++) {
    const m = new THREE.Mesh(skidGeo, new THREE.MeshBasicMaterial({
      color: 0x0d0d0d, transparent: true, opacity: 0, depthWrite: false,
    }));
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    scene.add(m);
    skids.push({ m, life: 0 });
  }
  let ki = 0;

  return {
    spawnSmoke(x, y, z, strength = 1) {
      const p = smoke[si];
      si = (si + 1) % SMOKE_N;
      p.s.position.set(x + rng.range(-0.3, 0.3), y + rng.range(0, 0.4), z + rng.range(-0.3, 0.3));
      p.life = p.max = 0.8 + rng.range(0, 0.5);
      p.grow = (1.6 + rng.range(0, 1.4)) * strength;
      p.s.visible = true;
      p.s.material.opacity = 0.55 * strength;
      const sc = 1 + rng.range(0, 0.6);
      p.s.scale.set(sc, sc, 1);
    },
    laySkid(x, z, heading) {
      const k = skids[ki];
      ki = (ki + 1) % SKID_N;
      k.m.position.set(x, 0.16, z);
      k.m.rotation.set(-Math.PI / 2, 0, heading);
      k.life = 25;
      k.m.visible = true;
      k.m.material.opacity = 0.5;
    },
    update(dt) {
      for (const p of smoke) {
        if (!p.s.visible) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.s.visible = false;
          p.s.material.opacity = 0;
          continue;
        }
        const t = 1 - p.life / p.max;
        const sc = p.s.scale.x + p.grow * dt;
        p.s.scale.set(sc, sc, 1);
        p.s.position.y += dt * 1.1;
        p.s.material.opacity = 0.55 * (1 - t);
      }
      for (const k of skids) {
        if (!k.m.visible) continue;
        k.life -= dt;
        if (k.life <= 0) {
          k.m.visible = false;
          k.m.material.opacity = 0;
          continue;
        }
        k.m.material.opacity = Math.min(0.5, k.life / 8);
      }
    },
  };
}
