class UpdaterOperationConflictError extends Error {
  constructor(activeStage, requestedStage) {
    super(`Updater ${requestedStage} cannot start while ${activeStage} is active.`);
    this.name = 'UpdaterOperationConflictError';
    this.activeStage = activeStage;
    this.requestedStage = requestedStage;
  }
}

const UPDATER_STATUS_TRANSITIONS = {
  idle: new Set(['idle', 'checking', 'unsupported']),
  checking: new Set(['checking', 'available', 'not-available', 'error']),
  available: new Set(['available', 'checking', 'downloading', 'error']),
  'not-available': new Set(['not-available', 'checking']),
  downloading: new Set(['downloading', 'retrying', 'downloaded', 'error']),
  retrying: new Set(['retrying', 'downloading', 'downloaded', 'error']),
  downloaded: new Set(['downloaded', 'installing']),
  installing: new Set(['installing', 'downloaded']),
  error: new Set(['error', 'checking', 'downloading']),
  unsupported: new Set(['unsupported']),
};

const canTransitionUpdaterStatus = (currentStatus, nextStatus) => (
  UPDATER_STATUS_TRANSITIONS[currentStatus]?.has(nextStatus) === true
);

const canStartUpdaterStage = (stage, state) => {
  if (stage === 'check') {
    return ['idle', 'available', 'not-available', 'error'].includes(state.status);
  }
  if (stage === 'download') {
    return state.status === 'available' || (
      state.status === 'error'
      && state.errorStage === 'download'
      && typeof state.latestVersion === 'string'
      && state.latestVersion.length > 0
    );
  }
  if (stage === 'install') return state.status === 'downloaded';
  return false;
};

const createUpdaterOperationCoordinator = () => {
  let activeOperation = null;
  return {
    run(stage, taskFactory) {
      if (activeOperation) {
        if (activeOperation.stage === stage) return activeOperation.promise;
        return Promise.reject(new UpdaterOperationConflictError(activeOperation.stage, stage));
      }
      const task = Promise.resolve().then(taskFactory);
      const trackedTask = task.finally(() => {
        if (activeOperation?.promise === trackedTask) activeOperation = null;
      });
      activeOperation = { stage, promise: trackedTask };
      return trackedTask;
    },
    get activeStage() {
      return activeOperation?.stage ?? null;
    },
  };
};

module.exports = {
  UpdaterOperationConflictError,
  canStartUpdaterStage,
  canTransitionUpdaterStatus,
  createUpdaterOperationCoordinator,
};
