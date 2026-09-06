const workbenchViewShellSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchViewSource } from 'node:fs';
const workbenchCenterWorkspaceSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchCenterWorkspace.tsx', import.meta.url), 'utf8');
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const componentSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchEmptyWorkspace.tsx', import.meta.url),
  'utf8',
);
const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);

assert.match(componentSource, /export const WorkbenchEmptyWorkspace = \(/);
assert.ok(componentSource.indexOf("onCreateFile('ideal')") < componentSource.indexOf("onCreateFile('heatCapacity')"));
assert.ok(componentSource.indexOf("onCreateFile('heatCapacity')") < componentSource.indexOf("onCreateFile('heatCapacityPistonOscillation')"));
assert.ok(componentSource.indexOf("onCreateFile('heatCapacityPistonOscillation')") < componentSource.indexOf("onCreateFile('standard')"));
assert.match(componentSource, /data-workbench-create-experiment="heatCapacity"/);
assert.match(componentSource, /data-workbench-create-experiment="heatCapacityPistonOscillation"/);
assert.match(componentSource, /openableClosedFiles\.slice\(0, 5\)\.map/);
assert.match(componentSource, /onClick=\{\(\) => onOpenFile\(file\.id\)\}/);
assert.match(componentSource, /formatWorkbenchLastOpenedAt\(file\.lastOpenedAt, language\)/);
assert.match(componentSource, /openableClosedFiles\.length === 0[\s\S]*copy\.menus\.noCachedExperiments/);
assert.match(
  workbenchCenterWorkspaceSource,
  /<WorkbenchEmptyWorkspace[\s\S]*openableClosedFiles=\{openableClosedFiles\}[\s\S]*onCreateFile=\{createFile\}[\s\S]*onOpenFile=\{openClosedWorkbenchFile\}/,
);
assert.doesNotMatch(workbenchSource, /const renderEmptyWorkbench|const renderEmptyStudyActions/);

console.log('workbenchEmptyWorkspaceComponent tests passed');

assert.match(workbenchViewShellSource, /import \{ WorkbenchCenterWorkspace \} from '\.\/WorkbenchCenterWorkspace\.tsx';/);
