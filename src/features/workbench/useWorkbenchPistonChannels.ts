import { useMemo } from 'react';

import { createPistonOscillationLivePressureChannel } from "../pistonOscillation/pistonOscillationLivePressureChannel.ts";
import { resolvePistonOscillationFreeEffectiveConfig } from '../../domain/pistonOscillation/pistonOscillationFreeEffectiveConfig.ts';

export interface useWorkbenchPistonChannelsPorts {
  activeFile: import("./workbenchFileUnion.ts").WorkbenchFileState;
}

export const useWorkbenchPistonChannels = (ports: useWorkbenchPistonChannelsPorts) => {
  const { activeFile } = ports;
  const activePistonOscillationConfigGroup = activeFile.kind
    === 'heatCapacityPistonOscillation'
    && activeFile.pistonOscillationFreeSession.status === 'active'
    ? activeFile.pistonOscillationFreeSession.experimentGroup
    : null;

  const activePistonOscillationConfigDraft = activeFile.kind
    === 'heatCapacityPistonOscillation'
    && activeFile.pistonOscillationFreeSession.status === 'active'
    ? activeFile.pistonOscillationFreeSession.parameterDraft
    : null;

  const activePistonOscillationEffectiveConfig = useMemo(
    () => activePistonOscillationConfigGroup && activePistonOscillationConfigDraft
      ? resolvePistonOscillationFreeEffectiveConfig(
          activePistonOscillationConfigGroup,
          activePistonOscillationConfigDraft,
        )
      : null,
    [activePistonOscillationConfigDraft, activePistonOscillationConfigGroup],
  );

  const activePistonOscillationPhysicsConfig = useMemo(
    () => activePistonOscillationEffectiveConfig?.physicsConfig,
    [activePistonOscillationEffectiveConfig],
  );

  const activePistonOscillationThermalConfig = useMemo(
    () => activePistonOscillationEffectiveConfig?.thermalConfig,
    [activePistonOscillationEffectiveConfig],
  );

  const activePistonOscillationReleaseAsymmetryConfig = useMemo(
    () => activePistonOscillationEffectiveConfig?.releaseAsymmetryConfig,
    [activePistonOscillationEffectiveConfig],
  );

  const activePistonOscillationSensorConfig = useMemo(
    () => activePistonOscillationEffectiveConfig?.sensorConfig,
    [activePistonOscillationEffectiveConfig],
  );

  const activePistonOscillationParameterSignature = activePistonOscillationEffectiveConfig
    ? JSON.stringify(activePistonOscillationEffectiveConfig.parameters)
    : 'teaching-defaults';

  const pistonOscillationLivePressureChannel = useMemo(
    () => createPistonOscillationLivePressureChannel(
      activePistonOscillationSensorConfig,
      {
        exactObservation:
          activePistonOscillationEffectiveConfig?.exactSensorObservation,
      },
    ),
    [
      activeFile.id,
      activePistonOscillationEffectiveConfig?.exactSensorObservation,
      activePistonOscillationSensorConfig,
    ],
  );
  return { activePistonOscillationEffectiveConfig, activePistonOscillationPhysicsConfig, activePistonOscillationThermalConfig, activePistonOscillationReleaseAsymmetryConfig, activePistonOscillationParameterSignature, pistonOscillationLivePressureChannel };
};
