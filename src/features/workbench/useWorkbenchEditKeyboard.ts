import { useEffect } from 'react';
import { isEditableElement } from './workbenchEditableTarget.ts';
import type { WorkbenchMutableRef as Ref } from './workbenchActionPorts.ts';
import type { WorkbenchPanelKey } from './workbenchFileState.ts';
interface WorkbenchEditKeyboardPorts {
 activeHeatCapacityModalLocked: boolean; tutorialActiveRef: Ref<boolean>;
 undoStack: readonly unknown[]; redoStack: readonly unknown[]; undoLastEdit: () => void; redoLastEdit: () => void;
}
export const createWorkbenchEditKeyboardHandler = (ports: WorkbenchEditKeyboardPorts & { isEditableTarget: (target: EventTarget | null) => boolean; getActiveElement: () => EventTarget | null; }) => {
 const { activeHeatCapacityModalLocked, tutorialActiveRef, undoStack, redoStack, undoLastEdit, redoLastEdit } = ports;
 const handleKeyDown = (event: KeyboardEvent) => {
      if (activeHeatCapacityModalLocked) return;
      if (tutorialActiveRef.current) return;
      if (!(event.ctrlKey || event.metaKey) || event.altKey || ports.isEditableTarget(event.target) || ports.isEditableTarget(ports.getActiveElement())) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey && undoStack.length > 0) {
        event.preventDefault();
        undoLastEdit();
        return;
      }

      if ((key === 'y' || (key === 'z' && event.shiftKey)) && redoStack.length > 0) {
        event.preventDefault();
        redoLastEdit();
      }
    };
 return handleKeyDown;
};
export const useWorkbenchEditKeyboard = (ports: WorkbenchEditKeyboardPorts & { selectedPanel: WorkbenchPanelKey }) => {
 const { undoStack, redoStack, selectedPanel, activeHeatCapacityModalLocked } = ports;
 useEffect(() => {
  const handleKeyDown = createWorkbenchEditKeyboardHandler({ ...ports, isEditableTarget: isEditableElement, getActiveElement: () => document.activeElement });
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
 }, [undoStack, redoStack, selectedPanel, activeHeatCapacityModalLocked]);
};
