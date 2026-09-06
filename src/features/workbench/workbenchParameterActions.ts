import type { SimulationParams, Particle } from '../../shared/types.ts';
import { PhysicsEngine } from '../../domain/hardSphere/PhysicsEngine.ts';
import { getRelationLabel, getIdealGasAnalysis, type ExperimentParamKey } from '../../domain/idealGas/idealGasExperiment.ts';
import { cloneParams } from './workbenchFileState.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import { areWorkbenchParamsEqual, validateWorkbenchParams, type WorkbenchParameterRow } from './workbenchParameterState.ts';
import { assignWorkbenchParameterValue } from './workbenchParameterRegistry.ts';
import { getWorkbenchParameterDisplayLabel } from './workbenchParameterPresentation.ts';
import { getChangedIdealParamKeys, getIdealVerificationState } from './workbenchIdealParameterState.ts';
import { workbenchCopies, type WorkbenchCopy } from './workbenchStudioCopy.ts';
import type { StandardEngineRuntime } from './workbenchSimulationRuntimeTypes.ts';
import type { WorkbenchMutableRef as Ref, WorkbenchStateSetter as Setter, WorkbenchLogWriter } from './workbenchActionPorts.ts';
export interface ApplyActiveFileParamsOptions {
  silent?: boolean;
  forceReset?: boolean;
}

export interface WorkbenchParameterActionPorts {
  getActiveFile: () => WorkbenchFileState;
  getParameterControlsLocked: () => boolean;
  getParametersDirty: () => boolean;
  workbenchCopy: WorkbenchCopy;
  getLockedIdealControlledVariableKeys: (params: SimulationParams) => ExperimentParamKey[];
  showWorkbenchValidationErrors: (validation: { errors: string[] }) => void;
  captureUndoSnapshot: (label: string) => void;
  updateActiveFile: (update: (file: WorkbenchFileState) => WorkbenchFileState) => void;
  standardRuntimeRef: Ref<Record<string, StandardEngineRuntime>>;
  idealRuntimeRef: Ref<Record<string, StandardEngineRuntime>>;
  cancelRuntimeFrame: (fileId: string) => void;
  getStandardRuntime: (file: WorkbenchFileState) => StandardEngineRuntime | null;
  getIdealRuntime: (file: WorkbenchFileState) => StandardEngineRuntime | null;
  snapshotParticles: (engine: PhysicsEngine) => Particle[];
  setParameterInputDrafts: Setter<Record<string, string>>;
  setParameterErrors: Setter<string[]>;
  pushLog: WorkbenchLogWriter;
}

/** Parameter application preserves history capture, runtime replacement and file commit order. */
export const createWorkbenchParameterActions = (ports: WorkbenchParameterActionPorts) => {
  const { workbenchCopy, getLockedIdealControlledVariableKeys, showWorkbenchValidationErrors,
    captureUndoSnapshot, updateActiveFile, standardRuntimeRef, idealRuntimeRef, cancelRuntimeFrame,
    getStandardRuntime, getIdealRuntime, snapshotParticles, setParameterInputDrafts,
    setParameterErrors, pushLog } = ports;
  const rejectLockedIdealControlledVariables = (nextParams: SimulationParams) => {
    const activeFile = ports.getActiveFile();
    if (activeFile.kind !== 'ideal') return false;
    const lockedKeys = getLockedIdealControlledVariableKeys(nextParams);
    if (lockedKeys.length === 0) return false;

    const message = workbenchCopy.logs.controlledVariablesLocked(activeFile.name, getRelationLabel(activeFile.relation), lockedKeys.join(', '));
    setParameterErrors([message]);
    pushLog(
      (language) => workbenchCopies[language].logs.controlledVariablesLocked(activeFile.name, getRelationLabel(activeFile.relation), lockedKeys.join(', ')),
      'warning',
    );
    return true;
  };

  const clearWorkbenchParameterInputDraft = (paramKey: string) => {
    setParameterInputDrafts((current) => {
      const { [paramKey]: _removed, ...rest } = current;
      return rest;
    });
  };

  const revertWorkbenchParameterInput = (paramKey: string) => {
    clearWorkbenchParameterInputDraft(paramKey);
    setParameterErrors([]);
  };

  const commitWorkbenchParameterInput = (
    param: WorkbenchParameterRow,
    rawValue: string,
  ) => {
    const activeFile = ports.getActiveFile();
    const parameterControlsLocked = ports.getParameterControlsLocked();
    if (parameterControlsLocked) {
      pushLog(
        (language) => workbenchCopies[language].logs.pauseBeforeEditingParameters(activeFile.name),
        'warning',
      );
      return;
    }

    if (!param.editable) {
      clearWorkbenchParameterInputDraft(param.key);
      return;
    }

    const parsedValue = Number(rawValue);
    if (!Number.isFinite(parsedValue)) {
      setParameterErrors([workbenchCopy.logs.invalidParameter(activeFile.name, param.label, rawValue)]);
      pushLog(
        (language) => workbenchCopies[language].logs.invalidParameter(
          activeFile.name,
          getWorkbenchParameterDisplayLabel(param, workbenchCopies[language]),
          rawValue,
        ),
        'error',
      );
      return;
    }

    const nextParams = cloneParams(activeFile.params);
    assignWorkbenchParameterValue(nextParams, param.key, parsedValue);

    if (areWorkbenchParamsEqual(nextParams, activeFile.params)) {
      clearWorkbenchParameterInputDraft(param.key);
      setParameterErrors([]);
      return;
    }

    const validation = validateWorkbenchParams(nextParams);
    if (!validation.valid) {
      showWorkbenchValidationErrors(validation);
      return;
    }

    if (rejectLockedIdealControlledVariables(nextParams)) return;

    const appliedRuntime = applyActiveFileParams(nextParams);
    if (appliedRuntime || activeFile.kind !== 'standard') {
      clearWorkbenchParameterInputDraft(param.key);
    }
  };

  const applyActiveFileParams = (
    paramsOverride?: SimulationParams,
    options: ApplyActiveFileParamsOptions = {},
  ): StandardEngineRuntime | null => {
    const activeFile = ports.getActiveFile();
    const parametersDirty = ports.getParametersDirty();
    if (activeFile.kind === 'heatCapacityPistonOscillation') {
      setParameterErrors([]);
      return null;
    }
    if (activeFile.runState === 'running') {
      if (!options.silent) pushLog(
        (language) => workbenchCopies[language].logs.pauseBeforeApplyingParameters(activeFile.name),
        'warning',
      );
      return null;
    }

    const nextParams = paramsOverride ? cloneParams(paramsOverride) : cloneParams(activeFile.params);
    if (rejectLockedIdealControlledVariables(nextParams)) return null;
    const parameterValidation = validateWorkbenchParams(nextParams);
    if (!parameterValidation.valid) {
      showWorkbenchValidationErrors(parameterValidation);
      return null;
    }

    const hasOverride = Boolean(paramsOverride);
    const nextParamsAlreadyApplied = areWorkbenchParamsEqual(nextParams, activeFile.appliedParams);
    const willChangeSavedParams = !areWorkbenchParamsEqual(nextParams, activeFile.params);
    const willChangeAppliedParams = !nextParamsAlreadyApplied;
    const forceReset = options.forceReset === true;

    if (activeFile.kind === 'ideal' && !forceReset && !hasOverride && !parametersDirty && !activeFile.needsReset) {
      if (!options.silent) pushLog(
        (language) => workbenchCopies[language].logs.idealRuntimeAlreadyApplied(activeFile.name),
      );
      return getIdealRuntime(activeFile);
    }

    if (activeFile.kind === 'standard' && !forceReset && !hasOverride && !parametersDirty) {
      if (!options.silent) pushLog(
        (language) => workbenchCopies[language].logs.noSavedParameterChanges(activeFile.name),
      );
      return getStandardRuntime(activeFile);
    }

    if (activeFile.kind === 'heatCapacity') {
      const validation = validateWorkbenchParams(nextParams);
      if (!validation.valid) {
        showWorkbenchValidationErrors(validation);
        return null;
      }

      if (willChangeSavedParams || willChangeAppliedParams) {
        captureUndoSnapshot(hasOverride ? 'saved heat capacity parameters' : 'applied heat capacity parameters');
      }
      updateActiveFile((file) => {
        if (file.kind !== 'heatCapacity') return file;
        return {
          ...file,
          params: nextParams,
          appliedParams: cloneParams(nextParams),
          updatedAt: Date.now(),
        };
      });
      setParameterErrors([]);
      if (!options.silent) {
        pushLog((language) => {
          if (language === 'zh-CN') return `${activeFile.name}：热容比界面参数已保存；未启动模拟运行时。`;
          if (language === 'zh-TW') return `${activeFile.name}：熱容比介面參數已儲存；未啟動模擬執行階段。`;
          return `${activeFile.name}: heat-capacity UI parameters saved; no simulation runtime started.`;
        }, 'success');
      }
      return null;
    }

    if (activeFile.kind === 'standard' && !forceReset && hasOverride && nextParamsAlreadyApplied) {
      if (willChangeSavedParams) {
        captureUndoSnapshot('saved parameters');
      }
      updateActiveFile((file) => ({
        ...file,
        params: nextParams,
        updatedAt: Date.now(),
      }));
      setParameterErrors([]);
      if (!options.silent) pushLog((language) => {
        if (language === 'zh-CN') return `${activeFile.name}：编辑后的参数与已应用运行时一致，无需重建。`;
        if (language === 'zh-TW') return `${activeFile.name}：編輯後的參數與已套用執行階段一致，無需重建。`;
        return `${activeFile.name}: edited parameters match the applied runtime. No rebuild needed.`;
      });
      return getStandardRuntime(activeFile);
    }

    if (activeFile.kind === 'ideal') {
      const validation = validateWorkbenchParams(nextParams);
      if (!validation.valid) {
        showWorkbenchValidationErrors(validation);
        return null;
      }

      const changedKeys = getChangedIdealParamKeys(activeFile.activeParams, nextParams);
      const nextActiveParams = cloneParams(nextParams);
      const nextRuntime: StandardEngineRuntime = {
        engine: new PhysicsEngine(nextActiveParams),
        frameCount: 0,
        simulationTimerId: null,
      };
      const nextPointsByRelation = activeFile.pointsByRelation;
      const analysis = getIdealGasAnalysis(activeFile.relation, nextPointsByRelation, nextActiveParams);

      if (willChangeSavedParams || willChangeAppliedParams || activeFile.needsReset || forceReset) {
        captureUndoSnapshot(hasOverride ? 'saved and applied ideal parameters' : 'applied ideal parameters');
      }

      cancelRuntimeFrame(activeFile.id);
      idealRuntimeRef.current[activeFile.id] = nextRuntime;
      updateActiveFile((file) => {
        if (file.kind !== 'ideal') return file;
        return {
          ...file,
          params: nextParams,
          appliedParams: cloneParams(nextActiveParams),
          activeParams: nextActiveParams,
          runState: 'idle',
          stats: nextRuntime.engine.getStats(),
          chartData: nextRuntime.engine.getHistogramData(false),
          finalChartData: null,
          latestPressureSummary: nextRuntime.engine.getPressureMeasurementSummary(),
          needsReset: false,
          particles: snapshotParticles(nextRuntime.engine),
          hardSphereEngineSnapshot: nextRuntime.engine.createSnapshot(),
          pointsByRelation: nextPointsByRelation,
          verificationState: getIdealVerificationState(analysis),
          historyUnlocked: analysis.isVerified,
          updatedAt: Date.now(),
        };
      });
      setParameterErrors([]);
      if (!options.silent) {
        pushLog(
          (language) => workbenchCopies[language].logs.idealRuntimeApplied(
            activeFile.name,
            getRelationLabel(activeFile.relation),
            changedKeys.length > 0 ? changedKeys.join(', ') : workbenchCopies[language].results.noneValue,
          ),
          'success',
        );
      }
      return nextRuntime;
    }

    const nextAppliedParams = cloneParams(nextParams);
    const nextRuntime: StandardEngineRuntime = {
      engine: new PhysicsEngine(nextAppliedParams),
      frameCount: 0,
      simulationTimerId: null,
    };

    if (willChangeSavedParams || willChangeAppliedParams || forceReset) {
      captureUndoSnapshot(hasOverride ? 'saved and applied parameters' : 'applied parameters');
    }
    cancelRuntimeFrame(activeFile.id);
    standardRuntimeRef.current[activeFile.id] = nextRuntime;
    updateActiveFile((file) => ({
      ...file,
      params: nextParams,
      appliedParams: nextAppliedParams,
      runState: 'idle',
      stats: nextRuntime.engine.getStats(),
      chartData: nextRuntime.engine.getHistogramData(false),
      finalChartData: null,
      particles: snapshotParticles(nextRuntime.engine),
      hardSphereEngineSnapshot: nextRuntime.engine.createSnapshot(),
      updatedAt: Date.now(),
    }));
    setParameterErrors([]);
    if (!options.silent) {
      pushLog(
        (language) => workbenchCopies[language].logs.standardParametersApplied(
          activeFile.name,
          hasOverride
            ? workbenchCopies[language].logs.parametersSavedAndApplied
            : workbenchCopies[language].logs.parametersApplied,
        ),
        'success',
      );
    }
    return nextRuntime;
  };

  const prepareActiveFileForRun = (): boolean => {
    const activeFile = ports.getActiveFile();
    const parametersDirty = ports.getParametersDirty();
    if (activeFile.runState === 'paused') return true;

    if (parametersDirty || (activeFile.kind === 'ideal' && activeFile.needsReset) || activeFile.runState === 'finished') {
      const appliedRuntime = applyActiveFileParams(undefined, { silent: true, forceReset: activeFile.runState === 'finished' });
      if (!appliedRuntime) return false;
      return true;
    }

    return true;
  };

  return { rejectLockedIdealControlledVariables, clearWorkbenchParameterInputDraft, revertWorkbenchParameterInput, commitWorkbenchParameterInput, applyActiveFileParams, prepareActiveFileForRun };
};
