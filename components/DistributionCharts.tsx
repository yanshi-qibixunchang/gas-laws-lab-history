import React, { useId } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartData, Translation } from '../types';

interface ChartProps {
  data: ChartData;
  type: 'speed' | 'energy' | 'semilog' | 'tempError' | 'totalEnergy';
  isFinal?: boolean;
  t: Translation;
  heightClass?: string;
  isDarkMode?: boolean;
  embedded?: boolean;
}

interface LegendItem {
  label: string;
  color: string;
  tone: 'bar' | 'line' | 'dot' | 'area';
}

const formatAxisValue = (value: number) => {
  if (!Number.isFinite(value)) return '--';

  const absolute = Math.abs(value);
  if (absolute >= 1000 || (absolute > 0 && absolute < 0.01)) {
    return value.toExponential(1);
  }
  if (absolute >= 100) return value.toFixed(0);
  if (absolute >= 10) return value.toFixed(1);
  return value.toFixed(2);
};

const formatTooltipValue = (value: number) => {
  if (!Number.isFinite(value)) return '--';

  const absolute = Math.abs(value);
  if (absolute >= 1000 || (absolute > 0 && absolute < 0.0001)) {
    return value.toExponential(2);
  }
  if (absolute >= 100) return value.toFixed(2);
  if (absolute >= 1) return value.toFixed(3);
  return value.toFixed(4);
};

const buildDomain = (values: number[], includeZero = false) => {
  if (values.length === 0) {
    return includeZero ? [-1, 1] : [0, 1];
  }

  let min = Math.min(...values);
  let max = Math.max(...values);

  if (includeZero) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }

  const span = max - min;
  const fallbackSpan = Math.max(Math.abs(max), 1);
  const padding = (span === 0 ? fallbackSpan : span) * 0.12;

  return [min - padding, max + padding];
};

const LegendBadge: React.FC<{ item: LegendItem; isDarkMode: boolean }> = ({ item, isDarkMode }) => {
  const badgeBase = isDarkMode ? 'border-slate-700/80 bg-slate-900/60 text-slate-300' : 'border-slate-200/90 bg-white/88 text-slate-600';

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.01em] ${badgeBase}`}
    >
      <span className="relative inline-flex h-2.5 w-2.5 items-center justify-center">
        {item.tone === 'bar' && (
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: item.color, opacity: 0.88 }} />
        )}
        {item.tone === 'line' && (
          <span className="h-[2px] w-3 rounded-full" style={{ backgroundColor: item.color }} />
        )}
        {item.tone === 'dot' && (
          <span className="h-2.5 w-2.5 rounded-full border border-white/60" style={{ backgroundColor: item.color }} />
        )}
        {item.tone === 'area' && (
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 0 3px ${item.color}20` }} />
        )}
      </span>
      <span>{item.label}</span>
    </span>
  );
};

const ChartTooltip = ({
  active,
  payload,
  label,
  isDarkMode,
  headerLabel,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; color?: string; value?: number }>;
  label?: number;
  isDarkMode: boolean;
  headerLabel: string;
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const tooltipShell = isDarkMode
    ? 'border-slate-700/90 bg-slate-950/92 text-slate-200 shadow-[0_20px_55px_-28px_rgba(15,23,42,0.92)]'
    : 'border-slate-200/90 bg-white/96 text-slate-900 shadow-[0_20px_55px_-28px_rgba(15,23,42,0.28)]';
  const tooltipMuted = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`min-w-[150px] rounded-panel border px-3 py-2.5 text-[11px] ${tooltipShell}`}>
      <div className="border-b border-slate-200/70 pb-2 dark:border-slate-800">
        <div className={`text-[10px] uppercase tracking-[0.18em] ${tooltipMuted}`}>{headerLabel}</div>
        <div className="mt-1 font-data text-sm font-semibold">{formatTooltipValue(Number(label))}</div>
      </div>
      <div className="mt-2 space-y-1.5">
        {payload
          .filter((entry) => entry.value !== undefined && entry.value !== null)
          .map((entry, index) => (
            <div key={`${entry.name}-${index}`} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-2.5 w-2.5 rounded-full border border-white/70"
                  style={{ backgroundColor: entry.color || '#94a3b8' }}
                />
                <span className={tooltipMuted}>{entry.name}</span>
              </div>
              <span className="font-data font-semibold">{formatTooltipValue(Number(entry.value))}</span>
            </div>
          ))}
      </div>
    </div>
  );
};

const DistributionCharts: React.FC<ChartProps> = ({
  data,
  type,
  isFinal = false,
  t,
  heightClass = 'h-[260px]',
  isDarkMode = false,
  embedded = false,
}) => {
  const chartId = useId().replace(/:/g, '');
  const theme = isDarkMode
    ? {
        surface: embedded ? 'bg-slate-900/72' : 'bg-slate-950/78',
        plotSurface: '#0f172a',
        border: 'border-slate-800/80',
        title: 'text-slate-50',
        eyebrow: 'text-slate-400',
        body: 'text-slate-300',
        grid: '#253247',
        axis: '#8fa0b5',
        axisStrong: '#dce7f5',
        axisLine: '#334155',
        simulation: '#7aa6ff',
        theory: '#ff6b6b',
        energy: '#9a8cff',
        warning: '#ffb23f',
        reference: '#8ea0b8',
        referenceText: '#cbd5e1',
        badgeBackground: 'from-slate-900/82 to-slate-900/60',
      }
    : {
        surface: embedded ? 'bg-slate-50/86' : 'bg-white/94',
        plotSurface: '#f8fbff',
        border: 'border-slate-200/85',
        title: 'text-slate-900',
        eyebrow: 'text-slate-400',
        body: 'text-slate-600',
        grid: '#d9e3ef',
        axis: '#607086',
        axisStrong: '#0f172a',
        axisLine: '#bfd0e2',
        simulation: '#4f7fe8',
        theory: '#d84b4b',
        energy: '#7c69ff',
        warning: '#d48a00',
        reference: '#94a3b8',
        referenceText: '#475569',
        badgeBackground: 'from-white/92 to-white/72',
      };

  const axisTickStyle = {
    fill: theme.axis,
    fontSize: 10,
    fontFamily: 'var(--app-font-data)',
    fontWeight: 500,
  };

  const axisLabelStyle = {
    fill: theme.axisStrong,
    fontSize: 11,
    fontFamily: 'inherit',
    fontWeight: 600,
  };

  const histogramSource = type === 'speed' ? data.speed : data.energy;
  const histogramData = histogramSource.map((bin) => ({
    position: (bin.binStart + bin.binEnd) / 2,
    simulation: bin.probability,
    theory: bin.theoretical || 0,
  }));
  const histogramYMax = Math.max(
    0.01,
    ...histogramData.flatMap((point) => [point.simulation, point.theory]),
  );

  const semilogData = data.energyLog.map((point) => ({
    position: point.energy,
    simulation: point.logProb,
    theory: point.theoreticalLog,
  }));
  const semilogDomain = buildDomain(
    semilogData.flatMap((point) => [point.simulation, point.theory]),
    false,
  );

  const totalEnergyMean =
    data.tempHistory.length > 0
      ? data.tempHistory.reduce((sum, point) => sum + point.totalEnergy, 0) / data.tempHistory.length
      : null;
  const totalEnergyDomain = buildDomain(
    data.tempHistory.map((point) => point.totalEnergy),
    false,
  );
  const tempErrorDomain = buildDomain(
    data.tempHistory.map((point) => point.error),
    true,
  );

  const titleMap: Record<ChartProps['type'], string> = {
    speed: isFinal ? t.charts.avgSpeed : t.charts.instSpeed,
    energy: isFinal ? t.charts.avgEnergy : t.charts.instEnergy,
    semilog: t.charts.semilog,
    tempError: t.charts.tempError,
    totalEnergy: t.charts.totalEnergy,
  };

  const eyebrowMap: Record<ChartProps['type'], string> = {
    speed: isFinal ? t.views.completed : t.views.realtimeCharts,
    energy: isFinal ? t.views.completed : t.views.realtimeCharts,
    semilog: t.views.completed,
    tempError: t.charts.diagnostics,
    totalEnergy: t.charts.diagnostics,
  };

  const tooltipHeaderMap: Record<ChartProps['type'], string> = {
    speed: t.charts.speedX,
    energy: t.charts.energyX,
    semilog: t.charts.energyX,
    tempError: t.charts.timeX,
    totalEnergy: t.charts.timeX,
  };

  const legendMap: Record<ChartProps['type'], LegendItem[]> = {
    speed: [
      { label: t.charts.simulation, color: theme.simulation, tone: 'bar' },
      { label: t.charts.theory, color: theme.theory, tone: 'line' },
    ],
    energy: [
      { label: t.charts.simulation, color: theme.simulation, tone: 'bar' },
      { label: t.charts.theory, color: theme.theory, tone: 'line' },
    ],
    semilog: [
      { label: t.charts.simulation, color: theme.simulation, tone: 'dot' },
      { label: t.charts.theory, color: theme.theory, tone: 'line' },
    ],
    tempError: [{ label: t.charts.tempError, color: theme.warning, tone: 'area' }],
    totalEnergy: [{ label: t.charts.totalEnergy, color: theme.energy, tone: 'area' }],
  };

  const shellClass = embedded
    ? `rounded-panel border ${theme.border} ${theme.surface} px-3.5 py-3.5 md:px-4 md:py-4`
    : `rounded-panel border ${theme.border} ${theme.surface} px-4 py-4 shadow-[0_20px_48px_-34px_rgba(15,23,42,0.42)] md:px-5 md:py-5`;
  const plotAreaClass = embedded ? 'mt-3' : 'mt-4';

  const commonMargin = embedded
    ? { top: 8, right: 12, left: 0, bottom: 12 }
    : { top: 8, right: 14, left: 0, bottom: 14 };

  const renderHistogram = () => (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={histogramData} margin={commonMargin}>
        <defs>
          <linearGradient id={`${chartId}-${type}-bar`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={theme.simulation} stopOpacity={0.92} />
            <stop offset="100%" stopColor={theme.simulation} stopOpacity={0.38} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="4 5" />
        <XAxis
          dataKey="position"
          tick={axisTickStyle}
          tickLine={false}
          axisLine={{ stroke: theme.axisLine }}
          tickFormatter={formatAxisValue}
          height={36}
          minTickGap={16}
          tickMargin={8}
          label={{ value: type === 'speed' ? t.charts.speedX : t.charts.energyX, position: 'bottom', offset: 2, ...axisLabelStyle }}
        />
        <YAxis
          tick={axisTickStyle}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatAxisValue}
          width={48}
          tickMargin={8}
          domain={[0, histogramYMax * 1.12]}
          label={{ value: t.charts.probY, angle: -90, position: 'insideLeft', offset: 6, ...axisLabelStyle }}
        />
        <Tooltip
          cursor={{ fill: isDarkMode ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.06)' }}
          content={<ChartTooltip isDarkMode={isDarkMode} headerLabel={tooltipHeaderMap[type]} />}
        />
        <Bar
          dataKey="simulation"
          name={t.charts.simulation}
          fill={`url(#${chartId}-${type}-bar)`}
          stroke={theme.simulation}
          strokeWidth={0.6}
          radius={[4, 4, 0, 0]}
          maxBarSize={18}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="theory"
          name={t.charts.theory}
          stroke={theme.theory}
          strokeWidth={2.2}
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );

  const renderSemilog = () => (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={semilogData} margin={commonMargin}>
        <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="4 5" />
        <XAxis
          type="number"
          dataKey="position"
          tick={axisTickStyle}
          tickLine={false}
          axisLine={{ stroke: theme.axisLine }}
          tickFormatter={formatAxisValue}
          height={36}
          minTickGap={20}
          tickMargin={8}
          domain={['dataMin', 'dataMax']}
          label={{ value: t.charts.energyX, position: 'bottom', offset: 2, ...axisLabelStyle }}
        />
        <YAxis
          type="number"
          dataKey="simulation"
          tick={axisTickStyle}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatAxisValue}
          width={56}
          tickMargin={8}
          domain={semilogDomain}
          label={{ value: 'ln(P)', angle: -90, position: 'insideLeft', offset: 6, ...axisLabelStyle }}
        />
        <Tooltip
          cursor={{ stroke: theme.axisLine, strokeDasharray: '4 4' }}
          content={<ChartTooltip isDarkMode={isDarkMode} headerLabel={tooltipHeaderMap[type]} />}
        />
        <Line
          type="monotone"
          dataKey="theory"
          name={t.charts.theory}
          stroke={theme.theory}
          strokeWidth={2.2}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="linear"
          dataKey="simulation"
          name={t.charts.simulation}
          stroke={theme.simulation}
          strokeOpacity={0}
          strokeWidth={0}
          dot={{ r: 3.4, fill: theme.simulation, stroke: isDarkMode ? '#0f172a' : '#ffffff', strokeWidth: 1.2 }}
          activeDot={{ r: 4.6, fill: theme.simulation, stroke: isDarkMode ? '#0f172a' : '#ffffff', strokeWidth: 1.4 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );

  const renderTempError = () => (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data.tempHistory} margin={commonMargin}>
        <defs>
          <linearGradient id={`${chartId}-${type}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={theme.warning} stopOpacity={0.28} />
            <stop offset="100%" stopColor={theme.warning} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="4 5" />
        <XAxis
          dataKey="time"
          tick={axisTickStyle}
          tickLine={false}
          axisLine={{ stroke: theme.axisLine }}
          tickFormatter={formatAxisValue}
          height={36}
          minTickGap={18}
          tickMargin={8}
          label={{ value: t.charts.timeX, position: 'bottom', offset: 2, ...axisLabelStyle }}
        />
        <YAxis
          tick={axisTickStyle}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatAxisValue}
          width={54}
          tickMargin={8}
          domain={tempErrorDomain}
          label={{ value: t.charts.errorY, angle: -90, position: 'insideLeft', offset: 6, ...axisLabelStyle }}
        />
        <ReferenceLine y={0} stroke={theme.reference} strokeDasharray="5 4" ifOverflow="extendDomain" />
        <Tooltip content={<ChartTooltip isDarkMode={isDarkMode} headerLabel={tooltipHeaderMap[type]} />} />
        <Area
          type="monotone"
          dataKey="error"
          name={t.charts.tempError}
          stroke={theme.warning}
          strokeWidth={2.2}
          fill={`url(#${chartId}-${type}-fill)`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderTotalEnergy = () => (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data.tempHistory} margin={commonMargin}>
        <defs>
          <linearGradient id={`${chartId}-${type}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={theme.energy} stopOpacity={0.24} />
            <stop offset="100%" stopColor={theme.energy} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="4 5" />
        <XAxis
          dataKey="time"
          tick={axisTickStyle}
          tickLine={false}
          axisLine={{ stroke: theme.axisLine }}
          tickFormatter={formatAxisValue}
          height={36}
          minTickGap={18}
          tickMargin={8}
          label={{ value: t.charts.timeX, position: 'bottom', offset: 2, ...axisLabelStyle }}
        />
        <YAxis
          tick={axisTickStyle}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatAxisValue}
          width={54}
          tickMargin={8}
          domain={totalEnergyDomain}
          label={{ value: t.charts.energyY, angle: -90, position: 'insideLeft', offset: 6, ...axisLabelStyle }}
        />
        {totalEnergyMean !== null && (
          <ReferenceLine
            y={totalEnergyMean}
            stroke={theme.reference}
            strokeDasharray="5 4"
            ifOverflow="extendDomain"
            label={{
              value: 'E_mean',
              position: 'insideTopRight',
              fill: theme.referenceText,
              fontSize: 10,
              fontFamily: 'var(--app-font-data)',
            }}
          />
        )}
        <Tooltip content={<ChartTooltip isDarkMode={isDarkMode} headerLabel={tooltipHeaderMap[type]} />} />
        <Area
          type="monotone"
          dataKey="totalEnergy"
          name={t.charts.totalEnergy}
          stroke={theme.energy}
          strokeWidth={2.2}
          fill={`url(#${chartId}-${type}-fill)`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderChart = () => {
    if (type === 'speed' || type === 'energy') return renderHistogram();
    if (type === 'semilog') return renderSemilog();
    if (type === 'tempError') return renderTempError();
    return renderTotalEnergy();
  };

  return (
    <div className={`w-full ${shellClass}`}>
      <div className={`rounded-panel border border-transparent bg-gradient-to-b ${theme.badgeBackground}`}>
        <div className={embedded ? 'pb-2.5' : 'pb-3'}>
          <div className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${theme.eyebrow}`}>
            {eyebrowMap[type]}
          </div>
          <div className="mt-1.5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h4 className={`text-sm font-semibold tracking-[0.01em] md:text-[15px] ${theme.title}`}>
                {titleMap[type]}
              </h4>
              <p className={`mt-1 text-xs leading-5 ${theme.body}`}>
                {type === 'speed' || type === 'energy'
                  ? `${t.charts.simulation} vs ${t.charts.theory}`
                  : type === 'semilog'
                    ? `ln(P) vs ${t.charts.energyX}`
                    : t.charts.timeX}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {legendMap[type].map((item) => (
                <LegendBadge key={`${type}-${item.label}`} item={item} isDarkMode={isDarkMode} />
              ))}
            </div>
          </div>
        </div>
        <div
          className={`rounded-panel border ${theme.border} overflow-hidden`}
          style={{ backgroundColor: theme.plotSurface }}
        >
          <div className={`relative w-full ${plotAreaClass} ${heightClass}`}>{renderChart()}</div>
        </div>
      </div>
    </div>
  );
};

export default DistributionCharts;
