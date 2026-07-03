export type HeatCapacityRuntimePhase =
  | 'powerOff'
  | 'readyToZero'
  | 'zeroed'
  | 'readyToPump'
  | 'pumping'
  | 'sealedStabilizing'
  | 'releasing'
  | 'recovering'
  | 'demoComplete';

export interface HeatCapacityProcessSamplePoint {
  timeS: number;
  phase: HeatCapacityRuntimePhase;
  temperatureSignalMv: number;
  pressureSignalMv: number;
  gasTemperatureK: number;
  gasPressureKPaAbs: number;
  pressureDeltaKPa: number;
  pumpFrequency: number;
  pumpValveOpen: boolean;
  stopcockOpen: boolean;
}

export type HeatCapacityProcessSampleKey =
  | 'startSample'
  | 'zeroedSample'
  | 'afterPumpSample'
  | 'pumpPeakSample'
  | 'beforeReleaseSample'
  | 'stableBeforeReleaseSample'
  | 'afterReleaseSample'
  | 'releaseLowSample'
  | 'recoverySample';

export type HeatCapacityProcessSamples = Partial<Record<HeatCapacityProcessSampleKey, HeatCapacityProcessSamplePoint>>;
