import type {
  HeatCapacityFreeGroupLollipopChartModel,
} from '../../domain/heatCapacity/heatCapacityFreeGroupChartModel.ts';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import { formatSignificantFiguresHalfEven } from '../../domain/calculation/decimalHalfEven.ts';

interface HeatCapacityGroupLollipopChartProps {
  model: HeatCapacityFreeGroupLollipopChartModel;
  language: WorkbenchLanguagePreference;
}

const WIDTH = 1240;
const HEIGHT = 246;
const PLOT_LEFT = 56;
const PLOT_RIGHT = WIDTH - 34;
const PLOT_TOP = 32;
const PLOT_BOTTOM = 188;
const MAJOR_TICK_LENGTH = 7;

const COPY = {
  'zh-CN': {
    experiment: '实验次序',
    xAxis: '实验次序（次）',
    yAxis: '比热容比 γ（无量纲）',
    theory: '理论参考',
    mean: '本组平均值',
    ua: 'A 类不确定度',
  },
  'zh-TW': {
    experiment: '實驗次序',
    xAxis: '實驗次序（次）',
    yAxis: '比熱容比 γ（無量綱）',
    theory: '理論參考',
    mean: '本組平均值',
    ua: 'A 類不確定度',
  },
  en: {
    experiment: 'Experiment',
    xAxis: 'Experiment number',
    yAxis: 'Heat capacity ratio γ (dimensionless)',
    theory: 'Theory',
    mean: 'Group mean',
    ua: 'Type A uncertainty',
  },
} as const;

const getNiceStep = (value: number) => {
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const fraction = value / magnitude;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return niceFraction * magnitude;
};

export const HeatCapacityGroupLollipopChart = ({
  model,
  language,
}: HeatCapacityGroupLollipopChartProps) => {
  if (model.status === 'hidden' || model.points.length < 3) return null;
  const copy = COPY[language] ?? COPY['zh-CN'];
  const uncertainty = model.typeAStandardUncertainty ?? 0;
  const mean = model.meanGamma ?? model.theoreticalGamma;
  const gammaLabel = (value: number) => model.publicTeachingValues ? formatSignificantFiguresHalfEven(value, 4) : value.toFixed(4);
  const uncertaintyLabel = model.publicTeachingValues ? uncertainty === 0 ? '0' : formatSignificantFiguresHalfEven(uncertainty, 3) : uncertainty.toFixed(4);
  const values = [
    ...model.points.map((point) => point.gamma),
    model.theoreticalGamma,
    mean,
    mean - uncertainty,
    mean + uncertainty,
  ].filter(Number.isFinite);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawSpan = Math.max(rawMax - rawMin, 0.004);
  const padding = Math.max(rawSpan * 0.18, 0.0015);
  const tickStep = getNiceStep((rawSpan + padding * 2) / 4);
  const minY = Math.floor((rawMin - padding) / tickStep) * tickStep;
  const maxY = Math.ceil((rawMax + padding) / tickStep) * tickStep;
  const tickCount = Math.round((maxY - minY) / tickStep);
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => minY + tickStep * index);
  const plotWidth = PLOT_RIGHT - PLOT_LEFT;
  const plotHeight = PLOT_BOTTOM - PLOT_TOP;
  const x = (index: number) => PLOT_LEFT + (index + 1) * plotWidth / (model.points.length + 1);
  const y = (value: number) => PLOT_TOP + (maxY - value) / (maxY - minY) * plotHeight;

  return (
    <div className="studio-heat-group-lollipop">
      <div className="studio-heat-group-chart-legend" aria-label={`${copy.theory}、${copy.mean}、${copy.ua}`}>
        <span className="studio-heat-group-chart-legend-item studio-heat-group-chart-legend-theory">
          <i aria-hidden="true" />
          {copy.theory}
          <b>{model.theoreticalGamma.toFixed(4)}</b>
        </span>
        <span className="studio-heat-group-chart-legend-item studio-heat-group-chart-legend-mean">
          <i aria-hidden="true" />
          {copy.mean}
          <b>{gammaLabel(mean)}</b>
        </span>
        {uncertainty > 0 || (model.publicTeachingValues && model.typeAStandardUncertainty === 0) ? (
          <span className="studio-heat-group-chart-legend-item studio-heat-group-chart-legend-uncertainty">
            <i aria-hidden="true" />
            {copy.ua}
            <b>±{uncertaintyLabel}</b>
          </span>
        ) : null}
      </div>
      <svg
        className="studio-heat-group-chart-svg studio-heat-group-lollipop-svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${copy.mean}: ${gammaLabel(mean)}; ${copy.theory}: ${model.theoreticalGamma.toFixed(4)}`}
      >
        <rect
          x={PLOT_LEFT}
          y={PLOT_TOP}
          width={plotWidth}
          height={plotHeight}
          className="studio-heat-chart-plot-background"
        />
        {uncertainty > 0 ? (
          <g className="studio-heat-chart-uncertainty-range">
            <rect
              x={PLOT_LEFT}
              y={y(mean + uncertainty)}
              width={plotWidth}
              height={Math.max(1, y(mean - uncertainty) - y(mean + uncertainty))}
              className="studio-heat-chart-uncertainty"
            />
            <line x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={y(mean + uncertainty)} y2={y(mean + uncertainty)} />
            <line x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={y(mean - uncertainty)} y2={y(mean - uncertainty)} />
          </g>
        ) : null}
        {ticks.map((tick, index) => (
          <g className="studio-heat-chart-axis-tick" key={`y-${tick.toFixed(6)}`}>
            {index > 0 && index < ticks.length - 1 ? (
              <line x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={y(tick)} y2={y(tick)} className="studio-heat-chart-grid" />
            ) : null}
            <line x1={PLOT_LEFT} y1={y(tick)} x2={PLOT_LEFT + MAJOR_TICK_LENGTH} y2={y(tick)} />
            <line x1={PLOT_RIGHT} y1={y(tick)} x2={PLOT_RIGHT - MAJOR_TICK_LENGTH} y2={y(tick)} />
            <text x={PLOT_LEFT - 10} y={y(tick) + 5} textAnchor="end">
              {tick.toFixed(3)}
            </text>
          </g>
        ))}
        <line
          x1={PLOT_LEFT}
          x2={PLOT_RIGHT}
          y1={y(mean)}
          y2={y(mean)}
          className="studio-heat-chart-mean"
        >
          <title>{`${copy.mean}: ${gammaLabel(mean)}`}</title>
        </line>
        {model.points.map((point, index) => (
          <g key={point.trialId}>
            <line
              x1={x(index)}
              x2={x(index)}
              y1={y(model.theoreticalGamma)}
              y2={y(point.gamma)}
              className={`studio-heat-chart-stem studio-heat-chart-stem-${model.scheme}`}
            />
            <circle
              cx={x(index)}
              cy={y(point.gamma)}
              r={5.5}
              className={`studio-heat-chart-dot studio-heat-chart-dot-${model.scheme}`}
            >
              <title>{`${copy.experiment} ${point.experimentNumber}: γ = ${gammaLabel(point.gamma)}`}</title>
            </circle>
          </g>
        ))}
        <line
          x1={PLOT_LEFT}
          x2={PLOT_RIGHT}
          y1={y(model.theoreticalGamma)}
          y2={y(model.theoreticalGamma)}
          className="studio-heat-chart-theory"
        >
          <title>{`${copy.theory}: ${model.theoreticalGamma.toFixed(4)}`}</title>
        </line>
        <rect
          x={PLOT_LEFT}
          y={PLOT_TOP}
          width={plotWidth}
          height={plotHeight}
          className="studio-heat-chart-plot-frame"
        />
        {model.points.map((point, index) => (
          <g className="studio-heat-chart-axis-tick" key={`x-${point.trialId}`}>
            <line x1={x(index)} y1={PLOT_BOTTOM} x2={x(index)} y2={PLOT_BOTTOM - MAJOR_TICK_LENGTH} />
            <line x1={x(index)} y1={PLOT_TOP} x2={x(index)} y2={PLOT_TOP + MAJOR_TICK_LENGTH} />
            <text x={x(index)} y={PLOT_BOTTOM + 28} textAnchor="middle">
              {point.experimentNumber}
            </text>
          </g>
        ))}
        <text className="studio-heat-chart-axis-title" x={PLOT_LEFT} y={PLOT_TOP - 7}>
          {copy.yAxis}
        </text>
        <text
          className="studio-heat-chart-axis-title studio-heat-chart-axis-title-x"
          x={PLOT_RIGHT}
          y={PLOT_BOTTOM + 48}
          textAnchor="end"
        >
          {copy.xAxis}
        </text>
      </svg>
    </div>
  );
};

export default HeatCapacityGroupLollipopChart;
