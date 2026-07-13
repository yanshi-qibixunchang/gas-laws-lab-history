import assert from 'node:assert/strict';
import {
  applyHeatCapacityFreeParameterDraftToConfigs,
  getEffectiveHeatCapacityFreeSensorConfig,
  type HeatCapacityFreeParameterDraft,
} from '../../src/domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import {
  applyFreePumpStroke,
  createDefaultFreePhysicsState,
  deriveFreePhysicalState,
  stepFreePhysics,
  type HeatCapacityFreePhysicsConfig,
  type HeatCapacityFreePhysicsState,
} from '../../src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  type HeatCapacityFreeCalibrationState,
} from '../../src/domain/heatCapacity/heatCapacityFreeCalibrationModel.ts';
import {
  evaluateFreeU0Record,
  evaluateFreeU2Record,
} from '../../src/domain/heatCapacity/heatCapacityFreeRecordModel.ts';
import {
  createDefaultFreeSensorState,
  getFreeSensorDisplay,
  stepFreeSensor,
  type HeatCapacityFreeSensorConfig,
  type HeatCapacityFreeSensorState,
} from '../../src/domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import {
  calculateFreeHeatCapacityTrialSignals,
  createHeatCapacityFreeTrial,
  normalizeHeatCapacityFreeRecordInput,
  type HeatCapacityFreeTrial,
} from '../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  applyHeatCapacityFreeParameterDraftWorkbenchState,
  createDefaultHeatCapacityFile,
  getHeatCapacityGaugePressureState,
  type WorkbenchHeatCapacityState,
} from '../../src/features/workbench/workbenchState.ts';

type ImpactMetric = string | number | boolean | null | Record<string, unknown>;

interface ImpactRow {
  id: string;
  group: string;
  scenario: string;
  surface: string;
  baseMetric: ImpactMetric;
  variantMetric: ImpactMetric;
}

const round = (value: number, digits = 6) => (
  Number.isFinite(value) ? Number(value.toFixed(digits)) : value
);

const stableStringify = (value: ImpactMetric) => JSON.stringify(value);

const assertMetricChanged = (
  rows: ImpactRow[],
  row: ImpactRow,
) => {
  rows.push(row);
  assert.notEqual(
    stableStringify(row.variantMetric),
    stableStringify(row.baseMetric),
    `${row.id} should change ${row.surface} in ${row.scenario}`,
  );
};

const defaultFile = createDefaultHeatCapacityFile(1);
const defaultDraft = defaultFile.heatCapacityFreeParameterDraft;

const createDraft = (
  overrides: Partial<HeatCapacityFreeParameterDraft> = {},
  base: HeatCapacityFreeParameterDraft = defaultDraft,
) => ({
  ...base,
  ...overrides,
});

const assertOnlyDraftKeysChanged = (
  base: HeatCapacityFreeParameterDraft,
  variant: HeatCapacityFreeParameterDraft,
  expectedKeys: Array<keyof HeatCapacityFreeParameterDraft>,
) => {
  const changedKeys = (Object.keys(base) as Array<keyof HeatCapacityFreeParameterDraft>)
    .filter((key) => stableStringify(base[key] as ImpactMetric) !== stableStringify(variant[key] as ImpactMetric))
    .sort();
  assert.deepEqual(
    changedKeys,
    [...expectedKeys].sort(),
    `controlled-variable setup should change only ${expectedKeys.join(', ')}`,
  );
};

const defaultCalibration: HeatCapacityFreeCalibrationState = {
  calibrationVersion: 1,
  zeroOffsetMv: 0,
  zeroEvents: [{
    id: 'zero-1',
    atS: 0,
    displayPressureMv: 0,
    displayTemperatureMv: 1500,
    zeroOffsetMv: 0,
    source: 'user',
  }],
  automaticU0: null,
};

const createSensorState = (
  config: HeatCapacityFreeSensorConfig,
  seed = 'impact-seed',
) => createDefaultFreeSensorState(seed, {
  pressureMv: 0,
  pressureInitialBiasMv: 0,
  temperatureMv: config.temperatureMvAtAmbient,
  sensorTemperatureK: 298.15,
});

const stepSensorNow = (
  sensorState: HeatCapacityFreeSensorState,
  physicsState: HeatCapacityFreePhysicsState,
  physicsConfig: HeatCapacityFreePhysicsConfig,
  sensorConfig: HeatCapacityFreeSensorConfig,
) => {
  const derived = deriveFreePhysicalState(physicsState, physicsConfig);
  return stepFreeSensor(
    {
      ...sensorState,
      nextSampleAtS: Number.NEGATIVE_INFINITY,
    },
    {
      gasPressureKPa: derived.gasPressureKPa,
      pressureDeltaKPa: derived.pressureDeltaKPa,
      gasTemperatureK: physicsState.gasTemperatureK,
      ambientTemperatureK: physicsConfig.environment.ambientTemperatureK,
    },
    defaultCalibration,
    sensorConfig,
    physicsState.simulationTimeS,
  );
};

const runFreeScenario = (
  draft: HeatCapacityFreeParameterDraft,
  options: {
    leakBase?: boolean;
    sealedWaitS?: number;
    recoveryWaitS?: number;
    pumpStrokes?: number;
  } = {},
) => {
  const applied = applyHeatCapacityFreeParameterDraftToConfigs(draft);
  const physicsConfig = applied.physicsConfig;
  const sensorConfig = getEffectiveHeatCapacityFreeSensorConfig(
    applied.sensorConfig,
    applied.instrumentNoiseEnabled,
  );
  let physics = createDefaultFreePhysicsState(physicsConfig);
  let sensor = createSensorState(sensorConfig);

  const step = (dtS: number, stopcockOpen = false) => {
    physics = stepFreePhysics(
      physics,
      physicsConfig,
      {
        pumpValveOpen: true,
        stopcockOpen,
      },
      dtS,
      physics.simulationTimeS + dtS,
    );
    sensor = stepSensorNow(sensor, physics, physicsConfig, sensorConfig);
  };

  const pumpStrokes = options.pumpStrokes ?? 1;
  for (let index = 0; index < pumpStrokes; index += 1) {
    const stroke = applyFreePumpStroke(
      physics,
      physicsConfig,
      {
        pumpValveOpen: true,
        stopcockOpen: false,
      },
      {
        atS: physics.simulationTimeS,
        strength: 1,
      },
    );
    assert.equal(stroke.accepted, true, `pump stroke ${index + 1} should be accepted`);
    physics = stroke.state;
    step(0.12, false);
  }

  const pumped = captureScenarioMetrics(physics, sensor, physicsConfig, applied.sensorConfig);
  for (let time = 0; time < (options.sealedWaitS ?? 5); time += 0.1) {
    step(0.1, false);
  }
  const sealed = captureScenarioMetrics(physics, sensor, physicsConfig, applied.sensorConfig);
  for (let time = 0; time < 0.5; time += 0.02) {
    step(0.02, true);
  }
  const released = captureScenarioMetrics(physics, sensor, physicsConfig, applied.sensorConfig);
  for (let time = 0; time < (options.recoveryWaitS ?? 6); time += 0.1) {
    step(0.1, false);
  }
  const recovered = captureScenarioMetrics(physics, sensor, physicsConfig, applied.sensorConfig);

  return {
    pumped,
    sealed,
    released,
    recovered,
  };
};

const pumpAcceptanceAtPressure = (
  draft: HeatCapacityFreeParameterDraft,
  absolutePressureKPa: number,
  strength = 1,
) => {
  const applied = applyHeatCapacityFreeParameterDraftToConfigs(draft);
  const physicsConfig = applied.physicsConfig;
  const ambientState = createDefaultFreePhysicsState(physicsConfig);
  const gasAmountRatio = absolutePressureKPa / physicsConfig.environment.ambientPressureKPa;
  const state: HeatCapacityFreePhysicsState = {
    ...ambientState,
    amountMol: ambientState.referenceAmountMol! * gasAmountRatio,
    internalEnergyJ: ambientState.internalEnergyJ! * gasAmountRatio,
    gasAmountRatio,
    gasTemperatureK: physicsConfig.environment.ambientTemperatureK,
    maxPressureKPa: absolutePressureKPa,
  };
  return applyFreePumpStroke(
    state,
    physicsConfig,
    {
      pumpValveOpen: true,
      stopcockOpen: false,
    },
    {
      atS: state.simulationTimeS,
      strength,
    },
  );
};

const captureScenarioMetrics = (
  physicsState: HeatCapacityFreePhysicsState,
  sensorState: HeatCapacityFreeSensorState,
  physicsConfig: HeatCapacityFreePhysicsConfig,
  storedSensorConfig: HeatCapacityFreeSensorConfig,
) => {
  const derived = deriveFreePhysicalState(physicsState, physicsConfig);
  const display = getFreeSensorDisplay(sensorState, defaultCalibration, storedSensorConfig);
  return {
    gasPressureKPa: round(derived.gasPressureKPa),
    pressureDeltaKPa: round(derived.pressureDeltaKPa),
    gasTemperatureK: round(physicsState.gasTemperatureK),
    wallTemperatureK: round(physicsState.wallTemperatureK),
    gasAmountRatio: round(physicsState.gasAmountRatio),
    displayPressureMv: round(display.displayPressureMv),
    displayTemperatureMv: round(display.displayTemperatureMv),
    pressureSlopeMvPerS: round(display.pressureSlopeMvPerS),
    temperatureSlopeMvPerS: round(display.temperatureSlopeMvPerS),
  };
};

const resultGammaMetric = (draft: HeatCapacityFreeParameterDraft) => {
  const applied = applyHeatCapacityFreeParameterDraftToConfigs(draft);
  const trial = createCompletedTrial(0, 120, 35);
  const signals = calculateFreeHeatCapacityTrialSignals(trial, {
    atmosphericPressureKPa: applied.environmentConfig.ambientPressureKPa,
    pressureSensitivityMvPerKPa: applied.sensorConfig.pressureMvPerKPa,
  });
  assert.notEqual(signals, null);
  return {
    gamma: signals!.gamma,
    atmosphericPressureKPa: signals!.atmosphericPressureKPa,
    pressureSensitivityMvPerKPa: signals!.pressureSensitivityMvPerKPa,
  };
};

const createCompletedTrial = (
  u0Mv: number,
  u1Mv: number,
  u2Mv: number,
): HeatCapacityFreeTrial => ({
  ...createHeatCapacityFreeTrial('impact-trial'),
  u0: normalizeHeatCapacityFreeRecordInput({
    atS: 0,
    displayPressureMv: u0Mv,
    displayTemperatureMv: 1500,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
  }),
  u1: normalizeHeatCapacityFreeRecordInput({
    atS: 1,
    displayPressureMv: u1Mv,
    displayTemperatureMv: 1500,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
  }),
  u2: normalizeHeatCapacityFreeRecordInput({
    atS: 2,
    displayPressureMv: u2Mv,
    displayTemperatureMv: 1500,
    calibrationVersion: 1,
    zeroEventId: 'zero-1',
  }),
});

const createTrialReadyForU2 = (
  u0Mv: number,
  u1Mv: number,
): HeatCapacityFreeTrial => ({
  ...createCompletedTrial(u0Mv, u1Mv, 30),
  u2: null,
  correctedSignals: null,
});

const createRecordPhysics = (
  overrides: Partial<HeatCapacityFreePhysicsState> = {},
) => ({
  ...createDefaultFreePhysicsState(defaultFile.heatCapacityFreePhysicsConfig),
  simulationTimeS: 20,
  pumpStrokeCount: 6,
  lastStopcockOpenedAtS: 0,
  lastStopcockClosedAtS: 10,
  ...overrides,
});

const warningMetric = (draft: HeatCapacityFreeParameterDraft, pressureDeltaKPa: number) => {
  const appliedFile = applyHeatCapacityFreeParameterDraftWorkbenchState(
    defaultFile,
    draft,
  );
  const gauge = getHeatCapacityGaugePressureState(
    pressureDeltaKPa,
    true,
    appliedFile,
  );
  return {
    status: gauge.pressureSafetyStatus,
    blocked: gauge.pressureBlockedPumping,
    message: gauge.pressureSafetyMessage,
  };
};

const workbenchVisibleMetric = (
  file: WorkbenchHeatCapacityState,
) => ({
  hardSphereViewEnabled: file.hardSphereViewEnabled,
  sceneLayerShouldMount: file.hardSphereViewEnabled,
});

const impactRows: ImpactRow[] = [];

const registerDraftImpact = (
  id: keyof HeatCapacityFreeParameterDraft,
  group: string,
  scenario: string,
  surface: string,
  variantValue: HeatCapacityFreeParameterDraft[typeof id],
  metric: (draft: HeatCapacityFreeParameterDraft) => ImpactMetric,
  baseDraft = defaultDraft,
) => {
  const variantDraft = createDraft({ [id]: variantValue } as Partial<HeatCapacityFreeParameterDraft>, baseDraft);
  assertOnlyDraftKeysChanged(baseDraft, variantDraft, [id]);
  assertMetricChanged(impactRows, {
    id,
    group,
    scenario,
    surface,
    baseMetric: metric(baseDraft),
    variantMetric: metric(variantDraft),
  });
};

registerDraftImpact(
  'ambientPressureKPa',
  'environment baseline',
  'result processing uses the configured atmospheric pressure',
  'processing result gamma and P0 display',
  90,
  resultGammaMetric,
);

registerDraftImpact(
  'ambientTemperatureK',
  'environment baseline',
  'same pumping and release sequence under a different ambient temperature',
  'free realtime thermal curve',
  310,
  (draft) => runFreeScenario(draft).released.gasTemperatureK,
);

registerDraftImpact(
  'gasWallConductanceWPerK',
  'thermal correction',
  'post-release recovery after the same pump sequence',
  'free realtime gas temperature recovery',
  1.2,
  (draft) => runFreeScenario(draft).recovered.gasTemperatureK,
);

registerDraftImpact(
  'wallAmbientConductanceWPerK',
  'thermal correction',
  'wall heat drains to ambient during recovery',
  'free realtime wall/gas recovery curve',
  2,
  (draft) => runFreeScenario(draft, { recoveryWaitS: 10 }).recovered.wallTemperatureK,
);

registerDraftImpact(
  'gasType',
  'state equation and vessel',
  'same release sequence uses the helium monatomic gas theory value',
  'release pressure and temperature curve',
  'helium',
  (draft) => {
    const released = runFreeScenario(draft).released;
    return {
      gasTemperatureK: released.gasTemperatureK,
      gasAmountRatio: released.gasAmountRatio,
    };
  },
);

registerDraftImpact(
  'wallHeatCapacityJPerK',
  'thermal correction',
  'same pump sequence heats a different wall heat capacity',
  'free realtime wall temperature recovery',
  8,
  (draft) => runFreeScenario(draft, { recoveryWaitS: 10 }).recovered.wallTemperatureK,
);

registerDraftImpact(
  'leakageEnabled',
  'leakage correction',
  'sealed vessel after pumping toggles micro-leakage',
  'free realtime pressure decay',
  false,
  (draft) => runFreeScenario(draft, { sealedWaitS: 20, recoveryWaitS: 1 }).sealed.gasAmountRatio,
);

const leakageRateBaseDraft = createDraft({ leakageEnabled: true });
registerDraftImpact(
  'leakageRatePerS',
  'leakage correction',
  'sealed vessel with leakage enabled changes pressure decay rate',
  'free realtime pressure decay slope',
  0.01,
  (draft) => runFreeScenario(draft, { sealedWaitS: 20, recoveryWaitS: 1 }).sealed.gasAmountRatio,
  leakageRateBaseDraft,
);

const hotLeakingDraft = createDraft({
  leakageEnabled: true,
  leakageRatePerS: 0.02,
});
const hotLeakingApplied = applyHeatCapacityFreeParameterDraftToConfigs(hotLeakingDraft);
const hotLeakingAmbientState = createDefaultFreePhysicsState(hotLeakingApplied.physicsConfig);
const hotLeakingInitial: HeatCapacityFreePhysicsState = {
  ...hotLeakingAmbientState,
  internalEnergyJ: hotLeakingAmbientState.internalEnergyJ! *
    310 /
    hotLeakingApplied.physicsConfig.environment.ambientTemperatureK,
  gasAmountRatio: 1,
  gasTemperatureK: 310,
};
const hotLeakingFinal = stepFreePhysics(
  hotLeakingInitial,
  hotLeakingApplied.physicsConfig,
  {
    pumpValveOpen: false,
    stopcockOpen: false,
  },
  10,
  10,
);
assert.ok(
  hotLeakingFinal.gasAmountRatio < hotLeakingInitial.gasAmountRatio,
  'leakage should move a hot sealed vessel toward pressure equilibrium even when amount ratio starts at 1',
);

const lowDangerDraft = createDraft({ pressureDangerMv: 30 });
assert.equal(
  pumpAcceptanceAtPressure(lowDangerDraft, 103).accepted,
  false,
  'user pressure danger threshold should reject further pumping once the current pressure is already dangerous',
);

const highDangerDraft = createDraft({ pressureDangerMv: 10000 });
assert.equal(
  pumpAcceptanceAtPressure(highDangerDraft, 150).accepted,
  true,
  'raising U_danger should not be blocked by the old fixed 1.45P0 hidden threshold',
);
assert.equal(
  pumpAcceptanceAtPressure(highDangerDraft, 299, 1000).accepted,
  false,
  'extreme pressure hard cap should still reject a stroke that would exceed 300 kPa absolute pressure',
);

registerDraftImpact(
  'instrumentNoiseEnabled',
  'sensor and disturbance',
  'same seeded ambient samples switch instrument noise on/off',
  'realtime pressure and temperature jitter',
  false,
  (draft) => runFreeScenario(draft, { pumpStrokes: 1, sealedWaitS: 1, recoveryWaitS: 1 }).pumped.displayPressureMv,
);

registerDraftImpact(
  'noiseMv',
  'sensor and disturbance',
  'same seeded samples use a different noise amplitude',
  'realtime pressure and temperature jitter amplitude',
  0.2,
  (draft) => runFreeScenario(draft, { pumpStrokes: 1, sealedWaitS: 1, recoveryWaitS: 1 }).pumped.displayTemperatureMv,
);

registerDraftImpact(
  'sensorLagTimeS',
  'sensor and disturbance',
  'same sudden pressure step uses a different sensor response time',
  'realtime pressure response lag',
  1,
  (draft) => runFreeScenario(draft, { pumpStrokes: 3, sealedWaitS: 0.5, recoveryWaitS: 1 }).pumped.displayPressureMv,
);

registerDraftImpact(
  'u0ZeroToleranceMv',
  'record decision',
  'U0 is attempted near the zero tolerance boundary',
  'record button readiness and blocked reason',
  0.05,
  (draft) => {
    const applied = applyHeatCapacityFreeParameterDraftToConfigs(draft);
    return evaluateFreeU0Record(
      createHeatCapacityFreeTrial('u0-impact'),
      defaultCalibration,
      {
        displayPressureMv: 0.1,
        displayTemperatureMv: 1500,
        pressureSlopeMvPerS: 0,
        temperatureSlopeMvPerS: 0,
      },
      createRecordPhysics({
        lastStopcockOpenedAtS: 0,
        lastStopcockClosedAtS: null,
      }),
      applied.recordConfig,
    );
  },
);

registerDraftImpact(
  'overVentedMinimumU2CorrectedMv',
  'record decision',
  'U2 is attempted near the over-vented lower boundary',
  'U2 record button readiness and blocked reason',
  0.5,
  (draft) => {
    const applied = applyHeatCapacityFreeParameterDraftToConfigs(draft);
    return evaluateFreeU2Record(
      createTrialReadyForU2(0, 120),
      defaultCalibration,
      {
        displayPressureMv: 0.3,
        displayTemperatureMv: 1500,
        pressureSlopeMvPerS: 0,
        temperatureSlopeMvPerS: 0,
      },
      createRecordPhysics({
        releaseStarted: true,
        releaseReference: {
          pressureBeforeKPa: 107,
          temperatureBeforeK: 298,
          amountBeforeRatio: 1.05,
          openedAtS: 10,
          reachedAmbientAtS: 10.1,
        },
        lastStopcockOpenedAtS: 10,
        lastStopcockClosedAtS: 10.2,
      }),
      applied.recordConfig,
    );
  },
);

registerDraftImpact(
  'pressureStableSlopeMvPerS',
  'record decision',
  'U0 is attempted with pressure slope between the old and new limits',
  'zero record button readiness and blocked reason',
  0.1,
  (draft) => {
    const applied = applyHeatCapacityFreeParameterDraftToConfigs(draft);
    return evaluateFreeU0Record(
      createHeatCapacityFreeTrial('u0-pressure-slope-impact'),
      defaultCalibration,
      {
        displayPressureMv: 0.02,
        displayTemperatureMv: 1500,
        pressureSlopeMvPerS: 0.2,
        temperatureSlopeMvPerS: 0,
      },
      createRecordPhysics({
        lastStopcockOpenedAtS: 0,
        lastStopcockClosedAtS: null,
      }),
      applied.recordConfig,
    );
  },
);

registerDraftImpact(
  'temperatureStableSlopeMvPerS',
  'record decision',
  'U0 is attempted with temperature slope between the old and new limits',
  'zero record button readiness and blocked reason',
  0.05,
  (draft) => {
    const applied = applyHeatCapacityFreeParameterDraftToConfigs(draft);
    return evaluateFreeU0Record(
      createHeatCapacityFreeTrial('u0-temperature-slope-impact'),
      defaultCalibration,
      {
        displayPressureMv: 0.02,
    displayTemperatureMv: 1500,
        pressureSlopeMvPerS: 0,
        temperatureSlopeMvPerS: 0.1,
      },
      createRecordPhysics({
        lastStopcockOpenedAtS: 0,
        lastStopcockClosedAtS: null,
      }),
      applied.recordConfig,
    );
  },
);

registerDraftImpact(
  'pressureWarningMv',
  'pressure safety',
  'same gauge pressure is moved across the warning threshold',
  'right realtime safety state and warning message',
  130,
  (draft) => warningMetric(draft, 6.25),
);

registerDraftImpact(
  'pressureDangerMv',
  'pressure safety',
  'same gauge pressure is moved across the danger threshold',
  'right realtime safety state and pump blocking',
  160,
  (draft) => warningMetric(draft, 7.1),
);

const baseViewFile = createDefaultHeatCapacityFile(1);
const variantViewFile = {
  ...baseViewFile,
  hardSphereViewEnabled: true,
};
assertMetricChanged(impactRows, {
  id: 'hardSphereViewEnabled',
  group: 'visualization',
  scenario: 'the user toggles the hard-sphere visualization switch',
  surface: '3D particle layer mount state',
  baseMetric: workbenchVisibleMetric(baseViewFile),
  variantMetric: workbenchVisibleMetric(variantViewFile),
});

assert.equal(
  impactRows.length,
  18,
  'impact audit should cover every Heat Capacity Free parameter that still has immediate model, sensor, safety, zeroing, or visualization impact',
);

console.log(`heatCapacityFreeParameterImpact tests passed (${impactRows.length} parameters, no no-impact variables)`);
