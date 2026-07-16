export type HeatCapacityGuidePulseRestorePlan =
  | { state: 'cleared' }
  | {
      state: 'paused' | 'scheduled';
      fileId: string;
      controlId: string;
      remainingMs: number;
    };

export const resolveHeatCapacityGuidePulseRestore = ({
  fileId,
  controlId,
  remainingMs,
  clockRunning,
}: {
  fileId: string | null | undefined;
  controlId: string | null | undefined;
  remainingMs: number | null | undefined;
  clockRunning: boolean;
}): HeatCapacityGuidePulseRestorePlan => {
  const normalizedFileId = typeof fileId === 'string' ? fileId.trim() : '';
  const normalizedControlId = typeof controlId === 'string' ? controlId.trim() : '';
  if (
    !normalizedFileId ||
    !normalizedControlId ||
    typeof remainingMs !== 'number' ||
    !Number.isFinite(remainingMs) ||
    remainingMs <= 0
  ) {
    return { state: 'cleared' };
  }
  return {
    state: clockRunning ? 'scheduled' : 'paused',
    fileId: normalizedFileId,
    controlId: normalizedControlId,
    remainingMs,
  };
};
