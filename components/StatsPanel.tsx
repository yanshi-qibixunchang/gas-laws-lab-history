import React from 'react';
import { LanguageCode, SimulationStats, Translation } from '../types';
import { Activity, Gauge, Thermometer, Wind } from 'lucide-react';

interface StatsPanelProps {
  stats: SimulationStats;
  eqTime: number;
  statDuration: number;
  t: Translation;
  lang: LanguageCode;
  supportsHover?: boolean;
}

interface StatItemProps {
  label: React.ReactNode;
  value: number;
  unit: string;
  icon: React.ReactElement;
  colorClass?: string;
  isEnglishUI?: boolean;
  supportsHover?: boolean;
}

interface ProgressBarProps {
  progress: number;
  dividerProgress: number;
  firstStageLabel: string;
  secondStageLabel: string;
  isEnglishUI: boolean;
}

const renderRmsLabel = (label: string) => {
  const token = 'v_rms';
  const tokenIndex = label.indexOf(token);
  if (tokenIndex === -1) return label;
  const before = label.slice(0, tokenIndex).trimEnd();
  const after = label.slice(tokenIndex + token.length).trimStart();
  return (
    <span className="inline-flex items-baseline gap-0.5 whitespace-nowrap">
      {before && <span className="mr-0.5">{before}</span>}
      <span className="font-mono">v</span>
      <sub className="relative -bottom-0.5 text-[9px] font-semibold normal-case">rms</sub>
      {after && <span className="ml-0.5">{after}</span>}
    </span>
  );
};

const StatItem = ({
  label,
  value,
  unit,
  icon,
  colorClass = 'text-sciblue-500',
  isEnglishUI = false,
  supportsHover = true
}: StatItemProps) => (
  <div
    className={`group relative flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur-md transition-shadow dark:border-slate-700 dark:bg-slate-800/60 ${supportsHover ? 'hover:shadow-md' : ''}`}
  >
    <div className={`absolute right-0 top-0 p-1.5 opacity-10 transition-opacity ${colorClass} ${supportsHover ? 'group-hover:opacity-20' : ''}`}>
      {React.cloneElement(icon, { size: 32 })}
    </div>

    <div className={`mb-1 flex items-center gap-2 whitespace-nowrap text-slate-600 dark:text-slate-400 ${isEnglishUI ? 'font-data text-[10px] font-bold uppercase tracking-[0.08em]' : 'text-[11px] font-semibold tracking-[0.04em]'}`}>
      <span className={colorClass}>{React.cloneElement(icon, { size: 12 })}</span>
      {label}
    </div>

    <div className="mt-auto flex items-baseline gap-1 font-mono text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 md:text-2xl">
      {value.toFixed(3)}
      <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-500">{unit}</span>
    </div>

  <div className={`absolute bottom-0 left-0 h-0.5 w-8 opacity-40 ${colorClass.replace('text-', 'bg-')}`} />
  </div>
);

const ProgressBar = ({
  progress,
  dividerProgress,
  firstStageLabel,
  secondStageLabel,
  isEnglishUI
}: ProgressBarProps) => {
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  const normalizedDivider = Math.min(100, Math.max(0, dividerProgress));
  const firstStageFillScale = normalizedDivider > 0
    ? Math.min(normalizedProgress, normalizedDivider) / normalizedDivider
    : 0;
  const secondStageFillScale = normalizedDivider < 100 && normalizedProgress > normalizedDivider
    ? (normalizedProgress - normalizedDivider) / (100 - normalizedDivider)
    : 0;
  const secondStageWidth = `${Math.max(0, 100 - normalizedDivider)}%`;
  const currentMarkerLeft =
    normalizedProgress <= 0
      ? '0%'
      : normalizedProgress >= 100
        ? 'calc(100% - 12px)'
        : `calc(${normalizedProgress}% - 6px)`;
  const dividerLeft =
    normalizedDivider <= 0
      ? '0%'
      : normalizedDivider >= 100
        ? 'calc(100% - 1px)'
        : `calc(${normalizedDivider}% - 1px)`;
  return (
    <div className="space-y-2">
      <div className="relative h-3 overflow-hidden rounded-full border border-slate-300/60 bg-slate-100/90 dark:border-slate-700/50 dark:bg-slate-800/75">
        <div className="absolute inset-y-[1px] left-[1px] right-[1px] rounded-full bg-gradient-to-r from-white/70 to-white/30 dark:from-slate-700/25 dark:to-slate-700/10" />
        <div
          className="absolute inset-y-0 left-0 overflow-hidden rounded-full"
          style={{ width: `${normalizedDivider}%` }}
        >
          <div
            className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-amber-500 to-orange-400 will-change-transform"
            style={{ transform: `scaleX(${firstStageFillScale})` }}
          >
            <div className="absolute inset-0 bg-white/15" />
          </div>
        </div>
        <div
          className="absolute inset-y-0 overflow-hidden"
          style={{ left: `${normalizedDivider}%`, width: secondStageWidth }}
        >
          <div
            className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 will-change-transform"
            style={{ transform: `scaleX(${secondStageFillScale})` }}
          >
            <div className="absolute inset-0 bg-white/12" />
          </div>
        </div>
        <div className="absolute inset-y-[-2px] z-10 w-[2px] rounded-full bg-slate-500/70 dark:bg-slate-300/80 shadow-[0_0_0_2px_rgba(255,255,255,0.45)] dark:shadow-[0_0_0_2px_rgba(15,23,42,0.8)]" style={{ left: dividerLeft }} />
        <div
          className="absolute top-1/2 z-20 h-3 w-3 -translate-y-1/2 rounded-full border border-white/90 bg-white shadow-[0_0_0_3px_rgba(14,165,233,0.18)] dark:border-slate-900 dark:bg-slate-100 dark:shadow-[0_0_0_3px_rgba(14,165,233,0.32)]"
          style={{ left: currentMarkerLeft }}
        />
      </div>
      <div className={`flex items-center justify-between gap-3 text-slate-500 dark:text-slate-400 ${isEnglishUI ? 'text-[10px] font-bold uppercase tracking-[0.14em]' : 'text-[11px] font-semibold tracking-[0.04em]'}`}>
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
          <span className="truncate">{firstStageLabel}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2 text-right">
          <span className="truncate">{secondStageLabel}</span>
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
        </div>
      </div>
    </div>
  );
};

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, eqTime, statDuration, t, lang, supportsHover = true }) => {
  const isEnglishUI = lang.startsWith('en');
  const totalDuration = eqTime + statDuration;
  const phaseDuration =
    stats.phase === 'equilibrating'
      ? eqTime
      : stats.phase === 'collecting'
        ? statDuration
        : stats.phase === 'finished'
          ? statDuration
          : eqTime;
  const phaseElapsed =
    stats.phase === 'equilibrating'
      ? Math.min(stats.time, eqTime)
      : stats.phase === 'collecting'
        ? Math.max(0, Math.min(stats.time - eqTime, statDuration))
        : stats.phase === 'finished'
          ? statDuration
          : 0;
  const totalElapsed = Math.max(0, Math.min(stats.time, totalDuration));
  const remainingPhaseTime =
    stats.phase === 'equilibrating' || stats.phase === 'collecting'
      ? Math.max(0, phaseDuration - phaseElapsed)
      : 0;
  const isFinished = stats.phase === 'finished';
  const phaseProgress = phaseDuration > 0 ? Math.min(100, Math.max(0, (phaseElapsed / phaseDuration) * 100)) : (isFinished ? 100 : 0);
  const overallProgress = totalDuration > 0 ? Math.min(100, Math.max(0, (totalElapsed / totalDuration) * 100)) : 0;

  let progressColor = 'bg-slate-400';
  let statusText = t.stats.idle;
  let statusColor = 'text-slate-600 dark:text-slate-400';

  if (stats.phase === 'equilibrating') {
    progressColor = 'bg-amber-500';
    statusText = t.stats.equilibrating;
    statusColor = 'text-amber-700 dark:text-amber-500';
  } else if (stats.phase === 'collecting') {
    progressColor = 'bg-emerald-500';
    statusText = t.stats.collecting;
    statusColor = 'text-emerald-700 dark:text-emerald-500';
  } else if (stats.phase === 'finished') {
    progressColor = 'bg-sciblue-600';
    statusText = t.stats.finished;
    statusColor = 'text-sciblue-700 dark:text-sciblue-500';
  }

  const phaseDurationLabel = `${phaseElapsed.toFixed(1)} / ${phaseDuration.toFixed(1)}s`;
  const totalDurationLabel = `${totalElapsed.toFixed(1)} / ${totalDuration.toFixed(1)}s`;
  const metaLabelClass = isEnglishUI
    ? 'text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400'
    : 'text-[11px] font-semibold tracking-[0.04em] text-slate-500 dark:text-slate-400';
  const statCardLabelClass = isEnglishUI
    ? 'mb-1 text-[9px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500'
    : 'mb-1 text-[10px] tracking-[0.04em] text-slate-400 dark:text-slate-500';

  return (
    <div className="overflow-visible opacity-100 transition-opacity duration-500 ease-out">
      <div className="grid w-full grid-cols-2 gap-3 pt-4 md:grid-cols-4">
        <StatItem label={t.stats.temperature} value={stats.temperature} unit="K" icon={<Thermometer />} colorClass="text-rose-500 dark:text-rose-400" isEnglishUI={isEnglishUI} supportsHover={supportsHover} />
        <StatItem label={t.stats.pressure} value={stats.pressure} unit="Pa" icon={<Gauge />} colorClass="text-violet-500 dark:text-violet-400" isEnglishUI={isEnglishUI} supportsHover={supportsHover} />
        <StatItem label={t.stats.meanSpeed} value={stats.meanSpeed} unit="m/s" icon={<Wind />} colorClass="text-sciblue-500 dark:text-sciblue-400" isEnglishUI={isEnglishUI} supportsHover={supportsHover} />
        <StatItem label={renderRmsLabel(t.stats.rmsSpeed)} value={stats.rmsSpeed} unit="m/s" icon={<Activity />} colorClass="text-emerald-500 dark:text-emerald-400" isEnglishUI={isEnglishUI} supportsHover={supportsHover} />

        <div className="col-span-2 mt-2 rounded-lg border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/60 md:col-span-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className={`flex items-center gap-2 ${statusColor} ${isEnglishUI ? 'font-data text-[10px] font-bold uppercase tracking-[0.14em]' : 'text-[11px] font-semibold tracking-[0.04em]'}`}>
              <span className={`h-1.5 w-1.5 rounded-sm ${progressColor} animate-pulse`} />
              <span>{t.stats.status}: {statusText}</span>
            </div>
            <div className={metaLabelClass}>
              {isFinished ? `${t.stats.remaining}: ${t.stats.done}` : `${t.stats.remaining}: ${remainingPhaseTime.toFixed(1)}s`}
            </div>
          </div>

          <div className={`mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 ${metaLabelClass}`}>
            <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 dark:border-slate-700/80 dark:bg-slate-800/60">
              <div className={statCardLabelClass}>{t.stats.phaseTime}</div>
              <div className="font-mono text-xs text-slate-700 dark:text-slate-200">{phaseDurationLabel}</div>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 dark:border-slate-700/80 dark:bg-slate-800/60">
              <div className={statCardLabelClass}>{t.stats.overallTime}</div>
              <div className="font-mono text-xs text-slate-700 dark:text-slate-200">{totalDurationLabel}</div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className={`mb-1 flex items-center justify-between ${metaLabelClass}`}>
                <span>{t.stats.overallProgress}</span>
                <span className="font-mono">{overallProgress.toFixed(0)}%</span>
              </div>
              <ProgressBar
                progress={overallProgress}
                dividerProgress={totalDuration > 0 ? (eqTime / totalDuration) * 100 : 0}
                firstStageLabel={t.stats.equilibrating}
                secondStageLabel={t.stats.collecting}
                isEnglishUI={isEnglishUI}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
