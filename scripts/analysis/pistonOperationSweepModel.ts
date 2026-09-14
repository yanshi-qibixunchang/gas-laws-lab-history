import { createHash } from 'node:crypto';
import { formatSignificantFiguresHalfEven } from '../../src/domain/calculation/decimalHalfEven.ts';
import * as processing from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import * as physics from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import * as thermal from '../../src/domain/pistonOscillation/pistonOscillationThermalPhysicsModel.ts';
import * as sensor from '../../src/domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';
import * as parameters from '../../src/domain/pistonOscillation/pistonOscillationFreeParameterConfig.ts';
import { createPistonOscillationRealParameterDraft } from '../../src/domain/pistonOscillation/pistonOscillationRealParameterProfile.ts';
import { getPistonOscillationVirtualHandTargetDisplacementMm } from '../../src/domain/pistonOscillation/pistonOscillationVirtualHandModel.ts';
import { createPistonOscillationPressOperationEvidence } from '../../src/domain/pistonOscillation/pistonOscillationPressInteractionModel.ts';
import { applyPistonOscillationTailIrregularityObservation } from '../../src/domain/pistonOscillation/pistonOscillationTailIrregularityObservationModel.ts';

/** Offline protocol only. Nothing in the application imports this module. */
export const OPERATION_SWEEP_PROTOCOL = Object.freeze({
  version: 'piston-operation-sweep-v1',
  scope: 'real-air-model-sensitivity-not-apparatus-calibration',
  heightsMm: Object.freeze([80, 70, 60, 50, 40, 30]),
  dragReferencePx: Object.freeze([120, 160, 200, 240, 300, 350]),
  rampDurationsS: Object.freeze([0.1, 0.4, 1.1, 2]),
  holdDurationsS: Object.freeze([0, 0.1, 0.4]),
  seeds: Object.freeze([11, 29, 47, 71, 101]),
  sampleRateHz: 1000,
  triggerThresholdKpa: 120,
  recordedDurationS: 0.5,
  releaseDurationS: 0.8,
  selection: 'earliest-locally-accepted-two-primary-cycles-no-gamma-feedback',
});

export interface Operation {
  dragReferencePx: number;
  rampDurationS: number;
  holdDurationS: number;
}

export const operationKey = (operation: Operation) =>
  `drag-${operation.dragReferencePx}_ramp-${operation.rampDurationS}_hold-${operation.holdDurationS}`;

export const createSweepOperations = (): Operation[] =>
  OPERATION_SWEEP_PROTOCOL.dragReferencePx.flatMap(dragReferencePx =>
    OPERATION_SWEEP_PROTOCOL.rampDurationsS.flatMap(rampDurationS =>
      OPERATION_SWEEP_PROTOCOL.holdDurationsS.map(holdDurationS => ({
        dragReferencePx, rampDurationS, holdDurationS,
      }))));

export const sampleSummary = (values: readonly number[]) => {
  if (values.length === 0) return { count: 0, min: null, max: null, mean: null, sampleSd: null, cvPercent: null };
  if (values.some(value => !Number.isFinite(value))) throw new RangeError('Summary values must be finite.');
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const sampleSd = values.length < 2 ? null : Math.sqrt(
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1),
  );
  return { count: values.length, min: Math.min(...values), max: Math.max(...values), mean,
    sampleSd, cvPercent: sampleSd === null || mean === 0 ? null : 100 * sampleSd / Math.abs(mean) };
};

const assertOperation = (heightMm: number, operation: Operation) => {
  if (!OPERATION_SWEEP_PROTOCOL.heightsMm.includes(heightMm)) throw new RangeError('Height must be one of the six 30–80 mm protocol heights.');
  if (!Number.isFinite(operation.dragReferencePx) || operation.dragReferencePx <= 0 || operation.dragReferencePx > 550) {
    throw new RangeError('Reference drag must be greater than 0 and at most 550 px.');
  }
  for (const [name, value, minimum] of [
    ['rampDurationS', operation.rampDurationS, 0.001],
    ['holdDurationS', operation.holdDurationS, 0],
  ] as const) {
    if (!Number.isFinite(value) || value < minimum || value > 3 || Math.abs(value * 1000 - Math.round(value * 1000)) > 1e-8) {
      throw new RangeError(`${name} must be on the 1 ms grid within ${minimum}–3 s.`);
    }
  }
};

export const simulateOperation = (heightMm: number, operation: Operation) => {
  assertOperation(heightMm, operation);
  const draft = createPistonOscillationRealParameterDraft('air');
  const physicsConfig = { ...parameters.getPistonOscillationFreePhysicsConfig(draft),
    trajectoryDurationS: OPERATION_SWEEP_PROTOCOL.releaseDurationS };
  const thermalConfig = parameters.getPistonOscillationFreeThermalConfig(draft);
  const equilibrium = physics.createPistonOscillationLoadedEquilibriumState(heightMm, physicsConfig);
  const equilibriumHeightMm = equilibrium.equilibriumHeightM * 1000;
  let state = physics.getPistonOscillationSettlingStateAtProgress(heightMm, 1, physicsConfig);
  const states = [state];
  const rampSamples = Math.round(operation.rampDurationS * 1000);
  const totalSamples = rampSamples + Math.round(operation.holdDurationS * 1000);
  for (let index = 1; index <= totalSamples; index += 1) {
    const progress = Math.min(1, index / rampSamples);
    // Same smoothstep path as the current Demo; actual piston displacement is
    // computed by the virtual-hand force solver, never prescribed by this tool.
    const eased = progress * progress * (3 - 2 * progress);
    state = thermal.advancePistonOscillationVirtualHandThermodynamicState({
      referenceState: state,
      equilibriumHeightMm,
      targetDownwardDisplacementMm: getPistonOscillationVirtualHandTargetDisplacementMm(operation.dragReferencePx * eased),
      elapsedS: 0.001,
      preventUpwardMotion: index <= rampSamples,
    }, physicsConfig, thermalConfig);
    states.push(state);
  }
  const trajectory = thermal.simulatePistonOscillationThermalRelease({
    lockedHeightMm: heightMm,
    initialDisplacementMm: state.pistonHeightM * 1000 - equilibriumHeightMm,
    initialVelocityMmPerS: state.velocityMPerS * 1000,
    referenceThermodynamicState: state,
  }, physicsConfig, thermalConfig);
  const heights = [...states.map(point => point.pistonHeightM * 1000),
    ...trajectory.samples.map(point => equilibriumHeightMm + point.displacementM * 1000)];
  const pressures = [...states.map(point => point.pressurePa / 1000),
    ...trajectory.samples.map(point => point.pressurePa / 1000)];
  const releasedAtMs = totalSamples;
  const pressEvidence = createPistonOscillationPressOperationEvidence({
    trace: states.map((point, index) => ({ observedAtMs: index,
      pistonHeightMm: point.pistonHeightM * 1000,
      displacementMm: point.pistonHeightM * 1000 - equilibriumHeightMm,
      pressurePa: point.pressurePa, temperatureK: point.temperatureK })),
    releasedAtMs, spaceReleasedAtMs: releasedAtMs, mouseReleasedAtMs: releasedAtMs,
    equilibriumHeightMm, releaseThermodynamicState: state,
    releaseVelocityMPerS: state.velocityMPerS,
  });
  return { heightMm, operation: { ...operation }, draft, states, trajectory, pressEvidence,
    diagnostics: {
      actualPressDisplacementMm: equilibriumHeightMm - state.pistonHeightM * 1000,
      releasePhysicalPressureKpa: state.pressurePa / 1000,
      releaseTemperatureK: state.temperatureK,
      releaseVelocityMPerS: state.velocityMPerS,
      minimumHeightMm: Math.min(...heights),
      maximumHeightMm: Math.max(...heights),
      upperReferenceMarginMm: 80 - Math.max(...heights),
      upperMechanicalClearanceMm: null,
      minimumPhysicalPressureKpa: Math.min(...pressures),
      maximumPhysicalPressureKpa: Math.max(...pressures),
    } };
};

export const selectEarliestTwoCycles = (record: processing.PistonOscillationRawMeasurementRecord) => {
  const analysis = processing.analyzePistonOscillationGuidedPeriod(record);
  const extrema = analysis.primaryExtrema;
  for (let start = 0; start + 4 < extrema.length; start += 1) {
    const left = extrema[start]!;
    const right = extrema[start + 4]!;
    if (left.type !== right.type || right.ordinal - left.ordinal !== 4) continue;
    const selection = processing.createPistonOscillationPeriodSelection(
      record, Math.max(0, left.timeS - 0.0004), right.timeS + 0.0004, 2, 0,
    );
    if (selection.issue === null && selection.periodCount === 2) return { analysis, selection, skippedPrimaryExtrema: start };
  }
  return { analysis, selection: null, skippedPrimaryExtrema: null };
};

export const resolveDisplayedPeriod = (
  record: processing.PistonOscillationRawMeasurementRecord,
  selection: processing.PistonOscillationPeriodSelection,
) => {
  let session = processing.createPistonOscillationDataProcessingSession([record], 0);
  session = processing.selectPistonOscillationPeriodRange(session, [record], 0,
    selection.rangeStartTimeS, selection.rangeEndTimeS, 2, 0);
  for (const field of ['t1', 't2'] as const) {
    const value = session.runs[0]!.answers[field].expectedValue;
    if (value === null) throw new Error('Selected endpoint did not produce a displayed answer.');
    session = processing.updatePistonOscillationPeriodAnswerDraft(session, 0, field,
      processing.formatPistonOscillationEndpointTime(value), 0);
  }
  session = processing.submitPistonOscillationPeriodEndpoints(session, 0, 0);
  const period = session.runs[0]!.answers.period.expectedValue;
  if (period === null) throw new Error('Accepted endpoints did not produce a displayed period.');
  session = processing.updatePistonOscillationPeriodAnswerDraft(session, 0, 'period', processing.formatPistonOscillationPeriod(period), 0);
  session = processing.submitPistonOscillationPeriod(session, 0, 0);
  const run = session.runs[0]!;
  if (!run.result) throw new Error('The current exact calculation chain rejected its formatted values.');
  return run;
};

export const observeOperation = (simulation: ReturnType<typeof simulateOperation>, seed: number) => {
  if (!Number.isSafeInteger(seed) || seed < 0) throw new RangeError('Seed must be a non-negative safe integer.');
  const config = parameters.getPistonOscillationFreeSensorConfig(simulation.draft, seed);
  const press = sensor.createPistonOscillationDynamicSensorObservationSeries(simulation.states, 1000, { config });
  const base = sensor.createPistonOscillationDynamicSensorObservationSeries(simulation.trajectory.samples, 1000, {
    initialState: press.finalDynamicState,
    initialObservedPressureKpa: press.samples.at(-1)!.absolutePressureKpa, config,
  });
  const expectedPeriodS = 1 / physics.getPistonOscillationSmallSignalFrequencyFromLockedHeightHz(
    simulation.heightMm, simulation.trajectory.config,
  );
  const series = applyPistonOscillationTailIrregularityObservation({
    observationSeries: base, expectedPeriodS,
    config: parameters.getPistonOscillationFreeTailConfig(simulation.draft),
  }).observationSeries;
  const trigger = sensor.findPistonOscillationObservedFallingTriggerSample(series, OPERATION_SWEEP_PROTOCOL.triggerThresholdKpa);
  const identity = `${operationKey(simulation.operation)}_height-${simulation.heightMm}_seed-${seed}`;
  if (!trigger) return { identity, seed, releaseObservedPressureKpa: press.samples.at(-1)!.absolutePressureKpa,
    triggerTimeS: null, record: null, analysis: null, selection: null, run: null, samplesSha256: null,
    skippedPrimaryExtrema: null, amplitudeToNoiseRatio: null, selectedCycleCvPercent: null };
  const samples = sensor.createPistonOscillationRecordedObservationSamples(series, trigger.sampleIndex, OPERATION_SWEEP_PROTOCOL.recordedDurationS);
  if (samples.length !== 501) throw new Error('Falling-trigger record must contain the full 501 observed samples.');
  const record = processing.createPistonOscillationRawMeasurementRecord({
    recordId: identity, capturedAtMs: 0,
    measurementIndex: OPERATION_SWEEP_PROTOCOL.heightsMm.indexOf(simulation.heightMm),
    targetHeightMm: simulation.heightMm,
    confirmedHeightMm: simulation.trajectory.equilibrium.equilibriumHeightM * 1000,
    sampleRateHz: 1000, triggerThresholdKpa: OPERATION_SWEEP_PROTOCOL.triggerThresholdKpa,
    recordedDurationS: OPERATION_SWEEP_PROTOCOL.recordedDurationS,
    recordingPath: 'falling-trigger', releaseOffsetS: null, samples,
    pressOperationEvidence: simulation.pressEvidence,
    sensorObservationSnapshot: processing.createPistonOscillationSensorObservationSnapshot({
      sampleRateHz: 1000, triggerSourceSampleIndex: trigger.sampleIndex, observationSeries: series,
    }),
    physicsSnapshot: processing.createPistonOscillationPhysicsSnapshot(simulation.trajectory, trigger.timeS),
  });
  const { analysis, selection, skippedPrimaryExtrema } = selectEarliestTwoCycles(record);
  const run = selection ? resolveDisplayedPeriod(record, selection) : null;
  const excursions = selection?.extrema.slice(1).map((point, index) =>
    Math.abs(point.absolutePressureKpa - selection.extrema[index]!.absolutePressureKpa)) ?? [];
  const cycleWidths = selection?.extrema.slice(2).map((point, index) =>
    point.timeS - selection.extrema[index]!.timeS) ?? [];
  return { identity, seed, record, analysis, selection, run, skippedPrimaryExtrema,
    releaseObservedPressureKpa: press.samples.at(-1)!.absolutePressureKpa,
    triggerTimeS: trigger.timeS,
    samplesSha256: createHash('sha256').update(JSON.stringify(samples)).digest('hex'),
    amplitudeToNoiseRatio: excursions.length && analysis.estimatedNoiseFloorKpa > 0
      ? Math.min(...excursions) / (2 * analysis.estimatedNoiseFloorKpa) : null,
    selectedCycleCvPercent: sampleSummary(cycleWidths).cvPercent,
  };
};

export type Observation = ReturnType<typeof observeOperation>;

/** Complete height sets only; failed cases are not silently dropped from a fit. */
export const fitDisplayedHeightSet = (observations: readonly Observation[], heights: readonly number[]) => {
  const ordered = heights.map(height => observations.find(item => item.record?.targetHeightMm === height));
  if (ordered.some(item => !item?.run?.result)) return null;
  const records = ordered.map(item => item!.record!);
  let session = processing.createPistonOscillationDataProcessingSession(records, 0);
  // Reuse the runs already resolved through real endpoint/period submissions.
  session = { ...session, runs: ordered.map(item => item!.run!) };
  for (let index = 0; index < records.length; index += 1) {
    session = processing.advancePistonOscillationPeriodRun(session, 0, records);
  }
  for (let index = 0; index < records.length; index += 1) session = processing.togglePistonOscillationFitRun(session, index, 0);
  session = processing.submitPistonOscillationLinearFit(session, 0, { requireAllRuns: true });
  const fit = session.linearFitResult;
  const calculation = session.calculationSession;
  if (!fit || !calculation || calculation.status !== 'calculating') throw new Error('Complete height set failed current fit/calculation.');
  return { heights: [...heights], points: fit.points,
    slope: formatSignificantFiguresHalfEven(fit.slopeMPerS2, 5),
    interceptM: fit.interceptM, rSquared: fit.rSquared,
    areaM2: calculation.answers.area.expectedValue!, gamma: calculation.answers.gamma.expectedValue!,
    relativeErrorPercent: calculation.answers.relativeError.expectedValue!,
    knowns: calculation.knowns,
  };
};
