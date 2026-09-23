import type { ReactNode } from 'react';
import type { PistonOscillationCalculationCopy } from './pistonOscillationCalculationCopy.ts';
import './PistonOscillationCalculationWindow.css';

/** Common answer, feedback and retry presentation for every piston calculation. */
export const PistonCalculationAnswerField = ({
  fieldId, inputId, title, formula, unit, precision, details, value, status,
  feedback, reference, active, actionLabel, actionDisabled = false, copy,
  onDraftChange, onContinue, onReveal, onCheck,
}: {
  fieldId: string; inputId: string; title: ReactNode; formula: ReactNode;
  unit?: ReactNode; precision: ReactNode; details?: ReactNode;
  value: string; status: 'unresolved' | 'correct' | 'revealed';
  feedback: string | null; reference: string; active: boolean;
  actionLabel: string | null; actionDisabled?: boolean;
  copy: Pick<PistonOscillationCalculationCopy, 'correct' | 'revealed' | 'reference' | 'continueAnswer' | 'revealAnswer'>;
  onDraftChange: (value: string) => void; onContinue: () => void;
  onReveal: () => void; onCheck: () => void;
}) => {
  const resolved = status !== 'unresolved';
  const hasFeedback = feedback !== null;
  const statusText = status === 'correct' ? copy.correct : status === 'revealed' ? copy.revealed : feedback;
  return <article className={`studio-piston-calculation-step ${active ? 'studio-piston-calculation-step-active' : ''} ${status === 'correct' ? 'studio-piston-calculation-step-success' : ''} ${hasFeedback || status === 'revealed' ? 'studio-piston-calculation-step-danger' : ''}`}
    data-piston-calculation-step={fieldId} data-answer-status={status}>
    <header><strong>{title}</strong></header>
    {details}
    <div className="studio-piston-calculation-step-main">
      <div className="studio-piston-calculation-answer-field">
        <div className="studio-piston-calculation-formula-line">
          <label htmlFor={inputId}>
            <span className="studio-piston-calculation-formula">{formula}</span>
            <input id={inputId} type="text" inputMode="decimal" autoComplete="off" spellCheck={false}
              value={value} disabled={!active || resolved || hasFeedback} aria-invalid={hasFeedback}
              aria-describedby={`${inputId}-precision ${inputId}-feedback`}
              onChange={event => onDraftChange(event.currentTarget.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && active && !resolved && !hasFeedback && actionLabel !== null && !actionDisabled) {
                  event.preventDefault(); onCheck();
                }
              }} />
            {unit ? <span className="studio-piston-calculation-unit">{unit}</span> : null}
          </label>
          <span id={`${inputId}-precision`} className="studio-piston-calculation-precision">{precision}</span>
        </div>
        <div id={`${inputId}-feedback`} className="studio-piston-calculation-feedback" aria-live="polite">
          <span className="studio-piston-calculation-status">{statusText || '\u00A0'}</span>
          <span className={`studio-piston-calculation-reference ${resolved ? '' : 'studio-piston-calculation-reference-placeholder'}`}>
            {resolved ? `${copy.reference}${reference}` : `${copy.reference}\u00A0`}
          </span>
          {hasFeedback ? <span className="studio-piston-calculation-error-actions">
            <button type="button" onClick={onContinue}>{copy.continueAnswer}</button>
            <button type="button" className="studio-piston-calculation-reveal" onClick={onReveal}>{copy.revealAnswer}</button>
          </span> : <span className="studio-piston-calculation-actions-placeholder" aria-hidden="true" />}
        </div>
      </div>
      {actionLabel !== null ? <button type="button" className={`studio-piston-calculation-check ${active ? '' : 'studio-piston-calculation-check-hidden'}`}
        disabled={!active || hasFeedback || resolved || actionDisabled} tabIndex={active ? 0 : -1} onClick={onCheck}>{actionLabel}</button> : null}
    </div>
  </article>;
};
