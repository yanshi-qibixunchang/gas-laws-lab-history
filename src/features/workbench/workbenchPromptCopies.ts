import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';

interface WorkbenchConfirmationCopy {
  eyebrow: string;
  title: string;
  body: string;
  consequence: string;
  cancelLabel: string;
  confirmLabel: string;
}

interface WorkbenchPromptCopySet {
  closeLabel: string;
  switchTeachingMode: WorkbenchConfirmationCopy;
  closeRunningExperiment: (fileName: string) => WorkbenchConfirmationCopy;
}

export const workbenchPromptCopies: Record<WorkbenchLanguagePreference, WorkbenchPromptCopySet> = {
  'zh-CN': {
    closeLabel: '关闭确认窗口',
    switchTeachingMode: {
      eyebrow: '注意',
      title: '切换实验模式？',
      body: '当前教学模式的进度将会重置。',
      consequence: '已记录的实验文件和数据不会受到影响。',
      cancelLabel: '保留当前模式',
      confirmLabel: '切换模式',
    },
    closeRunningExperiment: (fileName) => ({
      eyebrow: '注意',
      title: '关闭正在运行的实验文件？',
      body: `“${fileName}”正在运行。关闭后，实验运行将停止。`,
      consequence: '实验文件仍保留在本地缓存中，不会被删除。',
      cancelLabel: '继续实验',
      confirmLabel: '停止并关闭',
    }),
  },
  'zh-TW': {
    closeLabel: '關閉確認視窗',
    switchTeachingMode: {
      eyebrow: '注意',
      title: '切換實驗模式？',
      body: '目前教學模式的進度將會重設。',
      consequence: '已記錄的實驗檔案和資料不會受到影響。',
      cancelLabel: '保留目前模式',
      confirmLabel: '切換模式',
    },
    closeRunningExperiment: (fileName) => ({
      eyebrow: '注意',
      title: '關閉正在執行的實驗檔案？',
      body: `「${fileName}」正在執行。關閉後，實驗執行將停止。`,
      consequence: '實驗檔案仍保留在本機快取中，不會被刪除。',
      cancelLabel: '繼續實驗',
      confirmLabel: '停止並關閉',
    }),
  },
  en: {
    closeLabel: 'Close confirmation window',
    switchTeachingMode: {
      eyebrow: 'Attention',
      title: 'Switch experiment modes?',
      body: 'Progress in the current teaching mode will be reset.',
      consequence: 'Recorded experiment files and data will not be affected.',
      cancelLabel: 'Keep Current Mode',
      confirmLabel: 'Switch Mode',
    },
    closeRunningExperiment: (fileName) => ({
      eyebrow: 'Attention',
      title: 'Close the running experiment file?',
      body: `“${fileName}” is running. Closing it will stop the experiment run.`,
      consequence: 'The experiment file will remain in the local cache and will not be deleted.',
      cancelLabel: 'Continue Experiment',
      confirmLabel: 'Stop and Close',
    }),
  },
};
