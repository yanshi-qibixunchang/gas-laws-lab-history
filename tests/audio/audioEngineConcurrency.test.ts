import assert from 'node:assert/strict';
import { AudioEngine } from '../../src/audio/core/audioEngine.ts';
import type { AudioAssetCatalog } from '../../src/audio/core/audioTypes.ts';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

type FakeSourceRecord = {
  buffer: AudioBuffer | null;
  startCalls: number;
  stopCalls: number;
  throwOnStart: boolean;
};

type AudioEngineInternals = {
  context: AudioContext | null;
  busGraph: { getInput: () => AudioNode; applySettings?: () => boolean; destroy?: () => void } | null;
  unlock: () => Promise<boolean>;
  decodeAudio: (file: string) => Promise<AudioBuffer>;
  activeVoices: Map<number, unknown>;
};

const createDeferred = <T>(): Deferred<T> => {
  let resolvePromise: ((value: T) => void) | null = null;
  let rejectPromise: ((reason: unknown) => void) | null = null;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return {
    promise,
    resolve: (value) => resolvePromise?.(value),
    reject: (reason) => rejectPromise?.(reason),
  };
};

const createAudioParam = () => ({
  value: 1,
  cancelAndHoldAtTime: () => undefined,
  cancelScheduledValues: () => undefined,
  setValueAtTime: () => undefined,
  linearRampToValueAtTime: () => undefined,
});

const createFakeAudioRuntime = (throwOnSourceIndex = -1) => {
  const sources: FakeSourceRecord[] = [];
  const input = {
    connect: () => input,
    disconnect: () => undefined,
  } as unknown as AudioNode;
  const context = {
    currentTime: 0,
    createGain: () => ({
      gain: createAudioParam(),
      connect: () => undefined,
      disconnect: () => undefined,
    } as unknown as GainNode),
    createBufferSource: () => {
      const record: FakeSourceRecord = {
        buffer: null,
        startCalls: 0,
        stopCalls: 0,
        throwOnStart: sources.length === throwOnSourceIndex,
      };
      const source = {
        get buffer() {
          return record.buffer;
        },
        set buffer(value: AudioBuffer | null) {
          record.buffer = value;
        },
        playbackRate: { value: 1 },
        onended: null,
        connect: () => undefined,
        disconnect: () => undefined,
        start: () => {
          record.startCalls += 1;
          if (record.throwOnStart) throw new Error('injected-source-start-failure');
        },
        stop: () => {
          record.stopCalls += 1;
        },
      } as unknown as AudioBufferSourceNode;
      sources.push(record);
      return source;
    },
  } as unknown as AudioContext;
  return { context, input, sources };
};

const catalog: AudioAssetCatalog = {
  'test.open': {
    id: 'test.open',
    files: ['open.wav'],
    bus: 'experiment',
    gain: 1,
    voiceGroup: 'test.valve',
  },
  'test.close': {
    id: 'test.close',
    files: ['close.wav'],
    bus: 'experiment',
    gain: 1,
    voiceGroup: 'test.valve',
  },
};

const originalWindow = globalThis.window;
const originalAudioContext = globalThis.AudioContext;
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    setTimeout: (callback: () => void) => {
      callback();
      return 1;
    },
  },
});

try {
  {
    const closeRejection = new Error('injected-close-rejection');
    const firstContext = {
      state: 'suspended',
      close: () => Promise.reject(closeRejection),
      createGain: () => {
        throw new Error('injected-bus-construction-failure');
      },
    } as unknown as AudioContext;
    const runtime = createFakeAudioRuntime();
    const compressorParam = { value: 0 };
    const secondContext = Object.assign(runtime.context, {
      state: 'running',
      destination: runtime.input,
      close: async () => undefined,
      resume: async () => undefined,
      createDynamicsCompressor: () => ({
        threshold: { ...compressorParam },
        knee: { ...compressorParam },
        ratio: { ...compressorParam },
        attack: { ...compressorParam },
        release: { ...compressorParam },
        connect: () => undefined,
        disconnect: () => undefined,
      } as unknown as DynamicsCompressorNode),
    });
    const contexts = [firstContext, secondContext];
    Object.defineProperty(globalThis, 'AudioContext', {
      configurable: true,
      value: class {
        constructor() {
          const context = contexts.shift();
          if (!context) throw new Error('unexpected AudioContext allocation');
          return context;
        }
      },
    });
    const unhandledRejections: unknown[] = [];
    const captureUnhandledRejection = (reason: unknown) => unhandledRejections.push(reason);
    process.on('unhandledRejection', captureUnhandledRejection);
    try {
      const engine = new AudioEngine(catalog, { enabled: true, volume: 1 });
      assert.equal(await engine.unlock(), false, 'a failed bus graph should reject only the current unlock');
      assert.equal(await engine.unlock(), true, 'the next unlock should allocate a clean context and recover');
      await new Promise<void>((resolve) => setImmediate(resolve));
      assert.deepEqual(unhandledRejections, [], 'a rejected cleanup close must be contained');
      assert.ok(
        await engine.createProceduralVoice({ bus: 'experiment' }),
        'the recovered bus graph should accept new voices',
      );
      engine.stopAll(0);
    } finally {
      process.off('unhandledRejection', captureUnhandledRejection);
    }
  }

  {
    const engine = new AudioEngine(catalog, { enabled: true, volume: 1 });
    const runtime = createFakeAudioRuntime();
    const openDecode = createDeferred<AudioBuffer>();
    const closeDecode = createDeferred<AudioBuffer>();
    const internals = engine as unknown as AudioEngineInternals;
    internals.context = runtime.context;
    internals.busGraph = { getInput: () => runtime.input };
    internals.unlock = async () => true;
    internals.decodeAudio = (file) => (
      file === 'open.wav' ? openDecode.promise : closeDecode.promise
    );

    const openPlayback = engine.playOneShot('test.open', { replaceGroup: true });
    const closePlayback = engine.playOneShot('test.close', { replaceGroup: true });
    await Promise.resolve();
    closeDecode.resolve({ id: 'close' } as unknown as AudioBuffer);
    const closeHandle = await closePlayback;
    openDecode.resolve({ id: 'open' } as unknown as AudioBuffer);
    const openHandle = await openPlayback;

    assert.ok(closeHandle, 'the latest same-group request should start');
    assert.equal(openHandle, null, 'an older decode that resolves later must remain cancelled');
    assert.equal(runtime.sources.length, 1, 'stale same-group work must not allocate a source');
    assert.equal(runtime.sources[0]?.startCalls, 1);
    assert.equal(runtime.sources[0]?.stopCalls, 0, 'stale work must not stop the latest voice');
    engine.stopAll(0);
  }

  {
    const engine = new AudioEngine(catalog, { enabled: true, volume: 1 });
    const runtime = createFakeAudioRuntime();
    const decode = createDeferred<AudioBuffer>();
    const internals = engine as unknown as AudioEngineInternals;
    internals.context = runtime.context;
    internals.busGraph = { getInput: () => runtime.input };
    internals.unlock = async () => true;
    internals.decodeAudio = () => decode.promise;

    const pendingPlayback = engine.playOneShot('test.open', { replaceGroup: true });
    await Promise.resolve();
    engine.stopAll(0);
    decode.resolve({ id: 'open' } as unknown as AudioBuffer);
    assert.equal(await pendingPlayback, null, 'teardown must invalidate pending decode work');
    assert.equal(runtime.sources.length, 0, 'teardown-cancelled work must not allocate a source');
  }

  for (const playbackKind of ['one-shot', 'burst'] as const) {
    const engine = new AudioEngine(catalog, { enabled: true, volume: 1 });
    const runtime = createFakeAudioRuntime();
    const decode = createDeferred<AudioBuffer>();
    const internals = engine as unknown as AudioEngineInternals;
    internals.context = runtime.context;
    internals.busGraph = { getInput: () => runtime.input };
    internals.unlock = async () => true;
    internals.decodeAudio = () => decode.promise;

    const pendingPlayback = playbackKind === 'one-shot'
      ? engine.playOneShot('test.open', { replaceGroup: true })
      : engine.playBurst('test.open', { count: 2, intervalMs: 10 });
    await Promise.resolve();
    engine.stopAll(0);
    decode.reject(new Error('injected-cancelled-decode-failure'));
    assert.equal(
      await pendingPlayback,
      null,
      `a cancelled ${playbackKind} decode failure must not escape into the current runtime`,
    );
    assert.equal(runtime.sources.length, 0, 'cancelled decode failures must not allocate a source');
  }

  {
    const engine = new AudioEngine(catalog, { enabled: true, volume: 1 });
    const runtime = createFakeAudioRuntime(1);
    const internals = engine as unknown as AudioEngineInternals;
    internals.context = runtime.context;
    internals.busGraph = { getInput: () => runtime.input };
    internals.unlock = async () => true;
    internals.decodeAudio = async () => ({ id: 'burst' } as unknown as AudioBuffer);

    await assert.rejects(
      engine.playBurst('test.open', { count: 3, intervalMs: 10 }),
      /Could not start test\.open burst/,
    );
    assert.equal(internals.activeVoices.size, 0, 'a partially scheduled burst must be unregistered');
    assert.equal(runtime.sources[0]?.startCalls, 1);
    assert.ok((runtime.sources[0]?.stopCalls ?? 0) > 0, 'already-started burst sources must be stopped');
  }

  for (const mutedSettings of [
    { enabled: false, volume: 1 },
    { enabled: true, volume: 0 },
  ]) {
    const engine = new AudioEngine(catalog, { enabled: true, volume: 1 });
    const runtime = createFakeAudioRuntime();
    const internals = engine as unknown as AudioEngineInternals;
    internals.context = runtime.context;
    internals.busGraph = {
      getInput: () => runtime.input,
      applySettings: () => {
        throw new Error('injected-audio-param-failure');
      },
    };
    internals.unlock = async () => true;
    const voice = await engine.createProceduralVoice({ bus: 'experiment' });
    assert.ok(voice);
    assert.equal(internals.activeVoices.size, 1);
    assert.equal(
      engine.setSettings(mutedSettings),
      false,
      'settings should report a rejected driver update without throwing',
    );
    assert.equal(internals.activeVoices.size, 0, 'mute and zero volume must stop active voices even after a driver error');
    assert.equal(
      await engine.createProceduralVoice({ bus: 'experiment' }),
      null,
      'mute and zero volume must block new procedural voices',
    );
  }

  {
    const engine = new AudioEngine(catalog, { enabled: true, volume: 1 });
    let closeCalls = 0;
    const internals = engine as unknown as AudioEngineInternals;
    internals.context = {
      state: 'running',
      close: async () => {
        closeCalls += 1;
      },
    } as unknown as AudioContext;
    internals.busGraph = {
      getInput: () => ({} as AudioNode),
      destroy: () => {
        throw new Error('injected-bus-destroy-failure');
      },
    };
    await engine.destroy();
    assert.equal(closeCalls, 1, 'AudioContext close must run even when graph teardown throws');
    assert.equal(internals.context, null, 'destroy should detach the AudioContext before fallible teardown');
    assert.equal(internals.busGraph, null, 'destroy should detach the bus graph before fallible teardown');
    await engine.destroy();
    assert.equal(closeCalls, 1, 'repeated destroy calls must remain idempotent');
  }
} finally {
  if (originalAudioContext === undefined) Reflect.deleteProperty(globalThis, 'AudioContext');
  else Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: originalAudioContext });
  if (originalWindow === undefined) Reflect.deleteProperty(globalThis, 'window');
  else Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
}

console.log('audioEngineConcurrency tests passed');
