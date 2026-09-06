import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { WorkbenchPanelKey } from './workbenchFileState.ts';

export type WorkbenchFilePresentationSnapshot =
  | {
      kind: 'standard';
      state: Pick<Extract<WorkbenchFileState, { kind: 'standard' }>,
        'visiblePanels' | 'liveWorkspaceSplitRatio' | 'standardResultsLayout'>;
    }
  | {
      kind: 'ideal';
      state: Pick<Extract<WorkbenchFileState, { kind: 'ideal' }>,
        'visiblePanels' | 'liveWorkspaceSplitRatio' | 'idealWindowLayout'>;
    }
  | {
      kind: 'heatCapacity';
      state: Pick<Extract<WorkbenchFileState, { kind: 'heatCapacity' }>,
        | 'visiblePanels'
        | 'liveWorkspaceSplitRatio'
        | 'openHeatCapacityTabs'
        | 'activeHeatCapacityTabId'
        | 'heatCapacityTabContainerHeight'
        | 'heatCapacityMaterialsExpanded'>;
    }
  | {
      kind: 'heatCapacityPistonOscillation';
      state: Pick<Extract<WorkbenchFileState, { kind: 'heatCapacityPistonOscillation' }>,
        | 'visiblePanels'
        | 'liveWorkspaceSplitRatio'
        | 'previewCameraPreset'
        | 'pistonOscillationMaterialsExpanded'>;
    };

export interface WorkbenchWorkspaceEditSnapshot {
  kind: 'workspace';
  label: string;
  files: WorkbenchFileState[];
  closedFiles: WorkbenchFileState[];
  activeFileId: string;
  selectedPanel: WorkbenchPanelKey;
}

export interface WorkbenchFileEditSnapshot {
  kind: 'file';
  label: string;
  fileId: string;
  file: WorkbenchFileState;
  selectedPanel: WorkbenchPanelKey;
}

export interface WorkbenchPresentationEditSnapshot {
  kind: 'presentation';
  label: string;
  fileId: string;
  presentation: WorkbenchFilePresentationSnapshot;
  selectedPanel: WorkbenchPanelKey;
}

export type WorkbenchEditSnapshot =
  | WorkbenchWorkspaceEditSnapshot
  | WorkbenchFileEditSnapshot
  | WorkbenchPresentationEditSnapshot;

export type WorkbenchEditScope = WorkbenchEditSnapshot['kind'];

export const createFilePresentationSnapshot = (
  file: WorkbenchFileState,
): WorkbenchFilePresentationSnapshot => {
  if (file.kind === 'standard') {
    return {
      kind: 'standard',
      state: structuredClone({
        visiblePanels: file.visiblePanels,
        liveWorkspaceSplitRatio: file.liveWorkspaceSplitRatio,
        standardResultsLayout: file.standardResultsLayout,
      }),
    };
  }
  if (file.kind === 'ideal') {
    return {
      kind: 'ideal',
      state: structuredClone({
        visiblePanels: file.visiblePanels,
        liveWorkspaceSplitRatio: file.liveWorkspaceSplitRatio,
        idealWindowLayout: file.idealWindowLayout,
      }),
    };
  }
  if (file.kind === 'heatCapacity') {
    return {
      kind: 'heatCapacity',
      state: structuredClone({
        visiblePanels: file.visiblePanels,
        liveWorkspaceSplitRatio: file.liveWorkspaceSplitRatio,
        openHeatCapacityTabs: file.openHeatCapacityTabs,
        activeHeatCapacityTabId: file.activeHeatCapacityTabId,
        heatCapacityTabContainerHeight: file.heatCapacityTabContainerHeight,
        heatCapacityMaterialsExpanded: file.heatCapacityMaterialsExpanded,
      }),
    };
  }
  return {
    kind: 'heatCapacityPistonOscillation',
    state: structuredClone({
      visiblePanels: file.visiblePanels,
      liveWorkspaceSplitRatio: file.liveWorkspaceSplitRatio,
      previewCameraPreset: file.previewCameraPreset,
      pistonOscillationMaterialsExpanded: file.pistonOscillationMaterialsExpanded,
    }),
  };
};
