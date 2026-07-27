import {
  normalizeFreeEnvironmentDisturbanceConfig,
} from '../../domain/heatCapacity/heatCapacityFreeEnvironmentDisturbanceModel.ts';
import {
  normalizeFreePressureSensorNonlinearityConfig,
} from '../../domain/heatCapacity/heatCapacityFreePressureSensorNonlinearityModel.ts';
import {
  normalizeFreePumpValveExchangeConfig,
} from '../../domain/heatCapacity/heatCapacityFreePumpValveExchangeModel.ts';
import {
  HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S,
} from '../../domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  compactFreeTraceStore,
  createDefaultFreeConfigSnapshot,
  createDefaultFreeTraceStore,
  HEAT_CAPACITY_FREE_TRACE_COMPACTION_VERSION,
  HEAT_CAPACITY_FREE_CALCULATION_VERSION,
  HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
  type HeatCapacityFreeConfigSnapshot,
  type HeatCapacityFreeTraceBranch,
  type HeatCapacityFreeTraceBranchCompaction,
  type HeatCapacityFreeTraceStoreCompaction,
  type HeatCapacityFreeTraceStore,
  type HeatCapacityFreeTraceTrialCompaction,
  type HeatCapacityFreeTraceTrial,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  HEAT_CAPACITY_CALCULATION_WORKFLOW_VERSION,
} from '../../domain/heatCapacity/heatCapacityCalculationWorkflowModel.ts';
import {
  normalizeHeatCapacityFreeGasType,
  type HeatCapacityFreeExperimentGroupStatus,
  type HeatCapacityFreeGasType,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import type {
  HeatCapacityFreeRecordConfig,
} from '../../domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import type {
  HeatCapacityFreePhysicsState,
} from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import type {
  HeatCapacityFreeSensorState,
} from '../../domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import type {
  HeatCapacityFreeCalibrationState,
} from '../../domain/heatCapacity/heatCapacityFreeCalibrationModel.ts';
import {
  getFreeCorrectedSignals,
} from '../../domain/heatCapacity/heatCapacityFreeCalibrationModel.ts';
import type { HeatCapacityRuntimePhase } from '../../domain/heatCapacity/heatCapacityProcessTypes.ts';
import {
  createClosedHeatCapacityReleaseState,
  normalizeHeatCapacityReleaseState,
} from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import {
  HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION,
  normalizeHeatCapacityFreeRecordInput,
  type HeatCapacityFreeRecordInput,
  type HeatCapacityFreeTrial,
  type HeatCapacityFreeTrialBatchMembership,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  normalizeHeatCapacityFreeAttempt,
} from '../../domain/heatCapacity/heatCapacityFreeAttemptModel.ts';
import {
  HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION,
  HEAT_CAPACITY_FREE_BATCH_VERSION,
  dispatchHeatCapacityFreeBatchVersion,
  planHeatCapacityFreeBatchAggregateMigration,
} from '../../domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import {
  HEAT_CAPACITY_STANDARD_REFERENCE_GENERATOR_VERSION,
  normalizeHeatCapacityFreeStandardReferenceSnapshot,
} from '../../domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts';
import {
  hasHeatCapacityFreeIdealThermalBoundaryContamination,
  type HeatCapacityFreeDisplayScheme,
  type HeatCapacityFreeExperimentDomainState,
  type HeatCapacityFreeParameterScheme,
  type HeatCapacityFreeRollbackSnapshot,
  type HeatCapacityFreeRollbackSnapshots,
  normalizeHeatCapacityFreeExperimentDomainBoundary,
  normalizeHeatCapacityStopcockAngle,
} from './workbenchState.ts';
import {
  normalizeHeatCapacityFreePhysicsConfig,
  normalizeHeatCapacityFreeSensorConfig,
} from './workbenchHeatCapacityFreeRuntimeConfig.ts';
import {
  createHeatCapacityFreeConfigSnapshotFromRuntimeConfigs,
} from './workbenchHeatCapacityFreeConfigSnapshot.ts';
import {
  calculateHeatCapacityFreeCalculationReference,
  normalizeHeatCapacityCalculationWorkflowSessionForTrials,
} from './workbenchHeatCapacityModeSession.ts';

export const HEAT_CAPACITY_PROCESS_SCORING_VERSION = 'free-process-score-v3' as const;

export const isHeatCapacityRestoreRecord = (
  value: unknown,
): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

export const areHeatCapacityPersistenceValuesEqual = (
  left: unknown,
  right: unknown,
): boolean => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((entry, index) => (
        areHeatCapacityPersistenceValuesEqual(entry, right[index])
      ));
  }
  if (!isHeatCapacityRestoreRecord(left) || !isHeatCapacityRestoreRecord(right)) {
    return false;
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => (
      key === rightKeys[index] &&
      areHeatCapacityPersistenceValuesEqual(left[key], right[key])
    ));
};

const cloneHeatCapacityPersistenceValue = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((entry) => (
      cloneHeatCapacityPersistenceValue(entry)
    )) as T;
  }
  if (isHeatCapacityRestoreRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        cloneHeatCapacityPersistenceValue(entry),
      ]),
    ) as T;
  }
  return value;
};

export const heatCapacityRestoreFiniteOrDefault = (
  value: unknown,
  fallback: number,
) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

export const heatCapacityRestoreNullableNumber = (value: unknown) => (
  typeof value === 'number' && Number.isFinite(value) ? value : null
);

export const normalizeHeatCapacityFreeRestoreRecordConfig = (
  value: unknown,
  fallback: HeatCapacityFreeRecordConfig,
): HeatCapacityFreeRecordConfig => {
  const record = isHeatCapacityRestoreRecord(value) ? value : {};
  return {
    u0ZeroToleranceMv: heatCapacityRestoreFiniteOrDefault(
      record.u0ZeroToleranceMv,
      fallback.u0ZeroToleranceMv,
    ),
    pressureStableSlopeMvPerS: heatCapacityRestoreFiniteOrDefault(
      record.pressureStableSlopeMvPerS,
      fallback.pressureStableSlopeMvPerS,
    ),
    temperatureStableSlopeMvPerS: heatCapacityRestoreFiniteOrDefault(
      record.temperatureStableSlopeMvPerS,
      fallback.temperatureStableSlopeMvPerS,
    ),
    temperatureAmbientToleranceMv: heatCapacityRestoreFiniteOrDefault(
      record.temperatureAmbientToleranceMv,
      fallback.temperatureAmbientToleranceMv,
    ),
    minimumUsefulU1CorrectedMv: heatCapacityRestoreFiniteOrDefault(
      record.minimumUsefulU1CorrectedMv,
      fallback.minimumUsefulU1CorrectedMv,
    ),
    overVentedMinimumU2CorrectedMv: heatCapacityRestoreFiniteOrDefault(
      record.overVentedMinimumU2CorrectedMv,
      fallback.overVentedMinimumU2CorrectedMv,
    ),
    pressureDangerMv: heatCapacityRestoreFiniteOrDefault(
      record.pressureDangerMv,
      fallback.pressureDangerMv,
    ),
  };
};

export const normalizeHeatCapacityFreeRestoreExperimentGroupStatus = (
  value: unknown,
  fallback: HeatCapacityFreeExperimentGroupStatus = 'draft',
): HeatCapacityFreeExperimentGroupStatus => (
  value === 'draft' || value === 'running' || value === 'completed'
    ? value
    : fallback
);

export const normalizeHeatCapacityFreeRestoreParameterScheme = (
  value: unknown,
  fallback: HeatCapacityFreeParameterScheme = 'real',
): HeatCapacityFreeParameterScheme => (
  value === 'ideal' || value === 'real' ? value : fallback
);

export const normalizeHeatCapacityFreeRestoreDisplayScheme = (
  value: unknown,
  fallback: HeatCapacityFreeDisplayScheme,
): HeatCapacityFreeDisplayScheme => (
  value === 'ideal' || value === 'real' ? value : fallback
);

export const normalizeHeatCapacityFreeRestoreConfigSnapshot = (
  value: unknown,
): HeatCapacityFreeConfigSnapshot | null => {
  if (
    !isHeatCapacityRestoreRecord(value) ||
    value.version !== HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION
  ) {
    return null;
  }

  const fallback = createDefaultFreeConfigSnapshot();
  const environment = isHeatCapacityRestoreRecord(value.environment) ? value.environment : {};
  const physics = isHeatCapacityRestoreRecord(value.physics) ? value.physics : {};
  const thermal = isHeatCapacityRestoreRecord(physics.thermal) ? physics.thermal : {};
  const pumpValveExchange = isHeatCapacityRestoreRecord(physics.pumpValveExchange)
    ? physics.pumpValveExchange
    : {};
  const environmentDisturbance = isHeatCapacityRestoreRecord(physics.environmentDisturbance)
    ? physics.environmentDisturbance
    : {};
  const leakage = isHeatCapacityRestoreRecord(physics.leakage) ? physics.leakage : {};
  const sensor = isHeatCapacityRestoreRecord(value.sensor) ? value.sensor : {};
  const pressureNonlinearity = isHeatCapacityRestoreRecord(sensor.pressureNonlinearity)
    ? sensor.pressureNonlinearity
    : {};
  const record = isHeatCapacityRestoreRecord(value.record) ? value.record : {};
  const scoring = isHeatCapacityRestoreRecord(value.scoring) ? value.scoring : {};

  return {
    version: HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
    environment: {
      ambientPressureKPa: heatCapacityRestoreFiniteOrDefault(
        environment.ambientPressureKPa,
        fallback.environment.ambientPressureKPa,
      ),
      ambientTemperatureK: heatCapacityRestoreFiniteOrDefault(
        environment.ambientTemperatureK,
        fallback.environment.ambientTemperatureK,
      ),
    },
    physics: {
      gamma: heatCapacityRestoreFiniteOrDefault(physics.gamma, fallback.physics.gamma),
      vesselVolumeL: heatCapacityRestoreFiniteOrDefault(
        physics.vesselVolumeL,
        fallback.physics.vesselVolumeL,
      ),
      pumpAmountGainRatio: heatCapacityRestoreFiniteOrDefault(
        physics.pumpAmountGainRatio,
        fallback.physics.pumpAmountGainRatio,
      ),
      pumpWorkRetention: heatCapacityRestoreFiniteOrDefault(
        physics.pumpWorkRetention,
        fallback.physics.pumpWorkRetention,
      ),
      pumpPressureLimitKPa: heatCapacityRestoreFiniteOrDefault(
        physics.pumpPressureLimitKPa,
        fallback.physics.pumpPressureLimitKPa,
      ),
      pumpStrokeDurationS: heatCapacityRestoreFiniteOrDefault(
        physics.pumpStrokeDurationS,
        fallback.physics.pumpStrokeDurationS,
      ),
      recommendedPumpIntervalS: HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S,
      stopcockFlowRate: heatCapacityRestoreFiniteOrDefault(
        physics.stopcockFlowRate,
        fallback.physics.stopcockFlowRate,
      ),
      openingAnimationDurationMs: heatCapacityRestoreFiniteOrDefault(
        physics.openingAnimationDurationMs,
        fallback.physics.openingAnimationDurationMs,
      ),
      closingAnimationDurationMs: heatCapacityRestoreFiniteOrDefault(
        physics.closingAnimationDurationMs,
        fallback.physics.closingAnimationDurationMs,
      ),
      releaseApertureRampS: heatCapacityRestoreFiniteOrDefault(
        physics.releaseApertureRampS,
        fallback.physics.releaseApertureRampS,
      ),
      releaseOptimalMinS: heatCapacityRestoreFiniteOrDefault(
        physics.releaseOptimalMinS,
        fallback.physics.releaseOptimalMinS,
      ),
      releaseOptimalMaxS: heatCapacityRestoreFiniteOrDefault(
        physics.releaseOptimalMaxS,
        fallback.physics.releaseOptimalMaxS,
      ),
      autoDemoReleaseDurationS: heatCapacityRestoreFiniteOrDefault(
        physics.autoDemoReleaseDurationS,
        fallback.physics.autoDemoReleaseDurationS,
      ),
      thermal: {
        gasWallConductanceWPerK: heatCapacityRestoreFiniteOrDefault(
          thermal.gasWallConductanceWPerK,
          fallback.physics.thermal.gasWallConductanceWPerK,
        ),
        wallAmbientConductanceWPerK: heatCapacityRestoreFiniteOrDefault(
          thermal.wallAmbientConductanceWPerK,
          fallback.physics.thermal.wallAmbientConductanceWPerK,
        ),
        wallHeatCapacityJPerK: heatCapacityRestoreFiniteOrDefault(
          thermal.wallHeatCapacityJPerK,
          fallback.physics.thermal.wallHeatCapacityJPerK,
        ),
        minimumGasHeatCapacityJPerK: heatCapacityRestoreFiniteOrDefault(
          thermal.minimumGasHeatCapacityJPerK,
          fallback.physics.thermal.minimumGasHeatCapacityJPerK,
        ),
      },
      pumpValveExchange: normalizeFreePumpValveExchangeConfig({
        enabled: pumpValveExchange.enabled === true,
        gasExchangeRatePerS: heatCapacityRestoreFiniteOrDefault(
          pumpValveExchange.gasExchangeRatePerS,
          fallback.physics.pumpValveExchange?.gasExchangeRatePerS ?? 0.00015,
        ),
        thermalConductanceWPerK: heatCapacityRestoreFiniteOrDefault(
          pumpValveExchange.thermalConductanceWPerK,
          fallback.physics.pumpValveExchange?.thermalConductanceWPerK ?? 0.01,
        ),
        openingDelayS: heatCapacityRestoreFiniteOrDefault(
          pumpValveExchange.openingDelayS,
          fallback.physics.pumpValveExchange?.openingDelayS ?? 0.42,
        ),
      }),
      environmentDisturbance: normalizeFreeEnvironmentDisturbanceConfig({
        enabled: environmentDisturbance.enabled === true,
        pressureAmplitudeKPa: heatCapacityRestoreFiniteOrDefault(
          environmentDisturbance.pressureAmplitudeKPa,
          fallback.physics.environmentDisturbance?.pressureAmplitudeKPa ?? 0.002,
        ),
        temperatureAmplitudeK: heatCapacityRestoreFiniteOrDefault(
          environmentDisturbance.temperatureAmplitudeK,
          fallback.physics.environmentDisturbance?.temperatureAmplitudeK ?? 0.015,
        ),
        timeScaleS: heatCapacityRestoreFiniteOrDefault(
          environmentDisturbance.timeScaleS,
          fallback.physics.environmentDisturbance?.timeScaleS ?? 180,
        ),
      }),
      leakage: {
        enabled: leakage.enabled === true,
        ratePerS: heatCapacityRestoreFiniteOrDefault(
          leakage.ratePerS,
          fallback.physics.leakage.ratePerS,
        ),
      },
    },
    sensor: {
      pressureMvPerKPa: heatCapacityRestoreFiniteOrDefault(
        sensor.pressureMvPerKPa,
        fallback.sensor.pressureMvPerKPa,
      ),
      // Preserve the stored ambient voltage so both legacy relative baselines
      // and the current fixed-reference calibration remain reopenable.
      temperatureMvAtAmbient: heatCapacityRestoreFiniteOrDefault(
        sensor.temperatureMvAtAmbient,
        fallback.sensor.temperatureMvAtAmbient,
      ),
      temperatureMvPerK: fallback.sensor.temperatureMvPerK,
      lagRate: heatCapacityRestoreFiniteOrDefault(sensor.lagRate, fallback.sensor.lagRate),
      noiseMv: heatCapacityRestoreFiniteOrDefault(sensor.noiseMv, fallback.sensor.noiseMv),
      quantizationMv: heatCapacityRestoreFiniteOrDefault(
        sensor.quantizationMv,
        fallback.sensor.quantizationMv,
      ),
      minSampleIntervalS: heatCapacityRestoreFiniteOrDefault(
        sensor.minSampleIntervalS,
        fallback.sensor.minSampleIntervalS,
      ),
      maxSampleIntervalS: heatCapacityRestoreFiniteOrDefault(
        sensor.maxSampleIntervalS,
        fallback.sensor.maxSampleIntervalS,
      ),
      fastProcessSampleStepS: heatCapacityRestoreFiniteOrDefault(
        sensor.fastProcessSampleStepS,
        fallback.sensor.fastProcessSampleStepS,
      ),
      historyWindowS: heatCapacityRestoreFiniteOrDefault(
        sensor.historyWindowS,
        fallback.sensor.historyWindowS,
      ),
      pressureNonlinearity: normalizeFreePressureSensorNonlinearityConfig({
        enabled: pressureNonlinearity.enabled === true,
        kneeMv: heatCapacityRestoreFiniteOrDefault(
          pressureNonlinearity.kneeMv,
          fallback.sensor.pressureNonlinearity?.kneeMv ?? 70,
        ),
        minGain: heatCapacityRestoreFiniteOrDefault(
          pressureNonlinearity.minGain,
          fallback.sensor.pressureNonlinearity?.minGain ?? 0.72,
        ),
        exponent: heatCapacityRestoreFiniteOrDefault(
          pressureNonlinearity.exponent,
          fallback.sensor.pressureNonlinearity?.exponent ?? 1.8,
        ),
        extraNoiseMv: heatCapacityRestoreFiniteOrDefault(
          pressureNonlinearity.extraNoiseMv,
          fallback.sensor.pressureNonlinearity?.extraNoiseMv ?? 0.08,
        ),
      }),
    },
    record: {
      u0ZeroToleranceMv: heatCapacityRestoreFiniteOrDefault(
        record.u0ZeroToleranceMv,
        fallback.record.u0ZeroToleranceMv,
      ),
      pressureStableSlopeMvPerS: heatCapacityRestoreFiniteOrDefault(
        record.pressureStableSlopeMvPerS,
        fallback.record.pressureStableSlopeMvPerS,
      ),
      temperatureStableSlopeMvPerS: heatCapacityRestoreFiniteOrDefault(
        record.temperatureStableSlopeMvPerS,
        fallback.record.temperatureStableSlopeMvPerS,
      ),
      temperatureAmbientToleranceMv: heatCapacityRestoreFiniteOrDefault(
        record.temperatureAmbientToleranceMv,
        fallback.record.temperatureAmbientToleranceMv,
      ),
      minimumUsefulU1CorrectedMv: heatCapacityRestoreFiniteOrDefault(
        record.minimumUsefulU1CorrectedMv,
        fallback.record.minimumUsefulU1CorrectedMv,
      ),
      overVentedMinimumU2CorrectedMv: heatCapacityRestoreFiniteOrDefault(
        record.overVentedMinimumU2CorrectedMv,
        fallback.record.overVentedMinimumU2CorrectedMv,
      ),
      pressureWarningMv: heatCapacityRestoreFiniteOrDefault(
        record.pressureWarningMv,
        fallback.record.pressureWarningMv,
      ),
      pressureDangerMv: heatCapacityRestoreFiniteOrDefault(
        record.pressureDangerMv,
        fallback.record.pressureDangerMv,
      ),
    },
    scoring: {
      processScoringVersion: scoring.processScoringVersion === HEAT_CAPACITY_PROCESS_SCORING_VERSION
        ? HEAT_CAPACITY_PROCESS_SCORING_VERSION
        : fallback.scoring.processScoringVersion,
    },
  };
};

const normalizeHeatCapacityFreeRestoreRecord = (
  value: unknown,
): HeatCapacityFreeTrial['u0'] => (
  isHeatCapacityRestoreRecord(value)
    ? normalizeHeatCapacityFreeRecordInput(value as unknown as HeatCapacityFreeRecordInput)
    : null
);

const normalizeHeatCapacityFreeRestoreBatchMembership = (
  value: unknown,
): HeatCapacityFreeTrialBatchMembership | null => {
  if (
    !isHeatCapacityRestoreRecord(value) ||
    value.version !== HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION ||
    typeof value.batchId !== 'string' ||
    value.batchId.trim().length === 0 ||
    typeof value.sequence !== 'number' ||
    !Number.isSafeInteger(value.sequence) ||
    value.sequence < 1
  ) {
    return null;
  }
  return {
    version: HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION,
    batchId: value.batchId,
    sequence: value.sequence,
  };
};

const isCanonicalHeatCapacityFreeRestoreBatchMembership = (
  value: unknown,
  expected?: HeatCapacityFreeTrialBatchMembership,
) => {
  const normalized = normalizeHeatCapacityFreeRestoreBatchMembership(value);
  if (
    normalized === null ||
    !isHeatCapacityRestoreRecord(value) ||
    Object.keys(value).length !== 3
  ) {
    return false;
  }
  return expected === undefined || (
    normalized.version === expected.version &&
    normalized.batchId === expected.batchId &&
    normalized.sequence === expected.sequence
  );
};

const normalizeHeatCapacityFreeRestoreCorrectedSignals = (
  value: unknown,
  u0: HeatCapacityFreeTrial['u0'],
  u1: HeatCapacityFreeTrial['u1'],
  u2: HeatCapacityFreeTrial['u2'],
): HeatCapacityFreeTrial['correctedSignals'] => {
  if (!isHeatCapacityRestoreRecord(value) || u1 === null || u2 === null) return null;
  const preheatBiasGamma = heatCapacityRestoreNullableNumber(value.preheatBiasGamma);
  const atmosphericPressureKPa = heatCapacityRestoreNullableNumber(value.atmosphericPressureKPa) ?? 101.3;
  const pressureSensitivityMvPerKPa = heatCapacityRestoreNullableNumber(value.pressureSensitivityMvPerKPa) ?? 20;
  const effectiveU0DisplayMv = u0?.displayPressureMv ?? 0;
  const corrected = getFreeCorrectedSignals({
    U0DisplayMv: effectiveU0DisplayMv,
    U1DisplayMv: u1.displayPressureMv,
    U2DisplayMv: u2.displayPressureMv,
  }, {
    atmosphericPressureKPa,
    pressureSensitivityMvPerKPa,
  });
  const normalizedPreheatBiasGamma = preheatBiasGamma ?? 0;
  const formulaGamma = Number(corrected.gamma.toFixed(6));
  return {
    calculationVersion: HEAT_CAPACITY_FREE_CALCULATION_VERSION,
    atmosphericPressureKPa,
    pressureSensitivityMvPerKPa,
    U0DisplayMv: effectiveU0DisplayMv,
    U1DisplayMv: u1.displayPressureMv,
    U2DisplayMv: u2.displayPressureMv,
    U1CorrectedMv: Number(corrected.U1CorrectedMv.toFixed(6)),
    U2CorrectedMv: Number(corrected.U2CorrectedMv.toFixed(6)),
    u0Source: u0 === null ? 'assumed-zero' : 'recorded',
    formulaGamma,
    preheatBiasGamma: normalizedPreheatBiasGamma,
    gamma: Number((formulaGamma + normalizedPreheatBiasGamma).toFixed(6)),
  };
};

const HEAT_CAPACITY_FREE_CORRECTED_SIGNAL_KEYS = new Set([
  'calculationVersion',
  'atmosphericPressureKPa',
  'pressureSensitivityMvPerKPa',
  'U0DisplayMv',
  'U1DisplayMv',
  'U2DisplayMv',
  'U1CorrectedMv',
  'U2CorrectedMv',
  'u0Source',
  'formulaGamma',
  'preheatBiasGamma',
  'gamma',
]);

const hasExactHeatCapacityFreeCorrectedSignalKeys = (
  value: Record<string, unknown>,
) => (
  Object.keys(value).length === HEAT_CAPACITY_FREE_CORRECTED_SIGNAL_KEYS.size &&
  Object.keys(value).every((key) => (
    HEAT_CAPACITY_FREE_CORRECTED_SIGNAL_KEYS.has(key)
  ))
);

const HEAT_CAPACITY_FREE_LEGACY_CORRECTED_SIGNAL_KEYS = new Set([
  'U0DisplayMv',
  'U1DisplayMv',
  'U2DisplayMv',
  'U1CorrectedMv',
  'U2CorrectedMv',
  'gamma',
]);

const isRepairableLegacyHeatCapacityFreeCorrectedSignals = (
  value: unknown,
) => (
  isHeatCapacityRestoreRecord(value) &&
  Object.keys(value).length ===
    HEAT_CAPACITY_FREE_LEGACY_CORRECTED_SIGNAL_KEYS.size &&
  Object.entries(value).every(([key, fieldValue]) => (
    HEAT_CAPACITY_FREE_LEGACY_CORRECTED_SIGNAL_KEYS.has(key) &&
    typeof fieldValue === 'number' &&
    Number.isFinite(fieldValue)
  ))
);

export const normalizeHeatCapacityFreeRestoreTrial = (
  value: unknown,
  fallbackConfigSnapshot: HeatCapacityFreeConfigSnapshot | null = null,
): HeatCapacityFreeTrial | null => {
  if (!isHeatCapacityRestoreRecord(value) || typeof value.id !== 'string') return null;
  const u0 = normalizeHeatCapacityFreeRestoreRecord(value.u0);
  const u1 = normalizeHeatCapacityFreeRestoreRecord(value.u1);
  const u2 = normalizeHeatCapacityFreeRestoreRecord(value.u2);
  const normalizedStandardReferenceSnapshot = normalizeHeatCapacityFreeStandardReferenceSnapshot(
    value.standardReferenceSnapshot,
  );
  const standardReferenceSnapshot = normalizedStandardReferenceSnapshot &&
    !hasHeatCapacityFreeIdealThermalBoundaryContamination(
      normalizedStandardReferenceSnapshot.configSnapshot.physics,
    )
    ? normalizedStandardReferenceSnapshot
    : null;
  const correctedSignals = u1 !== null && u2 !== null
    ? normalizeHeatCapacityFreeRestoreCorrectedSignals(value.correctedSignals, u0, u1, u2)
    : null;
  const restoredConfigSnapshot = normalizeHeatCapacityFreeRestoreConfigSnapshot(value.configSnapshot);
  const configSnapshot = restoredConfigSnapshot ?? standardReferenceSnapshot?.configSnapshot ?? (
    correctedSignals !== null &&
    fallbackConfigSnapshot !== null &&
    typeof value.traceTrialId === 'string'
      ? normalizeHeatCapacityFreeRestoreConfigSnapshot({
          ...fallbackConfigSnapshot,
          environment: {
            ...fallbackConfigSnapshot.environment,
            ambientPressureKPa: correctedSignals.atmosphericPressureKPa,
          },
          sensor: {
            ...fallbackConfigSnapshot.sensor,
            pressureMvPerKPa: correctedSignals.pressureSensitivityMvPerKPa,
          },
        })
      : null
  );
  return {
    id: value.id,
    source: 'free',
    parameterScheme: value.parameterScheme === 'ideal' ? 'ideal' : 'real',
    batchMembership: normalizeHeatCapacityFreeRestoreBatchMembership(
      value.batchMembership,
    ),
    traceTrialId: typeof value.traceTrialId === 'string' ? value.traceTrialId : null,
    branchCount: heatCapacityRestoreNullableNumber(value.branchCount) ?? 0,
    automaticU0: isHeatCapacityRestoreRecord(value.automaticU0)
      ? value.automaticU0 as HeatCapacityFreeTrial['automaticU0']
      : null,
    preheatOutcome: value.preheatOutcome === 'omitted'
      ? 'omitted'
      : value.preheatOutcome === 'completed'
        ? 'completed'
        : correctedSignals === null
          ? null
          : 'completed',
    u0,
    u1,
    u2,
    blockedReason: typeof value.blockedReason === 'string'
      ? value.blockedReason as HeatCapacityFreeTrial['blockedReason']
      : null,
    correctedSignals,
    configSnapshot,
    standardReferenceSnapshot,
    completedAtMs: standardReferenceSnapshot === null
      ? null
      : heatCapacityRestoreNullableNumber(value.completedAtMs),
  };
};

export const normalizeHeatCapacityFreeRestoreTraceBranch = (
  value: unknown,
): HeatCapacityFreeTraceBranch | null => {
  if (!isHeatCapacityRestoreRecord(value) || typeof value.id !== 'string') return null;
  const compactionValue = isHeatCapacityRestoreRecord(value.compaction)
    ? value.compaction
    : {};
  const droppedEventCounts = isHeatCapacityRestoreRecord(
    compactionValue.droppedEventCounts,
  )
    ? Object.fromEntries(Object.entries(
        compactionValue.droppedEventCounts,
      ).flatMap(([key, count]) => (
        typeof count === 'number' &&
        Number.isSafeInteger(count) &&
        count >= 0
          ? [[key, count]]
          : []
      )))
    : {};
  const compaction: HeatCapacityFreeTraceBranchCompaction = {
    version: HEAT_CAPACITY_FREE_TRACE_COMPACTION_VERSION,
    droppedSampleCount:
      readHeatCapacityTraceNonNegativeInteger(
        compactionValue.droppedSampleCount,
      ) ?? 0,
    droppedEventCount:
      readHeatCapacityTraceNonNegativeInteger(
        compactionValue.droppedEventCount,
      ) ?? 0,
    droppedEventCounts,
    firstDroppedAtS:
      heatCapacityRestoreNullableNumber(compactionValue.firstDroppedAtS),
    lastDroppedAtS:
      heatCapacityRestoreNullableNumber(compactionValue.lastDroppedAtS),
  };
  return {
    id: value.id,
    parentBranchId: typeof value.parentBranchId === 'string' ? value.parentBranchId : null,
    createdByEventId: typeof value.createdByEventId === 'string' ? value.createdByEventId : null,
    status: value.status === 'archived' ? 'archived' : 'main',
    hiddenInDefaultChart: value.hiddenInDefaultChart === true,
    nextSampleIndex: heatCapacityRestoreNullableNumber(value.nextSampleIndex) ?? 1,
    nextEventIndex: heatCapacityRestoreNullableNumber(value.nextEventIndex) ?? 1,
    nextSampleAtS: heatCapacityRestoreNullableNumber(value.nextSampleAtS),
    lastKeptSampleId: typeof value.lastKeptSampleId === 'string' ? value.lastKeptSampleId : null,
    idleState: isHeatCapacityRestoreRecord(value.idleState)
      ? {
          lastUserActionAtS: heatCapacityRestoreNullableNumber(value.idleState.lastUserActionAtS),
          dormantSinceS: heatCapacityRestoreNullableNumber(value.idleState.dormantSinceS),
          lastHeartbeatAtS: heatCapacityRestoreNullableNumber(value.idleState.lastHeartbeatAtS),
        }
      : {
          lastUserActionAtS: null,
          dormantSinceS: null,
          lastHeartbeatAtS: null,
        },
    samples: Array.isArray(value.samples)
      ? value.samples.filter(isHeatCapacityRestoreRecord) as unknown as HeatCapacityFreeTraceBranch['samples']
      : [],
    events: Array.isArray(value.events)
      ? value.events.filter(isHeatCapacityRestoreRecord) as unknown as HeatCapacityFreeTraceBranch['events']
      : [],
    compaction,
  };
};

const readHeatCapacityTraceNonNegativeInteger = (
  value: unknown,
) => (
  typeof value === 'number' &&
  Number.isSafeInteger(value) &&
  value >= 0
    ? value
    : null
);

const normalizeHeatCapacityFreeTraceTrialCompaction = (
  value: unknown,
): HeatCapacityFreeTraceTrialCompaction => {
  const record = isHeatCapacityRestoreRecord(value) ? value : {};
  return {
    version: HEAT_CAPACITY_FREE_TRACE_COMPACTION_VERSION,
    droppedBranchCount:
      readHeatCapacityTraceNonNegativeInteger(record.droppedBranchCount) ?? 0,
    droppedSampleCount:
      readHeatCapacityTraceNonNegativeInteger(record.droppedSampleCount) ?? 0,
    droppedEventCount:
      readHeatCapacityTraceNonNegativeInteger(record.droppedEventCount) ?? 0,
    firstDroppedBranchId:
      typeof record.firstDroppedBranchId === 'string'
        ? record.firstDroppedBranchId
        : null,
    lastDroppedBranchId:
      typeof record.lastDroppedBranchId === 'string'
        ? record.lastDroppedBranchId
        : null,
  };
};

const normalizeHeatCapacityFreeTraceStoreCompaction = (
  value: unknown,
): HeatCapacityFreeTraceStoreCompaction => {
  const record = isHeatCapacityRestoreRecord(value) ? value : {};
  return {
    version: HEAT_CAPACITY_FREE_TRACE_COMPACTION_VERSION,
    droppedTrialCount:
      readHeatCapacityTraceNonNegativeInteger(record.droppedTrialCount) ?? 0,
    droppedBranchCount:
      readHeatCapacityTraceNonNegativeInteger(record.droppedBranchCount) ?? 0,
    droppedSampleCount:
      readHeatCapacityTraceNonNegativeInteger(record.droppedSampleCount) ?? 0,
    droppedEventCount:
      readHeatCapacityTraceNonNegativeInteger(record.droppedEventCount) ?? 0,
    firstDroppedTrialId:
      typeof record.firstDroppedTrialId === 'string'
        ? record.firstDroppedTrialId
        : null,
    lastDroppedTrialId:
      typeof record.lastDroppedTrialId === 'string'
        ? record.lastDroppedTrialId
        : null,
  };
};

export const normalizeHeatCapacityFreeRestoreTraceTrial = (
  value: unknown,
): HeatCapacityFreeTraceTrial | null => {
  if (
    !isHeatCapacityRestoreRecord(value) ||
    typeof value.id !== 'string' ||
    !Array.isArray(value.branches)
  ) {
    return null;
  }
  const branches = value.branches
    .map(normalizeHeatCapacityFreeRestoreTraceBranch)
    .filter((branch): branch is HeatCapacityFreeTraceBranch => branch !== null);
  if (branches.length === 0) return null;
  const activeBranchId = typeof value.activeBranchId === 'string' &&
    branches.some((branch) => branch.id === value.activeBranchId)
    ? value.activeBranchId
    : branches[0].id;
  return {
    id: value.id,
    linkedTrialId: typeof value.linkedTrialId === 'string' ? value.linkedTrialId : null,
    status: value.status === 'completed' || value.status === 'discarded' ? value.status : 'active',
    activeBranchId,
    nextBranchIndex: heatCapacityRestoreNullableNumber(value.nextBranchIndex) ?? branches.length + 1,
    branches,
    configSnapshot: normalizeHeatCapacityFreeRestoreConfigSnapshot(value.configSnapshot) ??
      createDefaultFreeConfigSnapshot(),
    branchCompaction: normalizeHeatCapacityFreeTraceTrialCompaction(
      value.branchCompaction,
    ),
  };
};

export type HeatCapacityFreeRestoreTraceStoreResult =
  | {
      ok: true;
      status: 'exact' | 'migrated';
      value: HeatCapacityFreeTraceStore;
    }
  | {
      ok: false;
      status: 'quarantined';
      raw: unknown;
      reason: string;
    };

const hasUniqueNonEmptyRestoreIds = (
  values: readonly unknown[],
) => {
  const ids = new Set<string>();
  return values.every((value) => {
    if (
      typeof value !== 'string' ||
      value.trim().length === 0 ||
      ids.has(value)
    ) {
      return false;
    }
    ids.add(value);
    return true;
  });
};

export const normalizeHeatCapacityFreeRestoreTraceStoreResult = (
  value: unknown,
): HeatCapacityFreeRestoreTraceStoreResult => {
  if (value === undefined || value === null) {
    return {
      ok: true,
      status: 'migrated',
      value: createDefaultFreeTraceStore(),
    };
  }
  if (!isHeatCapacityRestoreRecord(value) || !Array.isArray(value.traceTrials)) {
    return {
      ok: false,
      status: 'quarantined',
      raw: value,
      reason: 'Free trace store must contain a traceTrials array.',
    };
  }
  const incompatibleTrace = value.traceTrials.some((trial) => (
    isHeatCapacityRestoreRecord(trial) && Array.isArray(trial.branches) && trial.branches.some((branch) => (
      isHeatCapacityRestoreRecord(branch) && Array.isArray(branch.samples) && branch.samples.some((sample) => {
        if (!isHeatCapacityRestoreRecord(sample) || !isHeatCapacityRestoreRecord(sample.controls)) return true;
        return typeof sample.controls.releaseFlowOpen !== 'boolean' ||
          typeof sample.controls.releaseDurationS !== 'number' ||
          !['closed', 'opening', 'open', 'releasing', 'closing', 'closedAfterRelease']
            .includes(String(sample.controls.releasePhase));
      })
    ))
  ));
  if (incompatibleTrace) {
    return {
      ok: false,
      status: 'quarantined',
      raw: value,
      reason: 'Free trace store contains an incompatible authoritative sample.',
    };
  }
  const normalizedTraceTrials = value.traceTrials.map((traceTrial) => {
    if (
      !isHeatCapacityRestoreRecord(traceTrial) ||
      !Array.isArray(traceTrial.branches) ||
      traceTrial.branches.some((branch) => (
        !isHeatCapacityRestoreRecord(branch) ||
        !Array.isArray(branch.samples) ||
        !Array.isArray(branch.events) ||
        branch.samples.some((sample) => !isHeatCapacityRestoreRecord(sample)) ||
        branch.events.some((event) => !isHeatCapacityRestoreRecord(event))
      ))
    ) {
      return null;
    }
    const normalized = normalizeHeatCapacityFreeRestoreTraceTrial(traceTrial);
    if (
      normalized === null ||
      normalized.branches.length !== traceTrial.branches.length ||
      !hasUniqueNonEmptyRestoreIds(
        traceTrial.branches.map((branch) => (
          isHeatCapacityRestoreRecord(branch) ? branch.id : null
        )),
      ) ||
      normalized.branches.some((_branch, branchIndex) => {
        const sourceBranch = traceTrial.branches[branchIndex];
        return !isHeatCapacityRestoreRecord(sourceBranch) ||
          !hasUniqueNonEmptyRestoreIds(
            (sourceBranch.samples as unknown[]).map((sample) => (
              isHeatCapacityRestoreRecord(sample) ? sample.id : null
            )),
          ) ||
          !hasUniqueNonEmptyRestoreIds(
            (sourceBranch.events as unknown[]).map((event) => (
              isHeatCapacityRestoreRecord(event) ? event.id : null
            )),
          );
      })
    ) {
      return null;
    }
    return normalized;
  });
  if (normalizedTraceTrials.some((trial) => trial === null)) {
    return {
      ok: false,
      status: 'quarantined',
      raw: value,
      reason: 'Free trace store contains an invalid trial, branch, sample, or event relationship.',
    };
  }
  const traceTrials = normalizedTraceTrials as HeatCapacityFreeTraceTrial[];
  if (!hasUniqueNonEmptyRestoreIds(traceTrials.map((trial) => trial.id))) {
    return {
      ok: false,
      status: 'quarantined',
      raw: value,
      reason: 'Free trace trial identities must be unique non-empty strings.',
    };
  }
  if (
    value.activeTraceTrialId !== null &&
    (
      typeof value.activeTraceTrialId !== 'string' ||
      !traceTrials.some((trial) => trial.id === value.activeTraceTrialId)
    )
  ) {
    return {
      ok: false,
      status: 'quarantined',
      raw: value,
      reason: 'Free trace active trial reference is invalid.',
    };
  }
  const activeTraceTrialId = typeof value.activeTraceTrialId === 'string' &&
    traceTrials.some((trial) => trial.id === value.activeTraceTrialId)
    ? value.activeTraceTrialId
    : null;
  const maximumTraceTrialIndex = Math.max(
    0,
    ...traceTrials.map((trial) => {
      const match = /^free-trace-trial-(\d+)$/.exec(trial.id);
      if (!match) return 0;
      const index = Number(match[1]);
      return Number.isSafeInteger(index) && index >= 1 ? index : 0;
    }),
  );
  const restoredNextTraceTrialIndex = heatCapacityRestoreNullableNumber(
    value.nextTraceTrialIndex,
  );
  const hasExactTraceHighWater = restoredNextTraceTrialIndex !== null &&
    Number.isSafeInteger(restoredNextTraceTrialIndex) &&
    restoredNextTraceTrialIndex >= 1 &&
    restoredNextTraceTrialIndex > maximumTraceTrialIndex;
  const nextTraceTrialIndex = hasExactTraceHighWater
    ? restoredNextTraceTrialIndex
    : Math.max(
        traceTrials.length + 1,
        maximumTraceTrialIndex + 1,
        restoredNextTraceTrialIndex ?? 1,
      );
  const normalizedStore = compactFreeTraceStore({
    activeTraceTrialId,
    nextTraceTrialIndex,
    traceTrials,
    compaction: normalizeHeatCapacityFreeTraceStoreCompaction(
      value.compaction,
    ),
  });
  const traceMigrated = !areHeatCapacityPersistenceValuesEqual(
    value,
    normalizedStore as unknown as Record<string, unknown>,
  );
  return {
    ok: true,
    status:
      hasExactTraceHighWater && !traceMigrated ? 'exact' : 'migrated',
    value: normalizedStore,
  };
};

export const normalizeHeatCapacityFreeRestoreTraceStore = (
  value: unknown,
): HeatCapacityFreeTraceStore => {
  const result = normalizeHeatCapacityFreeRestoreTraceStoreResult(value);
  if (result.ok === false) {
    throw new TypeError(result.reason);
  }
  return result.value;
};

const normalizeHeatCapacityFreeRestoreDisplaySamples = (value: unknown) => (
  Array.isArray(value)
    ? value.flatMap((sample) => {
        if (!isHeatCapacityRestoreRecord(sample)) return [];
        const atS = heatCapacityRestoreNullableNumber(sample.atS);
        const valueMv = heatCapacityRestoreNullableNumber(sample.valueMv);
        return atS === null || valueMv === null ? [] : [{ atS, valueMv }];
      })
    : []
);

export const normalizeHeatCapacityFreeRestorePhysicsState = (
  value: unknown,
  fallback: HeatCapacityFreePhysicsState,
): HeatCapacityFreePhysicsState => {
  const state = isHeatCapacityRestoreRecord(value) ? value : {};
  const pumpProcesses = Array.isArray(state.pumpProcesses)
    ? state.pumpProcesses.flatMap((process) => {
        if (!isHeatCapacityRestoreRecord(process)) return [];
        const startedAtS = heatCapacityRestoreNullableNumber(process.startedAtS);
        const strength = heatCapacityRestoreNullableNumber(process.strength);
        const appliedProgress = heatCapacityRestoreNullableNumber(process.appliedProgress);
        return startedAtS === null || strength === null || appliedProgress === null
          ? []
          : [{ startedAtS, strength, appliedProgress }];
      })
    : fallback.pumpProcesses;
  const releaseReference = isHeatCapacityRestoreRecord(state.releaseReference)
    ? {
        pressureBeforeKPa: heatCapacityRestoreNullableNumber(state.releaseReference.pressureBeforeKPa),
        temperatureBeforeK: heatCapacityRestoreNullableNumber(state.releaseReference.temperatureBeforeK),
        amountBeforeRatio: heatCapacityRestoreNullableNumber(state.releaseReference.amountBeforeRatio),
        openedAtS: heatCapacityRestoreNullableNumber(state.releaseReference.openedAtS),
        reachedAmbientAtS: heatCapacityRestoreNullableNumber(state.releaseReference.reachedAmbientAtS),
      }
    : null;
  const validReleaseReference = releaseReference &&
    releaseReference.pressureBeforeKPa !== null &&
    releaseReference.temperatureBeforeK !== null &&
    releaseReference.amountBeforeRatio !== null &&
    releaseReference.openedAtS !== null
    ? releaseReference as HeatCapacityFreePhysicsState['releaseReference']
    : null;
  const gasAmountRatio = heatCapacityRestoreFiniteOrDefault(state.gasAmountRatio, fallback.gasAmountRatio);
  const normalizedGasAmountRatio = gasAmountRatio > 0 ? gasAmountRatio : fallback.gasAmountRatio;
  const gasTemperatureK = Math.max(
    0.001,
    heatCapacityRestoreFiniteOrDefault(state.gasTemperatureK, fallback.gasTemperatureK),
  );
  const referenceAmountMol = heatCapacityRestoreFiniteOrDefault(
    state.referenceAmountMol,
    fallback.referenceAmountMol ?? 0,
  );
  const amountMol = heatCapacityRestoreFiniteOrDefault(
    state.amountMol,
    referenceAmountMol * normalizedGasAmountRatio,
  );
  const internalEnergyJ = heatCapacityRestoreFiniteOrDefault(
    state.internalEnergyJ,
    (fallback.internalEnergyJ ?? 0) *
      (amountMol / Math.max(1e-12, fallback.amountMol ?? amountMol)) *
      (gasTemperatureK / Math.max(1e-12, fallback.gasTemperatureK)),
  );
  return {
    simulationTimeS: heatCapacityRestoreFiniteOrDefault(state.simulationTimeS, fallback.simulationTimeS),
    amountMol: amountMol > 0 ? amountMol : fallback.amountMol,
    internalEnergyJ: internalEnergyJ > 0 ? internalEnergyJ : fallback.internalEnergyJ,
    referenceAmountMol: referenceAmountMol > 0 ? referenceAmountMol : fallback.referenceAmountMol,
    gasAmountRatio: normalizedGasAmountRatio,
    gasTemperatureK,
    wallTemperatureK: Math.max(0.001, heatCapacityRestoreFiniteOrDefault(state.wallTemperatureK, fallback.wallTemperatureK)),
    pumpProcesses,
    pumpStrokeCount: Math.max(0, heatCapacityRestoreFiniteOrDefault(state.pumpStrokeCount, fallback.pumpStrokeCount)),
    lastPumpStrokeAtS: heatCapacityRestoreNullableNumber(state.lastPumpStrokeAtS),
    lastPumpValveOpenedAtS: heatCapacityRestoreNullableNumber(state.lastPumpValveOpenedAtS),
    lastPumpValveClosedAtS: heatCapacityRestoreNullableNumber(state.lastPumpValveClosedAtS),
    currentPumpValveOpenDurationS: Math.max(0, heatCapacityRestoreFiniteOrDefault(state.currentPumpValveOpenDurationS, fallback.currentPumpValveOpenDurationS)),
    environmentDisturbanceSeed: typeof state.environmentDisturbanceSeed === 'string' || typeof state.environmentDisturbanceSeed === 'number'
      ? state.environmentDisturbanceSeed
      : fallback.environmentDisturbanceSeed,
    ambientPressureOffsetKPa: heatCapacityRestoreFiniteOrDefault(state.ambientPressureOffsetKPa, fallback.ambientPressureOffsetKPa),
    ambientTemperatureOffsetK: heatCapacityRestoreFiniteOrDefault(state.ambientTemperatureOffsetK, fallback.ambientTemperatureOffsetK),
    effectiveAmbientPressureKPa: heatCapacityRestoreFiniteOrDefault(state.effectiveAmbientPressureKPa, fallback.effectiveAmbientPressureKPa),
    effectiveAmbientTemperatureK: heatCapacityRestoreFiniteOrDefault(state.effectiveAmbientTemperatureK, fallback.effectiveAmbientTemperatureK),
    maxPressureKPa: heatCapacityRestoreFiniteOrDefault(state.maxPressureKPa, fallback.maxPressureKPa),
    releaseStarted: state.releaseStarted === true,
    lastStopcockOpenedAtS: heatCapacityRestoreNullableNumber(state.lastStopcockOpenedAtS),
    lastStopcockClosedAtS: heatCapacityRestoreNullableNumber(state.lastStopcockClosedAtS),
    currentStopcockOpenDurationS: Math.max(0, heatCapacityRestoreFiniteOrDefault(state.currentStopcockOpenDurationS, fallback.currentStopcockOpenDurationS)),
    releaseReference: validReleaseReference,
  };
};

export const normalizeHeatCapacityFreeRestoreSensorState = (
  value: unknown,
  fallback: HeatCapacityFreeSensorState,
): HeatCapacityFreeSensorState => {
  const state = isHeatCapacityRestoreRecord(value) ? value : {};
  const sensorTemperatureK = heatCapacityRestoreFiniteOrDefault(
    state.sensorTemperatureK,
    fallback.sensorTemperatureK ?? 298.15,
  );
  return {
    seed: typeof state.seed === 'string' || typeof state.seed === 'number' ? state.seed : fallback.seed,
    pressureInitialBiasMv: heatCapacityRestoreFiniteOrDefault(state.pressureInitialBiasMv, fallback.pressureInitialBiasMv),
    displayPressureMv: heatCapacityRestoreFiniteOrDefault(state.displayPressureMv, fallback.displayPressureMv),
    displayTemperatureMv: heatCapacityRestoreFiniteOrDefault(
      state.displayTemperatureMv,
      fallback.displayTemperatureMv,
    ),
    sensorTemperatureK,
    nextSampleAtS: heatCapacityRestoreFiniteOrDefault(state.nextSampleAtS, fallback.nextSampleAtS),
    pressureHistory: normalizeHeatCapacityFreeRestoreDisplaySamples(state.pressureHistory),
    temperatureHistory: normalizeHeatCapacityFreeRestoreDisplaySamples(state.temperatureHistory),
    pressureSlopeMvPerS: heatCapacityRestoreFiniteOrDefault(state.pressureSlopeMvPerS, fallback.pressureSlopeMvPerS),
    temperatureSlopeMvPerS: heatCapacityRestoreFiniteOrDefault(state.temperatureSlopeMvPerS, fallback.temperatureSlopeMvPerS),
    pressureReliability: Math.min(1, Math.max(0, heatCapacityRestoreFiniteOrDefault(state.pressureReliability, fallback.pressureReliability))),
    pressureNonlinearErrorMv: heatCapacityRestoreFiniteOrDefault(state.pressureNonlinearErrorMv, fallback.pressureNonlinearErrorMv),
    pressureStochasticErrorMv: heatCapacityRestoreFiniteOrDefault(state.pressureStochasticErrorMv, fallback.pressureStochasticErrorMv),
  };
};

export const normalizeHeatCapacityFreeRestoreCalibrationState = (
  value: unknown,
  fallback: HeatCapacityFreeCalibrationState,
): HeatCapacityFreeCalibrationState => {
  const state = isHeatCapacityRestoreRecord(value) ? value : {};
  const zeroEvents = Array.isArray(state.zeroEvents)
    ? state.zeroEvents.flatMap((event) => {
        if (!isHeatCapacityRestoreRecord(event) || typeof event.id !== 'string') return [];
        const atS = heatCapacityRestoreNullableNumber(event.atS);
        const displayPressureMv = heatCapacityRestoreNullableNumber(event.displayPressureMv);
        const displayTemperatureMv = heatCapacityRestoreNullableNumber(event.displayTemperatureMv);
        const zeroOffsetMv = heatCapacityRestoreNullableNumber(event.zeroOffsetMv);
        if (atS === null || displayPressureMv === null || displayTemperatureMv === null || zeroOffsetMv === null) return [];
        return [{
          id: event.id,
          atS,
          displayPressureMv,
          displayTemperatureMv,
          zeroOffsetMv,
          source: event.source === 'auto' ? 'auto' as const : 'user' as const,
        }];
      })
    : fallback.zeroEvents;
  const automaticU0Record = isHeatCapacityRestoreRecord(state.automaticU0) ? state.automaticU0 : null;
  const automaticU0 = automaticU0Record && typeof automaticU0Record.zeroEventId === 'string'
    ? {
        displayPressureMv: heatCapacityRestoreNullableNumber(automaticU0Record.displayPressureMv),
        displayTemperatureMv: heatCapacityRestoreNullableNumber(automaticU0Record.displayTemperatureMv),
        calibrationVersion: heatCapacityRestoreNullableNumber(automaticU0Record.calibrationVersion),
        zeroEventId: automaticU0Record.zeroEventId,
        atS: heatCapacityRestoreNullableNumber(automaticU0Record.atS),
      }
    : null;
  const validAutomaticU0 = automaticU0 &&
    automaticU0.displayPressureMv !== null &&
    automaticU0.displayTemperatureMv !== null &&
    automaticU0.calibrationVersion !== null &&
    automaticU0.atS !== null
    ? automaticU0 as HeatCapacityFreeCalibrationState['automaticU0']
    : null;
  return {
    calibrationVersion: Math.max(0, Math.floor(heatCapacityRestoreFiniteOrDefault(state.calibrationVersion, fallback.calibrationVersion))),
    zeroOffsetMv: heatCapacityRestoreFiniteOrDefault(state.zeroOffsetMv, fallback.zeroOffsetMv),
    zeroEvents,
    automaticU0: validAutomaticU0,
  };
};

const heatCapacityRestorePhases = [
  'powerOff',
  'readyToZero',
  'zeroed',
  'readyToPump',
  'pumping',
  'sealedStabilizing',
  'releasing',
  'recovering',
] as const satisfies readonly HeatCapacityRuntimePhase[];

const normalizeHeatCapacityFreeRestoreRollbackSnapshot = (
  value: unknown,
  fallback: HeatCapacityFreeExperimentDomainState,
): HeatCapacityFreeRollbackSnapshot | null => {
  if (!isHeatCapacityRestoreRecord(value)) return null;
  if (
    !isHeatCapacityRestoreRecord(value.heatCapacityFreePhysicsState) ||
    !isHeatCapacityRestoreRecord(value.heatCapacityFreeSensorState) ||
    !isHeatCapacityRestoreRecord(value.heatCapacityFreeCalibrationState)
  ) {
    return null;
  }
  const phase = heatCapacityRestorePhases.includes(value.heatCapacityPhase as HeatCapacityRuntimePhase)
    ? value.heatCapacityPhase as HeatCapacityRuntimePhase
    : 'powerOff';
  const runState = value.runState === 'running' || value.runState === 'paused' || value.runState === 'finished' || value.runState === 'needs-reset'
    ? value.runState
    : 'idle';
  const pumpValveOpen = value.pumpValveOpen === true;
  const physicsState = normalizeHeatCapacityFreeRestorePhysicsState(
    value.heatCapacityFreePhysicsState,
    fallback.physicsState,
  );
  return {
    powerOn: value.powerOn === true,
    runState,
    heatCapacityPhase: phase,
    glassPistonState: value.glassPistonState === 'open' ? 'open' : 'closed',
    stopcockAngleDeg: normalizeHeatCapacityStopcockAngle(value.stopcockAngleDeg),
    pressureSignalMv: heatCapacityRestoreNullableNumber(value.pressureSignalMv),
    temperatureSignalMv: heatCapacityRestoreNullableNumber(value.temperatureSignalMv),
    pressureSignalTargetMv: heatCapacityRestoreFiniteOrDefault(value.pressureSignalTargetMv, 0),
    temperatureSignalTargetMv: heatCapacityRestoreFiniteOrDefault(value.temperatureSignalTargetMv, 0),
    pressureInitialBiasMv: heatCapacityRestoreFiniteOrDefault(value.pressureInitialBiasMv, 0),
    pressureZeroed: value.pressureZeroed === true,
    pressureZeroAdjusted: value.pressureZeroAdjusted === true,
    pressureZeroKnobAngle: heatCapacityRestoreFiniteOrDefault(value.pressureZeroKnobAngle, 0),
    pressureZeroOffset: heatCapacityRestoreFiniteOrDefault(value.pressureZeroOffset, 0),
    pressureZeroDisplayText: typeof value.pressureZeroDisplayText === 'string' ? value.pressureZeroDisplayText : '0.00',
    pressureZeroAdjustMode: value.pressureZeroAdjustMode === 'fineWheel' || value.pressureZeroAdjustMode === 'coarseDrag'
      ? value.pressureZeroAdjustMode
      : 'none',
    pressureZeroDisplayedSamples: Array.isArray(value.pressureZeroDisplayedSamples)
      ? value.pressureZeroDisplayedSamples.flatMap((sample) => {
          if (!isHeatCapacityRestoreRecord(sample)) return [];
          const atMs = heatCapacityRestoreNullableNumber(sample.atMs);
          const valueMv = heatCapacityRestoreNullableNumber(sample.valueMv);
          return atMs === null || valueMv === null ? [] : [{ atMs, valueMv }];
        })
      : [],
    pumpValveOpen,
    pumpValveState: pumpValveOpen ? 'open' : 'closed',
    pumpBulbState: value.pumpBulbState === 'compressing' || value.pumpBulbState === 'releasing'
      ? value.pumpBulbState
      : 'idle',
    pumpStrokeTimestamps: Array.isArray(value.pumpStrokeTimestamps)
      ? value.pumpStrokeTimestamps.filter((timestamp): timestamp is number => typeof timestamp === 'number' && Number.isFinite(timestamp))
      : [],
    pumpFrequency: Math.max(0, heatCapacityRestoreFiniteOrDefault(value.pumpFrequency, 0)),
    pumpFrequencyStatus: value.pumpFrequencyStatus === 'tooSlow' || value.pumpFrequencyStatus === 'suitable'
      ? value.pumpFrequencyStatus
      : 'idle',
    lastPumpTime: heatCapacityRestoreNullableNumber(value.lastPumpTime),
    pumpStrokeCount: Math.max(0, Math.floor(heatCapacityRestoreFiniteOrDefault(value.pumpStrokeCount, 0))),
    pumpHint: typeof value.pumpHint === 'string' ? value.pumpHint : '',
    heatCapacityFreePhysicsState: physicsState,
    heatCapacityFreeSensorState: normalizeHeatCapacityFreeRestoreSensorState(value.heatCapacityFreeSensorState, fallback.sensorState),
    heatCapacityFreeCalibrationState: normalizeHeatCapacityFreeRestoreCalibrationState(value.heatCapacityFreeCalibrationState, fallback.calibrationState),
    heatCapacityReleaseState: normalizeHeatCapacityReleaseState(
      value.heatCapacityReleaseState,
      createClosedHeatCapacityReleaseState(physicsState.simulationTimeS),
    ),
  };
};

export const normalizeHeatCapacityFreeRestoreRollbackSnapshots = (
  value: unknown,
  fallback: HeatCapacityFreeExperimentDomainState,
): HeatCapacityFreeRollbackSnapshots => {
  const snapshots = isHeatCapacityRestoreRecord(value) ? value : {};
  return {
    afterPowerOn: normalizeHeatCapacityFreeRestoreRollbackSnapshot(snapshots.afterPowerOn, fallback),
    beforePump: normalizeHeatCapacityFreeRestoreRollbackSnapshot(snapshots.beforePump, fallback),
    beforeRelease: normalizeHeatCapacityFreeRestoreRollbackSnapshot(snapshots.beforeRelease, fallback),
  };
};

export type HeatCapacityFreeRestoreAggregateResult =
  | {
      ok: true;
      status: 'exact' | 'migrated' | 'repaired-cache';
      sourceVersion: 1 | 2 | null;
      value: HeatCapacityFreeExperimentDomainState;
    }
  | {
      ok: false;
      status: 'unsupported-future' | 'quarantined';
      sourceVersion: unknown;
      raw: unknown;
      reason: string;
      fieldPath?: string;
    };

const classifyHeatCapacityFreeAuthorityVersion = (
  authority: unknown,
  supportedVersion: number,
  fieldPath: string,
  label: string,
  raw: unknown,
): Extract<HeatCapacityFreeRestoreAggregateResult, { ok: false }> | null => {
  if (authority === undefined || authority === null) return null;
  if (!isHeatCapacityRestoreRecord(authority)) {
    return {
      ok: false,
      status: 'quarantined',
      sourceVersion: null,
      raw,
      reason: `${label} is invalid.`,
      fieldPath,
    };
  }
  const version = authority.version;
  if (
    typeof version === 'number' &&
    Number.isInteger(version) &&
    version > supportedVersion
  ) {
    return {
      ok: false,
      status: 'unsupported-future',
      sourceVersion: version,
      raw,
      reason: `${label} requires a newer application.`,
      fieldPath: `${fieldPath}.version`,
    };
  }
  if (version !== supportedVersion) {
    return {
      ok: false,
      status: 'quarantined',
      sourceVersion: version,
      raw,
      reason: `${label} version is unsupported.`,
      fieldPath: `${fieldPath}.version`,
    };
  }
  return null;
};

const classifyHeatCapacityFreeFutureAuthorityVersion = (
  authority: unknown,
  supportedVersion: number,
  fieldPath: string,
  label: string,
  raw: unknown,
): Extract<HeatCapacityFreeRestoreAggregateResult, { ok: false }> | null => {
  if (!isHeatCapacityRestoreRecord(authority)) return null;
  const version = authority.version;
  if (
    typeof version !== 'number' ||
    !Number.isInteger(version) ||
    version <= supportedVersion
  ) {
    return null;
  }
  return {
    ok: false,
    status: 'unsupported-future',
    sourceVersion: version,
    raw,
    reason: `${label} requires a newer application.`,
    fieldPath: `${fieldPath}.version`,
  };
};

const readOrderedStringVersion = (
  value: unknown,
  prefix: string,
): number | null => {
  if (typeof value !== 'string') return null;
  const match = new RegExp(`^${prefix}(\\d+)$`).exec(value);
  if (match === null) return null;
  const version = Number(match[1]);
  return Number.isSafeInteger(version) && version >= 0 ? version : null;
};

const classifyHeatCapacityFreeStringAuthorityVersion = (
  value: unknown,
  supportedValue: string,
  prefix: string,
  fieldPath: string,
  label: string,
  raw: unknown,
  futureOnly: boolean,
): Extract<HeatCapacityFreeRestoreAggregateResult, { ok: false }> | null => {
  if (value === supportedValue) return null;
  const sourceVersion = readOrderedStringVersion(value, prefix);
  const supportedVersion = readOrderedStringVersion(supportedValue, prefix);
  if (
    sourceVersion !== null &&
    supportedVersion !== null &&
    sourceVersion > supportedVersion
  ) {
    return {
      ok: false,
      status: 'unsupported-future',
      sourceVersion,
      raw,
      reason: `${label} requires a newer application.`,
      fieldPath,
    };
  }
  if (futureOnly) return null;
  return {
    ok: false,
    status: 'quarantined',
    sourceVersion: value,
    raw,
    reason: `${label} is unsupported.`,
    fieldPath,
  };
};

export const isAllowedHeatCapacityFreeDomainAggregateMigration = (
  source: unknown,
  normalized: HeatCapacityFreeExperimentDomainState,
) => {
  if (!isHeatCapacityRestoreRecord(source)) return false;
  try {
    const candidate = cloneHeatCapacityPersistenceValue(source);
    const normalizedRecord = normalized as unknown as Record<string, unknown>;
    const normalizedBatch = normalizedRecord.batch;
    const normalizedTraceStore = normalizedRecord.traceStore;
    const normalizedTrials = normalizedRecord.trials;
    if (
      !isHeatCapacityRestoreRecord(normalizedBatch) ||
      !isHeatCapacityRestoreRecord(normalizedTraceStore) ||
      !Array.isArray(normalizedTrials) ||
      !normalizedTrials.every(isHeatCapacityRestoreRecord)
    ) {
      return false;
    }

    const sourceTrials = candidate.trials;
    if (
      !Array.isArray(sourceTrials) ||
      sourceTrials.length !== normalizedTrials.length ||
      !sourceTrials.every(isHeatCapacityRestoreRecord)
    ) {
      return false;
    }
    const migratedTrials = sourceTrials.map((trial, index) => {
      const normalizedTrial = normalizedTrials[index]!;
      if (trial.id !== normalizedTrial.id) return null;
      return {
        ...trial,
        batchMembership: cloneHeatCapacityPersistenceValue(
          normalizedTrial.batchMembership,
        ),
        correctedSignals: cloneHeatCapacityPersistenceValue(
          normalizedTrial.correctedSignals,
        ),
      };
    });
    if (migratedTrials.some((trial) => trial === null)) return false;
    candidate.trials = migratedTrials;

    const sourceBatch = candidate.batch;
    if (sourceBatch === undefined || sourceBatch === null) {
      if (sourceTrials.length !== 0) return false;
      candidate.batch = cloneHeatCapacityPersistenceValue(normalizedBatch);
    } else {
      if (!isHeatCapacityRestoreRecord(sourceBatch)) return false;
      if (
        sourceBatch.version !== HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION &&
        sourceBatch.version !== HEAT_CAPACITY_FREE_BATCH_VERSION
      ) {
        return false;
      }
      candidate.batch = {
        ...sourceBatch,
        version: normalizedBatch.version,
        nextTrialSequence: normalizedBatch.nextTrialSequence,
        scoringVersion: normalizedBatch.scoringVersion,
      };
    }

    const sourceTraceStore = candidate.traceStore;
    if (sourceTraceStore === undefined || sourceTraceStore === null) {
      if (
        normalizedTraceStore.activeTraceTrialId !== null ||
        normalizedTraceStore.nextTraceTrialIndex !== 1 ||
        !Array.isArray(normalizedTraceStore.traceTrials) ||
        normalizedTraceStore.traceTrials.length !== 0
      ) {
        return false;
      }
      candidate.traceStore =
        cloneHeatCapacityPersistenceValue(normalizedTraceStore);
    } else {
      if (!isHeatCapacityRestoreRecord(sourceTraceStore)) return false;
      const normalizedSourceTrace =
        normalizeHeatCapacityFreeRestoreTraceStoreResult(sourceTraceStore);
      if (
        normalizedSourceTrace.ok === false ||
        !areHeatCapacityPersistenceValuesEqual(
          normalizedSourceTrace.value,
          normalizedTraceStore,
        )
      ) {
        return false;
      }
      candidate.traceStore =
        cloneHeatCapacityPersistenceValue(normalizedTraceStore);
    }

    return areHeatCapacityPersistenceValuesEqual(
      candidate,
      normalizedRecord,
    );
  } catch {
    return false;
  }
};

export const isAllowedHeatCapacityFreeDomainAggregateCacheRepair = (
  source: unknown,
  normalized: HeatCapacityFreeExperimentDomainState,
) => {
  if (!isHeatCapacityRestoreRecord(source)) return false;
  try {
    const candidate = cloneHeatCapacityPersistenceValue(source);
    const normalizedRecord = normalized as unknown as Record<string, unknown>;
    const sourceTrials = candidate.trials;
    const normalizedTrials = normalizedRecord.trials;
    if (
      !Array.isArray(sourceTrials) ||
      !Array.isArray(normalizedTrials) ||
      sourceTrials.length !== normalizedTrials.length ||
      !sourceTrials.every(isHeatCapacityRestoreRecord) ||
      !normalizedTrials.every(isHeatCapacityRestoreRecord)
    ) {
      return false;
    }
    candidate.trials = sourceTrials.map((trial, index) => {
      const normalizedTrial = normalizedTrials[index]!;
      if (trial.id !== normalizedTrial.id) return null;
      return {
        ...trial,
        correctedSignals: cloneHeatCapacityPersistenceValue(
          normalizedTrial.correctedSignals,
        ),
      };
    });
    if ((candidate.trials as unknown[]).some((trial) => trial === null)) {
      return false;
    }
    return areHeatCapacityPersistenceValuesEqual(candidate, normalizedRecord);
  } catch {
    return false;
  }
};

export class HeatCapacityFreeRestoreAggregateError extends Error {
  readonly result: Extract<HeatCapacityFreeRestoreAggregateResult, { ok: false }>;

  constructor(
    result: Extract<HeatCapacityFreeRestoreAggregateResult, { ok: false }>,
  ) {
    super(result.reason);
    this.name = 'HeatCapacityFreeRestoreAggregateError';
    this.result = result;
  }
}

export const validateHeatCapacityFreeRestoreTrialTraceRelationships = (
  trials: readonly HeatCapacityFreeTrial[],
  traceStore: HeatCapacityFreeTraceStore,
): string | null => {
  const trialById = new Map(trials.map((trial) => [trial.id, trial]));
  const traceTrialById = new Map(
    traceStore.traceTrials.map((traceTrial) => [traceTrial.id, traceTrial]),
  );
  for (const traceTrial of traceStore.traceTrials) {
    if (
      traceTrial.linkedTrialId !== null &&
      (
        !trialById.has(traceTrial.linkedTrialId) ||
        trialById.get(traceTrial.linkedTrialId)?.traceTrialId !== traceTrial.id
      )
    ) {
      return `Free trace trial ${traceTrial.id} has an invalid linked trial reference.`;
    }
  }
  for (const trial of trials) {
    const traceTrial = trial.traceTrialId === null
      ? null
      : traceTrialById.get(trial.traceTrialId) ?? null;
    if (
      trial.traceTrialId !== null &&
      (
        traceTrial === null ||
        (
          traceTrial.linkedTrialId !== null &&
          traceTrial.linkedTrialId !== trial.id
        )
      )
    ) {
      return `Free trial ${trial.id} has an invalid trace trial reference.`;
    }
    for (const record of [trial.u0, trial.u1, trial.u2]) {
      if (record === null) continue;
      const referenceValues = [
        record.traceTrialId,
        record.traceBranchId,
        record.traceSampleId,
        record.eventId,
      ];
      const hasReference = referenceValues.some((reference) => reference !== null);
      if (!hasReference) continue;
      if (
        traceTrial === null ||
        record.traceTrialId !== traceTrial.id ||
        referenceValues.some((reference) => typeof reference !== 'string')
      ) {
        return `Free trial ${trial.id} has a partial or mismatched trace record reference.`;
      }
      const branch = traceTrial.branches.find(
        (candidate) => candidate.id === record.traceBranchId,
      );
      const sample = branch?.samples.find(
        (candidate) => candidate.id === record.traceSampleId,
      );
      const event = branch?.events.find(
        (candidate) => candidate.id === record.eventId,
      );
      if (
        branch === undefined ||
        sample === undefined ||
        event === undefined ||
        event.traceSampleId !== sample.id
      ) {
        return `Free trial ${trial.id} references a missing trace branch, sample, or event.`;
      }
    }
  }
  return null;
};

export const normalizeHeatCapacityFreeRestoreExperimentDomainResult = (
  value: unknown,
  scheme: HeatCapacityFreeParameterScheme,
  gasType: HeatCapacityFreeGasType,
  fallback: HeatCapacityFreeExperimentDomainState,
): HeatCapacityFreeRestoreAggregateResult => {
  const domain = isHeatCapacityRestoreRecord(value)
    ? value as unknown as Partial<HeatCapacityFreeExperimentDomainState>
    : {};
  const batchRecord = isHeatCapacityRestoreRecord(domain.batch)
    ? domain.batch
    : null;
  if (
    batchRecord !== null &&
    typeof batchRecord.version === 'number' &&
    Number.isInteger(batchRecord.version) &&
    batchRecord.version > HEAT_CAPACITY_FREE_BATCH_VERSION
  ) {
    return {
      ok: false,
      status: 'unsupported-future',
      sourceVersion: batchRecord.version,
      raw: value,
      reason:
        `Unsupported future Free batch version: ${batchRecord.version}.`,
      fieldPath: 'batch.version',
    };
  }
  const versionedAuthorities: Array<readonly [
    unknown,
    number,
    string,
    string,
  ]> = [];
  const configSnapshotAuthorities: Array<readonly [
    unknown,
    string,
    string,
  ]> = [];
  const standardReferenceAuthorities: Array<readonly [
    Record<string, unknown>,
    string,
  ]> = [];
  const addConfigSnapshotAuthority = (
    authority: unknown,
    fieldPath: string,
    label: string,
  ) => {
    versionedAuthorities.push([
      authority,
      HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
      fieldPath,
      label,
    ]);
    configSnapshotAuthorities.push([authority, fieldPath, label]);
  };
  if (batchRecord !== null) {
    addConfigSnapshotAuthority(
      batchRecord.frozenConfigSnapshot,
      'batch.frozenConfigSnapshot',
      'Free batch frozen configuration snapshot',
    );
    versionedAuthorities.push([
      batchRecord.calculationSession,
      HEAT_CAPACITY_CALCULATION_WORKFLOW_VERSION,
      'batch.calculationSession',
      'Free calculation workflow session',
    ]);
  }
  addConfigSnapshotAuthority(
    domain.activeRunConfigSnapshot,
    'activeRunConfigSnapshot',
    'Free active-run configuration snapshot',
  );
  const sourceTrialRecords = Array.isArray(domain.trials)
    ? domain.trials
    : [];
  sourceTrialRecords.forEach((trial, index) => {
    if (!isHeatCapacityRestoreRecord(trial)) return;
    versionedAuthorities.push([
      trial.batchMembership,
      HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION,
      `trials[${index}].batchMembership`,
      'Free trial batch membership',
    ]);
    addConfigSnapshotAuthority(
      trial.configSnapshot,
      `trials[${index}].configSnapshot`,
      'Free trial configuration snapshot',
    );
    const standardReference = isHeatCapacityRestoreRecord(
      trial.standardReferenceSnapshot,
    )
      ? trial.standardReferenceSnapshot
      : null;
    if (standardReference !== null) {
      standardReferenceAuthorities.push([
        standardReference,
        `trials[${index}].standardReferenceSnapshot`,
      ]);
      addConfigSnapshotAuthority(
        standardReference.configSnapshot,
        `trials[${index}].standardReferenceSnapshot.configSnapshot`,
        'Free standard-reference configuration snapshot',
      );
    }
  });
  const traceStoreRecord = isHeatCapacityRestoreRecord(domain.traceStore)
    ? domain.traceStore
    : null;
  const sourceTraceTrials = traceStoreRecord &&
    Array.isArray(traceStoreRecord.traceTrials)
    ? traceStoreRecord.traceTrials
    : [];
  sourceTraceTrials.forEach((traceTrial, index) => {
    if (!isHeatCapacityRestoreRecord(traceTrial)) return;
    addConfigSnapshotAuthority(
      traceTrial.configSnapshot,
      `traceStore.traceTrials[${index}].configSnapshot`,
      'Free trace-trial configuration snapshot',
    );
  });
  for (const [
    authority,
    supportedVersion,
    fieldPath,
    label,
  ] of versionedAuthorities) {
    const futureFailure = classifyHeatCapacityFreeFutureAuthorityVersion(
      authority,
      supportedVersion,
      fieldPath,
      label,
      value,
    );
    if (futureFailure !== null) return futureFailure;
  }
  for (const [authority, fieldPath, label] of configSnapshotAuthorities) {
    if (!isHeatCapacityRestoreRecord(authority)) continue;
    const scoring = isHeatCapacityRestoreRecord(authority.scoring)
      ? authority.scoring
      : null;
    if (scoring === null) continue;
    const futureFailure = classifyHeatCapacityFreeStringAuthorityVersion(
      scoring.processScoringVersion,
      HEAT_CAPACITY_PROCESS_SCORING_VERSION,
      'free-process-score-v',
      `${fieldPath}.scoring.processScoringVersion`,
      `${label} process-scoring version`,
      value,
      true,
    );
    if (futureFailure !== null) return futureFailure;
  }
  for (const [authority, fieldPath] of standardReferenceAuthorities) {
    const futureFailure = classifyHeatCapacityFreeStringAuthorityVersion(
      authority.generatorVersion,
      HEAT_CAPACITY_STANDARD_REFERENCE_GENERATOR_VERSION,
      'free-standard-reference-v',
      `${fieldPath}.generatorVersion`,
      'Free standard-reference generator version',
      value,
      true,
    );
    if (futureFailure !== null) return futureFailure;
  }
  for (let index = 0; index < sourceTrialRecords.length; index += 1) {
    const trial = sourceTrialRecords[index];
    if (!isHeatCapacityRestoreRecord(trial)) continue;
    const correctedSignals = trial.correctedSignals;
    if (correctedSignals === undefined || correctedSignals === null) continue;
    if (
      !isHeatCapacityRestoreRecord(correctedSignals) ||
      (
        (
          !hasExactHeatCapacityFreeCorrectedSignalKeys(correctedSignals) ||
          readOrderedStringVersion(
            correctedSignals.calculationVersion,
            'log-pressure-v',
          ) === null
        ) &&
        !isRepairableLegacyHeatCapacityFreeCorrectedSignals(
          correctedSignals,
        )
      )
    ) {
      return {
        ok: false,
        status: 'quarantined',
        sourceVersion: isHeatCapacityRestoreRecord(correctedSignals)
          ? correctedSignals.calculationVersion
          : null,
        raw: value,
        reason: 'Free corrected-signal cache shape is invalid.',
        fieldPath: `trials[${index}].correctedSignals`,
      };
    }
  }
  for (const [
    authority,
    supportedVersion,
    fieldPath,
    label,
  ] of versionedAuthorities) {
    const versionFailure = classifyHeatCapacityFreeAuthorityVersion(
      authority,
      supportedVersion,
      fieldPath,
      label,
      value,
    );
    if (versionFailure !== null) return versionFailure;
  }
  for (const [authority, fieldPath, label] of configSnapshotAuthorities) {
    if (!isHeatCapacityRestoreRecord(authority)) continue;
    const scoring = isHeatCapacityRestoreRecord(authority.scoring)
      ? authority.scoring
      : null;
    if (scoring === null) continue;
    const versionFailure = classifyHeatCapacityFreeStringAuthorityVersion(
      scoring.processScoringVersion,
      HEAT_CAPACITY_PROCESS_SCORING_VERSION,
      'free-process-score-v',
      `${fieldPath}.scoring.processScoringVersion`,
      `${label} process-scoring version`,
      value,
      false,
    );
    if (versionFailure !== null) return versionFailure;
  }
  for (const [authority, fieldPath] of standardReferenceAuthorities) {
    const versionFailure = classifyHeatCapacityFreeStringAuthorityVersion(
      authority.generatorVersion,
      HEAT_CAPACITY_STANDARD_REFERENCE_GENERATOR_VERSION,
      'free-standard-reference-v',
      `${fieldPath}.generatorVersion`,
      'Free standard-reference generator version',
      value,
      false,
    );
    if (versionFailure !== null) return versionFailure;
  }
  const batchDispatch = dispatchHeatCapacityFreeBatchVersion(
    domain.batch,
  );
  if (batchDispatch.kind === 'unsupported-future') {
    return {
      ok: false,
      status: 'unsupported-future',
      sourceVersion: batchDispatch.version,
      raw: value,
      reason:
        `Unsupported future Free batch version: ${batchDispatch.version}.`,
      fieldPath: 'batch.version',
    };
  }
  if (batchDispatch.kind === 'invalid') {
    return {
      ok: false,
      status: 'quarantined',
      sourceVersion: batchDispatch.version,
      raw: value,
      reason: 'Free batch shape or relationships are invalid.',
      fieldPath: 'batch',
    };
  }
  const physicsConfig = isHeatCapacityRestoreRecord(domain.physicsConfig)
    ? normalizeHeatCapacityFreePhysicsConfig(domain.physicsConfig)
    : fallback.physicsConfig;
  const sensorConfig = isHeatCapacityRestoreRecord(domain.sensorConfig)
    ? normalizeHeatCapacityFreeSensorConfig(domain.sensorConfig)
    : fallback.sensorConfig;
  const recordConfig = normalizeHeatCapacityFreeRestoreRecordConfig(
    domain.recordConfig,
    fallback.recordConfig,
  );
  const pressureWarningMv = heatCapacityRestoreFiniteOrDefault(
    domain.pressureWarningMv,
    fallback.pressureWarningMv,
  );
  const fallbackConfigSnapshot = createHeatCapacityFreeConfigSnapshotFromRuntimeConfigs({
    environmentConfig: physicsConfig.environment,
    physicsConfig,
    sensorConfig,
    recordConfig,
    pressureWarningMv,
  });
  const physicsState = normalizeHeatCapacityFreeRestorePhysicsState(
    domain.physicsState,
    fallback.physicsState,
  );
  const sourceTrials = Array.isArray(domain.trials)
    ? domain.trials
    : fallback.trials;
  for (const sourceTrial of sourceTrials) {
    if (!isHeatCapacityRestoreRecord(sourceTrial)) continue;
    const membership = sourceTrial.batchMembership;
    if (membership === undefined || membership === null) continue;
    if (
      isHeatCapacityRestoreRecord(membership) &&
      Number.isInteger(membership.version) &&
      (membership.version as number) >
        HEAT_CAPACITY_FREE_TRIAL_BATCH_MEMBERSHIP_VERSION
    ) {
      return {
        ok: false,
        status: 'unsupported-future',
        sourceVersion: membership.version,
        raw: value,
        reason:
          'Free trial batch membership requires a newer application.',
      };
    }
    if (!isCanonicalHeatCapacityFreeRestoreBatchMembership(membership)) {
      return {
        ok: false,
        status: 'quarantined',
        sourceVersion: isHeatCapacityRestoreRecord(domain.batch)
          ? domain.batch.version
          : null,
        raw: value,
        reason: 'Free trial batch membership is invalid.',
      };
    }
  }
  const normalizedTrialResults = sourceTrials.map((trial) => (
    normalizeHeatCapacityFreeRestoreTrial(trial, fallbackConfigSnapshot)
  ));
  if (normalizedTrialResults.some((trial) => trial === null)) {
    return {
      ok: false,
      status: 'quarantined',
      sourceVersion: isHeatCapacityRestoreRecord(domain.batch)
        ? domain.batch.version
        : null,
      raw: value,
      reason: 'Free batch contains an invalid authoritative trial record.',
    };
  }
  const traceStoreResult = normalizeHeatCapacityFreeRestoreTraceStoreResult(
    domain.traceStore,
  );
  if (traceStoreResult.ok === false) {
    return {
      ok: false,
      status: 'quarantined',
      sourceVersion: isHeatCapacityRestoreRecord(domain.batch)
        ? domain.batch.version
        : null,
      raw: value,
      reason: traceStoreResult.reason,
    };
  }
  const traceStore = traceStoreResult.value;
  const normalizedActiveAttempt = normalizeHeatCapacityFreeAttempt(
    domain.activeAttempt,
  );
  if (
    domain.activeAttempt !== undefined &&
    domain.activeAttempt !== null &&
    (
      normalizedActiveAttempt === null ||
      !areHeatCapacityPersistenceValuesEqual(
        domain.activeAttempt,
        normalizedActiveAttempt,
      )
    )
  ) {
    return {
      ok: false,
      status: 'quarantined',
      sourceVersion: batchDispatch.kind === 'missing'
        ? null
        : batchDispatch.value.version,
      raw: value,
      reason: 'Free active attempt authority is invalid or non-canonical.',
    };
  }
  const batchIsMissingOrUnstarted = batchDispatch.kind === 'missing' || (
    (
      batchDispatch.kind === 'v1' ||
      batchDispatch.kind === 'v2'
    ) &&
    batchDispatch.value.startedAtMs === null
  );
  if (
    batchIsMissingOrUnstarted &&
    (
      traceStore.activeTraceTrialId !== null ||
      traceStore.traceTrials.length > 0 ||
      (domain.activeAttempt !== undefined && domain.activeAttempt !== null)
    )
  ) {
    return {
      ok: false,
      status: 'quarantined',
      sourceVersion: batchDispatch.kind === 'missing'
        ? null
        : batchDispatch.value.version,
      raw: value,
      reason:
        'A missing or unstarted Free batch cannot own trace authority or an active attempt.',
    };
  }
  const trials = normalizedTrialResults as HeatCapacityFreeTrial[];
  const aggregatePlan = planHeatCapacityFreeBatchAggregateMigration({
    batch: domain.batch,
    trials,
    traceNextTrialIndex: traceStore.nextTraceTrialIndex,
  });
  if (aggregatePlan.ok === false) {
    return {
      ok: false,
      status: aggregatePlan.status === 'unsupported-future'
        ? 'unsupported-future'
        : 'quarantined',
      sourceVersion: aggregatePlan.sourceVersion,
      raw: value,
      reason: aggregatePlan.reason,
    };
  }
  if (aggregatePlan.status === 'relationship-repair-required') {
    return {
      ok: false,
      status: 'quarantined',
      sourceVersion: aggregatePlan.sourceVersion,
      raw: value,
      reason:
        'Free batch relationship repair requires an atomic rewrite of trials, trace, calculation, and attempt references.',
    };
  }
  if (aggregatePlan.sourceVersion === 1) {
    for (
      let trialIndex = 0;
      trialIndex < sourceTrials.length;
      trialIndex += 1
    ) {
      const sourceTrial = sourceTrials[trialIndex];
      if (!isHeatCapacityRestoreRecord(sourceTrial)) continue;
      const sourceMembership = sourceTrial.batchMembership;
      if (sourceMembership === undefined || sourceMembership === null) {
        continue;
      }
      const assignment = aggregatePlan.assignments[trialIndex];
      if (
        assignment === undefined ||
        !isCanonicalHeatCapacityFreeRestoreBatchMembership(
          sourceMembership,
          assignment.batchMembership,
        )
      ) {
        return {
          ok: false,
          status: 'quarantined',
          sourceVersion: aggregatePlan.sourceVersion,
          raw: value,
          reason:
            'Legacy Free trial batch membership conflicts with its deterministic migration assignment.',
        };
      }
    }
  }
  const migratedTrials = trials.map((trial, trialIndex) => {
    const assignment = aggregatePlan.assignments[trialIndex];
    return assignment
      ? {
          ...trial,
          id: assignment.id,
          batchMembership: { ...assignment.batchMembership },
        }
      : trial;
  });
  const traceRelationshipError =
    validateHeatCapacityFreeRestoreTrialTraceRelationships(
      migratedTrials,
      traceStore,
    );
  if (traceRelationshipError !== null) {
    return {
      ok: false,
      status: 'quarantined',
      sourceVersion: aggregatePlan.sourceVersion,
      raw: value,
      reason: traceRelationshipError,
    };
  }
  const normalizedBatchBase = aggregatePlan.batch;
  const completedTrials = trials
    .filter((trial) => (
      trial.completedAtMs !== null &&
      trial.u1 !== null &&
      trial.u2 !== null &&
      trial.correctedSignals !== null
    ));
  const normalizedBatchSnapshot = normalizeHeatCapacityFreeRestoreConfigSnapshot(
    normalizedBatchBase.frozenConfigSnapshot,
  );
  if (
    normalizedBatchBase.startedAtMs !== null &&
    normalizedBatchSnapshot === null
  ) {
    return {
      ok: false,
      status: 'quarantined',
      sourceVersion: aggregatePlan.sourceVersion,
      raw: value,
      reason: 'A started Free batch has an invalid frozen configuration snapshot.',
    };
  }
  const calculationGroups = normalizedBatchSnapshot === null
    ? []
    : completedTrials.flatMap((trial) => {
        const reference = calculateHeatCapacityFreeCalculationReference(
          trial,
          normalizedBatchSnapshot,
        );
        return reference === null ? [] : [{ trialId: trial.id, reference }];
      });
  const normalizedCalculationSession = (
    normalizedBatchBase.experimentCompletedAtMs !== null &&
    normalizedBatchBase.targetGroupCount === completedTrials.length &&
    calculationGroups.length === completedTrials.length &&
    normalizedBatchSnapshot !== null
  )
    ? normalizeHeatCapacityCalculationWorkflowSessionForTrials(
        normalizedBatchBase.calculationSession,
        {
          mode: 'free',
          groups: calculationGroups,
          theoreticalGamma: normalizedBatchSnapshot.physics.gamma,
          presentation: 'interactive',
        },
      )
    : null;
  const normalizedBatch = normalizedBatchBase.startedAtMs !== null &&
    normalizedBatchSnapshot === null
    ? normalizedBatchBase
    : {
        ...normalizedBatchBase,
        frozenConfigSnapshot: normalizedBatchSnapshot,
        calculationSession: normalizedCalculationSession,
      };
  const normalizedDomain = normalizeHeatCapacityFreeExperimentDomainBoundary({
    ...fallback,
    scheme,
    gasType: scheme === 'ideal' ? 'air' : normalizeHeatCapacityFreeGasType(domain.gasType, gasType),
    batch: normalizedBatch,
    experimentGroupStatus: normalizeHeatCapacityFreeRestoreExperimentGroupStatus(
      domain.experimentGroupStatus,
    ),
    activeRunConfigSnapshot: normalizeHeatCapacityFreeRestoreConfigSnapshot(
      domain.activeRunConfigSnapshot,
    ),
    recordConfig,
    pressureWarningMv,
    instrumentNoiseEnabled: typeof domain.instrumentNoiseEnabled === 'boolean'
      ? domain.instrumentNoiseEnabled
      : fallback.instrumentNoiseEnabled,
    environmentConfig: { ...physicsConfig.environment },
    physicsConfig,
    physicsState,
    sensorConfig,
    sensorState: normalizeHeatCapacityFreeRestoreSensorState(domain.sensorState, fallback.sensorState),
    calibrationState: normalizeHeatCapacityFreeRestoreCalibrationState(domain.calibrationState, fallback.calibrationState),
    rollbackSnapshots: normalizeHeatCapacityFreeRestoreRollbackSnapshots(domain.rollbackSnapshots, fallback),
    traceStore,
    trials: migratedTrials,
    activeAttempt: normalizedActiveAttempt,
    releaseState: normalizeHeatCapacityReleaseState(
      domain.releaseState,
      createClosedHeatCapacityReleaseState(physicsState.simulationTimeS),
    ),
  } as HeatCapacityFreeExperimentDomainState, scheme, gasType);
  const correctedSignalCacheRepaired = sourceTrials.some(
    (sourceTrial, index) => (
      isHeatCapacityRestoreRecord(sourceTrial) &&
      normalizedDomain.trials[index] !== undefined &&
      !areHeatCapacityPersistenceValuesEqual(
        sourceTrial.correctedSignals,
        normalizedDomain.trials[index]!.correctedSignals,
      )
    ),
  );
  return {
    ok: true,
    status: aggregatePlan.status === 'migrated' ||
      traceStoreResult.status === 'migrated'
      ? 'migrated'
      : correctedSignalCacheRepaired
        ? 'repaired-cache'
      : 'exact',
    sourceVersion: aggregatePlan.sourceVersion,
    value: normalizedDomain,
  };
};

export const decodeHeatCapacityFreeExperimentDomainAggregate =
  normalizeHeatCapacityFreeRestoreExperimentDomainResult;

export const normalizeHeatCapacityFreeRestoreExperimentDomain = (
  value: unknown,
  scheme: HeatCapacityFreeParameterScheme,
  gasType: HeatCapacityFreeGasType,
  fallback: HeatCapacityFreeExperimentDomainState,
): HeatCapacityFreeExperimentDomainState => {
  const result = normalizeHeatCapacityFreeRestoreExperimentDomainResult(
    value,
    scheme,
    gasType,
    fallback,
  );
  if (result.ok === false) {
    throw new HeatCapacityFreeRestoreAggregateError(result);
  }
  return result.value;
};
