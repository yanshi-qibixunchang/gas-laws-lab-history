import {
  createDefaultHeatCapacityFreePhysicsConfig,
} from '../../domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  normalizeFreeEnvironmentDisturbanceConfig,
} from '../../domain/heatCapacity/heatCapacityFreeEnvironmentDisturbanceModel.ts';
import type {
  HeatCapacityFreePhysicsConfig,
} from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  isHeatCapacityFreeExperimentGroupExecutableUnfinished,
  selectCurrentHeatCapacityFreeExperimentGroup,
  updateCurrentHeatCapacityFreeExperimentGroupRunSeries,
  updateCurrentHeatCapacityFreeRealCalculationSession,
  type HeatCapacityFreeExperimentGroupRecord,
} from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  getHeatCapacityFreeGasTypeGamma,
  getHeatCapacityFreeGasTypeModelDefaults,
  getHeatCapacityFreeIdealTheoreticalGamma,
  normalizeHeatCapacityFreeGasType,
  resolveHeatCapacityFreeGasTypeFromGamma,
  createHeatCapacityFreeParameterDraftFromConfigs,
  type HeatCapacityFreeGasType,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import {
  normalizeFreePumpValveExchangeConfig,
} from '../../domain/heatCapacity/heatCapacityFreePumpValveExchangeModel.ts';
import {
  normalizeHeatCapacityFreeBatchState,
} from '../../domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import type {
  HeatCapacityFreeTrial,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  normalizeHeatCapacityFreePhysicsConfig,
} from './workbenchHeatCapacityFreeRuntimeConfig.ts';
import type {
  HeatCapacityFreeExperimentDomainState,
  HeatCapacityFreeParameterScheme,
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';

export type HeatCapacityFreeAuthorityState = Pick<
  WorkbenchHeatCapacityState,
  | 'heatCapacityFreeParameterScheme'
  | 'heatCapacityFreeDisplayScheme'
  | 'heatCapacityFreeExperimentGroups'
  | 'heatCapacityFreeRealDomain'
  | 'heatCapacityFreeIdealDomain'
>;

export interface HeatCapacityFreeAuthorityTransactionOptions {
  /** Capture the current instrument projection before changing authority state. */
  commitRuntimeScheme?: HeatCapacityFreeParameterScheme;
  /** Rebuild the active domain and current instrument projection after the update. */
  hydrateRuntime?: boolean;
}

const REAL_DOMAIN_IDEAL_THERMAL_CONTAMINATION_THRESHOLD_W_PER_K = 4;

export const hasHeatCapacityFreeIdealThermalBoundaryContamination = (
  physicsConfig: Partial<HeatCapacityFreePhysicsConfig> | null | undefined,
): boolean => {
  const normalizedPhysicsConfig = normalizeHeatCapacityFreePhysicsConfig(physicsConfig);
  return normalizedPhysicsConfig.thermal.gasWallConductanceWPerK >=
    REAL_DOMAIN_IDEAL_THERMAL_CONTAMINATION_THRESHOLD_W_PER_K &&
    normalizedPhysicsConfig.thermal.wallAmbientConductanceWPerK >=
    REAL_DOMAIN_IDEAL_THERMAL_CONTAMINATION_THRESHOLD_W_PER_K;
};

export const withHeatCapacityFreeTrialParameterScheme = (
  trial: HeatCapacityFreeTrial,
  scheme: HeatCapacityFreeParameterScheme,
): HeatCapacityFreeTrial => {
  const standardReferenceSnapshot = trial.standardReferenceSnapshot &&
    !hasHeatCapacityFreeIdealThermalBoundaryContamination(
      trial.standardReferenceSnapshot.configSnapshot.physics,
    )
    ? trial.standardReferenceSnapshot
    : null;
  if (
    trial.parameterScheme === scheme &&
    trial.standardReferenceSnapshot === standardReferenceSnapshot
  ) {
    return trial;
  }
  return {
    ...trial,
    parameterScheme: scheme,
    standardReferenceSnapshot,
  };
};

const withHeatCapacityFreeTrialsParameterScheme = (
  trials: HeatCapacityFreeTrial[],
  scheme: HeatCapacityFreeParameterScheme,
) => trials.map((trial) => withHeatCapacityFreeTrialParameterScheme(trial, scheme));

export const selectHeatCapacityFreeActiveRunConfigSnapshot = (
  file: WorkbenchHeatCapacityState,
  scheme: HeatCapacityFreeParameterScheme = file.heatCapacityFreeParameterScheme,
) => {
  const currentGroup = selectCurrentHeatCapacityFreeExperimentGroup(
    file.heatCapacityFreeExperimentGroups,
  );
  if (currentGroup?.scheme === scheme) return currentGroup.parameterSnapshot;
  return scheme === 'ideal'
    ? file.heatCapacityFreeIdealDomain.activeRunConfigSnapshot
    : file.heatCapacityFreeRealDomain.activeRunConfigSnapshot;
};

export const projectHeatCapacityFreeExperimentGroupToDomain = (
  domain: HeatCapacityFreeExperimentDomainState,
  group: HeatCapacityFreeExperimentGroupRecord,
): HeatCapacityFreeExperimentDomainState => {
  if (group.scheme !== domain.scheme) return domain;
  return {
    ...domain,
    gasType: group.gasType,
    batch: group.runSeries.batch,
    experimentGroupStatus: group.status === 'draft'
      ? 'draft'
      : group.status === 'collecting'
        ? domain.experimentGroupStatus
        : 'completed',
    activeRunConfigSnapshot: group.parameterSnapshot,
    traceStore: group.runSeries.traceStore,
    trials: withHeatCapacityFreeTrialsParameterScheme(
      group.runSeries.trials,
      group.scheme,
    ),
  };
};

export const createHeatCapacityFreeExperimentDomainStateFromFile = (
  file: WorkbenchHeatCapacityState,
  scheme: HeatCapacityFreeParameterScheme,
): HeatCapacityFreeExperimentDomainState => ({
  scheme,
  gasType: scheme === 'ideal' ? 'air' : file.heatCapacityFreeGasType,
  batch: file.heatCapacityFreeRunWorkspace.batch,
  experimentGroupStatus: file.heatCapacityFreeExperimentGroupStatus,
  activeRunConfigSnapshot: selectHeatCapacityFreeActiveRunConfigSnapshot(file, scheme),
  recordConfig: file.heatCapacityFreeInstrumentConfig.record,
  pressureWarningMv: file.heatCapacityFreeInstrumentConfig.pressureWarningMv,
  instrumentNoiseEnabled: file.heatCapacityFreeInstrumentConfig.instrumentNoiseEnabled,
  environmentConfig: file.heatCapacityFreeInstrumentConfig.environment,
  physicsConfig: file.heatCapacityFreeInstrumentConfig.physics,
  physicsState: file.heatCapacityFreeInstrumentState.physics,
  sensorConfig: file.heatCapacityFreeInstrumentConfig.sensor,
  sensorState: file.heatCapacityFreeInstrumentState.sensor,
  calibrationState: file.heatCapacityFreeInstrumentState.calibration,
  releaseState: { ...file.heatCapacityReleaseState },
  rollbackSnapshots: file.heatCapacityFreeRollbackSnapshots,
  traceStore: file.heatCapacityFreeRunWorkspace.traceStore,
  trials: withHeatCapacityFreeTrialsParameterScheme(
    file.heatCapacityFreeRunWorkspace.trials,
    scheme,
  ),
  activeAttempt: file.heatCapacityFreeRunWorkspace.activeAttempt,
});

export const normalizeHeatCapacityFreeExperimentDomainBoundary = (
  domain: HeatCapacityFreeExperimentDomainState,
  scheme: HeatCapacityFreeParameterScheme,
  fallbackGasType?: HeatCapacityFreeGasType,
): HeatCapacityFreeExperimentDomainState => {
  const physicsConfig = normalizeHeatCapacityFreePhysicsConfig(domain.physicsConfig);
  const gasType = scheme === 'ideal'
    ? 'air'
    : normalizeHeatCapacityFreeGasType(
        domain.gasType,
        normalizeHeatCapacityFreeGasType(
          fallbackGasType,
          resolveHeatCapacityFreeGasTypeFromGamma(physicsConfig.gamma),
        ),
      );
  if (scheme === 'ideal') {
    return {
      ...domain,
      scheme: 'ideal',
      gasType,
      batch: normalizeHeatCapacityFreeBatchState(domain.batch),
      physicsConfig: {
        ...physicsConfig,
        gamma: getHeatCapacityFreeIdealTheoreticalGamma(),
      },
      trials: withHeatCapacityFreeTrialsParameterScheme(domain.trials, 'ideal'),
      activeAttempt: domain.activeAttempt ?? null,
    };
  }

  if (!hasHeatCapacityFreeIdealThermalBoundaryContamination(physicsConfig)) {
    return {
      ...domain,
      scheme: 'real',
      gasType,
      batch: normalizeHeatCapacityFreeBatchState(domain.batch),
      physicsConfig: {
        ...physicsConfig,
        gamma: getHeatCapacityFreeGasTypeGamma(gasType),
      },
      trials: withHeatCapacityFreeTrialsParameterScheme(domain.trials, 'real'),
      activeAttempt: domain.activeAttempt ?? null,
    };
  }

  const realDefaults = createDefaultHeatCapacityFreePhysicsConfig();
  const gasDefaults = getHeatCapacityFreeGasTypeModelDefaults(gasType);
  return {
    ...domain,
    scheme: 'real',
    gasType,
    batch: normalizeHeatCapacityFreeBatchState(domain.batch),
    physicsConfig: {
      ...physicsConfig,
      gamma: getHeatCapacityFreeGasTypeGamma(gasType),
      thermal: {
        ...realDefaults.thermal,
        gasWallConductanceWPerK: gasDefaults.gasWallConductanceWPerK,
      },
      pumpValveExchange: normalizeFreePumpValveExchangeConfig(
        realDefaults.pumpValveExchange,
      ),
      environmentDisturbance: normalizeFreeEnvironmentDisturbanceConfig(
        realDefaults.environmentDisturbance,
      ),
      leakage: {
        ...realDefaults.leakage,
        ratePerS: gasDefaults.leakageRatePerS,
      },
    },
    trials: withHeatCapacityFreeTrialsParameterScheme(domain.trials, 'real'),
    activeAttempt: domain.activeAttempt ?? null,
  };
};

export const selectHeatCapacityFreeDomain = (
  file: WorkbenchHeatCapacityState,
  scheme: HeatCapacityFreeParameterScheme,
): HeatCapacityFreeExperimentDomainState => {
  const domain = scheme === 'ideal'
    ? normalizeHeatCapacityFreeExperimentDomainBoundary(
        file.heatCapacityFreeIdealDomain,
        'ideal',
      )
    : normalizeHeatCapacityFreeExperimentDomainBoundary(
        file.heatCapacityFreeRealDomain,
        'real',
      );
  const currentGroup = selectCurrentHeatCapacityFreeExperimentGroup(
    file.heatCapacityFreeExperimentGroups,
  );
  return currentGroup?.scheme === scheme
    ? projectHeatCapacityFreeExperimentGroupToDomain(domain, currentGroup)
    : domain;
};

export const selectActiveHeatCapacityFreeDomain = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityFreeExperimentDomainState => (
  selectHeatCapacityFreeDomain(file, file.heatCapacityFreeParameterScheme)
);

export const applyHeatCapacityFreeDomainToRuntimeFields = (
  file: WorkbenchHeatCapacityState,
  domain: HeatCapacityFreeExperimentDomainState,
): WorkbenchHeatCapacityState => {
  const parameterDraft = createHeatCapacityFreeParameterDraftFromConfigs(
    domain.physicsConfig,
    domain.sensorConfig,
    domain.recordConfig,
    domain.pressureWarningMv,
    domain.instrumentNoiseEnabled,
  );
  const gasTypeGamma = getHeatCapacityFreeGasTypeGamma(domain.gasType);
  return {
    ...file,
    heatCapacityFreeRunWorkspace: {
      batch: domain.batch,
      traceStore: domain.traceStore,
      trials: withHeatCapacityFreeTrialsParameterScheme(
        domain.trials,
        domain.scheme,
      ),
      activeAttempt: domain.activeAttempt ?? null,
    },
    heatCapacityFreeExperimentGroupStatus: domain.experimentGroupStatus,
    heatCapacityFreeGasType: domain.gasType,
    heatCapacityFreeParameterDraft: { ...parameterDraft, gasType: domain.gasType },
    heatCapacityFreeInstrumentConfig: {
      record: domain.recordConfig,
      pressureWarningMv: domain.pressureWarningMv,
      instrumentNoiseEnabled: domain.instrumentNoiseEnabled,
      environment: domain.environmentConfig,
      physics: {
        ...domain.physicsConfig,
        gamma: gasTypeGamma,
      },
      sensor: domain.sensorConfig,
    },
    heatCapacityFreeInstrumentState: {
      physics: domain.physicsState,
      sensor: domain.sensorState,
      calibration: domain.calibrationState,
    },
    heatCapacityReleaseState: { ...domain.releaseState },
    heatCapacityFreeRollbackSnapshots: domain.rollbackSnapshots,
    theoreticalGamma: gasTypeGamma,
  };
};

const captureHeatCapacityFreeRuntimeInCurrentExperimentGroup = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => {
  const currentGroup = selectCurrentHeatCapacityFreeExperimentGroup(
    file.heatCapacityFreeExperimentGroups,
  );
  if (
    !currentGroup ||
    currentGroup.scheme !== file.heatCapacityFreeParameterScheme ||
    !isHeatCapacityFreeExperimentGroupExecutableUnfinished(currentGroup)
  ) {
    return file;
  }
  let groups = updateCurrentHeatCapacityFreeExperimentGroupRunSeries(
    file.heatCapacityFreeExperimentGroups,
    {
      batch: file.heatCapacityFreeRunWorkspace.batch,
      trials: file.heatCapacityFreeRunWorkspace.trials,
      traceStore: file.heatCapacityFreeRunWorkspace.traceStore,
    },
  );
  if (
    currentGroup.status === 'awaiting-real-calculation' &&
    file.heatCapacityFreeRunWorkspace.batch.calculationSession !== null
  ) {
    groups = updateCurrentHeatCapacityFreeRealCalculationSession(
      groups,
      file.heatCapacityFreeRunWorkspace.batch.calculationSession,
    );
  }
  return groups === file.heatCapacityFreeExperimentGroups
    ? file
    : {
        ...file,
        heatCapacityFreeExperimentGroups: groups,
      };
};

export const applyCurrentHeatCapacityFreeExperimentGroupToRuntimeFields = (
  file: WorkbenchHeatCapacityState,
): WorkbenchHeatCapacityState => {
  const currentGroup = selectCurrentHeatCapacityFreeExperimentGroup(
    file.heatCapacityFreeExperimentGroups,
  );
  if (!currentGroup || currentGroup.scheme !== file.heatCapacityFreeParameterScheme) {
    return file;
  }
  return {
    ...file,
    heatCapacityFreeRunWorkspace: {
      ...file.heatCapacityFreeRunWorkspace,
      batch: currentGroup.runSeries.batch,
      traceStore: currentGroup.runSeries.traceStore,
      trials: withHeatCapacityFreeTrialsParameterScheme(
        currentGroup.runSeries.trials,
        currentGroup.scheme,
      ),
    },
    heatCapacityFreeExperimentGroupStatus: currentGroup.status === 'draft'
      ? 'draft'
      : currentGroup.status === 'collecting'
        ? file.heatCapacityFreeExperimentGroupStatus
        : 'completed',
  };
};

export const commitHeatCapacityFreeRuntimeAuthorityTransaction = (
  file: WorkbenchHeatCapacityState,
  scheme: HeatCapacityFreeParameterScheme,
): WorkbenchHeatCapacityState => {
  const activeDomain = selectHeatCapacityFreeDomain(file, scheme);
  const shouldUseExistingDomain =
    scheme === 'real' &&
    hasHeatCapacityFreeIdealThermalBoundaryContamination(
      file.heatCapacityFreeInstrumentConfig.physics,
    );
  const sourceFile = shouldUseExistingDomain
    ? applyHeatCapacityFreeDomainToRuntimeFields(file, activeDomain)
    : file;
  const domain = normalizeHeatCapacityFreeExperimentDomainBoundary(
    createHeatCapacityFreeExperimentDomainStateFromFile(sourceFile, scheme),
    scheme,
  );
  const fileWithNormalizedRuntime = {
    ...sourceFile,
    heatCapacityFreeRunWorkspace: {
      ...sourceFile.heatCapacityFreeRunWorkspace,
      trials: domain.trials,
    },
  };
  const storedFile = scheme === 'ideal'
    ? { ...fileWithNormalizedRuntime, heatCapacityFreeIdealDomain: domain }
    : { ...fileWithNormalizedRuntime, heatCapacityFreeRealDomain: domain };
  return captureHeatCapacityFreeRuntimeInCurrentExperimentGroup(storedFile);
};

export const hydrateHeatCapacityFreeAuthorityProjection = (
  file: WorkbenchHeatCapacityState,
  scheme: HeatCapacityFreeParameterScheme = file.heatCapacityFreeParameterScheme,
): WorkbenchHeatCapacityState => {
  const domain = selectHeatCapacityFreeDomain(file, scheme);
  const synchronizedFile = scheme === 'ideal'
    ? { ...file, heatCapacityFreeIdealDomain: domain }
    : { ...file, heatCapacityFreeRealDomain: domain };
  return applyHeatCapacityFreeDomainToRuntimeFields(synchronizedFile, domain);
};

/**
 * Applies a single authority mutation, then stores the current experiment-group
 * projection in its matching domain and rebuilds the top-level instrument view.
 */
export const transactHeatCapacityFreeAuthority = (
  file: WorkbenchHeatCapacityState,
  updateAuthority: (
    authority: HeatCapacityFreeAuthorityState,
  ) => HeatCapacityFreeAuthorityState,
  options: HeatCapacityFreeAuthorityTransactionOptions = {},
): WorkbenchHeatCapacityState => {
  const committedFile = options.commitRuntimeScheme === undefined
    ? file
    : commitHeatCapacityFreeRuntimeAuthorityTransaction(
        file,
        options.commitRuntimeScheme,
      );
  const authority = updateAuthority({
    heatCapacityFreeParameterScheme: committedFile.heatCapacityFreeParameterScheme,
    heatCapacityFreeDisplayScheme: committedFile.heatCapacityFreeDisplayScheme,
    heatCapacityFreeExperimentGroups: committedFile.heatCapacityFreeExperimentGroups,
    heatCapacityFreeRealDomain: committedFile.heatCapacityFreeRealDomain,
    heatCapacityFreeIdealDomain: committedFile.heatCapacityFreeIdealDomain,
  });
  const authorityFile: WorkbenchHeatCapacityState = {
    ...committedFile,
    ...authority,
  };
  if (options.hydrateRuntime === false) return authorityFile;

  return hydrateHeatCapacityFreeAuthorityProjection(authorityFile);
};

export const storeHeatCapacityFreeRuntimeFieldsInDomain =
  commitHeatCapacityFreeRuntimeAuthorityTransaction;
