import {
  Activity,
  Archive,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FileText,
  FlaskConical,
  FolderOpen,
  Gauge,
  Info,
  LockKeyhole,
  PanelTopOpen,
  Redo2,
  RotateCcw,
  Settings,
  Undo2,
  Wrench,
} from 'lucide-react';
import { useEffect, useState, type FocusEvent, type ReactNode, type RefObject } from 'react';
import type { WorkbenchFileKind, WorkbenchPanelKey } from './workbenchState.ts';

export type WorkbenchTopMenuId = 'new' | 'edit' | 'window' | 'settings' | 'help' | null;

type WorkbenchTopCommandSubmenuId = 'newExperiment' | 'openExperiment';

interface WorkbenchTopCommandsCopy {
  menus: {
    topCommandsAria: string;
    experimentFiles: string;
    edit: string;
    window: string;
    settings: string;
    help: string;
    newWindow: string;
    newExperiment: string;
    idealStudy: string;
    heatCapacityStudy: string;
    standardStudy: string;
    openExperiment: string;
    noCachedExperiments: string;
    undo: string;
    redo: string;
    empty: string;
    clearEditHistory: string;
    panelsFor: (name: string) => string;
    resetDefaultLayout: string;
    default: string;
    general: string;
    saveWorkbenchLayoutDefault: string;
    userGuide: string;
    theoryPdf: string;
    about: string;
  };
  files: {
    locked: string;
    shown: string;
    off: string;
  };
}

interface WorkbenchTopMenuClosedFile {
  id: string;
  name: string;
  kind: WorkbenchFileKind;
  kindLabel: string;
}

interface WorkbenchTopMenuPanel {
  key: WorkbenchPanelKey;
  title: string;
  icon: ReactNode;
  locked: boolean;
  visible: boolean;
  status: string;
  childRows: ReactNode;
}

interface WorkbenchTopCommandsProps {
  openMenu: WorkbenchTopMenuId;
  menuLeft: number;
  copy: WorkbenchTopCommandsCopy;
  commandsRef: RefObject<HTMLElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
  closedFiles: WorkbenchTopMenuClosedFile[];
  undoLabel: string | null;
  redoLabel: string | null;
  undoCount: number;
  redoCount: number;
  activeFileName: string;
  windowPanels: WorkbenchTopMenuPanel[];
  settingsSummary: string;
  layoutSummary: string;
  onToggleMenu: (menu: Exclude<WorkbenchTopMenuId, null>, left: number) => void;
  onOpenNewWindow: () => void;
  onCreateFile: (kind: WorkbenchFileKind) => void;
  onOpenClosedFile: (fileId: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearHistory: () => void;
  onToggleWindowPanel: (panelKey: WorkbenchPanelKey) => void;
  onResetLayout: () => void;
  onOpenGeneralSettings: () => void;
  onSaveLayoutDefault: () => void;
  onOpenUserGuide: () => void;
  onOpenTheoryPdf: () => void;
  onOpenAbout: () => void;
}

const getFileIcon = (kind: WorkbenchFileKind) => (
  kind === 'standard' ? <Activity size={14} /> : kind === 'ideal' ? <FlaskConical size={14} /> : <Gauge size={14} />
);

export const WorkbenchTopCommands = ({
  openMenu,
  menuLeft,
  copy,
  commandsRef,
  menuRef,
  closedFiles,
  undoLabel,
  redoLabel,
  undoCount,
  redoCount,
  activeFileName,
  windowPanels,
  settingsSummary,
  layoutSummary,
  onToggleMenu,
  onOpenNewWindow,
  onCreateFile,
  onOpenClosedFile,
  onUndo,
  onRedo,
  onClearHistory,
  onToggleWindowPanel,
  onResetLayout,
  onOpenGeneralSettings,
  onSaveLayoutDefault,
  onOpenUserGuide,
  onOpenTheoryPdf,
  onOpenAbout,
}: WorkbenchTopCommandsProps) => {
  const [activeSubmenu, setActiveSubmenu] = useState<WorkbenchTopCommandSubmenuId | null>(null);
  const [pinnedSubmenu, setPinnedSubmenu] = useState<WorkbenchTopCommandSubmenuId | null>(null);

  useEffect(() => {
    if (openMenu === 'new') return;
    setActiveSubmenu(null);
    setPinnedSubmenu(null);
  }, [openMenu]);

  const openSubmenu = (submenu: WorkbenchTopCommandSubmenuId) => {
    setPinnedSubmenu((current) => (current === submenu ? current : null));
    setActiveSubmenu(submenu);
  };

  const closeSubmenu = (submenu: WorkbenchTopCommandSubmenuId) => {
    if (pinnedSubmenu === submenu) return;
    setActiveSubmenu((current) => (current === submenu ? null : current));
  };

  const pinSubmenu = (submenu: WorkbenchTopCommandSubmenuId) => {
    setActiveSubmenu(submenu);
    setPinnedSubmenu(submenu);
  };

  const blurSubmenu = (submenu: WorkbenchTopCommandSubmenuId, event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) return;
    closeSubmenu(submenu);
  };

  const getSubmenuClassName = (submenu: WorkbenchTopCommandSubmenuId) => (
    `studio-command-submenu${activeSubmenu === submenu ? ' studio-command-submenu-open' : ''}${pinnedSubmenu === submenu ? ' studio-command-submenu-pinned' : ''}`
  );

  const commands: Array<{ id: Exclude<WorkbenchTopMenuId, null>; label: string; icon: ReactNode }> = [
    { id: 'new', label: copy.menus.experimentFiles, icon: <FilePlus2 size={14} /> },
    { id: 'edit', label: copy.menus.edit, icon: <Undo2 size={14} /> },
    { id: 'window', label: copy.menus.window, icon: <Wrench size={14} /> },
    { id: 'settings', label: copy.menus.settings, icon: <Settings size={14} /> },
    { id: 'help', label: copy.menus.help, icon: <BookOpen size={14} /> },
  ];

  const renderMenu = () => {
    if (openMenu === 'new') {
      return (
        <div className="studio-command-menu studio-command-menu-new studio-command-menu-experiment-files" ref={menuRef} style={{ left: menuLeft }}>
          <button type="button" onClick={onOpenNewWindow}>
            <PanelTopOpen size={14} />
            <span>{copy.menus.newWindow}</span>
          </button>
          <div
            className={getSubmenuClassName('newExperiment')}
            onMouseEnter={() => openSubmenu('newExperiment')}
            onMouseLeave={() => closeSubmenu('newExperiment')}
            onFocus={() => openSubmenu('newExperiment')}
            onBlur={(event) => blurSubmenu('newExperiment', event)}
            onClick={() => pinSubmenu('newExperiment')}
          >
            <button type="button" className="studio-command-submenu-trigger">
              <FilePlus2 size={14} />
              <span>{copy.menus.newExperiment}</span>
              <ChevronRight size={12} />
            </button>
            <div className="studio-command-submenu-panel">
              <button type="button" onClick={() => onCreateFile('ideal')}>
                <FlaskConical size={14} />
                <span>{copy.menus.idealStudy}</span>
              </button>
              <button type="button" onClick={() => onCreateFile('heatCapacity')}>
                <Gauge size={14} />
                <span>{copy.menus.heatCapacityStudy}</span>
              </button>
              <button type="button" onClick={() => onCreateFile('standard')}>
                <Activity size={14} />
                <span>{copy.menus.standardStudy}</span>
              </button>
            </div>
          </div>
          <div
            className={getSubmenuClassName('openExperiment')}
            onMouseEnter={() => openSubmenu('openExperiment')}
            onMouseLeave={() => closeSubmenu('openExperiment')}
            onFocus={() => openSubmenu('openExperiment')}
            onBlur={(event) => blurSubmenu('openExperiment', event)}
            onClick={() => pinSubmenu('openExperiment')}
          >
            <button type="button" className="studio-command-submenu-trigger">
              <FolderOpen size={14} />
              <span>{copy.menus.openExperiment}</span>
              <ChevronRight size={12} />
            </button>
            <div className="studio-command-submenu-panel">
              {closedFiles.length === 0 ? (
                <button type="button" disabled>
                  <Archive size={14} />
                  <span>{copy.menus.noCachedExperiments}</span>
                </button>
              ) : closedFiles.map((file) => (
                <button type="button" key={file.id} onClick={() => onOpenClosedFile(file.id)}>
                  {getFileIcon(file.kind)}
                  <span>{file.name}</span>
                  <strong>{file.kindLabel}</strong>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (openMenu === 'edit') {
      return (
        <div className="studio-command-menu studio-command-menu-edit" ref={menuRef} style={{ left: menuLeft }}>
          <button type="button" onClick={onUndo} disabled={undoCount === 0}>
            <Undo2 size={14} />
            <span>{copy.menus.undo}</span>
            <strong>{undoLabel ?? copy.menus.empty}</strong>
          </button>
          <button type="button" onClick={onRedo} disabled={redoCount === 0}>
            <Redo2 size={14} />
            <span>{copy.menus.redo}</span>
            <strong>{redoLabel ?? copy.menus.empty}</strong>
          </button>
          <button type="button" onClick={onClearHistory} disabled={undoCount === 0 && redoCount === 0}>
            <RotateCcw size={14} />
            <span>{copy.menus.clearEditHistory}</span>
            <strong>{undoCount + redoCount}</strong>
          </button>
        </div>
      );
    }

    if (openMenu === 'window') {
      return (
        <div className="studio-command-menu studio-command-menu-window" ref={menuRef} style={{ left: menuLeft }}>
          <div className="studio-command-menu-title">{copy.menus.panelsFor(activeFileName)}</div>
          {windowPanels.map((panel) => (
            <div key={panel.key}>
              <div className="studio-window-panel-row">
                {panel.locked ? <LockKeyhole size={14} /> : panel.icon}
                <span>{panel.title}</span>
                <span className="studio-window-panel-status">{panel.status}</span>
                <button
                  type="button"
                  className={`studio-window-switch ${panel.locked || panel.visible ? 'studio-window-switch-on' : 'studio-window-switch-off'}${panel.locked ? ' studio-window-switch-locked' : ''}`}
                  role="switch"
                  aria-checked={panel.locked || panel.visible}
                  aria-label={`${panel.title} ${panel.status}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleWindowPanel(panel.key);
                  }}
                >
                  <span className="studio-window-switch-thumb" />
                </button>
              </div>
              {panel.childRows}
            </div>
          ))}
          <button type="button" onClick={onResetLayout}>
            <RotateCcw size={14} />
            <span>{copy.menus.resetDefaultLayout}</span>
            <strong>{copy.menus.default}</strong>
          </button>
        </div>
      );
    }

    if (openMenu === 'settings') {
      return (
        <div className="studio-command-menu studio-command-menu-settings" ref={menuRef} style={{ left: menuLeft }}>
          <button type="button" onClick={onOpenGeneralSettings}>
            <Settings size={14} />
            <span>{copy.menus.general}</span>
            <strong>{settingsSummary}</strong>
          </button>
          <button type="button" onClick={onSaveLayoutDefault}>
            <Archive size={14} />
            <span>{copy.menus.saveWorkbenchLayoutDefault}</span>
            <strong>{layoutSummary}</strong>
          </button>
        </div>
      );
    }

    if (openMenu === 'help') {
      return (
        <div className="studio-command-menu studio-command-menu-help" ref={menuRef} style={{ left: menuLeft }}>
          <button type="button" onClick={onOpenUserGuide}>
            <BookOpen size={14} />
            <span>{copy.menus.userGuide}</span>
          </button>
          <button type="button" onClick={onOpenTheoryPdf}>
            <FileText size={14} />
            <span>{copy.menus.theoryPdf}</span>
          </button>
          <button type="button" onClick={onOpenAbout}>
            <Info size={14} />
            <span>{copy.menus.about}</span>
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <nav className="studio-top-commands" aria-label={copy.menus.topCommandsAria} ref={commandsRef}>
        {commands.map((command) => (
          <button
            type="button"
            key={command.id}
            className={`studio-command-button ${openMenu === command.id ? 'studio-command-button-active' : ''}`}
            onClick={(event) => onToggleMenu(command.id, event.currentTarget.offsetLeft)}
          >
            {command.icon}
            <span>{command.label}</span>
            <ChevronDown size={12} />
          </button>
        ))}
      </nav>
      {renderMenu()}
    </>
  );
};
