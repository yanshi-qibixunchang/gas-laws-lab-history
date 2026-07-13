import {
  getHeatCapacityReleaseApertureEffectiveDtS,
} from './heatCapacityFreeStopcockApertureModel.ts';
import {
  HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA,
  stepHeatCapacityReleaseGasState,
  type HeatCapacityReleasePurpose,
} from './heatCapacityReleaseModel.ts';
import {
  applyHeatCapacityMassEnergyFlux,
  createHeatCapacityThermodynamicStateAtAmbient,
  createHeatCapacityThermodynamicStateFromTemperature,
  createReducedFlowWorkPumpEnergyFluxV1,
  deriveHeatCapacityThermodynamicState,
  stepHeatCapacityThermodynamicHeatExchange,
  type HeatCapacityThermodynamicState,
  type HeatCapacityThermodynamicSystemConfig,
} from './heatCapacityThermodynamicKernel.ts';
import {
  createDefaultHeatCapacityGuidePhysicsConfig,
} from './heatCapacityDefaultConfig.ts';

export interface HeatCapacityGuidePhysicsConfig {
  environment: {
    ambientTemperatureK: number;
    ambientPressureKPa: number;
  };
  vesselVolumeL: number;
  gamma: number;
  pumpAmountGainRatio: number;
  pumpWorkRetention: number;
  pumpPressureLimitKPa: number;
  stopcockFlowRate: number;
  thermal: {
    gasWallConductanceWPerK: number;
    wallAmbientConductanceWPerK: number;
    wallHeatCapacityJPerK: number;
    minimumGasHeatCapacityJPerK: number;
  };
}

export interface HeatCapacityGuidePumpProcess {
  startedAtS: number;
  strength: number;
  appliedProgress: number;
}

export interface HeatCapacityGuidePhysicsState {
  simulationTimeS: number;
  amountMol: number;
  internalEnergyJ: number;
  referenceAmountMol: number;
  gasAmountRatio: number;
  gasTemperatureK: number;
  wallTemperatureK: number;
  pumpProcesses: HeatCapacityGuidePumpProcess[];
  pumpStrokeCount: number;
  lastPumpStrokeAtS: number | null;
  lastPumpValveOpenedAtS: number | null;
  lastPumpValveClosedAtS: number | null;
  currentPumpValveOpenDurationS: number;
  releaseStarted: boolean;
  lastStopcockOpenedAtS: number | null;
  lastStopcockClosedAtS: number | null;
  currentStopcockOpenDurationS: number;
  releaseReference: {
    pressureBeforeKPa: number;
    temperatureBeforeK: number;
    amountBeforeRatio: number;
    openedAtS: number;
    reachedAmbientAtS: number | null;
  } | null;
}

export interface HeatCapacityGuideControls {
  powerOn: boolean;
  pumpValveOpen: boolean;
  stopcockOpen: boolean;
  stopcockFlowPurpose?: HeatCapacityReleasePurpose;
}

export interface HeatCapacityGuidePumpStrokeEvent {
  atS: number;
  strength: number;
}

export type HeatCapacityGuidePumpStrokeRejectReason =
  | 'powerOff'
  | 'pumpValveClosed'
  | 'stopcockOpen'
  | 'pressureDanger';

export interface HeatCapacityGuidePumpStrokeResult {
  accepted: boolean;
  reason: 'accepted' | HeatCapacityGuidePumpStrokeRejectReason;
  state: HeatCapacityGuidePhysicsState;
}

const PRESSURE_EPSILON_KPA = 0.000001;
const GUIDE_PUMP_STROKE_DURATION_S = 0.08;
const GUIDE_OPEN_FLOW_MAX_SUBSTEP_S = 0.02;
const GUIDE_CLOSED_WAIT_MAX_SUBSTEP_S = 1;

const GUIDE_PUMP_STROKE_PROGRESS_POINTS = [
  [0, 0],
  [0.02, 0.18],
  [0.04, 0.68],
  [0.06, 0.92],
  [GUIDE_PUMP_STROKE_DURATION_S, 1],
] as const;

const clampNonNegativeFinite = (value: number) => (
  Number.isFinite(value) && value > 0 ? value : 0
);

const clampUnit = (value: number) => (
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
);

export const createDefaultGuidePhysicsConfig = (): HeatCapacityGuidePhysicsConfig => ({
  ...createDefaultHeatCapacityGuidePhysicsConfig(),
});

const createGuideThermodynamicSystem = (
  state: Pick<HeatCapacityGuidePhysicsState, 'referenceAmountMol'>,
  config: HeatCapacityGuidePhysicsConfig,
): HeatCapacityThermodynamicSystemConfig => ({
  gammaTrue: config.gamma,
  vesselVolumeL: config.vesselVolumeL,
  referenceAmountMol: state.referenceAmountMol,
});

const projectGuideThermodynamicState = (
  state: HeatCapacityGuidePhysicsState,
  thermodynamicState: HeatCapacityThermodynamicState,
  config: HeatCapacityGuidePhysicsConfig,
  referenceAmountMol = state.referenceAmountMol,
): HeatCapacityGuidePhysicsState => {
  const authoritativeState = {
    ...state,
    amountMol: thermodynamicState.amountMol,
    internalEnergyJ: thermodynamicState.internalEnergyJ,
    referenceAmountMol,
    wallTemperatureK: thermodynamicState.wallTemperatureK,
  };
  const derived = deriveHeatCapacityThermodynamicState(
    thermodynamicState,
    createGuideThermodynamicSystem(authoritativeState, config),
  );
  return {
    ...authoritativeState,
    gasAmountRatio: derived.gasAmountRatio,
    gasTemperatureK: derived.gasTemperatureK,
    wallTemperatureK: derived.wallTemperatureK,
  };
};

const hasAuthoritativeGuideThermodynamicState = (
  state: HeatCapacityGuidePhysicsState,
) => (
  Number.isFinite(state.amountMol) && state.amountMol > 0 &&
  Number.isFinite(state.internalEnergyJ) && state.internalEnergyJ > 0 &&
  Number.isFinite(state.referenceAmountMol) && state.referenceAmountMol > 0
);

export const migrateGuidePhysicsState = (
  state: HeatCapacityGuidePhysicsState,
  config: HeatCapacityGuidePhysicsConfig,
): HeatCapacityGuidePhysicsState => {
  if (hasAuthoritativeGuideThermodynamicState(state)) {
    return projectGuideThermodynamicState(state, {
      amountMol: state.amountMol,
      internalEnergyJ: state.internalEnergyJ,
      wallTemperatureK: state.wallTemperatureK,
    }, config);
  }

  const initialized = createHeatCapacityThermodynamicStateAtAmbient({
    ambientPressureKPa: config.environment.ambientPressureKPa,
    ambientTemperatureK: config.environment.ambientTemperatureK,
    vesselVolumeL: config.vesselVolumeL,
    gammaTrue: config.gamma,
  });
  return projectGuideThermodynamicState(
    state,
    initialized.state,
    config,
    initialized.system.referenceAmountMol,
  );
};

export const createDefaultGuidePhysicsState = (
  config: HeatCapacityGuidePhysicsConfig = createDefaultGuidePhysicsConfig(),
): HeatCapacityGuidePhysicsState => {
  const initialized = createHeatCapacityThermodynamicStateAtAmbient({
    ambientPressureKPa: config.environment.ambientPressureKPa,
    ambientTemperatureK: config.environment.ambientTemperatureK,
    vesselVolumeL: config.vesselVolumeL,
    gammaTrue: config.gamma,
  });
  return projectGuideThermodynamicState({
    simulationTimeS: 0,
    amountMol: initialized.state.amountMol,
    internalEnergyJ: initialized.state.internalEnergyJ,
    referenceAmountMol: initialized.system.referenceAmountMol,
    gasAmountRatio: 1,
    gasTemperatureK: config.environment.ambientTemperatureK,
    wallTemperatureK: config.environment.ambientTemperatureK,
    pumpProcesses: [],
    pumpStrokeCount: 0,
    lastPumpStrokeAtS: null,
    lastPumpValveOpenedAtS: null,
    lastPumpValveClosedAtS: null,
    currentPumpValveOpenDurationS: 0,
    releaseStarted: false,
    lastStopcockOpenedAtS: null,
    lastStopcockClosedAtS: null,
    currentStopcockOpenDurationS: 0,
    releaseReference: null,
  }, initialized.state, config, initialized.system.referenceAmountMol);
};

export const deriveGuidePhysicalState = (
  state: HeatCapacityGuidePhysicsState,
  config: HeatCapacityGuidePhysicsConfig,
) => {
  const migratedState = migrateGuidePhysicsState(state, config);
  const ambientPressureKPa = Math.max(PRESSURE_EPSILON_KPA, config.environment.ambientPressureKPa);
  const gasPressureKPa = deriveHeatCapacityThermodynamicState(
    {
      amountMol: migratedState.amountMol,
      internalEnergyJ: migratedState.internalEnergyJ,
      wallTemperatureK: migratedState.wallTemperatureK,
    },
    createGuideThermodynamicSystem(migratedState, config),
  ).gasPressureKPa;
  return {
    gasPressureKPa,
    pressureDeltaKPa: gasPressureKPa - ambientPressureKPa,
  };
};

const getGuidePumpStrokeProgress = (elapsedS: number) => {
  const elapsed = clampNonNegativeFinite(elapsedS);
  if (elapsed >= GUIDE_PUMP_STROKE_DURATION_S - 1e-9) return 1;
  for (let index = 1; index < GUIDE_PUMP_STROKE_PROGRESS_POINTS.length; index += 1) {
    const [rightTime, rightProgress] = GUIDE_PUMP_STROKE_PROGRESS_POINTS[index];
    if (elapsed <= rightTime) {
      const [leftTime, leftProgress] = GUIDE_PUMP_STROKE_PROGRESS_POINTS[index - 1];
      const span = Math.max(0.000001, rightTime - leftTime);
      const localProgress = clampUnit((elapsed - leftTime) / span);
      return leftProgress + (rightProgress - leftProgress) * localProgress;
    }
  }
  return 1;
};

const applyPumpInflow = (
  state: HeatCapacityGuidePhysicsState,
  config: HeatCapacityGuidePhysicsConfig,
  amountDeltaRatio: number,
) => {
  const safeAmountDeltaRatio = clampNonNegativeFinite(amountDeltaRatio);
  if (safeAmountDeltaRatio === 0) return state;
  const migratedState = migrateGuidePhysicsState(state, config);
  const pumpEnergy = createReducedFlowWorkPumpEnergyFluxV1({
    amountDeltaMol: migratedState.referenceAmountMol * safeAmountDeltaRatio,
    ambientTemperatureK: config.environment.ambientTemperatureK,
    gammaTrue: config.gamma,
    pumpWorkRetention: config.pumpWorkRetention,
  });
  const thermodynamicState = applyHeatCapacityMassEnergyFlux({
    amountMol: migratedState.amountMol,
    internalEnergyJ: migratedState.internalEnergyJ,
    wallTemperatureK: migratedState.wallTemperatureK,
  }, pumpEnergy.flux);
  return projectGuideThermodynamicState(migratedState, thermodynamicState, config);
};

const stepPumpProcesses = (
  state: HeatCapacityGuidePhysicsState,
  config: HeatCapacityGuidePhysicsConfig,
  atS: number,
): HeatCapacityGuidePhysicsState => {
  let nextState = migrateGuidePhysicsState(state, config);
  if (nextState.pumpProcesses.length === 0) return { ...nextState, pumpProcesses: [] };
  const activeProcesses = nextState.pumpProcesses;
  const pumpProcesses: HeatCapacityGuidePumpProcess[] = [];

  for (const process of activeProcesses) {
    const previousProgress = clampUnit(process.appliedProgress);
    const nextProgress = getGuidePumpStrokeProgress(atS - process.startedAtS);
    const progressDelta = Math.max(0, nextProgress - previousProgress);
    if (progressDelta > 0) {
      nextState = applyPumpInflow(
        nextState,
        config,
        config.pumpAmountGainRatio * clampNonNegativeFinite(process.strength) * progressDelta,
      );
    }
    if (nextProgress < 1) {
      pumpProcesses.push({
        ...process,
        appliedProgress: nextProgress,
      });
    }
  }

  return {
    ...nextState,
    pumpProcesses,
  };
};

const createPumpReject = (
  reason: HeatCapacityGuidePumpStrokeRejectReason,
  state: HeatCapacityGuidePhysicsState,
): HeatCapacityGuidePumpStrokeResult => ({
  accepted: false,
  reason,
  state,
});

export const applyGuidePumpStroke = (
  state: HeatCapacityGuidePhysicsState,
  config: HeatCapacityGuidePhysicsConfig,
  controls: HeatCapacityGuideControls,
  event: HeatCapacityGuidePumpStrokeEvent,
): HeatCapacityGuidePumpStrokeResult => {
  const migratedState = migrateGuidePhysicsState(state, config);
  if (!controls.powerOn) return createPumpReject('powerOff', migratedState);
  if (!controls.pumpValveOpen) return createPumpReject('pumpValveClosed', migratedState);
  if (controls.stopcockOpen) return createPumpReject('stopcockOpen', migratedState);
  if (deriveGuidePhysicalState(migratedState, config).gasPressureKPa >= config.pumpPressureLimitKPa) {
    return createPumpReject('pressureDanger', migratedState);
  }
  return {
    accepted: true,
    reason: 'accepted',
    state: {
      ...migratedState,
      simulationTimeS: event.atS,
      pumpStrokeCount: migratedState.pumpStrokeCount + 1,
      lastPumpStrokeAtS: event.atS,
      pumpProcesses: [
        ...migratedState.pumpProcesses,
        {
          startedAtS: event.atS,
          strength: clampNonNegativeFinite(event.strength),
          appliedProgress: 0,
        },
      ],
    },
  };
};

const createReleaseReference = (
  state: HeatCapacityGuidePhysicsState,
  config: HeatCapacityGuidePhysicsConfig,
  atS: number,
) => {
  const derived = deriveGuidePhysicalState(state, config);
  if (derived.gasPressureKPa <= config.environment.ambientPressureKPa + PRESSURE_EPSILON_KPA) {
    return null;
  }
  return {
    pressureBeforeKPa: derived.gasPressureKPa,
    temperatureBeforeK: state.gasTemperatureK,
    amountBeforeRatio: state.gasAmountRatio,
    openedAtS: atS,
    reachedAmbientAtS: null,
  };
};

const stepOpenStopcock = (
  state: HeatCapacityGuidePhysicsState,
  config: HeatCapacityGuidePhysicsConfig,
  dtS: number,
) => {
  const migratedState = migrateGuidePhysicsState(state, config);
  const effectiveDtS = getHeatCapacityReleaseApertureEffectiveDtS(
    migratedState.currentStopcockOpenDurationS,
    dtS,
  );
  if (effectiveDtS <= 0) return migratedState;
  const released = stepHeatCapacityReleaseGasState({
    gasAmountRatio: migratedState.gasAmountRatio,
    gasTemperatureK: migratedState.gasTemperatureK,
  }, {
    ambientPressureKPa: config.environment.ambientPressureKPa,
    ambientTemperatureK: config.environment.ambientTemperatureK,
    gamma: config.gamma,
    coefficient: config.stopcockFlowRate,
  }, effectiveDtS);
  if (
    released.gasAmountRatio === migratedState.gasAmountRatio &&
    released.gasTemperatureK === migratedState.gasTemperatureK
  ) {
    return {
      ...migratedState,
      releaseReference: migratedState.releaseReference && migratedState.releaseReference.reachedAmbientAtS === null
        ? { ...migratedState.releaseReference, reachedAmbientAtS: migratedState.simulationTimeS }
        : migratedState.releaseReference,
    };
  }

  const thermodynamicState = createHeatCapacityThermodynamicStateFromTemperature({
    amountMol: migratedState.referenceAmountMol * released.gasAmountRatio,
    gasTemperatureK: released.gasTemperatureK,
    wallTemperatureK: migratedState.wallTemperatureK,
    gammaTrue: config.gamma,
  });
  const projectedState = projectGuideThermodynamicState(migratedState, thermodynamicState, config);
  const projectedPressureKPa = deriveGuidePhysicalState(projectedState, config).gasPressureKPa;
  return {
    ...projectedState,
    releaseReference: projectedState.releaseReference &&
      projectedState.releaseReference.reachedAmbientAtS === null &&
      projectedPressureKPa <= config.environment.ambientPressureKPa + HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA
      ? {
          ...projectedState.releaseReference,
          reachedAmbientAtS: projectedState.simulationTimeS,
        }
      : projectedState.releaseReference,
  };
};

const stepThermal = (
  state: HeatCapacityGuidePhysicsState,
  config: HeatCapacityGuidePhysicsConfig,
  dtS: number,
) => {
  const migratedState = migrateGuidePhysicsState(state, config);
  const result = stepHeatCapacityThermodynamicHeatExchange(
    {
      amountMol: migratedState.amountMol,
      internalEnergyJ: migratedState.internalEnergyJ,
      wallTemperatureK: migratedState.wallTemperatureK,
    },
    createGuideThermodynamicSystem(migratedState, config),
    {
      ambientTemperatureK: config.environment.ambientTemperatureK,
      gasWallConductanceWPerK: config.thermal.gasWallConductanceWPerK,
      wallAmbientConductanceWPerK: config.thermal.wallAmbientConductanceWPerK,
      wallHeatCapacityJPerK: config.thermal.wallHeatCapacityJPerK,
    },
    dtS,
  );
  return projectGuideThermodynamicState(migratedState, result.state, config);
};

export const stepGuidePhysicsState = (
  state: HeatCapacityGuidePhysicsState,
  config: HeatCapacityGuidePhysicsConfig,
  input: HeatCapacityGuideControls & { dtS: number },
): HeatCapacityGuidePhysicsState => {
  const totalDtS = clampNonNegativeFinite(input.dtS);
  let nextState = migrateGuidePhysicsState(state, config);
  if (!input.powerOn || totalDtS === 0) return nextState;
  let remainingS = totalDtS;

  while (remainingS > 0) {
    const requiresFastStep = input.stopcockOpen || nextState.pumpProcesses.length > 0;
    const stepS = Math.min(
      remainingS,
      requiresFastStep ? GUIDE_OPEN_FLOW_MAX_SUBSTEP_S : GUIDE_CLOSED_WAIT_MAX_SUBSTEP_S,
    );
    const atS = nextState.simulationTimeS + stepS;
    const wasStopcockOpen = nextState.lastStopcockOpenedAtS !== null &&
      (nextState.lastStopcockClosedAtS === null || nextState.lastStopcockOpenedAtS >= nextState.lastStopcockClosedAtS);

    if (input.stopcockOpen && !wasStopcockOpen) {
      const mainRelease = input.stopcockFlowPurpose === 'release';
      nextState = {
        ...nextState,
        lastStopcockOpenedAtS: nextState.simulationTimeS,
        lastStopcockClosedAtS: null,
        currentStopcockOpenDurationS: 0,
        releaseStarted: nextState.releaseStarted || mainRelease,
        releaseReference: mainRelease
          ? createReleaseReference(nextState, config, nextState.simulationTimeS)
          : nextState.releaseReference,
      };
    } else if (!input.stopcockOpen && wasStopcockOpen) {
      nextState = {
        ...nextState,
        lastStopcockClosedAtS: nextState.simulationTimeS,
        currentStopcockOpenDurationS: 0,
      };
    }

    nextState = {
      ...stepPumpProcesses(nextState, config, atS),
      simulationTimeS: atS,
    };

    nextState = stepThermal(nextState, config, stepS);

    if (input.stopcockOpen) {
      nextState = stepOpenStopcock(nextState, config, stepS);
      nextState = {
        ...nextState,
        currentStopcockOpenDurationS: nextState.currentStopcockOpenDurationS + stepS,
      };
    }
    remainingS -= stepS;
  }

  return nextState;
};
