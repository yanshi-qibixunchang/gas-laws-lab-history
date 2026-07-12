import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';

export const WORKBENCH_CONSOLE_LANGUAGES = ['zh-CN', 'zh-TW', 'en'] as const satisfies readonly WorkbenchLanguagePreference[];

export type WorkbenchConsoleMessageTranslations = Record<WorkbenchLanguagePreference, string>;

export type WorkbenchConsoleMessageFactory = (
  language: WorkbenchLanguagePreference,
) => string;

export type WorkbenchConsoleMessageInput = string | WorkbenchConsoleMessageFactory;

export interface WorkbenchLocalizedConsoleMessage {
  /** Legacy fallback retained for refresh checkpoints created by older builds. */
  message: string;
  messages?: WorkbenchConsoleMessageTranslations;
}

export const createWorkbenchConsoleMessageTranslations = (
  factory: WorkbenchConsoleMessageFactory,
): WorkbenchConsoleMessageTranslations => ({
  'zh-CN': factory('zh-CN'),
  'zh-TW': factory('zh-TW'),
  en: factory('en'),
});

export const materializeWorkbenchConsoleMessage = (
  input: WorkbenchConsoleMessageInput,
  currentLanguage: WorkbenchLanguagePreference,
): WorkbenchLocalizedConsoleMessage => {
  if (typeof input === 'string') return { message: input };
  const messages = createWorkbenchConsoleMessageTranslations(input);
  return {
    message: messages[currentLanguage],
    messages,
  };
};

export const normalizeWorkbenchConsoleMessageTranslations = (
  value: unknown,
): WorkbenchConsoleMessageTranslations | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!WORKBENCH_CONSOLE_LANGUAGES.every((language) => typeof record[language] === 'string')) return null;
  return {
    'zh-CN': record['zh-CN'] as string,
    'zh-TW': record['zh-TW'] as string,
    en: record.en as string,
  };
};

export const resolveWorkbenchConsoleMessage = (
  entry: WorkbenchLocalizedConsoleMessage,
  language: WorkbenchLanguagePreference,
) => entry.messages?.[language] ?? entry.message;
