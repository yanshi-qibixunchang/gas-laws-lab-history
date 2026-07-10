import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type {
  HeatCapacityFreeDisplayScheme,
} from '../workbench/workbenchState.ts';

interface HeatCapacityFreeDisplaySchemeMenuProps {
  value: HeatCapacityFreeDisplayScheme;
  label: string;
  realLabel: string;
  idealLabel: string;
  realHint?: string;
  idealHint?: string;
  onChange: (scheme: HeatCapacityFreeDisplayScheme) => void;
}

export const HeatCapacityFreeDisplaySchemeMenu = ({
  value,
  label,
  realLabel,
  idealLabel,
  realHint,
  idealHint,
  onChange,
}: HeatCapacityFreeDisplaySchemeMenuProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const activeOption = value === 'ideal'
    ? { label: idealLabel, hint: idealHint }
    : { label: realLabel, hint: realHint };
  const options: Array<{
    value: HeatCapacityFreeDisplayScheme;
    label: string;
    hint?: string;
  }> = [
    { value: 'real', label: realLabel, hint: realHint },
    { value: 'ideal', label: idealLabel, hint: idealHint },
  ];

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div
      className={`studio-heat-free-display-scheme-control ${open ? 'studio-heat-free-display-scheme-open' : ''}`}
      ref={rootRef}
    >
      <span className="studio-heat-free-display-scheme-label">{label}</span>
      <button
        type="button"
        className="studio-heat-free-display-scheme-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>
          <strong>{activeOption.label}</strong>
          {activeOption.hint ? <small>{activeOption.hint}</small> : null}
        </span>
        <ChevronDown
          size={14}
          className={`studio-heat-free-display-scheme-chevron ${open ? 'studio-heat-free-display-scheme-chevron-open' : ''}`}
        />
      </button>
      {open ? (
        <div className="studio-heat-free-display-scheme-menu" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              type="button"
              key={option.value}
              role="option"
              aria-selected={value === option.value}
              className={value === option.value ? 'studio-heat-free-display-scheme-active' : ''}
              onClick={() => {
                setOpen(false);
                if (option.value !== value) onChange(option.value);
              }}
            >
              <strong>{option.label}</strong>
              {option.hint ? <span>{option.hint}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
