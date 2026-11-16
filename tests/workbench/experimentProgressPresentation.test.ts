import assert from 'node:assert/strict';
import { getPistonFreeAcquisitionSummary, getHeatGroupCompletionLabel, EXPERIMENT_PROGRESS_COPY } from '../../src/features/workbench/experimentProgressPresentation.ts';
import { createDefaultPistonOscillationFreeSession, createPistonOscillationFreeExperimentPlan } from '../../src/domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';
import type { PistonOscillationRawMeasurementRecord } from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import { createDefaultHeatCapacityFile } from '../../src/features/workbench/workbenchHeatCapacityFileFactory.ts';
import { createHeatCapacityFreeExperimentGroupDraft } from '../../src/domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import { getPistonEndpointLabel, getPistonSelectionCopy } from '../../src/features/pistonOscillation/pistonSelectionPresentation.ts';

// This selector only reads record identity and timestamps; numerical processing is tested separately.
const session = createDefaultPistonOscillationFreeSession();
assert.equal(getPistonFreeAcquisitionSummary(session).complete, false);
session.experimentPlan = createPistonOscillationFreeExperimentPlan([60, 50, 40]);
session.savedMeasurements = [0, 1, 2].map(index => ({ recordId: `r${index}`, measurementIndex: index, targetHeightMm: [60, 50, 40][index], capturedAtMs: index + 1 } as PistonOscillationRawMeasurementRecord));
assert.equal(getPistonFreeAcquisitionSummary(session).lastSaved?.recordId, 'r2');
session.savedMeasurements[0].capturedAtMs = 10;
assert.equal(getPistonFreeAcquisitionSummary(session).lastSaved?.recordId, 'r0', 'a repaired earlier run can be the most recently saved record');
const before = JSON.stringify(session);
getPistonFreeAcquisitionSummary(session);
assert.equal(JSON.stringify(session), before, 'presentation must never rewrite stored data');
const reopened = JSON.parse(before);
assert.deepEqual(getPistonFreeAcquisitionSummary(reopened), getPistonFreeAcquisitionSummary(session));
session.savedMeasurementTargetIds.r0 = 'wrong-target';
assert.equal(getPistonFreeAcquisitionSummary(session).complete, false);
delete session.savedMeasurementTargetIds.r0;
session.reacquisition = { schemaVersion: 1, targetId: session.experimentPlan.targets[0].targetId, measurementIndex: 0, excludedRecordId: 'r0', returnRunIndex: 0, requestedAtMs: 11 };
assert.equal(getPistonFreeAcquisitionSummary(session).lastSaved, null);
session.reacquisition = null;
session.savedMeasurements.pop();
assert.equal(getPistonFreeAcquisitionSummary(session).complete, false);
session.savedMeasurements.push(session.savedMeasurements[0]);
assert.equal(getPistonFreeAcquisitionSummary(session).complete, false, 'duplicate records cannot complete a missing target');

for (const language of ['zh-CN', 'zh-TW', 'en'] as const) {
  assert.notEqual(getPistonEndpointLabel(language, 'start', 'peak'), getPistonEndpointLabel(language, 'end', 'trough'));
  assert.notEqual(getPistonSelectionCopy(language).free, getPistonSelectionCopy(language).guided);
  for (const gasType of ['air', 'helium'] as const) for (const scheme of ['real', 'ideal'] as const) for (const count of [3, 4, 5]) {
    const file = createDefaultHeatCapacityFile();
    file.heatCapacityMode = 'free';
    file.heatCapacityFreeExperimentGroups = createHeatCapacityFreeExperimentGroupDraft(file.heatCapacityFreeExperimentGroups, { id: 'test', scheme, gasType, targetExperimentCount: count, now: 1 });
    const group = file.heatCapacityFreeExperimentGroups.groups[0];
    assert.equal(getHeatGroupCompletionLabel(file, language), null);
    group.status = 'awaiting-real-calculation';
    assert.ok(getHeatGroupCompletionLabel(file, language)?.includes(EXPERIMENT_PROGRESS_COPY[language].acquired(count)));
    group.status = 'completed';
    assert.equal(getHeatGroupCompletionLabel(file, language), EXPERIMENT_PROGRESS_COPY[language].completed);
    group.status = 'legacy-incomplete-readonly';
    assert.equal(getHeatGroupCompletionLabel(file, language), EXPERIMENT_PROGRESS_COPY[language].legacy);
    file.heatCapacityMode = 'guide';
    file.heatCapacityTeachingStatus = 'completed';
    assert.equal(getHeatGroupCompletionLabel(file, language), EXPERIMENT_PROGRESS_COPY[language].completed);
    file.heatCapacityMode = 'demo';
    assert.equal(getHeatGroupCompletionLabel(file, language), EXPERIMENT_PROGRESS_COPY[language].completed);
  }
}
console.log('Experiment progress presentation: identities, restoration, replacement, counts, gases, schemes and languages passed.');
