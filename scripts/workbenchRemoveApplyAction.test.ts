import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

assert.doesNotMatch(
  source,
  /studio-param-apply-button/,
  'Current Parameters should not render a separate Apply button when Reset is the runtime rebuild action',
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
  /saved parameter changes are pending Reset\. Run was not started\./,
  'Run warning should point users to Reset after saved parameter changes',
);
assert.match(
  source,
  /if \(parametersDirty \|\| \(activeFile\.kind === 'ideal' && activeFile\.needsReset\)\) \{[\s\S]*?applyActiveFileParams\(\);[\s\S]*?return;/,
  'Reset should rebuild from saved pending parameters when it replaces Apply',
);
assert.match(
  source,
  /reset the ideal-gas runtime before running the next sample point\./,
  'ideal run warning should point users to Reset, not reset/apply',
);

console.log('workbenchRemoveApplyAction tests passed');
