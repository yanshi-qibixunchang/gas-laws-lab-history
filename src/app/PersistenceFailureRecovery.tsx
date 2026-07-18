import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { WorkbenchLanguagePreference } from '../features/workbench/workbenchGeneralSettings.ts';
import {
  isWorkbenchUpdateDownloadFailure,
  mergeWorkbenchUpdateState,
  type WorkbenchUpdateState,
} from '../features/workbench/workbenchDesktopUpdater.ts';
import { getWorkbenchAppBrandName } from '../features/workbench/workbenchBrand.ts';

interface PersistenceFailureRecoveryProps {
  errorMessage: string;
  language: WorkbenchLanguagePreference;
  retrying: boolean;
  onRetry: () => void;
}

const RECOVERY_COPY = {
  'zh-CN': {
    title: '工作区持久化初始化失败',
    protection: '为保护最后一次成功保存的数据，工作区已保持只读关闭状态。现有资料没有被清除。',
    retry: '重试保存初始化',
    retrying: '正在重试…',
    updateTitle: '获取修复更新',
    updateBody: '你可以直接在此检查并安装修复版本；如果自动检查失败，也可以打开受信任的最新发布页手动覆盖安装。',
    check: '检查更新',
    checking: '正在检查…',
    download: '下载更新',
    downloading: '正在下载…',
    install: '重启并安装',
    installing: '正在重启…',
    manual: '打开最新发布页',
    idle: '尚未检查更新。',
    available: (version: string) => `发现版本 ${version}。`,
    current: '当前已是最新版本。',
    progress: (percent: number | null) => (
      percent === null ? '正在下载更新…' : `正在下载更新… ${Math.round(percent)}%`
    ),
    downloaded: '修复更新已下载，可以安全重启并安装。',
    unsupported: '当前环境不支持桌面自动更新。',
    error: '自动更新暂时不可用。你仍可打开最新发布页手动覆盖安装；请勿卸载或清除用户资料。',
    manualError: '无法打开最新发布页，请稍后重试。',
  },
  'zh-TW': {
    title: '工作區持久化初始化失敗',
    protection: '為保護最後一次成功儲存的資料，工作區已保持唯讀關閉狀態。現有資料沒有被清除。',
    retry: '重試儲存初始化',
    retrying: '正在重試…',
    updateTitle: '取得修復更新',
    updateBody: '你可以直接在此檢查並安裝修復版本；如果自動檢查失敗，也可以開啟受信任的最新發佈頁手動覆蓋安裝。',
    check: '檢查更新',
    checking: '正在檢查…',
    download: '下載更新',
    downloading: '正在下載…',
    install: '重新啟動並安裝',
    installing: '正在重新啟動…',
    manual: '開啟最新發佈頁',
    idle: '尚未檢查更新。',
    available: (version: string) => `發現版本 ${version}。`,
    current: '目前已是最新版本。',
    progress: (percent: number | null) => (
      percent === null ? '正在下載更新…' : `正在下載更新… ${Math.round(percent)}%`
    ),
    downloaded: '修復更新已下載，可以安全重新啟動並安裝。',
    unsupported: '目前環境不支援桌面自動更新。',
    error: '自動更新暫時無法使用。你仍可開啟最新發佈頁手動覆蓋安裝；請勿解除安裝或清除使用者資料。',
    manualError: '無法開啟最新發佈頁，請稍後重試。',
  },
  en: {
    title: 'Workspace persistence initialization failed',
    protection: 'The workspace remains closed and read-only to protect the last successful save. Existing data has not been cleared.',
    retry: 'Retry persistence initialization',
    retrying: 'Retrying…',
    updateTitle: 'Get the recovery update',
    updateBody: 'Check for and install a recovery update here. If the automatic check fails, open the trusted latest-release page and install over the existing app.',
    check: 'Check for updates',
    checking: 'Checking…',
    download: 'Download update',
    downloading: 'Downloading…',
    install: 'Restart and install',
    installing: 'Restarting…',
    manual: 'Open latest release',
    idle: 'Updates have not been checked.',
    available: (version: string) => `Version ${version} is available.`,
    current: 'This is the latest version.',
    progress: (percent: number | null) => (
      percent === null ? 'Downloading update…' : `Downloading update… ${Math.round(percent)}%`
    ),
    downloaded: 'The recovery update is downloaded and ready to install safely.',
    unsupported: 'Desktop automatic updates are unavailable in this environment.',
    error: 'Automatic update is temporarily unavailable. You can still install over the existing app from the latest-release page. Do not uninstall or clear user data.',
    manualError: 'The latest-release page could not be opened. Please try again.',
  },
} as const;

const RECOVERY_WINDOW_CONTROL_COPY: Record<WorkbenchLanguagePreference, {
  controls: string;
  minimize: string;
  maximize: string;
  restore: string;
  close: string;
}> = {
  'zh-CN': {
    controls: '窗口控制',
    minimize: '最小化',
    maximize: '最大化',
    restore: '还原窗口',
    close: '关闭',
  },
  'zh-TW': {
    controls: '視窗控制',
    minimize: '最小化',
    maximize: '最大化',
    restore: '還原視窗',
    close: '關閉',
  },
  en: {
    controls: 'Window controls',
    minimize: 'Minimize',
    maximize: 'Maximize',
    restore: 'Restore',
    close: 'Close',
  },
};

const getUpdateStatusText = (
  state: WorkbenchUpdateState,
  copy: typeof RECOVERY_COPY[WorkbenchLanguagePreference],
) => {
  if (state.status === 'checking') return copy.checking;
  if (state.status === 'available') return copy.available(state.latestVersion || '--');
  if (state.status === 'not-available') return copy.current;
  if (state.status === 'downloading' || state.status === 'retrying') {
    return copy.progress(state.percent ?? null);
  }
  if (state.status === 'downloaded' || state.status === 'installing') return copy.downloaded;
  if (state.status === 'unsupported') return copy.unsupported;
  if (state.status === 'error') return state.message?.trim() || copy.error;
  return copy.idle;
};

export const PersistenceFailureRecovery = ({
  errorMessage,
  language,
  retrying,
  onRetry,
}: PersistenceFailureRecoveryProps) => {
  const copy = RECOVERY_COPY[language];
  const windowControlCopy = RECOVERY_WINDOW_CONTROL_COPY[language];
  const brandName = getWorkbenchAppBrandName(language);
  const updater = window.hardSphereLabUpdater;
  const desktopWindowBridge = window.hardSphereLabWindow;
  const desktopWindowControlsAvailable = Boolean(
    desktopWindowBridge?.minimize &&
    desktopWindowBridge?.toggleMaximize &&
    desktopWindowBridge?.close,
  );
  const [updateState, setUpdateState] = useState<WorkbenchUpdateState>(() => ({
    status: updater ? 'idle' : 'unsupported',
    currentVersion: __APP_VERSION__,
    message: '',
  }));
  const [manualOpenError, setManualOpenError] = useState(false);
  const [desktopWindowMaximized, setDesktopWindowMaximized] = useState(false);

  useEffect(() => {
    const unsubscribeStatus = updater?.onStatus?.((nextState) => {
      setUpdateState((currentState) => mergeWorkbenchUpdateState(nextState, currentState));
    });
    const desktopWindowBridge = window.hardSphereLabWindow;
    const unsubscribePrepareExit = desktopWindowBridge?.onPrepareExit?.((request) => {
      void desktopWindowBridge.reportPersistenceResult({
        requestId: request.requestId,
        saved: true,
        message: 'Read-only persistence recovery page has no unsaved workspace changes.',
      });
    });
    return () => {
      unsubscribeStatus?.();
      unsubscribePrepareExit?.();
    };
  }, [updater]);

  useEffect(() => {
    if (!desktopWindowControlsAvailable) return undefined;
    let mounted = true;

    void desktopWindowBridge?.getState?.()
      .then((state) => {
        if (mounted) setDesktopWindowMaximized(Boolean(state?.maximized));
      })
      .catch(() => undefined);

    const unsubscribe = desktopWindowBridge?.onState?.((state) => {
      setDesktopWindowMaximized(Boolean(state.maximized));
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [desktopWindowBridge, desktopWindowControlsAvailable]);

  const applyUpdateRequest = (
    request: Promise<WorkbenchUpdateState> | undefined,
    errorStage: WorkbenchUpdateState['errorStage'] = null,
  ) => {
    if (!request) return;
    void request
      .then((nextState) => {
        setUpdateState((currentState) => mergeWorkbenchUpdateState(nextState, currentState));
      })
      .catch((error) => {
        setUpdateState((currentState) => ({
          ...currentState,
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
          errorStage,
        }));
      });
  };

  const runPrimaryUpdateAction = () => {
    if (!updater) return;
    if (
      updateState.status === 'available'
      || isWorkbenchUpdateDownloadFailure(updateState)
    ) {
      applyUpdateRequest(updater.downloadUpdate(), 'download');
      return;
    }
    if (updateState.status === 'downloaded') {
      applyUpdateRequest(updater.quitAndInstall());
      return;
    }
    applyUpdateRequest(updater.checkForUpdates(), 'check');
  };

  const openManualDownload = () => {
    if (!updater) return;
    setManualOpenError(false);
    void updater.openManualDownload()
      .then((result) => {
        if (result.status === 'error') setManualOpenError(true);
      })
      .catch(() => setManualOpenError(true));
  };

  const updateBusy = ['checking', 'downloading', 'retrying', 'installing'].includes(updateState.status);
  const primaryUpdateLabel = updateState.status === 'available'
    || isWorkbenchUpdateDownloadFailure(updateState)
    ? copy.download
    : updateState.status === 'downloaded'
      ? copy.install
      : updateState.status === 'checking'
        ? copy.checking
        : updateState.status === 'downloading' || updateState.status === 'retrying'
          ? copy.downloading
          : updateState.status === 'installing'
            ? copy.installing
          : copy.check;

  const minimizeDesktopWindow = () => {
    void desktopWindowBridge?.minimize?.()
      .then((state) => setDesktopWindowMaximized(Boolean(state?.maximized)))
      .catch(() => undefined);
  };

  const toggleDesktopWindowMaximize = () => {
    void desktopWindowBridge?.toggleMaximize?.()
      .then((state) => setDesktopWindowMaximized(Boolean(state?.maximized)))
      .catch(() => undefined);
  };

  const closeDesktopWindow = () => {
    void desktopWindowBridge?.close?.();
  };

  return (
    <div
      className="studio-workbench"
      style={{
        display: 'flex',
        height: '100vh',
        flexDirection: 'column',
      }}
    >
      <header className="studio-menu" style={{ height: 36, flex: '0 0 36px' }}>
        <div className="studio-titlebar-brand" aria-label={brandName}>
          <span className="studio-brand-mark" aria-hidden="true">
            <img src="favicon.png" alt="" />
          </span>
          <span>{brandName}</span>
        </div>
        <div className="studio-titlebar-drag-fill" aria-hidden="true" />
        {desktopWindowControlsAvailable ? (
          <div className="studio-window-controls" aria-label={windowControlCopy.controls}>
            <button
              type="button"
              className="studio-window-control-button"
              aria-label={windowControlCopy.minimize}
              title={windowControlCopy.minimize}
              onClick={minimizeDesktopWindow}
            >
              <span className="studio-window-control-glyph studio-window-control-glyph-minimize" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="studio-window-control-button"
              aria-label={desktopWindowMaximized ? windowControlCopy.restore : windowControlCopy.maximize}
              title={desktopWindowMaximized ? windowControlCopy.restore : windowControlCopy.maximize}
              onClick={toggleDesktopWindowMaximize}
            >
              <span
                className={`studio-window-control-glyph ${
                  desktopWindowMaximized ? 'studio-window-control-glyph-restore' : 'studio-window-control-glyph-maximize'
                }`}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              className="studio-window-control-button studio-window-control-close"
              aria-label={windowControlCopy.close}
              title={windowControlCopy.close}
              onClick={closeDesktopWindow}
            >
              <X size={15} strokeWidth={2.2} />
            </button>
          </div>
        ) : null}
      </header>

      <main
        role="alert"
        style={{
          minHeight: 0,
          flex: '1 1 auto',
          boxSizing: 'border-box',
          overflowY: 'auto',
          padding: 'clamp(24px, 6vw, 72px)',
          color: '#fff4e5',
          background: '#11161b',
        }}
      >
        <section style={{ width: 'min(760px, 100%)' }}>
          <h1 style={{ margin: '0 0 16px', fontSize: 24 }}>{copy.title}</h1>
          <p style={{ lineHeight: 1.7 }}>{copy.protection}</p>
          <pre
            style={{
              padding: 14,
              border: '1px solid rgba(255, 188, 112, 0.34)',
              borderRadius: 8,
              color: '#ffd8a8',
              background: '#171d23',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
            }}
          >
            {errorMessage}
          </pre>
          <button type="button" disabled={retrying} onClick={onRetry}>
            {retrying ? copy.retrying : copy.retry}
          </button>
        </section>

        <section
          aria-labelledby="persistence-recovery-update-title"
          style={{
            width: 'min(760px, 100%)',
            marginTop: 32,
            paddingTop: 24,
            borderTop: '1px solid rgba(215, 224, 232, 0.22)',
          }}
        >
          <h2 id="persistence-recovery-update-title" style={{ margin: '0 0 12px', fontSize: 19 }}>
            {copy.updateTitle}
          </h2>
          <p style={{ color: '#d7e0e8', lineHeight: 1.7 }}>{copy.updateBody}</p>
          <p role="status" aria-live="polite" style={{ minHeight: 24, color: '#b9c8d6' }}>
            {getUpdateStatusText(updateState, copy)}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button type="button" disabled={!updater || updateBusy} onClick={runPrimaryUpdateAction}>
              {primaryUpdateLabel}
            </button>
            <button type="button" disabled={!updater} onClick={openManualDownload}>
              {copy.manual}
            </button>
          </div>
          {manualOpenError ? (
            <p role="alert" style={{ color: '#ffb4a8' }}>{copy.manualError}</p>
          ) : null}
        </section>
      </main>
    </div>
  );
};
