import { useCallback, useEffect, useRef } from 'react';
import type { AudioAssetId } from '../../catalog/audioCatalog.ts';
import { useAudioEngine } from '../../react/useAudioEngine.ts';
import {
  PistonOscillationScrewGrainAccumulator,
  getPistonOscillationBottomImpactGain,
  getPistonOscillationMechanicalVariation,
  getPistonOscillationVibrationVariation,
} from './pistonOscillationAudioPolicy.ts';

type PistonOscillationHoseConnectionState = 'connected' | 'disconnected';

interface PistonOscillationHoseAudioEvent {
  id: number;
  state: PistonOscillationHoseConnectionState;
}

interface PistonOscillationBottomImpactAudioEvent {
  id: number;
  dropDistanceMm: number;
}

export interface PistonOscillationAudioControllerState {
  resetKey: string;
  restoreMuted?: boolean;
  powerPressProgress: number;
  lockingScrewAngleDeg: number;
  screwMotionActive: boolean;
  hoseEvent: PistonOscillationHoseAudioEvent | null;
  demoHoseState: PistonOscillationHoseConnectionState | null;
  releasePulseId: number;
  demoReleaseKey: string | null;
  bottomImpactEvent: PistonOscillationBottomImpactAudioEvent | null;
}

interface PreviousPistonOscillationAudioState {
  resetKey: string;
  powerPressProgress: number;
  lockingScrewAngleDeg: number;
  screwMotionActive: boolean;
  hoseEventId: number;
  demoHoseState: PistonOscillationHoseConnectionState | null;
  releasePulseId: number;
  demoReleaseKey: string | null;
  bottomImpactEventId: number;
}

const toPreviousState = (
  state: PistonOscillationAudioControllerState,
): PreviousPistonOscillationAudioState => ({
  resetKey: state.resetKey,
  powerPressProgress: state.powerPressProgress,
  lockingScrewAngleDeg: state.lockingScrewAngleDeg,
  screwMotionActive: state.screwMotionActive,
  hoseEventId: state.hoseEvent?.id ?? 0,
  demoHoseState: state.demoHoseState,
  releasePulseId: state.releasePulseId,
  demoReleaseKey: state.demoReleaseKey,
  bottomImpactEventId: state.bottomImpactEvent?.id ?? 0,
});

const POWER_BOTTOM_OUT_PROGRESS = 0.985;

const HOSE_ASSET: Record<PistonOscillationHoseConnectionState, AudioAssetId> = {
  connected: 'pistonOscillation.hose.connect',
  disconnected: 'pistonOscillation.hose.disconnect',
};

export const usePistonOscillationAudioController = (
  state: PistonOscillationAudioControllerState,
) => {
  const { engine } = useAudioEngine();
  const previousRef = useRef<PreviousPistonOscillationAudioState | null>(null);
  const screwAccumulatorRef = useRef(new PistonOscillationScrewGrainAccumulator());
  const restoreMutedRef = useRef(state.restoreMuted === true);
  const audioDisabledAfterFailureRef = useRef(false);
  const reportAudioFailureRef = useRef<(error: unknown) => void>(() => undefined);
  restoreMutedRef.current = state.restoreMuted === true;
  reportAudioFailureRef.current = (error) => {
    if (audioDisabledAfterFailureRef.current) return;
    audioDisabledAfterFailureRef.current = true;
    console.warn(
      '[Piston Oscillation audio] Audio was disabled after a playback failure; the experiment remains available.',
      error,
    );
    try {
      engine.stopAll(0);
    } catch {
      // Audio degradation must never escape into the 3D runtime guard.
    }
  };

  const guardAudioPromise = useCallback((promise: Promise<unknown>) => {
    void promise.catch((error: unknown) => reportAudioFailureRef.current(error));
  }, []);

  const playMechanicalOneShot = useCallback((
    assetId: AudioAssetId,
    maxStartDelayMs: number,
  ) => {
    if (restoreMutedRef.current || audioDisabledAfterFailureRef.current) return;
    guardAudioPromise(engine.playOneShot(assetId, {
      ...getPistonOscillationMechanicalVariation(Math.random(), Math.random()),
      replaceGroup: true,
      crossfadeMs: 12,
      fadeInMs: 3,
      maxStartDelayMs,
    }));
  }, [engine, guardAudioPromise]);

  useEffect(() => {
    const previous = previousRef.current;
    const nextPrevious = toPreviousState(state);
    previousRef.current = nextPrevious;
    if (!previous) return;
    if (state.restoreMuted || previous.resetKey !== state.resetKey) {
      screwAccumulatorRef.current.reset();
      engine.stopAll(0);
      return;
    }
    if (audioDisabledAfterFailureRef.current) return;

    if (
      previous.powerPressProgress < POWER_BOTTOM_OUT_PROGRESS
      && state.powerPressProgress >= POWER_BOTTOM_OUT_PROGRESS
    ) {
      playMechanicalOneShot('pistonOscillation.power.press', 140);
    }

    if (
      state.hoseEvent
      && state.hoseEvent.id > previous.hoseEventId
    ) {
      playMechanicalOneShot(HOSE_ASSET[state.hoseEvent.state], 140);
    }

    if (
      previous.demoHoseState
      && state.demoHoseState
      && previous.demoHoseState !== state.demoHoseState
    ) {
      playMechanicalOneShot(HOSE_ASSET[state.demoHoseState], 140);
    }

    if (state.screwMotionActive) {
      const angleDeltaDeg = state.lockingScrewAngleDeg - previous.lockingScrewAngleDeg;
      const grainCount = screwAccumulatorRef.current.consume(angleDeltaDeg);
      if (grainCount > 0) {
        guardAudioPromise(engine.playBurst('pistonOscillation.lockingScrew.turn', {
          ...getPistonOscillationMechanicalVariation(Math.random(), Math.random()),
          count: grainCount,
          intervalMs: grainCount > 1 ? 64 : 0,
          itemDurationMs: 190,
          itemFadeInMs: 5,
          itemFadeOutMs: 24,
          maxStartDelayMs: 100,
        }));
      }
    } else {
      screwAccumulatorRef.current.reset();
    }

    if (
      state.releasePulseId > previous.releasePulseId
      || (state.demoReleaseKey !== null && state.demoReleaseKey !== previous.demoReleaseKey)
    ) {
      guardAudioPromise(engine.playOneShot('pistonOscillation.piston.vibration', {
        ...getPistonOscillationVibrationVariation(Math.random(), Math.random()),
        replaceGroup: true,
        crossfadeMs: 16,
        fadeInMs: 3,
        maxStartDelayMs: 120,
      }));
    }

    if (
      state.bottomImpactEvent
      && state.bottomImpactEvent.id > previous.bottomImpactEventId
    ) {
      const gain = getPistonOscillationBottomImpactGain(
        state.bottomImpactEvent.dropDistanceMm,
      );
      if (gain > 0) {
        guardAudioPromise(engine.playOneShot('pistonOscillation.piston.bottomImpact', {
          gain,
          replaceGroup: true,
          crossfadeMs: 8,
          fadeInMs: 1,
          maxStartDelayMs: 120,
        }));
      }
    }
  }, [
    engine,
    guardAudioPromise,
    playMechanicalOneShot,
    state.bottomImpactEvent,
    state.demoHoseState,
    state.demoReleaseKey,
    state.hoseEvent,
    state.lockingScrewAngleDeg,
    state.powerPressProgress,
    state.releasePulseId,
    state.resetKey,
    state.restoreMuted,
    state.screwMotionActive,
  ]);

  useEffect(() => () => {
    engine.stopAll(0);
    screwAccumulatorRef.current.reset();
  }, [engine]);
};
