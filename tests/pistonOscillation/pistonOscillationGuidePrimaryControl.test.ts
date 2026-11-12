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
  ...input,
  step,
});

const canonicalStepCases: readonly [
  PistonOscillationGuidePrimaryControlInput['step'],
  PistonOscillationGuidePrimaryControlState,
][] = [
  ['screwLoosen', { action: null, allowed: false }],
  ['acquisitionReady', { action: 'startAcquisition', allowed: true }],
  ['waitingTrigger', { action: null, allowed: false }],
  ['recording', { action: null, allowed: false }],
  ['awaitingSaveOrRedo', { action: null, allowed: false }],
];

for (const [step, expected] of canonicalStepCases) {
  const actual = decide(step);
  assert.deepEqual(actual, expected, `${step} should have one canonical primary-control state`);
}
assert.equal(decide('acquisitionReady', { status: 'completed' }).allowed, false);

console.log('pistonOscillationGuidePrimaryControl tests passed');
