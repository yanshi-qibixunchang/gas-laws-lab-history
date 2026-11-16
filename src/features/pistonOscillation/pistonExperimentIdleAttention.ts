export const PISTON_EXPERIMENT_IDLE_DELAY_MS = 10_000;

export const createPistonExperimentIdleAttention = (ports: {
  schedule: (callback: () => void, delay: number) => unknown;
  cancel: (handle: unknown) => void;
  onChange: (active: boolean) => void;
}) => {
  let enabled = false;
  let timer: unknown;
  const stop = () => {
    if (timer !== undefined) ports.cancel(timer);
    timer = undefined;
    ports.onChange(false);
  };
  const activity = () => {
    stop();
    if (enabled) timer = ports.schedule(() => {
      timer = undefined;
      if (enabled) ports.onChange(true);
    }, PISTON_EXPERIMENT_IDLE_DELAY_MS);
  };
  return {
    activity,
    setEnabled: (value: boolean) => { if (enabled !== value) { enabled = value; activity(); } },
    dispose: () => { enabled = false; stop(); },
  };
};
