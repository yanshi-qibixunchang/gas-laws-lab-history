const archUseWorkbenchParameterInteractionStateSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchParameterInteractionState.ts', import.meta.url), 'utf8');
const workbenchViewShellSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchViewSource } from 'node:fs';
const workbenchCurrentParametersSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchCurrentParameters.tsx', import.meta.url), 'utf8');
const scrollActionSource = readFileSync(new URL('../../src/features/workbench/useWorkbenchParameterScroll.ts', import.meta.url), 'utf8');
const layoutConstantSource = readFileSync(new URL('../../src/features/workbench/workbenchLayoutConstants.ts', import.meta.url), 'utf8');
﻿import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');
const parameterRegistrySource = readFileSync(new URL('../../src/features/workbench/workbenchParameterRegistry.ts', import.meta.url), 'utf8');
const fileStateSource = readFileSync(new URL('../../src/features/workbench/workbenchFileState.ts', import.meta.url), 'utf8');

assert.match(
  fileStateSource,
  /export const DEFAULT_IDEAL_PARAMS: SimulationParams = \{[\s\S]*?targetTemperature:\s*0\.6,/,
  'new ideal-gas files should start at the minimum recommended temperature',
);

assert.match(
  fileStateSource,
  /createWorkbenchBaseFile\('ideal', index, DEFAULT_IDEAL_PARAMS, defaults\)[\s\S]*?activeParams: cloneParams\(DEFAULT_IDEAL_PARAMS\)/,
  'created ideal-gas files should use the shared ideal default params for saved and active params',
);

assert.match(
  archUseWorkbenchParameterInteractionStateSource,
  /const \[idealAdvancedSettingsOpen,\s*setIdealAdvancedSettingsOpen\] = useState\(false\);/,
  'ideal advanced settings should be collapsed by default',
);

assert.match(
  archUseWorkbenchParameterInteractionStateSource,
  /const \[idealAdvancedSettingsBodyVisible,\s*setIdealAdvancedSettingsBodyVisible\] = useState\(false\);/,
  'ideal advanced settings body should stay mounted while the collapse scroll animation returns',
);

assert.match(
  layoutConstantSource,
  /const IDEAL_ADVANCED_SCROLL_DURATION_MS = 420;/,
  'advanced settings expand and collapse should share one fixed scroll animation duration',
);

assert.match(
  archUseWorkbenchParameterInteractionStateSource,
  /const idealAdvancedSettingsBodyRef = useRef<HTMLDivElement \| null>\(null\);/,
  'ideal advanced settings body should keep a ref for automatic sidebar scrolling',
);

assert.match(
  archUseWorkbenchParameterInteractionStateSource,
  /const currentParametersBodyRef = useRef<HTMLDivElement \| null>\(null\);[\s\S]*?const idealAdvancedSettingsPreviousScrollTopRef = useRef\(0\);/,
  'current parameters sidebar should track the scroll position before advanced settings expand',
);

assert.match(
  scrollActionSource,
  /const toggleIdealAdvancedSettings = \(\) => \{[\s\S]*?setIdealAdvancedSettingsOpen\(\(current\) => \{[\s\S]*?if \(!current\) \{[\s\S]*?idealAdvancedSettingsPreviousScrollTopRef\.current = currentParametersBodyRef\.current\?\.scrollTop \?\? 0;[\s\S]*?return !current;[\s\S]*?\}\);[\s\S]*?\};/,
  'toggling open should record the sidebar scrollTop before expansion so collapse can return there',
);

assert.match(
  scrollActionSource,
  /const animateCurrentParametersScroll = \([\s\S]*?duration = IDEAL_ADVANCED_SCROLL_DURATION_MS[\s\S]*?requestAnimationFrame[\s\S]*?onComplete\?\.\(\)/,
  'advanced settings should use the same custom timed scroll animation for expand and collapse',
);

assert.match(
  scrollActionSource,
  /useEffect\(\(\) => \{[\s\S]*?activeFileKind !== 'ideal'[\s\S]*?if \(idealAdvancedSettingsOpen\) \{[\s\S]*?animateCurrentParametersScroll\(targetTop\);[\s\S]*?return;[\s\S]*?\}[\s\S]*?animateCurrentParametersScroll\([\s\S]*?idealAdvancedSettingsPreviousScrollTopRef\.current[\s\S]*?\(\) => setIdealAdvancedSettingsBodyVisible\(false\)[\s\S]*?\)/,
  'advanced settings should animate down on expand, then animate back before hiding the body on collapse',
);

assert.match(
  scrollActionSource,
  /const maxScrollTop = Math\.max\(0, container\.scrollHeight - container\.clientHeight\);[\s\S]*?const targetTop = clamp\(container\.scrollTop \+ bodyRect\.top - containerRect\.top, 0, maxScrollTop\);/,
  'advanced settings expand target should be clamped to the sidebar scroll range so the animation duration is not shortened',
);

assert.match(
  workbenchCurrentParametersSource,
  /activeFile\.kind === 'ideal' \? \([\s\S]*?studio-param-advanced-toggle[\s\S]*?aria-expanded=\{idealAdvancedSettingsOpen\}[\s\S]*?onClick=\{toggleIdealAdvancedSettings\}[\s\S]*?workbenchCopy\.parameters\.advancedSettings/,
  'ideal files should render a collapsible Advanced settings toggle in the Current Parameters sidebar',
);

assert.match(
  workbenchCurrentParametersSource,
  /idealAdvancedSettingsBodyVisible \? \([\s\S]*?editableCurrentParameters\.map\(\(param\) => renderWorkbenchParameterInputRow\(param\)\)/,
  'ideal parameter rows should remain mounted during collapse and only hide after the return animation',
);

assert.doesNotMatch(
  source,
  /activeFile\.kind === 'ideal' \? \([\s\S]*?<div className="studio-param-advanced-body" ref=\{idealAdvancedSettingsBodyRef\} aria-hidden=\{!idealAdvancedSettingsOpen\}>[\s\S]*?studio-param-actions[\s\S]*?studio-param-edit-button[\s\S]*?studio-param-save-button[\s\S]*?\) : \(/,
  'ideal advanced settings should no longer render Edit and Save actions',
);

assert.doesNotMatch(
  source,
  /activeFile\.kind === 'ideal' \? \([\s\S]*?studio-param-advanced[\s\S]*?\) : \([\s\S]*?studio-param-actions[\s\S]*?studio-param-edit-button[\s\S]*?studio-param-save-button/,
  'standard files should no longer render direct Edit and Save actions',
);

assert.match(
  workbenchCurrentParametersSource,
  /activeFile\.kind === 'ideal' \? \([\s\S]*?<div className="studio-param-advanced-body" ref=\{idealAdvancedSettingsBodyRef\} aria-hidden=\{!idealAdvancedSettingsOpen\}>[\s\S]*?renderWorkbenchParameterInputRow\(param\)/,
  "ideal advanced settings should render the shared direct parameter input row",
);

assert.match(
  workbenchCurrentParametersSource,
  /activeFile\.kind === 'ideal' \? \([\s\S]*?studio-param-advanced[\s\S]*?\) : activeFile\.kind === 'heatCapacity' \|\| activeFile\.kind === 'heatCapacityPistonOscillation' \? null : \([\s\S]*?renderWorkbenchParameterInputRow\(param\)/,
  'standard files should render the same shared direct parameter input row',
);

assert.match(
  source,
  /const editableCurrentParameters = useMemo\(\(\) => getWorkbenchParameterRows\(activeFile\), \[activeFile\]\);/,
  'ideal advanced settings should consume rows selected by the shared parameter registry',
);
assert.match(
  parameterRegistrySource,
  /key: 'targetTemperature'[\s\S]*?surfaceByKind: \{ standard: 'internal', ideal: 'dedicated' \}/,
  'the registry should keep target temperature on the dedicated ideal scan control',
);

assert.match(
  workbenchCurrentParametersSource,
  /activeFile\.kind === 'ideal' \? \([\s\S]*?workbenchCopy\.parameters\.advancedSettings[\s\S]*?\) : activeFile\.kind === 'heatCapacity' \|\| activeFile\.kind === 'heatCapacityPistonOscillation' \? null : \([\s\S]*?editableCurrentParameters\.map\(\(param\) => renderWorkbenchParameterInputRow\(param\)\)/,
  'standard files should keep rendering parameter rows directly instead of using the ideal advanced drawer',
);

assert.doesNotMatch(
  source.slice(source.indexOf('workbenchCopy.parameters.advancedSettings')),
  /verification[\s\S]*?P-T relation/,
  'the read-only verification relation row should not be moved into the editable Advanced settings list',
);

assert.match(
  cssSource,
  /\.studio-param-advanced-toggle[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto/,
  'advanced settings toggle should use the compact right-sidebar row layout',
);

assert.match(
  cssSource,
  /\.studio-param-advanced-body[\s\S]*?border-top:\s*1px solid var\(--studio-border-soft\)/,
  'advanced settings body should visually separate expanded rows from the toggle',
);

assert.match(
  cssSource,
  /\.studio-param-advanced-toggle:hover[\s\S]*?background:\s*rgba\(79,\s*127,\s*184,\s*0\.24\)[\s\S]*?box-shadow:\s*inset 0 0 0 1px rgba\(109,\s*149,\s*196,\s*0\.32\)/,
  'advanced settings hover state should be visibly brighter than the surrounding sidebar background',
);

console.log('workbenchIdealAdvancedSettings tests passed');

assert.match(workbenchViewShellSource, /import \{ WorkbenchCurrentParameters \} from '\.\/WorkbenchCurrentParameters\.tsx';/);

assert.match(source, /from '\.\/useWorkbenchParameterInteractionState\.ts'/);
