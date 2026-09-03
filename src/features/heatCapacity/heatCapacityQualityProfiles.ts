export type HeatCapacityQualityMode = 'lowLoad' | 'balanced' | 'highPerformance' | 'ultra';
export type HeatCapacityRenderModel = 'procedural' | 'ultraGlb';
export type HeatCapacityFrameLoop = 'demand' | 'always';

export type HeatCapacityQualityProfile = {
  renderModel: HeatCapacityRenderModel;
  dpr: number;
  frameLoop: HeatCapacityFrameLoop;
  reduceInteractionQuality: boolean;
  highClarityProcedural: boolean;
  panelTextUpdateIntervalMs: number;
  panelTextDraggingUpdateIntervalMs: number;
  particleMultiplier: number;
  speedMultiplier: number;
  tickIntervalMs: number;
  enhancedLighting: boolean;
};

export const HEAT_CAPACITY_QUALITY_MODE_ORDER: HeatCapacityQualityMode[] = ['lowLoad', 'balanced', 'highPerformance', 'ultra'];
export const DEFAULT_HEAT_CAPACITY_QUALITY_MODE: HeatCapacityQualityMode = 'highPerformance';

export const HEAT_CAPACITY_QUALITY_PROFILES: Record<HeatCapacityQualityMode, HeatCapacityQualityProfile> = {
  lowLoad: {
    renderModel: 'procedural',
    dpr: 1,
    frameLoop: 'demand',
    reduceInteractionQuality: true,
    highClarityProcedural: false,
    panelTextUpdateIntervalMs: 250,
    panelTextDraggingUpdateIntervalMs: 400,
    particleMultiplier: 0.5,
    speedMultiplier: 0.8125,
    tickIntervalMs: 240,
    enhancedLighting: false,
  },
  balanced: {
    renderModel: 'procedural',
    dpr: 2.5,
    frameLoop: 'demand',
    reduceInteractionQuality: false,
    highClarityProcedural: true,
    panelTextUpdateIntervalMs: 120,
    panelTextDraggingUpdateIntervalMs: 400,
    particleMultiplier: 1,
    speedMultiplier: 1.1875,
    tickIntervalMs: 100,
    enhancedLighting: false,
  },
  highPerformance: {
    renderModel: 'ultraGlb',
    dpr: 1.75,
    frameLoop: 'demand',
    reduceInteractionQuality: false,
    highClarityProcedural: false,
    panelTextUpdateIntervalMs: 250,
    panelTextDraggingUpdateIntervalMs: 400,
    particleMultiplier: 1.25,
    speedMultiplier: 1.25,
    tickIntervalMs: 100,
    enhancedLighting: false,
  },
  ultra: {
    renderModel: 'ultraGlb',
    dpr: 2,
    frameLoop: 'demand',
    reduceInteractionQuality: false,
    highClarityProcedural: false,
    panelTextUpdateIntervalMs: 120,
    panelTextDraggingUpdateIntervalMs: 240,
    enhancedLighting: true,
    particleMultiplier: 1.25,
    speedMultiplier: 1.25,
    tickIntervalMs: 100,
  },
};
