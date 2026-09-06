import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { StandardEngineRuntime } from './workbenchSimulationRuntimeTypes.ts';
import type { SimulationParams } from '../../shared/types.ts';
import type { ApplyActiveFileParamsOptions } from './workbenchParameterActions.ts';
import { snapshotParticles } from './workbenchHardSphereRuntimeRegistry.ts';
import { getIdealGasAnalysis, getRelationLabel } from '../../domain/idealGas/idealGasExperiment.ts';
import { getIdealVerificationState } from './workbenchIdealParameterState.ts';
import { workbenchCopies } from './workbenchStudioCopy.ts';
import type { WorkbenchMutableRef as Ref, WorkbenchStateSetter as Setter, WorkbenchLogWriter } from './workbenchActionPorts.ts';
export interface WorkbenchExperimentRunActionPorts {
 getActiveFile: () => WorkbenchFileState;
 getParametersDirty: () => boolean;
 standardRuntimeRef: Ref<Record<string, StandardEngineRuntime>>;
 idealRuntimeRef: Ref<Record<string, StandardEngineRuntime>>;
 createStandardRuntime: (file: WorkbenchFileState) => StandardEngineRuntime | null;
 createIdealRuntime: (file: WorkbenchFileState) => StandardEngineRuntime | null;
 getStandardRuntime: (file: WorkbenchFileState) => StandardEngineRuntime | null;
 getIdealRuntime: (file: WorkbenchFileState) => StandardEngineRuntime | null;
 cancelRuntimeFrame: (id: string) => void;
 pauseRunningFilesExcept: (id: string) => void;
 scheduleStandardFrame: (id: string) => void;
 scheduleIdealFrame: (id: string) => void;
 prepareActiveFileForRun: () => boolean;
 applyActiveFileParams: (params?: SimulationParams, options?: ApplyActiveFileParamsOptions) => StandardEngineRuntime | null;
 updateActiveFile: (update: (file: WorkbenchFileState) => WorkbenchFileState) => void;
 flushWorkspaceAfterRunStateCommit: () => void;
 runHeatCapacityAutoDemo: () => void;
 pauseHeatCapacityAutoDemo: () => void;
 terminateHeatCapacityAutoDemo: () => void;
 setParameterErrors: Setter<string[]>;
 setSamplingPresetMenuOpen: Setter<boolean>;
 pushLog: WorkbenchLogWriter;
}
/** Run controls coordinate the existing engine, heat-capacity and persistence owners. */
export const createWorkbenchExperimentRunActions = (ports: WorkbenchExperimentRunActionPorts) => {
 const { standardRuntimeRef, idealRuntimeRef, createStandardRuntime, createIdealRuntime, getStandardRuntime, getIdealRuntime, cancelRuntimeFrame, pauseRunningFilesExcept, scheduleStandardFrame, scheduleIdealFrame, prepareActiveFileForRun, applyActiveFileParams, updateActiveFile, flushWorkspaceAfterRunStateCommit, runHeatCapacityAutoDemo, pauseHeatCapacityAutoDemo, terminateHeatCapacityAutoDemo, setParameterErrors, setSamplingPresetMenuOpen, pushLog } = ports;
 const runActiveFile = () => {
    const activeFile = ports.getActiveFile();
    const parametersDirty = ports.getParametersDirty();
    if (activeFile.kind === 'heatCapacityPistonOscillation') {
      setParameterErrors([]);
      setSamplingPresetMenuOpen(false);
      return;
    }
    if (activeFile.kind === 'heatCapacity') {
      if (parametersDirty) {
        applyActiveFileParams(undefined, { silent: true });
      }
      setParameterErrors([]);
      setSamplingPresetMenuOpen(false);
      runHeatCapacityAutoDemo();
      return;
    }

    if (!prepareActiveFileForRun()) {
      return;
    }

    setParameterErrors([]);
    setSamplingPresetMenuOpen(false);
    pauseRunningFilesExcept(activeFile.id);
    const runtime = activeFile.kind === 'standard'
      ? standardRuntimeRef.current[activeFile.id] ?? getStandardRuntime(activeFile)
      : idealRuntimeRef.current[activeFile.id] ?? getIdealRuntime(activeFile);
    if (!runtime) {
      pushLog(
        (language) => workbenchCopies[language].logs.runtimeCreateFailed(
          activeFile.name,
          activeFile.kind === 'standard'
            ? workbenchCopies[language].parameters.standardSimulation
            : workbenchCopies[language].parameters.idealSimulation,
        ),
        'error',
      );
      return;
    }

    updateActiveFile((file) => {
      const baseFile = {
        ...file,
        runState: 'running' as const,
        stats: runtime.engine.getStats(),
        chartData: runtime.engine.getHistogramData(false),
        particles: snapshotParticles(runtime.engine),
        hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
        updatedAt: Date.now(),
      };

      if (file.kind !== 'ideal') return baseFile;
      return {
        ...baseFile,
        latestPressureSummary: runtime.engine.getPressureMeasurementSummary(),
        verificationState: 'collecting' as const,
      };
    });
    pushLog(
      (language) => activeFile.kind === 'standard'
        ? workbenchCopies[language].logs.standardStarted(activeFile.name)
        : workbenchCopies[language].logs.idealStarted(activeFile.name, getRelationLabel(activeFile.relation)),
      'success',
    );
    if (activeFile.kind === 'standard') {
      scheduleStandardFrame(activeFile.id);
    } else {
      scheduleIdealFrame(activeFile.id);
    }
  };

 const pauseActiveFile = () => {
    const activeFile = ports.getActiveFile();
    if (activeFile.kind === 'heatCapacityPistonOscillation') return;
    if (activeFile.kind === 'heatCapacity') {
      pauseHeatCapacityAutoDemo();
      return;
    }

    cancelRuntimeFrame(activeFile.id);
    updateActiveFile((file) => ({
      ...file,
      runState: file.runState === 'running' ? 'paused' : file.runState,
      updatedAt: Date.now(),
    }));
    flushWorkspaceAfterRunStateCommit();
    pushLog(
      (language) => workbenchCopies[language].logs.simulationPaused(
        activeFile.name,
        activeFile.kind === 'standard'
          ? workbenchCopies[language].parameters.standardSimulation
          : workbenchCopies[language].parameters.idealSimulation,
      ),
      'warning',
    );
  };

 const toggleActiveFileRunState = () => {
    const activeFile = ports.getActiveFile();
    if (activeFile.runState === 'running') {
      pauseActiveFile();
      return;
    }

    runActiveFile();
  };

 const stopActiveFile = () => {
    const activeFile = ports.getActiveFile();
    cancelRuntimeFrame(activeFile.id);

    if (activeFile.kind === 'heatCapacityPistonOscillation') return;

    if (activeFile.kind === 'heatCapacity') {
      terminateHeatCapacityAutoDemo();
      flushWorkspaceAfterRunStateCommit();
      return;
    }

    if (activeFile.kind === 'standard') {
      const nextRuntime = createStandardRuntime(activeFile);
      if (!nextRuntime) return;

      standardRuntimeRef.current[activeFile.id] = nextRuntime;
      updateActiveFile((file) => {
        if (file.kind !== 'standard') return file;
        return {
          ...file,
          runState: 'idle',
          stats: nextRuntime.engine.getStats(),
          chartData: nextRuntime.engine.getHistogramData(false),
          finalChartData: null,
          particles: snapshotParticles(nextRuntime.engine),
          hardSphereEngineSnapshot: nextRuntime.engine.createSnapshot(),
          updatedAt: Date.now(),
        };
      });
      flushWorkspaceAfterRunStateCommit();
      pushLog(
        (language) => workbenchCopies[language].logs.standardTerminated(activeFile.name),
        'warning',
      );
      return;
    }

    const nextRuntime = createIdealRuntime(activeFile);
    if (!nextRuntime) return;

    idealRuntimeRef.current[activeFile.id] = nextRuntime;
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      const analysis = getIdealGasAnalysis(file.relation, file.pointsByRelation, file.activeParams);
      return {
        ...file,
        runState: 'idle',
        stats: nextRuntime.engine.getStats(),
        chartData: nextRuntime.engine.getHistogramData(false),
        finalChartData: null,
        latestPressureSummary: nextRuntime.engine.getPressureMeasurementSummary(),
        needsReset: false,
        particles: snapshotParticles(nextRuntime.engine),
        hardSphereEngineSnapshot: nextRuntime.engine.createSnapshot(),
        verificationState: getIdealVerificationState(analysis),
        historyUnlocked: analysis.isVerified,
        updatedAt: Date.now(),
      };
    });
    flushWorkspaceAfterRunStateCommit();
    pushLog(
      (language) => workbenchCopies[language].logs.idealTerminated(activeFile.name),
      'warning',
    );
  };
 return { runActiveFile, pauseActiveFile, toggleActiveFileRunState, stopActiveFile };
};
