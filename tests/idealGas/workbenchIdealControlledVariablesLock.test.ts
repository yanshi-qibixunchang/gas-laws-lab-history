import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');

assert.match(
  source,
  /const currentIdealRelationHasPoints = activeFile\.kind === 'ideal' && activeFile\.pointsByRelation\[activeFile\.relation\]\.length > 0;/,
  'ideal mode should detect when the current relation already has experiment data',
);

assert.match(
  source,
  /const isIdealControlledVariableLocked = \(\s*key: keyof SimulationParams \| 'relation',\s*\) => \([\s\S]*?currentIdealRelationHasPoints[\s\S]*?!isVariableKeyForRelation\(activeFile\.relation, key as ExperimentParamKey\)[\s\S]*?\);/,
  'ideal mode should lock non-variable parameters after the current relation has data',
);

assert.match(
  source,
  /const getLockedIdealControlledVariableKeys = \(nextParams: SimulationParams\): ExperimentParamKey\[\] => \([\s\S]*?currentIdealRelationHasPoints[\s\S]*?getChangedIdealParamKeys\(activeFile\.params, nextParams\)\.filter\(\(key\) => !isVariableKeyForRelation\(activeFile\.relation, key\)\)/,
  'saving/applying ideal parameters should find non-variable changes while the current relation has data',
);

assert.match(
  source,
  /const rejectLockedIdealControlledVariables = \(nextParams: SimulationParams\) => \{[\s\S]*?getLockedIdealControlledVariableKeys\(nextParams\)[\s\S]*?workbenchCopy\.logs\.controlledVariablesLocked\(activeFile\.name, getRelationLabel\(activeFile\.relation\), lockedKeys\.join\(', '\)\)[\s\S]*?return true;/,
  'saving/applying ideal parameters should reject non-variable changes instead of clearing existing data',
);

assert.match(
  source,
  /const commitWorkbenchParameterInput = \([\s\S]*?param: WorkbenchParameterRow[\s\S]*?rawValue: string[\s\S]*?\) => \{[\s\S]*?assignWorkbenchParameterValue\(nextParams, param\.key, parsedValue\);[\s\S]*?if \(rejectLockedIdealControlledVariables\(nextParams\)\) return;[\s\S]*?applyActiveFileParams\(nextParams\)/,
  'direct parameter commits should be blocked before they can store changed controlled variables',
);

assert.match(
  source,
  /const nextParams = paramsOverride \? cloneParams\(paramsOverride\) : cloneParams\(activeFile\.params\);[\s\S]*?if \(rejectLockedIdealControlledVariables\(nextParams\)\) return null;/,
  'parameter application should also block changed controlled variables before rebuilding ideal runtimes',
);

assert.match(
  source,
  /const editableCurrentParameters = useMemo\(\(\) => getWorkbenchParameterRows\(activeFile\), \[activeFile\]\);/,
  'the lower ideal Current Parameters table should consume only registry-selected advanced rows',
);

assert.match(
  source,
  /const controlledVariableLockHint = workbenchCopy\.parameters\.controlledLockHint;/,
  'locked controlled-variable rows should expose a hover hint that explains the control-variable rule',
);

assert.match(
  source,
  /const renderWorkbenchParameterInputRow = \(param: WorkbenchParameterRow\) => \{[\s\S]*?const isParamLocked = parameterControlsLocked \|\| isIdealControlledVariableLocked\(param\.key\);[\s\S]*?const paramLockHint = isIdealControlledVariableLocked\(param\.key\) \? controlledVariableLockHint : undefined;/,
  'the shared current-parameter input row should calculate per-row lock state and hover text',
);

assert.match(
  source,
  /<div[\s\S]*?title=\{paramLockHint\}[\s\S]*?aria-disabled=\{isParamLocked\}[\s\S]*?<input[\s\S]*?disabled=\{isParamLocked \|\| !param\.editable\}/,
  'locked parameter rows should carry hover text and an accessible disabled state',
);

assert.match(
  source,
  /editableCurrentParameters\.map\(\(param\) => renderWorkbenchParameterInputRow\(param\)\)/,
  'editable parameter lists should render through the shared direct-input row',
);

assert.doesNotMatch(
  source,
  /parametersEditing && param\.editable && !isParamLocked \? \([\s\S]*?<input/,
  'the old edit-mode-only input renderer should not remain in the current parameter list',
);

assert.match(
  source,
  /const changedKeys = getChangedIdealParamKeys\(activeFile\.activeParams, nextParams\);[\s\S]*?const nextPointsByRelation = activeFile\.pointsByRelation;/,
  'ideal parameter application should preserve recorded relation data instead of clearing it after blocked changes are rejected',
);

console.log('workbenchIdealControlledVariablesLock tests passed');
