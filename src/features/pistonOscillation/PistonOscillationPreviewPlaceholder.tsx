import type { PistonOscillationLanguage } from './pistonOscillationCopy.ts';
import { getPistonOscillationShellCopy } from './pistonOscillationCopy.ts';
import './PistonOscillationPlaceholders.css';

export interface PistonOscillationPreviewPlaceholderProps {
  language: PistonOscillationLanguage;
  className?: string;
}

export const PistonOscillationPreviewPlaceholder = ({
  language,
  className = '',
}: PistonOscillationPreviewPlaceholderProps) => {
  const copy = getPistonOscillationShellCopy(language);

  return (
    <section
      className={`piston-oscillation-placeholder piston-oscillation-preview-placeholder ${className}`.trim()}
      data-piston-oscillation-preview-placeholder="true"
      role="status"
      aria-label={copy.preview.ariaLabel}
    >
      <div className="piston-oscillation-placeholder-message">
        <span className="piston-oscillation-placeholder-eyebrow">{copy.preview.eyebrow}</span>
        <div className="piston-oscillation-placeholder-instrument" aria-hidden="true">
          <span className="piston-oscillation-placeholder-cylinder" />
          <span className="piston-oscillation-placeholder-piston" />
          <span className="piston-oscillation-placeholder-axis" />
        </div>
        <strong>{copy.preview.title}</strong>
        <p>{copy.preview.body}</p>
        <span className="piston-oscillation-placeholder-badge">{copy.developmentBadge}</span>
      </div>
    </section>
  );
};

export default PistonOscillationPreviewPlaceholder;
