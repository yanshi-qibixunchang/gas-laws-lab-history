import type { SimulationParams } from '../../shared/types';
import {
  validateHardSphereSimulationParams,
} from '../../domain/hardSphere/hardSphereSimulationValidation.ts';
import {
  getWorkbenchAdvancedParameterDefinitions,
  type WorkbenchAdvancedParameterKey,
} from './workbenchParameterRegistry.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';

export interface WorkbenchParameterRow {
  key: WorkbenchAdvancedParameterKey;
  label: string;
  value: string;
  unit?: string;
  editable: boolean;
}

export interface WorkbenchValidationResult {
  valid: boolean;
  errors: string[];
}

const formatNumber = (value: number | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(value < 1 ? 3 : 2).replace(/0+$/, '').replace(/\.$/, '');
};

export const areWorkbenchParamsEqual = (a: SimulationParams, b: SimulationParams) => (
  a.N === b.N &&
  a.L === b.L &&
  a.r === b.r &&
  a.m === b.m &&
  a.k === b.k &&
  a.dt === b.dt &&
  a.nu === b.nu &&
  a.equilibriumTime === b.equilibriumTime &&
  a.statsDuration === b.statsDuration &&
  a.targetTemperature === b.targetTemperature
);

export const getWorkbenchParameterRows = (file: WorkbenchFileState): WorkbenchParameterRow[] => {
  if (
    file.kind === 'heatCapacity' ||
    file.kind === 'heatCapacityPistonOscillation'
  ) {
    return [];
  }
  return getWorkbenchAdvancedParameterDefinitions(file.kind).map((definition) => ({
    key: definition.key,
    label: definition.label,
    value: formatNumber(file.params[definition.key]),
    unit: definition.unit,
    editable: definition.editable,
  }));
};

export const validateWorkbenchParams = (params: SimulationParams): WorkbenchValidationResult => {
  return validateHardSphereSimulationParams(params);
};
