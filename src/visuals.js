/**
 * Chiaroscuro Dissolution Canvas2D Renderer for `excessus`.
 * Visualizes the surrender of bounded discontinuity into continuous static/void:
 * a fragile bone-white vessel fractures, bleeds arterial crimson, tears horizontally,
 * and disperses into particles at the sovereign point of collapse.
 */

import { SOVEREIGN_POINT, computeExpenditure } from './threshold.js';

export class DissolutionRenderer {
  constructor(canvas, state, audio) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.audio = audio;
    this.W = 0;
    this.H = 0;
    this.t = 0;
    this.motes = [];

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.seedMotes(180);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.canvas.width = Math.floor(this.W * dpr);
    this.canvas.height = Math.floor(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  seedMotes(n) {
    this.motes = Array.from({ length: n }, () => {
      const angle = Math.random() * Math.PI * 2;
      return {
        angle,
        baseDist: 0.92 + Math.random() * 0.22,
        drift: 0.3 + Math.random() * 1.4,
        size: 0.7 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
      };
    });
  }

  render() {
    this.t += 0.01;
    const ctx = this.ctx;
    const { W, H } = this;
    const frame = this.audio.getFrame();
    const exp = computeExpenditure(
      this.state.assent,
      this.audio.feedbackBias,
      this.audio.corrosionBias,
    );
    const inCollapse = this.state.assent >= SOVEREIGN_POINT;

    // Smearing persistence increases with overload
    ctx.fillStyle = inCollapse
      ? 'rgba(18, 4, 5, 0.24)'
      : `rgba(5, 5, 6, ${0.22 - exp.assent * 0.1})`;
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const baseR = Math.min(W, H) * 0.24;

    // Arterial crimson radial glow emerging from the abyss
    const rad = ctx.createRadialGradient(cx, cy, 4, cx, cy, Math.max(W, H) * 0.62);
    const crimsonAlpha = Math.min(0.45, Math.pow(exp.assent, 1.7) * 0.42 + frame.strike * 0.12);
    rad.addColorStop(0, `rgba(145, 16, 20, ${crimsonAlpha})`);
    rad.addColorStop(0.5, `rgba(42, 6, 8, ${crimsonAlpha * 0.35})`);
    rad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, W, H);

    // 1. Dissolving Vessel Boundary (bounded form yielding to continuity)
    ctx.save();
    ctx.translate(cx, cy);
    const tremor = (exp.corrosion * 9 + frame.strike * 7) * (inCollapse ? 2.1 : 1);
    if (tremor > 0.5) {
      ctx.translate((Math.random() - 0.5) * tremor, (Math.random() - 0.5) * tremor);
    }

    const ringCount = 3;
    for (let rIdx = 0; rIdx < ringCount; rIdx++) {
      const r = baseR * (0.78 + rIdx * 0.22) * (1 + frame.energy * 0.16);
      const pts = 96;
      ctx.beginPath();
      for (let i = 0; i <= pts; i++) {
        const a = (i / pts) * Math.PI * 2;
        const waveDisplace =
          Math.sin(a * (3 + rIdx * 2) + this.t * (1.2 + exp.assent * 5)) *
          (4 + exp.corrosion * 38);
        const tear =
          exp.corrosion > 0.35 && Math.random() < exp.corrosion * 0.28
            ? (Math.random() - 0.5) * exp.corrosion * 68
            : 0;
        const rr = r + waveDisplace + tear;
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const alpha = Math.max(0.06, exp.integrity * 0.65 + (rIdx === 1 ? 0.18 : 0));
      ctx.strokeStyle =
        inCollapse || (rIdx === 2 && exp.assent > 0.65)
          ? `rgba(198, 34, 38, ${Math.min(0.9, alpha + 0.25)})`
          : `rgba(226, 219, 206, ${alpha})`;
      ctx.lineWidth = rIdx === 1 ? 1.3 : 0.75;
      ctx.stroke();
    }

    // 2. Dispersing Continuity Particles (pulled off the vessel wall as integrity drops)
    const dispersion = 1 - exp.integrity;
    for (const m of this.motes) {
      m.angle += 0.002 + exp.assent * 0.008 * m.drift;
      const expand = m.baseDist + dispersion * (1.8 + Math.sin(this.t * 2 + m.phase) * 0.9);
      const px = Math.cos(m.angle) * baseR * expand;
      const py = Math.sin(m.angle) * baseR * expand;

      ctx.fillStyle =
        inCollapse || Math.random() < exp.corrosion * 0.3
          ? `rgba(185, 28, 28, ${0.25 + dispersion * 0.6})`
          : `rgba(226, 219, 206, ${0.18 + dispersion * 0.55})`;
      ctx.fillRect(px, py, m.size, m.size);
    }

    ctx.restore();

    // 3. Horizontal Spectral Tearing Bars (during Excessus / Dissolutio)
    if (exp.corrosion > 0.4) {
      const slits = Math.floor(exp.corrosion * 14);
      for (let i = 0; i < slits; i++) {
        if (Math.random() > exp.corrosion * 0.65) continue;
        const y = Math.random() * H;
        const h = 1 + Math.random() * (inCollapse ? 4 : 2);
        ctx.fillStyle =
          Math.random() < 0.4
            ? `rgba(175, 24, 28, ${0.12 + exp.corrosion * 0.32})`
            : `rgba(226, 219, 206, ${0.08 + exp.corrosion * 0.18})`;
        ctx.fillRect(0, y, W, h);
      }
    }

    // 4. Live Waveform Suture across the center horizon
    if (frame.wave) {
      ctx.beginPath();
      const sw = W / frame.wave.length;
      const amp = 28 + exp.assent * 165;
      for (let i = 0; i < frame.wave.length; i++) {
        const v = (frame.wave[i] - 128) / 128;
        const x = i * sw;
        const y = cy + v * amp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = inCollapse
        ? 'rgba(235, 228, 218, 0.85)'
        : `rgba(226, 219, 206, ${0.28 + exp.assent * 0.45})`;
      ctx.lineWidth = 1.0;
      ctx.stroke();
    }

    requestAnimationFrame(() => this.render());
  }
}
