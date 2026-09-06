import { useLayoutEffect } from 'react';
import { persistWorkbenchSidebarRefreshState } from './workbenchSidebarRefreshState.ts';
export const useWorkbenchSidebarRefreshPersistence = (leftCollapsed: boolean, parametersCollapsed: boolean) => {
 useLayoutEffect(() => {
    persistWorkbenchSidebarRefreshState({
      schemaVersion: 1,
      leftCollapsed,
      parametersCollapsed,
    });
  }, [leftCollapsed, parametersCollapsed]);
};
