import { useMemo } from 'react';
import type { ConsoleLog, ConsoleTab, LogKind } from './workbenchConsolePresentation.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { IdealGasAnalysis } from '../../domain/idealGas/idealGasExperiment.ts';
import { getRelationLabel } from '../../domain/idealGas/idealGasExperiment.ts';
import { getLocalizedStatusValue } from './workbenchPresentationFormatting.ts';
import type { WorkbenchCopy } from './workbenchStudioCopy.ts';
export const useWorkbenchConsoleProjection = (ports: { logs: ConsoleLog[]; consoleTab: ConsoleTab; activeFile: WorkbenchFileState; idealAnalysis: Pick<IdealGasAnalysis, 'verdictState'> | null; isWorkbenchEmpty: boolean; workbenchCopy: WorkbenchCopy; }) => {
 const { logs, consoleTab, activeFile, idealAnalysis, isWorkbenchEmpty, workbenchCopy } = ports;
 const displayedLogs = useMemo(
    () => (
      consoleTab === 'warnings'
        ? logs.filter((log) => log.kind === 'warning' || log.kind === 'error')
        : logs
    ),
    [consoleTab, logs],
  );
 const consoleSummary = useMemo(() => {
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
            : workbenchCopy.status.noRuntime,
    };
  }, [activeFile, idealAnalysis?.verdictState, isWorkbenchEmpty, logs, workbenchCopy]);
 return { displayedLogs, consoleSummary };
};
