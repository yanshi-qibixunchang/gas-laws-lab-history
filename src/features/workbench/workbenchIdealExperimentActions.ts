import type React from 'react';
import type { ExperimentRelation, IdealGasExperimentPoint, SimulationParams } from '../../shared/types.ts';
import { getPresetSequence, getRelationLabel, getRelationVariableNumericValue, getRelationVariableKey, getIdealGasAnalysis } from '../../domain/idealGas/idealGasExperiment.ts';
import { cloneParams } from './workbenchFileState.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import { validateWorkbenchParams } from './workbenchParameterState.ts';
import { getIdealVerificationState } from './workbenchIdealParameterState.ts';
import { createWorkbenchIdealScanInput, getSnappedIdealScanValue } from './workbenchIdealScanInput.ts';
import { IDEAL_SCAN_THUMB_SIZE, IDEAL_SCAN_THUMB_HIT_RADIUS, getIdealScanDecimals, type IdealSamplingPreset } from './workbenchIdealControls.ts';
import { formatMetric } from './workbenchPresentationFormatting.ts';
import { workbenchCopies } from './workbenchStudioCopy.ts';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import type { WorkbenchConsoleMessageFactory } from './workbenchConsoleLocalization.ts';
import type { WorkbenchMutableRef as Ref, WorkbenchStateSetter as Setter, WorkbenchLogWriter } from './workbenchActionPorts.ts';
export interface UpdateIdealScanVariableOptions {
  snap?: boolean;
}

export interface WorkbenchIdealExperimentActionPorts {
  getActiveFile: () => WorkbenchFileState;
  getParameterControlsLocked: () => boolean;
  getScanInputDraft: () => string;
  getPendingRemovePointId: () => string | null;
  getPendingClearRelationKey: () => string | null;
  settingsLanguagePreference: WorkbenchLanguagePreference;
  captureUndoSnapshot: (label: string) => void;
  updateActiveFile: (update: (file: WorkbenchFileState) => WorkbenchFileState) => void;
  applyActiveFileParams: (params: SimulationParams) => unknown;
  showWorkbenchValidationErrors: (validation: { errors: string[] }) => void;
  scanInputRef: Ref<HTMLInputElement | null>;
  lastScanInputErrorRef: Ref<string | null>;
  deferInputFocus: (callback: () => void) => void;
  setPendingRemovePointId: Setter<string | null>;
  setPendingClearRelationKey: Setter<string | null>;
  setSamplingPresetMenuOpen: Setter<boolean>;
  setScanInputError: Setter<string | null>;
  setParameterErrors: Setter<string[]>;
  setScanInputToast: Setter<string | null>;
  setScanInputDraft: Setter<string>;
  setScanInputFocused: Setter<boolean>;
  pushLog: WorkbenchLogWriter;
}

/** Ideal experiment edits use the existing parameter/runtime and history owners. */
export const createWorkbenchIdealExperimentActions = (ports: WorkbenchIdealExperimentActionPorts) => {
  const { captureUndoSnapshot, updateActiveFile, applyActiveFileParams, showWorkbenchValidationErrors,
    scanInputRef, lastScanInputErrorRef, setPendingRemovePointId, setPendingClearRelationKey,
    setSamplingPresetMenuOpen, setScanInputError, setParameterErrors, setScanInputToast,
    setScanInputDraft, setScanInputFocused, pushLog } = ports;
  const { parseIdealScanInput } = createWorkbenchIdealScanInput(ports.settingsLanguagePreference);
  const changeIdealRelation = (nextRelation: ExperimentRelation) => {
    const activeFile = ports.getActiveFile();
    if (activeFile.kind !== 'ideal') return;
    if (activeFile.runState === 'running') {
      pushLog(
        (language) => workbenchCopies[language].logs.pauseBeforeSwitchingRelation(activeFile.name),
        'warning',
      );
      return;
    }
    if (activeFile.relation === nextRelation) {
      pushLog(
        (language) => workbenchCopies[language].logs.relationAlreadyActive(activeFile.name, getRelationLabel(nextRelation)),
      );
      return;
    }

    captureUndoSnapshot('changed ideal relation');
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      const analysis = getIdealGasAnalysis(nextRelation, file.pointsByRelation, file.activeParams);
      return {
        ...file,
        relation: nextRelation,
        verificationState: getIdealVerificationState(analysis),
        historyUnlocked: analysis.isVerified,
        updatedAt: Date.now(),
      };
    });
    setPendingRemovePointId(null);
    setPendingClearRelationKey(null);
    setSamplingPresetMenuOpen(false);
    pushLog(
      (language) => workbenchCopies[language].logs.relationSwitched(activeFile.name, getRelationLabel(nextRelation)),
      'success',
    );
  };

  const applyIdealSamplingPreset = (preset: IdealSamplingPreset) => {
    const activeFile = ports.getActiveFile();
    if (activeFile.kind !== 'ideal') return;
    if (activeFile.runState === 'running') {
      pushLog(
        (language) => workbenchCopies[language].logs.pauseBeforeChangingSamplingPreset(activeFile.name),
        'warning',
      );
      return;
    }

    applyActiveFileParams({
      ...activeFile.params,
      equilibriumTime: preset.equilibriumTime,
      statsDuration: preset.statsDuration,
    });
  };

  const showScanInputError = (
    message: string,
    getMessage: WorkbenchConsoleMessageFactory,
    options: { refocus?: boolean; rawValue?: string } = {},
  ) => {
    const activeFile = ports.getActiveFile();
    setScanInputError(message);
    setParameterErrors([message]);
    setScanInputToast(message);
    const errorKey = `${message}\n${options.rawValue ?? ''}`;
    if (lastScanInputErrorRef.current !== errorKey) {
      lastScanInputErrorRef.current = errorKey;
      pushLog((language) => `${activeFile.name}: ${getMessage(language)}`, 'error');
    }
    if (options.refocus) {
      ports.deferInputFocus(() => {
        scanInputRef.current?.focus();
        scanInputRef.current?.select();
      });
    }
  };

  const clearScanInputError = () => {
    lastScanInputErrorRef.current = null;
    setScanInputError(null);
    setParameterErrors([]);
  };

  const validateIdealScanDraft = (rawValue: string) => {
    const activeFile = ports.getActiveFile();
    if (activeFile.kind !== 'ideal') return true;
    const presetSequence = getPresetSequence(activeFile.relation);
    const relationVariableValue = getRelationVariableNumericValue(activeFile.relation, activeFile.params);
    const scanMin = Math.min(...presetSequence, relationVariableValue);
    const scanMax = Math.max(...presetSequence, relationVariableValue);
    const parsed = parseIdealScanInput(rawValue, activeFile.relation, scanMin, scanMax);

    if (parsed.valid === false) {
      showScanInputError(parsed.message, parsed.getMessage, { rawValue });
      return false;
    }

    clearScanInputError();
    return true;
  };

  const updateIdealScanVariable = (rawValue: number, options: UpdateIdealScanVariableOptions = {}) => {
    const activeFile = ports.getActiveFile();
    if (activeFile.kind !== 'ideal') return;
    if (activeFile.runState === 'running') {
      pushLog(
        (language) => workbenchCopies[language].logs.pauseBeforeChangingScanVariable(activeFile.name),
        'warning',
      );
      return;
    }

    const relationKey = getRelationVariableKey(activeFile.relation);
    const nextParams = cloneParams(activeFile.params);
    const snappedValue = options.snap === false ? rawValue : getSnappedIdealScanValue(activeFile.relation, rawValue);
    const nextValue = relationKey === 'N' ? Math.round(snappedValue) : snappedValue;
    const currentValue = getRelationVariableNumericValue(activeFile.relation, activeFile.params);

    if (Math.abs(nextValue - currentValue) <= 1e-6) return;

    if (relationKey === 'targetTemperature') nextParams.targetTemperature = nextValue;
    if (relationKey === 'L') nextParams.L = nextValue;
    if (relationKey === 'N') nextParams.N = Math.round(nextValue);

    const validation = validateWorkbenchParams(nextParams);
    if (!validation.valid) {
      showWorkbenchValidationErrors(validation);
      return;
    }

    captureUndoSnapshot('changed ideal scan variable');
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      return {
        ...file,
        params: nextParams,
        needsReset: true,
        updatedAt: Date.now(),
      };
    });
    setParameterErrors([]);
    setScanInputError(null);
    setScanInputDraft(formatMetric(nextValue, getIdealScanDecimals(activeFile.relation)));
  };

  const commitIdealScanInput = () => {
    const activeFile = ports.getActiveFile();
    const parameterControlsLocked = ports.getParameterControlsLocked();
    const scanInputDraft = ports.getScanInputDraft();
    if (activeFile.kind !== 'ideal') return;
    if (parameterControlsLocked) return;

    const presetSequence = getPresetSequence(activeFile.relation);
    const relationVariableValue = getRelationVariableNumericValue(activeFile.relation, activeFile.params);
    const scanMin = Math.min(...presetSequence, relationVariableValue);
    const scanMax = Math.max(...presetSequence, relationVariableValue);
    const parsed = parseIdealScanInput(scanInputDraft, activeFile.relation, scanMin, scanMax);

    if (parsed.valid === false) {
      showScanInputError(parsed.message, parsed.getMessage, { refocus: true, rawValue: scanInputDraft });
      return;
    }

    updateIdealScanVariable(parsed.value, { snap: false });
    scanInputRef.current?.blur();
    setScanInputFocused(false);
    clearScanInputError();
  };

  const isPointerOnIdealScanThumb = (
    event: React.PointerEvent<HTMLInputElement>,
    scanProgressPercent: number,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const thumbCenterX = rect.left
      + (IDEAL_SCAN_THUMB_SIZE / 2)
      + ((rect.width - IDEAL_SCAN_THUMB_SIZE) * scanProgressPercent) / 100;
    return Math.abs(event.clientX - thumbCenterX) <= IDEAL_SCAN_THUMB_HIT_RADIUS;
  };

  const requestRemoveIdealPoint = (point: IdealGasExperimentPoint) => {
    const activeFile = ports.getActiveFile();
    const pendingRemovePointId = ports.getPendingRemovePointId();
    if (activeFile.kind !== 'ideal') return;

    if (pendingRemovePointId !== point.id) {
      setPendingRemovePointId(point.id);
      pushLog(
        (language) => workbenchCopies[language].logs.confirmRemoveIdealPoint(activeFile.name, getRelationLabel(point.relation)),
        'warning',
      );
      return;
    }

    captureUndoSnapshot('removed ideal experiment point');
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      const nextPointsByRelation = {
        ...file.pointsByRelation,
        [point.relation]: file.pointsByRelation[point.relation].filter((candidate) => candidate.id !== point.id),
      };
      const analysis = getIdealGasAnalysis(file.relation, nextPointsByRelation, file.activeParams);
      return {
        ...file,
        pointsByRelation: nextPointsByRelation,
        verificationState: getIdealVerificationState(analysis),
        historyUnlocked: analysis.isVerified,
        updatedAt: Date.now(),
      };
    });
    setPendingRemovePointId(null);
    pushLog(
      (language) => workbenchCopies[language].logs.idealPointRemoved(activeFile.name),
      'warning',
    );
  };

  const cancelRemoveIdealPoint = () => {
    setPendingRemovePointId(null);
  };

  const cancelClearIdealRelation = () => {
    setPendingClearRelationKey(null);
  };

  const requestClearIdealRelation = () => {
    const activeFile = ports.getActiveFile();
    const pendingClearRelationKey = ports.getPendingClearRelationKey();
    if (activeFile.kind !== 'ideal') return;

    const points = activeFile.pointsByRelation[activeFile.relation];
    if (points.length === 0) {
      pushLog(
        (language) => workbenchCopies[language].logs.relationHasNoPoints(activeFile.name, getRelationLabel(activeFile.relation)),
      );
      return;
    }

    const clearKey = `${activeFile.id}:${activeFile.relation}`;
    if (pendingClearRelationKey !== clearKey) {
      setPendingClearRelationKey(clearKey);
      pushLog(
        (language) => workbenchCopies[language].logs.confirmClear(activeFile.name, getRelationLabel(activeFile.relation)),
        'warning',
      );
      return;
    }

    captureUndoSnapshot('cleared ideal relation points');
    updateActiveFile((file) => {
      if (file.kind !== 'ideal') return file;
      const nextPointsByRelation = {
        ...file.pointsByRelation,
        [file.relation]: [],
      };
      const analysis = getIdealGasAnalysis(file.relation, nextPointsByRelation, file.activeParams);
      return {
        ...file,
        pointsByRelation: nextPointsByRelation,
        verificationState: getIdealVerificationState(analysis),
        historyUnlocked: analysis.isVerified,
        updatedAt: Date.now(),
      };
    });
    setPendingClearRelationKey(null);
    setPendingRemovePointId(null);
    pushLog(
      (language) => workbenchCopies[language].logs.clearedRelation(activeFile.name, getRelationLabel(activeFile.relation)),
      'warning',
    );
  };

  return { changeIdealRelation, applyIdealSamplingPreset, showScanInputError, clearScanInputError, validateIdealScanDraft, updateIdealScanVariable, commitIdealScanInput, isPointerOnIdealScanThumb, requestRemoveIdealPoint, cancelRemoveIdealPoint, cancelClearIdealRelation, requestClearIdealRelation };
};
