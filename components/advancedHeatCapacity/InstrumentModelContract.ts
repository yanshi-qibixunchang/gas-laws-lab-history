import type {
  HeatCapacityInstrumentPartId,
  HeatCapacityInstrumentState,
  HeatCapacityInstrumentDisplayState,
  HeatCapacityParticleVisualState,
  HeatCapacityPhase,
} from '../../utils/heatCapacityExperiment.ts';

export const HEAT_CAPACITY_RENDER_PARTS: HeatCapacityInstrumentPartId[] = [
  'Vessel',
  'Valve_C1',
  'Valve_C2',
  'Pump_Handle',
  'Pressure_Gauge_Needle',
  'Temperature_Display',
  'Square_Glass_Bottle',
  'Glass_Wall_Panels',
  'Glass_Edge_Frame',
  'Glass_Bottom_Base',
  'Glass_Outer_Shell',
  'Sealing_Stopper',
  'Top_Glass_Tube',
  'Valve_Manifold',
  'Pressure_Sensor',
  'Temperature_Sensor',
  'Sensor_Cable_Pressure',
  'Sensor_Cable_Temperature',
  'Instrument_Box',
  'Instrument_Box_Display',
  'Instrument_Box_Front_Panel',
  'Instrument_Box_Temp_LCD',
  'Instrument_Box_Pressure_LCD',
  'Instrument_Box_Temp_Display',
  'Instrument_Box_Pressure_Display',
  'Instrument_Box_Analog_Gauge',
  'Instrument_Box_Power_Light',
  'Instrument_Box_Pump_Control',
  'Instrument_Box_Power_Switch',
  'Instrument_Box_Pump_Check_Switch',
  'Pump_Column',
  'Pump_Slider',
];

export const HEAT_CAPACITY_HIT_PARTS: HeatCapacityInstrumentPartId[] = [
  'Hit_C1',
  'Hit_C2',
  'Hit_Pump',
  'Hit_Pressure_Gauge',
  'Hit_Temperature_Display',
  'Hit_Instrument_Box',
];

export const HEAT_CAPACITY_INSTRUMENT_PARTS: HeatCapacityInstrumentPartId[] = [
  ...HEAT_CAPACITY_RENDER_PARTS,
  ...HEAT_CAPACITY_HIT_PARTS,
];

export interface HeatCapacityInstrumentModelProps {
  state: HeatCapacityInstrumentState;
  particleCount: number;
  vesselLength: number;
  particleVisualState: HeatCapacityParticleVisualState;
  displayState: HeatCapacityInstrumentDisplayState;
  interactionHints?: Partial<Record<HeatCapacityInstrumentPartId, string>>;
  onPartActivate?: (partId: HeatCapacityInstrumentPartId) => void;
}

export interface HeatCapacitySceneState {
  instrumentPowered: boolean;
  phase: HeatCapacityPhase;
  c1Open: boolean;
  c2Open: boolean;
  pumpProgress: number;
  pressure: number;
  temperature: number;
  highlightedPart: HeatCapacityInstrumentPartId | null;
  displayState: HeatCapacityInstrumentDisplayState;
}
