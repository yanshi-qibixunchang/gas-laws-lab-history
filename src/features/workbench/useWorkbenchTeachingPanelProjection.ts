import { useEffect, useRef } from 'react';
import type { WorkbenchFileState } from './workbenchFileUnion';
import type { WorkbenchPanelKey } from './workbenchFileState';
import { getHeatCapacityMaterialsTabOrder, getPistonOscillationMaterialsPanelOrder, heatCapacityTabIdToPanelKey, isHeatCapacityPanelKey } from './workbenchHeatCapacityTabRegistry';
export interface WorkbenchTeachingPanelProjectionPorts {
  activeFile: WorkbenchFileState;
  selectedPanel: WorkbenchPanelKey;
  setSelectedPanel: (panel: WorkbenchPanelKey) => void;
  setLeftCollapsed: (collapsed: boolean) => void;
}
export const useWorkbenchTeachingPanelProjection = ({ activeFile, selectedPanel, setSelectedPanel, setLeftCollapsed }: WorkbenchTeachingPanelProjectionPorts) => {
const activeTeachingCompletionKey = activeFile.kind === 'heatCapacity'
    && activeFile.heatCapacityMode !== null
    && activeFile.heatCapacityTeachingStatus === 'completed'
    ? `${activeFile.id}:${activeFile.heatCapacityMode}:completed`
    : activeFile.kind === 'heatCapacityPistonOscillation'
      && activeFile.pistonOscillationDemoSession.status === 'completed'
      ? `${activeFile.id}:piston-demo:completed`
      : activeFile.kind === 'heatCapacityPistonOscillation'
        && activeFile.pistonOscillationGuideSession.status === 'completed'
        && !activeFile.pistonOscillationGuideSession.completionExited
        ? `${activeFile.id}:piston-guide:completed`
      : null;
const previousActiveTeachingCompletionKeyRef = useRef(activeTeachingCompletionKey);
useEffect(() => {
    if (
      activeTeachingCompletionKey !== null
      && activeTeachingCompletionKey !== previousActiveTeachingCompletionKeyRef.current
    ) {
      setLeftCollapsed(false);
  }
  previousActiveTeachingCompletionKeyRef.current = activeTeachingCompletionKey;
  }, [activeTeachingCompletionKey]);
const activeExperimentMaterialsPanelKeys = activeFile.kind === 'heatCapacity'
    ? getHeatCapacityMaterialsTabOrder(activeFile).map(heatCapacityTabIdToPanelKey)
    : activeFile.kind === 'heatCapacityPistonOscillation'
      ? getPistonOscillationMaterialsPanelOrder(activeFile)
      : [];
const activeExperimentMaterialsPanelSignature = activeExperimentMaterialsPanelKeys.join('|');
const activeHeatCapacityMaterialsWindowOpen = activeFile.kind === 'heatCapacity'
    && activeFile.openHeatCapacityTabs.some((tabId) => (
      activeExperimentMaterialsPanelKeys.includes(heatCapacityTabIdToPanelKey(tabId))
    ));
useEffect(() => {
    const selectedMaterialUnavailable = isHeatCapacityPanelKey(selectedPanel)
      && !activeExperimentMaterialsPanelKeys.includes(selectedPanel);
    const hiddenHeatCapacityMaterialsGroupSelected = activeFile.kind === 'heatCapacity'
      && selectedPanel === 'results'
      && activeExperimentMaterialsPanelKeys.length === 0;
    if (selectedMaterialUnavailable || hiddenHeatCapacityMaterialsGroupSelected) {
      setSelectedPanel('preview');
    }
  }, [
    activeExperimentMaterialsPanelSignature,
    activeFile.id,
    activeFile.kind,
    selectedPanel,
  ]);
return { activeHeatCapacityMaterialsWindowOpen, activeExperimentMaterialsPanelKeys };
};
