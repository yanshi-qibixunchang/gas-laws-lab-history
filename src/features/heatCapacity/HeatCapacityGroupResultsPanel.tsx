import {
  createHeatCapacityFreeAllGroupsOverviewModel,
  createHeatCapacityFreeGroupLollipopChartModel,
} from '../../domain/heatCapacity/heatCapacityFreeGroupChartModel.ts';
import type {
  HeatCapacityFreeExperimentGroupCollection,
  HeatCapacityFreeExperimentGroupRecord,
} from '../../domain/heatCapacity/heatCapacityFreeExperimentGroupModel.ts';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import { HeatCapacityGroupLollipopChart } from './HeatCapacityGroupLollipopChart.tsx';
import { HeatCapacityAllGroupsOverviewChart } from './HeatCapacityAllGroupsOverviewChart.tsx';
import './HeatCapacityGroupResultsPanel.css';

interface HeatCapacityGroupResultsPanelProps {
  group: HeatCapacityFreeExperimentGroupRecord;
  collection: HeatCapacityFreeExperimentGroupCollection;
  language: WorkbenchLanguagePreference;
}

const COPY = {
  'zh-CN': {
    title: '本组结果分布',
    wait: (count: number) => `完成第 3 次实验后显示棒棒糖图（当前 ${count} 次）。`,
    overview: '全部实验组结果概览',
    mean: '平均 γ',
    sd: '样本标准偏差',
    ua: 'A 类不确定度',
    error: '相对误差',
    operation: '操作平均分',
    calculation: '计算分',
    total: '本组总分',
    pending: '待完成计算',
    noScore: '理想实验组不评分',
  },
  'zh-TW': {
    title: '本組結果分布',
    wait: (count: number) => `完成第 3 次實驗後顯示棒棒糖圖（目前 ${count} 次）。`,
    overview: '全部實驗組結果概覽',
    mean: '平均 γ',
    sd: '樣本標準偏差',
    ua: 'A 類不確定度',
    error: '相對誤差',
    operation: '操作平均分',
    calculation: '計算分',
    total: '本組總分',
    pending: '待完成計算',
    noScore: '理想實驗組不評分',
  },
  en: {
    title: 'Group result distribution',
    wait: (count: number) => `The lollipop chart appears after experiment 3 (${count} completed).`,
    overview: 'All experiment groups',
    mean: 'Mean γ',
    sd: 'Sample standard deviation',
    ua: 'Type A uncertainty',
    error: 'Relative error',
    operation: 'Operation average',
    calculation: 'Calculation',
    total: 'Group total',
    pending: 'Calculation pending',
    noScore: 'Ideal groups are not scored',
  },
} as const;

const number = (value: number | null, digits = 4) => value === null ? '--' : value.toFixed(digits);

export const HeatCapacityGroupResultsPanel = ({
  group,
  collection,
  language,
}: HeatCapacityGroupResultsPanelProps) => {
  const copy = COPY[language] ?? COPY['zh-CN'];
  const model = createHeatCapacityFreeGroupLollipopChartModel(group);
  const overview = createHeatCapacityFreeAllGroupsOverviewModel(collection);
  const score = group.finalScore;
  return (
    <div className="studio-heat-group-results" data-heat-capacity-group-results="true">
      <section className="studio-heat-group-result-card">
        <div className="studio-heat-group-result-heading"><strong>{copy.title}</strong></div>
        <div className="studio-heat-group-stat-grid">
          <span><small>{copy.mean}</small><strong>{number(model.meanGamma)}</strong></span>
          <span><small>{copy.sd}</small><strong>{number(model.sampleStandardDeviation)}</strong></span>
          <span><small>{copy.ua}</small><strong>{number(model.typeAStandardUncertainty)}</strong></span>
          <span><small>{copy.error}</small><strong>{model.relativeErrorPercent === null ? '--' : `${model.relativeErrorPercent.toFixed(2)}%`}</strong></span>
        </div>
        {model.status === 'hidden' ? (
          <p className="studio-heat-group-chart-placeholder">{copy.wait(model.completedExperimentCount)}</p>
        ) : <HeatCapacityGroupLollipopChart model={model} language={language} />}
      </section>
      <section className="studio-heat-group-result-card studio-heat-group-score-card">
        {group.scheme === 'ideal' ? (
          <strong>{copy.noScore}</strong>
        ) : (
          <>
            <span><small>{copy.operation}</small><strong>{score?.operationAverage === null || score === null ? '-- / 75' : `${score.operationAverage.toFixed(1)} / 75`}</strong></span>
            <span><small>{copy.calculation}</small><strong>{score?.calculation.total == null ? '-- / 25' : `${score.calculation.total.toFixed(1)} / 25`}</strong></span>
            <span><small>{copy.total}</small><strong>{score?.total === null || score === null ? copy.pending : `${score.total.toFixed(1)} / 100`}</strong></span>
          </>
        )}
      </section>
      {overview.points.length >= 2 ? (
        <section className="studio-heat-group-result-card">
          <div className="studio-heat-group-result-heading"><strong>{copy.overview}</strong></div>
          <HeatCapacityAllGroupsOverviewChart model={overview} language={language} />
        </section>
      ) : null}
    </div>
  );
};

export default HeatCapacityGroupResultsPanel;
