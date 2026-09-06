import type { HeatCapacityModeJsonObject } from '../heatCapacity/heatCapacityModeUiCheckpoint.ts';
import type { useWorkbenchInitialWorkspace } from './useWorkbenchInitialWorkspace.ts';
import type { useWorkbenchFileTreeState } from './useWorkbenchFileTreeState.ts';
import type { useWorkbenchParameterInteractionState } from './useWorkbenchParameterInteractionState.ts';
import type { useWorkbenchConsoleState } from './useWorkbenchConsoleState.ts';
import { getHeatCapacityRefreshNumber } from './workbenchHeatCapacityUiCheckpoint.ts';
export type WorkbenchRefreshPresentationRestorePorts = Pick<ReturnType<typeof useWorkbenchInitialWorkspace>, 'initialHeatCapacityRefreshSession'> & Pick<ReturnType<typeof useWorkbenchFileTreeState>, 'renameInputRef' | 'renamingFileId'> & Pick<ReturnType<typeof useWorkbenchParameterInteractionState>, 'currentParametersBodyRef'> & Pick<ReturnType<typeof useWorkbenchConsoleState>, 'consoleBodyRef'> & { initialHeatCapacityRefreshLayout: HeatCapacityModeJsonObject; window: Window };
export const scheduleWorkbenchRefreshPresentationRestore = ({ initialHeatCapacityRefreshSession, initialHeatCapacityRefreshLayout, consoleBodyRef, currentParametersBodyRef, renameInputRef, renamingFileId, window }: WorkbenchRefreshPresentationRestorePorts) => {
    if (!initialHeatCapacityRefreshSession) return undefined;
    const frameId = window.requestAnimationFrame(() => {
      if (consoleBodyRef.current) {
        consoleBodyRef.current.scrollTop = getHeatCapacityRefreshNumber(
          initialHeatCapacityRefreshLayout,
          'consoleScrollTop',
          0,
        );
      }
      if (currentParametersBodyRef.current) {
        currentParametersBodyRef.current.scrollTop = getHeatCapacityRefreshNumber(
          initialHeatCapacityRefreshLayout,
          'currentParametersScrollTop',
          0,
        );
      }
      if (renameInputRef.current && renamingFileId) {
        const selectionStart = getHeatCapacityRefreshNumber(
          initialHeatCapacityRefreshLayout,
          'renameSelectionStart',
          renameInputRef.current.value.length,
        );
        const selectionEnd = getHeatCapacityRefreshNumber(
          initialHeatCapacityRefreshLayout,
          'renameSelectionEnd',
          selectionStart,
        );
        renameInputRef.current.focus();
        renameInputRef.current.setSelectionRange(selectionStart, selectionEnd);
      }
    });
    return () => window.cancelAnimationFrame(frameId);
  };
