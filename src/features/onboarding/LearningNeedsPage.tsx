import { Check } from 'lucide-react';
import {
  EXPERIMENT_LEARNING_ORDER,
  type ExperimentLearningId,
} from '../learning/experimentLearningModel.ts';
import type { ExperimentFamiliarityAnswer } from './firstRunExperienceModel.ts';
import type { FirstRunCopy } from './firstRunCopy.ts';

interface LearningNeedsPageProps {
  copy: FirstRunCopy;
  answers: Record<ExperimentLearningId, ExperimentFamiliarityAnswer | null>;
  onAnswerChange: (
    experiment: ExperimentLearningId,
    answer: ExperimentFamiliarityAnswer,
  ) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export const LearningNeedsPage = ({
  copy,
  answers,
  onAnswerChange,
  onPrevious,
  onNext,
}: LearningNeedsPageProps) => {
  const options: Array<{
    value: ExperimentFamiliarityAnswer;
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
      <div className="first-run-needs-experiments">
        {EXPERIMENT_LEARNING_ORDER.map((experiment) => (
          <section className="first-run-needs-experiment" key={experiment}>
            <h2>{copy.needs.experimentNames[experiment]}</h2>
            <div
              className="first-run-needs-options"
              role="radiogroup"
              aria-label={copy.needs.experimentNames[experiment]}
            >
              {options.map((option) => {
                const selected = answers[experiment] === option.value;
                return (
                  <button
                    type="button"
                    key={option.value}
                    role="radio"
                    aria-checked={selected}
                    className={`first-run-choice-row first-run-needs-option ${selected ? 'first-run-choice-row-selected' : ''}`}
                    onClick={() => onAnswerChange(experiment, option.value)}
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
          </section>
        ))}
      </div>
      <p
        className="first-run-required-note"
        data-complete={Object.values(answers).every((answer) => answer !== null) ? 'true' : 'false'}
      >
        {Object.values(answers).some((answer) => answer === null) ? copy.needs.required : '\u00a0'}
      </p>
      <footer className="first-run-page-actions">
        <button type="button" className="first-run-action first-run-action-secondary" onClick={onPrevious}>
          {copy.common.previous}
        </button>
        <button
          type="button"
          className="first-run-action first-run-action-primary"
          disabled={Object.values(answers).some((answer) => answer === null)}
          onClick={onNext}
        >
          {copy.common.next}
        </button>
      </footer>
    </main>
  );
};
