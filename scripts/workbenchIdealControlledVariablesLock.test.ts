import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');

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
  /const rejectLockedIdealControlledVariables = \(nextParams: SimulationParams\) => \{[\s\S]*?getLockedIdealControlledVariableKeys\(nextParams\)[\s\S]*?controlled variables are locked while .* data table has rows[\s\S]*?return true;/,
  'saving/applying ideal parameters should reject non-variable changes instead of clearing existing data',
);

assert.match(
  source,
  /const nextParams = parseParameterDraft\(\);[\s\S]*?if \(!nextParams\) return;[\s\S]*?if \(rejectLockedIdealControlledVariables\(nextParams\)\) return;/,
  'manual parameter saves should be blocked before they can store changed controlled variables',
);

assert.match(
  source,
  /const nextParams = paramsOverride \? cloneParams\(paramsOverride\) : cloneParams\(activeFile\.params\);[\s\S]*?if \(rejectLockedIdealControlledVariables\(nextParams\)\) return null;/,
  'parameter application should also block changed controlled variables before rebuilding ideal runtimes',
);

assert.match(
  source,
  /const editableCurrentParameters = currentParameters\.filter\(\(param\) => !\(activeFile\.kind === 'ideal' && param\.key === 'targetTemperature'\)\);/,
  'targetTemperature should be omitted from the lower Current Parameters table because the scan control owns temperature editing',
);

assert.match(
  source,
  /const controlledVariableLockHint = 'To keep controlled variables fixed, this parameter cannot be changed while the current data table has rows\. Clear the table first to edit it\.';/,
  'locked controlled-variable rows should expose a hover hint that explains the control-variable rule',
);

assert.match(
  source,
  /editableCurrentParameters\.map\(\(param\) => \{[\s\S]*?const isParamLocked = parameterControlsLocked \|\| isIdealControlledVariableLocked\(param\.key\);[\s\S]*?const paramLockHint = isIdealControlledVariableLocked\(param\.key\) \? controlledVariableLockHint : undefined;/,
  'the current parameters editor should calculate per-row lock state and hover text',
);

assert.match(
  source,
  /<div[\s\S]*?title=\{paramLockHint\}[\s\S]*?aria-disabled=\{isParamLocked\}/,
  'locked parameter rows should carry hover text and an accessible disabled state',
);

assert.match(
  source,
  /parametersEditing && param\.editable && !isParamLocked \? \([\s\S]*?<input[\s\S]*?aria-label=\{`Edit parameter \$\{param\.label\}`\}/,
  'only truly editable parameter rows should render input fields',
);

assert.doesNotMatch(
  source,
  /parametersEditing && param\.editable && !isParamLocked \? \([\s\S]*?<input[\s\S]*?disabled=\{isParamLocked\}/,
  'locked controlled-variable rows should not render disabled inputs that can still be selected or copied',
);

assert.match(
  source,
  /const changedKeys = getChangedIdealParamKeys\(activeFile\.activeParams, nextParams\);[\s\S]*?const nextPointsByRelation = activeFile\.pointsByRelation;/,
  'ideal parameter application should preserve recorded relation data instead of clearing it after blocked changes are rejected',
);

console.log('workbenchIdealControlledVariablesLock tests passed');
