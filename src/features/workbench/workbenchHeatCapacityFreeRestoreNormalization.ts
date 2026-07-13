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
  createDefaultFreeConfigSnapshot,
  createDefaultFreeTraceStore,
  HEAT_CAPACITY_FREE_CALCULATION_VERSION,
  HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
  type HeatCapacityFreeConfigSnapshot,
  type HeatCapacityFreeTraceBranch,
  type HeatCapacityFreeTraceStore,
  type HeatCapacityFreeTraceTrial,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
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
import {
  HEAT_CAPACITY_TEMPERATURE_SENSITIVITY_MV_PER_K,
} from '../../domain/heatCapacity/heatCapacitySensorMapping.ts';
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
  normalizeHeatCapacityFreeRecordInput,
  type HeatCapacityFreeRecordInput,
  type HeatCapacityFreeTrial,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  normalizeHeatCapacityFreeAttempt,
} from '../../domain/heatCapacity/heatCapacityFreeAttemptModel.ts';
import {
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

export const HEAT_CAPACITY_PROCESS_SCORING_VERSION = 'free-process-score-v3' as const;

export const isHeatCapacityRestoreRecord = (
  value: unknown,
): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

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
      // Old mode-local 2/4 mV/K values are historical metadata only and must
      // never re-enter the active shared instrument calibration.
      temperatureMvAtAmbient: fallback.sensor.temperatureMvAtAmbient,
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

const normalizeHeatCapacityFreeRestoreCorrectedSignals = (
  value: unknown,
  hasRecordedU0: boolean,
): HeatCapacityFreeTrial['correctedSignals'] => {
  if (!isHeatCapacityRestoreRecord(value)) return null;
  const U0DisplayMv = heatCapacityRestoreNullableNumber(value.U0DisplayMv);
  const U1DisplayMv = heatCapacityRestoreNullableNumber(value.U1DisplayMv);
  const U2DisplayMv = heatCapacityRestoreNullableNumber(value.U2DisplayMv);
  const U1CorrectedMv = heatCapacityRestoreNullableNumber(value.U1CorrectedMv);
  const U2CorrectedMv = heatCapacityRestoreNullableNumber(value.U2CorrectedMv);
  const persistedFormulaGamma = heatCapacityRestoreNullableNumber(value.formulaGamma);
  const preheatBiasGamma = heatCapacityRestoreNullableNumber(value.preheatBiasGamma);
  const persistedGamma = heatCapacityRestoreNullableNumber(value.gamma);
  if (
    U0DisplayMv === null ||
    U1DisplayMv === null ||
    U2DisplayMv === null ||
    U1CorrectedMv === null ||
    U2CorrectedMv === null
  ) {
    return null;
  }
  const atmosphericPressureKPa = heatCapacityRestoreNullableNumber(value.atmosphericPressureKPa) ?? 101.3;
  const pressureSensitivityMvPerKPa = heatCapacityRestoreNullableNumber(value.pressureSensitivityMvPerKPa) ?? 20;
  if (hasRecordedU0) {
    const normalizedPreheatBiasGamma = preheatBiasGamma ?? 0;
    const formulaGamma = persistedFormulaGamma
      ?? (persistedGamma === null ? null : Number((persistedGamma - normalizedPreheatBiasGamma).toFixed(6)));
    if (formulaGamma === null) return null;
    return {
      calculationVersion: HEAT_CAPACITY_FREE_CALCULATION_VERSION,
      atmosphericPressureKPa,
      pressureSensitivityMvPerKPa,
      U0DisplayMv,
      U1DisplayMv,
      U2DisplayMv,
      U1CorrectedMv,
      U2CorrectedMv,
      u0Source: 'recorded',
      formulaGamma,
      preheatBiasGamma: normalizedPreheatBiasGamma,
      gamma: persistedGamma ?? Number((formulaGamma + normalizedPreheatBiasGamma).toFixed(6)),
    };
  }
  const effectiveU0DisplayMv = hasRecordedU0 ? U0DisplayMv : 0;
  const corrected = getFreeCorrectedSignals({
    U0DisplayMv: effectiveU0DisplayMv,
    U1DisplayMv,
    U2DisplayMv,
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
    U1DisplayMv,
    U2DisplayMv,
    U1CorrectedMv: Number(corrected.U1CorrectedMv.toFixed(6)),
    U2CorrectedMv: Number(corrected.U2CorrectedMv.toFixed(6)),
    u0Source: hasRecordedU0 ? 'recorded' : 'assumed-zero',
    formulaGamma,
    preheatBiasGamma: normalizedPreheatBiasGamma,
    gamma: Number((formulaGamma + normalizedPreheatBiasGamma).toFixed(6)),
  };
};

export const normalizeHeatCapacityFreeRestoreTrial = (
  value: unknown,
): HeatCapacityFreeTrial | null => {
  if (!isHeatCapacityRestoreRecord(value) || typeof value.id !== 'string') return null;
  const u0 = normalizeHeatCapacityFreeRestoreRecord(value.u0);
  const standardReferenceSnapshot = normalizeHeatCapacityFreeStandardReferenceSnapshot(
    value.standardReferenceSnapshot,
  );
  return {
    id: value.id,
    source: 'free',
    parameterScheme: value.parameterScheme === 'ideal' ? 'ideal' : 'real',
    traceTrialId: typeof value.traceTrialId === 'string' ? value.traceTrialId : null,
    branchCount: heatCapacityRestoreNullableNumber(value.branchCount) ?? 0,
    automaticU0: isHeatCapacityRestoreRecord(value.automaticU0)
      ? value.automaticU0 as HeatCapacityFreeTrial['automaticU0']
      : null,
    preheatOutcome: value.preheatOutcome === 'omitted'
      ? 'omitted'
      : value.preheatOutcome === 'completed'
        ? 'completed'
        : null,
    u0,
    u1: normalizeHeatCapacityFreeRestoreRecord(value.u1),
    u2: normalizeHeatCapacityFreeRestoreRecord(value.u2),
    blockedReason: typeof value.blockedReason === 'string'
      ? value.blockedReason as HeatCapacityFreeTrial['blockedReason']
      : null,
    correctedSignals: isHeatCapacityRestoreRecord(value.u1) && isHeatCapacityRestoreRecord(value.u2)
      ? normalizeHeatCapacityFreeRestoreCorrectedSignals(value.correctedSignals, u0 !== null)
      : null,
    configSnapshot: normalizeHeatCapacityFreeRestoreConfigSnapshot(value.configSnapshot),
    standardReferenceSnapshot: standardReferenceSnapshot &&
      !hasHeatCapacityFreeIdealThermalBoundaryContamination(standardReferenceSnapshot.configSnapshot.physics)
      ? standardReferenceSnapshot
      : null,
    completedAtMs: heatCapacityRestoreNullableNumber(value.completedAtMs),
  };
};

export const normalizeHeatCapacityFreeRestoreTraceBranch = (
  value: unknown,
): HeatCapacityFreeTraceBranch | null => {
  if (!isHeatCapacityRestoreRecord(value) || typeof value.id !== 'string') return null;
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
  };
};

export const normalizeHeatCapacityFreeRestoreTraceStore = (
  value: unknown,
): HeatCapacityFreeTraceStore => {
  if (!isHeatCapacityRestoreRecord(value) || !Array.isArray(value.traceTrials)) {
    return createDefaultFreeTraceStore();
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
  if (incompatibleTrace) return createDefaultFreeTraceStore();
  const traceTrials = value.traceTrials
    .map(normalizeHeatCapacityFreeRestoreTraceTrial)
    .filter((trial): trial is HeatCapacityFreeTraceTrial => trial !== null);
  if (traceTrials.length === 0) return createDefaultFreeTraceStore();
  const activeTraceTrialId = typeof value.activeTraceTrialId === 'string' &&
    traceTrials.some((trial) => trial.id === value.activeTraceTrialId)
    ? value.activeTraceTrialId
    : null;
  return {
    activeTraceTrialId,
    nextTraceTrialIndex: heatCapacityRestoreNullableNumber(value.nextTraceTrialIndex) ??
      traceTrials.length + 1,
    traceTrials,
  };
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
    displayTemperatureMv: fallback.displayTemperatureMv +
      (sensorTemperatureK - (fallback.sensorTemperatureK ?? sensorTemperatureK)) *
        HEAT_CAPACITY_TEMPERATURE_SENSITIVITY_MV_PER_K,
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
  const zeroAdjusted = value.pressureZeroAdjusted === true || value.pressureZeroed === true;
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
    pressureZeroed: zeroAdjusted,
    pressureZeroAdjusted: zeroAdjusted,
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

export const normalizeHeatCapacityFreeRestoreExperimentDomain = (
  value: unknown,
  scheme: HeatCapacityFreeParameterScheme,
  gasType: HeatCapacityFreeGasType,
  fallback: HeatCapacityFreeExperimentDomainState,
): HeatCapacityFreeExperimentDomainState => {
  const domain = isHeatCapacityRestoreRecord(value)
    ? value as unknown as Partial<HeatCapacityFreeExperimentDomainState>
    : {};
  const physicsConfig = isHeatCapacityRestoreRecord(domain.physicsConfig)
    ? normalizeHeatCapacityFreePhysicsConfig(domain.physicsConfig)
    : fallback.physicsConfig;
  const sensorConfig = isHeatCapacityRestoreRecord(domain.sensorConfig)
    ? normalizeHeatCapacityFreeSensorConfig(domain.sensorConfig)
    : fallback.sensorConfig;
  const physicsState = normalizeHeatCapacityFreeRestorePhysicsState(
    domain.physicsState,
    fallback.physicsState,
  );
  const trials = Array.isArray(domain.trials)
    ? domain.trials
        .map(normalizeHeatCapacityFreeRestoreTrial)
        .filter((trial): trial is HeatCapacityFreeTrial => trial !== null)
    : fallback.trials;
  return normalizeHeatCapacityFreeExperimentDomainBoundary({
    ...fallback,
    scheme,
    gasType: scheme === 'ideal' ? 'air' : normalizeHeatCapacityFreeGasType(domain.gasType, gasType),
    experimentGroupStatus: normalizeHeatCapacityFreeRestoreExperimentGroupStatus(
      domain.experimentGroupStatus,
    ),
    activeRunConfigSnapshot: normalizeHeatCapacityFreeRestoreConfigSnapshot(domain.activeRunConfigSnapshot),
    recordConfig: normalizeHeatCapacityFreeRestoreRecordConfig(domain.recordConfig, fallback.recordConfig),
    pressureWarningMv: heatCapacityRestoreFiniteOrDefault(domain.pressureWarningMv, fallback.pressureWarningMv),
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
    traceStore: normalizeHeatCapacityFreeRestoreTraceStore(domain.traceStore),
    trials,
    activeAttempt: normalizeHeatCapacityFreeAttempt(domain.activeAttempt),
    releaseState: normalizeHeatCapacityReleaseState(
      domain.releaseState,
      createClosedHeatCapacityReleaseState(physicsState.simulationTimeS),
    ),
  } as HeatCapacityFreeExperimentDomainState, scheme, gasType);
};
