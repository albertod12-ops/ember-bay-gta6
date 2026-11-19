export function initAudio(G) {
  const STATIONS = [
    { name: 'BAY FM 98.2', song: 'Sunset Drive', chords: [110.0, 87.31, 130.81, 98.0] },
    { name: 'EMBER 101.5', song: 'Midnight Overdrive', chords: [98.0, 110.0, 87.31, 123.47] },
  ];
  const A = {
    ctx: null, master: null, radioOn: true, sirenOn: false,
    step: 0, nextTime: 0, sirenOsc: null, sirenGain: null, sirenHi: false, sirenNext: 0,
    engOsc: null, engGain: null, engFilter: null, stationIdx: 0,
    station() { return STATIONS[A.stationIdx]; },
    get chords() { return A.station().chords; },
    prevStation() {
      A.stationIdx = (A.stationIdx + 1) % STATIONS.length;
      A.step = 0;
      const s = A.station();
      G.toast(`${s.name} — ${s.song}`);
    },
    setSound(on) {
      G.soundOn = on;
      if (A.master) A.master.gain.value = on ? 0.5 : 0;
    },
    start() {
      if (A.ctx) {
        if (A.ctx.state === 'suspended') A.ctx.resume();
        return;
      }
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        A.ctx = new Ctx();
        A.master = A.ctx.createGain();
        A.master.gain.value = 0.5;
        A.master.connect(A.ctx.destination);
        A.sirenOsc = A.ctx.createOscillator();
        A.sirenOsc.type = 'square';
        A.sirenOsc.frequency.value = 720;
        A.sirenGain = A.ctx.createGain();
        A.sirenGain.gain.value = 0;
        A.sirenOsc.connect(A.sirenGain);
        A.sirenGain.connect(A.master);
        A.sirenOsc.start();
        A.engOsc = A.ctx.createOscillator();
        A.engOsc.type = 'sawtooth';
        A.engOsc.frequency.value = 55;
        A.engFilter = A.ctx.createBiquadFilter();
        A.engFilter.type = 'lowpass';
        A.engFilter.frequency.value = 420;
        A.engGain = A.ctx.createGain();
        A.engGain.gain.value = 0;
        A.engOsc.connect(A.engFilter);
        A.engFilter.connect(A.engGain);
        A.engGain.connect(A.master);
        A.engOsc.start();
        A.nextTime = A.ctx.currentTime + 0.1;
      } catch (e) { A.ctx = null; }
    },
    toggleRadio() {
      const s = A.station();
      G.toast(A.radioOn ? `${s.name} — ${s.song}` : 'Radio off');
    },
    note(freq, t, dur, type, vol) {
      const o = A.ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(A.master);
      o.start(t);
      o.stop(t + dur + 0.05);
    },
    update(dt) {
      if (!A.ctx) return;
      if (A.radioOn) {
        while (A.nextTime < A.ctx.currentTime + 0.18) {
          const bar = Math.floor(A.step / 8) % 4;
          const s = A.step % 8;
          const root = A.chords[bar];
          if (s % 2 === 0) {
            A.note(root * 2, A.nextTime, 0.5, 'sawtooth', 0.028);
            A.note(root * 2.5, A.nextTime, 0.5, 'sawtooth', 0.02);
            A.note(root * 3, A.nextTime, 0.5, 'sawtooth', 0.016);
          }
          if (s === 0 || s === 4) A.note(root / 2, A.nextTime, 0.45, 'triangle', 0.075);
          if (s === 6) A.note(root * 4, A.nextTime, 0.2, 'sine', 0.035);
          A.step++;
          A.nextTime += 0.24;
        }
      }
      const want = G.police.wanted > 0;
      if (want && A.ctx.currentTime >= A.sirenNext) {
        A.sirenHi = !A.sirenHi;
        A.sirenOsc.frequency.setTargetAtTime(A.sirenHi ? 950 : 720, A.ctx.currentTime, 0.02);
        A.sirenNext = A.ctx.currentTime + 0.45;
      }
      A.sirenGain.gain.setTargetAtTime(want ? 0.035 : 0, A.ctx.currentTime, 0.1);
      const spd = G.vehicle ? Math.abs(G.vehicle.speed) : 0;
      A.engOsc.frequency.setTargetAtTime(52 + spd * 3.4, A.ctx.currentTime, 0.08);
      A.engGain.gain.setTargetAtTime(spd > 1 ? 0.045 : 0, A.ctx.currentTime, 0.12);
    },
  };
  return A;
}
