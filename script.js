'use strict';

// Add a policy here to generate a new control. Effects below are synthetic demo math.
const policyMetrics = [
  { id: 'interest', label: 'Interest rate', min: 3, max: 25, step: 0.5, value: 5, unit: '%' },
  { id: 'affordable', label: 'Affordable units', min: 0, max: 50, step: 1, value: 20, unit: '%' },
  { id: 'density', label: 'Density bonus', min: 0, max: 100, step: 5, value: 25, unit: '%' },
  { id: 'subsidy', label: 'Housing subsidy', min: 0, max: 50, step: 1, value: 10, unit: '%' },
];
const $ = id => document.getElementById(id);
const timeline = $('timeline');
let playing = false;
let frame = null;
let lastTime = null;
let playbackYear = 0;

policyMetrics.forEach(policy => {
  const card = document.createElement('div');
  card.className = 'policy-card';
  const label = document.createElement('label');
  label.htmlFor = policy.id;
  label.textContent = policy.label;
  const output = document.createElement('output');
  output.id = `${policy.id}-value`;
  output.htmlFor = policy.id;
  const input = document.createElement('input');
  Object.assign(input, { id: policy.id, type: 'range', min: policy.min, max: policy.max, step: policy.step, value: policy.value });
  const limits = document.createElement('div');
  limits.className = 'gradient-labels';
  [policy.min, policy.max].forEach(value => {
    const span = document.createElement('span');
    span.textContent = `${value}${policy.unit}`;
    limits.append(span);
  });
  card.append(label, output, input, limits);
  $('policy-grid').append(card);
  input.addEventListener('input', render);
});

// Replace this function with the team's model adapter. No empirical claims are made.
function demoModel(year, policies, housing, households) {
  const progress = year / 20;
  const baselineAccess = Math.min(100, housing / households * 100);
  const baselineValue = housing * 0.0141;
  const supplyChange = (policies.density * 0.004 + policies.subsidy * 0.003 - (policies.interest - 5) * 0.012) * progress;
  return {
    baselineAccess,
    access: Math.max(0, Math.min(100, baselineAccess * (1 + supplyChange) + policies.affordable * 0.08 * progress)),
    baselineValue,
    value: Math.max(0, baselineValue * (1 + supplyChange - policies.affordable * 0.002 * progress)),
  };
}

function render() {
  const policies = Object.fromEntries(policyMetrics.map(policy => {
    const value = Number($(policy.id).value);
    $(`${policy.id}-value`).textContent = `${value}${policy.unit}`;
    return [policy.id, value];
  }));
  // Ignore temporary invalid numeric edits; report their validity on change.
  if (!$('housing').validity.valid || !$('households').validity.valid || !$('housing').value || !$('households').value) return;
  const year = Number(timeline.value);
  const result = demoModel(year, policies, Number($('housing').value), Number($('households').value));
  $('time-label').textContent = `YEAR ${String(Math.floor(year)).padStart(2, '0')} / 20`;
  timeline.setAttribute('aria-valuetext', `${year.toFixed(1)} years`);
  $('access-baseline').textContent = `${result.baselineAccess.toFixed(1)}%`;
  $('access-result').textContent = `${result.access.toFixed(1)}%`;
  $('value-baseline').textContent = `$${result.baselineValue.toFixed(1)}m`;
  $('value-result').textContent = `$${result.value.toFixed(1)}m`;
  $('access-bar').style.width = `${result.access}%`;
  $('value-bar').style.width = `${Math.min(100, result.value / (result.baselineValue * 2) * 100)}%`;
  document.documentElement.style.setProperty('--gradient-position', `${year * 5}%`);
}

function setPlaying(value) {
  playing = value;
  $('play').textContent = value ? 'Ⅱ' : '▶';
  $('play').setAttribute('aria-label', value ? 'Pause simulation' : 'Play simulation');
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  lastTime = null;
  playbackYear = Number(timeline.value);
  if (value) frame = requestAnimationFrame(advance);
}
function advance(now) {
  if (!playing) return;
  if (lastTime !== null) {
    playbackYear = Math.min(20, playbackYear + (now - lastTime) / 1000);
    timeline.value = playbackYear;
  }
  lastTime = now;
  render();
  if (Number(timeline.value) >= 20) setPlaying(false);
  else frame = requestAnimationFrame(advance);
}
$('play').addEventListener('click', () => {
  if (!playing && Number(timeline.value) >= 20) timeline.value = 0;
  setPlaying(!playing);
});
timeline.addEventListener('input', () => { setPlaying(false); render(); });
['housing', 'households'].forEach(id => {
  $(id).addEventListener('input', render);
  $(id).addEventListener('change', () => $(id).reportValidity());
});
$('reset').addEventListener('click', () => {
  setPlaying(false);
  timeline.value = 0;
  $('housing').value = 1000;
  $('households').value = 1200;
  policyMetrics.forEach(policy => { $(policy.id).value = policy.value; });
  render();
});
$('credits-open').addEventListener('click', () => $('credits').showModal());
$('credits-close').addEventListener('click', () => $('credits').close());
document.addEventListener('visibilitychange', () => { if (document.hidden) setPlaying(false); });
render();
