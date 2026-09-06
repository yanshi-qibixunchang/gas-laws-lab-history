import { type WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import { type WorkbenchExportEnvironmentStatus } from './workbenchFileState.ts';
import { type WorkbenchCopy } from './workbenchStudioCopy.ts';

export const WORKBENCH_USER_GUIDE_URLS: Record<WorkbenchLanguagePreference, string> = {
  'zh-CN': 'https://github.com/yanshi-qibixunchang/gas-laws-lab-release#readme',
  'zh-TW': 'https://github.com/yanshi-qibixunchang/gas-laws-lab-release/blob/main/README.zh-TW.md',
  en: 'https://github.com/yanshi-qibixunchang/gas-laws-lab-release/blob/main/README.en.md',
};

export const hasDesktopExportBridge = () => (
  typeof window !== 'undefined' && Boolean(window.hardSphereLabExporter)
);

export const hasDesktopUpdaterBridge = () => (
  typeof window !== 'undefined' && Boolean(window.hardSphereLabUpdater)
);

export const hasDesktopLegalBridge = () => (
  typeof window !== 'undefined' && Boolean(window.hardSphereLabLegal?.openLegalFile)
);

export const hasDesktopLegalReadBridge = () => (
  typeof window !== 'undefined' && Boolean(window.hardSphereLabLegal?.readLegalFile)
);

export const getFreshWorkbenchWindowUrl = () => {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.searchParams.set('hslFreshWindow', '1');
  return url.toString();
};

export const isExportEnvironmentAvailableStatus = (status: WorkbenchExportEnvironmentStatus) => (
  status === 'available-system' || status === 'available-bundled'
);

export const getAboutEnvironmentStatusLabel = (
  status: WorkbenchExportEnvironmentStatus,
  copy: WorkbenchCopy,
) => {
  if (status === 'checking') return copy.about.checking;
  if (isExportEnvironmentAvailableStatus(status)) return copy.about.available;
  if (status === 'error') return copy.about.error;
  return copy.about.unavailable;
};

export const getAboutEnvironmentResultBody = (
  status: WorkbenchExportEnvironmentStatus,
  copy: WorkbenchCopy,
) => {
  if (isExportEnvironmentAvailableStatus(status)) return copy.about.environmentResultAvailable;
  if (status === 'error') return copy.about.environmentResultError;
  return copy.about.environmentResultUnavailable;
};
