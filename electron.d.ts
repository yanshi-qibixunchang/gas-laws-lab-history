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

  interface Window {
    hardSphereLabExporter?: {
      checkExportEnvironment: () => Promise<DesktopExportEnvironmentResult>;
      exportWorkbenchPayload: (payload: unknown, options?: DesktopExportOptions) => Promise<DesktopExportResult>;
    };
  }
}
