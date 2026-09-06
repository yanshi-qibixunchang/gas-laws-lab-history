import { useEffect } from 'react';
import { connectWorkbenchTutorialOwnership, type WorkbenchTutorialOwnershipPorts } from './workbenchTutorialOwnership.ts';
export const useWorkbenchTutorialOwnership = (ports: WorkbenchTutorialOwnershipPorts) => {
  useEffect(() => connectWorkbenchTutorialOwnership(ports), [ports.initialTutorialEntryKind]);
};
