import * as THREE from 'three';
import { makeCar, makeBike } from './vehicles.js';

export const DIALOGUE = {
  1: { name: 'MARA VOSS', role: 'FIXER', line: 'Package goes to Port Ember. No stops, no questions — and don\'t scratch the paint.', who: 'mara' },
  2: { name: 'DEKE RAMOS', role: 'WHEELMAN', line: 'Fare\'s waiting at Marina Point. Drive like a cabbie, not a getaway man. Yet.', who: 'deke' },
  3: { name: 'DEKE RAMOS', role: 'WHEELMAN', line: 'Sunset Row loves a sideways car. Give them a drift worth watching.', who: 'deke' },
  4: { name: 'MARA VOSS', role: 'FIXER', line: 'Three crates at the docks. The harbour master looks the other way — for a price.', who: 'mara' },
  5: { name: 'MARA VOSS', role: 'FIXER', line: 'Three stars and counting. Stay hot for 45 seconds and they\'ll know your name.', who: 'mara' },
  6: { name: 'DEKE RAMOS', role: 'WHEELMAN', line: 'That courier bike knows Craneside better than you do. Stay on it.', who: 'deke' },
  7: { name: 'VIC TORRES', role: 'CREW BOSS', line: 'You think you can push me out of my own harbour? Come and try, kid.', who: 'vic' },
  8: { name: 'MARA VOSS', role: 'FIXER', line: 'Night drops — Northgate, then Coral Row. Be done before the sun comes up.', who: 'mara' },
};

const DEFS = [
  { id: 1, name: 'First Delivery', payout: 250, desc: 'Take the package to Port Ember',
    steps: [{ type: 'goto', pos: [350, 350], label: 'Deliver the package to Port Ember' }] },
  { id: 2, name: 'Taxi Trouble', payout: 350, desc: 'Pick up the fare, drop them at Palms Beach',
    steps: [
      { type: 'goto', pos: [-300, -100], label: 'Pick up the passenger at Marina Point' },
      { type: 'goto', pos: [-420, 200], label: 'Drop them off at Palms Beach' },
    ] },
  { id: 3, name: 'Lowrider Nights', payout: 450, desc: 'Drift for the crowd, then cruise Sunset Row and the Boardwalk',
    steps: [
      { type: 'drift', target: 1500, label: 'Drift for the crowd' },
      { type: 'goto', pos: [-250, 100], label: 'Show the lowrider at Sunset Row' },
      { type: 'goto', pos: [-420, 300], label: 'Finish the cruise at the Boardwalk' },
    ] },
  { id: 4, name: 'Crate Expectations', payout: 500, desc: 'Grab 3 crates around the docks',
    steps: [{ type: 'collect', pos: [[320, 320], [380, 220], [260, 380]], label: 'Collect the crates at Port Ember (0/3)' }] },
  { id: 5, name: 'Heat Wave', payout: 600, desc: 'Hold wanted level 3 for 45 seconds',
    steps: [{ type: 'survive', seconds: 45, label: 'Stay hot — survive 45s at 3 stars' }] },
  { id: 6, name: 'Harbor Lights', payout: 750, desc: 'Chase the courier bike through Craneside',
    steps: [{ type: 'chase', label: 'Stay on the courier bike' }] },
  { id: 7, name: 'Harbor Showdown', payout: 1200, desc: 'Ram Vic Torres and his crew car 3 times',
    steps: [{ type: 'boss', label: 'Ram the crew car — 0/3 hits' }] },
  { id: 8, name: 'Midnight Run', payout: 800, desc: 'Night delivery: Northgate, then Coral Row, before dawn',
    steps: [
      { type: 'goto', pos: [350, -350], label: 'Night drop at Northgate' },
      { type: 'goto', pos: [-250, 400], label: 'Final drop at Coral Row' },
    ] },
];

export function initMissions(G) {
  const { scene, rng } = G;
  const M = {
    defs: DEFS,
    done: new Set(G.save?.missionsDone || []),
    active: null,
    marker: null,
    target: null,
    startNext() {
      if (M.active) { G.toast('Mission already running: ' + M.active.def.name); return false; }
      const def = DEFS.find((d) => !M.done.has(d.id));
      if (!def) { G.toast('All 8 story missions complete — Ember Bay is yours'); return false; }
      return M.startId(def.id);
    },
    startId(id) {
      const def = DEFS.find((d) => d.id === id);
      if (!def || M.active) return false;
      M.active = { def, stepIdx: 0, collected: 0, timer: 0, hits: 0, chaseTime: 0, driftBase: G.driftBanked || 0 };
      if (def.id === 5) G.police.setWanted(Math.max(G.police.wanted, 3));
      if (def.id === 8) G.setClock(23.5);
      G.hud.showMission(`${def.name} — ${def.desc}`);
      const dlg = DIALOGUE[def.id];
      if (dlg && G.hud.dialogue) G.hud.dialogue(dlg.name, dlg.role, dlg.line, dlg.who);
      M.placeMarker();
      G.toast(`Mission started: ${def.name} ($${def.payout})`);
      return true;
    },
    placeMarker() {
      M.clearMarker();
      const a = M.active;
      if (!a) return;
      const step = a.def.steps[a.stepIdx];
      if (step.type === 'drift') {
        G.hud.showMission(`${a.def.name} — Drift for the crowd — 0/${step.target} pts`);
        return;
      }
      let pos = null;
      if (step.type === 'goto') pos = step.pos;
      else if (step.type === 'collect') pos = step.pos[a.collected];
      else if (step.type === 'chase' || step.type === 'boss') {
        if (!M.target) M.spawnTarget(step.type);
        pos = M.target ? [M.target.pos.x, M.target.pos.z] : [300, 200];
      }
      if (!pos) return;
      const grp = new THREE.Group();
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(2.2),
        new THREE.MeshStandardMaterial({ color: 0xffe14d, emissive: 0xaa8800, emissiveIntensity: 1.4 }),
      );
      gem.position.y = 6;
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6, 1.6, 30, 10, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
      );
      beam.position.y = 15;
      grp.add(gem, beam);
      grp.position.set(pos[0], 0, pos[1]);
      grp.userData.gem = gem;
      scene.add(grp);
      M.marker = grp;
      const label = step.type === 'collect'
        ? `${step.label.split('(')[0]}(${a.collected}/3)`
        : step.type === 'boss' ? `Ram the crew car — ${a.hits}/3 hits` : step.label;
      G.hud.showMission(`${a.def.name} — ${label}`);
    },
    clearMarker() {
      if (M.marker) { scene.remove(M.marker); M.marker = null; }
      if (M.target) { scene.remove(M.target.group); M.target = null; }
    },
    spawnTarget(type) {
      const v = type === 'chase' ? makeBike(G, 0x2a6fd8) : makeCar(G, 'sedan', 0);
      v.group.position.set(300, 0, 200);
      scene.add(v.group);
      const waypoints = type === 'chase'
        ? [[300, 200], [300, -100], [-100, -100], [-100, 200], [300, 200]]
        : [[320, 320], [380, 380], [260, 320], [320, 260]];
      M.target = { ...v, pos: v.group.position, heading: 0, wp: 0, waypoints, speed: type === 'chase' ? 24 : 16, hitCooldown: 0 };
    },
    completeStep() {
      const a = M.active;
      a.stepIdx++;
      if (a.stepIdx >= a.def.steps.length) M.completeMission();
      else M.placeMarker();
    },
    completeMission() {
      const a = M.active;
      G.money += a.def.payout;
      G.respect = Math.min(100, G.respect + 12);
      M.done.add(a.def.id);
      G.toast(`${a.def.name} complete — +$${a.def.payout}`);
      G.hud.showMission(`${a.def.name} complete — +$${a.def.payout}`);
      G.saveGame();
      M.clearMarker();
      M.active = null;
    },
    failMission(why) {
      const a = M.active;
      if (!a) return;
      G.toast(`Mission failed: ${why}`);
      G.hud.showMission('');
      M.clearMarker();
      M.active = null;
    },
    banner() {
      const a = M.active;
      if (!a) return null;
      const step = a.def.steps[a.stepIdx];
      let objective = step.label;
      let timer = null;
      if (step.type === 'drift') {
        const banked = (G.driftBanked || 0) - (a.driftBase || 0);
        const live = G.vehicle && G.vehicle.drift ? Math.round(G.vehicle.drift.points * G.vehicle.drift.combo) : 0;
        objective = `Drift for the crowd — ${Math.min(step.target, banked + live)}/${step.target} pts`;
      } else if (step.type === 'survive') {
        timer = Math.max(0, Math.ceil(step.seconds - a.timer));
        objective = `Stay hot — survive ${timer}s at 3 stars`;
      } else if (step.type === 'collect') {
        objective = `${step.label.split('(')[0]}(${a.collected}/3)`;
      } else if (step.type === 'boss') {
        objective = `Ram the crew car — ${a.hits}/3 hits`;
      } else if (step.type === 'chase') {
        objective = `Stay on the courier bike — ${Math.floor(a.chaseTime)}/8s`;
      }
      const nextStep = a.def.steps[a.stepIdx + 1];
      return {
        chapter: a.def.id, name: a.def.name, objective, hint: a.def.desc,
        stage: a.stepIdx + 1, stages: a.def.steps.length,
        next: nextStep ? nextStep.label : 'Finish the job', timer,
      };
    },
    update(dt) {
      if (M.marker) M.marker.userData.gem.rotation.y += dt * 2.4;
      const a = M.active;
      if (!a) return;
      const step = a.def.steps[a.stepIdx];
      const pp = G.playerPos;
      if (step.type === 'drift') {
        const banked = (G.driftBanked || 0) - (a.driftBase || 0);
        const live = G.vehicle && G.vehicle.drift ? Math.round(G.vehicle.drift.points * G.vehicle.drift.combo) : 0;
        const total = banked + live;
        G.hud.showMission(`${a.def.name} — Drift for the crowd — ${Math.min(step.target, total)}/${step.target} pts (hold SPACE + steer)`);
        if (total >= step.target) M.completeStep();
      } else if (step.type === 'goto') {
        if (Math.hypot(pp.x - step.pos[0], pp.z - step.pos[1]) < 9) M.completeStep();
      } else if (step.type === 'collect') {
        const p = step.pos[a.collected];
        if (Math.hypot(pp.x - p[0], pp.z - p[1]) < 7) {
          a.collected++;
          G.money += 25;
          if (a.collected >= step.pos.length) M.completeStep();
          else M.placeMarker();
        }
      } else if (step.type === 'survive') {
        if (G.police.wanted >= 3) {
          a.timer += dt;
          G.hud.showMission(`${a.def.name} — hold on: ${Math.ceil(step.seconds - a.timer)}s left`);
          if (a.timer >= step.seconds) M.completeStep();
        } else {
          G.hud.showMission(`${a.def.name} — get to 3 stars first!`);
        }
      } else if (step.type === 'chase' || step.type === 'boss') {
        const t = M.target;
        if (!t) { M.placeMarker(); return; }
        const wp = t.waypoints[t.wp];
        const dx = wp[0] - t.pos.x, dz = wp[1] - t.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 8) t.wp = (t.wp + 1) % t.waypoints.length;
        const targetHeading = Math.atan2(dx, dz);
        let dh = targetHeading - t.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        t.heading += dh * Math.min(1, dt * 2);
        t.pos.x += Math.sin(t.heading) * t.speed * dt;
        t.pos.z += Math.cos(t.heading) * t.speed * dt;
        t.group.position.copy(t.pos);
        t.group.rotation.y = t.heading;
        if (M.marker) M.marker.position.set(t.pos.x, 0, t.pos.z);
        const pd = Math.hypot(pp.x - t.pos.x, pp.z - t.pos.z);
        t.hitCooldown -= dt;
        if (step.type === 'chase') {
          if (pd < 12) {
            a.chaseTime += dt;
            G.hud.showMission(`${a.def.name} — stay on them: ${a.chaseTime.toFixed(0)}/8s`);
            if (a.chaseTime >= 8) M.completeStep();
          } else {
            a.chaseTime = Math.max(0, a.chaseTime - dt);
            G.hud.showMission(`${a.def.name} — catch the courier bike!`);
          }
        } else {
          if (pd < 7 && t.hitCooldown <= 0 && (G.vehicle ? Math.abs(G.vehicle.speed) > 8 : false)) {
            a.hits++;
            t.hitCooldown = 2;
            G.toast(`Hit ${a.hits}/3 on the crew car!`);
            if (a.hits >= 3) M.completeStep();
            else M.placeMarker();
          }
          G.hud.showMission(`${a.def.name} — ram the crew car: ${a.hits}/3 hits`);
        }
      }
    },
  };
  return M;
}

