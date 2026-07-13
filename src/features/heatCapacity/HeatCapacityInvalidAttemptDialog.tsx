import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import './HeatCapacityInvalidAttemptDialog.css';

interface HeatCapacityInvalidAttemptDialogProps {
  language: WorkbenchLanguagePreference;
  onReset: () => void;
  onContinue: () => void;
}

const copies = {
  'zh-CN': {
    kicker: '实验流程',
    status: '本组失效',
    title: '本组实验流程已失效',
    body: '当前操作已破坏连续等待或测量基准，本组将不再生成记录与操作评分。建议重置后重新实验；也可以继续自由操作仪器。',
    reset: '重置本组',
    continue: '继续自由操作',
  },
  'zh-TW': {
    kicker: '實驗流程',
    status: '本組失效',
    title: '本組實驗流程已失效',
    body: '目前操作已破壞連續等待或量測基準，本組將不再產生記錄與操作評分。建議重置後重新實驗；也可以繼續自由操作儀器。',
    reset: '重置本組',
    continue: '繼續自由操作',
  },
  en: {
    kicker: 'Experiment flow',
    status: 'Run invalid',
    title: 'This experiment run is no longer valid',
    body: 'The current operation broke the continuous wait or measurement baseline. This run will no longer produce records or an operation score. Reset to repeat the experiment, or continue exploring the instrument freely.',
    reset: 'Reset run',
    continue: 'Continue freely',
  },
} as const;

export const HeatCapacityInvalidAttemptDialog = ({
  language,
  onReset,
  onContinue,
}: HeatCapacityInvalidAttemptDialogProps) => {
  const copy = copies[language];
  return (
    <section
      className="studio-heat-invalid-attempt"
      data-heat-capacity-invalid-attempt="true"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="heat-capacity-invalid-attempt-title"
      aria-describedby="heat-capacity-invalid-attempt-body"
    >
      <header>
        <span>{copy.kicker}</span>
        <em>{copy.status}</em>
      </header>
      <strong id="heat-capacity-invalid-attempt-title">{copy.title}</strong>
      <p id="heat-capacity-invalid-attempt-body">{copy.body}</p>
      <div className="studio-heat-invalid-attempt-actions">
        <button type="button" data-heat-capacity-invalid-reset="true" onClick={onReset}>
          {copy.reset}
        </button>
        <button type="button" data-heat-capacity-invalid-continue="true" onClick={onContinue}>
          {copy.continue}
        </button>
      </div>
    </section>
  );
};

export default HeatCapacityInvalidAttemptDialog;
