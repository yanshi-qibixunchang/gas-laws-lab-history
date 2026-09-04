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
  getPistonOscillationSettlingStateAtProgress,
} from '../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  createPistonOscillationPressOperationEvidence,
} from '../../src/domain/pistonOscillation/pistonOscillationPressInteractionModel.ts';
import {
  PISTON_OSCILLATION_REAL_HELIUM_ACCEPTANCE_RELATIVE_ERROR_PERCENT,
  PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_VERSION,
  PISTON_OSCILLATION_REAL_HELIUM_THERMAL_RELAXATION_TIME_S,
  createPistonOscillationRealParameterDraft,
  createPistonOscillationRealParameterProfile,
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

const SAMPLE_RATE_HZ = 1_000;
const TRIGGER_THRESHOLD_KPA = 120;
const PRESS_DISPLACEMENT_MM = 12;
const PRESS_DURATION_S = 0.08;
const PRESS_INTERVAL_COUNT = PRESS_DURATION_S * SAMPLE_RATE_HZ;
const RECORDED_DURATION_S = 0.5;
const REFERENCE_HEIGHTS_MM = [80, 70, 60] as const;

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
  airDefaults,
  'adding helium must not change the established Real air baseline',
);
const heliumProfile = createPistonOscillationRealParameterProfile('helium');
assert.equal(
  heliumProfile.version,
  PISTON_OSCILLATION_REAL_HELIUM_PARAMETER_PROFILE_VERSION,
);
assert.equal(
  heliumProfile.parameters.thermalRelaxationTimeS,
  PISTON_OSCILLATION_REAL_HELIUM_THERMAL_RELAXATION_TIME_S,
);
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
  const pressPhysicalSamples = [{ pressurePa: releaseState.pressurePa }];
  for (let intervalIndex = 1; intervalIndex <= PRESS_INTERVAL_COUNT; intervalIndex += 1) {
    releaseState = advancePistonOscillationPrescribedThermodynamicState({
      referenceState: releaseState,
      pistonHeightMm: equilibriumHeightMm
        - PRESS_DISPLACEMENT_MM * intervalIndex / PRESS_INTERVAL_COUNT,
      elapsedS: 1 / SAMPLE_RATE_HZ,
      velocityMmPerS: -PRESS_DISPLACEMENT_MM / PRESS_DURATION_S,
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
    initialDisplacementMm: -PRESS_DISPLACEMENT_MM,
    initialVelocityMmPerS: -PRESS_DISPLACEMENT_MM / PRESS_DURATION_S,
    referenceThermodynamicState: releaseState,
  }, heliumPhysicsConfig, heliumEffective.thermalConfig);
  const observation = createPistonOscillationDynamicSensorObservationSeries(
    trajectory.samples,
    SAMPLE_RATE_HZ,
    {
      config: heliumEffective.sensorConfig,
      initialState: pressObservation.finalDynamicState,
      initialObservedPressureKpa:
        pressObservation.samples.at(-1)!.absolutePressureKpa,
    },
  );
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
            resultVersion: 1,
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
          scheme === 'ideal' ? record.confirmedHeightMm : record.targetHeightMm,
          4,
        )
      )),
      `${scheme} ${gasType} must use its displayed authoritative height source`,
    );
    assert.equal(matrixProcessing.calculationSession?.knowns.gasType, gasType);
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
