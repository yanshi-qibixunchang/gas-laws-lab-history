export type HeatCapacitySceneFocusMode = 'none' | 'instrument' | 'pump' | 'bottle';

export type HeatCapacitySceneExactRestoreCheckpoint = {
  cameraPose: {
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
  } | null;
  ultraVisualState: unknown;
  hardSphereVisualCheckpoint: unknown;
};

export type HeatCapacitySceneCommand =
  | {
      kind: 'exact-mode-restore';
      commandId: string;
      requestId: number;
      focusMode: HeatCapacitySceneFocusMode;
      checkpoint: HeatCapacitySceneExactRestoreCheckpoint;
    }
  | {
      kind: 'user-reset';
      commandId: string;
      focusMode: 'none';
    }
  | {
      kind: 'script';
      commandId: string;
      focusMode: HeatCapacitySceneFocusMode;
    }
  | {
      kind: 'interaction';
      commandId: string;
      focusMode: HeatCapacitySceneFocusMode;
    };

export type HeatCapacitySceneCommandPriority = 1 | 2 | 3 | 4;

export type HeatCapacitySceneCommandState = {
  focusMode: HeatCapacitySceneFocusMode;
  viewRevision: number;
  exactRestoreRequestId: number | null;
  exactRestoreCheckpoint: HeatCapacitySceneExactRestoreCheckpoint | null;
  activeCommand: {
    commandId: string;
    kind: HeatCapacitySceneCommand['kind'];
    priority: HeatCapacitySceneCommandPriority;
  } | null;
};

export type HeatCapacitySceneCommandEvent =
  | { type: 'submit'; command: HeatCapacitySceneCommand }
  | { type: 'settled'; commandId: string }
  | { type: 'release-exact-restore'; requestId: number };

export const getHeatCapacitySceneCommandPriority = (
  command: HeatCapacitySceneCommand,
): HeatCapacitySceneCommandPriority => {
  if (command.kind === 'exact-mode-restore') return 4;
  if (command.kind === 'user-reset') return 3;
  if (command.kind === 'script') return 2;
  return 1;
};

export const createHeatCapacitySceneCommandState = (
  focusMode: HeatCapacitySceneFocusMode = 'none',
): HeatCapacitySceneCommandState => ({
  focusMode,
  viewRevision: 0,
  exactRestoreRequestId: null,
  exactRestoreCheckpoint: null,
  activeCommand: null,
});

export const reduceHeatCapacitySceneCommand = (
  state: HeatCapacitySceneCommandState,
  event: HeatCapacitySceneCommandEvent,
): HeatCapacitySceneCommandState => {
  if (event.type === 'release-exact-restore') {
    if (state.exactRestoreRequestId !== event.requestId) return state;
    return {
      ...state,
      exactRestoreRequestId: null,
      exactRestoreCheckpoint: null,
      activeCommand: state.activeCommand?.kind === 'exact-mode-restore'
        ? null
        : state.activeCommand,
    };
  }
  if (event.type === 'settled') {
    if (state.activeCommand?.commandId !== event.commandId ||
        state.activeCommand.kind === 'exact-mode-restore') return state;
    return { ...state, activeCommand: null };
  }

  const { command } = event;
  const priority = getHeatCapacitySceneCommandPriority(command);
  if (command.kind === 'exact-mode-restore' &&
      state.exactRestoreRequestId === command.requestId &&
      state.activeCommand?.commandId === command.commandId) return state;
  if (state.exactRestoreRequestId !== null && command.kind !== 'exact-mode-restore') return state;
  if (state.activeCommand && priority < state.activeCommand.priority) return state;
  return {
    focusMode: command.focusMode,
    viewRevision: command.kind === 'exact-mode-restore'
      ? state.viewRevision
      : state.viewRevision + 1,
    exactRestoreRequestId: command.kind === 'exact-mode-restore'
      ? command.requestId
      : state.exactRestoreRequestId,
    exactRestoreCheckpoint: command.kind === 'exact-mode-restore'
      ? command.checkpoint
      : state.exactRestoreCheckpoint,
    activeCommand: {
      commandId: command.commandId,
      kind: command.kind,
      priority,
    },
  };
};
