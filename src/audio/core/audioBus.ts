import { AUDIO_MASTER_GAIN_RAMP_MS } from './audioSettings.ts';
import type { AudioBusId, AudioSettings } from './audioTypes.ts';

const BUS_IDS: readonly AudioBusId[] = ['ui', 'experiment', 'ambient'];

export const setSmoothAudioParam = (
  parameter: AudioParam,
  value: number,
  context: BaseAudioContext,
  rampMs: number,
) => {
  const now = context.currentTime;
  const targetAt = now + Math.max(0, rampMs) / 1000;
  try {
    parameter.cancelAndHoldAtTime(now);
    parameter.linearRampToValueAtTime(value, targetAt);
    return true;
  } catch {
    // Older or recovering audio drivers may not support cancelAndHoldAtTime reliably.
  }
  try {
    parameter.cancelScheduledValues(now);
    parameter.setValueAtTime(parameter.value, now);
    parameter.linearRampToValueAtTime(value, targetAt);
    return true;
  } catch {
    // Fall through to the immediate AudioParam value setter.
  }
  try {
    parameter.value = value;
    return true;
  } catch {
    return false;
  }
};

export class AudioBusGraph {
  private readonly context: AudioContext;
  private readonly masterGain: GainNode;
  private readonly limiter: DynamicsCompressorNode;
  private readonly buses = new Map<AudioBusId, GainNode>();

  constructor(context: AudioContext, settings: AudioSettings) {
    this.context = context;
    this.masterGain = context.createGain();
    this.masterGain.gain.value = settings.enabled ? settings.volume : 0;

    this.limiter = context.createDynamicsCompressor();
    this.limiter.threshold.value = -6;
    this.limiter.knee.value = 4;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.16;

    for (const busId of BUS_IDS) {
      const gain = context.createGain();
      gain.gain.value = 1;
      gain.connect(this.masterGain);
      this.buses.set(busId, gain);
    }

    this.masterGain.connect(this.limiter);
    this.limiter.connect(context.destination);
  }

  getInput(busId: AudioBusId) {
    const input = this.buses.get(busId);
    if (!input) throw new Error(`Audio bus is not registered: ${busId}`);
    return input;
  }

  applySettings(settings: AudioSettings, rampMs = AUDIO_MASTER_GAIN_RAMP_MS) {
    return setSmoothAudioParam(
      this.masterGain.gain,
      settings.enabled ? settings.volume : 0,
      this.context,
      rampMs,
    );
  }

  destroy() {
    for (const bus of this.buses.values()) {
      try {
        bus.disconnect();
      } catch {
        // A browser audio driver may already have detached this node.
      }
    }
    this.buses.clear();
    try {
      this.masterGain.disconnect();
    } catch {
      // Teardown must continue to the limiter and AudioContext.
    }
    try {
      this.limiter.disconnect();
    } catch {
      // Teardown is best-effort after the graph has been detached from the engine.
    }
  }
}
