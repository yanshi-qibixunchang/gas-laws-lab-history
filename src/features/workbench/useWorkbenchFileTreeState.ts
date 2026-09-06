import { useRef, useState } from 'react';
import type { WorkbenchHeatCapacityRefreshJsonObject } from './workbenchHeatCapacityRefreshSession.ts';
import { getHeatCapacityRefreshBoolean, getHeatCapacityRefreshString } from './workbenchHeatCapacityUiCheckpoint.ts';
import type { WorkbenchSessionState } from './workbenchSession.ts';

export const useWorkbenchFileTreeState = (ports: { initialSession: Pick<WorkbenchSessionState, 'files' | 'activeFileId'>; initialHeatCapacityRefreshLayout: WorkbenchHeatCapacityRefreshJsonObject; initialHeatCapacityRefreshWindows: WorkbenchHeatCapacityRefreshJsonObject; initialHeatCapacityRefreshDrafts: WorkbenchHeatCapacityRefreshJsonObject; }) => {
  const { initialSession, initialHeatCapacityRefreshLayout, initialHeatCapacityRefreshWindows, initialHeatCapacityRefreshDrafts } = ports;
  const [selectedFileId, setSelectedFileId] = useState(() => {
    const restoredSelectedFileId = getHeatCapacityRefreshString(initialHeatCapacityRefreshLayout, 'selectedFileId');
    return restoredSelectedFileId && initialSession.files.some((file) => file.id === restoredSelectedFileId)
      ? restoredSelectedFileId
      : initialSession.activeFileId;
  });
  const [filesSectionCollapsed, setFilesSectionCollapsed] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshLayout, 'filesSectionCollapsed')
  ));
  const [panelsSectionCollapsed, setPanelsSectionCollapsed] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshLayout, 'panelsSectionCollapsed')
  ));
  const [openFileMenuId, setOpenFileMenuId] = useState<string | null>(() => (
    getHeatCapacityRefreshString(initialHeatCapacityRefreshWindows, 'openFileMenuId')
  ));
  const [renamingFileId, setRenamingFileId] = useState<string | null>(() => (
    getHeatCapacityRefreshString(initialHeatCapacityRefreshWindows, 'renamingFileId')
  ));
  const [renameDraft, setRenameDraft] = useState(() => (
    getHeatCapacityRefreshString(initialHeatCapacityRefreshDrafts, 'renameDraft', '') ?? ''
  ));
  const [pendingDeleteFileId, setPendingDeleteFileId] = useState<string | null>(null);
  const [resultsChildrenCollapsed, setResultsChildrenCollapsed] = useState(() => (
    getHeatCapacityRefreshBoolean(initialHeatCapacityRefreshLayout, 'resultsChildrenCollapsed')
  ));
  const renamingFileIdRef = useRef<string | null>(renamingFileId);
  const fileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const fileMenuRef = useRef<HTMLDivElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const renameSelectionModeRef = useRef<'initial' | 'normal'>('normal');

  return { selectedFileId, setSelectedFileId, filesSectionCollapsed, setFilesSectionCollapsed, panelsSectionCollapsed, setPanelsSectionCollapsed, openFileMenuId, setOpenFileMenuId, renamingFileId, setRenamingFileId, renameDraft, setRenameDraft, pendingDeleteFileId, setPendingDeleteFileId, resultsChildrenCollapsed, setResultsChildrenCollapsed, renamingFileIdRef, fileMenuButtonRef, fileMenuRef, renameInputRef, renameSelectionModeRef };
};
