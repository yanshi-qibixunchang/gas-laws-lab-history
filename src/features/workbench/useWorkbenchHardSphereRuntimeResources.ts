import { useRef } from 'react';
import type { StandardEngineRuntime } from './workbenchSimulationRuntimeTypes.ts';
export const useWorkbenchHardSphereRuntimeResources = () => {

  const standardRuntimeRef = useRef<Record<string, StandardEngineRuntime>>({});
  const idealRuntimeRef = useRef<Record<string, StandardEngineRuntime>>({});
  return { standardRuntimeRef, idealRuntimeRef };
};
