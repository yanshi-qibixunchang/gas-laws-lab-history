import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import { selectCurrentHeatCapacityFreeExperimentGroup } from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';

export const PROCESS_REVIEW_INTRO_STORAGE_KEY = 'gas-laws-lab.process-review-entry-introduced.v1';

/** Only existing process-review pages participate; acquisition alone is not completion. */
export const getProcessReviewCompletionKey = (file: WorkbenchFileState): string | null => {
  if (file.kind === 'heatCapacity' && file.heatCapacityMode === 'free') {
    const group = selectCurrentHeatCapacityFreeExperimentGroup(file.heatCapacityFreeExperimentGroups);
    return group?.status === 'completed'
      ? `heat:${group.id}:${group.completedAtMs}` : null;
  }
  if (file.kind === 'heatCapacityPistonOscillation') {
    const session = file.pistonOscillationFreeSession;
    const processing = session.dataProcessing;
    return session.status === 'active' && processing?.status === 'completed'
      ? `piston:${session.startedAtMs}:${processing.startedAtMs}:${processing.calculationSession?.completedAtMs}` : null;
  }
  return null;
};

/** Baseline restored/imported results. Only newly completed calculations open a review. */
export class ProcessReviewCompletionTracker {
  private previous = new Map<string, string | null>();
  private seen = new Set<string>();
  constructor(files: readonly WorkbenchFileState[]) {
    this.observe(files);
  }
  observe(files: readonly WorkbenchFileState[]): string[] {
    const completed: string[] = [];
    const next = new Map<string, string | null>();
    for (const file of files) {
      const key = getProcessReviewCompletionKey(file);
      const identity = JSON.stringify([file.id, key]);
      if (key !== null && this.previous.has(file.id) && this.previous.get(file.id) !== key && !this.seen.has(identity)) {
        completed.push(file.id);
      }
      if (key !== null) this.seen.add(identity);
      next.set(file.id, key);
    }
    this.previous = next;
    return completed;
  }
}
