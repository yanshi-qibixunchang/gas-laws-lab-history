import { createInitialLogs, createConsoleLog, type ConsoleLog, type LogKind } from './workbenchConsolePresentation.ts';
import { isHeatCapacityRefreshRecord } from './workbenchHeatCapacityUiCheckpoint.ts';
import { normalizeWorkbenchConsoleMessageTranslations, type WorkbenchConsoleMessageInput } from './workbenchConsoleLocalization.ts';
import { findKnownConsoleMessageTranslations } from './workbenchHeatCapacityRealtimeCopy.ts';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import type { WorkbenchMutableRef as Ref, WorkbenchStateSetter as Setter } from './workbenchActionPorts.ts';
/** Restored log validation precedes the optional tutorial-specific initial log provider. */
export const resolveInitialWorkbenchConsoleLogs = (restoredLogs: unknown, language: WorkbenchLanguagePreference, getTutorialLogs: () => ConsoleLog[] | null = () => null): ConsoleLog[] => {

    if (!Array.isArray(restoredLogs)) return createInitialLogs(language);
    const normalizedLogs: ConsoleLog[] = restoredLogs.flatMap((entry) => {
      if (
        !isHeatCapacityRefreshRecord(entry) ||
        typeof entry.id !== 'number' ||
        typeof entry.time !== 'string' ||
        (entry.kind !== 'info' && entry.kind !== 'warning' && entry.kind !== 'success' && entry.kind !== 'error') ||
        typeof entry.message !== 'string'
      ) return [];
      const messages = normalizeWorkbenchConsoleMessageTranslations(entry.messages)
        ?? findKnownConsoleMessageTranslations(entry.message);
      return [{
        id: entry.id,
        time: entry.time,
        kind: entry.kind,
        message: entry.message,
        ...(messages ? { messages } : {}),
      }];
    });
    const tutorialLogs = getTutorialLogs();
    if (tutorialLogs) return tutorialLogs;
    return normalizedLogs.length > 0 ? normalizedLogs : createInitialLogs(language);
  };
export const createWorkbenchConsoleActions = (ports: { tutorialActiveRef: Ref<boolean>; setLogs: Setter<ConsoleLog[]>; settingsLanguagePreference: WorkbenchLanguagePreference }) => {
  const { tutorialActiveRef, setLogs, settingsLanguagePreference } = ports;
  const pushLog = (message: WorkbenchConsoleMessageInput, kind: LogKind = 'info') => {
    if (tutorialActiveRef.current) return;
    setLogs((current) => [
      ...current,
      createConsoleLog(current.length + 1, kind, message, settingsLanguagePreference),
    ]);
  };
  return { pushLog };
};
