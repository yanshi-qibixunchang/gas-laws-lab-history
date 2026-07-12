import { HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA } from '../../../domain/heatCapacity/heatCapacityReleaseModel.ts';

export const HEAT_CAPACITY_ZERO_KNOB_MIN_DEGREES_PER_TICK = 4;
export const HEAT_CAPACITY_ZERO_KNOB_CALIBRATED_DEGREES_PER_TICK = 10;
export const HEAT_CAPACITY_ZERO_KNOB_SPEED_ANCHORS_DEG_PER_S = [20, 40, 80, 160] as const;
export const HEAT_CAPACITY_ZERO_KNOB_RATE_ANCHORS_HZ = [2, 4, 8, 16] as const;
export const HEAT_CAPACITY_PUMP_BULB_MIN_INTERVAL_MS = 125;
export const HEAT_CAPACITY_RECORD_WRITING_MIN_INTERVAL_MS = 250;
export const HEAT_CAPACITY_RELEASE_SOUND_FULL_SCALE_KPA = 8;

export interface HeatCapacityReleaseSoundState {
  outwardFlowActive: boolean;
  paused: boolean;
  pressureDeltaKPa: number;
  audioEnabled: boolean;
}

export const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

export const getHeatCapacityReleasePressureRatio = (pressureDeltaKPa: number) => (
  clampUnit(Math.max(0, pressureDeltaKPa) / HEAT_CAPACITY_RELEASE_SOUND_FULL_SCALE_KPA)
);

export const getHeatCapacityReleaseSoundIntensity = (pressureDeltaKPa: number) => (
  Math.sqrt(getHeatCapacityReleasePressureRatio(pressureDeltaKPa))
);

export const getHeatCapacityReleaseLowpassHz = (pressureDeltaKPa: number) => (
  3_500 + 1_700 * getHeatCapacityReleasePressureRatio(pressureDeltaKPa)
);

export const shouldPlayHeatCapacityReleaseSound = (state: HeatCapacityReleaseSoundState) => (
  state.audioEnabled &&
  !state.paused &&
  state.outwardFlowActive &&
  Number.isFinite(state.pressureDeltaKPa) &&
  state.pressureDeltaKPa > HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA
);

export class HeatCapacityKnobTickAccumulator {
  private carriedTickFraction = 0;

  consume(angleDeltaDeg: number, degreesPerTick = HEAT_CAPACITY_ZERO_KNOB_MIN_DEGREES_PER_TICK) {
    if (!Number.isFinite(angleDeltaDeg)) return 0;
    const resolvedDegreesPerTick = Number.isFinite(degreesPerTick) && degreesPerTick > 0
      ? degreesPerTick
      : HEAT_CAPACITY_ZERO_KNOB_MIN_DEGREES_PER_TICK;
    const accumulated = this.carriedTickFraction + Math.abs(angleDeltaDeg) / resolvedDegreesPerTick;
    const ticks = Math.floor(accumulated);
    this.carriedTickFraction = accumulated - ticks;
    return ticks;
  }

  reset() {
    this.carriedTickFraction = 0;
  }
}

export const getHeatCapacityZeroKnobAudioProfile = (angularSpeedDegPerS: number) => {
  const speed = Number.isFinite(angularSpeedDegPerS) ? Math.max(0, angularSpeedDegPerS) : 0;
  const slowAnchorSpeed = HEAT_CAPACITY_ZERO_KNOB_SPEED_ANCHORS_DEG_PER_S[0];
  const fastAnchorSpeed = HEAT_CAPACITY_ZERO_KNOB_SPEED_ANCHORS_DEG_PER_S[3];
  const fastAnchorRate = HEAT_CAPACITY_ZERO_KNOB_RATE_ANCHORS_HZ[3];
  let degreesPerTick = HEAT_CAPACITY_ZERO_KNOB_MIN_DEGREES_PER_TICK;
  let targetRateHz = 0;
  if (speed > 0 && speed < slowAnchorSpeed) {
    const progress = speed / slowAnchorSpeed;
    degreesPerTick = HEAT_CAPACITY_ZERO_KNOB_MIN_DEGREES_PER_TICK +
      (HEAT_CAPACITY_ZERO_KNOB_CALIBRATED_DEGREES_PER_TICK -
        HEAT_CAPACITY_ZERO_KNOB_MIN_DEGREES_PER_TICK) * progress;
    targetRateHz = speed / degreesPerTick;
  } else if (speed >= slowAnchorSpeed && speed <= fastAnchorSpeed) {
    degreesPerTick = HEAT_CAPACITY_ZERO_KNOB_CALIBRATED_DEGREES_PER_TICK;
    targetRateHz = speed / degreesPerTick;
  } else {
    targetRateHz = fastAnchorRate * Math.sqrt(speed / fastAnchorSpeed);
    degreesPerTick = speed / targetRateHz;
  }
  const itemDurationMs = targetRateHz > 0
    ? Math.min(45, Math.max(10, 600 / targetRateHz))
    : 45;
  return {
    angularSpeedDegPerS: speed,
    targetRateHz,
    degreesPerTick,
    itemDurationMs,
    itemFadeInMs: Math.min(2, itemDurationMs * 0.2),
    itemFadeOutMs: Math.min(8, itemDurationMs * 0.35),
  };
};

export const getHeatCapacityPumpBulbVariation = (rateRandom: number, gainRandom: number) => {
  const playbackRate = 0.97 + clampUnit(rateRandom) * 0.06;
  const gainDb = -0.8 + clampUnit(gainRandom) * 1.6;
  return {
    playbackRate,
    gain: 10 ** (gainDb / 20),
  };
};

export const getHeatCapacityPumpValveVariation = (rateRandom: number, gainRandom: number) => {
  const playbackRate = 0.97 + clampUnit(rateRandom) * 0.06;
  const gainDb = -0.8 + clampUnit(gainRandom) * 1.6;
  return {
    playbackRate,
    gain: 10 ** (gainDb / 20),
  };
};
