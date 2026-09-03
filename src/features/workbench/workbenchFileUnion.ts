import type {
  WorkbenchIdealState,
  WorkbenchStandardState,
} from './workbenchFileState.ts';
import type {
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';
import type {
  WorkbenchHeatCapacityPistonOscillationState,
} from './workbenchPistonOscillationState.ts';

export type WorkbenchFileState =
  | WorkbenchStandardState
  | WorkbenchIdealState
  | WorkbenchHeatCapacityState
  | WorkbenchHeatCapacityPistonOscillationState;
