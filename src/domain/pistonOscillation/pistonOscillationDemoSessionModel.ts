export const PISTON_OSCILLATION_DEMO_SESSION_SCHEMA_VERSION = 1 as const;

export type PistonOscillationDemoSessionStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed';

export interface PistonOscillationDemoSession {
  schemaVersion: typeof PISTON_OSCILLATION_DEMO_SESSION_SCHEMA_VERSION;
  status: PistonOscillationDemoSessionStatus;
  elapsedMs: number;
  runningSinceMs: number | null;
  updatedAtMs: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const finiteNonNegative = (value: unknown, fallback = 0) => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : fallback
);

export const createDefaultPistonOscillationDemoSession = (
  nowMs = 0,
): PistonOscillationDemoSession => ({
  schemaVersion: PISTON_OSCILLATION_DEMO_SESSION_SCHEMA_VERSION,
  status: 'idle',
  elapsedMs: 0,
  runningSinceMs: null,
  updatedAtMs: finiteNonNegative(nowMs),
});

export const normalizePistonOscillationDemoSession = (
  value: unknown,
): PistonOscillationDemoSession => {
  const fallback = createDefaultPistonOscillationDemoSession();
  if (!isRecord(value)) return fallback;
  const status = value.status === 'running'
    || value.status === 'paused'
    || value.status === 'completed'
    || value.status === 'idle'
    ? value.status
    : 'idle';
  return {
    schemaVersion: PISTON_OSCILLATION_DEMO_SESSION_SCHEMA_VERSION,
    status,
    elapsedMs: status === 'idle' ? 0 : finiteNonNegative(value.elapsedMs),
    runningSinceMs: status === 'running' && typeof value.runningSinceMs === 'number'
      && Number.isFinite(value.runningSinceMs)
      && value.runningSinceMs >= 0
      ? value.runningSinceMs
      : null,
    updatedAtMs: finiteNonNegative(value.updatedAtMs),
  };
};

export const resolvePistonOscillationDemoSession = (
  sessionInput: PistonOscillationDemoSession,
  durationMs: number,
  nowMs: number,
): PistonOscillationDemoSession => {
  const session = normalizePistonOscillationDemoSession(sessionInput);
  if (session.status !== 'running' || session.runningSinceMs === null) return session;
  const elapsedMs = Math.min(
    finiteNonNegative(durationMs),
    session.elapsedMs + Math.max(0, finiteNonNegative(nowMs) - session.runningSinceMs),
  );
  if (elapsedMs < durationMs) return { ...session, elapsedMs };
  return {
    ...session,
    status: 'completed',
    elapsedMs,
    runningSinceMs: null,
    updatedAtMs: finiteNonNegative(nowMs),
  };
};

export const startPistonOscillationDemoSession = (
  nowMs: number,
): PistonOscillationDemoSession => ({
  ...createDefaultPistonOscillationDemoSession(nowMs),
  status: 'running',
  runningSinceMs: finiteNonNegative(nowMs),
});

export const pausePistonOscillationDemoSession = (
  session: PistonOscillationDemoSession,
  durationMs: number,
  nowMs: number,
): PistonOscillationDemoSession => {
  const resolved = resolvePistonOscillationDemoSession(session, durationMs, nowMs);
  if (resolved.status !== 'running') return resolved;
  return {
    ...resolved,
    status: 'paused',
    runningSinceMs: null,
    updatedAtMs: finiteNonNegative(nowMs),
  };
};

export const resumePistonOscillationDemoSession = (
  session: PistonOscillationDemoSession,
  nowMs: number,
): PistonOscillationDemoSession => {
  const normalized = normalizePistonOscillationDemoSession(session);
  if (normalized.status !== 'paused') return normalized;
  return {
    ...normalized,
    status: 'running',
    runningSinceMs: finiteNonNegative(nowMs),
    updatedAtMs: finiteNonNegative(nowMs),
  };
};

export const completePistonOscillationDemoSession = (
  durationMs: number,
  nowMs: number,
): PistonOscillationDemoSession => ({
  schemaVersion: PISTON_OSCILLATION_DEMO_SESSION_SCHEMA_VERSION,
  status: 'completed',
  elapsedMs: finiteNonNegative(durationMs),
  runningSinceMs: null,
  updatedAtMs: finiteNonNegative(nowMs),
});
