import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const root = process.argv[2];
const outputPath = process.argv[3];
const sourceCommit = process.argv[4];
assert.ok(root && outputPath && sourceCommit, 'Expected extracted source root, output JSON path and source commit.');
const load = (path) => import(pathToFileURL(`${root}/${path}`));
const workflow = await load('src/domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts');
const dp = await load('src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts');
const { createPistonOscillationCurrentRecordTestArtifacts } = await load(
  'tests/pistonOscillation/helpers/pistonOscillationCurrentRecordTestFactory.ts',
);
const { createDefaultHeatCapacityPistonOscillationFile } = await load(
  'src/features/workbench/workbenchState.ts',
);
const { projectWorkbenchPersistenceV3File } = await load(
  'src/features/workbench/persistenceV3/projection.ts',
);
const { encodeWorkbenchPersistenceV3FileProjection, decodeWorkbenchPersistenceV3FileRecord } =
  await load('src/features/workbench/persistenceV3/codecRegistry.ts');
const { commitWorkbenchPersistenceV3ProductionSnapshot } = await load(
  'src/features/workbench/persistenceV3/productionFacade.ts',
);
const { InMemoryWorkbenchPersistenceV3GenerationStore } = await load(
  'src/features/workbench/persistenceV3/generationStore.ts',
);

const sampleRateHz = 1000;
const createMeasurements = (periodSamples = null) => [80, 60, 30].map((targetHeightMm, measurementIndex) => {
  const samples = Array.from({ length: 301 }, (_, sampleIndex) => ({
    sampleIndex,
    timeS: sampleIndex / sampleRateHz,
    absolutePressureKpa: periodSamples
      ? Math.round((101.32 + 4 * Math.cos(2 * Math.PI * sampleIndex / periodSamples[measurementIndex])) * 100) / 100
      : Math.trunc((101.32 + 4 * Math.exp(-2.4 * sampleIndex / sampleRateHz)
        * Math.cos(2 * Math.PI * sampleIndex / (40 - measurementIndex * 4))) * 100) / 100,
  }));
  const artifacts = createPistonOscillationCurrentRecordTestArtifacts({
    lockedHeightMm: targetHeightMm, sampleRateHz, samples,
  });
  return dp.createPistonOscillationRawMeasurementRecord({
    recordId: `synthetic-free-${measurementIndex}`,
    capturedAtMs: 1000 + measurementIndex * 100,
    measurementIndex, targetHeightMm,
    confirmedHeightMm: artifacts.confirmedHeightMm,
    sampleRateHz, triggerThresholdKpa: 120,
    recordedDurationS: 0.3, recordingPath: 'falling-trigger', releaseOffsetS: null,
    samples, pressOperationEvidence: artifacts.pressOperationEvidence,
    sensorObservationSnapshot: artifacts.sensorObservationSnapshot,
    physicsSnapshot: artifacts.physicsSnapshot,
  });
});
const measurements = createMeasurements();

let session = workflow.createDefaultPistonOscillationFreeSession();
for (const event of [
  { type: 'start', nowMs: 100 },
  { type: 'setPlan', targetHeightsMm: [80, 60, 30], nowMs: 110 },
  { type: 'setAcquisitionSetting', field: 'sampleRateHz', value: 1000, nowMs: 120 },
  { type: 'setAcquisitionSetting', field: 'triggerThresholdKpa', value: 120, nowMs: 130 },
  { type: 'setPower', powerOn: true, nowMs: 140 },
  { type: 'saveMeasurement', measurement: measurements[0], nowMs: 1010 },
]) session = workflow.transitionPistonOscillationFreeSession(session, event);
assert.equal(session.savedMeasurements.length, 1);
let savedSession = workflow.transitionPistonOscillationFreeSession(session, {
  type: 'saveMeasurement', measurement: { ...measurements[0], recordId: 'synthetic-free-0-replacement' }, nowMs: 1020,
});
savedSession = workflow.transitionPistonOscillationFreeSession(savedSession, {
  type: 'freezeAcquisition', measurement: measurements[1], nowMs: 1110,
});
assert.equal(savedSession.excludedAttempts.length, 1);
assert.ok(savedSession.acquisitionCandidate);
for (let index = 1; index < measurements.length; index += 1) {
  session = workflow.transitionPistonOscillationFreeSession(session, {
    type: 'saveMeasurement', measurement: measurements[index], nowMs: 1010 + index * 100,
  });
}
assert.equal(session.savedMeasurements.length, 3);
const answerStates = [];
const rememberAnswers = (name, value) => answerStates.push({ name, dataProcessing: structuredClone(value) });
const periodBase = dp.selectPistonOscillationFreePeriodRange(
  session.dataProcessing, measurements, 0, 0.02, 0.25, 1250,
);
const emptyPeriod = dp.submitPistonOscillationPeriodEndpoints(periodBase, 0, 1251);
rememberAnswers('period-empty', emptyPeriod);
rememberAnswers('period-revealed-without-valid-attempt', dp.revealPistonOscillationFreePeriodAnswer(emptyPeriod, 0, 't1', 1252));
const invalidPeriod = dp.submitPistonOscillationPeriodEndpoints(
  dp.updatePistonOscillationPeriodAnswerDraft(periodBase, 0, 't1', 'invalid', 1253), 0, 1254,
);
rememberAnswers('period-invalid', invalidPeriod);
let periodBatch = dp.updatePistonOscillationPeriodAnswerDraft(periodBase, 0, 't1', '999.000', 1255);
periodBatch = dp.updatePistonOscillationPeriodAnswerDraft(periodBatch, 0, 't2', '0.2400', 1256);
periodBatch = dp.revealPistonOscillationFreePeriodEntry(periodBatch, 0, 1257);
periodBatch = dp.updatePistonOscillationPeriodAnswerDraft(periodBatch, 0, 'period', '0.04000', 1258);
periodBatch = dp.submitPistonOscillationFreePeriodBatch(periodBatch, 0, 1259);
assert.equal(periodBatch.runs[0].batchAttempts.length, 1);
rememberAnswers('period-batch-mixed', periodBatch);
rememberAnswers('period-revealed-after-attempt', dp.revealPistonOscillationFreePeriodAnswer(periodBatch, 0, 't1', 1260));
periodBatch = dp.continuePistonOscillationFreePeriodBatch(periodBatch, 0, 1261);
periodBatch = dp.updatePistonOscillationPeriodAnswerDraft(periodBatch, 0, 't1', '0.020', 1262);
periodBatch = dp.updatePistonOscillationPeriodAnswerDraft(periodBatch, 0, 't2', '0.240', 1263);
periodBatch = dp.submitPistonOscillationFreePeriodBatch(periodBatch, 0, 1264);
assert.equal(periodBatch.runs[0].batchAttempts.length, 2);
assert.equal(periodBatch.runs[0].answers.t1.resolution, 'retry-correct');
rememberAnswers('period-batch-retry', periodBatch);
let processing = session.dataProcessing;
for (let runIndex = 0; runIndex < measurements.length; runIndex += 1) {
  processing = dp.selectPistonOscillationFreePeriodRange(
    processing, measurements, runIndex, 0.02, 0.25, 1300 + runIndex * 100,
  );
  const selection = processing.runs[runIndex].selection;
  assert.equal(selection.issue, null);
  for (const [field, value] of [
    ['t1', dp.formatPistonOscillationEndpointTime(selection.leftEndpoint.timeS)],
    ['t2', dp.formatPistonOscillationEndpointTime(selection.rightEndpoint.timeS)],
  ]) processing = dp.updatePistonOscillationPeriodAnswerDraft(
    processing, runIndex, field, value, 1310 + runIndex * 100,
  );
  processing = dp.submitPistonOscillationPeriodEndpoints(processing, runIndex, 1320 + runIndex * 100);
  const expectedPeriod = processing.runs[runIndex].answers.period.expectedValue;
  assert.notEqual(expectedPeriod, null);
  processing = dp.updatePistonOscillationPeriodAnswerDraft(
    processing, runIndex, 'period', dp.formatPistonOscillationPeriod(expectedPeriod),
    1330 + runIndex * 100,
  );
  processing = dp.submitPistonOscillationPeriod(processing, runIndex, 1340 + runIndex * 100);
  assert.ok(processing.runs[runIndex].result);
  processing = dp.advancePistonOscillationPeriodRun(processing, 1350 + runIndex * 100, measurements);
}
rememberAnswers('calculation-selecting-points', processing);
for (let index = 0; index < measurements.length; index += 1) {
  processing = dp.togglePistonOscillationFitRun(processing, index, 1700 + index);
  if (index === 0) rememberAnswers('calculation-selecting-partial', processing);
}
processing = dp.submitPistonOscillationLinearFit(processing, 1800, { requireAllRuns: true });
assert.ok(processing.linearFitResult);
const emptyCalculation = dp.submitPistonOscillationCalculationField(processing, 'area', 1801);
rememberAnswers('calculation-empty', emptyCalculation);
rememberAnswers('calculation-revealed-without-valid-attempt', dp.revealPistonOscillationFreeCalculationAnswer(emptyCalculation, 'area', 1802));
let wrongCalculation = dp.updatePistonOscillationCalculationDraft(processing, 'area', '1', 1803);
wrongCalculation = dp.submitPistonOscillationCalculationField(wrongCalculation, 'area', 1804);
rememberAnswers('calculation-wrong', wrongCalculation);
rememberAnswers('calculation-revealed-after-attempt', dp.revealPistonOscillationFreeCalculationAnswer(wrongCalculation, 'area', 1805));
let calculationBatch = processing;
for (const field of ['area', 'gamma', 'relativeError']) {
  const correct = dp.formatPistonOscillationCalculationAnswer(field, calculationBatch.calculationSession.answers[field].expectedValue);
  calculationBatch = dp.updatePistonOscillationFreeCalculationDraft(
    calculationBatch, field, field === 'gamma' ? '9.999' : field === 'relativeError' ? `${correct}0` : correct, 1806,
  );
  if (field !== 'relativeError') calculationBatch = dp.revealNextPistonOscillationFreeCalculationField(calculationBatch, field, 1807);
}
calculationBatch = dp.submitPistonOscillationFreeCalculationBatch(calculationBatch, 1808);
assert.equal(calculationBatch.calculationSession.batchAttempts.length, 1);
rememberAnswers('calculation-batch-mixed', calculationBatch);
calculationBatch = dp.continuePistonOscillationFreeCalculationBatch(calculationBatch, 1809);
for (const field of ['gamma', 'relativeError']) {
  calculationBatch = dp.updatePistonOscillationFreeCalculationDraft(
    calculationBatch, field,
    dp.formatPistonOscillationCalculationAnswer(field, calculationBatch.calculationSession.answers[field].expectedValue), 1810,
  );
}
calculationBatch = dp.submitPistonOscillationFreeCalculationBatch(calculationBatch, 1811);
assert.equal(calculationBatch.calculationSession.batchAttempts.length, 2);
assert.equal(calculationBatch.calculationSession.answers.gamma.resolution, 'retry-correct');
rememberAnswers('calculation-batch-retry', calculationBatch);
for (const field of ['area', 'gamma', 'relativeError']) {
  processing = dp.updatePistonOscillationCalculationDraft(
    processing, field,
    dp.formatPistonOscillationCalculationAnswer(field, processing.calculationSession.answers[field].expectedValue),
    1810,
  );
  processing = dp.submitPistonOscillationCalculationField(processing, field, 1820);
}
assert.equal(processing.calculationSession.status, 'ready-to-exit');
processing = dp.completePistonOscillationCalculation(processing, 1850);
assert.equal(processing.status, 'completed');
const unknownHistory = structuredClone(processing);
unknownHistory.runs[0].answers.t1.attempts = [];
unknownHistory.calculationSession.answers.gamma.attempts = [];
rememberAnswers('legacy-unknown-attempt-history', dp.normalizePistonOscillationDataProcessingSession(
  unknownHistory, measurements, 1851, { answerValidationMode: 'batch' },
));
assert.equal(dp.updatePistonOscillationFreeCalculationDraft(calculationBatch, 'gamma', 'wrong', 1852), calculationBatch);
assert.equal(dp.submitPistonOscillationFreeCalculationBatch(calculationBatch, 1853), calculationBatch);
session = { ...session, dataProcessing: processing, updatedAtMs: 1900 };

const files = ['empty', 'saved', 'processed'].map((name, index) => {
  const file = createDefaultHeatCapacityPistonOscillationFile(index + 1);
  file.id = `synthetic-free-${workflow.PISTON_OSCILLATION_FREE_SESSION_SCHEMA_VERSION}-${name}`;
  file.name = `Synthetic legacy ${name}`;
  file.createdAt = 10;
  file.updatedAt = 20;
  file.lastOpenedAt = 30;
  if (name !== 'empty') file.pistonOscillationFreeSession = name === 'saved' ? savedSession : session;
  return file;
});
files.forEach((file, index) => {
  const projected = projectWorkbenchPersistenceV3File(file, index + 1);
  assert.equal(projected.ok, true, JSON.stringify(projected.diagnostics));
  const encoded = encodeWorkbenchPersistenceV3FileProjection(projected.value, index + 1);
  assert.equal(encoded.ok, true, JSON.stringify(encoded.diagnostics));
  const decoded = decodeWorkbenchPersistenceV3FileRecord(encoded.value, index + 1);
  assert.equal(decoded.ok, true, JSON.stringify(decoded.diagnostics));
  assert.equal(decoded.status, 'exact');
});
const answerCases = answerStates.map(({ name, dataProcessing }) => {
  const file = { ...files[2], pistonOscillationFreeSession: { ...session, dataProcessing } };
  const projected = projectWorkbenchPersistenceV3File(file, 3);
  assert.ok(projected.ok, name);
  const encoded = encodeWorkbenchPersistenceV3FileProjection(projected.value, 3);
  assert.ok(encoded.ok, `${name}: ${JSON.stringify(encoded.diagnostics)}`);
  const decoded = decodeWorkbenchPersistenceV3FileRecord(encoded.value, 3);
  assert.ok(decoded.ok, name);
  assert.equal(decoded.status, 'exact', name);
  return { name, dataProcessing: decoded.value.fields.authoritative.freeSession.dataProcessing };
});
// The old OLS can produce a negative R² through IEEE754 roundoff when the
// covariance is effectively zero. Capture its actual file, not a mutated fit.
const periodSamples = [41, 55, 43];
const roundoffMeasurements = createMeasurements(periodSamples);
let roundoffSession = workflow.createDefaultPistonOscillationFreeSession();
for (const event of [
  { type: 'start', nowMs: 100 },
  { type: 'setPlan', targetHeightsMm: [80, 60, 30], nowMs: 110 },
  { type: 'setAcquisitionSetting', field: 'sampleRateHz', value: 1000, nowMs: 120 },
  { type: 'setAcquisitionSetting', field: 'triggerThresholdKpa', value: 120, nowMs: 130 },
  { type: 'setPower', powerOn: true, nowMs: 140 },
  ...roundoffMeasurements.map((measurement, index) => ({ type: 'saveMeasurement', measurement, nowMs: 1010 + index * 100 })),
]) roundoffSession = workflow.transitionPistonOscillationFreeSession(roundoffSession, event);
let roundoffProcessing = roundoffSession.dataProcessing;
for (let index = 0; index < roundoffMeasurements.length; index += 1) {
  const periodS = periodSamples[index] / sampleRateHz;
  roundoffProcessing = dp.selectPistonOscillationFreePeriodRange(
    roundoffProcessing, roundoffMeasurements, index, periodS * 0.95, periodS * 5.05, 1300 + index * 100,
  );
  const selection = roundoffProcessing.runs[index].selection;
  assert.equal(selection.issue, null);
  for (const [field, endpoint] of [['t1', selection.leftEndpoint], ['t2', selection.rightEndpoint]]) {
    roundoffProcessing = dp.updatePistonOscillationPeriodAnswerDraft(
      roundoffProcessing, index, field, dp.formatPistonOscillationEndpointTime(endpoint.timeS), 1310 + index * 100,
    );
  }
  roundoffProcessing = dp.submitPistonOscillationPeriodEndpoints(roundoffProcessing, index, 1320 + index * 100);
  roundoffProcessing = dp.updatePistonOscillationPeriodAnswerDraft(
    roundoffProcessing, index, 'period', dp.formatPistonOscillationPeriod(roundoffProcessing.runs[index].answers.period.expectedValue), 1330 + index * 100,
  );
  roundoffProcessing = dp.submitPistonOscillationPeriod(roundoffProcessing, index, 1340 + index * 100);
  assert.equal(roundoffProcessing.runs[index].result.periodS, periodS);
  roundoffProcessing = dp.advancePistonOscillationPeriodRun(roundoffProcessing, 1350 + index * 100, roundoffMeasurements);
}
for (let index = 0; index < roundoffMeasurements.length; index += 1) {
  roundoffProcessing = dp.togglePistonOscillationFitRun(roundoffProcessing, index, 1700 + index);
}
roundoffProcessing = dp.submitPistonOscillationLinearFit(roundoffProcessing, 1800, { requireAllRuns: true });
assert.equal(roundoffProcessing.linearFitResult.rSquared, -Number.EPSILON);
const roundoffFile = {
  ...files[2], id: `${files[2].id}-roundoff`, name: 'Synthetic legacy OLS roundoff',
  pistonOscillationFreeSession: { ...roundoffSession, dataProcessing: roundoffProcessing, updatedAtMs: 1900 },
};
const roundoffProjection = projectWorkbenchPersistenceV3File(roundoffFile, 4);
assert.ok(roundoffProjection.ok);
const roundoffRecord = encodeWorkbenchPersistenceV3FileProjection(roundoffProjection.value, 4);
assert.ok(roundoffRecord.ok);
assert.equal(decodeWorkbenchPersistenceV3FileRecord(roundoffRecord.value, 4).status, 'exact');
const fitCases = [{
  name: 'negative-r-squared-roundoff',
  sampleFormula: 'round((101.32 + 4 * cos(2 * PI * sampleIndex / [41,55,43][measurementIndex])) * 100) / 100',
  record: roundoffRecord.value,
}];
const store = new InMemoryWorkbenchPersistenceV3GenerationStore();
const { generation } = await commitWorkbenchPersistenceV3ProductionSnapshot({
  store, namespace: 'synthetic-legacy-piston-fixture',
  generationId: `synthetic-free-${workflow.PISTON_OSCILLATION_FREE_SESSION_SCHEMA_VERSION}`,
  capturedAtMs: 2000,
  snapshot: { files: files.slice(0, 2), closedFiles: files.slice(2), activeFileId: files[1].id, selectedPanel: 'preview' },
});
const provenance = {
  sourceCommit,
  description: 'Synthetic empty, one saved measurement with a retained excluded attempt and acquisition candidate, and completed Free experiments generated by the source commit models and production facade; no user data.',
  sampleFormula: 'trunc((101.32 + 4 * exp(-2.4 * sampleIndex / 1000) * cos(2 * PI * sampleIndex / (40 - measurementIndex * 4))) * 100) / 100',
  sampleCount: 301,
};
await writeFile(outputPath, JSON.stringify({ provenance, generation, answerCases, fitCases }) + '\n');
console.log(JSON.stringify({ freeVersion: workflow.PISTON_OSCILLATION_FREE_SESSION_SCHEMA_VERSION,
  records: files.length, answerCases: answerCases.length, fitCases: fitCases.length, processingStatus: processing.status, calculationStatus: processing.calculationSession.status }));
