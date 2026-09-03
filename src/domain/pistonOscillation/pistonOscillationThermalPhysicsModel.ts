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
  createPistonOscillationAdiabaticStateFromReference,
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
import {
  PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M,
} from './pistonOscillationEquivalentLossModel.ts';
import {
  createPistonOscillationReleaseAsymmetryProfile,
  getPistonOscillationReleaseAsymmetryExtraLinearLossNsPerM,
  type PistonOscillationReleaseAsymmetryConfig,
  type PistonOscillationReleaseAsymmetryInput,
  type PistonOscillationReleaseAsymmetryProfile,
} from './pistonOscillationReleaseAsymmetryModel.ts';

export const PISTON_OSCILLATION_THERMAL_MODEL_CONFIG_VERSION =
  'piston-oscillation-heat-flow-lag-candidate-config-v2' as const;

export interface PistonOscillationThermalModelConfig {
  modelVersion: typeof PISTON_OSCILLATION_THERMAL_MODEL_CONFIG_VERSION;
  relaxationTimeAtReferenceHeightS: number;
  referenceGraduatedHeightM: number;
  volumeExponent: number;
  heatTransferLagTimeS: number;
}

/**
 * Candidate identified from the repository's four-run waveform study. These
 * values are not claimed as apparatus-certified constants: thermal relaxation
 * is 50 ms at a 50 mm graduated height and scales linearly with total sealed
 * volume. WP-T1 adds a review-only 0.9 ms heat-flow establishment time.
 */
export const DEFAULT_PISTON_OSCILLATION_THERMAL_MODEL_CONFIG:
PistonOscillationThermalModelConfig = Object.freeze({
  modelVersion: PISTON_OSCILLATION_THERMAL_MODEL_CONFIG_VERSION,
  relaxationTimeAtReferenceHeightS: 0.05,
  referenceGraduatedHeightM: 0.05,
  volumeExponent: 1,
  heatTransferLagTimeS: 0.0009,
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
  heatTransferLagTimeS: assertFiniteRange(
    'heatTransferLagTimeS',
    input.heatTransferLagTimeS
      ?? DEFAULT_PISTON_OSCILLATION_THERMAL_MODEL_CONFIG.heatTransferLagTimeS,
    0.0005,
    0.05,
  ),
});

const createThermalExtension = (
  config: PistonOscillationThermalModelConfig,
  wallTemperatureK: number,
  cumulativeHeatTransferJ: number,
  heatTransferRateW: number,
): PistonOscillationFiniteThermalExtensionState => ({
  modelVersion: PISTON_OSCILLATION_FINITE_THERMAL_EXTENSION_MODEL_VERSION,
  enabled: true,
  wallTemperatureK,
  cumulativeHeatTransferJ,
  relaxationTimeAtReferenceHeightS: config.relaxationTimeAtReferenceHeightS,
  referenceGraduatedHeightM: config.referenceGraduatedHeightM,
  volumeExponent: config.volumeExponent,
  heatTransferRateW,
  heatTransferLagTimeS: config.heatTransferLagTimeS,
  provenance: 'wp-t1-review-candidate',
});

const createThermalConfigFromState = (
  state: PistonOscillationThermodynamicState,
): PistonOscillationThermalModelConfig | null => state.thermal.enabled
  ? normalizePistonOscillationThermalModelConfig({
      relaxationTimeAtReferenceHeightS:
        state.thermal.relaxationTimeAtReferenceHeightS,
      referenceGraduatedHeightM: state.thermal.referenceGraduatedHeightM,
      volumeExponent: state.thermal.volumeExponent,
      heatTransferLagTimeS:
        state.thermal.modelVersion
          === PISTON_OSCILLATION_FINITE_THERMAL_EXTENSION_MODEL_VERSION
          ? state.thermal.heatTransferLagTimeS
          : DEFAULT_PISTON_OSCILLATION_THERMAL_MODEL_CONFIG.heatTransferLagTimeS,
    })
  : null;

const getVolumeM3 = (pistonHeightM: number) => (
  PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3
  + getPistonCylinderAreaM2(PISTON_OSCILLATION_CYLINDER_DIAMETER_M)
    * pistonHeightM
);

const getThermalRelaxationTimeFromNormalizedConfigS = (
  totalVolumeM3: number,
  config: PistonOscillationThermalModelConfig,
) => {
  const referenceVolumeM3 = getVolumeM3(config.referenceGraduatedHeightM);
  return config.relaxationTimeAtReferenceHeightS
    * (totalVolumeM3 / referenceVolumeM3) ** config.volumeExponent;
};

const getGasHeatCapacityJPerK = (
  gasAmountMol: number,
  physicsConfig: PistonOscillationPhysicsConfig,
) => gasAmountMol
  * PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K
  / (physicsConfig.gamma - 1);

const getTargetHeatTransferRateW = (input: {
  temperatureK: number;
  totalVolumeM3: number;
  gasHeatCapacityJPerK: number;
  physicsConfig: PistonOscillationPhysicsConfig;
  thermalConfig: PistonOscillationThermalModelConfig;
}) => input.gasHeatCapacityJPerK * (
  input.physicsConfig.ambientTemperatureK - input.temperatureK
) / getThermalRelaxationTimeFromNormalizedConfigS(
  input.totalVolumeM3,
  input.thermalConfig,
);

const getInitialHeatTransferRateW = (
  state: PistonOscillationThermodynamicState,
  physicsConfig: PistonOscillationPhysicsConfig,
  thermalConfig: PistonOscillationThermalModelConfig,
) => {
  if (!state.thermal.enabled) return 0;
  if (
    state.thermal.modelVersion
      === PISTON_OSCILLATION_FINITE_THERMAL_EXTENSION_MODEL_VERSION
  ) return state.thermal.heatTransferRateW;
  return getTargetHeatTransferRateW({
    temperatureK: state.temperatureK,
    totalVolumeM3: state.totalVolumeM3,
    gasHeatCapacityJPerK: getGasHeatCapacityJPerK(
      state.gasAmountMol,
      physicsConfig,
    ),
    physicsConfig,
    thermalConfig,
  });
};

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
  return getThermalRelaxationTimeFromNormalizedConfigS(normalizedVolumeM3, config);
};

const createThermodynamicState = (input: {
  nominalLockedHeightM: number;
  pistonHeightM: number;
  velocityMPerS: number;
  gasAmountMol: number;
  temperatureK: number;
  cumulativeHeatTransferJ: number;
  heatTransferRateW: number;
  physicsConfig: PistonOscillationPhysicsConfig;
  thermalConfig: PistonOscillationThermalModelConfig;
}): PistonOscillationThermodynamicState => {
  const pistonHeightM = assertFiniteRange('pistonHeightM', input.pistonHeightM, 0, 0.2);
  const graduatedCylinderVolumeM3 = getPistonCylinderAreaM2(
    PISTON_OSCILLATION_CYLINDER_DIAMETER_M,
  ) * pistonHeightM;
  const totalVolumeM3 = graduatedCylinderVolumeM3
    + PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3;
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
    graduatedCylinderVolumeM3,
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
      assertFinite('heatTransferRateW', input.heatTransferRateW),
    ),
  };
};

interface ThermalEnergyDerivative {
  temperatureRateKPerS: number;
  heatTransferRateW: number;
  heatTransferRateRateWPerS: number;
}

const getThermalEnergyDerivative = (input: {
  temperatureK: number;
  totalVolumeM3: number;
  volumeRateM3PerS: number;
  gasAmountMol: number;
  heatTransferRateW: number;
  physicsConfig: PistonOscillationPhysicsConfig;
  thermalConfig: PistonOscillationThermalModelConfig;
}): ThermalEnergyDerivative => {
  // The enclosing press/release operation normalized this immutable config
  // once. Revalidating and reallocating it for every RK4 derivative made a
  // release block the UI without changing any physical result.
  const temperatureRateFromWorkKPerS = -(
    input.physicsConfig.gamma - 1
  ) * input.temperatureK * input.volumeRateM3PerS / input.totalVolumeM3;
  const gasHeatCapacityJPerK = getGasHeatCapacityJPerK(
    input.gasAmountMol,
    input.physicsConfig,
  );
  const targetHeatTransferRateW = getTargetHeatTransferRateW({
    temperatureK: input.temperatureK,
    totalVolumeM3: input.totalVolumeM3,
    gasHeatCapacityJPerK,
    physicsConfig: input.physicsConfig,
    thermalConfig: input.thermalConfig,
  });
  return {
    temperatureRateKPerS:
      temperatureRateFromWorkKPerS
      + input.heatTransferRateW / gasHeatCapacityJPerK,
    heatTransferRateW: input.heatTransferRateW,
    heatTransferRateRateWPerS: (
      targetHeatTransferRateW - input.heatTransferRateW
    ) / input.thermalConfig.heatTransferLagTimeS,
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
  adiabatic?: boolean;
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
  const existingHeatTransferRateW = getInitialHeatTransferRateW(
    input.referenceState,
    physicsConfig,
    thermalConfig,
  );
  const velocityMPerS = input.velocityMmPerS === undefined
    ? elapsedS > 0
      ? (endHeightM - startHeightM) / elapsedS
      : 0
    : assertFinite('velocityMmPerS', input.velocityMmPerS) / 1_000;

  if (input.adiabatic) {
    return createPistonOscillationAdiabaticStateFromReference(
      input.referenceState,
      endHeightM * 1_000,
      velocityMPerS * 1_000,
      physicsConfig,
    );
  }

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
      heatTransferRateW: existingHeatTransferRateW,
      physicsConfig,
      thermalConfig,
    });
  }

  const volumeRateM3PerS = (endVolumeM3 - startVolumeM3) / elapsedS;
  const maximumStepS = Math.min(
    MAXIMUM_INTEGRATION_STEP_S,
    thermalConfig.heatTransferLagTimeS / 8,
  );
  const substepCount = Math.max(1, Math.ceil(elapsedS / maximumStepS));
  const dtS = elapsedS / substepCount;
  let temperatureK = input.referenceState.temperatureK;
  let cumulativeHeatTransferJ = existingHeatTransferJ;
  let heatTransferRateW = existingHeatTransferRateW;
  const derivativeAt = (
    candidateTemperatureK: number,
    candidateHeatTransferRateW: number,
    elapsedWithinStepS: number,
  ) => {
    const totalElapsedS = elapsedWithinStepS;
    const totalVolumeM3 = startVolumeM3 + volumeRateM3PerS * totalElapsedS;
    return getThermalEnergyDerivative({
      temperatureK: candidateTemperatureK,
      totalVolumeM3,
      volumeRateM3PerS,
      gasAmountMol: input.referenceState.gasAmountMol,
      heatTransferRateW: candidateHeatTransferRateW,
      physicsConfig,
      thermalConfig,
    });
  };
  for (let stepIndex = 0; stepIndex < substepCount; stepIndex += 1) {
    const stepStartS = stepIndex * dtS;
    const k1 = derivativeAt(temperatureK, heatTransferRateW, stepStartS);
    const k2 = derivativeAt(
      temperatureK + k1.temperatureRateKPerS * dtS / 2,
      heatTransferRateW + k1.heatTransferRateRateWPerS * dtS / 2,
      stepStartS + dtS / 2,
    );
    const k3 = derivativeAt(
      temperatureK + k2.temperatureRateKPerS * dtS / 2,
      heatTransferRateW + k2.heatTransferRateRateWPerS * dtS / 2,
      stepStartS + dtS / 2,
    );
    const k4 = derivativeAt(
      temperatureK + k3.temperatureRateKPerS * dtS,
      heatTransferRateW + k3.heatTransferRateRateWPerS * dtS,
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
    heatTransferRateW += dtS / 6 * (
      k1.heatTransferRateRateWPerS
      + 2 * k2.heatTransferRateRateWPerS
      + 2 * k3.heatTransferRateRateWPerS
      + k4.heatTransferRateRateWPerS
    );
  }
  return createThermodynamicState({
    nominalLockedHeightM: input.referenceState.nominalLockedHeightM,
    pistonHeightM: endHeightM,
    velocityMPerS,
    gasAmountMol: input.referenceState.gasAmountMol,
    temperatureK,
    cumulativeHeatTransferJ,
    heatTransferRateW,
    physicsConfig,
    thermalConfig,
  });
};

interface ThermalMotionState {
  displacementM: number;
  velocityMPerS: number;
  temperatureK: number;
  cumulativeHeatTransferJ: number;
  heatTransferRateW: number;
}

interface ThermalMotionDerivative {
  displacementRateMPerS: number;
  velocityRateMPerS2: number;
  temperatureRateKPerS: number;
  heatTransferRateW: number;
  heatTransferRateRateWPerS: number;
}

interface ThermalMotionEnvironment {
  equilibriumHeightM: number;
  gasAmountMol: number;
  physicsConfig: PistonOscillationPhysicsConfig;
  thermalConfig: PistonOscillationThermalModelConfig;
  cylinderAreaM2: number;
  gasHeatCapacityJPerK: number;
  adiabatic?: boolean;
  releaseAsymmetryProfile?: PistonOscillationReleaseAsymmetryProfile;
  virtualHand?: {
    targetDownwardDisplacementM: number;
    stiffnessNPerM: number;
  };
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
  heatTransferRateW:
    state.heatTransferRateW + derivative.heatTransferRateRateWPerS * scaleS,
});

const getMotionDerivative = (
  state: ThermalMotionState,
  environment: ThermalMotionEnvironment,
  elapsedMotionS = 0,
): ThermalMotionDerivative => {
  const pistonHeightM = environment.equilibriumHeightM + state.displacementM;
  if (!Number.isFinite(pistonHeightM) || pistonHeightM < 0) {
    throw new RangeError('The piston motion cannot pass below the 0 mm stop.');
  }
  const totalVolumeM3 = PISTON_OSCILLATION_SEALED_DEAD_VOLUME_M3
    + environment.cylinderAreaM2 * pistonHeightM;
  const pressurePa = environment.gasAmountMol
    * PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K
    * state.temperatureK
    / totalVolumeM3;
  const pressureForceN = environment.cylinderAreaM2
    * (pressurePa - environment.physicsConfig.ambientPressurePa);
  const gravityForceN = environment.physicsConfig.movingMassKg
    * PISTON_OSCILLATION_STANDARD_GRAVITY_M_PER_S2;
  const extraLinearLossNsPerM = environment.releaseAsymmetryProfile
    ? getPistonOscillationReleaseAsymmetryExtraLinearLossNsPerM(
        environment.releaseAsymmetryProfile,
        elapsedMotionS,
      )
    : 0;
  const dampingForceN = (
    environment.physicsConfig.linearDampingNsPerM + extraLinearLossNsPerM
  ) * state.velocityMPerS;
  const downwardDisplacementM = environment.equilibriumHeightM - pistonHeightM;
  const virtualHandForceN = environment.virtualHand
    ? environment.virtualHand.stiffnessNPerM * Math.max(
        0,
        environment.virtualHand.targetDownwardDisplacementM - downwardDisplacementM,
      )
    : 0;
  const temperatureRateFromWorkKPerS = -(
    environment.physicsConfig.gamma - 1
  ) * state.temperatureK
    * (environment.cylinderAreaM2 * state.velocityMPerS)
    / totalVolumeM3;
  const targetHeatTransferRateW = environment.adiabatic
    ? 0
    : getTargetHeatTransferRateW({
        temperatureK: state.temperatureK,
        totalVolumeM3,
        gasHeatCapacityJPerK: environment.gasHeatCapacityJPerK,
        physicsConfig: environment.physicsConfig,
        thermalConfig: environment.thermalConfig,
      });
  const derivative = {
    displacementRateMPerS: state.velocityMPerS,
    velocityRateMPerS2: (
      pressureForceN - gravityForceN - dampingForceN - virtualHandForceN
    ) / environment.physicsConfig.movingMassKg,
    temperatureRateKPerS:
      temperatureRateFromWorkKPerS
      + (environment.adiabatic
        ? 0
        : state.heatTransferRateW / environment.gasHeatCapacityJPerK),
    heatTransferRateW: environment.adiabatic ? 0 : state.heatTransferRateW,
    heatTransferRateRateWPerS: environment.adiabatic
      ? 0
      : (
          targetHeatTransferRateW - state.heatTransferRateW
        ) / environment.thermalConfig.heatTransferLagTimeS,
  };
  if (
    !Number.isFinite(derivative.displacementRateMPerS)
    || !Number.isFinite(derivative.velocityRateMPerS2)
    || !Number.isFinite(derivative.temperatureRateKPerS)
    || !Number.isFinite(derivative.heatTransferRateW)
    || !Number.isFinite(derivative.heatTransferRateRateWPerS)
  ) {
    throw new RangeError('motion derivative must be finite.');
  }
  return derivative;
};

const stepMotionRungeKutta = (
  state: ThermalMotionState,
  dtS: number,
  environment: ThermalMotionEnvironment,
  elapsedMotionS = 0,
) => {
  const k1 = getMotionDerivative(state, environment, elapsedMotionS);
  const k2 = getMotionDerivative(
    addDerivative(state, k1, dtS / 2),
    environment,
    elapsedMotionS + dtS / 2,
  );
  const k3 = getMotionDerivative(
    addDerivative(state, k2, dtS / 2),
    environment,
    elapsedMotionS + dtS / 2,
  );
  const k4 = getMotionDerivative(
    addDerivative(state, k3, dtS),
    environment,
    elapsedMotionS + dtS,
  );
  return {
    displacementM: state.displacementM + dtS / 6 * (
      k1.displacementRateMPerS
      + 2 * k2.displacementRateMPerS
      + 2 * k3.displacementRateMPerS
      + k4.displacementRateMPerS
    ),
    velocityMPerS: state.velocityMPerS + dtS / 6 * (
      k1.velocityRateMPerS2
      + 2 * k2.velocityRateMPerS2
      + 2 * k3.velocityRateMPerS2
      + k4.velocityRateMPerS2
    ),
    temperatureK: state.temperatureK + dtS / 6 * (
      k1.temperatureRateKPerS
      + 2 * k2.temperatureRateKPerS
      + 2 * k3.temperatureRateKPerS
      + k4.temperatureRateKPerS
    ),
    cumulativeHeatTransferJ: state.cumulativeHeatTransferJ + dtS / 6 * (
      k1.heatTransferRateW
      + 2 * k2.heatTransferRateW
      + 2 * k3.heatTransferRateW
      + k4.heatTransferRateW
    ),
    heatTransferRateW: state.heatTransferRateW + dtS / 6 * (
      k1.heatTransferRateRateWPerS
      + 2 * k2.heatTransferRateRateWPerS
      + 2 * k3.heatTransferRateRateWPerS
      + k4.heatTransferRateRateWPerS
    ),
  } satisfies ThermalMotionState;
};

export interface PistonOscillationVirtualHandPressInput {
  referenceState: PistonOscillationThermodynamicState;
  equilibriumHeightMm: number;
  targetDownwardDisplacementMm: number;
  elapsedS: number;
  preventUpwardMotion?: boolean;
  adiabatic?: boolean;
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
  const existingHeatTransferRateW = input.adiabatic
    ? 0
    : getInitialHeatTransferRateW(
        input.referenceState,
        physicsConfig,
        thermalConfig,
      );
  let state: ThermalMotionState = {
    displacementM: input.referenceState.pistonHeightM - equilibriumHeightM,
    velocityMPerS: input.referenceState.velocityMPerS,
    temperatureK: input.referenceState.temperatureK,
    cumulativeHeatTransferJ: existingHeatTransferJ,
    heatTransferRateW: existingHeatTransferRateW,
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
      input.adiabatic
        ? Number.POSITIVE_INFINITY
        : thermalConfig.heatTransferLagTimeS / 8,
      periodLimitedStepS,
      dampingLimitedStepS,
    );
    const substepCount = Math.max(1, Math.ceil(elapsedS / maximumStepS));
    const dtS = elapsedS / substepCount;
    const motionEnvironment: ThermalMotionEnvironment = {
      equilibriumHeightM,
      gasAmountMol: input.referenceState.gasAmountMol,
      physicsConfig,
      thermalConfig,
      cylinderAreaM2,
      gasHeatCapacityJPerK: input.referenceState.gasAmountMol
        * PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K
        / (physicsConfig.gamma - 1),
      adiabatic: input.adiabatic,
      virtualHand: {
        targetDownwardDisplacementM,
        stiffnessNPerM: virtualHandConfig.handStiffnessNPerM,
      },
    };
    for (let substep = 0; substep < substepCount; substep += 1) {
      state = stepMotionRungeKutta(state, dtS, motionEnvironment);
    }
  }
  const nextPistonHeightM = equilibriumHeightM + state.displacementM;
  if (
    input.preventUpwardMotion
    && nextPistonHeightM > input.referenceState.pistonHeightM
  ) {
    return advancePistonOscillationPrescribedThermodynamicState({
      referenceState: input.referenceState,
      pistonHeightMm: input.referenceState.pistonHeightM * 1_000,
      velocityMmPerS: 0,
      elapsedS,
      physicsConfig,
      thermalConfig,
      adiabatic: input.adiabatic,
    });
  }
  if (input.adiabatic) {
    return createPistonOscillationAdiabaticStateFromReference(
      input.referenceState,
      nextPistonHeightM * 1_000,
      state.velocityMPerS * 1_000,
      physicsConfig,
    );
  }
  return createThermodynamicState({
    nominalLockedHeightM: input.referenceState.nominalLockedHeightM,
    pistonHeightM: nextPistonHeightM,
    velocityMPerS: state.velocityMPerS,
    gasAmountMol: input.referenceState.gasAmountMol,
    temperatureK: state.temperatureK,
    cumulativeHeatTransferJ: state.cumulativeHeatTransferJ,
    heatTransferRateW: state.heatTransferRateW,
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
    heatTransferRateW: input.state.heatTransferRateW,
  };
};

export interface PistonOscillationThermalReleaseInput
  extends PistonOscillationReleaseInput {
  referenceThermodynamicState: PistonOscillationThermodynamicState;
  releaseAsymmetry?: PistonOscillationReleaseAsymmetryInput;
  releaseAsymmetryConfig?: Partial<PistonOscillationReleaseAsymmetryConfig>;
}

export const simulatePistonOscillationThermalRelease = (
  input: PistonOscillationThermalReleaseInput,
  physicsConfigInput: Partial<PistonOscillationPhysicsConfig> = {},
  thermalConfigInput?: Partial<PistonOscillationThermalModelConfig>,
): PistonOscillationTrajectory => {
  // New experiments use one formally accepted equivalent linear loss through
  // both the virtual-hand press and the subsequent free release.
  const physicsConfig = normalizePistonOscillationPhysicsConfig({
    ...physicsConfigInput,
    linearDampingNsPerM: physicsConfigInput.linearDampingNsPerM
      ?? PISTON_OSCILLATION_CURRENT_LINEAR_LOSS_NS_PER_M,
  });
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
  const initialHeatTransferRateW = getInitialHeatTransferRateW(
    input.referenceThermodynamicState,
    physicsConfig,
    thermalConfig,
  );
  const activatedInitialState = createThermodynamicState({
    nominalLockedHeightM: equilibrium.lockedHeightM,
    pistonHeightM: initialPistonHeightM,
    velocityMPerS: initialVelocityMPerS,
    gasAmountMol: input.referenceThermodynamicState.gasAmountMol,
    temperatureK: input.referenceThermodynamicState.temperatureK,
    cumulativeHeatTransferJ: input.referenceThermodynamicState.thermal.enabled
      ? input.referenceThermodynamicState.thermal.cumulativeHeatTransferJ
      : 0,
    heatTransferRateW: initialHeatTransferRateW,
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
  const naturalAngularFrequencyRadPerS = Math.sqrt(
    physicsConfig.gamma
      * equilibrium.equilibriumPressurePa
      * equilibrium.cylinderAreaM2
      / (physicsConfig.movingMassKg * equilibrium.effectiveGasHeightM),
  );
  const releaseAsymmetryProfile = input.releaseAsymmetry
    ? createPistonOscillationReleaseAsymmetryProfile(
        input.releaseAsymmetry,
        2 * Math.PI / naturalAngularFrequencyRadPerS,
        input.releaseAsymmetryConfig,
      )
    : undefined;
  const periodLimitedStepS = 1 / (
    initialAngularFrequencyRadPerS / (2 * Math.PI)
    * MINIMUM_INTEGRATION_STEPS_PER_PERIOD
  );
  const maximumLinearLossNsPerM = physicsConfig.linearDampingNsPerM
    + (releaseAsymmetryProfile
      ? getPistonOscillationReleaseAsymmetryExtraLinearLossNsPerM(
          releaseAsymmetryProfile,
          0,
        )
      : 0);
  const dampingLimitedStepS = maximumLinearLossNsPerM > 0
    ? physicsConfig.movingMassKg / (maximumLinearLossNsPerM * 50)
    : Number.POSITIVE_INFINITY;
  const maximumStepS = Math.min(
    MAXIMUM_INTEGRATION_STEP_S,
    thermalConfig.heatTransferLagTimeS / 8,
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
    heatTransferRateW: initialHeatTransferRateW,
  };
  const motionEnvironment: ThermalMotionEnvironment = {
    equilibriumHeightM: equilibrium.equilibriumHeightM,
    gasAmountMol: equilibrium.gasAmountMol,
    physicsConfig,
    thermalConfig,
    cylinderAreaM2: equilibrium.cylinderAreaM2,
    gasHeatCapacityJPerK: equilibrium.gasAmountMol
      * PISTON_OSCILLATION_UNIVERSAL_GAS_CONSTANT_J_PER_MOL_K
      / (physicsConfig.gamma - 1),
    releaseAsymmetryProfile,
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
      state = stepMotionRungeKutta(
        state,
        integrationStepS,
        motionEnvironment,
        sampleIndex * sampleIntervalS + substep * integrationStepS,
      );
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
      initialHeatTransferRateW,
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
      withinSensorRange:
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
    || trajectory.thermalModel?.modelVersion
      !== PISTON_OSCILLATION_FINITE_THERMAL_EXTENSION_MODEL_VERSION
  ) {
    throw new RangeError('A current heat-flow-lag trajectory is required.');
  }
  return createThermodynamicState({
    nominalLockedHeightM: trajectory.equilibrium.lockedHeightM,
    pistonHeightM: trajectory.equilibrium.equilibriumHeightM + sample.displacementM,
    velocityMPerS: sample.velocityMPerS,
    gasAmountMol: trajectory.equilibrium.gasAmountMol,
    temperatureK: sample.temperatureK,
    cumulativeHeatTransferJ: sample.cumulativeHeatTransferJ
      ?? trajectory.thermalModel.cumulativeHeatTransferJ,
    heatTransferRateW: sample.heatTransferRateW
      ?? trajectory.thermalModel.heatTransferRateW,
    physicsConfig: trajectory.config,
    thermalConfig: {
      modelVersion: PISTON_OSCILLATION_THERMAL_MODEL_CONFIG_VERSION,
      relaxationTimeAtReferenceHeightS:
        trajectory.thermalModel.relaxationTimeAtReferenceHeightS,
      referenceGraduatedHeightM:
        trajectory.thermalModel.referenceGraduatedHeightM,
      volumeExponent: trajectory.thermalModel.volumeExponent,
      heatTransferLagTimeS: trajectory.thermalModel.heatTransferLagTimeS,
    },
  });
};
