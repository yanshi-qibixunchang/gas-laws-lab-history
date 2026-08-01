const { execFileSync } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const { dirname, join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

const readArgument = (name) => {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : null;
  if (!value) {
    throw new Error(`Missing required ${name} argument.`);
  }
  return value;
};

const sourceRoot = resolve(readArgument('--source-root'));
const version = readArgument('--version');
const outputPath = resolve(readArgument('--output'));
const sourceTag = `v${version}`;
const savedAtMs = 1_721_000_000_000;

const importSourceModule = (relativePath) => import(
  pathToFileURL(join(sourceRoot, relativePath)).href
);

const clone = (value) => structuredClone(value);

void (async () => {
  globalThis.__APP_VERSION__ = version;
  const originalDateNow = Date.now;
  Date.now = () => savedAtMs;
  try {
    const state = await importSourceModule(
      'src/features/workbench/workbenchState.ts',
    );
    const persistence = await importSourceModule(
      'src/features/workbench/workbenchPersistenceMigration.ts',
    );
    const freeTrialModel = await importSourceModule(
      'src/domain/heatCapacity/heatCapacityFreeTrialModel.ts',
    );
    const freeRecordModel = await importSourceModule(
      'src/domain/heatCapacity/heatCapacityFreeRecordModel.ts',
    );
    const freeConfigSnapshotModel = await importSourceModule(
      'src/features/workbench/workbenchHeatCapacityFreeConfigSnapshot.ts',
    );
    const freeTraceModel = await importSourceModule(
      'src/domain/heatCapacity/heatCapacityFreeTraceModel.ts',
    );
    const freeStandardReferenceModel = await importSourceModule(
      'src/domain/heatCapacity/heatCapacityFreeStandardReferenceModel.ts',
    );

    const standard = state.createDefaultStandardFile(41);
    standard.name = `${version} Compatibility Standard`;
    standard.params = {
      ...clone(standard.params),
      targetTemperature: 1.15,
    };
    standard.appliedParams = clone(standard.params);
    standard.runState = 'paused';
    standard.finalChartData = {
      speed: [{
        binStart: 0,
        binEnd: 1,
        count: 4,
        probability: 0.25,
        theoretical: 0.2,
      }],
      energy: [{
        binStart: 0,
        binEnd: 1,
        count: 3,
        probability: 0.2,
        theoretical: 0.18,
      }],
      energyLog: [],
      tempHistory: [{
        time: 1,
        temperature: 1.14,
        targetTemperature: 1.15,
        error: -0.01,
        totalEnergy: 10,
      }],
    };

    const ideal = state.createDefaultIdealFile(42);
    ideal.name = `${version} Compatibility Ideal Gas`;
    ideal.relation = 'pv';
    ideal.params = {
      ...clone(ideal.params),
      targetTemperature: 1.1,
    };
    ideal.appliedParams = clone(ideal.params);
    ideal.activeParams = clone(ideal.params);
    const volume = ideal.activeParams.L ** 3;
    ideal.pointsByRelation = {
      ...clone(ideal.pointsByRelation),
      pv: [{
        id: `fixture-pv-${version}`,
        relation: 'pv',
        targetTemperature: ideal.activeParams.targetTemperature,
        meanTemperature: 1.1,
        meanPressure: 0.03,
        idealPressure: 0.031,
        relativeGap: 0.02,
        timestamp: savedAtMs,
        boxLength: ideal.activeParams.L,
        volume,
        inverseVolume: 1 / volume,
      }],
    };

    let heatCapacity = state.createDefaultHeatCapacityFile(43);
    heatCapacity.name = `${version} Compatibility Heat Capacity`;
    if ('heatCapacityModeSessions' in heatCapacity) {
      const modeSession = await importSourceModule(
        'src/features/workbench/workbenchHeatCapacityModeSession.ts',
      );
      heatCapacity.heatCapacityMode = 'demo';
      heatCapacity = modeSession.suspendHeatCapacityModeSession(
        heatCapacity,
        null,
        savedAtMs - 1_500,
      );
    }
    heatCapacity.heatCapacityMode = 'free';
    const configSnapshot =
      freeConfigSnapshotModel.createHeatCapacityFreeConfigSnapshotFromFile(
        heatCapacity,
      );
    const trialId = `fixture-free-trial-${version}`;
    const trace = freeTraceModel.createFreeTraceTrial(
      freeTraceModel.createDefaultFreeTraceStore(),
      configSnapshot,
      trialId,
    );
    let traceBranch = trace.traceTrial.branches[0];
    const traceReferences = {};
    const appendTracePoint = ({
      key,
      atS,
      phase,
      displayPressureMv,
      eventType,
      eventPayload,
      stopcockOpen = false,
      releaseFlowOpen = false,
      releaseStarted = false,
      releaseDurationS = 0,
    }) => {
      const sample = freeTraceModel.appendFreeTraceSample(traceBranch, {
        atS,
        reason: eventType.startsWith('record-') ? 'record' : 'event',
        phase,
        controls: version === '4.2.3'
          ? {
              powerOn: true,
              stopcockOpen,
              pumpValveOpen: false,
              pumpBulbState: 'idle',
              stopcockFlowOpen: releaseFlowOpen,
            }
          : {
              powerOn: true,
              stopcockOpen,
              pumpValveOpen: false,
              pumpBulbState: 'idle',
              releaseFlowOpen,
              releasePhase: releaseFlowOpen
                ? 'releasing'
                : releaseStarted
                  ? 'closedAfterRelease'
                  : 'closed',
              releaseDurationS,
            },
        physical: {
          gasPressureKPa: displayPressureMv / 20 + 101.3,
          pressureDeltaKPa: displayPressureMv / 20,
          gasTemperatureK: 298.15,
          wallTemperatureK: 298.15,
          ambientTemperatureK: 298.15,
          gasAmountRatio: 1,
          pumpStrokeCount: 4,
          releaseStarted,
          currentStopcockOpenDurationS: releaseDurationS,
        },
        sensor: {
          displayPressureMv,
          displayTemperatureMv: 1498.7,
          pressureSlopeMvPerS: 0,
          temperatureSlopeMvPerS: 0,
        },
        calibration: {
          calibrationVersion: 1,
          zeroOffsetMv: 0,
          zeroEventId: `fixture-zero-${version}`,
        },
        stability: {
          pressureStable: true,
          temperatureStable: true,
        },
        safetyStatus: 'normal',
      });
      const event = freeTraceModel.appendFreeTraceEvent(sample.branch, {
        atS,
        type: eventType,
        traceSampleId: sample.sample.id,
        ...(eventPayload === undefined ? {} : { payload: eventPayload }),
      });
      traceBranch = event.branch;
      traceReferences[key] = {
        traceTrialId: trace.traceTrial.id,
        traceBranchId: traceBranch.id,
        traceSampleId: sample.sample.id,
        eventId: event.event.id,
      };
    };
    appendTracePoint({
      key: 'u0',
      atS: 10,
      phase: 'zeroed',
      displayPressureMv: 0,
      eventType: 'record-u0',
    });
    appendTracePoint({
      key: 'u1Anchor',
      atS: 19,
      phase: 'sealedStabilizing',
      displayPressureMv: 96,
      eventType: version === '4.2.3'
        ? 'pump-stroke'
        : 'pump-valve-close',
    });
    appendTracePoint({
      key: 'u1',
      atS: 20,
      phase: 'sealedStabilizing',
      displayPressureMv: 96,
      eventType: 'record-u1',
    });
    appendTracePoint({
      key: 'release',
      atS: 20.2,
      phase: 'releasing',
      displayPressureMv: 80,
      eventType: version === '4.2.3'
        ? 'stopcock-open'
        : 'release-start',
      eventPayload: version === '4.2.3'
        ? { attemptId: 1, purpose: 'release' }
        : {
            attemptId: 1,
            formedRelease: true,
            openingCompletedAtS: 20.2,
            releaseDurationS: 0,
          },
      stopcockOpen: true,
      releaseFlowOpen: true,
      releaseStarted: true,
    });
    appendTracePoint({
      key: 'releaseClose',
      atS: 20.8,
      phase: 'recovering',
      displayPressureMv: 30,
      eventType: 'stopcock-close',
      eventPayload: {
        attemptId: 1,
        purpose: 'release',
        formedRelease: true,
        quickToggle: false,
        openingCompletedAtS: 20.2,
        closeCommandAtS: 20.8,
        releaseDurationS: 0.6,
      },
      releaseStarted: true,
      releaseDurationS: 0.6,
    });
    appendTracePoint({
      key: 'u2',
      atS: 21,
      phase: 'recovering',
      displayPressureMv: 27.4,
      eventType: 'record-u2',
      releaseStarted: true,
      releaseDurationS: 0.6,
    });
    const recordInput = (
      atS,
      displayPressureMv,
      phaseAtRecord,
    ) => ({
      atS,
      displayPressureMv,
      displayTemperatureMv: 1498.7,
      calibrationVersion: 1,
      zeroEventId: `fixture-zero-${version}`,
      phaseAtRecord,
    });
    const u0Result = freeRecordModel.recordFreeU0(
      freeTrialModel.createHeatCapacityFreeTrial(
        trialId,
        null,
        'real',
      ),
      recordInput(10, 0, 'zeroed'),
    );
    if (!u0Result.accepted) {
      throw new Error(`${sourceTag} compatibility U0 was rejected.`);
    }
    const u1Result = freeRecordModel.recordFreeU1(
      u0Result.trial,
      recordInput(20, 96, 'sealedStabilizing'),
    );
    if (!u1Result.accepted) {
      throw new Error(`${sourceTag} compatibility U1 was rejected.`);
    }
    const u2Result = freeRecordModel.recordFreeU2(
      u1Result.trial,
      recordInput(21, 27.4, 'recovering'),
      {
        atmosphericPressureKPa: configSnapshot.environment.ambientPressureKPa,
        pressureSensitivityMvPerKPa:
          configSnapshot.sensor.pressureMvPerKPa,
        theoreticalGamma: configSnapshot.physics.gamma,
        preheatOutcome: 'completed',
        preheatBiasSeed: `fixture-${version}`,
      },
    );
    if (!u2Result.accepted || u2Result.trial.correctedSignals === null) {
      throw new Error(`${sourceTag} compatibility U2 was rejected.`);
    }
    const completedTrialBase = {
      ...u2Result.trial,
      u0: {
        ...u2Result.trial.u0,
        ...traceReferences.u0,
      },
      u1: {
        ...u2Result.trial.u1,
        ...traceReferences.u1,
      },
      u2: {
        ...u2Result.trial.u2,
        ...traceReferences.u2,
      },
      configSnapshot,
      completedAtMs: savedAtMs - 500,
      traceTrialId: trace.traceTrial.id,
      branchCount: 1,
    };
    const completedTraceTrial = {
      ...trace.traceTrial,
      status: 'completed',
      linkedTrialId: completedTrialBase.id,
      branches: [traceBranch],
    };
    const linkedTrial = {
      ...completedTrialBase,
      traceTrialId: completedTraceTrial.id,
      branchCount: completedTraceTrial.branches.length,
    };
    const completedTrial = {
      ...linkedTrial,
      standardReferenceSnapshot:
        freeStandardReferenceModel.createHeatCapacityFreeStandardReference({
          traceTrial: completedTraceTrial,
          trial: linkedTrial,
          theoreticalGamma: configSnapshot.physics.gamma,
        }),
    };
    const completedTraceStore = {
      ...trace.store,
      activeTraceTrialId: null,
      traceTrials: [completedTraceTrial],
    };
    heatCapacity.heatCapacityFreeExperimentGroupStatus = 'completed';
    heatCapacity.heatCapacityFreeActiveRunConfigSnapshot =
      clone(configSnapshot);
    heatCapacity.heatCapacityFreeTraceStore = completedTraceStore;
    heatCapacity.heatCapacityFreeTrials = [completedTrial];
    heatCapacity.heatCapacityFreeRealDomain = {
      ...heatCapacity.heatCapacityFreeRealDomain,
      experimentGroupStatus: 'completed',
      activeRunConfigSnapshot: clone(configSnapshot),
      traceStore: clone(completedTraceStore),
      trials: [clone(completedTrial)],
    };

    for (const file of [standard, ideal, heatCapacity]) {
      file.createdAt = savedAtMs - 2_000;
      file.updatedAt = savedAtMs - 1_000;
      file.lastOpenedAt = savedAtMs;
    }

    const workspace = persistence.encodeWorkbenchStorageEnvelope(
      [standard, heatCapacity],
      heatCapacity.id,
      'preview',
      savedAtMs,
    );
    workspace.appVersion = version;
    const closedFiles =
      persistence.encodeWorkbenchClosedFilesStorageEnvelope(
        [ideal],
        savedAtMs,
      );
    const sourceCommit = execFileSync(
      'git',
      ['-C', sourceRoot, 'rev-parse', 'HEAD'],
      { encoding: 'utf8' },
    ).trim();
    const fixture = {
      fixtureSchemaVersion: 1,
      sourceTag,
      sourceCommit,
      generatedBy: 'scripts/generateCompatibilityFixture.cjs',
      workspace,
      closedFiles,
      expectations: {
        activeFileId: heatCapacity.id,
        selectedPanel: 'preview',
        openFileIds: [standard.id, heatCapacity.id],
        closedFileIds: [ideal.id],
        standard: {
          id: standard.id,
          name: standard.name,
          targetTemperature: 1.15,
          finalSpeedBinCount: 1,
        },
        ideal: {
          id: ideal.id,
          name: ideal.name,
          relation: 'pv',
          targetTemperature: 1.1,
          pointId: `fixture-pv-${version}`,
        },
        heatCapacity: {
          id: heatCapacity.id,
          name: heatCapacity.name,
          mode: 'free',
          trialId: completedTrial.id,
          u0: completedTrial.u0.displayPressureMv,
          u1: completedTrial.u1.displayPressureMv,
          u2: completedTrial.u2.displayPressureMv,
          gamma: completedTrial.correctedSignals.gamma,
          suspendedDemoSession:
            'heatCapacityModeSessions' in heatCapacity,
        },
      },
    };
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(fixture, null, 2)}\n`);
    console.log(
      `Generated ${sourceTag} compatibility fixture from ${sourceCommit}.`,
    );
  } finally {
    Date.now = originalDateNow;
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
