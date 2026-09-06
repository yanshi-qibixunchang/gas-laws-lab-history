import { useEffect } from 'react';
import type { WorkbenchMutableRef as Ref, WorkbenchStateSetter as Setter } from './workbenchActionPorts.ts';
export const useWorkbenchSamplingPresetDismiss = (samplingPresetMenuOpen: boolean, samplingPresetSelectRef: Ref<HTMLElement | null>, setSamplingPresetMenuOpen: Setter<boolean>) => {
 useEffect(() => {
    if (!samplingPresetMenuOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (samplingPresetSelectRef.current?.contains(event.target as Node)) return;
      setSamplingPresetMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [samplingPresetMenuOpen]);
};
