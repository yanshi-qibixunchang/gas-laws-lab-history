import { getFreeSensorDisplay } from '../../domain/heatCapacity/heatCapacityFreeSensorModel.ts';
import { getEffectiveHeatCapacityFreeSensorConfig } from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import {
  selectHeatCapacityDisplaySource,
  type HeatCapacityDisplaySource,
} from '../../domain/heatCapacity/heatCapacityDisplaySource.ts';
import { truncateHeatCapacitySignalMv } from '../../domain/heatCapacity/heatCapacitySignalDisplayModel.ts';
import { DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG } from './workbenchHeatCapacityFreeRuntimeConfig.ts';
import { isHeatCapacityPhysicalKernelMode } from './workbenchHeatCapacityInstrumentState.ts';
import type { WorkbenchHeatCapacityState } from './workbenchHeatCapacityStateTypes.ts';

export const selectActiveHeatCapacityWorkbenchDisplay = (
  file: WorkbenchHeatCapacityState,
): HeatCapacityDisplaySource => {
  const usesPhysicalKernel = isHeatCapacityPhysicalKernelMode(file.heatCapacityMode);
  const freeDisplay = getFreeSensorDisplay(
    file.heatCapacityFreeInstrumentState.sensor,
    file.heatCapacityFreeInstrumentState.calibration,
    getEffectiveHeatCapacityFreeSensorConfig(
      file.heatCapacityFreeInstrumentConfig.sensor,
      file.heatCapacityFreeInstrumentConfig.instrumentNoiseEnabled,
    ),
  );
  return selectHeatCapacityDisplaySource(
    file.heatCapacityMode,
    {
      source: 'teaching',
      pressureMv: Number.isFinite(file.pressureSignalMv)
        ? truncateHeatCapacitySignalMv(file.pressureSignalMv ?? 0)
        : truncateHeatCapacitySignalMv(file.pressureSignalMvDisplayed),
      temperatureMv: Number.isFinite(file.temperatureSignalMv)
        ? truncateHeatCapacitySignalMv(
            file.temperatureSignalMv ?? DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.temperatureMvAtAmbient,
          )
        : truncateHeatCapacitySignalMv(file.temperatureSignalTargetMv),
    },
    {
      source: 'free',
      pressureMv: usesPhysicalKernel
        ? truncateHeatCapacitySignalMv(freeDisplay.displayPressureMv)
        : Number.isFinite(file.pressureSignalMv)
        ? truncateHeatCapacitySignalMv(file.pressureSignalMv ?? freeDisplay.displayPressureMv)
        : truncateHeatCapacitySignalMv(freeDisplay.displayPressureMv),
      temperatureMv: usesPhysicalKernel
        ? truncateHeatCapacitySignalMv(freeDisplay.displayTemperatureMv)
        : Number.isFinite(file.temperatureSignalMv)
        ? truncateHeatCapacitySignalMv(file.temperatureSignalMv ?? freeDisplay.displayTemperatureMv)
        : truncateHeatCapacitySignalMv(freeDisplay.displayTemperatureMv),
    },
    {
      source: 'guide',
      pressureMv: Number.isFinite(file.pressureSignalMv)
        ? truncateHeatCapacitySignalMv(file.pressureSignalMv ?? 0)
        : truncateHeatCapacitySignalMv(file.pressureSignalMvDisplayed),
      temperatureMv: Number.isFinite(file.temperatureSignalMv)
        ? truncateHeatCapacitySignalMv(
            file.temperatureSignalMv ?? DEFAULT_HEAT_CAPACITY_FREE_SENSOR_CONFIG.temperatureMvAtAmbient,
          )
        : truncateHeatCapacitySignalMv(file.temperatureSignalTargetMv),
    },
  );
};
