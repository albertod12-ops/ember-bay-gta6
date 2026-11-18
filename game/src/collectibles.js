// Sunset Tapes: 20 collectible tapes hidden around Ember Bay. Walk or
// drive into one to collect it: +$50, +1 respect.
import * as THREE from 'three';

const SPOTS = [
  [-480, -380], [-480, -100], [-480, 150], [-480, 380], [-430, 0],
  [350, 350], [380, 220], [260, 380], [400, 120], [300, 60],
  [0, 0], [-100, -100], [100, 100], [-250, -250], [250, -250],
  [350, -350], [-250, 400], [150, -350], [-350, 250], [420, -420],
];

export function initTapes(G) {
  const { scene } = G;
  const T = {
    found: new Set(G.save?.tapesFound || []),
    items: [],
  };
  const geo = new THREE.BoxGeometry(0.9, 0.5, 0.14);
  SPOTS.forEach(([x, z], i) => {
    if (T.found.has(i)) return;
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: 0xff6fa5, emissive: 0xd81a6a, emissiveIntensity: 1.1, roughness: 0.4,
    }));
    m.position.set(x, 1.1, z);
    scene.add(m);
    T.items.push({ mesh: m, x, z, idx: i, phase: i * 0.7 });
  });
  T.update = (dt) => {
    const pp = G.playerPos;
    for (let i = T.items.length - 1; i >= 0; i--) {
      const t = T.items[i];
      t.phase += dt * 2;
      t.mesh.rotation.y += dt * 1.8;
      t.mesh.position.y = 1.1 + Math.sin(t.phase) * 0.25;
      if (Math.hypot(pp.x - t.x, pp.z - t.z) < 3.5) {
        scene.remove(t.mesh);
        T.items.splice(i, 1);
        T.found.add(t.idx);
        G.tapesFound = T.found.size;
        G.money += 50;
        G.respect = Math.min(100, G.respect + 1);
        G.toast(`Sunset Tape found! (${T.found.size}/20) — +$50`);
        if (T.found.size === 20) { G.money += 1000; G.toast('ALL 20 TAPES — bonus +$1000!'); }
        G.saveGame();
      }
    }
  };
  G.tapesFound = T.found.size;
  return T;
}
