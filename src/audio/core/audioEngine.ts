import { AudioBusGraph } from './audioBus.ts';
import {
  AUDIO_MASTER_GAIN_RAMP_MS,
  normalizeAudioSettings,
} from './audioSettings.ts';
import type {
  AudioAssetCatalog,
  AudioAssetDefinition,
  AudioSettings,
  AudioVoiceHandle,
  PlayBurstOptions,
  PlayOneShotOptions,
  ProceduralAudioVoiceHandle,
  ProceduralVoiceOptions,
} from './audioTypes.ts';

interface InternalVoice {
  id: number;
  group: string | null;
  output: GainNode;
  nodes: Set<AudioNode>;
  sources: Set<AudioScheduledSourceNode>;
  startedAt: number;
  stopped: boolean;
}

const MAX_ACTIVE_AUDIO_VOICES = 24;

const getClockMs = () => (
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
);

const safeStopSource = (source: AudioScheduledSourceNode, atTime: number) => {
  try {
    source.stop(atTime);
  } catch {
    // A source can already have ended while a crossfade is being scheduled.
  }
};

export class AudioEngine {
  private readonly catalog: AudioAssetCatalog;
  private context: AudioContext | null = null;
  private busGraph: AudioBusGraph | null = null;
  private settings: AudioSettings;
  private readonly rawAudioPromises = new Map<string, Promise<ArrayBuffer>>();
  private readonly decodedAudioPromises = new Map<string, Promise<AudioBuffer>>();
  private readonly activeVoices = new Map<number, InternalVoice>();
  private readonly groupVoices = new Map<string, Set<number>>();
  private readonly lastSelectedFileByAssetId = new Map<string, string>();
  private nextVoiceId = 1;
  private destroyed = false;

  constructor(
    catalog: AudioAssetCatalog,
    initialSettings: AudioSettings,
  ) {
    this.catalog = catalog;
    this.settings = normalizeAudioSettings(initialSettings);
  }

  getSettings() {
    return this.settings;
  }

  setSettings(settings: AudioSettings) {
    const previous = this.settings;
    this.settings = normalizeAudioSettings(settings);
    this.busGraph?.applySettings(this.settings);
    if (previous.enabled && !this.settings.enabled) {
      this.stopAll(AUDIO_MASTER_GAIN_RAMP_MS);
    }
  }

  private ensureContext() {
    if (this.destroyed || typeof window === 'undefined') return null;
    if (this.context) return this.context;
    const context = new AudioContext({ latencyHint: 'interactive' });
    this.context = context;
    this.busGraph = new AudioBusGraph(context, this.settings);
    return context;
  }

  async unlock() {
    const context = this.ensureContext();
    if (!context) return false;
    try {
      if (context.state === 'suspended') await context.resume();
      if (context.state === 'running') {
        void this.decodePreloadedAudio();
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  private loadRawAudio(file: string) {
    const existing = this.rawAudioPromises.get(file);
    if (existing) return existing;
    const request = fetch(file).then(async (response) => {
      if (!response.ok) throw new Error(`Audio asset request failed (${response.status}): ${file}`);
      return response.arrayBuffer();
    });
    this.rawAudioPromises.set(file, request);
    request.catch(() => this.rawAudioPromises.delete(file));
    return request;
  }

  private decodeAudio(file: string) {
    const existing = this.decodedAudioPromises.get(file);
    if (existing) return existing;
    const context = this.ensureContext();
    if (!context) return Promise.reject(new Error('AudioContext is unavailable.'));
    const decode = this.loadRawAudio(file)
      .then((rawAudio) => context.decodeAudioData(rawAudio.slice(0)));
    this.decodedAudioPromises.set(file, decode);
    decode.catch(() => this.decodedAudioPromises.delete(file));
    return decode;
  }

  private async decodePreloadedAudio() {
    if (!this.context) return;
    await Promise.allSettled([...this.rawAudioPromises.keys()].map((file) => this.decodeAudio(file)));
  }

  async preload(assetIds: readonly string[] = Object.keys(this.catalog)) {
    const files = assetIds.flatMap((assetId) => this.catalog[assetId]?.files ?? []);
    await Promise.allSettled([...new Set(files)].map((file) => this.loadRawAudio(file)));
    if (this.context) await this.decodePreloadedAudio();
  }

  private registerVoice(voice: InternalVoice) {
    this.activeVoices.set(voice.id, voice);
    if (voice.group) {
      const group = this.groupVoices.get(voice.group) ?? new Set<number>();
      group.add(voice.id);
      this.groupVoices.set(voice.group, group);
    }

    if (this.activeVoices.size > MAX_ACTIVE_AUDIO_VOICES) {
      const oldest = [...this.activeVoices.values()]
        .filter((candidate) => candidate.id !== voice.id)
        .sort((left, right) => left.startedAt - right.startedAt)[0];
      if (oldest) this.stopVoice(oldest, 8);
    }
  }

  private unregisterVoice(voice: InternalVoice) {
    this.activeVoices.delete(voice.id);
    if (!voice.group) return;
    const group = this.groupVoices.get(voice.group);
    group?.delete(voice.id);
    if (group?.size === 0) this.groupVoices.delete(voice.group);
  }

  private stopGroup(group: string, fadeOutMs: number) {
    const voiceIds = [...(this.groupVoices.get(group) ?? [])];
    for (const voiceId of voiceIds) {
      const voice = this.activeVoices.get(voiceId);
      if (voice) this.stopVoice(voice, fadeOutMs);
    }
  }

  private stopVoice(voice: InternalVoice, fadeOutMs = 0) {
    if (voice.stopped) return;
    voice.stopped = true;
    this.unregisterVoice(voice);
    const context = this.context;
    if (!context) return;
    const now = context.currentTime;
    const stopAt = now + Math.max(0, fadeOutMs) / 1000;
    voice.output.gain.cancelAndHoldAtTime(now);
    if (fadeOutMs > 0) voice.output.gain.linearRampToValueAtTime(0, stopAt);
    else voice.output.gain.setValueAtTime(0, now);
    for (const source of voice.sources) safeStopSource(source, stopAt + 0.005);
    window.setTimeout(() => {
      for (const node of voice.nodes) {
        try {
          node.disconnect();
        } catch {
          // Disconnect is idempotent for our purposes.
        }
      }
      voice.nodes.clear();
      voice.sources.clear();
    }, Math.max(0, fadeOutMs) + 30);
  }

  private createHandle(voice: InternalVoice): AudioVoiceHandle {
    return {
      id: voice.id,
      get stopped() {
        return voice.stopped;
      },
      stop: (fadeOutMs = 0) => this.stopVoice(voice, fadeOutMs),
    };
  }

  private selectFile(assetId: string, definition: AudioAssetDefinition, requestedFileIndex?: number) {
    if (requestedFileIndex !== undefined && Number.isFinite(requestedFileIndex)) {
      const normalizedIndex = (
        (Math.trunc(requestedFileIndex) % definition.files.length) + definition.files.length
      ) % definition.files.length;
      const requestedFile = definition.files[normalizedIndex];
      if (requestedFile) this.lastSelectedFileByAssetId.set(assetId, requestedFile);
      return requestedFile;
    }
    if (definition.files.length <= 1) return definition.files[0];
    const previousFile = this.lastSelectedFileByAssetId.get(assetId);
    const selectableFiles = definition.avoidImmediateRepeat && previousFile
      ? definition.files.filter((file) => file !== previousFile)
      : definition.files;
    const files = selectableFiles.length > 0 ? selectableFiles : definition.files;
    const selectedFile = files[Math.floor(Math.random() * files.length)];
    if (selectedFile) this.lastSelectedFileByAssetId.set(assetId, selectedFile);
    return selectedFile;
  }

  async playOneShot(assetId: string, options: PlayOneShotOptions = {}) {
    if (!this.settings.enabled || this.destroyed) return null;
    const definition = this.catalog[assetId];
    if (!definition) {
      console.warn(`[AudioEngine] Unknown audio asset: ${assetId}`);
      return null;
    }
    const file = this.selectFile(assetId, definition, options.fileIndex);
    if (!file) return null;
    const requestedAtMs = getClockMs();
    const unlocked = await this.unlock();
    if (!unlocked || !this.settings.enabled || this.destroyed) return null;

    let buffer: AudioBuffer;
    try {
      buffer = await this.decodeAudio(file);
    } catch (error) {
      console.warn(`[AudioEngine] Could not decode ${assetId}.`, error);
      return null;
    }
    if (
      options.maxStartDelayMs !== undefined &&
      getClockMs() - requestedAtMs > Math.max(0, options.maxStartDelayMs)
    ) {
      return null;
    }
    if (!this.settings.enabled || this.destroyed || !this.context || !this.busGraph) return null;

    const group = definition.voiceGroup ?? null;
    if (group && options.replaceGroup) this.stopGroup(group, options.crossfadeMs ?? 15);

    const source = this.context.createBufferSource();
    const output = this.context.createGain();
    const startAt = this.context.currentTime + Math.max(0, options.startDelayMs ?? 0) / 1000;
    const targetGain = Math.max(0, definition.gain * (options.gain ?? 1));
    const durationMs = options.durationMs !== undefined && Number.isFinite(options.durationMs)
      ? Math.max(1, options.durationMs)
      : null;
    const fadeOutMs = durationMs === null
      ? 0
      : Math.min(durationMs, Math.max(0, options.fadeOutMs ?? 0));
    const fadeInMs = Math.min(
      Math.max(0, options.fadeInMs ?? 0),
      durationMs === null ? Number.POSITIVE_INFINITY : Math.max(0, durationMs - fadeOutMs),
    );
    source.buffer = buffer;
    source.playbackRate.value = Math.min(4, Math.max(0.25, options.playbackRate ?? 1));
    if (fadeInMs > 0) {
      output.gain.setValueAtTime(0, startAt);
      output.gain.linearRampToValueAtTime(targetGain, startAt + fadeInMs / 1000);
    } else {
      output.gain.setValueAtTime(targetGain, startAt);
    }
    if (durationMs !== null && fadeOutMs > 0) {
      const endAt = startAt + durationMs / 1000;
      const fadeOutAt = endAt - fadeOutMs / 1000;
      output.gain.setValueAtTime(targetGain, Math.max(startAt + fadeInMs / 1000, fadeOutAt));
      output.gain.linearRampToValueAtTime(0, endAt);
    }
    source.connect(output);
    output.connect(this.busGraph.getInput(definition.bus));

    const voice: InternalVoice = {
      id: this.nextVoiceId++,
      group,
      output,
      nodes: new Set<AudioNode>([source, output]),
      sources: new Set<AudioScheduledSourceNode>([source]),
      startedAt: getClockMs(),
      stopped: false,
    };
    source.onended = () => {
      if (!voice.stopped) {
        voice.stopped = true;
        this.unregisterVoice(voice);
      }
      for (const node of voice.nodes) {
        try {
          node.disconnect();
        } catch {
          // The node may already have been disconnected by a crossfade.
        }
      }
      voice.nodes.clear();
      voice.sources.clear();
    };
    this.registerVoice(voice);
    source.start(startAt);
    if (durationMs !== null) source.stop(startAt + durationMs / 1000 + 0.005);
    return this.createHandle(voice);
  }

  async playBurst(assetId: string, options: PlayBurstOptions) {
    if (!this.settings.enabled || this.destroyed) return null;
    const definition = this.catalog[assetId];
    if (!definition) {
      console.warn(`[AudioEngine] Unknown audio asset: ${assetId}`);
      return null;
    }
    const count = Math.max(0, Math.floor(options.count));
    if (count === 0) return null;
    const file = this.selectFile(assetId, definition, options.fileIndex);
    if (!file) return null;
    const requestedAtMs = getClockMs();
    const unlocked = await this.unlock();
    if (!unlocked || !this.settings.enabled || this.destroyed) return null;

    let buffer: AudioBuffer;
    try {
      buffer = await this.decodeAudio(file);
    } catch (error) {
      console.warn(`[AudioEngine] Could not decode ${assetId}.`, error);
      return null;
    }
    if (
      options.maxStartDelayMs !== undefined &&
      getClockMs() - requestedAtMs > Math.max(0, options.maxStartDelayMs)
    ) {
      return null;
    }
    if (!this.settings.enabled || this.destroyed || !this.context || !this.busGraph) return null;

    const group = definition.voiceGroup ?? null;
    if (group && options.replaceGroup) this.stopGroup(group, options.crossfadeMs ?? 15);

    const output = this.context.createGain();
    const sources = new Set<AudioScheduledSourceNode>();
    const nodes = new Set<AudioNode>([output]);
    const startAt = this.context.currentTime + Math.max(0, options.startDelayMs ?? 0) / 1000;
    const targetGain = Math.max(0, definition.gain * (options.gain ?? 1));
    if ((options.fadeInMs ?? 0) > 0) {
      output.gain.setValueAtTime(0, startAt);
      output.gain.linearRampToValueAtTime(targetGain, startAt + Math.max(0, options.fadeInMs ?? 0) / 1000);
    } else {
      output.gain.setValueAtTime(targetGain, startAt);
    }
    output.connect(this.busGraph.getInput(definition.bus));

    const voice: InternalVoice = {
      id: this.nextVoiceId++,
      group,
      output,
      nodes,
      sources,
      startedAt: getClockMs(),
      stopped: false,
    };
    let remainingSources = count;
    const finishSource = (source: AudioBufferSourceNode, itemGain: GainNode | null) => {
      try {
        source.disconnect();
        itemGain?.disconnect();
      } catch {
        // A stopped burst can already have disconnected its per-item nodes.
      }
      sources.delete(source);
      nodes.delete(source);
      if (itemGain) nodes.delete(itemGain);
      remainingSources -= 1;
      if (remainingSources > 0 || voice.stopped) return;
      voice.stopped = true;
      this.unregisterVoice(voice);
      output.disconnect();
      nodes.clear();
    };
    const playbackRate = Math.min(4, Math.max(0.25, options.playbackRate ?? 1));
    const intervalS = Math.max(0, options.intervalMs) / 1000;
    for (let index = 0; index < count; index += 1) {
      const source = this.context.createBufferSource();
      const itemGain = options.itemDurationMs === undefined ? null : this.context.createGain();
      const itemStartAt = startAt + index * intervalS;
      source.buffer = buffer;
      source.playbackRate.value = playbackRate;
      source.onended = () => finishSource(source, itemGain);
      if (itemGain) {
        const durationMs = Math.max(1, options.itemDurationMs ?? 1);
        const fadeInMs = Math.min(durationMs, Math.max(0, options.itemFadeInMs ?? 0));
        const fadeOutMs = Math.min(durationMs - fadeInMs, Math.max(0, options.itemFadeOutMs ?? 0));
        const fadeInEndAt = itemStartAt + fadeInMs / 1000;
        const itemEndAt = itemStartAt + durationMs / 1000;
        const fadeOutStartAt = itemEndAt - fadeOutMs / 1000;
        itemGain.gain.setValueAtTime(fadeInMs > 0 ? 0 : 1, itemStartAt);
        if (fadeInMs > 0) itemGain.gain.linearRampToValueAtTime(1, fadeInEndAt);
        itemGain.gain.setValueAtTime(1, Math.max(fadeInEndAt, fadeOutStartAt));
        if (fadeOutMs > 0) itemGain.gain.linearRampToValueAtTime(0, itemEndAt);
        source.connect(itemGain);
        itemGain.connect(output);
        nodes.add(itemGain);
        source.start(itemStartAt);
        source.stop(itemEndAt + 0.005);
      } else {
        source.connect(output);
        source.start(itemStartAt);
      }
      sources.add(source);
      nodes.add(source);
    }
    this.registerVoice(voice);
    return this.createHandle(voice);
  }

  async createProceduralVoice(options: ProceduralVoiceOptions): Promise<ProceduralAudioVoiceHandle | null> {
    if (!this.settings.enabled || this.destroyed) return null;
    const unlocked = await this.unlock();
    if (!unlocked || !this.settings.enabled || !this.context || !this.busGraph || this.destroyed) return null;

    const group = options.voiceGroup ?? null;
    if (group && options.replaceGroup) this.stopGroup(group, options.crossfadeMs ?? 15);

    const output = this.context.createGain();
    output.gain.value = Math.max(0, options.gain ?? 1);
    output.connect(this.busGraph.getInput(options.bus));
    const voice: InternalVoice = {
      id: this.nextVoiceId++,
      group,
      output,
      nodes: new Set<AudioNode>([output]),
      sources: new Set<AudioScheduledSourceNode>(),
      startedAt: getClockMs(),
      stopped: false,
    };
    this.registerVoice(voice);
    return {
      id: voice.id,
      get stopped() {
        return voice.stopped;
      },
      stop: (fadeOutMs = 0) => this.stopVoice(voice, fadeOutMs),
      context: this.context,
      output,
      trackNode: (node) => voice.nodes.add(node),
      trackSource: (source) => {
        voice.nodes.add(source);
        voice.sources.add(source);
      },
    };
  }

  stopAll(fadeOutMs = 0) {
    for (const voice of [...this.activeVoices.values()]) this.stopVoice(voice, fadeOutMs);
  }

  async destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopAll(0);
    this.rawAudioPromises.clear();
    this.decodedAudioPromises.clear();
    this.lastSelectedFileByAssetId.clear();
    this.busGraph?.destroy();
    this.busGraph = null;
    const context = this.context;
    this.context = null;
    if (context && context.state !== 'closed') {
      try {
        await context.close();
      } catch {
        // Closing an AudioContext must not block application teardown.
      }
    }
  }
}
