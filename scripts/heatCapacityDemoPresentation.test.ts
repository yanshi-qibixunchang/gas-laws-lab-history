import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const studioSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const experimentSource = readFileSync(new URL('../components/advancedHeatCapacity/HeatCapacityExperiment.tsx', import.meta.url), 'utf8');

assert.match(
  studioSource,
  /const HEAT_CAPACITY_DEMO_STEP_INTERVAL_MS = 5000;/,
  'heat-capacity demo should pause 5 seconds for each teaching step',
);
assert.match(
  experimentSource,
  /studio-heat-demo-callout/,
  'heat-capacity preview should render an explicit demo explanation callout',
);
assert.match(
  experimentSource,
  /演示进行中/,
  'demo callout should clearly label the guided teaching mode while running',
);
assert.match(
  experimentSource,
  /visibleDemoMessage && demoStatus !== 'completed'/,
  'completed demo copy should not be repeated in the upper summary area',
);
assert.match(
  studioSource,
  /const nextDemoStepIndex = completed \? createHeatCapacityDemoPlan\(\)\.length - 1 : file\.demoStepIndex \+ 1;[\s\S]*?demoMessage: completed[\s\S]*?\? HEAT_CAPACITY_DEMO_COMPLETED_MESSAGE[\s\S]*?: createHeatCapacityDemoPlan\(\)\[nextDemoStepIndex\]\?\.message/,
  'demo copy should advance to the next step after executing the current action so text and focus stay synchronized',
);

console.log('heatCapacityDemoPresentation tests passed');
