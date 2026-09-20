import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  decodeWorkbenchPersistenceV3FileRecord,
  encodeWorkbenchPersistenceV3FileProjection,
  type WorkbenchPersistenceV3FileRecord,
} from '../../src/features/workbench/persistenceV3/codecRegistry.ts';
import {
  projectWorkbenchPersistenceV3File,
  reprojectWorkbenchPersistenceV3File,
} from '../../src/features/workbench/persistenceV3/projection.ts';
import {
  InMemoryWorkbenchPersistenceV3GenerationStore,
  type WorkbenchPersistenceV3StoredGeneration,
} from '../../src/features/workbench/persistenceV3/generationStore.ts';
import {
  commitWorkbenchPersistenceV3ProductionSnapshot,
  restoreWorkbenchPersistenceV3ProductionWorkspace,
  type WorkbenchPersistenceV3ProductionContent,
} from '../../src/features/workbench/persistenceV3/productionFacade.ts';
import {
  WORKBENCH_PERSISTENCE_V3_FINGERPRINT_PROVIDER,
} from '../../src/features/workbench/persistenceV3/fingerprint.ts';
import {
  createDefaultHeatCapacityPistonOscillationFile,
} from '../../src/features/workbench/workbenchState.ts';
import {
  completePistonOscillationCalculation,
  formatPistonOscillationCalculationAnswer,
  submitPistonOscillationCalculationField,
  submitPistonOscillationLinearFit,
  togglePistonOscillationFitRun,
  updatePistonOscillationCalculationDraft,
  type PistonOscillationDataProcessingSession,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import type {
  PistonOscillationFreeSession,
} from '../../src/domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';

const recordOf = (value: unknown): Record<string, unknown> => {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value));
  return value as Record<string, unknown>;
};
const recordsOf = (value: unknown) => {
  assert.ok(Array.isArray(value));
  return value.map(recordOf);
};
const fixtureSources = [
  ['pistonLegacyFreeV640.json', 'b7c81778516b90ca28c20681b1dcf2c1ca3f07d2', 8],
  ['pistonLegacyFreeV9.json', 'bd231f5fe264a7f1a1e2cac76e15ec03e0d41b96', 9],
] as const;
let isolatedCaseCount = 0;
let legalAnswerCaseCount = 0;
let legacyFitCaseCount = 0;

for (const [filename, sourceCommit, sourceVersion] of fixtureSources) {
  // These fixtures were encoded by the source commit's actual models and
  // production facade. Changing only a current session's version misses the
  // old frozen snapshot, raw measurement, audit and processing contracts.
  const fixture = JSON.parse(await readFile(new URL(`./fixtures/${filename}`, import.meta.url), 'utf8')) as {
    provenance: { sourceCommit: string };
    generation: WorkbenchPersistenceV3StoredGeneration<WorkbenchPersistenceV3ProductionContent>;
    answerCases: Array<{ name: string; dataProcessing: PistonOscillationDataProcessingSession }>;
    fitCases: Array<{ name: string; record: WorkbenchPersistenceV3FileRecord }>;
  };
  assert.equal(fixture.provenance.sourceCommit, sourceCommit);
  const generation = fixture.generation;
  assert.equal(
    await WORKBENCH_PERSISTENCE_V3_FINGERPRINT_PROVIDER.fingerprint(generation.content),
    generation.contentFingerprint,
    'the original synthetic generation fingerprint must remain valid',
  );
  const sourceRecords = generation.content.workspace.records as WorkbenchPersistenceV3FileRecord[];
  const answerCase = (name: string) => {
    const found = fixture.answerCases.find((entry) => entry.name === name);
    assert.ok(found, `Missing old-model answer case ${name}`);
    return structuredClone(found.dataProcessing);
  };
  const restoredFiles = [];
  for (const sourceRecord of sourceRecords) {
    const untouched = structuredClone(sourceRecord);
    const sourceAuthority = sourceRecord.projection.fields.authoritative;
    const sourceFree = recordOf(sourceAuthority.freeSession);
    assert.equal(sourceAuthority.pistonGuideSessionProjectionVersion, 3);
    assert.equal(sourceFree.schemaVersion, sourceVersion);
    const decoded = decodeWorkbenchPersistenceV3FileRecord(sourceRecord);
    assert.equal(decoded.ok, true, `${sourceRecord.fileId}: ${JSON.stringify(decoded.diagnostics)}`);
    if (!decoded.ok) throw new Error('Expected a known legacy Free session to migrate.');
    assert.equal(decoded.status, 'migrated');
    assert.deepEqual(sourceRecord, untouched, 'migration must not mutate the original record');
    const current = recordOf(decoded.value.fields.authoritative.freeSession);
    assert.equal(current.schemaVersion, 10);
    const group = recordOf(current.experimentGroup);
    assert.equal(Object.hasOwn(current, 'frozenParameterSnapshot'), false);
    if (sourceVersion === 8) {
      assert.equal(group.provenance, 'legacy-inferred');
      assert.equal(group.groupId, `piston-free-group:legacy:${sourceFree.startedAtMs ?? 0}`);
      assert.deepEqual(group.parameterSnapshot, sourceFree.frozenParameterSnapshot);
      if (sourceFree.frozenParameterSnapshot !== null) {
        assert.deepEqual(group.lock, {
          schemaVersion: 1,
          lockedAtMs: recordOf(sourceFree.frozenParameterSnapshot).frozenAtMs,
          reason: 'legacy-evidence',
        });
      }
    } else assert.deepEqual(group, sourceFree.experimentGroup);
    for (const key of [
      'parameterDraft', 'sampleRateHz', 'triggerThresholdKpa', 'experimentPlan',
      'savedMeasurementTargetIds', 'primaryCycleEligibilityByRecordId', 'instrumentState',
    ]) assert.deepEqual(current[key], sourceFree[key], `preserve ${key}`);
    const oldMeasurements = recordsOf(sourceFree.savedMeasurements);
    const newMeasurements = recordsOf(current.savedMeasurements);
    assert.equal(newMeasurements.length, oldMeasurements.length);
    const assertMeasurementPreserved = (oldMeasurement: Record<string, unknown>, newMeasurement: unknown) => {
      const expected = structuredClone(oldMeasurement);
      expected.schemaVersion = 7;
      expected.experimentContext = {
        schemaVersion: 1, groupId: group.groupId, scheme: group.scheme,
        parameterProfileVersion: group.parameterProfileVersion, provenance: 'legacy-inferred',
      };
      if (sourceVersion === 8) {
        const physics = recordOf(expected.physicsSnapshot);
        physics.gasMaterial = { ...recordOf(physics.airMaterial), gasType: 'air' };
        delete physics.airMaterial;
      }
      assert.deepEqual(newMeasurement, expected, 'only material/context version fields may change');
    };
    for (const [index, oldMeasurement] of oldMeasurements.entries()) {
      assertMeasurementPreserved(oldMeasurement, newMeasurements[index]);
    }
    if (sourceFree.acquisitionCandidate !== null) {
      assertMeasurementPreserved(recordOf(sourceFree.acquisitionCandidate), current.acquisitionCandidate);
    }
    const oldExcluded = recordsOf(sourceFree.excludedAttempts);
    const newExcluded = recordsOf(current.excludedAttempts);
    assert.equal(newExcluded.length, oldExcluded.length);
    for (const [index, attempt] of oldExcluded.entries()) {
      const { measurement: oldMeasurement, ...oldEvidence } = attempt;
      const { measurement: newMeasurement, ...newEvidence } = newExcluded[index]!;
      assert.deepEqual(newEvidence, oldEvidence);
      assertMeasurementPreserved(recordOf(oldMeasurement), newMeasurement);
    }
    for (const key of Object.keys(sourceAuthority).filter((key) => key !== 'freeSession')) {
      assert.deepEqual(decoded.value.fields.authoritative[key], sourceAuthority[key], `preserve authority ${key}`);
    }
    const oldProcessing = sourceFree.dataProcessing as PistonOscillationDataProcessingSession | null;
    if (oldProcessing !== null) {
      const processing = current.dataProcessing as PistonOscillationDataProcessingSession;
      assert.equal(oldProcessing.status, 'completed');
      assert.equal(processing.status, 'calculation-ready');
      assert.equal(processing.linearFitResult, null);
      assert.equal(processing.calculationSession?.status, 'selecting-points');
      assert.deepEqual(processing.calculationSession?.selectedRunIndices, []);
      assert.deepEqual(processing.audit, oldProcessing.audit);
      for (const [index, run] of processing.runs.entries()) {
        const oldRun = oldProcessing.runs[index]!;
        assert.deepEqual(run.selection, oldRun.selection);
        assert.deepEqual(run.answers, oldRun.answers, 'valid endpoint/period answer evidence must survive');
        assert.deepEqual(run.batchAttempts, oldRun.batchAttempts);
        assert.equal(run.result?.periodS, oldRun.result?.periodS);
        assert.equal(run.result?.leftSampleIndex, oldRun.result?.leftSampleIndex);
        assert.equal(run.result?.rightSampleIndex, oldRun.result?.rightSampleIndex);
        assert.equal(run.result?.completedAtMs, oldRun.result?.completedAtMs);
      }
    }
    const runtime = reprojectWorkbenchPersistenceV3File(decoded.value);
    assert.ok(runtime.ok);
    if (!runtime.ok) throw new Error('Expected migrated runtime.');
    restoredFiles.push(runtime.value);
    const encodedAgain = encodeWorkbenchPersistenceV3FileProjection(decoded.value);
    assert.ok(encodedAgain.ok);
    if (!encodedAgain.ok) throw new Error('Expected migrated record to encode.');
    const exact = decodeWorkbenchPersistenceV3FileRecord(encodedAgain.value);
    assert.ok(exact.ok);
    assert.equal(exact.status, 'exact');
    if (exact.ok) assert.deepEqual(exact.value, decoded.value);
  }

  const store = new InMemoryWorkbenchPersistenceV3GenerationStore();
  await store.stageCandidate(generation);
  await store.compareAndSwapHead({ namespace: generation.namespace, generationId: generation.generationId, expectedRevision: 0 });
  const restored = await restoreWorkbenchPersistenceV3ProductionWorkspace(store, generation.namespace);
  assert.ok(restored);
  assert.equal(restored.usedPreviousGeneration, false);
  assert.deepEqual(restored.files.map(({ id }) => id), generation.content.openFileIds);
  assert.deepEqual(restored.closedFiles.map(({ id }) => id), generation.content.closedFileIds);
  assert.equal(restored.activeFileId, generation.content.workspace.manifest.activeFileId);
  assert.deepEqual(restored.retained.preservedEntries, []);
  assert.deepEqual(restored.retained.opaqueFiles, []);
  await commitWorkbenchPersistenceV3ProductionSnapshot({
    store, namespace: generation.namespace, generationId: `${generation.generationId}-current`, capturedAtMs: 3000,
    snapshot: restored, retained: restored.retained,
  });
  const reopened = await restoreWorkbenchPersistenceV3ProductionWorkspace(store, generation.namespace);
  assert.ok(reopened);
  assert.deepEqual(reopened.files, restored.files);
  assert.deepEqual(reopened.closedFiles, restored.closedFiles);

  const mixedGeneration = structuredClone(generation);
  const futureRecord = mixedGeneration.content.workspace.records[1] as WorkbenchPersistenceV3FileRecord;
  recordOf(futureRecord.projection.fields.authoritative.freeSession).schemaVersion = 999;
  mixedGeneration.contentFingerprint = await WORKBENCH_PERSISTENCE_V3_FINGERPRINT_PROVIDER.fingerprint(mixedGeneration.content);
  const mixedStore = new InMemoryWorkbenchPersistenceV3GenerationStore();
  await mixedStore.stageCandidate(mixedGeneration);
  await mixedStore.compareAndSwapHead({ namespace: mixedGeneration.namespace, generationId: mixedGeneration.generationId, expectedRevision: 0 });
  const mixed = await restoreWorkbenchPersistenceV3ProductionWorkspace(mixedStore, mixedGeneration.namespace);
  assert.ok(mixed);
  assert.equal(mixed.usedPreviousGeneration, false);
  assert.deepEqual(mixed.files.map(({ id }) => id), [sourceRecords[0]!.fileId]);
  assert.deepEqual(mixed.closedFiles.map(({ id }) => id), [sourceRecords[2]!.fileId]);
  assert.equal(mixed.retained.preservedEntries.length, 1);
  assert.deepEqual(mixed.retained.preservedEntries[0]!.raw, futureRecord);
  await commitWorkbenchPersistenceV3ProductionSnapshot({
    store: mixedStore, namespace: mixedGeneration.namespace, generationId: `${generation.generationId}-mixed-current`, capturedAtMs: 3100,
    snapshot: mixed, retained: mixed.retained,
  });
  const mixedAgain = await restoreWorkbenchPersistenceV3ProductionWorkspace(mixedStore, mixedGeneration.namespace);
  assert.ok(mixedAgain);
  assert.deepEqual(mixedAgain.retained.preservedEntries[0]!.raw, futureRecord);

  const processedFile = restoredFiles.at(-1)!;
  assert.equal(processedFile.kind, 'heatCapacityPistonOscillation');
  if (processedFile.kind !== 'heatCapacityPistonOscillation') throw new Error('Expected piston file.');
  let processing = processedFile.pistonOscillationFreeSession.dataProcessing!;
  for (let index = 0; index < processing.runs.length; index += 1) {
    processing = togglePistonOscillationFitRun(processing, index, 4000 + index);
  }
  processing = submitPistonOscillationLinearFit(processing, 4100, { requireAllRuns: true });
  for (const field of ['area', 'gamma', 'relativeError'] as const) {
    processing = updatePistonOscillationCalculationDraft(
      processing, field,
      formatPistonOscillationCalculationAnswer(field, processing.calculationSession!.answers[field].expectedValue!),
      4200,
    );
    processing = submitPistonOscillationCalculationField(processing, field, 4300);
  }
  processing = completePistonOscillationCalculation(processing, 4400);
  assert.equal(processing.status, 'completed');
  processedFile.pistonOscillationFreeSession.dataProcessing = processing;
  const currentProjection = projectWorkbenchPersistenceV3File(processedFile);
  assert.ok(currentProjection.ok);
  if (!currentProjection.ok) throw new Error('Expected current completed experiment to project.');
  const currentEncoded = encodeWorkbenchPersistenceV3FileProjection(currentProjection.value);
  assert.ok(currentEncoded.ok);
  if (!currentEncoded.ok) throw new Error('Expected current completed experiment to encode.');
  const currentDecoded = decodeWorkbenchPersistenceV3FileRecord(currentEncoded.value);
  assert.ok(currentDecoded.ok);
  assert.equal(currentDecoded.status, 'exact');
  if (currentDecoded.ok) {
    assert.deepEqual((currentDecoded.value.fields.authoritative.freeSession as PistonOscillationFreeSession).dataProcessing, processing);
  }

  const observedOutcomes = new Set<string>();
  for (const { name, dataProcessing } of fixture.answerCases) {
    const source = structuredClone(sourceRecords[2]!);
    recordOf(source.projection.fields.authoritative.freeSession).dataProcessing = dataProcessing;
    const decoded = decodeWorkbenchPersistenceV3FileRecord(source);
    assert.ok(decoded.ok, `${sourceVersion}: legal ${name}: ${JSON.stringify(decoded.diagnostics)}`);
    if (!decoded.ok) throw new Error(`Expected legal old-model ${name}`);
    assert.equal(decoded.status, 'migrated');
    const restored = (decoded.value.fields.authoritative.freeSession as PistonOscillationFreeSession).dataProcessing!;
    for (const [index, run] of dataProcessing.runs.entries()) {
      assert.deepEqual(restored.runs[index]!.answers, run.answers, `${name}: preserve period answer evidence`);
      assert.deepEqual(restored.runs[index]!.batchAttempts, run.batchAttempts, `${name}: preserve period batch evidence`);
    }
    assert.deepEqual(restored.audit, dataProcessing.audit);
    if (dataProcessing.calculationSession !== null) {
      assert.equal(restored.calculationSession?.status, 'selecting-points');
    }
    for (const answers of [
      ...dataProcessing.runs.map((run) => Object.values(run.answers)),
      Object.values(dataProcessing.calculationSession?.answers ?? {}),
    ]) {
      for (const answer of answers) for (const attempt of answer.attempts) observedOutcomes.add(attempt.outcome);
    }
    legalAnswerCaseCount += 1;
  }
  assert.deepEqual([...observedOutcomes].sort(), ['correct', 'empty', 'invalid', 'numeric-wrong', 'precision-wrong', 'unknown', 'wrong']);

  for (const { name, record } of fixture.fitCases) {
    const source = recordOf(record.projection.fields.authoritative.freeSession);
    const original = source.dataProcessing as PistonOscillationDataProcessingSession;
    assert.equal(original.linearFitResult!.rSquared, -Number.EPSILON);
    const decoded = decodeWorkbenchPersistenceV3FileRecord(record);
    assert.ok(decoded.ok, `${sourceVersion}: legal ${name}: ${JSON.stringify(decoded.diagnostics)}`);
    if (!decoded.ok) throw new Error(`Expected legal old-model ${name}`);
    assert.equal(decoded.status, 'migrated');
    const restored = (decoded.value.fields.authoritative.freeSession as PistonOscillationFreeSession).dataProcessing!;
    assert.equal(restored.linearFitResult, null);
    assert.equal(restored.calculationSession?.status, 'selecting-points');
    for (const [index, run] of original.runs.entries()) {
      assert.deepEqual(restored.runs[index]!.answers, run.answers);
      assert.equal(restored.runs[index]!.result?.periodS, run.result?.periodS);
    }
    assert.deepEqual(restored.audit, original.audit);
    legacyFitCaseCount += 1;
    for (const field of ['rSquared', 'slopeMPerS2', 'interceptM']) {
      const malformed = structuredClone(record);
      const fit = recordOf(recordOf(recordOf(malformed.projection.fields.authoritative.freeSession).dataProcessing).linearFitResult);
      fit[field] = field === 'rSquared' ? (fit[field] as number) * 2 : (fit[field] as number) + 0.001;
      const rejected = decodeWorkbenchPersistenceV3FileRecord(malformed);
      assert.equal(rejected.ok, false, `${sourceVersion}: changed negative-R² fit ${field}`);
      if (rejected.ok) throw new Error('Expected corrupted negative-R² fit isolation.');
      assert.deepEqual(rejected.raw, malformed);
      isolatedCaseCount += 1;
    }
  }

  const negativeCases: Array<[string, number, (authority: Record<string, unknown>, free: Record<string, unknown>) => void]> = [
    ['pre-fit state retaining submitted answer', 2, (_, free) => {
      const processing = answerCase('calculation-empty');
      free.dataProcessing = processing;
      const calculation = processing.calculationSession!;
      calculation.status = 'selecting-points';
      calculation.activeFieldId = null;
      calculation.visibleFieldIds = [];
      processing.linearFitResult = null;
    }],
    ['future Free version', 0, (_, free) => { free.schemaVersion = 999; }],
    ['unknown Free version', 0, (_, free) => { free.schemaVersion = 7; }],
    ['non-numeric Free version', 0, (_, free) => { free.schemaVersion = '8'; }],
    ['missing Free version', 0, (_, free) => { delete free.schemaVersion; }],
    ['unknown authority', 0, (authority) => { authority.unknownAuthority = true; }],
    ['missing current demo authority', 0, (authority) => { delete authority.demoSession; }],
    ['missing current intro authority', 0, (authority) => { delete authority.lessonIntroAutoShown; }],
    ['missing current Free authority', 0, (authority) => { delete authority.freeSession; }],
    ['current Guide corruption', 0, (authority) => { recordOf(authority.guideSession).status = 'corrupt'; }],
    ['unknown Free field', 0, (_, free) => { free.unknownAuthority = true; }],
    ['invalid draft', 1, (_, free) => { recordOf(free.parameterDraft).ambientPressureKpa = -1; }],
    ['future audit', 1, (_, free) => { recordsOf(free.audit)[0]!.schemaVersion = 999; }],
    ['unknown audit field', 1, (_, free) => { recordsOf(free.audit)[0]!.unknownAuthority = true; }],
    ['future measurement', 1, (_, free) => { recordsOf(free.savedMeasurements)[0]!.schemaVersion = 999; }],
    ['unknown candidate field', 1, (_, free) => { recordOf(free.acquisitionCandidate).unknownAuthority = true; }],
    ['future excluded measurement', 1, (_, free) => { recordOf(recordsOf(free.excludedAttempts)[0]!.measurement).schemaVersion = 999; }],
    ['unknown measurement field', 1, (_, free) => { recordsOf(free.savedMeasurements)[0]!.unknownAuthority = true; }],
    ['invalid sample', 1, (_, free) => { recordsOf(recordsOf(free.savedMeasurements)[0]!.samples)[1]!.sampleIndex = 99; }],
    ['future processing', 2, (_, free) => { recordOf(free.dataProcessing).schemaVersion = 999; }],
    ['unknown processing field', 2, (_, free) => { recordOf(free.dataProcessing).unknownAuthority = true; }],
    ['invalid processing status', 2, (_, free) => { recordOf(free.dataProcessing).status = 'corrupt'; }],
    ['unknown fit algorithm', 2, (_, free) => { recordOf(recordOf(free.dataProcessing).linearFitResult).algorithmVersion = 'future-fit'; }],
    ['unreleased fit/session combination', 2, (_, free) => { recordOf(recordOf(free.dataProcessing).linearFitResult).algorithmVersion = 'display-rounded-ordinary-least-squares-v2'; }],
    ['unknown calculation algorithm', 2, (_, free) => { recordOf(recordOf(recordOf(free.dataProcessing).calculationSession).knowns).modelVersion = 'future-calculation'; }],
    ['unreleased calculation/session combination', 2, (_, free) => { recordOf(recordOf(recordOf(free.dataProcessing).calculationSession).knowns).modelVersion = 'display-rounded-piston-slope-calculation-v2'; }],
    ['negative fit point index', 2, (_, free) => { recordsOf(recordOf(recordOf(free.dataProcessing).linearFitResult).points)[0]!.runIndex = -1; }],
    ['unrelated fit record', 2, (_, free) => { recordsOf(recordOf(recordOf(free.dataProcessing).linearFitResult).points)[0]!.rawMeasurementRecordId = 'missing'; }],
    ['changed fit point height', 2, (_, free) => { recordsOf(recordOf(recordOf(free.dataProcessing).linearFitResult).points)[0]!.heightMm = 81; }],
    ['changed fit point period', 2, (_, free) => { recordsOf(recordOf(recordOf(free.dataProcessing).linearFitResult).points)[0]!.periodSquaredS2 = 99; }],
    ['out-of-range fit quality', 2, (_, free) => { recordOf(recordOf(free.dataProcessing).linearFitResult).rSquared = 100; }],
    ['mismatched calculation run selection', 2, (_, free) => { recordOf(recordOf(free.dataProcessing).calculationSession).selectedRunIndices = []; }],
    ['duplicate visible calculation field', 2, (_, free) => { recordOf(recordOf(free.dataProcessing).calculationSession).visibleFieldIds = ['area', 'area']; }],
    ['incomplete completed calculation', 2, (_, free) => { recordOf(recordOf(recordOf(recordOf(free.dataProcessing).calculationSession).answers).gamma).status = 'unresolved'; }],
    ['invalid period evidence', 2, (_, free) => { recordOf(recordsOf(recordOf(free.dataProcessing).runs)[0]!.result).periodS = 99; }],
    ['extremum outside samples', 2, (_, free) => { recordsOf(recordOf(Object.values(recordOf(free.primaryCycleEligibilityByRecordId))[0]).primaryExtrema)[0]!.sampleIndex = 999999; }],
    ['extremum time mismatch', 2, (_, free) => { recordsOf(recordOf(Object.values(recordOf(free.primaryCycleEligibilityByRecordId))[0]).primaryExtrema)[0]!.timeS = 100; }],
    ['extremum pressure mismatch', 2, (_, free) => { recordsOf(recordOf(Object.values(recordOf(free.primaryCycleEligibilityByRecordId))[0]).primaryExtrema)[0]!.absolutePressureKpa = 100; }],
    ['negative primary period count', 2, (_, free) => { recordOf(Object.values(recordOf(free.primaryCycleEligibilityByRecordId))[0]).primaryPeriodCount = -1; }],
    ['inconsistent primary period count', 2, (_, free) => { recordOf(Object.values(recordOf(free.primaryCycleEligibilityByRecordId))[0]).primaryPeriodCount = 999; }],
    ['inconsistent eligibility status', 2, (_, free) => { recordOf(Object.values(recordOf(free.primaryCycleEligibilityByRecordId))[0]).status = 'unusable'; }],
    ['incorrect post-release sample range', 2, (_, free) => { recordOf(Object.values(recordOf(free.primaryCycleEligibilityByRecordId))[0]).analysisSampleCount = 300; }],
    ['future eligibility algorithm', 2, (_, free) => { recordOf(Object.values(recordOf(free.primaryCycleEligibilityByRecordId))[0]).algorithmVersion = 'future'; }],
    ['unknown processing audit event', 2, (_, free) => { recordsOf(recordOf(free.dataProcessing).audit)[0]!.type = 'unknown-future-event'; }],
    ['processing audit index outside runs', 2, (_, free) => { recordsOf(recordOf(free.dataProcessing).audit)[0]!.runIndex = 999999; }],
    ['processing audit wrong scope', 2, (_, free) => { recordsOf(recordOf(free.dataProcessing).audit)[0]!.runIndex = -1; }],
    ['unknown calculation field', 2, (_, free) => { recordOf(recordOf(free.dataProcessing).calculationSession).unknownAuthority = true; }],
    ['correct calculation with false numeric flag', 2, (_, free) => { recordsOf(recordOf(recordOf(recordOf(recordOf(free.dataProcessing).calculationSession).answers).gamma).attempts)[0]!.numericCorrect = false; }],
    ['correct calculation with false precision flag', 2, (_, free) => { recordsOf(recordOf(recordOf(recordOf(recordOf(free.dataProcessing).calculationSession).answers).gamma).attempts)[0]!.precisionCorrect = false; }],
    ['correct calculation with revealed resolution', 2, (_, free) => { recordOf(recordOf(recordOf(recordOf(free.dataProcessing).calculationSession).answers).gamma).resolution = 'revealed-without-valid-attempt'; }],
    ['correct calculation with wrong feedback', 2, (_, free) => { recordOf(recordOf(recordOf(recordOf(free.dataProcessing).calculationSession).answers).gamma).feedback = { outcome: 'wrong', numericCorrect: false, precisionCorrect: false }; }],
  ];
  for (const field of ['draftRaw', 'attempts', 'feedback', 'batchAttempts', 'areaExpectedValue', 'gammaExpectedValue', 'relativeErrorExpectedValue']) {
    negativeCases.push([`pre-fit state with ${field}`, 2, (_, free) => {
      const processing = answerCase('calculation-selecting-partial');
      free.dataProcessing = processing;
      const calculation = processing.calculationSession!;
      const submitted = answerCase('calculation-empty').calculationSession!;
      if (field === 'draftRaw') calculation.answers.area.draftRaw = '0.1';
      else if (field === 'attempts') calculation.answers.area.attempts = submitted.answers.area.attempts;
      else if (field === 'feedback') calculation.answers.area.feedback = submitted.answers.area.feedback;
      else if (field === 'batchAttempts') calculation.batchAttempts = answerCase('calculation-batch-mixed').calculationSession!.batchAttempts;
      else if (field === 'areaExpectedValue') calculation.answers.area.expectedValue = 1;
      else if (field === 'gammaExpectedValue') calculation.answers.gamma.expectedValue = 1;
      else calculation.answers.relativeError.expectedValue = 1;
    }]);
  }
  for (const field of ['t1', 't2', 'period']) {
    negativeCases.push([`${field} correct period answer with false numeric flag`, 2, (_, free) => {
      recordsOf(recordOf(recordOf(recordsOf(recordOf(free.dataProcessing).runs)[0]!.answers)[field]).attempts)[0]!.numericCorrect = false;
    }]);
  }
  for (const scope of ['period', 'calculation'] as const) {
    for (const change of ['numericCorrect', 'allCorrect', 'attemptIndex', 'attemptedAtMs']) {
      negativeCases.push([`${scope} batch contradictory ${change}`, 2, (_, free) => {
        const processing = answerCase(`${scope}-batch-retry`);
        free.dataProcessing = processing;
        const batch = recordOf((scope === 'period'
          ? processing.runs[0]!.batchAttempts : processing.calculationSession!.batchAttempts).at(-1));
        const firstField = recordOf(recordOf(batch.fields)[scope === 'period' ? 't1' : 'area']);
        if (change === 'allCorrect') batch.allCorrect = false;
        else firstField[change] = change === 'numericCorrect' ? false : 999;
      }]);
    }
    const answerMutations: Array<[string, string, (answer: Record<string, unknown>) => void]> = [
      ['batch-mixed', 'numeric-wrong attempt with wrong precision flag', (answer) => {
        recordsOf(answer.attempts)[0]!.precisionCorrect = false;
      }],
      ['batch-mixed', 'feedback flags contradict outcome', (answer) => {
        recordOf(answer.feedback).numericCorrect = true;
      }],
      ['batch-mixed', 'feedback contradicts recorded attempt', (answer) => {
        answer.feedback = { outcome: 'wrong', numericCorrect: false, precisionCorrect: false };
      }],
      ['batch-mixed', 'correct state after failed attempt', (answer) => {
        answer.status = 'correct';
        answer.resolution = 'first-correct';
        answer.feedback = null;
      }],
      ['batch-retry', 'parsed value contradicts recorded input', (answer) => {
        recordsOf(answer.attempts).at(-1)!.parsedValue = 999;
      }],
      ['revealed-without-valid-attempt', 'revealed resolution claims valid attempt', (answer) => {
        answer.resolution = 'revealed-after-attempt';
      }],
      ['revealed-after-attempt', 'revealed resolution omits valid attempt', (answer) => {
        answer.resolution = 'revealed-without-valid-attempt';
      }],
      ['empty', 'empty input recorded as invalid', (answer) => {
        recordsOf(answer.attempts)[0]!.outcome = 'invalid';
      }],
    ];
    for (const [caseName, label, mutateAnswer] of answerMutations) {
      negativeCases.push([`${scope} ${label}`, 2, (_, free) => {
        const processing = answerCase(`${scope}-${caseName}`);
        free.dataProcessing = processing;
        const answers = scope === 'period' ? processing.runs[0]!.answers : processing.calculationSession!.answers;
        const field = scope === 'period' ? 't1' : caseName.startsWith('batch-') ? 'gamma' : 'area';
        mutateAnswer(recordOf(recordOf(answers)[field]));
      }]);
    }
  }
  negativeCases.push(['legacy unknown attempt with asserted correctness', 2, (_, free) => {
    const processing = answerCase('legacy-unknown-attempt-history');
    free.dataProcessing = processing;
    processing.calculationSession!.answers.gamma.attempts[0]!.numericCorrect = true;
  }]);
  if (sourceVersion === 8) {
    negativeCases.push(
      ['invalid frozen snapshot', 1, (_, free) => { recordOf(free.frozenParameterSnapshot).schemaVersion = 999; }],
      ['unknown frozen field', 1, (_, free) => { recordOf(free.frozenParameterSnapshot).unknownAuthority = true; }],
      ['unexpected experiment group', 0, (_, free) => { free.experimentGroup = {}; }],
    );
  } else negativeCases.push(['future experiment group', 1, (_, free) => { recordOf(free.experimentGroup).schemaVersion = 999; }]);
  for (const guideVersion of [undefined, 2]) {
    for (const [field, value] of [['status', 'corrupt'], ['unknownAuthority', true], ['schemaVersion', 999]] as const) {
      negativeCases.push([`older Guide ${guideVersion} with invalid ${field}`, 0, (authority) => {
        if (guideVersion === undefined) delete authority.pistonGuideSessionProjectionVersion;
        else authority.pistonGuideSessionProjectionVersion = guideVersion;
        recordOf(authority.guideSession)[field] = value;
      }]);
    }
  }
  const unexpectedlyAccepted: string[] = [];
  for (const [label, index, mutate] of negativeCases) {
    const malformed = structuredClone(sourceRecords[index]!);
    mutate(malformed.projection.fields.authoritative, recordOf(malformed.projection.fields.authoritative.freeSession));
    const decoded = decodeWorkbenchPersistenceV3FileRecord(malformed);
    if (decoded.ok) {
      unexpectedlyAccepted.push(label);
      continue;
    }
    assert.ok(decoded.status === 'quarantined' || decoded.status === 'unsupported-future');
    assert.deepEqual(decoded.raw, malformed, `${label} must retain original data`);
    isolatedCaseCount += 1;
  }
  assert.deepEqual(unexpectedlyAccepted, [], `${sourceVersion}: malformed legacy authority must remain isolated`);
}

const defaultCurrent = projectWorkbenchPersistenceV3File(createDefaultHeatCapacityPistonOscillationFile(99));
assert.ok(defaultCurrent.ok);
if (!defaultCurrent.ok) throw new Error('Expected current default file.');
const defaultEncoded = encodeWorkbenchPersistenceV3FileProjection(defaultCurrent.value);
assert.ok(defaultEncoded.ok);
if (!defaultEncoded.ok) throw new Error('Expected current default encoding.');
assert.equal(decodeWorkbenchPersistenceV3FileRecord(defaultEncoded.value).status, 'exact');

console.log(`workbenchPersistenceV3PistonLegacyFree tests passed: 6 legacy records, 2 production generations, ${legalAnswerCaseCount} legal answer cases, ${legacyFitCaseCount} legacy fit cases, ${isolatedCaseCount} isolated cases`);
