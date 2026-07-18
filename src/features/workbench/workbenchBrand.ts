import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';

export const WORKBENCH_APP_BRAND_NAMES: Record<WorkbenchLanguagePreference, string> = {
  'zh-CN': '气律实验室',
  'zh-TW': '氣律實驗室',
  en: 'Gas Laws Lab',
};

export const getWorkbenchAppBrandName = (language: WorkbenchLanguagePreference) => (
  WORKBENCH_APP_BRAND_NAMES[language]
);
