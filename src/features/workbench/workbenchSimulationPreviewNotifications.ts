import { translations } from '../../i18n/translations.ts';
import type { Translation } from '../../shared/types.ts';
import { workbenchCopies } from './workbenchStudioCopy.ts';
import type { WorkbenchConsoleMessageFactory } from './workbenchConsoleLocalization.ts';

export function createWorkbenchSimulationPreviewNotification(
  workbenchTranslation: Pick<Translation, 'canvas'>,
  pushLog: (message: WorkbenchConsoleMessageFactory) => void,
) {
  return (text: string) => {
    const messageKey = (['locked', 'autoExit', 'switchedToPan', 'switchedToRotate'] as const)
      .find((key) => workbenchTranslation.canvas[key] === text);
    pushLog((language) => {
      const translation = translations[language === 'en' ? 'en-GB' : language];
      return `${workbenchCopies[language].panels.previewTitle}: ${messageKey ? translation.canvas[messageKey] : text}`;
    });
  };
}
