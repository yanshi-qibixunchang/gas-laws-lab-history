export const HEAT_CAPACITY_FREE_ATTEMPT_TARGET_WAIT_S = 300;
export const HEAT_CAPACITY_FREE_ATTEMPT_POWER_OFF_TIMEOUT_MS = 60_000;
export const HEAT_CAPACITY_FREE_WAIT_SPEED_OPTIONS = [2, 4, 8, 16] as const;
export type HeatCapacityFreeWaitSpeedMultiplier =
  typeof HEAT_CAPACITY_FREE_WAIT_SPEED_OPTIONS[number];

export type HeatCapacityFreeAttemptStatus = 'active' | 'invalid';

export type HeatCapacityFreeAttemptStartReason =
  | 'u0-recorded'
  | 'effective-pump';

export type HeatCapacityFreeAttemptStage =
  | 'preparing'
  | 'pumping'
  | 'waiting-u1'
  | 'u1-recorded'
  | 'releasing'
  | 'waiting-u2'
  | 'u2-recorded';

export type HeatCapacityFreeAttemptPreheatOutcome =
  | 'completed'
  | 'omitted';

export type HeatCapacityFreeAttemptInvalidReason =
  | 'reopen-pump-valve-during-u1'
  | 'effective-pump-during-u1'
  | 'release-before-u1'
  | 'repump-after-u1'
  | 'zero-after-effective-pump'
  | 'open-stopcock-during-u2'
  | 'pump-during-u2'
  | 'power-off-timeout';

export interface HeatCapacityFreeAttempt {
  status: HeatCapacityFreeAttemptStatus;
  startReason: HeatCapacityFreeAttemptStartReason;
  stage: HeatCapacityFreeAttemptStage;
  preheatOutcome: HeatCapacityFreeAttemptPreheatOutcome;
  startedAtS: number;
  startedAtWallClockMs: number;
  effectivePumpCount: number;
  u1WaitStartedAtS: number | null;
  u1RecordedAtS: number | null;
  releaseStartedAtS: number | null;
  releaseClosedAtS: number | null;
  u2WaitStartedAtS: number | null;
  u2RecordedAtS: number | null;
  powerOffStartedAtWallClockMs: number | null;
  invalidReason: HeatCapacityFreeAttemptInvalidReason | null;
  invalidatedAtS: number | null;
  invalidatedAtWallClockMs: number | null;
  invalidPromptDismissed: boolean;
}

export interface StartHeatCapacityFreeAttemptInput {
  startReason: HeatCapacityFreeAttemptStartReason;
  preheatOutcome: HeatCapacityFreeAttemptPreheatOutcome;
  atS: number;
  wallClockMs: number;
  powerOn: boolean;
}

interface HeatCapacityFreeAttemptEventBase {
  atS: number;
  wallClockMs: number;
}

export type HeatCapacityFreeAttemptEvent = HeatCapacityFreeAttemptEventBase & (
  | { type: 'effective-pump' }
  | { type: 'pump-valve-opened' }
  | { type: 'pump-valve-closed' }
  | { type: 'zero-adjusted' }
  | { type: 'u1-recorded' }
  | { type: 'release-started' }
  | { type: 'release-closed' }
  | { type: 'stopcock-opened' }
  | { type: 'u2-recorded' }
);

export interface SetHeatCapacityFreeAttemptPowerInput {
  powerOn: boolean;
  atS: number;
  wallClockMs: number;
}

export interface EvaluateHeatCapacityFreeAttemptPowerOffInput {
  atS: number;
  wallClockMs: number;
}

export type HeatCapacityFreeAttemptWaitTimerStage =
  | 'idle'
  | 'u1-wait'
  | 'u2-wait';

export interface HeatCapacityFreeAttemptWaitTimerState {
  stage: HeatCapacityFreeAttemptWaitTimerStage;
  anchorAtS: number | null;
  elapsedS: number;
  targetS: number;
  remainingS: number;
  reachedTarget: boolean;
}

const ATTEMPT_STAGES = new Set<HeatCapacityFreeAttemptStage>([
  'preparing',
  'pumping',
  'waiting-u1',
  'u1-recorded',
  'releasing',
  'waiting-u2',
  'u2-recorded',
]);

const ATTEMPT_INVALID_REASONS = new Set<HeatCapacityFreeAttemptInvalidReason>([
  'reopen-pump-valve-during-u1',
  'effective-pump-during-u1',
  'release-before-u1',
  'repump-after-u1',
  'zero-after-effective-pump',
  'open-stopcock-during-u2',
  'pump-during-u2',
  'power-off-timeout',
]);

const ATTEMPT_TIMELINE_KEYS = [
  'u1WaitStartedAtS',
  'u1RecordedAtS',
  'releaseStartedAtS',
  'releaseClosedAtS',
  'u2WaitStartedAtS',
  'u2RecordedAtS',
] as const;

const ATTEMPT_STAGE_TIMELINE_LENGTH: Record<HeatCapacityFreeAttemptStage, number> = {
  preparing: 0,
  pumping: 0,
  'waiting-u1': 1,
  'u1-recorded': 2,
  releasing: 3,
  'waiting-u2': 5,
  'u2-recorded': 6,
};

const ATTEMPT_INVALID_REASON_STAGES: Record<
  Exclude<HeatCapacityFreeAttemptInvalidReason, 'power-off-timeout'>,
  ReadonlySet<HeatCapacityFreeAttemptStage>
> = {
  'reopen-pump-valve-during-u1': new Set(['waiting-u1']),
  'effective-pump-during-u1': new Set(['waiting-u1']),
  'release-before-u1': new Set(['preparing', 'pumping', 'waiting-u1']),
  'repump-after-u1': new Set(['u1-recorded', 'releasing']),
  'zero-after-effective-pump': new Set([
    'pumping',
    'waiting-u1',
    'u1-recorded',
    'releasing',
    'waiting-u2',
    'u2-recorded',
  ]),
  'open-stopcock-during-u2': new Set(['waiting-u2', 'u2-recorded']),
  'pump-during-u2': new Set(['waiting-u2', 'u2-recorded']),
};

const isAttemptRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const nullableFiniteNumber = (value: unknown): number | null => (
  typeof value === 'number' && Number.isFinite(value) ? value : null
);

/**
 * Persistence boundary for the single mutable attempt. Invalid or incomplete
 * payloads are discarded instead of being allowed to contaminate workflow
 * decisions after restore.
 */
export const normalizeHeatCapacityFreeAttempt = (
  value: unknown,
): HeatCapacityFreeAttempt | null => {
  if (!isAttemptRecord(value)) return null;
  const status = value.status === 'active' || value.status === 'invalid'
    ? value.status
    : null;
  const startReason = value.startReason === 'u0-recorded' || value.startReason === 'effective-pump'
    ? value.startReason
    : null;
  const stage = typeof value.stage === 'string' && ATTEMPT_STAGES.has(value.stage as HeatCapacityFreeAttemptStage)
    ? value.stage as HeatCapacityFreeAttemptStage
    : null;
  const preheatOutcome = value.preheatOutcome === 'completed' || value.preheatOutcome === 'omitted'
    ? value.preheatOutcome
    : null;
  const startedAtS = nullableFiniteNumber(value.startedAtS);
  const startedAtWallClockMs = nullableFiniteNumber(value.startedAtWallClockMs);
  const effectivePumpCount = typeof value.effectivePumpCount === 'number' &&
    Number.isSafeInteger(value.effectivePumpCount)
    ? value.effectivePumpCount
    : null;
  if (
    !status || !startReason || !stage || !preheatOutcome ||
    startedAtS === null || startedAtS < 0 ||
    startedAtWallClockMs === null || startedAtWallClockMs < 0 ||
    effectivePumpCount === null || effectivePumpCount < 0 ||
    typeof value.invalidPromptDismissed !== 'boolean' ||
    !ATTEMPT_TIMELINE_KEYS.every((key) => (
      value[key] === null || (typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= 0)
    )) ||
    (
      value.powerOffStartedAtWallClockMs !== null &&
      (
        typeof value.powerOffStartedAtWallClockMs !== 'number' ||
        !Number.isFinite(value.powerOffStartedAtWallClockMs) ||
        value.powerOffStartedAtWallClockMs < 0
      )
    ) ||
    (
      value.invalidatedAtS !== null &&
      (
        typeof value.invalidatedAtS !== 'number' ||
        !Number.isFinite(value.invalidatedAtS) ||
        value.invalidatedAtS < 0
      )
    ) ||
    (
      value.invalidatedAtWallClockMs !== null &&
      (
        typeof value.invalidatedAtWallClockMs !== 'number' ||
        !Number.isFinite(value.invalidatedAtWallClockMs) ||
        value.invalidatedAtWallClockMs < 0
      )
    )
  ) {
    return null;
  }
  const invalidReason = typeof value.invalidReason === 'string' &&
    ATTEMPT_INVALID_REASONS.has(value.invalidReason as HeatCapacityFreeAttemptInvalidReason)
    ? value.invalidReason as HeatCapacityFreeAttemptInvalidReason
    : null;
  if (value.invalidReason !== null && invalidReason === null) return null;
  const u1WaitStartedAtS = nullableFiniteNumber(value.u1WaitStartedAtS);
  const u1RecordedAtS = nullableFiniteNumber(value.u1RecordedAtS);
  const releaseStartedAtS = nullableFiniteNumber(value.releaseStartedAtS);
  const releaseClosedAtS = nullableFiniteNumber(value.releaseClosedAtS);
  const u2WaitStartedAtS = nullableFiniteNumber(value.u2WaitStartedAtS);
  const u2RecordedAtS = nullableFiniteNumber(value.u2RecordedAtS);
  const powerOffStartedAtWallClockMs = nullableFiniteNumber(value.powerOffStartedAtWallClockMs);
  const invalidatedAtS = nullableFiniteNumber(value.invalidatedAtS);
  const invalidatedAtWallClockMs = nullableFiniteNumber(value.invalidatedAtWallClockMs);
  if (
    (status === 'active' && (invalidReason !== null || invalidatedAtS !== null || invalidatedAtWallClockMs !== null)) ||
    (status === 'invalid' && (invalidReason === null || invalidatedAtS === null || invalidatedAtWallClockMs === null))
  ) {
    return null;
  }
  if (
    (stage === 'preparing' && effectivePumpCount !== 0) ||
    (stage !== 'preparing' && effectivePumpCount < 1) ||
    (startReason === 'effective-pump' && stage === 'preparing')
  ) return null;
  const timeline = [
    u1WaitStartedAtS,
    u1RecordedAtS,
    releaseStartedAtS,
    releaseClosedAtS,
    u2WaitStartedAtS,
    u2RecordedAtS,
  ];
  const requiredTimelineLength = ATTEMPT_STAGE_TIMELINE_LENGTH[stage];
  if (timeline.some((timestamp, index) => (
    index < requiredTimelineLength ? timestamp === null : timestamp !== null
  ))) return null;
  const orderedTimeline = [startedAtS, ...timeline.slice(0, requiredTimelineLength)] as number[];
  if (orderedTimeline.some((timestamp, index) => (
    index > 0 && timestamp < orderedTimeline[index - 1]!
  ))) return null;
  if (
    releaseClosedAtS !== null &&
    u2WaitStartedAtS !== null &&
    releaseClosedAtS !== u2WaitStartedAtS
  ) return null;
  const powerOffStartedAt = powerOffStartedAtWallClockMs;
  if (powerOffStartedAt !== null && powerOffStartedAt < startedAtWallClockMs) return null;
  if (status === 'active' && value.invalidPromptDismissed) return null;
  if (status === 'invalid') {
    const lastAttemptTimestamp = orderedTimeline.at(-1)!;
    if (
      invalidatedAtS! < lastAttemptTimestamp ||
      invalidatedAtWallClockMs! < startedAtWallClockMs ||
      (powerOffStartedAt !== null && invalidatedAtWallClockMs! < powerOffStartedAt)
    ) return null;
    if (invalidReason === 'power-off-timeout') {
      if (
        powerOffStartedAt === null ||
        invalidatedAtWallClockMs! - powerOffStartedAt < HEAT_CAPACITY_FREE_ATTEMPT_POWER_OFF_TIMEOUT_MS
      ) return null;
    } else if (!ATTEMPT_INVALID_REASON_STAGES[invalidReason!].has(stage)) {
      return null;
    }
  }
  return {
    status,
    startReason,
    stage,
    preheatOutcome,
    startedAtS,
    startedAtWallClockMs,
    effectivePumpCount,
    u1WaitStartedAtS,
    u1RecordedAtS,
    releaseStartedAtS,
    releaseClosedAtS,
    u2WaitStartedAtS,
    u2RecordedAtS,
    powerOffStartedAtWallClockMs,
    invalidReason,
    invalidatedAtS,
    invalidatedAtWallClockMs,
    invalidPromptDismissed: value.invalidPromptDismissed,
  };
};

const normalizeSimulationTimeS = (value: number) => (
  Number.isFinite(value) ? Math.max(0, value) : 0
);

const normalizeWallClockMs = (value: number) => (
  Number.isFinite(value) ? Math.max(0, value) : 0
);

const roundTimerSeconds = (value: number) => (
  Number.isFinite(value) ? Number(Math.max(0, value).toFixed(3)) : 0
);

export const createHeatCapacityFreeAttempt = (
  input: StartHeatCapacityFreeAttemptInput,
): HeatCapacityFreeAttempt => {
  const startedAtS = normalizeSimulationTimeS(input.atS);
  const startedAtWallClockMs = normalizeWallClockMs(input.wallClockMs);
  const startsWithEffectivePump = input.startReason === 'effective-pump';
  return {
    status: 'active',
    startReason: input.startReason,
    stage: startsWithEffectivePump ? 'pumping' : 'preparing',
    preheatOutcome: input.preheatOutcome,
    startedAtS,
    startedAtWallClockMs,
    effectivePumpCount: startsWithEffectivePump ? 1 : 0,
    u1WaitStartedAtS: null,
    u1RecordedAtS: null,
    releaseStartedAtS: null,
    releaseClosedAtS: null,
    u2WaitStartedAtS: null,
    u2RecordedAtS: null,
    powerOffStartedAtWallClockMs: input.powerOn ? null : startedAtWallClockMs,
    invalidReason: null,
    invalidatedAtS: null,
    invalidatedAtWallClockMs: null,
    invalidPromptDismissed: false,
  };
};

/**
 * Starts the current group only when it has no attempt yet. An invalid attempt is
 * deliberately retained until the caller performs a group reset and passes null.
 */
export const startHeatCapacityFreeAttempt = (
  current: HeatCapacityFreeAttempt | null | undefined,
  input: StartHeatCapacityFreeAttemptInput,
): HeatCapacityFreeAttempt => current ?? createHeatCapacityFreeAttempt(input);

export const invalidateHeatCapacityFreeAttempt = (
  attempt: HeatCapacityFreeAttempt,
  reason: HeatCapacityFreeAttemptInvalidReason,
  input: EvaluateHeatCapacityFreeAttemptPowerOffInput,
): HeatCapacityFreeAttempt => {
  if (attempt.status === 'invalid') {
    return attempt;
  }
  return {
    ...attempt,
    status: 'invalid',
    invalidReason: reason,
    invalidatedAtS: normalizeSimulationTimeS(input.atS),
    invalidatedAtWallClockMs: normalizeWallClockMs(input.wallClockMs),
    invalidPromptDismissed: false,
  };
};

export const setHeatCapacityFreeAttemptInvalidPromptDismissed = (
  attempt: HeatCapacityFreeAttempt,
  dismissed: boolean,
): HeatCapacityFreeAttempt => (
  attempt.status === 'invalid'
    ? { ...attempt, invalidPromptDismissed: dismissed }
    : attempt
);

const invalidateFromEvent = (
  attempt: HeatCapacityFreeAttempt,
  reason: HeatCapacityFreeAttemptInvalidReason,
  event: HeatCapacityFreeAttemptEvent,
) => invalidateHeatCapacityFreeAttempt(attempt, reason, event);

export const transitionHeatCapacityFreeAttempt = (
  attempt: HeatCapacityFreeAttempt,
  event: HeatCapacityFreeAttemptEvent,
): HeatCapacityFreeAttempt => {
  if (attempt.status === 'invalid') {
    return attempt;
  }
  const atS = normalizeSimulationTimeS(event.atS);

  switch (event.type) {
    case 'effective-pump':
      if (attempt.stage === 'waiting-u1') {
        return invalidateFromEvent(attempt, 'effective-pump-during-u1', event);
      }
      if (attempt.stage === 'u1-recorded' || attempt.stage === 'releasing') {
        return invalidateFromEvent(attempt, 'repump-after-u1', event);
      }
      if (attempt.stage === 'waiting-u2' || attempt.stage === 'u2-recorded') {
        return invalidateFromEvent(attempt, 'pump-during-u2', event);
      }
      return {
        ...attempt,
        stage: 'pumping',
        effectivePumpCount: attempt.effectivePumpCount + 1,
      };

    case 'pump-valve-opened':
      if (attempt.stage === 'waiting-u1') {
        return invalidateFromEvent(attempt, 'reopen-pump-valve-during-u1', event);
      }
      if (attempt.stage === 'waiting-u2' || attempt.stage === 'u2-recorded') {
        return invalidateFromEvent(attempt, 'pump-during-u2', event);
      }
      return attempt;

    case 'pump-valve-closed':
      if (attempt.stage !== 'pumping' || attempt.effectivePumpCount <= 0) {
        return attempt;
      }
      return {
        ...attempt,
        stage: 'waiting-u1',
        u1WaitStartedAtS: atS,
      };

    case 'zero-adjusted':
      return attempt.effectivePumpCount > 0
        ? invalidateFromEvent(attempt, 'zero-after-effective-pump', event)
        : attempt;

    case 'u1-recorded':
      if (attempt.stage !== 'waiting-u1' && attempt.stage !== 'u1-recorded') {
        return attempt;
      }
      return {
        ...attempt,
        stage: 'u1-recorded',
        u1RecordedAtS: atS,
      };

    case 'release-started':
      if (
        attempt.stage === 'preparing'
        || attempt.stage === 'pumping'
        || attempt.stage === 'waiting-u1'
      ) {
        return invalidateFromEvent(attempt, 'release-before-u1', event);
      }
      if (attempt.stage === 'waiting-u2' || attempt.stage === 'u2-recorded') {
        return invalidateFromEvent(attempt, 'open-stopcock-during-u2', event);
      }
      if (attempt.stage !== 'u1-recorded') {
        return attempt;
      }
      return {
        ...attempt,
        stage: 'releasing',
        releaseStartedAtS: atS,
        releaseClosedAtS: null,
        u2WaitStartedAtS: null,
      };

    case 'release-closed':
      if (attempt.stage !== 'releasing') {
        return attempt;
      }
      return {
        ...attempt,
        stage: 'waiting-u2',
        releaseClosedAtS: atS,
        u2WaitStartedAtS: atS,
      };

    case 'stopcock-opened':
      return attempt.stage === 'waiting-u2' || attempt.stage === 'u2-recorded'
        ? invalidateFromEvent(attempt, 'open-stopcock-during-u2', event)
        : attempt;

    case 'u2-recorded':
      if (attempt.stage !== 'waiting-u2' && attempt.stage !== 'u2-recorded') {
        return attempt;
      }
      return {
        ...attempt,
        stage: 'u2-recorded',
        u2RecordedAtS: atS,
      };
  }
};

export const evaluateHeatCapacityFreeAttemptPowerOffTimeout = (
  attempt: HeatCapacityFreeAttempt,
  input: EvaluateHeatCapacityFreeAttemptPowerOffInput,
): HeatCapacityFreeAttempt => {
  if (
    attempt.status === 'invalid'
    || attempt.powerOffStartedAtWallClockMs === null
  ) {
    return attempt;
  }
  const wallClockMs = normalizeWallClockMs(input.wallClockMs);
  if (
    wallClockMs - attempt.powerOffStartedAtWallClockMs
    < HEAT_CAPACITY_FREE_ATTEMPT_POWER_OFF_TIMEOUT_MS
  ) {
    return attempt;
  }
  return invalidateHeatCapacityFreeAttempt(
    attempt,
    'power-off-timeout',
    { ...input, wallClockMs },
  );
};

export const setHeatCapacityFreeAttemptPower = (
  attempt: HeatCapacityFreeAttempt,
  input: SetHeatCapacityFreeAttemptPowerInput,
): HeatCapacityFreeAttempt => {
  if (attempt.status === 'invalid') {
    return attempt;
  }
  const wallClockMs = normalizeWallClockMs(input.wallClockMs);
  if (!input.powerOn) {
    return attempt.powerOffStartedAtWallClockMs === null
      ? { ...attempt, powerOffStartedAtWallClockMs: wallClockMs }
      : attempt;
  }
  const evaluated = evaluateHeatCapacityFreeAttemptPowerOffTimeout(
    attempt,
    { ...input, wallClockMs },
  );
  return evaluated.status === 'invalid'
    ? evaluated
    : { ...evaluated, powerOffStartedAtWallClockMs: null };
};

const createInactiveTimer = (): HeatCapacityFreeAttemptWaitTimerState => ({
  stage: 'idle',
  anchorAtS: null,
  elapsedS: 0,
  targetS: HEAT_CAPACITY_FREE_ATTEMPT_TARGET_WAIT_S,
  remainingS: HEAT_CAPACITY_FREE_ATTEMPT_TARGET_WAIT_S,
  reachedTarget: false,
});

const createWaitingTimer = (
  stage: 'u1-wait' | 'u2-wait',
  anchorAtS: number,
  simulationTimeS: number,
): HeatCapacityFreeAttemptWaitTimerState => {
  const elapsedS = roundTimerSeconds(
    normalizeSimulationTimeS(simulationTimeS) - anchorAtS,
  );
  return {
    stage,
    anchorAtS,
    elapsedS,
    targetS: HEAT_CAPACITY_FREE_ATTEMPT_TARGET_WAIT_S,
    remainingS: roundTimerSeconds(
      HEAT_CAPACITY_FREE_ATTEMPT_TARGET_WAIT_S - elapsedS,
    ),
    reachedTarget: elapsedS >= HEAT_CAPACITY_FREE_ATTEMPT_TARGET_WAIT_S,
  };
};

export const deriveHeatCapacityFreeAttemptWaitTimer = (
  attempt: HeatCapacityFreeAttempt | null | undefined,
  simulationTimeS: number,
): HeatCapacityFreeAttemptWaitTimerState => {
  if (!attempt || attempt.status === 'invalid') {
    return createInactiveTimer();
  }
  if (
    (attempt.stage === 'waiting-u1' || attempt.stage === 'u1-recorded')
    && attempt.u1WaitStartedAtS !== null
  ) {
    return createWaitingTimer(
      'u1-wait',
      attempt.u1WaitStartedAtS,
      simulationTimeS,
    );
  }
  if (
    (attempt.stage === 'waiting-u2' || attempt.stage === 'u2-recorded')
    && attempt.u2WaitStartedAtS !== null
  ) {
    return createWaitingTimer(
      'u2-wait',
      attempt.u2WaitStartedAtS,
      simulationTimeS,
    );
  }
  return createInactiveTimer();
};
