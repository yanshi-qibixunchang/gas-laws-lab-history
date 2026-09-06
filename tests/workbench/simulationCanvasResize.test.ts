import assert from 'node:assert/strict';
import { observeSimulationCanvasSize } from '../../src/components/simulationCanvasResize.ts';

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalObserver = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');
const frames = new Map<number, FrameRequestCallback>();
const resizeListeners = new Set<() => void>();
const resolutionQueries: Array<{ media: string; listeners: Set<() => void> }> = [];
const observers: FakeResizeObserver[] = [];
let nextFrameId = 0;
let dpr = 1;
let width = 464.2778;
let height = 332.4444;
let reads = 0;
let widthWrites = 0;
let heightWrites = 0;
let backingWidth = 300;
let backingHeight = 150;
let currentDrawing = 'initial';
const drawings: string[] = [];
const scales: number[][] = [];

class FakeResizeObserver {
  callback: () => void;
  target: HTMLElement | null = null;
  disconnected = false;

  constructor(callback: () => void) {
    this.callback = callback;
    observers.push(this);
  }
  observe(target: HTMLElement) { this.target = target; }
  disconnect() { this.disconnected = true; }
}

const canvas = {
  get width() { return backingWidth; },
  set width(value: number) { widthWrites++; backingWidth = value; },
  get height() { return backingHeight; },
  set height(value: number) { heightWrites++; backingHeight = value; },
  getContext: () => ({ scale: (x: number, y: number) => scales.push([x, y]) }),
} as unknown as HTMLCanvasElement;
const container = {
  getBoundingClientRect: () => { reads++; return { width, height }; },
} as unknown as HTMLElement;
const flushFrame = () => {
  const callbacks = [...frames.values()];
  frames.clear();
  callbacks.forEach((callback) => callback(0));
};
const emitResolutionChange = () => {
  [...resolutionQueries.at(-1)!.listeners].forEach((callback) => callback());
};

try {
  Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: FakeResizeObserver });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      get devicePixelRatio() { return dpr; },
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        frames.set(++nextFrameId, callback);
        return nextFrameId;
      },
      cancelAnimationFrame: (id: number) => frames.delete(id),
      addEventListener: (event: string, callback: () => void) => {
        assert.equal(event, 'resize');
        resizeListeners.add(callback);
      },
      removeEventListener: (event: string, callback: () => void) => {
        assert.equal(event, 'resize');
        resizeListeners.delete(callback);
      },
      matchMedia: (media: string) => {
        const query = { media, listeners: new Set<() => void>() };
        resolutionQueries.push(query);
        return {
          addEventListener: (_event: string, callback: () => void) => query.listeners.add(callback),
          removeEventListener: (_event: string, callback: () => void) => query.listeners.delete(callback),
        };
      },
    },
  });

  const dispose = observeSimulationCanvasSize(canvas, container, () => drawings.push(currentDrawing));
  assert.equal(observers.length, 1);
  assert.equal(observers[0].target, container);
  assert.deepEqual([canvas.width, canvas.height], [464, 332]);
  assert.deepEqual(drawings, ['initial']);
  assert.deepEqual(scales, [[1, 1]]);

  const readsBeforeNotifications = reads;
  for (let i = 0; i < 20; i++) observers[0].callback();
  resizeListeners.forEach((callback) => callback());
  assert.equal(frames.size, 1, 'duplicate resize notifications share one pending frame');
  assert.equal(reads, readsBeforeNotifications, 'resize notifications do not synchronously read layout');
  flushFrame();
  assert.equal(reads, readsBeforeNotifications + 1);
  assert.deepEqual([widthWrites, heightWrites, drawings.length], [1, 1, 1], 'unchanged fractional sizes must not clear the canvas');

  width = 600.75;
  height = 400.5;
  currentDrawing = 'updated particles and camera';
  observers[0].callback();
  flushFrame();
  assert.deepEqual([canvas.width, canvas.height], [600, 400]);
  assert.equal(drawings.at(-1), currentDrawing, 'resizing uses the current drawing callback');
  assert.equal(observers.length, 1, 'drawing changes do not require another size observer');

  dpr = 2;
  emitResolutionChange();
  assert.equal(resolutionQueries[0].listeners.size, 0);
  assert.equal(resolutionQueries.at(-1)!.media, '(resolution: 2dppx)');
  flushFrame();
  assert.deepEqual([canvas.width, canvas.height], [1201, 801]);
  assert.deepEqual(scales.at(-1), [2, 2]);

  // A simultaneous CSS-size and DPR change can keep the backing dimensions equal.
  // It still needs a fresh transform and must keep watching later DPR changes.
  dpr = 1;
  width = 1201;
  height = 801;
  const drawsBeforeRatioChange = drawings.length;
  emitResolutionChange();
  flushFrame();
  assert.deepEqual([canvas.width, canvas.height], [1201, 801]);
  assert.deepEqual(scales.at(-1), [1, 1]);
  assert.equal(drawings.length, drawsBeforeRatioChange + 1);
  assert.equal(resolutionQueries.at(-1)!.media, '(resolution: 1dppx)');

  width = 0;
  height = 0;
  observers[0].callback();
  flushFrame();
  assert.deepEqual([canvas.width, canvas.height], [0, 0]);
  width = 464.2778;
  height = 332.4444;
  observers[0].callback();
  flushFrame();
  assert.deepEqual([canvas.width, canvas.height], [464, 332]);

  observers[0].callback();
  const queuedCallback = [...frames.values()][0];
  const readsBeforeDisposal = reads;
  const drawsBeforeDisposal = drawings.length;
  dispose();
  assert.equal(observers[0].disconnected, true);
  assert.equal(resizeListeners.size, 0);
  assert.equal(resolutionQueries.at(-1)!.listeners.size, 0);
  assert.equal(frames.size, 0, 'unmount cancels the pending resize frame');
  queuedCallback(0);
  observers[0].callback();
  assert.equal(frames.size, 0, 'late observer notifications cannot revive a disposed subscription');
  assert.equal(reads, readsBeforeDisposal);
  assert.equal(drawings.length, drawsBeforeDisposal);
} finally {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
  if (originalObserver) Object.defineProperty(globalThis, 'ResizeObserver', originalObserver);
  else Reflect.deleteProperty(globalThis, 'ResizeObserver');
}

console.log('simulationCanvasResize tests passed');
