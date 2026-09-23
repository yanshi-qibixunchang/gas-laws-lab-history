import {
  applyHeatCapacityFreeParameterDraftToConfigs,
  normalizeHeatCapacityFreeParameterDraft,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import {
  createClosedHeatCapacityReleaseState,
} from '../../domain/heatCapacity/heatCapacityReleaseModel.ts';
import {
  createDefaultFreeSensorState,
} from '../../domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import {
  commitHeatCapacityFreeRuntimeAuthorityTransaction,
  selectHeatCapacityFreeAppliedParameterDraft,
  selectHeatCapacityFreeGasType,
  transactHeatCapacityFreeAuthority,
} from './workbenchHeatCapacityFreeAuthorityTransaction.ts';
import {
  HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
  getHeatCapacityPressureZeroDisplayText,
} from './workbenchHeatCapacityInstrumentState.ts';
import {
  createDefaultHeatCapacityFreeRuntimeFields,
  createDefaultHeatCapacityGuideRuntimeFields,
  createHeatCapacityFreeIdealParameterState,
} from './workbenchHeatCapacityRuntimeDefaults.ts';
import {
  mergeHeatCapacityFreeRuntimeState,
} from './workbenchHeatCapacityFreeRuntimeState.ts';
import {
  markHeatCapacityFreeTraceTrialCompleted,
  removeHeatCapacityFreeTraceTrialFromStore,
} from './workbenchHeatCapacityFreeTraceState.ts';
import {
  getActiveHeatCapacityFreeTrialIndex,
  hasHeatCapacityFreeTrialProgress,
  isHeatCapacityFreeTrialComplete,
} from './workbenchHeatCapacityFreeTrialState.ts';
import type {
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';

const loadActiveHeatCapacityFreeDomainRuntimeFields = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') return file;
  return transactHeatCapacityFreeAuthority(
    file,
    (authority) => authority,
    { commitRuntimeScheme: file.heatCapacityFreeParameterScheme },
  );
};

const storeActiveHeatCapacityFreeDomainRuntimeFields = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => (
  file.heatCapacityMode === 'free'
    ? commitHeatCapacityFreeRuntimeAuthorityTransaction(
        file,
        file.heatCapacityFreeParameterScheme,
      )
    : file
);

const resolveHeatCapacityFreeResetStructure = (
  file: WorkbenchHeatCapacityState,
) => {
  const trials = file.heatCapacityFreeRunWorkspace.trials;
  const lastTrial = trials[trials.length - 1] ?? null;
  const activeTraceTrialId = file.heatCapacityFreeRunWorkspace.traceStore.activeTraceTrialId;
  // A scoped restart may already have discarded the unfinished trial. The
  // previous, power-off committed trial is history, regardless of the old
  // instrument's currentExperimentStatus or power state.
  if (lastTrial && lastTrial.completedAtMs != null && isHeatCapacityFreeTrialComplete(lastTrial)) {
    const activeTraceIsSaved = trials.some(trial => trial.completedAtMs != null
      && trial.traceTrialId === activeTraceTrialId);
    return {
      trials,
      traceStore: activeTraceIsSaved
        ? { ...file.heatCapacityFreeRunWorkspace.traceStore, activeTraceTrialId: null }
        : removeHeatCapacityFreeTraceTrialFromStore(file.heatCapacityFreeRunWorkspace.traceStore, activeTraceTrialId),
    };
  }
  if (file.heatCapacityFreeRunWorkspace.activeAttempt?.status === 'invalid') {
    const traceTrialIds = new Set(
      [lastTrial?.traceTrialId ?? null, activeTraceTrialId]
        .filter((id): id is string => typeof id === 'string'),
    );
    let traceStore = file.heatCapacityFreeRunWorkspace.traceStore;
    for (const traceTrialId of traceTrialIds) {
      traceStore = removeHeatCapacityFreeTraceTrialFromStore(traceStore, traceTrialId);
    }
    return {
      trials: lastTrial?.completedAtMs === null ? trials.slice(0, -1) : trials,
      traceStore,
    };
  }
  if (!lastTrial) {
    return {
      trials,
      traceStore: removeHeatCapacityFreeTraceTrialFromStore(
        file.heatCapacityFreeRunWorkspace.traceStore,
        activeTraceTrialId,
      ),
    };
  }

  if (
    isHeatCapacityFreeTrialComplete(lastTrial) &&
    (
      !file.powerOn ||
      file.heatCapacityFreeRunWorkspace.currentExperimentStatus !== 'completed'
    )
  ) {
    let traceStore = markHeatCapacityFreeTraceTrialCompleted(
      file.heatCapacityFreeRunWorkspace.traceStore,
      lastTrial.traceTrialId,
      lastTrial.id,
    );
    traceStore = activeTraceTrialId && activeTraceTrialId !== lastTrial.traceTrialId
      ? removeHeatCapacityFreeTraceTrialFromStore(traceStore, activeTraceTrialId)
      : { ...traceStore, activeTraceTrialId: null };
    return { trials, traceStore };
  }

  const activeTrialIndex = getActiveHeatCapacityFreeTrialIndex(file);
  const activeTrial = activeTrialIndex >= 0 ? trials[activeTrialIndex] ?? null : null;
  if (
    activeTrial &&
    (hasHeatCapacityFreeTrialProgress(activeTrial) || activeTraceTrialId !== null)
  ) {
    const traceTrialIds = new Set(
      [activeTrial.traceTrialId, activeTraceTrialId]
        .filter((id): id is string => typeof id === 'string'),
    );
    let traceStore = file.heatCapacityFreeRunWorkspace.traceStore;
    for (const traceTrialId of traceTrialIds) {
      traceStore = removeHeatCapacityFreeTraceTrialFromStore(traceStore, traceTrialId);
    }
    return {
      trials: activeTrialIndex >= 0
        ? trials.filter((_, index) => index !== activeTrialIndex)
        : trials.slice(0, -1),
      traceStore,
    };
  }

  if (activeTraceTrialId !== null) {
    return {
      trials,
      traceStore: removeHeatCapacityFreeTraceTrialFromStore(
        file.heatCapacityFreeRunWorkspace.traceStore,
        activeTraceTrialId,
      ),
    };
  }

  return {
    trials,
    traceStore: file.heatCapacityFreeRunWorkspace.traceStore,
  };
};

export const resetHeatCapacityFreeRunWorkbenchStateCore = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const appliedDraft = selectHeatCapacityFreeAppliedParameterDraft(file);
  const parameterState = file.heatCapacityFreeParameterScheme === 'ideal'
    ? createHeatCapacityFreeIdealParameterState(selectHeatCapacityFreeGasType(file))
    : applyHeatCapacityFreeParameterDraftToConfigs(
        normalizeHeatCapacityFreeParameterDraft(appliedDraft, appliedDraft),
      );
  const generatedFreeRuntimeFields = createDefaultHeatCapacityFreeRuntimeFields(
    `free-runtime-${file.id}-${now}`,
    parameterState,
    file.heatCapacityFreeParameterScheme === 'ideal' ? 0 : undefined,
  );
  const preservedSensorBiasMv = file.heatCapacityFreeParameterScheme === 'ideal'
    ? 0
    : Number.isFinite(file.heatCapacityFreeInstrumentState.sensor.pressureInitialBiasMv)
      ? file.heatCapacityFreeInstrumentState.sensor.pressureInitialBiasMv
      : generatedFreeRuntimeFields.heatCapacityFreeInstrumentState.sensor.pressureInitialBiasMv;
  const preservedSensorSeed = file.heatCapacityFreeInstrumentState.sensor.seed ??
    `free-runtime-${file.id}`;
  const freeRuntimeFields = {
    ...generatedFreeRuntimeFields,
    heatCapacityFreeInstrumentState: {
      ...generatedFreeRuntimeFields.heatCapacityFreeInstrumentState,
      sensor: createDefaultFreeSensorState(preservedSensorSeed, {
        pressureMv: preservedSensorBiasMv,
        pressureInitialBiasMv: preservedSensorBiasMv,
        temperatureMv:
          generatedFreeRuntimeFields.heatCapacityFreeInstrumentConfig.sensor.temperatureMvAtAmbient,
        sensorTemperatureK:
          generatedFreeRuntimeFields.heatCapacityFreeInstrumentConfig.physics.environment.ambientTemperatureK,
      }),
    },
  };
  const guideRuntimeFields = createDefaultHeatCapacityGuideRuntimeFields();
  const resetStructure = resolveHeatCapacityFreeResetStructure(file);
  const resetFile = mergeHeatCapacityFreeRuntimeState(
    {
      ...file,
      ...freeRuntimeFields,
      ...guideRuntimeFields,
      heatCapacityFreeRunWorkspace: {
        ...freeRuntimeFields.heatCapacityFreeRunWorkspace,
        traceStore: resetStructure.traceStore,
        trials: resetStructure.trials,
      },
      heatCapacityFreeFileAcknowledgements: file.heatCapacityFreeFileAcknowledgements,
      heatCapacityMode: 'free',
      heatCapacityTeachingStatus: 'idle',
      powerOn: false,
      runState: 'idle',
      heatCapacityPhase: 'powerOff',
      glassPistonState: 'closed',
      stopcockAngleDeg: HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG,
      pressureZeroed: false,
      pressureZeroAdjusted: false,
      pressureZeroKnobAngle: 0,
      pressureZeroOffset: 0,
      pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(false, 0),
      pressureZeroAdjustMode: 'none',
      pressureZeroDisplayedSamples: [],
      pumpValveOpen: false,
      pumpValveState: 'closed',
      pumpBulbState: 'idle',
      pumpStrokeTimestamps: [],
      pumpFrequency: 0,
      pumpFrequencyStatus: 'idle',
      lastPumpTime: null,
      pumpStrokeCount: 0,
      pumpHint: '未打气',
      heatCapacityProcessSamples: {},
      updatedAt: now,
    },
    freeRuntimeFields.heatCapacityFreeInstrumentState.physics,
    freeRuntimeFields.heatCapacityFreeInstrumentState.sensor,
    freeRuntimeFields.heatCapacityFreeInstrumentState.calibration,
    now,
  );
  return {
    ...resetFile,
    lastUpdateMs: null,
    displayResponseLastUpdateMs: null,
    heatCapacityPhase: 'powerOff',
    pressureZeroed: false,
    pressureZeroAdjusted: false,
    pressureZeroKnobAngle: 0,
    pressureZeroOffset: 0,
    pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(false, 0),
    pressureZeroAdjustMode: 'none',
    pressureZeroDisplayedSamples: [],
    pumpValveOpen: false,
    pumpValveState: 'closed',
    pumpBulbState: 'idle',
    pumpStrokeTimestamps: [],
    pumpFrequency: 0,
    pumpFrequencyStatus: 'idle',
    lastPumpTime: null,
    pumpStrokeCount: 0,
    pumpHint: '未打气',
    heatCapacityReleaseState: createClosedHeatCapacityReleaseState(
      freeRuntimeFields.heatCapacityFreeInstrumentState.physics.simulationTimeS,
    ),
    heatCapacityFreeRunWorkspace: {
      ...resetFile.heatCapacityFreeRunWorkspace,
      traceStore: resetStructure.traceStore,
      trials: resetStructure.trials,
    },
    heatCapacityProcessSamples: {},
    updatedAt: now,
  };
};

export const resetHeatCapacityFreeRunWorkbenchState = (
  file: WorkbenchHeatCapacityState,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  if (file.heatCapacityMode !== 'free') {
    return resetHeatCapacityFreeRunWorkbenchStateCore(file, now);
  }
  const scheme = file.heatCapacityFreeParameterScheme;
  const hydratedFile = loadActiveHeatCapacityFreeDomainRuntimeFields(file);
  const nextFile = resetHeatCapacityFreeRunWorkbenchStateCore(hydratedFile, now);
  return storeActiveHeatCapacityFreeDomainRuntimeFields({
    ...nextFile,
    heatCapacityFreeRunWorkspace: {
      ...nextFile.heatCapacityFreeRunWorkspace,
      batch: hydratedFile.heatCapacityFreeRunWorkspace.batch,
    },
    heatCapacityFreeParameterScheme: scheme,
    heatCapacityFreeDisplayScheme: scheme,
  });
};
