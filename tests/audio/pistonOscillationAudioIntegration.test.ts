import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const controller = readFileSync(
  join(root, 'src', 'audio', 'experiments', 'pistonOscillation', 'pistonOscillationAudioController.ts'),
  'utf8',
);
const workspace = readFileSync(
  join(root, 'src', 'features', 'pistonOscillation', 'PistonOscillationInteractionWorkspace.tsx'),
  'utf8',
);

assert.match(workspace, /usePistonOscillationAudioController\(\{/);
assert.match(
  workspace,
  /lockingScrewProgress[\s\S]*PISTON_OSCILLATION_LOCKING_SCREW_GESTURE_TURNS[\s\S]*360/,
  'screw sound density should use the real gesture angle represented by progress',
);
assert.match(
  workspace,
  /screwMotionActive: screwDragging[\s\S]*demoFrame\?\.activeControl === 'screw'/,
  'programmatic screw-state restoration should remain silent',
);
assert.match(
  workspace,
  /startPistonRebound\(trajectory, releaseStartedAtMs\);[\s\S]*setReleaseAudioPulseId/,
  'vibration sound should follow a successfully started physical rebound',
);
assert.match(
  workspace,
  /const continuousDropStartedHeightMm = pistonEquilibriumHeightMmRef\.current;[\s\S]*nextHeightMm <= PISTON_EQUILIBRIUM_HEIGHT_MIN_MM[\s\S]*dropDistanceMm:[\s\S]*continuousDropStartedHeightMm - PISTON_EQUILIBRIUM_HEIGHT_MIN_MM/,
  'bottom impact should use the current uninterrupted unsupported segment',
);
assert.match(
  workspace,
  /if \(!supportLostDuringDrag && nextHoseState !== hoseState\)[\s\S]*emitHoseAudioEvent\(nextHoseState\)/,
  'a completed manual hose gesture should sound only when it changes connection state',
);
assert.match(controller, /previous\.powerPressProgress < POWER_BOTTOM_OUT_PROGRESS/);
assert.match(controller, /PistonOscillationScrewGrainAccumulator/);
assert.match(controller, /getPistonOscillationBottomImpactGain/);
assert.match(
  controller,
  /if \(state\.restoreMuted \|\| previous\.resetKey !== state\.resetKey\)[\s\S]*engine\.stopAll\(0\);[\s\S]*return;/,
  'restore and mode changes should cancel pending audio without replaying restored state',
);
assert.match(
  controller,
  /audioDisabledAfterFailureRef\.current = true;[\s\S]*experiment remains available[\s\S]*engine\.stopAll\(0\)/,
  'audio failure should degrade silently outside the 3D runtime boundary',
);
assert.match(
  controller,
  /useEffect\(\(\) => \(\) => \{[\s\S]*engine\.stopAll\(0\);[\s\S]*screwAccumulatorRef\.current\.reset\(\);/,
  'unmounting the piston controller should cancel active and pending sounds',
);

console.log('pistonOscillationAudioIntegration tests passed');
