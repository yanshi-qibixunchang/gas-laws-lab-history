import type { ExperimentParamKey } from '../../domain/idealGas/idealGasExperiment.ts';
import type { SimulationParams } from '../../shared/types.ts';

export type WorkbenchParameterFileKind = 'standard' | 'ideal';
export type WorkbenchParameterSurface = 'advanced' | 'dedicated' | 'internal';

export interface WorkbenchParameterDefinition {
  key: ExperimentParamKey;
  label: string;
  unit?: string;
  displayOrder: number;
  editable: boolean;
  surfaceByKind: Record<WorkbenchParameterFileKind, WorkbenchParameterSurface>;
  normalizeInput: (value: number) => number;
}

const preserveInput = (value: number) => value;

const parameterDefinitions = [
  {
    key: 'N',
    label: 'N',
    unit: 'particles',
    displayOrder: 10,
    editable: true,
    surfaceByKind: { standard: 'advanced', ideal: 'advanced' },
    normalizeInput: Math.round,
  },
  {
    key: 'L',
    label: 'L',
    displayOrder: 30,
    editable: true,
    surfaceByKind: { standard: 'advanced', ideal: 'advanced' },
    normalizeInput: preserveInput,
  },
  {
    key: 'r',
    label: 'r',
    displayOrder: 20,
    editable: true,
    surfaceByKind: { standard: 'advanced', ideal: 'advanced' },
    normalizeInput: preserveInput,
  },
  {
    key: 'm',
    label: 'm',
    displayOrder: 0,
    editable: false,
    surfaceByKind: { standard: 'internal', ideal: 'internal' },
    normalizeInput: preserveInput,
  },
  {
    key: 'k',
    label: 'k',
    displayOrder: 0,
    editable: false,
    surfaceByKind: { standard: 'internal', ideal: 'internal' },
    normalizeInput: preserveInput,
  },
  {
    key: 'dt',
    label: 'dt',
    displayOrder: 40,
    editable: true,
    surfaceByKind: { standard: 'advanced', ideal: 'advanced' },
    normalizeInput: preserveInput,
  },
  {
    key: 'nu',
    label: 'nu',
    displayOrder: 50,
    editable: true,
    surfaceByKind: { standard: 'advanced', ideal: 'advanced' },
    normalizeInput: preserveInput,
  },
  {
    key: 'targetTemperature',
    label: 'targetTemperature',
    unit: 'K*',
    displayOrder: 0,
    editable: true,
    surfaceByKind: { standard: 'internal', ideal: 'dedicated' },
    normalizeInput: preserveInput,
  },
  {
    key: 'equilibriumTime',
    label: 'equilibriumTime',
    unit: 's',
    displayOrder: 60,
    editable: true,
    surfaceByKind: { standard: 'advanced', ideal: 'advanced' },
    normalizeInput: preserveInput,
  },
  {
    key: 'statsDuration',
    label: 'statsDuration',
    unit: 's',
    displayOrder: 70,
    editable: true,
    surfaceByKind: { standard: 'advanced', ideal: 'advanced' },
    normalizeInput: preserveInput,
  },
] as const satisfies readonly WorkbenchParameterDefinition[];

type WorkbenchParameterRegistryEntry = (typeof parameterDefinitions)[number];
type WorkbenchAdvancedParameterRegistryEntry = Extract<
  WorkbenchParameterRegistryEntry,
  { readonly surfaceByKind: { readonly standard: 'advanced'; readonly ideal: 'advanced' } }
>;
export type WorkbenchAdvancedParameterKey = WorkbenchAdvancedParameterRegistryEntry['key'];
export type WorkbenchAdvancedParameterDefinition = WorkbenchParameterDefinition & {
  key: WorkbenchAdvancedParameterKey;
  surfaceByKind: Record<WorkbenchParameterFileKind, 'advanced'>;
};

export const WORKBENCH_TRACKED_PARAMETER_KEYS = parameterDefinitions.map(({ key }) => key);

const parameterDefinitionByKey = Object.fromEntries(
  parameterDefinitions.map((definition) => [definition.key, definition]),
) as Record<ExperimentParamKey, WorkbenchParameterDefinition>;

export const getWorkbenchParameterDefinition = (key: ExperimentParamKey) => parameterDefinitionByKey[key];

export const getWorkbenchAdvancedParameterDefinitions = (kind: WorkbenchParameterFileKind) => (
  parameterDefinitions
    .filter((definition) => definition.surfaceByKind[kind] === 'advanced')
    .sort((left, right) => left.displayOrder - right.displayOrder)
) as WorkbenchAdvancedParameterDefinition[];

export const assignWorkbenchParameterValue = (
  params: SimulationParams,
  key: ExperimentParamKey,
  value: number,
) => {
  params[key] = getWorkbenchParameterDefinition(key).normalizeInput(value);
};
