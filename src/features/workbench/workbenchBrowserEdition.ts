import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import type { PromptConfirmationRequest } from '../../components/prompts/PromptConfirmDialog.tsx';

// Pin to a published installer, not the version of a possibly newer web build.
export const BROWSER_DESKTOP_RELEASE = {
  version: '6.4.4',
  installerUrl: 'https://github.com/yanshi-qibixunchang/gas-laws-lab-release/releases/download/v6.4.4/heat-capacity-lab-setup-6.4.4.exe',
} as const;

export const isBrowserEdition = (scope: Pick<Window, 'hardSphereLabWindow' | 'hardSphereLabExporter' | 'hardSphereLabUpdater'>) => (
  !scope.hardSphereLabWindow && !scope.hardSphereLabExporter && !scope.hardSphereLabUpdater
);

export const browserEditionCopies = {
  'zh-CN': {
    button: '下载桌面版', edition: '网页版', title: '下载 Windows 桌面版',
    body: '在电脑上安装气律实验室，可使用报告、图像和表格导出功能。',
    exportTitle: '网页版暂不支持导出',
    exportBody: '网页版暂不支持导出报告、图像和表格，请使用 Windows 桌面版。',
    storage: '网页版与桌面版分别保存实验进度，下载安装不会自动转移当前实验。',
    cancel: '继续使用网页版', confirm: '下载 Windows 版', close: '关闭',
    exportLabel: '报告与数据导出', desktopOnly: '桌面版可用',
  },
  'zh-TW': {
    button: '下載桌面版', edition: '網頁版', title: '下載 Windows 桌面版',
    body: '在電腦上安裝氣律實驗室，可使用報告、圖像和表格匯出功能。',
    exportTitle: '網頁版暫不支援匯出',
    exportBody: '網頁版暫不支援匯出報告、圖像和表格，請使用 Windows 桌面版。',
    storage: '網頁版與桌面版分別儲存實驗進度，下載安裝不會自動轉移目前實驗。',
    cancel: '繼續使用網頁版', confirm: '下載 Windows 版', close: '關閉',
    exportLabel: '報告與資料匯出', desktopOnly: '桌面版可用',
  },
  en: {
    button: 'Download desktop app', edition: 'Web edition', title: 'Download for Windows',
    body: 'Install Gas Laws Lab on your computer to export reports, figures and tables.',
    exportTitle: 'Export is not available on the web',
    exportBody: 'Use the Windows desktop app to export reports, figures and tables.',
    storage: 'The web and desktop apps save progress separately. Downloading does not transfer this experiment.',
    cancel: 'Continue on the web', confirm: 'Download for Windows', close: 'Close',
    exportLabel: 'Report and data export', desktopOnly: 'Available in the desktop app',
  },
} satisfies Record<WorkbenchLanguagePreference, Record<string, string>>;

export const createBrowserDownloadPrompt = (
  language: WorkbenchLanguagePreference,
  reason: 'download' | 'export',
  onDownload: () => void,
): PromptConfirmationRequest => {
  const copy = browserEditionCopies[language];
  return {
    id: 'browser-desktop-download', tone: 'standard',
    eyebrow: `${copy.edition} · Windows ${BROWSER_DESKTOP_RELEASE.version}`,
    title: reason === 'export' ? copy.exportTitle : copy.title,
    body: reason === 'export' ? copy.exportBody : copy.body,
    consequence: copy.storage, cancelLabel: copy.cancel, confirmLabel: copy.confirm,
    closeLabel: copy.close, onConfirm: onDownload,
  };
};
