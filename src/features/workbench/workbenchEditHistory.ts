export const WORKBENCH_EDIT_HISTORY_LIMIT = 50;
export const WORKBENCH_WORKSPACE_EDIT_HISTORY_LIMIT = 8;

export const trimWorkbenchEditHistory = <Snapshot extends { kind: string }>(
  history: readonly Snapshot[],
): Snapshot[] => {
  let workspaceSnapshotsSeen = 0;
  let retainedSuffixStart = 0;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index]?.kind !== 'workspace') continue;
    workspaceSnapshotsSeen += 1;
    if (workspaceSnapshotsSeen > WORKBENCH_WORKSPACE_EDIT_HISTORY_LIMIT) {
      retainedSuffixStart = index + 1;
      break;
    }
  }
  return history
    .slice(retainedSuffixStart)
    .slice(-WORKBENCH_EDIT_HISTORY_LIMIT);
};
