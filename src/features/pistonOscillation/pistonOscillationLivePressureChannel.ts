import {
  getPistonOscillationInstantaneousThermodynamicState,
  type PistonOscillationThermodynamicPhase,
  type PistonOscillationThermodynamicState,
} from '../../domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  PISTON_OSCILLATION_FORMAL_SAMPLE_RATE_HZ,
  quantizePistonOscillationObservedPressureKpa,
} from '../../domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';

export interface PistonOscillationLivePhysicalState {
  observedAtMs: number;
  equilibriumHeightMm: number;
  displacementMm: number;
  thermodynamicState?: PistonOscillationThermodynamicState;
}

export interface PistonOscillationLivePressureObservation {
  sampleClockIndex: number;
  sampledAtMs: number;
  physicalPressurePa: number;
  absolutePressureKpa: number;
  equilibriumHeightMm: number;
  displacementMm: number;
  truePistonHeightMm: number;
  temperatureK: number;
  thermodynamicPhase: PistonOscillationThermodynamicPhase;
}

export interface PistonOscillationLivePressureChannel {
  getSnapshot: () => PistonOscillationLivePressureObservation | null;
  subscribe: (listener: () => void) => () => void;
  publishPhysicalState: (
    state: PistonOscillationLivePhysicalState,
  ) => PistonOscillationLivePressureObservation | null;
  clear: () => void;
}

export const createPistonOscillationLivePressureChannel = (
): PistonOscillationLivePressureChannel => {
  let snapshot: PistonOscillationLivePressureObservation | null = null;
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of listeners) listener();
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    publishPhysicalState: (state) => {
      if (!Number.isFinite(state.observedAtMs) || state.observedAtMs < 0) {
        throw new RangeError('observedAtMs must be finite and non-negative.');
      }
      const sampleClockIndex = Math.floor(
        state.observedAtMs * PISTON_OSCILLATION_FORMAL_SAMPLE_RATE_HZ / 1_000,
      );
      if (snapshot?.sampleClockIndex === sampleClockIndex) return snapshot;
      const thermodynamicState = state.thermodynamicState
        ?? getPistonOscillationInstantaneousThermodynamicState(
          state.equilibriumHeightMm,
          state.displacementMm,
        ).gasState;
      snapshot = {
        sampleClockIndex,
        sampledAtMs: sampleClockIndex
          * 1_000 / PISTON_OSCILLATION_FORMAL_SAMPLE_RATE_HZ,
        physicalPressurePa: thermodynamicState.pressurePa,
        absolutePressureKpa: quantizePistonOscillationObservedPressureKpa(
          thermodynamicState.pressurePa,
        ),
        equilibriumHeightMm: state.equilibriumHeightMm,
        displacementMm: state.displacementMm,
        truePistonHeightMm: thermodynamicState.pistonHeightM * 1_000,
        temperatureK: thermodynamicState.temperatureK,
        thermodynamicPhase: thermodynamicState.phase,
      };
      notify();
      return snapshot;
    },
    clear: () => {
      if (snapshot === null) return;
      snapshot = null;
      notify();
    },
  };
};
