/**
 * Zero-dependency Web Audio API orchestral-noise & feedback dissolution engine.
 * Synthesizes:
 *  - Bowed abyssal sub-strings & dark brass formant ensemble
 *  - Self-oscillating saturating feedback delay network (FDN)
 *  - Continuous sculpted granular/filtered noise wall
 *  - Cavernous 7.5s stone-vault convolution reverb
 *  - Uneven cardiac timpani / war-drum strikes
 */

import { computeExpenditure } from './threshold.js';

// Low C1 (32.70 Hz) harmonic/microtonal abyssal cluster
const ROOT_HZ = 32.7032;
const STRING_RATIOS = [1.0, 1.498, 2.0, 2.118, 3.012, 3.165]; // root, P5, P8, m9, P12, tritone-oct

export class ExcessusAudio {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.master = null;
    this.reverbSend = null;
    this.stringGain = null;
    this.stringFilter = null;
    this.noiseGain = null;
    this.noiseFilter = null;
    this.fbGain = null;
    this.shaper = null;
    this.oscillators = [];

    this.running = false;
    this.feedbackBias = 0.6;
    this.corrosionBias = 0.65;
    this.drumCooldown = 0;
    this.lastStrike = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    // Brickwall safety limiter so ecstatic overload stays powerful yet safe for ears
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -9;
    limiter.knee.value = 4;
    limiter.ratio.value = 18;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.2;

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.0001;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.8;

    // 7.5-second dark abyssal stone convolution reverb
    const conv = this.ctx.createConvolver();
    conv.buffer = this.buildAbyssalIR(7.5, 2.2);

    const revLP = this.ctx.createBiquadFilter();
    revLP.type = 'lowpass';
    revLP.frequency.value = 2400;

    this.reverbSend = this.ctx.createGain();
    this.reverbSend.gain.value = 0.85;

    this.reverbSend.connect(conv);
    conv.connect(revLP);
    revLP.connect(limiter);

    // Saturating Feedback Delay Network (FDN)
    this.fdnIn = this.ctx.createGain();
    const delayA = this.ctx.createDelay(2.0);
    const delayB = this.ctx.createDelay(2.0);
    delayA.delayTime.value = 0.37;
    delayB.delayTime.value = 0.53;

    this.fbGain = this.ctx.createGain();
    this.fbGain.gain.value = 0.18;

    const fbFilter = this.ctx.createBiquadFilter();
    fbFilter.type = 'bandpass';
    fbFilter.frequency.value = 640;
    fbFilter.Q.value = 1.4;

    this.shaper = this.ctx.createWaveShaper();
    this.shaper.curve = this.makeCorrosionCurve(0.25);
    this.shaper.oversample = '2x';

    this.fdnIn.connect(delayA);
    delayA.connect(this.shaper);
    this.shaper.connect(fbFilter);
    fbFilter.connect(delayB);
    delayB.connect(this.fbGain);
    this.fbGain.connect(delayA);
    fbFilter.connect(this.reverbSend);
    fbFilter.connect(limiter);

    this.dryBus = this.ctx.createGain();
    this.dryBus.connect(limiter);

    limiter.connect(this.master);
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.setupBowedEnsemble();
    this.setupNoiseWall();
  }

  buildAbyssalIR(durationSec, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * durationSec);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const env = Math.pow(1 - t, decay);
        const w = Math.random() * 2 - 1;
        lp += (0.06 + 0.25 * (1 - t)) * (w - lp);
        data[i] = lp * env;
      }
    }
    return buf;
  }

  makeCorrosionCurve(amount) {
    const k = 4 + amount * 95;
    const n = 512;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      c[i] = Math.tanh(k * x + amount * 0.4 * Math.sin(x * Math.PI * 3));
    }
    return c;
  }

  setupBowedEnsemble() {
    this.stringFilter = this.ctx.createBiquadFilter();
    this.stringFilter.type = 'lowpass';
    this.stringFilter.frequency.value = 340;
    this.stringFilter.Q.value = 2.4;

    this.stringGain = this.ctx.createGain();
    this.stringGain.gain.value = 0.24;

    // Slow bow-pressure LFO
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.19;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 7.5;
    lfo.connect(lfoGain);
    lfo.start();

    STRING_RATIOS.forEach((ratio, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = idx < 2 ? 'sawtooth' : idx % 2 === 0 ? 'triangle' : 'sawtooth';
      osc.frequency.value = ROOT_HZ * ratio;
      lfoGain.connect(osc.detune);

      const g = this.ctx.createGain();
      // Upper dissonant harmonics start quieter and bloom as assent rises
      g.gain.value = idx < 3 ? 0.22 : 0.05;
      osc.connect(g);
      g.connect(this.stringFilter);
      osc.start();
      this.oscillators.push({ osc, gain: g, idx });
    });

    this.stringFilter.connect(this.stringGain);
    this.stringGain.connect(this.dryBus);
    this.stringGain.connect(this.reverbSend);
    this.stringGain.connect(this.fdnIn);
  }

  setupNoiseWall() {
    const rate = this.ctx.sampleRate;
    const len = rate * 4;
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + w * 0.029;
        b1 = 0.985 * b1 + w * 0.032;
        b2 = 0.950 * b2 + w * 0.048;
        d[i] = (b0 + b1 + b2 + w * 0.18) * 0.65;
      }
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.frequency.value = 420;
    this.noiseFilter.Q.value = 1.6;

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0.002;

    src.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.fdnIn);
    this.noiseGain.connect(this.reverbSend);
    src.start();
  }

  async start() {
    this.init();
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.running = true;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(0.75, now, 0.9);
    this.triggerTimpani(0.55);
  }

  stop() {
    this.running = false;
    if (this.ctx && this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0.0001, now, 0.35);
    }
  }

  /** Abruptly cut dry signal into cold reverberant void on post-collapse reset */
  cutToVoid() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.noiseGain.gain.setTargetAtTime(0.001, now, 0.04);
    this.fbGain.gain.setTargetAtTime(0.08, now, 0.05);
    this.stringFilter.frequency.setTargetAtTime(180, now, 0.06);
    this.triggerTimpani(0.9);
  }

  update(assent, dtSec) {
    if (!this.running || !this.ctx) return;
    const now = this.ctx.currentTime;
    const exp = computeExpenditure(assent, this.feedbackBias, this.corrosionBias);

    // Open orchestral-brass filter & bloom dissonant upper harmonics
    const targetFreq = 220 + Math.pow(exp.assent, 1.8) * 4400;
    this.stringFilter.frequency.setTargetAtTime(targetFreq, now, 0.12);
    this.stringFilter.Q.setTargetAtTime(2.0 + exp.corrosion * 5.5, now, 0.15);

    this.oscillators.forEach(({ osc, gain, idx }) => {
      if (idx >= 3) {
        gain.gain.setTargetAtTime(0.03 + exp.assent * 0.22, now, 0.2);
        // Microtonal pitch sag / tension drift under overload
        osc.detune.setTargetAtTime((idx % 2 === 0 ? 1 : -1) * exp.corrosion * 38, now, 0.25);
      }
    });

    // Sculpt noise wall & feedback loop
    this.noiseGain.gain.setTargetAtTime(0.004 + exp.noiseWall * 0.42, now, 0.12);
    this.noiseFilter.frequency.setTargetAtTime(300 + exp.corrosion * 3200, now, 0.18);
    this.fbGain.gain.setTargetAtTime(exp.feedback * 0.88, now, 0.15);

    // Uneven cavernous timpani / war-drum pulse accelerating with assent
    this.drumCooldown -= dtSec;
    if (this.drumCooldown <= 0) {
      this.triggerTimpani(0.32 + exp.assent * 0.62);
      const baseInterval = 1 / exp.cardiacHz;
      // Organic irregularity so it breathes like a terrified pulse rather than a metronome
      this.drumCooldown = baseInterval * (0.72 + Math.random() * 0.55);
    }
  }

  triggerTimpani(amp) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.lastStrike = Math.max(this.lastStrike, amp);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(98, now);
    osc.frequency.exponentialRampToValueAtTime(27, now + 0.34);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(amp * 0.85, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);

    osc.connect(env);
    env.connect(this.dryBus);
    env.connect(this.reverbSend);
    env.connect(this.fdnIn);

    osc.start(now);
    osc.stop(now + 0.75);
  }

  getFrame() {
    this.lastStrike *= 0.88;
    if (!this.analyser) {
      return { wave: null, energy: 0, strike: this.lastStrike };
    }
    const freq = new Uint8Array(this.analyser.frequencyBinCount);
    const wave = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteFrequencyData(freq);
    this.analyser.getByteTimeDomainData(wave);

    let sum = 0;
    for (let i = 0; i < 64; i++) sum += freq[i];
    return { wave, energy: sum / (64 * 255), strike: this.lastStrike };
  }
}
