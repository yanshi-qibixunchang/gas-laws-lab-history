import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const snapshotSource = readFileSync(new URL('../../src/features/workbench/workbenchEditSnapshot.ts', import.meta.url), 'utf8');
const historySource = readFileSync(new URL('../../src/features/workbench/workbenchEditHistoryActions.ts', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

const getRuleBody = (selector: string) => {
  for (const match of cssSource.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(',').map((item) => item.trim());
    if (selectors.includes(selector)) return match[2];
  }

  return '';
};

assert.match(
  source,
  /standardResultsLayout:\s*\{[\s\S]*?heightRatio:\s*clamp\(nextRatio,\s*IDEAL_RESULT_MIN_HEIGHT_RATIO,\s*maxHeightRatio\)/,
  'standard Results should store its resizable height ratio in the active file layout',
);

assert.match(
  source,
  /const startStandardResultsResize = \(event: React\.MouseEvent\) =>/,
  'standard Results should expose an explicit top-edge resize handler',
);

assert.match(
  source,
  /createEditSnapshot\('resized standard Results window',\s*'presentation'\)[\s\S]*?pushUndoSnapshot\(snapshot\)/,
  'standard Results resize should enter undo history once with the pre-drag snapshot',
);

assert.match(
  snapshotSource,
  /interface WorkbenchPresentationEditSnapshot[\s\S]*?presentation:\s*WorkbenchFilePresentationSnapshot/,
  'Results layout history should use a presentation-only snapshot instead of a full runtime file snapshot',
);

assert.match(
  historySource,
  /const restorePresentationSnapshot[\s\S]*?\.\.\.structuredClone\(snapshot\.presentation\.state\)[\s\S]*?scheduleWorkspacePersistenceRef\.current\(\)/,
  'restoring Results layout should patch only presentation state and persist the resulting layout',
);

assert.doesNotMatch(
  historySource.match(/const restorePresentationSnapshot[\s\S]*?\n  };\n\n  const restoreFileSnapshot/)?.[0] ?? '',
  /reconcileRuntime|suspendActiveHeatCapacityModeForNavigation|cloneWorkbenchFiles/,
  'restoring Results layout must not replace or rewind simulation runtime state',
);

assert.match(
  source,
  /const maxHeightRatio = getStandardResultsMaxHeightRatio\(\)/,
  'standard Results resize should compute a workspace-aware maximum height ratio',
);

assert.match(
  source,
  /heightRatio:\s*clamp\(nextRatio,\s*IDEAL_RESULT_MIN_HEIGHT_RATIO,\s*maxHeightRatio\)/,
  'standard Results resize should clamp to the workspace-aware maximum height ratio',
);

assert.match(
  source,
  /const getStandardResultsMaxHeightRatio = \(\) => \{[\s\S]*?fileTabsRect[\s\S]*?RESIZER_GRAB_SAFE_SPACE[\s\S]*?IDEAL_RESULT_MAX_HEIGHT_RATIO/,
  'standard Results maximum height should reserve file-tab and resizer-safe space',
);

assert.match(
  source,
  /className="studio-results-window-resizer"[\s\S]*?onMouseDown=\{startStandardResultsResize\}/,
  'standard Results should render a visible top-edge resizer',
);

assert.match(
  source,
  /style=\{\{ height: `\$\{clampIdealResultHeightRatio\(standardResultsLayout\.heightRatio\) \* 100\}%` \}\}/,
  'standard Results region height should be driven by the per-file resizable ratio state',
);

assert.match(
  getRuleBody('.studio-results-window-resizer'),
  /cursor:\s*ns-resize/,
  'standard Results resizer should use a vertical resize cursor',
);

assert.doesNotMatch(
  getRuleBody('.studio-results-region'),
  /resize:\s*vertical/,
  'standard Results should not rely on the browser native resize handle as its only height control',
);

console.log('workbenchStandardResultsResize tests passed');

