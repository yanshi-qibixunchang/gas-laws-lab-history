import type { WorkbenchLanguagePreference } from '../features/workbench/workbenchGeneralSettings.ts';
import type { WorkbenchPersistenceInitializationStage } from '../features/workbench/workbenchIndexedDbPersistence.ts';

export type AppStartupPreviewScenario = 'normal' | 'slow' | 'error' | null;

export const resolveAppStartupPreviewScenario = (
  search: string,
  development: boolean,
): AppStartupPreviewScenario => {
  if (!development) return null;
  const value = new URLSearchParams(search).get('startupPreview');
  return value === 'normal' || value === 'slow' || value === 'error'
    ? value
    : null;
};

export const APP_STARTUP_STAGE_PROGRESS: Record<WorkbenchPersistenceInitializationStage, number> = {
  starting: 6,
  'preparing-storage': 14,
  'opening-storage': 26,
  'reading-workspace': 42,
  'restoring-workspace': 64,
  'migrating-workspace': 74,
  'recovering-workspace': 82,
  'preparing-workbench': 92,
  complete: 96,
  failed: 88,
};

export const getAppStartupMinimumVisibleMs = (
  scenario: AppStartupPreviewScenario,
) => {
  if (scenario === 'normal') return 3_800;
  if (scenario === 'slow') return 8_600;
  if (scenario === 'error') return 3_800;
  return 1_450;
};

export interface AppStartupCopy {
  eyebrow: string;
  title: string;
  body: string;
  progressLabel: string;
  stages: Record<WorkbenchPersistenceInitializationStage, string>;
  takingLonger: string;
  ready: string;
  failedTitle: string;
  failedBody: string;
  retry: string;
  continueSafely: string;
}

export const appStartupCopies: Record<WorkbenchLanguagePreference, AppStartupCopy> = {
  'zh-CN': {
    eyebrow: '气律实验室',
    title: '欢迎使用气律实验室',
    body: '面向气体定律与热学实验的桌面工程工作台',
    progressLabel: '启动进度',
    stages: {
      starting: '正在准备启动环境',
      'preparing-storage': '正在定位本地工作区',
      'opening-storage': '正在连接本地工作区',
      'reading-workspace': '正在读取工作区信息',
      'restoring-workspace': '正在恢复实验文件',
      'migrating-workspace': '正在更新工作区数据',
      'recovering-workspace': '正在检查可恢复记录',
      'preparing-workbench': '正在准备实验工作台',
      complete: '正在打开实验工作台',
      failed: '工作区恢复未完成',
    },
    takingLonger: '正在完成工作区恢复，请稍候',
    ready: '工作区已准备就绪',
    failedTitle: '工作区恢复未完成',
    failedBody: '本地数据没有被清除。您可以重新尝试恢复，或先以安全模式进入工作台。',
    retry: '重新尝试',
    continueSafely: '以安全模式进入',
  },
  'zh-TW': {
    eyebrow: '氣律實驗室',
    title: '歡迎使用氣律實驗室',
    body: '面向氣體定律與熱學實驗的桌面工程工作台',
    progressLabel: '啟動進度',
    stages: {
      starting: '正在準備啟動環境',
      'preparing-storage': '正在定位本機工作區',
      'opening-storage': '正在連接本機工作區',
      'reading-workspace': '正在讀取工作區資訊',
      'restoring-workspace': '正在恢復實驗檔案',
      'migrating-workspace': '正在更新工作區資料',
      'recovering-workspace': '正在檢查可恢復記錄',
      'preparing-workbench': '正在準備實驗工作台',
      complete: '正在開啟實驗工作台',
      failed: '工作區恢復未完成',
    },
    takingLonger: '正在完成工作區恢復，請稍候',
    ready: '工作區已準備就緒',
    failedTitle: '工作區恢復未完成',
    failedBody: '本機資料沒有被清除。您可以重新嘗試恢復，或先以安全模式進入工作台。',
    retry: '重新嘗試',
    continueSafely: '以安全模式進入',
  },
  en: {
    eyebrow: 'Gas Laws Lab',
    title: 'Welcome to Gas Laws Lab',
    body: 'A desktop engineering workbench for gas-law and thermal experiments',
    progressLabel: 'Startup progress',
    stages: {
      starting: 'Preparing the startup environment',
      'preparing-storage': 'Locating the local workspace',
      'opening-storage': 'Connecting to the local workspace',
      'reading-workspace': 'Reading workspace information',
      'restoring-workspace': 'Restoring experiment files',
      'migrating-workspace': 'Updating workspace data',
      'recovering-workspace': 'Checking recoverable records',
      'preparing-workbench': 'Preparing the experiment workbench',
      complete: 'Opening the experiment workbench',
      failed: 'Workspace restoration did not complete',
    },
    takingLonger: 'Finishing workspace restoration. This may take a moment.',
    ready: 'Workspace ready',
    failedTitle: 'Workspace restoration did not complete',
    failedBody: 'Your local data was not cleared. Try restoring again, or enter the workbench in safe mode.',
    retry: 'Try again',
    continueSafely: 'Enter safe mode',
  },
};
