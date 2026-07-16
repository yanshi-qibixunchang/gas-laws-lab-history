import assert from 'node:assert/strict';
import type { AudioEngine } from '../../src/audio/core/audioEngine.ts';
import type { ProceduralAudioVoiceHandle } from '../../src/audio/core/audioTypes.ts';
import { HeatCapacityReleaseSound } from '../../src/audio/experiments/heatCapacity/heatCapacityReleaseSound.ts';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

type FakeSourceRecord = {
  startCalls: number;
  stopCalls: number;
};

const createDeferred = <T>(): Deferred<T> => {
  let resolvePromise: ((value: T) => void) | null = null;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve: (value) => resolvePromise?.(value),
  };
};

const flushAsyncWork = async () => {
  await Promise.resolve();
  await new Promise<void>((resolve) => setImmediate(resolve));
};

const createFakeReleaseVoice = (throwOnSourceIndex = -1) => {
  const sourceRecords: FakeSourceRecord[] = [];
  const trackedSources: AudioScheduledSourceNode[] = [];
  const outputParamState = {
    throwOnCancelAndHold: false,
    throwOnFallback: false,
    fallbackCalls: 0,
  };
  const createAudioParam = (state?: typeof outputParamState) => {
    let value = 0;
    const parameter = {
      cancelAndHoldAtTime: () => {
        if (state?.throwOnCancelAndHold) throw new Error('injected-audio-param-update-failure');
      },
      cancelScheduledValues: () => {
        if (state) state.fallbackCalls += 1;
        if (state?.throwOnFallback) throw new Error('injected-audio-param-fallback-failure');
      },
      setValueAtTime: () => {
        if (state?.throwOnFallback) throw new Error('injected-audio-param-fallback-failure');
      },
      linearRampToValueAtTime: () => {
        if (state?.throwOnFallback) throw new Error('injected-audio-param-fallback-failure');
      },
    };
    Object.defineProperty(parameter, 'value', {
      get: () => value,
      set: (nextValue: number) => {
        if (state?.throwOnFallback) throw new Error('injected-audio-param-value-failure');
        value = nextValue;
      },
    });
    return parameter as unknown as AudioParam;
  };
  const context = {
    currentTime: 0,
    sampleRate: 8,
    createBuffer: (_channels: number, frameCount: number) => ({
      getChannelData: () => new Float32Array(frameCount),
    } as unknown as AudioBuffer),
    createBufferSource: () => {
      const sourceIndex = sourceRecords.length;
      const record: FakeSourceRecord = { startCalls: 0, stopCalls: 0 };
      sourceRecords.push(record);
      return {
        buffer: null,
        loop: false,
        connect: () => undefined,
        disconnect: () => undefined,
        start: () => {
          record.startCalls += 1;
          if (sourceIndex === throwOnSourceIndex) throw new Error('injected-release-source-start-failure');
        },
        stop: () => {
          record.stopCalls += 1;
        },
      } as unknown as AudioBufferSourceNode;
    },
    createGain: () => ({
      gain: createAudioParam(),
      connect: () => undefined,
      disconnect: () => undefined,
    } as unknown as GainNode),
    createBiquadFilter: () => ({
      context,
      type: 'lowpass',
      frequency: createAudioParam(),
      Q: createAudioParam(),
      connect: () => undefined,
      disconnect: () => undefined,
    } as unknown as BiquadFilterNode),
  } as unknown as AudioContext;
  const output = {
    gain: createAudioParam(outputParamState),
    connect: () => undefined,
    disconnect: () => undefined,
  } as unknown as GainNode;
  let stopped = false;
  let stopCalls = 0;
  const voice: ProceduralAudioVoiceHandle = {
    id: 1,
    context,
    output,
    get stopped() {
      return stopped;
    },
    trackNode: () => undefined,
    trackSource: (source) => trackedSources.push(source),
    stop: () => {
      stopCalls += 1;
      stopped = true;
      for (const source of trackedSources) {
        try {
          source.stop();
        } catch {
          // The fake mirrors the engine's idempotent source teardown.
        }
      }
    },
  };
  return {
    voice,
    sourceRecords,
    outputParamState,
    get stopCalls() {
      return stopCalls;
    },
  };
};

{
  const deferredVoice = createDeferred<ProceduralAudioVoiceHandle | null>();
  const runtime = createFakeReleaseVoice();
  const engine = {
    createProceduralVoice: () => deferredVoice.promise,
  } as unknown as AudioEngine;
  const sound = new HeatCapacityReleaseSound(engine);
  sound.start(12, 1);
  sound.stop(0);
  deferredVoice.resolve(runtime.voice);
  await flushAsyncWork();
  assert.equal(runtime.stopCalls, 1, 'stop-before-resolve must tear down the late procedural voice');
}

{
  const runtime = createFakeReleaseVoice(1);
  const errors: unknown[] = [];
  const engine = {
    createProceduralVoice: async () => runtime.voice,
  } as unknown as AudioEngine;
  const sound = new HeatCapacityReleaseSound(engine, (error) => errors.push(error));
  sound.start(12, 1);
  await flushAsyncWork();
  assert.equal(errors.length, 1);
  assert.equal(runtime.stopCalls, 1, 'partial source startup must stop its owning voice');
  assert.ok((runtime.sourceRecords[0]?.stopCalls ?? 0) > 0, 'the already-started noise source must be stopped');
}

{
  const runtime = createFakeReleaseVoice();
  const errors: unknown[] = [];
  const engine = {
    createProceduralVoice: async () => runtime.voice,
  } as unknown as AudioEngine;
  const sound = new HeatCapacityReleaseSound(engine, (error) => errors.push(error));
  sound.start(12, 1);
  await flushAsyncWork();
  runtime.outputParamState.fallbackCalls = 0;
  runtime.outputParamState.throwOnCancelAndHold = true;
  sound.update(8, 0.5);
  assert.equal(runtime.stopCalls, 0, 'cancelAndHoldAtTime incompatibility should use the safe AudioParam fallback');
  assert.equal(runtime.outputParamState.fallbackCalls, 1);
  assert.equal(errors.length, 0, 'a successful compatibility fallback must not disable release audio');
  runtime.outputParamState.throwOnFallback = true;
  sound.update(7, 0.4);
  assert.equal(runtime.stopCalls, 1, 'complete AudioParam automation failure must stop the active release voice');
  assert.equal(errors.length, 1, 'complete automation failure should emit one degradable audio diagnostic');
}

console.log('heatCapacityReleaseSound tests passed');
