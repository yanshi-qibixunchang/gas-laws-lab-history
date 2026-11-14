import assert from 'node:assert/strict';
import {
  roundRatioSignificantFiguresHalfEven,
  roundSignificantFiguresHalfEven,
} from '../../src/domain/calculation/decimalHalfEven.ts';
import {
  PISTON_OSCILLATION_REFERENCE_PRESSURE_PA,
  calculatePistonOscillationLinearFit,
  createPistonOscillationCalculationKnownsSnapshot,
  createPistonOscillationCalculationSession,
  createPistonOscillationDataProcessingSession,
  createPistonOscillationPhysicsSnapshot,
  createPistonOscillationRawMeasurementRecord,
  normalizePistonOscillationDataProcessingSession,
  PISTON_OSCILLATION_LEGACY_CALCULATION_MODEL_VERSION,
  createPistonOscillationSensorObservationSnapshot,
  findPistonOscillationPrimaryExtrema,
  normalizePistonOscillationRawMeasurementRecord,
  submitPistonOscillationLinearFit,
  togglePistonOscillationFitRun,
  type PistonOscillationRawMeasurementRecord,
} from '../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  createPistonOscillationFreeExperimentContextSnapshot,
  createPistonOscillationFreeExperimentGroup,
  getPistonOscillationParameterProfileVersion,
  isPistonOscillationFreeExperimentProfileImplemented,
} from '../../src/domain/pistonOscillation/pistonOscillationFreeExperimentGroupModel.ts';
import {
  resolvePistonOscillationFreeEffectiveConfig,
} from '../../src/domain/pistonOscillation/pistonOscillationFreeEffectiveConfig.ts';
import {
  createDefaultPistonOscillationFreeParameterDraft,
} from '../../src/domain/pistonOscillation/pistonOscillationFreeParameterConfig.ts';
import {
  PISTON_OSCILLATION_HELIUM_ADIABATIC_INDEX,
  createPistonOscillationGasMaterialSnapshot,
} from '../../src/domain/pistonOscillation/pistonOscillationGasMaterialModel.ts';
import {
  PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_KG,
  PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K,
  createPistonOscillationLoadedEquilibriumState,
  getPistonOscillationSmallSignalFrequencyFromLockedHeightHz,
  getPistonOscillationSettlingStateAtProgress,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  createPistonOscillationPressOperationEvidence,
} from '../../src/domain/pistonOscillation/pistonOscillationPressInteractionModel.ts';
import {
  PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V5,
  PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V6,
  PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V7,
  PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V8,
  PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_VERSION,
  PISTON_OSCILLATION_PREVIOUS_REAL_HELIUM_PARAMETER_PROFILE_VERSION,
  PISTON_OSCILLATION_REAL_HELIUM_ACCEPTANCE_RELATIVE_ERROR_PERCENT,
  PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_VERSION,
  PISTON_OSCILLATION_REAL_HELIUM_THERMAL_RELAXATION_TIME_S,
  createPistonOscillationRealParameterDraft,
  createPistonOscillationRealParameterProfile,
  inferPistonOscillationRealAirProfileVersion,
  inferPistonOscillationRealHeliumProfileVersion,
} from '../../src/domain/pistonOscillation/pistonOscillationRealParameterProfile.ts';
import {
  createPistonOscillationDynamicSensorObservationSeries,
  createPistonOscillationRecordedObservationSamples,
  findPistonOscillationObservedFallingTriggerSample,
} from '../../src/domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';
import {
  advancePistonOscillationPrescribedThermodynamicState,
  simulatePistonOscillationThermalRelease,
} from '../../src/domain/pistonOscillation/pistonOscillationThermalPhysicsModel.ts';
import { applyPistonOscillationTailIrregularityObservation } from '../../src/domain/pistonOscillation/pistonOscillationTailIrregularityObservationModel.ts';

const SAMPLE_RATE_HZ = 1_000;
const TRIGGER_THRESHOLD_KPA = 120;
const TARGET_PRESSURE_PA = 123_000;
const PRESS_DURATION_S = 0.75;
const PRESS_INTERVAL_COUNT = PRESS_DURATION_S * SAMPLE_RATE_HZ;
const RECORDED_DURATION_S = 0.5;
const REFERENCE_HEIGHTS_MM = [70, 55, 40] as const;

for (const scheme of ['real', 'ideal'] as const) {
  for (const gasType of ['air', 'helium'] as const) {
    const gasMaterialSnapshot = createPistonOscillationGasMaterialSnapshot(gasType);
    const group = createPistonOscillationFreeExperimentGroup({
      scheme,
      gasMaterialSnapshot,
    });
    const effective = resolvePistonOscillationFreeEffectiveConfig(
      group,
      createPistonOscillationRealParameterDraft(gasType),
    );
    assert.equal(isPistonOscillationFreeExperimentProfileImplemented(group), true);
    assert.equal(
      group.parameterProfileVersion,
      getPistonOscillationParameterProfileVersion(scheme, gasType),
    );
    assert.equal(
      effective.physicsConfig.gamma,
      gasMaterialSnapshot.adiabaticIndex,
      `${scheme} ${gasType} must drive physics from the selected material snapshot`,
    );
    assert.equal(effective.adiabaticProcess, scheme === 'ideal');
    assert.equal(effective.exactSensorObservation, scheme === 'ideal');
    assert.equal(effective.heightSnapEnabled, scheme === 'ideal');
    assert.equal(effective.scoringEligible, scheme === 'real');
  }
}

const airDefaults = createDefaultPistonOscillationFreeParameterDraft();
assert.deepEqual(
  createPistonOscillationRealParameterDraft('air'),
  {
    ...airDefaults,
    equivalentLinearLossNsPerM: 0.06,
    thermalRelaxationTimeS: 0.012,
    thermalVolumeExponent: 1,
    heatFlowLagTimeS: 0.0005,
    sensorResponseTimeS: 0.0025,
    tailIntensity: 0.35,
  },
);
assert.equal(inferPistonOscillationRealAirProfileVersion({
  ...createPistonOscillationRealParameterDraft('air'),
  sensorResponseTimeS: 0.0055,
  equivalentLinearLossNsPerM: 0,
}), PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_VERSION);
const airV8 = createPistonOscillationRealParameterDraft('air', PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V8);
assert.deepEqual(airV8, {
  ...airDefaults,
  equivalentLinearLossNsPerM: 0.18,
  thermalRelaxationTimeS: 0.014,
  thermalVolumeExponent: 1.5,
  heatFlowLagTimeS: 0.0005,
  sensorResponseTimeS: 0.002,
  tailIntensity: 0.35,
});
assert.equal(inferPistonOscillationRealAirProfileVersion(airV8), PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V8);
assert.equal(isPistonOscillationFreeExperimentProfileImplemented(createPistonOscillationFreeExperimentGroup({
  parameterProfileVersion: PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V8,
})), true);
const airV7 = createPistonOscillationRealParameterDraft('air', PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V7);
assert.deepEqual(
  airV7,
  {
    ...airDefaults,
    equivalentLinearLossNsPerM: 0.02,
    thermalRelaxationTimeS: 0.0115,
    thermalVolumeExponent: 1.10,
    heatFlowLagTimeS: 0.0005,
    sensorResponseTimeS: 0.0055,
    tailIntensity: 0.35,
  },
);
assert.equal(inferPistonOscillationRealAirProfileVersion(airV7), PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V7);
assert.equal(inferPistonOscillationRealAirProfileVersion({
  ...airV7, sensorResponseTimeS: 0.004, thermalRelaxationTimeS: 0.014,
}), PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V7);
assert.equal(isPistonOscillationFreeExperimentProfileImplemented(createPistonOscillationFreeExperimentGroup({
  parameterProfileVersion: PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V7,
})), true);
const previousAirDraft = createPistonOscillationRealParameterDraft('air', PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V5);
assert.deepEqual(previousAirDraft, {
  ...airV7,
  equivalentLinearLossNsPerM: 0,
  sensorResponseTimeS: 0.0065,
});
assert.equal(inferPistonOscillationRealAirProfileVersion(previousAirDraft), PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V5);
const airV6 = createPistonOscillationRealParameterDraft('air', PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V6);
assert.deepEqual(airV6, { ...airV7, sensorResponseTimeS: 0.0065 });
assert.equal(inferPistonOscillationRealAirProfileVersion(airV6), PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V6);
assert.equal(isPistonOscillationFreeExperimentProfileImplemented(createPistonOscillationFreeExperimentGroup({
  parameterProfileVersion: PISTON_OSCILLATION_REAL_AIR_PARAMETER_PROFILE_V6,
})), true);
const heliumProfile = createPistonOscillationRealParameterProfile('helium');
assert.equal(
  heliumProfile.version,
  PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_VERSION,
);
assert.equal(
  heliumProfile.parameters.thermalRelaxationTimeS,
  PISTON_OSCILLATION_REAL_HELIUM_THERMAL_RELAXATION_TIME_S,
);
assert.equal(heliumProfile.parameters.sensorResponseTimeS, 0.003);
assert.equal(heliumProfile.parameters.thermalVolumeExponent, undefined);
assert.equal(heliumProfile.parameters.equivalentLinearLossNsPerM, 0.022);
assert.equal(heliumProfile.parameters.tailIntensity, 0);
const previousHeliumDraft = createPistonOscillationRealParameterDraft(
  'helium', PISTON_OSCILLATION_PREVIOUS_REAL_HELIUM_PARAMETER_PROFILE_VERSION,
);
assert.equal(previousHeliumDraft.thermalRelaxationTimeS, 0.09);
assert.equal(previousHeliumDraft.equivalentLinearLossNsPerM, 1.1);
assert.equal(previousHeliumDraft.tailIntensity, 1);
assert.equal(inferPistonOscillationRealHeliumProfileVersion(previousHeliumDraft),
  PISTON_OSCILLATION_PREVIOUS_REAL_HELIUM_PARAMETER_PROFILE_VERSION);
assert.equal(isPistonOscillationFreeExperimentProfileImplemented(createPistonOscillationFreeExperimentGroup({
  gasMaterialSnapshot: createPistonOscillationGasMaterialSnapshot('helium'),
  parameterProfileVersion: PISTON_OSCILLATION_PREVIOUS_REAL_HELIUM_PARAMETER_PROFILE_VERSION,
})), true);
assert.equal(
  heliumProfile.calibrationScope,
  'software-teaching-candidate-not-apparatus-certified',
);
assert.equal(
  heliumProfile.acceptanceRelativeErrorPercent,
  PISTON_OSCILLATION_REAL_HELIUM_ACCEPTANCE_RELATIVE_ERROR_PERCENT,
);

const heliumGroup = createPistonOscillationFreeExperimentGroup({
  groupId: 'piston-real-helium-acceptance',
  createdAtMs: 10_000,
  scheme: 'real',
  gasMaterialSnapshot: createPistonOscillationGasMaterialSnapshot('helium'),
});
const heliumParameters = {
  ...createPistonOscillationRealParameterDraft('helium'),
  sampleRateHz: SAMPLE_RATE_HZ,
  triggerThresholdKpa: TRIGGER_THRESHOLD_KPA,
};
const heliumEffective = resolvePistonOscillationFreeEffectiveConfig(
  heliumGroup,
  heliumParameters,
);
const heliumPhysicsConfig = {
  ...heliumEffective.physicsConfig,
  trajectoryDurationS: 0.6,
};

const createRealHeliumMeasurement = (
  targetHeightMm: number,
  measurementIndex: number,
): PistonOscillationRawMeasurementRecord => {
  let releaseState = getPistonOscillationSettlingStateAtProgress(
    targetHeightMm,
    1,
    heliumPhysicsConfig,
  );
  const equilibriumHeightMm = releaseState.pistonHeightM * 1_000;
  const pressDisplacementMm = (equilibriumHeightMm + heliumPhysicsConfig.equivalentDeadVolumeHeightM * 1_000)
    * (1 - releaseState.pressurePa / TARGET_PRESSURE_PA);
  const pressPhysicalSamples = [{ pressurePa: releaseState.pressurePa }];
  for (let intervalIndex = 1; intervalIndex <= PRESS_INTERVAL_COUNT; intervalIndex += 1) {
    const progress = intervalIndex / PRESS_INTERVAL_COUNT;
    const displacementMm = pressDisplacementMm * progress ** 2 * (3 - 2 * progress);
    releaseState = advancePistonOscillationPrescribedThermodynamicState({
      referenceState: releaseState,
      pistonHeightMm: equilibriumHeightMm - displacementMm,
      elapsedS: 1 / SAMPLE_RATE_HZ,
      velocityMmPerS: progress === 1 ? 0
        : -pressDisplacementMm * 6 * progress * (1 - progress) / PRESS_DURATION_S,
      physicsConfig: heliumPhysicsConfig,
      thermalConfig: heliumEffective.thermalConfig,
    });
    pressPhysicalSamples.push({ pressurePa: releaseState.pressurePa });
  }
  const pressObservation = createPistonOscillationDynamicSensorObservationSeries(
    pressPhysicalSamples,
    SAMPLE_RATE_HZ,
    { config: heliumEffective.sensorConfig },
  );
  const trajectory = simulatePistonOscillationThermalRelease({
    lockedHeightMm: targetHeightMm,
    initialDisplacementMm: -pressDisplacementMm,
    initialVelocityMmPerS: releaseState.velocityMPerS * 1_000,
    referenceThermodynamicState: releaseState,
  }, heliumPhysicsConfig, heliumEffective.thermalConfig);
  const baseObservation = createPistonOscillationDynamicSensorObservationSeries(
    trajectory.samples,
    SAMPLE_RATE_HZ,
    {
      config: heliumEffective.sensorConfig,
      initialState: pressObservation.finalDynamicState,
      initialObservedPressureKpa:
        pressObservation.samples.at(-1)!.absolutePressureKpa,
    },
  );
  const observation = heliumEffective.tailIrregularityEnabled
    ? applyPistonOscillationTailIrregularityObservation({
        observationSeries: baseObservation,
        expectedPeriodS: 1 / getPistonOscillationSmallSignalFrequencyFromLockedHeightHz(targetHeightMm, heliumPhysicsConfig),
        config: heliumEffective.tailConfig,
      }).observationSeries
    : baseObservation;
  const trigger = findPistonOscillationObservedFallingTriggerSample(
    observation,
    TRIGGER_THRESHOLD_KPA,
  );
  assert.ok(trigger, `${targetHeightMm} mm helium release must cross the formal trigger`);
  const recordedSamples = createPistonOscillationRecordedObservationSamples(
    observation,
    trigger.sampleIndex,
    RECORDED_DURATION_S,
  );
  const pressOperationEvidence = createPistonOscillationPressOperationEvidence({
    trace: [],
    releasedAtMs: 20_000 + measurementIndex,
    spaceReleasedAtMs: 20_000 + measurementIndex,
    mouseReleasedAtMs: 20_000 + measurementIndex,
    equilibriumHeightMm,
    releaseThermodynamicState: releaseState,
    releaseVelocityMPerS: releaseState.velocityMPerS,
  });
  return createPistonOscillationRawMeasurementRecord({
    recordId: `real-helium-${targetHeightMm}`,
    capturedAtMs: 20_000 + measurementIndex,
    measurementIndex,
    targetHeightMm,
    confirmedHeightMm: trajectory.equilibrium.equilibriumHeightM * 1_000,
    sampleRateHz: SAMPLE_RATE_HZ,
    triggerThresholdKpa: TRIGGER_THRESHOLD_KPA,
    recordedDurationS: recordedSamples.at(-1)!.timeS,
    recordingPath: 'falling-trigger',
    releaseOffsetS: null,
    samples: recordedSamples,
    pressOperationEvidence,
    sensorObservationSnapshot: createPistonOscillationSensorObservationSnapshot({
      sampleRateHz: SAMPLE_RATE_HZ,
      triggerSourceSampleIndex: trigger.sampleIndex,
      observationSeries: observation,
    }),
    physicsSnapshot: createPistonOscillationPhysicsSnapshot(
      trajectory,
      trajectory.samples[trigger.sampleIndex]!.timeS,
    ),
    experimentContext: createPistonOscillationFreeExperimentContextSnapshot(
      heliumGroup,
    ),
  });
};

const heliumRecords = REFERENCE_HEIGHTS_MM.map(createRealHeliumMeasurement);
for (const record of heliumRecords) {
  assert.equal(record.physicsSnapshot.gasMaterial.gasType, 'helium');
  assert.equal(
    record.physicsSnapshot.gasMaterial.adiabaticIndex,
    PISTON_OSCILLATION_HELIUM_ADIABATIC_INDEX,
  );
  assert.equal(
    record.physicsSnapshot.initialThermodynamicState
      ?.molarHeatCapacityAtConstantVolumeJPerMolK,
    PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K
      / (PISTON_OSCILLATION_HELIUM_ADIABATIC_INDEX - 1),
  );
  assert.deepEqual(
    normalizePistonOscillationRawMeasurementRecord(
      JSON.parse(JSON.stringify(record)),
    ),
    record,
    'a current helium record must survive persistence normalization without reinterpretation',
  );
}

const fitPoints = heliumRecords.map((record, runIndex) => {
  const extrema = findPistonOscillationPrimaryExtrema(record);
  assert.ok(extrema.length >= 7, `${record.targetHeightMm} mm must retain three primary periods`);
  const left = extrema[0]!;
  const right = extrema[6]!;
  assert.equal(left.type, right.type);
  const sampleDifference = right.sampleIndex - left.sampleIndex;
  const periodS = roundRatioSignificantFiguresHalfEven(
    BigInt(sampleDifference),
    BigInt(SAMPLE_RATE_HZ * 3),
    4,
  );
  return {
    runIndex,
    measurementIndex: record.measurementIndex,
    rawMeasurementRecordId: record.recordId,
    periodSquaredS2: periodS ** 2,
    heightMm: record.targetHeightMm,
    heightM: record.targetHeightMm / 1_000,
  };
});
const fit = calculatePistonOscillationLinearFit(fitPoints, 30_000);
assert.ok(fit);
const areaM2 = Math.PI * PISTON_OSCILLATION_CYLINDER_DIAMETER_M ** 2 / 4;
const calculatedGamma = 4 * Math.PI ** 2
  * PISTON_OSCILLATION_PISTON_AND_PLATFORM_MASS_KG
  * fit.slopeMPerS2
  / (areaM2 * PISTON_OSCILLATION_REFERENCE_PRESSURE_PA);
const relativeErrorPercent = Math.abs(
  calculatedGamma - PISTON_OSCILLATION_HELIUM_ADIABATIC_INDEX,
) / PISTON_OSCILLATION_HELIUM_ADIABATIC_INDEX * 100;
assert.ok(
  relativeErrorPercent <= PISTON_OSCILLATION_REAL_HELIUM_ACCEPTANCE_RELATIVE_ERROR_PERCENT,
  `the normal Real helium workflow must remain within 3%, received ${relativeErrorPercent}%`,
);

const processing = createPistonOscillationDataProcessingSession(
  heliumRecords,
  31_000,
  { answerValidationMode: 'batch' },
);
assert.equal(processing.runs.length, REFERENCE_HEIGHTS_MM.length);
const knowns = createPistonOscillationCalculationKnownsSnapshot(heliumRecords);
assert.equal(knowns.gasType, 'helium');
assert.equal(knowns.referenceGamma, PISTON_OSCILLATION_HELIUM_ADIABATIC_INDEX);
assert.equal(knowns.pressurePa, heliumRecords[0]!.physicsSnapshot.equilibrium.equilibriumPressurePa);
const legacyProcessing = createPistonOscillationDataProcessingSession(heliumRecords, 31_000, {
  answerValidationMode: 'batch',
  calculationModelVersion: PISTON_OSCILLATION_LEGACY_CALCULATION_MODEL_VERSION,
});
assert.deepEqual(normalizePistonOscillationDataProcessingSession(legacyProcessing, heliumRecords, 31_001), legacyProcessing);

// Recover each ideal material's input from exact small-signal periods using
// the same equilibrium pressure that the application supplies to calculation.
for (const gasType of ['air', 'helium'] as const) {
  const gamma = createPistonOscillationGasMaterialSnapshot(gasType).adiabaticIndex;
  const exactPoints = [61, 50, 40, 30].map((heightMm, runIndex) => {
    const equilibrium = createPistonOscillationLoadedEquilibriumState(heightMm, { gamma });
    const frequency = getPistonOscillationSmallSignalFrequencyFromLockedHeightHz(heightMm, { gamma });
    return {
      runIndex,
      measurementIndex: runIndex,
      rawMeasurementRecordId: `exact-${heightMm}`,
      heightMm: equilibrium.equilibriumHeightM * 1_000,
      heightM: equilibrium.equilibriumHeightM,
      periodSquaredS2: 1 / frequency ** 2,
    };
  });
  const exactFit = calculatePistonOscillationLinearFit(exactPoints, 31_500);
  assert.ok(exactFit);
  const recoveredGamma = 4 * Math.PI ** 2 * knowns.movingMassKg * exactFit.slopeMPerS2
    / (areaM2 * knowns.pressurePa);
  assert.ok(Math.abs(recoveredGamma - gamma) < 1e-12, `${gasType} must recover its ideal gamma`);
}

const sharedMatrixGammaByScheme: Partial<Record<'real' | 'ideal', number>> = {};
for (const scheme of ['real', 'ideal'] as const) {
  for (const gasType of ['air', 'helium'] as const) {
    const gasMaterialSnapshot = createPistonOscillationGasMaterialSnapshot(gasType);
    const group = createPistonOscillationFreeExperimentGroup({
      groupId: `piston-processing-matrix:${scheme}:${gasType}`,
      createdAtMs: 32_000,
      scheme,
      gasMaterialSnapshot,
    });
    const experimentContext = createPistonOscillationFreeExperimentContextSnapshot(group);
    const matrixRecords = heliumRecords.map((record) => ({
      ...structuredClone(record),
      experimentContext: { ...experimentContext },
      physicsSnapshot: {
        ...structuredClone(record.physicsSnapshot),
        gasMaterial: { ...gasMaterialSnapshot },
        config: {
          ...record.physicsSnapshot.config,
          gamma: gasMaterialSnapshot.adiabaticIndex,
        },
      },
    }));
    let matrixProcessing = createPistonOscillationDataProcessingSession(
      matrixRecords,
      32_100,
      { answerValidationMode: 'batch' },
    );
    assert.deepEqual(matrixProcessing.scoringPolicy, {
      schemaVersion: 1,
      policyVersion: 'piston-oscillation-free-scoring-policy-v1',
      scheme,
      scoringEligible: scheme === 'real',
    });
    matrixProcessing = {
      ...matrixProcessing,
      status: 'calculation-ready',
      activeRunIndex: matrixProcessing.runs.length - 1,
      runs: matrixProcessing.runs.map((run, runIndex) => {
        const periodS = Math.sqrt(fitPoints[runIndex]!.periodSquaredS2);
        return {
          ...run,
          result: {
            resultVersion: 2,
            leftSampleIndex: 0,
            rightSampleIndex: Math.round(periodS * SAMPLE_RATE_HZ * 3),
            leftPhase: 'peak',
            rightPhase: 'peak',
            phaseSpan: 'peak-to-peak',
            t1S: 0,
            t2S: periodS * 3,
            periodCount: 3,
            deltaTimeS: periodS * 3,
            periodS,
            periodSquaredS2: periodS ** 2,
            completedAtMs: 32_200 + runIndex,
          },
        };
      }),
      calculationSession: createPistonOscillationCalculationSession(matrixRecords, 32_300),
    };
    for (let runIndex = 0; runIndex < matrixProcessing.runs.length; runIndex += 1) {
      matrixProcessing = togglePistonOscillationFitRun(
        matrixProcessing,
        runIndex,
        32_400 + runIndex,
      );
    }
    matrixProcessing = submitPistonOscillationLinearFit(matrixProcessing, 32_500, {
      requireAllRuns: true,
    });
    assert.equal(matrixProcessing.calculationSession?.status, 'calculating');
    assert.equal(matrixProcessing.linearFitResult?.points.length, REFERENCE_HEIGHTS_MM.length);
    assert.deepEqual(
      matrixProcessing.linearFitResult?.points.map((point) => point.heightMm),
      matrixRecords.map((record) => (
        roundSignificantFiguresHalfEven(
          scheme === 'ideal' ? record.confirmedHeightMm : createPistonOscillationLoadedEquilibriumState(
            record.targetHeightMm, record.physicsSnapshot.config,
          ).equilibriumHeightM * 1_000,
          4,
        )
      )),
      `${scheme} ${gasType} must use its displayed authoritative height source`,
    );
    assert.equal(matrixProcessing.calculationSession?.knowns.gasType, gasType);
    assert.equal(matrixProcessing.calculationSession?.knowns.pressurePa, 101_900);
    assert.equal(
      matrixProcessing.calculationSession?.knowns.referenceGamma,
      gasMaterialSnapshot.adiabaticIndex,
    );
    const matrixGamma = matrixProcessing.calculationSession?.answers.gamma.expectedValue;
    assert.ok(matrixGamma !== null && matrixGamma !== undefined);
    const sharedMatrixGamma = sharedMatrixGammaByScheme[scheme];
    if (sharedMatrixGamma === undefined) sharedMatrixGammaByScheme[scheme] = matrixGamma;
    assert.ok(
      sharedMatrixGamma === undefined || Math.abs(matrixGamma - sharedMatrixGamma) <= 1e-12,
      `${scheme} air and helium must use the same fitted slope and calculation formula`,
    );
  }
}

console.log('pistonOscillationGasProfileMatrix tests passed');
