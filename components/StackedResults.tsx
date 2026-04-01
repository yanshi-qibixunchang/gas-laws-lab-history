import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { ChartData, HistogramBin, Translation } from '../types';
import DistributionCharts from './DistributionCharts';

interface StackedResultsProps {
  data: ChartData;
  t: Translation;
  isDarkMode?: boolean;
  supportsHover?: boolean;
}

interface SummaryMetric {
  label: string;
  value: string;
  formula: string;
}

const meanAbsoluteDifference = (bins: HistogramBin[]) => {
  const differences = bins
    .map((bin) => {
      const theoretical = bin.theoretical;
      if (typeof theoretical !== 'number' || !Number.isFinite(theoretical)) return null;
      const difference = Math.abs(bin.probability - theoretical);
      return Number.isFinite(difference) ? difference : null;
    })
    .filter((value): value is number => value !== null);

  if (differences.length === 0) return null;
  return differences.reduce((sum, value) => sum + value, 0) / differences.length;
};

const meanAbsoluteValue = (values: number[]) => {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (filtered.length === 0) return null;
  return filtered.reduce((sum, value) => sum + Math.abs(value), 0) / filtered.length;
};

const energyDriftAmplitude = (values: number[]) => {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (filtered.length === 0) return null;

  const mean = filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
  if (!Number.isFinite(mean) || mean === 0) return null;

  return ((Math.max(...filtered) - Math.min(...filtered)) / mean) * 100;
};

const formatMetricValue = (value: number | null, variant: 'density' | 'percent') => {
  if (value === null || !Number.isFinite(value)) return '--';

  if (variant === 'percent') {
    return `${value.toFixed(2)}%`;
  }

  if (Math.abs(value) >= 0.01) return value.toFixed(4);
  return value.toExponential(2);
};

const SummaryCard: React.FC<{
  metric: SummaryMetric;
  isDarkMode: boolean;
}> = ({ metric, isDarkMode }) => {
  const shellClass = isDarkMode
    ? 'border-slate-800/90 bg-slate-950/70'
    : 'border-slate-200/90 bg-white/92';
  const labelClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const valueClass = isDarkMode ? 'text-slate-50' : 'text-slate-900';
  const formulaClass = isDarkMode ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className={`rounded-[1.15rem] border px-4 py-3.5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.35)] ${shellClass}`}>
      <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${labelClass}`}>
        {metric.label}
      </div>
      <div className={`mt-2 font-data text-xl font-semibold ${valueClass}`}>
        {metric.value}
      </div>
      <div className={`mt-1 text-[11px] leading-5 ${formulaClass}`}>
        {metric.formula}
      </div>
    </div>
  );
};

const StackedResults: React.FC<StackedResultsProps> = ({
  data,
  t,
  isDarkMode = false,
  supportsHover = true,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const summaryShell = isDarkMode
    ? 'border-slate-800/90 bg-slate-950/74 text-slate-200'
    : 'border-slate-200/90 bg-white/94 text-slate-800';
  const detailShell = isDarkMode
    ? 'border-slate-800/90 bg-slate-950/74'
    : 'border-slate-200/90 bg-white/94';
  const hoverClass = supportsHover
    ? 'hover:border-sciblue-300 dark:hover:border-sciblue-700 hover:text-sciblue-600 dark:hover:text-sciblue-300'
    : '';

  const histogramHeight = isFullscreen ? 'h-[340px] md:h-[390px]' : 'h-[280px] sm:h-[300px] xl:h-[300px]';
  const semilogHeight = isFullscreen ? 'h-[360px] md:h-[400px]' : 'h-[300px] sm:h-[330px] xl:h-[320px]';
  const diagnosticHeight = isFullscreen ? 'h-[220px] md:h-[250px]' : 'h-[210px] sm:h-[220px] xl:h-[205px]';

  const metrics: SummaryMetric[] = [
    {
      label: t.charts.speedDeviation,
      value: formatMetricValue(meanAbsoluteDifference(data.speed), 'density'),
      formula: 'mean |dP(v)|',
    },
    {
      label: t.charts.energyDeviation,
      value: formatMetricValue(meanAbsoluteDifference(data.energy), 'density'),
      formula: 'mean |dP(E)|',
    },
    {
      label: t.charts.meanTempError,
      value: formatMetricValue(meanAbsoluteValue(data.tempHistory.map((point) => point.error)), 'percent'),
      formula: 'mean |dT/T|',
    },
    {
      label: t.charts.energyDrift,
      value: formatMetricValue(energyDriftAmplitude(data.tempHistory.map((point) => point.totalEnergy)), 'percent'),
      formula: '(Emax-Emin)/Emean',
    },
  ];

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((error) => {
        console.error(`Unable to enter fullscreen: ${error.message} (${error.name})`);
      });
      return;
    }

    document.exitFullscreen().catch(() => {
      // Ignore exit errors triggered by external state changes.
    });
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const twoColumnGridClass = isFullscreen ? 'grid items-start gap-4 2xl:grid-cols-2' : 'grid items-start gap-4 xl:grid-cols-2';
  const bottomRowGridClass = isFullscreen
    ? 'grid items-start gap-4 2xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]'
    : 'grid items-start gap-4 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]';

  return (
    <div
      ref={containerRef}
      className={`relative ${isFullscreen ? 'min-h-screen overflow-auto bg-slate-50 px-4 py-6 dark:bg-slate-950 md:px-8 md:py-8' : ''}`}
    >
      <div className={`${isFullscreen ? 'mx-auto max-w-[1540px]' : ''}`}>
        <button
          onClick={toggleFullscreen}
          className={`absolute right-0 top-0 z-20 inline-flex h-10 w-10 items-center justify-center rounded-[1rem] border border-slate-200 bg-white text-slate-500 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 ${hoverClass}`}
          title={isFullscreen ? t.common.collapse : t.common.expandAll}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>

        <div className="pr-14">
          <div className={`rounded-[1.5rem] border px-4 py-4 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.4)] md:px-5 md:py-5 ${summaryShell}`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                  {t.views.completed}
                </div>
                <h3 className="mt-1 text-base font-semibold tracking-[0.01em] md:text-lg">
                  {t.views.finalStats}
                </h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {`${t.charts.distributions} + ${t.charts.diagnostics}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200/90 bg-white/88 px-3 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-300">
                  {t.charts.simulation}
                </span>
                <span className="rounded-full border border-slate-200/90 bg-white/88 px-3 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-300">
                  {t.charts.theory}
                </span>
                <span className="rounded-full border border-slate-200/90 bg-white/88 px-3 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-300">
                  {t.charts.timeX}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            <div className={twoColumnGridClass}>
              <DistributionCharts
                data={data}
                type="speed"
                isFinal={true}
                t={t}
                heightClass={histogramHeight}
                isDarkMode={isDarkMode}
              />
              <DistributionCharts
                data={data}
                type="energy"
                isFinal={true}
                t={t}
                heightClass={histogramHeight}
                isDarkMode={isDarkMode}
              />
            </div>

            <div className={bottomRowGridClass}>
              <div className="grid gap-4">
                <DistributionCharts
                  data={data}
                  type="semilog"
                  isFinal={true}
                  t={t}
                  heightClass={semilogHeight}
                  isDarkMode={isDarkMode}
                />

                <div className={`rounded-[1.5rem] border px-4 py-4 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.4)] md:px-5 md:py-5 ${detailShell}`}>
                  <div className="border-b border-slate-200/80 pb-3 dark:border-slate-800">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                      {t.views.completed}
                    </div>
                    <h3 className="mt-1 text-base font-semibold tracking-[0.01em] text-slate-900 dark:text-slate-50 md:text-lg">
                      {t.charts.summaryMetrics}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {`${t.charts.speedDeviation} / ${t.charts.energyDeviation}`}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {metrics.map((metric) => (
                      <SummaryCard key={metric.label} metric={metric} isDarkMode={isDarkMode} />
                    ))}
                  </div>
                </div>
              </div>

              <div
                className={`rounded-[1.5rem] border px-4 py-4 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.4)] md:px-5 md:py-5 ${detailShell}`}
              >
                <div className="border-b border-slate-200/80 pb-3 dark:border-slate-800">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                    {t.views.completed}
                  </div>
                  <h3 className="mt-1 text-base font-semibold tracking-[0.01em] text-slate-900 dark:text-slate-50 md:text-lg">
                    {t.charts.diagnostics}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {`${t.charts.totalEnergy} / ${t.charts.tempError}`}
                  </p>
                </div>

                <div className="mt-4 grid gap-4">
                  <DistributionCharts
                    data={data}
                    type="totalEnergy"
                    t={t}
                    heightClass={diagnosticHeight}
                    isDarkMode={isDarkMode}
                    embedded={true}
                  />
                  <DistributionCharts
                    data={data}
                    type="tempError"
                    t={t}
                    heightClass={diagnosticHeight}
                    isDarkMode={isDarkMode}
                    embedded={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StackedResults;
