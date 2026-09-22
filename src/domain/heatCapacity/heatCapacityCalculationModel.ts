export interface HeatCapacityCalculationGroupInput {
  u0Mv: number;
  u1Mv: number;
  u2Mv: number;
  atmosphericPressureKPa: number;
  pressureSensitivityMvPerKPa: number;
}

export interface HeatCapacityCalculationGroupReference {
  /** Present in strict teaching sessions to retain the displayed sensitivity. */
  pressureSensitivityMvPerKPa?: number;
  u0Mv: number;
  u1Mv: number;
  u2Mv: number;
  u1PrimeMv: number;
  u2PrimeMv: number;
  p0KPa: number;
  p1KPa: number;
  p2KPa: number;
  formulaGamma: number;
}

export interface HeatCapacityCalculationBatchStatistics {
  count: number;
  meanGamma: number;
  sampleStandardDeviation: number;
  typeAStandardUncertainty: number;
  relativeErrorPercent: number;
}

const allFinite = (values: readonly number[]) => (
  values.every((value) => Number.isFinite(value))
);

const normalizeCalculatedNumber = (value: number) => (
  Number.isFinite(value) ? Number(value.toPrecision(15)) : value
);

export const calculateHeatCapacityCorrectedVoltage = (
  measuredMv: number,
  zeroMv: number,
): number | null => {
  if (!allFinite([measuredMv, zeroMv])) return null;
  return normalizeCalculatedNumber(measuredMv - zeroMv);
};

export const calculateHeatCapacityAbsolutePressure = (
  atmosphericPressureKPa: number,
  correctedVoltageMv: number,
  pressureSensitivityMvPerKPa: number,
): number | null => {
  if (
    !allFinite([
      atmosphericPressureKPa,
      correctedVoltageMv,
      pressureSensitivityMvPerKPa,
    ]) ||
    atmosphericPressureKPa <= 0 ||
    pressureSensitivityMvPerKPa <= 0
  ) {
    return null;
  }

  const pressureKPa = atmosphericPressureKPa +
    correctedVoltageMv / pressureSensitivityMvPerKPa;
  return pressureKPa > 0
    ? normalizeCalculatedNumber(pressureKPa)
    : null;
};

export const calculateHeatCapacityFormulaGamma = (
  p0KPa: number,
  p1KPa: number,
  p2KPa: number,
): number | null => {
  if (
    !allFinite([p0KPa, p1KPa, p2KPa]) ||
    p0KPa <= 0 ||
    p2KPa <= p0KPa ||
    p1KPa <= p2KPa
  ) {
    return null;
  }

  const numerator = Math.log(p1KPa / p0KPa);
  const denominator = Math.log(p1KPa / p2KPa);
  const formulaGamma = numerator / denominator;
  return Number.isFinite(formulaGamma) && formulaGamma > 0
    ? normalizeCalculatedNumber(formulaGamma)
    : null;
};

export const calculateHeatCapacityGroupReference = (
  input: HeatCapacityCalculationGroupInput,
): HeatCapacityCalculationGroupReference | null => {
  if (!allFinite([
    input.u0Mv,
    input.u1Mv,
    input.u2Mv,
    input.atmosphericPressureKPa,
    input.pressureSensitivityMvPerKPa,
  ])) {
    return null;
  }

  const u1PrimeMv = calculateHeatCapacityCorrectedVoltage(input.u1Mv, input.u0Mv);
  const u2PrimeMv = calculateHeatCapacityCorrectedVoltage(input.u2Mv, input.u0Mv);
  if (
    u1PrimeMv === null ||
    u2PrimeMv === null ||
    u1PrimeMv <= u2PrimeMv ||
    u2PrimeMv <= 0
  ) {
    return null;
  }

  const p0KPa = input.atmosphericPressureKPa;
  const p1KPa = calculateHeatCapacityAbsolutePressure(
    p0KPa,
    u1PrimeMv,
    input.pressureSensitivityMvPerKPa,
  );
  const p2KPa = calculateHeatCapacityAbsolutePressure(
    p0KPa,
    u2PrimeMv,
    input.pressureSensitivityMvPerKPa,
  );
  if (p1KPa === null || p2KPa === null) return null;

  const formulaGamma = calculateHeatCapacityFormulaGamma(p0KPa, p1KPa, p2KPa);
  if (formulaGamma === null) return null;

  return {
    u0Mv: input.u0Mv,
    u1Mv: input.u1Mv,
    u2Mv: input.u2Mv,
    u1PrimeMv,
    u2PrimeMv,
    p0KPa,
    p1KPa,
    p2KPa,
    formulaGamma,
  };
};

export const calculateHeatCapacityMean = (
  values: readonly number[],
): number | null => {
  if (values.length === 0 || !allFinite(values)) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return normalizeCalculatedNumber(mean);
};

export const calculateHeatCapacitySampleStandardDeviation = (
  values: readonly number[],
): number | null => {
  if (values.length < 2 || !allFinite(values)) return null;
  const mean = calculateHeatCapacityMean(values);
  if (mean === null) return null;
  const squaredDeviationSum = values.reduce(
    (sum, value) => sum + (value - mean) ** 2,
    0,
  );
  return normalizeCalculatedNumber(
    Math.sqrt(squaredDeviationSum / (values.length - 1)),
  );
};

export const calculateHeatCapacityTypeAStandardUncertainty = (
  sampleStandardDeviation: number,
  sampleCount: number,
): number | null => {
  if (
    !Number.isFinite(sampleStandardDeviation) ||
    sampleStandardDeviation < 0 ||
    !Number.isInteger(sampleCount) ||
    sampleCount < 2
  ) {
    return null;
  }
  return normalizeCalculatedNumber(
    sampleStandardDeviation / Math.sqrt(sampleCount),
  );
};

export const calculateHeatCapacityRelativeErrorPercent = (
  measuredGamma: number,
  theoreticalGamma: number,
): number | null => {
  if (
    !allFinite([measuredGamma, theoreticalGamma]) ||
    theoreticalGamma === 0
  ) {
    return null;
  }
  return normalizeCalculatedNumber(
    Math.abs(measuredGamma - theoreticalGamma) /
      Math.abs(theoreticalGamma) *
      100,
  );
};

export const calculateHeatCapacityBatchStatistics = (
  formulaGammas: readonly number[],
  theoreticalGamma: number,
): HeatCapacityCalculationBatchStatistics | null => {
  if (
    formulaGammas.length < 2 ||
    !allFinite(formulaGammas) ||
    !Number.isFinite(theoreticalGamma)
  ) {
    return null;
  }

  const meanGamma = calculateHeatCapacityMean(formulaGammas);
  const sampleStandardDeviation =
    calculateHeatCapacitySampleStandardDeviation(formulaGammas);
  if (meanGamma === null || sampleStandardDeviation === null) return null;

  const typeAStandardUncertainty =
    calculateHeatCapacityTypeAStandardUncertainty(
      sampleStandardDeviation,
      formulaGammas.length,
    );
  const relativeErrorPercent = calculateHeatCapacityRelativeErrorPercent(
    meanGamma,
    theoreticalGamma,
  );
  if (
    typeAStandardUncertainty === null ||
    relativeErrorPercent === null
  ) {
    return null;
  }

  return {
    count: formulaGammas.length,
    meanGamma,
    sampleStandardDeviation,
    typeAStandardUncertainty,
    relativeErrorPercent,
  };
};
