import { useCallback, useEffect, useRef } from 'react';
import type { AudioAssetId } from '../../catalog/audioCatalog.ts';
import { AudioVoiceRateLimiter } from '../../core/audioVoicePolicy.ts';
import { useAudioEngine } from '../../react/useAudioEngine.ts';
import {
  HEAT_CAPACITY_PUMP_BULB_MIN_INTERVAL_MS,
  HEAT_CAPACITY_RECORD_WRITING_MIN_INTERVAL_MS,
  HeatCapacityKnobTickAccumulator,
  getHeatCapacityMechanicalVariation,
  getHeatCapacityZeroKnobAudioProfile,
  resolveHeatCapacityReleaseSoundFeedback,
  shouldPlayHeatCapacityReleaseSound,
} from './heatCapacityAudioPolicy.ts';
import { HeatCapacityReleaseSound } from './heatCapacityReleaseSound.ts';
import { heatCapacityAudioCatalog } from './heatCapacityAudioCatalog.ts';
import type { HeatCapacityGuideRollbackCue } from '../../../features/heatCapacity/heatCapacityGuideRollbackMotion.ts';

interface HeatCapacityAudioControllerState {
  resetKey: number;
  powerOn: boolean;
  stopcockAngleDeg: number;
  pumpValveOpen: boolean;
  pressureZeroKnobAngle: number;
  pressureZeroTimelineDriven: boolean;
  pressureZeroAdjustMode: 'none' | 'fineWheel' | 'coarseDrag';
  pumpPulseId: number;
  recordPulseId: number;
  releasePathOpen: boolean;
  releaseElapsedS?: number;
  pressureDeltaKPa: number;
  paused: boolean;
  restoreMuted?: boolean;
}

interface PreviousMechanicalState {
  resetKey: number;
  powerOn: boolean;
  stopcockAngleDeg: number;
  pumpValveOpen: boolean;
  pressureZeroKnobAngle: number;
  pressureZeroAdjustMode: HeatCapacityAudioControllerState['pressureZeroAdjustMode'];
  pumpPulseId: number;
  recordPulseId: number;
}

const toPreviousMechanicalState = (state: HeatCapacityAudioControllerState): PreviousMechanicalState => ({
  resetKey: state.resetKey,
  powerOn: state.powerOn,
  stopcockAngleDeg: state.stopcockAngleDeg,
  pumpValveOpen: state.pumpValveOpen,
  pressureZeroKnobAngle: state.pressureZeroKnobAngle,
  pressureZeroAdjustMode: state.pressureZeroAdjustMode,
  pumpPulseId: state.pumpPulseId,
  recordPulseId: state.recordPulseId,
});

const HEAT_CAPACITY_ZERO_KNOB_DEFAULT_EVENT_SPAN_MS = 16;
const HEAT_CAPACITY_ZERO_KNOB_MAX_EVENT_SPAN_MS = 100;
const HEAT_CAPACITY_ZERO_KNOB_SPEED_SMOOTHING = 0.35;
const HEAT_CAPACITY_PUMP_VALVE_VARIANT_COUNT = heatCapacityAudioCatalog['heatCapacity.pumpValve.open'].files.length;
const HEAT_CAPACITY_POWER_ASSET: Record<'on' | 'off', AudioAssetId> = {
  on: 'heatCapacity.power.on',
  off: 'heatCapacity.power.off',
};
const HEAT_CAPACITY_STOPCOCK_ASSET: Record<'open' | 'close', AudioAssetId> = {
  open: 'heatCapacity.stopcock.turnOpen',
  close: 'heatCapacity.stopcock.turnClose',
};
const HEAT_CAPACITY_PUMP_VALVE_ASSET: Record<'open' | 'close', AudioAssetId> = {
  open: 'heatCapacity.pumpValve.open',
  close: 'heatCapacity.pumpValve.close',
};

export const useHeatCapacityAudioController = (state: HeatCapacityAudioControllerState) => {
  const { engine, settings } = useAudioEngine();
  const previousRef = useRef<PreviousMechanicalState | null>(null);
  const rateLimiterRef = useRef(new AudioVoiceRateLimiter());
  const knobAccumulatorRef = useRef(new HeatCapacityKnobTickAccumulator());
  const knobLastChangeAtRef = useRef<number | null>(null);
  const knobSmoothedSpeedRef = useRef(0);
  const releaseSoundRef = useRef<HeatCapacityReleaseSound | null>(null);
  const rollbackPumpValveVariantRef = useRef(new Map<number, number>());
  const restoreMutedRef = useRef(state.restoreMuted === true);
  const audioDisabledAfterFailureRef = useRef(false);
  const reportAudioFailureRef = useRef<(error: unknown) => void>(() => undefined);
  restoreMutedRef.current = state.restoreMuted === true;
  reportAudioFailureRef.current = (error) => {
    if (audioDisabledAfterFailureRef.current) return;
    audioDisabledAfterFailureRef.current = true;
    console.warn(
      '[Heat Capacity audio] Audio was disabled after a playback failure; the experiment remains available.',
      error,
    );
    try {
      releaseSoundRef.current?.stop(0);
    } catch {
      // Audio degradation must never escape into the 3D runtime guard.
    }
    try {
      engine.stopAll(0);
    } catch {
      // The failed audio graph is already quarantined for this scene lifetime.
    }
  };
  const guardAudioPromise = useCallback((promise: Promise<unknown>) => {
    void promise.catch((error: unknown) => reportAudioFailureRef.current(error));
  }, []);
  if (!releaseSoundRef.current) {
    releaseSoundRef.current = new HeatCapacityReleaseSound(
      engine,
      (error) => reportAudioFailureRef.current(error),
    );
  }

  const playPumpBulbStroke = useCallback(() => {
    if (restoreMutedRef.current || audioDisabledAfterFailureRef.current) return;
    if (!rateLimiterRef.current.accept(
      'heatCapacity.pumpBulb.stroke',
      HEAT_CAPACITY_PUMP_BULB_MIN_INTERVAL_MS,
    )) return;
    guardAudioPromise(engine.playOneShot('heatCapacity.pumpBulb.stroke', {
      ...getHeatCapacityMechanicalVariation(Math.random(), Math.random()),
      replaceGroup: true,
      crossfadeMs: 15,
      maxStartDelayMs: 80,
    }));
  }, [engine, guardAudioPromise]);

  const playPowerTransition = useCallback((
    powerOn: boolean,
    options: { interruptCurrent?: boolean; maxStartDelayMs: number },
  ) => {
    if (restoreMutedRef.current || audioDisabledAfterFailureRef.current) return;
    guardAudioPromise(engine.playOneShot(HEAT_CAPACITY_POWER_ASSET[powerOn ? 'on' : 'off'], {
      replaceGroup: options.interruptCurrent,
      crossfadeMs: options.interruptCurrent ? 12 : undefined,
      fadeInMs: options.interruptCurrent ? 4 : undefined,
      maxStartDelayMs: options.maxStartDelayMs,
    }));
  }, [engine, guardAudioPromise]);

  const playStopcockTransition = useCallback((
    open: boolean,
    options: { interruptCurrent?: boolean; maxStartDelayMs: number },
  ) => {
    if (restoreMutedRef.current || audioDisabledAfterFailureRef.current) return;
    guardAudioPromise(engine.playOneShot(HEAT_CAPACITY_STOPCOCK_ASSET[open ? 'open' : 'close'], {
      replaceGroup: options.interruptCurrent,
      crossfadeMs: options.interruptCurrent ? 10 : undefined,
      fadeInMs: options.interruptCurrent ? 3 : undefined,
      maxStartDelayMs: options.maxStartDelayMs,
    }));
  }, [engine, guardAudioPromise]);

  const playPumpValveTransition = useCallback((
    open: boolean,
    options: { fileIndex?: number; shortened?: boolean; maxStartDelayMs: number },
  ) => {
    if (restoreMutedRef.current || audioDisabledAfterFailureRef.current) return;
    const shortened = options.shortened === true;
    guardAudioPromise(engine.playOneShot(HEAT_CAPACITY_PUMP_VALVE_ASSET[open ? 'open' : 'close'], {
      ...getHeatCapacityMechanicalVariation(Math.random(), Math.random()),
      fileIndex: options.fileIndex,
      durationMs: shortened ? 150 : undefined,
      fadeOutMs: shortened ? 34 : undefined,
      replaceGroup: true,
      crossfadeMs: 24,
      fadeInMs: shortened ? 8 : 12,
      maxStartDelayMs: options.maxStartDelayMs,
    }));
  }, [engine, guardAudioPromise]);

  const playGuideRollbackCue = useCallback((cue: HeatCapacityGuideRollbackCue) => {
    if (restoreMutedRef.current || audioDisabledAfterFailureRef.current) return;
    if (cue.action === 'pumpBulbStroke') {
      playPumpBulbStroke();
      return;
    }
    if (cue.action === 'knobTick') {
      guardAudioPromise(engine.playOneShot('heatCapacity.zeroKnob.tick', {
        playbackRate: cue.phase === 'knobLeftPeak' ? 0.98 : 1.02,
        replaceGroup: true,
        crossfadeMs: 8,
        fadeInMs: 3,
        maxStartDelayMs: 80,
      }));
      return;
    }
    if (cue.action === 'powerOn' || cue.action === 'powerOff') {
      playPowerTransition(cue.action === 'powerOn', {
        interruptCurrent: true,
        maxStartDelayMs: 90,
      });
      return;
    }
    if (cue.action === 'stopcockOpen' || cue.action === 'stopcockClose') {
      playStopcockTransition(cue.action === 'stopcockOpen', {
        interruptCurrent: true,
        maxStartDelayMs: 90,
      });
      return;
    }
    if (cue.action === 'pumpValveOpen' || cue.action === 'pumpValveClose') {
      let fileIndex = rollbackPumpValveVariantRef.current.get(cue.cycleKey);
      if (cue.phase === 'departure' || fileIndex === undefined) {
        fileIndex = Math.floor(Math.random() * HEAT_CAPACITY_PUMP_VALVE_VARIANT_COUNT);
        rollbackPumpValveVariantRef.current.set(cue.cycleKey, fileIndex);
        if (rollbackPumpValveVariantRef.current.size > 8) {
          const oldestKey = rollbackPumpValveVariantRef.current.keys().next().value;
          if (oldestKey !== undefined) rollbackPumpValveVariantRef.current.delete(oldestKey);
        }
      }
      playPumpValveTransition(cue.action === 'pumpValveOpen', {
        fileIndex,
        shortened: true,
        maxStartDelayMs: 90,
      });
    }
  }, [engine, guardAudioPromise, playPowerTransition, playPumpBulbStroke, playPumpValveTransition, playStopcockTransition]);

  useEffect(() => {
    const previous = previousRef.current;
    const nextPrevious = toPreviousMechanicalState(state);
    previousRef.current = nextPrevious;
    if (!previous) return;
    if (state.restoreMuted) {
      rateLimiterRef.current.reset();
      knobAccumulatorRef.current.reset();
      knobLastChangeAtRef.current = null;
      knobSmoothedSpeedRef.current = 0;
      rollbackPumpValveVariantRef.current.clear();
      releaseSoundRef.current?.stop();
      engine.stopAll(0);
      return;
    }
    if (audioDisabledAfterFailureRef.current) return;
    if (previous.resetKey !== state.resetKey) {
      rateLimiterRef.current.reset();
      knobAccumulatorRef.current.reset();
      knobLastChangeAtRef.current = null;
      knobSmoothedSpeedRef.current = 0;
      rollbackPumpValveVariantRef.current.clear();
      releaseSoundRef.current?.stop();
      engine.stopAll(0);
      return;
    }

    if (previous.powerOn !== state.powerOn) {
      playPowerTransition(state.powerOn, { maxStartDelayMs: 140 });
    }

    if (previous.pumpValveOpen !== state.pumpValveOpen) {
      playPumpValveTransition(state.pumpValveOpen, { maxStartDelayMs: 140 });
    }

    const stopcockDelta = state.stopcockAngleDeg - previous.stopcockAngleDeg;
    if (Math.abs(stopcockDelta) > 0.001) {
      playStopcockTransition(stopcockDelta > 0, { maxStartDelayMs: 120 });
    }

    const knobDelta = state.pressureZeroKnobAngle - previous.pressureZeroKnobAngle;
    if (Math.abs(knobDelta) > 0.0001) {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const previousChangeAt = knobLastChangeAtRef.current;
      if (state.pressureZeroTimelineDriven || state.pressureZeroAdjustMode === 'coarseDrag') {
        knobLastChangeAtRef.current = now;
        const eventSpanMs = previousChangeAt === null
          ? HEAT_CAPACITY_ZERO_KNOB_DEFAULT_EVENT_SPAN_MS
          : Math.min(
              HEAT_CAPACITY_ZERO_KNOB_MAX_EVENT_SPAN_MS,
              Math.max(1, now - previousChangeAt),
            );
        const rawAngularSpeedDegPerS = Math.abs(knobDelta) / (eventSpanMs / 1000);
        knobSmoothedSpeedRef.current = knobSmoothedSpeedRef.current > 0
          ? knobSmoothedSpeedRef.current * (1 - HEAT_CAPACITY_ZERO_KNOB_SPEED_SMOOTHING) +
            rawAngularSpeedDegPerS * HEAT_CAPACITY_ZERO_KNOB_SPEED_SMOOTHING
          : rawAngularSpeedDegPerS;
        const profile = getHeatCapacityZeroKnobAudioProfile(knobSmoothedSpeedRef.current);
        const tickCount = knobAccumulatorRef.current.consume(knobDelta, profile.degreesPerTick);
        if (tickCount > 0) {
          const intervalMs = tickCount > 1 ? eventSpanMs / tickCount : 0;
          const itemDurationMs = intervalMs > 0
            ? Math.min(profile.itemDurationMs, Math.max(1, intervalMs * 0.72))
            : profile.itemDurationMs;
          guardAudioPromise(engine.playBurst('heatCapacity.zeroKnob.tick', {
            count: tickCount,
            intervalMs,
            itemDurationMs,
            itemFadeInMs: profile.itemFadeInMs,
            itemFadeOutMs: profile.itemFadeOutMs,
            playbackRate: knobDelta > 0 ? 1.02 : 0.98,
            fadeInMs: 4,
          }));
        }
      } else if (state.pressureZeroAdjustMode === 'fineWheel') {
        knobAccumulatorRef.current.reset();
        knobLastChangeAtRef.current = null;
        knobSmoothedSpeedRef.current = 0;
        guardAudioPromise(engine.playOneShot('heatCapacity.zeroKnob.tick', {
          playbackRate: knobDelta > 0 ? 1.02 : 0.98,
        }));
      } else {
        knobAccumulatorRef.current.reset();
        knobLastChangeAtRef.current = null;
        knobSmoothedSpeedRef.current = 0;
      }
    } else if (
      previous.pressureZeroAdjustMode === 'coarseDrag' &&
      state.pressureZeroAdjustMode !== 'coarseDrag'
    ) {
      knobAccumulatorRef.current.reset();
      knobLastChangeAtRef.current = null;
      knobSmoothedSpeedRef.current = 0;
    }

    if (
      state.recordPulseId > previous.recordPulseId &&
      rateLimiterRef.current.accept(
        'heatCapacity.record.write',
        HEAT_CAPACITY_RECORD_WRITING_MIN_INTERVAL_MS,
      )
    ) {
      guardAudioPromise(engine.playOneShot('heatCapacity.record.write', {
        playbackRate: 1.1,
        replaceGroup: true,
        crossfadeMs: 30,
        fadeInMs: 30,
        maxStartDelayMs: 100,
      }));
    }

    if (state.pumpPulseId > previous.pumpPulseId) playPumpBulbStroke();
  }, [
    engine,
    guardAudioPromise,
    playPowerTransition,
    playPumpBulbStroke,
    playPumpValveTransition,
    playStopcockTransition,
    state.powerOn,
    state.pressureZeroAdjustMode,
    state.pressureZeroKnobAngle,
    state.pressureZeroTimelineDriven,
    state.pumpPulseId,
    state.recordPulseId,
    state.pumpValveOpen,
    state.resetKey,
    state.restoreMuted,
    state.stopcockAngleDeg,
  ]);

  useEffect(() => {
    const releaseSound = releaseSoundRef.current;
    if (!releaseSound) return;
    if (state.restoreMuted || audioDisabledAfterFailureRef.current) {
      releaseSound.stop();
      return;
    }
    const releaseSoundState = {
      releasePathOpen: state.releasePathOpen,
      releaseElapsedS: state.releaseElapsedS,
      paused: state.paused,
      pressureDeltaKPa: state.pressureDeltaKPa,
      audioEnabled: settings.enabled,
    };
    const feedback = resolveHeatCapacityReleaseSoundFeedback(releaseSoundState);
    if (shouldPlayHeatCapacityReleaseSound(releaseSoundState)) {
      releaseSound.start(state.pressureDeltaKPa, feedback.apertureRatio);
      releaseSound.update(state.pressureDeltaKPa, feedback.apertureRatio);
      return;
    }
    releaseSound.stop();
  }, [
    settings.enabled,
    state.releasePathOpen,
    state.releaseElapsedS,
    state.paused,
    state.pressureDeltaKPa,
    state.restoreMuted,
  ]);

  useEffect(() => () => {
    releaseSoundRef.current?.dispose();
    engine.stopAll(0);
    rateLimiterRef.current.reset();
    knobAccumulatorRef.current.reset();
    knobLastChangeAtRef.current = null;
    knobSmoothedSpeedRef.current = 0;
    rollbackPumpValveVariantRef.current.clear();
  }, [engine]);

  const stopRuntimeAudio = useCallback(() => {
    releaseSoundRef.current?.stop();
    engine.stopAll(0);
  }, [engine]);

  return { playGuideRollbackCue, stopRuntimeAudio };
};
