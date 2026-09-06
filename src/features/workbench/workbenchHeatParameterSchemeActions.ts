import { heatCapacityFreeSharedText } from '../heatCapacity/heatCapacityFreeParameterPanelModel.ts';
import { selectCurrentHeatCapacityFreeExperimentGroup } from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import { isHeatCapacityFreeExperimentStarted, setHeatCapacityFreeParameterSchemeWorkbenchState } from './workbenchHeatCapacityFreeExperimentGroupState.ts';
import { acknowledgeHeatCapacityFreeFileNoticeWorkbenchState } from './workbenchHeatCapacityFileFactory.ts';

import type React from 'react';

export interface createWorkbenchHeatParameterSchemeActionsPorts {
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  setScanInputToast: React.Dispatch<React.SetStateAction<string | null>>;
  pushLog: (message: import('./workbenchConsoleLocalization.ts').WorkbenchConsoleMessageInput, kind?: import('./workbenchConsolePresentation.ts').LogKind) => void;
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  filesRef: React.MutableRefObject<import('./workbenchFileUnion.ts').WorkbenchFileState[]>;
  activeFileIdRef: React.MutableRefObject<string>;
  updateActiveFile: (updater: (file: import('./workbenchFileUnion.ts').WorkbenchFileState) => import('./workbenchFileUnion.ts').WorkbenchFileState) => void;
  setHeatCapacityIdealIntroOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function createWorkbenchHeatParameterSchemeActions({
  settingsLanguagePreference,
  setScanInputToast,
  pushLog,
  activeFile,
  filesRef,
  activeFileIdRef,
  updateActiveFile,
  setHeatCapacityIdealIntroOpen,
}: createWorkbenchHeatParameterSchemeActionsPorts) {
const showHeatCapacityFreeSchemeLockHint = () => {
    const message = heatCapacityFreeSharedText.idealProfileLockedHint[settingsLanguagePreference];
    setScanInputToast(message);
    pushLog(
      (language) => `${activeFile.name}: ${heatCapacityFreeSharedText.idealProfileLockedHint[language]}`,
      'warning',
    );
  };

const requestToggleHeatCapacityFreeParameterScheme = () => {
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (!currentFile || currentFile.kind !== 'heatCapacity' || currentFile.heatCapacityMode !== 'free') return;
    const currentGroup = selectCurrentHeatCapacityFreeExperimentGroup(
      currentFile.heatCapacityFreeExperimentGroups,
    );
    const currentGroupTerminal = currentGroup?.status === 'completed' ||
      currentGroup?.status === 'legacy-incomplete-readonly';
    if (!currentGroupTerminal && isHeatCapacityFreeExperimentStarted(currentFile)) {
      showHeatCapacityFreeSchemeLockHint();
      return;
    }
    const selectedScheme = currentGroup?.status === 'completed' ||
      currentGroup?.status === 'legacy-incomplete-readonly'
      ? currentFile.heatCapacityFreeExperimentGroups.pendingNextScheme
      : currentFile.heatCapacityFreeParameterScheme;
    if (selectedScheme === 'ideal') {
      updateActiveFile((file) => (
        file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
          ? setHeatCapacityFreeParameterSchemeWorkbenchState(file, 'real', Date.now())
        : file
      ));
      return;
    }
    if (!currentFile.heatCapacityFreeFileAcknowledgements.idealParameterProfileIntro) {
      updateActiveFile((file) => (
        file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
          ? {
              ...acknowledgeHeatCapacityFreeFileNoticeWorkbenchState(file, 'idealParameterProfileIntro'),
              updatedAt: Date.now(),
            }
          : file
      ));
      setHeatCapacityIdealIntroOpen(true);
      return;
    }
    updateActiveFile((file) => (
      file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
        ? setHeatCapacityFreeParameterSchemeWorkbenchState(file, 'ideal', Date.now())
        : file
    ));
  };

const cancelHeatCapacityIdealProfileIntro = () => {
    setHeatCapacityIdealIntroOpen(false);
  };

const confirmHeatCapacityIdealProfileIntro = () => {
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    const currentGroup = currentFile?.kind === 'heatCapacity'
      ? selectCurrentHeatCapacityFreeExperimentGroup(currentFile.heatCapacityFreeExperimentGroups)
      : null;
    const currentGroupTerminal = currentGroup?.status === 'completed' ||
      currentGroup?.status === 'legacy-incomplete-readonly';
    if (
      currentFile?.kind === 'heatCapacity' &&
      currentFile.heatCapacityMode === 'free' &&
      !currentGroupTerminal &&
      isHeatCapacityFreeExperimentStarted(currentFile)
    ) {
      setHeatCapacityIdealIntroOpen(false);
      showHeatCapacityFreeSchemeLockHint();
      return;
    }
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity' || file.heatCapacityMode !== 'free') return file;
      const acknowledgedFile = acknowledgeHeatCapacityFreeFileNoticeWorkbenchState(file, 'idealParameterProfileIntro');
      return setHeatCapacityFreeParameterSchemeWorkbenchState(acknowledgedFile, 'ideal', Date.now());
    });
    setHeatCapacityIdealIntroOpen(false);
  };

  return { requestToggleHeatCapacityFreeParameterScheme, cancelHeatCapacityIdealProfileIntro, confirmHeatCapacityIdealProfileIntro };
}
