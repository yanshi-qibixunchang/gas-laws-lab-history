/** Scope of the teaching budget, not the operating limits of every real apparatus. */
export const UNCERTAINTY_TEACHING_ENVIRONMENT = {
  temperatureK: { minimum: 283.15, maximum: 308.15 },
  pressureKPa: { minimum: 80, maximum: 110 },
} as const;

export type UncertaintyTeachingReason =
  | 'eligible' | 'ideal' | 'missing-snapshot' | 'environment'
  | 'instrument-model' | 'record-criteria' | 'acquisition';

export interface UncertaintyTeachingEligibility {
  version: 'standard-real-teaching-v1';
  eligible: boolean;
  reason: UncertaintyTeachingReason;
}

export const uncertaintyTeachingEligibility = (
  reason: UncertaintyTeachingReason,
): UncertaintyTeachingEligibility => ({
  version: 'standard-real-teaching-v1', eligible: reason === 'eligible', reason,
});

export const isUncertaintyTeachingEnvironment = (temperatureK: number, pressureKPa: number) => (
  Number.isFinite(temperatureK) && Number.isFinite(pressureKPa)
  && temperatureK >= UNCERTAINTY_TEACHING_ENVIRONMENT.temperatureK.minimum
  && temperatureK <= UNCERTAINTY_TEACHING_ENVIRONMENT.temperatureK.maximum
  && pressureKPa >= UNCERTAINTY_TEACHING_ENVIRONMENT.pressureKPa.minimum
  && pressureKPa <= UNCERTAINTY_TEACHING_ENVIRONMENT.pressureKPa.maximum
);

/** Compare saved settings, allowing only floating-point conversion roundoff. */
export const matchesTeachingSettings = (actual: unknown, expected: unknown): boolean => {
  if (typeof expected === 'number') return typeof actual === 'number'
    && Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-12 * Math.max(1, Math.abs(expected));
  if (expected !== null && typeof expected === 'object') return actual !== null
    && typeof actual === 'object' && Object.entries(expected).every(([key, value]) => (
      matchesTeachingSettings((actual as Record<string, unknown>)[key], value)
    ));
  return actual === expected;
};

export const getUncertaintyTeachingNotice = (
  eligibility: UncertaintyTeachingEligibility | undefined,
  language: string = 'zh-CN',
): string | null => {
  if (!eligibility || eligibility.eligible) return null;
  const english = language === 'en';
  const reasons: Record<Exclude<UncertaintyTeachingReason, 'eligible'>, [string, string]> = {
    ideal: ['理想模式仅进行基本数据计算。', 'Ideal mode includes basic data calculations only.'],
    'missing-snapshot': ['旧记录缺少可核对的采集参数，需重新实验后进行不确定度计算。', 'The acquisition settings of these older records cannot be verified. Repeat the experiment to evaluate uncertainty.'],
    environment: ['本组采集时的环境超出不确定度教学范围（10～35 ℃、80～110 kPa），仅进行基本数据计算。', 'The recorded environment is outside the uncertainty teaching range (10–35 °C, 80–110 kPa). Basic calculations remain available.'],
    'instrument-model': ['本组采集时使用了非标准仪器或物理参数，仅进行基本数据计算。恢复对应气体的真实模拟默认参数后，请重新实验。', 'This group used nonstandard instrument or physical settings. Basic calculations remain available. Restore the real preset for this gas and repeat the experiment to evaluate uncertainty.'],
    'record-criteria': ['本组使用了旧的自定义记录判定阈值。原始记录保留，需按统一标准重新实验后进行不确定度计算。', 'This group used older custom recording criteria. Its records are preserved; repeat the experiment with the standard criteria to evaluate uncertainty.'],
    acquisition: ['本组采样设置不完整或超出允许范围，需重新采集后进行不确定度计算。', 'The acquisition settings are incomplete or outside the permitted range. Acquire new data to evaluate uncertainty.'],
  };
  return reasons[eligibility.reason as Exclude<UncertaintyTeachingReason, 'eligible'>][english ? 1 : 0];
};
