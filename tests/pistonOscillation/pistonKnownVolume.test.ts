import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createDefaultPistonOscillationFreeSession, transitionPistonOscillationFreeSession, normalizePistonOscillationFreeSession, type PistonOscillationFreeEvent, type PistonOscillationFreeSession } from '../../src/domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';
import { createPistonOscillationRawMeasurementRecord, findPistonOscillationPrimaryExtrema, formatPistonOscillationEndpointTime, formatPistonOscillationPeriod, formatPistonOscillationCalculationAnswer, calculatePistonKnownVolumeResult } from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import { createPistonOscillationCurrentRecordTestArtifacts } from './helpers/pistonOscillationCurrentRecordTestFactory.ts';
import { createDefaultHeatCapacityPistonOscillationFile } from '../../src/features/workbench/workbenchState.ts';
import { createPistonOscillationReportExportPayload, isPistonOscillationReportReady } from '../../src/features/workbench/workbenchPistonOscillationExport.ts';
import { selectPistonOscillationProcessReviewModels } from '../../src/features/processReview/pistonOscillationProcessReviewModel.ts';
import { InMemoryWorkbenchPersistenceV3GenerationStore } from '../../src/features/workbench/persistenceV3/generationStore.ts';
import { commitWorkbenchPersistenceV3ProductionSnapshot, restoreWorkbenchPersistenceV3ProductionWorkspace } from '../../src/features/workbench/persistenceV3/productionFacade.ts';
import { createPistonExperimentIdleAttention } from '../../src/features/pistonOscillation/pistonExperimentIdleAttention.ts';

type Event = PistonOscillationFreeEvent extends infer E ? E extends { nowMs: number } ? Omit<E, 'nowMs'> : never : never;
let time = 1000;
const send = (session: PistonOscillationFreeSession, event: Event) => transitionPistonOscillationFreeSession(session, { ...event, nowMs: ++time } as PistonOscillationFreeEvent);
let session = send(createDefaultPistonOscillationFreeSession(), { type: 'start' });
assert.equal(session.experimentPlan, null);
session = send(session, { type: 'setVolumeCondition', volumeCondition: 'known' });
session = send(session, { type: 'setGasType', gasType: 'helium' });
assert.notEqual(session.experimentGroup.volumeCondition, 'known');
assert.equal(send(session, { type: 'setVolumeCondition', volumeCondition: 'known' }), session);
session = send(session, { type: 'setGasType', gasType: 'air' });
session = send(session, { type: 'setVolumeCondition', volumeCondition: 'known' });
session = send(session, { type: 'setExperimentScheme', scheme: 'ideal' });
assert.notEqual(session.experimentGroup.volumeCondition, 'known');
assert.equal(send(session, { type: 'setVolumeCondition', volumeCondition: 'known' }), session);
session = send(session, { type: 'setExperimentScheme', scheme: 'real' });
session = send(session, { type: 'setVolumeCondition', volumeCondition: 'known' });
assert.equal(send(session, { type: 'setPlan', targetHeightsMm: [80] }).experimentPlan, null);
session = send(session, { type: 'setPlan', targetHeightsMm: [50] });
assert.deepEqual(session.experimentPlan?.targetHeightsMm, [50]);
assert.equal(send(session, { type: 'setVolumeCondition', volumeCondition: 'unknown' }), session);
assert.equal(send(session, { type: 'setExperimentScheme', scheme: 'ideal' }), session);
assert.equal(send(session, { type: 'setGasType', gasType: 'helium' }), session);
session = send(session, { type: 'setAcquisitionSetting', field: 'sampleRateHz', value: 1000 });
session = send(session, { type: 'setAcquisitionSetting', field: 'triggerThresholdKpa', value: 120 });
session = send(session, { type: 'setPower', powerOn: true });

const samples = Array.from({ length: 501 }, (_, i) => ({ sampleIndex: i, timeS: i / 1000,
  absolutePressureKpa: Math.trunc((101.32 + 4 * Math.exp(-2.4 * i / 1000) * Math.cos(2 * Math.PI * i / 40)) * 100) / 100 }));
const artifacts = createPistonOscillationCurrentRecordTestArtifacts({ lockedHeightMm: 50, sampleRateHz: 1000, samples, parameters: session.parameterDraft });
const measurement = createPistonOscillationRawMeasurementRecord({ recordId: 'known-volume-50', capturedAtMs: ++time,
  measurementIndex: 0, targetHeightMm: 50, confirmedHeightMm: artifacts.confirmedHeightMm,
  sampleRateHz: 1000, triggerThresholdKpa: 120, recordedDurationS: 0.5, recordingPath: 'falling-trigger', releaseOffsetS: null,
  samples, pressOperationEvidence: artifacts.pressOperationEvidence, sensorObservationSnapshot: artifacts.sensorObservationSnapshot,
  physicsSnapshot: artifacts.physicsSnapshot });
session = send(session, { type: 'saveMeasurement', measurement });
assert.equal(session.savedMeasurements.length, 1);
assert.equal(session.savedMeasurements[0]?.experimentContext?.volumeCondition, 'known');
assert.equal(session.dataProcessing?.volumeCondition, 'known');
assert.equal(session.dataProcessing?.uncertaintyCourseVersion, undefined);
assert.equal(normalizePistonOscillationFreeSession(JSON.parse(JSON.stringify(session))).savedMeasurements.length, 1);
const extrema = findPistonOscillationPrimaryExtrema(session.savedMeasurements[0]!);
assert.ok(extrema.length >= 7);
session = send(session, { type: 'selectPeriodRange', runIndex: 0, rangeStartTimeS: extrema[0]!.timeS - 0.0004, rangeEndTimeS: extrema[6]!.timeS + 0.0004 });
for (const field of ['t1', 't2'] as const) {
  session = send(session, { type: 'editPeriodAnswer', runIndex: 0, field,
    value: formatPistonOscillationEndpointTime(session.dataProcessing!.runs[0]!.answers[field].expectedValue!) });
}
session = send(session, { type: 'revealPeriodEntry', runIndex: 0 });
session = send(session, { type: 'editPeriodAnswer', runIndex: 0, field: 'period', value: formatPistonOscillationPeriod(session.dataProcessing!.runs[0]!.answers.period.expectedValue!, session.dataProcessing!.runs[0]) });
session = send(session, { type: 'submitPeriodBatch', runIndex: 0 });
assert.equal(session.dataProcessing?.status, 'calculation-ready');
assert.equal(session.dataProcessing?.linearFitResult, null);
const calc = session.dataProcessing!.calculationSession!;
assert.equal(calc.status, 'calculating');
assert.equal(calc.uncertainty, undefined);
const known = calc.knowns;
assert.equal(known.knownVolume?.sourceRecordId, measurement.recordId);
const equilibrium = measurement.physicsSnapshot.equilibrium;
assert.ok(Math.abs(known.knownVolume!.totalVolumeM3 / equilibrium.equilibriumVolumeM3 - 1) < 0.000005);
assert.notEqual(known.knownVolume!.totalVolumeM3, equilibrium.lockedVolumeM3);
assert.equal(known.pressurePa, Math.round(equilibrium.equilibriumPressurePa / 10) * 10);
// Independent SI calculation, explicitly exercising both squared denominators.
const area = Number((Math.PI * known.cylinderDiameterM ** 2 / 4).toPrecision(5));
const gamma = Number((4 * Math.PI ** 2 * known.movingMassKg * known.knownVolume!.totalVolumeM3
  / (known.pressurePa * area * area * known.knownVolume!.periodS * known.knownVolume!.periodS)).toPrecision(5));
assert.equal(calc.answers.area.expectedValue, area);
assert.equal(calc.answers.gamma.expectedValue, gamma);
assert.throws(() => calculatePistonKnownVolumeResult({ ...known, knownVolume: { ...known.knownVolume!, totalVolumeM3: 0 } }), RangeError);
for (const field of ['area', 'gamma', 'relativeError'] as const) {
  const answer = session.dataProcessing!.calculationSession!.answers[field];
  session = send(session, { type: 'editCalculationAnswer', field, value: formatPistonOscillationCalculationAnswer(field, answer.expectedValue!, answer) });
  if (field !== 'relativeError') session = send(session, { type: 'revealNextCalculationField', field });
}
session = send(session, { type: 'submitCalculationBatch' });
session = send(session, { type: 'completeCalculation' });
assert.equal(session.dataProcessing?.status, 'completed');
const restored = normalizePistonOscillationFreeSession(JSON.parse(JSON.stringify(session)));
assert.equal(restored.dataProcessing?.status, 'completed');
assert.deepEqual(restored.dataProcessing?.calculationSession?.knowns, known);
assert.equal(restored.dataProcessing?.linearFitResult, null);
const file = { ...createDefaultHeatCapacityPistonOscillationFile(1), pistonOscillationFreeSession: restored };
assert.equal(isPistonOscillationReportReady(file), true);
const payload = createPistonOscillationReportExportPayload(file);
assert.ok('data' in payload);
const exportData = payload.data as Record<string, any>;
if (process.env.HSL_KNOWN_VOLUME_QA) writeFileSync(process.env.HSL_KNOWN_VOLUME_QA, JSON.stringify({ file, payload }));
assert.equal(exportData.volumeCondition, 'known');
assert.equal(exportData.linearFitResult, null);
assert.equal(exportData.uncertaintyReport, undefined);
assert.equal(exportData.measurements[0].includedInCalculation, true);
const review = selectPistonOscillationProcessReviewModels(restored)[0]!;
assert.ok(!JSON.stringify(review).includes('线性拟合'));
assert.equal(review.scoreRows.flatMap(row => row.details ?? []).find(row => row.id === 'piston-fit-inclusion')?.score, 3);

const store = new InMemoryWorkbenchPersistenceV3GenerationStore();
await commitWorkbenchPersistenceV3ProductionSnapshot({ store, namespace: 'known-volume', generationId: 'known-volume-test', capturedAtMs: ++time,
  snapshot: { files: [file], closedFiles: [], activeFileId: file.id, selectedPanel: 'preview' } });
const workspace = await restoreWorkbenchPersistenceV3ProductionWorkspace(store, 'known-volume');
assert.ok(workspace);
const restoredFile = workspace!.files[0];
assert.equal(restoredFile?.kind, 'heatCapacityPistonOscillation');
if (restoredFile?.kind === 'heatCapacityPistonOscillation') assert.equal(restoredFile.pistonOscillationFreeSession.dataProcessing?.status, 'completed');
const redone = send(session, { type: 'deleteMeasurement', measurementIndex: 0 });
assert.equal(redone.dataProcessing, null);
assert.equal(redone.experimentGroup.volumeCondition, 'known');
const replacementArtifacts = createPistonOscillationCurrentRecordTestArtifacts({ lockedHeightMm: 52, sampleRateHz: 1000, samples, parameters: redone.parameterDraft });
const replacement = createPistonOscillationRawMeasurementRecord({ recordId: 'known-volume-redone', capturedAtMs: ++time,
  measurementIndex: 0, targetHeightMm: 50, sampleRateHz: 1000, triggerThresholdKpa: 120,
  recordedDurationS: 0.5, recordingPath: 'falling-trigger', releaseOffsetS: null, samples,
  confirmedHeightMm: replacementArtifacts.confirmedHeightMm, pressOperationEvidence: replacementArtifacts.pressOperationEvidence,
  sensorObservationSnapshot: replacementArtifacts.sensorObservationSnapshot, physicsSnapshot: replacementArtifacts.physicsSnapshot });
let rerecorded = send(redone, { type: 'saveMeasurement', measurement: replacement });
assert.equal(rerecorded.savedMeasurements[0]?.recordId, replacement.recordId);
assert.equal(rerecorded.dataProcessing?.runs[0]?.result, null);
assert.equal(rerecorded.dataProcessing?.calculationSession, null);
rerecorded = send(rerecorded, { type: 'selectPeriodRange', runIndex: 0, rangeStartTimeS: extrema[0]!.timeS - 0.0004, rangeEndTimeS: extrema[6]!.timeS + 0.0004 });
for (const field of ['t1', 't2'] as const) rerecorded = send(rerecorded, { type: 'editPeriodAnswer', runIndex: 0, field,
  value: formatPistonOscillationEndpointTime(rerecorded.dataProcessing!.runs[0]!.answers[field].expectedValue!) });
rerecorded = send(rerecorded, { type: 'revealPeriodEntry', runIndex: 0 });
rerecorded = send(rerecorded, { type: 'editPeriodAnswer', runIndex: 0, field: 'period', value: formatPistonOscillationPeriod(rerecorded.dataProcessing!.runs[0]!.answers.period.expectedValue!, rerecorded.dataProcessing!.runs[0]) });
rerecorded = send(rerecorded, { type: 'submitPeriodBatch', runIndex: 0 });
assert.equal(rerecorded.dataProcessing?.calculationSession?.knowns.knownVolume?.sourceRecordId, replacement.recordId);
assert.notEqual(rerecorded.dataProcessing?.calculationSession?.knowns.knownVolume?.totalVolumeM3, known.knownVolume!.totalVolumeM3);
assert.equal(rerecorded.dataProcessing?.calculationSession?.answers.gamma.status, 'unresolved');
assert.equal(normalizePistonOscillationFreeSession(JSON.parse(JSON.stringify(rerecorded))).dataProcessing?.calculationSession?.knowns.knownVolume?.sourceRecordId, replacement.recordId);

// Fake-clock coverage for repeated idle, activity, disable, and cleanup.
let now = 0; let id = 0; let active = false;
const tasks = new Map<number, { due: number; callback: () => void }>();
const idle = createPistonExperimentIdleAttention({ schedule: (callback, delay) => { tasks.set(++id, { due: now + delay, callback }); return id; },
  cancel: handle => { tasks.delete(handle as number); }, onChange: value => { active = value; } });
const advance = (ms: number) => { now += ms; for (const [key, task] of tasks) if (task.due <= now) { tasks.delete(key); task.callback(); } };
idle.setEnabled(true); advance(9999); assert.equal(active, false); advance(1); assert.equal(active, true);
idle.activity(); assert.equal(active, false); advance(10000); assert.equal(active, true);
idle.setEnabled(false); advance(10000); assert.equal(active, false);
idle.setEnabled(true); idle.dispose(); advance(10000); assert.equal(active, false); assert.equal(tasks.size, 0);
console.log('Known-volume workflow, direct calculation, persistence, export, review, and idle attention passed.');
