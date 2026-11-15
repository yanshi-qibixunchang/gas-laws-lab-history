import assert from 'node:assert/strict';
import { simulate, observe, HEIGHTS } from '../../scripts/analysis/pistonDissipationAcceptance.ts';
import {
  createDefaultPistonOscillationFreeSession,
  getPistonOscillationFreeCurrentTargetHeightMm,
  normalizePistonOscillationFreeSession,
  transitionPistonOscillationFreeSession,
  type PistonOscillationFreeEvent,
} from '../../src/domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';
import { createPistonOscillationFreeExperimentContextSnapshot } from '../../src/domain/pistonOscillation/pistonOscillationFreeExperimentGroupModel.ts';
import { createDefaultHeatCapacityPistonOscillationFile } from '../../src/features/workbench/workbenchPistonOscillationState.ts';
import { createWorkbenchPistonViewActions } from '../../src/features/workbench/workbenchPistonViewActions.ts';
import type { WorkbenchFileState } from '../../src/features/workbench/workbenchFileUnion.ts';

let nowMs = 1000;
for (const scheme of ['real', 'ideal'] as const) {
  for (const gasType of ['air', 'helium'] as const) {
    let session = createDefaultPistonOscillationFreeSession();
    const send = (event: PistonOscillationFreeEvent) => {
      session = transitionPistonOscillationFreeSession(session, event);
    };
    send({ type: 'start', nowMs: nowMs++ });
    send({ type: 'setExperimentScheme', scheme, nowMs: nowMs++ });
    send({ type: 'setGasType', gasType, nowMs: nowMs++ });
    send({ type: 'setPlan', targetHeightsMm: HEIGHTS, nowMs: nowMs++ });
    send({ type: 'setAcquisitionSetting', field: 'sampleRateHz', value: 1000, nowMs: nowMs++ });
    send({ type: 'setAcquisitionSetting', field: 'triggerThresholdKpa', value: 120, nowMs: nowMs++ });
    send({ type: 'setPower', powerOn: true, nowMs: nowMs++ });
    const label = `${scheme}/${gasType}`;

    for (const [measurementIndex, height] of HEIGHTS.entries()) {
      const observation = observe(simulate(gasType, scheme, height));
      assert.ok(observation, `${label}: physical trajectory must produce a usable record`);
      const measurement = {
        ...observation.record,
        measurementIndex,
        experimentContext: createPistonOscillationFreeExperimentContextSnapshot(session.experimentGroup),
      };
      send({ type: 'freezeAcquisition', measurement, nowMs: nowMs++ });
      assert.equal(session.acquisitionCandidate?.recordId, measurement.recordId, label);
      // A curve frozen before closing the app must remain saveable after recovery.
      session = normalizePistonOscillationFreeSession(JSON.parse(JSON.stringify(session)));
      const previousMeasurements = structuredClone(session.savedMeasurements);
      const file = { ...createDefaultHeatCapacityPistonOscillationFile(), pistonOscillationFreeSession: session };
      const filesRef = { current: [file] as WorkbenchFileState[] };
      const activeFileIdRef = { current: file.id };
      const updateFileById = (fileId: string, update: (current: WorkbenchFileState) => WorkbenchFileState) => {
        filesRef.current = filesRef.current.map(current => current.id === fileId ? update(current) : current);
      };
      const actions = createWorkbenchPistonViewActions({
        activeFile: file, filesRef, activeFileIdRef, updateFileById,
        updateActiveFile: update => updateFileById(activeFileIdRef.current, update),
        setPistonOscillationReleaseEventsByFileId: () => {},
        setPistonOscillationPressStartEventsByFileId: () => {},
        setPistonOscillationMeasurementCyclesByFileId: () => {},
      });
      const rejected = {
        ...measurement,
        acquisitionSettings: { ...measurement.acquisitionSettings, triggerThresholdKpa: 119 },
      };
      assert.equal(actions.savePistonOscillationFreeMeasurement(rejected), false, `${label}: rejected saves must report failure`);
      assert.equal(filesRef.current[0], file, `${label}: failed save must retain the candidate and progress`);
      assert.equal(actions.savePistonOscillationFreeMeasurement(measurement), true, `${label}: save must succeed`);
      const updated = filesRef.current[0];
      assert.equal(updated.kind, 'heatCapacityPistonOscillation');
      if (updated.kind !== 'heatCapacityPistonOscillation') throw Error('Unexpected file kind');
      session = updated.pistonOscillationFreeSession;
      assert.equal(session.measurementIndex, measurementIndex + 1, `${label}: advance to next measurement`);
      assert.equal(session.acquisitionCandidate, null, `${label}: clear the previous frozen curve`);
      assert.equal(session.savedMeasurements.length, measurementIndex + 1, label);
      assert.deepEqual(session.savedMeasurements.slice(0, measurementIndex), previousMeasurements, `${label}: preserve previous curves`);
      assert.deepEqual(session.savedMeasurements[measurementIndex].samples, measurement.samples, `${label}: preserve raw samples`);
      if (measurementIndex < HEIGHTS.length - 1) {
        assert.equal(getPistonOscillationFreeCurrentTargetHeightMm(session), HEIGHTS[measurementIndex + 1], label);
      } else {
        assert.equal(session.dataProcessing?.runs.length, HEIGHTS.length, `${label}: start data processing after the final curve`);
      }
      const restored = normalizePistonOscillationFreeSession(JSON.parse(JSON.stringify(session)));
      assert.deepEqual(restored.savedMeasurements, session.savedMeasurements, `${label}: saved data must survive restart`);
      assert.equal(restored.measurementIndex, session.measurementIndex, label);
      session = restored;
    }
  }
}
console.log('Piston measurement saving passed for all four gas/scheme combinations.');
