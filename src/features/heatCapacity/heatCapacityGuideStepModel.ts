export type GuideHeatCapacityStep =
  | 'idle'
  | 'powerOnRequired'
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

export type GuideHeatCapacityRollbackAnimation =
  | 'valveBounce'
  | 'stopcockBounce'
  | 'pumpBulbBounce'
  | 'knobBounce'
  | 'powerBounce';

export interface HeatCapacityGuideControlOptions {
  temperatureReady?: boolean;
}

const guideControlByStep: Record<GuideHeatCapacityStep, string | null> = {
  idle: null,
  powerOnRequired: 'powerSwitch',
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

const rollbackByAction: Partial<Record<GuideHeatCapacityAction, GuideHeatCapacityRollbackAnimation>> = {
  adjustPressureZero: 'knobBounce',
  openStopcock: 'stopcockBounce',
  closeStopcock: 'stopcockBounce',
  openPumpValve: 'valveBounce',
  closePumpValve: 'valveBounce',
  pumpBulb: 'pumpBulbBounce',
  turnPowerOn: 'powerBounce',
  turnPowerOff: 'powerBounce',
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
) => rollbackByAction[action];

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
