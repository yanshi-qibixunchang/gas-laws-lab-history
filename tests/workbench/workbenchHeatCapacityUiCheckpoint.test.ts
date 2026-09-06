const heatCheckpointControllerSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchHeatCapacityController.ts', import.meta.url), 'utf8');
const heatFeedbackCheckpointSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchHeatFeedback.ts', import.meta.url), 'utf8');
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  asWorkbenchHeatCapacityRefreshJsonObject,
  getHeatCapacityRefreshBoolean,
  getHeatCapacityRefreshNumber,
  getHeatCapacityRefreshObject,
  getHeatCapacityRefreshOptionalNumber,
  getHeatCapacityRefreshRunState,
  getHeatCapacityRefreshString,
  getHeatCapacityRefreshStringMap,
  mapHeatCapacityAutoDemoCameraFocusMode,
  normalizeHeatCapacityFocusSession,
  normalizeHeatCapacityLessonCloseTimerPlan,
  normalizeHeatCapacityRecordSuccessTimerPlan,
} from '../../src/features/workbench/workbenchHeatCapacityUiCheckpoint.ts';

const refresh = asWorkbenchHeatCapacityRefreshJsonObject({
  label: 'restored',
  visible: true,
  count: 4,
  invalidNumber: Number.POSITIVE_INFINITY,
  nested: { kept: 'yes' },
  list: [],
  drafts: { valid: '12', invalid: 12, alsoValid: '' },
});

assert.equal(getHeatCapacityRefreshString(refresh, 'label'), 'restored');
assert.equal(getHeatCapacityRefreshString(refresh, 'missing', 'fallback'), 'fallback');
assert.equal(getHeatCapacityRefreshBoolean(refresh, 'visible'), true);
assert.equal(getHeatCapacityRefreshBoolean(refresh, 'missing', true), true);
assert.equal(getHeatCapacityRefreshNumber(refresh, 'count', 0), 4);
assert.equal(getHeatCapacityRefreshNumber(refresh, 'invalidNumber', 7), 7);
assert.equal(getHeatCapacityRefreshOptionalNumber(refresh, 'count'), 4);
assert.equal(getHeatCapacityRefreshOptionalNumber(refresh, 'missing'), null);
assert.deepEqual(getHeatCapacityRefreshObject(refresh, 'nested'), { kept: 'yes' });
assert.equal(getHeatCapacityRefreshObject(refresh, 'list'), null);
assert.deepEqual(getHeatCapacityRefreshStringMap(refresh, 'drafts'), {
  valid: '12',
  alsoValid: '',
});
assert.equal(getHeatCapacityRefreshRunState('paused', 'idle'), 'paused');
assert.equal(getHeatCapacityRefreshRunState('future-state', 'idle'), 'idle');

const recordSuccessLayout = asWorkbenchHeatCapacityRefreshJsonObject({
  recordSuccessSequence: {
    fileId: 'heat-1',
    followUpMessage: 'Continue',
    followUpRemainingMs: 120,
    releaseRemainingMs: 300,
  },
});
assert.deepEqual(
  normalizeHeatCapacityRecordSuccessTimerPlan(recordSuccessLayout, 'heat-1', 'guide'),
  {
    fileId: 'heat-1',
    followUpMessage: 'Continue',
    followUpRemainingMs: 120,
    releaseRemainingMs: 300,
  },
);
assert.equal(
  normalizeHeatCapacityRecordSuccessTimerPlan(recordSuccessLayout, 'heat-1', 'demo'),
  null,
);
assert.equal(
  normalizeHeatCapacityRecordSuccessTimerPlan(
    asWorkbenchHeatCapacityRefreshJsonObject({
      recordSuccessSequence: {
        fileId: 'heat-1',
        followUpMessage: '   ',
        followUpRemainingMs: 120,
        releaseRemainingMs: 300,
      },
    }),
    'heat-1',
    'guide',
  ),
  null,
);
assert.equal(
  normalizeHeatCapacityRecordSuccessTimerPlan(
    asWorkbenchHeatCapacityRefreshJsonObject({
      recordSuccessSequence: {
        fileId: 'heat-1',
        followUpMessage: 'Continue',
        followUpRemainingMs: 301,
        releaseRemainingMs: 300,
      },
    }),
    'heat-1',
    'guide',
  ),
  null,
);

const lessonCloseLayout = asWorkbenchHeatCapacityRefreshJsonObject({
  lessonCloseSequence: {
    fileId: 'heat-1',
    remainingMs: 180,
    shouldResumeAutoDemo: true,
  },
});
assert.deepEqual(
  normalizeHeatCapacityLessonCloseTimerPlan(
    lessonCloseLayout,
    'heat-1',
    'demo',
    true,
  ),
  {
    fileId: 'heat-1',
    remainingMs: 180,
    shouldResumeAutoDemo: true,
  },
);
assert.equal(
  normalizeHeatCapacityLessonCloseTimerPlan(
    lessonCloseLayout,
    'heat-1',
    'guide',
    true,
  ),
  null,
);
assert.equal(
  normalizeHeatCapacityLessonCloseTimerPlan(
    lessonCloseLayout,
    'heat-1',
    'demo',
    false,
  ),
  null,
);

const focusSession = {
  fileId: 'heat-1',
  mode: 'pump',
  parametersCollapsedBeforeFocus: true,
  baseline: {
    powerOn: true,
    stopcockOpen: false,
    pumpValveOpen: true,
    pressureZeroAdjusted: true,
    pressureZeroOffset: 0.25,
  },
  nonReversibleAction: false,
};
assert.deepEqual(normalizeHeatCapacityFocusSession(focusSession), focusSession);
assert.equal(
  normalizeHeatCapacityFocusSession({
    ...focusSession,
    baseline: { ...focusSession.baseline, pressureZeroOffset: Number.NaN },
  }),
  null,
);
assert.equal(mapHeatCapacityAutoDemoCameraFocusMode('instrument'), 'instrument');
assert.equal(mapHeatCapacityAutoDemoCameraFocusMode(undefined), null);

const workbenchSource = readFileSync(
  join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.tsx'),
  'utf8',
);
assert.equal(
  workbenchSource.includes('const normalizeHeatCapacityRecordSuccessTimerPlan'),
  false,
  'refresh checkpoint parsing must stay outside the Workbench coordinator',
);
assert.match(
  heatFeedbackCheckpointSource,
  /from '.\/workbenchHeatCapacityUiCheckpoint\.ts'/,
  'the Workbench coordinator must consume the dedicated checkpoint boundary',
);

console.log('workbenchHeatCapacityUiCheckpoint tests passed');

assert.match(heatFeedbackCheckpointSource, /normalizeHeatCapacityRecordSuccessTimerPlan\(/); assert.match(heatCheckpointControllerSource, /useWorkbenchHeatFeedback\(\{/); assert.match(workbenchSource, /useWorkbenchHeatCapacityController\(\{/);
