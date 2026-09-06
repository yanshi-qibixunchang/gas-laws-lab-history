import { PhysicsEngine, type PhysicsEngineSnapshotV2 } from '../../domain/hardSphere/PhysicsEngine.ts';
import type { SimulationParams, Particle } from '../../shared/types.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import { cloneParams } from './workbenchFileState.ts';
import { areWorkbenchParamsEqual } from './workbenchParameterState.ts';
import type { StandardEngineRuntime } from './workbenchSimulationRuntimeTypes.ts';
import type { WorkbenchMutableRef as Ref } from './workbenchActionPorts.ts';
export const snapshotParticles = (engine: PhysicsEngine): Particle[] => (
  engine.particles.map((particle) => ({ ...particle }))
);
export interface WorkbenchHardSphereRuntimeRegistryPorts {
  window: Pick<Window, 'clearTimeout'>;
  filesRef: Ref<WorkbenchFileState[]>;
  standardRuntimeRef: Ref<Record<string, StandardEngineRuntime>>;
  idealRuntimeRef: Ref<Record<string, StandardEngineRuntime>>;
  updateFileById: (id: string, update: (file: WorkbenchFileState) => WorkbenchFileState) => void;
}
/** Uses the shell's existing engine refs as the only runtime registry. */
export const createWorkbenchHardSphereRuntimeRegistry = (ports: WorkbenchHardSphereRuntimeRegistryPorts) => {
  const { window, filesRef, standardRuntimeRef, idealRuntimeRef, updateFileById } = ports;
  const cancelRuntimeFrame = (fileId: string) => {
    const runtime = standardRuntimeRef.current[fileId] ?? idealRuntimeRef.current[fileId];
    if (!runtime || runtime.simulationTimerId === null) return;

    window.clearTimeout(runtime.simulationTimerId);
    runtime.simulationTimerId = null;
  };

  const createHardSphereEngine = (
    params: SimulationParams,
    snapshot: PhysicsEngineSnapshotV2 | null,
  ): PhysicsEngine => (
    snapshot && areWorkbenchParamsEqual(snapshot.params, params)
      ? PhysicsEngine.fromSnapshot(snapshot)
      : new PhysicsEngine(cloneParams(params))
  );

  const createStandardRuntime = (file: WorkbenchFileState): StandardEngineRuntime | null => {
    if (file.kind !== 'standard') return null;
    return {
      engine: createHardSphereEngine(file.appliedParams, file.hardSphereEngineSnapshot),
      frameCount: 0,
      simulationTimerId: null,
    };
  };

  const createIdealRuntime = (file: WorkbenchFileState): StandardEngineRuntime | null => {
    if (file.kind !== 'ideal') return null;

    return {
      engine: createHardSphereEngine(file.activeParams, file.hardSphereEngineSnapshot),
      frameCount: 0,
      simulationTimerId: null,
    };
  };

  const prepareReopenedWorkbenchFile = (file: WorkbenchFileState): WorkbenchFileState => {
    const baseFile = {
      ...file,
      runState: file.kind === 'heatCapacity'
        ? file.runState
        : file.runState === 'running' ? 'paused' : file.runState,
      updatedAt: Date.now(),
      lastOpenedAt: Date.now(),
    };

    if (baseFile.kind !== 'standard' && baseFile.kind !== 'ideal') {
      return baseFile;
    }

    const runtime = baseFile.kind === 'standard'
      ? createStandardRuntime(baseFile)
      : createIdealRuntime(baseFile);
    if (!runtime) return baseFile;

    if (baseFile.kind === 'standard') {
      standardRuntimeRef.current[baseFile.id] = runtime;
    } else {
      idealRuntimeRef.current[baseFile.id] = runtime;
    }

    return {
      ...baseFile,
      stats: runtime.engine.getStats(),
      chartData: runtime.engine.getHistogramData(false),
      particles: snapshotParticles(runtime.engine),
      hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
      ...(baseFile.kind === 'ideal' ? { latestPressureSummary: runtime.engine.getPressureMeasurementSummary() } : {}),
    };
  };

  const getStandardRuntime = (file: WorkbenchFileState): StandardEngineRuntime | null => {
    if (file.kind !== 'standard') return null;

    const existingRuntime = standardRuntimeRef.current[file.id];
    if (existingRuntime && areWorkbenchParamsEqual(existingRuntime.engine.params, file.appliedParams)) {
      return existingRuntime;
    }

    cancelRuntimeFrame(file.id);
    const nextRuntime = createStandardRuntime(file);
    if (nextRuntime) {
      standardRuntimeRef.current[file.id] = nextRuntime;
    }
    return nextRuntime;
  };

  const getIdealRuntime = (file: WorkbenchFileState): StandardEngineRuntime | null => {
    if (file.kind !== 'ideal') return null;

    const existingRuntime = idealRuntimeRef.current[file.id];
    if (existingRuntime && areWorkbenchParamsEqual(existingRuntime.engine.params, file.activeParams)) {
      return existingRuntime;
    }

    cancelRuntimeFrame(file.id);
    const nextRuntime = createIdealRuntime(file);
    if (nextRuntime) {
      idealRuntimeRef.current[file.id] = nextRuntime;
    }
    return nextRuntime;
  };

  const reconcileRuntimesAfterRestore = (restoredFiles: WorkbenchFileState[]) => {
    Object.keys(standardRuntimeRef.current).forEach((fileId) => {
      cancelRuntimeFrame(fileId);
    });
    Object.keys(idealRuntimeRef.current).forEach((fileId) => {
      cancelRuntimeFrame(fileId);
    });
    standardRuntimeRef.current = {};
    idealRuntimeRef.current = {};

    restoredFiles.forEach((file) => {
      if (file.kind === 'standard') {
        const runtime = createStandardRuntime(file);
        if (runtime) {
          standardRuntimeRef.current[file.id] = runtime;
        }
        return;
      }

      if (file.kind !== 'ideal') return;
      const runtime = createIdealRuntime(file);
      if (runtime) idealRuntimeRef.current[file.id] = runtime;
    });
  };

  const reconcileRuntimeAfterFileRestore = (file: WorkbenchFileState) => {
    cancelRuntimeFrame(file.id);
    delete standardRuntimeRef.current[file.id];
    delete idealRuntimeRef.current[file.id];
    if (file.kind !== 'standard' && file.kind !== 'ideal') return;
    const runtime = file.kind === 'standard' ? createStandardRuntime(file) : createIdealRuntime(file);
    if (!runtime) return;
    if (file.kind === 'standard') {
      standardRuntimeRef.current[file.id] = runtime;
    } else {
      idealRuntimeRef.current[file.id] = runtime;
    }
  };
  const initializeExistingRuntimes = () => {
    filesRef.current
      .forEach((file) => {
        if (file.kind !== 'standard' && file.kind !== 'ideal') return;
        const runtimeExists = file.kind === 'standard'
          ? Boolean(standardRuntimeRef.current[file.id])
          : Boolean(idealRuntimeRef.current[file.id]);
        if (runtimeExists) return;

        const runtime = file.kind === 'standard' ? createStandardRuntime(file) : createIdealRuntime(file);
        if (!runtime) return;

        if (file.kind === 'standard') {
          standardRuntimeRef.current[file.id] = runtime;
        } else {
          idealRuntimeRef.current[file.id] = runtime;
        }
        if (file.hardSphereEngineSnapshot !== null && file.particles.length > 0) return;

        updateFileById(file.id, (currentFile) => {
          const initializedFile = {
            ...currentFile,
            stats: runtime.engine.getStats(),
            chartData: runtime.engine.getHistogramData(false),
            particles: snapshotParticles(runtime.engine),
            hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
            updatedAt: Date.now(),
          };

          if (currentFile.kind !== 'ideal') return initializedFile;
          return {
            ...initializedFile,
            latestPressureSummary: runtime.engine.getPressureMeasurementSummary(),
          };
        });
      });
  };
  const disposeHardSphereRuntimeTimers = () => {
    Object.values(standardRuntimeRef.current).forEach((runtime) => {
      if (runtime.simulationTimerId !== null) {
        window.clearTimeout(runtime.simulationTimerId);
      }
    });
    Object.values(idealRuntimeRef.current).forEach((runtime) => {
      if (runtime.simulationTimerId !== null) {
        window.clearTimeout(runtime.simulationTimerId);
      }
    });
  };
  return { cancelRuntimeFrame, createStandardRuntime, createIdealRuntime, prepareReopenedWorkbenchFile, getStandardRuntime, getIdealRuntime, reconcileRuntimesAfterRestore, reconcileRuntimeAfterFileRestore, initializeExistingRuntimes, disposeHardSphereRuntimeTimers };
};
