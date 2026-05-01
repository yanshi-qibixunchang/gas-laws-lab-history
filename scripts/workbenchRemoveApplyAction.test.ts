import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

assert.doesNotMatch(
  source,
  /studio-param-apply-button/,
  'Current Parameters should not render a separate Apply button when Start applies pending values',
);
assert.doesNotMatch(
  source,
  />\s*Apply\s*</,
  'Current Parameters should not show Apply as a visible action label',
);
assert.doesNotMatch(
  cssSource,
  /studio-param-apply-button/,
  'unused Apply button styles should be removed with the action',
);
assert.match(
  source,
  /const prepareActiveFileForRun = \(\): boolean => \{[\s\S]*?parametersDirty[\s\S]*?applyActiveFileParams\(undefined,\s*\{ silent: true/,
  'Start should apply saved pending parameter changes instead of warning users to press Reset',
);
assert.match(
  source,
  /activeFile\.kind === 'ideal' && activeFile\.needsReset[\s\S]*?applyActiveFileParams\(undefined,\s*\{ silent: true/,
  'Start should rebuild ideal runtimes that need applied scan parameters',
);
assert.doesNotMatch(
  source,
  /reset the ideal-gas runtime before running the next sample point\./,
  'ideal run should not warn users to press Reset before recording the next sample point',
);

console.log('workbenchRemoveApplyAction tests passed');
