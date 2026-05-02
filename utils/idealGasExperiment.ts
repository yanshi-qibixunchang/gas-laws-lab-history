import type {
  ExperimentRelation,
  IdealGasExperimentPoint,
  PressureMeasurementSummary,
  SimulationParams,
} from '../types';
import {
  BOX_LENGTH_PRESET_SEQUENCE,
  diagnoseExperimentFailure,
  getExperimentVerdictState,
  hasCompletedPresetRound,
  PARTICLE_COUNT_PRESET_SEQUENCE,
  TEMPERATURE_PRESET_SEQUENCE,
  type ExperimentFailureReason,
  type ExperimentVerdictState,
  type FailureDiagnosis,
} from './experimentFailureDiagnostics.ts';

export {
  BOX_LENGTH_PRESET_SEQUENCE,
  hasCompletedPresetRound,
  PARTICLE_COUNT_PRESET_SEQUENCE,
  TEMPERATURE_PRESET_SEQUENCE,
};

export type PointsByRelation = Record<ExperimentRelation, IdealGasExperimentPoint[]>;
export type ExperimentParamKey = keyof SimulationParams | 'targetTemperature';
export type ExperimentParams = SimulationParams & { targetTemperature: number };
export type IdealExperimentLanguageCode = 'zh-CN' | 'zh-TW' | 'en-GB';

export interface IdealHistoryContent {
  eyebrow: string;
  title: string;
  discoveredBy: string;
  discovery: string;
  significance: string;
  status: string;
  simulation: string;
}

export interface RegressionSummary {
  slope: number | null;
  intercept: number | null;
  rSquared: number | null;
  slopeError: number | null;
}

export interface IdealGasAnalysis {
  relation: ExperimentRelation;
  points: IdealGasExperimentPoint[];
  sortedPoints: IdealGasExperimentPoint[];
  theoreticalSlope: number | null;
  regression: RegressionSummary;
  verdictState: ExperimentVerdictState;
  diagnosis: FailureDiagnosis;
  isVerified: boolean;
}

const DEFAULT_TARGET_TEMPERATURE = 1;
const TOLERANCE = 1e-9;

const getTargetTemperature = (params: SimulationParams): number => {
  const target = params.targetTemperature;
  return typeof target === 'number' && Number.isFinite(target) && target > 0
    ? target
    : DEFAULT_TARGET_TEMPERATURE;
};

export const createExperimentParams = (params: SimulationParams): ExperimentParams => ({
  ...params,
  targetTemperature: getTargetTemperature(params),
});

export const createEmptyPointsByRelation = (): PointsByRelation => ({
  pt: [],
  pv: [],
  pn: [],
});

export const clonePointsByRelation = (pointsByRelation: PointsByRelation): PointsByRelation => ({
  pt: pointsByRelation.pt.map((point) => ({ ...point })),
  pv: pointsByRelation.pv.map((point) => ({ ...point })),
  pn: pointsByRelation.pn.map((point) => ({ ...point })),
});

export const getRelationVariableKey = (relation: ExperimentRelation): ExperimentParamKey => {
  if (relation === 'pt') return 'targetTemperature';
  if (relation === 'pv') return 'L';
  return 'N';
};

export const isVariableKeyForRelation = (relation: ExperimentRelation, key: ExperimentParamKey) => (
  getRelationVariableKey(relation) === key
);

export const getRelationXValue = (relation: ExperimentRelation, point: IdealGasExperimentPoint): number => {
  if (relation === 'pt') return point.meanTemperature;
  if (relation === 'pv') return point.inverseVolume ?? 0;
  return point.particleCount ?? 0;
};

export const getRelationControlValue = (
  relation: ExperimentRelation,
  point: IdealGasExperimentPoint,
): number | null => {
  if (relation === 'pt') return point.targetTemperature;
  if (relation === 'pv') return point.boxLength ?? null;
  return point.particleCount ?? null;
};

export const getTheoreticalSlope = (relation: ExperimentRelation, params: SimulationParams): number | null => {
  const targetTemperature = getTargetTemperature(params);
  if (relation === 'pt') return params.N * params.k / Math.pow(params.L, 3);
  if (relation === 'pv') return params.N * params.k * targetTemperature;
  if (relation === 'pn') return (params.k * targetTemperature) / Math.pow(params.L, 3);
  return null;
};

export const calculateLinearRegression = (
  points: IdealGasExperimentPoint[],
  getX: (point: IdealGasExperimentPoint) => number,
  getY: (point: IdealGasExperimentPoint) => number,
  theoreticalSlope: number | null,
): RegressionSummary => {
  const validPoints = points
    .map((point) => ({ x: getX(point), y: getY(point) }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

  if (validPoints.length < 2) {
    return { slope: null, intercept: null, rSquared: null, slopeError: null };
  }

  const count = validPoints.length;
  const meanX = validPoints.reduce((sum, point) => sum + point.x, 0) / count;
  const meanY = validPoints.reduce((sum, point) => sum + point.y, 0) / count;
  const numerator = validPoints.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
  const denominator = validPoints.reduce((sum, point) => sum + Math.pow(point.x - meanX, 2), 0);

  if (Math.abs(denominator) <= TOLERANCE) {
    return { slope: null, intercept: null, rSquared: null, slopeError: null };
  }

  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;
  const totalSquares = validPoints.reduce((sum, point) => sum + Math.pow(point.y - meanY, 2), 0);
  const residualSquares = validPoints.reduce(
    (sum, point) => sum + Math.pow(point.y - (slope * point.x + intercept), 2),
    0,
  );
  const rSquared = Math.abs(totalSquares) <= TOLERANCE ? 1 : 1 - residualSquares / totalSquares;
  const slopeError =
    theoreticalSlope !== null && Math.abs(theoreticalSlope) > TOLERANCE
      ? Math.abs((slope - theoreticalSlope) / theoreticalSlope) * 100
      : null;

  return {
    slope: Object.is(slope, -0) ? 0 : slope,
    intercept: Object.is(intercept, -0) ? 0 : intercept,
    rSquared,
    slopeError: slopeError !== null && Object.is(slopeError, -0) ? 0 : slopeError,
  };
};

export const createIdealGasExperimentPoint = (
  relation: ExperimentRelation,
  params: SimulationParams,
  summary: PressureMeasurementSummary,
  timestamp = Date.now(),
): IdealGasExperimentPoint | null => {
  if (
    summary.meanPressure === null ||
    summary.meanIdealPressure === null ||
    summary.meanTemperature === null ||
    summary.relativeGap === null
  ) {
    return null;
  }

  const targetTemperature = getTargetTemperature(params);
  const volume = Math.pow(params.L, 3);

  return {
    id: `${relation}-${timestamp}-${Math.round(getRelationVariableNumericValue(relation, params) * 10000)}`,
    relation,
    targetTemperature,
    meanTemperature: summary.meanTemperature,
    meanPressure: summary.meanPressure,
    idealPressure: summary.meanIdealPressure,
    relativeGap: summary.relativeGap,
    timestamp,
    boxLength: relation === 'pv' ? params.L : null,
    volume: relation === 'pv' ? volume : null,
    inverseVolume: relation === 'pv' && volume > 0 ? 1 / volume : null,
    particleCount: relation === 'pn' ? params.N : null,
  };
};

export const getRelationVariableNumericValue = (
  relation: ExperimentRelation,
  params: SimulationParams,
): number => {
  if (relation === 'pt') return getTargetTemperature(params);
  if (relation === 'pv') return params.L;
  return params.N;
};

export const getPresetSequence = (relation: ExperimentRelation): readonly number[] => {
  if (relation === 'pt') return TEMPERATURE_PRESET_SEQUENCE;
  if (relation === 'pv') return BOX_LENGTH_PRESET_SEQUENCE;
  return PARTICLE_COUNT_PRESET_SEQUENCE;
};

export const getNextPresetValue = (relation: ExperimentRelation, currentValue: number): number => {
  const preset = getPresetSequence(relation).find((value) => value > currentValue + 1e-6);
  return preset ?? currentValue;
};

export const getIdealGasAnalysis = (
  relation: ExperimentRelation,
  pointsByRelation: PointsByRelation,
  params: SimulationParams,
): IdealGasAnalysis => {
  const points = pointsByRelation[relation] ?? [];
  const sortedPoints = [...points].sort(
    (a, b) => getRelationXValue(relation, a) - getRelationXValue(relation, b),
  );
  const theoreticalSlope = getTheoreticalSlope(relation, params);
  const regression = calculateLinearRegression(
    sortedPoints,
    (point) => getRelationXValue(relation, point),
    (point) => point.meanPressure,
    theoreticalSlope,
  );
  const verdictState = getExperimentVerdictState(sortedPoints, regression);
  const diagnosis = diagnoseExperimentFailure(sortedPoints, relation, regression);

  return {
    relation,
    points,
    sortedPoints,
    theoreticalSlope,
    regression,
    verdictState,
    diagnosis,
    isVerified: verdictState === 'verified',
  };
};

export const getRelationLabel = (relation: ExperimentRelation) => {
  if (relation === 'pt') return 'P-T';
  if (relation === 'pv') return 'P-V';
  return 'P-N';
};

const idealHistoryContent: Record<IdealExperimentLanguageCode, Record<ExperimentRelation, IdealHistoryContent>> = {
  'zh-CN': {
    pt: {
      eyebrow: '定容压力定律',
      title: '阿蒙顿-盖吕萨克定律',
      discoveredBy: 'Guillaume Amontons 与 Joseph-Louis Gay-Lussac',
      discovery: '在气体体积和粒子数保持不变时，压强会随绝对温度近似线性增加。',
      significance: '这条关系把温度从经验冷热感转化为可测的热运动尺度，是理想气体状态方程的重要组成部分。',
      status: '今天通常写作 P/T = 常数，或在定容条件下 P 与 T 成正比。',
      simulation: 'Workbench 通过改变目标温度并测量壁面动量交换，验证 P-T 线性关系。',
    },
    pv: {
      eyebrow: '定温压力-体积关系',
      title: '玻意耳-马略特定律',
      discoveredBy: 'Robert Boyle 与 Edme Mariotte',
      discovery: '在温度和粒子数保持不变时，压强与体积成反比。',
      significance: '它是最早把气体宏观变量用定量曲线连接起来的实验定律之一。',
      status: '今天通常写作 PV = 常数。为了线性验证，实验中常把它改写为 P 与 1/V 的关系。',
      simulation: 'Workbench 同时保留原始 P-V 图和用于拟合判定的 P-1/V 线性图。',
    },
    pn: {
      eyebrow: '粒子数-压强关系',
      title: '理想气体粒子数关系',
      discoveredBy: '源自理想气体状态方程 PV = NkT',
      discovery: '当温度和体积固定时，增加粒子数会增加单位时间撞击壁面的粒子数量，因此压强近似随 N 线性增加。',
      significance: '这条关系把微观粒子数与宏观压强直接连接起来，是统计物理解释气体定律的核心例子。',
      status: '在定温定容条件下，P/N 应接近常数。',
      simulation: 'Workbench 保持 T 与 V 不变，只改变 N，并用 P-N 拟合验证粒子数关系。',
    },
  },
  'zh-TW': {
    pt: {
      eyebrow: '定容壓力定律',
      title: '阿蒙頓-給呂薩克定律',
      discoveredBy: 'Guillaume Amontons 與 Joseph-Louis Gay-Lussac',
      discovery: '在氣體體積和粒子數保持不變時，壓強會隨絕對溫度近似線性增加。',
      significance: '這條關係把溫度從經驗冷熱感轉化為可測的熱運動尺度，是理想氣體狀態方程的重要組成部分。',
      status: '今天通常寫作 P/T = 常數，或在定容條件下 P 與 T 成正比。',
      simulation: 'Workbench 透過改變目標溫度並測量壁面動量交換，驗證 P-T 線性關係。',
    },
    pv: {
      eyebrow: '定溫壓力-體積關係',
      title: '波以耳-馬略特定律',
      discoveredBy: 'Robert Boyle 與 Edme Mariotte',
      discovery: '在溫度和粒子數保持不變時，壓強與體積成反比。',
      significance: '它是最早把氣體宏觀變量用定量曲線連接起來的實驗定律之一。',
      status: '今天通常寫作 PV = 常數。為了線性驗證，實驗中常把它改寫為 P 與 1/V 的關係。',
      simulation: 'Workbench 同時保留原始 P-V 圖和用於擬合判定的 P-1/V 線性圖。',
    },
    pn: {
      eyebrow: '粒子數-壓強關係',
      title: '理想氣體粒子數關係',
      discoveredBy: '源自理想氣體狀態方程 PV = NkT',
      discovery: '當溫度和體積固定時，增加粒子數會增加單位時間撞擊壁面的粒子數量，因此壓強近似隨 N 線性增加。',
      significance: '這條關係把微觀粒子數與宏觀壓強直接連接起來，是統計物理解釋氣體定律的核心例子。',
      status: '在定溫定容條件下，P/N 應接近常數。',
      simulation: 'Workbench 保持 T 與 V 不變，只改變 N，並用 P-N 擬合驗證粒子數關係。',
    },
  },
  'en-GB': {
    pt: {
      eyebrow: 'Constant-volume pressure law',
      title: 'Amontons-Gay-Lussac law',
      discoveredBy: 'Guillaume Amontons and Joseph-Louis Gay-Lussac',
      discovery: 'At fixed volume and particle count, pressure rises approximately linearly with absolute temperature.',
      significance: 'The relation made temperature a measurable scale of thermal motion and became a core part of the ideal-gas law.',
      status: 'It is commonly written as P/T = constant, or P proportional to T at fixed volume.',
      simulation: 'Workbench changes the target temperature and measures wall momentum transfer to verify the P-T line.',
    },
    pv: {
      eyebrow: 'Isothermal pressure-volume relation',
      title: 'Boyle-Mariotte law',
      discoveredBy: 'Robert Boyle and Edme Mariotte',
      discovery: 'At fixed temperature and particle count, pressure is inversely proportional to volume.',
      significance: 'It was one of the first quantitative experimental laws connecting macroscopic gas variables.',
      status: 'It is commonly written as PV = constant. For linear verification, the workbench fits P against 1/V.',
      simulation: 'Workbench keeps both the raw P-V physical view and the linear P-1/V chart used for the verdict.',
    },
    pn: {
      eyebrow: 'Particle-count pressure relation',
      title: 'Ideal-gas particle-count relation',
      discoveredBy: 'Derived from the ideal-gas equation PV = NkT',
      discovery: 'At fixed temperature and volume, adding particles increases wall impacts per unit time, so pressure grows approximately linearly with N.',
      significance: 'The relation directly connects microscopic particle count with macroscopic pressure.',
      status: 'At fixed T and V, P/N should remain close to constant.',
      simulation: 'Workbench holds T and V fixed, varies N, and verifies the P-N fit.',
    },
  },
};

export const getIdealHistoryContent = (
  language: IdealExperimentLanguageCode,
  relation: ExperimentRelation,
) => idealHistoryContent[language][relation];

export const getIdealFailureReasonText = (
  reason: ExperimentFailureReason | null,
  language: IdealExperimentLanguageCode,
) => {
  const zh = language !== 'en-GB';
  switch (reason) {
    case 'insufficient_points':
      return zh ? '数据点还不够，至少需要完成一轮覆盖不同取值的采样。' : 'There are not enough points yet; complete a round that covers several scan values.';
    case 'insufficient_range':
      return zh ? '扫描变量覆盖范围偏窄，拟合还不足以代表完整关系。' : 'The scan range is too narrow for the fit to represent the full relation.';
    case 'weak_fit':
      return zh ? '线性拟合较弱，测量波动或采样时间可能影响了结果。' : 'The linear fit is weak; fluctuations or short sampling windows may be affecting the result.';
    case 'slope_mismatch':
      return zh ? '拟合斜率与理论斜率偏差较大，需要重新检查控制变量和采样稳定性。' : 'The fitted slope differs too much from theory; check controlled variables and sampling stability.';
    case 'preliminary_gap':
      return zh ? '结果已有趋势，但误差或覆盖度还不足以判定为完全验证。' : 'The trend is visible, but the error or coverage is not strong enough for full verification.';
    default:
      return zh ? '当前结果已经支持该理想气体关系。' : 'The current result supports this ideal-gas relation.';
  }
};

export const getIdealRecommendationText = (
  reason: ExperimentFailureReason | null,
  verdictState: ExperimentVerdictState,
  relation: ExperimentRelation,
  language: IdealExperimentLanguageCode,
) => {
  const zh = language !== 'en-GB';
  if (verdictState === 'verified') {
    if (relation === 'pt') return zh ? '当前结果已能较清楚支持 P-T 关系：压强会随温度近似线性增加。' : 'The current result supports the pressure-temperature relation clearly.';
    if (relation === 'pv') return zh ? '当前结果已能较清楚支持 P-V 关系：P 与 1/V 呈线性关系。' : 'The current result supports the pressure-volume relation through the P-1/V fit.';
    return zh ? '当前结果已能较清楚支持 P-N 关系：压强会随粒子数近似线性增加。' : 'The current result supports the pressure-particle-count relation clearly.';
  }

  if (verdictState === 'preliminary' || reason === 'preliminary_gap') {
    return zh ? '趋势已经出现，建议补齐完整预设点并使用 Stable 采样减少波动。' : 'The trend is visible; complete the preset round and use Stable sampling to reduce fluctuations.';
  }

  if (reason === 'insufficient_range') {
    if (relation === 'pn') return zh ? '当前粒子数跨度仍偏窄，建议加入更小 N 或更大 N 的点。' : 'The particle-count span is still narrow; add a smaller N or a larger N point.';
    if (relation === 'pv') return zh ? '当前体积跨度仍偏窄，建议加入更小或更大的 L 点来扩大 1/V 覆盖。' : 'The volume span is still narrow; add smaller or larger L values to widen 1/V coverage.';
    return zh ? '当前温度跨度仍偏窄，建议加入更低或更高目标温度的点。' : 'The temperature span is still narrow; add lower or higher target-temperature points.';
  }

  if (reason === 'weak_fit') {
    return zh ? '建议切换到 Stable 采样，或删除明显离群点后重新记录。' : 'Use Stable sampling, or remove clear outliers and record the point again.';
  }

  if (reason === 'slope_mismatch') {
    return zh ? '建议确认非扫描变量没有混合旧设置，并重新运行当前 relation 的一轮预设点。' : 'Check that controlled variables were not mixed with old settings, then rerun a full preset round.';
  }

  return zh ? '至少保留 5 个点，并覆盖预设序列的低值和高值两侧。' : 'Keep at least five points and cover both low and high preset values.';
};
