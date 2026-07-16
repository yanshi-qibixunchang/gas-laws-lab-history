import assert from 'node:assert/strict';
import { AudioBusGraph } from '../../src/audio/core/audioBus.ts';

const createAudioParam = () => ({
  value: 0,
  cancelAndHoldAtTime: () => undefined,
  cancelScheduledValues: () => undefined,
  setValueAtTime: () => undefined,
  linearRampToValueAtTime: () => undefined,
} as unknown as AudioParam);

const createFakeBusRuntime = () => {
  const state = {
    rejectCancelAndHold: false,
    rejectScheduledFallback: false,
    rejectImmediateValue: false,
    cancelScheduledCalls: 0,
    immediateValue: 1,
  };
  const masterParameter = {
    get value() {
      return state.immediateValue;
    },
    set value(value: number) {
      if (state.rejectImmediateValue) throw new Error('injected-immediate-gain-failure');
      state.immediateValue = value;
    },
    cancelAndHoldAtTime: () => {
      if (state.rejectCancelAndHold) throw new Error('injected-cancel-hold-failure');
    },
    cancelScheduledValues: () => {
      state.cancelScheduledCalls += 1;
      if (state.rejectScheduledFallback) throw new Error('injected-cancel-scheduled-failure');
    },
    setValueAtTime: () => {
      if (state.rejectScheduledFallback) throw new Error('injected-set-value-failure');
    },
    linearRampToValueAtTime: (value: number) => {
      if (state.rejectScheduledFallback) throw new Error('injected-ramp-failure');
      state.immediateValue = value;
    },
  } as unknown as AudioParam;
  let gainIndex = 0;
  const createNode = (gain = createAudioParam()) => ({
    gain,
    connect: () => undefined,
    disconnect: () => undefined,
  });
  const context = {
    currentTime: 4,
    destination: createNode(),
    createGain: () => {
      const node = createNode(gainIndex === 0 ? masterParameter : createAudioParam());
      gainIndex += 1;
      return node;
    },
    createDynamicsCompressor: () => ({
      threshold: createAudioParam(),
      knee: createAudioParam(),
      ratio: createAudioParam(),
      attack: createAudioParam(),
      release: createAudioParam(),
      connect: () => undefined,
      disconnect: () => undefined,
    }),
  } as unknown as AudioContext;
  return { context, state };
};

{
  const runtime = createFakeBusRuntime();
  const graph = new AudioBusGraph(runtime.context, { enabled: true, volume: 1 });
  runtime.state.rejectCancelAndHold = true;
  assert.equal(graph.applySettings({ enabled: true, volume: 0.4 }), true);
  assert.equal(runtime.state.cancelScheduledCalls, 1);
  assert.equal(runtime.state.immediateValue, 0.4);
}

{
  const runtime = createFakeBusRuntime();
  const graph = new AudioBusGraph(runtime.context, { enabled: true, volume: 1 });
  runtime.state.rejectCancelAndHold = true;
  runtime.state.rejectScheduledFallback = true;
  assert.equal(graph.applySettings({ enabled: false, volume: 1 }), true);
  assert.equal(runtime.state.immediateValue, 0, 'the immediate AudioParam setter should be the final mute fallback');
  runtime.state.rejectImmediateValue = true;
  assert.equal(
    graph.applySettings({ enabled: false, volume: 1 }),
    false,
    'the bus should report an exhausted driver fallback without throwing',
  );
}

console.log('audioBusFallback tests passed');
