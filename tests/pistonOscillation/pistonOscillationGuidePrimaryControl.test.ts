import assert from 'node:assert/strict';
import {
  getPistonOscillationGuidePrimaryControlState,
  type PistonOscillationGuidePrimaryControlInput,
  type PistonOscillationGuidePrimaryControlState,
} from '../../src/features/pistonOscillation/pistonOscillationGuidePrimaryControl.ts';

const decide = (
  step: PistonOscillationGuidePrimaryControlInput['step'],
  input: Partial<Omit<PistonOscillationGuidePrimaryControlInput, 'step'>> = {},
) => getPistonOscillationGuidePrimaryControlState({
  status: 'active',
  pauseReady: true,
  candidateAvailable: true,
  ...input,
  step,
});

const canonicalStepCases: readonly [
  PistonOscillationGuidePrimaryControlInput['step'],
  PistonOscillationGuidePrimaryControlState,
][] = [
  ['screwLoosen', { action: null, showsPause: false, allowed: false }],
  ['acquisitionReady', { action: 'startAcquisition', showsPause: false, allowed: true }],
  ['waitingTrigger', { action: null, showsPause: true, allowed: false }],
  ['recording', { action: null, showsPause: true, allowed: false }],
  ['pauseAvailable', { action: 'pauseAcquisition', showsPause: true, allowed: true }],
  ['curveFrozen', { action: null, showsPause: false, allowed: false }],
  ['awaitingSaveOrRedo', { action: null, showsPause: false, allowed: false }],
];

for (const [step, expected] of canonicalStepCases) {
  const actual = decide(step);
  assert.deepEqual(actual, expected, `${step} should have one canonical primary-control state`);
  if (actual.showsPause) {
    assert.notEqual(
      actual.action,
      'startAcquisition',
      `${step} must never present Pause while dispatching Start`,
    );
  }
}

for (const pauseReady of [false, true]) {
  for (const candidateAvailable of [false, true]) {
    const actual = decide('pauseAvailable', { pauseReady, candidateAvailable });
    assert.equal(actual.action, 'pauseAcquisition');
    assert.equal(actual.showsPause, true);
    assert.equal(
      actual.allowed,
      pauseReady && candidateAvailable,
      'Pause should require both a stable piston and a canonical candidate',
    );
  }
}

assert.deepEqual(
  decide('acquisitionReady', { status: 'completed' }),
  { action: 'startAcquisition', showsPause: false, allowed: false },
  'an inactive Guide session must never enable its canonical action',
);

console.log('pistonOscillationGuidePrimaryControl tests passed');
