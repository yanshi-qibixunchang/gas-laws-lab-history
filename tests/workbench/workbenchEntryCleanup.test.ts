import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const appSource = readFileSync(join(root, 'src', 'app', 'App.tsx'), 'utf8');

assert.match(appSource, /<WorkbenchStudioPrototype \/>/, 'App entry should render the Workbench product');
assert.doesNotMatch(appSource, /SHOW_WORKBENCH_PROTOTYPE/, 'App entry should not keep the old constant-gated legacy branch');
assert.doesNotMatch(appSource, /HeatCapacityProcessReviewDemo/, 'Standalone heat-capacity demo route should be removed from the app entry');
assert.doesNotMatch(appSource, /IdealGasExperimentMode/, 'Standalone ideal-gas mode should not be imported by the app entry');
assert.doesNotMatch(appSource, /PhysicsEngine/, 'App entry should not own the legacy hard-sphere simulation runtime');
assert.doesNotMatch(appSource, /CollapsibleCard|StatsPanel|ModeSwitch|StackedResults|DistributionCharts/, 'App entry should not import legacy app-only components');

[
  'src/features/idealGas/IdealGasExperimentMode.tsx',
  'src/features/heatCapacity/HeatCapacityProcessReviewDemo.tsx',
  'src/features/heatCapacity/HeatCapacityProcessReviewDemo.css',
  'src/components/CollapsibleCard.tsx',
  'src/components/StatsPanel.tsx',
  'src/components/Footer.tsx',
  'src/components/ModeSwitch.tsx',
  'src/components/DistributionCharts.tsx',
  'src/components/StackedResults.tsx',
].forEach((relativePath) => {
  assert.equal(existsSync(join(root, relativePath)), false, `${relativePath} should be removed`);
});

assert.equal(existsSync(join(root, 'src', 'components', 'SimulationCanvas.tsx')), true, 'current Workbench canvas component must remain');
assert.equal(existsSync(join(root, 'src', 'components', 'PdfModal.tsx')), true, 'PDF viewer component must remain for later reuse');

console.log('workbenchEntryCleanup tests passed');
