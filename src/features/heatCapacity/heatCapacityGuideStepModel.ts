import {
  getHeatCapacityGuideRollbackAnimationForControl,
  type HeatCapacityInstrumentControl,
} from '../../domain/heatCapacity/heatCapacityInstrumentFeedback.ts';

export type GuideHeatCapacityStep =
  | 'idle'
  | 'powerOnRequired'
  | 'preheatRequired'
  | 'openStopcockForZeroRequired'
  | 'zeroAdjustRequired'
  | 'recordU0Required'
  | 'closeStopcockRequired'
  | 'openPumpValveRequired'
  | 'pumpRequired'
  | 'closePumpValveRequired'
  | 'stabilizeBeforeReleaseRequired'
  | 'recordU1Required'
  | 'openStopcockReleaseRequired'
  | 'closeStopcockAfterReleaseRequired'
  | 'recoverRequired'
  | 'recordU2Required'
  | 'closePowerRequired'
  | 'completed';

export type GuideHeatCapacityAction =
  | 'turnPowerOn'
  | 'turnPowerOff'
  | 'adjustPressureZero'
  | 'recordU0'
  | 'closeStopcock'
  | 'openStopcock'
  | 'openPumpValve'
  | 'closePumpValve'
  | 'pumpBulb'
  | 'recordU1'
  | 'recordU2';

interface HeatCapacityGuideControlOptions {
  temperatureReady?: boolean;
}

const guideControlByStep: Record<GuideHeatCapacityStep, string | null> = {
  idle: null,
  powerOnRequired: 'powerSwitch',
  preheatRequired: null,
  openStopcockForZeroRequired: 'stopcock',
  zeroAdjustRequired: 'pressureZero',
  recordU0Required: 'recordU0',
  closeStopcockRequired: 'stopcock',
  openPumpValveRequired: 'pumpValve',
  pumpRequired: 'pumpBulb',
  closePumpValveRequired: 'pumpValve',
  stabilizeBeforeReleaseRequired: 'instrumentTemperatureDisplay',
  recordU1Required: 'recordU1',
  openStopcockReleaseRequired: 'stopcock',
  closeStopcockAfterReleaseRequired: 'stopcock',
  recoverRequired: 'instrumentTemperatureDisplay',
  recordU2Required: 'recordU2',
  closePowerRequired: 'powerSwitch',
  completed: null,
};

const allowedActionsByStep: Record<GuideHeatCapacityStep, GuideHeatCapacityAction[]> = {
  idle: ['turnPowerOn'],
  powerOnRequired: ['turnPowerOn'],
  preheatRequired: [],
  openStopcockForZeroRequired: ['openStopcock'],
  zeroAdjustRequired: ['adjustPressureZero'],
  recordU0Required: ['adjustPressureZero', 'recordU0'],
  closeStopcockRequired: ['closeStopcock'],
  openPumpValveRequired: ['openPumpValve'],
  pumpRequired: ['pumpBulb'],
  closePumpValveRequired: ['closePumpValve'],
  stabilizeBeforeReleaseRequired: [],
  recordU1Required: ['recordU1'],
  openStopcockReleaseRequired: ['openStopcock'],
  closeStopcockAfterReleaseRequired: ['closeStopcock'],
  recoverRequired: [],
  recordU2Required: ['recordU2'],
  closePowerRequired: ['turnPowerOff'],
  completed: [],
};

const rollbackControlByAction: Partial<Record<GuideHeatCapacityAction, HeatCapacityInstrumentControl>> = {
  adjustPressureZero: 'pressureZero',
  openStopcock: 'stopcock',
  closeStopcock: 'stopcock',
  openPumpValve: 'pumpValve',
  closePumpValve: 'pumpValve',
  pumpBulb: 'pumpBulb',
  turnPowerOn: 'powerSwitch',
  turnPowerOff: 'powerSwitch',
};

export const getHeatCapacityGuideStepControlId = (
  step: GuideHeatCapacityStep,
  options: HeatCapacityGuideControlOptions = {},
) => {
  if (
    (step === 'stabilizeBeforeReleaseRequired' || step === 'recoverRequired') &&
    options.temperatureReady
  ) {
    return 'instrumentPressureDisplay';
  }
  return guideControlByStep[step];
};

export const getHeatCapacityGuideAllowedActions = (
  step: GuideHeatCapacityStep,
) => [...allowedActionsByStep[step]];

export const getHeatCapacityGuideRollbackAnimation = (
  action: GuideHeatCapacityAction,
) => {
  const control = rollbackControlByAction[action];
  return control ? getHeatCapacityGuideRollbackAnimationForControl(control) : undefined;
};

export const isHeatCapacityGuideRecordStep = (step: GuideHeatCapacityStep) => (
  step === 'recordU0Required' ||
  step === 'recordU1Required' ||
  step === 'recordU2Required'
);

export const isGuideHeatCapacityPauseStep = (step: GuideHeatCapacityStep) => (
  step === 'recordU1Required' ||
  step === 'recordU2Required' ||
  step === 'closePowerRequired'
);
