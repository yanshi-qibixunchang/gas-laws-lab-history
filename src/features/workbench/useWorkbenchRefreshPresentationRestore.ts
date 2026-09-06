import { useLayoutEffect } from 'react';
import { scheduleWorkbenchRefreshPresentationRestore, type WorkbenchRefreshPresentationRestorePorts } from './workbenchRefreshPresentationRestore';
export const useWorkbenchRefreshPresentationRestore = (ports: WorkbenchRefreshPresentationRestorePorts) => {
  useLayoutEffect(() => scheduleWorkbenchRefreshPresentationRestore(ports), []);
};
