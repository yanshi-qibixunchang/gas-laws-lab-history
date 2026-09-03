import type {
  HeatCapacityFreeAllGroupsOverviewModel,
} from '../../domain/heatCapacity/heatCapacityFreeGroupChartModel.ts';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';

interface HeatCapacityAllGroupsOverviewChartProps {
  model: HeatCapacityFreeAllGroupsOverviewModel;
  language: WorkbenchLanguagePreference;
}

const COPY = {
  'zh-CN': { real: '真实', ideal: '理想', air: '空气', helium: '氦气', theory: '理论参考', group: '组' },
  'zh-TW': { real: '真實', ideal: '理想', air: '空氣', helium: '氦氣', theory: '理論參考', group: '組' },
  en: { real: 'Real', ideal: 'Ideal', air: 'Air', helium: 'Helium', theory: 'Theory', group: 'group' },
} as const;

export const HeatCapacityAllGroupsOverviewChart = ({
  model,
  language,
}: HeatCapacityAllGroupsOverviewChartProps) => {
  if (model.points.length < 2) return null;
  const copy = COPY[language] ?? COPY['zh-CN'];
  const width = 680;
  const height = 270;
  const margin = { top: 28, right: 28, bottom: 58, left: 62 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const values = model.points.flatMap((point) => [
    point.meanGamma - (point.typeAStandardUncertainty ?? 0),
    point.meanGamma + (point.typeAStandardUncertainty ?? 0),
  ]);
  if (model.theoreticalGamma !== null) values.push(model.theoreticalGamma);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = Math.max((rawMax - rawMin) * 0.22, 0.008);
  const minY = rawMin - padding;
  const maxY = rawMax + padding;
  const x = (index: number) => margin.left + (
    model.points.length === 1 ? plotWidth / 2 : index * plotWidth / (model.points.length - 1)
  );
  const y = (value: number) => margin.top + (maxY - value) / (maxY - minY) * plotHeight;

  return (
    <svg className="studio-heat-group-chart-svg" viewBox={`0 0 ${width} ${height}`} role="img">
      {model.theoreticalGamma !== null ? (
        <line x1={margin.left} x2={width - margin.right} y1={y(model.theoreticalGamma)} y2={y(model.theoreticalGamma)} className="studio-heat-chart-theory" />
      ) : null}
      {model.points.map((point, index) => {
        const uncertainty = point.typeAStandardUncertainty ?? 0;
        const label = point.scheme === 'ideal' ? copy.ideal : copy.real;
        const gas = point.gasType === 'helium' ? copy.helium : copy.air;
        return (
          <g key={point.groupId}>
            {uncertainty > 0 ? (
              <>
                <line x1={x(index)} x2={x(index)} y1={y(point.meanGamma - uncertainty)} y2={y(point.meanGamma + uncertainty)} className="studio-heat-chart-error" />
                <line x1={x(index) - 5} x2={x(index) + 5} y1={y(point.meanGamma - uncertainty)} y2={y(point.meanGamma - uncertainty)} className="studio-heat-chart-error" />
                <line x1={x(index) - 5} x2={x(index) + 5} y1={y(point.meanGamma + uncertainty)} y2={y(point.meanGamma + uncertainty)} className="studio-heat-chart-error" />
              </>
            ) : null}
            <circle
              cx={x(index)}
              cy={y(point.meanGamma)}
              r={point.completed ? 6 : 5}
              className={`studio-heat-chart-dot studio-heat-chart-dot-${point.scheme} ${point.completed ? '' : 'studio-heat-chart-dot-in-progress'}`}
            >
              <title>{`${label} · ${gas} · ${copy.group} ${point.schemeGroupNumber}: γ̄ = ${point.meanGamma.toFixed(5)}`}</title>
            </circle>
            <text x={x(index)} y={height - 30} textAnchor="middle" className="studio-heat-chart-axis-label">
              {label}{point.schemeGroupNumber}·{gas}
            </text>
          </g>
        );
      })}
      <text x={margin.left} y={16} className="studio-heat-chart-legend">{copy.real} / {copy.ideal}</text>
      {model.theoreticalGamma !== null ? <text x={margin.left + 120} y={16} className="studio-heat-chart-legend studio-heat-chart-legend-theory">{copy.theory}</text> : null}
    </svg>
  );
};

export default HeatCapacityAllGroupsOverviewChart;
