import {
  createPistonOscillationPhysicsSnapshot,
  createPistonOscillationSensorObservationSnapshot,
  type PistonOscillationRawSample,
} from '../../../src/domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import {
  createPistonOscillationLoadedEquilibriumState,
  getPistonOscillationSettlingStateAtProgress,
} from '../../../src/domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  advancePistonOscillationPrescribedThermodynamicState,
  simulatePistonOscillationThermalRelease,
} from '../../../src/domain/pistonOscillation/pistonOscillationThermalPhysicsModel.ts';
import {
  createPistonOscillationPressOperationEvidence,
} from '../../../src/domain/pistonOscillation/pistonOscillationPressInteractionModel.ts';
import {
  createPistonOscillationDynamicSensorObservationSeries,
} from '../../../src/domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';
import {
  getPistonOscillationFreePhysicsConfig,
  getPistonOscillationFreeSensorConfig,
  getPistonOscillationFreeThermalConfig,
  type PistonOscillationFreeParameterDraft,
} from '../../../src/domain/pistonOscillation/pistonOscillationFreeParameterConfig.ts';

/**
 * Builds strict current-model metadata around deliberately synthetic observed
 * samples. Processing/workflow tests can control their waveform without
 * silently falling back to a legacy physics or ideal-sensor record.
 */
export const createPistonOscillationCurrentRecordTestArtifacts = (options: {
  lockedHeightMm: number;
  sampleRateHz: number;
  samples: readonly PistonOscillationRawSample[];
  triggerSourceSampleIndex?: number | null;
  parameters?: PistonOscillationFreeParameterDraft;
}) => {
  const physicsConfig = {
    ...(options.parameters ? getPistonOscillationFreePhysicsConfig(options.parameters) : {}),
    sensorSampleRateHz: options.sampleRateHz,
  };
  const thermalConfig = options.parameters && getPistonOscillationFreeThermalConfig(options.parameters);
  const equilibrium = createPistonOscillationLoadedEquilibriumState(
    options.lockedHeightMm,
    physicsConfig,
  );
  const settledState = getPistonOscillationSettlingStateAtProgress(
    options.lockedHeightMm,
    1,
    physicsConfig,
  );
  const releaseHeightMm = Math.max(
    0,
    equilibrium.equilibriumHeightM * 1_000 - 8,
  );
  const releaseState = advancePistonOscillationPrescribedThermodynamicState({
    referenceState: settledState,
    pistonHeightMm: releaseHeightMm,
    elapsedS: 0.2,
    physicsConfig,
    thermalConfig,
  });
  const trajectory = simulatePistonOscillationThermalRelease({
    lockedHeightMm: options.lockedHeightMm,
    initialDisplacementMm:
      (releaseState.pistonHeightM - equilibrium.equilibriumHeightM) * 1_000,
    referenceThermodynamicState: releaseState,
  }, {
    ...physicsConfig,
    trajectoryDurationS: 0.1,
  }, thermalConfig);
  const generatedSeries = createPistonOscillationDynamicSensorObservationSeries(
    options.samples.map((sample) => ({
      pressurePa: sample.absolutePressureKpa * 1_000,
    })),
    options.sampleRateHz,
    { config: options.parameters && getPistonOscillationFreeSensorConfig(options.parameters) },
  );
  const observationSeries = {
    ...generatedSeries,
    samples: options.samples.map((sample) => ({ ...sample })),
  };
  const pressOperationEvidence = createPistonOscillationPressOperationEvidence({
    trace: [],
    releasedAtMs: 0,
    spaceReleasedAtMs: 0,
    mouseReleasedAtMs: 0,
    equilibriumHeightMm: equilibrium.equilibriumHeightM * 1_000,
    releaseThermodynamicState: releaseState,
    releaseVelocityMPerS: releaseState.velocityMPerS,
  });
  return {
    confirmedHeightMm: equilibrium.equilibriumHeightM * 1_000,
    physicsSnapshot: createPistonOscillationPhysicsSnapshot(trajectory, 0),
    pressOperationEvidence,
    observationSeries,
    sensorObservationSnapshot: createPistonOscillationSensorObservationSnapshot({
      sampleRateHz: options.sampleRateHz,
      triggerSourceSampleIndex: options.triggerSourceSampleIndex ?? 0,
      observationSeries,
    }),
  };
};
