import type {
  HeatCapacityFreeGroupLollipopChartModel,
} from '../../domain/heatCapacity/heatCapacityFreeGroupChartModel.ts';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';

interface HeatCapacityGroupLollipopChartProps {
  model: HeatCapacityFreeGroupLollipopChartModel;
  language: WorkbenchLanguagePreference;
}

const WIDTH = 680;
const HEIGHT = 290;
const MARGIN = { top: 28, right: 28, bottom: 48, left: 62 };

const COPY = {
  'zh-CN': { experiment: '实验次序', theory: '理论参考', mean: '本组平均值', ua: 'A 类不确定度' },
  'zh-TW': { experiment: '實驗次序', theory: '理論參考', mean: '本組平均值', ua: 'A 類不確定度' },
  en: { experiment: 'Experiment', theory: 'Theory', mean: 'Group mean', ua: 'Type A uncertainty' },
} as const;

export const HeatCapacityGroupLollipopChart = ({
  model,
  language,
}: HeatCapacityGroupLollipopChartProps) => {
  if (model.status === 'hidden' || model.points.length < 3) return null;
  const copy = COPY[language] ?? COPY['zh-CN'];
  const uncertainty = model.typeAStandardUncertainty ?? 0;
  const values = [
    ...model.points.map((point) => point.gamma),
    model.theoreticalGamma,
    model.meanGamma ?? model.theoreticalGamma,
    (model.meanGamma ?? model.theoreticalGamma) - uncertainty,
    (model.meanGamma ?? model.theoreticalGamma) + uncertainty,
  ].filter(Number.isFinite);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = Math.max((rawMax - rawMin) * 0.22, 0.008);
  const minY = rawMin - padding;
  const maxY = rawMax + padding;
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (index: number) => MARGIN.left + (
    model.points.length === 1 ? plotWidth / 2 : index * plotWidth / (model.points.length - 1)
  );
  const y = (value: number) => MARGIN.top + (maxY - value) / (maxY - minY) * plotHeight;
  const ticks = Array.from({ length: 5 }, (_, index) => minY + (maxY - minY) * index / 4);
  const mean = model.meanGamma ?? model.theoreticalGamma;

  return (
    <svg
      className="studio-heat-group-chart-svg"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`${copy.mean}: ${mean.toFixed(4)}`}
    >
      {uncertainty > 0 ? (
        <rect
          x={MARGIN.left}
          y={y(mean + uncertainty)}
          width={plotWidth}
          height={Math.max(1, y(mean - uncertainty) - y(mean + uncertainty))}
          className="studio-heat-chart-uncertainty"
        />
      ) : null}
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} className="studio-heat-chart-grid" />
          <text x={MARGIN.left - 10} y={y(tick) + 4} textAnchor="end" className="studio-heat-chart-axis-label">
            {tick.toFixed(3)}
          </text>
        </g>
      ))}
      <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(model.theoreticalGamma)} y2={y(model.theoreticalGamma)} className="studio-heat-chart-theory" />
      <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(mean)} y2={y(mean)} className="studio-heat-chart-mean" />
      {model.points.map((point, index) => (
        <g key={point.trialId}>
          <line x1={x(index)} x2={x(index)} y1={y(model.theoreticalGamma)} y2={y(point.gamma)} className={`studio-heat-chart-stem studio-heat-chart-stem-${model.scheme}`} />
          <circle cx={x(index)} cy={y(point.gamma)} r={6} className={`studio-heat-chart-dot studio-heat-chart-dot-${model.scheme}`}>
            <title>{`${copy.experiment} ${point.experimentNumber}: γ = ${point.gamma.toFixed(5)}`}</title>
          </circle>
          <text x={x(index)} y={HEIGHT - 20} textAnchor="middle" className="studio-heat-chart-axis-label">
            {point.experimentNumber}
          </text>
        </g>
      ))}
      <text x={MARGIN.left} y={15} className="studio-heat-chart-legend studio-heat-chart-legend-theory">{copy.theory}</text>
      <text x={MARGIN.left + 110} y={15} className="studio-heat-chart-legend studio-heat-chart-legend-mean">{copy.mean}</text>
      {uncertainty > 0 ? <text x={MARGIN.left + 245} y={15} className="studio-heat-chart-legend">{copy.ua}</text> : null}
    </svg>
  );
};

export default HeatCapacityGroupLollipopChart;
