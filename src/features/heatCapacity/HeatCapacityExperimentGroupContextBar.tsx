import type {
  HeatCapacityFreeExperimentGroupCollection,
  HeatCapacityFreeExperimentGroupRecord,
} from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import {
  getHeatCapacityFreeCapacityWarning,
} from '../../domain/heatCapacity/heatCapacityFreeCapacityPolicy.ts';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import './HeatCapacityExperimentGroupContextBar.css';

interface HeatCapacityExperimentGroupContextBarProps {
  collection: HeatCapacityFreeExperimentGroupCollection;
  language: WorkbenchLanguagePreference;
  onViewedGroupChange: (groupId: string) => void;
  onViewedTrialChange: (groupId: string, trialId: string | null) => void;
}

const COPY = {
  'zh-CN': {
    group: '查看实验组',
    experiment: '查看实验次序',
    real: '真实',
    ideal: '理想',
    draft: '未开始的新组',
    groupLabel: (scheme: string, number: number) => `${scheme} · 第 ${number} 组`,
    experimentLabel: (number: number) => `第 ${number} 次实验`,
    noExperiment: '暂无实验数据',
    current: '当前实验组',
    historical: '正在查看历史实验组；当前仪器实验继续运行。',
    historicalIdle: '正在查看历史实验组。',
    returnCurrent: '返回当前组',
    capacitySoft: '实验记录较多，建议及时导出实验包备份。',
    capacityPersistent: '实验文件已较大，后续操作可能变慢；建议立即导出实验包。',
  },
  'zh-TW': {
    group: '查看實驗組',
    experiment: '查看實驗次序',
    real: '真實',
    ideal: '理想',
    draft: '未開始的新組',
    groupLabel: (scheme: string, number: number) => `${scheme} · 第 ${number} 組`,
    experimentLabel: (number: number) => `第 ${number} 次實驗`,
    noExperiment: '暫無實驗資料',
    current: '目前實驗組',
    historical: '正在查看歷史實驗組；目前儀器實驗繼續運行。',
    historicalIdle: '正在查看歷史實驗組。',
    returnCurrent: '返回目前組',
    capacitySoft: '實驗記錄較多，建議及時匯出實驗包備份。',
    capacityPersistent: '實驗檔案已較大，後續操作可能變慢；建議立即匯出實驗包。',
  },
  en: {
    group: 'Experiment group',
    experiment: 'Experiment',
    real: 'Real',
    ideal: 'Ideal',
    draft: 'New group (not started)',
    groupLabel: (scheme: string, number: number) => `${scheme} · Group ${number}`,
    experimentLabel: (number: number) => `Experiment ${number}`,
    noExperiment: 'No experiment data',
    current: 'Current group',
    historical: 'Viewing a historical group. The current instrument run continues.',
    historicalIdle: 'Viewing a historical group.',
    returnCurrent: 'Return to current',
    capacitySoft: 'This file contains many records. Export an experiment package as a backup.',
    capacityPersistent: 'This experiment file is large and may become slower. Export a package now.',
  },
} as const;

const getGroupLabel = (
  group: HeatCapacityFreeExperimentGroupRecord,
  copy: typeof COPY[keyof typeof COPY],
) => {
  const scheme = group.scheme === 'ideal' ? copy.ideal : copy.real;
  if (group.schemeGroupNumber === null) return `${copy.draft} · ${scheme}`;
  return copy.groupLabel(scheme, group.schemeGroupNumber);
};

export const HeatCapacityExperimentGroupContextBar = ({
  collection,
  language,
  onViewedGroupChange,
  onViewedTrialChange,
}: HeatCapacityExperimentGroupContextBarProps) => {
  const copy = COPY[language] ?? COPY['zh-CN'];
  const viewedGroup = collection.groups.find((group) => (
    group.id === collection.viewedGroupId
  )) ?? collection.groups.at(-1) ?? null;
  if (viewedGroup === null) return null;
  const selectedTrialId = collection.lastViewedTrialIdByGroupId[viewedGroup.id];
  const selectedTrial = viewedGroup.runSeries.trials.some((trial) => trial.id === selectedTrialId)
    ? selectedTrialId ?? ''
    : viewedGroup.runSeries.trials[0]?.id ?? '';
  const currentGroup = collection.groups.find((group) => group.id === collection.currentGroupId) ?? null;
  const currentGroupRunning = currentGroup?.status === 'collecting';
  const viewingHistorical = collection.currentGroupId !== null &&
    viewedGroup.id !== collection.currentGroupId;
  const capacity = getHeatCapacityFreeCapacityWarning({
    groupCount: collection.groups.length,
    estimatedBytes: collection.capacityEstimate.bytes,
  });

  return (
    <section
      className="studio-heat-group-context"
      data-heat-capacity-group-context="true"
      data-viewing-historical={viewingHistorical ? 'true' : 'false'}
    >
      <div className="studio-heat-group-context-controls">
        <label>
          <span>{copy.group}</span>
          <select
            value={viewedGroup.id}
            onChange={(event) => onViewedGroupChange(event.target.value)}
          >
            {collection.groups.map((group) => (
              <option value={group.id} key={group.id}>
                {getGroupLabel(group, copy)}
                {group.id === collection.currentGroupId ? ` · ${copy.current}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{copy.experiment}</span>
          <select
            value={selectedTrial}
            disabled={viewedGroup.runSeries.trials.length === 0}
            onChange={(event) => onViewedTrialChange(
              viewedGroup.id,
              event.target.value || null,
            )}
          >
            {viewedGroup.runSeries.trials.length === 0 ? (
              <option value="">{copy.noExperiment}</option>
            ) : viewedGroup.runSeries.trials.map((trial, index) => (
              <option value={trial.id} key={trial.id}>
                {copy.experimentLabel(index + 1)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {viewingHistorical ? (
        <div className="studio-heat-group-context-notice">
          <span>{currentGroupRunning ? copy.historical : copy.historicalIdle}</span>
          <button
            type="button"
            onClick={() => {
              if (collection.currentGroupId) onViewedGroupChange(collection.currentGroupId);
            }}
          >
            {copy.returnCurrent}
          </button>
        </div>
      ) : null}
      {capacity.level !== 'none' ? (
        <div className={`studio-heat-group-capacity studio-heat-group-capacity-${capacity.level}`}>
          {capacity.level === 'persistent' ? copy.capacityPersistent : copy.capacitySoft}
        </div>
      ) : null}
    </section>
  );
};

export default HeatCapacityExperimentGroupContextBar;
