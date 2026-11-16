import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { PistonOscillationVolumeCondition } from '../../domain/pistonOscillation/pistonOscillationExperimentContextModel.ts';
import './PistonVolumeConditionSelect.css';

const conditions = ['unknown', 'known'] as const;

export const PistonVolumeConditionSelect = ({ value, label, labels, disabled, title, onChange }: {
  value: PistonOscillationVolumeCondition;
  label: string;
  labels: Record<PistonOscillationVolumeCondition, string>;
  disabled: boolean;
  title: string;
  onChange: (value: PistonOscillationVolumeCondition) => void;
}) => {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [disabled, value]);
  useEffect(() => {
    if (!open) return;
    optionRefs.current[conditions.indexOf(value)]?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside, true);
    return () => document.removeEventListener('pointerdown', closeOutside, true);
  }, [open, value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault(); event.stopPropagation(); setOpen(false); triggerRef.current?.focus();
    } else if (event.key === 'Tab' && open) {
      setOpen(false); triggerRef.current?.focus();
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) && !disabled) {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      const current = optionRefs.current.findIndex(option => option === document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? conditions.length - 1
        : (current + (event.key === 'ArrowDown' ? 1 : -1) + conditions.length) % conditions.length;
      optionRefs.current[next]?.focus();
    }
  };

  return <div ref={rootRef}
    className={`studio-ideal-preset-select studio-piston-volume-select ${open ? 'studio-ideal-preset-select-open' : ''}`}
    onKeyDown={handleKeyDown}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
    <button ref={triggerRef} type="button" className="studio-ideal-preset-trigger"
      aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={menuId}
      disabled={disabled} title={title} onClick={() => setOpen(current => !current)}>
      <strong>{labels[value]}</strong>
      <ChevronDown size={13} aria-hidden="true"
        className={`studio-ideal-preset-chevron ${open ? 'studio-ideal-preset-chevron-open' : ''}`} />
    </button>
    {open && <div id={menuId} className="studio-ideal-preset-menu" role="listbox" aria-label={label}>
      {conditions.map((condition, index) => <button key={condition} type="button" role="option" tabIndex={-1}
        ref={node => { optionRefs.current[index] = node; }} aria-selected={value === condition}
        onClick={() => { setOpen(false); onChange(condition); triggerRef.current?.focus(); }}>
        <strong>{labels[condition]}</strong>
        {value === condition && <Check size={13} aria-hidden="true" />}
      </button>)}
    </div>}
  </div>;
};
