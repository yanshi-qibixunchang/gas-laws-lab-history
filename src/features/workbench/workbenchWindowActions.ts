import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { WorkbenchPanelKey, WorkbenchIdealResultWindowKey, WorkbenchStandardResultsTab, WorkbenchHeatCapacityTabId } from './workbenchFileState.ts';
import type { WorkbenchLayoutDefaults } from './workbenchLayoutCompatibility.ts';
import type { WorkbenchCopy } from './workbenchStudioCopy.ts';
import type { HeatCapacityRealtimeCopy } from './workbenchHeatCapacityRealtimeCopy.ts';
import type { WorkbenchConsoleMessageInput } from './workbenchConsoleLocalization.ts';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import type { WorkbenchEditScope } from './workbenchEditSnapshot.ts';
import type { PanelDefinition, ResultsSectionKey } from './workbenchPanelDefinitions.tsx';
import { workbenchCopies } from './workbenchStudioCopy.ts';
import { isIdealResultWindowKey } from './workbenchLayoutCompatibility.ts';
import { LOCKED_PANEL_KEYS, isPistonOscillationUnavailableMaterialsPanelKey } from './workbenchPanelAvailability.ts';
import {
  activateIdealResultsTab, activateStandardResultsTab, closeIdealResultsWindowLayout,
  createIdealResultsTabClosePlan, createIdealResultsTabOpenPlan,
  createStandardResultsTabClosePlan, createStandardResultsTabOpenPlan,
  getIdealResultsTabState as selectIdealResultsTabState,
  getStandardResultsTabState as selectStandardResultsTabState,
} from './workbenchResultsWindowCoordinator.ts';
import { heatCapacityPanelKeyToTabId, heatCapacityTabIdToPanelKey, isHeatCapacityPanelKey } from './workbenchHeatCapacityTabRegistry.ts';
import {
  closeHeatCapacityMaterialsWindow as closeHeatCapacityMaterialsWindowState,
  createHeatCapacityMaterialsOpenAllPlan, createHeatCapacityMaterialsTabActivationPlan,
  createHeatCapacityMaterialsTabClosePlan, createHeatCapacityMaterialsTabOpenPlan,
  getHeatCapacityMaterialsTabState,
} from './workbenchHeatCapacityMaterialsWindowCoordinator.ts';

export interface WorkbenchWindowActionPorts {
  /** Render snapshot for initial gates; the updater below still replans against the current file. */
  getActiveFile: () => WorkbenchFileState;
  getSelectedPanel: () => WorkbenchPanelKey;
  workbenchLayoutDefaults: WorkbenchLayoutDefaults;
  availablePanels: PanelDefinition[];
  idealResultWindowPanels: Pick<PanelDefinition, 'key' | 'title'>[];
  resultsSections: { key: WorkbenchStandardResultsTab; title: string }[];
  heatCapacityRealtimeCopy: HeatCapacityRealtimeCopy;
  setSelectedPanel: (panel: WorkbenchPanelKey) => void;
  setResultsChildrenCollapsed: (collapsed: boolean) => void;
  setOpenTopMenu: (menu: null) => void;
  updateActiveFile: (update: (file: WorkbenchFileState) => WorkbenchFileState) => void;
  setWorkbenchFiles: (update: (files: WorkbenchFileState[]) => WorkbenchFileState[]) => void;
  captureUndoSnapshot: (label: string, scope: WorkbenchEditScope) => void;
  guardWorkbenchTutorialAction: (action: 'open-results-window') => boolean;
  pushLog: (message: WorkbenchConsoleMessageInput, kind?: 'warning') => void;
  getLocalizedWorkbenchPanelTitle: (title: string, language: WorkbenchLanguagePreference) => string;
  createIdealPanels: (copy: WorkbenchCopy) => Pick<PanelDefinition, 'key' | 'title'>[];
  createResultsSections: (copy: WorkbenchCopy) => { key: WorkbenchStandardResultsTab; title: string }[];
}

/** Presentation actions only; domain state, history and persistence remain with injected owners. */
export const createWorkbenchWindowActions = (ports: WorkbenchWindowActionPorts) => {
  const {
    workbenchLayoutDefaults, availablePanels, idealResultWindowPanels, resultsSections,
    heatCapacityRealtimeCopy, setSelectedPanel, setResultsChildrenCollapsed, setOpenTopMenu,
    updateActiveFile, setWorkbenchFiles, captureUndoSnapshot, guardWorkbenchTutorialAction,
    pushLog, getLocalizedWorkbenchPanelTitle, createIdealPanels, createResultsSections,
  } = ports;
  const handleLockedPanel = (title: string) => {
    pushLog(
      (language) => workbenchCopies[language].logs.lockedPanel(
        getLocalizedWorkbenchPanelTitle(title, language),
      ),
      'warning',
    );
  };

  const setActiveIdealResultTab = (tab: WorkbenchIdealResultWindowKey) => {
    const activeFile = ports.getActiveFile();
    if (activeFile.kind !== 'ideal') return;
    setSelectedPanel(tab);
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      return activateIdealResultsTab(file, tab, workbenchLayoutDefaults.ideal);
    });
  };

  const openIdealResultTab = (tab: WorkbenchIdealResultWindowKey, options: { openAllTabs?: boolean; replaceOpenTabs?: boolean } = {}) => {
    const activeFile = ports.getActiveFile();
    if (activeFile.kind !== 'ideal') return;
    setResultsChildrenCollapsed(false);
    setSelectedPanel(tab);

    const openPlan = createIdealResultsTabOpenPlan(
      activeFile,
      tab,
      options,
      workbenchLayoutDefaults.ideal,
    );

    if (!openPlan.layoutChanged) {
      setActiveIdealResultTab(tab);
      return;
    }

    captureUndoSnapshot(
      activeFile.visiblePanels.includes('results') ? `opened ${tab} tab` : 'opened ideal Results window',
      'presentation',
    );
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      return createIdealResultsTabOpenPlan(
        file,
        tab,
        options,
        workbenchLayoutDefaults.ideal,
      ).nextFile;
    });
    pushLog(
      (language) => workbenchCopies[language].logs.idealResultsOpened(
        activeFile.name,
        createIdealPanels(workbenchCopies[language]).find((panel) => panel.key === tab)?.title ?? tab,
      ),
    );
  };

  const openIdealResultsWindow = (tab: WorkbenchIdealResultWindowKey = 'experimentPoints', openAllTabs = false, replaceOpenTabs = false) => {
    openIdealResultTab(tab, { openAllTabs, replaceOpenTabs });
  };

  const openIdealResultWindow = (panel: WorkbenchIdealResultWindowKey) => {
    const activeFile = ports.getActiveFile();
    const replaceOpenTabs = !activeFile.visiblePanels.includes('results');
    openIdealResultsWindow(panel, false, replaceOpenTabs);
  };

  const closeIdealResultsWindow = (recordUndo = true) => {
    const activeFile = ports.getActiveFile();
    const selectedPanel = ports.getSelectedPanel();
    if (activeFile.kind !== 'ideal') return;
    if (!activeFile.visiblePanels.includes('results')) return;

    if (recordUndo) captureUndoSnapshot('closed ideal Results window', 'presentation');
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      return closeIdealResultsWindowLayout(file, workbenchLayoutDefaults.ideal);
    });
    if (isIdealResultWindowKey(selectedPanel)) setSelectedPanel('preview');
    pushLog(
      (language) => workbenchCopies[language].logs.idealResultsClosed(activeFile.name),
    );
  };

  const closeIdealResultTab = (tab: WorkbenchIdealResultWindowKey) => {
    const activeFile = ports.getActiveFile();
    if (activeFile.kind !== 'ideal') return;
    const closePlan = createIdealResultsTabClosePlan(
      activeFile,
      tab,
      workbenchLayoutDefaults.ideal,
    );
    if (closePlan.kind === 'ignored') return;

    captureUndoSnapshot(
      `closed ${idealResultWindowPanels.find((panel) => panel.key === tab)?.title ?? tab} tab`,
      'presentation',
    );
    if (closePlan.kind === 'close-window') {
      closeIdealResultsWindow(false);
      return;
    }

    setSelectedPanel(closePlan.activeTab);
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      const nextPlan = createIdealResultsTabClosePlan(
        file,
        tab,
        workbenchLayoutDefaults.ideal,
      );
      return nextPlan.kind === 'close-tab' ? nextPlan.nextFile : file;
    });
  };

  const setActiveStandardResultsTab = (tab: WorkbenchStandardResultsTab) => {
    const activeFile = ports.getActiveFile();
    if (activeFile.kind !== 'standard') return;
    setSelectedPanel('results');
    updateActiveFile((file) => {
      if (file.kind !== 'standard') return file;
      return activateStandardResultsTab(file, tab);
    });
  };

  const openStandardResultsWindow = (tab: WorkbenchStandardResultsTab = 'summary', openAllTabs = false, replaceOpenTabs = false) => {
    const activeFile = ports.getActiveFile();
    if (activeFile.kind !== 'standard') return;
    setResultsChildrenCollapsed(false);
    setSelectedPanel('results');

    const options = { openAllTabs, replaceOpenTabs };
    const openPlan = createStandardResultsTabOpenPlan(activeFile, tab, options);

    if (!openPlan.layoutChanged) {
      setActiveStandardResultsTab(tab);
      return;
    }

    captureUndoSnapshot(
      activeFile.visiblePanels.includes('results') ? `opened ${tab} tab` : 'opened Results panel',
      'presentation',
    );
    updateActiveFile((file) => {
      if (file.kind !== 'standard') return file;
      return createStandardResultsTabOpenPlan(file, tab, options).nextFile;
    });
    pushLog(
      (language) => workbenchCopies[language].logs.standardResultsOpened(
        activeFile.name,
        createResultsSections(workbenchCopies[language]).find((section) => section.key === tab)?.title ?? tab,
      ),
    );
  };

  const closeStandardResultsTab = (tab: WorkbenchStandardResultsTab) => {
    const activeFile = ports.getActiveFile();
    if (activeFile.kind !== 'standard') return;
    const closePlan = createStandardResultsTabClosePlan(activeFile, tab);
    if (closePlan.kind === 'ignored') return;

    captureUndoSnapshot(
      `closed ${resultsSections.find((section) => section.key === tab)?.title ?? tab} tab`,
      'presentation',
    );
    if (closePlan.kind === 'close-window') {
      closePanel('results', false);
      return;
    }

    updateActiveFile((file) => {
      if (file.kind !== 'standard') return file;
      const nextPlan = createStandardResultsTabClosePlan(file, tab);
      return nextPlan.kind === 'close-tab' ? nextPlan.nextFile : file;
    });
  };

  const getHeatCapacityPanelDisplayDefinition = (tabId: WorkbenchHeatCapacityTabId, panel: PanelDefinition): PanelDefinition => {
    const activeFile = ports.getActiveFile();
    if (
      activeFile.kind === 'heatCapacity' &&
      (activeFile.heatCapacityMode === 'free' || activeFile.heatCapacityMode === 'guide') &&
      tabId === 'records'
    ) {
      return {
        ...panel,
        title: heatCapacityRealtimeCopy.dataResultsTitle,
        hint: heatCapacityRealtimeCopy.dataResultsHint,
      };
    }
    return panel;
  };

  const getHeatCapacityTabDefinition = (tabId: WorkbenchHeatCapacityTabId) => {
    const panelKey = heatCapacityTabIdToPanelKey(tabId);
    const panel = availablePanels.find((item) => item.key === panelKey) ?? availablePanels[0];
    return getHeatCapacityPanelDisplayDefinition(tabId, panel);
  };

  const getHeatCapacityTabState = (tabId: WorkbenchHeatCapacityTabId) => {
    const activeFile = ports.getActiveFile();
    return getHeatCapacityMaterialsTabState(activeFile, tabId);
  };

  const activateHeatCapacityTab = (requestedTabId: WorkbenchHeatCapacityTabId) => {
    const activeFile = ports.getActiveFile();
    const activationPlan = createHeatCapacityMaterialsTabActivationPlan(activeFile, requestedTabId);
    if (activationPlan.kind !== 'ready') return;
    setSelectedPanel(activationPlan.selectedPanel);
    updateActiveFile((file) => {
      const nextPlan = createHeatCapacityMaterialsTabActivationPlan(file, requestedTabId);
      return nextPlan.kind === 'ready' ? nextPlan.nextFile : file;
    });
  };

  const openHeatCapacityTab = (requestedTabId: WorkbenchHeatCapacityTabId, recordUndo = true) => {
    const activeFile = ports.getActiveFile();
    const openPlan = createHeatCapacityMaterialsTabOpenPlan(activeFile, requestedTabId);
    if (openPlan.kind !== 'ready') return;
    setSelectedPanel(openPlan.selectedPanel);
    if (recordUndo && !openPlan.wasOpen) {
      captureUndoSnapshot(
        `opened ${getHeatCapacityTabDefinition(requestedTabId)?.title ?? requestedTabId} heat-capacity tab`,
        'presentation',
      );
    }
    updateActiveFile((file) => {
      const nextPlan = createHeatCapacityMaterialsTabOpenPlan(file, requestedTabId);
      return nextPlan.kind === 'ready' ? nextPlan.nextFile : file;
    });
  };

  const openAllHeatCapacityMaterialsTabs = () => {
    const activeFile = ports.getActiveFile();
    const openPlan = createHeatCapacityMaterialsOpenAllPlan(activeFile);
    if (openPlan.kind !== 'ready') return;
    captureUndoSnapshot('opened heat-capacity materials tabs', 'presentation');
    setSelectedPanel(openPlan.selectedPanel);
    updateActiveFile((file) => {
      const nextPlan = createHeatCapacityMaterialsOpenAllPlan(file);
      return nextPlan.kind === 'ready' ? nextPlan.nextFile : file;
    });
  };

  const closeHeatCapacityTab = (requestedTabId: WorkbenchHeatCapacityTabId, recordUndo = true) => {
    const activeFile = ports.getActiveFile();
    const closePlan = createHeatCapacityMaterialsTabClosePlan(activeFile, requestedTabId);
    if (closePlan.kind !== 'ready') return;
    if (recordUndo) {
      captureUndoSnapshot(
        `closed ${getHeatCapacityTabDefinition(requestedTabId)?.title ?? requestedTabId} heat-capacity tab`,
        'presentation',
      );
    }
    setSelectedPanel(closePlan.selectedPanel);
    updateActiveFile((file) => {
      const nextPlan = createHeatCapacityMaterialsTabClosePlan(file, requestedTabId);
      return nextPlan.kind === 'ready' ? nextPlan.nextFile : file;
    });
  };

  const closeHeatCapacityMaterialsWindow = () => {
    const activeFile = ports.getActiveFile();
    if (activeFile.kind !== 'heatCapacity' || activeFile.openHeatCapacityTabs.length === 0) return;
    captureUndoSnapshot('closed heat-capacity materials window', 'presentation');
    setSelectedPanel('preview');
    updateActiveFile((file) => (
      file.kind === 'heatCapacity'
        ? closeHeatCapacityMaterialsWindowState(file)
        : file
    ));
  };

  const toggleWindowHeatCapacityTab = (tabId: WorkbenchHeatCapacityTabId) => {
    const activeFile = ports.getActiveFile();
    if (activeFile.kind !== 'heatCapacity') return;
    if (activeFile.openHeatCapacityTabs.includes(tabId)) {
      closeHeatCapacityTab(tabId);
    } else {
      openHeatCapacityTab(tabId);
    }
  };

  const openPanel = (panel: WorkbenchPanelKey) => {
    const activeFile = ports.getActiveFile();
    if (isPistonOscillationUnavailableMaterialsPanelKey(activeFile, panel)) {
      return;
    }
    if (
      activeFile.kind === 'heatCapacityPistonOscillation'
      && panel === 'heatCapacityGuide'
      && activeFile.pistonOscillationGuideSession.dataProcessing !== null
    ) {
      setSelectedPanel('realtime');
      return;
    }
    setSelectedPanel(panel);
    if (LOCKED_PANEL_KEYS.includes(panel)) {
      handleLockedPanel(availablePanels.find((item) => item.key === panel)?.title ?? panel);
      return;
    }

    if (activeFile.kind === 'ideal') {
      if (panel === 'results') {
        openIdealResultsWindow('experimentPoints', true);
        return;
      }
      if (isIdealResultWindowKey(panel)) {
        openIdealResultsWindow(panel);
        return;
      }
    }

    if (activeFile.kind === 'standard' && panel === 'results') {
      openStandardResultsWindow('summary', true);
      return;
    }

    if (activeFile.kind === 'heatCapacity' && isHeatCapacityPanelKey(panel)) {
      const tabId = heatCapacityPanelKeyToTabId(panel);
      if (tabId) openHeatCapacityTab(tabId);
      return;
    }

    if (activeFile.visiblePanels.includes(panel)) return;

    captureUndoSnapshot(
      `opened ${availablePanels.find((item) => item.key === panel)?.title ?? panel} panel`,
      'presentation',
    );
    setWorkbenchFiles((current) =>
      current.map((file) => {
        if (file.id !== activeFile.id) return file;
        return {
          ...file,
          visiblePanels: [...file.visiblePanels, panel],
        };
      }),
    );
    const panelTitle = availablePanels.find((item) => item.key === panel)?.title ?? panel;
    pushLog(
      (language) => workbenchCopies[language].logs.panelOpened(
        activeFile.name,
        getLocalizedWorkbenchPanelTitle(panelTitle, language),
      ),
    );
  };

  const closePanel = (panel: WorkbenchPanelKey, recordUndo = true) => {
    const activeFile = ports.getActiveFile();
    const selectedPanel = ports.getSelectedPanel();
    if (isPistonOscillationUnavailableMaterialsPanelKey(activeFile, panel)) {
      return;
    }
    if (LOCKED_PANEL_KEYS.includes(panel)) {
      handleLockedPanel(availablePanels.find((item) => item.key === panel)?.title ?? panel);
      return;
    }

    if (activeFile.kind === 'ideal' && isIdealResultWindowKey(panel)) {
      closeIdealResultsWindow();
      return;
    }

    if (activeFile.kind === 'heatCapacity' && isHeatCapacityPanelKey(panel)) {
      const tabId = heatCapacityPanelKeyToTabId(panel);
      if (tabId) closeHeatCapacityTab(tabId, recordUndo);
      return;
    }

    if (!activeFile.visiblePanels.includes(panel)) return;

    if (recordUndo) {
      captureUndoSnapshot(
        `closed ${availablePanels.find((item) => item.key === panel)?.title ?? panel} panel`,
        'presentation',
      );
    }
    setWorkbenchFiles((current) =>
      current.map((file) => {
        if (file.id !== activeFile.id) return file;
        return {
          ...file,
          visiblePanels: file.visiblePanels.filter((item) => item !== panel),
        };
      }),
    );
    if (selectedPanel === panel) setSelectedPanel('preview');
    const panelTitle = availablePanels.find((item) => item.key === panel)?.title ?? panel;
    pushLog(
      (language) => workbenchCopies[language].logs.panelClosed(
        activeFile.name,
        getLocalizedWorkbenchPanelTitle(panelTitle, language),
      ),
    );
  };

  const togglePanel = (panel: WorkbenchPanelKey) => {
    const activeFile = ports.getActiveFile();
    if (isPistonOscillationUnavailableMaterialsPanelKey(activeFile, panel)) {
      return;
    }
    if (
      activeFile.kind === 'heatCapacityPistonOscillation'
      && panel === 'heatCapacityGuide'
      && activeFile.pistonOscillationGuideSession.dataProcessing !== null
    ) {
      setSelectedPanel('realtime');
      return;
    }
    if (LOCKED_PANEL_KEYS.includes(panel)) {
      setSelectedPanel(panel);
      handleLockedPanel(availablePanels.find((item) => item.key === panel)?.title ?? panel);
      return;
    }

    if (activeFile.visiblePanels.includes(panel)) {
      closePanel(panel);
    } else {
      openPanel(panel);
    }
  };

  const isWindowPanelVisible = (panel: WorkbenchPanelKey) => {
    const activeFile = ports.getActiveFile();
    return (
    (
      activeFile.kind === 'heatCapacityPistonOscillation'
      && panel === 'heatCapacityGuide'
      && activeFile.pistonOscillationGuideSession.dataProcessing !== null
    ) || activeFile.visiblePanels.includes(panel)
  );
  };

  const toggleWindowPanel = (panel: WorkbenchPanelKey) => {
    const activeFile = ports.getActiveFile();
    if (!guardWorkbenchTutorialAction('open-results-window')) return;
    if (isPistonOscillationUnavailableMaterialsPanelKey(activeFile, panel)) {
      return;
    }
    if (
      activeFile.kind === 'heatCapacityPistonOscillation'
      && panel === 'heatCapacityGuide'
      && activeFile.pistonOscillationGuideSession.dataProcessing !== null
    ) {
      setSelectedPanel('realtime');
      return;
    }
    if (LOCKED_PANEL_KEYS.includes(panel)) {
      setSelectedPanel(panel);
      handleLockedPanel(availablePanels.find((item) => item.key === panel)?.title ?? panel);
      return;
    }

    if (activeFile.kind === 'ideal' && panel === 'results') {
      if (isWindowPanelVisible(panel)) {
        closeIdealResultsWindow();
      } else {
        openIdealResultsWindow('experimentPoints', true);
      }
      return;
    }

    if (activeFile.kind === 'standard' && panel === 'results') {
      if (isWindowPanelVisible(panel)) {
        closePanel('results');
      } else {
        openStandardResultsWindow('summary', true);
      }
      return;
    }

    if (activeFile.kind === 'heatCapacity' && isHeatCapacityPanelKey(panel)) {
      const tabId = heatCapacityPanelKeyToTabId(panel);
      if (tabId) toggleWindowHeatCapacityTab(tabId);
      return;
    }

    togglePanel(panel);
  };

  const toggleWindowIdealResultTab = (tab: WorkbenchIdealResultWindowKey) => {
    const activeFile = ports.getActiveFile();
    const state = getIdealResultTabState(tab);
    if (state === 'off') {
      const replaceOpenTabs = !activeFile.visiblePanels.includes('results');
      openIdealResultsWindow(tab, false, replaceOpenTabs);
    } else {
      closeIdealResultTab(tab);
    }
  };

  const toggleWindowStandardResultsTab = (tab: WorkbenchStandardResultsTab) => {
    const activeFile = ports.getActiveFile();
    const state = getStandardResultsTabState(tab);
    if (state === 'off') {
      const replaceOpenTabs = !activeFile.visiblePanels.includes('results');
      openStandardResultsWindow(tab, false, replaceOpenTabs);
    } else {
      closeStandardResultsTab(tab);
    }
  };

  const runWindowMenuSwitch = (action: () => void) => {
    action();
    setOpenTopMenu(null);
  };

  const selectResultsSection = (section: ResultsSectionKey, openResults = false) => {
    const activeFile = ports.getActiveFile();
    setSelectedPanel('results');
    if (activeFile.kind !== 'standard') return;
    if (openResults) {
      const replaceOpenTabs = !activeFile.visiblePanels.includes('results');
      openStandardResultsWindow(section, false, replaceOpenTabs);
    }
  };

  const getIdealResultTabState = (tab: WorkbenchIdealResultWindowKey) => {
    const activeFile = ports.getActiveFile();
    if (activeFile.kind !== 'ideal') return 'off';
    return selectIdealResultsTabState(activeFile, tab, workbenchLayoutDefaults.ideal);
  };

  const getStandardResultsTabState = (tab: WorkbenchStandardResultsTab) => {
    const activeFile = ports.getActiveFile();
    if (activeFile.kind !== 'standard') return 'off';
    return selectStandardResultsTabState(activeFile, tab);
  };

  return {
    handleLockedPanel,
    setActiveIdealResultTab,
    openIdealResultTab,
    openIdealResultsWindow,
    openIdealResultWindow,
    closeIdealResultsWindow,
    closeIdealResultTab,
    setActiveStandardResultsTab,
    openStandardResultsWindow,
    closeStandardResultsTab,
    getHeatCapacityPanelDisplayDefinition,
    getHeatCapacityTabDefinition,
    getHeatCapacityTabState,
    activateHeatCapacityTab,
    openHeatCapacityTab,
    openAllHeatCapacityMaterialsTabs,
    closeHeatCapacityTab,
    closeHeatCapacityMaterialsWindow,
    toggleWindowHeatCapacityTab,
    openPanel,
    closePanel,
    togglePanel,
    isWindowPanelVisible,
    toggleWindowPanel,
    toggleWindowIdealResultTab,
    toggleWindowStandardResultsTab,
    runWindowMenuSwitch,
    selectResultsSection,
    getIdealResultTabState,
    getStandardResultsTabState
  };
};
