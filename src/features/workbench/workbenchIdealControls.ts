import type { ExperimentRelation } from '../../shared/types.ts';

export type IdealSamplingPresetKey = 'fast' | 'balanced' | 'stable';

export interface IdealSamplingPreset {
  key: IdealSamplingPresetKey;
  label: string;
  equilibriumTime: number;
  statsDuration: number;
}

export const IDEAL_SCAN_THUMB_SIZE = 13;
export const IDEAL_SCAN_THUMB_HIT_RADIUS = 9.1;
export const IDEAL_SCAN_SNAP_THRESHOLD: Record<ExperimentRelation, number> = {
  pt: 0.04,
  pv: 0.25,
  pn: 8,
};

export const idealRelationOptions: Array<{ key: ExperimentRelation; label: string }> = [
  { key: 'pt', label: 'P-T' },
  { key: 'pv', label: 'P-V' },
  { key: 'pn', label: 'P-N' },
];

export const idealSamplingPresets: IdealSamplingPreset[] = [
  { key: 'fast', label: 'Fast', equilibriumTime: 2, statsDuration: 6 },
  { key: 'balanced', label: 'Balanced', equilibriumTime: 4, statsDuration: 12 },
  { key: 'stable', label: 'Stable', equilibriumTime: 6, statsDuration: 20 },
];

export const getIdealScanStep = (relation: ExperimentRelation) => (
  relation === 'pn' ? 1 : relation === 'pv' ? 0.1 : 0.01
);

export const getIdealScanDecimals = (relation: ExperimentRelation) => (
  relation === 'pn' ? 0 : relation === 'pv' ? 1 : 2
);

export const getIdealScanStepLabel = (relation: ExperimentRelation) => (
  relation === 'pt' ? '0.01' : relation === 'pv' ? '0.1' : '1'
);

export const getIdealScanInputLabel = (relation: ExperimentRelation) => (
  relation === 'pt' ? 'Target temperature' : relation === 'pv' ? 'L' : 'N'
);

export const isIdealScanValueOnStep = (rawValue: string, relation: ExperimentRelation) => {
  if (relation === 'pn') return /^\d+$/.test(rawValue.trim());
  const fractionalPart = rawValue.trim().split('.')[1] ?? '';
  const trimmedFractionalPart = fractionalPart.replace(/0+$/, '');
  return trimmedFractionalPart.length <= getIdealScanDecimals(relation);
};

export const getIdealScanPositionPercent = (
  value: number,
  scanMin: number,
  scanRange: number,
) => scanRange > 0
  ? Math.min(100, Math.max(0, ((value - scanMin) / scanRange) * 100))
  : 0;
