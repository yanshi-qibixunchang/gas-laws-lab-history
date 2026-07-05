import {
  HEAT_CAPACITY_CRITICAL_TOAST_PRIORITY,
  HEAT_CAPACITY_PRESSURE_WARNING_TOAST_PRIORITY,
  type HeatCapacityToastLevel,
  type HeatCapacityToastSource,
} from './heatCapacityToastController.ts';

export type HeatCapacityToastPolicy =
  | 'guide'
  | 'guideBlocked'
  | 'success'
  | 'pressureWarning'
  | 'pressureAlarm'
  | 'pressureCloseValve';

export interface HeatCapacityToastPolicySpec {
  level: HeatCapacityToastLevel;
  options: {
    interrupt?: boolean;
    priority?: number;
    source: HeatCapacityToastSource;
  };
}

const toastPolicySpecs: Record<HeatCapacityToastPolicy, HeatCapacityToastPolicySpec> = {
  guide: {
    level: 'info',
    options: { source: 'guide' },
  },
  guideBlocked: {
    level: 'warning',
    options: { source: 'guide-blocked', interrupt: true },
  },
  success: {
    level: 'success',
    options: { interrupt: true, source: 'guide' },
  },
  pressureWarning: {
    level: 'info',
    options: {
      interrupt: true,
      priority: HEAT_CAPACITY_PRESSURE_WARNING_TOAST_PRIORITY,
      source: 'pressure-warning',
    },
  },
  pressureAlarm: {
    level: 'danger',
    options: {
      interrupt: true,
      priority: HEAT_CAPACITY_CRITICAL_TOAST_PRIORITY,
      source: 'pressure-alarm',
    },
  },
  pressureCloseValve: {
    level: 'warning',
    options: {
      interrupt: true,
      priority: HEAT_CAPACITY_CRITICAL_TOAST_PRIORITY,
      source: 'pressure-close-valve',
    },
  },
};

export const getHeatCapacityToastPolicySpec = (
  policy: HeatCapacityToastPolicy,
): HeatCapacityToastPolicySpec => ({
  level: toastPolicySpecs[policy].level,
  options: { ...toastPolicySpecs[policy].options },
});
