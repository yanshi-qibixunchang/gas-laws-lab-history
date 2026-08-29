export const PISTON_OSCILLATION_VIRTUAL_HAND_MODEL_VERSION =
  'piston-oscillation-virtual-hand-v1' as const;

/**
 * Interaction calibration only. These values describe how the mouse gesture
 * represents a compliant pair of hands; they are not apparatus constants.
 */
export interface PistonOscillationVirtualHandConfig {
  modelVersion: typeof PISTON_OSCILLATION_VIRTUAL_HAND_MODEL_VERSION;
  referenceSceneHeightPx: number;
  normalDragReferencePx: number;
  limitDragReferencePx: number;
  normalTargetDisplacementMm: number;
  limitTargetDisplacementMm: number;
  asymptoticTargetDisplacementMm: number;
  asymptoticTailReferencePx: number;
  handStiffnessNPerM: number;
}

export const DEFAULT_PISTON_OSCILLATION_VIRTUAL_HAND_CONFIG:
PistonOscillationVirtualHandConfig = Object.freeze({
  modelVersion: PISTON_OSCILLATION_VIRTUAL_HAND_MODEL_VERSION,
  // Measured in the standard in-app preview. Runtime drag distances are
  // scaled by the current 3D scene height, so different window sizes retain
  // the same gesture proportions.
  referenceSceneHeightPx: 438,
  normalDragReferencePx: 200,
  limitDragReferencePx: 350,
  // Reviewed feel anchors: a normal 80 mm press reaches about 120 kPa at the
  // first target, while the second is close to the practical hand limit.
  normalTargetDisplacementMm: 16.5,
  limitTargetDisplacementMm: 23.5,
  asymptoticTargetDisplacementMm: 24.5,
  asymptoticTailReferencePx: 200,
  handStiffnessNPerM: 5_000,
});

const assertFinitePositive = (name: string, value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be finite and greater than zero.`);
  }
  return value;
};
export const normalizePistonOscillationVirtualHandConfig = (
  input: Partial<PistonOscillationVirtualHandConfig> = {},
): PistonOscillationVirtualHandConfig => {
  const config: PistonOscillationVirtualHandConfig = {
    modelVersion: PISTON_OSCILLATION_VIRTUAL_HAND_MODEL_VERSION,
    referenceSceneHeightPx: assertFinitePositive(
      'referenceSceneHeightPx',
      input.referenceSceneHeightPx
        ?? DEFAULT_PISTON_OSCILLATION_VIRTUAL_HAND_CONFIG.referenceSceneHeightPx,
    ),
    normalDragReferencePx: assertFinitePositive(
      'normalDragReferencePx',
      input.normalDragReferencePx
        ?? DEFAULT_PISTON_OSCILLATION_VIRTUAL_HAND_CONFIG.normalDragReferencePx,
    ),
    limitDragReferencePx: assertFinitePositive(
      'limitDragReferencePx',
      input.limitDragReferencePx
        ?? DEFAULT_PISTON_OSCILLATION_VIRTUAL_HAND_CONFIG.limitDragReferencePx,
    ),
    normalTargetDisplacementMm: assertFinitePositive(
      'normalTargetDisplacementMm',
      input.normalTargetDisplacementMm
        ?? DEFAULT_PISTON_OSCILLATION_VIRTUAL_HAND_CONFIG
          .normalTargetDisplacementMm,
    ),
    limitTargetDisplacementMm: assertFinitePositive(
      'limitTargetDisplacementMm',
      input.limitTargetDisplacementMm
        ?? DEFAULT_PISTON_OSCILLATION_VIRTUAL_HAND_CONFIG
          .limitTargetDisplacementMm,
    ),
    asymptoticTargetDisplacementMm: assertFinitePositive(
      'asymptoticTargetDisplacementMm',
      input.asymptoticTargetDisplacementMm
        ?? DEFAULT_PISTON_OSCILLATION_VIRTUAL_HAND_CONFIG
          .asymptoticTargetDisplacementMm,
    ),
    asymptoticTailReferencePx: assertFinitePositive(
      'asymptoticTailReferencePx',
      input.asymptoticTailReferencePx
        ?? DEFAULT_PISTON_OSCILLATION_VIRTUAL_HAND_CONFIG
          .asymptoticTailReferencePx,
    ),
    handStiffnessNPerM: assertFinitePositive(
      'handStiffnessNPerM',
      input.handStiffnessNPerM
        ?? DEFAULT_PISTON_OSCILLATION_VIRTUAL_HAND_CONFIG.handStiffnessNPerM,
    ),
  };
  if (config.limitDragReferencePx <= config.normalDragReferencePx) {
    throw new RangeError('limitDragReferencePx must exceed normalDragReferencePx.');
  }
  if (
    config.limitTargetDisplacementMm <= config.normalTargetDisplacementMm
    || config.asymptoticTargetDisplacementMm
      <= config.limitTargetDisplacementMm
  ) {
    throw new RangeError('Virtual-hand displacement anchors must increase.');
  }
  return config;
};

export const scalePistonOscillationVirtualHandDragToReferencePx = (
  dragDistancePx: number,
  sceneHeightPx: number,
  configInput: Partial<PistonOscillationVirtualHandConfig> = {},
) => {
  if (!Number.isFinite(dragDistancePx)) {
    throw new RangeError('dragDistancePx must be finite.');
  }
  const config = normalizePistonOscillationVirtualHandConfig(configInput);
  return dragDistancePx * config.referenceSceneHeightPx
    / assertFinitePositive('sceneHeightPx', sceneHeightPx);
};

const interpolateCubicHermite = (input: {
  progress: number;
  startValue: number;
  endValue: number;
  startSlopePerReferencePx: number;
  endSlopePerReferencePx: number;
  spanReferencePx: number;
}) => {
  const t = Math.min(1, Math.max(0, input.progress));
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * input.startValue
    + h10 * input.spanReferencePx * input.startSlopePerReferencePx
    + h01 * input.endValue
    + h11 * input.spanReferencePx * input.endSlopePerReferencePx;
};

/**
 * Maps the responsive mouse gesture to the virtual hands' preferred downward
 * position. The first section is linear, the middle section eases toward the
 * reviewed practical limit, and the final section approaches a finite value
 * without creating a visible hard wall.
 */
export const getPistonOscillationVirtualHandTargetDisplacementMm = (
  referenceDragDistancePx: number,
  configInput: Partial<PistonOscillationVirtualHandConfig> = {},
) => {
  if (!Number.isFinite(referenceDragDistancePx)) {
    throw new RangeError('referenceDragDistancePx must be finite.');
  }
  const config = normalizePistonOscillationVirtualHandConfig(configInput);
  const dragDistancePx = Math.max(0, referenceDragDistancePx);
  const normalSlope = config.normalTargetDisplacementMm
    / config.normalDragReferencePx;
  const limitSlope = (
    config.asymptoticTargetDisplacementMm
    - config.limitTargetDisplacementMm
  ) / config.asymptoticTailReferencePx;
  if (dragDistancePx <= config.normalDragReferencePx) {
    return normalSlope * dragDistancePx;
  }
  if (dragDistancePx <= config.limitDragReferencePx) {
    const spanReferencePx = config.limitDragReferencePx
      - config.normalDragReferencePx;
    return interpolateCubicHermite({
      progress: (dragDistancePx - config.normalDragReferencePx)
        / spanReferencePx,
      startValue: config.normalTargetDisplacementMm,
      endValue: config.limitTargetDisplacementMm,
      startSlopePerReferencePx: normalSlope,
      endSlopePerReferencePx: limitSlope,
      spanReferencePx,
    });
  }
  return config.limitTargetDisplacementMm
    + (
      config.asymptoticTargetDisplacementMm
      - config.limitTargetDisplacementMm
    ) * (
      1 - Math.exp(-(
        dragDistancePx - config.limitDragReferencePx
      ) / config.asymptoticTailReferencePx)
    );
};
