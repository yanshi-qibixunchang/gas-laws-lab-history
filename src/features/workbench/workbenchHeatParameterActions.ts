import { getHeatCapacityFreeParameterLockReason, applyHeatCapacityFreeParameterDraftWorkbenchState, isHeatCapacityFreeGasTypeEditingAvailable, resetHeatCapacityFreeParametersToDefaultWorkbenchState } from './workbenchHeatCapacityFreeParameterState.ts';
import { getHeatCapacityFreeParameterLockMessage } from './workbenchParameterPresentation.ts';
import { heatCapacityFreeSharedText, type HeatCapacityFreeDraftNumberKey, heatCapacityFreeBasicNumberParameters, type HeatCapacityFreeBasicCheckboxKey, heatCapacityFreeAdvancedNumberParameters } from '../heatCapacity/heatCapacityFreeParameterPanelModel.ts';
import { type WorkbenchConsoleMessageFactory } from './workbenchConsoleLocalization.ts';
import { selectHeatCapacityFreeAppliedParameterDraft, selectHeatCapacityFreeGasType } from './workbenchHeatCapacityFreeAuthorityTransaction.ts';
import { type HeatCapacityFreeGasType, type HeatCapacityFreeParameterDraft } from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import { acknowledgeHeatCapacityFreeFileNoticeWorkbenchState } from './workbenchHeatCapacityFileFactory.ts';

import type React from 'react';

export interface createWorkbenchHeatParameterActionsPorts {
  filesRef: React.MutableRefObject<import('./workbenchFileUnion.ts').WorkbenchFileState[]>;
  activeFileIdRef: React.MutableRefObject<string>;
  setParametersCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  setHeatCapacityAdvancedOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setPinnedHeatCapacityParamHelpId: React.Dispatch<React.SetStateAction<string | null>>;
  setHoveredHeatCapacityParamHelpId: React.Dispatch<React.SetStateAction<string | null>>;
  setHeatCapacityParamHelpPopoverStyle: React.Dispatch<React.SetStateAction<React.CSSProperties | undefined>>;
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  setScanInputToast: React.Dispatch<React.SetStateAction<string | null>>;
  pushLog: (message: import('./workbenchConsoleLocalization.ts').WorkbenchConsoleMessageInput, kind?: import('./workbenchConsolePresentation.ts').LogKind) => void;
  activeHeatCapacityFreeIdealReadonly: boolean;
  activeHeatCapacityFreeParameterLocked: boolean;
  validateHeatCapacityFreeNumberValue: (definition: import('../heatCapacity/heatCapacityFreeParameterPanelModel.ts').HeatCapacityFreeNumberParameterDefinition, valueText: string, draft: import('../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts').HeatCapacityFreeParameterDraft, options?: { checkMax?: boolean; }) => { valid: true; value: number; } | { valid: false; message: string; getMessage: import('./workbenchConsoleLocalization.ts').WorkbenchConsoleMessageFactory; };
  setHeatCapacityBasicInputErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  updateActiveFile: (updater: (file: import('./workbenchFileUnion.ts').WorkbenchFileState) => import('./workbenchFileUnion.ts').WorkbenchFileState) => void;
  setHeatCapacityBasicInputDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setHeatCapacityHardSphereViewEnabled: (checked: boolean) => void;
  setHeatCapacityRestoreDefaultConfirmOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setHeatCapacityAdvancedDraft: React.Dispatch<React.SetStateAction<import('../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts').HeatCapacityFreeParameterDraft | null>>;
  setHeatCapacityAdvancedInputDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setHeatCapacityAdvancedInputErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  guardWorkbenchTutorialAction: (action: import('../learning/workbenchTutorialAccessPolicy.ts').WorkbenchTutorialAccessAction) => boolean;
  heatCapacityAdvancedInputDrafts: Record<string, string>;
  getHeatCapacityFreeParameterMaximum: (definition: import('../heatCapacity/heatCapacityFreeParameterPanelModel.ts').HeatCapacityFreeNumberParameterDefinition, draft: import('../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts').HeatCapacityFreeParameterDraft) => number;
  getHeatCapacityFreeValueTooLargeMessage: (definition: import('../heatCapacity/heatCapacityFreeParameterPanelModel.ts').HeatCapacityFreeNumberParameterDefinition, maxValue: number, language?: "zh-CN" | "zh-TW" | "en") => string;
}

export function createWorkbenchHeatParameterActions({
  filesRef,
  activeFileIdRef,
  setParametersCollapsed,
  setHeatCapacityAdvancedOpen,
  setPinnedHeatCapacityParamHelpId,
  setHoveredHeatCapacityParamHelpId,
  setHeatCapacityParamHelpPopoverStyle,
  activeFile,
  settingsLanguagePreference,
  setScanInputToast,
  pushLog,
  activeHeatCapacityFreeIdealReadonly,
  activeHeatCapacityFreeParameterLocked,
  validateHeatCapacityFreeNumberValue,
  setHeatCapacityBasicInputErrors,
  updateActiveFile,
  setHeatCapacityBasicInputDrafts,
  setHeatCapacityHardSphereViewEnabled,
  setHeatCapacityRestoreDefaultConfirmOpen,
  setHeatCapacityAdvancedDraft,
  setHeatCapacityAdvancedInputDrafts,
  setHeatCapacityAdvancedInputErrors,
  guardWorkbenchTutorialAction,
  heatCapacityAdvancedInputDrafts,
  getHeatCapacityFreeParameterMaximum,
  getHeatCapacityFreeValueTooLargeMessage,
}: createWorkbenchHeatParameterActionsPorts) {
const collapseHeatCapacityFreeParameterSidebarForExperimentAction = () => {
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (!currentFile || currentFile.kind !== 'heatCapacity' || currentFile.heatCapacityMode !== 'free') return;
    setParametersCollapsed(true);
    setHeatCapacityAdvancedOpen(false);
    setPinnedHeatCapacityParamHelpId(null);
    setHoveredHeatCapacityParamHelpId(null);
    setHeatCapacityParamHelpPopoverStyle(undefined);
  };

const showHeatCapacityFreeParameterLockHint = () => {
    const lockReason = getHeatCapacityFreeParameterLockReason(activeFile);
    const message = getHeatCapacityFreeParameterLockMessage(lockReason, settingsLanguagePreference);
    if (!message) return;
    setScanInputToast(message);
    pushLog(
      (language) => `${activeFile.name}: ${getHeatCapacityFreeParameterLockMessage(lockReason, language) ?? message}`,
      'warning',
    );
  };

const showHeatCapacityFreeIdealReadonlyHint = () => {
    const message = heatCapacityFreeSharedText.idealProfileReadonlyToast[settingsLanguagePreference];
    setScanInputToast(message);
    pushLog(
      (language) => `${activeFile.name}: ${heatCapacityFreeSharedText.idealProfileReadonlyToast[language]}`,
      'warning',
    );
  };

const showHeatCapacityFreeParameterInputError = (
    message: string,
    getMessage?: WorkbenchConsoleMessageFactory,
  ) => {
    setScanInputToast(message);
    pushLog((language) => `${activeFile.name}: ${getMessage?.(language) ?? message}`, 'warning');
  };

const commitHeatCapacityBasicParameterInput = (
    parameterId: HeatCapacityFreeDraftNumberKey,
    valueText: string,
  ) => {
    if (activeHeatCapacityFreeIdealReadonly) {
      showHeatCapacityFreeIdealReadonlyHint();
      return;
    }
    if (activeHeatCapacityFreeParameterLocked) {
      showHeatCapacityFreeParameterLockHint();
      return;
    }
    const definition = heatCapacityFreeBasicNumberParameters.find((param) => param.id === parameterId);
    if (!definition) return;
    if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return;
    const validation = validateHeatCapacityFreeNumberValue(
      definition,
      valueText,
      selectHeatCapacityFreeAppliedParameterDraft(activeFile),
    );
    if (validation.valid === false) {
      setHeatCapacityBasicInputErrors((current) => ({
        ...current,
        [parameterId]: validation.message,
      }));
      if (
        validation.message.includes(heatCapacityFreeSharedText.valueTooLarge[settingsLanguagePreference]) ||
        validation.message.includes(heatCapacityFreeSharedText.valueTooSmall[settingsLanguagePreference])
      ) {
        showHeatCapacityFreeParameterInputError(validation.message, validation.getMessage);
      }
      return;
    }
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity' || file.heatCapacityMode !== 'free') return file;
      return {
        ...applyHeatCapacityFreeParameterDraftWorkbenchState(file, {
          ...selectHeatCapacityFreeAppliedParameterDraft(file),
          [parameterId]: validation.value,
        }),
        updatedAt: Date.now(),
      };
    });
    setHeatCapacityBasicInputDrafts((current) => {
      const { [parameterId]: _removed, ...rest } = current;
      return rest;
    });
    setHeatCapacityBasicInputErrors((current) => {
      const { [parameterId]: _removed, ...rest } = current;
      return rest;
    });
  };

const setHeatCapacityBasicCheckbox = (
    parameterId: HeatCapacityFreeBasicCheckboxKey,
    checked: boolean,
  ) => {
    if (parameterId === 'hardSphereViewEnabled') {
      setHeatCapacityHardSphereViewEnabled(checked);
      return;
    }
    if (activeHeatCapacityFreeIdealReadonly) {
      showHeatCapacityFreeIdealReadonlyHint();
      return;
    }
    if (activeHeatCapacityFreeParameterLocked) {
      showHeatCapacityFreeParameterLockHint();
      return;
    }
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity' || file.heatCapacityMode !== 'free') return file;
      return {
        ...applyHeatCapacityFreeParameterDraftWorkbenchState(file, {
          ...selectHeatCapacityFreeAppliedParameterDraft(file),
          [parameterId]: checked,
        }),
        updatedAt: Date.now(),
      };
    });
  };

const setHeatCapacityFreeGasType = (
    gasType: HeatCapacityFreeGasType,
  ) => {
    const currentFile = filesRef.current.find((file) => file.id === activeFileIdRef.current);
    if (!currentFile || currentFile.kind !== 'heatCapacity' || currentFile.heatCapacityMode !== 'free') return;
    if (selectHeatCapacityFreeGasType(currentFile) === gasType) return;
    const parameterLockReason = getHeatCapacityFreeParameterLockReason(currentFile);
    if (parameterLockReason) {
      const message = getHeatCapacityFreeParameterLockMessage(parameterLockReason, settingsLanguagePreference);
      if (message) {
        setScanInputToast(message);
        pushLog(
          (language) => `${currentFile.name}: ${getHeatCapacityFreeParameterLockMessage(parameterLockReason, language) ?? message}`,
          'warning',
        );
      }
      return;
    }
    if (!isHeatCapacityFreeGasTypeEditingAvailable(currentFile)) {
      const message = heatCapacityFreeSharedText.gasTypeLocked[settingsLanguagePreference];
      setScanInputToast(message);
      pushLog(
        (language) => `${currentFile.name}: ${heatCapacityFreeSharedText.gasTypeLocked[language]}`,
        'warning',
      );
      return;
    }
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity' || file.heatCapacityMode !== 'free') return file;
      return {
        ...applyHeatCapacityFreeParameterDraftWorkbenchState(file, {
          ...selectHeatCapacityFreeAppliedParameterDraft(file),
          gasType,
        }),
        updatedAt: Date.now(),
      };
    });
  };

const openHeatCapacityRestoreDefaultConfirm = () => {
    if (activeHeatCapacityFreeIdealReadonly) {
      showHeatCapacityFreeIdealReadonlyHint();
      return;
    }
    if (activeHeatCapacityFreeParameterLocked) {
      showHeatCapacityFreeParameterLockHint();
      return;
    }
    setHeatCapacityRestoreDefaultConfirmOpen(true);
  };

const cancelHeatCapacityRestoreDefault = () => {
    setHeatCapacityRestoreDefaultConfirmOpen(false);
  };

const confirmHeatCapacityRestoreDefault = () => {
    if (activeHeatCapacityFreeIdealReadonly) {
      setHeatCapacityRestoreDefaultConfirmOpen(false);
      showHeatCapacityFreeIdealReadonlyHint();
      return;
    }
    if (activeHeatCapacityFreeParameterLocked) {
      setHeatCapacityRestoreDefaultConfirmOpen(false);
      showHeatCapacityFreeParameterLockHint();
      return;
    }
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity' || file.heatCapacityMode !== 'free') return file;
      return {
        ...resetHeatCapacityFreeParametersToDefaultWorkbenchState(file),
        updatedAt: Date.now(),
      };
    });
    setHeatCapacityBasicInputDrafts({});
    setHeatCapacityBasicInputErrors({});
    setHeatCapacityAdvancedOpen(false);
    setHeatCapacityAdvancedDraft(null);
    setHeatCapacityAdvancedInputDrafts({});
    setHeatCapacityAdvancedInputErrors({});
    setHeatCapacityRestoreDefaultConfirmOpen(false);
  };

const createHeatCapacityAdvancedDraftFromFile = (): HeatCapacityFreeParameterDraft | null => (
    activeFile.kind === 'heatCapacity' && activeFile.heatCapacityMode === 'free'
      ? { ...selectHeatCapacityFreeAppliedParameterDraft(activeFile) }
      : null
  );

const openHeatCapacityAdvancedSettings = () => {
    if (!guardWorkbenchTutorialAction('open-parameter-window')) return;
    if (activeHeatCapacityFreeParameterLocked) {
      showHeatCapacityFreeParameterLockHint();
      return;
    }
    const draft = createHeatCapacityAdvancedDraftFromFile();
    if (!draft) return;
    setHeatCapacityAdvancedDraft(draft);
    setHeatCapacityAdvancedInputDrafts({});
    setHeatCapacityAdvancedInputErrors({});
    setHeatCapacityAdvancedOpen(true);
  };

const cancelHeatCapacityAdvancedParameterDraft = () => {
    setHeatCapacityAdvancedOpen(false);
    setHeatCapacityAdvancedDraft(null);
    setHeatCapacityAdvancedInputDrafts({});
    setHeatCapacityAdvancedInputErrors({});
  };

const saveHeatCapacityAdvancedParameterDraft = (
    draft: HeatCapacityFreeParameterDraft,
  ) => {
    if (activeHeatCapacityFreeIdealReadonly) {
      showHeatCapacityFreeIdealReadonlyHint();
      return;
    }
    if (activeHeatCapacityFreeParameterLocked) {
      showHeatCapacityFreeParameterLockHint();
      return;
    }
    const nextDraft = { ...draft };
    const nextErrors: Record<string, string> = {};
    const nextErrorMessages: Record<string, WorkbenchConsoleMessageFactory> = {};
    const parsedValues: Partial<Record<HeatCapacityFreeDraftNumberKey, number>> = {};
    heatCapacityFreeAdvancedNumberParameters.forEach((definition) => {
      const rawValue = heatCapacityAdvancedInputDrafts[definition.id];
      if (rawValue === undefined) return;
      const validation = validateHeatCapacityFreeNumberValue(
        definition,
        rawValue,
        nextDraft,
        { checkMax: false },
      );
      if (validation.valid === false) {
        nextErrors[definition.id] = validation.message;
        nextErrorMessages[definition.id] = validation.getMessage;
        return;
      }
      parsedValues[definition.id] = validation.value;
    });
    Object.entries(parsedValues).forEach(([id, value]) => {
      nextDraft[id as HeatCapacityFreeDraftNumberKey] = value;
    });
    heatCapacityFreeAdvancedNumberParameters.forEach((definition) => {
      const maxValue = getHeatCapacityFreeParameterMaximum(definition, nextDraft);
      if (maxValue !== null && nextDraft[definition.id] > maxValue) {
        nextErrors[definition.id] = getHeatCapacityFreeValueTooLargeMessage(definition, maxValue);
        nextErrorMessages[definition.id] = (language) => getHeatCapacityFreeValueTooLargeMessage(
          definition,
          maxValue,
          language,
        );
      }
    });
    if (Object.keys(nextErrors).length > 0) {
      setHeatCapacityAdvancedInputErrors(nextErrors);
      const firstErrorId = Object.keys(nextErrors)[0];
      const firstError = nextErrors[firstErrorId];
      if (
        firstError.includes(heatCapacityFreeSharedText.valueTooLarge[settingsLanguagePreference]) ||
        firstError.includes(heatCapacityFreeSharedText.valueTooSmall[settingsLanguagePreference])
      ) {
        showHeatCapacityFreeParameterInputError(firstError, nextErrorMessages[firstErrorId]);
      }
      return;
    }
    updateActiveFile((file) => {
      if (file.kind !== 'heatCapacity' || file.heatCapacityMode !== 'free') return file;
      return {
        ...applyHeatCapacityFreeParameterDraftWorkbenchState(file, nextDraft),
        updatedAt: Date.now(),
      };
    });
    setHeatCapacityAdvancedOpen(false);
    setHeatCapacityAdvancedDraft(null);
    setHeatCapacityAdvancedInputDrafts({});
    setHeatCapacityAdvancedInputErrors({});
  };

const acknowledgeHeatCapacityFreeAdvancedRisk = () => {
    updateActiveFile((file) => (
      file.kind === 'heatCapacity' && file.heatCapacityMode === 'free'
        ? {
            ...acknowledgeHeatCapacityFreeFileNoticeWorkbenchState(file, 'advancedParametersRisk'),
            updatedAt: Date.now(),
          }
        : file
    ));
  };

const showHeatCapacityGasTypeLockHint = () => {
              const message = heatCapacityFreeSharedText.gasTypeLocked[settingsLanguagePreference];
              setScanInputToast(message);
              pushLog(
                (language) => `${activeFile.name}: ${heatCapacityFreeSharedText.gasTypeLocked[language]}`,
                'warning',
              );
              return;
            };

  const changeHeatCapacityParameterInputDraft = (scope: 'basic' | 'advanced', parameterId: string, nextValue: string) => {
    const setInputDrafts = scope === 'basic' ? setHeatCapacityBasicInputDrafts : setHeatCapacityAdvancedInputDrafts;
    setInputDrafts((current) => ({ ...current, [parameterId]: nextValue }));
    const setInputErrors = scope === 'basic' ? setHeatCapacityBasicInputErrors : setHeatCapacityAdvancedInputErrors;
    setInputErrors((current) => {
      const { [parameterId]: _removed, ...rest } = current;
      return rest;
    });
  };

  return { changeHeatCapacityParameterInputDraft, collapseHeatCapacityFreeParameterSidebarForExperimentAction, showHeatCapacityFreeParameterLockHint, commitHeatCapacityBasicParameterInput, setHeatCapacityBasicCheckbox, setHeatCapacityFreeGasType, openHeatCapacityRestoreDefaultConfirm, cancelHeatCapacityRestoreDefault, confirmHeatCapacityRestoreDefault, openHeatCapacityAdvancedSettings, cancelHeatCapacityAdvancedParameterDraft, saveHeatCapacityAdvancedParameterDraft, acknowledgeHeatCapacityFreeAdvancedRisk, showHeatCapacityGasTypeLockHint };
}
