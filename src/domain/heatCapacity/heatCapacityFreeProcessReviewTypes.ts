export type HeatCapacityProcessStageId = 'zero' | 'fill' | 'pump' | 'stabilize' | 'release' | 'recover';
export type HeatCapacityProcessRecordId = 'u0' | 'u1' | 'u2';
export type HeatCapacityProcessDiagnosisId = 'pumping' | 'release' | 'recording' | 'retake';
export type HeatCapacityProcessDiagnosisStatus =
  | 'reasonable'
  | 'review'
  | 'needs-improvement'
  | 'retaken'
  | 'insufficient-data';

export interface HeatCapacityProcessStageSegment {
  id: HeatCapacityProcessStageId;
  label: string;
  startS: number;
  endS: number;
  countText?: string;
  durationText?: string;
}

export interface HeatCapacityProcessReviewTrialOption {
  trialId: string;
  traceTrialId: string | null;
  trialIndex: number;
  status: 'complete' | 'incomplete' | 'missing-trace';
  gamma: number | null;
  retakeCount: number;
}

export interface HeatCapacityProcessReferencePoint {
  sampleId: string;
  stageId: HeatCapacityProcessStageId;
  timeS: number;
  pressureDeltaKPa: number;
  temperatureDeltaK: number;
}

export interface HeatCapacityBestRecordWindow {
  recordId: HeatCapacityProcessRecordId;
  startS: number;
  endS: number;
  recommendedSampleId: string | null;
  recommendedTimeS: number | null;
  displayPressureMv: number | null;
  displayTemperatureMv: number | null;
  pressureDeltaKPa: number | null;
  temperatureDeltaK: number | null;
  qualityScore: number;
  source: 'trace' | 'automatic-u0';
  reason: string;
}

export interface HeatCapacityOperationUpperBound {
  gamma: number | null;
  relativeErrorPercent: number | null;
  gapFromActualPercent: number | null;
  windows: HeatCapacityBestRecordWindow[];
}

export interface HeatCapacityProcessScoreSubItem {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  evidence: string;
  reason: string;
  recommendation: string;
  status: HeatCapacityProcessDiagnosisStatus;
}

export interface HeatCapacityProcessScoreItem {
  id: 'completeness' | 'zeroing' | 'pumping' | 'release' | 'recording' | 'retake';
  label: string;
  score: number;
  maxScore: number;
  evidence: string;
  relation: string;
  recommendation: string;
  status: HeatCapacityProcessDiagnosisStatus;
  details: HeatCapacityProcessScoreSubItem[];
}

export interface HeatCapacityProcessScore {
  total: number | null;
  maxScore: 100;
  items: HeatCapacityProcessScoreItem[];
}
