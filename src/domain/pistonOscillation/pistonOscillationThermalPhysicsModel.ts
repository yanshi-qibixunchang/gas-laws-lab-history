import {
  PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  PISTON_OSCILLATION_FINITE_THERMAL_EXTENSION_MODEL_VERSION,
  PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3,
  PISTON_OSCILLATION_SENSOR_MAX_PRESSURE_KPA,
  PISTON_OSCILLATION_SENSOR_MIN_PRESSURE_KPA,
  PISTON_OSCILLATION_STANDARD_GRAVITY_M_PER_S2,
  PISTON_OSCILLATION_THERMAL_PHYSICS_MODEL_VERSION,
  PISTON_OSCILLATION_THERMODYNAMIC_STATE_SCHEMA_VERSION,
  PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K,
  createPistonOscillationLoadedEquilibriumState,
  getPistonCylinderAreaM2,
  normalizePistonOscillationPhysicsConfig,
  type PistonOscillationFiniteThermalExtensionState,
  type PistonOscillationPhysicsConfig,
  type PistonOscillationReleaseInput,
  type PistonOscillationThermodynamicState,
  type PistonOscillationTrajectory,
  type PistonOscillationTrajectorySample,
} from './pistonOscillationPhysicsEngine.ts';
import {
  normalizePistonOscillationVirtualHandConfig,
  type PistonOscillationVirtualHandConfig,
} from './pistonOscillationVirtualHandModel.ts';

export const PISTON_OSCILLATION_THERMAL_MODEL_CONFIG_VERSION =
  'piston-oscillation-single-temperature-candidate-config-v1' as const;

export interface PistonOscillationThermalModelConfig {
  modelVersion: typeof PISTON_OSCILLATION_THERMAL_MODEL_CONFIG_VERSION;
  relaxationTimeAtReferenceHeightS: number;
  referenceGraduatedHeightM: number;
  volumeExponent: number;
}

/**
 * Candidate identified from the repository's four-run waveform study. These
 * values are not claimed as apparatus-certified constants: tau is 50 ms at a
 * 50 mm graduated height and scales linearly with total sealed volume.
 */
export const DEFAULT_PISTON_OSCILLATION_THERMAL_MODEL_CONFIG:
PistonOscillationThermalModelConfig = Object.freeze({
  modelVersion: PISTON_OSCILLATION_THERMAL_MODEL_CONFIG_VERSION,
  relaxationTimeAtReferenceHeightS: 0.05,
  referenceGraduatedHeightM: 0.05,
  volumeExponent: 1,
});

const MAXIMUM_INTEGRATION_STEP_S = 1 / 12_000;
const MINIMUM_INTEGRATION_STEPS_PER_PERIOD = 240;

const assertFinite = (name: string, value: number) => {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite.`);
  }
  return value;
};

const assertFiniteRange = (
  name: string,
  value: number,
  minimum: number,
  maximum: number,
) => {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be between ${minimum} and ${maximum}.`);
  }
  return value;
};

export const normalizePistonOscillationThermalModelConfig = (
  input: Partial<PistonOscillationThermalModelConfig> = {},
): PistonOscillationThermalModelConfig => ({
  modelVersion: PISTON_OSCILLATION_THERMAL_MODEL_CONFIG_VERSION,
  relaxationTimeAtReferenceHeightS: assertFiniteRange(
    'relaxationTimeAtReferenceHeightS',
    input.relaxationTimeAtReferenceHeightS
      ?? DEFAULT_PISTON_OSCILLATION_THERMAL_MODEL_CONFIG
        .relaxationTimeAtReferenceHeightS,
    0.001,
    5,
  ),
  referenceGraduatedHeightM: assertFiniteRange(
    'referenceGraduatedHeightM',
    input.referenceGraduatedHeightM
      ?? DEFAULT_PISTON_OSCILLATION_THERMAL_MODEL_CONFIG.referenceGraduatedHeightM,
    0,
    0.08,
  ),
  volumeExponent: assertFiniteRange(
    'volumeExponent',
    input.volumeExponent
      ?? DEFAULT_PISTON_OSCILLATION_THERMAL_MODEL_CONFIG.volumeExponent,
    0,
    3,
  ),
});

const createThermalExtension = (
  config: PistonOscillationThermalModelConfig,
  wallTemperatureK: number,
  cumulativeHeatTransferJ: number,
): PistonOscillationFiniteThermalExtensionState => ({
  modelVersion: PISTON_OSCILLATION_FINITE_THERMAL_EXTENSION_MODEL_VERSION,
  enabled: true,
  wallTemperatureK,
  cumulativeHeatTransferJ,
  relaxationTimeAtReferenceHeightS: config.relaxationTimeAtReferenceHeightS,
  referenceGraduatedHeightM: config.referenceGraduatedHeightM,
  volumeExponent: config.volumeExponent,
  provenance: 'identified-candidate',
});

const createThermalConfigFromState = (
  state: PistonOscillationThermodynamicState,
): PistonOscillationThermalModelConfig | null => state.thermal.enabled
  ? normalizePistonOscillationThermalModelConfig({
      relaxationTimeAtReferenceHeightS:
        state.thermal.relaxationTimeAtReferenceHeightS,
      referenceGraduatedHeightM: state.thermal.referenceGraduatedHeightM,
      volumeExponent: state.thermal.volumeExponent,
    })
  : null;

const getVolumeM3 = (pistonHeightM: number) => (
  PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3
  + getPistonCylinderAreaM2(PISTON_OSCILLATION_CYLINDER_DIAMETER_M)
    * pistonHeightM
);

export const getPistonOscillationThermalRelaxationTimeS = (
  totalVolumeM3: number,
  configInput: Partial<PistonOscillationThermalModelConfig> = {},
) => {
  const config = normalizePistonOscillationThermalModelConfig(configInput);
  const normalizedVolumeM3 = assertFiniteRange(
    'totalVolumeM3',
    totalVolumeM3,
    Number.MIN_VALUE,
    1,
  );
  const referenceVolumeM3 = getVolumeM3(config.referenceGraduatedHeightM);
  return config.relaxationTimeAtReferenceHeightS
    * (normalizedVolumeM3 / referenceVolumeM3) ** config.volumeExponent;
};

const createThermodynamicState = (input: {
  nominalLockedHeightM: number;
  pistonHeightM: number;
  velocityMPerS: number;
  gasAmountMol: number;
  temperatureK: number;
  cumulativeHeatTransferJ: number;
  physicsConfig: PistonOscillationPhysicsConfig;
  thermalConfig: PistonOscillationThermalModelConfig;
}): PistonOscillationThermodynamicState => {
  const pistonHeightM = assertFiniteRange('pistonHeightM', input.pistonHeightM, 0, 0.2);
  const totalVolumeM3 = getVolumeM3(pistonHeightM);
  const temperatureK = assertFiniteRange('temperatureK', input.temperatureK, 1, 2_000);
  const gasAmountMol = assertFiniteRange('gasAmountMol', input.gasAmountMol, 1e-12, 10);
  const molarHeatCapacityAtConstantVolumeJPerMolK =
    PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K
    / (input.physicsConfig.gamma - 1);
  const pressurePa = gasAmountMol
    * PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K
    * temperatureK
    / totalVolumeM3;
  return {
    schemaVersion: PISTON_OSCILLATION_THERMODYNAMIC_STATE_SCHEMA_VERSION,
    modelVersion: PISTON_OSCILLATION_THERMAL_PHYSICS_MODEL_VERSION,
    phase: 'sealed-loaded',
    nominalLockedHeightM: assertFiniteRange(
      'nominalLockedHeightM',
      input.nominalLockedHeightM,
      0,
      0.08,
    ),
    pistonHeightM,
    velocityMPerS: assertFinite('velocityMPerS', input.velocityMPerS),
    graduatedCylinderVolumeM3: totalVolumeM3
      - PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3,
    sealedDeadVolumeM3: PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3,
    totalVolumeM3,
    gasAmountMol,
    molarHeatCapacityAtConstantVolumeJPerMolK,
    internalEnergyJ: gasAmountMol
      * molarHeatCapacityAtConstantVolumeJPerMolK
      * temperatureK,
    pressurePa,
    temperatureK,
    settlingProgress: 1,
    thermal: createThermalExtension(
      input.thermalConfig,
      input.physicsConfig.ambientTemperatureK,
      assertFinite('cumulativeHeatTransferJ', input.cumulativeHeatTransferJ),
    ),
  };
};

interface ThermalEnergyDerivative {
  temperatureRateKPerS: number;
  heatTransferRateW: number;
}

const getThermalEnergyDerivative = (input: {
  temperatureK: number;
  totalVolumeM3: number;
  volumeRateM3PerS: number;
  gasAmountMol: number;
  physicsConfig: PistonOscillationPhysicsConfig;
  thermalConfig: PistonOscillationThermalModelConfig;
}): ThermalEnergyDerivative => {
  const relaxationTimeS = getPistonOscillationThermalRelaxationTimeS(
    input.totalVolumeM3,
    input.thermalConfig,
  );
  const temperatureRateFromWorkKPerS = -(
    input.physicsConfig.gamma - 1
  ) * input.temperatureK * input.volumeRateM3PerS / input.totalVolumeM3;
  const temperatureRateFromHeatKPerS = (
    input.physicsConfig.ambientTemperatureK - input.temperatureK
  ) / relaxationTimeS;
  const molarHeatCapacityAtConstantVolumeJPerMolK =
    PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K
    / (input.physicsConfig.gamma - 1);
  return {
    temperatureRateKPerS:
      temperatureRateFromWorkKPerS + temperatureRateFromHeatKPerS,
    heatTransferRateW: input.gasAmountMol
      * molarHeatCapacityAtConstantVolumeJPerMolK
      * temperatureRateFromHeatKPerS,
  };
};

/**
 * Advances the single gas temperature along the user's prescribed piston
 * path. At fixed height the same function performs only thermal relaxation.
 */
export const advancePistonOscillationPrescribedThermodynamicState = (input: {
  referenceState: PistonOscillationThermodynamicState;
  pistonHeightMm: number;
  elapsedS: number;
  velocityMmPerS?: number;
  physicsConfig?: Partial<PistonOscillationPhysicsConfig>;
  thermalConfig?: Partial<PistonOscillationThermalModelConfig>;
}): PistonOscillationThermodynamicState => {
  const physicsConfig = normalizePistonOscillationPhysicsConfig(input.physicsConfig);
  const inheritedThermalConfig = createThermalConfigFromState(input.referenceState);
  const thermalConfig = normalizePistonOscillationThermalModelConfig(
    input.thermalConfig ?? inheritedThermalConfig ?? {},
  );
  const elapsedS = assertFiniteRange('elapsedS', input.elapsedS, 0, 60);
  const startHeightM = input.referenceState.pistonHeightM;
  const endHeightM = assertFiniteRange('pistonHeightMm', input.pistonHeightMm, 0, 80)
    / 1_000;
  const startVolumeM3 = getVolumeM3(startHeightM);
  const endVolumeM3 = getVolumeM3(endHeightM);
  const existingHeatTransferJ = input.referenceState.thermal.enabled
    ? input.referenceState.thermal.cumulativeHeatTransferJ
    : 0;
  const velocityMPerS = input.velocityMmPerS === undefined
    ? elapsedS > 0
      ? (endHeightM - startHeightM) / elapsedS
      : 0
    : assertFinite('velocityMmPerS', input.velocityMmPerS) / 1_000;

  if (elapsedS === 0) {
    const compressionRatio = startVolumeM3 / endVolumeM3;
    return createThermodynamicState({
      nominalLockedHeightM: input.referenceState.nominalLockedHeightM,
      pistonHeightM: endHeightM,
      velocityMPerS,
      gasAmountMol: input.referenceState.gasAmountMol,
      temperatureK: input.referenceState.temperatureK
        * compressionRatio ** (physicsConfig.gamma - 1),
      cumulativeHeatTransferJ: existingHeatTransferJ,
      physicsConfig,
      thermalConfig,
    });
  }

  const volumeRateM3PerS = (endVolumeM3 - startVolumeM3) / elapsedS;
  const substepCount = Math.max(1, Math.ceil(elapsedS / MAXIMUM_INTEGRATION_STEP_S));
  const dtS = elapsedS / substepCount;
  let temperatureK = input.referenceState.temperatureK;
  let cumulativeHeatTransferJ = existingHeatTransferJ;
  const derivativeAt = (candidateTemperatureK: number, elapsedWithinStepS: number) => {
    const totalElapsedS = elapsedWithinStepS;
    const totalVolumeM3 = startVolumeM3 + volumeRateM3PerS * totalElapsedS;
    return getThermalEnergyDerivative({
      temperatureK: candidateTemperatureK,
      totalVolumeM3,
      volumeRateM3PerS,
      gasAmountMol: input.referenceState.gasAmountMol,
      physicsConfig,
      thermalConfig,
    });
  };
  for (let stepIndex = 0; stepIndex < substepCount; stepIndex += 1) {
    const stepStartS = stepIndex * dtS;
    const k1 = derivativeAt(temperatureK, stepStartS);
    const k2 = derivativeAt(
      temperatureK + k1.temperatureRateKPerS * dtS / 2,
      stepStartS + dtS / 2,
    );
    const k3 = derivativeAt(
      temperatureK + k2.temperatureRateKPerS * dtS / 2,
      stepStartS + dtS / 2,
    );
    const k4 = derivativeAt(
      temperatureK + k3.temperatureRateKPerS * dtS,
      stepStartS + dtS,
    );
    temperatureK += dtS / 6 * (
      k1.temperatureRateKPerS
      + 2 * k2.temperatureRateKPerS
      + 2 * k3.temperatureRateKPerS
      + k4.temperatureRateKPerS
    );
    cumulativeHeatTransferJ += dtS / 6 * (
      k1.heatTransferRateW
      + 2 * k2.heatTransferRateW
      + 2 * k3.heatTransferRateW
      + k4.heatTransferRateW
    );
  }
  return createThermodynamicState({
    nominalLockedHeightM: input.referenceState.nominalLockedHeightM,
    pistonHeightM: endHeightM,
    velocityMPerS,
    gasAmountMol: input.referenceState.gasAmountMol,
    temperatureK,
    cumulativeHeatTransferJ,
    physicsConfig,
    thermalConfig,
  });
};

interface ThermalMotionState {
  displacementM: number;
  velocityMPerS: number;
  temperatureK: number;
  cumulativeHeatTransferJ: number;
}

interface ThermalMotionDerivative {
  displacementRateMPerS: number;
  velocityRateMPerS2: number;
  temperatureRateKPerS: number;
  heatTransferRateW: number;
}

const addDerivative = (
  state: ThermalMotionState,
  derivative: ThermalMotionDerivative,
  scaleS: number,
): ThermalMotionState => ({
  displacementM: state.displacementM + derivative.displacementRateMPerS * scaleS,
  velocityMPerS: state.velocityMPerS + derivative.velocityRateMPerS2 * scaleS,
  temperatureK: state.temperatureK + derivative.temperatureRateKPerS * scaleS,
  cumulativeHeatTransferJ:
    state.cumulativeHeatTransferJ + derivative.heatTransferRateW * scaleS,
});

const getMotionDerivative = (input: {
  state: ThermalMotionState;
  equilibriumHeightM: number;
  gasAmountMol: number;
  physicsConfig: PistonOscillationPhysicsConfig;
  thermalConfig: PistonOscillationThermalModelConfig;
  virtualHand?: {
    targetDownwardDisplacementM: number;
    stiffnessNPerM: number;
  };
}): ThermalMotionDerivative => {
  const pistonHeightM = input.equilibriumHeightM + input.state.displacementM;
  if (!Number.isFinite(pistonHeightM) || pistonHeightM < 0) {
    throw new RangeError('The piston motion cannot pass below the 0 mm stop.');
  }
  const cylinderAreaM2 = getPistonCylinderAreaM2(
    PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  );
  const totalVolumeM3 = getVolumeM3(pistonHeightM);
  const pressurePa = input.gasAmountMol
    * PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K
    * input.state.temperatureK
    / totalVolumeM3;
  const pressureForceN = cylinderAreaM2
    * (pressurePa - input.physicsConfig.ambientPressurePa);
  const gravityForceN = input.physicsConfig.movingMassKg
    * PISTON_OSCILLATION_STANDARD_GRAVITY_M_PER_S2;
  const dampingForceN = input.physicsConfig.linearDampingNsPerM
    * input.state.velocityMPerS;
  const downwardDisplacementM = input.equilibriumHeightM - pistonHeightM;
  const virtualHandForceN = input.virtualHand
    ? input.virtualHand.stiffnessNPerM * Math.max(
        0,
        input.virtualHand.targetDownwardDisplacementM - downwardDisplacementM,
      )
    : 0;
  const thermalDerivative = getThermalEnergyDerivative({
    temperatureK: input.state.temperatureK,
    totalVolumeM3,
    volumeRateM3PerS: cylinderAreaM2 * input.state.velocityMPerS,
    gasAmountMol: input.gasAmountMol,
    physicsConfig: input.physicsConfig,
    thermalConfig: input.thermalConfig,
  });
  const derivative = {
    displacementRateMPerS: input.state.velocityMPerS,
    velocityRateMPerS2: (
      pressureForceN - gravityForceN - dampingForceN - virtualHandForceN
    ) / input.physicsConfig.movingMassKg,
    ...thermalDerivative,
  };
  for (const value of Object.values(derivative)) assertFinite('motion derivative', value);
  return derivative;
};

const stepMotionRungeKutta = (input: {
  state: ThermalMotionState;
  dtS: number;
  equilibriumHeightM: number;
  gasAmountMol: number;
  physicsConfig: PistonOscillationPhysicsConfig;
  thermalConfig: PistonOscillationThermalModelConfig;
  virtualHand?: {
    targetDownwardDisplacementM: number;
    stiffnessNPerM: number;
  };
}) => {
  const derivative = (state: ThermalMotionState) => getMotionDerivative({
    ...input,
    state,
  });
  const k1 = derivative(input.state);
  const k2 = derivative(addDerivative(input.state, k1, input.dtS / 2));
  const k3 = derivative(addDerivative(input.state, k2, input.dtS / 2));
  const k4 = derivative(addDerivative(input.state, k3, input.dtS));
  return {
    displacementM: input.state.displacementM + input.dtS / 6 * (
      k1.displacementRateMPerS
      + 2 * k2.displacementRateMPerS
      + 2 * k3.displacementRateMPerS
      + k4.displacementRateMPerS
    ),
    velocityMPerS: input.state.velocityMPerS + input.dtS / 6 * (
      k1.velocityRateMPerS2
      + 2 * k2.velocityRateMPerS2
      + 2 * k3.velocityRateMPerS2
      + k4.velocityRateMPerS2
    ),
    temperatureK: input.state.temperatureK + input.dtS / 6 * (
      k1.temperatureRateKPerS
      + 2 * k2.temperatureRateKPerS
      + 2 * k3.temperatureRateKPerS
      + k4.temperatureRateKPerS
    ),
    cumulativeHeatTransferJ: input.state.cumulativeHeatTransferJ + input.dtS / 6 * (
      k1.heatTransferRateW
      + 2 * k2.heatTransferRateW
      + 2 * k3.heatTransferRateW
      + k4.heatTransferRateW
    ),
  } satisfies ThermalMotionState;
};

export interface PistonOscillationVirtualHandPressInput {
  referenceState: PistonOscillationThermodynamicState;
  equilibriumHeightMm: number;
  targetDownwardDisplacementMm: number;
  elapsedS: number;
}

/**
 * Advances the piston, gas temperature, and heat-transfer state while a
 * compliant virtual pair of hands presses downward. The mouse supplies only
 * the preferred hand position; the piston position remains a force-balance
 * result and is never assigned directly by the interaction layer.
 */
export const advancePistonOscillationVirtualHandThermodynamicState = (
  input: PistonOscillationVirtualHandPressInput,
  physicsConfigInput: Partial<PistonOscillationPhysicsConfig> = {},
  thermalConfigInput?: Partial<PistonOscillationThermalModelConfig>,
  virtualHandConfigInput: Partial<PistonOscillationVirtualHandConfig> = {},
): PistonOscillationThermodynamicState => {
  const physicsConfig = normalizePistonOscillationPhysicsConfig(physicsConfigInput);
  const inheritedThermalConfig = createThermalConfigFromState(input.referenceState);
  const thermalConfig = normalizePistonOscillationThermalModelConfig(
    thermalConfigInput ?? inheritedThermalConfig ?? {},
  );
  const virtualHandConfig = normalizePistonOscillationVirtualHandConfig(
    virtualHandConfigInput,
  );
  const elapsedS = assertFiniteRange('elapsedS', input.elapsedS, 0, 60);
  const equilibriumHeightM = assertFiniteRange(
    'equilibriumHeightMm',
    input.equilibriumHeightMm,
    0,
    80,
  ) / 1_000;
  const targetDownwardDisplacementM = assertFiniteRange(
    'targetDownwardDisplacementMm',
    input.targetDownwardDisplacementMm,
    0,
    80,
  ) / 1_000;
  const existingHeatTransferJ = input.referenceState.thermal.enabled
    ? input.referenceState.thermal.cumulativeHeatTransferJ
    : 0;
  let state: ThermalMotionState = {
    displacementM: input.referenceState.pistonHeightM - equilibriumHeightM,
    velocityMPerS: input.referenceState.velocityMPerS,
    temperatureK: input.referenceState.temperatureK,
    cumulativeHeatTransferJ: existingHeatTransferJ,
  };
  if (equilibriumHeightM + state.displacementM < 0) {
    throw new RangeError('The pressed piston position cannot move below 0 mm.');
  }
  if (elapsedS > 0) {
    const cylinderAreaM2 = getPistonCylinderAreaM2(
      PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
    );
    const localGasStiffnessNPerM = physicsConfig.gamma
      * input.referenceState.pressurePa
      * cylinderAreaM2 ** 2
      / input.referenceState.totalVolumeM3;
    const localAngularFrequencyRadPerS = Math.sqrt(
      (virtualHandConfig.handStiffnessNPerM + localGasStiffnessNPerM)
      / physicsConfig.movingMassKg,
    );
    const periodLimitedStepS = 1 / (
      localAngularFrequencyRadPerS / (2 * Math.PI)
      * MINIMUM_INTEGRATION_STEPS_PER_PERIOD
    );
    const dampingLimitedStepS = physicsConfig.linearDampingNsPerM > 0
      ? physicsConfig.movingMassKg / (physicsConfig.linearDampingNsPerM * 50)
      : Number.POSITIVE_INFINITY;
    const maximumStepS = Math.min(
      MAXIMUM_INTEGRATION_STEP_S,
      periodLimitedStepS,
      dampingLimitedStepS,
    );
    const substepCount = Math.max(1, Math.ceil(elapsedS / maximumStepS));
    const dtS = elapsedS / substepCount;
    for (let substep = 0; substep < substepCount; substep += 1) {
      state = stepMotionRungeKutta({
        state,
        dtS,
        equilibriumHeightM,
        gasAmountMol: input.referenceState.gasAmountMol,
        physicsConfig,
        thermalConfig,
        virtualHand: {
          targetDownwardDisplacementM,
          stiffnessNPerM: virtualHandConfig.handStiffnessNPerM,
        },
      });
    }
  }
  return createThermodynamicState({
    nominalLockedHeightM: input.referenceState.nominalLockedHeightM,
    pistonHeightM: equilibriumHeightM + state.displacementM,
    velocityMPerS: state.velocityMPerS,
    gasAmountMol: input.referenceState.gasAmountMol,
    temperatureK: state.temperatureK,
    cumulativeHeatTransferJ: state.cumulativeHeatTransferJ,
    physicsConfig,
    thermalConfig,
  });
};

const createTrajectorySample = (input: {
  timeS: number;
  state: ThermalMotionState;
  equilibriumHeightM: number;
  gasAmountMol: number;
}): PistonOscillationTrajectorySample => {
  const totalVolumeM3 = getVolumeM3(
    input.equilibriumHeightM + input.state.displacementM,
  );
  return {
    timeS: input.timeS,
    displacementM: input.state.displacementM,
    velocityMPerS: input.state.velocityMPerS,
    pressurePa: input.gasAmountMol
      * PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K
      * input.state.temperatureK
      / totalVolumeM3,
    temperatureK: input.state.temperatureK,
    cumulativeHeatTransferJ: input.state.cumulativeHeatTransferJ,
  };
};

export interface PistonOscillationThermalReleaseInput
  extends PistonOscillationReleaseInput {
  referenceThermodynamicState: PistonOscillationThermodynamicState;
}

export const simulatePistonOscillationThermalRelease = (
  input: PistonOscillationThermalReleaseInput,
  physicsConfigInput: Partial<PistonOscillationPhysicsConfig> = {},
  thermalConfigInput?: Partial<PistonOscillationThermalModelConfig>,
): PistonOscillationTrajectory => {
  const physicsConfig = normalizePistonOscillationPhysicsConfig(physicsConfigInput);
  const inheritedThermalConfig = createThermalConfigFromState(
    input.referenceThermodynamicState,
  );
  const thermalConfig = normalizePistonOscillationThermalModelConfig(
    thermalConfigInput ?? inheritedThermalConfig ?? {},
  );
  if (input.lockedHeightMm === undefined) {
    throw new RangeError('lockedHeightMm is required by the thermal release model.');
  }
  const equilibrium = createPistonOscillationLoadedEquilibriumState(
    input.lockedHeightMm,
    physicsConfig,
  );
  const rawInitialDisplacementMm = assertFinite(
    'initialDisplacementMm',
    input.initialDisplacementMm,
  );
  const minimumDisplacementMm = -equilibrium.equilibriumHeightM * 1_000;
  if (
    rawInitialDisplacementMm < minimumDisplacementMm - 1e-9
    || rawInitialDisplacementMm > 1e-9
  ) {
    throw new RangeError(
      `initialDisplacementMm must be between ${minimumDisplacementMm} and 0.`,
    );
  }
  const initialDisplacementMm = Math.min(
    0,
    Math.max(minimumDisplacementMm, rawInitialDisplacementMm),
  );
  const initialPistonHeightM = equilibrium.equilibriumHeightM
    + initialDisplacementMm / 1_000;
  if (initialPistonHeightM < 0) {
    throw new RangeError('The pressed piston position cannot move below 0 mm.');
  }
  if (
    Math.abs(
      input.referenceThermodynamicState.pistonHeightM - initialPistonHeightM,
    ) > 5e-5
  ) {
    throw new RangeError('The release gas state and visible piston position must agree.');
  }
  if (
    Math.abs(
      input.referenceThermodynamicState.gasAmountMol - equilibrium.gasAmountMol,
    ) > equilibrium.gasAmountMol * 1e-7
  ) {
    throw new RangeError('The release gas amount must match the sealed locked state.');
  }
  const initialVelocityMPerS = assertFinite(
    'initialVelocityMmPerS',
    input.initialVelocityMmPerS
      ?? input.referenceThermodynamicState.velocityMPerS * 1_000,
  ) / 1_000;
  const activatedInitialState = createThermodynamicState({
    nominalLockedHeightM: equilibrium.lockedHeightM,
    pistonHeightM: initialPistonHeightM,
    velocityMPerS: initialVelocityMPerS,
    gasAmountMol: input.referenceThermodynamicState.gasAmountMol,
    temperatureK: input.referenceThermodynamicState.temperatureK,
    cumulativeHeatTransferJ: input.referenceThermodynamicState.thermal.enabled
      ? input.referenceThermodynamicState.thermal.cumulativeHeatTransferJ
      : 0,
    physicsConfig,
    thermalConfig,
  });
  const initialEffectiveGasHeightM = activatedInitialState.totalVolumeM3
    / equilibrium.cylinderAreaM2;
  const initialAngularFrequencyRadPerS = Math.sqrt(
    physicsConfig.gamma
      * activatedInitialState.pressurePa
      * equilibrium.cylinderAreaM2
      / (physicsConfig.movingMassKg * initialEffectiveGasHeightM),
  );
  const periodLimitedStepS = 1 / (
    initialAngularFrequencyRadPerS / (2 * Math.PI)
    * MINIMUM_INTEGRATION_STEPS_PER_PERIOD
  );
  const dampingLimitedStepS = physicsConfig.linearDampingNsPerM > 0
    ? physicsConfig.movingMassKg / (physicsConfig.linearDampingNsPerM * 50)
    : Number.POSITIVE_INFINITY;
  const maximumStepS = Math.min(
    MAXIMUM_INTEGRATION_STEP_S,
    periodLimitedStepS,
    dampingLimitedStepS,
  );
  const sampleIntervalS = 1 / physicsConfig.sensorSampleRateHz;
  const integrationSubstepsPerSample = Math.max(
    1,
    Math.ceil(sampleIntervalS / maximumStepS),
  );
  const integrationStepS = sampleIntervalS / integrationSubstepsPerSample;
  const sampleCount = Math.floor(
    physicsConfig.trajectoryDurationS * physicsConfig.sensorSampleRateHz,
  ) + 1;
  let state: ThermalMotionState = {
    displacementM: initialDisplacementMm / 1_000,
    velocityMPerS: initialVelocityMPerS,
    temperatureK: activatedInitialState.temperatureK,
    cumulativeHeatTransferJ:
      activatedInitialState.thermal.cumulativeHeatTransferJ,
  };
  const samples: PistonOscillationTrajectorySample[] = [];
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    samples.push(createTrajectorySample({
      timeS: sampleIndex * sampleIntervalS,
      state,
      equilibriumHeightM: equilibrium.equilibriumHeightM,
      gasAmountMol: equilibrium.gasAmountMol,
    }));
    if (sampleIndex === sampleCount - 1) break;
    for (let substep = 0; substep < integrationSubstepsPerSample; substep += 1) {
      state = stepMotionRungeKutta({
        state,
        dtS: integrationStepS,
        equilibriumHeightM: equilibrium.equilibriumHeightM,
        gasAmountMol: equilibrium.gasAmountMol,
        physicsConfig,
        thermalConfig,
      });
    }
  }
  const pressuresKpa = samples.map((sample) => sample.pressurePa / 1_000);
  const minimumPressureKpa = Math.min(...pressuresKpa);
  const maximumPressureKpa = Math.max(...pressuresKpa);
  return {
    modelVersion: PISTON_OSCILLATION_THERMAL_PHYSICS_MODEL_VERSION,
    initialThermodynamicState: activatedInitialState,
    thermalModel: createThermalExtension(
      thermalConfig,
      physicsConfig.ambientTemperatureK,
      activatedInitialState.thermal.cumulativeHeatTransferJ,
    ),
    config: physicsConfig,
    equilibrium,
    initialDisplacementM: initialDisplacementMm / 1_000,
    initialVelocityMPerS,
    sampleRateHz: physicsConfig.sensorSampleRateHz,
    integrationSubstepsPerSample,
    samples,
    diagnostics: {
      minimumPressureKpa,
      maximumPressureKpa,
      withinIdealSensorRange:
        minimumPressureKpa >= PISTON_OSCILLATION_SENSOR_MIN_PRESSURE_KPA
        && maximumPressureKpa <= PISTON_OSCILLATION_SENSOR_MAX_PRESSURE_KPA,
    },
  };
};

export const createPistonOscillationThermodynamicStateFromTrajectorySample = (
  trajectory: PistonOscillationTrajectory,
  sample: PistonOscillationTrajectorySample,
): PistonOscillationThermodynamicState => {
  if (
    trajectory.modelVersion !== PISTON_OSCILLATION_THERMAL_PHYSICS_MODEL_VERSION
    || !trajectory.thermalModel
  ) {
    throw new RangeError('A finite-thermal trajectory is required.');
  }
  return createThermodynamicState({
    nominalLockedHeightM: trajectory.equilibrium.lockedHeightM,
    pistonHeightM: trajectory.equilibrium.equilibriumHeightM + sample.displacementM,
    velocityMPerS: sample.velocityMPerS,
    gasAmountMol: trajectory.equilibrium.gasAmountMol,
    temperatureK: sample.temperatureK,
    cumulativeHeatTransferJ: sample.cumulativeHeatTransferJ
      ?? trajectory.thermalModel.cumulativeHeatTransferJ,
    physicsConfig: trajectory.config,
    thermalConfig: {
      modelVersion: PISTON_OSCILLATION_THERMAL_MODEL_CONFIG_VERSION,
      relaxationTimeAtReferenceHeightS:
        trajectory.thermalModel.relaxationTimeAtReferenceHeightS,
      referenceGraduatedHeightM:
        trajectory.thermalModel.referenceGraduatedHeightM,
      volumeExponent: trajectory.thermalModel.volumeExponent,
    },
  });
};
