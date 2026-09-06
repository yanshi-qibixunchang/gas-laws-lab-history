import type { DependencyList, EffectCallback } from 'react';

/** A domain effect whose installation phase is owned by the workbench composition. */
export interface WorkbenchHeatEffect {
  run: EffectCallback;
  dependencies: DependencyList;
}
