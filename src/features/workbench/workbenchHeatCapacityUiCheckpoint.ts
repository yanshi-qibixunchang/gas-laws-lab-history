import type {
  HeatCapacityAutoDemoTimelineItem,
} from '../../domain/heatCapacity/heatCapacityAutoDemo.ts';
import type {
  HeatCapacityMode,
} from '../../domain/heatCapacity/heatCapacityModeTypes.ts';
import type {
  WorkbenchHeatCapacityRefreshJsonObject,
} from './workbenchHeatCapacityRefreshSession.ts';
import type {
  WorkbenchRunState,
} from './workbenchState.ts';

export const isHeatCapacityRefreshRecord = (
  value: unknown,
): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

export const getHeatCapacityRefreshString = (
  record: WorkbenchHeatCapacityRefreshJsonObject,
  key: string,
  fallback: string | null = null,
) => typeof record[key] === 'string' ? record[key] as string : fallback;

export const getHeatCapacityRefreshBoolean = (
  record: WorkbenchHeatCapacityRefreshJsonObject,
  key: string,
  fallback = false,
) => typeof record[key] === 'boolean' ? record[key] as boolean : fallback;

export const getHeatCapacityRefreshNumber = (
  record: WorkbenchHeatCapacityRefreshJsonObject,
  key: string,
  fallback: number,
) => typeof record[key] === 'number' && Number.isFinite(record[key])
  ? record[key] as number
  : fallback;

export const getHeatCapacityRefreshOptionalNumber = (
  record: WorkbenchHeatCapacityRefreshJsonObject,
  key: string,
): number | null => typeof record[key] === 'number' && Number.isFinite(record[key])
  ? record[key] as number
  : null;

export const getHeatCapacityRefreshObject = (
  record: WorkbenchHeatCapacityRefreshJsonObject,
  key: string,
): Record<string, unknown> | null => {
  const value = record[key];
  return isHeatCapacityRefreshRecord(value) ? value : null;
};

export const getHeatCapacityRefreshStringMap = (
  record: WorkbenchHeatCapacityRefreshJsonObject,
  key: string,
): Record<string, string> => {
  const value = getHeatCapacityRefreshObject(record, key);
  if (!value) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => (
    typeof entry[1] === 'string'
  )));
};

export const asWorkbenchHeatCapacityRefreshJsonObject = (
  value: unknown,
): WorkbenchHeatCapacityRefreshJsonObject => value as WorkbenchHeatCapacityRefreshJsonObject;

export const getHeatCapacityRefreshRunState = (
  value: unknown,
  fallback: WorkbenchRunState,
): WorkbenchRunState => (
  value === 'idle' || value === 'running' || value === 'paused' || value === 'finished' || value === 'needs-reset'
    ? value
    : fallback
);

export interface HeatCapacityRecordSuccessTimerPlan {
  fileId: string;
  followUpMessage: string | null;
  followUpRemainingMs: number | null;
  releaseRemainingMs: number;
}

export interface HeatCapacityLessonCloseTimerPlan {
  fileId: string;
  remainingMs: number;
  shouldResumeAutoDemo: boolean;
}

export const normalizeHeatCapacityRecordSuccessTimerPlan = (
  layout: WorkbenchHeatCapacityRefreshJsonObject,
  expectedFileId: string,
  expectedMode: HeatCapacityMode,
): HeatCapacityRecordSuccessTimerPlan | null => {
  if (expectedMode !== 'guide') return null;
  const value = getHeatCapacityRefreshObject(layout, 'recordSuccessSequence');
  if (!value || value.fileId !== expectedFileId) return null;
  const rawFollowUpMessage = value.followUpMessage;
  if (rawFollowUpMessage !== null && typeof rawFollowUpMessage !== 'string') return null;
  const followUpMessage = rawFollowUpMessage as string | null;
  const rawFollowUpRemainingMs = value.followUpRemainingMs;
  if (
    rawFollowUpRemainingMs !== null &&
    (
      typeof rawFollowUpRemainingMs !== 'number' ||
      !Number.isFinite(rawFollowUpRemainingMs) ||
      rawFollowUpRemainingMs < 0
    )
  ) return null;
  const followUpRemainingMs = rawFollowUpRemainingMs as number | null;
  const releaseRemainingMs = value.releaseRemainingMs;
  if (
    typeof releaseRemainingMs !== 'number' ||
    !Number.isFinite(releaseRemainingMs) ||
    releaseRemainingMs < 0 ||
    (followUpMessage !== null && followUpMessage.trim().length === 0) ||
    (followUpRemainingMs !== null && followUpRemainingMs > releaseRemainingMs) ||
    (followUpMessage === null) !== (followUpRemainingMs === null)
  ) return null;
  return {
    fileId: expectedFileId,
    followUpMessage,
    followUpRemainingMs,
    releaseRemainingMs,
  };
};

export const normalizeHeatCapacityLessonCloseTimerPlan = (
  layout: WorkbenchHeatCapacityRefreshJsonObject,
  expectedFileId: string,
  expectedMode: HeatCapacityMode,
  lessonDialogPresent: boolean,
): HeatCapacityLessonCloseTimerPlan | null => {
  const value = getHeatCapacityRefreshObject(layout, 'lessonCloseSequence');
  if (
    !value ||
    value.fileId !== expectedFileId ||
    typeof value.remainingMs !== 'number' ||
    !Number.isFinite(value.remainingMs) ||
    value.remainingMs < 0 ||
    typeof value.shouldResumeAutoDemo !== 'boolean' ||
    !lessonDialogPresent ||
    (value.shouldResumeAutoDemo && expectedMode !== 'demo')
  ) return null;
  return {
    fileId: expectedFileId,
    remainingMs: value.remainingMs,
    shouldResumeAutoDemo: value.shouldResumeAutoDemo,
  };
};

export type HeatCapacityFocusMode = 'none' | 'instrument' | 'pump' | 'bottle';

export interface HeatCapacityFocusControlSnapshot {
  powerOn: boolean;
  stopcockOpen: boolean;
  pumpValveOpen: boolean;
  pressureZeroAdjusted: boolean;
  pressureZeroOffset: number;
}

export interface HeatCapacityFocusSession {
  fileId: string;
  mode: Exclude<HeatCapacityFocusMode, 'none'>;
  parametersCollapsedBeforeFocus: boolean;
  baseline: HeatCapacityFocusControlSnapshot;
  nonReversibleAction: boolean;
}

export const normalizeHeatCapacityFocusSession = (
  value: unknown,
): HeatCapacityFocusSession | null => {
  if (!isHeatCapacityRefreshRecord(value) || typeof value.fileId !== 'string') return null;
  if (value.mode !== 'instrument' && value.mode !== 'pump' && value.mode !== 'bottle') return null;
  if (typeof value.parametersCollapsedBeforeFocus !== 'boolean' || typeof value.nonReversibleAction !== 'boolean') {
    return null;
  }
  if (!isHeatCapacityRefreshRecord(value.baseline)) return null;
  const baseline = value.baseline;
  if (
    typeof baseline.powerOn !== 'boolean' ||
    typeof baseline.stopcockOpen !== 'boolean' ||
    typeof baseline.pumpValveOpen !== 'boolean' ||
    typeof baseline.pressureZeroAdjusted !== 'boolean' ||
    typeof baseline.pressureZeroOffset !== 'number' ||
    !Number.isFinite(baseline.pressureZeroOffset)
  ) return null;
  return {
    fileId: value.fileId,
    mode: value.mode,
    parametersCollapsedBeforeFocus: value.parametersCollapsedBeforeFocus,
    baseline: {
      powerOn: baseline.powerOn,
      stopcockOpen: baseline.stopcockOpen,
      pumpValveOpen: baseline.pumpValveOpen,
      pressureZeroAdjusted: baseline.pressureZeroAdjusted,
      pressureZeroOffset: baseline.pressureZeroOffset,
    },
    nonReversibleAction: value.nonReversibleAction,
  };
};

export const mapHeatCapacityAutoDemoCameraFocusMode = (
  cameraFocusMode: HeatCapacityAutoDemoTimelineItem['cameraFocusMode'],
): Exclude<HeatCapacityFocusMode, 'none'> | null => {
  if (cameraFocusMode === 'instrument' || cameraFocusMode === 'pump' || cameraFocusMode === 'bottle') {
    return cameraFocusMode;
  }
  return null;
};
