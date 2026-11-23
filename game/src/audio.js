// audio.js — every sound in Sunset Bay is synthesized live with WebAudio. No audio files.

const AudioFX = {
  ctx: null, master: null, muted: false, engineOsc: null, engineGain: null, sirenOsc: null, sirenGain: null, sirenTimer: 0,

  ensure() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      // Engine hum: a low sawtooth whose pitch follows speed.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 420;
      this.engineOsc.connect(lp); lp.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engineOsc.start();
      // Police siren: two alternating tones.
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 720;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      return true;
    } catch (e) { return false; }
  },

  resume() { if (this.ensure() && this.ctx.state === 'suspended') this.ctx.resume(); },

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.35;
  },

  setEngine(speed01, driving) {
    if (!this.ctx || this.muted) { if (this.engineGain) this.engineGain.gain.value = 0; return; }
    this.engineGain.gain.value = driving ? 0.05 + speed01 * 0.06 : 0.015;
    this.engineOsc.frequency.value = 55 + speed01 * 110;
  },

  setSiren(on, dt) {
    if (!this.ctx) return;
    if (!on || this.muted) { this.sirenGain.gain.value = 0; return; }
    this.sirenTimer += dt;
    const hi = Math.floor(this.sirenTimer * 2.2) % 2 === 0;
    this.sirenOsc.frequency.value = hi ? 880 : 660;
    this.sirenGain.gain.value = 0.045;
  },

  blip(freq, dur, type, vol) {
    if (!this.ensure() || this.muted) return;
    try {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.2, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.connect(g); g.connect(this.master);
      o.start(); o.stop(this.ctx.currentTime + dur);
    } catch (e) {}
  },

  noiseBurst(dur, vol) {
    if (!this.ensure() || this.muted) return;
    try {
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const g = this.ctx.createGain(); g.gain.value = vol || 0.3;
      src.connect(g); g.connect(this.master); src.start();
    } catch (e) {}
  },

  gunshot() { this.noiseBurst(0.12, 0.35); this.blip(180, 0.08, 'square', 0.12); },
  pickup() { this.blip(880, 0.09, 'sine', 0.22); setTimeout(() => this.blip(1320, 0.12, 'sine', 0.22), 80); },
  crash() { this.noiseBurst(0.25, 0.3); this.blip(70, 0.2, 'sine', 0.25); },
  jingle() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, 0.22, 'triangle', 0.22), i * 110)); },
  busted() { [392, 330, 262].forEach((f, i) => setTimeout(() => this.blip(f, 0.3, 'sawtooth', 0.18), i * 160)); },
  click() { this.blip(1200, 0.04, 'square', 0.08); },
};
SB.audio = AudioFX;
