const getDefaultClockMs = () => (
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
);

export class AudioVoiceRateLimiter {
  private readonly lastAcceptedAtMs = new Map<string, number>();
  private readonly clockMs: () => number;

  constructor(clockMs: () => number = getDefaultClockMs) {
    this.clockMs = clockMs;
  }

  accept(key: string, minimumIntervalMs: number, atMs = this.clockMs()) {
    const previousAtMs = this.lastAcceptedAtMs.get(key);
    if (previousAtMs !== undefined && atMs - previousAtMs < Math.max(0, minimumIntervalMs)) {
      return false;
    }
    this.lastAcceptedAtMs.set(key, atMs);
    return true;
  }

  reset(key?: string) {
    if (key === undefined) {
      this.lastAcceptedAtMs.clear();
      return;
    }
    this.lastAcceptedAtMs.delete(key);
  }
}
