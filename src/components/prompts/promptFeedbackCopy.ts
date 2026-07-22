import type { PromptFeedbackKind } from './promptFeedbackPolicy.ts';

export type PromptFeedbackLanguage = 'zh-CN' | 'zh-TW' | 'en';

export interface PromptFeedbackCopy {
  regionLabel: string;
  closeLabel: string;
  inputErrorTitle: string;
  persistenceRetryingTitle: string;
  persistenceFailedTitle: string;
  kindLabels: Record<PromptFeedbackKind, string>;
}

export const PROMPT_FEEDBACK_COPY: Record<PromptFeedbackLanguage, PromptFeedbackCopy> = {
  'zh-CN': {
    regionLabel: '消息通知',
    closeLabel: '关闭消息',
    inputErrorTitle: '输入无效',
    persistenceRetryingTitle: '正在重试保存',
    persistenceFailedTitle: '工作区保存失败',
    kindLabels: {
      success: '成功',
      info: '信息',
      warning: '警告',
      danger: '危险',
    },
  },
  'zh-TW': {
    regionLabel: '訊息通知',
    closeLabel: '關閉訊息',
    inputErrorTitle: '輸入無效',
    persistenceRetryingTitle: '正在重試儲存',
    persistenceFailedTitle: '工作區儲存失敗',
    kindLabels: {
      success: '成功',
      info: '資訊',
      warning: '警告',
      danger: '危險',
    },
  },
  en: {
    regionLabel: 'Notifications',
    closeLabel: 'Dismiss notification',
    inputErrorTitle: 'Invalid input',
    persistenceRetryingTitle: 'Retrying workspace save',
    persistenceFailedTitle: 'Workspace save failed',
    kindLabels: {
      success: 'Success',
      info: 'Information',
      warning: 'Warning',
      danger: 'Danger',
    },
  },
};
