const WORKBENCH_MAX_JAVASCRIPT_CHUNK_BYTES = 1_000_000;

const WORKBENCH_REQUIRED_CHUNK_NAMES = [
  'vendor',
  'react-three',
  'heat-capacity-scene',
];

const getWorkbenchChunkName = (id) => {
  const normalizedId = String(id).replace(/\\/g, '/');
  if (
    normalizedId.includes('/node_modules/three/') ||
    normalizedId.includes('/node_modules/@react-three/') ||
    normalizedId.includes('/node_modules/three-stdlib/') ||
    normalizedId.includes('/node_modules/maath/') ||
    normalizedId.includes('/node_modules/troika-three-text/') ||
    normalizedId.includes('/node_modules/@use-gesture/')
  ) {
    return 'react-three';
  }
  if (
    normalizedId.includes('/node_modules/react-dom/') ||
    normalizedId.includes('/node_modules/react/') ||
    normalizedId.includes('/node_modules/scheduler/') ||
    normalizedId.includes('/node_modules/lucide-react/')
  ) {
    return 'vendor';
  }
  if (
    normalizedId.includes('/src/features/heatCapacity/HeatCapacityInstrumentScene.') ||
    normalizedId.includes('/src/features/heatCapacity/HeatCapacityUltraInstrumentModel.') ||
    normalizedId.includes('/src/features/heatCapacity/HeatCapacityHardSphereLayer.')
  ) {
    return 'heat-capacity-scene';
  }
  return null;
};

module.exports = {
  WORKBENCH_MAX_JAVASCRIPT_CHUNK_BYTES,
  WORKBENCH_REQUIRED_CHUNK_NAMES,
  getWorkbenchChunkName,
};
