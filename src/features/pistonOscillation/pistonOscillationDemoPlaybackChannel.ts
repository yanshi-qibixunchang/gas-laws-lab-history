export type PistonOscillationDemoPlaybackPhase =
  | 'idle'
  | 'running'
  | 'paused'
  | 'terminated'
  | 'completed';

export interface PistonOscillationDemoPlaybackSnapshot {
  fileId: string | null;
  phase: PistonOscillationDemoPlaybackPhase;
  elapsedMs: number;
}

export interface PistonOscillationDemoPlaybackChannel {
  getSnapshot: () => PistonOscillationDemoPlaybackSnapshot;
  subscribe: (listener: () => void) => () => void;
  publish: (snapshot: PistonOscillationDemoPlaybackSnapshot) => void;
}

export const PISTON_OSCILLATION_IDLE_DEMO_PLAYBACK_SNAPSHOT:
PistonOscillationDemoPlaybackSnapshot = {
  fileId: null,
  phase: 'idle',
  elapsedMs: 0,
};

export const createPistonOscillationDemoPlaybackChannel = (
): PistonOscillationDemoPlaybackChannel => {
  let snapshot = PISTON_OSCILLATION_IDLE_DEMO_PLAYBACK_SNAPSHOT;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    publish: (nextSnapshot) => {
      if (
        snapshot.fileId === nextSnapshot.fileId
        && snapshot.phase === nextSnapshot.phase
        && snapshot.elapsedMs === nextSnapshot.elapsedMs
      ) return;
      snapshot = nextSnapshot;
      for (const listener of listeners) listener();
    },
  };
};
