import {
  HEAT_CAPACITY_FREE_DEFAULT_EQUILIBRIUM_SPEED_MULTIPLIER,
  normalizeHeatCapacityFreeEquilibriumSpeedMultiplier,
  type WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier,
  type WorkbenchHeatCapacityState,
} from './workbenchState.ts';
import type { HeatCapacityGuidePersistenceDataV1 } from './workbenchHeatCapacityPersistenceContract.ts';
import {
  heatCapacityRestoreFiniteOrDefault,
} from './workbenchHeatCapacityFreeRestoreNormalization.ts';
import {
  clonePersistenceValue,
  isPersistenceFiniteNumber,
  isPersistenceRecord,
} from './workbenchPersistenceValue.ts';
import {
  migrateGuidePhysicsState,
} from '../../domain/heatCapacity/heatCapacityGuidePhysicsEngine.ts';

type RestoredHeatCapacityGuideFields = Pick<
  WorkbenchHeatCapacityState,
  | 'heatCapacityGuidePhysicsConfig'
  | 'heatCapacityGuidePhysicsState'
  | 'heatCapacityGuideTemperatureSensorState'
  | 'heatCapacityGuideWorkflow'
  | 'heatCapacityGuideTrial'
>;

const GUIDE_WORKFLOW_STEPS = new Set([
  'powerRequired',
  'openStopcockForZeroRequired',
  'zeroRequired',
  'recordU0Required',
  'closeStopcockBeforePumpRequired',
  'openPumpValveRequired',
  'pumpRequired',
  'closePumpValveRequired',
  'u1Waiting',
  'recordU1Required',
  'openStopcockForReleaseRequired',
  'closeStopcockAfterReleaseRequired',
  'u2Waiting',
  'recordU2Required',
  'closePowerRequired',
  'completed',
]);

export const normalizeHeatCapacityPersistenceEquilibriumSpeed = (
  value: unknown,
): WorkbenchHeatCapacityFreeEquilibriumSpeedMultiplier => (
  normalizeHeatCapacityFreeEquilibriumSpeedMultiplier(
    value ?? HEAT_CAPACITY_FREE_DEFAULT_EQUILIBRIUM_SPEED_MULTIPLIER,
  )
);

export const createHeatCapacityGuidePersistenceData = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityGuidePersistenceDataV1 | null => (
  file.heatCapacityMode === 'guide' || file.heatCapacityGuideTrial !== null
    ? {
        physicsConfig: clonePersistenceValue(file.heatCapacityGuidePhysicsConfig),
        physicsState: clonePersistenceValue(file.heatCapacityGuidePhysicsState),
        temperatureSensorState: clonePersistenceValue(file.heatCapacityGuideTemperatureSensorState),
        workflow: clonePersistenceValue(file.heatCapacityGuideWorkflow),
        trial: clonePersistenceValue(file.heatCapacityGuideTrial),
      }
    : null
);

const normalizeGuideWorkflow = (
  value: unknown,
  fallback: WorkbenchHeatCapacityState['heatCapacityGuideWorkflow'],
): WorkbenchHeatCapacityState['heatCapacityGuideWorkflow'] => {
  if (!isPersistenceRecord(value) || typeof value.step !== 'string' || !GUIDE_WORKFLOW_STEPS.has(value.step)) {
    return fallback;
  }
  return {
    ...fallback,
    ...value,
    step: value.step as WorkbenchHeatCapacityState['heatCapacityGuideWorkflow']['step'],
    speedMultiplier: normalizeHeatCapacityPersistenceEquilibriumSpeed(value.speedMultiplier),
    paused: value.paused === true,
    waitStartedAtS: isPersistenceFiniteNumber(value.waitStartedAtS) ? value.waitStartedAtS : null,
    waitStage: value.waitStage === 'u1' || value.waitStage === 'u2' ? value.waitStage : null,
    strongReminderActive: value.strongReminderActive === true,
    strongReminderTargetControlId: typeof value.strongReminderTargetControlId === 'string'
      ? value.strongReminderTargetControlId
      : null,
    releaseCloseResumeAtMs: isPersistenceFiniteNumber(value.releaseCloseResumeAtMs)
      ? value.releaseCloseResumeAtMs
      : null,
  };
};

const normalizeGuidePhysicsConfig = (
  value: unknown,
  fallback: WorkbenchHeatCapacityState['heatCapacityGuidePhysicsConfig'],
): WorkbenchHeatCapacityState['heatCapacityGuidePhysicsConfig'] => (
  isPersistenceRecord(value)
    ? {
        ...fallback,
        ...clonePersistenceValue(value),
        environment: isPersistenceRecord(value.environment)
          ? { ...fallback.environment, ...clonePersistenceValue(value.environment) }
          : fallback.environment,
        thermal: isPersistenceRecord(value.thermal)
          ? { ...fallback.thermal, ...clonePersistenceValue(value.thermal) }
          : fallback.thermal,
      } as WorkbenchHeatCapacityState['heatCapacityGuidePhysicsConfig']
    : fallback
);

const normalizeGuidePhysicsState = (
  value: unknown,
  fallback: WorkbenchHeatCapacityState['heatCapacityGuidePhysicsState'],
  config: WorkbenchHeatCapacityState['heatCapacityGuidePhysicsConfig'],
): WorkbenchHeatCapacityState['heatCapacityGuidePhysicsState'] => (
  isPersistenceRecord(value)
    ? migrateGuidePhysicsState({
        ...fallback,
        ...clonePersistenceValue(value),
        amountMol: isPersistenceFiniteNumber(value.amountMol) ? value.amountMol : Number.NaN,
        internalEnergyJ: isPersistenceFiniteNumber(value.internalEnergyJ)
          ? value.internalEnergyJ
          : Number.NaN,
        referenceAmountMol: isPersistenceFiniteNumber(value.referenceAmountMol)
          ? value.referenceAmountMol
          : Number.NaN,
        simulationTimeS: heatCapacityRestoreFiniteOrDefault(value.simulationTimeS, fallback.simulationTimeS),
        gasAmountRatio: heatCapacityRestoreFiniteOrDefault(value.gasAmountRatio, fallback.gasAmountRatio),
        gasTemperatureK: heatCapacityRestoreFiniteOrDefault(value.gasTemperatureK, fallback.gasTemperatureK),
        wallTemperatureK: heatCapacityRestoreFiniteOrDefault(value.wallTemperatureK, fallback.wallTemperatureK),
        pumpProcesses: Array.isArray(value.pumpProcesses)
          ? clonePersistenceValue(value.pumpProcesses)
          : fallback.pumpProcesses,
        pumpStrokeCount: heatCapacityRestoreFiniteOrDefault(value.pumpStrokeCount, fallback.pumpStrokeCount),
        lastPumpStrokeAtS: isPersistenceFiniteNumber(value.lastPumpStrokeAtS) ? value.lastPumpStrokeAtS : null,
        lastPumpValveOpenedAtS: isPersistenceFiniteNumber(value.lastPumpValveOpenedAtS) ? value.lastPumpValveOpenedAtS : null,
        lastPumpValveClosedAtS: isPersistenceFiniteNumber(value.lastPumpValveClosedAtS) ? value.lastPumpValveClosedAtS : null,
        lastStopcockOpenedAtS: isPersistenceFiniteNumber(value.lastStopcockOpenedAtS) ? value.lastStopcockOpenedAtS : null,
        lastStopcockClosedAtS: isPersistenceFiniteNumber(value.lastStopcockClosedAtS) ? value.lastStopcockClosedAtS : null,
      } as WorkbenchHeatCapacityState['heatCapacityGuidePhysicsState'], config)
    : fallback
);

const normalizeGuideTrial = (
  value: unknown,
): WorkbenchHeatCapacityState['heatCapacityGuideTrial'] => (
  isPersistenceRecord(value) && (value.source === 'guide' || value.source === 'demo') && typeof value.id === 'string'
    ? clonePersistenceValue(value) as unknown as WorkbenchHeatCapacityState['heatCapacityGuideTrial']
    : null
);

export const restoreHeatCapacityGuidePersistenceFields = (
  value: unknown,
  fallback: WorkbenchHeatCapacityState,
): RestoredHeatCapacityGuideFields => {
  if (!isPersistenceRecord(value)) {
    return {
      heatCapacityGuidePhysicsConfig: fallback.heatCapacityGuidePhysicsConfig,
      heatCapacityGuidePhysicsState: fallback.heatCapacityGuidePhysicsState,
      heatCapacityGuideTemperatureSensorState: fallback.heatCapacityGuideTemperatureSensorState,
      heatCapacityGuideWorkflow: fallback.heatCapacityGuideWorkflow,
      heatCapacityGuideTrial: fallback.heatCapacityGuideTrial,
    };
  }
  const heatCapacityGuidePhysicsConfig = normalizeGuidePhysicsConfig(
    value.physicsConfig,
    fallback.heatCapacityGuidePhysicsConfig,
  );
  const heatCapacityGuidePhysicsState = normalizeGuidePhysicsState(
    value.physicsState,
    fallback.heatCapacityGuidePhysicsState,
    heatCapacityGuidePhysicsConfig,
  );
  return {
    heatCapacityGuidePhysicsConfig,
    heatCapacityGuidePhysicsState,
    heatCapacityGuideTemperatureSensorState: {
      temperatureK: isPersistenceRecord(value.temperatureSensorState) &&
        isPersistenceFiniteNumber(value.temperatureSensorState.temperatureK)
        ? value.temperatureSensorState.temperatureK
        : heatCapacityGuidePhysicsState.gasTemperatureK,
    },
    heatCapacityGuideWorkflow: normalizeGuideWorkflow(
      value.workflow,
      fallback.heatCapacityGuideWorkflow,
    ),
    heatCapacityGuideTrial: normalizeGuideTrial(value.trial),
  };
};
