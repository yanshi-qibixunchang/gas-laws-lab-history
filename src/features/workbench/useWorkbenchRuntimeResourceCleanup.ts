import { useEffect } from 'react';
export const useWorkbenchRuntimeResourceCleanup = (disposeHardSphereRuntimeTimers: () => void, disposeHeatCapacityRuntimeResources: () => void) => {
useEffect(() => () => {
    disposeHardSphereRuntimeTimers();
    disposeHeatCapacityRuntimeResources();
  }, []);
};
