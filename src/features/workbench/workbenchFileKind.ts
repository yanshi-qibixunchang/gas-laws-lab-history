export const WORKBENCH_FILE_KINDS = [
  'standard',
  'ideal',
  'heatCapacity',
  'heatCapacityPistonOscillation',
] as const;

export type WorkbenchFileKind = (typeof WORKBENCH_FILE_KINDS)[number];

export const WORKBENCH_FILE_NAME_PREFIX_BY_KIND: Record<WorkbenchFileKind, string> = {
  standard: 'Standard Simulation',
  ideal: 'Ideal Gas Simulation',
  heatCapacity: 'Adiabatic Expansion',
  heatCapacityPistonOscillation: 'Piston Oscillation',
};

export const isWorkbenchFileKind = (value: unknown): value is WorkbenchFileKind => (
  typeof value === 'string' &&
  WORKBENCH_FILE_KINDS.includes(value as WorkbenchFileKind)
);

export const assertNeverWorkbenchFileKind = (value: never): never => {
  throw new Error(`Unsupported workbench file kind: ${String(value)}`);
};

export type WorkbenchRuntimeFamily = 'standard' | 'ideal' | 'heatCapacity' | 'none';

export const getWorkbenchRuntimeFamily = (
  kind: WorkbenchFileKind,
): WorkbenchRuntimeFamily => {
  switch (kind) {
    case 'standard':
      return 'standard';
    case 'ideal':
      return 'ideal';
    case 'heatCapacity':
      return 'heatCapacity';
    case 'heatCapacityPistonOscillation':
      return 'none';
    default:
      return assertNeverWorkbenchFileKind(kind);
  }
};
