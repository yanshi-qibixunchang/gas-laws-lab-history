import { useRef, useState } from 'react';
import type { WorkbenchHeatCapacityRefreshSession } from './workbenchHeatCapacityRefreshSession.ts';
export const useWorkbenchDesktopExitState = () => {

  const [desktopExitQuiesced, setDesktopExitQuiesced] = useState(false);
  const [desktopExitInputBlocked, setDesktopExitInputBlocked] = useState(false);
  const desktopExitQuiescedRef = useRef(false);
  const desktopExitInputBlockedRef = useRef(false);
  const prepareDesktopExitQuiescenceRef = useRef<(blockInput?: boolean) => void>(() => undefined);
  const resumeDesktopExitQuiescenceRef = useRef<() => void>(() => undefined);
  const desktopExitAutoDemoClockRef = useRef<
    WorkbenchHeatCapacityRefreshSession['modeTransitionDemoClock']
  >(null);
  const desktopExitQuiescedAtMsRef = useRef<number | null>(null);
  return { desktopExitQuiesced, setDesktopExitQuiesced, desktopExitInputBlocked, setDesktopExitInputBlocked, desktopExitQuiescedRef, desktopExitInputBlockedRef, prepareDesktopExitQuiescenceRef, resumeDesktopExitQuiescenceRef, desktopExitAutoDemoClockRef, desktopExitQuiescedAtMsRef };
};
