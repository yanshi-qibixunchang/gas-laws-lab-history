const archUseWorkbenchIdealInputEffectsSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchIdealInputEffects.ts', import.meta.url), 'utf8');
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  IDEAL_SCAN_SNAP_THRESHOLD,
  IDEAL_SCAN_THUMB_HIT_RADIUS,
  IDEAL_SCAN_THUMB_SIZE,
  getIdealScanDecimals,
  getIdealScanInputLabel,
  getIdealScanPositionPercent,
  getIdealScanStep,
  getIdealScanStepLabel,
  idealRelationOptions,
  idealSamplingPresets,
  isIdealScanValueOnStep,
} from '../../src/features/workbench/workbenchIdealControls.ts';

assert.deepEqual(idealRelationOptions.map((option) => option.key), ['pt', 'pv', 'pn']);
assert.deepEqual(idealSamplingPresets.map((preset) => preset.key), ['fast', 'balanced', 'stable']);
assert.deepEqual(IDEAL_SCAN_SNAP_THRESHOLD, { pt: 0.04, pv: 0.25, pn: 8 });
assert.equal(IDEAL_SCAN_THUMB_SIZE, 13);
assert.equal(IDEAL_SCAN_THUMB_HIT_RADIUS, 9.1);

assert.deepEqual(['pt', 'pv', 'pn'].map((relation) => getIdealScanStep(relation as 'pt' | 'pv' | 'pn')), [0.01, 0.1, 1]);
assert.deepEqual(['pt', 'pv', 'pn'].map((relation) => getIdealScanDecimals(relation as 'pt' | 'pv' | 'pn')), [2, 1, 0]);
assert.deepEqual(['pt', 'pv', 'pn'].map((relation) => getIdealScanStepLabel(relation as 'pt' | 'pv' | 'pn')), ['0.01', '0.1', '1']);
assert.deepEqual(['pt', 'pv', 'pn'].map((relation) => getIdealScanInputLabel(relation as 'pt' | 'pv' | 'pn')), ['Target temperature', 'L', 'N']);

assert.equal(isIdealScanValueOnStep('1.01', 'pt'), true);
assert.equal(isIdealScanValueOnStep('1.001', 'pt'), false);
assert.equal(isIdealScanValueOnStep('2.10', 'pv'), true);
assert.equal(isIdealScanValueOnStep('2.11', 'pv'), false);
assert.equal(isIdealScanValueOnStep('100', 'pn'), true);
assert.equal(isIdealScanValueOnStep('100.0', 'pn'), false);
assert.equal(getIdealScanPositionPercent(5, 0, 10), 50);
assert.equal(getIdealScanPositionPercent(-1, 0, 10), 0);
assert.equal(getIdealScanPositionPercent(11, 0, 10), 100);
assert.equal(getIdealScanPositionPercent(5, 0, 0), 0);

const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);
assert.match(archUseWorkbenchIdealInputEffectsSource, /from '\.\/workbenchIdealControls\.ts'/);
assert.doesNotMatch(workbenchSource, /const IDEAL_SCAN_SNAP_THRESHOLD|const getIdealScanStep\s*=/);

console.log('workbenchIdealControls tests passed');

assert.match(workbenchSource, /from '\.\/useWorkbenchIdealInputEffects\.ts'/);
