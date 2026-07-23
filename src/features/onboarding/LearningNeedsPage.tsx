import { Check } from 'lucide-react';
import type { HeatCapacityFamiliarityAnswer } from './firstRunExperienceModel.ts';
import type { FirstRunCopy } from './firstRunCopy.ts';

interface LearningNeedsPageProps {
  copy: FirstRunCopy;
  answer: HeatCapacityFamiliarityAnswer | null;
  onAnswerChange: (answer: HeatCapacityFamiliarityAnswer) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export const LearningNeedsPage = ({
  copy,
  answer,
  onAnswerChange,
  onPrevious,
  onNext,
}: LearningNeedsPageProps) => {
  const options: Array<{
    value: HeatCapacityFamiliarityAnswer;
    label: string;
    hint: string;
  }> = [
    { value: 'known', label: copy.needs.known, hint: copy.needs.knownHint },
    { value: 'needs-guidance', label: copy.needs.guidance, hint: copy.needs.guidanceHint },
  ];

  return (
    <main className="first-run-page first-run-needs-page" data-first-run-page="needs">
      <section className="first-run-page-heading first-run-needs-heading">
        <span>{copy.needs.step}</span>
        <h1>{copy.needs.title}</h1>
        <p>{copy.needs.body}</p>
      </section>
      <div className="first-run-needs-options" role="radiogroup" aria-label={copy.needs.title}>
        {options.map((option) => {
          const selected = answer === option.value;
          return (
            <button
              type="button"
              key={option.value}
              role="radio"
              aria-checked={selected}
              className={`first-run-choice-row first-run-needs-option ${selected ? 'first-run-choice-row-selected' : ''}`}
              onClick={() => onAnswerChange(option.value)}
            >
              <span>
                <strong>{option.label}</strong>
                <small>{option.hint}</small>
              </span>
              <i aria-hidden="true">{selected ? <Check size={14} strokeWidth={2.4} /> : null}</i>
            </button>
          );
        })}
      </div>
      <p className="first-run-required-note" data-complete={answer === null ? 'false' : 'true'}>
        {answer === null ? copy.needs.required : '\u00a0'}
      </p>
      <footer className="first-run-page-actions">
        <button type="button" className="first-run-action first-run-action-secondary" onClick={onPrevious}>
          {copy.common.previous}
        </button>
        <button
          type="button"
          className="first-run-action first-run-action-primary"
          disabled={answer === null}
          onClick={onNext}
        >
          {copy.common.next}
        </button>
      </footer>
    </main>
  );
};
