import React from 'react';
import { AppMode, Translation } from '../types';

interface ModeSwitchProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
  t: Translation;
  isDarkMode?: boolean;
  supportsHover?: boolean;
}

const ModeSwitch: React.FC<ModeSwitchProps> = ({
  mode,
  onChange,
  t,
  isDarkMode = false,
  supportsHover = true,
}) => {
  const shellClass = isDarkMode
    ? 'border-slate-700 bg-slate-950'
    : 'border-slate-200 bg-white';
  const labelClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const activeClass = isDarkMode
    ? 'border-sciblue-500/80 bg-sciblue-950 text-sciblue-200'
    : 'border-sciblue-300 bg-sciblue-50 text-sciblue-700';
  const inactiveClass = isDarkMode
    ? 'border-transparent bg-transparent text-slate-300'
    : 'border-transparent bg-transparent text-slate-500';
  const hoverClass = supportsHover
    ? isDarkMode
      ? 'hover:border-slate-600 hover:text-slate-100'
      : 'hover:border-slate-200 hover:text-slate-700'
    : '';

  return (
    <div className={`inline-flex w-full max-w-[19rem] flex-col gap-2 rounded-panel border px-3 py-3 shadow-sm backdrop-blur-sm ${shellClass}`}>
      <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${labelClass}`}>
        {t.experiment.modeLabel}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {([
          { key: 'standard', label: t.experiment.standardMode },
          { key: 'experiment', label: t.experiment.experimentMode },
        ] as const).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={`rounded-panel border px-3 py-2 text-sm font-semibold transition-colors ${
              mode === item.key ? activeClass : `${inactiveClass} ${hoverClass}`
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ModeSwitch;
