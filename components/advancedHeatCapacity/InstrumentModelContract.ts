import type {
  HeatCapacityInstrumentPartId,
  HeatCapacityInstrumentState,
  HeatCapacityPhase,
} from '../../utils/heatCapacityExperiment.ts';

export const HEAT_CAPACITY_RENDER_PARTS: HeatCapacityInstrumentPartId[] = [
  'Vessel',
  'Valve_C1',
  'Valve_C2',
  'Pump_Handle',
  'Pressure_Gauge_Needle',
  'Temperature_Display',
];

export const HEAT_CAPACITY_HIT_PARTS: HeatCapacityInstrumentPartId[] = [
  'Hit_C1',
  'Hit_C2',
  'Hit_Pump',
];

export const HEAT_CAPACITY_INSTRUMENT_PARTS: HeatCapacityInstrumentPartId[] = [
  ...HEAT_CAPACITY_RENDER_PARTS,
  ...HEAT_CAPACITY_HIT_PARTS,
];

export interface HeatCapacityInstrumentModelProps {
  state: HeatCapacityInstrumentState;
  particleCount: number;
  vesselLength: number;
  onPartActivate?: (partId: HeatCapacityInstrumentPartId) => void;
}

export interface HeatCapacitySceneState {
  phase: HeatCapacityPhase;
  c1Open: boolean;
  c2Open: boolean;
  pumpProgress: number;
  pressure: number;
  temperature: number;
  highlightedPart: HeatCapacityInstrumentPartId | null;
}
