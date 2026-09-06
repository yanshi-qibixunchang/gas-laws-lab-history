const heatEffectPhaseSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchHeatEffectPhases.ts', import.meta.url), 'utf8');
import { readFileSync as readHeatArchitectureSource } from 'node:fs';
const heatArchitectureUseWorkbenchHeatParameterHelpSource = readHeatArchitectureSource(new URL('../../src/features/workbench/useWorkbenchHeatParameterHelp.ts', import.meta.url), 'utf8');
const heatArchitectureUseWorkbenchHeatParameterStateSource = readHeatArchitectureSource(new URL('../../src/features/workbench/useWorkbenchHeatParameterState.ts', import.meta.url), 'utf8');
const archUseWorkbenchLayoutStateSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchLayoutState.ts', import.meta.url), 'utf8');
const archUseWorkbenchFileTreeStateSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchFileTreeState.ts', import.meta.url), 'utf8');
const workbenchViewShellSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchViewSource } from 'node:fs';
const workbenchMenuBarSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchMenuBar.tsx', import.meta.url), 'utf8');
const workbenchFileTreeSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchFileTree.tsx', import.meta.url), 'utf8');
const renameHookSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchFileMenuInteractions.ts', import.meta.url), 'utf8');
const renameActionSource = readFileSync(new URL('../../src/features/workbench/workbenchFileRenameActions.ts', import.meta.url), 'utf8');
﻿import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');

assert.match(
  archUseWorkbenchLayoutStateSource,
  /const topMenuRef = useRef<HTMLDivElement \| null>\(null\);/,
  'top command menu should keep a ref so outside pointer events can ignore clicks inside the active top menu',
);

assert.match(
  archUseWorkbenchFileTreeStateSource,
  /const fileMenuRef = useRef<HTMLDivElement \| null>\(null\);/,
  'file action menu should keep a ref so outside pointer events can ignore clicks inside the active file menu',
);

assert.match(
  archUseWorkbenchFileTreeStateSource,
  /const renameInputRef = useRef<HTMLInputElement \| null>\(null\);/,
  'rename input should keep a ref so outside pointer events can distinguish internal rename edits from external clicks',
);

assert.match(
  renameActionSource,
  /const commitRenameFileFromOutside = \(\) => \{[\s\S]*?pushLog\(\(language\) => workbenchCopies\[language\]\.logs\.fileNameCannotBeEmpty, 'error'\);[\s\S]*?setRenamingFileId\(null\);[\s\S]*?setRenameDraft\(''\);[\s\S]*?\};/,
  'outside rename commit should log the existing empty-name error and exit rename mode when the draft is blank',
);

assert.match(
  renameHookSource,
  /if \(!openTopMenu\) return undefined;[\s\S]*contains: target => Boolean\(topMenuRef\.current\?\.contains\(target\) \|\| topCommandsRef\.current\?\.contains\(target\)\),[\s\S]*onOutside: \(\) => setOpenTopMenu\(null\)[\s\S]*\}, \[openTopMenu\]\)/,
  'top command menu should install document pointerdown outside-dismiss only while a top menu is open',
);

assert.match(
  renameHookSource,
  /if \(!openFileMenuId\) return undefined;[\s\S]*contains: target => Boolean\(fileMenuRef\.current\?\.contains\(target\) \|\| fileMenuButtonRef\.current\?\.contains\(target\)\),[\s\S]*onOutside: \(\) => \{ setOpenFileMenuId\(null\); setPendingDeleteFileId\(null\); \}[\s\S]*\}, \[openFileMenuId\]\)/,
  'file action menu should install document pointerdown outside-dismiss and clear pending delete while a file menu is open',
);

assert.match(
  renameHookSource,
  /if \(!renamingFileId\) return undefined;[\s\S]*contains: target => Boolean\(renameInputRef\.current\?\.contains\(target\)\),[\s\S]*onOutside: commitRenameFileFromOutside[\s\S]*\}, \[renamingFileId, renameDraft\]\)/,
  'rename input should commit from a document pointerdown outside the input while rename mode is active',
);

assert.match(
  workbenchMenuBarSource,
  /menuRef=\{topMenuRef\}/,
  'workbench should pass the outside-dismiss ref into the top command component',
);

assert.match(
  workbenchFileTreeSource,
  /ref=\{fileMenuRef\}/,
  'rendered file action menu should attach the outside-dismiss ref',
);

assert.match(
  workbenchFileTreeSource,
  /ref=\{renameInputRef\}[\s\S]*?onBlur=\{\(\) => commitRenameFileFromOutside\(\)\}/,
  'rename input should also commit through the shared outside behavior on blur',
);

assert.match(
  heatArchitectureUseWorkbenchHeatParameterHelpSource,
  /document\.addEventListener\('pointerdown', handleHeatCapacityParamHelpPointerDown, true\);[\s\S]*document\.removeEventListener\('pointerdown', handleHeatCapacityParamHelpPointerDown, true\);/,
  'pinned Heat Capacity parameter help should use capture-phase outside-click interception without replacing the existing outside-dismiss handlers',
);

assert.match(
  heatArchitectureUseWorkbenchHeatParameterStateSource,
  /const heatCapacityParamHelpSuppressClickRef = useRef\(false\);/,
  'pinned Heat Capacity parameter help should track the click that follows an intercepted outside pointerdown',
);

assert.match(
  heatArchitectureUseWorkbenchHeatParameterHelpSource,
  /const parameterHelpClickEffect = \{ run: \(\) => \{[\s\S]*?const handleHeatCapacityParamHelpClick = \(event: MouseEvent\) => \{[\s\S]*?heatCapacityParamHelpSuppressClickRef\.current = false;[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);[\s\S]*document\.addEventListener\('click', handleHeatCapacityParamHelpClick, true\);[\s\S]*document\.removeEventListener\('click', handleHeatCapacityParamHelpClick, true\);[\s\S]*dependencies: \[\]/,
  'pinned Heat Capacity parameter help should keep a stable capture listener that swallows the click paired with an intercepted outside pointerdown',
);

assert.match(
  heatArchitectureUseWorkbenchHeatParameterHelpSource,
  /const closePinnedHeatCapacityParameterHelp = \(\) => \{[\s\S]*?setPinnedHeatCapacityParamHelpId\(null\);[\s\S]*?setHoveredHeatCapacityParamHelpId\(null\);[\s\S]*?\};/,
  'closing pinned Heat Capacity parameter help should also clear transient hover state',
);

console.log('workbenchClickOutsideDismiss tests passed');

assert.match(renameHookSource, /document\.addEventListener\('pointerdown', listener\);[\s\S]*document\.removeEventListener\('pointerdown', listener\)/);
assert.match(source, /useWorkbenchFileMenuInteractions\(\{/);

assert.match(workbenchViewShellSource, /import \{ WorkbenchMenuBar \} from '\.\/WorkbenchMenuBar\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchFileTree \} from '\.\/WorkbenchFileTree\.tsx';/);

assert.match(source, /from '\.\/useWorkbenchLayoutState\.ts'/);
assert.match(source, /from '\.\/useWorkbenchFileTreeState\.ts'/);

assert.match(heatEffectPhaseSource, /useEffect\(effects\.parameterHelpClick\.run, effects\.parameterHelpClick\.dependencies\)/); assert.match(workbenchViewShellSource, /useWorkbenchHeatParameterHelpEffects\(heatCapacityController\.effects\.parameterHelp\)/);
