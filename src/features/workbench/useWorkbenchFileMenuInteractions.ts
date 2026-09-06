import { useEffect } from 'react';
import type { WorkbenchMutableRef as Ref, WorkbenchStateSetter as Setter } from './workbenchActionPorts.ts';
import { attachWorkbenchOutsidePointerInteraction } from './workbenchOutsidePointerInteraction.ts';

interface WorkbenchFileMenuInteractionPorts {
  openTopMenu: string | null;
  openFileMenuId: string | null;
  renamingFileId: string | null;
  renameDraft: string;
  topMenuRef: Ref<HTMLElement | null>;
  topCommandsRef: Ref<HTMLElement | null>;
  fileMenuRef: Ref<HTMLElement | null>;
  fileMenuButtonRef: Ref<HTMLElement | null>;
  renameInputRef: Ref<HTMLInputElement | null>;
  setOpenTopMenu: (menu: null) => void;
  setOpenFileMenuId: Setter<string | null>;
  setPendingDeleteFileId: Setter<string | null>;
  commitRenameFileFromOutside: () => void;
}

const subscribePointerDown = (onTarget: (target: Node) => void) => {
  const listener = (event: PointerEvent) => onTarget(event.target as Node);
  document.addEventListener('pointerdown', listener);
  return () => document.removeEventListener('pointerdown', listener);
};

/** Preserves the existing listener lifetimes and draft-specific outside-click closure. */
export const useWorkbenchFileMenuInteractions = (ports: WorkbenchFileMenuInteractionPorts) => {
  const { openTopMenu, openFileMenuId, renamingFileId, renameDraft,
    topMenuRef, topCommandsRef, fileMenuRef, fileMenuButtonRef, renameInputRef,
    setOpenTopMenu, setOpenFileMenuId, setPendingDeleteFileId, commitRenameFileFromOutside } = ports;
  useEffect(() => {
    if (!openTopMenu) return undefined;
    return attachWorkbenchOutsidePointerInteraction({
      subscribe: subscribePointerDown,
      contains: target => Boolean(topMenuRef.current?.contains(target) || topCommandsRef.current?.contains(target)),
      onOutside: () => setOpenTopMenu(null),
    });
  }, [openTopMenu]);
  useEffect(() => {
    if (!openFileMenuId) return undefined;
    return attachWorkbenchOutsidePointerInteraction({
      subscribe: subscribePointerDown,
      contains: target => Boolean(fileMenuRef.current?.contains(target) || fileMenuButtonRef.current?.contains(target)),
      onOutside: () => { setOpenFileMenuId(null); setPendingDeleteFileId(null); },
    });
  }, [openFileMenuId]);
  useEffect(() => {
    if (!renamingFileId) return undefined;
    return attachWorkbenchOutsidePointerInteraction({
      subscribe: subscribePointerDown,
      contains: target => Boolean(renameInputRef.current?.contains(target)),
      onOutside: commitRenameFileFromOutside,
    });
  }, [renamingFileId, renameDraft]);

};

/** Kept at the original focus-effect position in the shell's effect order. */
export const useWorkbenchRenameFocus = (renamingFileId: string | null, renameInputRef: Ref<HTMLInputElement | null>) => {
  useEffect(() => {
    if (!renamingFileId) return undefined;
    const frameId = window.requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [renamingFileId]);
};
