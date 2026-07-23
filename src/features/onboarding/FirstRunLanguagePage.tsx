import { Check } from 'lucide-react';
import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import type { FirstRunCopy } from './firstRunCopy.ts';

interface FirstRunLanguagePageProps {
  copy: FirstRunCopy;
  language: WorkbenchLanguagePreference;
  onLanguageChange: (language: WorkbenchLanguagePreference) => void;
  onNext: () => void;
}

const LANGUAGE_ORDER: WorkbenchLanguagePreference[] = ['zh-CN', 'zh-TW', 'en'];

export const FirstRunLanguagePage = ({
  copy,
  language,
  onLanguageChange,
  onNext,
}: FirstRunLanguagePageProps) => (
  <main className="first-run-page first-run-language-page" data-first-run-page="language">
    <section className="first-run-page-heading">
      <span>{copy.language.step}</span>
      <h1>{copy.language.title}</h1>
      <p>{copy.language.body}</p>
    </section>
    <div className="first-run-language-options" role="radiogroup" aria-label={copy.language.groupLabel}>
      {LANGUAGE_ORDER.map((option) => {
        const selected = language === option;
        const optionCopy = copy.language.options[option];
        return (
          <button
            type="button"
            key={option}
            role="radio"
            aria-checked={selected}
            className={`first-run-choice-row ${selected ? 'first-run-choice-row-selected' : ''}`}
            onClick={() => onLanguageChange(option)}
          >
            <span>
              <strong>{optionCopy.label}</strong>
              <small>{optionCopy.hint}</small>
            </span>
            <i aria-hidden="true">{selected ? <Check size={14} strokeWidth={2.4} /> : null}</i>
          </button>
        );
      })}
    </div>
    <footer className="first-run-page-actions first-run-page-actions-end">
      <button type="button" className="first-run-action first-run-action-primary" onClick={onNext}>
        {copy.common.next}
      </button>
    </footer>
  </main>
);
