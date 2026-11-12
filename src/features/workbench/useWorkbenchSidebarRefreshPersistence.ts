import { useLayoutEffect } from 'react';
import { persistWorkbenchSidebarRefreshState } from './workbenchSidebarRefreshState.ts';
export const useWorkbenchSidebarRefreshPersistence = (leftCollapsed: boolean, parametersCollapsed: boolean, enabled = true) => {
 useLayoutEffect(() => {
    if (!enabled) return;
    persistWorkbenchSidebarRefreshState({
      schemaVersion: 1,
      leftCollapsed,
      parametersCollapsed,
    });
  }, [leftCollapsed, parametersCollapsed, enabled]);
};
