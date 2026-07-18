import type { PistonOscillationLanguage } from './pistonOscillationCopy.ts';
import { getPistonOscillationShellCopy } from './pistonOscillationCopy.ts';
import './PistonOscillationPlaceholders.css';

export interface PistonOscillationRealtimeUnavailableProps {
  language: PistonOscillationLanguage;
  className?: string;
}

export const PistonOscillationRealtimeUnavailable = ({
  language,
  className = '',
}: PistonOscillationRealtimeUnavailableProps) => {
  const copy = getPistonOscillationShellCopy(language);

  return (
    <section
      className={`piston-oscillation-placeholder piston-oscillation-realtime-unavailable ${className}`.trim()}
      data-piston-oscillation-realtime-unavailable="true"
      role="status"
      aria-label={copy.realtime.ariaLabel}
      aria-disabled="true"
    >
      <div className="piston-oscillation-placeholder-message">
        <span className="piston-oscillation-placeholder-eyebrow">{copy.realtime.eyebrow}</span>
        <strong>{copy.realtime.title}</strong>
        <p>{copy.realtime.body}</p>
        <span className="piston-oscillation-placeholder-badge">{copy.developmentBadge}</span>
      </div>
    </section>
  );
};

export default PistonOscillationRealtimeUnavailable;
