import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import {
  HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG,
  HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG,
  getHeatCapacityStopcockState,
} from '../workbench/workbenchState';
import HeatCapacityHardSphereLayer from './HeatCapacityHardSphereLayer';
import type { HeatCapacityHardSphereReleaseTimeline } from '../../domain/heatCapacity/heatCapacityHardSphereModel.ts';

type UltraPointerControl = 'powerSwitch' | 'pressureZero' | 'stopcock' | 'pumpValve' | 'pumpBulb';
type UltraHoveredControl = UltraPointerControl | null;
type UltraValveFocusControl = 'stopcock' | 'pumpValve';
type UltraFocusControl = UltraPointerControl | 'instrumentPressureDisplay' | 'instrumentTemperatureDisplay' | 'instrumentPanel';
type UltraVisualTargetId = UltraFocusControl;
type UltraFocusMode = 'stopcock' | 'instrument' | 'pump';
type UltraVisualEffectTone = 'nonBulb' | 'glass' | 'pumpBulb' | 'display';
type UltraMaterialHighlightControl = UltraPointerControl;
type UltraProjectedPoint = {
  clientX: number;
  clientY: number;
};

type UltraVisualEffects = {
  hoverHaloColor: string;
  glassHoverHaloColor: string;
  pumpBulbHoverHaloColor: string;
  demoHaloColor: string;
  demoHaloMinOpacity: number;
  demoHaloMaxOpacity: number;
  demoHaloBaseScale: number;
  demoHaloPulseScale: number;
  focusShellColor: string;
  focusShellRimColor: string;
  focusShellBlendMode: 'additive' | 'normal';
  focusShellBreathMinOpacity: number;
  focusShellBreathMaxOpacity: number;
  focusShellPulseOpacity: number;
  focusShellBaseScale: number;
  focusShellBreathScale: number;
  focusShellPulseStartScale: number;
  focusShellPulseScale: number;
  focusShellPulseRate: number;
  nonBulbHoverHaloOpacity: number;
  glassHoverHaloOpacity: number;
  pumpBulbHoverHaloOpacity: number;
};

type HeatCapacityUltraInstrumentModelProps = {
  powerOn: boolean;
  sceneTheme: 'dark' | 'light';
  stopcockAngleDeg: number;
  pressureZeroKnobAngle: number;
  pressureGaugeDisplayValue: number;
  gaugePressureMinKPa: number;
  gaugePressureMaxKPa: number;
  pressureDeltaKPa: number;
  phase: string;
  temperatureSignalMv: number | null;
  pressureSignalMv: number | null;
  releaseFlowActive: boolean;
  releaseTimeline: HeatCapacityHardSphereReleaseTimeline;
  stopcockFlowOpen: boolean;
  pumpValveOpen: boolean;
  pumpBulbState: 'idle' | 'compressing' | 'releasing';
  pumpPulseId: number;
  pumpFlowActive: boolean;
  pumpFlowIntensity: number;
  gasAmountRatio: number;
  gasTemperatureK: number;
  ambientTemperatureK: number;
  hardSphereViewEnabled: boolean;
  hardSphereParticleMultiplier: number;
  hardSphereSpeedMultiplier: number;
  hardSphereVisualResetKey: number;
  interactionLocked: boolean;
  focusMode: 'none' | UltraFocusMode;
  pressureZeroInteractionEnabled: boolean;
  pumpBulbInteractionEnabled: boolean;
  demoFocusControlId: string | null;
  demoFocusPulseActive: boolean;
  interactionQualityReduced: boolean;
  visualEffects: UltraVisualEffects;
  hoveredControl: UltraHoveredControl;
  setHoveredControl: (control: UltraHoveredControl) => void;
  onValveFocusAnchor: (control: UltraValveFocusControl, clientX: number, clientY: number) => void;
  onLockedInteraction: (message?: string) => void;
  onPowerToggle: (nextPowerOn?: boolean) => void;
  onStopcockOpenChange: (nextOpen?: boolean) => void;
  onPressureZeroFineAdjust: (direction: number) => void;
  onPressureZeroCoarseAdjust: (angleDeltaDeg: number) => void;
  onPumpValveToggle: () => void;
  onPumpBulbPress: () => void;
  onFocus: (mode: UltraFocusMode) => void;
};

const ULTRA_GLB_PATH = `${import.meta.env.BASE_URL}models/heat-capacity/fd-ncd-c-ultra.glb`;
const REQUIRED_ULTRA_NODE_NAMES = [
  'FD_NCD_C_PowerSwitch_Base',
  'FD_NCD_C_PowerSwitch_Button',
  'FD_NCD_C_PowerIndicator_LED',
  'FD_NCD_C_ZeroAdjustKnob',
  'Stopcock_Pivot',
  'Stopcock_THandle',
  'InletValue_Pivot',
  'Pump_Bulb',
  'clean_lab_bench',
  'HSL_LabBench_Backstop_LowLip',
  'FD_NCD_C_InstrumentBody',
  'FD_NCD_C_FrontPanel',
  'HSL_MainDisplay_DynamicPlaneAnchor',
  'HSL_MainDisplay_PixelDigits_PowerOnPreview',
  'HSL_MainDisplay_RecessWell',
  'HSL_MainDisplay_PixelScreenZone',
  'HSL_PowerSwitch_Inset_Frame_Lip',
  'HSL_PowerSwitch_Mark_I_Inlay',
  'HSL_PowerSwitch_Mark_O_Inlay',
  'HSL_PressureGauge_NeedlePivot',
  'HSL_Stopcock_OpenPath_Glow',
  'HSL_Stopcock_ClosedBlocker_Mark',
] as const;
const ULTRA_DISPLAY_TEXTURE_SURFACE_NODE_NAMES = [
  'HSL_MainDisplay_DynamicPlaneAnchor',
  'HSL_MainDisplay_PixelDigits_PowerOnPreview',
] as const;
const ULTRA_POWERED_DISPLAY_ART_NODE_NAMES = [
  'HSL_MainDisplay_PixelDigits_PowerOnPreview',
] as const;

const PRESSURE_GAUGE_MIN_ROTATION = -2.15;
const PRESSURE_GAUGE_MAX_ROTATION = 2.15;
const modelPressureGaugeAngleToVisualAngle = (modelAngle: number) => Math.PI / 2 - modelAngle;
const STOPCOCK_VISUAL_SMOOTHING_RATE = 8;
const PUMP_VALVE_VISUAL_SMOOTHING_RATE = 5.6;
const PRESSURE_ZERO_VISUAL_SMOOTHING_RATE = 10;
const PRESSURE_ZERO_FINE_ANGLE_STEP_DEG = 12;
const PRESSURE_ZERO_DRAG_DIRECTION = -1;
const POWER_SWITCH_VISUAL_SMOOTHING_RATE = 9;
const POWER_SWITCH_OFF_ROTATION_RAD = 0.24;
const POWER_SWITCH_ON_ROTATION_RAD = -0.24;
const POWER_SWITCH_HITBOX_SIZE: [number, number, number] = [0.42, 0.58, 0.30];
const POWER_SWITCH_VISUAL_SCALE = new THREE.Vector3(1.28, 1.28, 1.08);
const POWER_SWITCH_BASE_VISUAL_SCALE = new THREE.Vector3(1.22, 1.24, 1.03);
const POWER_SWITCH_FRAME_VISUAL_SCALE = new THREE.Vector3(1.24, 1.26, 1.03);
const POWER_SWITCH_PIVOT_OFFSET = new THREE.Vector3(0, 0, 0.0042);
const POWER_SWITCH_ROCKER_WIDTH = 0.078;
const POWER_SWITCH_ROCKER_HEIGHT = 0.134;
const POWER_SWITCH_ROCKER_FACE_Z = 0.013;
const POWER_SWITCH_ROCKER_FACE_CROWN_Z = 0.0075;
const POWER_SWITCH_ROCKER_CORNER_RADIUS = 0.016;
const POWER_SWITCH_ROCKER_BACK_Z = -0.042;
const POWER_SWITCH_ROCKER_SKIRT_DEPTH = 0.006;
const POWER_SWITCH_ROCKER_FACE_SEGMENTS = 8;
const POWER_SWITCH_ROCKER_SEGMENTS = 14;
const POWER_SWITCH_MARK_Z_OFFSET = 0.0016;
const ULTRA_CONTROL_MOTION_INVALIDATION_MS = 940;
const ULTRA_DOUBLE_CLICK_GUARD_MS = 220;
const ULTRA_FOCUS_SHELL_POP_FRACTION = 0.14;
const ULTRA_HITBOX_UNIT_SCALE = new THREE.Vector3(1, 1, 1);
const DISABLE_ULTRA_RAYCAST = () => undefined;
const ULTRA_CONTROL_HITBOXES: Array<{
  control: UltraPointerControl;
  anchorNodeName: string;
  size: [number, number, number];
  offset?: [number, number, number];
}> = [
  { control: 'powerSwitch', anchorNodeName: 'FD_NCD_C_PowerSwitch_Base', size: POWER_SWITCH_HITBOX_SIZE, offset: [0.018, -0.006, 0.16] },
  { control: 'pressureZero', anchorNodeName: 'FD_NCD_C_ZeroAdjustKnob', size: [0.42, 0.42, 0.34], offset: [0, 0, 0.07] },
  { control: 'stopcock', anchorNodeName: 'Stopcock_THandle', size: [0.46, 0.24, 0.28] },
  { control: 'pumpValve', anchorNodeName: 'InletValue_Pivot', size: [0.64, 0.52, 0.38], offset: [0, 0.12, 0.02] },
  { control: 'pumpBulb', anchorNodeName: 'Pump_Bulb', size: [0.64, 0.50, 0.52] },
];
const ULTRA_INSTRUMENT_FOCUS_HITBOX = {
  anchorNodeName: 'FD_NCD_C_FrontPanel',
  size: [2.04, 0.86, 0.36],
  offset: [0, 0, 0.04],
} as const;

const ULTRA_POINTER_CONTROL_IDS: readonly UltraPointerControl[] = [
  'powerSwitch',
  'pressureZero',
  'stopcock',
  'pumpValve',
  'pumpBulb',
];
const isUltraPointerControl = (controlId: string | null): controlId is UltraPointerControl => (
  typeof controlId === 'string' && ULTRA_POINTER_CONTROL_IDS.includes(controlId as UltraPointerControl)
);
const getUltraScreenDistanceSq = (
  clientX: number,
  clientY: number,
  point: UltraProjectedPoint,
) => {
  const dx = clientX - point.clientX;
  const dy = clientY - point.clientY;
  return dx * dx + dy * dy;
};

type UltraVisualShape =
  | { shape: 'box'; size: [number, number, number] }
  | { shape: 'plane'; size: [number, number] }
  | { shape: 'sphere'; args: [number, number, number] }
  | { shape: 'torus'; args: [number, number, number, number] };

type UltraControlVisualTarget = UltraVisualShape & {
  id: UltraVisualTargetId;
  anchorNodeName: string;
  tone: UltraVisualEffectTone;
  hoverControl?: UltraPointerControl;
  focusControlIds: readonly UltraFocusControl[];
  focusShellNodeNames?: readonly string[];
  focusShellSide?: 'back' | 'double';
  offset?: [number, number, number];
  rotation?: [number, number, number];
  hoverScale?: number;
  hoverWireframe?: boolean;
  focusShellPulsePopScale?: number;
  focusShellPulseRetreatScale?: number;
};

const ULTRA_CONTROL_VISUAL_TARGETS = [
  {
    id: 'powerSwitch',
    anchorNodeName: 'FD_NCD_C_PowerSwitch_Base',
    tone: 'nonBulb',
    focusControlIds: ['powerSwitch'],
    focusShellNodeNames: ['FD_NCD_C_PowerSwitch_Base', 'HSL_PowerSwitch_Inset_Frame_Lip'],
    shape: 'torus',
    args: [0.11, 0.006, 10, 40],
    offset: [0.018, -0.006, 0.205],
    hoverWireframe: true,
    focusShellPulsePopScale: 1.42,
    focusShellPulseRetreatScale: 1.18,
  },
  {
    id: 'pressureZero',
    anchorNodeName: 'FD_NCD_C_ZeroAdjustKnob',
    tone: 'nonBulb',
    focusControlIds: ['pressureZero'],
    focusShellNodeNames: ['FD_NCD_C_ZeroAdjustKnob'],
    shape: 'torus',
    args: [0.16, 0.006, 12, 56],
    offset: [0, 0, 0.12],
    hoverWireframe: true,
    focusShellPulsePopScale: 1.34,
    focusShellPulseRetreatScale: 1.14,
  },
  {
    id: 'stopcock',
    anchorNodeName: 'Stopcock_THandle',
    tone: 'glass',
    hoverControl: 'stopcock',
    focusControlIds: ['stopcock'],
    focusShellNodeNames: ['Stopcock_THandle', 'Stopcock_HandleStem', 'Stopcock_RotatingPlugCore'],
    shape: 'box',
    size: [0.36, 0.18, 0.22],
    hoverScale: 0.9,
    hoverWireframe: true,
    focusShellPulsePopScale: 1.2,
    focusShellPulseRetreatScale: 1.08,
  },
  {
    id: 'pumpValve',
    anchorNodeName: 'InletValue_Pivot',
    tone: 'nonBulb',
    hoverControl: 'pumpValve',
    focusControlIds: ['pumpValve'],
    focusShellNodeNames: ['InletValue_Pivot'],
    shape: 'box',
    size: [0.44, 0.34, 0.26],
    offset: [0, 0.12, 0.02],
    hoverScale: 0.86,
    hoverWireframe: true,
    focusShellPulsePopScale: 1.28,
    focusShellPulseRetreatScale: 1.11,
  },
  {
    id: 'pumpBulb',
    anchorNodeName: 'Pump_Bulb',
    tone: 'pumpBulb',
    hoverControl: 'pumpBulb',
    focusControlIds: ['pumpBulb'],
    focusShellNodeNames: ['Pump_Bulb'],
    shape: 'sphere',
    args: [0.26, 24, 16],
    hoverScale: 0.78,
    focusShellPulsePopScale: 1.11,
    focusShellPulseRetreatScale: 1.055,
  },
  {
    id: 'instrumentPressureDisplay',
    anchorNodeName: 'HSL_MainDisplay_DynamicPlaneAnchor',
    tone: 'display',
    focusControlIds: ['pressureZero', 'instrumentPressureDisplay'],
    focusShellNodeNames: ['HSL_MainDisplay_PixelScreenZone', 'HSL_MainDisplay_DynamicPlaneAnchor'],
    focusShellSide: 'double',
    shape: 'plane',
    size: [0.92, 0.16],
    offset: [0, -0.075, 0.006],
    focusShellPulsePopScale: 1.08,
    focusShellPulseRetreatScale: 1.025,
  },
  {
    id: 'instrumentTemperatureDisplay',
    anchorNodeName: 'HSL_MainDisplay_DynamicPlaneAnchor',
    tone: 'display',
    focusControlIds: ['instrumentTemperatureDisplay', 'instrumentPanel'],
    focusShellNodeNames: ['HSL_MainDisplay_PixelScreenZone', 'HSL_MainDisplay_DynamicPlaneAnchor'],
    focusShellSide: 'double',
    shape: 'plane',
    size: [0.92, 0.16],
    offset: [0, 0.075, 0.006],
    focusShellPulsePopScale: 1.08,
    focusShellPulseRetreatScale: 1.025,
  },
  {
    id: 'instrumentPanel',
    anchorNodeName: 'HSL_MainDisplay_DynamicPlaneAnchor',
    tone: 'display',
    focusControlIds: ['instrumentPanel'],
    focusShellNodeNames: ['HSL_MainDisplay_RecessWell', 'HSL_MainDisplay_PixelScreenZone'],
    focusShellSide: 'double',
    shape: 'plane',
    size: [0.96, 0.36],
    offset: [0, 0, 0.005],
    focusShellPulsePopScale: 1.07,
    focusShellPulseRetreatScale: 1.02,
  },
] as const satisfies readonly UltraControlVisualTarget[];

type UltraThemeVisuals = {
  benchSurface: string;
  benchBackstop: string;
  instrumentBody: string;
  frontPanel: string;
  displayScreen: string;
  displayText: string;
  powerSwitchBase: string;
  powerSwitchOff: string;
  powerSwitchOn: string;
  powerSwitchFrame: string;
  powerSwitchInlay: string;
};

const ULTRA_THEME_VISUALS: Record<HeatCapacityUltraInstrumentModelProps['sceneTheme'], UltraThemeVisuals> = {
  light: {
    benchSurface: '#5f6f79',
    benchBackstop: '#4d5d66',
    instrumentBody: '#e0e5e7',
    frontPanel: '#c2ccd0',
    displayScreen: '#071011',
    displayText: '#31f6c8',
    powerSwitchBase: '#2d3338',
    powerSwitchOff: '#d9534f',
    powerSwitchOn: '#2ec978',
    powerSwitchFrame: '#f1f5f9',
    powerSwitchInlay: '#f8fafc',
  },
  dark: {
    benchSurface: '#8fa1aa',
    benchBackstop: '#7f929b',
    instrumentBody: '#d5dcdf',
    frontPanel: '#b8c3c8',
    displayScreen: '#061010',
    displayText: '#5ffff0',
    powerSwitchBase: '#40484e',
    powerSwitchOff: '#e15d59',
    powerSwitchOn: '#35d987',
    powerSwitchFrame: '#ffffff',
    powerSwitchInlay: '#ffffff',
  },
};

const clampSceneNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const clampPressureZeroSceneKnobAngle = (angleDeg: number) => Math.min(
  HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG,
  Math.max(HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG, angleDeg),
);

const mapPressureGaugeValueToRotation = (
  pressureKPa: number,
  gaugePressureMinKPa: number,
  gaugePressureMaxKPa: number,
) => {
  const pressureRange = Math.max(0.001, gaugePressureMaxKPa - gaugePressureMinKPa);
  const clampedPressure = clampSceneNumber(pressureKPa, gaugePressureMinKPa, gaugePressureMaxKPa);
  const fraction = (clampedPressure - gaugePressureMinKPa) / pressureRange;
  return PRESSURE_GAUGE_MIN_ROTATION + fraction * (PRESSURE_GAUGE_MAX_ROTATION - PRESSURE_GAUGE_MIN_ROTATION);
};

const getPressureGaugeNeedleRotation = (
  pressureGaugeDisplayValue: number,
  gaugePressureMinKPa: number,
  gaugePressureMaxKPa: number,
  powerOn: boolean,
) => {
  if (!powerOn || typeof pressureGaugeDisplayValue !== 'number' || !Number.isFinite(pressureGaugeDisplayValue)) {
    return PRESSURE_GAUGE_MIN_ROTATION;
  }
  return mapPressureGaugeValueToRotation(pressureGaugeDisplayValue, gaugePressureMinKPa, gaugePressureMaxKPa);
};

type UltraAlignedSignalParts = {
  left: string;
  right: string;
};

const ULTRA_DISPLAY_PIXEL_SIZE = 8;
const ULTRA_DISPLAY_PIXEL_GAP = 2;
const ULTRA_DISPLAY_GLYPH_COLUMNS = 5;
const ULTRA_DISPLAY_GLYPH_ROWS = 7;
const ULTRA_DISPLAY_DIGIT_ADVANCE = 54;
const ULTRA_DISPLAY_UNIT_ADVANCE = 51;
const ULTRA_DISPLAY_SIGN_AND_INTEGER_SLOTS = 5;
const ULTRA_DISPLAY_FRACTION_SLOTS = 2;
const ULTRA_DISPLAY_DECIMAL_GAP = 6;
const ULTRA_DISPLAY_FRACTION_GAP = 6;
const ULTRA_DISPLAY_UNIT_GAP = 19;
const ULTRA_DISPLAY_DECIMAL_COLUMNS = 2;
const ULTRA_DISPLAY_DECIMAL_ROWS = 3;
const ULTRA_DISPLAY_DECIMAL_TOP_ROW = 4;
const ULTRA_DISPLAY_DECIMAL_WIDTH = ULTRA_DISPLAY_DECIMAL_COLUMNS * ULTRA_DISPLAY_PIXEL_SIZE + (ULTRA_DISPLAY_DECIMAL_COLUMNS - 1) * ULTRA_DISPLAY_PIXEL_GAP;
const ULTRA_DISPLAY_ROW_HEIGHT = ULTRA_DISPLAY_GLYPH_ROWS * ULTRA_DISPLAY_PIXEL_SIZE +
  (ULTRA_DISPLAY_GLYPH_ROWS - 1) * ULTRA_DISPLAY_PIXEL_GAP;

const ULTRA_DISPLAY_GLYPHS = {
  ' ': [
    '00000',
    '00000',
    '00000',
    '00000',
    '00000',
    '00000',
    '00000',
  ],
  '+': [
    '00000',
    '00100',
    '00100',
    '11111',
    '00100',
    '00100',
    '00000',
  ],
  '-': [
    '00000',
    '00000',
    '00000',
    '11111',
    '00000',
    '00000',
    '00000',
  ],
  '.': [
    '00000',
    '00000',
    '00000',
    '00000',
    '00000',
    '00100',
    '00100',
  ],
  '0': [
    '11111',
    '10001',
    '10011',
    '10101',
    '11001',
    '10001',
    '11111',
  ],
  '1': [
    '00100',
    '01100',
    '00100',
    '00100',
    '00100',
    '00100',
    '01110',
  ],
  '2': [
    '11110',
    '00001',
    '00001',
    '11110',
    '10000',
    '10000',
    '11111',
  ],
  '3': [
    '11110',
    '00001',
    '00001',
    '01110',
    '00001',
    '00001',
    '11110',
  ],
  '4': [
    '10010',
    '10010',
    '10010',
    '11111',
    '00010',
    '00010',
    '00010',
  ],
  '5': [
    '11111',
    '10000',
    '10000',
    '11110',
    '00001',
    '00001',
    '11110',
  ],
  '6': [
    '01111',
    '10000',
    '10000',
    '11110',
    '10001',
    '10001',
    '01110',
  ],
  '7': [
    '11111',
    '00001',
    '00010',
    '00100',
    '01000',
    '01000',
    '01000',
  ],
  '8': [
    '01110',
    '10001',
    '10001',
    '01110',
    '10001',
    '10001',
    '01110',
  ],
  '9': [
    '01110',
    '10001',
    '10001',
    '01111',
    '00001',
    '00001',
    '11110',
  ],
  m: [
    '00000',
    '00000',
    '11011',
    '10101',
    '10101',
    '10101',
    '10101',
  ],
  V: [
    '10001',
    '10001',
    '10001',
    '10001',
    '01010',
    '01010',
    '00100',
  ],
} as const;

type UltraDisplayGlyph = keyof typeof ULTRA_DISPLAY_GLYPHS;

const formatAlignedSignalParts = (value: number | null): UltraAlignedSignalParts => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { left: ' ----', right: '.-- mV' };
  }
  const boundedValue = clampSceneNumber(value, -9999.99, 9999.99);
  const sign = boundedValue < 0 ? '-' : '+';
  const [integerPart, fractionalPart = '00'] = Math.abs(boundedValue).toFixed(2).split('.');
  return {
    left: `${sign}${integerPart.padStart(4, ' ')}`,
    right: `.${fractionalPart} mV`,
  };
};

const drawUltraAlignedSignal = (
  context: CanvasRenderingContext2D,
  parts: UltraAlignedSignalParts | null,
  canvasWidth: number,
  y: number,
) => {
  if (!parts) return;
  const leftFieldWidth = ULTRA_DISPLAY_SIGN_AND_INTEGER_SLOTS * ULTRA_DISPLAY_DIGIT_ADVANCE;
  const decimalFieldWidth = ULTRA_DISPLAY_DECIMAL_WIDTH;
  const fractionFieldWidth = ULTRA_DISPLAY_FRACTION_SLOTS * ULTRA_DISPLAY_DIGIT_ADVANCE;
  const unitFieldWidth = 2 * ULTRA_DISPLAY_UNIT_ADVANCE;
  const fullFieldWidth = leftFieldWidth +
    ULTRA_DISPLAY_DECIMAL_GAP +
    decimalFieldWidth +
    ULTRA_DISPLAY_FRACTION_GAP +
    fractionFieldWidth +
    ULTRA_DISPLAY_UNIT_GAP +
    unitFieldWidth;
  const startX = Math.round((canvasWidth - fullFieldWidth) / 2);
  const topY = Math.round(y - ULTRA_DISPLAY_ROW_HEIGHT / 2);
  const decimalX = Math.round(startX + leftFieldWidth + ULTRA_DISPLAY_DECIMAL_GAP);
  const fractionStartX = decimalX + decimalFieldWidth + ULTRA_DISPLAY_FRACTION_GAP;
  const unitStartX = fractionStartX + fractionFieldWidth + ULTRA_DISPLAY_UNIT_GAP;
  const leftGlyphs = parts.left.slice(-ULTRA_DISPLAY_SIGN_AND_INTEGER_SLOTS).padStart(ULTRA_DISPLAY_SIGN_AND_INTEGER_SLOTS, ' ');
  const fractionGlyphs = parts.right.match(/\.(\d{2})/)?.[1] ?? '--';

  Array.from(leftGlyphs).forEach((glyph, index) => {
    drawUltraDisplayGlyph(context, glyph, startX + index * ULTRA_DISPLAY_DIGIT_ADVANCE, topY);
  });
  drawUltraDisplayDecimalPoint(context, decimalX, topY);
  Array.from(fractionGlyphs).forEach((glyph, index) => {
    drawUltraDisplayGlyph(context, glyph, fractionStartX + index * ULTRA_DISPLAY_DIGIT_ADVANCE, topY);
  });
  drawUltraDisplayGlyph(context, 'm', unitStartX, topY);
  drawUltraDisplayGlyph(context, 'V', unitStartX + ULTRA_DISPLAY_UNIT_ADVANCE, topY);
};

const drawUltraDisplayDecimalPoint = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
) => {
  const decimalY = y + ULTRA_DISPLAY_DECIMAL_TOP_ROW * (ULTRA_DISPLAY_PIXEL_SIZE + ULTRA_DISPLAY_PIXEL_GAP);
  for (let rowIndex = 0; rowIndex < ULTRA_DISPLAY_DECIMAL_ROWS; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < ULTRA_DISPLAY_DECIMAL_COLUMNS; columnIndex += 1) {
      const pixelX = x + columnIndex * (ULTRA_DISPLAY_PIXEL_SIZE + ULTRA_DISPLAY_PIXEL_GAP);
      const pixelY = decimalY + rowIndex * (ULTRA_DISPLAY_PIXEL_SIZE + ULTRA_DISPLAY_PIXEL_GAP);
      context.fillRect(pixelX, pixelY, ULTRA_DISPLAY_PIXEL_SIZE, ULTRA_DISPLAY_PIXEL_SIZE);
    }
  }
};

const drawUltraDisplayGlyph = (
  context: CanvasRenderingContext2D,
  glyph: string,
  x: number,
  y: number,
) => {
  const pattern = ULTRA_DISPLAY_GLYPHS[glyph as UltraDisplayGlyph] ?? ULTRA_DISPLAY_GLYPHS[' '];
  pattern.forEach((row, rowIndex) => {
    Array.from(row).forEach((cell, columnIndex) => {
      if (cell !== '1') return;
      const pixelX = x + columnIndex * (ULTRA_DISPLAY_PIXEL_SIZE + ULTRA_DISPLAY_PIXEL_GAP);
      const pixelY = y + rowIndex * (ULTRA_DISPLAY_PIXEL_SIZE + ULTRA_DISPLAY_PIXEL_GAP);
      context.fillRect(pixelX, pixelY, ULTRA_DISPLAY_PIXEL_SIZE, ULTRA_DISPLAY_PIXEL_SIZE);
    });
  });
};
const dampUltraControlAngle = (current: number, target: number, smoothingRate: number, delta: number) => (
  THREE.MathUtils.damp(current, target, smoothingRate, delta)
);
const getUltraStopcockVisualAngleRad = (angleDeg: number) => -THREE.MathUtils.degToRad(angleDeg);

const cloneModelScene = (sourceScene: THREE.Object3D) => {
  const clonedScene = sourceScene.clone(true);
  clonedScene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.raycast = () => undefined;
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((material) => material.clone());
    } else if (mesh.material) {
      mesh.material = mesh.material.clone();
    }
  });
  return clonedScene;
};

const collectNodes = (root: THREE.Object3D) => {
  const nodeMap = new Map<string, THREE.Object3D>();
  root.traverse((object) => {
    if (object.name) nodeMap.set(object.name, object);
  });
  return nodeMap;
};

const collectBaseTransforms = (nodeMap: Map<string, THREE.Object3D>) => {
  const baseTransforms = new Map<string, {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    scale: THREE.Vector3;
  }>();
  REQUIRED_ULTRA_NODE_NAMES.forEach((nodeName) => {
    const node = nodeMap.get(nodeName);
    if (!node) return;
    baseTransforms.set(nodeName, {
      position: node.position.clone(),
      quaternion: node.quaternion.clone(),
      scale: node.scale.clone(),
    });
  });
  return baseTransforms;
};

const applyLocalAxisRotation = (
  nodeMap: Map<string, THREE.Object3D>,
  baseTransforms: Map<string, { quaternion: THREE.Quaternion }>,
  nodeName: string,
  axis: THREE.Vector3,
  angleRad: number,
) => {
  const node = nodeMap.get(nodeName);
  const base = baseTransforms.get(nodeName);
  if (!node || !base) return;
  node.quaternion.copy(base.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(axis, angleRad));
};

const applyLocalAxisRotationAroundPivot = (
  nodeMap: Map<string, THREE.Object3D>,
  baseTransforms: Map<string, {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
  }>,
  nodeName: string,
  axis: THREE.Vector3,
  pivotOffset: THREE.Vector3,
  angleRad: number,
) => {
  const node = nodeMap.get(nodeName);
  const base = baseTransforms.get(nodeName);
  if (!node || !base) return;
  const rotation = new THREE.Quaternion().setFromAxisAngle(axis, angleRad);
  const scaledPivotOffset = pivotOffset.clone().multiply(node.scale);
  const rotatedPivotOffset = scaledPivotOffset.clone().applyQuaternion(rotation);
  const positionCorrection = scaledPivotOffset.sub(rotatedPivotOffset).applyQuaternion(base.quaternion);
  node.position.copy(base.position).add(positionCorrection);
  node.quaternion.copy(base.quaternion).multiply(rotation);
};

type UltraColorMaterial = THREE.Material & {
  color?: THREE.Color;
  emissive?: THREE.Color;
  emissiveIntensity?: number;
  opacity?: number;
  transparent?: boolean;
  depthWrite?: boolean;
  roughness?: number;
  metalness?: number;
  transmission?: number;
  thickness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  specularIntensity?: number;
  toneMapped?: boolean;
  map?: THREE.Texture | null;
  aoMap?: THREE.Texture | null;
};

type UltraMaterialSnapshot = {
  color?: THREE.Color;
  emissive?: THREE.Color;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
};

type UltraControlMaterialHighlight = {
  control: UltraMaterialHighlightControl;
  nodeNames: readonly string[];
  lightnessLift: number;
  saturationLift?: number;
  emissiveIntensity: number;
};

const ULTRA_CONTROL_MATERIAL_HIGHLIGHTS: readonly UltraControlMaterialHighlight[] = [
  {
    control: 'pressureZero',
    nodeNames: ['FD_NCD_C_ZeroAdjustKnob'],
    lightnessLift: 0.22,
    saturationLift: 0.035,
    emissiveIntensity: 0.11,
  },
  {
    control: 'stopcock',
    nodeNames: ['Stopcock_RotatingRoundKnob', 'Stopcock_HandleStem', 'Stopcock_THandle', 'Stopcock_RotatingPlugCore'],
    lightnessLift: 0.18,
    saturationLift: 0.026,
    emissiveIntensity: 0.09,
  },
  {
    control: 'pumpValve',
    nodeNames: ['InletValue_Pivot'],
    lightnessLift: 0.22,
    saturationLift: 0.035,
    emissiveIntensity: 0.11,
  },
  {
    control: 'pumpBulb',
    nodeNames: ['Pump_Bulb'],
    lightnessLift: 0.22,
    saturationLift: 0.055,
    emissiveIntensity: 0.08,
  },
];

const getUltraMeshMaterials = (mesh: THREE.Mesh) => {
  if (Array.isArray(mesh.material)) return mesh.material;
  return mesh.material ? [mesh.material] : [];
};

const getUltraNaturalHighlightColor = (baseColor: THREE.Color, lightnessLift: number, saturationLift = 0.02) => {
  const hsl = { h: 0, s: 0, l: 0 };
  baseColor.getHSL(hsl);
  return new THREE.Color().setHSL(
    hsl.h,
    clampSceneNumber(hsl.s + saturationLift * (1 - hsl.s), 0, 1),
    clampSceneNumber(hsl.l + lightnessLift * (1 - hsl.l), 0, 1),
  );
};

const captureUltraMaterialSnapshot = (material: THREE.Material): UltraMaterialSnapshot => {
  const materialLike = material as UltraColorMaterial;
  return {
    color: materialLike.color?.clone(),
    emissive: materialLike.emissive?.clone(),
    emissiveIntensity: materialLike.emissiveIntensity,
    roughness: materialLike.roughness,
    metalness: materialLike.metalness,
  };
};

const restoreUltraMaterialSnapshot = (material: THREE.Material, snapshot: UltraMaterialSnapshot) => {
  const materialLike = material as UltraColorMaterial;
  if (snapshot.color && materialLike.color) materialLike.color.copy(snapshot.color);
  if (snapshot.emissive && materialLike.emissive) materialLike.emissive.copy(snapshot.emissive);
  if (typeof snapshot.emissiveIntensity === 'number' && 'emissiveIntensity' in materialLike) {
    materialLike.emissiveIntensity = snapshot.emissiveIntensity;
  }
  if (typeof snapshot.roughness === 'number' && 'roughness' in materialLike) {
    materialLike.roughness = snapshot.roughness;
  }
  if (typeof snapshot.metalness === 'number' && 'metalness' in materialLike) {
    materialLike.metalness = snapshot.metalness;
  }
  material.needsUpdate = true;
};

function applyUltraControlMaterialHighlights(
  nodeMap: Map<string, THREE.Object3D>,
  activeControls: ReadonlySet<UltraMaterialHighlightControl>,
  snapshotMap: Map<THREE.Material, UltraMaterialSnapshot>,
) {
  const highlightedMaterials = new Set<THREE.Material>();

  ULTRA_CONTROL_MATERIAL_HIGHLIGHTS.forEach((definition) => {
    if (!activeControls.has(definition.control)) return;

    definition.nodeNames.forEach((nodeName) => {
      const node = nodeMap.get(nodeName);
      node?.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        getUltraMeshMaterials(mesh).forEach((material) => {
          if (!snapshotMap.has(material)) snapshotMap.set(material, captureUltraMaterialSnapshot(material));
          const snapshot = snapshotMap.get(material);
          const materialLike = material as UltraColorMaterial;
          if (!snapshot) return;
          highlightedMaterials.add(material);
          const highlightColor = snapshot.color
            ? getUltraNaturalHighlightColor(snapshot.color, definition.lightnessLift, definition.saturationLift)
            : null;
          if (snapshot.color && materialLike.color) {
            materialLike.color.copy(highlightColor ?? snapshot.color);
          } else if (materialLike.color && highlightColor) {
            materialLike.color.copy(highlightColor);
          }
          if (materialLike.emissive && highlightColor) {
            materialLike.emissive.copy(snapshot.emissive ?? new THREE.Color(0, 0, 0)).lerp(highlightColor, 0.22);
          }
          if ('emissiveIntensity' in materialLike) {
            materialLike.emissiveIntensity = Math.max(snapshot.emissiveIntensity ?? 0, definition.emissiveIntensity);
          }
          material.needsUpdate = true;
        });
      });
    });
  });

  snapshotMap.forEach((snapshot, material) => {
    if (highlightedMaterials.has(material)) return;
    restoreUltraMaterialSnapshot(material, snapshot);
    snapshotMap.delete(material);
  });
}

const setUltraNodeOwnMaterialColor = (
  nodeMap: Map<string, THREE.Object3D>,
  nodeName: string,
  color: string,
  options?: {
    emissive?: string;
    emissiveIntensity?: number;
    opacity?: number;
    transparent?: boolean;
    depthWrite?: boolean;
    roughness?: number;
    metalness?: number;
    transmission?: number;
    thickness?: number;
    clearcoat?: number;
    clearcoatRoughness?: number;
    specularIntensity?: number;
    toneMapped?: boolean;
    clearTexture?: boolean;
  },
) => {
  const node = nodeMap.get(nodeName) as THREE.Mesh | undefined;
  if (!node?.isMesh) return;
  getUltraMeshMaterials(node).forEach((material) => {
    const themedMaterial = material as UltraColorMaterial;
    themedMaterial.color?.set(color);
    if (options?.emissive && themedMaterial.emissive) themedMaterial.emissive.set(options.emissive);
    if (typeof options?.emissiveIntensity === 'number' && 'emissiveIntensity' in themedMaterial) {
      themedMaterial.emissiveIntensity = options.emissiveIntensity;
    }
    if (typeof options?.opacity === 'number' && 'opacity' in themedMaterial) {
      themedMaterial.opacity = options.opacity;
    }
    if (typeof options?.transparent === 'boolean' && 'transparent' in themedMaterial) {
      themedMaterial.transparent = options.transparent;
    }
    if (typeof options?.depthWrite === 'boolean' && 'depthWrite' in themedMaterial) {
      themedMaterial.depthWrite = options.depthWrite;
    }
    if (typeof options?.roughness === 'number' && 'roughness' in themedMaterial) {
      themedMaterial.roughness = options.roughness;
    }
    if (typeof options?.metalness === 'number' && 'metalness' in themedMaterial) {
      themedMaterial.metalness = options.metalness;
    }
    if (typeof options?.transmission === 'number' && 'transmission' in themedMaterial) {
      themedMaterial.transmission = options.transmission;
    }
    if (typeof options?.thickness === 'number' && 'thickness' in themedMaterial) {
      themedMaterial.thickness = options.thickness;
    }
    if (typeof options?.clearcoat === 'number' && 'clearcoat' in themedMaterial) {
      themedMaterial.clearcoat = options.clearcoat;
    }
    if (typeof options?.clearcoatRoughness === 'number' && 'clearcoatRoughness' in themedMaterial) {
      themedMaterial.clearcoatRoughness = options.clearcoatRoughness;
    }
    if (typeof options?.specularIntensity === 'number' && 'specularIntensity' in themedMaterial) {
      themedMaterial.specularIntensity = options.specularIntensity;
    }
    if (typeof options?.toneMapped === 'boolean' && 'toneMapped' in themedMaterial) {
      themedMaterial.toneMapped = options.toneMapped;
    }
    if (options?.clearTexture) {
      if ('map' in themedMaterial) themedMaterial.map = null;
      if ('aoMap' in themedMaterial) themedMaterial.aoMap = null;
    }
    material.needsUpdate = true;
  });
};

const setUltraInstrumentMaterialColorByName = (
  nodeMap: Map<string, THREE.Object3D>,
  materialNamePattern: RegExp,
  color: string,
  options?: Parameters<typeof setUltraNodeOwnMaterialColor>[3],
) => {
  const instrumentRoot = nodeMap.get('FD_NCD_C_InstrumentBody');
  instrumentRoot?.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    getUltraMeshMaterials(mesh).forEach((material) => {
      if (!materialNamePattern.test(material.name ?? '')) return;
      const materialLike = material as UltraColorMaterial;
      materialLike.color?.set(color);
      if (options?.emissive && materialLike.emissive) materialLike.emissive.set(options.emissive);
      if (typeof options?.emissiveIntensity === 'number' && 'emissiveIntensity' in materialLike) {
        materialLike.emissiveIntensity = options.emissiveIntensity;
      }
      if (typeof options?.roughness === 'number' && 'roughness' in materialLike) {
        materialLike.roughness = options.roughness;
      }
      if (typeof options?.metalness === 'number' && 'metalness' in materialLike) {
        materialLike.metalness = options.metalness;
      }
      if (typeof options?.toneMapped === 'boolean' && 'toneMapped' in materialLike) {
        materialLike.toneMapped = options.toneMapped;
      }
      if (options?.clearTexture) {
        if ('map' in materialLike) materialLike.map = null;
        if ('aoMap' in materialLike) materialLike.aoMap = null;
      }
      material.needsUpdate = true;
    });
  });
};

const setUltraNodeTreeVisible = (
  nodeMap: Map<string, THREE.Object3D>,
  nodeName: string,
  visible: boolean,
) => {
  const node = nodeMap.get(nodeName);
  node?.traverse((object) => {
    object.visible = visible;
  });
};

const applyPowerSwitchVisualScale = (
  nodeMap: Map<string, THREE.Object3D>,
  baseTransforms: Map<string, { scale: THREE.Vector3 }>,
) => {
  const powerSwitchBase = nodeMap.get('FD_NCD_C_PowerSwitch_Base');
  const powerSwitchBaseTransform = baseTransforms.get('FD_NCD_C_PowerSwitch_Base');
  if (powerSwitchBase && powerSwitchBaseTransform) {
    powerSwitchBase.scale.set(
      powerSwitchBaseTransform.scale.x * POWER_SWITCH_BASE_VISUAL_SCALE.x,
      powerSwitchBaseTransform.scale.y * POWER_SWITCH_BASE_VISUAL_SCALE.y,
      powerSwitchBaseTransform.scale.z * POWER_SWITCH_BASE_VISUAL_SCALE.z,
    );
  }
  const powerSwitchFrame = nodeMap.get('HSL_PowerSwitch_Inset_Frame_Lip');
  const powerSwitchFrameTransform = baseTransforms.get('HSL_PowerSwitch_Inset_Frame_Lip');
  if (powerSwitchFrame && powerSwitchFrameTransform) {
    powerSwitchFrame.scale.set(
      powerSwitchFrameTransform.scale.x * POWER_SWITCH_FRAME_VISUAL_SCALE.x,
      powerSwitchFrameTransform.scale.y * POWER_SWITCH_FRAME_VISUAL_SCALE.y,
      powerSwitchFrameTransform.scale.z * POWER_SWITCH_FRAME_VISUAL_SCALE.z,
    );
  }
  const powerSwitch = nodeMap.get('FD_NCD_C_PowerSwitch_Button');
  const powerBase = baseTransforms.get('FD_NCD_C_PowerSwitch_Button');
  if (!powerSwitch || !powerBase) return;
  powerSwitch.scale.set(
    powerBase.scale.x * POWER_SWITCH_VISUAL_SCALE.x,
    powerBase.scale.y * POWER_SWITCH_VISUAL_SCALE.y,
    powerBase.scale.z * POWER_SWITCH_VISUAL_SCALE.z,
  );
};

const applyUltraThemeVisuals = (
  nodeMap: Map<string, THREE.Object3D>,
  baseTransforms: Map<string, { scale: THREE.Vector3 }>,
  sceneTheme: HeatCapacityUltraInstrumentModelProps['sceneTheme'],
) => {
  const visuals = ULTRA_THEME_VISUALS[sceneTheme];
  setUltraNodeOwnMaterialColor(nodeMap, 'clean_lab_bench', visuals.benchSurface, {
    roughness: 0.72,
    metalness: 0.02,
    clearTexture: true,
  });
  setUltraNodeOwnMaterialColor(nodeMap, 'HSL_LabBench_Backstop_LowLip', visuals.benchBackstop, {
    roughness: 0.74,
    metalness: 0.02,
    clearTexture: true,
  });
  setUltraNodeOwnMaterialColor(nodeMap, 'FD_NCD_C_InstrumentBody', visuals.instrumentBody, {
    roughness: 0.54,
    metalness: 0.03,
  });
  setUltraNodeOwnMaterialColor(nodeMap, 'FD_NCD_C_FrontPanel', visuals.frontPanel, {
    emissive: visuals.frontPanel,
    emissiveIntensity: 0.09,
    roughness: 0.5,
    metalness: 0.02,
    toneMapped: false,
    clearTexture: true,
  });
  setUltraInstrumentMaterialColorByName(nodeMap, /^mat_dark_sensor_plastic$/i, visuals.frontPanel, {
    emissive: visuals.frontPanel,
    emissiveIntensity: 0.09,
    roughness: 0.5,
    metalness: 0.02,
    toneMapped: false,
    clearTexture: true,
  });
  setUltraNodeOwnMaterialColor(nodeMap, 'HSL_MainDisplay_RecessWell', visuals.frontPanel, {
    emissive: visuals.frontPanel,
    emissiveIntensity: 0.06,
    roughness: 0.52,
    metalness: 0.02,
    toneMapped: false,
    clearTexture: true,
  });
  setUltraNodeOwnMaterialColor(nodeMap, 'HSL_MainDisplay_NameplateZone', '#101b1d', {
    emissive: '#071011',
    emissiveIntensity: 0.05,
    roughness: 0.72,
    clearTexture: true,
  });
  setUltraNodeOwnMaterialColor(nodeMap, 'HSL_MainDisplay_PixelScreenZone', visuals.displayScreen, {
    emissive: visuals.displayScreen,
    emissiveIntensity: sceneTheme === 'dark' ? 0.16 : 0.08,
    roughness: 0.7,
  });
  setUltraNodeOwnMaterialColor(nodeMap, 'FD_NCD_C_PowerSwitch_Base', visuals.powerSwitchBase, {
    roughness: 0.42,
    metalness: 0.02,
  });
  setUltraNodeOwnMaterialColor(nodeMap, 'HSL_PowerSwitch_Inset_Frame_Lip', visuals.powerSwitchFrame, {
    roughness: 0.32,
    metalness: 0.08,
  });
  setUltraNodeTreeVisible(nodeMap, 'FD_NCD_C_PowerSwitch_Button', false);
  setUltraNodeTreeVisible(nodeMap, 'HSL_PowerSwitch_Mark_I_Inlay', false);
  setUltraNodeTreeVisible(nodeMap, 'HSL_PowerSwitch_Mark_O_Inlay', false);
  [
    'Stopcock_GlassBulgedBody',
    'Stopcock_VerticalGlassTube',
    'HSL_Stopcock_SidePort',
    'Stopcock_UpperGlassLip',
    'Stopcock_LowerGlassLip',
  ].forEach((nodeName) => {
    setUltraNodeOwnMaterialColor(nodeMap, nodeName, '#d7f7ff', {
      opacity: 0.62,
      transparent: true,
      depthWrite: false,
      roughness: 0.035,
      metalness: 0,
      transmission: 0.46,
      clearcoat: 0.58,
      clearcoatRoughness: 0.035,
      specularIntensity: 0.88,
    });
  });
  setUltraNodeOwnMaterialColor(nodeMap, 'Stopcock_RotatingPlugCore', '#c9f5ff', {
    opacity: 0.70,
    transparent: true,
    depthWrite: false,
    roughness: 0.05,
    transmission: 0.28,
    clearcoat: 0.42,
    clearcoatRoughness: 0.05,
  });
  setUltraNodeOwnMaterialColor(nodeMap, 'HSL_Stopcock_FlowChannel', '#5fffe0', {
    emissive: '#24d7be',
    emissiveIntensity: 0.32,
    opacity: 0.96,
    transparent: true,
    depthWrite: false,
    roughness: 0.08,
    transmission: 0.02,
  });
  [
    'Stopcock_HandleStem',
    'Stopcock_RotatingRoundKnob',
    'Stopcock_THandle',
  ].forEach((nodeName) => {
    setUltraNodeOwnMaterialColor(nodeMap, nodeName, '#b9f1ff', {
      opacity: 0.78,
      transparent: true,
      depthWrite: false,
      roughness: 0.055,
      transmission: 0.18,
      clearcoat: 0.36,
      clearcoatRoughness: 0.06,
    });
  });
  applyPowerSwitchVisualScale(nodeMap, baseTransforms);
};

const applyUltraDisplayTexture = (
  nodeMap: Map<string, THREE.Object3D>,
  texture: THREE.CanvasTexture,
) => {
  const displayMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: false,
    toneMapped: false,
  });
  ULTRA_DISPLAY_TEXTURE_SURFACE_NODE_NAMES.forEach((nodeName) => {
    const surfaceNode = nodeMap.get(nodeName);
    surfaceNode?.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = displayMaterial;
    });
  });
};

const setUltraPoweredDisplayArtVisible = (
  nodeMap: Map<string, THREE.Object3D>,
  visible: boolean,
) => {
  ULTRA_POWERED_DISPLAY_ART_NODE_NAMES.forEach((nodeName) => {
    const artNode = nodeMap.get(nodeName);
    if (artNode) artNode.visible = visible;
  });
};

const absorbUltraPointerEvent = (event: ThreeEvent<PointerEvent | MouseEvent | WheelEvent>) => {
  event.stopPropagation();
  event.nativeEvent.stopPropagation();
  event.nativeEvent.stopImmediatePropagation?.();
};

const isUltraPrimaryPointerButton = (event: ThreeEvent<PointerEvent | MouseEvent>) => event.nativeEvent.button === 0;

const getUltraPowerSwitchHalfWidthAtY = (y: number) => {
  const halfWidth = POWER_SWITCH_ROCKER_WIDTH / 2;
  const halfHeight = POWER_SWITCH_ROCKER_HEIGHT / 2;
  const cornerStartY = halfHeight - POWER_SWITCH_ROCKER_CORNER_RADIUS;
  const cornerDistanceY = Math.max(0, Math.abs(y) - cornerStartY);
  if (cornerDistanceY <= 0) return halfWidth;
  const roundedInset = POWER_SWITCH_ROCKER_CORNER_RADIUS
    - Math.sqrt(Math.max(0, POWER_SWITCH_ROCKER_CORNER_RADIUS ** 2 - cornerDistanceY ** 2));
  return Math.max(halfWidth - POWER_SWITCH_ROCKER_CORNER_RADIUS, halfWidth - roundedInset);
};

const getUltraPowerSwitchFaceZ = (y: number) => {
  const halfHeight = POWER_SWITCH_ROCKER_HEIGHT / 2;
  const normalizedDistanceFromCenter = Math.min(1, Math.abs(y) / halfHeight);
  return POWER_SWITCH_ROCKER_FACE_Z
    + POWER_SWITCH_ROCKER_FACE_CROWN_Z * (1 - normalizedDistanceFromCenter * normalizedDistanceFromCenter);
};

const getUltraPowerSwitchRockerSkirtPoint = (edgeSign: -1 | 1, step: number) => {
  const halfHeight = POWER_SWITCH_ROCKER_HEIGHT / 2;
  const progress = step / POWER_SWITCH_ROCKER_SEGMENTS;
  const theta = progress * Math.PI / 2;
  return {
    y: edgeSign * (halfHeight - POWER_SWITCH_ROCKER_SKIRT_DEPTH * (1 - Math.cos(theta))),
    z: THREE.MathUtils.lerp(getUltraPowerSwitchFaceZ(edgeSign * halfHeight), POWER_SWITCH_ROCKER_BACK_Z, Math.sin(theta)),
  };
};

const createUltraPowerSwitchRockerGeometry = () => {
  const halfWidth = POWER_SWITCH_ROCKER_WIDTH / 2;
  const halfHeight = POWER_SWITCH_ROCKER_HEIGHT / 2;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const pushVertex = (x: number, y: number, z: number) => {
    const index = positions.length / 3;
    positions.push(x, y, z);
    uvs.push((x + halfWidth) / POWER_SWITCH_ROCKER_WIDTH, (y + halfHeight) / POWER_SWITCH_ROCKER_HEIGHT);
    return index;
  };

  const addQuad = (a: number, b: number, c: number, d: number) => {
    indices.push(a, b, c);
    indices.push(a, c, d);
  };

  let previousFaceLeft: number | null = null;
  let previousFaceRight: number | null = null;
  for (let step = 0; step <= POWER_SWITCH_ROCKER_FACE_SEGMENTS; step += 1) {
    const y = THREE.MathUtils.lerp(-halfHeight, halfHeight, step / POWER_SWITCH_ROCKER_FACE_SEGMENTS);
    const z = getUltraPowerSwitchFaceZ(y);
    const rowHalfWidth = getUltraPowerSwitchHalfWidthAtY(y);
    const faceLeft = pushVertex(-rowHalfWidth, y, z);
    const faceRight = pushVertex(rowHalfWidth, y, z);
    if (previousFaceLeft !== null && previousFaceRight !== null) {
      addQuad(previousFaceLeft, previousFaceRight, faceRight, faceLeft);
    }
    previousFaceLeft = faceLeft;
    previousFaceRight = faceRight;
  }

  ([-1, 1] as const).forEach((edgeSign) => {
    const leftArc: number[] = [];
    const rightArc: number[] = [];
    for (let step = 0; step <= POWER_SWITCH_ROCKER_SEGMENTS; step += 1) {
      const point = getUltraPowerSwitchRockerSkirtPoint(edgeSign, step);
      const rowHalfWidth = getUltraPowerSwitchHalfWidthAtY(point.y);
      leftArc.push(pushVertex(-rowHalfWidth, point.y, point.z));
      rightArc.push(pushVertex(rowHalfWidth, point.y, point.z));
    }
    for (let step = 0; step < POWER_SWITCH_ROCKER_SEGMENTS; step += 1) {
      if (edgeSign > 0) {
        addQuad(leftArc[step], rightArc[step], rightArc[step + 1], leftArc[step + 1]);
      } else {
        addQuad(rightArc[step], leftArc[step], leftArc[step + 1], rightArc[step + 1]);
      }
    }
  });

  const backSkirtInnerY = -halfHeight + POWER_SWITCH_ROCKER_SKIRT_DEPTH;
  const frontSkirtInnerY = halfHeight - POWER_SWITCH_ROCKER_SKIRT_DEPTH;
  const bottomBackHalfWidth = getUltraPowerSwitchHalfWidthAtY(backSkirtInnerY);
  const bottomFrontHalfWidth = getUltraPowerSwitchHalfWidthAtY(frontSkirtInnerY);
  const bottomBackLeft = pushVertex(-bottomBackHalfWidth, backSkirtInnerY, POWER_SWITCH_ROCKER_BACK_Z);
  const bottomBackRight = pushVertex(bottomBackHalfWidth, backSkirtInnerY, POWER_SWITCH_ROCKER_BACK_Z);
  const bottomFrontRight = pushVertex(bottomFrontHalfWidth, frontSkirtInnerY, POWER_SWITCH_ROCKER_BACK_Z);
  const bottomFrontLeft = pushVertex(-bottomFrontHalfWidth, frontSkirtInnerY, POWER_SWITCH_ROCKER_BACK_Z);
  addQuad(bottomBackRight, bottomBackLeft, bottomFrontLeft, bottomFrontRight);

  ([-1, 1] as const).forEach((sideSign) => {
    let previousTop: number | null = null;
    let previousBottom: number | null = null;
    for (let step = 0; step <= POWER_SWITCH_ROCKER_FACE_SEGMENTS; step += 1) {
      const y = THREE.MathUtils.lerp(-halfHeight, halfHeight, step / POWER_SWITCH_ROCKER_FACE_SEGMENTS);
      const bottomY = clampSceneNumber(y, backSkirtInnerY, frontSkirtInnerY);
      const top = pushVertex(sideSign * getUltraPowerSwitchHalfWidthAtY(y), y, getUltraPowerSwitchFaceZ(y));
      const bottom = pushVertex(sideSign * getUltraPowerSwitchHalfWidthAtY(bottomY), bottomY, POWER_SWITCH_ROCKER_BACK_Z);
      if (previousTop !== null && previousBottom !== null) {
        if (sideSign > 0) {
          addQuad(previousTop, top, bottom, previousBottom);
        } else {
          addQuad(top, previousTop, previousBottom, bottom);
        }
      }
      previousTop = top;
      previousBottom = bottom;
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
};

const createUltraPowerSwitchRingInlayGeometry = () => {
  const outerRadius = 0.0084;
  const innerRadius = 0.0058;
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return new THREE.ShapeGeometry(shape, 24);
};

function UltraNodeHitbox({
  definition,
  nodeMap,
  parentRef,
  onClick,
  onDoubleClick,
  onPointerDown,
  onWheel,
  onPointerOver,
  onPointerMove,
  onPointerOut,
}: {
  definition: (typeof ULTRA_CONTROL_HITBOXES)[number];
  nodeMap: Map<string, THREE.Object3D>;
  parentRef: React.RefObject<THREE.Group | null>;
  onClick?: (control: UltraPointerControl, event: ThreeEvent<MouseEvent>) => void;
  onDoubleClick?: (control: UltraPointerControl, event: ThreeEvent<MouseEvent>) => void;
  onPointerDown?: (control: UltraPointerControl, event: ThreeEvent<PointerEvent>) => void;
  onWheel?: (control: UltraPointerControl, event: ThreeEvent<WheelEvent>) => void;
  onPointerOver?: (control: UltraPointerControl, event: ThreeEvent<PointerEvent>) => void;
  onPointerMove?: (control: UltraPointerControl, event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (control: UltraPointerControl, event: ThreeEvent<PointerEvent>) => void;
}) {
  const groupRef = useRef<THREE.Group | null>(null);
  const parentInverseMatrixRef = useRef(new THREE.Matrix4());
  const localMatrixRef = useRef(new THREE.Matrix4());
  const anchorPositionRef = useRef(new THREE.Vector3());
  const anchorQuaternionRef = useRef(new THREE.Quaternion());
  const anchorScaleRef = useRef(new THREE.Vector3());
  const anchor = nodeMap.get(definition.anchorNodeName);

  useFrame(() => {
    const group = groupRef.current;
    const parent = parentRef.current;
    if (!group || !parent || !anchor) return;
    parent.updateMatrixWorld(true);
    anchor.updateMatrixWorld(true);
    parentInverseMatrixRef.current.copy(parent.matrixWorld).invert();
    localMatrixRef.current.copy(anchor.matrixWorld);
    localMatrixRef.current.decompose(
      anchorPositionRef.current,
      anchorQuaternionRef.current,
      anchorScaleRef.current,
    );
    localMatrixRef.current.compose(anchorPositionRef.current, anchorQuaternionRef.current, ULTRA_HITBOX_UNIT_SCALE);
    group.matrix.multiplyMatrices(parentInverseMatrixRef.current, localMatrixRef.current);
    group.matrixWorldNeedsUpdate = true;
  });

  if (!anchor) return null;

  return (
    <group ref={groupRef} matrixAutoUpdate={false}>
      <mesh
        name={`HSL_UltraMeshHitbox_${definition.control}`}
        position={definition.offset ?? [0, 0, 0]}
        onClick={(event) => onClick?.(definition.control, event)}
        onDoubleClick={(event) => onDoubleClick?.(definition.control, event)}
        onPointerDown={(event) => onPointerDown?.(definition.control, event)}
        onWheel={(event) => onWheel?.(definition.control, event)}
        onPointerOver={(event) => onPointerOver?.(definition.control, event)}
        onPointerMove={(event) => onPointerMove?.(definition.control, event)}
        onPointerOut={(event) => onPointerOut?.(definition.control, event)}
      >
        <boxGeometry args={definition.size} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function UltraInstrumentFocusHitbox({
  nodeMap,
  parentRef,
  onDoubleClick,
}: {
  nodeMap: Map<string, THREE.Object3D>;
  parentRef: React.RefObject<THREE.Group | null>;
  onDoubleClick: (event: ThreeEvent<MouseEvent>) => void;
}) {
  const groupRef = useRef<THREE.Group | null>(null);
  const parentInverseMatrixRef = useRef(new THREE.Matrix4());
  const localMatrixRef = useRef(new THREE.Matrix4());
  const anchorPositionRef = useRef(new THREE.Vector3());
  const anchorQuaternionRef = useRef(new THREE.Quaternion());
  const anchorScaleRef = useRef(new THREE.Vector3());
  const anchor = nodeMap.get(ULTRA_INSTRUMENT_FOCUS_HITBOX.anchorNodeName);

  useFrame(() => {
    const group = groupRef.current;
    const parent = parentRef.current;
    if (!group || !parent || !anchor) return;
    parent.updateMatrixWorld(true);
    anchor.updateMatrixWorld(true);
    parentInverseMatrixRef.current.copy(parent.matrixWorld).invert();
    localMatrixRef.current.copy(anchor.matrixWorld);
    localMatrixRef.current.decompose(
      anchorPositionRef.current,
      anchorQuaternionRef.current,
      anchorScaleRef.current,
    );
    localMatrixRef.current.compose(anchorPositionRef.current, anchorQuaternionRef.current, ULTRA_HITBOX_UNIT_SCALE);
    group.matrix.multiplyMatrices(parentInverseMatrixRef.current, localMatrixRef.current);
    group.matrixWorldNeedsUpdate = true;
  });

  if (!anchor) return null;

  return (
    <group ref={groupRef} matrixAutoUpdate={false}>
      <mesh
        name="HSL_UltraMeshHitbox_instrumentFocus"
        position={ULTRA_INSTRUMENT_FOCUS_HITBOX.offset}
        onDoubleClick={onDoubleClick}
      >
        <boxGeometry args={[...ULTRA_INSTRUMENT_FOCUS_HITBOX.size]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

const getUltraHoverHaloColor = (tone: UltraVisualEffectTone, effects: UltraVisualEffects) => {
  if (tone === 'glass') return effects.glassHoverHaloColor;
  if (tone === 'pumpBulb') return effects.pumpBulbHoverHaloColor;
  return effects.hoverHaloColor;
};

const getUltraHoverHaloOpacity = (tone: UltraVisualEffectTone, effects: UltraVisualEffects) => {
  if (tone === 'glass') return effects.glassHoverHaloOpacity;
  if (tone === 'pumpBulb') return effects.pumpBulbHoverHaloOpacity;
  return effects.nonBulbHoverHaloOpacity;
};

const renderUltraHaloGeometry = (target: UltraControlVisualTarget) => {
  if (target.shape === 'box') return <boxGeometry args={target.size} />;
  if (target.shape === 'plane') return <planeGeometry args={target.size} />;
  if (target.shape === 'sphere') return <sphereGeometry args={target.args} />;
  return <torusGeometry args={target.args} />;
};

type UltraFocusShellMeshEntry = {
  key: string;
  geometry: THREE.BufferGeometry;
  matrix: THREE.Matrix4;
};

const getUltraFocusShellBlending = (effects: UltraVisualEffects) => (
  effects.focusShellBlendMode === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending
);

const initializeUltraFocusShellMeshMorphTargets = (mesh: THREE.Mesh) => {
  mesh.updateMorphTargets();
};

const collectUltraFocusShellMeshes = (
  target: UltraControlVisualTarget,
  nodeMap: Map<string, THREE.Object3D>,
  anchor: THREE.Object3D,
): UltraFocusShellMeshEntry[] => {
  anchor.updateMatrixWorld(true);
  const anchorInverseMatrix = new THREE.Matrix4().copy(anchor.matrixWorld).invert();
  const shellNodeNames = target.focusShellNodeNames ?? [target.anchorNodeName];
  const visitedMeshes = new Set<THREE.Mesh>();
  const entries: UltraFocusShellMeshEntry[] = [];

  shellNodeNames.forEach((nodeName) => {
    const rootNode = nodeMap.get(nodeName);
    rootNode?.updateMatrixWorld(true);
    rootNode?.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry || visitedMeshes.has(mesh)) return;
      visitedMeshes.add(mesh);
      mesh.updateMatrixWorld(true);
      entries.push({
        key: `${target.id}-${nodeName}-${entries.length}`,
        geometry: mesh.geometry,
        matrix: new THREE.Matrix4().multiplyMatrices(anchorInverseMatrix, mesh.matrixWorld),
      });
    });
  });

  return entries;
};

const getUltraVisualTargetMode = (
  target: UltraControlVisualTarget,
  hoveredControl: UltraHoveredControl,
  demoFocusControlId: string | null,
  demoFocusPulseActive: boolean,
) => {
  const focused = demoFocusPulseActive
    && demoFocusControlId !== null
    && target.focusControlIds.includes(demoFocusControlId as UltraFocusControl);
  if (focused) return 'focus' as const;
  if (target.hoverControl && target.hoverControl === hoveredControl) return 'hover' as const;
  return null;
};

function UltraNodeHalo({
  target,
  mode,
  nodeMap,
  parentRef,
  effects,
  suspended,
}: {
  target: UltraControlVisualTarget;
  mode: 'hover' | 'focus';
  nodeMap: Map<string, THREE.Object3D>;
  parentRef: React.RefObject<THREE.Group | null>;
  effects: UltraVisualEffects;
  suspended: boolean;
}) {
  const groupRef = useRef<THREE.Group | null>(null);
  const hoverMeshRef = useRef<THREE.Mesh | null>(null);
  const hoverMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const shellBreathRef = useRef<THREE.Group | null>(null);
  const shellPulseRef = useRef<THREE.Group | null>(null);
  const focusPulseStartedAtRef = useRef<number | null>(null);
  const parentInverseMatrixRef = useRef(new THREE.Matrix4());
  const localMatrixRef = useRef(new THREE.Matrix4());
  const anchorPositionRef = useRef(new THREE.Vector3());
  const anchorQuaternionRef = useRef(new THREE.Quaternion());
  const anchorScaleRef = useRef(new THREE.Vector3());
  const anchor = nodeMap.get(target.anchorNodeName);
  const focusMode = mode === 'focus';
  const color = focusMode ? effects.demoHaloColor : getUltraHoverHaloColor(target.tone, effects);
  const hoverOpacity = getUltraHoverHaloOpacity(target.tone, effects);
  const baseOpacity = focusMode ? effects.demoHaloMinOpacity : hoverOpacity;
  const shellSide = target.focusShellSide === 'double' ? THREE.DoubleSide : THREE.BackSide;
  const focusShellDepthTest = target.focusShellSide !== 'double';
  const focusShellMeshes = useMemo(
    () => (anchor ? collectUltraFocusShellMeshes(target, nodeMap, anchor) : []),
    [anchor, nodeMap, target],
  );
  const shellBreathMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: effects.focusShellColor,
    transparent: true,
    opacity: effects.focusShellBreathMinOpacity,
    depthWrite: false,
    depthTest: focusShellDepthTest,
    side: shellSide,
    blending: getUltraFocusShellBlending(effects),
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    toneMapped: false,
  }), [
    effects.focusShellBlendMode,
    effects.focusShellBreathMinOpacity,
    effects.focusShellColor,
    focusShellDepthTest,
    shellSide,
  ]);
  const shellPulseMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: effects.focusShellRimColor,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: focusShellDepthTest,
    side: shellSide,
    blending: getUltraFocusShellBlending(effects),
    polygonOffset: true,
    polygonOffsetFactor: -8,
    polygonOffsetUnits: -8,
    toneMapped: false,
  }), [
    effects.focusShellBlendMode,
    effects.focusShellRimColor,
    focusShellDepthTest,
    shellSide,
  ]);

  useEffect(() => () => {
    shellBreathMaterial.dispose();
    shellPulseMaterial.dispose();
  }, [shellBreathMaterial, shellPulseMaterial]);

  useEffect(() => {
    focusPulseStartedAtRef.current = null;
  }, [focusMode, target.id]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    const parent = parentRef.current;
    if (!group || !parent || !anchor) return;
    parent.updateMatrixWorld(true);
    anchor.updateMatrixWorld(true);
    parentInverseMatrixRef.current.copy(parent.matrixWorld).invert();
    localMatrixRef.current.copy(anchor.matrixWorld);
    localMatrixRef.current.decompose(
      anchorPositionRef.current,
      anchorQuaternionRef.current,
      anchorScaleRef.current,
    );
    localMatrixRef.current.compose(anchorPositionRef.current, anchorQuaternionRef.current, ULTRA_HITBOX_UNIT_SCALE);
    group.matrix.multiplyMatrices(parentInverseMatrixRef.current, localMatrixRef.current);
    group.matrixWorldNeedsUpdate = true;

    if (focusMode && focusShellMeshes.length > 0) {
      const breathGroup = shellBreathRef.current;
      const pulseGroup = shellPulseRef.current;
      if (!breathGroup || !pulseGroup) return;

      if (suspended) {
        breathGroup.scale.setScalar(effects.focusShellBaseScale);
        pulseGroup.scale.setScalar(effects.focusShellPulseStartScale);
        shellBreathMaterial.opacity = effects.focusShellBreathMinOpacity;
        shellPulseMaterial.opacity = 0;
        return;
      }

      const breath = (Math.sin(clock.elapsedTime * Math.PI * 1.18) + 1) / 2;
      if (focusPulseStartedAtRef.current === null) focusPulseStartedAtRef.current = clock.elapsedTime;
      const focusPulseElapsed = Math.max(0, clock.elapsedTime - focusPulseStartedAtRef.current);
      const pulse = (focusPulseElapsed * effects.focusShellPulseRate) % 1;
      const popProgress = Math.min(pulse / ULTRA_FOCUS_SHELL_POP_FRACTION, 1);
      const fadeProgress = Math.max((pulse - ULTRA_FOCUS_SHELL_POP_FRACTION) / (1 - ULTRA_FOCUS_SHELL_POP_FRACTION), 0);
      const popEase = 1 - Math.pow(1 - popProgress, 3);
      const fadeEase = 1 - Math.pow(1 - fadeProgress, 2);
      const pulsePeakScale = target.focusShellPulsePopScale ?? effects.focusShellPulseStartScale;
      const pulseRetreatScale = target.focusShellPulseRetreatScale ??
        Math.max(effects.focusShellPulseStartScale, pulsePeakScale - effects.focusShellPulseScale * 0.42);
      const pulseRetreatDistance = Math.max(0, pulsePeakScale - pulseRetreatScale);
      breathGroup.scale.setScalar(effects.focusShellBaseScale + breath * effects.focusShellBreathScale);
      pulseGroup.scale.setScalar(THREE.MathUtils.lerp(effects.focusShellPulseStartScale, pulsePeakScale, popEase) - fadeEase * pulseRetreatDistance);
      shellBreathMaterial.opacity = effects.focusShellBreathMinOpacity +
        breath * (effects.focusShellBreathMaxOpacity - effects.focusShellBreathMinOpacity);
      shellPulseMaterial.opacity = effects.focusShellPulseOpacity * popEase * Math.pow(1 - fadeProgress, 1.45);
      return;
    }

    const hoverMesh = hoverMeshRef.current;
    const hoverMaterial = hoverMaterialRef.current;
    if (!hoverMesh || !hoverMaterial) return;

    if (!focusMode || suspended) {
      hoverMesh.scale.setScalar(focusMode ? 1 : target.hoverScale ?? 1);
      hoverMaterial.opacity = focusMode ? baseOpacity : baseOpacity * (target.hoverWireframe ? 0.62 : 1);
      return;
    }

    const pulse = (Math.sin(clock.elapsedTime * Math.PI * 1.5) + 1) / 2;
    hoverMesh.scale.setScalar(effects.demoHaloBaseScale + pulse * effects.demoHaloPulseScale);
    hoverMaterial.opacity = effects.demoHaloMinOpacity + pulse * (effects.demoHaloMaxOpacity - effects.demoHaloMinOpacity);
  });

  if (!anchor) return null;

  return (
    <group name={`HSL_UltraVisualHaloAnchor_${target.id}`} ref={groupRef} matrixAutoUpdate={false}>
      {focusMode && focusShellMeshes.length > 0 ? (
        <>
          <group name={`HSL_UltraFocusShellBreath_${target.id}`} ref={shellBreathRef}>
            {focusShellMeshes.map((entry) => (
              <mesh
                key={`breath-${entry.key}`}
                name={`HSL_UltraFocusShellBreathMesh_${entry.key}`}
                geometry={entry.geometry}
                matrix={entry.matrix}
                matrixAutoUpdate={false}
                material={shellBreathMaterial}
                renderOrder={24}
                raycast={DISABLE_ULTRA_RAYCAST}
                onUpdate={initializeUltraFocusShellMeshMorphTargets}
              />
            ))}
          </group>
          <group name={`HSL_UltraFocusShellPulse_${target.id}`} ref={shellPulseRef}>
            {focusShellMeshes.map((entry) => (
              <mesh
                key={`pulse-${entry.key}`}
                name={`HSL_UltraFocusShellPulseMesh_${entry.key}`}
                geometry={entry.geometry}
                matrix={entry.matrix}
                matrixAutoUpdate={false}
                material={shellPulseMaterial}
                renderOrder={25}
                raycast={DISABLE_ULTRA_RAYCAST}
                onUpdate={initializeUltraFocusShellMeshMorphTargets}
              />
            ))}
          </group>
        </>
      ) : (
        <mesh
          name={`HSL_UltraVisualHalo_${target.id}`}
          ref={hoverMeshRef}
          position={target.offset ?? [0, 0, 0]}
          rotation={target.rotation ?? [0, 0, 0]}
          raycast={DISABLE_ULTRA_RAYCAST}
        >
          {renderUltraHaloGeometry(target)}
          <meshBasicMaterial
            ref={hoverMaterialRef}
            color={color}
            transparent
            opacity={baseOpacity}
            depthWrite={false}
            depthTest={!focusMode}
            wireframe={mode === 'hover' && target.hoverWireframe === true}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}

function UltraPowerSwitchSkirtedRocker({
  nodeMap,
  parentRef,
  powerOn,
  sceneTheme,
  hovered,
  focused,
}: {
  nodeMap: Map<string, THREE.Object3D>;
  parentRef: React.RefObject<THREE.Group | null>;
  powerOn: boolean;
  sceneTheme: HeatCapacityUltraInstrumentModelProps['sceneTheme'];
  hovered: boolean;
  focused: boolean;
}) {
  const groupRef = useRef<THREE.Group | null>(null);
  const focusPulseRef = useRef<THREE.Mesh | null>(null);
  const focusPulseStartedAtRef = useRef<number | null>(null);
  const parentInverseMatrixRef = useRef(new THREE.Matrix4());
  const localMatrixRef = useRef(new THREE.Matrix4());
  const geometry = useMemo(() => createUltraPowerSwitchRockerGeometry(), []);
  const ringInlayGeometry = useMemo(() => createUltraPowerSwitchRingInlayGeometry(), []);
  const anchor = nodeMap.get('FD_NCD_C_PowerSwitch_Button');
  const themeVisuals = ULTRA_THEME_VISUALS[sceneTheme];
  const baseShellColor = powerOn ? themeVisuals.powerSwitchOn : themeVisuals.powerSwitchOff;
  const emphasized = hovered || focused;
  const shellColor = emphasized
    ? getUltraNaturalHighlightColor(new THREE.Color(baseShellColor), 0.28, 0.075)
    : baseShellColor;
  const focusPulseMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: sceneTheme === 'dark' ? '#8cf7df' : '#34c8b7',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    side: THREE.BackSide,
    blending: sceneTheme === 'dark' ? THREE.AdditiveBlending : THREE.NormalBlending,
    polygonOffset: true,
    polygonOffsetFactor: -10,
    polygonOffsetUnits: -10,
    toneMapped: false,
  }), [sceneTheme]);
  const markY = POWER_SWITCH_ROCKER_HEIGHT * 0.22;
  const markZ = getUltraPowerSwitchFaceZ(markY) + POWER_SWITCH_MARK_Z_OFFSET;

  useEffect(() => () => {
    geometry.dispose();
    ringInlayGeometry.dispose();
    focusPulseMaterial.dispose();
  }, [focusPulseMaterial, geometry, ringInlayGeometry]);

  useEffect(() => {
    if (!focused) {
      focusPulseStartedAtRef.current = null;
      focusPulseMaterial.opacity = 0;
    }
  }, [focused, focusPulseMaterial]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    const parent = parentRef.current;
    if (!group || !parent || !anchor) return;
    parent.updateMatrixWorld(true);
    anchor.updateMatrixWorld(true);
    parentInverseMatrixRef.current.copy(parent.matrixWorld).invert();
    localMatrixRef.current.multiplyMatrices(parentInverseMatrixRef.current, anchor.matrixWorld);
    group.matrix.copy(localMatrixRef.current);
    group.matrixWorldNeedsUpdate = true;

    const focusPulse = focusPulseRef.current;
    if (!focusPulse) return;
    if (!focused) {
      focusPulseStartedAtRef.current = null;
      focusPulseMaterial.opacity = 0;
      return;
    }

    if (focusPulseStartedAtRef.current === null) focusPulseStartedAtRef.current = clock.elapsedTime;
    const focusPulseElapsed = Math.max(0, clock.elapsedTime - focusPulseStartedAtRef.current);
    const pulse = (focusPulseElapsed * 0.58) % 1;
    const popProgress = Math.min(pulse / ULTRA_FOCUS_SHELL_POP_FRACTION, 1);
    const fadeProgress = Math.max((pulse - ULTRA_FOCUS_SHELL_POP_FRACTION) / (1 - ULTRA_FOCUS_SHELL_POP_FRACTION), 0);
    const popEase = 1 - Math.pow(1 - popProgress, 3);
    const fadeEase = 1 - Math.pow(1 - fadeProgress, 2);
    const pulseScale = THREE.MathUtils.lerp(1.04, 1.42, popEase) - fadeEase * 0.24;
    const pulseDepthScale = THREE.MathUtils.lerp(1.02, 1.18, popEase) - fadeEase * 0.06;
    focusPulse.scale.set(pulseScale, pulseScale, pulseDepthScale);
    focusPulseMaterial.opacity = 0.32 * popEase * Math.pow(1 - fadeProgress, 1.45);
  });

  if (!anchor) return null;

  return (
    <group name="HSL_PowerSwitch_SkirtedRockerRuntime" ref={groupRef} matrixAutoUpdate={false}>
      <mesh
        name="HSL_PowerSwitch_SkirtedRockerFocusPulse"
        ref={focusPulseRef}
        geometry={geometry}
        material={focusPulseMaterial}
        scale={[1.42, 1.42, 1.18]}
        renderOrder={26}
        raycast={DISABLE_ULTRA_RAYCAST}
      />
      <mesh name="HSL_PowerSwitch_SkirtedRockerShell" geometry={geometry}>
        <meshPhysicalMaterial
          color={shellColor}
          roughness={0.18}
          metalness={0.02}
          emissive={shellColor}
          emissiveIntensity={hovered ? 0.34 : focused ? 0.22 : powerOn ? 0.08 : 0.035}
          clearcoat={0.6}
          clearcoatRoughness={0.08}
          specularIntensity={0.82}
        />
      </mesh>
      <mesh name="HSL_PowerSwitch_SkirtedRockerMarkI" position={[0, markY, markZ]}>
        <planeGeometry args={[0.0048, 0.021]} />
        <meshBasicMaterial color={themeVisuals.powerSwitchInlay} toneMapped={false} />
      </mesh>
      <mesh name="HSL_PowerSwitch_SkirtedRockerMarkO" position={[0, -markY, markZ]} geometry={ringInlayGeometry}>
        <meshBasicMaterial color={themeVisuals.powerSwitchInlay} toneMapped={false} />
      </mesh>
    </group>
  );
}

function HeatCapacityUltraInstrumentModel(props: HeatCapacityUltraInstrumentModelProps) {
  const gltf = useGLTF(ULTRA_GLB_PATH);
  const { camera, gl, invalidate } = useThree();
  const runtimeRootRef = useRef<THREE.Group | null>(null);
  const displayTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const ultraMaterialHighlightSnapshotsRef = useRef(new Map<THREE.Material, UltraMaterialSnapshot>());
  const pumpPulseRef = useRef(0);
  const pumpVisualWeightRef = useRef(0);
  const pressureZeroDragRef = useRef({
    startKnobAngle: props.pressureZeroKnobAngle,
    lastPointerAngle: 0,
    totalDelta: 0,
    lastAppliedKnobAngle: props.pressureZeroKnobAngle,
  });
  const pendingUltraSingleClickRef = useRef<number | null>(null);
  const gaugeDisplayedRotationRef = useRef(PRESSURE_GAUGE_MIN_ROTATION);
  const stopcockDisplayedAngleRef = useRef(getUltraStopcockVisualAngleRad(props.stopcockAngleDeg));
  const pumpValveDisplayedAngleRef = useRef(props.pumpValveOpen ? 0 : Math.PI / 2);
  const pressureZeroDisplayedAngleRef = useRef(THREE.MathUtils.degToRad(props.pressureZeroKnobAngle));
  const powerSwitchDisplayedRotationRef = useRef(props.powerOn ? POWER_SWITCH_ON_ROTATION_RAD : POWER_SWITCH_OFF_ROTATION_RAD);
  const gaugeNeedleTargetRotation = getPressureGaugeNeedleRotation(
    props.pressureGaugeDisplayValue,
    props.gaugePressureMinKPa,
    props.gaugePressureMaxKPa,
    props.powerOn,
  );
  const stopcockOpen = getHeatCapacityStopcockState(props.stopcockAngleDeg) === 'open';
  const activeUltraMaterialControls = useMemo(() => {
    const controls = new Set<UltraMaterialHighlightControl>();
    if (props.hoveredControl) controls.add(props.hoveredControl);
    if (props.demoFocusPulseActive && isUltraPointerControl(props.demoFocusControlId)) {
      controls.add(props.demoFocusControlId);
    }
    return controls;
  }, [props.demoFocusControlId, props.demoFocusPulseActive, props.hoveredControl]);
  const ultraVisualTargetModes = ULTRA_CONTROL_VISUAL_TARGETS.map((target) => ({
    target,
    mode: getUltraVisualTargetMode(
      target,
      props.hoveredControl,
      props.demoFocusControlId,
      props.demoFocusPulseActive,
    ),
  }));

  const modelRoot = useMemo(() => cloneModelScene(gltf.scene), [gltf.scene]);
  const nodeMap = useMemo(() => collectNodes(modelRoot), [modelRoot]);
  const baseTransforms = useMemo(() => collectBaseTransforms(nodeMap), [nodeMap]);

  const projectUltraNodeAnchor = useCallback((nodeName: string) => {
    const anchor = nodeMap.get(nodeName);
    if (!anchor) return null;
    const rect = gl.domElement.getBoundingClientRect();
    const position = new THREE.Vector3();
    anchor.getWorldPosition(position);
    position.project(camera);
    return {
      clientX: rect.left + ((position.x + 1) / 2) * rect.width,
      clientY: rect.top + ((1 - position.y) / 2) * rect.height,
    };
  }, [camera, gl, nodeMap]);

  const projectUltraControlHitboxCenter = useCallback((control: UltraPointerControl) => {
    const definition = ULTRA_CONTROL_HITBOXES.find((item) => item.control === control);
    if (!definition) return null;
    const anchor = nodeMap.get(definition.anchorNodeName);
    if (!anchor) return null;
    const rect = gl.domElement.getBoundingClientRect();
    anchor.updateMatrixWorld(true);
    const position = definition.offset
      ? new THREE.Vector3(...definition.offset).applyMatrix4(anchor.matrixWorld)
      : new THREE.Vector3();
    if (!definition.offset) anchor.getWorldPosition(position);
    position.project(camera);
    return {
      clientX: rect.left + ((position.x + 1) / 2) * rect.width,
      clientY: rect.top + ((1 - position.y) / 2) * rect.height,
    };
  }, [camera, gl, nodeMap]);

  const resolveUltraPanelPointerControl = useCallback((
    control: UltraPointerControl,
    clientX: number,
    clientY: number,
  ): UltraPointerControl => {
    if (control !== 'powerSwitch' && control !== 'pressureZero') return control;
    const powerSwitchCenter = projectUltraControlHitboxCenter('powerSwitch');
    const pressureZeroCenter = projectUltraControlHitboxCenter('pressureZero');
    if (!powerSwitchCenter || !pressureZeroCenter) return control;
    const powerDistanceSq = getUltraScreenDistanceSq(clientX, clientY, powerSwitchCenter);
    const zeroDistanceSq = getUltraScreenDistanceSq(clientX, clientY, pressureZeroCenter);
    return zeroDistanceSq < powerDistanceSq ? 'pressureZero' : 'powerSwitch';
  }, [projectUltraControlHitboxCenter]);

  const resolveUltraActionControl = useCallback((
    control: UltraPointerControl,
    clientX: number,
    clientY: number,
  ): UltraPointerControl => {
    const panelResolvedControl = resolveUltraPanelPointerControl(control, clientX, clientY);
    return panelResolvedControl === 'pumpValve' && props.hoveredControl === 'stopcock'
      ? 'stopcock'
      : panelResolvedControl;
  }, [props.hoveredControl, resolveUltraPanelPointerControl]);

  const getPressureZeroPointerAngle = useCallback((clientX: number, clientY: number) => {
    const anchor = projectUltraNodeAnchor('FD_NCD_C_ZeroAdjustKnob');
    if (!anchor) return null;
    return THREE.MathUtils.radToDeg(Math.atan2(clientY - anchor.clientY, clientX - anchor.clientX));
  }, [projectUltraNodeAnchor]);

  const getSignedAngleDelta = (nextAngle: number, startAngle: number) => {
    const delta = ((nextAngle - startAngle + 540) % 360) - 180;
    return Number.isFinite(delta) ? delta : 0;
  };

  const openUltraValveFocusBubble = useCallback((control: UltraValveFocusControl) => {
    const nodeName = control === 'stopcock' ? 'Stopcock_Pivot' : 'InletValue_Pivot';
    const anchor = projectUltraNodeAnchor(nodeName);
    if (!anchor) return;
    props.onValveFocusAnchor(control, anchor.clientX, anchor.clientY);
  }, [projectUltraNodeAnchor, props]);

  const clearPendingUltraSingleClick = useCallback(() => {
    if (pendingUltraSingleClickRef.current !== null) {
      window.clearTimeout(pendingUltraSingleClickRef.current);
      pendingUltraSingleClickRef.current = null;
    }
  }, []);

  const scheduleUltraSingleClick = useCallback((run: () => void) => {
    clearPendingUltraSingleClick();
    pendingUltraSingleClickRef.current = window.setTimeout(() => {
      pendingUltraSingleClickRef.current = null;
      run();
    }, ULTRA_DOUBLE_CLICK_GUARD_MS);
  }, [clearPendingUltraSingleClick]);

  useEffect(() => clearPendingUltraSingleClick, [clearPendingUltraSingleClick]);

  const handleUltraControlClick = useCallback((control: UltraPointerControl, event: ThreeEvent<MouseEvent>) => {
    if (!isUltraPrimaryPointerButton(event)) return;
    absorbUltraPointerEvent(event);
    const clientX = event.clientX;
    const clientY = event.clientY;
    const runControlClick = () => {
      const resolvedControl = resolveUltraActionControl(control, clientX, clientY);
      if (resolvedControl === 'pressureZero') return;
      if (props.interactionLocked) {
        props.onLockedInteraction();
        return;
      }
      if (resolvedControl === 'powerSwitch') {
        props.onPowerToggle();
      } else if (resolvedControl === 'stopcock') {
        props.onStopcockOpenChange();
      } else if (resolvedControl === 'pumpValve') {
        props.onPumpValveToggle();
      } else if (resolvedControl === 'pumpBulb') {
        if (!props.pumpBulbInteractionEnabled) return;
        props.onPumpBulbPress();
      }
    };
    if (props.focusMode !== 'none') {
      runControlClick();
      return;
    }
    scheduleUltraSingleClick(runControlClick);
  }, [props, resolveUltraActionControl, scheduleUltraSingleClick]);

  const handleUltraControlDoubleClick = useCallback((control: UltraPointerControl, event: ThreeEvent<MouseEvent>) => {
    if (!isUltraPrimaryPointerButton(event)) return;
    absorbUltraPointerEvent(event);
    clearPendingUltraSingleClick();
    const resolvedControl = resolveUltraActionControl(control, event.clientX, event.clientY);
    if (props.interactionLocked) {
      props.onLockedInteraction();
      return;
    }
    if (resolvedControl === 'powerSwitch' || resolvedControl === 'pressureZero') {
      props.onFocus('instrument');
    } else if (resolvedControl === 'pumpBulb') {
      props.onFocus('pump');
    } else {
      props.onFocus('stopcock');
    }
  }, [clearPendingUltraSingleClick, props, resolveUltraActionControl]);

  const handleUltraInstrumentFocusDoubleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    if (!isUltraPrimaryPointerButton(event)) return;
    absorbUltraPointerEvent(event);
    clearPendingUltraSingleClick();
    if (props.interactionLocked) {
      props.onLockedInteraction();
      return;
    }
    props.onFocus('instrument');
  }, [clearPendingUltraSingleClick, props]);

  const handleUltraControlPointerDown = useCallback((control: UltraPointerControl, event: ThreeEvent<PointerEvent>) => {
    if (!isUltraPrimaryPointerButton(event)) return;
    const resolvedControl = resolveUltraPanelPointerControl(control, event.clientX, event.clientY);
    if (resolvedControl !== 'pressureZero') {
      absorbUltraPointerEvent(event);
      return;
    }
    absorbUltraPointerEvent(event);
    if (props.interactionLocked) {
      props.onLockedInteraction();
      return;
    }
    if (!props.pressureZeroInteractionEnabled) {
      return;
    }
    const pointerAngle = getPressureZeroPointerAngle(event.clientX, event.clientY);
    if (pointerAngle === null) return;
    pressureZeroDragRef.current = {
      startKnobAngle: props.pressureZeroKnobAngle,
      lastPointerAngle: pointerAngle,
      totalDelta: 0,
      lastAppliedKnobAngle: props.pressureZeroKnobAngle,
    };
    const pointerId = event.pointerId;
    gl.domElement.style.cursor = 'grabbing';
    try {
      gl.domElement.setPointerCapture?.(pointerId);
    } catch {
      // Synthetic browser-test events may not have an active pointer capture target.
    }
    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.stopPropagation();
      moveEvent.stopImmediatePropagation?.();
      moveEvent.preventDefault();
      const nextPointerAngle = getPressureZeroPointerAngle(moveEvent.clientX, moveEvent.clientY);
      if (nextPointerAngle === null) return;
      const dragState = pressureZeroDragRef.current;
      const pointerDelta = getSignedAngleDelta(nextPointerAngle, dragState.lastPointerAngle);
      dragState.lastPointerAngle = nextPointerAngle;
      dragState.totalDelta += pointerDelta * PRESSURE_ZERO_DRAG_DIRECTION;
      const requestedKnobAngle = dragState.startKnobAngle + dragState.totalDelta;
      const nextKnobAngle = clampPressureZeroSceneKnobAngle(requestedKnobAngle);
      const incrementalDelta = nextKnobAngle - dragState.lastAppliedKnobAngle;
      if (Math.abs(incrementalDelta) < 0.15) return;
      dragState.lastAppliedKnobAngle = nextKnobAngle;
      props.onPressureZeroCoarseAdjust(incrementalDelta);
    };
    const handlePointerUp = () => {
      try {
        gl.domElement.releasePointerCapture?.(pointerId);
      } catch {
        // Matching guard for synthetic pointer events.
      }
      gl.domElement.style.cursor = props.hoveredControl === 'pressureZero' && props.pressureZeroInteractionEnabled ? 'grab' : '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  }, [getPressureZeroPointerAngle, gl, props, resolveUltraPanelPointerControl]);

  const handleUltraControlWheel = useCallback((control: UltraPointerControl, event: ThreeEvent<WheelEvent>) => {
    const resolvedControl = resolveUltraPanelPointerControl(control, event.clientX, event.clientY);
    if (resolvedControl !== 'pressureZero') return;
    absorbUltraPointerEvent(event);
    if (props.interactionLocked) {
      props.onLockedInteraction();
      return;
    }
    if (!props.pressureZeroInteractionEnabled) {
      return;
    }
    const requestedDelta = (event.deltaY < 0 ? PRESSURE_ZERO_FINE_ANGLE_STEP_DEG : -PRESSURE_ZERO_FINE_ANGLE_STEP_DEG)
      * PRESSURE_ZERO_DRAG_DIRECTION;
    const requestedKnobAngle = props.pressureZeroKnobAngle + requestedDelta;
    const nextKnobAngle = clampPressureZeroSceneKnobAngle(requestedKnobAngle);
    const boundedDelta = nextKnobAngle - props.pressureZeroKnobAngle;
    if (Math.abs(boundedDelta) < 0.01) return;
    props.onPressureZeroFineAdjust(boundedDelta);
  }, [props, resolveUltraPanelPointerControl]);

  const handleUltraControlPointerOver = useCallback((control: UltraPointerControl, event: ThreeEvent<PointerEvent>) => {
    const resolvedControl = resolveUltraPanelPointerControl(control, event.clientX, event.clientY);
    gl.domElement.style.cursor = resolvedControl === 'pressureZero' && props.pressureZeroInteractionEnabled ? 'grab' : 'pointer';
    props.setHoveredControl(resolvedControl);
    if (resolvedControl === 'stopcock' || resolvedControl === 'pumpValve') {
      openUltraValveFocusBubble(resolvedControl);
    }
  }, [gl, openUltraValveFocusBubble, props, resolveUltraPanelPointerControl]);

  const handleUltraControlPointerMove = useCallback((control: UltraPointerControl, event: ThreeEvent<PointerEvent>) => {
    const resolvedControl = resolveUltraPanelPointerControl(control, event.clientX, event.clientY);
    gl.domElement.style.cursor = resolvedControl === 'pressureZero' && props.pressureZeroInteractionEnabled ? 'grab' : 'pointer';
    if (props.hoveredControl !== resolvedControl) {
      props.setHoveredControl(resolvedControl);
      if (resolvedControl === 'stopcock' || resolvedControl === 'pumpValve') {
        openUltraValveFocusBubble(resolvedControl);
      }
    }
  }, [gl, openUltraValveFocusBubble, props, resolveUltraPanelPointerControl]);

  const handleUltraControlPointerOut = useCallback((_control: UltraPointerControl, _event: ThreeEvent<PointerEvent>) => {
    gl.domElement.style.cursor = '';
    props.setHoveredControl(null);
  }, [gl, props]);

  useEffect(() => () => {
    gl.domElement.style.cursor = '';
  }, [gl]);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 256;
    const texture = new THREE.CanvasTexture(canvas);
    texture.flipY = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    displayTextureRef.current = texture;
    return () => {
      texture.dispose();
      displayTextureRef.current = null;
    };
  }, []);

  useEffect(() => {
    const texture = displayTextureRef.current;
    const canvas = texture?.image as HTMLCanvasElement | undefined;
    const context = canvas?.getContext('2d');
    if (!texture || !canvas || !context) return;
    const ultraDisplayPowered = props.powerOn;
    const temperatureDisplay = ultraDisplayPowered ? formatAlignedSignalParts(props.temperatureSignalMv) : null;
    const pressureDisplay = ultraDisplayPowered ? formatAlignedSignalParts(props.pressureSignalMv) : null;
    const themeVisuals = ULTRA_THEME_VISUALS[props.sceneTheme];
    setUltraNodeTreeVisible(nodeMap, 'HSL_MainDisplay_NameplateLabelArt_PowerPreview', true);
    setUltraPoweredDisplayArtVisible(nodeMap, ultraDisplayPowered);
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = themeVisuals.displayScreen;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = ultraDisplayPowered ? themeVisuals.displayText : themeVisuals.displayScreen;
    context.shadowColor = ultraDisplayPowered ? themeVisuals.displayText : 'transparent';
    context.shadowBlur = ultraDisplayPowered ? 5 : 0;
    drawUltraAlignedSignal(context, temperatureDisplay, canvas.width, 82);
    drawUltraAlignedSignal(context, pressureDisplay, canvas.width, 176);
    context.shadowBlur = 0;
    texture.needsUpdate = true;
    invalidate();
  }, [nodeMap, props.powerOn, props.pressureSignalMv, props.sceneTheme, props.temperatureSignalMv, invalidate]);

  useEffect(() => {
    const texture = displayTextureRef.current;
    if (!texture) return;
    applyUltraDisplayTexture(nodeMap, texture);
    invalidate();
  }, [nodeMap, invalidate]);

  useEffect(() => {
    applyUltraThemeVisuals(nodeMap, baseTransforms, props.sceneTheme);
    ultraMaterialHighlightSnapshotsRef.current.clear();
    invalidate();
  }, [baseTransforms, invalidate, nodeMap, props.sceneTheme]);

  useEffect(() => {
    applyUltraControlMaterialHighlights(
      nodeMap,
      activeUltraMaterialControls,
      ultraMaterialHighlightSnapshotsRef.current,
    );
    invalidate();
  }, [activeUltraMaterialControls, invalidate, nodeMap]);

  useEffect(() => () => {
    ultraMaterialHighlightSnapshotsRef.current.forEach((snapshot, material) => {
      restoreUltraMaterialSnapshot(material, snapshot);
    });
    ultraMaterialHighlightSnapshotsRef.current.clear();
  }, []);

  useEffect(() => {
    invalidate();
  }, [invalidate, props.demoFocusControlId, props.demoFocusPulseActive, props.hoveredControl]);

  useEffect(() => {
    REQUIRED_ULTRA_NODE_NAMES.forEach((nodeName) => {
      if (!nodeMap.has(nodeName)) {
        console.warn(`Ultra GLB is missing required node: ${nodeName}`);
      }
    });
  }, [nodeMap]);

  useEffect(() => {
    const powerLed = nodeMap.get('FD_NCD_C_PowerIndicator_LED');
    powerLed?.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.color.set(props.powerOn ? '#31f59d' : '#0a3d28');
      material.emissive.set(props.powerOn ? '#31f59d' : '#000000');
      material.emissiveIntensity = props.powerOn ? 1.6 : 0;
    });
    const openPathGlow = nodeMap.get('HSL_Stopcock_OpenPath_Glow');
    const closedBlockerMark = nodeMap.get('HSL_Stopcock_ClosedBlocker_Mark');
    // The Ultra GLB plug artwork is authored opposite to the shared stopcock angle contract.
    const ultraStopcockConnected = !stopcockOpen;
    if (openPathGlow) openPathGlow.visible = ultraStopcockConnected;
    if (closedBlockerMark) closedBlockerMark.visible = !ultraStopcockConnected;
    invalidate();
  }, [invalidate, nodeMap, props.powerOn, stopcockOpen]);

  useEffect(() => {
    invalidate();
  }, [gaugeNeedleTargetRotation, invalidate]);

  useEffect(() => {
    const startedAt = window.performance.now();
    let frameId = 0;
    const keepControlMotionRendering = (timestamp: number) => {
      invalidate();
      if (timestamp - startedAt < ULTRA_CONTROL_MOTION_INVALIDATION_MS) {
        frameId = window.requestAnimationFrame(keepControlMotionRendering);
      }
    };
    frameId = window.requestAnimationFrame(keepControlMotionRendering);
    return () => window.cancelAnimationFrame(frameId);
  }, [
    invalidate,
    props.powerOn,
    props.pressureZeroKnobAngle,
    props.pumpPulseId,
    props.pumpValveOpen,
    props.stopcockAngleDeg,
  ]);

  useFrame((_, delta) => {
    const targetRotation = gaugeNeedleTargetRotation;
    const smoothing = 1 - Math.exp(-9 * delta);
    gaugeDisplayedRotationRef.current = clampSceneNumber(
      THREE.MathUtils.lerp(gaugeDisplayedRotationRef.current, targetRotation, smoothing),
      PRESSURE_GAUGE_MIN_ROTATION,
      PRESSURE_GAUGE_MAX_ROTATION,
    );
    const pressureNeedle = nodeMap.get('HSL_PressureGauge_NeedlePivot');
    if (pressureNeedle) {
      applyLocalAxisRotation(
        nodeMap,
        baseTransforms,
        'HSL_PressureGauge_NeedlePivot',
        new THREE.Vector3(0, 0, 1),
        modelPressureGaugeAngleToVisualAngle(gaugeDisplayedRotationRef.current),
      );
    }

    const stopcockTargetAngle = getUltraStopcockVisualAngleRad(props.stopcockAngleDeg);
    stopcockDisplayedAngleRef.current = dampUltraControlAngle(
      stopcockDisplayedAngleRef.current,
      stopcockTargetAngle,
      STOPCOCK_VISUAL_SMOOTHING_RATE,
      delta,
    );
    applyLocalAxisRotation(
      nodeMap,
      baseTransforms,
      'Stopcock_Pivot',
      new THREE.Vector3(1, 0, 0),
      stopcockDisplayedAngleRef.current,
    );

    const pumpValveTargetAngle = props.pumpValveOpen ? 0 : Math.PI / 2;
    pumpValveDisplayedAngleRef.current = dampUltraControlAngle(
      pumpValveDisplayedAngleRef.current,
      pumpValveTargetAngle,
      PUMP_VALVE_VISUAL_SMOOTHING_RATE,
      delta,
    );
    applyLocalAxisRotation(
      nodeMap,
      baseTransforms,
      'InletValue_Pivot',
      new THREE.Vector3(0, 1, 0),
      pumpValveDisplayedAngleRef.current,
    );

    const pressureZeroTargetAngle = THREE.MathUtils.degToRad(props.pressureZeroKnobAngle);
    pressureZeroDisplayedAngleRef.current = dampUltraControlAngle(
      pressureZeroDisplayedAngleRef.current,
      pressureZeroTargetAngle,
      PRESSURE_ZERO_VISUAL_SMOOTHING_RATE,
      delta,
    );
    applyLocalAxisRotation(
      nodeMap,
      baseTransforms,
      'FD_NCD_C_ZeroAdjustKnob',
      new THREE.Vector3(0, 1, 0),
      pressureZeroDisplayedAngleRef.current,
    );

    const powerSwitchTargetRotation = props.powerOn ? POWER_SWITCH_ON_ROTATION_RAD : POWER_SWITCH_OFF_ROTATION_RAD;
    powerSwitchDisplayedRotationRef.current = dampUltraControlAngle(
      powerSwitchDisplayedRotationRef.current,
      powerSwitchTargetRotation,
      POWER_SWITCH_VISUAL_SMOOTHING_RATE,
      delta,
    );
    const powerSwitch = nodeMap.get('FD_NCD_C_PowerSwitch_Button');
    const powerBase = baseTransforms.get('FD_NCD_C_PowerSwitch_Button');
    if (powerSwitch && powerBase) {
      powerSwitch.position.copy(powerBase.position);
      applyPowerSwitchVisualScale(nodeMap, baseTransforms);
    }
    applyLocalAxisRotationAroundPivot(
      nodeMap,
      baseTransforms,
      'FD_NCD_C_PowerSwitch_Button',
      new THREE.Vector3(1, 0, 0),
      POWER_SWITCH_PIVOT_OFFSET,
      powerSwitchDisplayedRotationRef.current,
    );

    if (props.pumpPulseId !== pumpPulseRef.current) {
      pumpPulseRef.current = props.pumpPulseId;
      pumpVisualWeightRef.current = 1;
    }
    if (props.pumpBulbState !== 'idle') {
      pumpVisualWeightRef.current = Math.max(props.pumpBulbState === 'compressing' ? 1 : 0.45, pumpVisualWeightRef.current);
    }
    pumpVisualWeightRef.current = Math.max(0, pumpVisualWeightRef.current - delta * 2.4);
    const pumpBulb = nodeMap.get('Pump_Bulb') as THREE.Mesh | undefined;
    if (pumpBulb?.morphTargetInfluences?.length) {
      pumpBulb.morphTargetInfluences[0] = pumpVisualWeightRef.current;
    }
    if (
      Math.abs(gaugeDisplayedRotationRef.current - targetRotation) > 0.001 ||
      Math.abs(stopcockDisplayedAngleRef.current - stopcockTargetAngle) > 0.002 ||
      Math.abs(pumpValveDisplayedAngleRef.current - pumpValveTargetAngle) > 0.002 ||
      Math.abs(pressureZeroDisplayedAngleRef.current - pressureZeroTargetAngle) > 0.002 ||
      Math.abs(powerSwitchDisplayedRotationRef.current - powerSwitchTargetRotation) > 0.002 ||
      pumpVisualWeightRef.current > 0
    ) {
      invalidate();
    }
  });

  return (
    <group name="HeatCapacityUltraInstrumentRuntime" ref={runtimeRootRef}>
      <primitive object={modelRoot} />
      {ULTRA_CONTROL_HITBOXES.map((definition) => (
      <UltraNodeHitbox
        key={definition.control}
        definition={definition}
        nodeMap={nodeMap}
        parentRef={runtimeRootRef}
        onClick={handleUltraControlClick}
        onDoubleClick={handleUltraControlDoubleClick}
        onPointerDown={handleUltraControlPointerDown}
        onWheel={handleUltraControlWheel}
        onPointerOver={handleUltraControlPointerOver}
        onPointerMove={handleUltraControlPointerMove}
        onPointerOut={handleUltraControlPointerOut}
      />
      ))}
      <UltraInstrumentFocusHitbox
        nodeMap={nodeMap}
        parentRef={runtimeRootRef}
        onDoubleClick={handleUltraInstrumentFocusDoubleClick}
      />
      <UltraPowerSwitchSkirtedRocker
        nodeMap={nodeMap}
        parentRef={runtimeRootRef}
        powerOn={props.powerOn}
        sceneTheme={props.sceneTheme}
        hovered={props.hoveredControl === 'powerSwitch'}
        focused={props.demoFocusPulseActive && props.demoFocusControlId === 'powerSwitch'}
      />
      {ultraVisualTargetModes.map(({ target, mode }) => (
        mode ? (
          <UltraNodeHalo
            key={target.id}
            target={target}
            mode={mode}
            nodeMap={nodeMap}
            parentRef={runtimeRootRef}
            effects={props.visualEffects}
            suspended={props.interactionQualityReduced}
          />
        ) : null
      ))}
      <HeatCapacityHardSphereLayer
        enabled={props.hardSphereViewEnabled}
        containerProfile="ultra-cylinder"
        motionMode="pump-only"
        powerOn={props.powerOn}
        temperatureMv={props.temperatureSignalMv}
        pressureMv={props.pressureSignalMv}
        pressureDeltaKPa={props.pressureDeltaKPa}
        gasAmountRatio={props.gasAmountRatio}
        gasTemperatureK={props.gasTemperatureK}
        ambientTemperatureK={props.ambientTemperatureK}
        phase={props.phase}
        releaseFlowActive={props.releaseFlowActive}
        releaseTimeline={props.releaseTimeline}
        stopcockFlowOpen={props.stopcockFlowOpen}
        glassStopcockOpen={getHeatCapacityStopcockState(props.stopcockAngleDeg) === 'open'}
        pumpValveOpen={props.pumpValveOpen}
        pumpBulbState={props.pumpBulbState}
        pumpFlowActive={props.pumpFlowActive}
        pumpFlowIntensity={props.pumpFlowIntensity}
        particleMultiplier={props.hardSphereParticleMultiplier}
        speedMultiplier={props.hardSphereSpeedMultiplier}
        visualResetKey={props.hardSphereVisualResetKey}
        sceneTheme={props.sceneTheme}
      />
    </group>
  );
}

useGLTF.preload(ULTRA_GLB_PATH);

export default HeatCapacityUltraInstrumentModel;
