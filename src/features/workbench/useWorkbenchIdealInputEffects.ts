import { useEffect } from 'react';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import { getRelationVariableNumericValue } from '../../domain/idealGas/idealGasExperiment.ts';
import { formatMetric } from './workbenchPresentationFormatting.ts';
import { getIdealScanDecimals } from './workbenchIdealControls.ts';
import { PROMPT_TOAST_DURATION_MS } from '../../components/prompts/promptFeedbackPolicy.ts';
import type { WorkbenchStateSetter as Setter } from './workbenchActionPorts.ts';
export const useWorkbenchIdealInputEffects = (ports: { activeFile: WorkbenchFileState; scanInputFocused: boolean; scanInputToast: string | null; setScanInputDraft: Setter<string>; setScanInputError: Setter<string | null>; setScanInputToast: Setter<string | null> }) => {
 const { activeFile, scanInputFocused, scanInputToast, setScanInputDraft, setScanInputError, setScanInputToast } = ports;
 const activeIdealRelation = activeFile.kind === 'ideal' ? activeFile.relation : null;
 useEffect(() => {
    if (activeFile.kind !== 'ideal' || scanInputFocused) return;
    const value = getRelationVariableNumericValue(activeFile.relation, activeFile.params);
    setScanInputDraft(formatMetric(value, getIdealScanDecimals(activeFile.relation)));
    setScanInputError(null);
  }, [activeFile.kind, activeIdealRelation, activeFile.params, scanInputFocused]);
 useEffect(() => {
    if (!scanInputToast) return undefined;
    const timeoutId = window.setTimeout(
      () => setScanInputToast(null),
      PROMPT_TOAST_DURATION_MS.standard,
    );
    return () => window.clearTimeout(timeoutId);
  }, [scanInputToast]);
};
