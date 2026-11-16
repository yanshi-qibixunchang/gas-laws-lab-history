import { PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM } from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import { EXPERIMENT_PROGRESS_COPY, getHeatGroupCompletionLabel, getPistonFreeAcquisitionSummary, type ProgressLanguage } from './experimentProgressPresentation.ts';
import { getHeatCapacityRealtimeCopy } from './workbenchHeatCapacityRealtimeCopy.ts';
import { getHeatCapacityFreeDisplayPhase } from './workbenchHeatCapacityFreeAttemptState.ts';
import { isHeatCapacityPhysicalKernelMode } from './workbenchHeatCapacityInstrumentState.ts';
import { useMemo } from 'react';
import type { ConsoleLog, ConsoleTab, LogKind } from './workbenchConsolePresentation.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { IdealGasAnalysis } from '../../domain/idealGas/idealGasExperiment.ts';
import { getRelationLabel } from '../../domain/idealGas/idealGasExperiment.ts';
import { getLocalizedStatusValue } from './workbenchPresentationFormatting.ts';
import type { WorkbenchCopy } from './workbenchStudioCopy.ts';
export const useWorkbenchConsoleProjection = (ports: { language: ProgressLanguage; logs: ConsoleLog[]; consoleTab: ConsoleTab; activeFile: WorkbenchFileState; idealAnalysis: Pick<IdealGasAnalysis, 'verdictState'> | null; isWorkbenchEmpty: boolean; workbenchCopy: WorkbenchCopy; }) => {
 const { language, logs, consoleTab, activeFile, idealAnalysis, isWorkbenchEmpty, workbenchCopy } = ports;
 const displayedLogs = useMemo(
    () => (
      consoleTab === 'warnings'
        ? logs.filter((log) => log.kind === 'warning' || log.kind === 'error')
        : logs
    ),
    [consoleTab, logs],
  );
 const consoleSummary = useMemo(() => {
    const copy = EXPERIMENT_PROGRESS_COPY[language];
    const experimentRuntime = (() => {
      if (activeFile.kind === 'heatCapacity') {
        const mode = activeFile.heatCapacityMode;
        const heatCopy = getHeatCapacityRealtimeCopy(language);
        const displayPhase = isHeatCapacityPhysicalKernelMode(mode)
          ? getHeatCapacityFreeDisplayPhase(activeFile) : activeFile.heatCapacityPhase;
        const phase = heatCopy.phaseLabels[displayPhase as keyof typeof heatCopy.phaseLabels] ?? heatCopy.phaseLabels.fallback;
        return `${copy.heat} / ${mode ? copy[mode] : copy.setup} / ${getHeatGroupCompletionLabel(activeFile, language) ?? phase}`;
      }
      if (activeFile.kind === 'heatCapacityPistonOscillation') {
        const free = activeFile.pistonOscillationFreeSession;
        const guide = activeFile.pistonOscillationGuideSession;
        const summary = getPistonFreeAcquisitionSummary(free);
        const demo = activeFile.pistonOscillationDemoSession;
        const guideSelected = guide.status === 'active'
          || (guide.status === 'completed' && !guide.completionExited);
        let mode = copy.setup as string;
        let state = copy.ready as string;
        if (free.status === 'active') {
          mode = copy.free;
          state = free.dataProcessing?.status === 'completed'
            ? copy.completed
            : summary.complete
              ? `${copy.acquired(summary.total)} · ${copy.calculation}`
              : summary.total ? `${Math.min(summary.total, free.measurementIndex + 1)}/${summary.total}` : copy.setup;
        } else if (guideSelected) {
          mode = copy.guide;
          const total = PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM.length;
          const acquired = PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM.every((_, index) =>
            guide.savedMeasurements.some(record => record.measurementIndex === index));
          state = guide.status === 'completed' ? copy.completed
            : acquired ? `${copy.acquired(total)} · ${copy.calculation}`
            : `${guide.measurementIndex + 1}/${total}`;
        } else if (demo.status !== 'idle') {
          mode = copy.demo;
          state = demo.status === 'completed' ? copy.completed
            : demo.status === 'running' ? workbenchCopy.status.runStates.running
            : workbenchCopy.status.runStates.paused;
        } else if (free.status === 'paused') {
          mode = copy.free;
          state = workbenchCopy.status.runStates.paused;
        }
        return `${copy.piston} / ${mode} / ${state}`;
      }
      return workbenchCopy.status.noRuntime;
    })();
    const counts = logs.reduce<Record<LogKind, number>>(
      (nextCounts, log) => ({
        ...nextCounts,
        [log.kind]: nextCounts[log.kind] + 1,
      }),
      { info: 0, warning: 0, success: 0, error: 0 },
    );
    return {
      counts,
      latest: logs[logs.length - 1] ?? null,
      runtime: isWorkbenchEmpty
        ? workbenchCopy.status.noRuntime
        : activeFile.kind === 'standard'
          ? workbenchCopy.status.standardRuntime
          : activeFile.kind === 'ideal'
            ? workbenchCopy.status.idealRuntime(
                getRelationLabel(activeFile.relation),
                getLocalizedStatusValue(idealAnalysis?.verdictState ?? 'insufficient', workbenchCopy),
              )
            : experimentRuntime,
    };
  }, [activeFile, idealAnalysis?.verdictState, isWorkbenchEmpty, language, logs, workbenchCopy]);
 return { displayedLogs, consoleSummary };
};
