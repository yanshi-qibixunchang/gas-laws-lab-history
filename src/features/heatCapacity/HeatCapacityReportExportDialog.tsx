import { FileText } from 'lucide-react';
import { useId } from 'react';
import { PromptDialogShell } from '../../components/prompts/PromptDialogShell.tsx';
import type { HeatCapacityFreeExperimentGroupRecord } from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import { isHeatCapacityGroupReportable } from '../workbench/workbenchHeatCapacityExport.ts';
import './HeatCapacityReportExportDialog.css';

interface HeatCapacityReportExportDialogProps {
  open: boolean;
  groups: readonly HeatCapacityFreeExperimentGroupRecord[];
  selectedGroupIds: readonly string[];
  language: WorkbenchLanguagePreference;
  onSelectionChange: (groupIds: string[]) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const COPY = {
  'zh-CN': {
    title: '选择报告内容',
    subtitle: '导出报告',
    intro: '已完成实验组默认纳入报告；有实验记录或过程数据的未完成组可主动勾选。空白新组不纳入报告。',
    real: '真实模拟',
    ideal: '理想参数',
    air: '空气',
    helium: '氦气',
    group: (scheme: string, gas: string, number: number) => `${scheme} · ${gas} · 第 ${number} 组`,
    complete: '已完成',
    incomplete: '未完成',
    experiments: (done: number, total: number) => `${done} / ${total} 次实验`,
    empty: '当前没有可加入报告的实验组。',
    cancel: '取消',
    confirm: '导出所选报告',
    close: '关闭',
  },
  'zh-TW': {
    title: '選擇報告內容',
    subtitle: '匯出報告',
    intro: '已完成實驗組預設納入報告；有實驗記錄或過程資料的未完成組可主動勾選。空白新組不納入報告。',
    real: '真實模擬',
    ideal: '理想參數',
    air: '空氣',
    helium: '氦氣',
    group: (scheme: string, gas: string, number: number) => `${scheme} · ${gas} · 第 ${number} 組`,
    complete: '已完成',
    incomplete: '未完成',
    experiments: (done: number, total: number) => `${done} / ${total} 次實驗`,
    empty: '目前沒有可加入報告的實驗組。',
    cancel: '取消',
    confirm: '匯出所選報告',
    close: '關閉',
  },
  en: {
    title: 'Choose report content',
    subtitle: 'Export report',
    intro: 'Completed groups are selected by default. Incomplete groups with records or process data may be included; blank new groups are omitted.',
    real: 'Real simulation',
    ideal: 'Ideal parameters',
    air: 'Air',
    helium: 'Helium',
    group: (scheme: string, gas: string, number: number) => `${scheme} · ${gas} · Group ${number}`,
    complete: 'Complete',
    incomplete: 'Incomplete',
    experiments: (done: number, total: number) => `${done} / ${total} experiments`,
    empty: 'There is no experiment group to include.',
    cancel: 'Cancel',
    confirm: 'Export selected report',
    close: 'Close',
  },
} as const;

const getCompletedExperimentCount = (group: HeatCapacityFreeExperimentGroupRecord) => (
  group.runSeries.trials.filter((trial) => trial.completedAtMs !== null).length
);

export const HeatCapacityReportExportDialog = ({
  open,
  groups,
  selectedGroupIds,
  language,
  onSelectionChange,
  onCancel,
  onConfirm,
}: HeatCapacityReportExportDialogProps) => {
  const copy = COPY[language] ?? COPY['zh-CN'];
  const titleId = `${useId()}-title`;
  if (!open) return null;
  const sortedGroups = groups.filter(isHeatCapacityGroupReportable).sort((left, right) => (
    left.scheme === right.scheme
      ? (left.schemeGroupNumber ?? Number.MAX_SAFE_INTEGER) - (right.schemeGroupNumber ?? Number.MAX_SAFE_INTEGER)
      : left.scheme === 'real' ? -1 : 1
  ));
  const reportableGroupIds = new Set(sortedGroups.map((group) => group.id));
  const selected = new Set(selectedGroupIds.filter((groupId) => reportableGroupIds.has(groupId)));

  return (
    <PromptDialogShell
      title={copy.title}
      titleId={titleId}
      subtitle={copy.subtitle}
      icon={FileText}
      variant="task"
      role="dialog"
      closeLabel={copy.close}
      dismiss={{ closeButton: true, escape: true, backdrop: true }}
      onRequestClose={onCancel}
      overlayClassName="studio-settings-overlay studio-heat-report-export-overlay"
      dialogClassName="studio-settings-window studio-heat-report-export-window"
      headerClassName="studio-settings-header"
      overlayData={{ 'data-heat-capacity-report-export-dialog': 'true' }}
    >
      <div className="studio-heat-report-export-body">
        <p>{copy.intro}</p>
        {sortedGroups.length === 0 ? (
          <div className="studio-heat-report-export-empty">{copy.empty}</div>
        ) : (
          <div className="studio-heat-report-export-list">
            {sortedGroups.map((group) => {
              const scheme = group.scheme === 'ideal' ? copy.ideal : copy.real;
              const gas = group.gasType === 'helium' ? copy.helium : copy.air;
              const label = group.schemeGroupNumber === null
                ? `${scheme} · ${gas} · ${copy.incomplete}`
                : copy.group(scheme, gas, group.schemeGroupNumber);
              const complete = group.status === 'completed';
              return (
                <label key={group.id}>
                  <input
                    type="checkbox"
                    checked={selected.has(group.id)}
                    onChange={(event) => {
                      const next = new Set(selected);
                      if (event.target.checked) next.add(group.id);
                      else next.delete(group.id);
                      onSelectionChange([...next]);
                    }}
                  />
                  <span>
                    <strong>{label}</strong>
                    <small>{copy.experiments(getCompletedExperimentCount(group), group.targetExperimentCount)}</small>
                  </span>
                  <em className={complete ? 'is-complete' : 'is-incomplete'}>
                    {complete ? copy.complete : copy.incomplete}
                  </em>
                </label>
              );
            })}
          </div>
        )}
      </div>
      <footer className="studio-heat-report-export-actions">
        <button type="button" onClick={onCancel}>{copy.cancel}</button>
        <button
          type="button"
          className="studio-heat-report-export-confirm"
          disabled={selected.size === 0}
          onClick={onConfirm}
        >
          {copy.confirm}
        </button>
      </footer>
    </PromptDialogShell>
  );
};

export default HeatCapacityReportExportDialog;
