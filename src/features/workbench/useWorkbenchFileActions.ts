import { createWorkbenchFileActions, type WorkbenchFileActionPorts } from './workbenchFileActions.ts';
import { createWorkbenchFileRenameActions, type WorkbenchFileRenamePorts } from './workbenchFileRenameActions.ts';
/** File lifecycle and rename share the shell's collection and history ports. */
export const useWorkbenchFileActions = (ports: { lifecycle: WorkbenchFileActionPorts; rename: WorkbenchFileRenamePorts }) => ({
  ...createWorkbenchFileActions(ports.lifecycle),
  ...createWorkbenchFileRenameActions(ports.rename),
});
