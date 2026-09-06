import type React from 'react';

export type deriveWorkbenchHeatSceneReadingsResult = Pick<React.ComponentProps<typeof import('../heatCapacity/HeatCapacityInstrumentScene.tsx').default>, 'sceneFileId' | 'experimentMode' | 'powerOn' | 'stopcockAngleDeg' | 'pressureZeroAdjusted' | 'pressureZeroKnobAngle' | 'pressureZeroTimelineDriven' | 'pressureZeroTimelineMotionActive' | 'pressureZeroOffset' | 'pressureZeroDisplayText' | 'pressureSignalRawReadoutMv' | 'pressureSignalReadoutMv' | 'pressureGaugeDisplayValue' | 'gaugePressureMinKPa' | 'gaugePressureMaxKPa' | 'pressureSafetyThresholdKPa' | 'pressureOverLimit' | 'pressureZeroAdjustMode' | 'pressureKPa' | 'pressureDeltaKPa' | 'gasAmountRatio' | 'gasTemperatureK' | 'ambientTemperatureK' | 'pressureLimitKPa' | 'pumpValveOpen' | 'pumpValveState' | 'pumpBulbState' | 'pumpPulseId' | 'recordPulseId' | 'pumpFrequency' | 'pumpFrequencyStatus' | 'pumpHint' | 'vesselPressureReadoutKPa' | 'vesselTemperatureReadoutK' | 'phase' | 'temperatureSignalMv' | 'pressureSignalMv'>;

export interface deriveWorkbenchHeatSceneReadingsPorts {
  activeFile: import('./workbenchHeatCapacityStateTypes.ts').WorkbenchHeatCapacityState;
  heatCapacityAutoDemoZeroKnobMotion: import('../../domain/heatCapacity/heatCapacityAutoDemo.ts').HeatCapacityAutoDemoZeroKnobMotion;
  heatCapacityHardSphereGasAmountRatio: number;
  heatCapacityHardSphereGasTemperatureK: number;
  heatCapacityHardSphereAmbientTemperatureK: number;
  heatCapacityPumpPulseId: number;
  heatCapacityRecordPulseId: number;
  localizedHeatCapacityPumpHint: string;
  heatCapacityDisplayPhase: import('../../domain/heatCapacity/heatCapacityProcessTypes.ts').HeatCapacityRuntimePhase;
  activeHeatCapacityPreheatLocked: boolean;
  activeHeatCapacityDisplay: import('../../domain/heatCapacity/heatCapacityDisplaySource.ts').HeatCapacityDisplaySource;
}

export function deriveWorkbenchHeatSceneReadings({
  activeFile,
  heatCapacityAutoDemoZeroKnobMotion,
  heatCapacityHardSphereGasAmountRatio,
  heatCapacityHardSphereGasTemperatureK,
  heatCapacityHardSphereAmbientTemperatureK,
  heatCapacityPumpPulseId,
  heatCapacityRecordPulseId,
  localizedHeatCapacityPumpHint,
  heatCapacityDisplayPhase,
  activeHeatCapacityPreheatLocked,
  activeHeatCapacityDisplay,
}: deriveWorkbenchHeatSceneReadingsPorts): deriveWorkbenchHeatSceneReadingsResult {
  return {
    sceneFileId: activeFile.id,
    experimentMode: activeFile.heatCapacityMode,
    powerOn: activeFile.powerOn,
    stopcockAngleDeg: activeFile.stopcockAngleDeg,
    pressureZeroAdjusted: activeFile.pressureZeroAdjusted,
    pressureZeroKnobAngle: heatCapacityAutoDemoZeroKnobMotion.angleDeg,
    pressureZeroTimelineDriven: heatCapacityAutoDemoZeroKnobMotion.timelineDriven,
    pressureZeroTimelineMotionActive: heatCapacityAutoDemoZeroKnobMotion.timelineDriven &&
                    heatCapacityAutoDemoZeroKnobMotion.progress < 1,
    pressureZeroOffset: activeFile.pressureZeroOffset,
    pressureZeroDisplayText: activeFile.pressureZeroDisplayText,
    pressureSignalRawReadoutMv: activeFile.pressureSignalRawReadoutMv,
    pressureSignalReadoutMv: activeFile.pressureSignalReadoutMv,
    pressureGaugeDisplayValue: activeFile.pressureGaugeDisplayValue,
    gaugePressureMinKPa: activeFile.gaugePressureMinKPa,
    gaugePressureMaxKPa: activeFile.gaugePressureMaxKPa,
    pressureSafetyThresholdKPa: activeFile.pressureSafetyThresholdKPa,
    pressureOverLimit: activeFile.pressureOverLimit,
    pressureZeroAdjustMode: activeFile.pressureZeroAdjustMode,
    pressureKPa: activeFile.pressureKPa,
    pressureDeltaKPa: activeFile.pressureDeltaKPa,
    gasAmountRatio: heatCapacityHardSphereGasAmountRatio,
    gasTemperatureK: heatCapacityHardSphereGasTemperatureK,
    ambientTemperatureK: heatCapacityHardSphereAmbientTemperatureK,
    pressureLimitKPa: activeFile.pressureLimitKPa,
    pumpValveOpen: activeFile.pumpValveOpen,
    pumpValveState: activeFile.pumpValveState,
    pumpBulbState: activeFile.pumpBulbState,
    pumpPulseId: heatCapacityPumpPulseId,
    recordPulseId: heatCapacityRecordPulseId,
    pumpFrequency: activeFile.pumpFrequency,
    pumpFrequencyStatus: activeFile.pumpFrequencyStatus,
    pumpHint: localizedHeatCapacityPumpHint,
    vesselPressureReadoutKPa: activeFile.vesselPressureReadoutKPa,
    vesselTemperatureReadoutK: activeFile.vesselTemperatureReadoutK,
    phase: heatCapacityDisplayPhase,
    temperatureSignalMv: activeFile.powerOn && !activeHeatCapacityPreheatLocked ? activeHeatCapacityDisplay.temperatureMv : null,
    pressureSignalMv: activeFile.powerOn && !activeHeatCapacityPreheatLocked ? activeHeatCapacityDisplay.pressureMv : null,
  };
}
