import assert from 'node:assert/strict';
import {
  createDefaultHeatCapacityFile,
  powerHeatCapacityWorkbenchFile,
  registerHeatCapacityPumpStroke,
} from '../components/workbenchState.ts';
import {
  createHeatCapacityRuntimeController,
} from '../components/heatCapacity/heatCapacityRuntimeStore.ts';

const baseFile = createDefaultHeatCapacityFile(1);
const controller = createHeatCapacityRuntimeController(baseFile);

assert.equal(controller.getRealtimeSnapshot().powerOn, false);
assert.equal(controller.getChartSnapshot().heatCapacityTrace.length, 0);
assert.equal(controller.getSceneSnapshot().pressureSignalMv, null);

controller.replaceFile(powerHeatCapacityWorkbenchFile(baseFile, true, 1_000), { dirty: true });
controller.tick(1_100);

const poweredRealtime = controller.getRealtimeSnapshot();
const poweredChart = controller.getChartSnapshot();
const poweredScene = controller.getSceneSnapshot();

assert.equal(poweredRealtime.powerOn, true);
assert.equal(poweredScene.powerOn, true);
assert.equal(poweredRealtime.pressureSignalMv, poweredScene.pressureSignalMv);
assert.equal(poweredRealtime.temperatureSignalMv, poweredScene.temperatureSignalMv);
assert.equal(
  poweredChart.heatCapacityTrace.at(-1)?.pressureSignalMv ?? null,
  poweredRealtime.pressureSignalMv,
);
assert.equal(
  poweredChart.heatCapacityTrace.at(-1)?.temperatureSignalMv ?? null,
  poweredRealtime.temperatureSignalMv,
);

controller.updateFile((file) => registerHeatCapacityPumpStroke(file, 1_250), { dirty: true });
controller.tick(1_350);

const pumpedRealtime = controller.getRealtimeSnapshot();
const pumpedChart = controller.getChartSnapshot();
assert.ok(pumpedChart.heatCapacityTrace.length >= poweredChart.heatCapacityTrace.length);
assert.ok(controller.consumeDirtyFile(), 'runtime controller should expose a dirty file snapshot for low-frequency persistence');
assert.equal(controller.consumeDirtyFile(), null, 'dirty file snapshot should be consumed only once until state changes again');

console.log('heatCapacityRuntimeStore tests passed');
