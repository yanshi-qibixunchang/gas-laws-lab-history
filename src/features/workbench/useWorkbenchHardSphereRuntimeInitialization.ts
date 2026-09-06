import { useEffect } from 'react';
/** This mount effect stays at the shell's original runtime-initialization position. */
export const useWorkbenchHardSphereRuntimeInitialization = (initializeExistingRuntimes: () => void) => {
  useEffect(() => { initializeExistingRuntimes(); }, []);
};
