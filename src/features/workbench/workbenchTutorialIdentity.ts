export const EXPERIMENT_TUTORIAL_INSTANCE_ID = typeof globalThis.crypto?.randomUUID === 'function'
  ? globalThis.crypto.randomUUID()
  : `tutorial-window-${Date.now()}-${Math.random().toString(36).slice(2)}`;
