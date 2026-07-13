export type AudioBusId = 'ui' | 'experiment' | 'ambient';

export interface AudioSettings {
  enabled: boolean;
  volume: number;
}

export interface AudioAssetDefinition {
  id: string;
  files: readonly string[];
  bus: AudioBusId;
  gain: number;
  voiceGroup?: string;
  avoidImmediateRepeat?: boolean;
}

export type AudioAssetCatalog = Readonly<Record<string, AudioAssetDefinition>>;

interface AudioPlaybackOptions {
  gain?: number;
  playbackRate?: number;
  fileIndex?: number;
  replaceGroup?: boolean;
  crossfadeMs?: number;
  fadeInMs?: number;
  startDelayMs?: number;
  maxStartDelayMs?: number;
}

export interface PlayOneShotOptions extends AudioPlaybackOptions {
  durationMs?: number;
  fadeOutMs?: number;
}

export interface PlayBurstOptions extends AudioPlaybackOptions {
  count: number;
  intervalMs: number;
  itemDurationMs?: number;
  itemFadeInMs?: number;
  itemFadeOutMs?: number;
}

export interface ProceduralVoiceOptions {
  bus: AudioBusId;
  gain?: number;
  voiceGroup?: string;
  replaceGroup?: boolean;
  crossfadeMs?: number;
}

export interface AudioVoiceHandle {
  readonly id: number;
  readonly stopped: boolean;
  stop: (fadeOutMs?: number) => void;
}

export interface ProceduralAudioVoiceHandle extends AudioVoiceHandle {
  readonly context: AudioContext;
  readonly output: GainNode;
  trackNode: (node: AudioNode) => void;
  trackSource: (source: AudioScheduledSourceNode) => void;
}
