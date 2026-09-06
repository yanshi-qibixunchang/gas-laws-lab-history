import type { WorkbenchMutableRef as Ref } from './workbenchActionPorts.ts';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import type { PromptConfirmationRequest } from '../../components/prompts/PromptConfirmDialog.tsx';
import { WORKBENCH_USER_GUIDE_URLS } from './workbenchDesktopCapabilities.ts';
export interface WorkbenchDesktopNavigationPorts { window: Pick<Window, 'open' | 'close' | 'hardSphereLabWindow' | 'hardSphereLabUserGuide'>; guardWorkbenchTutorialAction: (action: 'new-window') => boolean; setOpenTopMenu: (value: null) => void; getFreshWorkbenchWindowUrl: () => string; tutorialActiveRef: Ref<boolean>; settingsLanguagePreference: WorkbenchLanguagePreference; requestPromptConfirmation: (request: PromptConfirmationRequest) => void; }
export const createWorkbenchDesktopNavigationActions = (ports: WorkbenchDesktopNavigationPorts) => {
 const { window, guardWorkbenchTutorialAction, setOpenTopMenu, getFreshWorkbenchWindowUrl, tutorialActiveRef, settingsLanguagePreference, requestPromptConfirmation } = ports;
 const openNewWorkbenchWindow = () => {
    if (!guardWorkbenchTutorialAction('new-window')) return;
    setOpenTopMenu(null);
    const desktopNewWindowRequest = window.hardSphereLabWindow?.newWindow?.();

    if (desktopNewWindowRequest) {
      void desktopNewWindowRequest.then((result) => {
        if (result?.status !== 'ok') {
          window.open(getFreshWorkbenchWindowUrl(), '_blank', 'noopener,noreferrer');
        }
      }).catch(() => {
        window.open(getFreshWorkbenchWindowUrl(), '_blank', 'noopener,noreferrer');
      });
      return;
    }

    window.open(getFreshWorkbenchWindowUrl(), '_blank', 'noopener,noreferrer');
  };
  const closeDesktopWindow = () => {
    const performClose = () => {
      const desktopClose = window.hardSphereLabWindow?.close?.();
      if (!desktopClose) window.close();
    };
    if (!tutorialActiveRef.current) {
      performClose();
      return;
    }
    const isEnglish = settingsLanguagePreference === 'en';
    const isTraditional = settingsLanguagePreference === 'zh-TW';
    requestPromptConfirmation({
      id: 'exit-unfinished-experiment-tutorial',
      tone: 'warning',
      eyebrow: isEnglish ? 'Learning flow active' : isTraditional ? '學習流程進行中' : '学习流程进行中',
      title: isEnglish ? 'Exit the app before finishing this mode?' : isTraditional ? '要在本模式完成前退出軟體嗎？' : '要在本模式完成前退出软件吗？',
      body: isEnglish
        ? 'This mode is not complete. The next launch will restart it from the first step.'
        : isTraditional
          ? '本模式尚未完成，下次進入將從本模式第一步重新開始。'
          : '本模式尚未完成，下次进入将从本模式第一步重新开始。',
      consequence: isEnglish
        ? 'Completed unlock milestones are retained.'
        : isTraditional
          ? '已完成的解鎖節點會保留。'
          : '已完成的解锁节点会保留。',
      cancelLabel: isEnglish ? 'Continue tutorial' : isTraditional ? '繼續教程' : '继续教程',
      confirmLabel: isEnglish ? 'Exit app' : isTraditional ? '退出軟體' : '退出软件',
      closeLabel: isEnglish ? 'Continue tutorial' : isTraditional ? '繼續教程' : '继续教程',
      onConfirm: performClose,
    });
  };
  const openUserGuide = () => {
    setOpenTopMenu(null);
    const desktopUserGuideRequest = window.hardSphereLabUserGuide?.openUserGuide?.(settingsLanguagePreference);

    if (desktopUserGuideRequest) {
      void desktopUserGuideRequest.catch(() => {
        window.open(WORKBENCH_USER_GUIDE_URLS[settingsLanguagePreference], '_blank', 'noopener,noreferrer');
      });
      return;
    }

    window.open(WORKBENCH_USER_GUIDE_URLS[settingsLanguagePreference], '_blank', 'noopener,noreferrer');
  };
 return { openNewWorkbenchWindow, closeDesktopWindow, openUserGuide };
};
