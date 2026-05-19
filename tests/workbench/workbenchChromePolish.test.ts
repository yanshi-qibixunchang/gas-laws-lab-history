import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

const getRuleBody = (selector: string) => {
  let body = '';
  for (const match of cssSource.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(',').map((item) => item.trim());
    if (selectors.includes(selector)) body = match[2];
  }

  return body;
};

assert.match(
  source,
  /const getWorkbenchFileKindLabel = \(kind: WorkbenchFileKind, copy: WorkbenchCopy\['files'\]\) =>/,
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
  source,
  /const renderCachedExperimentOpenActions = \(className = 'studio-empty-open-actions'\) =>/,
  'empty workspace should expose a cached-experiment open action block',
);

assert.match(
  source,
  /renderCachedExperimentOpenActions\(\)/,
  'main empty workspace should offer opening cached experiments in addition to creating new ones',
);

assert.match(
  source,
  /renderCachedExperimentOpenActions\('studio-empty-file-open-actions'\)/,
  'left empty file section should offer the same cached-experiment open entry in compact form',
);

assert.match(
  source,
  /getWorkbenchFileKindLabel\(file\.kind, workbenchCopy\.files\)/,
  'visible file kind suffixes should use the centralized localized label helper',
);

assert.match(
  source,
  /className=\{`studio-tree-row studio-file-row \$\{file\.id === activeFile\.id \? 'studio-file-row-active' : ''\}/,
  'left file rows should use a dedicated strong active-file class instead of the generic panel active class',
);

assert.doesNotMatch(
  source,
  /studio-file-row \$\{file\.id === activeFile\.id \? 'studio-tree-row-active' : ''\}/,
  'file rows should not reuse the generic tree active class because file and panel selection are different levels',
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
  /background:[\s\S]*box-shadow:[\s\S]*inset 3px 0 0/,
  'active file rows should use a strong colored surface and left accent',
);

assert.match(
  getRuleBody('.studio-panel-row-active'),
  /background:[\s\S]*box-shadow:[\s\S]*inset 2px 0 0/,
  'active panel rows should use a weaker secondary surface and thinner accent',
);

assert.match(
  getRuleBody('.studio-settings-window'),
  /border:\s*0;[\s\S]*background:[\s\S]*box-shadow:/,
  'settings dialogs should use surface elevation instead of hard border outlines',
);

assert.match(
  getRuleBody('.studio-settings-section'),
  /border:\s*0;[\s\S]*background:[\s\S]*box-shadow:[\s\S]*inset 3px 0 0/,
  'settings sections should use color-block hierarchy and accent bars instead of boxed outlines',
);

assert.match(
  getRuleBody('.studio-about-card'),
  /border:\s*0;[\s\S]*background:[\s\S]*box-shadow:[\s\S]*inset 3px 0 0/,
  'About content should use the same professional color-block hierarchy as settings',
);

assert.match(
  getRuleBody('.studio-command-menu'),
  /border:\s*0;[\s\S]*background:[\s\S]*box-shadow:/,
  'floating command menus should use elevated surfaces rather than prominent frame borders',
);

assert.match(
  getRuleBody('.studio-empty-workbench'),
  /background:[\s\S]*box-shadow:[\s\S]*inset 0 1px 0/,
  'empty workspace should look like a polished launch surface instead of a bordered placeholder',
);

assert.match(
  getRuleBody('.studio-theme-light .studio-file-row-active'),
  /background:[\s\S]*box-shadow:[\s\S]*inset 3px 0 0/,
  'light theme should tune the strong active-file row separately',
);

assert.match(
  getRuleBody('.studio-theme-light .studio-panel-row-active'),
  /background:[\s\S]*box-shadow:[\s\S]*inset 2px 0 0/,
  'light theme should tune the secondary active-panel row separately',
);

console.log('workbenchChromePolish tests passed');
