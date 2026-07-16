import { PhysicsEngine } from '../../domain/hardSphere/PhysicsEngine.ts';
import {
  sanitizeHardSphereSimulationParams,
  validateHardSphereSimulationParams,
} from '../../domain/hardSphere/hardSphereSimulationValidation.ts';
import type { WorkbenchFileState } from './workbenchState.ts';

type StandardOrIdealWorkbenchFile = Extract<
  WorkbenchFileState,
  { kind: 'standard' | 'ideal' }
>;

const snapshotParticles = (engine: PhysicsEngine) => (
  engine.particles.map((particle) => ({ ...particle }))
);

export const projectHardSphereEngineOntoWorkspaceFile = <
  File extends StandardOrIdealWorkbenchFile,
>(
  file: File,
  engine: PhysicsEngine,
): File => ({
  ...file,
  stats: engine.getStats(),
  chartData: engine.getHistogramData(false),
  particles: snapshotParticles(engine),
  hardSphereEngineSnapshot: engine.createSnapshot(),
  ...(file.kind === 'ideal'
    ? { latestPressureSummary: engine.getPressureMeasurementSummary() }
    : {}),
});

export const repairMissingHardSphereEngineSnapshot = (
  file: StandardOrIdealWorkbenchFile,
): StandardOrIdealWorkbenchFile => {
  if (file.hardSphereEngineSnapshot !== null) return file;
  const hasLiveProjection = file.particles.length > 0 ||
    file.stats.phase !== 'idle' ||
    file.chartData.speed.length > 0 ||
    file.chartData.energy.length > 0 ||
    file.chartData.energyLog.length > 0 ||
    file.chartData.tempHistory.length > 0 ||
    (file.kind === 'ideal' && file.latestPressureSummary !== null);
  const runtimeParams = file.kind === 'ideal' ? file.activeParams : file.appliedParams;
  const runtimeParamsValid = validateHardSphereSimulationParams(runtimeParams).valid;
  if (!hasLiveProjection && runtimeParamsValid) return file;
  const safeRuntimeParams = runtimeParamsValid
    ? runtimeParams
    : sanitizeHardSphereSimulationParams(runtimeParams);
  const resetProjection = {
    stats: {
      time: 0,
      temperature: 0,
      pressure: 0,
      meanSpeed: 0,
      rmsSpeed: 0,
      isEquilibrated: false,
      progress: 0,
      phase: 'idle' as const,
    },
    chartData: {
      speed: [],
      energy: [],
      energyLog: [],
      tempHistory: [],
    },
    particles: [],
    hardSphereEngineSnapshot: null,
    runState: 'needs-reset' as const,
  };
  if (file.kind === 'standard') {
    return {
      ...file,
      ...resetProjection,
      appliedParams: { ...safeRuntimeParams },
    };
  }
  return {
    ...file,
    ...resetProjection,
    appliedParams: { ...safeRuntimeParams },
    activeParams: { ...safeRuntimeParams },
    latestPressureSummary: null,
    needsReset: true,
  };
};
