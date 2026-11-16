import { useEffect, useId, useRef, useState } from 'react';
import './PistonSelectionRuleHelp.css';
export function PistonSelectionRuleHelp({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();
  const clear = () => { if (timer.current !== null) clearTimeout(timer.current); timer.current = null; };
  const hide = () => { clear(); setOpen(false); };
  const schedule = () => { clear(); timer.current = setTimeout(() => setOpen(true), 1000); };
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) hide(); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') hide(); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { clear(); document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, []);
  return <span ref={root} className="piston-selection-rule-help" data-open={open} onPointerLeave={hide}>
    <button type="button" aria-expanded={open} aria-describedby={open ? id : undefined}
      onPointerEnter={schedule} onBlur={hide}
      onFocus={event => { if (event.currentTarget.matches(':focus-visible')) schedule(); }}
      onClick={() => { clear(); setOpen(value => !value); }}>{title}</button>
    <span id={id} role="tooltip" aria-hidden={!open} className="piston-selection-rule-bubble">{text}</span>
  </span>;
}
