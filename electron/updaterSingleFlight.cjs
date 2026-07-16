const createSingleFlightTask = () => {
  let activeTask = null;
  return {
    run(taskFactory) {
      if (activeTask) return activeTask;
      const task = Promise.resolve().then(taskFactory);
      const trackedTask = task.finally(() => {
        if (activeTask === trackedTask) activeTask = null;
      });
      activeTask = trackedTask;
      return trackedTask;
    },
    get active() {
      return activeTask !== null;
    },
  };
};

module.exports = { createSingleFlightTask };
