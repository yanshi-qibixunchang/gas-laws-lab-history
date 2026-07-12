import type { AudioAssetCatalog } from '../core/audioTypes.ts';
import { heatCapacityAudioCatalog } from '../experiments/heatCapacity/heatCapacityAudioCatalog.ts';

export const audioCatalog = {
  ...heatCapacityAudioCatalog,
} as const satisfies AudioAssetCatalog;

export type AudioAssetId = keyof typeof audioCatalog;
