import { getLocalizedWorkbenchValidationErrors } from './workbenchParameterPresentation.ts';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import type { WorkbenchStateSetter as Setter, WorkbenchLogWriter } from './workbenchActionPorts.ts';
export const createWorkbenchParameterValidationActions = (ports: { activeFile: { name: string }; settingsLanguagePreference: WorkbenchLanguagePreference; setParameterErrors: Setter<string[]>; pushLog: WorkbenchLogWriter }) => {
 const { activeFile, settingsLanguagePreference, setParameterErrors, pushLog } = ports;
 const showWorkbenchValidationErrors = (validation: { errors: string[] }) => {
    const localizedErrors = getLocalizedWorkbenchValidationErrors(validation.errors, settingsLanguagePreference);
    setParameterErrors(localizedErrors);
    validation.errors.forEach((error) => pushLog(
      (language) => `${activeFile.name}: ${getLocalizedWorkbenchValidationErrors([error], language)[0] ?? error}`,
      'error',
    ));
  };
 return { showWorkbenchValidationErrors };
};
