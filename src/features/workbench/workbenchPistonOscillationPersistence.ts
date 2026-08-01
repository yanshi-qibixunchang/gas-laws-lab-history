import {
  WORKBENCH_PISTON_OSCILLATION_CAMERA_PRESETS,
  WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION,
  clampWorkbenchLiveSplitRatio,
  createDefaultHeatCapacityPistonOscillationFile,
  type WorkbenchHeatCapacityPistonOscillationState,
} from './workbenchState.ts';
import type {
  WorkbenchExperimentFileEnvelopeV1,
} from './workbenchPersistenceSchema.ts';
import {
  isPersistenceFiniteNumber,
  isPersistenceRecord,
} from './workbenchPersistenceValue.ts';

export interface PistonOscillationPersistencePayloadV1 {
  experimentKind: 'heatCapacityPistonOscillation';
  pistonOscillationSchemaVersion: typeof WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION;
  preview: {
    cameraPreset: WorkbenchHeatCapacityPistonOscillationState['previewCameraPreset'];
  };
}

export interface PistonOscillationPayloadValidationResult {
  valid: boolean;
  errors: string[];
}

const isCameraPreset = (
  value: unknown,
): value is WorkbenchHeatCapacityPistonOscillationState['previewCameraPreset'] => (
  typeof value === 'string' &&
  WORKBENCH_PISTON_OSCILLATION_CAMERA_PRESETS.includes(
    value as WorkbenchHeatCapacityPistonOscillationState['previewCameraPreset'],
  )
);

const hasExactKeys = (
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
) => (
  Object.keys(value).length === expectedKeys.length &&
  expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
);

export const createPistonOscillationPersistencePayload = (
  file: WorkbenchHeatCapacityPistonOscillationState,
  savedAt: number,
): PistonOscillationPersistencePayloadV1 => {
  void savedAt;
  return {
    experimentKind: 'heatCapacityPistonOscillation',
    pistonOscillationSchemaVersion: WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION,
    preview: {
      cameraPreset: file.previewCameraPreset,
    },
  };
};

export const validatePistonOscillationPersistencePayload = (
  payload: unknown,
): PistonOscillationPayloadValidationResult => {
  const errors: string[] = [];
  if (!isPersistenceRecord(payload)) {
    return { valid: false, errors: ['payload must be an object'] };
  }
  if (!hasExactKeys(payload, [
    'experimentKind',
    'pistonOscillationSchemaVersion',
    'preview',
  ])) {
    errors.push('payload fields are invalid');
  }
  if (payload.experimentKind !== 'heatCapacityPistonOscillation') {
    errors.push('experimentKind must be heatCapacityPistonOscillation');
  }
  if (payload.pistonOscillationSchemaVersion !== WORKBENCH_PISTON_OSCILLATION_SCHEMA_VERSION) {
    errors.push('pistonOscillationSchemaVersion is unsupported');
  }
  const preview = isPersistenceRecord(payload.preview) ? payload.preview : null;
  if (
    !preview ||
    !hasExactKeys(preview, ['cameraPreset']) ||
    !isCameraPreset(preview.cameraPreset)
  ) {
    errors.push('preview.cameraPreset is invalid');
  }
  return { valid: errors.length === 0, errors };
};

export const normalizePistonOscillationRuntimeState = (
  value: unknown,
  index = 1,
): WorkbenchHeatCapacityPistonOscillationState | null => {
  if (
    !isPersistenceRecord(value) ||
    value.kind !== 'heatCapacityPistonOscillation' ||
    typeof value.id !== 'string' ||
    value.id.trim().length === 0 ||
    typeof value.name !== 'string' ||
    value.name.trim().length === 0
  ) return null;
  const fallback = createDefaultHeatCapacityPistonOscillationFile(index, {
    liveWorkspaceSplitRatio: isPersistenceFiniteNumber(value.liveWorkspaceSplitRatio)
      ? value.liveWorkspaceSplitRatio
      : undefined,
  });
  return {
    ...fallback,
    id: value.id,
    name: value.name,
    createdAt: isPersistenceFiniteNumber(value.createdAt) ? value.createdAt : fallback.createdAt,
    updatedAt: isPersistenceFiniteNumber(value.updatedAt) ? value.updatedAt : fallback.updatedAt,
    lastOpenedAt: isPersistenceFiniteNumber(value.lastOpenedAt)
      ? value.lastOpenedAt
      : isPersistenceFiniteNumber(value.updatedAt)
        ? value.updatedAt
        : fallback.lastOpenedAt,
    visiblePanels: ['preview', 'realtime'],
    liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio(
      isPersistenceFiniteNumber(value.liveWorkspaceSplitRatio)
        ? value.liveWorkspaceSplitRatio
        : fallback.liveWorkspaceSplitRatio,
    ),
    previewCameraPreset: isCameraPreset(value.previewCameraPreset)
      ? value.previewCameraPreset
      : fallback.previewCameraPreset,
  };
};

export const restorePistonOscillationFileFromPersistencePayload = (
  fileEnvelope: WorkbenchExperimentFileEnvelopeV1,
  payload: unknown,
  index = 1,
): WorkbenchHeatCapacityPistonOscillationState => {
  const layout = fileEnvelope.layout;
  const preview = isPersistenceRecord(payload) && isPersistenceRecord(payload.preview)
    ? payload.preview
    : null;
  const restored = normalizePistonOscillationRuntimeState({
    ...createDefaultHeatCapacityPistonOscillationFile(index),
    kind: 'heatCapacityPistonOscillation',
    id: fileEnvelope.id,
    name: fileEnvelope.name,
    createdAt: fileEnvelope.createdAt,
    updatedAt: fileEnvelope.updatedAt,
    lastOpenedAt: fileEnvelope.lastOpenedAt ?? fileEnvelope.updatedAt,
    visiblePanels: layout.visiblePanels,
    liveWorkspaceSplitRatio: layout.liveWorkspaceSplitRatio,
    previewCameraPreset: isCameraPreset(preview?.cameraPreset)
      ? preview.cameraPreset
      : 'overview',
  }, index);
  if (!restored) {
    throw new TypeError('Piston-oscillation file envelope is invalid.');
  }
  return restored;
};
