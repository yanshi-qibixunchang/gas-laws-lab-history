import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');
const stateSource = readFileSync(new URL('../components/workbenchState.ts', import.meta.url), 'utf8');

assert.match(
  stateSource,
  /export const DEFAULT_IDEAL_PARAMS: SimulationParams = \{[\s\S]*?targetTemperature:\s*0\.6,/,
  'new ideal-gas files should start at the minimum recommended temperature',
);

assert.match(
  stateSource,
  /createBaseFile\('ideal', index, DEFAULT_IDEAL_PARAMS\)[\s\S]*?activeParams: cloneParams\(DEFAULT_IDEAL_PARAMS\)/,
  'created ideal-gas files should use the shared ideal default params for saved and active params',
);

assert.match(
  source,
  /const \[idealAdvancedSettingsOpen,\s*setIdealAdvancedSettingsOpen\] = useState\(false\);/,
  'ideal advanced settings should be collapsed by default',
);

assert.match(
  source,
  /const \[idealAdvancedSettingsBodyVisible,\s*setIdealAdvancedSettingsBodyVisible\] = useState\(false\);/,
  'ideal advanced settings body should stay mounted while the collapse scroll animation returns',
);

assert.match(
  source,
  /const IDEAL_ADVANCED_SCROLL_DURATION_MS = 420;/,
  'advanced settings expand and collapse should share one fixed scroll animation duration',
);

assert.match(
  source,
  /const idealAdvancedSettingsBodyRef = useRef<HTMLDivElement \| null>\(null\);/,
  'ideal advanced settings body should keep a ref for automatic sidebar scrolling',
);

assert.match(
  source,
  /const currentParametersBodyRef = useRef<HTMLDivElement \| null>\(null\);[\s\S]*?const idealAdvancedSettingsPreviousScrollTopRef = useRef\(0\);/,
  'current parameters sidebar should track the scroll position before advanced settings expand',
);

assert.match(
  source,
  /const toggleIdealAdvancedSettings = \(\) => \{[\s\S]*?setIdealAdvancedSettingsOpen\(\(current\) => \{[\s\S]*?if \(!current\) \{[\s\S]*?idealAdvancedSettingsPreviousScrollTopRef\.current = currentParametersBodyRef\.current\?\.scrollTop \?\? 0;[\s\S]*?return !current;[\s\S]*?\}\);[\s\S]*?\};/,
  'toggling open should record the sidebar scrollTop before expansion so collapse can return there',
);

assert.match(
  source,
  /const animateCurrentParametersScroll = \([\s\S]*?duration = IDEAL_ADVANCED_SCROLL_DURATION_MS[\s\S]*?requestAnimationFrame[\s\S]*?onComplete\?\.\(\)/,
  'advanced settings should use the same custom timed scroll animation for expand and collapse',
);

assert.match(
  source,
  /useEffect\(\(\) => \{[\s\S]*?activeFile\.kind !== 'ideal'[\s\S]*?if \(idealAdvancedSettingsOpen\) \{[\s\S]*?animateCurrentParametersScroll\(targetTop\);[\s\S]*?return;[\s\S]*?\}[\s\S]*?animateCurrentParametersScroll\([\s\S]*?idealAdvancedSettingsPreviousScrollTopRef\.current[\s\S]*?\(\) => setIdealAdvancedSettingsBodyVisible\(false\)[\s\S]*?\)/,
  'advanced settings should animate down on expand, then animate back before hiding the body on collapse',
);

assert.match(
  source,
  /const maxScrollTop = Math\.max\(0, container\.scrollHeight - container\.clientHeight\);[\s\S]*?const targetTop = clamp\(container\.scrollTop \+ bodyRect\.top - containerRect\.top, 0, maxScrollTop\);/,
  'advanced settings expand target should be clamped to the sidebar scroll range so the animation duration is not shortened',
);

assert.match(
  source,
  /activeFile\.kind === 'ideal' \? \([\s\S]*?studio-param-advanced-toggle[\s\S]*?aria-expanded=\{idealAdvancedSettingsOpen\}[\s\S]*?onClick=\{toggleIdealAdvancedSettings\}[\s\S]*?Advanced settings/,
  'ideal files should render a collapsible Advanced settings toggle in the Current Parameters sidebar',
);

assert.match(
  source,
  /idealAdvancedSettingsBodyVisible \? \([\s\S]*?editableCurrentParameters\.map\(\(param\) => \{/,
  'ideal parameter rows should remain mounted during collapse and only hide after the return animation',
);

assert.match(
  source,
  /activeFile\.kind === 'ideal' \? \([\s\S]*?<div className="studio-param-advanced-body" ref=\{idealAdvancedSettingsBodyRef\} aria-hidden=\{!idealAdvancedSettingsOpen\}>[\s\S]*?studio-param-actions[\s\S]*?studio-param-edit-button[\s\S]*?studio-param-save-button[\s\S]*?\) : \(/,
  'ideal Edit and Save actions should live inside the expanded Advanced settings body',
);

assert.match(
  source,
  /activeFile\.kind === 'ideal' \? \([\s\S]*?studio-param-advanced[\s\S]*?\) : \([\s\S]*?studio-param-actions[\s\S]*?studio-param-edit-button[\s\S]*?studio-param-save-button/,
  'standard files should keep direct Edit and Save actions outside the ideal advanced drawer',
);

assert.match(
  source,
  /const editableCurrentParameters = currentParameters\.filter\(\(param\) => !\(activeFile\.kind === 'ideal' && \(param\.key === 'targetTemperature' \|\| param\.key === 'relation'\)\)\);/,
  'ideal advanced settings should exclude the scan-owned temperature row and read-only verification relation row',
);

assert.match(
  source,
  /activeFile\.kind === 'ideal' \? \([\s\S]*?Advanced settings[\s\S]*?\) : \([\s\S]*?editableCurrentParameters\.map\(\(param\) => \{/,
  'standard files should keep rendering parameter rows directly instead of using the ideal advanced drawer',
);

assert.doesNotMatch(
  source.slice(source.indexOf('Advanced settings')),
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
