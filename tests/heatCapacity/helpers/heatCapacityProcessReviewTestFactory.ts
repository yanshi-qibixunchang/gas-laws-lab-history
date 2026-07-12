import {
  calculateFreeHeatCapacityTrialSignals,
  normalizeHeatCapacityFreeRecordInput,
  type HeatCapacityFreeRecord,
  type HeatCapacityFreeTrial,
} from '../../../src/domain/heatCapacity/heatCapacityFreeTrialModel.ts';
import {
  appendFreeTraceEvent,
  appendFreeTraceSample,
  createDefaultFreeConfigSnapshot,
  createDefaultFreeTraceStore,
  createFreeTraceTrial,
  type HeatCapacityFreeConfigSnapshot,
  type HeatCapacityFreeTraceBranch,
  type HeatCapacityFreeTraceSample,
  type HeatCapacityFreeTraceSampleInput,
  type HeatCapacityFreeTraceStore,
  type HeatCapacityFreeTraceTrial,
} from '../../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import type {
  HeatCapacityProcessScoringInput,
} from '../../../src/domain/heatCapacity/heatCapacityFreeProcessScoringModel.ts';
import type {
  HeatCapacityProcessReviewRecordValue,
  HeatCapacityProcessReviewSummary,
} from '../../../src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts';
import {
  selectHeatCapacityFreeProcessReview,
} from '../../../src/domain/heatCapacity/heatCapacityFreeProcessReviewModel.ts';

export interface HeatCapacityProcessReviewTraceSetup {
  traceStore: HeatCapacityFreeTraceStore;
  traceTrial: HeatCapacityFreeTraceTrial;
  branch: HeatCapacityFreeTraceBranch;
}

export interface HeatCapacityProcessReviewFixtureParts {
  traceStore: HeatCapacityFreeTraceStore;
  traceTrial: HeatCapacityFreeTraceTrial;
  branch: HeatCapacityFreeTraceBranch;
  trial: HeatCapacityFreeTrial;
}

type HeatCapacityTraceSampleInputOverrides = Omit<
  Partial<HeatCapacityFreeTraceSampleInput>,
  'controls' | 'physical' | 'sensor' | 'calibration' | 'stability'
> & {
  controls?: Partial<HeatCapacityFreeTraceSampleInput['controls']>;
  physical?: Partial<HeatCapacityFreeTraceSampleInput['physical']>;
  sensor?: Partial<HeatCapacityFreeTraceSampleInput['sensor']>;
  calibration?: Partial<HeatCapacityFreeTraceSampleInput['calibration']>;
  stability?: Partial<HeatCapacityFreeTraceSampleInput['stability']>;
};

export const createSampleInputForProcessReviewTest = (
  atS: number,
  pressureMv: number,
  temperatureMv: number,
  overrides: HeatCapacityTraceSampleInputOverrides = {},
): HeatCapacityFreeTraceSampleInput => {
  const {
    controls: controlOverrides,
    physical: physicalOverrides,
    sensor: sensorOverrides,
    calibration: calibrationOverrides,
    stability: stabilityOverrides,
    ...restOverrides
  } = overrides;
  const controls: HeatCapacityFreeTraceSampleInput['controls'] = {
    powerOn: true,
    stopcockOpen: false,
    pumpValveOpen: false,
    pumpBulbState: 'idle',
    releaseFlowOpen: false,
    releasePhase: 'closed',
    releaseDurationS: 0,
    ...controlOverrides,
  };
  const physical: HeatCapacityFreeTraceSampleInput['physical'] = {
    gasPressureKPa: 101.3 + pressureMv / 20,
    pressureDeltaKPa: pressureMv / 20,
    gasTemperatureK: 298.15 + (temperatureMv - 1499) / 2,
    wallTemperatureK: 298.15,
    ambientTemperatureK: 298.15,
    gasAmountRatio: 1,
    pumpStrokeCount: 0,
    releaseStarted: false,
    currentStopcockOpenDurationS: 0,
    ...physicalOverrides,
  };
  return {
    atS,
    reason: 'periodic',
    phase: 'sealedStabilizing',
    sensor: {
      displayPressureMv: pressureMv,
      displayTemperatureMv: temperatureMv,
      pressureSlopeMvPerS: 0.03,
      temperatureSlopeMvPerS: 0.02,
      ...sensorOverrides,
    },
    calibration: { calibrationVersion: 1, zeroOffsetMv: 0, zeroEventId: 'zero-1', ...calibrationOverrides },
    stability: { pressureStable: true, temperatureStable: true, ...stabilityOverrides },
    safetyStatus: 'normal',
    ...restOverrides,
    controls,
    physical,
  };
};

const appendEventAtSample = (
  branch: HeatCapacityFreeTraceBranch,
  sample: HeatCapacityFreeTraceSample,
  type: Parameters<typeof appendFreeTraceEvent>[1]['type'],
  atS = sample.atS,
  payload?: Record<string, unknown>,
) => appendFreeTraceEvent(branch, {
  atS,
  type,
  traceSampleId: sample.id,
  payload,
}).branch;

const replaceTraceTrial = (
  store: HeatCapacityFreeTraceStore,
  traceTrial: HeatCapacityFreeTraceTrial,
) => ({
  ...store,
  activeTraceTrialId: traceTrial.id,
  traceTrials: store.traceTrials.map((candidate) => (
    candidate.id === traceTrial.id ? traceTrial : candidate
  )),
});

export const createTraceTrialForProcessReviewTest = (
  config: HeatCapacityFreeConfigSnapshot = createDefaultFreeConfigSnapshot(),
  sampleInputs: HeatCapacityFreeTraceSampleInput[],
): HeatCapacityProcessReviewTraceSetup => {
  let store = createDefaultFreeTraceStore();
  const created = createFreeTraceTrial(store, config, 'free-trial-1');
  store = created.store;
  let branch = created.traceTrial.branches[0];
  const samples: HeatCapacityFreeTraceSample[] = [];

  for (const input of sampleInputs) {
    const result = appendFreeTraceSample(branch, input);
    branch = result.branch;
    samples.push(result.sample);
  }

  const [u0Sample, u1Sample, u2Sample] = samples;
  if (u0Sample) {
    branch = appendEventAtSample(branch, u0Sample, 'power-on');
    branch = appendEventAtSample(branch, u0Sample, 'stopcock-open');
    branch = appendEventAtSample(branch, u0Sample, 'zero-calibration');
    branch = appendEventAtSample(branch, u0Sample, 'record-u0');
  }
  if (u1Sample) {
    const pumpOpenAtS = Math.max((u0Sample?.atS ?? 0) + 0.5, u1Sample.atS - 3);
    branch = appendEventAtSample(branch, u1Sample, 'pump-valve-open', pumpOpenAtS);
    branch = appendEventAtSample(branch, u1Sample, 'pump-stroke', pumpOpenAtS + 0.7, { pumpStrokeCount: 1 });
    branch = appendEventAtSample(branch, u1Sample, 'pump-valve-close', Math.max(pumpOpenAtS + 1, u1Sample.atS - 0.4));
    branch = appendEventAtSample(branch, u1Sample, 'record-u1');
  }
  if (u1Sample && u2Sample) {
    const openCommandAtS = u1Sample.atS + 0.3;
    const releaseStartAtS = openCommandAtS + 0.42;
    const releaseDurationS = 0.375;
    branch = appendEventAtSample(branch, u2Sample, 'stopcock-open', openCommandAtS, {
      attemptId: 1,
      purpose: 'release',
    });
    branch = appendEventAtSample(branch, u2Sample, 'release-start', releaseStartAtS, {
      attemptId: 1,
      formedRelease: true,
      openingCompletedAtS: releaseStartAtS,
      releaseDurationS: 0,
    });
    branch = appendEventAtSample(branch, u2Sample, 'stopcock-close', releaseStartAtS + releaseDurationS, {
      attemptId: 1,
      formedRelease: true,
      quickToggle: false,
      releaseDurationS,
    });
    branch = appendEventAtSample(branch, u2Sample, 'record-u2');
  }

  const traceTrial: HeatCapacityFreeTraceTrial = {
    ...created.traceTrial,
    activeBranchId: branch.id,
    branches: [branch],
  };

  return {
    traceStore: replaceTraceTrial(store, traceTrial),
    traceTrial,
    branch,
  };
};

const createRecordForProcessReviewTest = (
  sample: HeatCapacityFreeTraceSample | undefined,
  traceTrial: HeatCapacityFreeTraceTrial,
  branch: HeatCapacityFreeTraceBranch,
  eventType: 'record-u0' | 'record-u1' | 'record-u2',
): HeatCapacityFreeRecord | null => {
  if (!sample) return null;
  const event = branch.events.find((candidate) => (
    candidate.type === eventType &&
    candidate.traceSampleId === sample.id
  ));
  return normalizeHeatCapacityFreeRecordInput({
    atS: sample.atS,
    displayPressureMv: sample.sensor.displayPressureMv,
    displayTemperatureMv: sample.sensor.displayTemperatureMv,
    calibrationVersion: sample.calibration.calibrationVersion,
    zeroEventId: sample.calibration.zeroEventId ?? 'zero-1',
    phaseAtRecord: sample.phase,
    traceTrialId: traceTrial.id,
    traceBranchId: branch.id,
    traceSampleId: sample.id,
    eventId: event?.id ?? null,
  });
};

export const createTrialForProcessReviewTest = (
  setup: HeatCapacityProcessReviewTraceSetup,
): HeatCapacityFreeTrial => {
  const [u0Sample, u1Sample, u2Sample] = setup.branch.samples;
  const baseTrial: HeatCapacityFreeTrial = {
    id: setup.traceTrial.linkedTrialId ?? 'free-trial-1',
    source: 'free',
    parameterScheme: 'real',
    traceTrialId: setup.traceTrial.id,
    branchCount: setup.traceTrial.branches.length,
    automaticU0: null,
    u0: createRecordForProcessReviewTest(u0Sample, setup.traceTrial, setup.branch, 'record-u0'),
    u1: createRecordForProcessReviewTest(u1Sample, setup.traceTrial, setup.branch, 'record-u1'),
    u2: createRecordForProcessReviewTest(u2Sample, setup.traceTrial, setup.branch, 'record-u2'),
    blockedReason: null,
    correctedSignals: null,
    configSnapshot: setup.traceTrial.configSnapshot,
    standardReferenceSnapshot: null,
    completedAtMs: null,
  };
  return {
    ...baseTrial,
    correctedSignals: calculateFreeHeatCapacityTrialSignals(baseTrial, {
      atmosphericPressureKPa: setup.traceTrial.configSnapshot.environment.ambientPressureKPa,
      pressureSensitivityMvPerKPa: setup.traceTrial.configSnapshot.sensor.pressureMvPerKPa,
    }),
  };
};

export const createCompleteProcessReviewFixtureParts = (): HeatCapacityProcessReviewFixtureParts => {
  const config = createDefaultFreeConfigSnapshot();
  const setup = createTraceTrialForProcessReviewTest(config, [
    createSampleInputForProcessReviewTest(5, 0, 1499, {
      phase: 'zeroed',
      controls: { powerOn: true, stopcockOpen: true, pumpValveOpen: false },
    }),
    createSampleInputForProcessReviewTest(30, 112, 1499.05, { phase: 'sealedStabilizing' }),
    createSampleInputForProcessReviewTest(60, 31.4, 1498.98, { phase: 'recovering' }),
  ]);
  return {
    traceStore: setup.traceStore,
    traceTrial: setup.traceTrial,
    branch: setup.branch,
    trial: createTrialForProcessReviewTest(setup),
  };
};

export const createOverVentedProcessReviewFixtureParts = (): HeatCapacityProcessReviewFixtureParts => {
  const config = createDefaultFreeConfigSnapshot();
  const setup = createTraceTrialForProcessReviewTest(config, [
    createSampleInputForProcessReviewTest(5, 0, 1499, {
      phase: 'zeroed',
      controls: { powerOn: true, stopcockOpen: true, pumpValveOpen: false },
    }),
    createSampleInputForProcessReviewTest(30, 112, 1499.05, { phase: 'sealedStabilizing' }),
    createSampleInputForProcessReviewTest(60, 4, 1498.5, { phase: 'recovering' }),
  ]);
  return {
    traceStore: setup.traceStore,
    traceTrial: setup.traceTrial,
    branch: setup.branch,
    trial: createTrialForProcessReviewTest(setup),
  };
};

export const createIncompleteProcessReviewFixtureParts = (): HeatCapacityProcessReviewFixtureParts => {
  const parts = createCompleteProcessReviewFixtureParts();
  return {
    ...parts,
    trial: {
      ...parts.trial,
      u1: null,
      u2: null,
      correctedSignals: null,
    },
  };
};

const toReviewRecordValueForTest = (
  record: HeatCapacityFreeRecord | null,
  config: HeatCapacityFreeConfigSnapshot,
): HeatCapacityProcessReviewRecordValue | null => (record
  ? {
    atS: record.atS,
    displayPressureMv: record.displayPressureMv,
    displayTemperatureMv: record.displayTemperatureMv,
    pressureDeltaKPa: Number((record.displayPressureMv / config.sensor.pressureMvPerKPa).toFixed(3)),
    temperatureDeltaK: Number(((record.displayTemperatureMv - config.sensor.temperatureMvAtAmbient) /
      config.sensor.temperatureMvPerK).toFixed(3)),
  }
  : null);

export const createProcessReviewSummaryForTest = (
  traceTrial: HeatCapacityFreeTraceTrial,
  branch: HeatCapacityFreeTraceBranch,
  trial: HeatCapacityFreeTrial,
  theoreticalGamma = 1.4,
): HeatCapacityProcessReviewSummary => {
  void branch;
  return {
    trialIndex: 1,
    trialId: trial.id,
    traceTrialId: traceTrial.id,
    branchId: branch.id,
    branchCount: traceTrial.branches.length,
    retakeCount: Math.max(0, traceTrial.branches.length - 1),
    u1: toReviewRecordValueForTest(trial.u1, traceTrial.configSnapshot),
    u2: toReviewRecordValueForTest(trial.u2, traceTrial.configSnapshot),
    gamma: trial.correctedSignals?.gamma ?? null,
    relativeErrorPercent: trial.correctedSignals
      ? Number((Math.abs(trial.correctedSignals.gamma - theoreticalGamma) / theoreticalGamma * 100).toFixed(2))
      : null,
    upperBoundGamma: null,
    upperBoundRelativeErrorPercent: null,
    upperBoundGapPercent: null,
  };
};

export const createCompleteProcessScoringInputFixture = (): HeatCapacityProcessScoringInput => {
  const { traceTrial, branch, trial } = createCompleteProcessReviewFixtureParts();
  const summary = createProcessReviewSummaryForTest(traceTrial, branch, trial, 1.4);
  return {
    traceTrial,
    branch,
    trial,
    summary,
  };
};

export const createOverVentedProcessScoringInputFixture = (): HeatCapacityProcessScoringInput => {
  const { traceTrial, branch, trial } = createOverVentedProcessReviewFixtureParts();
  const summary = createProcessReviewSummaryForTest(traceTrial, branch, trial, 1.4);
  return {
    traceTrial,
    branch,
    trial,
    summary,
  };
};

export const createIncompleteProcessScoringInputFixture = (): HeatCapacityProcessScoringInput => {
  const { traceTrial, branch, trial } = createIncompleteProcessReviewFixtureParts();
  const summary = createProcessReviewSummaryForTest(traceTrial, branch, trial, 1.4);
  return {
    traceTrial,
    branch,
    trial,
    summary,
  };
};

const withSignals = (
  trial: HeatCapacityFreeTrial,
  traceTrial: HeatCapacityFreeTraceTrial,
): HeatCapacityFreeTrial => ({
  ...trial,
  correctedSignals: calculateFreeHeatCapacityTrialSignals(trial, {
    atmosphericPressureKPa: traceTrial.configSnapshot.environment.ambientPressureKPa,
    pressureSensitivityMvPerKPa: traceTrial.configSnapshot.sensor.pressureMvPerKPa,
  }),
});

const createReviewFromParts = (parts: HeatCapacityProcessReviewFixtureParts) => {
  const traceStore: HeatCapacityFreeTraceStore = {
    ...parts.traceStore,
    traceTrials: parts.traceStore.traceTrials.map((traceTrial) => (
      traceTrial.id === parts.traceTrial.id ? parts.traceTrial : traceTrial
    )),
  };
  return selectHeatCapacityFreeProcessReview({
    trials: [parts.trial],
    traceStore,
    theoreticalGamma: 1.4,
    selectedTrialId: parts.trial.id,
  });
};

export const createStandardOperationReviewFixture = () => (
  createReviewFromParts(createCompleteProcessReviewFixtureParts())
);

export const createOverVentedProcessReviewFixture = () => (
  createReviewFromParts(createOverVentedProcessReviewFixtureParts())
);

export const createIncompleteProcessReviewFixture = () => (
  createReviewFromParts(createIncompleteProcessReviewFixtureParts())
);

export const createInsufficientPumpReviewFixture = () => {
  const parts = createCompleteProcessReviewFixtureParts();
  const lowU1 = parts.trial.u1
    ? {
      ...parts.trial.u1,
      displayPressureMv: parts.traceTrial.configSnapshot.record.minimumUsefulU1CorrectedMv - 8,
    }
    : null;
  const lowU2 = parts.trial.u2
    ? {
      ...parts.trial.u2,
      displayPressureMv: 24,
    }
    : null;
  const trial = withSignals({
    ...parts.trial,
    u1: lowU1,
    u2: lowU2,
  }, parts.traceTrial);
  return createReviewFromParts({ ...parts, trial });
};

export const createEarlyU1RecordReviewFixture = () => {
  const parts = createCompleteProcessReviewFixtureParts();
  const trial = withSignals({
    ...parts.trial,
    u1: parts.trial.u1
      ? { ...parts.trial.u1, atS: 18, traceSampleId: 'early-u1-sample' }
      : null,
  }, parts.traceTrial);
  return createReviewFromParts({ ...parts, trial });
};

export const createEarlyU2RecordReviewFixture = () => {
  const parts = createCompleteProcessReviewFixtureParts();
  const trial = withSignals({
    ...parts.trial,
    u2: parts.trial.u2
      ? { ...parts.trial.u2, atS: 33, traceSampleId: 'early-u2-sample' }
      : null,
  }, parts.traceTrial);
  return createReviewFromParts({ ...parts, trial });
};

export const createRetakeReviewFixture = () => {
  const parts = createCompleteProcessReviewFixtureParts();
  const archivedBranch: HeatCapacityFreeTraceBranch = {
    ...parts.branch,
    status: 'archived',
    hiddenInDefaultChart: true,
  };
  const retakeBranch: HeatCapacityFreeTraceBranch = {
    ...parts.branch,
    id: 'branch-2',
    parentBranchId: parts.branch.id,
    createdByEventId: 'retake-event-1',
    status: 'main',
    hiddenInDefaultChart: false,
  };
  const traceTrial: HeatCapacityFreeTraceTrial = {
    ...parts.traceTrial,
    activeBranchId: retakeBranch.id,
    nextBranchIndex: 3,
    branches: [archivedBranch, retakeBranch],
  };
  const trial: HeatCapacityFreeTrial = {
    ...parts.trial,
    branchCount: 2,
  };
  return createReviewFromParts({
    ...parts,
    traceTrial,
    traceStore: replaceTraceTrial(parts.traceStore, traceTrial),
    branch: retakeBranch,
    trial,
  });
};
