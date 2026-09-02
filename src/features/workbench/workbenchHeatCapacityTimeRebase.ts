import type {
  HeatCapacityFreeExperimentDomainState,
  WorkbenchHeatCapacityState,
} from './workbenchHeatCapacityStateTypes.ts';

const HEAT_CAPACITY_RUNTIME_RECOVERY_PRESENTATION_KEYS = new Set([
  'name',
  'updatedAt',
  'lastOpenedAt',
  'visiblePanels',
  'liveWorkspaceSplitRatio',
  'openHeatCapacityTabs',
  'activeHeatCapacityTabId',
  'heatCapacityMaterialsExpanded',
  'heatCapacityTabContainerHeight',
  'hardSphereViewEnabled',
  'heatCapacityFreeDisplayScheme',
  'heatCapacityFreeParameterDraft',
  'heatCapacityFreeFileAcknowledgements',
  'heatCapacityLessonIntroAutoShown',
]);

export const hasSameHeatCapacityRuntimeRecoveryState = (
  current: WorkbenchHeatCapacityState,
  expected: WorkbenchHeatCapacityState,
) => {
  if (current === expected) return true;
  const currentRecord = current as unknown as Record<string, unknown>;
  const expectedRecord = expected as unknown as Record<string, unknown>;
  const currentKeys = Object.keys(currentRecord);
  const expectedKeys = Object.keys(expectedRecord);
  if (currentKeys.length !== expectedKeys.length) return false;
  return currentKeys.every((key) => (
    HEAT_CAPACITY_RUNTIME_RECOVERY_PRESENTATION_KEYS.has(key) ||
    (
      Object.prototype.hasOwnProperty.call(expectedRecord, key) &&
      Object.is(currentRecord[key], expectedRecord[key])
    )
  ));
};

const shiftTimestamp = (value: number | null, offsetMs: number) => (
  typeof value === 'number' && Number.isFinite(value) ? value + offsetMs : value
);

const rebaseRollbackSnapshot = (
  snapshot: WorkbenchHeatCapacityState['heatCapacityFreeRollbackSnapshots']['afterPowerOn'],
  offsetMs: number,
) => snapshot ? {
  ...snapshot,
  pressureZeroDisplayedSamples: snapshot.pressureZeroDisplayedSamples.map((sample) => ({
    ...sample,
    atMs: sample.atMs + offsetMs,
  })),
  pumpStrokeTimestamps: snapshot.pumpStrokeTimestamps.map((timestamp) => timestamp + offsetMs),
  lastPumpTime: shiftTimestamp(snapshot.lastPumpTime, offsetMs),
} : null;

const rebaseFreeAttempt = (
  attempt: HeatCapacityFreeExperimentDomainState['activeAttempt'],
  offsetMs: number,
): HeatCapacityFreeExperimentDomainState['activeAttempt'] => attempt ? {
  ...attempt,
  startedAtWallClockMs: attempt.startedAtWallClockMs + offsetMs,
  powerOffStartedAtWallClockMs: shiftTimestamp(attempt.powerOffStartedAtWallClockMs, offsetMs),
  invalidatedAtWallClockMs: shiftTimestamp(attempt.invalidatedAtWallClockMs, offsetMs),
} : null;

const rebaseFreeDomain = (
  domain: HeatCapacityFreeExperimentDomainState,
  offsetMs: number,
): HeatCapacityFreeExperimentDomainState => ({
  ...domain,
  rollbackSnapshots: {
    afterPowerOn: rebaseRollbackSnapshot(domain.rollbackSnapshots.afterPowerOn, offsetMs),
    beforePump: rebaseRollbackSnapshot(domain.rollbackSnapshots.beforePump, offsetMs),
    beforeRelease: rebaseRollbackSnapshot(domain.rollbackSnapshots.beforeRelease, offsetMs),
  },
  activeAttempt: rebaseFreeAttempt(domain.activeAttempt, offsetMs),
});

export const rebaseHeatCapacityFileAfterSuspendedWallClock = (
  file: WorkbenchHeatCapacityState,
  suspendedAtMs: number,
  resumedAtMs: number,
): WorkbenchHeatCapacityState => {
  const offsetMs = Math.max(0, resumedAtMs - suspendedAtMs);
  const realDomain = rebaseFreeDomain(file.heatCapacityFreeRealDomain, offsetMs);
  const idealDomain = rebaseFreeDomain(file.heatCapacityFreeIdealDomain, offsetMs);
  const activeDomain = file.heatCapacityFreeParameterScheme === 'ideal' ? idealDomain : realDomain;

  return {
    ...file,
    lastUpdateMs: shiftTimestamp(file.lastUpdateMs, offsetMs),
    displayResponseLastUpdateMs: shiftTimestamp(file.displayResponseLastUpdateMs, offsetMs),
    pressureDisplayNextJitterAtMs: file.pressureDisplayNextJitterAtMs + offsetMs,
    temperatureDisplayNextJitterAtMs: file.temperatureDisplayNextJitterAtMs + offsetMs,
    pressureZeroDisplayedSamples: file.pressureZeroDisplayedSamples.map((sample) => ({
      ...sample,
      atMs: sample.atMs + offsetMs,
    })),
    pumpStrokeTimestamps: file.pumpStrokeTimestamps.map((timestamp) => timestamp + offsetMs),
    lastPumpTime: shiftTimestamp(file.lastPumpTime, offsetMs),
    heatCapacityFreeRollbackSnapshots: activeDomain.rollbackSnapshots,
    heatCapacityFreeRealDomain: realDomain,
    heatCapacityFreeIdealDomain: idealDomain,
    heatCapacityFreeActiveAttempt: activeDomain.activeAttempt,
    heatCapacityGuideWorkflow: {
      ...file.heatCapacityGuideWorkflow,
      releaseCloseResumeAtMs: shiftTimestamp(
        file.heatCapacityGuideWorkflow.releaseCloseResumeAtMs,
        offsetMs,
      ),
    },
    updatedAt: resumedAtMs,
  };
};
