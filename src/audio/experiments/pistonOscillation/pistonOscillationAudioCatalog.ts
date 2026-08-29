import type { AudioAssetCatalog } from '../../core/audioTypes.ts';

const baseUrl = `${import.meta.env?.BASE_URL ?? '/'}audio/experiments/piston-oscillation/`;

const file = (name: string) => `${baseUrl}${name}`;

export const pistonOscillationAudioCatalog = {
  'pistonOscillation.power.press': {
    id: 'pistonOscillation.power.press',
    files: [
      file('power-button-click-01.wav'),
      file('power-button-click-02.wav'),
    ],
    bus: 'experiment',
    gain: 0.74,
    voiceGroup: 'pistonOscillation.power',
    avoidImmediateRepeat: true,
  },
  'pistonOscillation.hose.connect': {
    id: 'pistonOscillation.hose.connect',
    files: [
      file('hose-connect-01.wav'),
      file('hose-connect-02.wav'),
    ],
    bus: 'experiment',
    gain: 0.7,
    voiceGroup: 'pistonOscillation.hose',
    avoidImmediateRepeat: true,
  },
  'pistonOscillation.hose.disconnect': {
    id: 'pistonOscillation.hose.disconnect',
    files: [
      file('hose-disconnect-01.wav'),
      file('hose-disconnect-02.wav'),
    ],
    bus: 'experiment',
    gain: 0.7,
    voiceGroup: 'pistonOscillation.hose',
    avoidImmediateRepeat: true,
  },
  'pistonOscillation.lockingScrew.turn': {
    id: 'pistonOscillation.lockingScrew.turn',
    files: [
      file('locking-screw-grain-01.wav'),
      file('locking-screw-grain-02.wav'),
      file('locking-screw-grain-03.wav'),
    ],
    bus: 'experiment',
    gain: 0.5,
    voiceGroup: 'pistonOscillation.lockingScrew',
    avoidImmediateRepeat: true,
  },
  'pistonOscillation.piston.vibration': {
    id: 'pistonOscillation.piston.vibration',
    files: [file('piston-vibration.wav')],
    bus: 'experiment',
    gain: 0.58,
    voiceGroup: 'pistonOscillation.pistonVibration',
  },
  'pistonOscillation.piston.bottomImpact': {
    id: 'pistonOscillation.piston.bottomImpact',
    files: [file('piston-bottom-impact.wav')],
    bus: 'experiment',
    gain: 0.82,
    voiceGroup: 'pistonOscillation.bottomImpact',
  },
} as const satisfies AudioAssetCatalog;
