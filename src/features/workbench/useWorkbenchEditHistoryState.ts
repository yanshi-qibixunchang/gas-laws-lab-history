import { useRef, useState } from 'react';
import type { WorkbenchEditSnapshot } from './workbenchEditSnapshot.ts';
export const useWorkbenchEditHistoryState = () => {
  const [undoStack, setUndoStack] = useState<WorkbenchEditSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<WorkbenchEditSnapshot[]>([]);
  const undoStackRef = useRef<WorkbenchEditSnapshot[]>(undoStack);
  const redoStackRef = useRef<WorkbenchEditSnapshot[]>(redoStack);
  return { undoStack, setUndoStack, redoStack, setRedoStack, undoStackRef, redoStackRef };
};
