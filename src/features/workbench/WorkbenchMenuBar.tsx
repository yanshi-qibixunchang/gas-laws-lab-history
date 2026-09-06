import type React from 'react';
import {
  WorkbenchTopCommands,
} from './WorkbenchTopCommands.tsx';
import {
  getWorkbenchFileKindLabel,
} from './workbenchFilePresentation.ts';
import {
  WorkbenchWindowControls,
} from './WorkbenchWindowControls.tsx';

export interface WorkbenchMenuBarProps {
  workbenchCopy: import('./workbenchStudioCopy.ts').WorkbenchCopy;
  openTopMenu: import('./WorkbenchTopCommands.tsx').WorkbenchTopMenuId;
  topMenuLeft: number;
  topCommandsRef: React.MutableRefObject<HTMLElement>;
  topMenuRef: React.MutableRefObject<HTMLDivElement>;
  openableClosedFiles: import('./workbenchFileUnion.ts').WorkbenchFileState[];
  undoStack: import('./workbenchEditSnapshot.ts').WorkbenchEditSnapshot[];
  redoStack: import('./workbenchEditSnapshot.ts').WorkbenchEditSnapshot[];
  tutorialActive: boolean;
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  topMenuWindowPanels: { key: import('./workbenchFileState.ts').WorkbenchPanelKey; title: string; icon: React.ReactNode; locked: boolean; visible: boolean; status: string; children: import('./WorkbenchTopCommands.tsx').WorkbenchTopMenuResultChild[]; }[];
  settingsThemePreference: "system" | "light" | "dark";
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  settingsPerformanceMode: import('../heatCapacity/heatCapacityQualityProfiles.ts').HeatCapacityQualityMode;
  topMenuLayoutSummary: string;
  toggleTopCommandMenu: (menu: import('./WorkbenchTopCommands.tsx').WorkbenchTopMenuId, left: number) => void;
  openNewWorkbenchWindow: () => void;
  createFile: (kind: "heatCapacity" | "standard" | "ideal" | "heatCapacityPistonOscillation") => void;
  openClosedWorkbenchFile: (fileId: string) => void;
  undoLastEdit: () => void;
  redoLastEdit: () => void;
  clearEditHistory: () => void;
  runWindowMenuSwitch: (action: () => void) => void;
  toggleWindowPanel: (panel: import('./workbenchFileState.ts').WorkbenchPanelKey) => void;
  guardWorkbenchTutorialAction: (action: import('../learning/workbenchTutorialAccessPolicy.ts').WorkbenchTutorialAccessAction) => boolean;
  toggleWindowIdealResultTab: (tab: import('./workbenchFileState.ts').WorkbenchIdealResultWindowKey) => void;
  toggleWindowStandardResultsTab: (tab: import('./workbenchFileState.ts').WorkbenchStandardResultsTab) => void;
  resetLayout: () => void;
  openGeneralSettings: () => void;
  saveCurrentWorkbenchLayoutAsDefault: () => void;
  openUserGuide: () => void;
  openAboutWindow: () => void;
  closeDesktopWindow: () => void;
}

export const WorkbenchMenuBar = ({
  workbenchCopy,
  openTopMenu,
  topMenuLeft,
  topCommandsRef,
  topMenuRef,
  openableClosedFiles,
  undoStack,
  redoStack,
  tutorialActive,
  activeFile,
  topMenuWindowPanels,
  settingsThemePreference,
  settingsLanguagePreference,
  settingsPerformanceMode,
  topMenuLayoutSummary,
  toggleTopCommandMenu,
  openNewWorkbenchWindow,
  createFile,
  openClosedWorkbenchFile,
  undoLastEdit,
  redoLastEdit,
  clearEditHistory,
  runWindowMenuSwitch,
  toggleWindowPanel,
  guardWorkbenchTutorialAction,
  toggleWindowIdealResultTab,
  toggleWindowStandardResultsTab,
  resetLayout,
  openGeneralSettings,
  saveCurrentWorkbenchLayoutAsDefault,
  openUserGuide,
  openAboutWindow,
  closeDesktopWindow,
}: WorkbenchMenuBarProps) => {
  return <header className="studio-menu">
          <div className="studio-titlebar-brand" aria-label={workbenchCopy.about.subtitle}>
            <span className="studio-brand-mark" aria-hidden="true">
              <img src="favicon.png" alt="" />
            </span>
            <span>{workbenchCopy.about.subtitle}</span>
          </div>
          <WorkbenchTopCommands
            openMenu={openTopMenu}
            menuLeft={topMenuLeft}
            copy={workbenchCopy}
            commandsRef={topCommandsRef}
            menuRef={topMenuRef}
            closedFiles={openableClosedFiles.map((file) => ({
              id: file.id,
              name: file.name,
              kind: file.kind,
              kindLabel: getWorkbenchFileKindLabel(file.kind, workbenchCopy.files),
            }))}
            undoLabel={undoStack[undoStack.length - 1]?.label ?? null}
            redoLabel={redoStack[redoStack.length - 1]?.label ?? null}
            undoCount={tutorialActive ? 0 : undoStack.length}
            redoCount={tutorialActive ? 0 : redoStack.length}
            activeFileName={activeFile.name}
            windowPanels={topMenuWindowPanels}
            settingsSummary={`${workbenchCopy.settings.themeOptions[settingsThemePreference].label} / ${workbenchCopy.settings.languageOptions[settingsLanguagePreference].label} / ${workbenchCopy.settings.performanceModeSummary[settingsPerformanceMode]}`}
            layoutSummary={topMenuLayoutSummary}
            onToggleMenu={toggleTopCommandMenu}
            onOpenNewWindow={openNewWorkbenchWindow}
            onCreateFile={createFile}
            onOpenClosedFile={openClosedWorkbenchFile}
            onUndo={undoLastEdit}
            onRedo={redoLastEdit}
            onClearHistory={clearEditHistory}
            onToggleWindowPanel={(panelKey) => runWindowMenuSwitch(() => toggleWindowPanel(panelKey))}
            onToggleWindowResultChild={(child) => runWindowMenuSwitch(() => {
              if (!guardWorkbenchTutorialAction('open-results-window')) return;
              if (child.kind === 'ideal') {
                toggleWindowIdealResultTab(child.key);
              } else {
                toggleWindowStandardResultsTab(child.key);
              }
            })}
            onResetLayout={resetLayout}
            onOpenGeneralSettings={openGeneralSettings}
            onSaveLayoutDefault={saveCurrentWorkbenchLayoutAsDefault}
            onOpenUserGuide={openUserGuide}
            onOpenAbout={openAboutWindow}
          />
          <div className="studio-titlebar-drag-fill" aria-hidden="true" />
          <WorkbenchWindowControls
            language={settingsLanguagePreference}
            onClose={closeDesktopWindow}
          />
        </header>;
};
