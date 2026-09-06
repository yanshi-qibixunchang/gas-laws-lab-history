import { useRef, useState } from 'react';
import type { WorkbenchHeatCapacityRefreshJsonObject } from './workbenchHeatCapacityRefreshSession.ts';
import { getHeatCapacityRefreshBoolean, getHeatCapacityRefreshString, getHeatCapacityRefreshNumber } from './workbenchHeatCapacityUiCheckpoint.ts';
import { resolveInitialWorkbenchConsoleLogs } from './workbenchConsoleState.ts';
import type { ConsoleLog, ConsoleTab } from './workbenchConsolePresentation.ts';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
export const useWorkbenchConsoleState = (ports: { initialHeatCapacityRefreshLayout: WorkbenchHeatCapacityRefreshJsonObject; initialLanguage: WorkbenchLanguagePreference; getTutorialLogs: () => ConsoleLog[] | null; }) => {
 const { initialHeatCapacityRefreshLayout, initialLanguage, getTutorialLogs } = ports;
 const [logs, setLogs] = useState<ConsoleLog[]>(() => resolveInitialWorkbenchConsoleLogs(initialHeatCapacityRefreshLayout.logs, initialLanguage, getTutorialLogs));
 const [consoleTab, setConsoleTab] = useState<ConsoleTab>(() => {
    const restored = getHeatCapacityRefreshString(initialHeatCapacityRefreshLayout, 'consoleTab');
    return restored === 'warnings' || restored === 'summary' ? restored : 'logs';
  });
 const [consoleCollapsed, setConsoleCollapsed] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshLayout, 'consoleCollapsed')
  ));
 const [consoleHeightPx, setConsoleHeightPx] = useState(() => (
    getHeatCapacityRefreshNumber(initialHeatCapacityRefreshLayout, 'consoleHeightPx', 156)
  ));
 const consoleBodyRef = useRef<HTMLDivElement | null>(null);
 return { logs, setLogs, consoleTab, setConsoleTab, consoleCollapsed, setConsoleCollapsed, consoleHeightPx, setConsoleHeightPx, consoleBodyRef };
};
