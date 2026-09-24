import { type WorkbenchLocalizedConsoleMessage, type WorkbenchConsoleMessageInput, materializeWorkbenchConsoleMessage } from './workbenchConsoleLocalization.ts';
import { type WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import { workbenchCopies } from './workbenchStudioCopy.ts';
import { browserEditionCopies, isBrowserEdition } from './workbenchBrowserEdition.ts';

export type LogKind = 'info' | 'warning' | 'success' | 'error';

export type ConsoleTab = 'logs' | 'warnings' | 'summary';

export interface ConsoleLog extends WorkbenchLocalizedConsoleMessage {
  id: number;
  time: string;
  kind: LogKind;
}

export const formatTime = () => new Date().toLocaleTimeString('en-GB', { hour12: false });

export const createConsoleLog = (
  id: number,
  kind: LogKind,
  input: WorkbenchConsoleMessageInput,
  language: WorkbenchLanguagePreference,
): ConsoleLog => ({
  id,
  time: formatTime(),
  kind,
  ...materializeWorkbenchConsoleMessage(input, language),
});

export const createInitialLogs = (language: WorkbenchLanguagePreference): ConsoleLog[] => {
  const browser = typeof window !== 'undefined' && isBrowserEdition(window);
  return [
  createConsoleLog(1, 'info', (nextLanguage) => workbenchCopies[nextLanguage].logs.initialized, language),
  createConsoleLog(2, 'success', (nextLanguage) => workbenchCopies[nextLanguage].logs.defaultLayout, language),
  createConsoleLog(3, 'success', (nextLanguage) => workbenchCopies[nextLanguage].logs.standardConnected, language),
  createConsoleLog(4, browser ? 'info' : 'warning', (nextLanguage) => browser
    ? browserEditionCopies[nextLanguage].exportBody
    : workbenchCopies[nextLanguage].logs.exportBridgeRequired, language),
  ];
};
