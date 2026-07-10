import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const topCommandsSource = readFileSync(new URL('../../src/features/workbench/WorkbenchTopCommands.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');
const stateSource = readFileSync(new URL('../../src/features/workbench/workbenchState.ts', import.meta.url), 'utf8');
const sessionSource = readFileSync(new URL('../../src/features/workbench/workbenchSession.ts', import.meta.url), 'utf8');
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
  source,
  /heat: '热容'/,
  'Simplified Chinese heat-capacity file kind suffix should be localized instead of showing HEAT',
);

assert.match(
  source,
  /heat: '熱容'/,
  'Traditional Chinese heat-capacity file kind suffix should be localized instead of showing HEAT',
);

assert.match(
  source,
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
  source,
  /<WorkbenchEmptyWorkspace/,
  'main empty workspace should offer opening cached experiments in addition to creating new ones',
);

assert.doesNotMatch(
  source,
  /renderEmptyStudyActions\('studio-empty-file-actions'\)|renderCachedExperimentOpenActions\('studio-empty-file-open-actions'\)/,
  'left empty file section should stay structural and not duplicate main empty-workspace create/open actions',
);

assert.match(
  source,
  /<strong>\{workbenchCopy\.files\.noOpenFileState\}<\/strong>\s*<span>\{workbenchCopy\.files\.emptyHint\}<\/span>/,
  'left empty file section should use a dedicated current-state message instead of acting as a launcher',
);

assert.match(
  source,
  /renderSectionTitle\(isWorkbenchEmpty \? workbenchCopy\.files\.panels : activeFile\.kind === 'heatCapacity'/,
  'empty workbench panel section should keep a simple Panels title instead of repeating the no-open-files state',
);

assert.match(
  source,
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
  stateSource,
  /lastOpenedAt: now,/,
  'new workbench files should record a true last-opened timestamp',
);

assert.match(
  source,
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

assert.match(
  source,
  /getWorkbenchFileKindLabel\(file\.kind, workbenchCopy\.files\)/,
  'visible file kind suffixes should use the centralized localized label helper',
);

assert.match(
  source,
  /newWindow: '新窗口'/,
  'Simplified Chinese Experiment Files menu should include a localized New Window command',
);

assert.match(
  source,
  /newWindow: '新視窗'/,
  'Traditional Chinese Experiment Files menu should include a localized New Window command',
);

assert.match(
  source,
  /newWindow: 'New Window'/,
  'English Experiment Files menu should include a localized New Window command',
);

assert.match(
  source,
  /const openNewWorkbenchWindow = \(\) =>/,
  'top Experiment Files menu should route New Window through a dedicated command handler',
);

assert.match(
  source,
  /window\.hardSphereLabWindow\?\.newWindow\?\.\(\)/,
  'New Window should use the desktop bridge when running inside the local Electron app',
);

assert.match(
  source,
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
  /await createMainWindow\(\{ fresh: true \}\)/,
  'desktop New Window should create a fresh no-file workbench instead of reusing the persisted session',
);

assert.match(
  sessionSource,
  /const isFreshWorkbenchWindow = \(\) =>/,
  'session loading should detect a fresh workbench window request',
);

assert.match(
  sessionSource,
  /searchParams\.get\('hslFreshWindow'\) === '1'/,
  'fresh workbench windows should be identified through an explicit URL parameter',
);

assert.match(
  sessionSource,
  /const getWorkbenchSessionStorage = \(\) =>/,
  'session loading should centralize storage selection for regular and fresh workbench windows',
);

assert.match(
  sessionSource,
  /isFreshWorkbenchWindow\(\) \? window\.sessionStorage : window\.localStorage/,
  'fresh workbench windows should use per-window session storage instead of overwriting the persisted workspace',
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
  source,
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

assert.match(
  source,
  /className=\{`studio-tree-row studio-tree-row-child \$\{selectedPanel === panel\.key \? 'studio-panel-row-active' : ''\}`\}/,
  'left panel rows should use a weaker secondary active-panel class',
);

assert.match(
  source,
  /className=\{selectedPanel === childPanel\.key \? 'studio-results-nav-active studio-panel-row-active' : ''\}/,
  'ideal result child rows should share the secondary panel active treatment',
);

assert.match(
  source,
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

assert.match(
  source,
  /const renderSectionTitle = \(\s*label: string,\s*collapsed: boolean,\s*onToggle: \(\) => void,\s*kind: 'files' \| 'panels' = 'files',\s*\) =>/,
  'left tree section headings should distinguish true file sections from panel sections',
);

assert.match(
  source,
  /kind === 'panels' \? <PanelLeft size=\{14\} \/> : \(\s*<span className="studio-tree-folder-icon">/,
  'Panels section should use a panel/layout icon instead of the same open-folder icon as real files',
);

assert.match(
  source,
  /renderSectionTitle\(isWorkbenchEmpty \? workbenchCopy\.files\.panels[\s\S]*?, 'panels'\)/,
  'Panels section heading should opt into panel semantics',
);

assert.match(
  source,
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
