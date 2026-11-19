import { ThresholdState, computeExpenditure, getPhase } from './threshold.js';
import { ExcessusAudio } from './audio.js';
import { DissolutionRenderer } from './visuals.js';

const canvas = document.getElementById('canvas');
const veil = document.getElementById('veil');
const hud = document.getElementById('hud');
const enterBtn = document.getElementById('enterBtn');
const assentBtn = document.getElementById('assentBtn');
const lockBtn = document.getElementById('lockBtn');
const resetBtn = document.getElementById('resetBtn');
const muteBtn = document.getElementById('muteBtn');

const assentSlider = document.getElementById('assentSlider');
const feedbackSlider = document.getElementById('feedbackSlider');
const corrosionSlider = document.getElementById('corrosionSlider');

const phaseNum = document.getElementById('phaseNum');
const phaseName = document.getElementById('phaseName');
const phaseCap = document.getElementById('phaseCap');
const meterFill = document.getElementById('meterFill');
const telIntegrity = document.getElementById('telIntegrity');
const telExpend = document.getElementById('telExpend');
const telCollapses = document.getElementById('telCollapses');

const state = new ThresholdState();
const audio = new ExcessusAudio();
const renderer = new DissolutionRenderer(canvas, state, audio);
renderer.render();

let lastTime = performance.now();

function tickLoop(now) {
  const dtSec = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  if (audio.running) {
    const { justReset } = state.step(dtSec);
    if (justReset) {
      audio.cutToVoid();
      assentBtn.classList.remove('holding');
    }
    audio.update(state.assent, dtSec);
  }

  const phase = getPhase(state.assent);
  const exp = computeExpenditure(state.assent, audio.feedbackBias, audio.corrosionBias);

  phaseNum.textContent = phase.numeral;
  phaseName.textContent = phase.name;
  phaseCap.textContent = phase.caption;
  meterFill.style.width = `${Math.round(state.assent * 100)}%`;

  assentSlider.value = state.assent.toFixed(3);
  document.getElementById('v-assent').textContent = state.assent.toFixed(2);
  telIntegrity.textContent = `${Math.round(exp.integrity * 100)}%`;
  telExpend.textContent = exp.noiseWall.toFixed(2);
  telCollapses.textContent = String(state.collapseCount);

  requestAnimationFrame(tickLoop);
}
requestAnimationFrame(tickLoop);

enterBtn.addEventListener('click', async () => {
  veil.classList.add('gone');
  hud.classList.remove('hidden');
  await audio.start();
});

function startHold() {
  state.holding = true;
  assentBtn.classList.add('holding');
}

function endHold() {
  state.holding = false;
  assentBtn.classList.remove('holding');
}

assentBtn.addEventListener('mousedown', startHold);
assentBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  startHold();
});
window.addEventListener('mouseup', endHold);
window.addEventListener('touchend', endHold);

assentSlider.addEventListener('input', () => {
  state.setManual(Number(assentSlider.value));
});

feedbackSlider.addEventListener('input', () => {
  audio.feedbackBias = Number(feedbackSlider.value);
  document.getElementById('v-feedback').textContent = audio.feedbackBias.toFixed(2);
});

corrosionSlider.addEventListener('input', () => {
  audio.corrosionBias = Number(corrosionSlider.value);
  document.getElementById('v-corrosion').textContent = audio.corrosionBias.toFixed(2);
});

lockBtn.addEventListener('click', () => {
  state.locked = !state.locked;
  lockBtn.classList.toggle('active', state.locked);
  lockBtn.textContent = state.locked ? 'LOCK: ON' : 'LOCK: OFF';
});

resetBtn.addEventListener('click', () => {
  state.reset();
  audio.cutToVoid();
});

muteBtn.addEventListener('click', async () => {
  if (audio.running) {
    audio.stop();
    muteBtn.textContent = 'RESUME';
  } else {
    await audio.start();
    muteBtn.textContent = 'SILENCE';
  }
});

window.addEventListener('keydown', (e) => {
  if (!veil.classList.contains('gone')) return;
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    startHold();
  } else if (e.key.toLowerCase() === 'r') {
    resetBtn.click();
  } else if (e.key.toLowerCase() === 'h') {
    hud.classList.toggle('hidden');
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    endHold();
  }
});
