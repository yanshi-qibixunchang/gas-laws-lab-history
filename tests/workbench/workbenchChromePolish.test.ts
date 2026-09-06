const archWorkbenchDesktopNavigationActionsSource = readFileSync(new URL('../../src/features/workbench/workbenchDesktopNavigationActions.ts', import.meta.url), 'utf8');
const registrySource = readFileSync(new URL('../../src/features/workbench/workbenchHardSphereRuntimeRegistry.ts', import.meta.url), 'utf8');
const workbenchViewShellSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const workbenchFileTabsSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchFileTabs.tsx', import.meta.url), 'utf8');
const workbenchMenuBarSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchMenuBar.tsx', import.meta.url), 'utf8');
const workbenchHeatCapacityPanelTreeSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchHeatCapacityPanelTree.tsx', import.meta.url), 'utf8');
const workbenchPistonOscillationPanelTreeSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchPistonOscillationPanelTree.tsx', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchViewSource } from 'node:fs';
const workbenchCenterWorkspaceSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchCenterWorkspace.tsx', import.meta.url), 'utf8');
const workbenchFileTreeSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchFileTree.tsx', import.meta.url), 'utf8');
const workbenchPanelNavigationSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchPanelNavigation.tsx', import.meta.url), 'utf8');
const workbenchSectionTitleSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchSectionTitle.tsx', import.meta.url), 'utf8');
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const workbenchStudioCopySource = readFileSync(new URL('../../src/features/workbench/workbenchStudioCopy.ts', import.meta.url), 'utf8');
const topCommandsSource = readFileSync(new URL('../../src/features/workbench/WorkbenchTopCommands.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');
const fileStateSource = readFileSync(new URL('../../src/features/workbench/workbenchFileState.ts', import.meta.url), 'utf8');
const indexedDbPersistenceSource = readFileSync(new URL('../../src/features/workbench/workbenchIndexedDbPersistence.ts', import.meta.url), 'utf8');
const filePresentationSource = readFileSync(new URL('../../src/features/workbench/workbenchFilePresentation.ts', import.meta.url), 'utf8');
const emptyWorkspaceSource = readFileSync(new URL('../../src/features/workbench/WorkbenchEmptyWorkspace.tsx', import.meta.url), 'utf8');
const electronMainSource = readFileSync(new URL('../../electron/main.cjs', import.meta.url), 'utf8');
const electronPreloadSource = readFileSync(new URL('../../electron/preload.cjs', import.meta.url), 'utf8');

const getRuleBody = (selector: string) => {
  let body = '';
  for (const match of cssSource.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(',').map((item) => item.trim());
    if (selectors.includes(selector)) body = match[2];
  }

  return body;
};

assert.match(
  filePresentationSource,
  /export const getWorkbenchFileKindLabel = \(/,
  'file kind labels should be centralized so file rows, tabs, and cached-open entries stay localized consistently',
);

assert.match(
  workbenchStudioCopySource,
  /heat: '热容'/,
  'Simplified Chinese heat-capacity file kind suffix should be localized instead of showing HEAT',
);

assert.match(
  workbenchStudioCopySource,
  /heat: '熱容'/,
  'Traditional Chinese heat-capacity file kind suffix should be localized instead of showing HEAT',
);

assert.match(
  workbenchStudioCopySource,
  /heat: 'Heat'/,
  'English heat-capacity file kind suffix should use a readable localized label',
);

assert.match(
  source,
  /const openableClosedFiles = closedFiles\.filter\(\(file\) => !files\.some\(\(openFile\) => openFile\.id === file\.id\)\);/,
  'openable cached experiments should be computed once and reused by menus and empty states',
);

assert.match(
  emptyWorkspaceSource,
  /export const WorkbenchEmptyWorkspace = \(/,
  'empty workspace should expose a cached-experiment open action block',
);

assert.match(
  workbenchCenterWorkspaceSource,
  /<WorkbenchEmptyWorkspace/,
  'main empty workspace should offer opening cached experiments in addition to creating new ones',
);

assert.doesNotMatch(
  source,
  /renderEmptyStudyActions\('studio-empty-file-actions'\)|renderCachedExperimentOpenActions\('studio-empty-file-open-actions'\)/,
  'left empty file section should stay structural and not duplicate main empty-workspace create/open actions',
);

assert.match(
  workbenchFileTreeSource,
  /<strong>\{workbenchCopy\.files\.noOpenFileState\}<\/strong>\s*<span>\{workbenchCopy\.files\.emptyHint\}<\/span>/,
  'left empty file section should use a dedicated current-state message instead of acting as a launcher',
);

assert.match(
  workbenchPanelNavigationSource,
  /renderSectionTitle\(\s*isWorkbenchEmpty\s*\? workbenchCopy\.files\.panels/,
  'empty workbench panel section should keep a simple Panels title instead of repeating the no-open-files state',
);

assert.match(
  workbenchPanelNavigationSource,
  /<span>\{workbenchCopy\.files\.noOpenPanelState\}<\/span>/,
  'left empty panel section should tell the user that panels appear after an experiment is opened',
);

assert.match(
  filePresentationSource,
  /export const formatWorkbenchLastOpenedAt = \(\s*timestamp: number,\s*language: WorkbenchLanguagePreference,\s*\) =>/,
  'recent experiment timestamps should be formatted through a localized helper',
);

assert.match(
  filePresentationSource,
  /new Intl\.DateTimeFormat\(language === 'en' \? 'en-US' : language,/,
  'recent experiment timestamp formatting should adapt to the active workbench language',
);

assert.match(
  fileStateSource,
  /lastOpenedAt: now,/,
  'new workbench files should record a true last-opened timestamp',
);

assert.match(
  registrySource,
  /lastOpenedAt: Date\.now\(\),/,
  'reopened cached files should refresh their true last-opened timestamp',
);

assert.match(
  emptyWorkspaceSource,
  /<span className="studio-empty-open-meta">\s*<strong>\{getWorkbenchFileKindLabel\(file\.kind, copy\.files\)\}<\/strong>\s*<time dateTime=\{new Date\(file\.lastOpenedAt\)\.toISOString\(\)\}>/,
  'main recent experiment rows should show the localized last-opened time beside the experiment type',
);

assert.match(
  emptyWorkspaceSource,
  /<div className="studio-empty-actions">\s*<button[\s\S]*?className="studio-empty-command-row"[\s\S]*?data-workbench-create-experiment="ideal"/,
  'empty study creation entries should render as VS Code style command rows',
);

assert.match(
  emptyWorkspaceSource,
  /<div className="studio-empty-open-list">\s*\{openableClosedFiles\.length === 0 \? \(\s*<button type="button" className="studio-empty-command-row studio-empty-command-row-disabled" disabled>/,
  'empty cached-open disabled hint should use the command-row disabled treatment',
);

assert.match(
  emptyWorkspaceSource,
  /openableClosedFiles\.slice\(0, 5\)\.map\(\(file\) => \(\s*<button[\s\S]*?className="studio-empty-command-row studio-empty-open-row"/,
  'cached-open entries should render as command rows, not boxed buttons',
);

assert.match(workbenchFileTreeSource,
  /getWorkbenchFileKindLabel\(file\.kind, workbenchCopy\.files\)/,
  'visible file kind suffixes should use the centralized localized label helper',
);
assert.match(workbenchFileTabsSource,
  /getWorkbenchFileKindLabel\(file\.kind, workbenchCopy\.files\)/,
  'visible file kind suffixes should use the centralized localized label helper',
);
assert.match(workbenchMenuBarSource,
  /getWorkbenchFileKindLabel\(file\.kind, workbenchCopy\.files\)/,
  'visible file kind suffixes should use the centralized localized label helper',
);

assert.match(
  workbenchStudioCopySource,
  /newWindow: '新窗口'/,
  'Simplified Chinese Experiment Files menu should include a localized New Window command',
);

assert.match(
  workbenchStudioCopySource,
  /newWindow: '新視窗'/,
  'Traditional Chinese Experiment Files menu should include a localized New Window command',
);

assert.match(
  workbenchStudioCopySource,
  /newWindow: 'New Window'/,
  'English Experiment Files menu should include a localized New Window command',
);

assert.match(
  archWorkbenchDesktopNavigationActionsSource,
  /const openNewWorkbenchWindow = \(\) =>/,
  'top Experiment Files menu should route New Window through a dedicated command handler',
);

assert.match(
  archWorkbenchDesktopNavigationActionsSource,
  /window\.hardSphereLabWindow\?\.newWindow\?\.\(\)/,
  'New Window should use the desktop bridge when running inside the local Electron app',
);

assert.match(
  archWorkbenchDesktopNavigationActionsSource,
  /window\.open\(getFreshWorkbenchWindowUrl\(\), '_blank', 'noopener,noreferrer'\)/,
  'New Window should fall back to opening an isolated fresh workbench tab in browser preview',
);

assert.match(
  topCommandsSource,
  /<button type="button" onClick=\{onOpenNewWindow\}>\s*<PanelTopOpen size=\{14\} \/>\s*<span>\{copy\.menus\.newWindow\}<\/span>/,
  'Experiment Files root menu should expose New Window as a direct command row before experiment submenus',
);

assert.match(
  electronMainSource,
  /ipcMain\.handle\('hsl-window:new', async \(\) => \{/,
  'desktop shell should expose an IPC command for opening a fresh no-file workbench window',
);

assert.match(
  electronMainSource,
  /createPersistentWorkbenchWindowNamespace\(randomUUID\)[\s\S]*workbenchWindowRegistry\.add\(namespace\)[\s\S]*createMainWindow\(\{ fresh: true, namespace \}\)/,
  'desktop New Window should register a durable isolated workspace before creating its window',
);

assert.match(
  indexedDbPersistenceSource,
  /const isFreshWorkbenchWindow = \(\) =>/,
  'IndexedDB bootstrap should detect a fresh workbench window request',
);

assert.match(
  indexedDbPersistenceSource,
  /searchParams\.get\('hslFreshWindow'\) === '1'/,
  'fresh workbench windows should be identified through an explicit URL parameter',
);

assert.match(
  indexedDbPersistenceSource,
  /const resolveWorkbenchNamespace = \(\) =>/,
  'IndexedDB bootstrap should centralize durable desktop and temporary browser namespace selection',
);

assert.match(
  indexedDbPersistenceSource,
  /WORKBENCH_WINDOW_NAMESPACE_QUERY_PARAM[\s\S]*isExplicitWorkbenchNamespace\(explicitNamespace\)[\s\S]*return explicitNamespace;[\s\S]*window\.sessionStorage\.getItem\(WORKBENCH_TEMP_NAMESPACE_SESSION_KEY\)/,
  'Electron windows should use validated durable namespaces while browser-only fresh tabs retain temporary isolation',
);

assert.match(
  electronMainSource,
  /restoreRegisteredWorkbenchWindows[\s\S]*registry\.namespaces[\s\S]*createMainWindow\(\{ fresh: true, namespace \}\)/,
  'registered secondary workspaces should be reopened on the next desktop launch',
);

assert.match(
  electronPreloadSource,
  /hardSphereLabWindow/,
  'preload should expose the desktop window bridge to the renderer',
);

assert.match(
  electronPreloadSource,
  /newWindow: \(\) => ipcRenderer\.invoke\('hsl-window:new'\)/,
  'preload window bridge should invoke the desktop New Window IPC channel',
);

assert.match(
  workbenchFileTreeSource,
  /className=\{`studio-tree-row studio-file-row [\s\S]*?\$\{file\.id === activeFile\.id \? 'studio-file-row-active' : ''\}/,
  'left file rows should use a dedicated strong active-file class instead of the generic panel active class',
);

assert.doesNotMatch(
  source,
  /studio-file-row \$\{file\.id === activeFile\.id \? 'studio-tree-row-active' : ''\}/,
  'file rows should not reuse the generic tree active class because file and panel selection are different levels',
);

assert.doesNotMatch(
  cssSource,
  /\.studio-brand(?:\s|,|\{)|\.studio-panel-action(?:\s|,|\{)|\.studio-settings-shortcuts-copy|\.studio-tree-row-active|\.studio-tree-title(?:\s|,|\{)|\.studio-empty-file-(?:open-)?actions/,
  'obsolete brand, panel, settings, tree, and empty-workspace selectors should not remain in the shared stylesheet',
);

assert.match(workbenchHeatCapacityPanelTreeSource,
  /className=\{`studio-tree-row studio-tree-row-child \$\{selectedPanel === panel\.key \? 'studio-panel-row-active' : ''\}`\}/,
  'left panel rows should use a weaker secondary active-panel class',
);
assert.match(workbenchPistonOscillationPanelTreeSource,
  /className=\{`studio-tree-row studio-tree-row-child \$\{selectedPanel === panel\.key \? 'studio-panel-row-active' : ''\}`\}/,
  'left panel rows should use a weaker secondary active-panel class',
);
assert.match(workbenchPanelNavigationSource,
  /className=\{`studio-tree-row studio-tree-row-child \$\{selectedPanel === panel\.key \? 'studio-panel-row-active' : ''\}`\}/,
  'left panel rows should use a weaker secondary active-panel class',
);

assert.match(
  workbenchPanelNavigationSource,
  /className=\{selectedPanel === childPanel\.key \? 'studio-results-nav-active studio-panel-row-active' : ''\}/,
  'ideal result child rows should share the secondary panel active treatment',
);

assert.match(
  workbenchPanelNavigationSource,
  /className=\{getStandardResultsTabState\(section\.key\) === 'active' && selectedPanel === 'results' \? 'studio-results-nav-active studio-panel-row-active' : ''\}/,
  'standard result child rows should share the secondary panel active treatment',
);

assert.match(
  getRuleBody('.studio-file-tabs'),
  /overflow-x:\s*auto;[\s\S]*flex-wrap:\s*nowrap;/,
  'top file tab strip should stay one line and scroll horizontally when needed',
);

assert.match(
  getRuleBody('.studio-file-tab'),
  /flex:\s*1 1 \d+px;[\s\S]*min-width:\s*\d+px;[\s\S]*max-width:\s*\d+px;[\s\S]*height:\s*\d+px;[\s\S]*white-space:\s*nowrap;/,
  'top file tabs should compress between min and max widths without wrapping titles',
);

assert.match(
  getRuleBody('.studio-file-tab-name'),
  /overflow:\s*hidden;[\s\S]*text-overflow:\s*ellipsis;[\s\S]*white-space:\s*nowrap;/,
  'top file tab titles should ellipsize instead of wrapping to a second line',
);

assert.match(
  getRuleBody('.studio-file-row-active'),
  /background:[\s\S]*box-shadow:[\s\S]*inset 0 1px 0/,
  'active file rows should use a subtle selected surface without a left accent bar',
);

assert.match(
  getRuleBody('.studio-panel-row-active'),
  /background:[\s\S]*box-shadow:\s*none/,
  'active panel rows should use a weaker secondary surface without a left accent bar',
);

assert.match(
  getRuleBody('.studio-settings-window'),
  /border:\s*0;[\s\S]*background:[\s\S]*box-shadow:/,
  'settings dialogs should use surface elevation instead of hard border outlines',
);

assert.doesNotMatch(
  getRuleBody('.studio-settings-section'),
  /inset 3px 0 0/,
  'settings sections should stay minimal without a left accent bar',
);

assert.doesNotMatch(
  getRuleBody('.studio-theme-light .studio-settings-section'),
  /inset 3px 0 0/,
  'light settings sections should stay minimal without a left accent bar',
);

assert.match(
  getRuleBody('.studio-about-card'),
  /border:\s*0;[\s\S]*background:[\s\S]*box-shadow:/,
  'About content should use a professional color-block hierarchy without decorative left rails',
);

assert.doesNotMatch(
  getRuleBody('.studio-about-card'),
  /inset 3px 0 0/,
  'About cards should stay minimal without a left accent bar',
);

assert.match(
  getRuleBody('.studio-command-menu'),
  /border:\s*0;[\s\S]*background:[\s\S]*box-shadow:/,
  'floating command menus should use elevated surfaces rather than prominent frame borders',
);

assert.match(
  getRuleBody('.studio-command-submenu-panel'),
  /left:\s*calc\(100% \+ 4px\);[\s\S]*top:\s*0;[\s\S]*border:\s*0;[\s\S]*border-radius:\s*6px;[\s\S]*box-shadow:/,
  'nested command submenus should align like VS Code menus without protruding borders or double shadows',
);

assert.match(
  topCommandsSource,
  /type WorkbenchTopCommandSubmenuId = 'newExperiment' \| 'openExperiment';/,
  'Experiment Files nested menus should have explicit submenu ids for hover and pinned state',
);

assert.match(
  topCommandsSource,
  /const openSubmenu = \(submenu: WorkbenchTopCommandSubmenuId\) => \{[\s\S]*?setPinnedSubmenu\(\(current\) => \(current === submenu \? current : null\)\);[\s\S]*?setActiveSubmenu\(submenu\);[\s\S]*?\};/,
  'hovering a different nested command submenu should release the previously pinned submenu and show the new one as hover-only',
);

assert.match(
  topCommandsSource,
  /const pinSubmenu = \(submenu: WorkbenchTopCommandSubmenuId\) => \{[\s\S]*?setActiveSubmenu\(submenu\);[\s\S]*?setPinnedSubmenu\(submenu\);[\s\S]*?\};/,
  'clicking inside a nested command submenu should pin the currently active submenu',
);

assert.match(
  getRuleBody('.studio-command-submenu-open > .studio-command-submenu-panel'),
  /display:\s*grid/,
  'nested command submenu panels should be displayed only by the explicit open state',
);

assert.doesNotMatch(
  cssSource,
  /\.studio-command-submenu:hover\s*>\s*\.studio-command-submenu-panel|\.studio-command-submenu:focus-within\s*>\s*\.studio-command-submenu-panel/,
  'nested command submenus should not rely on CSS hover or focus-within, because pinned focus must yield to another hovered submenu',
);

assert.doesNotMatch(
  getRuleBody('.studio-theme-light .studio-command-submenu-panel'),
  /border-color:/,
  'light theme nested command submenus should not reintroduce a framed border',
);

assert.match(workbenchSectionTitleSource, /kind\?: \"files\" \| \"panels\";[\s\S]*kind = 'files'/, "left tree section headings should distinguish true file sections from panel sections");

assert.match(
  workbenchSectionTitleSource,
  /kind === 'panels' \? <PanelLeft size=\{14\} \/> : \(\s*<span className="studio-tree-folder-icon">/,
  'Panels section should use a panel/layout icon instead of the same open-folder icon as real files',
);

assert.match(
  workbenchPanelNavigationSource,
  /renderSectionTitle\(\s*isWorkbenchEmpty\s*\?\s*workbenchCopy\.files\.panels[\s\S]*?'panels',?\s*\)/,
  'Panels section heading should opt into panel semantics',
);

assert.match(workbenchPistonOscillationPanelTreeSource,
  /<span className="studio-results-expander-icon">[\s\S]*?<ChevronRight size=\{13\} \/>[\s\S]*?<span className="studio-results-folder-label">/,
  'panel-internal expandable groups should use chevron disclosure instead of folder open/closed icons',
);
assert.match(workbenchPanelNavigationSource,
  /<span className="studio-results-expander-icon">[\s\S]*?<ChevronRight size=\{13\} \/>[\s\S]*?<span className="studio-results-folder-label">/,
  'panel-internal expandable groups should use chevron disclosure instead of folder open/closed icons',
);

assert.match(
  getRuleBody('.studio-empty-workbench'),
  /background:[\s\S]*box-shadow:[\s\S]*inset 0 1px 0/,
  'empty workspace should look like a polished launch surface instead of a bordered placeholder',
);

assert.match(
  getRuleBody('.studio-empty-command-row'),
  /border:\s*0;[\s\S]*background:\s*transparent;[\s\S]*justify-content:\s*flex-start;/,
  'empty-state command rows should be transparent text commands by default',
);

assert.match(
  getRuleBody('.studio-empty-command-row:hover'),
  /background:\s*rgba\(79,\s*127,\s*184,\s*0\.\d+\);/,
  'empty-state command rows should reveal only a subtle hover surface',
);

assert.doesNotMatch(
  getRuleBody('.studio-empty-command-row'),
  /border:\s*1px solid rgba\(79,\s*127,\s*184/,
  'empty-state command rows should not use the old blue outline button border',
);

assert.match(
  getRuleBody('.studio-theme-light .studio-empty-command-row:hover'),
  /background:\s*#e8f0fb;/,
  'light theme command rows should use a VS Code-like pale hover row',
);

assert.match(
  getRuleBody('.studio-theme-light .studio-file-row-active'),
  /background:[\s\S]*box-shadow:[\s\S]*inset 0 1px 0/,
  'light theme should tune the active-file row without a left accent bar',
);

assert.match(
  getRuleBody('.studio-theme-light .studio-panel-row-active'),
  /background:[\s\S]*box-shadow:\s*none/,
  'light theme should tune the secondary active-panel row without a left accent bar',
);

console.log('workbenchChromePolish tests passed');

assert.match(workbenchViewShellSource, /import \{ WorkbenchCenterWorkspace \} from '\.\/WorkbenchCenterWorkspace\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchFileTree \} from '\.\/WorkbenchFileTree\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchPanelNavigation \} from '\.\/WorkbenchPanelNavigation\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchSectionTitle \} from '\.\/WorkbenchSectionTitle\.tsx';/);

assert.match(workbenchViewShellSource, /import \{ WorkbenchFileTree \} from '\.\/WorkbenchFileTree\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchFileTabs \} from '\.\/WorkbenchFileTabs\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchMenuBar \} from '\.\/WorkbenchMenuBar\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchHeatCapacityPanelTree \} from '\.\/WorkbenchHeatCapacityPanelTree\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchPistonOscillationPanelTree \} from '\.\/WorkbenchPistonOscillationPanelTree\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchPanelNavigation \} from '\.\/WorkbenchPanelNavigation\.tsx';/);

assert.match(source, /from '\.\/workbenchDesktopNavigationActions\.ts'/);
