import {
  HARD_SPHERE_MAX_TEMPERATURE_HISTORY,
  validateHardSphereSimulationParams,
} from '../../../domain/hardSphere/hardSphereSimulationValidation.ts';
import {
  HEAT_CAPACITY_FREE_TRACE_VERSION,
} from '../../../domain/heatCapacity/heatCapacityFreeTraceModel.ts';
import {
  decodeExactHeatCapacityCommonRuntimeFields,
  decodeExactHeatCapacityGuideRuntimeFields,
  HEAT_CAPACITY_GUIDE_SESSION_KEYS,
  HEAT_CAPACITY_MODE_COMMON_RUNTIME_KEYS,
} from '../workbenchHeatCapacityModeSession.ts';
import {
  HEAT_CAPACITY_FREE_RUNTIME_VERSION,
  type WorkbenchHeatCapacityState,
} from '../workbenchState.ts';

interface HeatCapacityAuthorityValueDecodeSuccess {
  ok: true;
  value: {
    activeRuntime: Record<string, unknown>;
    guide: Record<string, unknown>;
  };
}

interface HeatCapacityAuthorityValueDecodeFailure {
  ok: false;
  fieldPath: string;
  reason: string;
}

export type HeatCapacityAuthorityValueDecodeResult =
  | HeatCapacityAuthorityValueDecodeSuccess
  | HeatCapacityAuthorityValueDecodeFailure;

const ACTIVE_RUNTIME_EXTRA_KEYS = [
  'params',
  'appliedParams',
  'finalChartData',
  'heatCapacityFreeRuntimeVersion',
  'heatCapacityFreeTraceVersion',
] as const;

const ALWAYS_EXTERNAL_COMMON_KEYS = new Set([
  'heatCapacityTeachingStatus',
  'hardSphereViewEnabled',
]);

const FREE_DOMAIN_COMMON_KEYS = new Set([
  'heatCapacityReleaseState',
  'theoreticalGamma',
]);

const SIMULATION_PARAM_REQUIRED_KEYS = [
  'L',
  'N',
  'r',
  'm',
  'k',
  'dt',
  'nu',
  'equilibriumTime',
  'statsDuration',
] as const;

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const hasExactOwnKeys = (
  value: Record<string, unknown>,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = [],
) => {
  const allowed = new Set([...requiredKeys, ...optionalKeys]);
  const ownKeys = Object.keys(value);
  return requiredKeys.every((key) => (
    Object.prototype.hasOwnProperty.call(value, key)
  )) &&
    ownKeys.every((key) => allowed.has(key));
};

const areCanonicalValuesEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((entry, index) => (
        areCanonicalValuesEqual(entry, right[index])
      ));
  }
  if (!isPlainRecord(left) || !isPlainRecord(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => (
      key === rightKeys[index] &&
      areCanonicalValuesEqual(left[key], right[key])
    ));
};

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const isSimulationParamsShape = (value: unknown) => (
  isPlainRecord(value) &&
  hasExactOwnKeys(
    value,
    SIMULATION_PARAM_REQUIRED_KEYS,
    ['targetTemperature'],
  ) &&
  SIMULATION_PARAM_REQUIRED_KEYS.every((key) => isFiniteNumber(value[key])) &&
  (
    value.targetTemperature === undefined ||
    isFiniteNumber(value.targetTemperature)
  )
);

const isHistogramBin = (value: unknown) => (
  isPlainRecord(value) &&
  hasExactOwnKeys(
    value,
    ['binStart', 'binEnd', 'count', 'probability'],
    ['theoretical'],
  ) &&
  isFiniteNumber(value.binStart) &&
  isFiniteNumber(value.binEnd) &&
  isFiniteNumber(value.count) &&
  isFiniteNumber(value.probability) &&
  (
    value.theoretical === undefined ||
    isFiniteNumber(value.theoretical)
  )
);

const isEnergyLogPoint = (value: unknown) => (
  isPlainRecord(value) &&
  hasExactOwnKeys(value, ['energy', 'logProb', 'theoreticalLog']) &&
  isFiniteNumber(value.energy) &&
  isFiniteNumber(value.logProb) &&
  isFiniteNumber(value.theoreticalLog)
);

const isTemperatureHistoryPoint = (value: unknown) => (
  isPlainRecord(value) &&
  hasExactOwnKeys(
    value,
    ['time', 'error', 'totalEnergy'],
    ['temperature'],
  ) &&
  isFiniteNumber(value.time) &&
  isFiniteNumber(value.error) &&
  isFiniteNumber(value.totalEnergy) &&
  (
    value.temperature === undefined ||
    isFiniteNumber(value.temperature)
  )
);

const isChartDataShape = (value: unknown) => (
  isPlainRecord(value) &&
  hasExactOwnKeys(
    value,
    ['speed', 'energy', 'energyLog', 'tempHistory'],
  ) &&
  Array.isArray(value.speed) &&
  value.speed.length <= 30 &&
  value.speed.every(isHistogramBin) &&
  Array.isArray(value.energy) &&
  value.energy.length <= 30 &&
  value.energy.every(isHistogramBin) &&
  Array.isArray(value.energyLog) &&
  value.energyLog.length <= 30 &&
  value.energyLog.every(isEnergyLogPoint) &&
  Array.isArray(value.tempHistory) &&
  value.tempHistory.length <= HARD_SPHERE_MAX_TEMPERATURE_HISTORY &&
  value.tempHistory.every(isTemperatureHistoryPoint)
);

const getExpectedActiveCommonKeys = (
  mode: WorkbenchHeatCapacityState['heatCapacityMode'],
) => HEAT_CAPACITY_MODE_COMMON_RUNTIME_KEYS.filter((key) => (
  !ALWAYS_EXTERNAL_COMMON_KEYS.has(key) &&
  !(mode === 'free' && FREE_DOMAIN_COMMON_KEYS.has(key))
));

const fail = (
  fieldPath: string,
  reason: string,
): HeatCapacityAuthorityValueDecodeFailure => ({
  ok: false,
  fieldPath,
  reason,
});

export const decodeHeatCapacityV3AuthorityValues = (
  activeRuntime: unknown,
  guide: unknown,
  mode: WorkbenchHeatCapacityState['heatCapacityMode'],
): HeatCapacityAuthorityValueDecodeResult => {
  if (!isPlainRecord(activeRuntime)) {
    return fail(
      'fields.authoritative.activeRuntime',
      'Heat-capacity active runtime authority must be a plain record.',
    );
  }
  if (!isPlainRecord(guide)) {
    return fail(
      'fields.authoritative.guide',
      'Heat-capacity Guide authority must be a plain record.',
    );
  }

  const commonKeys = getExpectedActiveCommonKeys(mode);
  const activeKeys = [...commonKeys, ...ACTIVE_RUNTIME_EXTRA_KEYS];
  const activeKeySet = new Set<string>(activeKeys);
  const unknownActiveKey = Object.keys(activeRuntime).find((key) => (
    !activeKeySet.has(key)
  ));
  if (unknownActiveKey !== undefined) {
    return fail(
      `fields.authoritative.activeRuntime.${unknownActiveKey}`,
      'Heat-capacity active runtime authority contains an unknown field.',
    );
  }
  const missingActiveKey = activeKeys.find((key) => (
    !Object.prototype.hasOwnProperty.call(activeRuntime, key)
  ));
  if (
    missingActiveKey !== undefined ||
    Object.keys(activeRuntime).length !== activeKeys.length
  ) {
    return fail(
      missingActiveKey === undefined
        ? 'fields.authoritative.activeRuntime'
        : `fields.authoritative.activeRuntime.${missingActiveKey}`,
      'Heat-capacity active runtime authority is missing a required field.',
    );
  }

  const commonRuntime = Object.fromEntries(
    commonKeys.map((key) => [key, activeRuntime[key]]),
  );
  const decodedCommon = decodeExactHeatCapacityCommonRuntimeFields(
    commonRuntime,
    commonKeys,
  );
  if (decodedCommon.ok === false) {
    return fail(
      decodedCommon.fieldPath === undefined
        ? 'fields.authoritative.activeRuntime'
        : `fields.authoritative.activeRuntime.${decodedCommon.fieldPath}`,
      decodedCommon.reason,
    );
  }

  if (!isSimulationParamsShape(activeRuntime.params)) {
    return fail(
      'fields.authoritative.activeRuntime.params',
      'Heat-capacity simulation parameter authority is invalid.',
    );
  }
  if (
    !isSimulationParamsShape(activeRuntime.appliedParams) ||
    !validateHardSphereSimulationParams(
      activeRuntime.appliedParams as WorkbenchHeatCapacityState['appliedParams'],
    ).valid
  ) {
    return fail(
      'fields.authoritative.activeRuntime.appliedParams',
      'Heat-capacity applied simulation parameter authority is invalid.',
    );
  }
  if (
    activeRuntime.finalChartData !== null &&
    !isChartDataShape(activeRuntime.finalChartData)
  ) {
    return fail(
      'fields.authoritative.activeRuntime.finalChartData',
      'Heat-capacity final chart authority is invalid.',
    );
  }
  if (
    activeRuntime.heatCapacityFreeRuntimeVersion !==
      HEAT_CAPACITY_FREE_RUNTIME_VERSION
  ) {
    return fail(
      'fields.authoritative.activeRuntime.heatCapacityFreeRuntimeVersion',
      'Heat-capacity Free runtime version is unsupported.',
    );
  }
  if (
    activeRuntime.heatCapacityFreeTraceVersion !==
      HEAT_CAPACITY_FREE_TRACE_VERSION
  ) {
    return fail(
      'fields.authoritative.activeRuntime.heatCapacityFreeTraceVersion',
      'Heat-capacity Free trace version is unsupported.',
    );
  }
  if (
    activeRuntime.pumpValveOpen !==
      (activeRuntime.pumpValveState === 'open')
  ) {
    return fail(
      'fields.authoritative.activeRuntime.pumpValveOpen',
      'Heat-capacity pump-valve authority is internally inconsistent.',
    );
  }
  if (
    (activeRuntime.gaugePressureMinKPa as number) >
      (activeRuntime.gaugePressureMaxKPa as number)
  ) {
    return fail(
      'fields.authoritative.activeRuntime.gaugePressureMinKPa',
      'Heat-capacity pressure-gauge bounds are internally inconsistent.',
    );
  }
  if (
    (activeRuntime.pressureWarningThresholdKPa as number) >
        (activeRuntime.pressureSafeThresholdKPa as number) ||
    (activeRuntime.pressureSafeThresholdKPa as number) >
        (activeRuntime.pressureSafetyThresholdKPa as number)
  ) {
    return fail(
      'fields.authoritative.activeRuntime.pressureWarningThresholdKPa',
      'Heat-capacity pressure thresholds are internally inconsistent.',
    );
  }

  const decodedGuide = decodeExactHeatCapacityGuideRuntimeFields(guide);
  if (decodedGuide.ok === false) {
    return fail(
      decodedGuide.fieldPath === undefined
        ? 'fields.authoritative.guide'
        : `fields.authoritative.guide.${decodedGuide.fieldPath}`,
      decodedGuide.reason,
    );
  }
  if (
    !areCanonicalValuesEqual(decodedGuide.value, guide) ||
    Object.keys(guide).length !== HEAT_CAPACITY_GUIDE_SESSION_KEYS.length
  ) {
    return fail(
      'fields.authoritative.guide',
      'Heat-capacity Guide authority is not canonical.',
    );
  }

  return {
    ok: true,
    value: {
      activeRuntime: {
        ...decodedCommon.value,
        params: activeRuntime.params,
        appliedParams: activeRuntime.appliedParams,
        finalChartData: activeRuntime.finalChartData,
        heatCapacityFreeRuntimeVersion:
          activeRuntime.heatCapacityFreeRuntimeVersion,
        heatCapacityFreeTraceVersion:
          activeRuntime.heatCapacityFreeTraceVersion,
      },
      guide: decodedGuide.value,
    },
  };
};
