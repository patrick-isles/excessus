import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SOVEREIGN_POINT,
  ThresholdState,
  computeExpenditure,
  getPhase,
} from '../src/threshold.js';

describe('excessus threshold & dissolution math', () => {
  it('maps assent values across the four phases accurately', () => {
    assert.equal(getPhase(0.05).id, 'discontinuitas');
    assert.equal(getPhase(0.45).id, 'exaltatio');
    assert.equal(getPhase(0.80).id, 'excessus');
    assert.equal(getPhase(0.95).id, 'dissolutio');
  });

  it('increases noise wall and decreases structural integrity monotonically', () => {
    const low = computeExpenditure(0.1);
    const high = computeExpenditure(0.85);
    assert.ok(high.noiseWall > low.noiseWall);
    assert.ok(high.corrosion > low.corrosion);
    assert.ok(high.integrity < low.integrity);
  });

  it('triggers sovereign collapse when held past the threshold and resets to void', () => {
    const st = new ThresholdState();
    st.holding = true;

    let collapsed = false;
    for (let i = 0; i < 200; i++) {
      const res = st.step(0.1);
      if (res.justCollapsed) {
        collapsed = true;
        break;
      }
    }

    assert.ok(collapsed, 'expected threshold to trigger collapse');
    assert.ok(st.assent >= SOVEREIGN_POINT);
    assert.equal(st.collapseCount, 1);

    let reset = false;
    for (let i = 0; i < 60; i++) {
      if (st.step(0.1).justReset) {
        reset = true;
        break;
      }
    }
    assert.ok(reset, 'expected collapse cooldown to cut back to void');
    assert.ok(st.assent < 0.1);
  });
});
