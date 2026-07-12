import { useCallback, useEffect, useRef } from 'react';
import { AudioVoiceRateLimiter } from '../../core/audioVoicePolicy.ts';
import { useAudioEngine } from '../../react/useAudioEngine.ts';
import {
  HEAT_CAPACITY_PUMP_BULB_MIN_INTERVAL_MS,
  HEAT_CAPACITY_RECORD_WRITING_MIN_INTERVAL_MS,
  HeatCapacityKnobTickAccumulator,
  getHeatCapacityPumpBulbVariation,
  getHeatCapacityPumpValveVariation,
  getHeatCapacityZeroKnobAudioProfile,
  shouldPlayHeatCapacityReleaseSound,
} from './heatCapacityAudioPolicy.ts';
import { HeatCapacityReleaseSound } from './heatCapacityReleaseSound.ts';
import { HEAT_CAPACITY_AUTO_DEMO_ZEROING_ACTION_DURATION_MS } from '../../../domain/heatCapacity/heatCapacityAutoDemo.ts';
import type { HeatCapacityGuideRollbackCue } from '../../../features/heatCapacity/heatCapacityGuideRollbackMotion.ts';

export interface HeatCapacityAudioControllerState {
  sceneFileId: string;
  experimentMode: 'demo' | 'guide' | 'free';
  resetKey: number;
  powerOn: boolean;
  stopcockAngleDeg: number;
  pumpValveOpen: boolean;
  pressureZeroKnobAngle: number;
  pressureZeroAdjustMode: 'none' | 'fineWheel' | 'coarseDrag';
  pumpPulseId: number;
  recordPulseId: number;
  outwardReleaseFlowActive: boolean;
  pressureDeltaKPa: number;
  paused: boolean;
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

export const useHeatCapacityAudioController = (state: HeatCapacityAudioControllerState) => {
  const { engine, settings } = useAudioEngine();
  const previousRef = useRef<PreviousMechanicalState | null>(null);
  const rateLimiterRef = useRef(new AudioVoiceRateLimiter());
  const knobAccumulatorRef = useRef(new HeatCapacityKnobTickAccumulator());
  const knobLastChangeAtRef = useRef<number | null>(null);
  const knobSmoothedSpeedRef = useRef(0);
  const releaseSoundRef = useRef<HeatCapacityReleaseSound | null>(null);
  const rollbackPumpValveVariantRef = useRef(new Map<number, number>());
  if (!releaseSoundRef.current) releaseSoundRef.current = new HeatCapacityReleaseSound(engine);

  const playGuideRollbackCue = useCallback((cue: HeatCapacityGuideRollbackCue) => {
    if (cue.action === 'pumpBulbStroke') {
      if (!rateLimiterRef.current.accept(
        'heatCapacity.pumpBulb.stroke',
        HEAT_CAPACITY_PUMP_BULB_MIN_INTERVAL_MS,
      )) return;
      const variation = getHeatCapacityPumpBulbVariation(Math.random(), Math.random());
      void engine.playOneShot('heatCapacity.pumpBulb.stroke', {
        ...variation,
        voiceGroup: 'heatCapacity.pumpBulb',
        replaceGroup: true,
        crossfadeMs: 15,
        maxStartDelayMs: 80,
      });
      return;
    }
    if (cue.action === 'knobTick') {
      void engine.playOneShot('heatCapacity.zeroKnob.tick', {
        playbackRate: cue.phase === 'knobLeftPeak' ? 0.98 : 1.02,
        voiceGroup: 'heatCapacity.zeroKnob',
        replaceGroup: true,
        crossfadeMs: 8,
        fadeInMs: 3,
        maxStartDelayMs: 80,
      });
      return;
    }
    if (cue.action === 'powerOn' || cue.action === 'powerOff') {
      void engine.playOneShot(
        cue.action === 'powerOn' ? 'heatCapacity.power.on' : 'heatCapacity.power.off',
        {
          voiceGroup: 'heatCapacity.guideRollback.power',
          replaceGroup: true,
          crossfadeMs: 12,
          fadeInMs: 4,
          maxStartDelayMs: 90,
        },
      );
      return;
    }
    if (cue.action === 'stopcockOpen' || cue.action === 'stopcockClose') {
      void engine.playOneShot(
        cue.action === 'stopcockOpen'
          ? 'heatCapacity.stopcock.turnOpen'
          : 'heatCapacity.stopcock.turnClose',
        {
          voiceGroup: 'heatCapacity.guideRollback.stopcock',
          replaceGroup: true,
          crossfadeMs: 10,
          fadeInMs: 3,
          maxStartDelayMs: 90,
        },
      );
      return;
    }
    if (cue.action === 'pumpValveOpen' || cue.action === 'pumpValveClose') {
      let fileIndex = rollbackPumpValveVariantRef.current.get(cue.cycleKey);
      if (cue.phase === 'departure' || fileIndex === undefined) {
        fileIndex = Math.floor(Math.random() * 3);
        rollbackPumpValveVariantRef.current.set(cue.cycleKey, fileIndex);
        if (rollbackPumpValveVariantRef.current.size > 8) {
          const oldestKey = rollbackPumpValveVariantRef.current.keys().next().value;
          if (oldestKey !== undefined) rollbackPumpValveVariantRef.current.delete(oldestKey);
        }
      }
      const variation = getHeatCapacityPumpValveVariation(Math.random(), Math.random());
      void engine.playBurst(
        cue.action === 'pumpValveOpen'
          ? 'heatCapacity.pumpValve.open'
          : 'heatCapacity.pumpValve.close',
        {
          ...variation,
          fileIndex,
          count: 1,
          intervalMs: 0,
          itemDurationMs: 150,
          itemFadeInMs: 8,
          itemFadeOutMs: 34,
          voiceGroup: 'heatCapacity.pumpValve',
          replaceGroup: true,
          crossfadeMs: 24,
          fadeInMs: 8,
          maxStartDelayMs: 90,
        },
      );
    }
  }, [engine]);

  useEffect(() => {
    const previous = previousRef.current;
    const nextPrevious = toPreviousMechanicalState(state);
    previousRef.current = nextPrevious;
    if (!previous) return;
    if (previous.resetKey !== state.resetKey) {
      rateLimiterRef.current.reset();
      knobAccumulatorRef.current.reset();
      knobLastChangeAtRef.current = null;
      knobSmoothedSpeedRef.current = 0;
      releaseSoundRef.current?.stop();
      return;
    }

    if (previous.powerOn !== state.powerOn) {
      void engine.playOneShot(state.powerOn ? 'heatCapacity.power.on' : 'heatCapacity.power.off', {
        maxStartDelayMs: 140,
      });
    }

    if (previous.pumpValveOpen !== state.pumpValveOpen) {
      const variation = getHeatCapacityPumpValveVariation(Math.random(), Math.random());
      void engine.playOneShot(
        state.pumpValveOpen ? 'heatCapacity.pumpValve.open' : 'heatCapacity.pumpValve.close',
        {
          ...variation,
          voiceGroup: 'heatCapacity.pumpValve',
          replaceGroup: true,
          crossfadeMs: 24,
          fadeInMs: 12,
          maxStartDelayMs: 140,
        },
      );
    }

    const stopcockDelta = state.stopcockAngleDeg - previous.stopcockAngleDeg;
    if (Math.abs(stopcockDelta) > 0.001) {
      void engine.playOneShot(
        stopcockDelta > 0 ? 'heatCapacity.stopcock.turnOpen' : 'heatCapacity.stopcock.turnClose',
        { maxStartDelayMs: 120 },
      );
    }

    const knobDelta = state.pressureZeroKnobAngle - previous.pressureZeroKnobAngle;
    if (Math.abs(knobDelta) > 0.0001) {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const previousChangeAt = knobLastChangeAtRef.current;
      if (state.experimentMode === 'demo' && state.pressureZeroAdjustMode === 'fineWheel') {
        knobAccumulatorRef.current.reset();
        knobLastChangeAtRef.current = null;
        knobSmoothedSpeedRef.current = 0;
        const angularSpeedDegPerS = Math.abs(knobDelta) /
          (HEAT_CAPACITY_AUTO_DEMO_ZEROING_ACTION_DURATION_MS / 1000);
        const profile = getHeatCapacityZeroKnobAudioProfile(angularSpeedDegPerS);
        const tickCount = Math.max(
          1,
          knobAccumulatorRef.current.consume(knobDelta, profile.degreesPerTick),
        );
        void engine.playBurst('heatCapacity.zeroKnob.tick', {
          count: tickCount,
          intervalMs: HEAT_CAPACITY_AUTO_DEMO_ZEROING_ACTION_DURATION_MS / tickCount,
          itemDurationMs: profile.itemDurationMs,
          itemFadeInMs: profile.itemFadeInMs,
          itemFadeOutMs: profile.itemFadeOutMs,
          playbackRate: knobDelta > 0 ? 1.02 : 0.98,
          voiceGroup: 'heatCapacity.zeroKnob',
          fadeInMs: 6,
        });
      } else if (state.pressureZeroAdjustMode === 'fineWheel') {
        knobAccumulatorRef.current.reset();
        knobLastChangeAtRef.current = null;
        knobSmoothedSpeedRef.current = 0;
        void engine.playOneShot('heatCapacity.zeroKnob.tick', {
          playbackRate: knobDelta > 0 ? 1.02 : 0.98,
          voiceGroup: 'heatCapacity.zeroKnob',
        });
      } else if (state.pressureZeroAdjustMode === 'coarseDrag') {
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
          void engine.playBurst('heatCapacity.zeroKnob.tick', {
            count: tickCount,
            intervalMs,
            itemDurationMs,
            itemFadeInMs: profile.itemFadeInMs,
            itemFadeOutMs: profile.itemFadeOutMs,
            playbackRate: knobDelta > 0 ? 1.02 : 0.98,
            voiceGroup: 'heatCapacity.zeroKnob',
            fadeInMs: 4,
          });
        }
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
      void engine.playOneShot('heatCapacity.record.write', {
        playbackRate: 1.1,
        voiceGroup: 'heatCapacity.recordWriting',
        replaceGroup: true,
        crossfadeMs: 30,
        fadeInMs: 30,
        maxStartDelayMs: 100,
      });
    }

    if (
      state.pumpPulseId > previous.pumpPulseId &&
      rateLimiterRef.current.accept('heatCapacity.pumpBulb.stroke', HEAT_CAPACITY_PUMP_BULB_MIN_INTERVAL_MS)
    ) {
      const variation = getHeatCapacityPumpBulbVariation(Math.random(), Math.random());
      void engine.playOneShot('heatCapacity.pumpBulb.stroke', {
        ...variation,
        voiceGroup: 'heatCapacity.pumpBulb',
        replaceGroup: true,
        crossfadeMs: 15,
        maxStartDelayMs: 80,
      });
    }
  }, [
    engine,
    state.powerOn,
    state.experimentMode,
    state.pressureZeroAdjustMode,
    state.pressureZeroKnobAngle,
    state.pumpPulseId,
    state.recordPulseId,
    state.pumpValveOpen,
    state.resetKey,
    state.stopcockAngleDeg,
  ]);

  useEffect(() => {
    const releaseSound = releaseSoundRef.current;
    if (!releaseSound) return;
    if (shouldPlayHeatCapacityReleaseSound({
      outwardFlowActive: state.outwardReleaseFlowActive,
      paused: state.paused,
      pressureDeltaKPa: state.pressureDeltaKPa,
      audioEnabled: settings.enabled,
    })) {
      releaseSound.start(state.pressureDeltaKPa);
      releaseSound.update(state.pressureDeltaKPa);
      return;
    }
    releaseSound.stop();
  }, [
    settings.enabled,
    state.outwardReleaseFlowActive,
    state.paused,
    state.pressureDeltaKPa,
    state.sceneFileId,
  ]);

  useEffect(() => () => {
    releaseSoundRef.current?.dispose();
    rateLimiterRef.current.reset();
    knobAccumulatorRef.current.reset();
    knobLastChangeAtRef.current = null;
    knobSmoothedSpeedRef.current = 0;
    rollbackPumpValveVariantRef.current.clear();
  }, []);

  return { playGuideRollbackCue };
};
