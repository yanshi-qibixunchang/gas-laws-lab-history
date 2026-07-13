export type HeatCapacityInstrumentControl =
  | 'powerSwitch'
  | 'pressureZero'
  | 'stopcock'
  | 'pumpValve'
  | 'pumpBulb';

export type HeatCapacityGuideRollbackAnimation =
  | 'valveBounce'
  | 'stopcockBounce'
  | 'pumpBulbBounce'
  | 'knobBounce'
  | 'powerBounce';

const ROLLBACK_BY_CONTROL: Record<HeatCapacityInstrumentControl, HeatCapacityGuideRollbackAnimation> = {
  powerSwitch: 'powerBounce',
  pressureZero: 'knobBounce',
  stopcock: 'stopcockBounce',
  pumpValve: 'valveBounce',
  pumpBulb: 'pumpBulbBounce',
};

export const getHeatCapacityGuideRollbackAnimationForControl = (
  control: HeatCapacityInstrumentControl,
) => ROLLBACK_BY_CONTROL[control];
