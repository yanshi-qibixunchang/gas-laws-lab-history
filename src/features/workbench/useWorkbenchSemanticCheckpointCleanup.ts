import { useEffect } from 'react';
export const useWorkbenchSemanticCheckpointCleanup = (clearHeatCapacitySemanticCheckpointTimers: () => void) => {
useEffect(() => () => {
    clearHeatCapacitySemanticCheckpointTimers();
  }, []);
};
