import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  applyHeatCapacityAction,
  HARD_SPHERE_GAMMA,
  type HeatCapacityAction,
  type HeatCapacityInstrumentPartId,
  type HeatCapacityState,
} from '../../utils/heatCapacityExperiment.ts';
import InstrumentProceduralModel from './InstrumentProceduralModel.tsx';

interface HeatCapacityExperimentProps {
  state: HeatCapacityState;
  onAction: (action: HeatCapacityAction) => void;
}

const formatMetric = (value: number | null | undefined, digits = 2) => (
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--'
);

const phaseLabels: Record<HeatCapacityState['phase'], string> = {
  equalizing: 'Equalize with environment',
  pumping: 'Pump hard-sphere gas',
  stabilizingP1: 'Stabilize p1',
  recordP1: 'Record p1',
  releasing: 'Fast release',
  recovering: 'Thermal recovery',
  recordP2: 'Record p2',
  completed: 'Completed',
};

const getPrimaryInstruction = (state: HeatCapacityState) => {
  if (state.phase === 'equalizing') return 'Record p0 after the square vessel is open to the environment.';
  if (state.phase === 'pumping') return 'Use the pump to pressurize the hard-sphere gas, then wait for p1 stability.';
  if (state.phase === 'stabilizingP1') return 'Let the high-pressure gas return to ambient temperature before recording p1.';
  if (state.phase === 'recordP1') return 'Record the stable high-pressure p1 state.';
  if (state.phase === 'releasing') return 'Open C2 briefly to approximate adiabatic expansion.';
  if (state.phase === 'recovering') return 'Wait until the gas returns to the ambient temperature.';
  if (state.phase === 'recordP2') return 'Record p2 after constant-volume thermal recovery.';
  return 'Review gamma and repeat the guided cycle if needed.';
};

const ActionButton: React.FC<{
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}> = ({ children, disabled, onClick }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-45"
  >
    {children}
  </button>
);

const HeatCapacityExperiment: React.FC<HeatCapacityExperimentProps> = ({ state, onAction }) => {
  const handlePartActivate = (partId: HeatCapacityInstrumentPartId) => {
    if (partId === 'Hit_Pump' && state.phase === 'pumping') {
      onAction({ type: 'pump', strokes: 1 });
      return;
    }
    if (partId === 'Hit_C2' && state.phase === 'releasing') {
      onAction({ type: 'release', durationMs: 420, closeDelayMs: 0 });
    }
  };

  return (
    <div className="flex h-full min-h-[520px] flex-col gap-3 text-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white/85 p-3 shadow-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            Hard-sphere heat capacity ratio
          </div>
          <h2 className="mt-1 text-base font-bold text-slate-900">Monatomic hard-sphere gas, gamma = 5/3</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">{getPrimaryInstruction(state)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div className="rounded-md bg-slate-50 px-2.5 py-2">
            <div className="text-slate-500">phase</div>
            <div className="font-semibold text-slate-900">{phaseLabels[state.phase]}</div>
          </div>
          <div className="rounded-md bg-slate-50 px-2.5 py-2">
            <div className="text-slate-500">pressure</div>
            <div className="font-semibold text-slate-900">{formatMetric(state.pressure)} kPa</div>
          </div>
          <div className="rounded-md bg-slate-50 px-2.5 py-2">
            <div className="text-slate-500">temperature</div>
            <div className="font-semibold text-slate-900">{formatMetric(state.temperature, 3)}</div>
          </div>
          <div className="rounded-md bg-slate-50 px-2.5 py-2">
            <div className="text-slate-500">theory</div>
            <div className="font-semibold text-slate-900">{HARD_SPHERE_GAMMA.toFixed(3)}</div>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(320px,1fr)_auto] gap-3">
        <div className="min-h-[320px] overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-sm">
          <Canvas camera={{ position: [6, 4.4, 7.5], fov: 40 }} dpr={[1, 1.5]}>
            <color attach="background" args={['#0f172a']} />
            <ambientLight intensity={0.85} />
            <directionalLight position={[5, 7, 4]} intensity={1.25} />
            <InstrumentProceduralModel
              state={state.instrument}
              particleCount={state.particleCount}
              vesselLength={state.vesselLength}
              onPartActivate={handlePartActivate}
            />
            <OrbitControls enableDamping makeDefault target={[0, 0.75, 0]} />
          </Canvas>
        </div>

        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white/90 p-3 shadow-sm lg:grid-cols-[minmax(280px,1fr)_minmax(260px,0.85fr)]">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900">Guided operations</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Readings are generated from the instrument state. The manual p0/p1/p2 entry mode is reserved for a later batch.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-4">
              <ActionButton disabled={state.phase !== 'equalizing'} onClick={() => onAction({ type: 'recordP0' })}>
                Record p0
              </ActionButton>
              <ActionButton disabled={state.phase !== 'pumping'} onClick={() => onAction({ type: 'pump', strokes: 2 })}>
                Pump
              </ActionButton>
              <ActionButton disabled={state.phase !== 'pumping' && state.phase !== 'stabilizingP1'} onClick={() => onAction({ type: 'stabilizeP1' })}>
                Stabilize p1
              </ActionButton>
              <ActionButton disabled={state.phase !== 'recordP1'} onClick={() => onAction({ type: 'recordP1' })}>
                Record p1
              </ActionButton>
              <ActionButton disabled={state.phase !== 'releasing'} onClick={() => onAction({ type: 'release', durationMs: 420, closeDelayMs: 0 })}>
                Fast release
              </ActionButton>
              <ActionButton disabled={state.phase !== 'recovering'} onClick={() => onAction({ type: 'recover' })}>
                Recover
              </ActionButton>
              <ActionButton disabled={state.phase !== 'recordP2'} onClick={() => onAction({ type: 'recordP2' })}>
                Record p2
              </ActionButton>
              <ActionButton onClick={() => onAction({ type: 'reset' })}>Reset</ActionButton>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 text-xs">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <span className="text-slate-500">p0</span>
              <span className="font-semibold text-slate-900">{formatMetric(state.recorded.p0)} kPa</span>
              <span className="text-slate-500">p1</span>
              <span className="font-semibold text-slate-900">{formatMetric(state.recorded.p1)} kPa</span>
              <span className="text-slate-500">p2</span>
              <span className="font-semibold text-slate-900">{formatMetric(state.recorded.p2)} kPa</span>
              <span className="text-slate-500">gamma</span>
              <span className="font-semibold text-slate-900">{formatMetric(state.result?.gamma, 3)}</span>
              <span className="text-slate-500">relative error</span>
              <span className="font-semibold text-slate-900">{formatMetric(state.result?.relativeErrorPercent, 2)}%</span>
            </div>
          </div>
          {state.lastError && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-medium text-amber-800">
              {state.lastError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const reduceHeatCapacityExperiment = applyHeatCapacityAction;

export default HeatCapacityExperiment;
