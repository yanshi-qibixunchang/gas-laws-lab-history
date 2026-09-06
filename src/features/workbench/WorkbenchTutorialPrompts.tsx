import { PromptConfirmDialog } from '../../components/prompts/PromptConfirmDialog';
import { PromptNoticeDialog } from '../../components/prompts/PromptNoticeDialog';
import { PromptForcedNoticeDialog } from '../../components/prompts/PromptNoticeDialog';
import type { deriveWorkbenchTutorialPromptModel } from './workbenchTutorialPromptModel';
import type { createWorkbenchTutorialPromptActions } from './workbenchTutorialPromptActions';
export interface WorkbenchTutorialPromptsProps {
  model: ReturnType<typeof deriveWorkbenchTutorialPromptModel>;
  actions: ReturnType<typeof createWorkbenchTutorialPromptActions>;
  handleExperimentTutorialNoticeAction: () => void;
}
export const WorkbenchTutorialPrompts = ({ model, actions, handleExperimentTutorialNoticeAction }: WorkbenchTutorialPromptsProps) => {
const { tutorialMilestoneNoticeRequest, tutorialBlockedNoticeRequest, remoteTutorialNoticeRequest, tutorialFailureConfirmation } = model;
const { exitAfterTutorialFailure, retryTutorialOperation, dismissTutorialBlockedNotice, recheckTutorialOwnership } = actions;
return <><PromptConfirmDialog
        request={tutorialFailureConfirmation}
        onCancel={exitAfterTutorialFailure}
        onConfirm={retryTutorialOperation}
      />
<PromptNoticeDialog
        request={tutorialMilestoneNoticeRequest}
        onDismiss={handleExperimentTutorialNoticeAction}
        onAction={handleExperimentTutorialNoticeAction}
      />
<PromptNoticeDialog
        request={tutorialBlockedNoticeRequest}
        onDismiss={dismissTutorialBlockedNotice}
        onAction={dismissTutorialBlockedNotice}
      />
<PromptForcedNoticeDialog
        request={remoteTutorialNoticeRequest}
        onAction={recheckTutorialOwnership}
      /></>;
};
