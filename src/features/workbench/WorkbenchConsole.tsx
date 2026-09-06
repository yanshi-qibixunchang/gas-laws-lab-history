import type React from 'react';
import {
  ChevronDown,
} from 'lucide-react';
import {
  resolveWorkbenchConsoleMessage,
} from './workbenchConsoleLocalization.ts';

export interface WorkbenchConsoleProps {
  consoleCollapsed: boolean;
  workbenchCopy: import('./workbenchStudioCopy.ts').WorkbenchCopy;
  startConsoleResize: (event: React.PointerEvent<HTMLDivElement>) => void;
  setConsoleCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  consoleTab: import('./workbenchConsolePresentation.ts').ConsoleTab;
  setConsoleTab: React.Dispatch<React.SetStateAction<import('./workbenchConsolePresentation.ts').ConsoleTab>>;
  consoleBodyRef: React.MutableRefObject<HTMLDivElement>;
  logs: import('./workbenchConsolePresentation.ts').ConsoleLog[];
  consoleSummary: { counts: Record<import('./workbenchConsolePresentation.ts').LogKind, number>; latest: import('./workbenchConsolePresentation.ts').ConsoleLog; runtime: string; };
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  displayedLogs: import('./workbenchConsolePresentation.ts').ConsoleLog[];
}

export const WorkbenchConsole = ({
  consoleCollapsed,
  workbenchCopy,
  startConsoleResize,
  setConsoleCollapsed,
  consoleTab,
  setConsoleTab,
  consoleBodyRef,
  logs,
  consoleSummary,
  settingsLanguagePreference,
  displayedLogs,
}: WorkbenchConsoleProps) => {
  return <section className={`studio-console ${consoleCollapsed ? 'studio-console-collapsed' : ''}`} aria-label={workbenchCopy.console.title}>
          <div
            className="studio-console-resizer"
            role="separator"
            aria-orientation="horizontal"
            aria-label={workbenchCopy.console.title}
            onPointerDown={startConsoleResize}
          />
          <div className="studio-console-header">
            <button
              type="button"
              className="studio-console-toggle"
              aria-expanded={!consoleCollapsed}
              aria-label={workbenchCopy.console.title}
              onClick={() => setConsoleCollapsed((current) => !current)}
            >
              <ChevronDown size={13} />
            </button>
            <span>{workbenchCopy.console.title}</span>
            <div className="studio-console-tabs">
              {(['logs', 'warnings', 'summary'] as const).map((tab) => (
                <button
                  type="button"
                  key={tab}
                  className={consoleTab === tab ? 'studio-console-tab-active' : undefined}
                  onClick={() => setConsoleTab(tab)}
                >
                  {workbenchCopy.console.tabs[tab]}
                </button>
              ))}
            </div>
          </div>
          <div className="studio-console-body" ref={consoleBodyRef}>
            {consoleTab === 'summary' ? (
              <div className="studio-console-summary">
                <div><span>{workbenchCopy.console.total}</span><strong>{logs.length}</strong></div>
                <div><span>{workbenchCopy.console.info}</span><strong>{consoleSummary.counts.info}</strong></div>
                <div><span>{workbenchCopy.console.success}</span><strong>{consoleSummary.counts.success}</strong></div>
                <div><span>{workbenchCopy.console.warnings}</span><strong>{consoleSummary.counts.warning}</strong></div>
                <div><span>{workbenchCopy.console.errors}</span><strong>{consoleSummary.counts.error}</strong></div>
                <div className="studio-console-summary-wide">
                  <span>{workbenchCopy.console.latest}</span>
                  <strong>{consoleSummary.latest ? `${consoleSummary.latest.time} ${resolveWorkbenchConsoleMessage(consoleSummary.latest, settingsLanguagePreference)}` : workbenchCopy.console.noLogs}</strong>
                </div>
                <div className="studio-console-summary-wide">
                  <span>{workbenchCopy.console.runtime}</span>
                  <strong>{consoleSummary.runtime}</strong>
                </div>
              </div>
            ) : displayedLogs.length > 0 ? (
              displayedLogs.map((log) => (
                <div className="studio-log" key={log.id}>
                  <span className="studio-log-time">{log.time}</span>
                  <span className={`studio-log-kind-${log.kind}`}>
                    {log.kind === 'info'
                      ? workbenchCopy.console.info
                      : log.kind === 'success'
                        ? workbenchCopy.console.success
                        : log.kind === 'warning'
                          ? workbenchCopy.console.warnings
                          : workbenchCopy.console.errors}
                  </span>
                  <span>{resolveWorkbenchConsoleMessage(log, settingsLanguagePreference)}</span>
                </div>
              ))
            ) : (
              <div className="studio-console-empty">
                {consoleTab === 'warnings' ? workbenchCopy.console.noWarnings : workbenchCopy.console.noLogs}
              </div>
            )}
          </div>
        </section>;
};
