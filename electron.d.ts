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
    percent?: number | null;
    message?: string;
  }

  interface DesktopManualDownloadResult {
    status: 'opened' | 'error';
    url?: string;
    message?: string;
  }

  interface Window {
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
  }
}
