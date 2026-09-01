import type { HistogramBin } from '../../shared/types.ts';
import type { IdealExperimentLanguageCode } from '../../domain/idealGas/idealGasExperiment.ts';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import type { WorkbenchFileState } from './workbenchState.ts';
import type { WorkbenchCopy } from './workbenchStudioCopy.ts';

export const formatMetric = (value: number, digits = 3) => {
  if (!Number.isFinite(value)) return '--';
  return value.toFixed(digits);
};

export const formatMaybeMetric = (
  value: number | null | undefined,
  digits = 3,
) => (
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--'
);

export const formatPercent = (value: number) => (
  `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`
);

export const getIdealExperimentLanguageCode = (
  language: WorkbenchLanguagePreference,
): IdealExperimentLanguageCode => (
  language === 'en' ? 'en-GB' : language
);

export const getLocalizedStatusValue = (
  value: string | undefined,
  copy: WorkbenchCopy,
) => (
  value
    ? copy.status.verdictStates[value]
      ?? copy.status.runStates[value as WorkbenchFileState['runState']]
      ?? value
    : copy.status.none
);

export const getCompactHistogramBins = (
  bins: HistogramBin[],
  maxBars = 36,
) => {
  if (bins.length <= maxBars) return bins;
  const stride = Math.ceil(bins.length / maxBars);
  const compactBins: HistogramBin[] = [];

  for (let index = 0; index < bins.length; index += stride) {
    const group = bins.slice(index, index + stride);
    const count = group.reduce((sum, bin) => sum + bin.count, 0);
    const probability = group.reduce((sum, bin) => sum + bin.probability, 0) / group.length;
    const theoretical = group.reduce((sum, bin) => sum + (bin.theoretical ?? 0), 0) / group.length;
    compactBins.push({
      binStart: group[0]!.binStart,
      binEnd: group[group.length - 1]!.binEnd,
      count,
      probability,
      theoretical,
    });
  }

  return compactBins;
};
