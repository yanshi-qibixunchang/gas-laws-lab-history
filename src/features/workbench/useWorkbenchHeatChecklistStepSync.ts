import type { WorkbenchHeatEffect } from './workbenchHeatEffect.ts';
import type React from 'react';

import { getHeatCapacityGuideChecklistIndex } from './workbenchHeatCapacityGuidePresentation.ts';

export interface useWorkbenchHeatChecklistStepSyncPorts {
  heatCapacityRefreshRestorePendingRef: React.MutableRefObject<boolean>;
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  activeHeatCapacityGuideStep: import('../heatCapacity/heatCapacityGuideStepModel.ts').GuideHeatCapacityStep;
  heatCapacityGuideChecklistCurrentIndexRef: React.MutableRefObject<number>;
  heatCapacityGuideChecklistPendingWheelDeltaRef: React.MutableRefObject<number>;
  heatCapacityGuideChecklistSnapTimerRef: React.MutableRefObject<number | null>;
  heatCapacityGuideChecklistReturnTimerRef: React.MutableRefObject<number | null>;
  applyHeatCapacityGuideChecklistView: (viewedIndex: number, visualOffsetPx?: number, animate?: boolean) => void;
}

export function useWorkbenchHeatChecklistStepSync({
  heatCapacityRefreshRestorePendingRef,
  activeFile,
  activeHeatCapacityGuideStep,
  heatCapacityGuideChecklistCurrentIndexRef,
  heatCapacityGuideChecklistPendingWheelDeltaRef,
  heatCapacityGuideChecklistSnapTimerRef,
  heatCapacityGuideChecklistReturnTimerRef,
  applyHeatCapacityGuideChecklistView,
}: useWorkbenchHeatChecklistStepSyncPorts) {
const checklistStepProjectionEffect = { run: () => {
    if (heatCapacityRefreshRestorePendingRef.current) return;
    const nextIndex = activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMode === 'guide'
      ? getHeatCapacityGuideChecklistIndex(activeHeatCapacityGuideStep)
      : 0;
    heatCapacityGuideChecklistCurrentIndexRef.current = nextIndex;
    heatCapacityGuideChecklistPendingWheelDeltaRef.current = 0;
    if (heatCapacityGuideChecklistSnapTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideChecklistSnapTimerRef.current);
      heatCapacityGuideChecklistSnapTimerRef.current = null;
    }
    if (heatCapacityGuideChecklistReturnTimerRef.current !== null) {
      window.clearTimeout(heatCapacityGuideChecklistReturnTimerRef.current);
      heatCapacityGuideChecklistReturnTimerRef.current = null;
    }
    applyHeatCapacityGuideChecklistView(nextIndex, 0, true);
  }, dependencies: [
    activeFile.id,
    activeFile.kind,
    activeFile.kind === 'heatCapacity' ? activeFile.heatCapacityMode : null,
    activeHeatCapacityGuideStep,
  ] } satisfies WorkbenchHeatEffect;

  return {
    effects: { checklistStepProjection: checklistStepProjectionEffect },  };
}
