import type { ExperimentRelation } from '../../shared/types.ts';
import { getPresetSequence, getRelationVariableKey } from '../../domain/idealGas/idealGasExperiment.ts';
import { IDEAL_SCAN_SNAP_THRESHOLD, getIdealScanDecimals, isIdealScanValueOnStep, getIdealScanInputLabel, getIdealScanStepLabel } from './workbenchIdealControls.ts';
import { formatMetric } from './workbenchPresentationFormatting.ts';
import { workbenchCopies } from './workbenchStudioCopy.ts';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import type { WorkbenchConsoleMessageFactory } from './workbenchConsoleLocalization.ts';

export const getSnappedIdealScanValue = (relation: ExperimentRelation, rawValue: number) => {
  const presetSequence = getPresetSequence(relation);
  const threshold = IDEAL_SCAN_SNAP_THRESHOLD[relation];
  const closest = presetSequence.reduce(
    (best, preset) => {
      const distance = Math.abs(preset - rawValue);
      return distance < best.distance ? { value: preset, distance } : best;
    },
    { value: rawValue, distance: Number.POSITIVE_INFINITY },
  );

  return closest.distance <= threshold ? closest.value : rawValue;
};

export const createWorkbenchIdealScanInput = (settingsLanguagePreference: WorkbenchLanguagePreference) => {
  const parseIdealScanInput = (
    rawValue: string,
    relation: ExperimentRelation,
    scanMin: number,
    scanMax: number,
  ): { valid: true; value: number } | { valid: false; message: string; getMessage: WorkbenchConsoleMessageFactory } => {
    const trimmedValue = rawValue.trim();
    const relationKey = getRelationVariableKey(relation);
    const decimalPattern = /^(?:\d+(?:\.\d*)?|\.\d+)$/;
    const integerPattern = /^\d+$/;
    const decimals = getIdealScanDecimals(relation);
    const invalid = (getMessage: WorkbenchConsoleMessageFactory) => ({
      valid: false as const,
      message: getMessage(settingsLanguagePreference),
      getMessage,
    });

    if (!trimmedValue) {
      return invalid((language) => workbenchCopies[language].logs.scanInputRequired(
        String(relationKey),
        relationKey === 'N'
          ? workbenchCopies[language].logs.formatPositiveInteger
          : workbenchCopies[language].logs.formatDecimalNumber,
      ));
    }

    if (relationKey === 'N' && !integerPattern.test(trimmedValue)) {
      return invalid((language) => workbenchCopies[language].logs.scanInputIntegerOnly);
    }

    if (relationKey !== 'N' && !decimalPattern.test(trimmedValue)) {
      return invalid((language) => workbenchCopies[language].logs.scanInputDecimalOnly(String(relationKey)));
    }

    const parsedValue = Number(trimmedValue);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return invalid((language) => workbenchCopies[language].logs.scanInputGreaterThanZero(String(relationKey)));
    }

    if (!isIdealScanValueOnStep(trimmedValue, relation)) {
      return invalid((language) => workbenchCopies[language].logs.scanInputStep(
        getIdealScanInputLabel(relation),
        getIdealScanStepLabel(relation),
      ));
    }

    if (parsedValue < scanMin || parsedValue > scanMax) {
      return invalid((language) => workbenchCopies[language].logs.scanInputRange(
        String(relationKey),
        formatMetric(scanMin, decimals),
        formatMetric(scanMax, decimals),
      ));
    }

    return { valid: true, value: relationKey === 'N' ? Math.round(parsedValue) : parsedValue };
  };
  return { parseIdealScanInput };
};
