import { truncateHeatCapacitySignalMv } from './heatCapacitySignalDisplayModel.ts';
export const FREE_U0_ZERO_TOLERANCE_MV = 0.08;

export interface HeatCapacityFreeZeroEvent {
  id: string;
  atS: number;
  displayPressureMv: number;
  displayTemperatureMv: number;
  zeroOffsetMv: number;
  source: 'user' | 'auto';
}

export interface HeatCapacityFreeCalibrationState {
  calibrationVersion: number;
  zeroOffsetMv: number;
  zeroEvents: HeatCapacityFreeZeroEvent[];
  automaticU0: {
    displayPressureMv: number;
    displayTemperatureMv: number;
    calibrationVersion: number;
    zeroEventId: string;
    atS: number;
  } | null;
}

export interface HeatCapacityFreeGammaCalculationOptions {
  atmosphericPressureKPa?: number;
  pressureSensitivityMvPerKPa?: number;
}

const DEFAULT_FREE_ATMOSPHERIC_PRESSURE_KPA = 101.3;
const DEFAULT_FREE_PRESSURE_SENSITIVITY_MV_PER_KPA = 20;

const getLatestZeroEvent = (state: HeatCapacityFreeCalibrationState) => (
  state.zeroEvents[state.zeroEvents.length - 1] ?? null
);

export const applyFreeZeroCalibration = (
  state: HeatCapacityFreeCalibrationState,
  event: Omit<HeatCapacityFreeZeroEvent, 'id'>,
): HeatCapacityFreeCalibrationState => {
  const calibrationVersion = state.calibrationVersion + 1;
  return {
    calibrationVersion,
    zeroOffsetMv: event.zeroOffsetMv,
    zeroEvents: [
      ...state.zeroEvents,
      {
        id: `zero-${calibrationVersion}`,
        ...event,
      },
    ],
    automaticU0: null,
  };
};

export const captureAutomaticU0IfReady = (
  state: HeatCapacityFreeCalibrationState,
  input: {
    atS: number;
    powerOn: boolean;
    stopcockOpen: boolean;
    zeroed: boolean;
    zeroEventId: string;
    pressureStable: boolean;
    temperatureStable: boolean;
    displayPressureMv: number;
    displayTemperatureMv: number;
  },
): HeatCapacityFreeCalibrationState => {
  const latestZeroEvent = getLatestZeroEvent(state);
  const ready = input.powerOn &&
    input.stopcockOpen &&
    input.zeroed &&
    input.pressureStable &&
    input.temperatureStable &&
    Math.abs(input.displayPressureMv) <= FREE_U0_ZERO_TOLERANCE_MV &&
    latestZeroEvent !== null &&
    latestZeroEvent.id === input.zeroEventId;

  if (!ready) {
    return state;
  }

  return {
    ...state,
    automaticU0: {
      displayPressureMv: truncateHeatCapacitySignalMv(input.displayPressureMv),
      displayTemperatureMv: truncateHeatCapacitySignalMv(input.displayTemperatureMv),
      calibrationVersion: state.calibrationVersion,
      zeroEventId: input.zeroEventId,
      atS: input.atS,
    },
  };
};

export const getFreeCorrectedSignals = (
  records: {
    U0DisplayMv: number;
    U1DisplayMv: number;
    U2DisplayMv: number;
  },
  options: HeatCapacityFreeGammaCalculationOptions = {},
) => {
  const U1CorrectedMv = records.U1DisplayMv - records.U0DisplayMv;
  const U2CorrectedMv = records.U2DisplayMv - records.U0DisplayMv;
  const atmosphericPressureKPa = options.atmosphericPressureKPa ??
    DEFAULT_FREE_ATMOSPHERIC_PRESSURE_KPA;
  const pressureSensitivityMvPerKPa = options.pressureSensitivityMvPerKPa ??
    DEFAULT_FREE_PRESSURE_SENSITIVITY_MV_PER_KPA;
  const P0KPa = atmosphericPressureKPa;
  const P1KPa = P0KPa + U1CorrectedMv / pressureSensitivityMvPerKPa;
  const P2KPa = P0KPa + U2CorrectedMv / pressureSensitivityMvPerKPa;
  const gammaDenominator = Math.log(P1KPa / P2KPa);
  return {
    U1CorrectedMv,
    U2CorrectedMv,
    gamma: Math.log(P1KPa / P0KPa) / gammaDenominator,
  };
};
