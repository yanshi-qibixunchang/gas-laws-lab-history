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
  onCancel,
  onConfirm,
}: WorkbenchHeatCapacityModalDialogProps) => {
  if (!open) return null;

  return (
    <div className="studio-heat-restore-default-overlay" role="presentation" onMouseDown={onCancel}>
      <section
        className={`studio-heat-restore-default-confirm${dialogClassName ? ` ${dialogClassName}` : ''}`}
        role="alertdialog"
        aria-modal="true"
        aria-label={copy.title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div>
          <strong>{copy.title}</strong>
          <span>{copy.body}</span>
        </div>
        <footer>
          <button type="button" onClick={onCancel}>
            {copy.cancel}
          </button>
          <button type="button" className="studio-heat-restore-default-primary" onClick={onConfirm}>
            {copy.confirm}
          </button>
        </footer>
      </section>
    </div>
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
}: WorkbenchHeatCapacityAdvancedRiskDialogProps) => {
  if (!open) return null;

  return (
    <section
      className="studio-heat-advanced-risk-window"
      role="alertdialog"
      aria-modal="true"
      aria-label={copy.title}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div>
        <strong>{copy.title}</strong>
        <span>{copy.body}</span>
      </div>
      <footer>
        <button type="button" onClick={onCancel}>
          {copy.cancel}
        </button>
        <button type="button" className="studio-heat-advanced-primary" onClick={onConfirm}>
          {copy.confirm}
        </button>
      </footer>
    </section>
  );
};
