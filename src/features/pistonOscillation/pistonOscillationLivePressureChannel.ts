import type {
  PistonOscillationThermodynamicPhase,
  PistonOscillationThermodynamicState,
} from '../../domain/pistonOscillation/pistonOscillationPhysicsEngine.ts';
import {
  DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG,
  PISTON_OSCILLATION_FORMAL_SAMPLE_RATE_HZ,
  createPistonOscillationSensorSessionSeed,
  normalizePistonOscillationDynamicSensorConfig,
  observePistonOscillationDynamicPressure,
  type PistonOscillationDynamicSensorConfig,
  type PistonOscillationDynamicSensorState,
} from '../../domain/pistonOscillation/pistonOscillationSensorObservationModel.ts';

export interface PistonOscillationLivePhysicalState {
  observedAtMs: number;
  equilibriumHeightMm: number;
  displacementMm: number;
  thermodynamicState: PistonOscillationThermodynamicState;
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
  sensorState: PistonOscillationDynamicSensorState;
  sensorConfig: PistonOscillationDynamicSensorConfig;
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
  configInput?: Partial<PistonOscillationDynamicSensorConfig>,
): PistonOscillationLivePressureChannel => {
  const usesGeneratedSessionSeed = configInput?.seed === undefined;
  const createSensorConfig = () => normalizePistonOscillationDynamicSensorConfig({
    ...(configInput ?? DEFAULT_PISTON_OSCILLATION_DYNAMIC_SENSOR_CONFIG),
    seed: configInput?.seed ?? createPistonOscillationSensorSessionSeed(),
  });
  let snapshot: PistonOscillationLivePressureObservation | null = null;
  let dynamicState: PistonOscillationDynamicSensorState | null = null;
  let previousPhysicalPressurePa: number | null = null;
  let sensorConfig = createSensorConfig();
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
      const thermodynamicState = state.thermodynamicState;
      if (snapshot?.sampleClockIndex === sampleClockIndex) {
        previousPhysicalPressurePa = thermodynamicState.pressurePa;
        return snapshot;
      }
      const previousClockIndex = snapshot?.sampleClockIndex ?? sampleClockIndex;
      const intervalCount = Math.max(1, sampleClockIndex - previousClockIndex);
      let absolutePressureKpa = snapshot?.absolutePressureKpa
        ?? thermodynamicState.pressurePa / 1_000;
      const publishObservation = (
        physicalPressurePa: number,
        elapsedS?: number,
        noiseSampleIndexAdvance?: number,
      ) => {
        const observation = observePistonOscillationDynamicPressure({
          physicalPressurePa,
          sampleRateHz: PISTON_OSCILLATION_FORMAL_SAMPLE_RATE_HZ,
          state: dynamicState,
          config: sensorConfig,
          elapsedS,
          noiseSampleIndexAdvance,
        });
        dynamicState = observation.state;
        absolutePressureKpa = observation.absolutePressureKpa;
      };
      if (intervalCount > 2_000 && dynamicState) {
        publishObservation(
          thermodynamicState.pressurePa,
          intervalCount / PISTON_OSCILLATION_FORMAL_SAMPLE_RATE_HZ,
          intervalCount,
        );
      } else {
        for (let intervalIndex = 1; intervalIndex <= intervalCount; intervalIndex += 1) {
          const blend = intervalCount <= 1 ? 1 : intervalIndex / intervalCount;
          const physicalPressurePa = previousPhysicalPressurePa === null
            ? thermodynamicState.pressurePa
            : previousPhysicalPressurePa
              + (thermodynamicState.pressurePa - previousPhysicalPressurePa) * blend;
          publishObservation(physicalPressurePa);
        }
      }
      previousPhysicalPressurePa = thermodynamicState.pressurePa;
      if (!dynamicState) {
        throw new Error('The piston sensor failed to initialize its observation state.');
      }
      snapshot = {
        sampleClockIndex,
        sampledAtMs: sampleClockIndex
          * 1_000 / PISTON_OSCILLATION_FORMAL_SAMPLE_RATE_HZ,
        physicalPressurePa: thermodynamicState.pressurePa,
        absolutePressureKpa,
        equilibriumHeightMm: state.equilibriumHeightMm,
        displacementMm: state.displacementMm,
        truePistonHeightMm: thermodynamicState.pistonHeightM * 1_000,
        temperatureK: thermodynamicState.temperatureK,
        thermodynamicPhase: thermodynamicState.phase,
        sensorState: { ...dynamicState },
        sensorConfig: { ...sensorConfig },
      };
      notify();
      return snapshot;
    },
    clear: () => {
      if (snapshot === null) return;
      snapshot = null;
      dynamicState = null;
      previousPhysicalPressurePa = null;
      if (usesGeneratedSessionSeed) {
        sensorConfig = createSensorConfig();
      }
      notify();
    },
  };
};
