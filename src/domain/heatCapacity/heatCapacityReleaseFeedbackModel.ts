import { getHeatCapacityReleaseApertureRatio } from './heatCapacityFreeStopcockApertureModel.ts';
import { HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA } from './heatCapacityReleaseModel.ts';

export const HEAT_CAPACITY_RELEASE_FEEDBACK_FULL_SCALE_KPA = 8;

export type HeatCapacityReleaseFeedbackStopReason =
  | 'none'
  | 'path-closed'
  | 'pressure-balanced'
  | 'paused';

export interface HeatCapacityReleaseFeedbackInput {
  releasePathOpen: boolean;
  pressureDeltaKPa: number;
  openElapsedS?: number;
  apertureRatio?: number;
  initialPressureDeltaKPa?: number;
  paused?: boolean;
  equilibriumThresholdKPa?: number;
  fullScalePressureKPa?: number;
}

export interface HeatCapacityReleaseFeedback {
  active: boolean;
  releasePathOpen: boolean;
  apertureRatio: number;
  pressureDriveRatio: number;
  flowDriveRatio: number;
  intensity: number;
  progressRatio: number;
  stopReason: HeatCapacityReleaseFeedbackStopReason;
}

const clampUnit = (value: number) => Math.min(1, Math.max(0, value));

const finiteNonNegative = (value: number | undefined, fallback = 0) => (
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback
);

export const resolveHeatCapacityReleaseFeedback = (
  input: HeatCapacityReleaseFeedbackInput,
): HeatCapacityReleaseFeedback => {
  const pressureDeltaKPa = finiteNonNegative(input.pressureDeltaKPa);
  const equilibriumThresholdKPa = finiteNonNegative(
    input.equilibriumThresholdKPa,
    HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA,
  );
  const fullScalePressureKPa = Math.max(
    equilibriumThresholdKPa + 0.0001,
    finiteNonNegative(input.fullScalePressureKPa, HEAT_CAPACITY_RELEASE_FEEDBACK_FULL_SCALE_KPA),
  );
  const apertureRatio = input.apertureRatio === undefined
    ? input.openElapsedS === undefined
      ? 1
      : getHeatCapacityReleaseApertureRatio(input.openElapsedS)
    : clampUnit(finiteNonNegative(input.apertureRatio));
  const pressureDriveRatio = clampUnit(pressureDeltaKPa / fullScalePressureKPa);
  const flowDriveRatio = clampUnit(apertureRatio * pressureDriveRatio);
  const initialPressureDeltaKPa = Math.max(
    equilibriumThresholdKPa,
    finiteNonNegative(input.initialPressureDeltaKPa, pressureDeltaKPa),
  );
  const pressureRangeKPa = Math.max(
    0.0001,
    initialPressureDeltaKPa - equilibriumThresholdKPa,
  );
  const progressRatio = clampUnit(
    (initialPressureDeltaKPa - Math.max(pressureDeltaKPa, equilibriumThresholdKPa)) /
      pressureRangeKPa,
  );
  const paused = input.paused === true;
  const pressureBalanced = pressureDeltaKPa <= equilibriumThresholdKPa;
  const active = input.releasePathOpen && !paused && !pressureBalanced;
  const stopReason: HeatCapacityReleaseFeedbackStopReason = paused
    ? 'paused'
    : !input.releasePathOpen
      ? 'path-closed'
      : pressureBalanced
        ? 'pressure-balanced'
        : 'none';

  return {
    active,
    releasePathOpen: input.releasePathOpen,
    apertureRatio,
    pressureDriveRatio,
    flowDriveRatio,
    intensity: Math.sqrt(flowDriveRatio),
    progressRatio,
    stopReason,
  };
};
