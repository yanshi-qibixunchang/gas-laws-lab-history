import { useEffect } from 'react';
import type { WorkbenchMutableRef as Ref } from './workbenchActionPorts.ts';
export const attachWorkbenchDesktopExitInputBlock = (window: Pick<Window, 'addEventListener' | 'removeEventListener'>, desktopExitInputBlockedRef: Ref<boolean>) => {
    const blockInputWhileExitIsPrepared = (event: Event) => {
      if (!desktopExitInputBlockedRef.current) return;
      if (event.cancelable) event.preventDefault();
      event.stopImmediatePropagation();
    };
    const blockedEventTypes = [
      'pointerdown',
      'pointermove',
      'pointerup',
      'pointercancel',
      'click',
      'dblclick',
      'wheel',
      'keydown',
      'keyup',
      'input',
      'change',
      'submit',
    ] as const;
    blockedEventTypes.forEach((eventType) => {
      window.addEventListener(eventType, blockInputWhileExitIsPrepared, true);
    });
    return () => {
      blockedEventTypes.forEach((eventType) => {
        window.removeEventListener(eventType, blockInputWhileExitIsPrepared, true);
      });
    };
  };
export const useWorkbenchDesktopExitInputBlock = (window: Pick<Window, 'addEventListener' | 'removeEventListener'>, desktopExitInputBlockedRef: Ref<boolean>) => {
 useEffect(() => attachWorkbenchDesktopExitInputBlock(window, desktopExitInputBlockedRef), []);
};
