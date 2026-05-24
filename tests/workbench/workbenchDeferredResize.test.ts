import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const studioSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

const between = (source: string, start: string, end: string) => {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Expected to find start marker: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `Expected to find end marker: ${end}`);
  return source.slice(startIndex, endIndex);
};

const arrowFunctionBody = (source: string, name: string) => {
  const match = source.match(new RegExp(`const ${name} = \\([^)]*\\) => \\{([\\s\\S]*?)\\n    \\};`));
  assert.ok(match, `Expected to find arrow function body: ${name}`);
  return match[1];
};

const sidebarResizeHandler = between(
  studioSource,
  'const startSidebarResize',
  'const startIdealResultWindowResize',
);
const sidebarMoveHandler = arrowFunctionBody(sidebarResizeHandler, 'handleMove');

assert.match(
  sidebarResizeHandler,
  /const startSidebarResize = \(side: 'left' \| 'params', event: React\.MouseEvent\) => \{\s*if \(openTopMenu\) return;\s*event\.preventDefault\(\);/,
  'sidebar resize should not start from accidental hits while a top command menu is open',
);

assert.doesNotMatch(
  sidebarMoveHandler,
  /setLeftSidebarWidth|setParameterSidebarWidth/,
  'left and parameter sidebar dragging should only move the ghost splitter and defer React width updates until mouse up',
);

assert.match(
  sidebarResizeHandler,
  /let pendingSidebarWidth = startWidth;/,
  'left and parameter sidebar dragging should keep the pending width outside React state during the drag',
);

assert.match(
  sidebarResizeHandler,
  /setLeftSidebarWidth\(pendingSidebarWidth\)|setParameterSidebarWidth\(pendingSidebarWidth\)/,
  'left and parameter sidebar dragging should commit the final width once on mouse up',
);

const liveResizeHandler = between(
  studioSource,
  'const startLiveWorkspaceResize',
  'const startConsoleResize',
);
const liveMoveHandler = between(liveResizeHandler, 'const handleMove', 'const finishResize');

assert.doesNotMatch(
  liveMoveHandler,
  /updateActiveFile|setWorkbenchFiles|setFiles/,
  '3D / Realtime dragging should only move the ghost splitter and defer React file updates until pointer up',
);

assert.match(
  liveResizeHandler,
  /let pendingLiveWorkspaceSplitRatio = liveWorkspaceSplitRatio;/,
  '3D / Realtime dragging should keep the pending ratio outside React state during the drag',
);

assert.match(
  liveResizeHandler,
  /liveWorkspaceSplitRatio: pendingLiveWorkspaceSplitRatio/,
  '3D / Realtime dragging should commit the final ratio once on pointer up',
);

const consoleResizeHandler = between(
  studioSource,
  'const startConsoleResize',
  'const saveCurrentWorkbenchLayoutAsDefault',
);
const consoleMoveHandler = between(consoleResizeHandler, 'const handleMove', 'const finishResize');

assert.doesNotMatch(
  consoleMoveHandler,
  /setConsoleHeightPx/,
  'console dragging should only move the ghost splitter and defer React height updates until pointer up',
);

assert.match(
  consoleResizeHandler,
  /let pendingConsoleHeightPx = consoleHeightPx;/,
  'console dragging should keep the pending height outside React state during the drag',
);

assert.match(
  consoleResizeHandler,
  /setConsoleHeightPx\(pendingConsoleHeightPx\)/,
  'console dragging should commit the final height once on pointer up',
);

assert.match(
  studioSource,
  /ref=\{liveWorkspaceResizeGhostRef\}[\s\S]*className="studio-resize-ghost-divider studio-live-workspace-resize-ghost"/,
  '3D / Realtime workspace should render a ghost splitter for drag previews',
);

assert.match(
  studioSource,
  /ref=\{consoleResizeGhostRef\}[\s\S]*className="studio-resize-ghost-divider studio-console-resize-ghost"/,
  'console region should render a ghost splitter for drag previews',
);

assert.match(
  studioSource,
  /ref=\{sidebarResizeGhostRef\}[\s\S]*className="studio-resize-ghost-divider studio-sidebar-resize-ghost"/,
  'left sidebar should render a ghost splitter for drag previews',
);

assert.match(
  studioSource,
  /ref=\{parameterSidebarResizeGhostRef\}[\s\S]*className="studio-resize-ghost-divider studio-params-sidebar-resize-ghost"/,
  'parameter sidebar should render a ghost splitter for drag previews',
);

assert.match(
  cssSource,
  /\.studio-live-workspace\s*\{[\s\S]*transition:\s*grid-template-columns 220ms cubic-bezier\(0\.2, 0, 0, 1\);/,
  '3D / Realtime split should animate the final committed column change',
);

assert.match(
  cssSource,
  /\.studio-resize-ghost-divider\s*\{[\s\S]*pointer-events:\s*none;[\s\S]*opacity:\s*0;/,
  'ghost splitters should be visual-only and hidden unless a drag is active',
);

console.log('workbenchDeferredResize tests passed');
