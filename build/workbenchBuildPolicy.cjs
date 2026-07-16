const WORKBENCH_MAX_JAVASCRIPT_CHUNK_BYTES = 1_000_000;

const WORKBENCH_REQUIRED_CHUNK_NAMES = [
  'vendor',
  'react-renderer',
  'react-three',
  'heat-capacity-scene',
  'simulation-domain',
  'workbench-core',
  'audio',
];

const getWorkbenchChunkName = (id) => {
  const normalizedId = String(id).replace(/\\/g, '/');
  if (normalizedId.includes('/src/audio/')) {
    return 'audio';
  }
  if (normalizedId.includes('/node_modules/react-reconciler/')) {
    return 'react-renderer';
  }
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
  if (normalizedId.includes('/src/features/heatCapacity/')) {
    return 'heat-capacity-scene';
  }
  if (/\/src\/features\/workbench\/workbench[^/]*\.(?:ts|tsx)$/.test(normalizedId)) {
    return 'workbench-core';
  }
  if (normalizedId.includes('/src/domain/')) {
    return 'simulation-domain';
  }
  return null;
};

module.exports = {
  WORKBENCH_MAX_JAVASCRIPT_CHUNK_BYTES,
  WORKBENCH_REQUIRED_CHUNK_NAMES,
  getWorkbenchChunkName,
};
