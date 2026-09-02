import {
  applyPressureZero,
  DEFAULT_HEAT_CAPACITY_SENSOR_CONFIG,
} from '../../domain/heatCapacity/heatCapacitySensorMapping.ts';
import {
  formatHeatCapacitySignalMv,
} from '../../domain/heatCapacity/heatCapacitySignalDisplayModel.ts';
import type {
  HeatCapacityMode,
  HeatCapacityPressureZeroDisplayedSample,
  WorkbenchHeatCapacityPressureSafetyStatus,
  WorkbenchHeatCapacityPumpFrequencyStatus,
  WorkbenchHeatCapacityState,
  WorkbenchHeatCapacityStopcockState,
} from './workbenchHeatCapacityStateTypes.ts';

export const HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG = 0;
export const HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG = 90;

export const HEAT_CAPACITY_PUMP_FREQUENCY_WINDOW_MS = 3000;
export const HEAT_CAPACITY_MIN_PUMP_FREQUENCY = 0.5;
export const HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV = 90;
export const HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV = 120;
export const HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV = 140;

export const HEAT_CAPACITY_PRESSURE_ZERO_FINE_ANGLE_STEP_DEG = 2;
export const HEAT_CAPACITY_PRESSURE_ZERO_MV_PER_TURN = 1;
export const HEAT_CAPACITY_PRESSURE_ZERO_RANGE_MV = 1.5;
export const HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV = -1.5;
export const HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV = 1.5;
export const HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG = -540;
export const HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG = 540;
export const HEAT_CAPACITY_PRESSURE_ZERO_TOLERANCE_MV = 0.1;
export const HEAT_CAPACITY_PRESSURE_ZERO_SAMPLE_WINDOW_MS = 1000;
export const HEAT_CAPACITY_PRESSURE_ZERO_SAMPLE_MIN_COUNT = 5;

export const HEAT_CAPACITY_GAUGE_PRESSURE_MIN_KPA = 0;
export const HEAT_CAPACITY_GAUGE_PRESSURE_MAX_KPA = 10;
export const HEAT_CAPACITY_GAUGE_ROTATION_MIN_RAD = -2.15;
export const HEAT_CAPACITY_GAUGE_ROTATION_MAX_RAD = 2.15;
export const HEAT_CAPACITY_GAUGE_DANGER_START_ROTATION_RAD = 0.86;
export const HEAT_CAPACITY_GAUGE_RISE_RATE = 3.2;
export const HEAT_CAPACITY_GAUGE_FALL_RATE = 9.5;

const HEAT_CAPACITY_GAUGE_DANGER_START_FRACTION = (
  (HEAT_CAPACITY_GAUGE_DANGER_START_ROTATION_RAD - HEAT_CAPACITY_GAUGE_ROTATION_MIN_RAD) /
  (HEAT_CAPACITY_GAUGE_ROTATION_MAX_RAD - HEAT_CAPACITY_GAUGE_ROTATION_MIN_RAD)
);

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const roundNumber = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const normalizeDegrees360 = (value: number) => ((value % 360) + 360) % 360;

const radiansToRoundedDegrees = (radians: number) => Math.round((radians * 180 / Math.PI) * 100) / 100;

export const isHeatCapacityPhysicalKernelMode = (mode: HeatCapacityMode | null | undefined) => (
  mode === 'free'
);

export const getHeatCapacityPressureThresholdsMv = (
  file: Partial<WorkbenchHeatCapacityState> = {},
) => {
  const freeRecordConfig = file.kind === 'heatCapacity' && isHeatCapacityPhysicalKernelMode(file.heatCapacityMode)
    ? file.heatCapacityFreeRecordConfig
    : null;
  const pressureDangerThresholdMv = Number.isFinite(freeRecordConfig?.pressureDangerMv)
    ? Math.max(0, Number(freeRecordConfig?.pressureDangerMv))
    : HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV;
  const rawPressureWarningThresholdMv = Number.isFinite(file.heatCapacityFreePressureWarningMv)
    ? Math.max(0, Number(file.heatCapacityFreePressureWarningMv))
    : HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV;
  const pressureWarningThresholdMv = Math.min(
    rawPressureWarningThresholdMv,
    Math.max(0, pressureDangerThresholdMv - 0.01),
  );
  return {
    pressureWarningThresholdMv,
    pressureDangerThresholdMv,
  };
};

const getHeatCapacityGaugeConfig = (file: Partial<WorkbenchHeatCapacityState> = {}) => {
  const freeSensorConfig = file.kind === 'heatCapacity' && isHeatCapacityPhysicalKernelMode(file.heatCapacityMode)
    ? file.heatCapacityFreeSensorConfig
    : null;
  const pressureSensitivityMvPerKPa = Number.isFinite(freeSensorConfig?.pressureMvPerKPa)
    ? Math.max(0.001, Number(freeSensorConfig?.pressureMvPerKPa))
    : Number.isFinite(file.pressureSensitivityMvPerKPa)
    ? Math.max(0.001, Number(file.pressureSensitivityMvPerKPa))
    : DEFAULT_HEAT_CAPACITY_SENSOR_CONFIG.pressureSensitivityMvPerKPa;
  const pressureThresholdsMv = getHeatCapacityPressureThresholdsMv(file);
  const gaugePressureMinKPa = Number.isFinite(file.gaugePressureMinKPa)
    ? Number(file.gaugePressureMinKPa)
    : HEAT_CAPACITY_GAUGE_PRESSURE_MIN_KPA;
  const pressureDangerThresholdKPa = pressureThresholdsMv.pressureDangerThresholdMv / pressureSensitivityMvPerKPa;
  const dynamicMax = Number.isFinite(pressureDangerThresholdKPa) && pressureDangerThresholdKPa > gaugePressureMinKPa
    ? gaugePressureMinKPa + (pressureDangerThresholdKPa - gaugePressureMinKPa) / HEAT_CAPACITY_GAUGE_DANGER_START_FRACTION
    : HEAT_CAPACITY_GAUGE_PRESSURE_MAX_KPA;
  const gaugePressureMaxKPa = Math.max(gaugePressureMinKPa + 1, dynamicMax);
  const pressureWarningThresholdKPa = clampNumber(
    pressureThresholdsMv.pressureWarningThresholdMv / pressureSensitivityMvPerKPa,
    gaugePressureMinKPa,
    gaugePressureMaxKPa,
  );
  const pressureSafetyThresholdKPa = clampNumber(
    pressureThresholdsMv.pressureDangerThresholdMv / pressureSensitivityMvPerKPa,
    gaugePressureMinKPa,
    gaugePressureMaxKPa,
  );
  return {
    gaugePressureMinKPa,
    gaugePressureMaxKPa,
    pressureSensitivityMvPerKPa,
    pressureWarningThresholdKPa,
    pressureSafetyThresholdKPa,
  };
};

export const getHeatCapacityGaugeDisplayValue = ({
  current,
  target,
  elapsedS,
  pressureOverLimit,
}: {
  current: number;
  target: number;
  elapsedS: number;
  pressureOverLimit: boolean;
}) => {
  if (!Number.isFinite(current)) return target;
  const displayDt = clampNumber(elapsedS, 0, 0.22);
  const delta = target - current;
  const rate = delta >= 0
    ? (pressureOverLimit ? HEAT_CAPACITY_GAUGE_RISE_RATE * 1.2 : HEAT_CAPACITY_GAUGE_RISE_RATE)
    : HEAT_CAPACITY_GAUGE_FALL_RATE;
  return current + delta * (1 - Math.exp(-rate * displayDt));
};

export const getHeatCapacityGaugePressureState = (
  pressureDeltaKPa: number,
  powerOn: boolean,
  file: Partial<WorkbenchHeatCapacityState> = {},
  displayedGaugePressureKPa?: number,
): ReturnType<typeof getHeatCapacityGaugeConfig> & {
  pressureGaugeTargetValue: number;
  pressureGaugeDisplayValue: number;
  pressureGaugeNeedleAngle: number;
  pressureSafeThresholdKPa: number;
  pressureWarningThresholdKPa: number;
  pressureSafetyStatus: WorkbenchHeatCapacityPressureSafetyStatus;
  pressureSafetyMessage: string | null;
  pressureBlockedPumping: boolean;
  pressureOverLimit: boolean;
} => {
  const gaugeConfig = getHeatCapacityGaugeConfig(file);
  const pressureThresholdsMv = getHeatCapacityPressureThresholdsMv(file);
  // The pointer gauge is mechanical: it follows the real pressure even while
  // the electronic instrument is powered off.
  const pressureForGauge = Number.isFinite(pressureDeltaKPa) ? Math.max(0, pressureDeltaKPa) : 0;
  const pressureForSafetyMv = pressureForGauge * gaugeConfig.pressureSensitivityMvPerKPa;
  const pressureGaugeTargetValue = roundNumber(
    clampNumber(pressureForGauge, gaugeConfig.gaugePressureMinKPa, gaugeConfig.gaugePressureMaxKPa),
    2,
  );
  const pressureGaugeDisplayValue = roundNumber(
    clampNumber(
      Number.isFinite(displayedGaugePressureKPa) ? Number(displayedGaugePressureKPa) : pressureGaugeTargetValue,
      gaugeConfig.gaugePressureMinKPa,
      gaugeConfig.gaugePressureMaxKPa,
    ),
    2,
  );
  const pressureGaugeFraction = (
    (pressureGaugeDisplayValue - gaugeConfig.gaugePressureMinKPa) /
    Math.max(0.001, gaugeConfig.gaugePressureMaxKPa - gaugeConfig.gaugePressureMinKPa)
  );
  const pressureSafetyStatus: WorkbenchHeatCapacityPressureSafetyStatus = !powerOn
    ? 'normal'
    : pressureForSafetyMv >= pressureThresholdsMv.pressureDangerThresholdMv
      ? 'danger'
      : pressureForSafetyMv >= pressureThresholdsMv.pressureWarningThresholdMv
        ? 'warning'
        : 'normal';
  const pressureSafetyMessage = pressureSafetyStatus === 'danger'
    ? '压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。'
    : pressureSafetyStatus === 'warning'
      ? '压强已达到建议打气范围，请停止打气并等待回温。'
      : null;
  return {
    ...gaugeConfig,
    pressureGaugeTargetValue,
    pressureGaugeDisplayValue,
    pressureGaugeNeedleAngle: radiansToRoundedDegrees(
      HEAT_CAPACITY_GAUGE_ROTATION_MIN_RAD +
      pressureGaugeFraction * (HEAT_CAPACITY_GAUGE_ROTATION_MAX_RAD - HEAT_CAPACITY_GAUGE_ROTATION_MIN_RAD),
    ),
    pressureSafeThresholdKPa: gaugeConfig.pressureSafetyThresholdKPa,
    pressureWarningThresholdKPa: gaugeConfig.pressureWarningThresholdKPa,
    pressureSafetyStatus,
    pressureSafetyMessage,
    // Pump protection is a physical constraint and must not disappear with
    // the observation electronics. The warning status above remains gated by
    // power so an unpowered instrument does not emit an electronic alarm.
    pressureBlockedPumping: pressureForSafetyMv >= pressureThresholdsMv.pressureDangerThresholdMv,
    pressureOverLimit: pressureForSafetyMv >= pressureThresholdsMv.pressureDangerThresholdMv,
  };
};

export const getHeatCapacityStopcockTargetAngle = (
  open: boolean,
) => (open ? HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG : HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG);

export const normalizeHeatCapacityStopcockAngle = (value: unknown) => {
  const angle = typeof value === 'number' && Number.isFinite(value)
    ? value
    : HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG;
  const normalized = normalizeDegrees360(angle);
  const openHalfRangeDeg = 5;
  const distanceToOpen = Math.abs(normalized - HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG);
  return distanceToOpen <= openHalfRangeDeg
    ? HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG
    : HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG;
};

export const getHeatCapacityStopcockState = (angleDeg: unknown): WorkbenchHeatCapacityStopcockState => (
  normalizeHeatCapacityStopcockAngle(angleDeg) === HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG
    ? 'open'
    : 'closed'
);

export const getHeatCapacityPumpFrequencyState = (
  timestamps: number[],
  now = Date.now(),
  windowMs = HEAT_CAPACITY_PUMP_FREQUENCY_WINDOW_MS,
) => {
  const windowStart = now - windowMs;
  const recentTimestamps = timestamps
    .filter((timestamp) => Number.isFinite(timestamp) && timestamp >= windowStart && timestamp <= now)
    .sort((left, right) => left - right);
  const pumpFrequency = recentTimestamps.length >= 2
    ? (recentTimestamps.length - 1) /
      Math.max(0.001, (recentTimestamps[recentTimestamps.length - 1] - recentTimestamps[0]) / 1000)
    : recentTimestamps.length / (windowMs / 1000);
  const pumpFrequencyStatus: WorkbenchHeatCapacityPumpFrequencyStatus = recentTimestamps.length === 0
    ? 'idle'
    : pumpFrequency < HEAT_CAPACITY_MIN_PUMP_FREQUENCY
      ? 'tooSlow'
      : 'suitable';
  return {
    timestamps: recentTimestamps,
    pumpFrequency,
    pumpFrequencyStatus,
  };
};

export const applyHeatCapacityPressureZero = (
  rawPressure: number,
  pressureInitialBiasMv: number,
  zeroOffset: number,
) => (
  roundNumber(applyPressureZero(rawPressure, pressureInitialBiasMv, zeroOffset), 2)
);

export const updatePressureZeroDisplayedSamples = (
  samples: HeatCapacityPressureZeroDisplayedSample[] | undefined,
  now: number,
  valueMv: number | null,
  powerOn: boolean,
) => {
  if (!powerOn || valueMv === null || !Number.isFinite(valueMv)) return [];
  const roundedValue = roundNumber(valueMv, 3);
  const windowStart = now - HEAT_CAPACITY_PRESSURE_ZERO_SAMPLE_WINDOW_MS;
  const recentSamples = (samples ?? [])
    .filter((sample) => Number.isFinite(sample.atMs) && sample.atMs >= windowStart && sample.atMs < now)
    .map((sample) => ({
      atMs: sample.atMs,
      valueMv: roundNumber(sample.valueMv, 3),
    }));
  const filledSamples = [...recentSamples];
  const lastSample = filledSamples[filledSamples.length - 1];
  if (
    lastSample &&
    Math.abs(lastSample.valueMv) <= HEAT_CAPACITY_PRESSURE_ZERO_TOLERANCE_MV &&
    Math.abs(roundedValue) <= HEAT_CAPACITY_PRESSURE_ZERO_TOLERANCE_MV
  ) {
    const sampleIntervalMs = HEAT_CAPACITY_PRESSURE_ZERO_SAMPLE_WINDOW_MS /
      Math.max(1, HEAT_CAPACITY_PRESSURE_ZERO_SAMPLE_MIN_COUNT - 1);
    for (
      let sampleAtMs = lastSample.atMs + sampleIntervalMs;
      sampleAtMs < now;
      sampleAtMs += sampleIntervalMs
    ) {
      if (sampleAtMs >= windowStart) {
        filledSamples.push({ atMs: sampleAtMs, valueMv: roundedValue });
      }
    }
  }
  return [
    ...filledSamples,
    { atMs: now, valueMv: roundedValue },
  ];
};

export const isHeatCapacityPressureZeroWithinTolerance = (
  samples: HeatCapacityPressureZeroDisplayedSample[] | undefined,
) => (
  (samples?.length ?? 0) >= HEAT_CAPACITY_PRESSURE_ZERO_SAMPLE_MIN_COUNT &&
  (samples ?? []).every((sample) => Math.abs(sample.valueMv) <= HEAT_CAPACITY_PRESSURE_ZERO_TOLERANCE_MV)
);

export const clampHeatCapacityPressureZeroKnobAngle = (angleDeg: number) => (
  roundNumber(clampNumber(
    Number.isFinite(angleDeg) ? angleDeg : 0,
    HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG,
    HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG,
  ), 2)
);

export const getHeatCapacityPressureZeroOffsetForKnobAngle = (angleDeg: number) => {
  const clampedAngle = clampHeatCapacityPressureZeroKnobAngle(angleDeg);
  return roundNumber(
    clampNumber(
      (clampedAngle / 360) * HEAT_CAPACITY_PRESSURE_ZERO_MV_PER_TURN,
      HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV,
      HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV,
    ),
    3,
  );
};

export const getHeatCapacityPressureZeroKnobAngleForOffset = (zeroOffset: number) => {
  const clampedOffset = clampNumber(
    Number.isFinite(zeroOffset) ? zeroOffset : 0,
    HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MIN_MV,
    HEAT_CAPACITY_PRESSURE_ZERO_OFFSET_MAX_MV,
  );
  return clampHeatCapacityPressureZeroKnobAngle(
    (clampedOffset / HEAT_CAPACITY_PRESSURE_ZERO_MV_PER_TURN) * 360,
  );
};

export const getHeatCapacityPressureZeroDisplayText = (adjusted: boolean, zeroOffset: number) => (
  adjusted ? `零点偏移：${zeroOffset >= 0 ? '+' : ''}${formatHeatCapacitySignalMv(zeroOffset)} mV` : '未调零'
);

export const canZeroHeatCapacityPressure = (file: WorkbenchHeatCapacityState) => (
  getHeatCapacityStopcockState(file.stopcockAngleDeg) === 'open'
);
