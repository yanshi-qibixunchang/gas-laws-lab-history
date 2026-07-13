import type { AudioEngine } from '../../core/audioEngine.ts';
import type { ProceduralAudioVoiceHandle } from '../../core/audioTypes.ts';
import {
  getHeatCapacityReleaseLowpassHz,
  getHeatCapacityReleaseSoundIntensity,
} from './heatCapacityAudioPolicy.ts';

export const HEAT_CAPACITY_RELEASE_AUDIO_BASE_GAIN = 0.28;
export const HEAT_CAPACITY_RELEASE_AUDIO_WHITE_MIX = 0.5;
export const HEAT_CAPACITY_RELEASE_AUDIO_HIGHPASS_HZ = 450;
export const HEAT_CAPACITY_RELEASE_AUDIO_ATTACK_MS = 65;
export const HEAT_CAPACITY_RELEASE_AUDIO_STOP_FADE_MS = 15;
const HEAT_CAPACITY_RELEASE_AUDIO_UPDATE_MS = 30;
const HEAT_CAPACITY_RELEASE_NOISE_BUFFER_S = 1.5;

const createReleaseNoiseBuffers = (context: AudioContext) => {
  const frameCount = Math.max(1, Math.round(context.sampleRate * HEAT_CAPACITY_RELEASE_NOISE_BUFFER_S));
  const whiteBuffer = context.createBuffer(1, frameCount, context.sampleRate);
  const softBuffer = context.createBuffer(1, frameCount, context.sampleRate);
  const white = whiteBuffer.getChannelData(0);
  const soft = softBuffer.getChannelData(0);
  let smoothed = 0;
  for (let index = 0; index < frameCount; index += 1) {
    const sample = Math.random() * 2 - 1;
    smoothed = smoothed * 0.975 + sample * 0.16;
    white[index] = sample;
    soft[index] = Math.max(-1, Math.min(1, smoothed));
  }
  return { whiteBuffer, softBuffer };
};

export class HeatCapacityReleaseSound {
  private readonly engine: AudioEngine;
  private voice: ProceduralAudioVoiceHandle | null = null;
  private startPromise: Promise<void> | null = null;
  private desiredActive = false;
  private pressureDeltaKPa = 0;
  private apertureRatio = 1;
  private attackEndsAt = 0;
  private lowpass: BiquadFilterNode | null = null;

  constructor(engine: AudioEngine) {
    this.engine = engine;
  }

  start(pressureDeltaKPa: number, apertureRatio = 1) {
    this.desiredActive = true;
    this.pressureDeltaKPa = pressureDeltaKPa;
    this.apertureRatio = apertureRatio;
    if (this.voice && !this.voice.stopped) {
      this.update(pressureDeltaKPa, apertureRatio);
      return;
    }
    if (this.startPromise) return;
    this.startPromise = this.startInternal().finally(() => {
      this.startPromise = null;
    });
  }

  private async startInternal() {
    const voice = await this.engine.createProceduralVoice({
      bus: 'experiment',
      gain: 0,
      voiceGroup: 'heatCapacity.release.flow',
      replaceGroup: true,
      crossfadeMs: HEAT_CAPACITY_RELEASE_AUDIO_STOP_FADE_MS,
    });
    if (!voice) return;
    if (!this.desiredActive) {
      voice.stop(HEAT_CAPACITY_RELEASE_AUDIO_STOP_FADE_MS);
      return;
    }

    const context = voice.context;
    const { whiteBuffer, softBuffer } = createReleaseNoiseBuffers(context);
    const whiteSource = context.createBufferSource();
    const softSource = context.createBufferSource();
    const whiteGain = context.createGain();
    const softGain = context.createGain();
    const highpass = context.createBiquadFilter();
    const lowpass = context.createBiquadFilter();

    whiteSource.buffer = whiteBuffer;
    softSource.buffer = softBuffer;
    whiteSource.loop = true;
    softSource.loop = true;
    whiteGain.gain.value = HEAT_CAPACITY_RELEASE_AUDIO_WHITE_MIX;
    softGain.gain.value = 1 - HEAT_CAPACITY_RELEASE_AUDIO_WHITE_MIX;
    highpass.type = 'highpass';
    highpass.frequency.value = HEAT_CAPACITY_RELEASE_AUDIO_HIGHPASS_HZ;
    highpass.Q.value = 0.6;
    lowpass.type = 'lowpass';
    lowpass.frequency.value = getHeatCapacityReleaseLowpassHz(this.pressureDeltaKPa);
    lowpass.Q.value = 0.72;

    whiteSource.connect(whiteGain);
    softSource.connect(softGain);
    whiteGain.connect(highpass);
    softGain.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(voice.output);

    for (const node of [whiteGain, softGain, highpass, lowpass]) voice.trackNode(node);
    voice.trackSource(whiteSource);
    voice.trackSource(softSource);
    whiteSource.start();
    softSource.start();

    this.voice = voice;
    this.lowpass = lowpass;
    const now = context.currentTime;
    this.attackEndsAt = now + HEAT_CAPACITY_RELEASE_AUDIO_ATTACK_MS / 1000;
    voice.output.gain.cancelScheduledValues(now);
    voice.output.gain.setValueAtTime(0, now);
    voice.output.gain.linearRampToValueAtTime(
      HEAT_CAPACITY_RELEASE_AUDIO_BASE_GAIN * getHeatCapacityReleaseSoundIntensity(
        this.pressureDeltaKPa,
        this.apertureRatio,
      ),
      this.attackEndsAt,
    );
    this.updateFilter(lowpass, this.pressureDeltaKPa, 0);
  }

  private updateFilter(lowpass: BiquadFilterNode, pressureDeltaKPa: number, rampMs: number) {
    const now = lowpass.context.currentTime;
    lowpass.frequency.cancelAndHoldAtTime(now);
    lowpass.frequency.linearRampToValueAtTime(
      getHeatCapacityReleaseLowpassHz(pressureDeltaKPa),
      now + Math.max(0, rampMs) / 1000,
    );
  }

  update(pressureDeltaKPa: number, apertureRatio = 1) {
    this.pressureDeltaKPa = pressureDeltaKPa;
    this.apertureRatio = apertureRatio;
    const voice = this.voice;
    if (!voice || voice.stopped) return;
    const context = voice.context;
    const now = context.currentTime;
    const targetGain = HEAT_CAPACITY_RELEASE_AUDIO_BASE_GAIN * getHeatCapacityReleaseSoundIntensity(
      pressureDeltaKPa,
      apertureRatio,
    );
    const targetAt = Math.max(this.attackEndsAt, now + HEAT_CAPACITY_RELEASE_AUDIO_UPDATE_MS / 1000);
    voice.output.gain.cancelAndHoldAtTime(now);
    voice.output.gain.linearRampToValueAtTime(targetGain, targetAt);
    if (this.lowpass) {
      this.updateFilter(this.lowpass, pressureDeltaKPa, HEAT_CAPACITY_RELEASE_AUDIO_UPDATE_MS);
    }
  }

  stop(fadeOutMs = HEAT_CAPACITY_RELEASE_AUDIO_STOP_FADE_MS) {
    this.desiredActive = false;
    const voice = this.voice;
    this.voice = null;
    this.lowpass = null;
    this.attackEndsAt = 0;
    voice?.stop(fadeOutMs);
  }

  dispose() {
    this.stop(HEAT_CAPACITY_RELEASE_AUDIO_STOP_FADE_MS);
  }
}
