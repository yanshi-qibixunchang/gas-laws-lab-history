import React from 'react';
import { SimulationStats, Translation } from '../types';
import { Activity, Gauge, Thermometer, Wind } from 'lucide-react';

interface StatsPanelProps {
  stats: SimulationStats;
  eqTime: number;
  statDuration: number;
  t: Translation;
}

// Tech-styled Stat Item
const StatItem = ({ label, value, unit, icon, colorClass = "text-sciblue-500" }: any) => (
  <div className="flex flex-col bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm relative group overflow-hidden hover:shadow-md transition-shadow">
    <div className={`absolute top-0 right-0 p-1.5 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
        {React.cloneElement(icon, { size: 32 })}
    </div>
    
    {/* Label: Darkened from slate-400 to slate-600 for better contrast */}
    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1 text-[10px] uppercase tracking-widest font-bold font-mono">
      <span className={colorClass}>{React.cloneElement(icon, { size: 12 })}</span> {label}
    </div>
    
    <div className="text-xl md:text-2xl font-mono text-slate-900 dark:text-slate-100 font-bold tracking-tight flex items-baseline gap-1 mt-auto">
      {value.toFixed(3)} 
      {/* Unit: Darkened from slate-400 to slate-500 */}
      <span className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase">{unit}</span>
    </div>
    
    {/* Tech Corner Accent */}
    <div className={`absolute bottom-0 left-0 w-8 h-0.5 ${colorClass.replace('text-', 'bg-')} opacity-40`}></div>
  </div>
);

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, eqTime, statDuration, t }) => {
  const totalDuration = eqTime + statDuration;
  const remainingTime = Math.max(0, totalDuration - stats.time);
  const isFinished = stats.phase === 'finished';
  
  // Progress Bar Color Logic
  let progressColor = "bg-slate-400";
  let statusText = t.stats.idle;
  let statusColor = "text-slate-600 dark:text-slate-400";
  
  if (stats.phase === 'equilibrating') {
    progressColor = "bg-amber-500";
    statusText = t.stats.equilibrating;
    statusColor = "text-amber-700 dark:text-amber-500";
  } else if (stats.phase === 'collecting') {
    progressColor = "bg-emerald-500";
    statusText = t.stats.collecting;
    statusColor = "text-emerald-700 dark:text-emerald-500";
  } else if (stats.phase === 'finished') {
    progressColor = "bg-sciblue-600";
    statusText = t.stats.finished;
    statusColor = "text-sciblue-700 dark:text-sciblue-500";
  }

  // Animation container: When finished, reduce height to 0 and opacity to 0
  return (
    <div 
        className={`transition-all duration-700 ease-in-out overflow-hidden ${isFinished ? 'max-h-0 opacity-0' : 'max-h-[300px] opacity-100'}`}
    >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full pt-4">
           <StatItem label={t.stats.temperature} value={stats.temperature} unit="K" icon={<Thermometer/>} colorClass="text-rose-500 dark:text-rose-400"/>
           <StatItem label={t.stats.pressure} value={stats.pressure} unit="Pa" icon={<Gauge/>} colorClass="text-violet-500 dark:text-violet-400"/>
           <StatItem label={t.stats.meanSpeed} value={stats.meanSpeed} unit="m/s" icon={<Wind/>} colorClass="text-sciblue-500 dark:text-sciblue-400"/>
           <StatItem label={t.stats.rmsSpeed} value={stats.rmsSpeed} unit="m/s" icon={<Activity/>} colorClass="text-emerald-500 dark:text-emerald-400"/>

           {/* Status Bar - Tech Style */}
           <div className="col-span-2 md:col-span-4 mt-2 px-1">
             {/* Status Text: Darkened from slate-400 to slate-500 */}
             <div className="flex justify-between text-[10px] mb-2 font-bold tracking-wider font-mono uppercase">
                <span className={`flex items-center gap-2 ${statusColor}`}>
                   <span className={`w-1.5 h-1.5 rounded-sm ${progressColor} animate-pulse`}></span>
                   {t.stats.status}: {statusText}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                    {stats.phase !== 'finished' ? `TIME REMAINING: ${remainingTime.toFixed(1)}s` : t.stats.done}
                </span>
             </div>
             
             {/* Progress Track */}
             <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-sm h-1.5 overflow-hidden border border-slate-300/50 dark:border-slate-700/50">
                <div 
                    className={`h-full rounded-sm transition-all duration-300 ${progressColor} relative`} 
                    style={{ width: `${Math.min(100, (stats.time / totalDuration) * 100)}%` }}
                >
                    {/* Gloss effect on bar */}
                    <div className="absolute inset-0 bg-white/20"></div>
                </div>
             </div>
           </div>
        </div>
    </div>
  );
};

export default StatsPanel;