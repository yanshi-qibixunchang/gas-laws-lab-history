import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  applyFreeZeroCalibration,
  captureAutomaticU0IfReady,
  getFreeCorrectedSignals,
  type HeatCapacityFreeCalibrationState,
} from '../../src/domain/heatCapacity/heatCapacityFreeCalibrationModel.ts';
import {
  HEAT_CAPACITY_GAMMA_ABSOLUTE_ERROR_LIMITS,
  HEAT_CAPACITY_STANDARD_OPERATION,
  HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S,
  createDefaultHeatCapacityFreePhysicsConfig,
  createDefaultHeatCapacityFreeSensorConfig,
} from '../../src/domain/heatCapacity/heatCapacityDefaultConfig.ts';
import {
  applyFreePumpStroke,
  createDefaultFreePhysicsState,
  deriveFreePhysicalState,
  FREE_PUMP_STROKE_DURATION_S,
  stepFreePhysics,
  type HeatCapacityFreeControls,
  type HeatCapacityFreePhysicsState,
} from '../../src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import {
  createDefaultFreeSensorState,
  createSeededFreePressureInitialBiasMv,
  getFreeSensorDisplay,
  stepFreeSensor,
  type HeatCapacityFreeSensorConfig,
  type HeatCapacityFreeSensorState,
} from '../../src/domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import {
  applyFreePressureSensorNonlinearity,
} from '../../src/domain/heatCapacity/heatCapacityFreePressureSensorNonlinearityModel.ts';
import {
  getHeatCapacityReleaseApertureRatio,
  integrateHeatCapacityReleaseAperture,
} from '../../src/domain/heatCapacity/heatCapacityFreeStopcockApertureModel.ts';
import {
  stepFreeThermalState,
  type HeatCapacityFreeThermalConfig,
} from '../../src/domain/heatCapacity/heatCapacityFreeThermalModel.ts';
import {
  truncateHeatCapacitySignalMv,
} from '../../src/domain/heatCapacity/heatCapacitySignalDisplayModel.ts';
import {
  stepHeatCapacityTemperatureSensor,
} from '../../src/domain/heatCapacity/heatCapacityTemperatureSensorModel.ts';
import { PhysicsEngine } from '../../src/domain/hardSphere/PhysicsEngine.ts';
import {
  calculateLinearRegression,
  createEmptyPointsByRelation,
  createIdealGasExperimentPoint,
  getIdealGasAnalysis,
  getRelationXValue,
  getTheoreticalSlope,
} from '../../src/domain/idealGas/idealGasExperiment.ts';
import {
  BOX_LENGTH_PRESET_SEQUENCE,
  PARTICLE_COUNT_PRESET_SEQUENCE,
  TEMPERATURE_PRESET_SEQUENCE,
} from '../../src/domain/idealGas/experimentFailureDiagnostics.ts';
import type {
  ExperimentRelation,
  IdealGasExperimentPoint,
  SimulationParams,
} from '../../src/shared/types.ts';
import { idealSamplingPresets } from '../../src/features/workbench/workbenchIdealControls.ts';
import {
  DEFAULT_IDEAL_PARAMS,
  DEFAULT_STANDARD_PARAMS,
} from '../../src/features/workbench/workbenchState.ts';
import {
  runHeatCapacityFreeParameterAcceptance,
  type HeatCapacityFreeParameterAcceptanceScenarioInput,
} from '../../tests/heatCapacity/heatCapacityFreeParameterAcceptance.ts';

const SCRIPT_VERSION = 'validation-evidence-v3';
const RNG_VERSION = 'fnv1a32-mulberry32-v1';
const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_OUTPUT_DIR = join(ROOT_DIR, 'docs/validation/generated');
const UTF8_BOM = '\uFEFF';

type CsvValue = string | number | boolean | null | undefined;
type CsvRow = Record<string, CsvValue>;

export interface NumberSummary {
  count: number;
  mean: number | null;
  sampleSd: number | null;
  min: number | null;
  max: number | null;
}

const round = (value: number | null, digits = 8): number | null => (
  value === null || !Number.isFinite(value) ? null : Number(value.toFixed(digits))
);

export const summarizeNumbers = (values: Array<number | null | undefined>): NumberSummary => {
  const valid = values.filter((value): value is number => (
    typeof value === 'number' && Number.isFinite(value)
  ));
  if (valid.length === 0) {
    return { count: 0, mean: null, sampleSd: null, min: null, max: null };
  }
  const mean = valid.reduce((sum, value) => sum + value, 0) / valid.length;
  const sampleSd = valid.length > 1
    ? Math.sqrt(valid.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (valid.length - 1))
    : 0;
  return {
    count: valid.length,
    mean,
    sampleSd,
    min: Math.min(...valid),
    max: Math.max(...valid),
  };
};

const csvCell = (value: CsvValue): string => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const toCsv = (rows: CsvRow[]): string => {
  if (rows.length === 0) return UTF8_BOM;
  const columns = Object.keys(rows[0]);
  const lines = [
    columns.map(csvCell).join(','),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(',')),
  ];
  return `${UTF8_BOM}${lines.join('\r\n')}\r\n`;
};

const writeCsv = (path: string, rows: CsvRow[]) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, toCsv(rows), 'utf8');
};

const writeJson = (path: string, value: unknown) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const hashString32 = (value: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

export const createSeededRandom = (seed: string): (() => number) => {
  let state = hashString32(seed);
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

export const withSeededMathRandom = <T>(seed: string, action: () => T): T => {
  const originalRandom = Math.random;
  Math.random = createSeededRandom(seed);
  try {
    return action();
  } finally {
    Math.random = originalRandom;
  }
};

const getGitOutput = (args: string[]): string => {
  try {
    return execFileSync('git', args, {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
};

const sha256File = (path: string) => createHash('sha256')
  .update(readFileSync(path))
  .digest('hex');

const sourceFiles = [
  'package.json',
  'scripts/research-report/generate-evidence.ts',
  'tests/heatCapacity/heatCapacityFreeParameterAcceptance.ts',
  'src/domain/heatCapacity/heatCapacityDefaultConfig.ts',
  'src/domain/heatCapacity/heatCapacityFreePhysicsEngine.ts',
  'src/domain/heatCapacity/heatCapacityThermodynamicKernel.ts',
  'src/domain/heatCapacity/heatCapacityFreeThermalModel.ts',
  'src/domain/heatCapacity/heatCapacityFreeLeakageModel.ts',
  'src/domain/heatCapacity/heatCapacityFreePumpValveExchangeModel.ts',
  'src/domain/heatCapacity/heatCapacityFreeEnvironmentDisturbanceModel.ts',
  'src/domain/heatCapacity/heatCapacityFreeSensorModel.ts',
  'src/domain/heatCapacity/heatCapacityFreePressureSensorNonlinearityModel.ts',
  'src/domain/heatCapacity/heatCapacityFreeStopcockApertureModel.ts',
  'src/domain/heatCapacity/heatCapacitySignalDisplayModel.ts',
  'src/domain/heatCapacity/heatCapacityTemperatureSensorModel.ts',
  'src/domain/hardSphere/PhysicsEngine.ts',
  'src/domain/idealGas/idealGasExperiment.ts',
  'src/domain/idealGas/experimentFailureDiagnostics.ts',
  'src/features/workbench/workbenchIdealControls.ts',
  'src/features/workbench/workbenchState.ts',
];

const createSourceHashes = () => sourceFiles.map((relativePath) => {
  const absolutePath = join(ROOT_DIR, relativePath);
  return {
    path: relativePath.replaceAll('\\', '/'),
    sha256: sha256File(absolutePath),
    bytes: statSync(absolutePath).size,
  };
});

const baseHeatScenario = (
  id: string,
  overrides: Partial<HeatCapacityFreeParameterAcceptanceScenarioInput> = {},
): HeatCapacityFreeParameterAcceptanceScenarioInput => ({
  id,
  pumpStrokes: HEAT_CAPACITY_STANDARD_OPERATION.pumpStrokes,
  pumpTotalDurationS: HEAT_CAPACITY_STANDARD_OPERATION.pumpTotalDurationS,
  waitAfterPumpS: HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS,
  openDurationS: HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
  waitAfterReleaseS: HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS,
  leakageEnabled: true,
  pumpValveExchangeEnabled: true,
  environmentDisturbanceEnabled: true,
  instrumentNoiseEnabled: true,
  ...overrides,
});

interface HeatScenarioFamily {
  id: string;
  label: string;
  runCount: number;
  overrides: Partial<HeatCapacityFreeParameterAcceptanceScenarioInput>;
}

const heatScenarioFamilies: HeatScenarioFamily[] = [
  {
    id: 'absolute-ideal',
    label: '绝对理想过程',
    runCount: 1,
    overrides: {
      pumpMode: 'instant-equivalent',
      releaseMode: 'instant-adiabatic-to-ambient',
      pumpTotalDurationS: 0,
      leakageEnabled: false,
      leakageRatePerS: 0,
      pumpValveExchangeEnabled: false,
      environmentDisturbanceEnabled: false,
      instrumentNoiseEnabled: false,
    },
  },
  {
    id: 'ideal-experiment',
    label: '理想实验操作',
    runCount: 1,
    overrides: {
      leakageEnabled: false,
      leakageRatePerS: 0,
      pumpValveExchangeEnabled: false,
      environmentDisturbanceEnabled: false,
      instrumentNoiseEnabled: false,
    },
  },
  {
    id: 'standard-realistic',
    label: '标准真实化操作',
    runCount: 30,
    overrides: {},
  },
  ...[4, 8, 12, 16].map((pumpStrokes): HeatScenarioFamily => ({
    id: `low-pressure-${pumpStrokes}-strokes`,
    label: `${pumpStrokes} 次打气`,
    runCount: 30,
    overrides: { pumpStrokes },
  })),
  {
    id: 'slow-pump-50s',
    label: '50 s 缓慢打气',
    runCount: 5,
    overrides: { pumpTotalDurationS: 50 },
  },
  {
    id: 'slow-pump-120s',
    label: '120 s 极慢打气',
    runCount: 5,
    overrides: { pumpTotalDurationS: 120 },
  },
  {
    id: 'short-open-0.03s',
    label: '旋塞开启 0.03 s',
    runCount: 1,
    overrides: {
      openDurationS: 0.03,
      leakageEnabled: false,
      leakageRatePerS: 0,
      pumpValveExchangeEnabled: false,
      environmentDisturbanceEnabled: false,
      instrumentNoiseEnabled: false,
    },
  },
  {
    id: 'short-open-0.05s',
    label: '旋塞开启 0.05 s',
    runCount: 1,
    overrides: {
      openDurationS: 0.05,
      leakageEnabled: false,
      leakageRatePerS: 0,
      pumpValveExchangeEnabled: false,
      environmentDisturbanceEnabled: false,
      instrumentNoiseEnabled: false,
    },
  },
  {
    id: 'long-open-2.5s',
    label: '旋塞开启 2.5 s',
    runCount: 1,
    overrides: { openDurationS: 2.5, instrumentNoiseEnabled: false },
  },
  {
    id: 'long-open-10s',
    label: '旋塞开启 10 s',
    runCount: 1,
    overrides: { openDurationS: 10, instrumentNoiseEnabled: false },
  },
  {
    id: 'u1-immediate',
    label: '打气后立即记录 U1',
    runCount: 1,
    overrides: { waitAfterPumpS: 0, instrumentNoiseEnabled: false },
  },
  {
    id: 'u2-immediate',
    label: '放气后立即记录 U2',
    runCount: 1,
    overrides: { waitAfterReleaseS: 0, instrumentNoiseEnabled: false },
  },
  {
    id: 'u2-late-600s',
    label: '放气后 600 s 记录 U2',
    runCount: 1,
    overrides: { waitAfterReleaseS: 600, instrumentNoiseEnabled: false },
  },
  {
    id: 'u2-late-1200s',
    label: '放气后 1200 s 记录 U2',
    runCount: 1,
    overrides: { waitAfterReleaseS: 1200, instrumentNoiseEnabled: false },
  },
];

interface HeatRunDescriptor {
  family: HeatScenarioFamily;
  runIndex: number;
  seed: string;
  scenario: HeatCapacityFreeParameterAcceptanceScenarioInput;
}

const createHeatRunDescriptors = (families: HeatScenarioFamily[]): HeatRunDescriptor[] => (
  families.flatMap((family) => Array.from({ length: family.runCount }, (_, index) => {
    const runIndex = index + 1;
    const scenarioId = `${family.id}__${String(runIndex).padStart(2, '0')}`;
    return {
      family,
      runIndex,
      seed: `free-acceptance-${scenarioId}`,
      scenario: baseHeatScenario(scenarioId, {
        label: family.label,
        ...family.overrides,
      }),
    };
  }))
);

const createHeatSummaryRow = (family: HeatScenarioFamily, rows: CsvRow[]): CsvRow => {
  const gammas = rows.map((row) => typeof row.gamma === 'number' ? row.gamma : null);
  const gammaSummary = summarizeNumbers(gammas);
  const u1Summary = summarizeNumbers(rows.map((row) => typeof row.u1_corrected_mv === 'number'
    ? row.u1_corrected_mv
    : null));
  const u2Summary = summarizeNumbers(rows.map((row) => typeof row.u2_corrected_mv === 'number'
    ? row.u2_corrected_mv
    : null));
  const finiteGammas = gammas.filter((value): value is number => value !== null);
  return {
    scenario_id: family.id,
    scenario_label: family.label,
    configured_runs: family.runCount,
    valid_gamma_runs: gammaSummary.count,
    u1_recordable_rate: round(rows.filter((row) => row.u1_recordable === true).length / rows.length, 6),
    u2_recordable_rate: round(rows.filter((row) => row.u2_recordable === true).length / rows.length, 6),
    gamma_mean: round(gammaSummary.mean, 6),
    gamma_sample_sd: round(gammaSummary.sampleSd, 6),
    gamma_min: round(gammaSummary.min, 6),
    gamma_max: round(gammaSummary.max, 6),
    gamma_mean_absolute_error: round(
      finiteGammas.length > 0
        ? finiteGammas.reduce((sum, value) => sum + Math.abs(value - 1.4), 0) / finiteGammas.length
        : null,
      6,
    ),
    within_best_realistic_rate: round(
      finiteGammas.length > 0
        ? finiteGammas.filter((value) => (
          Math.abs(value - 1.4) <= HEAT_CAPACITY_GAMMA_ABSOLUTE_ERROR_LIMITS.bestRealistic
        )).length / finiteGammas.length
        : null,
      6,
    ),
    within_suitable_rate: round(
      finiteGammas.length > 0
        ? finiteGammas.filter((value) => (
          Math.abs(value - 1.4) <= HEAT_CAPACITY_GAMMA_ABSOLUTE_ERROR_LIMITS.suitable
        )).length / finiteGammas.length
        : null,
      6,
    ),
    u1_corrected_mean_mv: round(u1Summary.mean, 4),
    u1_corrected_sample_sd_mv: round(u1Summary.sampleSd, 4),
    u2_corrected_mean_mv: round(u2Summary.mean, 4),
    u2_corrected_sample_sd_mv: round(u2Summary.sampleSd, 4),
  };
};

interface HeatTraceRun {
  timeS: number;
  physics: HeatCapacityFreePhysicsState;
  sensor: HeatCapacityFreeSensorState;
  calibration: HeatCapacityFreeCalibrationState;
}

const createTraceCalibration = (
  sensorConfig: HeatCapacityFreeSensorConfig,
): HeatCapacityFreeCalibrationState => {
  let calibration: HeatCapacityFreeCalibrationState = {
    calibrationVersion: 0,
    zeroOffsetMv: 0,
    zeroEvents: [],
    automaticU0: null,
  };
  calibration = applyFreeZeroCalibration(calibration, {
    atS: 0,
    displayPressureMv: 0,
    displayTemperatureMv: sensorConfig.temperatureMvAtAmbient,
    zeroOffsetMv: 0,
    source: 'user',
  });
  return captureAutomaticU0IfReady(calibration, {
    atS: 0.1,
    powerOn: true,
    stopcockOpen: true,
    zeroed: true,
    zeroEventId: 'zero-1',
    pressureStable: true,
    temperatureStable: true,
    displayPressureMv: 0,
    displayTemperatureMv: sensorConfig.temperatureMvAtAmbient,
  });
};

const createRepresentativeHeatTrace = (): CsvRow[] => {
  const physicsConfig = createDefaultHeatCapacityFreePhysicsConfig();
  const sensorConfig = createDefaultHeatCapacityFreeSensorConfig();
  const seed = 'heat-trace-standard-realistic-01';
  let run: HeatTraceRun = {
    timeS: 0.1,
    physics: createDefaultFreePhysicsState(physicsConfig, seed),
    sensor: createDefaultFreeSensorState(seed, {
      pressureMv: 0,
      pressureInitialBiasMv: 0,
      temperatureMv: sensorConfig.temperatureMvAtAmbient,
      sensorTemperatureK: physicsConfig.environment.ambientTemperatureK,
    }),
    calibration: createTraceCalibration(sensorConfig),
  };
  const rows: CsvRow[] = [];
  let nextPeriodicSampleAtS = 1;

  const appendSample = (
    phase: string,
    reason: string,
    controls: HeatCapacityFreeControls,
  ) => {
    const physical = deriveFreePhysicalState(run.physics, physicsConfig);
    const display = getFreeSensorDisplay(run.sensor, run.calibration, sensorConfig);
    rows.push({
      seed,
      time_s: round(run.timeS, 6),
      phase,
      sample_reason: reason,
      pump_valve_open: controls.pumpValveOpen,
      stopcock_open: controls.stopcockOpen,
      pump_stroke_count: run.physics.pumpStrokeCount,
      gas_pressure_kpa: round(physical.gasPressureKPa, 8),
      pressure_delta_kpa: round(physical.pressureDeltaKPa, 8),
      gas_temperature_k: round(run.physics.gasTemperatureK, 8),
      wall_temperature_k: round(run.physics.wallTemperatureK, 8),
      gas_amount_ratio: round(run.physics.gasAmountRatio, 9),
      display_pressure_mv: round(display.displayPressureMv, 6),
      display_temperature_mv: round(display.displayTemperatureMv, 6),
      release_open_duration_s: round(run.physics.currentStopcockOpenDurationS, 6),
    });
  };

  const step = (
    controls: HeatCapacityFreeControls,
    dtS: number,
  ) => {
    const timeS = Number((run.timeS + dtS).toFixed(9));
    const physics = stepFreePhysics(run.physics, physicsConfig, controls, dtS, timeS);
    const physical = deriveFreePhysicalState(physics, physicsConfig);
    const sensor = stepFreeSensor(run.sensor, {
      gasPressureKPa: physical.gasPressureKPa,
      pressureDeltaKPa: physical.pressureDeltaKPa,
      gasTemperatureK: physics.gasTemperatureK,
      ambientTemperatureK: physicsConfig.environment.ambientTemperatureK,
    }, run.calibration, sensorConfig, timeS);
    run = { ...run, timeS, physics, sensor };
  };

  const advance = (
    controls: HeatCapacityFreeControls,
    durationS: number,
    phase: string,
    maxStepS = 0.1,
    keepEveryStep = false,
  ) => {
    for (let elapsedS = 0; elapsedS < durationS - 1e-9;) {
      const dtS = Math.min(maxStepS, durationS - elapsedS);
      step(controls, dtS);
      elapsedS += dtS;
      if (keepEveryStep || run.timeS + 1e-9 >= nextPeriodicSampleAtS) {
        appendSample(phase, keepEveryStep ? 'fast-process' : 'periodic', controls);
        while (run.timeS + 1e-9 >= nextPeriodicSampleAtS) nextPeriodicSampleAtS += 1;
      }
    }
  };

  const idleControls: HeatCapacityFreeControls = {
    pumpValveOpen: false,
    stopcockOpen: false,
  };
  const pumpControls: HeatCapacityFreeControls = {
    pumpValveOpen: true,
    stopcockOpen: false,
  };
  const releaseControls: HeatCapacityFreeControls = {
    pumpValveOpen: false,
    stopcockOpen: true,
    stopcockFlowPurpose: 'release',
  };

  appendSample('initial', 'automatic-u0', { pumpValveOpen: false, stopcockOpen: true });
  for (let index = 0; index < HEAT_CAPACITY_STANDARD_OPERATION.pumpStrokes; index += 1) {
    advance(
      pumpControls,
      index === 0 ? 0.1 : HEAT_CAPACITY_STANDARD_PUMP_STROKE_INTERVAL_S,
      'pumping',
    );
    const stroke = applyFreePumpStroke(run.physics, physicsConfig, pumpControls, {
      atS: run.timeS,
      strength: 1,
    });
    if (!stroke.accepted) throw new Error(`Representative trace pump stroke rejected: ${stroke.reason}`);
    run = { ...run, physics: stroke.state };
    appendSample('pumping', 'pump-stroke', pumpControls);
  }
  advance(pumpControls, FREE_PUMP_STROKE_DURATION_S, 'pumping');
  appendSample('sealed-stabilizing', 'pump-valve-close', idleControls);
  advance(idleControls, HEAT_CAPACITY_STANDARD_OPERATION.waitAfterPumpS, 'sealed-stabilizing');
  appendSample('stable-before-release', 'record-u1', idleControls);
  appendSample('release', 'stopcock-open', releaseControls);
  advance(
    releaseControls,
    HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
    'release',
    0.1,
    true,
  );
  appendSample('recovery', 'stopcock-close', idleControls);
  advance(idleControls, HEAT_CAPACITY_STANDARD_OPERATION.waitAfterReleaseS, 'recovery');
  appendSample('stable-after-release', 'record-u2', idleControls);
  return rows;
};

const createSensorLagEvidence = () => {
  const sensorConfig = createDefaultHeatCapacityFreeSensorConfig();
  const calibration: HeatCapacityFreeCalibrationState = {
    calibrationVersion: 1,
    zeroOffsetMv: 0,
    zeroEvents: [],
    automaticU0: null,
  };
  const rows: CsvRow[] = [];
  const pressureTargetMv = 120;
  const pressurePhysical = {
    gasPressureKPa: 107.3,
    pressureDeltaKPa: pressureTargetMv / sensorConfig.pressureMvPerKPa,
    gasTemperatureK: 298.15,
    ambientTemperatureK: 298.15,
  };
  const pressureConditions = [
    {
      id: 'pressure-idealized-no-lag',
      label: '压强通道理想无滞后',
      lagRate: 1_000_000,
    },
    {
      id: 'pressure-representative-lag',
      label: '压强通道代表性滞后（lagRate=8 s^-1）',
      lagRate: sensorConfig.lagRate,
    },
  ];
  for (const condition of pressureConditions) {
    const config: HeatCapacityFreeSensorConfig = {
      ...sensorConfig,
      lagRate: condition.lagRate,
      noiseMv: 0,
      quantizationMv: 0,
      minSampleIntervalS: 0.02,
      maxSampleIntervalS: 0.02,
      pressureNonlinearity: {
        ...sensorConfig.pressureNonlinearity!,
        enabled: false,
        extraNoiseMv: 0,
      },
    };
    let state = createDefaultFreeSensorState(condition.id, {
      pressureMv: 0,
      pressureInitialBiasMv: 0,
      temperatureMv: sensorConfig.temperatureMvAtAmbient,
      sensorTemperatureK: 298.15,
    });
    rows.push({
      channel: 'pressure',
      condition_id: condition.id,
      condition_label: condition.label,
      response_parameter: 'lag_rate_per_s',
      response_parameter_value: condition.lagRate,
      time_s: 0,
      initial_value: 0,
      target_value: pressureTargetMv,
      response_value: 0,
      normalized_response: 0,
      absolute_error: pressureTargetMv,
    });
    for (let index = 1; index <= 150; index += 1) {
      const timeS = index * 0.02;
      state = stepFreeSensor(state, pressurePhysical, calibration, config, timeS);
      rows.push({
        channel: 'pressure',
        condition_id: condition.id,
        condition_label: condition.label,
        response_parameter: 'lag_rate_per_s',
        response_parameter_value: condition.lagRate,
        time_s: round(timeS, 4),
        initial_value: 0,
        target_value: pressureTargetMv,
        response_value: round(state.displayPressureMv, 8),
        normalized_response: round(state.displayPressureMv / pressureTargetMv, 8),
        absolute_error: round(Math.abs(pressureTargetMv - state.displayPressureMv), 8),
      });
    }
  }

  const temperatureConditions = [
    {
      id: 'temperature-idealized-no-lag',
      label: '温度通道理想无滞后',
      tauSensorS: 0.001,
    },
    {
      id: 'temperature-representative-lag',
      label: '温度通道代表性滞后（tau=0.8 s）',
      tauSensorS: 0.8,
    },
  ];
  const initialTemperatureK = 298.15;
  const targetTemperatureK = 303.15;
  for (const condition of temperatureConditions) {
    let state = { temperatureK: initialTemperatureK };
    rows.push({
      channel: 'temperature',
      condition_id: condition.id,
      condition_label: condition.label,
      response_parameter: 'tau_sensor_s',
      response_parameter_value: condition.tauSensorS,
      time_s: 0,
      initial_value: initialTemperatureK,
      target_value: targetTemperatureK,
      response_value: initialTemperatureK,
      normalized_response: 0,
      absolute_error: targetTemperatureK - initialTemperatureK,
    });
    for (let index = 1; index <= 150; index += 1) {
      const timeS = index * 0.02;
      state = stepHeatCapacityTemperatureSensor(state, {
        gasTemperatureK: targetTemperatureK,
        dtS: 0.02,
      }, {
        tauSensorS: condition.tauSensorS,
      });
      const normalizedResponse = (
        (state.temperatureK - initialTemperatureK) /
        (targetTemperatureK - initialTemperatureK)
      );
      rows.push({
        channel: 'temperature',
        condition_id: condition.id,
        condition_label: condition.label,
        response_parameter: 'tau_sensor_s',
        response_parameter_value: condition.tauSensorS,
        time_s: round(timeS, 4),
        initial_value: initialTemperatureK,
        target_value: targetTemperatureK,
        response_value: round(state.temperatureK, 8),
        normalized_response: round(normalizedResponse, 8),
        absolute_error: round(Math.abs(targetTemperatureK - state.temperatureK), 8),
      });
    }
  }

  const summaryRows: CsvRow[] = [...pressureConditions, ...temperatureConditions].map((condition) => {
    const conditionRows = rows.filter((row) => row.condition_id === condition.id);
    const timeAtFraction = (fraction: number) => {
      const found = conditionRows.find((row) => (
        typeof row.normalized_response === 'number' && row.normalized_response >= fraction
      ));
      return typeof found?.time_s === 'number' ? found.time_s : null;
    };
    const valueAt = (timeS: number) => {
      const found = conditionRows.find((row) => row.time_s === timeS);
      return typeof found?.response_value === 'number' ? found.response_value : null;
    };
    return {
      channel: conditionRows[0]?.channel,
      condition_id: condition.id,
      condition_label: condition.label,
      response_parameter: conditionRows[0]?.response_parameter,
      response_parameter_value: conditionRows[0]?.response_parameter_value,
      time_to_50_percent_s: timeAtFraction(0.5),
      time_to_90_percent_s: timeAtFraction(0.9),
      time_to_95_percent_s: timeAtFraction(0.95),
      response_at_0_10_s: valueAt(0.1),
      response_at_0_30_s: valueAt(0.3),
      response_at_1_00_s: valueAt(1),
    };
  });
  return { rows, summaryRows };
};

const createSensorStaticNonlinearityEvidence = (): CsvRow[] => {
  const config = createDefaultHeatCapacityFreeSensorConfig().pressureNonlinearity!;
  return Array.from({ length: 15 }, (_, index) => index * 10).map((rawPressureMv) => {
    const result = applyFreePressureSensorNonlinearity(rawPressureMv, config);
    return {
      raw_pressure_mv: rawPressureMv,
      nonlinear_output_mv: round(result.pressureMv, 8),
      reliability: round(result.reliability, 8),
      nonlinear_error_mv: round(result.nonlinearErrorMv, 8),
      relative_error_percent: rawPressureMv === 0
        ? null
        : round((result.nonlinearErrorMv / rawPressureMv) * 100, 8),
      knee_mv: config.kneeMv,
      minimum_gain: config.minGain,
      exponent: config.exponent,
      stochastic_error_included: false,
    };
  });
};

const createZeroCalibrationEvidence = (): CsvRow[] => {
  const sensorConfig = createDefaultHeatCapacityFreeSensorConfig();
  const seeds = Array.from({ length: 5 }, (_, index) => (
    `zero-calibration-seed-${String(index + 1).padStart(2, '0')}`
  ));
  return seeds.flatMap((seed, seedIndex) => {
    const initialBiasMv = createSeededFreePressureInitialBiasMv(seed, 1.5);
    const sensorState = createDefaultFreeSensorState(seed, {
      pressureMv: initialBiasMv,
      pressureInitialBiasMv: initialBiasMv,
      temperatureMv: sensorConfig.temperatureMvAtAmbient,
      sensorTemperatureK: 298.15,
    });
    const beforeZero = getFreeSensorDisplay(sensorState, { zeroOffsetMv: 0 }, sensorConfig);
    return [-0.05, 0, 0.05].map((residualMv) => {
      const zeroOffsetMv = -initialBiasMv + residualMv;
      let calibration = applyFreeZeroCalibration({
        calibrationVersion: 0,
        zeroOffsetMv: 0,
        zeroEvents: [],
        automaticU0: null,
      }, {
        atS: 0,
        displayPressureMv: beforeZero.displayPressureMv,
        displayTemperatureMv: beforeZero.displayTemperatureMv,
        zeroOffsetMv,
        source: 'user',
      });
      const afterZero = getFreeSensorDisplay(sensorState, calibration, sensorConfig);
      calibration = captureAutomaticU0IfReady(calibration, {
        atS: 0.1,
        powerOn: true,
        stopcockOpen: true,
        zeroed: true,
        zeroEventId: 'zero-1',
        pressureStable: true,
        temperatureStable: true,
        displayPressureMv: afterZero.displayPressureMv,
        displayTemperatureMv: afterZero.displayTemperatureMv,
      });
      const corrected = getFreeCorrectedSignals({
        U0DisplayMv: afterZero.displayPressureMv,
        U1DisplayMv: afterZero.displayPressureMv + 112.8,
        U2DisplayMv: afterZero.displayPressureMv + 30.1,
      });
      return {
        seed,
        seed_index: seedIndex + 1,
        initial_pressure_bias_mv: initialBiasMv,
        requested_residual_after_zero_mv: residualMv,
        applied_zero_offset_mv: round(zeroOffsetMv, 4),
        display_before_zero_mv: beforeZero.displayPressureMv,
        display_after_zero_mv: afterZero.displayPressureMv,
        automatic_u0_ready: calibration.automaticU0 !== null,
        gamma_after_recorded_u0_subtraction: round(corrected.gamma, 8),
      };
    });
  });
};

const createDisplayResolutionEvidence = () => {
  const sensorConfig = createDefaultHeatCapacityFreeSensorConfig();
  const rawRecords = {
    U0: 0.034,
    U1: 112.849,
    U2: 30.159,
  } as const;
  const rows: CsvRow[] = Object.entries(rawRecords).map(([signal, rawValueMv]) => {
    const state = createDefaultFreeSensorState(`resolution-${signal}`, {
      pressureMv: rawValueMv,
      pressureInitialBiasMv: 0,
      temperatureMv: sensorConfig.temperatureMvAtAmbient,
      sensorTemperatureK: 298.15,
    });
    const sensorQuantizedMv = getFreeSensorDisplay(
      state,
      { zeroOffsetMv: 0 },
      sensorConfig,
    ).displayPressureMv;
    return {
      signal,
      raw_value_mv: rawValueMv,
      sensor_quantization_step_mv: sensorConfig.quantizationMv,
      sensor_quantized_value_mv: sensorQuantizedMv,
      ui_record_resolution_mv: 0.1,
      ui_record_truncated_value_mv: truncateHeatCapacitySignalMv(sensorQuantizedMv),
    };
  });
  const fullPrecision = getFreeCorrectedSignals({
    U0DisplayMv: rawRecords.U0,
    U1DisplayMv: rawRecords.U1,
    U2DisplayMv: rawRecords.U2,
  });
  const sensorQuantizedBySignal = Object.fromEntries(rows.map((row) => [
    row.signal,
    row.sensor_quantized_value_mv,
  ])) as Record<string, number>;
  const uiBySignal = Object.fromEntries(rows.map((row) => [
    row.signal,
    row.ui_record_truncated_value_mv,
  ])) as Record<string, number>;
  const sensorQuantized = getFreeCorrectedSignals({
    U0DisplayMv: sensorQuantizedBySignal.U0,
    U1DisplayMv: sensorQuantizedBySignal.U1,
    U2DisplayMv: sensorQuantizedBySignal.U2,
  });
  const uiResolution = getFreeCorrectedSignals({
    U0DisplayMv: uiBySignal.U0,
    U1DisplayMv: uiBySignal.U1,
    U2DisplayMv: uiBySignal.U2,
  });
  const summaryRows: CsvRow[] = [
    {
      calculation_stage: 'raw-full-precision',
      u0_mv: rawRecords.U0,
      u1_mv: rawRecords.U1,
      u2_mv: rawRecords.U2,
      gamma: round(fullPrecision.gamma, 10),
      delta_gamma_vs_raw: 0,
    },
    {
      calculation_stage: 'sensor-quantized-0.01mV',
      u0_mv: sensorQuantizedBySignal.U0,
      u1_mv: sensorQuantizedBySignal.U1,
      u2_mv: sensorQuantizedBySignal.U2,
      gamma: round(sensorQuantized.gamma, 10),
      delta_gamma_vs_raw: round(sensorQuantized.gamma - fullPrecision.gamma, 10),
    },
    {
      calculation_stage: 'ui-record-truncated-0.1mV',
      u0_mv: uiBySignal.U0,
      u1_mv: uiBySignal.U1,
      u2_mv: uiBySignal.U2,
      gamma: round(uiResolution.gamma, 10),
      delta_gamma_vs_raw: round(uiResolution.gamma - fullPrecision.gamma, 10),
    },
  ];
  return { rows, summaryRows };
};

const createMeasurementNoiseResolutionEvidence = () => {
  const baseConfig = createDefaultHeatCapacityFreeSensorConfig();
  const config: HeatCapacityFreeSensorConfig = {
    ...baseConfig,
    lagRate: 1_000_000,
    minSampleIntervalS: 0.1,
    maxSampleIntervalS: 0.1,
    pressureNonlinearity: {
      ...baseConfig.pressureNonlinearity!,
      enabled: false,
      extraNoiseMv: 0,
    },
  };
  const calibration: HeatCapacityFreeCalibrationState = {
    calibrationVersion: 1,
    zeroOffsetMv: 0,
    zeroEvents: [],
    automaticU0: null,
  };
  const physical = {
    gasPressureKPa: 106.3,
    pressureDeltaKPa: 5,
    gasTemperatureK: 298.15,
    ambientTemperatureK: 298.15,
  };
  const rows: CsvRow[] = [];
  for (let seedIndex = 1; seedIndex <= 5; seedIndex += 1) {
    const seed = `measurement-noise-seed-${String(seedIndex).padStart(2, '0')}`;
    let state = createDefaultFreeSensorState(seed, {
      pressureMv: 100,
      pressureInitialBiasMv: 0,
      temperatureMv: config.temperatureMvAtAmbient,
      sensorTemperatureK: 298.15,
    });
    for (let sampleIndex = 1; sampleIndex <= 20; sampleIndex += 1) {
      const timeS = sampleIndex * 0.1;
      state = stepFreeSensor(state, physical, calibration, config, timeS);
      rows.push({
        seed,
        seed_index: seedIndex,
        sample_index: sampleIndex,
        time_s: round(timeS, 2),
        physical_target_mv: 100,
        configured_noise_half_range_mv: config.noiseMv,
        sensor_quantization_step_mv: config.quantizationMv,
        sensor_display_mv: state.displayPressureMv,
        ui_record_display_mv: truncateHeatCapacitySignalMv(state.displayPressureMv),
      });
    }
  }
  const createSummary = (id: string, subset: CsvRow[]): CsvRow => {
    const sensor = summarizeNumbers(subset.map((row) => (
      typeof row.sensor_display_mv === 'number' ? row.sensor_display_mv : null
    )));
    const uiValues = subset.map((row) => (
      typeof row.ui_record_display_mv === 'number' ? row.ui_record_display_mv : null
    )).filter((value): value is number => value !== null);
    return {
      group: id,
      sample_count: subset.length,
      sensor_display_mean_mv: round(sensor.mean, 6),
      sensor_display_sample_sd_mv: round(sensor.sampleSd, 6),
      sensor_display_min_mv: round(sensor.min, 6),
      sensor_display_max_mv: round(sensor.max, 6),
      distinct_sensor_values: new Set(subset.map((row) => row.sensor_display_mv)).size,
      distinct_ui_record_values: new Set(uiValues).size,
      ui_record_min_mv: uiValues.length > 0 ? Math.min(...uiValues) : null,
      ui_record_max_mv: uiValues.length > 0 ? Math.max(...uiValues) : null,
    };
  };
  const summaryRows = [
    ...Array.from({ length: 5 }, (_, index) => {
      const seedIndex = index + 1;
      return createSummary(
        `seed-${String(seedIndex).padStart(2, '0')}`,
        rows.filter((row) => row.seed_index === seedIndex),
      );
    }),
    createSummary('all-seeds', rows),
  ];
  return { rows, summaryRows };
};

const createTwoStageThermalEvidence = () => {
  const defaultPhysics = createDefaultHeatCapacityFreePhysicsConfig();
  const baseConfig = defaultPhysics.thermal;
  const conditions: Array<{
    id: string;
    label: string;
    config: HeatCapacityFreeThermalConfig;
  }> = [
    {
      id: 'two-stage-nominal',
      label: '两级换热均启用',
      config: { ...baseConfig },
    },
    {
      id: 'gas-wall-disabled',
      label: '关闭气体—器壁换热',
      config: { ...baseConfig, gasWallConductanceWPerK: 0 },
    },
    {
      id: 'wall-ambient-disabled',
      label: '关闭器壁—环境换热',
      config: { ...baseConfig, wallAmbientConductanceWPerK: 0 },
    },
  ];
  const ambientTemperatureK = defaultPhysics.environment.ambientTemperatureK;
  const initialGasTemperatureK = ambientTemperatureK - 10;
  const initialWallTemperatureK = ambientTemperatureK;
  const rows: CsvRow[] = [];
  const summaryRows: CsvRow[] = [];
  for (const condition of conditions) {
    let state = {
      gasTemperatureK: initialGasTemperatureK,
      wallTemperatureK: initialWallTemperatureK,
    };
    let cumulativeHeatGasToWallJ = 0;
    let cumulativeHeatWallToAmbientJ = 0;
    const append = (timeS: number) => rows.push({
      condition_id: condition.id,
      condition_label: condition.label,
      time_s: timeS,
      gas_wall_conductance_w_per_k: condition.config.gasWallConductanceWPerK,
      wall_ambient_conductance_w_per_k: condition.config.wallAmbientConductanceWPerK,
      gas_temperature_k: round(state.gasTemperatureK, 8),
      wall_temperature_k: round(state.wallTemperatureK, 8),
      ambient_temperature_k: ambientTemperatureK,
      gas_recovery_fraction: round(
        (state.gasTemperatureK - initialGasTemperatureK) /
          (ambientTemperatureK - initialGasTemperatureK),
        8,
      ),
      cumulative_heat_gas_to_wall_j: round(cumulativeHeatGasToWallJ, 8),
      cumulative_heat_wall_to_ambient_j: round(cumulativeHeatWallToAmbientJ, 8),
    });
    append(0);
    for (let timeS = 1; timeS <= 300; timeS += 1) {
      const result = stepFreeThermalState(state, condition.config, {
        ambientPressureKPa: defaultPhysics.environment.ambientPressureKPa,
        ambientTemperatureK,
        vesselVolumeL: defaultPhysics.vesselVolumeL,
        gamma: defaultPhysics.gamma,
        gasAmountRatio: 1,
        dtS: 1,
      });
      state = result.state;
      cumulativeHeatGasToWallJ += result.heatGasToWallJ;
      cumulativeHeatWallToAmbientJ += result.heatWallToAmbientJ;
      if (timeS % 5 === 0) append(timeS);
    }
    summaryRows.push({
      condition_id: condition.id,
      condition_label: condition.label,
      gas_wall_conductance_w_per_k: condition.config.gasWallConductanceWPerK,
      wall_ambient_conductance_w_per_k: condition.config.wallAmbientConductanceWPerK,
      initial_gas_temperature_k: initialGasTemperatureK,
      initial_wall_temperature_k: initialWallTemperatureK,
      final_gas_temperature_k: round(state.gasTemperatureK, 8),
      final_wall_temperature_k: round(state.wallTemperatureK, 8),
      gas_recovery_fraction_at_300s: round(
        (state.gasTemperatureK - initialGasTemperatureK) /
          (ambientTemperatureK - initialGasTemperatureK),
        8,
      ),
      cumulative_heat_gas_to_wall_j: round(cumulativeHeatGasToWallJ, 8),
      cumulative_heat_wall_to_ambient_j: round(cumulativeHeatWallToAmbientJ, 8),
    });
  }
  return { rows, summaryRows };
};

const createStopcockEvidence = () => {
  const apertureTimesS = [
    ...Array.from({ length: 11 }, (_, index) => index * 0.01),
    0.2,
    HEAT_CAPACITY_STANDARD_OPERATION.releaseDurationS,
  ];
  const apertureRows: CsvRow[] = apertureTimesS.map((timeS) => ({
    time_since_open_s: round(timeS, 4),
    automatic_aperture_ratio: round(getHeatCapacityReleaseApertureRatio(timeS), 10),
    cumulative_effective_open_time_s: round(integrateHeatCapacityReleaseAperture(timeS), 10),
    mean_aperture_ratio_since_open: timeS === 0
      ? 0
      : round(integrateHeatCapacityReleaseAperture(timeS) / timeS, 10),
    independently_set_static_aperture: false,
  }));
  const flowRates = [0.2, 0.4, 0.79, 1.2];
  const scenarios = flowRates.map((stopcockFlowRate, index) => baseHeatScenario(
    `stopcock-flow-${String(index + 1).padStart(2, '0')}`,
    {
      label: `等效流通系数 ${stopcockFlowRate}`,
      stopcockFlowRate,
      leakageEnabled: false,
      leakageRatePerS: 0,
      pumpValveExchangeEnabled: false,
      environmentDisturbanceEnabled: false,
      instrumentNoiseEnabled: false,
    },
  ));
  const report = runHeatCapacityFreeParameterAcceptance({ scenarios });
  const flowRows: CsvRow[] = report.rows.map((row, index) => ({
    condition_id: scenarios[index].id,
    condition_label: scenarios[index].label,
    stopcock_flow_rate: flowRates[index],
    open_duration_s: row.openDurationS,
    automatic_aperture_ramp_s: 0.1,
    static_partial_aperture_ratio: null,
    u1_corrected_mv: row.u1CorrectedMv,
    u2_corrected_mv: row.u2CorrectedMv,
    gamma: row.gamma,
    u1_recordable: row.u1Recordable,
    u2_recordable: row.u2Recordable,
    interpretation_boundary: '流通系数敏感性，不等同于可保持的独立静态开度',
  }));
  return { apertureRows, flowRows };
};

const createEvidenceCoverageRows = (): CsvRow[] => [
  {
    category_id: 'two-stage-thermal',
    category: '两级换热',
    isolation_status: 'direct-module-isolated',
    representative_conditions: '两级均启用、气体—器壁关闭、器壁—环境关闭',
    evidence_files: 'rapid-release-two-stage-thermal-response.csv; rapid-release-two-stage-thermal-summary.csv',
    limitation: '完整实验验收入口只直接暴露气体—器壁热导；两级分别关闭的证据来自同一生产热模型的受控模块运行。',
  },
  {
    category_id: 'pump-energy-valve-exchange',
    category: '打气能量保留与泵阀交换',
    isolation_status: 'end-to-end-and-combination',
    representative_conditions: '泵阀交换单项、标准打气、50 s与120 s缓慢打气',
    evidence_files: 'rapid-release-nonideal-comparison.csv; rapid-release-summary.csv',
    limitation: '泵阀交换可以单项开关；打气能量保留与节奏在当前证据中以操作组合体现。',
  },
  {
    category_id: 'stopcock-aperture-duration',
    category: '旋塞开度与有限放气时间',
    isolation_status: 'limited-no-static-aperture-control',
    representative_conditions: '固定0.1 s平滑开启过程、0.2/0.4/0.79/1.2流通系数、0.03—10 s开启时间',
    evidence_files: 'rapid-release-stopcock-aperture-ramp.csv; rapid-release-stopcock-flow-sensitivity.csv; rapid-release-summary.csv',
    limitation: '当前物理控制接口只有开/关状态，开度由固定平滑斜坡自动生成，不能独立设置并保持某一静态部分开度；流通系数敏感性不得写成静态开度实验。',
  },
  {
    category_id: 'sealed-leakage',
    category: '密闭系统泄漏',
    isolation_status: 'end-to-end-isolated',
    representative_conditions: '关闭泄漏与仅启用默认泄漏率对照',
    evidence_files: 'rapid-release-nonideal-runs.csv; rapid-release-nonideal-comparison.csv',
    limitation: '单因素条件仍保留标称换热与传感器滞后。',
  },
  {
    category_id: 'environment-disturbance',
    category: '环境温度和压强扰动',
    isolation_status: 'end-to-end-isolated',
    representative_conditions: '固定环境与仅启用默认环境扰动对照',
    evidence_files: 'rapid-release-nonideal-runs.csv; rapid-release-nonideal-comparison.csv',
    limitation: '环境扰动幅值、时间尺度和相位属于软件场景参数。',
  },
  {
    category_id: 'sensor-lag-nonlinearity',
    category: '传感器滞后与非线性',
    isolation_status: 'direct-module-isolated',
    representative_conditions: '压强无滞后/lagRate=8 s^-1；温度无滞后/tau=0.8 s；静态非线性传递',
    evidence_files: 'rapid-release-sensor-lag-response.csv; rapid-release-sensor-lag-summary.csv; rapid-release-sensor-static-nonlinearity.csv',
    limitation: '完整实验验收入口不暴露滞后参数；当前理想—代表性对照是生产传感器模块的受控阶跃响应，不是完整实验γ单因素对照。',
  },
  {
    category_id: 'zero-noise-resolution',
    category: '调零偏差、噪声与显示分辨率',
    isolation_status: 'direct-signal-chain-and-repeated-sampling',
    representative_conditions: '5个初始零偏种子、±0.05 mV残差、0.01 mV内部量化、0.1 mV界面记录分辨率、5种子噪声采样',
    evidence_files: 'rapid-release-zero-calibration.csv; rapid-release-display-resolution.csv; rapid-release-display-resolution-gamma.csv; rapid-release-measurement-noise-resolution-runs.csv; rapid-release-measurement-noise-resolution-summary.csv',
    limitation: '恒定调零残差在正确记录U0并作差后会抵消；不得把该结果写成必然造成γ偏差。完整实验中的噪声、非线性和量化仍以组合传感器链运行。',
  },
  {
    category_id: 'nonstandard-operation',
    category: '非标准操作组合',
    isolation_status: 'end-to-end-scenarios',
    representative_conditions: '低压、缓慢打气、放气过短/过长、U1/U2记录过早或过晚',
    evidence_files: 'rapid-release-runs.csv; rapid-release-summary.csv',
    limitation: '极短开启会使U1与U2接近并导致γ公式数值发散，应作为错误操作诊断而非常规量程数据。',
  },
];

const runHeatCapacityEvidence = (outputDir: string) => {
  const descriptors = createHeatRunDescriptors(heatScenarioFamilies);
  const report = runHeatCapacityFreeParameterAcceptance({
    scenarios: descriptors.map((descriptor) => descriptor.scenario),
  });
  const rows: CsvRow[] = report.rows.map((row, index) => {
    const descriptor = descriptors[index];
    return {
      scenario_id: descriptor.family.id,
      scenario_label: descriptor.family.label,
      run_index: descriptor.runIndex,
      seed: descriptor.seed,
      pump_mode: row.pumpMode,
      release_mode: row.releaseMode,
      pump_strokes: row.pumpStrokes,
      pump_total_duration_s: row.pumpTotalDurationS,
      wait_after_pump_s: row.waitAfterPumpS,
      open_duration_s: row.openDurationS,
      wait_after_release_s: row.waitAfterReleaseS,
      leakage_enabled: row.leakageEnabled,
      leakage_rate_per_s: row.leakageRatePerS,
      u1_display_mv: row.u1DisplayMv,
      u1_temperature_mv: row.u1TemperatureMv,
      u2_display_mv: row.u2DisplayMv,
      u1_corrected_mv: row.u1CorrectedMv,
      u2_corrected_mv: row.u2CorrectedMv,
      gamma: row.gamma,
      gamma_absolute_error: row.gamma === null ? null : round(Math.abs(row.gamma - 1.4), 6),
      final_pressure_kpa: row.pressureKPa,
      final_gas_temperature_k: row.gasTemperatureK,
      final_gas_amount_ratio: row.gasAmountRatio,
      safety_status: row.safetyStatus,
      u1_recordable: row.u1Recordable,
      u2_recordable: row.u2Recordable,
      u1_reason: row.u1Reason,
      u2_reason: row.u2Reason,
    };
  });
  const summaryRows = heatScenarioFamilies.map((family) => (
    createHeatSummaryRow(family, rows.filter((row) => row.scenario_id === family.id))
  ));

  const defaultPhysics = createDefaultHeatCapacityFreePhysicsConfig();
  const nonidealConditions: HeatScenarioFamily[] = [
    {
      id: 'reference-reduced-nonideal',
      label: '基准：关闭泄漏、泵阀交换、环境扰动、噪声与非线性',
      runCount: 5,
      overrides: {
        leakageEnabled: false,
        leakageRatePerS: 0,
        pumpValveExchangeEnabled: false,
        environmentDisturbanceEnabled: false,
        instrumentNoiseEnabled: false,
      },
    },
    {
      id: 'leakage-only',
      label: '仅加入泄漏',
      runCount: 5,
      overrides: {
        leakageEnabled: true,
        leakageRatePerS: defaultPhysics.leakage.ratePerS,
        pumpValveExchangeEnabled: false,
        environmentDisturbanceEnabled: false,
        instrumentNoiseEnabled: false,
      },
    },
    {
      id: 'pump-valve-exchange-only',
      label: '仅加入泵阀交换',
      runCount: 5,
      overrides: {
        leakageEnabled: false,
        leakageRatePerS: 0,
        pumpValveExchangeEnabled: true,
        environmentDisturbanceEnabled: false,
        instrumentNoiseEnabled: false,
      },
    },
    {
      id: 'environment-disturbance-only',
      label: '仅加入环境扰动',
      runCount: 5,
      overrides: {
        leakageEnabled: false,
        leakageRatePerS: 0,
        pumpValveExchangeEnabled: false,
        environmentDisturbanceEnabled: true,
        instrumentNoiseEnabled: false,
      },
    },
    {
      id: 'instrument-noise-nonlinearity-only',
      label: '仅加入仪器噪声与压强非线性',
      runCount: 5,
      overrides: {
        leakageEnabled: false,
        leakageRatePerS: 0,
        pumpValveExchangeEnabled: false,
        environmentDisturbanceEnabled: false,
        instrumentNoiseEnabled: true,
      },
    },
    {
      id: 'weaker-gas-wall-transfer',
      label: '较弱气体—器壁换热（0.04 W/K）',
      runCount: 5,
      overrides: {
        gasWallConductanceWPerK: 0.04,
        leakageEnabled: false,
        leakageRatePerS: 0,
        pumpValveExchangeEnabled: false,
        environmentDisturbanceEnabled: false,
        instrumentNoiseEnabled: false,
      },
    },
    {
      id: 'stronger-gas-wall-transfer',
      label: '较强气体—器壁换热（0.16 W/K）',
      runCount: 5,
      overrides: {
        gasWallConductanceWPerK: 0.16,
        leakageEnabled: false,
        leakageRatePerS: 0,
        pumpValveExchangeEnabled: false,
        environmentDisturbanceEnabled: false,
        instrumentNoiseEnabled: false,
      },
    },
    {
      id: 'all-nonideal-defaults',
      label: '默认全部非理想因素',
      runCount: 5,
      overrides: {},
    },
  ];
  const nonidealDescriptors = createHeatRunDescriptors(nonidealConditions);
  const nonidealReport = runHeatCapacityFreeParameterAcceptance({
    scenarios: nonidealDescriptors.map((descriptor) => descriptor.scenario),
  });
  const nonidealRunRows: CsvRow[] = nonidealReport.rows.map((row, index) => {
    const descriptor = nonidealDescriptors[index];
    return {
      condition_id: descriptor.family.id,
      condition_label: descriptor.family.label,
      run_index: descriptor.runIndex,
      seed: descriptor.seed,
      gas_wall_conductance_w_per_k: descriptor.scenario.gasWallConductanceWPerK ??
        defaultPhysics.thermal.gasWallConductanceWPerK,
      leakage_enabled: descriptor.scenario.leakageEnabled ?? true,
      leakage_rate_per_s: descriptor.scenario.leakageRatePerS ?? defaultPhysics.leakage.ratePerS,
      pump_valve_exchange_enabled: descriptor.scenario.pumpValveExchangeEnabled ?? true,
      environment_disturbance_enabled: descriptor.scenario.environmentDisturbanceEnabled ?? true,
      instrument_noise_nonlinearity_enabled: descriptor.scenario.instrumentNoiseEnabled ?? true,
      u1_corrected_mv: row.u1CorrectedMv,
      u2_corrected_mv: row.u2CorrectedMv,
      gamma: row.gamma,
      gamma_absolute_error: row.gamma === null ? null : round(Math.abs(row.gamma - 1.4), 6),
      u1_recordable: row.u1Recordable,
      u2_recordable: row.u2Recordable,
    };
  });
  const referenceGamma = summarizeNumbers(nonidealRunRows
    .filter((row) => row.condition_id === 'reference-reduced-nonideal')
    .map((row) => typeof row.gamma === 'number' ? row.gamma : null)).mean;
  const nonidealSummaryRows: CsvRow[] = nonidealConditions.map((condition) => {
    const conditionRows = nonidealRunRows.filter((row) => row.condition_id === condition.id);
    const gammaSummary = summarizeNumbers(conditionRows.map((row) => (
      typeof row.gamma === 'number' ? row.gamma : null
    )));
    const u1Summary = summarizeNumbers(conditionRows.map((row) => (
      typeof row.u1_corrected_mv === 'number' ? row.u1_corrected_mv : null
    )));
    const u2Summary = summarizeNumbers(conditionRows.map((row) => (
      typeof row.u2_corrected_mv === 'number' ? row.u2_corrected_mv : null
    )));
    return {
      condition_id: condition.id,
      condition_label: condition.label,
      run_count: conditionRows.length,
      valid_gamma_count: gammaSummary.count,
      gamma_mean: round(gammaSummary.mean, 6),
      gamma_sample_sd: round(gammaSummary.sampleSd, 6),
      delta_gamma_vs_reference_mean: gammaSummary.mean === null || referenceGamma === null
        ? null
        : round(gammaSummary.mean - referenceGamma, 6),
      u1_corrected_mean_mv: round(u1Summary.mean, 4),
      u2_corrected_mean_mv: round(u2Summary.mean, 4),
      recordable_rate: round(
        conditionRows.filter((row) => row.u1_recordable === true && row.u2_recordable === true).length /
          conditionRows.length,
        6,
      ),
    };
  });

  const sensorLagEvidence = createSensorLagEvidence();
  const sensorStaticNonlinearityRows = createSensorStaticNonlinearityEvidence();
  const zeroCalibrationRows = createZeroCalibrationEvidence();
  const displayResolutionEvidence = createDisplayResolutionEvidence();
  const measurementNoiseResolutionEvidence = createMeasurementNoiseResolutionEvidence();
  const twoStageThermalEvidence = createTwoStageThermalEvidence();
  const stopcockEvidence = createStopcockEvidence();
  const evidenceCoverageRows = createEvidenceCoverageRows();

  const heatDir = join(outputDir, 'rapid-release');
  writeCsv(join(heatDir, 'rapid-release-runs.csv'), rows);
  writeCsv(join(heatDir, 'rapid-release-summary.csv'), summaryRows);
  writeCsv(join(heatDir, 'rapid-release-representative-trace.csv'), createRepresentativeHeatTrace());
  writeCsv(join(heatDir, 'rapid-release-nonideal-runs.csv'), nonidealRunRows);
  writeCsv(join(heatDir, 'rapid-release-nonideal-comparison.csv'), nonidealSummaryRows);
  writeCsv(join(heatDir, 'rapid-release-sensor-lag-response.csv'), sensorLagEvidence.rows);
  writeCsv(join(heatDir, 'rapid-release-sensor-lag-summary.csv'), sensorLagEvidence.summaryRows);
  writeCsv(
    join(heatDir, 'rapid-release-sensor-static-nonlinearity.csv'),
    sensorStaticNonlinearityRows,
  );
  writeCsv(join(heatDir, 'rapid-release-zero-calibration.csv'), zeroCalibrationRows);
  writeCsv(join(heatDir, 'rapid-release-display-resolution.csv'), displayResolutionEvidence.rows);
  writeCsv(
    join(heatDir, 'rapid-release-display-resolution-gamma.csv'),
    displayResolutionEvidence.summaryRows,
  );
  writeCsv(
    join(heatDir, 'rapid-release-measurement-noise-resolution-runs.csv'),
    measurementNoiseResolutionEvidence.rows,
  );
  writeCsv(
    join(heatDir, 'rapid-release-measurement-noise-resolution-summary.csv'),
    measurementNoiseResolutionEvidence.summaryRows,
  );
  writeCsv(
    join(heatDir, 'rapid-release-two-stage-thermal-response.csv'),
    twoStageThermalEvidence.rows,
  );
  writeCsv(
    join(heatDir, 'rapid-release-two-stage-thermal-summary.csv'),
    twoStageThermalEvidence.summaryRows,
  );
  writeCsv(
    join(heatDir, 'rapid-release-stopcock-aperture-ramp.csv'),
    stopcockEvidence.apertureRows,
  );
  writeCsv(
    join(heatDir, 'rapid-release-stopcock-flow-sensitivity.csv'),
    stopcockEvidence.flowRows,
  );
  writeCsv(join(heatDir, 'rapid-release-evidence-coverage.csv'), evidenceCoverageRows);

  return {
    runs: rows,
    summary: summaryRows,
    nonidealSummary: nonidealSummaryRows,
    sensorLagSummary: sensorLagEvidence.summaryRows,
    sensorStaticNonlinearity: sensorStaticNonlinearityRows,
    zeroCalibration: zeroCalibrationRows,
    displayResolutionSummary: displayResolutionEvidence.summaryRows,
    measurementNoiseResolutionSummary: measurementNoiseResolutionEvidence.summaryRows,
    twoStageThermalSummary: twoStageThermalEvidence.summaryRows,
    stopcockApertureRamp: stopcockEvidence.apertureRows,
    stopcockFlowSensitivity: stopcockEvidence.flowRows,
    evidenceCoverage: evidenceCoverageRows,
  };
};

interface EngineRunResult {
  engine: PhysicsEngine;
  params: SimulationParams;
}

const runPhysicsEngine = (params: SimulationParams, seed: string): EngineRunResult => (
  withSeededMathRandom(seed, () => {
    const engine = new PhysicsEngine({ ...params });
    const endTime = params.equilibriumTime + params.statsDuration;
    while (engine.time < endTime - 1e-10) {
      engine.step();
      if (engine.time >= params.equilibriumTime && engine.time < endTime) {
        engine.collectSamples();
      }
    }
    engine.flushPressureMeasurement();
    return { engine, params: { ...params } };
  })
);

const relationPresets: Record<ExperimentRelation, readonly number[]> = {
  pt: TEMPERATURE_PRESET_SEQUENCE,
  pv: BOX_LENGTH_PRESET_SEQUENCE,
  pn: PARTICLE_COUNT_PRESET_SEQUENCE,
};

const applyRelationValue = (
  relation: ExperimentRelation,
  params: SimulationParams,
  value: number,
): SimulationParams => {
  const next = { ...params };
  if (relation === 'pt') next.targetTemperature = value;
  if (relation === 'pv') next.L = value;
  if (relation === 'pn') next.N = Math.round(value);
  return next;
};

const runIdealGasEvidence = (outputDir: string) => {
  const stablePreset = idealSamplingPresets.find((preset) => preset.key === 'stable');
  if (!stablePreset) throw new Error('Stable ideal-gas sampling preset not found.');
  const baseParams: SimulationParams = {
    ...DEFAULT_IDEAL_PARAMS,
    equilibriumTime: stablePreset.equilibriumTime,
    statsDuration: stablePreset.statsDuration,
  };
  const seeds = Array.from({ length: 5 }, (_, index) => (
    `ideal-gas-seed-${String(index + 1).padStart(2, '0')}`
  ));
  const points: Array<{
    relation: ExperimentRelation;
    scanValue: number;
    seed: string;
    seedIndex: number;
    point: IdealGasExperimentPoint;
    row: CsvRow;
  }> = [];

  for (const relation of ['pt', 'pv', 'pn'] as const) {
    for (const [scanIndex, scanValue] of relationPresets[relation].entries()) {
      for (const [seedIndex, seedBase] of seeds.entries()) {
        const seed = `${seedBase}-${relation}-${String(scanIndex + 1).padStart(2, '0')}`;
        const params = applyRelationValue(relation, baseParams, scanValue);
        const { engine } = runPhysicsEngine(params, seed);
        const pressure = engine.getPressureMeasurementSummary();
        const point = createIdealGasExperimentPoint(
          relation,
          params,
          pressure,
          (seedIndex + 1) * 1000 + scanIndex + 1,
        );
        if (!point || pressure.meanPressure === null || pressure.meanIdealPressure === null) {
          throw new Error(`Ideal-gas run did not produce a point: ${relation}/${scanValue}/${seed}`);
        }
        const finalStats = engine.getStats();
        const row: CsvRow = {
          relation: relation === 'pv' ? 'P-1/V' : relation === 'pt' ? 'P-T' : 'P-N',
          relation_key: relation,
          scan_value: scanValue,
          seed,
          seed_index: seedIndex + 1,
          particle_count_n: params.N,
          box_length_l: params.L,
          volume_v: round(params.L ** 3, 8),
          inverse_volume_1_per_v: round(1 / (params.L ** 3), 12),
          target_temperature: params.targetTemperature ?? null,
          equilibrium_time_s: params.equilibriumTime,
          stats_duration_s: params.statsDuration,
          dt_s: params.dt,
          thermostat_frequency_nu: params.nu,
          wall_momentum_mean_pressure: round(pressure.meanPressure, 10),
          ideal_reference_mean_pressure: round(pressure.meanIdealPressure, 10),
          pressure_relative_gap_percent: round(pressure.relativeGap, 8),
          mean_temperature: round(pressure.meanTemperature, 10),
          pressure_window_count: pressure.sampleCount,
          final_temperature: round(finalStats.temperature, 10),
          final_mean_speed: round(finalStats.meanSpeed, 10),
          final_rms_speed: round(finalStats.rmsSpeed, 10),
        };
        points.push({ relation, scanValue, seed, seedIndex: seedIndex + 1, point, row });
      }
    }
  }

  const pointSummaryRows: CsvRow[] = [];
  const aggregatePointsByRelation = createEmptyPointsByRelation();
  for (const relation of ['pt', 'pv', 'pn'] as const) {
    for (const scanValue of relationPresets[relation]) {
      const group = points.filter((candidate) => (
        candidate.relation === relation && candidate.scanValue === scanValue
      ));
      const pressureSummary = summarizeNumbers(group.map((candidate) => candidate.point.meanPressure));
      const idealSummary = summarizeNumbers(group.map((candidate) => candidate.point.idealPressure));
      const tempSummary = summarizeNumbers(group.map((candidate) => candidate.point.meanTemperature));
      const gapSummary = summarizeNumbers(group.map((candidate) => candidate.point.relativeGap));
      const template = group[0]?.point;
      if (!template || pressureSummary.mean === null || idealSummary.mean === null || tempSummary.mean === null ||
        gapSummary.mean === null) {
        throw new Error(`Missing aggregate ideal-gas point for ${relation}/${scanValue}`);
      }
      aggregatePointsByRelation[relation].push({
        ...template,
        id: `${relation}-aggregate-${scanValue}`,
        meanPressure: pressureSummary.mean,
        idealPressure: idealSummary.mean,
        meanTemperature: tempSummary.mean,
        relativeGap: gapSummary.mean,
        timestamp: 0,
      });
      pointSummaryRows.push({
        relation: relation === 'pv' ? 'P-1/V' : relation === 'pt' ? 'P-T' : 'P-N',
        relation_key: relation,
        scan_value: scanValue,
        seed_count: group.length,
        measured_pressure_mean: round(pressureSummary.mean, 10),
        measured_pressure_sample_sd: round(pressureSummary.sampleSd, 10),
        ideal_pressure_mean: round(idealSummary.mean, 10),
        mean_temperature_mean: round(tempSummary.mean, 10),
        pressure_relative_gap_mean_percent: round(gapSummary.mean, 8),
        pressure_relative_gap_sample_sd_percent: round(gapSummary.sampleSd, 8),
      });
    }
  }

  const seedRegressionRows: CsvRow[] = [];
  for (const relation of ['pt', 'pv', 'pn'] as const) {
    for (let seedIndex = 1; seedIndex <= seeds.length; seedIndex += 1) {
      const seedPoints = points
        .filter((candidate) => candidate.relation === relation && candidate.seedIndex === seedIndex)
        .map((candidate) => candidate.point);
      const theoreticalSlope = getTheoreticalSlope(relation, baseParams);
      const regression = calculateLinearRegression(
        seedPoints,
        (point) => getRelationXValue(relation, point),
        (point) => point.meanPressure,
        theoreticalSlope,
      );
      seedRegressionRows.push({
        relation: relation === 'pv' ? 'P-1/V' : relation === 'pt' ? 'P-T' : 'P-N',
        relation_key: relation,
        seed_index: seedIndex,
        seed_family: seeds[seedIndex - 1],
        point_count: seedPoints.length,
        fitted_slope: round(regression.slope, 12),
        fitted_intercept: round(regression.intercept, 12),
        r_squared: round(regression.rSquared, 10),
        theoretical_slope: round(theoreticalSlope, 12),
        slope_relative_error_percent: round(regression.slopeError, 8),
      });
    }
  }

  const relationSummaryRows: CsvRow[] = (['pt', 'pv', 'pn'] as const).map((relation) => {
    const analysis = getIdealGasAnalysis(relation, aggregatePointsByRelation, baseParams);
    const seedRows = seedRegressionRows.filter((row) => row.relation_key === relation);
    const r2Summary = summarizeNumbers(seedRows.map((row) => (
      typeof row.r_squared === 'number' ? row.r_squared : null
    )));
    const slopeErrorSummary = summarizeNumbers(seedRows.map((row) => (
      typeof row.slope_relative_error_percent === 'number' ? row.slope_relative_error_percent : null
    )));
    return {
      relation: relation === 'pv' ? 'P-1/V' : relation === 'pt' ? 'P-T' : 'P-N',
      relation_key: relation,
      points_per_seed: relationPresets[relation].length,
      seed_count: seeds.length,
      aggregate_fitted_slope: round(analysis.regression.slope, 12),
      aggregate_fitted_intercept: round(analysis.regression.intercept, 12),
      aggregate_r_squared: round(analysis.regression.rSquared, 10),
      theoretical_slope: round(analysis.theoreticalSlope, 12),
      aggregate_slope_relative_error_percent: round(analysis.regression.slopeError, 8),
      verdict: analysis.verdictState,
      seed_r_squared_mean: round(r2Summary.mean, 10),
      seed_r_squared_min: round(r2Summary.min, 10),
      seed_slope_error_mean_percent: round(slopeErrorSummary.mean, 8),
      seed_slope_error_max_percent: round(slopeErrorSummary.max, 8),
    };
  });

  const idealDir = join(outputDir, 'ideal-gas');
  writeCsv(join(idealDir, 'ideal-gas-runs.csv'), points.map((candidate) => candidate.row));
  writeCsv(join(idealDir, 'ideal-gas-point-summary.csv'), pointSummaryRows);
  writeCsv(join(idealDir, 'ideal-gas-seed-regression.csv'), seedRegressionRows);
  writeCsv(join(idealDir, 'ideal-gas-relation-summary.csv'), relationSummaryRows);

  return {
    runs: points.map((candidate) => candidate.row),
    pointSummary: pointSummaryRows,
    relationSummary: relationSummaryRows,
    params: baseParams,
    seeds,
  };
};

const distributionL1 = (
  bins: Array<{ binStart: number; binEnd: number; probability: number; theoretical?: number }>,
) => bins.reduce((sum, bin) => (
  sum + Math.abs(bin.probability - (bin.theoretical ?? 0)) * (bin.binEnd - bin.binStart)
), 0);

const distributionRmse = (
  bins: Array<{ probability: number; theoretical?: number }>,
) => Math.sqrt(bins.reduce((sum, bin) => (
  sum + (bin.probability - (bin.theoretical ?? 0)) ** 2
), 0) / Math.max(1, bins.length));

const totalParticleEnergy = (engine: PhysicsEngine) => engine.particles.reduce(
  (sum, particle) => sum + particle.energy,
  0,
);

const runHardSphereEvidence = (outputDir: string) => {
  const seeds = Array.from({ length: 5 }, (_, index) => (
    `hard-sphere-seed-${String(index + 1).padStart(2, '0')}`
  ));
  const runRows: CsvRow[] = [];
  const speedRows: CsvRow[] = [];
  const energyRows: CsvRow[] = [];
  const pressureWindowRows: CsvRow[] = [];

  for (const [seedIndex, seed] of seeds.entries()) {
    const params = { ...DEFAULT_STANDARD_PARAMS };
    const { engine } = runPhysicsEngine(params, seed);
    const chart = engine.getHistogramData(true);
    const pressure = engine.getPressureMeasurementSummary();
    const stats = engine.getStats();
    const speedSummary = summarizeNumbers(engine.collectedSpeeds);
    const energySummary = summarizeNumbers(engine.collectedEnergies);
    runRows.push({
      seed,
      seed_index: seedIndex + 1,
      particle_count_n: params.N,
      box_length_l: params.L,
      particle_radius_r: params.r,
      particle_mass_m: params.m,
      boltzmann_constant_k: params.k,
      dt_s: params.dt,
      thermostat_frequency_nu: params.nu,
      equilibrium_time_s: params.equilibriumTime,
      stats_duration_s: params.statsDuration,
      engine_target_temperature: round(engine.targetTemperature, 10),
      final_temperature: round(stats.temperature, 10),
      measured_mean_speed: round(speedSummary.mean, 10),
      theoretical_mean_speed: round(Math.sqrt(
        (8 * params.k * engine.targetTemperature) / (Math.PI * params.m),
      ), 10),
      final_rms_speed: round(stats.rmsSpeed, 10),
      theoretical_rms_speed: round(Math.sqrt(
        (3 * params.k * engine.targetTemperature) / params.m,
      ), 10),
      measured_mean_energy: round(energySummary.mean, 10),
      theoretical_mean_energy: round(1.5 * params.k * engine.targetTemperature, 10),
      retained_particle_samples: engine.collectedSpeeds.length,
      collected_sample_windows: engine.getCollectedSampleCount(),
      speed_bin_count: chart.speed.length,
      energy_bin_count: chart.energy.length,
      speed_distribution_l1: round(distributionL1(chart.speed), 8),
      speed_distribution_rmse: round(distributionRmse(chart.speed), 8),
      energy_distribution_l1: round(distributionL1(chart.energy), 8),
      energy_distribution_rmse: round(distributionRmse(chart.energy), 8),
      wall_momentum_mean_pressure: round(pressure.meanPressure, 10),
      ideal_reference_mean_pressure: round(pressure.meanIdealPressure, 10),
      pressure_relative_gap_percent: round(pressure.relativeGap, 8),
      pressure_window_count: pressure.sampleCount,
    });
    for (const [binIndex, bin] of chart.speed.entries()) {
      speedRows.push({
        seed,
        seed_index: seedIndex + 1,
        bin_index: binIndex + 1,
        bin_start: round(bin.binStart, 10),
        bin_end: round(bin.binEnd, 10),
        bin_center: round((bin.binStart + bin.binEnd) / 2, 10),
        count: bin.count,
        empirical_density: round(bin.probability, 10),
        theoretical_density: round(bin.theoretical ?? null, 10),
        empirical_probability_mass: round(bin.probability * (bin.binEnd - bin.binStart), 10),
        theoretical_probability_mass: round((bin.theoretical ?? 0) * (bin.binEnd - bin.binStart), 10),
      });
    }
    for (const [binIndex, bin] of chart.energy.entries()) {
      energyRows.push({
        seed,
        seed_index: seedIndex + 1,
        bin_index: binIndex + 1,
        bin_start: round(bin.binStart, 10),
        bin_end: round(bin.binEnd, 10),
        bin_center: round((bin.binStart + bin.binEnd) / 2, 10),
        count: bin.count,
        empirical_density: round(bin.probability, 10),
        theoretical_density: round(bin.theoretical ?? null, 10),
        empirical_probability_mass: round(bin.probability * (bin.binEnd - bin.binStart), 10),
        theoretical_probability_mass: round((bin.theoretical ?? 0) * (bin.binEnd - bin.binStart), 10),
        empirical_log_density: bin.probability > 0 ? round(Math.log(bin.probability), 10) : null,
        theoretical_log_density: (bin.theoretical ?? 0) > 0
          ? round(Math.log(bin.theoretical ?? 0), 10)
          : null,
      });
    }
    for (const [windowIndex, window] of pressure.history
      .filter((candidate) => candidate.isCollectionWindow)
      .entries()) {
      pressureWindowRows.push({
        seed,
        seed_index: seedIndex + 1,
        window_index: windowIndex + 1,
        end_time_s: round(window.time, 8),
        duration_s: round(window.duration, 8),
        wall_momentum_pressure: round(window.measuredPressure, 10),
        ideal_reference_pressure: round(window.idealPressure, 10),
        relative_gap_percent: window.idealPressure === 0
          ? null
          : round(((window.measuredPressure - window.idealPressure) / window.idealPressure) * 100, 8),
      });
    }
  }

  const conservationRows: CsvRow[] = [];
  const conservationSummaryRows: CsvRow[] = [];
  const conservationDurationS = 60;
  for (const [seedIndex, seedBase] of seeds.entries()) {
    const seed = `${seedBase}-nu0`;
    const params: SimulationParams = {
      ...DEFAULT_STANDARD_PARAMS,
      nu: 0,
      equilibriumTime: 0,
      statsDuration: conservationDurationS,
    };
    const result = withSeededMathRandom(seed, () => {
      const engine = new PhysicsEngine(params);
      const initialEnergy = totalParticleEnergy(engine);
      const sampled: CsvRow[] = [];
      const append = () => {
        const energy = totalParticleEnergy(engine);
        sampled.push({
          seed,
          seed_index: seedIndex + 1,
          time_s: round(engine.time, 8),
          total_energy: round(energy, 12),
          absolute_drift: round(energy - initialEnergy, 12),
          relative_drift_percent: round(((energy - initialEnergy) / initialEnergy) * 100, 12),
        });
      };
      append();
      let nextSampleAtS = 1;
      while (engine.time < conservationDurationS - 1e-10) {
        engine.step();
        if (engine.time + 1e-9 >= nextSampleAtS) {
          append();
          nextSampleAtS += 1;
        }
      }
      return { engine, initialEnergy, sampled };
    });
    conservationRows.push(...result.sampled);
    const finalEnergy = totalParticleEnergy(result.engine);
    const sampledEnergies = result.sampled.map((row) => (
      typeof row.total_energy === 'number' ? row.total_energy : null
    ));
    const energySummary = summarizeNumbers(sampledEnergies);
    const maxAbsRelativeDrift = Math.max(...result.sampled.map((row) => (
      typeof row.relative_drift_percent === 'number' ? Math.abs(row.relative_drift_percent) : 0
    )));
    conservationSummaryRows.push({
      seed,
      seed_index: seedIndex + 1,
      particle_count_n: params.N,
      dt_s: params.dt,
      thermostat_frequency_nu: params.nu,
      duration_s: conservationDurationS,
      initial_total_energy: round(result.initialEnergy, 12),
      final_total_energy: round(finalEnergy, 12),
      final_relative_drift_percent: round(
        ((finalEnergy - result.initialEnergy) / result.initialEnergy) * 100,
        12,
      ),
      maximum_absolute_relative_drift_percent: round(maxAbsRelativeDrift, 12),
      sampled_energy_min: round(energySummary.min, 12),
      sampled_energy_max: round(energySummary.max, 12),
    });
  }

  const hardSphereDir = join(outputDir, 'hard-sphere');
  writeCsv(join(hardSphereDir, 'hard-sphere-run-summary.csv'), runRows);
  writeCsv(join(hardSphereDir, 'hard-sphere-speed-distribution-30-bin.csv'), speedRows);
  writeCsv(join(hardSphereDir, 'hard-sphere-energy-distribution-30-bin.csv'), energyRows);
  writeCsv(join(hardSphereDir, 'hard-sphere-pressure-windows.csv'), pressureWindowRows);
  writeCsv(join(hardSphereDir, 'hard-sphere-energy-conservation-nu0.csv'), conservationRows);
  writeCsv(join(hardSphereDir, 'hard-sphere-energy-conservation-summary-nu0.csv'), conservationSummaryRows);

  return {
    runSummary: runRows,
    conservationSummary: conservationSummaryRows,
    params: DEFAULT_STANDARD_PARAMS,
    seeds,
  };
};

const getFileDescriptor = (path: string) => ({
  path: relative(ROOT_DIR, path).replaceAll('\\', '/'),
  bytes: statSync(path).size,
  sha256: sha256File(path),
});

const createReadme = (
  outputDir: string,
  heat: ReturnType<typeof runHeatCapacityEvidence>,
  ideal: ReturnType<typeof runIdealGasEvidence>,
  hardSphere: ReturnType<typeof runHardSphereEvidence>,
) => {
  const standardHeat = heat.summary.find((row) => row.scenario_id === 'standard-realistic');
  const lines = [
    '# 研究报告可复核数据证据',
    '',
    `生成器版本：${SCRIPT_VERSION}`,
    '',
    '本目录由固定种子脚本生成，覆盖快速放气法、理想气体关系验证和独立硬球分子模块。CSV 使用 UTF-8 BOM，便于在常用表格软件中直接打开。',
    '',
    '## 当前范围',
    '',
    '- 快速放气法：逐次结果、按情形汇总、标准操作代表性时序、非理想因素逐项对照，以及传感器、调零、分辨率、两级换热和旋塞模型的可复核补充证据。',
    '- 理想气体：P-T、P-1/V、P-N 各 6 个预设点，每点 5 个固定种子，采用 Stable（6 s 平衡 + 20 s 统计）采样。',
    '- 独立硬球：5 个固定种子的 30 箱速率/能量分布、壁面动量压强窗口，以及独立的 nu=0 能量守恒组。',
    '- 空气振动法、新实验界面、仪器与软件操作截图不在本次生成范围内，继续保留为最终软件版本后的占位材料。',
    '',
    '## 文件说明',
    '',
    '- `rapid-release/rapid-release-runs.csv`：全部快速放气检验的逐次结果。',
    '- `rapid-release/rapid-release-summary.csv`：各操作情形的均值、标准差、误差带与可记录率。',
    '- `rapid-release/rapid-release-representative-trace.csv`：18 次打气—等待—快速放气—恢复全过程时序。',
    '- `rapid-release/rapid-release-nonideal-runs.csv` 与 `rapid-release-nonideal-comparison.csv`：非理想因素逐次值与汇总对照。',
    '- `rapid-release/rapid-release-sensor-lag-response.csv` 与 `rapid-release-sensor-lag-summary.csv`：压强、温度传感器的理想无滞后与代表性滞后阶跃响应。',
    '- `rapid-release/rapid-release-sensor-static-nonlinearity.csv`：压强通道静态非线性传递关系，不叠加随机误差。',
    '- `rapid-release/rapid-release-zero-calibration.csv`：固定种子初始零偏、调零残差与 U0 作差结果。',
    '- `rapid-release/rapid-release-display-resolution.csv` 与 `rapid-release-display-resolution-gamma.csv`：内部 0.01 mV 量化、界面 0.1 mV 记录分辨率及其对代表性 γ 计算的影响。',
    '- `rapid-release/rapid-release-measurement-noise-resolution-runs.csv` 与 `rapid-release/rapid-release-measurement-noise-resolution-summary.csv`：5 个固定种子的噪声、量化与界面记录结果。',
    '- `rapid-release/rapid-release-two-stage-thermal-response.csv` 与 `rapid-release/rapid-release-two-stage-thermal-summary.csv`：气体—器壁、器壁—环境两级换热的受控模块对照。',
    '- `rapid-release/rapid-release-stopcock-aperture-ramp.csv`：生产模型固定平滑开启动画对应的开度与累积有效开启时间。',
    '- `rapid-release/rapid-release-stopcock-flow-sensitivity.csv`：不同等效流通系数下的完整实验结果；该参数不等同于静态旋塞开度。',
    '- `rapid-release/rapid-release-evidence-coverage.csv`：第 5.2.2 所列八类验证对象的证据文件、隔离状态与表述边界。',
    '- `ideal-gas/ideal-gas-runs.csv`：90 次独立运行（3 关系 × 6 点 × 5 种子）。',
    '- `ideal-gas/ideal-gas-point-summary.csv`：每个预设点的 5 种子汇总。',
    '- `ideal-gas/ideal-gas-seed-regression.csv`：每个种子的一轮 6 点拟合。',
    '- `ideal-gas/ideal-gas-relation-summary.csv`：三种关系的总体拟合与判定。',
    '- `hard-sphere/hard-sphere-run-summary.csv`：分布、特征速度、平均能量和壁面压强汇总。',
    '- `hard-sphere/hard-sphere-speed-distribution-30-bin.csv`：5 种子 × 30 箱速率分布。',
    '- `hard-sphere/hard-sphere-energy-distribution-30-bin.csv`：5 种子 × 30 箱能量分布。',
    '- `hard-sphere/hard-sphere-pressure-windows.csv`：统计阶段逐窗口壁面动量压强与理想压强。',
    '- `hard-sphere/hard-sphere-energy-conservation-nu0.csv`：nu=0 组逐秒总能量。',
    '- `hard-sphere/hard-sphere-energy-conservation-summary-nu0.csv`：nu=0 组漂移汇总。',
    '- `evidence-summary.json`：适合写作程序读取的核心汇总。',
    '- `evidence-metadata.json`：版本、工作树、参数、种子、源码 SHA-256 与生成文件 SHA-256。',
    '',
    '## 可隔离性与表述边界',
    '',
    '- 当前完整实验验收入口只直接暴露气体—器壁热导。两级换热分别关闭的证据来自同一生产热模型的受控模块运行，不应写成完整实验 γ 的两项独立单因素结果。',
    '- 两级换热数据沿用生产模块的热量符号约定：气体向器壁、器壁向环境为正；负值表示实际传热方向相反。',
    '- 当前完整实验验收入口不暴露压强、温度传感器的滞后参数。滞后证据是生产传感器模块的阶跃响应，用于说明数值实现，不是完整实验 γ 的单因素对照。',
    '- 当前物理控制接口只有旋塞开/关；开度由固定 0.1 s 平滑斜坡自动生成，不能独立设置并保持某一静态部分开度。流通系数敏感性只能表述为等效流通能力变化。',
    '- 正确记录 U0 并用 U1-U0、U2-U0 作差时，恒定调零残差会抵消，因此本证据不支持“恒定零偏必然导致 γ 偏差”的表述。',
    '- “关闭泄漏、泵阀交换、环境扰动、噪声与非线性”的参考条件仍保留标称换热与传感器滞后，不是所有非理想因素全部关闭。',
    '- 本次未创建任何图片；空气振动法、新实验仪器和软件操作界面仍等待最终版本后补充。',
    '',
    '## 快速核对',
    '',
    `- 标准真实化快速放气：30 次，γ 均值 ${standardHeat?.gamma_mean ?? 'n/a'}，样本标准差 ${standardHeat?.gamma_sample_sd ?? 'n/a'}。`,
    `- 理想气体关系：${ideal.relationSummary.map((row) => `${row.relation} R²=${row.aggregate_r_squared}`).join('；')}。`,
    `- 独立硬球：${hardSphere.runSummary.length} 个分布种子；nu=0 能量守恒 ${hardSphere.conservationSummary.length} 个种子。`,
    '',
    '重新生成命令：',
    '',
    '```powershell',
    'node scripts/research-report/generate-evidence.ts',
    '```',
    '',
  ];
  writeFileSync(join(outputDir, 'README.md'), `${UTF8_BOM}${lines.join('\n')}`, 'utf8');
};

export const generateResearchReportEvidence = (outputDir = DEFAULT_OUTPUT_DIR) => {
  const resolvedOutputDir = resolve(outputDir);
  mkdirSync(resolvedOutputDir, { recursive: true });
  const packageJson = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf8')) as {
    version?: string;
    name?: string;
  };
  const startedAt = new Date().toISOString();
  const gitStatusAtStart = getGitOutput(['status', '--porcelain=v1']);
  const gitStatusEntryCountAtStart = gitStatusAtStart
    ? gitStatusAtStart.split(/\r?\n/).length
    : 0;
  const gitCommit = getGitOutput(['rev-parse', 'HEAD']);

  const heat = runHeatCapacityEvidence(resolvedOutputDir);
  const ideal = runIdealGasEvidence(resolvedOutputDir);
  const hardSphere = runHardSphereEvidence(resolvedOutputDir);

  const evidenceSummary = {
    schemaVersion: 1,
    generatedAt: startedAt,
    rapidRelease: {
      scenarioSummary: heat.summary,
      nonidealComparison: heat.nonidealSummary,
      sensorLagSummary: heat.sensorLagSummary,
      sensorStaticNonlinearity: heat.sensorStaticNonlinearity,
      zeroCalibration: heat.zeroCalibration,
      displayResolutionSummary: heat.displayResolutionSummary,
      measurementNoiseResolutionSummary: heat.measurementNoiseResolutionSummary,
      twoStageThermalSummary: heat.twoStageThermalSummary,
      stopcockApertureRamp: heat.stopcockApertureRamp,
      stopcockFlowSensitivity: heat.stopcockFlowSensitivity,
      evidenceCoverage: heat.evidenceCoverage,
    },
    idealGas: {
      pointSummary: ideal.pointSummary,
      relationSummary: ideal.relationSummary,
    },
    hardSphere: {
      runSummary: hardSphere.runSummary,
      energyConservationSummaryNu0: hardSphere.conservationSummary,
    },
  };
  writeJson(join(resolvedOutputDir, 'evidence-summary.json'), evidenceSummary);
  createReadme(resolvedOutputDir, heat, ideal, hardSphere);

  const generatedRelativeFiles = [
    'README.md',
    'evidence-summary.json',
    'rapid-release/rapid-release-runs.csv',
    'rapid-release/rapid-release-summary.csv',
    'rapid-release/rapid-release-representative-trace.csv',
    'rapid-release/rapid-release-nonideal-runs.csv',
    'rapid-release/rapid-release-nonideal-comparison.csv',
    'rapid-release/rapid-release-sensor-lag-response.csv',
    'rapid-release/rapid-release-sensor-lag-summary.csv',
    'rapid-release/rapid-release-sensor-static-nonlinearity.csv',
    'rapid-release/rapid-release-zero-calibration.csv',
    'rapid-release/rapid-release-display-resolution.csv',
    'rapid-release/rapid-release-display-resolution-gamma.csv',
    'rapid-release/rapid-release-measurement-noise-resolution-runs.csv',
    'rapid-release/rapid-release-measurement-noise-resolution-summary.csv',
    'rapid-release/rapid-release-two-stage-thermal-response.csv',
    'rapid-release/rapid-release-two-stage-thermal-summary.csv',
    'rapid-release/rapid-release-stopcock-aperture-ramp.csv',
    'rapid-release/rapid-release-stopcock-flow-sensitivity.csv',
    'rapid-release/rapid-release-evidence-coverage.csv',
    'ideal-gas/ideal-gas-runs.csv',
    'ideal-gas/ideal-gas-point-summary.csv',
    'ideal-gas/ideal-gas-seed-regression.csv',
    'ideal-gas/ideal-gas-relation-summary.csv',
    'hard-sphere/hard-sphere-run-summary.csv',
    'hard-sphere/hard-sphere-speed-distribution-30-bin.csv',
    'hard-sphere/hard-sphere-energy-distribution-30-bin.csv',
    'hard-sphere/hard-sphere-pressure-windows.csv',
    'hard-sphere/hard-sphere-energy-conservation-nu0.csv',
    'hard-sphere/hard-sphere-energy-conservation-summary-nu0.csv',
  ];
  const metadata = {
    schemaVersion: 1,
    scriptVersion: SCRIPT_VERSION,
    randomGenerator: RNG_VERSION,
    generatedAt: startedAt,
    finishedAt: new Date().toISOString(),
    command: 'node scripts/research-report/generate-evidence.ts',
    repository: {
      root: '.',
      packageName: packageJson.name ?? null,
      packageVersion: packageJson.version ?? null,
      gitCommit: gitCommit || null,
      dirtyAtStart: gitStatusEntryCountAtStart > 0,
      dirtyEntryCountAtStart: gitStatusEntryCountAtStart,
    },
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    parameters: {
      rapidReleaseStandardOperation: HEAT_CAPACITY_STANDARD_OPERATION,
      rapidReleaseScenarioFamilies: heatScenarioFamilies,
      rapidReleaseAdditionalEvidence: {
        pressureLagRatesPerS: [1_000_000, createDefaultHeatCapacityFreeSensorConfig().lagRate],
        temperatureSensorTauS: [0.001, 0.8],
        sensorStepResponseDurationS: 3,
        twoStageThermalConditions: [
          'nominal',
          'gas-wall-conductance-disabled',
          'wall-ambient-conductance-disabled',
        ],
        stopcockAutomaticApertureRampS: 0.1,
        stopcockFlowRates: [0.2, 0.4, 0.79, 1.2],
        internalSensorQuantizationMv: createDefaultHeatCapacityFreeSensorConfig().quantizationMv,
        uiRecordResolutionMv: 0.1,
      },
      idealGasStable: ideal.params,
      idealGasPresetSequences: relationPresets,
      hardSphereDistribution: hardSphere.params,
      hardSphereEnergyConservation: {
        ...hardSphere.params,
        nu: 0,
        equilibriumTime: 0,
        statsDuration: 60,
      },
    },
    seeds: {
      idealGas: ideal.seeds,
      hardSphere: hardSphere.seeds,
      rapidReleaseSeedRule: 'free-acceptance-heat-<scenario-id>-<two-digit-run-index>',
      representativeTrace: 'heat-trace-standard-realistic-01',
    },
    sourceFiles: createSourceHashes(),
    generatedFiles: generatedRelativeFiles.map((relativePath) => (
      getFileDescriptor(join(resolvedOutputDir, relativePath))
    )),
  };
  writeJson(join(resolvedOutputDir, 'evidence-metadata.json'), metadata);
  return {
    outputDir: resolvedOutputDir,
    heat,
    ideal,
    hardSphere,
    metadata,
  };
};

const directEntry = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (directEntry) {
  const result = generateResearchReportEvidence();
  console.log(`Research-report evidence generated at ${result.outputDir}`);
}
