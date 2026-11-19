/**
 * Pure threshold state machine & nonlinear dissolution math for `excessus`.
 * Models the passage from isolated form (Discontinuitas) through ecstatic overload
 * (Exaltatio / Excessus) to structural collapse (Dissolutio).
 */

export const PHASES = [
  {
    id: 'discontinuitas',
    numeral: 'I',
    name: 'DISCONTINUITAS',
    caption: 'Bound form. Stillness before expenditure.',
    min: 0.0,
    max: 0.30,
  },
  {
    id: 'exaltatio',
    numeral: 'II',
    name: 'EXALTATIO',
    caption: 'Tension swells against the vessel walls.',
    min: 0.30,
    max: 0.65,
  },
  {
    id: 'excessus',
    numeral: 'III',
    name: 'EXCESSUS',
    caption: 'Boundary corrodes; beauty and terror converge.',
    min: 0.65,
    max: 0.92,
  },
  {
    id: 'dissolutio',
    numeral: 'IV',
    name: 'DISSOLUTIO',
    caption: 'Continuity achieved. Form surrenders to void.',
    min: 0.92,
    max: 1.01,
  },
];

export const SOVEREIGN_POINT = 0.92;

/** Return the active phase metadata for an assent value in [0, 1] */
export function getPhase(assent) {
  const clamped = Math.max(0, Math.min(1, assent));
  for (const p of PHASES) {
    if (clamped >= p.min && clamped < p.max) return p;
  }
  return PHASES[PHASES.length - 1];
}

/**
 * Computes nonlinear audio/visual expenditure curves from a linear `assent` value [0..1].
 * - `noiseWall`: cubic rise so quiet stillness holds before erupting
 * - `feedback`: saturates sharply near the sovereign point
 * - `corrosion`: distortion & spectral tearing intensity
 * - `integrity`: remaining structural cohesion of the vessel (1 -> 0)
 */
export function computeExpenditure(assent, feedbackBias = 0.5, corrosionBias = 0.5) {
  const a = Math.max(0, Math.min(1, assent));
  const noiseWall = Math.min(1, Math.pow(a, 2.2) * (0.65 + corrosionBias * 0.55));
  const feedback = Math.min(0.94, 0.12 + Math.pow(a, 1.5) * (0.55 + feedbackBias * 0.35));
  const corrosion = Math.min(1, Math.pow(a, 1.7) * (0.5 + corrosionBias * 0.7));
  const integrity = Math.max(0, 1 - Math.pow(a, 1.85));
  const cardiacHz = 0.42 + Math.pow(a, 1.6) * 2.4;

  return {
    assent: a,
    noiseWall,
    feedback,
    corrosion,
    integrity,
    cardiacHz,
  };
}

/**
 * Stateful threshold controller handling hold-to-assent ascent, slow recoil,
 * and automatic sovereign collapse -> void cooldown.
 */
export class ThresholdState {
  constructor() {
    this.assent = 0.08;
    this.holding = false;
    this.locked = false;
    this.collapsing = false;
    this.collapseTimer = 0;
    this.collapseCount = 0;
  }

  setManual(val) {
    this.collapsing = false;
    this.assent = Math.max(0, Math.min(1, val));
    if (this.assent >= SOVEREIGN_POINT) {
      this.triggerCollapse();
    }
  }

  triggerCollapse() {
    if (this.collapsing) return;
    this.collapsing = true;
    this.collapseTimer = 4.2; // seconds of ecstatic saturation before abrupt cut to void
    this.collapseCount += 1;
  }

  reset() {
    this.assent = 0.06;
    this.holding = false;
    this.collapsing = false;
    this.collapseTimer = 0;
  }

  /** Advance state by `dtSec` seconds. Returns `{ justCollapsed, justReset }`. */
  step(dtSec) {
    let justCollapsed = false;
    let justReset = false;

    if (this.collapsing) {
      this.assent = Math.min(1, this.assent + dtSec * 0.14);
      this.collapseTimer -= dtSec;
      if (this.collapseTimer <= 0) {
        this.collapsing = false;
        this.holding = false;
        this.assent = 0.04;
        justReset = true;
      }
      return { justCollapsed, justReset };
    }

    if (this.holding) {
      // Accelerates gently as the participant consents further
      const rate = 0.075 + this.assent * 0.09;
      this.assent = Math.min(1, this.assent + dtSec * rate);
      if (this.assent >= SOVEREIGN_POINT) {
        this.triggerCollapse();
        justCollapsed = true;
      }
    } else if (!this.locked) {
      // Slow gravitational recoil toward stillness
      this.assent = Math.max(0.05, this.assent - dtSec * 0.022);
    }

    return { justCollapsed, justReset };
  }
}
