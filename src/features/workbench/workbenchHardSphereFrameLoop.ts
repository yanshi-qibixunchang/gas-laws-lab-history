import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { StandardEngineRuntime } from './workbenchSimulationRuntimeTypes.ts';
import { snapshotParticles } from './workbenchHardSphereRuntimeRegistry.ts';
import { createIdealGasExperimentPoint, getIdealGasAnalysis, getRelationLabel, getRelationVariableNumericValue } from '../../domain/idealGas/idealGasExperiment.ts';
import { getIdealVerificationState } from './workbenchIdealParameterState.ts';
import { formatMetric } from './workbenchPresentationFormatting.ts';
import { workbenchCopies } from './workbenchStudioCopy.ts';
import type { WorkbenchMutableRef as Ref, WorkbenchLogWriter } from './workbenchActionPorts.ts';
export const SIMULATION_TICK_INTERVAL_MS = 16;
export interface WorkbenchHardSphereFrameLoopPorts {
 window: Pick<Window, 'setTimeout'>;
 desktopExitQuiescedRef: Ref<boolean>;
 filesRef: Ref<WorkbenchFileState[]>;
 standardRuntimeRef: Ref<Record<string, StandardEngineRuntime>>;
 idealRuntimeRef: Ref<Record<string, StandardEngineRuntime>>;
 updateFileById: (id: string, update: (file: WorkbenchFileState) => WorkbenchFileState) => void;
 updateRuntimeFileById: (id: string, update: (file: WorkbenchFileState) => WorkbenchFileState) => void;
 cancelRuntimeFrame: (id: string) => void;
 pushLog: WorkbenchLogWriter;
}
/** Timer ticks read current files; only completed results enter the semantic commit lane. */
export const createWorkbenchHardSphereFrameLoop = (ports: WorkbenchHardSphereFrameLoopPorts) => {
 const { window, desktopExitQuiescedRef, filesRef, standardRuntimeRef, idealRuntimeRef, updateFileById, updateRuntimeFileById, cancelRuntimeFrame, pushLog } = ports;
 const pauseRunningFilesExcept = (fileId: string) => {
    const runningFiles = filesRef.current.filter(
      (file) => file.id !== fileId && file.runState === 'running',
    );

    runningFiles.forEach((file) => {
      cancelRuntimeFrame(file.id);
      updateFileById(file.id, (currentFile) => ({
        ...currentFile,
        runState: 'paused',
        updatedAt: Date.now(),
      }));
        pushLog(
          (language) => workbenchCopies[language].logs.autoPausedSingleRuntime(file.name),
          'warning',
        );
    });
  };

 const scheduleStandardFrame = (fileId: string) => {
    if (desktopExitQuiescedRef.current) return;
    const runtime = standardRuntimeRef.current[fileId];
    if (!runtime || runtime.simulationTimerId !== null) return;

    runtime.simulationTimerId = window.setTimeout(() => {
      runtime.simulationTimerId = null;
      runStandardFrame(fileId);
    }, SIMULATION_TICK_INTERVAL_MS);
  };

 const runStandardFrame = (fileId: string) => {
    if (desktopExitQuiescedRef.current) return;
    const file = filesRef.current.find((candidate) => candidate.id === fileId);
    const runtime = file ? standardRuntimeRef.current[file.id] : null;
    if (!file || file.kind !== 'standard' || !runtime || file.runState !== 'running') return;

    for (let stepIndex = 0; stepIndex < 5; stepIndex += 1) {
      runtime.engine.step();
      if (
        runtime.engine.time >= runtime.engine.params.equilibriumTime &&
        runtime.engine.time < runtime.engine.params.equilibriumTime + runtime.engine.params.statsDuration
      ) {
        runtime.engine.collectSamples();
      }
    }

    const stats = runtime.engine.getStats();
    const particles = snapshotParticles(runtime.engine);
    runtime.frameCount += 1;
    const shouldRefreshChart = runtime.frameCount % 5 === 0 || stats.phase === 'finished';
    const chartData = shouldRefreshChart ? runtime.engine.getHistogramData(false) : file.chartData;
    const finished = stats.phase === 'finished';
    const finalChartData = finished ? runtime.engine.getHistogramData(true) : file.finalChartData;

    const updateStandardFrameFile = finished
      ? updateFileById
      : updateRuntimeFileById;
    updateStandardFrameFile(file.id, (currentFile) => {
      if (currentFile.kind !== 'standard') return currentFile;
      return {
        ...currentFile,
        runState: finished ? 'finished' : 'running',
        stats,
        chartData,
        finalChartData,
        particles,
        hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
        updatedAt: Date.now(),
      };
    });

    if (finished) {
      cancelRuntimeFrame(file.id);
      pushLog(
        (language) => workbenchCopies[language].logs.standardFinished(file.name),
        'success',
      );
      pushLog(
        (language) => workbenchCopies[language].logs.standardResultsReady(file.name),
        'success',
      );
      return;
    }

    scheduleStandardFrame(file.id);
  };

 const scheduleIdealFrame = (fileId: string) => {
    if (desktopExitQuiescedRef.current) return;
    const runtime = idealRuntimeRef.current[fileId];
    if (!runtime || runtime.simulationTimerId !== null) return;

    runtime.simulationTimerId = window.setTimeout(() => {
      runtime.simulationTimerId = null;
      runIdealFrame(fileId);
    }, SIMULATION_TICK_INTERVAL_MS);
  };

 const runIdealFrame = (fileId: string) => {
    if (desktopExitQuiescedRef.current) return;
    const file = filesRef.current.find((candidate) => candidate.id === fileId);
    const runtime = file ? idealRuntimeRef.current[file.id] : null;
    if (!file || file.kind !== 'ideal' || !runtime || file.runState !== 'running') return;

    for (let stepIndex = 0; stepIndex < 5; stepIndex += 1) {
      runtime.engine.step();
      if (
        runtime.engine.time >= runtime.engine.params.equilibriumTime &&
        runtime.engine.time < runtime.engine.params.equilibriumTime + runtime.engine.params.statsDuration
      ) {
        runtime.engine.collectSamples();
      }
    }

    const stats = runtime.engine.getStats();
    const particles = snapshotParticles(runtime.engine);
    runtime.frameCount += 1;
    const shouldRefreshChart = runtime.frameCount % 5 === 0 || stats.phase === 'finished';
    const chartData = shouldRefreshChart ? runtime.engine.getHistogramData(false) : file.chartData;
    const finished = stats.phase === 'finished';

    if (!finished) {
      const latestPressureSummary = runtime.engine.getPressureMeasurementSummary();
      updateRuntimeFileById(file.id, (currentFile) => {
        if (currentFile.kind !== 'ideal') return currentFile;
        return {
          ...currentFile,
          runState: 'running',
          stats,
          chartData,
          latestPressureSummary,
          particles,
          hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
          verificationState: 'collecting',
          updatedAt: Date.now(),
        };
      });
      scheduleIdealFrame(file.id);
      return;
    }

    runtime.engine.flushPressureMeasurement();
    const latestPressureSummary = runtime.engine.getPressureMeasurementSummary();
    const recordedPoint = createIdealGasExperimentPoint(file.relation, file.activeParams, latestPressureSummary);

    updateFileById(file.id, (currentFile) => {
      if (currentFile.kind !== 'ideal') return currentFile;

      const nextPointsByRelation = recordedPoint
        ? {
            ...currentFile.pointsByRelation,
            [currentFile.relation]: [...currentFile.pointsByRelation[currentFile.relation], recordedPoint],
          }
        : currentFile.pointsByRelation;
      const analysis = getIdealGasAnalysis(currentFile.relation, nextPointsByRelation, currentFile.activeParams);
      const verificationState = getIdealVerificationState(analysis);

      return {
        ...currentFile,
        runState: 'finished',
        stats,
        chartData: runtime.engine.getHistogramData(false),
        latestPressureSummary,
        particles,
        hardSphereEngineSnapshot: runtime.engine.createSnapshot(),
        pointsByRelation: nextPointsByRelation,
        verificationState,
        historyUnlocked: analysis.isVerified,
        updatedAt: Date.now(),
      };
    });

    cancelRuntimeFrame(file.id);
    pushLog(
      (language) => recordedPoint
        ? workbenchCopies[language].logs.idealPointRecorded(file.name, getRelationLabel(file.relation), formatMetric(getRelationVariableNumericValue(file.relation, file.activeParams), 3))
        : workbenchCopies[language].logs.idealPointMissingSummary(file.name),
      recordedPoint ? 'success' : 'warning',
    );
  };
 return { pauseRunningFilesExcept, scheduleStandardFrame, runStandardFrame, scheduleIdealFrame, runIdealFrame };
};
