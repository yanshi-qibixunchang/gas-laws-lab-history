import { AUDIO_MASTER_GAIN_RAMP_MS } from './audioSettings.ts';
import type { AudioBusId, AudioSettings } from './audioTypes.ts';

const BUS_IDS: readonly AudioBusId[] = ['ui', 'experiment', 'ambient'];

const setSmoothGain = (parameter: AudioParam, value: number, context: AudioContext, rampMs: number) => {
  const now = context.currentTime;
  parameter.cancelAndHoldAtTime(now);
  parameter.linearRampToValueAtTime(value, now + Math.max(0, rampMs) / 1000);
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
    return this.buses.get(busId) ?? this.buses.get('experiment')!;
  }

  applySettings(settings: AudioSettings, rampMs = AUDIO_MASTER_GAIN_RAMP_MS) {
    setSmoothGain(
      this.masterGain.gain,
      settings.enabled ? settings.volume : 0,
      this.context,
      rampMs,
    );
  }

  destroy() {
    for (const bus of this.buses.values()) bus.disconnect();
    this.buses.clear();
    this.masterGain.disconnect();
    this.limiter.disconnect();
  }
}
