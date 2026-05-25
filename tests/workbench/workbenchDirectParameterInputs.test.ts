import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

assert.match(
  source,
  /const \[parameterInputDrafts,\s*setParameterInputDrafts\] = useState<Record<string, string>>\(\{\}\);/,
  'standard and ideal parameter inputs should keep transient per-field drafts',
);

assert.match(
  source,
  /const commitWorkbenchParameterInput = \([\s\S]*?param: WorkbenchParameterRow[\s\S]*?rawValue: string[\s\S]*?\) => \{[\s\S]*?if \(parameterControlsLocked\)[\s\S]*?Number\(rawValue\)[\s\S]*?validateWorkbenchParams\(nextParams\)[\s\S]*?rejectLockedIdealControlledVariables\(nextParams\)[\s\S]*?applyActiveFileParams\(nextParams\)/,
  'committing a direct parameter input should validate, honor ideal locks, and apply through the existing parameter path',
);

assert.match(
  source,
  /const clearWorkbenchParameterInputDraft = \(paramKey: string\) => \{[\s\S]*?setParameterInputDrafts\(\(current\) => \{[\s\S]*?\[paramKey\]: _removed[\s\S]*?const revertWorkbenchParameterInput = \(paramKey: string\) => \{[\s\S]*?clearWorkbenchParameterInputDraft\(paramKey\)/,
  'Escape should be able to drop the focused transient draft without mutating file parameters',
);

assert.match(
  source,
  /onBlur=\{\(\) => commitWorkbenchParameterInput\(param, parameterValue\)\}[\s\S]*?event\.key === 'Enter'[\s\S]*?event\.preventDefault\(\)[\s\S]*?commitWorkbenchParameterInput\(param, parameterValue\)[\s\S]*?event\.key === 'Escape'[\s\S]*?event\.preventDefault\(\)[\s\S]*?revertWorkbenchParameterInput\(param\.key\)/,
  'direct parameter rows should commit on blur or Enter and revert the focused draft on Escape',
);

assert.match(
  source,
  /const WORKBENCH_PARAMETER_DETAILS: Record<ExperimentParamKey, \{[\s\S]*?symbol: WorkbenchParameterSymbolPart\[\];[\s\S]*?help: Record<WorkbenchLanguagePreference, string>[\s\S]*?N:[\s\S]*?r:[\s\S]*?L:[\s\S]*?dt:[\s\S]*?nu:[\s\S]*?equilibriumTime:[\s\S]*?statsDuration:[\s\S]*?targetTemperature:/,
  'standard and ideal direct parameter rows should have symbols and short model-effect help for every editable row',
);

assert.match(
  source,
  /renderWorkbenchParameterHelpButton\(param\.key, detail\.help\[settingsLanguagePreference\]\)/,
  'standard and ideal parameter rows should expose the same circular help affordance as heat-capacity rows',
);

assert.match(
  source,
  /renderWorkbenchParameterSymbol\(detail\.symbol\)/,
  'standard and ideal parameter rows should render symbols through a reusable symbol renderer',
);

assert.match(
  source,
  /const getWorkbenchParameterDisplayUnit = \([\s\S]*?param: WorkbenchParameterRow[\s\S]*?language: WorkbenchLanguagePreference[\s\S]*?param\.key === 'N'[\s\S]*?'zh-CN'[\s\S]*?'个'[\s\S]*?'zh-TW'[\s\S]*?'個'[\s\S]*?return param\.unit/,
  'standard and ideal parameter rows should localize human-readable units without mutating model parameter rows',
);

assert.match(
  source,
  /const displayUnit = getWorkbenchParameterDisplayUnit\(param, settingsLanguagePreference\);[\s\S]*?displayUnit \? <span className="studio-param-input-unit">\{displayUnit\}<\/span> : null/,
  'standard and ideal parameter rows should render the localized display unit instead of the raw model unit',
);

assert.match(
  source,
  /hardSphereTeachingOnly: '只影响三维教学显示，不参与 Uₜ、Uₚ、U₀\/U₁\/U₂ 或 γ 计算。'/,
  'Simplified Chinese hard-sphere copy should use the gamma symbol consistently',
);

assert.match(
  source,
  /hardSphereTeachingOnly: '只影響三維教學顯示，不參與 Uₜ、Uₚ、U₀\/U₁\/U₂ 或 γ 計算。'/,
  'Traditional Chinese hard-sphere copy should use the gamma symbol consistently',
);

assert.match(
  source,
  /hardSphereTeachingOnly: 'Affects only the 3D teaching display\. It is not used for Uₜ, Uₚ, U₀\/U₁\/U₂, or γ\.'/,
  'English hard-sphere copy should use the gamma symbol consistently',
);

assert.match(
  cssSource,
  /\.studio-param-input-row\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(112px,\s*136px\)/,
  'standard and ideal parameter rows should use the heat-capacity-style name/symbol/help/input/unit grid',
);

assert.match(
  cssSource,
  /\.studio-param-input-cell input\s*\{[\s\S]*?text-align:\s*center;/,
  'standard and ideal direct parameter inputs should center numeric values',
);

console.log('workbenchDirectParameterInputs tests passed');
