// Story missions: 8 jobs with names, payouts and steps. M starts the next
// job; finishing one pays out, adds respect and saves the game.
import * as THREE from 'three';
import { makeCar, makeBike } from './vehicles.js';

const DEFS = [
  { id: 1, name: 'First Delivery', payout: 250, desc: 'Take the package to Port Ember',
    steps: [{ type: 'goto', pos: [350, 350], label: 'Deliver the package to Port Ember' }] },
  { id: 2, name: 'Taxi Trouble', payout: 350, desc: 'Pick up the fare, drop them at Palms Beach',
    steps: [
      { type: 'goto', pos: [-300, -100], label: 'Pick up the passenger at Marina Point' },
      { type: 'goto', pos: [-420, 200], label: 'Drop them off at Palms Beach' },
    ] },
  { id: 3, name: 'Lowrider Nights', payout: 450, desc: 'Cruise the lowrider to Sunset Row, then the Boardwalk',
    steps: [
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
    active: null, // {def, stepIdx, stepState, marker}
    marker: null,
    target: null, // chase/boss vehicle {drive-ish}
    startNext() {
      if (M.active) { G.toast('Mission already running: ' + M.active.def.name); return false; }
      const def = DEFS.find((d) => !M.done.has(d.id));
      if (!def) { G.toast('All 8 story missions complete — Ember Bay is yours'); return false; }
      M.active = { def, stepIdx: 0, collected: 0, timer: 0, hits: 0, chaseTime: 0 };
      if (def.id === 5) G.police.setWanted(Math.max(G.police.wanted, 3));
      if (def.id === 8) G.setClock(23.5);
      G.hud.showMission(`${def.name} — ${def.desc}`);
      M.placeMarker();
      G.toast(`Mission started: ${def.name} ($${def.payout})`);
      return true;
    },
    placeMarker() {
      M.clearMarker();
      const a = M.active;
      if (!a) return;
      const step = a.def.steps[a.stepIdx];
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
    update(dt) {
      if (M.marker) M.marker.userData.gem.rotation.y += dt * 2.4;
      const a = M.active;
      if (!a) return;
      const step = a.def.steps[a.stepIdx];
      const pp = G.playerPos;
      if (step.type === 'goto') {
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
        // drive the target along its waypoints
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
