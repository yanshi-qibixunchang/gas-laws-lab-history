import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';

export const WORKBENCH_WINDOW_CONTROL_COPY: Record<WorkbenchLanguagePreference, {
  controls: string;
  minimize: string;
  maximize: string;
  restore: string;
  close: string;
}> = {
  ['zh-CN']: {
    controls: '窗口控制',
    minimize: '最小化',
    maximize: '最大化',
    restore: '还原窗口',
    close: '关闭',
  },
  ['zh-TW']: {
    controls: '視窗控制',
    minimize: '最小化',
    maximize: '最大化',
    restore: '還原視窗',
    close: '關閉',
  },
  ['en']: {
    controls: 'Window controls',
    minimize: 'Minimize',
    maximize: 'Maximize',
    restore: 'Restore',
    close: 'Close',
  },
};

export const hasDesktopWindowControlBridge = () => (
  typeof window !== 'undefined'
  && Boolean(
    window.hardSphereLabWindow?.minimize
    && window.hardSphereLabWindow?.toggleMaximize
    && window.hardSphereLabWindow?.close,
  )
);

export interface WorkbenchWindowControlsProps {
  language: WorkbenchLanguagePreference;
  onClose?: () => void;
}

export const WorkbenchWindowControls = ({
  language,
  onClose,
}: WorkbenchWindowControlsProps) => {
  const [maximized, setMaximized] = useState(false);
  const copy = WORKBENCH_WINDOW_CONTROL_COPY[language];
  const available = hasDesktopWindowControlBridge();

  useEffect(() => {
    if (!available) return undefined;
    const desktopWindowBridge = window.hardSphereLabWindow;
    let mounted = true;
    void desktopWindowBridge?.getState?.()
      .then((state) => {
        if (mounted) setMaximized(Boolean(state?.maximized));
      })
      .catch(() => undefined);
    const unsubscribe = desktopWindowBridge?.onState?.((state) => {
      setMaximized(Boolean(state.maximized));
    });
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [available]);

  if (!available) return null;

  const minimize = () => {
    void window.hardSphereLabWindow?.minimize?.()
      .then((state) => setMaximized(Boolean(state.maximized)))
      .catch(() => undefined);
  };
  const toggleMaximize = () => {
    void window.hardSphereLabWindow?.toggleMaximize?.()
      .then((state) => setMaximized(Boolean(state.maximized)))
      .catch(() => undefined);
  };
  const close = () => {
    if (onClose) {
      onClose();
      return;
    }
    const desktopClose = window.hardSphereLabWindow?.close?.();
    if (!desktopClose) window.close();
  };

  return (
    <div className="studio-window-controls" aria-label={copy.controls}>
      <button
        type="button"
        className="studio-window-control-button"
        aria-label={copy.minimize}
        data-prompt-tooltip={copy.minimize}
        onClick={minimize}
      >
        <span
          className="studio-window-control-glyph studio-window-control-glyph-minimize"
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        className="studio-window-control-button"
        aria-label={maximized ? copy.restore : copy.maximize}
        data-prompt-tooltip={maximized ? copy.restore : copy.maximize}
        onClick={toggleMaximize}
      >
        <span
          className={`studio-window-control-glyph ${maximized
            ? 'studio-window-control-glyph-restore'
            : 'studio-window-control-glyph-maximize'}`}
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        className="studio-window-control-button studio-window-control-close"
        aria-label={copy.close}
        data-prompt-tooltip={copy.close}
        onClick={close}
      >
        <X size={15} strokeWidth={2.2} />
      </button>
    </div>
  );
};

export default WorkbenchWindowControls;
