export {};

declare global {
  type DesktopExportEnvironmentStatus = 'available-system' | 'available-bundled' | 'unavailable' | 'error';

  interface DesktopExportEnvironmentResult {
    status: DesktopExportEnvironmentStatus;
    message?: string;
    stdout?: string;
    stderr?: string;
    details?: Record<string, unknown> | null;
  }

  interface DesktopExportOptions {
    mode?: string;
    fileName?: string;
    defaultDirName?: string;
  }

  interface DesktopExportResult {
    status: 'ok' | 'cancelled' | 'error';
    outDir?: string;
    metadataPath?: string | null;
    files?: string[];
    message?: string;
    stdout?: string;
    stderr?: string;
    runtime?: 'system' | 'bundled' | 'desktop-file-writer';
  }

  type DesktopUpdateStatus =
    | 'idle'
    | 'checking'
    | 'available'
    | 'not-available'
    | 'downloading'
    | 'retrying'
    | 'downloaded'
    | 'installing'
    | 'unsupported'
    | 'error';

  interface DesktopUpdateReleaseItem {
    scope: string;
    importance: string;
    title: Record<string, string>;
    body: Record<string, string>;
  }

  interface DesktopUpdateReleaseSection {
    type: string;
    title: Record<string, string>;
    items: DesktopUpdateReleaseItem[];
  }

  interface DesktopUpdateState {
    status: DesktopUpdateStatus;
    currentVersion: string;
    latestVersion?: string | null;
    releaseName?: string | null;
    releaseDate?: string | null;
    releaseNotes?: string | null;
    releaseSummary?: Record<string, string> | null;
    releaseSections?: DesktopUpdateReleaseSection[] | null;
    releasePageUrl?: string | null;
    manualDownloadUrl?: string | null;
    downloadAttempt?: number | null;
    maxDownloadAttempts?: number | null;
    retrying?: boolean;
    errorKind?: string | null;
    errorStage?: 'check' | 'download' | null;
    percent?: number | null;
    message?: string;
  }

  interface DesktopManualDownloadResult {
    status: 'opened' | 'error';
    url?: string;
    message?: string;
  }

  type DesktopLegalFileId =
    | 'dependencies'
    | 'licenseTexts'
    | 'electron'
    | 'chromium'
    | 'fonts'
    | 'exporter'
    | 'audio';

  interface DesktopLegalOpenResult {
    status: 'opened' | 'error';
    path?: string;
    message?: string;
  }

  interface DesktopLegalReadResult {
    status: 'ok' | 'error';
    path?: string;
    content?: string;
    mimeType?: string;
    message?: string;
  }

  interface DesktopWindowState {
    maximized: boolean;
    fullscreen: boolean;
  }

  interface DesktopExitPersistenceRequest {
    requestId: string;
    reason: 'custom-close' | 'window-close' | 'update-install';
  }

  interface DesktopExitPersistenceResult {
    requestId: string;
    saved: boolean;
    message?: string;
  }

  interface DesktopExitPersistenceResumeRequest {
    reason: string;
  }

  interface Window {
    hardSphereLabTutorial?: {
      activate: () => Promise<{
        status: 'ok' | 'blocked' | 'error';
        message?: string;
        archivedNamespaces?: string[];
      }>;
      finalizeActivation: (namespaces: string[]) => Promise<{
        status: 'ok' | 'error';
        message?: string;
      }>;
      deactivate: () => Promise<{ status: 'ok' }>;
      getState: () => Promise<{ active: boolean; owner: boolean }>;
      exitApplication: () => Promise<{ status: 'ok' }>;
    };
    hardSphereLabWindow?: {
      newWindow: () => Promise<{ status: 'ok' | 'error'; message?: string }>;
      minimize: () => Promise<DesktopWindowState>;
      toggleMaximize: () => Promise<DesktopWindowState>;
      close: () => Promise<{ status: 'closed' | 'cancelled' | 'discarded' | 'error' }>;
      reportPersistenceResult: (result: DesktopExitPersistenceResult) => Promise<{ status: 'accepted' | 'ignored' }>;
      getState: () => Promise<DesktopWindowState>;
      onState: (callback: (state: DesktopWindowState) => void) => () => void;
      onPrepareExit: (callback: (request: DesktopExitPersistenceRequest) => void) => () => void;
      onResumeAfterExitCancel: (callback: (request: DesktopExitPersistenceResumeRequest) => void) => () => void;
    };
    hardSphereLabExporter?: {
      checkExportEnvironment: () => Promise<DesktopExportEnvironmentResult>;
      exportWorkbenchPayload: (payload: unknown, options?: DesktopExportOptions) => Promise<DesktopExportResult>;
    };
    hardSphereLabUpdater?: {
      checkForUpdates: () => Promise<DesktopUpdateState>;
      downloadUpdate: () => Promise<DesktopUpdateState>;
      quitAndInstall: () => Promise<DesktopUpdateState>;
      openManualDownload: () => Promise<DesktopManualDownloadResult>;
      onStatus: (callback: (state: DesktopUpdateState) => void) => () => void;
    };
    hardSphereLabUserGuide?: {
      openUserGuide: (language: 'zh-CN' | 'zh-TW' | 'en') => Promise<DesktopManualDownloadResult>;
    };
    hardSphereLabLegal?: {
      openLegalFile: (fileId: DesktopLegalFileId) => Promise<DesktopLegalOpenResult>;
      readLegalFile: (fileId: DesktopLegalFileId) => Promise<DesktopLegalReadResult>;
    };
  }
}
