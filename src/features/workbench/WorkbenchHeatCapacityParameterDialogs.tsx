import { useId, useRef } from 'react';
import { PromptDialogShell } from '../../components/prompts/PromptDialogShell.tsx';

interface WorkbenchHeatCapacityDialogCopy {
  title: string;
  body: string;
  cancel: string;
  confirm: string;
}

interface WorkbenchHeatCapacityModalDialogProps {
  open: boolean;
  copy: WorkbenchHeatCapacityDialogCopy;
  dialogClassName?: string;
  overlayClassName?: string;
  primaryClassName?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

interface WorkbenchHeatCapacityAdvancedRiskDialogProps {
  open: boolean;
  copy: WorkbenchHeatCapacityDialogCopy;
  onCancel: () => void;
  onConfirm: () => void;
}

const WorkbenchHeatCapacityModalDialog = ({
  open,
  copy,
  dialogClassName = '',
  overlayClassName = 'studio-heat-restore-default-overlay',
  primaryClassName = 'studio-heat-restore-default-primary',
  onCancel,
  onConfirm,
}: WorkbenchHeatCapacityModalDialogProps) => {
  const generatedId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  if (!open) return null;

  return (
    <PromptDialogShell
      title={copy.title}
      titleId={`${generatedId}-title`}
      tone="warning"
      variant="confirmation"
      layer="decision"
      role="alertdialog"
      ariaDescribedBy={`${generatedId}-body`}
      dismiss={{ closeButton: false, escape: true, backdrop: true }}
      onRequestClose={onCancel}
      initialFocusRef={cancelButtonRef}
      overlayClassName={overlayClassName}
      dialogClassName={`studio-heat-restore-default-confirm${dialogClassName ? ` ${dialogClassName}` : ''}`}
    >
      <div className="studio-heat-parameter-dialog-body">
        <span id={`${generatedId}-body`}>{copy.body}</span>
      </div>
      <footer>
        <button ref={cancelButtonRef} type="button" data-prompt-initial-focus="true" onClick={onCancel}>
          {copy.cancel}
        </button>
        <button type="button" className={primaryClassName} onClick={onConfirm}>
          {copy.confirm}
        </button>
      </footer>
    </PromptDialogShell>
  );
};

export const WorkbenchHeatCapacityRestoreDefaultDialog = (
  props: Omit<WorkbenchHeatCapacityModalDialogProps, 'dialogClassName'>,
) => <WorkbenchHeatCapacityModalDialog {...props} />;

export const WorkbenchHeatCapacityIdealProfileIntroDialog = (
  props: Omit<WorkbenchHeatCapacityModalDialogProps, 'dialogClassName'>,
) => <WorkbenchHeatCapacityModalDialog {...props} dialogClassName="studio-heat-ideal-intro-confirm" />;

export const WorkbenchHeatCapacityAdvancedRiskDialog = ({
  open,
  copy,
  onCancel,
  onConfirm,
}: WorkbenchHeatCapacityAdvancedRiskDialogProps) => (
  <WorkbenchHeatCapacityModalDialog
    open={open}
    copy={copy}
    overlayClassName="studio-heat-advanced-risk-overlay"
    dialogClassName="studio-heat-advanced-risk-window"
    primaryClassName="studio-heat-advanced-primary"
    onCancel={onCancel}
    onConfirm={onConfirm}
  />
);
