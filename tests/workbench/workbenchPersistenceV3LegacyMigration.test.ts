import assert from 'node:assert/strict';
import { PhysicsEngine } from '../../src/domain/hardSphere/PhysicsEngine.ts';
import {
  createDefaultHeatCapacityFile,
  createDefaultHeatCapacityPistonOscillationFile,
  createDefaultIdealFile,
  createDefaultStandardFile,
  HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  type WorkbenchFileState,
} from '../../src/features/workbench/workbenchState.ts';
import type {
  WorkbenchExperimentFileEnvelopeV1,
} from '../../src/features/workbench/workbenchPersistenceSchema.ts';
import {
  encodeWorkbenchStorageEnvelope,
} from '../../src/features/workbench/workbenchPersistenceMigration.ts';
import {
  decodeLegacyWorkbenchWorkspaceSource,
  decodeLegacyWorkbenchFileEnvelopeToV3Projection,
} from '../../src/features/workbench/persistenceV3/legacyV2Adapter.ts';
import {
  createLegacyWorkbenchFileEnvelopeFixture as createWorkbenchFileEnvelopeWithCodec,
} from './helpers/legacyWorkbenchSourceFixture.ts';
import {
  projectWorkbenchPersistenceV3File,
  createWorkbenchPersistenceV3SemanticProjection,
} from '../../src/features/workbench/persistenceV3/projection.ts';
import {
  encodeWorkbenchPersistenceV3FileProjection,
} from '../../src/features/workbench/persistenceV3/codecRegistry.ts';
import {
  WORKBENCH_PERSISTENCE_V3_SCHEMA_FAMILY,
  WORKBENCH_PERSISTENCE_V3_SCHEMA_VERSION,
} from '../../src/features/workbench/persistenceV3/contract.ts';
import {
  createDefaultFreeConfigSnapshot,
  createDefaultFreeTraceStore,
  createFreeTraceTrial,
  HEAT_CAPACITY_FREE_TRACE_COMPACTION_VERSION,
  HEAT_CAPACITY_FREE_TRACE_VERSION,
} from '../../src/domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION,
  HEAT_CAPACITY_FREE_BATCH_VERSION,
} from '../../src/domain/heatCapacity/heatCapacityFreeBatchModel.ts';
import {
  suspendHeatCapacityModeSession,
} from '../../src/features/workbench/workbenchHeatCapacityModeSession.ts';
import {
  decodeWorkbenchPersistenceV3WorkspaceRecord,
  encodeWorkbenchPersistenceV3WorkspaceProjection,
  reprojectWorkbenchPersistenceV3Workspace,
} from '../../src/features/workbench/persistenceV3/workspaceCodec.ts';

const SAVED_AT = 1_721_000_000_000;

const requireLegacyMigration = (
  envelope: WorkbenchExperimentFileEnvelopeV1,
  label: string,
) => {
  const decoded = decodeLegacyWorkbenchFileEnvelopeToV3Projection(envelope);
  assert.equal(decoded.ok, true, `${label} should migrate`);
  if (!decoded.ok) throw new Error(decoded.diagnostics[0]?.message);
  assert.equal(decoded.status, 'migrated', `${label} should be classified as migrated`);
  assert.equal(decoded.value.fileId, envelope.id);
  assert.equal(decoded.value.fileKind, envelope.kind);
  return decoded.value;
};

const requireLegacyFailure = (
  envelope: WorkbenchExperimentFileEnvelopeV1,
  status: 'unsupported-future' | 'quarantined',
  label: string,
  expectedCode?: string,
) => {
  const decoded = decodeLegacyWorkbenchFileEnvelopeToV3Projection(envelope);
  assert.equal(decoded.ok, false, `${label} should fail closed`);
  if (decoded.ok) throw new Error(`${label} unexpectedly migrated`);
  assert.equal(decoded.status, status, `${label} should be classified as ${status}`);
  assert.deepEqual(
    decoded.raw,
    envelope,
    `${label} must preserve the complete original envelope`,
  );
  if (expectedCode !== undefined) {
    assert.ok(
      decoded.diagnostics.some((diagnostic) => (
        diagnostic.code === expectedCode
      )),
      `${label} should emit ${expectedCode}`,
    );
  }
  return decoded;
};

const emptyLegacyWorkspace = {
  schemaFamily: 'hard-sphere-lab.workbench-session',
  schemaVersion: 2,
  appVersion: '4.2.3',
  savedAt: SAVED_AT,
  activeFileId: null,
  selectedPanel: 'preview',
  files: [],
};
const emptyLegacyWorkspaceDecoded =
  decodeLegacyWorkbenchWorkspaceSource(emptyLegacyWorkspace);
assert.equal(emptyLegacyWorkspaceDecoded.ok, true);
if (!emptyLegacyWorkspaceDecoded.ok) {
  throw new Error(emptyLegacyWorkspaceDecoded.diagnostics[0]?.message);
}
assert.equal(
  emptyLegacyWorkspaceDecoded.value.sourceAppVersion,
  '4.2.3',
  'legacy workspace appVersion must remain available to per-file migration',
);
const guideSessionWorkspace = {
  ...structuredClone(emptyLegacyWorkspace),
  heatCapacityGuideSession: {
    fileId: null,
    strongReminderActive: false,
    strongReminderControlId: null,
  },
};
assert.equal(
  decodeLegacyWorkbenchWorkspaceSource(guideSessionWorkspace).ok,
  true,
  'the exact optional legacy guide-session checkpoint must remain readable',
);

for (const {
  label,
  mutate,
} of [
  {
    label: 'unknown workspace own key',
    mutate: (workspace: Record<string, unknown>) => {
      workspace.opaqueAuthority = {
        retain: true,
      };
    },
  },
  {
    label: 'non-string appVersion',
    mutate: (workspace: Record<string, unknown>) => {
      workspace.appVersion = {
        opaqueAuthority: true,
      };
    },
  },
] as const) {
  const invalidWorkspace = structuredClone(emptyLegacyWorkspace) as
    Record<string, unknown>;
  mutate(invalidWorkspace);
  const decoded = decodeLegacyWorkbenchWorkspaceSource(invalidWorkspace);
  assert.equal(decoded.ok, false, `${label} must fail closed`);
  if (decoded.ok) throw new Error(`${label} unexpectedly migrated`);
  assert.equal(decoded.status, 'quarantined');
  assert.deepEqual(
    decoded.raw,
    invalidWorkspace,
    `${label} must retain the complete workspace raw`,
  );
}

const currentLegacyFiles: WorkbenchFileState[] = [
  createDefaultStandardFile(11),
  createDefaultIdealFile(12),
  createDefaultHeatCapacityFile(13),
  createDefaultHeatCapacityPistonOscillationFile(14),
];

for (const file of currentLegacyFiles) {
  const envelope = createWorkbenchFileEnvelopeWithCodec(file, SAVED_AT);
  const productionEnvelope = encodeWorkbenchStorageEnvelope(
    [file],
    file.id,
    'preview',
    SAVED_AT,
  ).files[0];
  assert.deepEqual(
    envelope,
    productionEnvelope,
    `${file.kind} source fixture must match the current production writer`,
  );
  assert.deepEqual(
    Object.keys(envelope.layout).sort(),
    ({
      standard: [
        'liveWorkspaceSplitRatio',
        'standardResultsLayout',
        'visiblePanels',
      ],
      ideal: [
        'idealWindowLayout',
        'liveWorkspaceSplitRatio',
        'visiblePanels',
      ],
      heatCapacity: [
        'activeHeatCapacityTabId',
        'liveWorkspaceSplitRatio',
        'openHeatCapacityTabs',
        'visiblePanels',
      ],
      heatCapacityPistonOscillation: [
        'liveWorkspaceSplitRatio',
        'visiblePanels',
      ],
    } as const)[file.kind],
    `${file.kind} legacy layout must use the production source key set`,
  );
  requireLegacyMigration(envelope, `current legacy ${file.kind} envelope`);
}

const blankDemoEnvelope = structuredClone(
  createWorkbenchFileEnvelopeWithCodec(
    createDefaultHeatCapacityFile(15),
    SAVED_AT,
  ),
);
blankDemoEnvelope.payload.mode = 'demo';
blankDemoEnvelope.payload.guided = null;
const blankDemoStandalone = decodeLegacyWorkbenchFileEnvelopeToV3Projection(
  blankDemoEnvelope,
);
assert.equal(
  blankDemoStandalone.ok,
  false,
  'a blank Demo omission without workspace appVersion context must fail closed',
);
if (blankDemoStandalone.ok) {
  throw new Error('Expected standalone blank Demo omission quarantine.');
}
assert.equal(blankDemoStandalone.status, 'quarantined');
assert.deepEqual(blankDemoStandalone.raw, blankDemoEnvelope);

const createBlankDemoWorkspace = (appVersion: string) => ({
  schemaFamily: 'hard-sphere-lab.workbench-session',
  schemaVersion: 2,
  appVersion,
  savedAt: SAVED_AT,
  activeFileId: blankDemoEnvelope.id,
  selectedPanel: 'preview',
  files: [structuredClone(blankDemoEnvelope)],
});
const currentBlankDemoWorkspace = createBlankDemoWorkspace('5.1.2');
const currentBlankDemoDecoded =
  decodeWorkbenchPersistenceV3WorkspaceRecord(currentBlankDemoWorkspace);
assert.equal(currentBlankDemoDecoded.ok, true);
if (!currentBlankDemoDecoded.ok) {
  throw new Error('Expected the current blank Demo workspace to stay readable.');
}
assert.equal(currentBlankDemoDecoded.value.entries[0]?.kind, 'preserved');
const currentBlankDemoEntry = currentBlankDemoDecoded.value.entries[0];
if (currentBlankDemoEntry?.kind !== 'preserved') {
  throw new Error('Expected the current blank Demo file to be preserved.');
}
assert.equal(currentBlankDemoEntry.status, 'quarantined');
assert.deepEqual(currentBlankDemoEntry.raw, blankDemoEnvelope);

const developmentBlankDemoWorkspace =
  createBlankDemoWorkspace('development');
const developmentBlankDemoDecoded =
  decodeWorkbenchPersistenceV3WorkspaceRecord(
    developmentBlankDemoWorkspace,
  );
assert.equal(developmentBlankDemoDecoded.ok, true);
if (!developmentBlankDemoDecoded.ok) {
  throw new Error('Expected the source-scoped blank Demo migration.');
}
assert.equal(developmentBlankDemoDecoded.value.entries[0]?.kind, 'decoded');
const developmentBlankDemoRuntime =
  reprojectWorkbenchPersistenceV3Workspace(
    developmentBlankDemoDecoded.value,
  );
assert.equal(developmentBlankDemoRuntime.ok, true);
if (!developmentBlankDemoRuntime.ok) {
  throw new Error('Expected the source-scoped blank Demo runtime.');
}
const restoredBlankDemo = developmentBlankDemoRuntime.value.files[0];
assert.equal(restoredBlankDemo?.kind, 'heatCapacity');
if (restoredBlankDemo?.kind !== 'heatCapacity') {
  throw new Error('Expected a restored blank Demo Heat file.');
}
assert.equal(restoredBlankDemo.heatCapacityMode, 'demo');
assert.notEqual(
  restoredBlankDemo.heatCapacityModeSessions.demo.status,
  'empty',
  'the source-scoped blank Demo omission must seed a durable Demo session',
);

for (const file of currentLegacyFiles) {
  for (const {
    label,
    mutate,
    code,
  } of [
    {
      label: 'envelope',
      mutate: (envelope: WorkbenchExperimentFileEnvelopeV1) => {
        (
          envelope as unknown as Record<string, unknown>
        ).opaqueAuthority = {
          retain: true,
        };
      },
      code: 'legacy-file-envelope-own-keys-invalid',
    },
    {
      label: 'layout',
      mutate: (envelope: WorkbenchExperimentFileEnvelopeV1) => {
        envelope.layout.opaqueAuthority = {
          retain: true,
        };
      },
      code: 'legacy-file-layout-own-keys-invalid',
    },
    {
      label: 'payload',
      mutate: (envelope: WorkbenchExperimentFileEnvelopeV1) => {
        envelope.payload.opaqueAuthority = {
          retain: true,
        };
      },
      code: 'legacy-file-payload-own-keys-invalid',
    },
  ] as const) {
    const opaqueEnvelope = structuredClone(
      createWorkbenchFileEnvelopeWithCodec(file, SAVED_AT),
    );
    mutate(opaqueEnvelope);
    requireLegacyFailure(
      opaqueEnvelope,
      'quarantined',
      `${file.kind} legacy ${label} with an unknown own key`,
      code,
    );
  }
}

for (const file of currentLegacyFiles) {
  for (const {
    label,
    mutate,
  } of [
    {
      label: 'non-array visiblePanels',
      mutate: (envelope: WorkbenchExperimentFileEnvelopeV1) => {
        envelope.layout.visiblePanels = {
          opaqueAuthority: true,
        };
      },
    },
    {
      label: 'non-numeric liveWorkspaceSplitRatio',
      mutate: (envelope: WorkbenchExperimentFileEnvelopeV1) => {
        envelope.layout.liveWorkspaceSplitRatio = 'opaque';
      },
    },
  ] as const) {
    const invalidLayoutEnvelope = structuredClone(
      createWorkbenchFileEnvelopeWithCodec(file, SAVED_AT),
    );
    mutate(invalidLayoutEnvelope);
    requireLegacyFailure(
      invalidLayoutEnvelope,
      'quarantined',
      `${file.kind} legacy layout with ${label}`,
      'legacy-file-layout-shape-invalid',
    );
  }

  const futureFileWithUnknownOwnKey = structuredClone(
    createWorkbenchFileEnvelopeWithCodec(file, SAVED_AT),
  );
  (
    futureFileWithUnknownOwnKey as unknown as Record<string, unknown>
  ).fileSchemaVersion = 99;
  (
    futureFileWithUnknownOwnKey as unknown as Record<string, unknown>
  ).futureOnly = {
    retain: true,
  };
  requireLegacyFailure(
    futureFileWithUnknownOwnKey,
    'unsupported-future',
    `${file.kind} future file envelope with an unknown own key`,
    'legacy-file-envelope-version-future',
  );

  const missingKindLayoutKey = structuredClone(
    createWorkbenchFileEnvelopeWithCodec(file, SAVED_AT),
  );
  delete missingKindLayoutKey.layout[({
    standard: 'standardResultsLayout',
    ideal: 'idealWindowLayout',
    heatCapacity: 'openHeatCapacityTabs',
    heatCapacityPistonOscillation: 'liveWorkspaceSplitRatio',
  } as const)[file.kind]];
  requireLegacyFailure(
    missingKindLayoutKey,
    'quarantined',
    `${file.kind} legacy layout with a missing kind-specific key`,
    'legacy-file-layout-own-keys-invalid',
  );
}

const standardRecursiveShapeCases = [
  {
    label: 'params',
    mutate: (payload: Record<string, unknown>) => {
      (payload.params as Record<string, unknown>).opaqueAuthority = 1;
    },
  },
  {
    label: 'appliedParams',
    mutate: (payload: Record<string, unknown>) => {
      (payload.appliedParams as Record<string, unknown>).opaqueAuthority = 1;
    },
  },
  {
    label: 'runtime',
    mutate: (payload: Record<string, unknown>) => {
      (payload.runtime as Record<string, unknown>).opaqueAuthority = {
        retain: true,
      };
    },
  },
  {
    label: 'results',
    mutate: (payload: Record<string, unknown>) => {
      (payload.results as Record<string, unknown>).opaqueAuthority = {
        retain: true,
      };
    },
  },
  {
    label: 'results.standardResultsLayout',
    mutate: (payload: Record<string, unknown>) => {
      (
        (payload.results as Record<string, unknown>)
          .standardResultsLayout as Record<string, unknown>
      ).opaqueAuthority = {
        retain: true,
      };
    },
  },
] as const;

for (const { label, mutate } of standardRecursiveShapeCases) {
  const envelope = structuredClone(
    createWorkbenchFileEnvelopeWithCodec(
      createDefaultStandardFile(16),
      SAVED_AT,
    ),
  );
  mutate(envelope.payload);
  requireLegacyFailure(
    envelope,
    'quarantined',
    `Standard legacy payload with an unknown ${label} own key`,
    'legacy-standard-payload-recursive-shape-invalid',
  );
}

const idealRecursiveShapeCases = [
  {
    label: 'params',
    mutate: (payload: Record<string, unknown>) => {
      (payload.params as Record<string, unknown>).opaqueAuthority = 1;
    },
  },
  {
    label: 'appliedParams',
    mutate: (payload: Record<string, unknown>) => {
      (payload.appliedParams as Record<string, unknown>).opaqueAuthority = 1;
    },
  },
  {
    label: 'activeParams',
    mutate: (payload: Record<string, unknown>) => {
      (payload.activeParams as Record<string, unknown>).opaqueAuthority = 1;
    },
  },
  {
    label: 'runtime',
    mutate: (payload: Record<string, unknown>) => {
      (payload.runtime as Record<string, unknown>).opaqueAuthority = {
        retain: true,
      };
    },
  },
  {
    label: 'experiment',
    mutate: (payload: Record<string, unknown>) => {
      (payload.experiment as Record<string, unknown>).opaqueAuthority = {
        retain: true,
      };
    },
  },
  {
    label: 'experiment.pointsByRelation',
    mutate: (payload: Record<string, unknown>) => {
      (
        (payload.experiment as Record<string, unknown>)
          .pointsByRelation as Record<string, unknown>
      ).opaqueAuthority = {
        retain: true,
      };
    },
  },
  {
    label: 'results',
    mutate: (payload: Record<string, unknown>) => {
      (payload.results as Record<string, unknown>).opaqueAuthority = {
        retain: true,
      };
    },
  },
  {
    label: 'results.idealWindowLayout',
    mutate: (payload: Record<string, unknown>) => {
      (
        (payload.results as Record<string, unknown>)
          .idealWindowLayout as Record<string, unknown>
      ).opaqueAuthority = {
        retain: true,
      };
    },
  },
] as const;

for (const { label, mutate } of idealRecursiveShapeCases) {
  const envelope = structuredClone(
    createWorkbenchFileEnvelopeWithCodec(
      createDefaultIdealFile(17),
      SAVED_AT,
    ),
  );
  mutate(envelope.payload);
  requireLegacyFailure(
    envelope,
    'quarantined',
    `Ideal legacy payload with an unknown ${label} own key`,
    'legacy-ideal-payload-recursive-shape-invalid',
  );
}

for (const {
  label,
  mutate,
} of [
  {
    label: 'wrong experiment kind',
    mutate: (payload: Record<string, unknown>) => {
      payload.experimentKind = 'ideal';
    },
  },
  {
    label: 'invalid run state',
    mutate: (payload: Record<string, unknown>) => {
      (
        payload.runtime as Record<string, unknown>
      ).runState = 'future-state';
    },
  },
  {
    label: 'invalid editable params without needs-reset',
    mutate: (payload: Record<string, unknown>) => {
      (
        payload.params as Record<string, unknown>
      ).N = 0;
    },
  },
] as const) {
  const envelope = structuredClone(
    createWorkbenchFileEnvelopeWithCodec(
      createDefaultStandardFile(171),
      SAVED_AT,
    ),
  );
  mutate(envelope.payload);
  requireLegacyFailure(
    envelope,
    'quarantined',
    `Standard legacy semantic probe: ${label}`,
    'legacy-standard-payload-recursive-shape-invalid',
  );
}

for (const {
  label,
  mutate,
} of [
  {
    label: 'wrong experiment kind',
    mutate: (payload: Record<string, unknown>) => {
      payload.experimentKind = 'standard';
    },
  },
  {
    label: 'invalid relation',
    mutate: (payload: Record<string, unknown>) => {
      payload.relation = 'future-relation';
    },
  },
  {
    label: 'applied and active params mismatch',
    mutate: (payload: Record<string, unknown>) => {
      (
        payload.activeParams as Record<string, unknown>
      ).targetTemperature = 1.2;
    },
  },
  {
    label: 'invalid run state',
    mutate: (payload: Record<string, unknown>) => {
      (
        payload.runtime as Record<string, unknown>
      ).runState = 'future-state';
    },
  },
] as const) {
  const envelope = structuredClone(
    createWorkbenchFileEnvelopeWithCodec(
      createDefaultIdealFile(172),
      SAVED_AT,
    ),
  );
  mutate(envelope.payload);
  requireLegacyFailure(
    envelope,
    'quarantined',
    `Ideal legacy semantic probe: ${label}`,
    'legacy-ideal-payload-recursive-shape-invalid',
  );
}

const standardEngineFile = createDefaultStandardFile(18);
const standardEngine = new PhysicsEngine(standardEngineFile.appliedParams);
const standardEngineEnvelope = createWorkbenchFileEnvelopeWithCodec(
  {
    ...standardEngineFile,
    runState: 'paused',
    stats: standardEngine.getStats(),
    chartData: standardEngine.getHistogramData(false),
    finalChartData: standardEngine.getHistogramData(true),
    particles: standardEngine.particles.map((particle) => ({ ...particle })),
    hardSphereEngineSnapshot: standardEngine.createSnapshot(),
  },
  SAVED_AT,
);
requireLegacyMigration(
  standardEngineEnvelope,
  'Standard legacy envelope with a non-null exact engine snapshot',
);
const standardUnknownSnapshotField = structuredClone(standardEngineEnvelope);
(
  (
    standardUnknownSnapshotField.payload.runtime as Record<string, unknown>
  ).engineSnapshot as Record<string, unknown>
).opaqueAuthority = {
  retain: true,
};
requireLegacyFailure(
  standardUnknownSnapshotField,
  'quarantined',
  'Standard legacy engine snapshot with an unknown own key',
  'legacy-standard-payload-recursive-shape-invalid',
);
const standardMismatchedSnapshotParams = structuredClone(
  standardEngineEnvelope,
);
(
  (
    (
      standardMismatchedSnapshotParams.payload.runtime as
        Record<string, unknown>
    ).engineSnapshot as Record<string, unknown>
  ).params as Record<string, unknown>
).N = (
  (
    (
      (
        standardMismatchedSnapshotParams.payload.runtime as
          Record<string, unknown>
      ).engineSnapshot as Record<string, unknown>
    ).params as Record<string, unknown>
  ).N as number
) + 1;
requireLegacyFailure(
  standardMismatchedSnapshotParams,
  'quarantined',
  'Standard legacy engine snapshot with params conflicting with applied params',
  'legacy-standard-payload-recursive-shape-invalid',
);

const idealPointFile = createDefaultIdealFile(19);
const idealPointEnvelope = createWorkbenchFileEnvelopeWithCodec(
  {
    ...idealPointFile,
    pointsByRelation: {
      ...idealPointFile.pointsByRelation,
      pt: [{
        id: 'legacy-ideal-point-1',
        relation: 'pt',
        targetTemperature: 0.6,
        meanTemperature: 0.6,
        meanPressure: 0.1,
        idealPressure: 0.1,
        relativeGap: 0,
        timestamp: SAVED_AT,
      }],
    },
  },
  SAVED_AT,
);
requireLegacyMigration(
  idealPointEnvelope,
  'Ideal legacy envelope with one exact experiment point',
);
const idealUnknownPointField = structuredClone(idealPointEnvelope);
(
  (
    (
      idealUnknownPointField.payload.experiment as Record<string, unknown>
    ).pointsByRelation as Record<string, unknown>
  ).pt as Array<Record<string, unknown>>
)[0].opaqueAuthority = {
  retain: true,
};
requireLegacyFailure(
  idealUnknownPointField,
  'quarantined',
  'Ideal legacy experiment point with an unknown own key',
  'legacy-ideal-payload-recursive-shape-invalid',
);
const idealDuplicatePointId = structuredClone(idealPointEnvelope);
const idealDuplicatePointRelations = (
  idealDuplicatePointId.payload.experiment as Record<string, unknown>
).pointsByRelation as Record<string, Array<Record<string, unknown>>>;
idealDuplicatePointRelations.pv = [{
  ...structuredClone(idealDuplicatePointRelations.pt[0]),
  relation: 'pv',
}];
requireLegacyFailure(
  idealDuplicatePointId,
  'quarantined',
  'Ideal legacy experiment points with a cross-relation duplicate id',
  'legacy-ideal-payload-recursive-shape-invalid',
);

const heatCommonOpaqueEnvelope = structuredClone(
  createWorkbenchFileEnvelopeWithCodec(
    createDefaultHeatCapacityFile(15),
    SAVED_AT,
  ),
);
(
  heatCommonOpaqueEnvelope.payload.common as Record<string, unknown>
).opaqueAuthority = {
  retain: true,
};
requireLegacyFailure(
  heatCommonOpaqueEnvelope,
  'quarantined',
  'heat-capacity legacy common payload with an unknown own key',
  'legacy-heat-capacity-common-own-keys-invalid',
);

for (const {
  label,
  createEnvelope,
  mutate,
} of [
  {
    label: 'known common experiment-profile key with an arbitrary payload',
    createEnvelope: () => createWorkbenchFileEnvelopeWithCodec(
      createDefaultHeatCapacityFile(151),
      SAVED_AT,
    ),
    mutate: (envelope: WorkbenchExperimentFileEnvelopeV1) => {
      (
        envelope.payload.common as Record<string, unknown>
      ).experimentProfile = {
        arbitrary: true,
      };
    },
  },
  {
    label: 'known Free pressure-limit key with an arbitrary payload',
    createEnvelope: () => createWorkbenchFileEnvelopeWithCodec(
      createDefaultHeatCapacityFile(152),
      SAVED_AT,
    ),
    mutate: (envelope: WorkbenchExperimentFileEnvelopeV1) => {
      (
        (
          envelope.payload.free as Record<string, unknown>
        ).uiReplay as Record<string, unknown>
      ).pressureLimitKPa = 'bad';
    },
  },
  {
    label: 'known Guide workflow key with an arbitrary payload',
    createEnvelope: () => {
      const file = createDefaultHeatCapacityFile(153);
      file.heatCapacityMode = 'guide';
      return createWorkbenchFileEnvelopeWithCodec(file, SAVED_AT);
    },
    mutate: (envelope: WorkbenchExperimentFileEnvelopeV1) => {
      (
        envelope.payload.guided as Record<string, unknown>
      ).workflow = {
        arbitrary: true,
      };
    },
  },
] as const) {
  const envelope = structuredClone(createEnvelope());
  mutate(envelope);
  requireLegacyFailure(
    envelope,
    'quarantined',
    `Heat legacy ${label}`,
  );
}

const duplicateHeatAuthorityConflict = structuredClone(
  createWorkbenchFileEnvelopeWithCodec(
    createDefaultHeatCapacityFile(154),
    SAVED_AT,
  ),
);
const duplicateHeatAuthorityRuntime = (
  (
    duplicateHeatAuthorityConflict.payload.free as Record<string, unknown>
  ).runtime as Record<string, unknown>
);
duplicateHeatAuthorityRuntime.simulationTimeS =
  (duplicateHeatAuthorityRuntime.simulationTimeS as number) + 1;
requireLegacyFailure(
  duplicateHeatAuthorityConflict,
  'quarantined',
  'Heat legacy duplicate active runtime authority conflict',
  'legacy-heat-capacity-active-domain-parity-invalid',
);

const invalidRuntimeWithFutureTrace = structuredClone(
  createWorkbenchFileEnvelopeWithCodec(
    createDefaultHeatCapacityFile(155),
    SAVED_AT,
  ),
);
const invalidRuntimeWithFutureTraceFree =
  invalidRuntimeWithFutureTrace.payload.free as Record<string, unknown>;
invalidRuntimeWithFutureTraceFree.runtimeVersion = 4;
invalidRuntimeWithFutureTraceFree.traceVersion = 99;
requireLegacyFailure(
  invalidRuntimeWithFutureTrace,
  'unsupported-future',
  'Heat legacy invalid current runtime with a future trace',
  'legacy-heat-capacity-trace-version-future',
);

const malformedRealWithFutureIdealBatch = structuredClone(
  createWorkbenchFileEnvelopeWithCodec(
    createDefaultHeatCapacityFile(156),
    SAVED_AT,
  ),
);
const malformedRealWithFutureIdealBatchFree =
  malformedRealWithFutureIdealBatch.payload.free as Record<string, unknown>;
(
  malformedRealWithFutureIdealBatchFree.real as Record<string, unknown>
).activeRunConfigSnapshot = {
  malformed: true,
};
(
  (
    malformedRealWithFutureIdealBatchFree.ideal as Record<string, unknown>
  ).batch as Record<string, unknown>
).version = 99;
requireLegacyFailure(
  malformedRealWithFutureIdealBatch,
  'unsupported-future',
  'Heat legacy malformed real domain with a future ideal batch',
  'legacy-heat-capacity-batch-version-future',
);

const opaqueCommonWithFutureIdealBatch = structuredClone(
  createWorkbenchFileEnvelopeWithCodec(
    createDefaultHeatCapacityFile(1561),
    SAVED_AT,
  ),
);
(
  opaqueCommonWithFutureIdealBatch.payload.common as Record<string, unknown>
).opaqueAuthority = true;
(
  (
    (
      opaqueCommonWithFutureIdealBatch.payload.free as Record<string, unknown>
    ).ideal as Record<string, unknown>
  ).batch as Record<string, unknown>
).version = 99;
requireLegacyFailure(
  opaqueCommonWithFutureIdealBatch,
  'unsupported-future',
  'Heat legacy opaque common sibling with a future ideal batch',
  'legacy-heat-capacity-batch-version-future',
);

const futurePistonWithMalformedPreview = structuredClone(
  createWorkbenchFileEnvelopeWithCodec(
    createDefaultHeatCapacityPistonOscillationFile(157),
    SAVED_AT,
  ),
);
futurePistonWithMalformedPreview.payload.pistonOscillationSchemaVersion = 99;
futurePistonWithMalformedPreview.payload.preview = {
  malformed: true,
};
requireLegacyFailure(
  futurePistonWithMalformedPreview,
  'unsupported-future',
  'Piston legacy future payload with a malformed current preview',
  'unsupported-future-payload-version',
);

const suspendedLegacyModeSessionEnvelope = createWorkbenchFileEnvelopeWithCodec(
  suspendHeatCapacityModeSession(
    createDefaultHeatCapacityFile(158),
    null,
    SAVED_AT,
  ),
  SAVED_AT,
);
const misplacedDemoFreeFuture = structuredClone(
  suspendedLegacyModeSessionEnvelope,
);
const misplacedDemoFreeFutureSessions = (
  misplacedDemoFreeFuture.payload.common as Record<string, unknown>
).modeSessions as Record<string, unknown>;
misplacedDemoFreeFutureSessions.demo = structuredClone(
  misplacedDemoFreeFutureSessions.free,
);
const misplacedDemoSnapshot = (
  misplacedDemoFreeFutureSessions.demo as {
    snapshot: {
      free: Record<string, unknown>;
    } | null;
  }
).snapshot;
if (misplacedDemoSnapshot === null) {
  throw new Error('Expected a misplaced Demo Free snapshot.');
}
misplacedDemoSnapshot.free.heatCapacityFreeTraceVersion = 99;
requireLegacyFailure(
  misplacedDemoFreeFuture,
  'quarantined',
  'Heat legacy Demo slot containing a misplaced Free future trace',
  'persistence-v3-heat-mode-session-not-canonical',
);

const invalidTopRuntimeWithNestedFutureBatch = structuredClone(
  suspendedLegacyModeSessionEnvelope,
);
(
  invalidTopRuntimeWithNestedFutureBatch.payload.free as Record<string, unknown>
).runtimeVersion = 0;
const invalidTopRuntimeNestedSessions = (
  invalidTopRuntimeWithNestedFutureBatch.payload.common as Record<string, unknown>
).modeSessions as {
  free: {
    snapshot: {
      free: {
        heatCapacityFreeIdealDomain: {
          batch: Record<string, unknown>;
        };
      };
    } | null;
  };
};
if (invalidTopRuntimeNestedSessions.free.snapshot === null) {
  throw new Error('Expected a suspended nested future mode session.');
}
invalidTopRuntimeNestedSessions.free.snapshot.free
  .heatCapacityFreeIdealDomain.batch.version = 99;
requireLegacyFailure(
  invalidTopRuntimeWithNestedFutureBatch,
  'unsupported-future',
  'Heat legacy invalid top runtime with a nested future ideal batch',
  'legacy-heat-capacity-batch-version-future',
);

const downgradeLegacyModeSessionBatches = (
  envelope: WorkbenchExperimentFileEnvelopeV1,
) => {
  const common = envelope.payload.common as Record<string, unknown>;
  const modeSessions = common.modeSessions as Record<string, unknown>;
  const freeEntry = modeSessions.free as {
    snapshot: {
      free: {
        heatCapacityFreeBatch: Record<string, unknown>;
        heatCapacityFreeRealDomain: {
          batch: Record<string, unknown>;
        };
      };
    } | null;
  };
  if (freeEntry.snapshot === null) {
    throw new Error('Expected a suspended legacy Free mode session.');
  }
  for (const batch of [
    freeEntry.snapshot.free.heatCapacityFreeBatch,
    freeEntry.snapshot.free.heatCapacityFreeRealDomain.batch,
  ]) {
    batch.version = HEAT_CAPACITY_FREE_BATCH_LEGACY_VERSION;
    delete batch.nextTrialSequence;
    delete batch.scoringVersion;
  }
};
const suspendedLegacyModeSessionV1 = structuredClone(
  suspendedLegacyModeSessionEnvelope,
);
downgradeLegacyModeSessionBatches(suspendedLegacyModeSessionV1);
const migratedLegacyModeSessionV1 = requireLegacyMigration(
  suspendedLegacyModeSessionV1,
  'Heat legacy suspended mode session with v1 Free batches',
);
const migratedLegacyModeSessions =
  migratedLegacyModeSessionV1.fields.authoritative.modeSessions as {
    free: {
      snapshot: {
        free: {
          heatCapacityFreeBatch: {
            version: number;
            nextTrialSequence: number;
          };
          heatCapacityFreeRealDomain: {
            batch: {
              version: number;
              nextTrialSequence: number;
            };
          };
        };
      } | null;
    };
  };
assert.equal(
  migratedLegacyModeSessions.free.snapshot?.free
    .heatCapacityFreeBatch.version,
  HEAT_CAPACITY_FREE_BATCH_VERSION,
);
assert.equal(
  migratedLegacyModeSessions.free.snapshot?.free
    .heatCapacityFreeBatch.nextTrialSequence,
  1,
);
assert.equal(
  migratedLegacyModeSessions.free.snapshot?.free
    .heatCapacityFreeRealDomain.batch.version,
  HEAT_CAPACITY_FREE_BATCH_VERSION,
);
assert.equal(
  migratedLegacyModeSessions.free.snapshot?.free
    .heatCapacityFreeRealDomain.batch.nextTrialSequence,
  1,
);

const opaqueSuspendedLegacyModeSessionV1 = structuredClone(
  suspendedLegacyModeSessionV1,
);
const opaqueSuspendedLegacyModeSessions = (
  opaqueSuspendedLegacyModeSessionV1.payload.common as Record<string, unknown>
).modeSessions as {
  free: {
    snapshot: {
      free: {
        heatCapacityFreeBatch: Record<string, unknown>;
      };
    } | null;
  };
};
if (opaqueSuspendedLegacyModeSessions.free.snapshot === null) {
  throw new Error('Expected an opaque suspended legacy Free mode session.');
}
opaqueSuspendedLegacyModeSessions.free.snapshot.free
  .heatCapacityFreeBatch.opaqueAuthority = true;
requireLegacyFailure(
  opaqueSuspendedLegacyModeSessionV1,
  'quarantined',
  'Heat legacy suspended v1 batch with an opaque sibling',
);

/*
 * These two fixtures are deliberately named synthetic contract fixtures. The
 * repository has no captured public Standard/Ideal V1 byte fixture. Their
 * validators explicitly support payload version 1, and a null engine snapshot
 * is the minimal version-independent case, so these assertions cover that
 * documented decoder contract only; they are not evidence about a published
 * historical workspace.
 */
const syntheticContractStandardV1 = structuredClone(
  createWorkbenchFileEnvelopeWithCodec(createDefaultStandardFile(21), SAVED_AT),
);
syntheticContractStandardV1.payload.standardSchemaVersion = 1;
(
  syntheticContractStandardV1.payload.runtime as Record<string, unknown>
).engineSnapshot = null;
requireLegacyMigration(
  syntheticContractStandardV1,
  'validator-supported synthetic Standard V1 contract fixture',
);

const syntheticContractIdealV1 = structuredClone(
  createWorkbenchFileEnvelopeWithCodec(createDefaultIdealFile(22), SAVED_AT),
);
syntheticContractIdealV1.payload.idealGasSchemaVersion = 1;
(
  syntheticContractIdealV1.payload.runtime as Record<string, unknown>
).engineSnapshot = null;
requireLegacyMigration(
  syntheticContractIdealV1,
  'validator-supported synthetic Ideal V1 contract fixture',
);

const emptyPreBatchHeatEnvelope = structuredClone(
  createWorkbenchFileEnvelopeWithCodec(createDefaultHeatCapacityFile(31), SAVED_AT),
);
const emptyPreBatchFree = emptyPreBatchHeatEnvelope.payload.free as Record<string, unknown>;
const emptyPreBatchReal = emptyPreBatchFree.real as Record<string, unknown>;
const emptyPreBatchIdeal = emptyPreBatchFree.ideal as Record<string, unknown>;
delete emptyPreBatchReal.batch;
delete emptyPreBatchIdeal.batch;
emptyPreBatchReal.trials = [];
emptyPreBatchIdeal.trials = [];
emptyPreBatchFree.trials = [];

const emptyPreBatchFirst = requireLegacyMigration(
  emptyPreBatchHeatEnvelope,
  'empty pre-batch Heat envelope',
);
const emptyPreBatchSecond = requireLegacyMigration(
  structuredClone(emptyPreBatchHeatEnvelope),
  'second decode of empty pre-batch Heat envelope',
);
assert.deepEqual(
  createWorkbenchPersistenceV3SemanticProjection(emptyPreBatchSecond),
  createWorkbenchPersistenceV3SemanticProjection(emptyPreBatchFirst),
  'empty pre-batch migration must deterministically synthesize the same empty batch state',
);

/*
 * This is a shape-accurate top-level-only compatibility fixture, not a captured
 * public release byte fixture. It proves only the empty-authority migration
 * boundary: no domain, no trials, no trace records, and a monotonic high-water.
 */
const syntheticTopLevelOnlyHeatEnvelope = structuredClone(
  createWorkbenchFileEnvelopeWithCodec(
    createDefaultHeatCapacityFile(36),
    SAVED_AT,
  ),
);
const syntheticTopLevelOnlyFree =
  syntheticTopLevelOnlyHeatEnvelope.payload.free as Record<string, unknown>;
delete syntheticTopLevelOnlyFree.real;
delete syntheticTopLevelOnlyFree.ideal;
(
  syntheticTopLevelOnlyFree.traceStore as Record<string, unknown>
).nextTraceTrialIndex = 7;
const syntheticTopLevelOnlyProjection = requireLegacyMigration(
  syntheticTopLevelOnlyHeatEnvelope,
  'synthetic empty top-level-only Heat envelope',
);
const syntheticTopLevelOnlyAuthority =
  syntheticTopLevelOnlyProjection.fields.authoritative as {
    freeDomains: {
      real: {
        batch: { nextTrialSequence: number };
        traceStore: { nextTraceTrialIndex: number };
      };
    };
  };
assert.equal(
  syntheticTopLevelOnlyAuthority.freeDomains.real.traceStore
    .nextTraceTrialIndex,
  7,
);
assert.equal(
  syntheticTopLevelOnlyAuthority.freeDomains.real.batch.nextTrialSequence,
  1,
  'an empty batch must not claim a trace identity that has no provable batch relationship',
);

const syntheticTopLevelOnlyTraceV4 = structuredClone(
  syntheticTopLevelOnlyHeatEnvelope,
);
const syntheticTopLevelOnlyTraceV4Free =
  syntheticTopLevelOnlyTraceV4.payload.free as Record<string, unknown>;
syntheticTopLevelOnlyTraceV4Free.traceVersion = 4;
(
  syntheticTopLevelOnlyTraceV4Free.traceStore as Record<string, unknown>
).nextTraceTrialIndex = 11;
const syntheticTopLevelOnlyTraceV4Projection = requireLegacyMigration(
  syntheticTopLevelOnlyTraceV4,
  'synthetic empty top-level-only trace V4 Heat envelope',
);
const syntheticTopLevelOnlyTraceV4Authority =
  syntheticTopLevelOnlyTraceV4Projection.fields.authoritative as {
    freeDomains: {
      real: {
        traceStore: { nextTraceTrialIndex: number };
      };
    };
  };
assert.equal(
  syntheticTopLevelOnlyTraceV4Authority.freeDomains.real.traceStore
    .nextTraceTrialIndex,
  11,
  'empty trace V4 migration must preserve its monotonic high-water',
);
assert.equal(
  syntheticTopLevelOnlyTraceV4Free.traceVersion,
  4,
  'legacy dispatch must not mutate the caller-owned raw envelope',
);

const syntheticTopLevelOnlyTraceV5 = structuredClone(
  syntheticTopLevelOnlyHeatEnvelope,
);
const syntheticTopLevelOnlyTraceV5Free =
  syntheticTopLevelOnlyTraceV5.payload.free as Record<string, unknown>;
syntheticTopLevelOnlyTraceV5Free.traceVersion = 5;
const syntheticTopLevelOnlyTraceV5Store =
  syntheticTopLevelOnlyTraceV5Free.traceStore as Record<string, unknown>;
syntheticTopLevelOnlyTraceV5Store.nextTraceTrialIndex = 13;
delete syntheticTopLevelOnlyTraceV5Store.compaction;
const syntheticTopLevelOnlyTraceV5Projection = requireLegacyMigration(
  syntheticTopLevelOnlyTraceV5,
  'synthetic empty top-level-only trace V5 Heat envelope',
);
const syntheticTopLevelOnlyTraceV5Authority =
  syntheticTopLevelOnlyTraceV5Projection.fields.authoritative as {
    freeDomains: {
      real: {
        traceStore: {
          nextTraceTrialIndex: number;
          compaction?: { version: number };
        };
      };
    };
  };
assert.equal(
  syntheticTopLevelOnlyTraceV5Authority.freeDomains.real.traceStore
    .nextTraceTrialIndex,
  13,
  'trace V5 migration must preserve its monotonic high-water',
);
assert.equal(
  syntheticTopLevelOnlyTraceV5Authority.freeDomains.real.traceStore
    .compaction?.version,
  HEAT_CAPACITY_FREE_TRACE_COMPACTION_VERSION,
  'trace V5 migration should initialize the versioned V6 compaction summary',
);
assert.equal(
  Object.prototype.hasOwnProperty.call(
    syntheticTopLevelOnlyTraceV5Store,
    'compaction',
  ),
  false,
  'trace V5 migration must not mutate the caller-owned raw envelope',
);

/*
 * The Free field set below is derived from the writers at tags v4.1.6 and
 * v4.1.12. It is not a captured byte fixture. Both writers emitted trace V4,
 * advancedRiskAccepted, and an exact empty reference store before per-scheme
 * domains existed.
 */
const tagDerivedV416V4112TopLevelOnly = structuredClone(
  syntheticTopLevelOnlyHeatEnvelope,
);
const tagDerivedV416V4112Free =
  tagDerivedV416V4112TopLevelOnly.payload.free as Record<string, unknown>;
tagDerivedV416V4112Free.traceVersion = 4;
tagDerivedV416V4112Free.advancedRiskAccepted = false;
tagDerivedV416V4112Free.config = {
  version: 5,
  environment: {
    ambientPressureKPa: 101.3,
    ambientTemperatureK: 298.15,
  },
  physics: {
    gamma: 1.4,
    vesselVolumeL: 2,
    pumpAmountGainRatio: 0.015,
    pumpPressureLimitKPa: 108.3,
    pumpTemperatureGainK: 0.35,
    pumpStrokeDurationS: 0.08,
    recommendedPumpIntervalS: 0.1,
    stopcockFlowRate: 4,
    releaseResponseDelayS: 0.02,
    releaseMainDurationS: 0.18,
    releaseCoolingFactor: 1,
    thermal: {
      gasWallConductanceWPerK: 0.22,
      wallAmbientConductanceWPerK: 0.45,
      wallHeatCapacityJPerK: 45,
      minimumGasHeatCapacityJPerK: 0.1,
    },
    leakage: {
      enabled: false,
      ratePerS: 0.0005,
    },
  },
  sensor: {
    pressureMvPerKPa: 20,
    temperatureMvAtAmbient: 1499,
    temperatureMvPerK: 2,
    lagRate: 8,
    pumpLagRate: 36,
    noiseMv: 0,
    quantizationMv: 0.01,
    minSampleIntervalS: 0.08,
    maxSampleIntervalS: 0.12,
    fastProcessSampleStepS: 0.04,
    historyWindowS: 1.2,
  },
  record: {
    u0ZeroToleranceMv: 0.12,
    pressureStableSlopeMvPerS: 0.25,
    temperatureStableSlopeMvPerS: 0.12,
    temperatureAmbientToleranceMv: 0.35,
    minimumUsefulU1CorrectedMv: 90,
    overVentedMinimumU2CorrectedMv: 0.2,
    pressureWarningMv: 115,
    pressureDangerMv: 140,
  },
  scoring: {
    processScoringVersion: 'free-process-score-v1',
  },
};
tagDerivedV416V4112Free.references = {
  standard: null,
  operableBest: null,
};
const tagDerivedV416V4112ParameterDraft =
  tagDerivedV416V4112Free.parameterDraft as Record<string, unknown>;
delete tagDerivedV416V4112ParameterDraft.gasType;
tagDerivedV416V4112ParameterDraft.pressureMvPerKPa = 20;
tagDerivedV416V4112ParameterDraft.vesselVolumeL = 2;
tagDerivedV416V4112ParameterDraft.gamma = 1.4;
tagDerivedV416V4112Free.controls = {
  powerOn: false,
  pumpValveOpen: false,
  stopcockOpen: false,
  pumpBulbState: 'idle',
  stopcockFlowOpen: false,
};
for (const currentOnlyKey of [
  'preheatCompleted',
  'parameterScheme',
  'displayScheme',
  'gasType',
  'acknowledgements',
  'rollbackSnapshots',
]) {
  delete tagDerivedV416V4112Free[currentOnlyKey];
}
requireLegacyMigration(
  tagDerivedV416V4112TopLevelOnly,
  'tag-derived v4.1.6/v4.1.12 empty top-level-only Free envelope',
);

const emptyPreBatchTraceV4 = structuredClone(emptyPreBatchHeatEnvelope);
(
  emptyPreBatchTraceV4.payload.free as Record<string, unknown>
).traceVersion = 4;
requireLegacyMigration(
  emptyPreBatchTraceV4,
  'empty domain-present pre-batch trace V4 Heat envelope',
);

for (const {
  label,
  mutate,
  code,
} of [
  {
    label: 'future top-level-only Heat payload schema',
    mutate: (freeEnvelope: WorkbenchExperimentFileEnvelopeV1) => {
      freeEnvelope.payload.heatCapacitySchemaVersion = 99;
    },
    code: 'legacy-heat-capacity-schema-version-future',
  },
  {
    label: 'future top-level-only Free runtime',
    mutate: (freeEnvelope: WorkbenchExperimentFileEnvelopeV1) => {
      (
        freeEnvelope.payload.free as Record<string, unknown>
      ).runtimeVersion = HEAT_CAPACITY_FREE_RUNTIME_VERSION + 1;
    },
    code: 'legacy-heat-capacity-runtime-version-future',
  },
  {
    label: 'future top-level-only Free trace',
    mutate: (freeEnvelope: WorkbenchExperimentFileEnvelopeV1) => {
      (
        freeEnvelope.payload.free as Record<string, unknown>
      ).traceVersion = HEAT_CAPACITY_FREE_TRACE_VERSION + 1;
    },
    code: 'legacy-heat-capacity-trace-version-future',
  },
] as const) {
  const futureEnvelope = structuredClone(syntheticTopLevelOnlyHeatEnvelope);
  mutate(futureEnvelope);
  requireLegacyFailure(
    futureEnvelope,
    'unsupported-future',
    label,
    code,
  );
}

const unknownCalculationVersion = structuredClone(
  syntheticTopLevelOnlyHeatEnvelope,
);
(
  unknownCalculationVersion.payload.free as Record<string, unknown>
).calculationVersion = 'opaque-calculation-v99';
requireLegacyFailure(
  unknownCalculationVersion,
  'quarantined',
  'unknown top-level-only Free calculation version',
  'legacy-heat-capacity-calculation-version-invalid',
);

const topLevelOnlyOpaqueTraceStore = structuredClone(
  syntheticTopLevelOnlyHeatEnvelope,
);
(
  (
    topLevelOnlyOpaqueTraceStore.payload.free as Record<string, unknown>
  ).traceStore as Record<string, unknown>
).opaqueAuthority = {
  retain: true,
};
requireLegacyFailure(
  topLevelOnlyOpaqueTraceStore,
  'quarantined',
  'top-level-only Free trace store with an opaque own key',
  'legacy-unbatched-free-authority-requires-dedicated-migration',
);

const topLevelOnlyPoweredControls = structuredClone(
  syntheticTopLevelOnlyHeatEnvelope,
);
const topLevelOnlyPoweredControlsFree =
  topLevelOnlyPoweredControls.payload.free as Record<string, unknown>;
(
  topLevelOnlyPoweredControlsFree.controls as Record<string, unknown>
).powerOn = true;
requireLegacyFailure(
  topLevelOnlyPoweredControls,
  'quarantined',
  'top-level-only Free payload with powered controls',
  'legacy-unbatched-free-authority-requires-dedicated-migration',
);

const topLevelOnlyOpaqueFreeAuthority = structuredClone(
  syntheticTopLevelOnlyHeatEnvelope,
);
(
  topLevelOnlyOpaqueFreeAuthority.payload.free as Record<string, unknown>
).opaqueAuthority = {
  retain: true,
};
requireLegacyFailure(
  topLevelOnlyOpaqueFreeAuthority,
  'quarantined',
  'top-level-only Free payload with an unknown own key',
  'legacy-unbatched-free-authority-requires-dedicated-migration',
);

for (const {
  label,
  nestedKey,
} of [
  {
    label: 'controls',
    nestedKey: 'controls',
  },
  {
    label: 'runtime',
    nestedKey: 'runtime',
  },
  {
    label: 'calibration',
    nestedKey: 'calibration',
  },
  {
    label: 'UI replay',
    nestedKey: 'uiReplay',
  },
] as const) {
  const nestedOpaqueAuthority = structuredClone(
    syntheticTopLevelOnlyHeatEnvelope,
  );
  const nestedOpaqueFree =
    nestedOpaqueAuthority.payload.free as Record<string, unknown>;
  (
    nestedOpaqueFree[nestedKey] as Record<string, unknown>
  ).opaqueAuthority = {
    retain: true,
  };
  requireLegacyFailure(
    nestedOpaqueAuthority,
    'quarantined',
    `top-level-only Free ${label} with an unknown own key`,
    'legacy-unbatched-free-authority-requires-dedicated-migration',
  );
}

for (const nestedKey of ['recordConfig', 'acknowledgements'] as const) {
  const nestedOpaqueAuthority = structuredClone(
    syntheticTopLevelOnlyHeatEnvelope,
  );
  const nestedOpaqueFree =
    nestedOpaqueAuthority.payload.free as Record<string, unknown>;
  (
    nestedOpaqueFree[nestedKey] as Record<string, unknown>
  ).opaqueAuthority = {
    retain: true,
  };
  requireLegacyFailure(
    nestedOpaqueAuthority,
    'quarantined',
    `top-level-only Free ${nestedKey} with an unknown own key`,
    'legacy-unbatched-free-authority-requires-dedicated-migration',
  );
}

const futureTopLevelOnlyConfig = structuredClone(
  syntheticTopLevelOnlyHeatEnvelope,
);
(
  (
    futureTopLevelOnlyConfig.payload.free as Record<string, unknown>
  ).config as Record<string, unknown>
).version = 99;
requireLegacyFailure(
  futureTopLevelOnlyConfig,
  'unsupported-future',
  'top-level-only Free payload with a future config snapshot',
  'legacy-heat-capacity-config-version-future',
);

const futureTopLevelOnlyConfigWithUnknownOwnKey = structuredClone(
  syntheticTopLevelOnlyHeatEnvelope,
);
const futureTopLevelOnlyConfigRecord = (
  (
    futureTopLevelOnlyConfigWithUnknownOwnKey.payload.free as
      Record<string, unknown>
  ).config as Record<string, unknown>
);
futureTopLevelOnlyConfigRecord.version = 99;
futureTopLevelOnlyConfigRecord.futureOnly = {
  retain: true,
};
requireLegacyFailure(
  futureTopLevelOnlyConfigWithUnknownOwnKey,
  'unsupported-future',
  'top-level-only Free future config with an unknown own key',
  'legacy-heat-capacity-config-version-future',
);

const unknownTopLevelOnlyParameterDraftKey = structuredClone(
  syntheticTopLevelOnlyHeatEnvelope,
);
(
  (
    unknownTopLevelOnlyParameterDraftKey.payload.free as Record<string, unknown>
  ).parameterDraft as Record<string, unknown>
).version = 99;
requireLegacyFailure(
  unknownTopLevelOnlyParameterDraftKey,
  'quarantined',
  'top-level-only Free payload with a versioned unknown parameter draft shape',
  'legacy-heat-capacity-parameter-draft-invalid',
);

const invalidTopLevelOnlyParameterDraftValue = structuredClone(
  syntheticTopLevelOnlyHeatEnvelope,
);
(
  (
    invalidTopLevelOnlyParameterDraftValue.payload.free as Record<string, unknown>
  ).parameterDraft as Record<string, unknown>
).ambientPressureKPa = 'opaque';
requireLegacyFailure(
  invalidTopLevelOnlyParameterDraftValue,
  'quarantined',
  'top-level-only Free payload with an invalid parameter draft value',
  'legacy-heat-capacity-parameter-draft-invalid',
);

const opaqueTopLevelOnlyConfigEnvironment = structuredClone(
  syntheticTopLevelOnlyHeatEnvelope,
);
(
  (
    (
      opaqueTopLevelOnlyConfigEnvironment.payload.free as Record<string, unknown>
    ).config as Record<string, unknown>
  ).environment as Record<string, unknown>
).opaqueAuthority = {
  retain: true,
};
requireLegacyFailure(
  opaqueTopLevelOnlyConfigEnvironment,
  'quarantined',
  'top-level-only Free config environment with an unknown own key',
  'legacy-heat-capacity-config-snapshot-invalid',
);

const invalidTopLevelOnlyConfigEnvironmentValue = structuredClone(
  syntheticTopLevelOnlyHeatEnvelope,
);
(
  (
    (
      invalidTopLevelOnlyConfigEnvironmentValue.payload.free as Record<string, unknown>
    ).config as Record<string, unknown>
  ).environment as Record<string, unknown>
).ambientPressureKPa = 'opaque';
requireLegacyFailure(
  invalidTopLevelOnlyConfigEnvironmentValue,
  'quarantined',
  'top-level-only Free config environment with an invalid value',
  'legacy-heat-capacity-config-snapshot-invalid',
);

const opaqueTopLevelOnlyRecordedPressures = structuredClone(
  syntheticTopLevelOnlyHeatEnvelope,
);
(
  (
    (
      opaqueTopLevelOnlyRecordedPressures.payload.free as Record<string, unknown>
    ).uiReplay as Record<string, unknown>
  ).recordedPressures as Record<string, unknown>
).opaqueAuthority = {
  retain: true,
};
requireLegacyFailure(
  opaqueTopLevelOnlyRecordedPressures,
  'quarantined',
  'top-level-only Free recorded pressures with an unknown own key',
  'legacy-unbatched-free-authority-requires-dedicated-migration',
);

for (const {
  label,
  mutate,
} of [
  {
    label: 'unknown sensor own key',
    mutate: (sensor: Record<string, unknown>) => {
      sensor.opaqueAuthority = {
        retain: true,
      };
    },
  },
  {
    label: 'non-baseline pressure history',
    mutate: (sensor: Record<string, unknown>) => {
      (sensor.pressureHistory as unknown[]).push({
        atS: 1,
        valueMv: 0.5,
      });
    },
  },
  {
    label: 'advanced next sample time',
    mutate: (sensor: Record<string, unknown>) => {
      sensor.nextSampleAtS = 5;
    },
  },
] as const) {
  const sensorHistoryEnvelope = structuredClone(
    syntheticTopLevelOnlyHeatEnvelope,
  );
  const sensorHistoryFree =
    sensorHistoryEnvelope.payload.free as Record<string, unknown>;
  mutate(sensorHistoryFree.sensor as Record<string, unknown>);
  requireLegacyFailure(
    sensorHistoryEnvelope,
    'quarantined',
    `top-level-only Free payload with ${label}`,
    'legacy-unbatched-free-authority-requires-dedicated-migration',
  );
}

const topLevelOnlyAcceptedAdvancedRisk = structuredClone(
  tagDerivedV416V4112TopLevelOnly,
);
(
  topLevelOnlyAcceptedAdvancedRisk.payload.free as Record<string, unknown>
).advancedRiskAccepted = true;
requireLegacyFailure(
  topLevelOnlyAcceptedAdvancedRisk,
  'quarantined',
  'tag-derived top-level-only Free payload with accepted advanced risk',
  'legacy-unbatched-free-authority-requires-dedicated-migration',
);

const topLevelOnlyNonEmptyReferences = structuredClone(
  tagDerivedV416V4112TopLevelOnly,
);
(
  topLevelOnlyNonEmptyReferences.payload.free as Record<string, unknown>
).references = {
  standard: {
    opaqueReferenceAuthority: true,
  },
  operableBest: null,
};
requireLegacyFailure(
  topLevelOnlyNonEmptyReferences,
  'quarantined',
  'tag-derived top-level-only Free payload with reference authority',
  'legacy-unbatched-free-authority-requires-dedicated-migration',
);

const topLevelOnlyHiddenModeSession = structuredClone(
  syntheticTopLevelOnlyHeatEnvelope,
);
const topLevelOnlyHiddenModeSessionCommon =
  topLevelOnlyHiddenModeSession.payload.common as Record<string, unknown>;
const topLevelOnlyHiddenModeSessions =
  topLevelOnlyHiddenModeSessionCommon.modeSessions as Record<string, unknown>;
topLevelOnlyHiddenModeSessions.free = {
  status: 'suspended',
  resumeRunState: 'running',
  capturedAtMs: SAVED_AT,
  snapshot: {
    opaqueRunAuthority: true,
  },
  uiCheckpoint: null,
};
requireLegacyFailure(
  topLevelOnlyHiddenModeSession,
  'quarantined',
  'top-level-only Free payload with hidden mode-session authority',
  'legacy-unbatched-free-authority-requires-dedicated-migration',
);

const nonEmptyPreBatchTraceV4 = structuredClone(emptyPreBatchTraceV4);
const nonEmptyPreBatchTraceV4Free =
  nonEmptyPreBatchTraceV4.payload.free as Record<string, unknown>;
(
  nonEmptyPreBatchTraceV4Free.real as Record<string, unknown>
).trials = [{
  id: 'opaque-pre-batch-v4-trial',
  relationshipWasNeverPersisted: true,
}];
requireLegacyFailure(
  nonEmptyPreBatchTraceV4,
  'quarantined',
  'non-empty domain-present pre-batch trace V4 Heat envelope',
  'legacy-unbatched-free-authority-requires-dedicated-migration',
);

const topLevelOnlyUnbatchedHistory = structuredClone(
  syntheticTopLevelOnlyHeatEnvelope,
);
(
  topLevelOnlyUnbatchedHistory.payload.free as Record<string, unknown>
).trials = [{
  id: 'opaque-top-level-only-trial',
  relationshipWasNeverPersisted: true,
}];
const topLevelOnlyUnbatchedFailure =
  decodeLegacyWorkbenchFileEnvelopeToV3Projection(
    topLevelOnlyUnbatchedHistory,
  );
assert.equal(topLevelOnlyUnbatchedFailure.ok, false);
if (topLevelOnlyUnbatchedFailure.ok) {
  throw new Error(
    'Expected top-level-only unbatched history to be quarantined.',
  );
}
assert.equal(topLevelOnlyUnbatchedFailure.status, 'quarantined');
assert.ok(
  topLevelOnlyUnbatchedFailure.diagnostics.some((diagnostic) => (
    diagnostic.code ===
      'legacy-unbatched-free-authority-requires-dedicated-migration'
  )),
);
assert.deepEqual(
  topLevelOnlyUnbatchedFailure.raw,
  topLevelOnlyUnbatchedHistory,
);

const unbatchedHeatWithTrials = structuredClone(
  createWorkbenchFileEnvelopeWithCodec(createDefaultHeatCapacityFile(32), SAVED_AT),
);
const unbatchedFree = unbatchedHeatWithTrials.payload.free as Record<string, unknown>;
const unbatchedReal = unbatchedFree.real as Record<string, unknown>;
delete unbatchedReal.batch;
unbatchedReal.trials = [{
  id: 'opaque-unbatched-trial',
  legacyOnly: {
    relationshipWasNeverPersisted: true,
  },
}];
const unbatchedFailure =
  decodeLegacyWorkbenchFileEnvelopeToV3Projection(unbatchedHeatWithTrials);
assert.equal(unbatchedFailure.ok, false);
if (unbatchedFailure.ok) {
  throw new Error('Expected non-empty unbatched Heat trials to be quarantined.');
}
assert.equal(unbatchedFailure.status, 'quarantined');
assert.ok(
  unbatchedFailure.diagnostics.some((diagnostic) => (
    diagnostic.code ===
      'legacy-unbatched-free-authority-requires-dedicated-migration'
  )),
);
assert.deepEqual(
  unbatchedFailure.raw,
  unbatchedHeatWithTrials,
  'quarantine must preserve the complete legacy file envelope',
);

const unbatchedHeatWithTraceAuthority = structuredClone(
  createWorkbenchFileEnvelopeWithCodec(createDefaultHeatCapacityFile(35), SAVED_AT),
);
const unbatchedTraceFree =
  unbatchedHeatWithTraceAuthority.payload.free as Record<string, unknown>;
const unbatchedTraceReal =
  unbatchedTraceFree.real as Record<string, unknown>;
const activeLegacyTrace = createFreeTraceTrial(
  createDefaultFreeTraceStore(),
  createDefaultFreeConfigSnapshot(),
);
delete unbatchedTraceReal.batch;
unbatchedTraceReal.trials = [];
unbatchedTraceReal.traceStore = activeLegacyTrace.store;
unbatchedTraceFree.trials = [];
unbatchedTraceFree.traceStore = activeLegacyTrace.store;
const unbatchedTraceFailure =
  decodeLegacyWorkbenchFileEnvelopeToV3Projection(
    unbatchedHeatWithTraceAuthority,
  );
assert.equal(unbatchedTraceFailure.ok, false);
if (unbatchedTraceFailure.ok) {
  throw new Error('Expected unbatched trace authority to be quarantined.');
}
assert.equal(unbatchedTraceFailure.status, 'quarantined');
assert.deepEqual(
  unbatchedTraceFailure.raw,
  unbatchedHeatWithTraceAuthority,
  'unbatched trace quarantine must preserve the complete legacy envelope',
);

const futurePayloadEnvelope = structuredClone(
  createWorkbenchFileEnvelopeWithCodec(createDefaultStandardFile(33), SAVED_AT),
);
futurePayloadEnvelope.payload.standardSchemaVersion =
  (futurePayloadEnvelope.payload.standardSchemaVersion as number) + 1;
futurePayloadEnvelope.payload.futureOnly = {
  opaque: ['must', 'survive', 'unchanged'],
};
const futurePayload =
  decodeLegacyWorkbenchFileEnvelopeToV3Projection(futurePayloadEnvelope);
assert.equal(futurePayload.ok, false);
if (futurePayload.ok) {
  throw new Error('Expected a future legacy payload to remain unsupported.');
}
assert.equal(futurePayload.status, 'unsupported-future');
assert.deepEqual(
  futurePayload.raw,
  futurePayloadEnvelope,
  'unsupported future payloads must preserve the complete legacy file envelope',
);

const exactFile = createDefaultIdealFile(41);
const exactProjection = projectWorkbenchPersistenceV3File(exactFile, 1);
assert.equal(exactProjection.ok, true);
if (!exactProjection.ok) throw new Error(exactProjection.diagnostics[0]?.message);
const exactRecord = encodeWorkbenchPersistenceV3FileProjection(
  exactProjection.value,
  1,
);
assert.equal(exactRecord.ok, true);
if (!exactRecord.ok) throw new Error(exactRecord.diagnostics[0]?.message);
assert.equal(exactRecord.status, 'exact');

const migratedFile = createDefaultHeatCapacityPistonOscillationFile(42);
const migratedRecord = createWorkbenchFileEnvelopeWithCodec(
  migratedFile,
  SAVED_AT,
);

const workspaceFutureEnvelope = structuredClone(
  createWorkbenchFileEnvelopeWithCodec(createDefaultStandardFile(43), SAVED_AT),
);
workspaceFutureEnvelope.payload.standardSchemaVersion =
  (workspaceFutureEnvelope.payload.standardSchemaVersion as number) + 1;
workspaceFutureEnvelope.payload.futureWorkspaceFileData = {
  retain: true,
};

const workspaceQuarantinedEnvelope = structuredClone(
  createWorkbenchFileEnvelopeWithCodec(createDefaultHeatCapacityFile(44), SAVED_AT),
);
const workspaceQuarantinedFree =
  workspaceQuarantinedEnvelope.payload.free as Record<string, unknown>;
const workspaceQuarantinedReal =
  workspaceQuarantinedFree.real as Record<string, unknown>;
delete workspaceQuarantinedReal.batch;
workspaceQuarantinedReal.trials = [{
  id: 'workspace-unbatched-trial',
  opaque: true,
}];

const mixedWorkspace = {
  schemaFamily: WORKBENCH_PERSISTENCE_V3_SCHEMA_FAMILY,
  schemaVersion: WORKBENCH_PERSISTENCE_V3_SCHEMA_VERSION,
  capturedAtMs: SAVED_AT,
  manifest: {
    activeFileId: exactFile.id,
    selectedPanel: 'preview',
    fileOrder: [
      exactFile.id,
      migratedFile.id,
      workspaceFutureEnvelope.id,
      workspaceQuarantinedEnvelope.id,
    ],
  },
  records: [
    exactRecord.value,
    migratedRecord,
    workspaceFutureEnvelope,
    workspaceQuarantinedEnvelope,
  ],
};

const mixedDecoded =
  decodeWorkbenchPersistenceV3WorkspaceRecord(mixedWorkspace);
assert.equal(mixedDecoded.ok, true);
if (!mixedDecoded.ok) throw new Error(mixedDecoded.diagnostics[0]?.message);
assert.equal(mixedDecoded.status, 'migrated');
assert.deepEqual(
  mixedDecoded.value.entries.map((entry) => (
    entry.kind === 'decoded' ? entry.sourceStatus : entry.status
  )),
  ['exact', 'migrated', 'unsupported-future', 'quarantined'],
  'mixed-generation files must be classified independently',
);

const mixedRuntime =
  reprojectWorkbenchPersistenceV3Workspace(mixedDecoded.value);
assert.equal(mixedRuntime.ok, true);
if (!mixedRuntime.ok) throw new Error(mixedRuntime.diagnostics[0]?.message);
assert.deepEqual(
  mixedRuntime.value.files.map((file) => file.id),
  [exactFile.id, migratedFile.id],
  'preserved future/quarantined records must not suppress healthy files',
);
assert.equal(mixedRuntime.value.activeFileId, exactFile.id);

const mixedEncoded =
  encodeWorkbenchPersistenceV3WorkspaceProjection(mixedDecoded.value);
assert.equal(mixedEncoded.ok, true);
if (!mixedEncoded.ok) throw new Error(mixedEncoded.diagnostics[0]?.message);
assert.deepEqual(
  mixedEncoded.value.records[2],
  workspaceFutureEnvelope,
  'workspace encode must retain the complete unsupported-future raw record',
);
assert.deepEqual(
  mixedEncoded.value.records[3],
  workspaceQuarantinedEnvelope,
  'workspace encode must retain the complete quarantined raw record',
);

const mixedDecodedAgain =
  decodeWorkbenchPersistenceV3WorkspaceRecord(mixedEncoded.value);
assert.equal(mixedDecodedAgain.ok, true);
if (!mixedDecodedAgain.ok) {
  throw new Error(mixedDecodedAgain.diagnostics[0]?.message);
}
assert.equal(mixedDecodedAgain.value.entries[2]?.kind, 'preserved');
assert.equal(mixedDecodedAgain.value.entries[3]?.kind, 'preserved');
assert.deepEqual(
  mixedDecodedAgain.value.entries[2]?.kind === 'preserved'
    ? mixedDecodedAgain.value.entries[2].raw
    : null,
  workspaceFutureEnvelope,
);
assert.deepEqual(
  mixedDecodedAgain.value.entries[3]?.kind === 'preserved'
    ? mixedDecodedAgain.value.entries[3].raw
    : null,
  workspaceQuarantinedEnvelope,
);

console.log('workbenchPersistenceV3LegacyMigration tests passed');
