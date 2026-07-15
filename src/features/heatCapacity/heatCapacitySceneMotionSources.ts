export const HEAT_CAPACITY_SCENE_MOTION_REASONS = [
  'camera',
  'orbit',
  'instrument',
  'pump',
  'scripted-zero',
] as const;

export type HeatCapacitySceneMotionReason = (
  typeof HEAT_CAPACITY_SCENE_MOTION_REASONS[number]
);

export type HeatCapacitySceneMotionSourceUpdate = {
  sources: Set<string>;
  active: boolean;
  changed: boolean;
};

export const updateHeatCapacitySceneMotionSources = (
  currentSources: ReadonlySet<string>,
  motionId: string,
  active: boolean,
): HeatCapacitySceneMotionSourceUpdate => {
  const normalizedMotionId = motionId.trim();
  if (!normalizedMotionId) {
    return {
      sources: new Set(currentSources),
      active: currentSources.size > 0,
      changed: false,
    };
  }

  const alreadyActive = currentSources.has(normalizedMotionId);
  if (alreadyActive === active) {
    return {
      sources: new Set(currentSources),
      active: currentSources.size > 0,
      changed: false,
    };
  }

  const sources = new Set(currentSources);
  if (active) sources.add(normalizedMotionId);
  else sources.delete(normalizedMotionId);
  return {
    sources,
    active: sources.size > 0,
    changed: true,
  };
};
