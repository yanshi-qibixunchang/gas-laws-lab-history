import {
  updateHeatCapacityRuntimeZeroOffset,
} from '../../domain/heatCapacity/heatCapacityTeachingRuntimeModel.ts';
import {
  truncateHeatCapacitySignalMv,
} from '../../domain/heatCapacity/heatCapacitySignalDisplayModel.ts';
import {
  HEAT_CAPACITY_PRESSURE_ZERO_FINE_ANGLE_STEP_DEG,
  clampHeatCapacityPressureZeroKnobAngle,
  getHeatCapacityPressureZeroDisplayText,
  getHeatCapacityPressureZeroKnobAngleForOffset,
  getHeatCapacityPressureZeroOffsetForKnobAngle,
  isHeatCapacityPhysicalKernelMode,
  isHeatCapacityPressureZeroWithinTolerance,
  updatePressureZeroDisplayedSamples,
} from './workbenchHeatCapacityInstrumentState.ts';
import {
  setHeatCapacityFreePressureZeroOffsetCore,
} from './workbenchHeatCapacityFreeControlState.ts';
import {
  setHeatCapacityGuidePressureZeroOffsetCore,
} from './workbenchHeatCapacityGuideControlState.ts';
import {
  getHeatCapacityRuntimeStateFromFile,
  mergeHeatCapacityRuntimeState,
} from './workbenchHeatCapacityTeachingRuntimeState.ts';
import type {
  WorkbenchHeatCapacityPressureZeroAdjustMode,
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';

export const setHeatCapacityPressureZeroOffset = (
  file: WorkbenchHeatCapacityState,
  zeroOffset: number,
  adjustMode: WorkbenchHeatCapacityPressureZeroAdjustMode = 'none',
  knobAngle = getHeatCapacityPressureZeroKnobAngleForOffset(zeroOffset),
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const pressureZeroKnobAngle = clampHeatCapacityPressureZeroKnobAngle(knobAngle);
  const pressureZeroOffset = getHeatCapacityPressureZeroOffsetForKnobAngle(pressureZeroKnobAngle);
  const pressureZeroAdjusted = adjustMode !== 'none' || pressureZeroOffset !== 0;
  if (file.heatCapacityMode === 'guide') {
    return setHeatCapacityGuidePressureZeroOffsetCore(
      file,
      pressureZeroOffset,
      pressureZeroAdjusted,
      pressureZeroKnobAngle,
      adjustMode,
      now,
    );
  }
  if (isHeatCapacityPhysicalKernelMode(file.heatCapacityMode)) {
    // Turning the calibration knob is a measurement-layer operation. It must
    // work before power-on and must not by itself start/freeze an experiment.
    return setHeatCapacityFreePressureZeroOffsetCore(
      file,
      pressureZeroOffset,
      pressureZeroAdjusted,
      pressureZeroKnobAngle,
      adjustMode,
      now,
    );
  }
  const runtime = updateHeatCapacityRuntimeZeroOffset(
    {
      ...getHeatCapacityRuntimeStateFromFile(file),
      pressureZeroAdjusted,
    },
    pressureZeroOffset,
    now,
  );
  const mergedFile = mergeHeatCapacityRuntimeState({
    ...file,
    pressureZeroAdjusted,
    pressureZeroed: false,
    pressureZeroKnobAngle,
    pressureZeroDisplayText: getHeatCapacityPressureZeroDisplayText(pressureZeroAdjusted, pressureZeroOffset),
    pressureZeroAdjustMode: adjustMode,
    pressureZeroDisplayedSamples: pressureZeroOffset === file.pressureZeroOffset
      ? file.pressureZeroDisplayedSamples
      : [],
  }, {
    ...runtime,
    pressureZeroAdjusted,
  }, now);
  const immediatePressureSignalMv = mergedFile.powerOn
    ? truncateHeatCapacitySignalMv(runtime.pressureSignalMvDisplayed)
    : null;
  const pressureZeroDisplayedSamples = updatePressureZeroDisplayedSamples(
    [],
    now,
    immediatePressureSignalMv,
    mergedFile.powerOn,
  );
  return {
    ...mergedFile,
    pressureSignalMv: immediatePressureSignalMv,
    pressureDisplayJitterOffset: 0,
    pressureDisplayNextJitterAtMs: now,
    pressureZeroDisplayedSamples,
    pressureZeroed: isHeatCapacityPressureZeroWithinTolerance(pressureZeroDisplayedSamples),
  };
};

export const adjustHeatCapacityPressureZeroFine = (
  file: WorkbenchHeatCapacityState,
  direction: number,
  now = Date.now(),
): WorkbenchHeatCapacityState => {
  const stepDirection = direction >= 0 ? 1 : -1;
  const nextKnobAngle = file.pressureZeroKnobAngle + stepDirection * HEAT_CAPACITY_PRESSURE_ZERO_FINE_ANGLE_STEP_DEG;
  return setHeatCapacityPressureZeroOffset(
    file,
    getHeatCapacityPressureZeroOffsetForKnobAngle(nextKnobAngle),
    'fineWheel',
    nextKnobAngle,
    now,
  );
};

export const adjustHeatCapacityPressureZeroCoarse = (
  file: WorkbenchHeatCapacityState,
  angleDeltaDeg: number,
  now = Date.now(),
): WorkbenchHeatCapacityState => setHeatCapacityPressureZeroOffset(
  file,
  getHeatCapacityPressureZeroOffsetForKnobAngle(file.pressureZeroKnobAngle + angleDeltaDeg),
  'coarseDrag',
  file.pressureZeroKnobAngle + angleDeltaDeg,
  now,
);

