import type { AudioAssetCatalog } from '../core/audioTypes.ts';
import { heatCapacityAudioCatalog } from '../experiments/heatCapacity/heatCapacityAudioCatalog.ts';
import { pistonOscillationAudioCatalog } from '../experiments/pistonOscillation/pistonOscillationAudioCatalog.ts';

export const audioCatalog = {
  ...heatCapacityAudioCatalog,
  ...pistonOscillationAudioCatalog,
} as const satisfies AudioAssetCatalog;

export type AudioAssetId = keyof typeof audioCatalog;
