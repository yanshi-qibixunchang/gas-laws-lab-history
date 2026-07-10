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
  createDefaultFreeConfigSnapshot,
  createDefaultFreeTraceStore,
  HEAT_CAPACITY_FREE_CALCULATION_VERSION,
  HEAT_CAPACITY_FREE_CONFIG_SNAPSHOT_VERSION,
  type HeatCapacityFreeConfigSnapshot,
  type HeatCapacityFreeTraceBranch,
  type HeatCapacityFreeTraceStore,
  type HeatCapacityFreeTraceTrial,
} from '../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import type {
  HeatCapacityFreeExperimentGroupStatus,
  HeatCapacityFreeGasType,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import type {
  HeatCapacityFreeRecordConfig,
} from '../../domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import {
  normalizeHeatCapacityFreeRecordInput,
  type HeatCapacityFreeRecordInput,
  type HeatCapacityFreeTrial,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  normalizeHeatCapacityFreeStandardReferenceSnapshot,
} from '../../domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts';
import {
  hasHeatCapacityFreeIdealThermalBoundaryContamination,
  type HeatCapacityFreeDisplayScheme,
  type HeatCapacityFreeExperimentDomainState,
  type HeatCapacityFreeParameterScheme,
  normalizeHeatCapacityFreeExperimentDomainBoundary,
} from './workbenchState.ts';
import { normalizeHeatCapacityFreePhysicsConfig } from './workbenchHeatCapacityFreeRuntimeConfig.ts';

export const HEAT_CAPACITY_PROCESS_SCORING_VERSION = 'free-process-score-v1' as const;

export const isHeatCapacityRestoreRecord = (
  value: unknown,
): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
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
      pumpPressureLimitKPa: heatCapacityRestoreFiniteOrDefault(
        physics.pumpPressureLimitKPa,
        fallback.physics.pumpPressureLimitKPa,
      ),
      pumpStrokeDurationS: heatCapacityRestoreFiniteOrDefault(
        physics.pumpStrokeDurationS,
        fallback.physics.pumpStrokeDurationS,
      ),
      recommendedPumpIntervalS: heatCapacityRestoreFiniteOrDefault(
        physics.recommendedPumpIntervalS,
        fallback.physics.recommendedPumpIntervalS,
      ),
      stopcockFlowRate: heatCapacityRestoreFiniteOrDefault(
        physics.stopcockFlowRate,
        fallback.physics.stopcockFlowRate,
      ),
      releaseVisualResponseDelayS: heatCapacityRestoreFiniteOrDefault(
        physics.releaseVisualResponseDelayS,
        fallback.physics.releaseVisualResponseDelayS,
      ),
      releaseVisualMainDurationS: heatCapacityRestoreFiniteOrDefault(
        physics.releaseVisualMainDurationS,
        fallback.physics.releaseVisualMainDurationS,
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
      temperatureMvAtAmbient: heatCapacityRestoreFiniteOrDefault(
        sensor.temperatureMvAtAmbient,
        fallback.sensor.temperatureMvAtAmbient,
      ),
      temperatureMvPerK: heatCapacityRestoreFiniteOrDefault(
        sensor.temperatureMvPerK,
        fallback.sensor.temperatureMvPerK,
      ),
      lagRate: heatCapacityRestoreFiniteOrDefault(sensor.lagRate, fallback.sensor.lagRate),
      pumpLagRate: heatCapacityRestoreFiniteOrDefault(
        sensor.pumpLagRate,
        fallback.sensor.pumpLagRate,
      ),
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
): HeatCapacityFreeTrial['correctedSignals'] => {
  if (!isHeatCapacityRestoreRecord(value)) return null;
  const U0DisplayMv = heatCapacityRestoreNullableNumber(value.U0DisplayMv);
  const U1DisplayMv = heatCapacityRestoreNullableNumber(value.U1DisplayMv);
  const U2DisplayMv = heatCapacityRestoreNullableNumber(value.U2DisplayMv);
  const U1CorrectedMv = heatCapacityRestoreNullableNumber(value.U1CorrectedMv);
  const U2CorrectedMv = heatCapacityRestoreNullableNumber(value.U2CorrectedMv);
  const gamma = heatCapacityRestoreNullableNumber(value.gamma);
  if (
    U0DisplayMv === null ||
    U1DisplayMv === null ||
    U2DisplayMv === null ||
    U1CorrectedMv === null ||
    U2CorrectedMv === null ||
    gamma === null
  ) {
    return null;
  }
  return {
    calculationVersion: HEAT_CAPACITY_FREE_CALCULATION_VERSION,
    atmosphericPressureKPa: heatCapacityRestoreNullableNumber(value.atmosphericPressureKPa) ?? 101.3,
    pressureSensitivityMvPerKPa: heatCapacityRestoreNullableNumber(value.pressureSensitivityMvPerKPa) ?? 20,
    U0DisplayMv,
    U1DisplayMv,
    U2DisplayMv,
    U1CorrectedMv,
    U2CorrectedMv,
    gamma,
  };
};

export const normalizeHeatCapacityFreeRestoreTrial = (
  value: unknown,
): HeatCapacityFreeTrial | null => {
  if (!isHeatCapacityRestoreRecord(value) || typeof value.id !== 'string') return null;
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
    u0: normalizeHeatCapacityFreeRestoreRecord(value.u0),
    u1: normalizeHeatCapacityFreeRestoreRecord(value.u1),
    u2: normalizeHeatCapacityFreeRestoreRecord(value.u2),
    blockedReason: typeof value.blockedReason === 'string'
      ? value.blockedReason as HeatCapacityFreeTrial['blockedReason']
      : null,
    correctedSignals: isHeatCapacityRestoreRecord(value.u0)
      ? normalizeHeatCapacityFreeRestoreCorrectedSignals(value.correctedSignals)
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

const normalizeHeatCapacityFreeRestoreStopcockFlowPurpose = (
  value: unknown,
  stopcockOpen: boolean,
): HeatCapacityFreeExperimentDomainState['stopcockFlowPurpose'] => {
  if (!stopcockOpen) return 'none';
  return value === 'release' || value === 'zeroing' ? value : 'none';
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
  const stopcockFlowOpen = domain.stopcockFlowOpen === true;
  const stopcockPendingOpenAtMs = heatCapacityRestoreNullableNumber(domain.stopcockPendingOpenAtMs);
  const trials = Array.isArray(domain.trials)
    ? domain.trials
        .map(normalizeHeatCapacityFreeRestoreTrial)
        .filter((trial): trial is HeatCapacityFreeTrial => trial !== null)
    : fallback.trials;
  return normalizeHeatCapacityFreeExperimentDomainBoundary({
    ...fallback,
    ...domain,
    scheme,
    experimentGroupStatus: normalizeHeatCapacityFreeRestoreExperimentGroupStatus(
      domain.experimentGroupStatus,
    ),
    activeRunConfigSnapshot: normalizeHeatCapacityFreeRestoreConfigSnapshot(domain.activeRunConfigSnapshot),
    recordConfig: normalizeHeatCapacityFreeRestoreRecordConfig(domain.recordConfig, fallback.recordConfig),
    pressureWarningMv: heatCapacityRestoreFiniteOrDefault(domain.pressureWarningMv, fallback.pressureWarningMv),
    instrumentNoiseEnabled: typeof domain.instrumentNoiseEnabled === 'boolean'
      ? domain.instrumentNoiseEnabled
      : fallback.instrumentNoiseEnabled,
    physicsConfig: isHeatCapacityRestoreRecord(domain.physicsConfig)
      ? normalizeHeatCapacityFreePhysicsConfig(domain.physicsConfig)
      : fallback.physicsConfig,
    traceStore: normalizeHeatCapacityFreeRestoreTraceStore(domain.traceStore),
    trials,
    stopcockFlowOpen,
    stopcockPendingOpenAtMs,
    stopcockFlowPurpose: normalizeHeatCapacityFreeRestoreStopcockFlowPurpose(
      domain.stopcockFlowPurpose,
      stopcockFlowOpen || stopcockPendingOpenAtMs !== null,
    ),
  } as HeatCapacityFreeExperimentDomainState, scheme, gasType);
};
