import { useEffect } from 'react';
import type { WorkbenchMutableRef as Ref } from './workbenchActionPorts.ts';
import type { ConsoleTab } from './workbenchConsolePresentation.ts';
export const useWorkbenchConsoleScroll = (ports: { consoleTab: ConsoleTab; displayedLogs: readonly unknown[]; logs: readonly unknown[]; consoleBodyRef: Ref<HTMLElement | null>; skipInitialConsoleScrollRef: Ref<boolean> }) => {
 const { consoleTab, displayedLogs, logs, consoleBodyRef, skipInitialConsoleScrollRef } = ports;
 useEffect(() => {
    if (consoleTab === 'summary') return;
    if (skipInitialConsoleScrollRef.current) return;
    const body = consoleBodyRef.current;
    if (!body) return;
    body.scrollTop = body.scrollHeight;
  }, [consoleTab, displayedLogs.length, logs.length]);
};
