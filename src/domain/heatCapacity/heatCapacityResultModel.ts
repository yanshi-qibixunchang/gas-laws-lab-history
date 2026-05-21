import {
  createDeterministicHeatCapacitySamples,
  getHeatCapacitySample,
  type HeatCapacitySample,
  type HeatCapacitySampleMap,
} from './heatCapacitySampling.ts';

export interface HeatCapacityCalculationOptions {
  atmosphericPressureKPa?: number;
  pressureSensitivityMvPerKPa?: number;
  theoreticalGamma?: number;
}

export interface HeatCapacityResult {
  ready: boolean;
  experimentObject: 'air';
  theoreticalGamma: number;
  U0Mv: number | null;
  U1Mv: number | null;
  U2Mv: number | null;
  atmosphericPressureKPa: number;
  pressureSensitivityMvPerKPa: number;
  deltaP1KPa: number | null;
  deltaP2KPa: number | null;
  P0KPa: number | null;
  P1KPa: number | null;
  P2KPa: number | null;
  gamma: number | null;
  relativeErrorPercent: number | null;
  status: 'not-ready' | 'missing-samples' | 'ready' | 'invalid-data';
  message: string;
}

export const DEFAULT_HEAT_CAPACITY_RESULT_OPTIONS = {
  atmosphericPressureKPa: 101.3,
  pressureSensitivityMvPerKPa: 20,
  theoreticalGamma: 1.4,
} as const;

const MIN_LOG_DENOMINATOR = 1e-8;
const MIN_REASONABLE_GAMMA = 1;
const MAX_REASONABLE_GAMMA = 2;

const normalizeOptions = (options: HeatCapacityCalculationOptions = {}) => ({
  atmosphericPressureKPa: options.atmosphericPressureKPa ?? DEFAULT_HEAT_CAPACITY_RESULT_OPTIONS.atmosphericPressureKPa,
  pressureSensitivityMvPerKPa: options.pressureSensitivityMvPerKPa ?? DEFAULT_HEAT_CAPACITY_RESULT_OPTIONS.pressureSensitivityMvPerKPa,
  theoreticalGamma: options.theoreticalGamma ?? DEFAULT_HEAT_CAPACITY_RESULT_OPTIONS.theoreticalGamma,
});

const createResult = (
  options: ReturnType<typeof normalizeOptions>,
  overrides: Partial<HeatCapacityResult> = {},
): HeatCapacityResult => ({
  ready: false,
  experimentObject: 'air',
  theoreticalGamma: options.theoreticalGamma,
  U0Mv: null,
  U1Mv: null,
  U2Mv: null,
  atmosphericPressureKPa: options.atmosphericPressureKPa,
  pressureSensitivityMvPerKPa: options.pressureSensitivityMvPerKPa,
  deltaP1KPa: null,
  deltaP2KPa: null,
  P0KPa: null,
  P1KPa: null,
  P2KPa: null,
  gamma: null,
  relativeErrorPercent: null,
  status: 'not-ready',
  message: '空气比热容比尚未计算。',
  ...overrides,
});

export const createDefaultHeatCapacityResult = (
  options: HeatCapacityCalculationOptions = {},
): HeatCapacityResult => createResult(normalizeOptions(options));

export const resetHeatCapacityResult = createDefaultHeatCapacityResult;

export const validateHeatCapacitySamples = (
  samples: HeatCapacitySample[] | HeatCapacitySampleMap,
  options: HeatCapacityCalculationOptions = {},
): HeatCapacityResult | null => {
  const normalizedOptions = normalizeOptions(options);
  const U0Mv = getHeatCapacitySample(samples, 'zeroed')?.pressureSignalMv ?? null;
  const U1Mv = getHeatCapacitySample(samples, 'beforeRelease')?.pressureSignalMv ?? null;
  const U2Mv = getHeatCapacitySample(samples, 'afterRecovery')?.pressureSignalMv ?? null;

  if (U1Mv === null || U2Mv === null) {
    return createResult(normalizedOptions, {
      U0Mv,
      U1Mv,
      U2Mv,
      status: 'missing-samples',
      message: '关键数据不足，无法计算空气比热容比。',
    });
  }

  if (normalizedOptions.pressureSensitivityMvPerKPa <= 0) {
    return createResult(normalizedOptions, {
      U0Mv,
      U1Mv,
      U2Mv,
      status: 'invalid-data',
      message: '压力传感器灵敏度必须大于 0。',
    });
  }

  if (normalizedOptions.atmosphericPressureKPa <= 0) {
    return createResult(normalizedOptions, {
      U0Mv,
      U1Mv,
      U2Mv,
      status: 'invalid-data',
      message: '外界大气压必须大于 0。',
    });
  }

  if (U1Mv <= 0) {
    return createResult(normalizedOptions, {
      U0Mv,
      U1Mv,
      U2Mv,
      status: 'invalid-data',
      message: 'U1 必须大于 0。',
    });
  }

  if (U2Mv < 0) {
    return createResult(normalizedOptions, {
      U0Mv,
      U1Mv,
      U2Mv,
      status: 'invalid-data',
      message: 'U2 不能小于 0。',
    });
  }

  if (U1Mv <= U2Mv) {
    return createResult(normalizedOptions, {
      U0Mv,
      U1Mv,
      U2Mv,
      status: 'invalid-data',
      message: 'U1 必须大于 U2，才能计算快速放气前后的压强变化。',
    });
  }

  return null;
};

export const calculateHeatCapacityGamma = (
  samples: HeatCapacitySample[] | HeatCapacitySampleMap,
  options: HeatCapacityCalculationOptions = {},
): HeatCapacityResult => {
  const normalizedOptions = normalizeOptions(options);
  const sampleValidation = validateHeatCapacitySamples(samples, normalizedOptions);
  if (sampleValidation) return sampleValidation;

  const U0Mv = getHeatCapacitySample(samples, 'zeroed')?.pressureSignalMv ?? null;
  const U1Mv = getHeatCapacitySample(samples, 'beforeRelease')!.pressureSignalMv;
  const U2Mv = getHeatCapacitySample(samples, 'afterRecovery')!.pressureSignalMv;
  const deltaP1KPa = U1Mv / normalizedOptions.pressureSensitivityMvPerKPa;
  const deltaP2KPa = U2Mv / normalizedOptions.pressureSensitivityMvPerKPa;
  const P0KPa = normalizedOptions.atmosphericPressureKPa;
  const P1KPa = P0KPa + deltaP1KPa;
  const P2KPa = P0KPa + deltaP2KPa;

  if (P1KPa <= P2KPa) {
    return createResult(normalizedOptions, {
      U0Mv,
      U1Mv,
      U2Mv,
      deltaP1KPa,
      deltaP2KPa,
      P0KPa,
      P1KPa,
      P2KPa,
      status: 'invalid-data',
      message: 'P1 必须大于 P2。',
    });
  }

  if (P2KPa <= P0KPa) {
    return createResult(normalizedOptions, {
      U0Mv,
      U1Mv,
      U2Mv,
      deltaP1KPa,
      deltaP2KPa,
      P0KPa,
      P1KPa,
      P2KPa,
      status: 'invalid-data',
      message: 'P2 必须大于 P0。',
    });
  }

  const denominator = U1Mv - U2Mv;
  if (Math.abs(denominator) < MIN_LOG_DENOMINATOR) {
    return createResult(normalizedOptions, {
      U0Mv,
      U1Mv,
      U2Mv,
      deltaP1KPa,
      deltaP2KPa,
      P0KPa,
      P1KPa,
      P2KPa,
      status: 'invalid-data',
      message: 'U1 - U2 过小，无法稳定计算。',
    });
  }

  const gamma = U1Mv / denominator;
  if (!Number.isFinite(gamma) || gamma <= MIN_REASONABLE_GAMMA || gamma >= MAX_REASONABLE_GAMMA) {
    return createResult(normalizedOptions, {
      U0Mv,
      U1Mv,
      U2Mv,
      deltaP1KPa,
      deltaP2KPa,
      P0KPa,
      P1KPa,
      P2KPa,
      status: 'invalid-data',
      message: 'gamma 结果超出空气比热容比的合理范围。',
    });
  }

  return createResult(normalizedOptions, {
    ready: true,
    U0Mv,
    U1Mv,
    U2Mv,
    deltaP1KPa,
    deltaP2KPa,
    P0KPa,
    P1KPa,
    P2KPa,
    gamma,
    relativeErrorPercent: Math.abs(gamma - normalizedOptions.theoreticalGamma) / normalizedOptions.theoreticalGamma * 100,
    status: 'ready',
    message: '空气比热容比计算完成。',
  });
};

export const calculateDeterministicHeatCapacityReference = () => {
  const samples = createDeterministicHeatCapacitySamples();
  const result = calculateHeatCapacityGamma(samples);

  return result;
};
