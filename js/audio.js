// Sons synthétisés avec la Web Audio API (aucun fichier son nécessaire).
const sfx = {
  ctx: null,
  muted: false,

  // À appeler après un clic/touche (les navigateurs bloquent le son avant).
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ac = (this.ctx = new AC());
    this.master = ac.createGain();
    this.master.gain.value = this.muted ? 0 : 0.7;
    this.master.connect(ac.destination);

    // Bourdonnement du moustique : dent de scie + vibrato + filtre
    const osc = ac.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 600;
    const lfo = ac.createOscillator();
    lfo.frequency.value = 23;
    const lfoGain = ac.createGain();
    lfoGain.gain.value = 18;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1100;
    bp.Q.value = 1.2;
    this.buzzGain = ac.createGain();
    this.buzzGain.gain.value = 0;
    osc.connect(bp);
    bp.connect(this.buzzGain);
    this.buzzGain.connect(this.master);
    osc.start();
    lfo.start();
    this.buzzOsc = osc;

    const len = ac.sampleRate * 0.5;
    this.noise = ac.createBuffer(1, len, ac.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  },

  buzz(vol, pitch) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.buzzGain.gain.setTargetAtTime(vol, t, 0.06);
    this.buzzOsc.frequency.setTargetAtTime(pitch, t, 0.08);
  },

  noiseHit(dur, type, freq, vol) {
    const ac = this.ctx;
    if (!ac) return;
    const src = ac.createBufferSource();
    src.buffer = this.noise;
    const filter = ac.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    const g = ac.createGain();
    const t = ac.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur);
  },

  tone(type, f1, f2, dur, vol, delay = 0) {
    const ac = this.ctx;
    if (!ac) return;
    const o = ac.createOscillator();
    o.type = type;
    const g = ac.createGain();
    const t = ac.currentTime + delay;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  clap()  { this.noiseHit(0.12, 'bandpass', 1800, 0.9); this.noiseHit(0.05, 'highpass', 3000, 0.5); },
  splat() { this.noiseHit(0.25, 'lowpass', 500, 0.9); this.tone('sine', 220, 60, 0.25, 0.4); },
  aie()   { this.tone('square', 880, 440, 0.18, 0.12); this.tone('square', 660, 330, 0.2, 0.1, 0.12); },
  lay()   { this.tone('sine', 400, 900, 0.15, 0.3); this.tone('sine', 600, 1200, 0.15, 0.25, 0.1); },
  hatch() { [500, 700, 900].forEach((f, i) => this.tone('triangle', f, f * 1.2, 0.12, 0.2, i * 0.08)); },
  win()   { [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.25, 0.25, i * 0.14)); },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.7;
  },
};
