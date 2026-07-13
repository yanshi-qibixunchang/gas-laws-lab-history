import type { AudioAssetCatalog } from '../../core/audioTypes.ts';

const baseUrl = `${import.meta.env?.BASE_URL ?? '/'}audio/experiments/heat-capacity/`;

const file = (name: string) => `${baseUrl}${name}`;

export const heatCapacityAudioCatalog = {
  'heatCapacity.power.on': {
    id: 'heatCapacity.power.on',
    files: [file('power-switch-on.wav')],
    bus: 'experiment',
    gain: 0.58,
    voiceGroup: 'heatCapacity.power',
  },
  'heatCapacity.power.off': {
    id: 'heatCapacity.power.off',
    files: [file('power-switch-off.wav')],
    bus: 'experiment',
    gain: 0.56,
    voiceGroup: 'heatCapacity.power',
  },
  'heatCapacity.pumpValve.open': {
    id: 'heatCapacity.pumpValve.open',
    files: [
      file('pump-valve-open.wav'),
      file('pump-valve-open-02.wav'),
      file('pump-valve-open-03.wav'),
    ],
    bus: 'experiment',
    gain: 0.66,
    voiceGroup: 'heatCapacity.pumpValve',
    avoidImmediateRepeat: true,
  },
  'heatCapacity.pumpValve.close': {
    id: 'heatCapacity.pumpValve.close',
    files: [
      file('pump-valve-close.wav'),
      file('pump-valve-close-02.wav'),
      file('pump-valve-close-03.wav'),
    ],
    bus: 'experiment',
    gain: 0.68,
    voiceGroup: 'heatCapacity.pumpValve',
    avoidImmediateRepeat: true,
  },
  'heatCapacity.stopcock.turnOpen': {
    id: 'heatCapacity.stopcock.turnOpen',
    files: [file('glass-stopcock-turn-open.wav')],
    bus: 'experiment',
    gain: 1.12,
    voiceGroup: 'heatCapacity.stopcock',
  },
  'heatCapacity.stopcock.turnClose': {
    id: 'heatCapacity.stopcock.turnClose',
    files: [file('glass-stopcock-turn-close.wav')],
    bus: 'experiment',
    gain: 1.16,
    voiceGroup: 'heatCapacity.stopcock',
  },
  'heatCapacity.zeroKnob.tick': {
    id: 'heatCapacity.zeroKnob.tick',
    files: [file('zero-knob-tick.wav')],
    bus: 'experiment',
    gain: 0.62,
    voiceGroup: 'heatCapacity.zeroKnob',
  },
  'heatCapacity.pumpBulb.stroke': {
    id: 'heatCapacity.pumpBulb.stroke',
    files: [
      file('pump-bulb-stroke-01.wav'),
      file('pump-bulb-stroke-02.wav'),
      file('pump-bulb-stroke-03.wav'),
    ],
    bus: 'experiment',
    gain: 0.62,
    voiceGroup: 'heatCapacity.pumpBulb',
    avoidImmediateRepeat: true,
  },
  'heatCapacity.record.write': {
    id: 'heatCapacity.record.write',
    files: [file('record-writing.wav')],
    bus: 'experiment',
    gain: 0.29,
    voiceGroup: 'heatCapacity.recordWriting',
  },
} as const satisfies AudioAssetCatalog;
