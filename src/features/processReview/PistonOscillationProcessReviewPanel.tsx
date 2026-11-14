import React, { useEffect, useMemo, useState } from 'react';
import type {
  PistonOscillationFreeSession,
} from '../../domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';
import type {
  PistonOscillationLanguage,
} from '../pistonOscillation/pistonOscillationCopy.ts';
import {
  ExperimentProcessReviewPanel,
} from './ExperimentProcessReviewPanel.tsx';
import type { ExperimentProcessReviewScoreDetail } from './ExperimentProcessReviewPanel.tsx';
import {
  selectPistonOscillationProcessReviewModels,
} from './pistonOscillationProcessReviewModel.ts';

interface PistonOscillationProcessReviewPanelProps {
  session: PistonOscillationFreeSession;
  language: PistonOscillationLanguage;
}

const formatScoreCopy = <T extends Pick<ExperimentProcessReviewScoreDetail,
  'evidence' | 'consequence' | 'suggestion'
>>(entry: T): T => ({
  ...entry,
  evidence: entry.evidence.replace(/[。.]$/u, ''),
  consequence: entry.consequence.replace(/[。.]$/u, ''),
  suggestion: entry.suggestion.replace(/[。.]$/u, ''),
});

export const PistonOscillationProcessReviewPanel: React.FC<
  PistonOscillationProcessReviewPanelProps
> = ({ session, language }) => {
  const models = useMemo(
    () => selectPistonOscillationProcessReviewModels(session, language),
    [language, session],
  );
  const [selectedOptionId, setSelectedOptionId] = useState(
    () => models[0]?.selectedOptionId ?? '',
  );

  useEffect(() => {
    if (models.some((model) => model.selectedOptionId === selectedOptionId)) return;
    setSelectedOptionId(models[0]?.selectedOptionId ?? '');
  }, [models, selectedOptionId]);

  const selectedModel = models.find(
    (model) => model.selectedOptionId === selectedOptionId,
  ) ?? models[0];

  if (!selectedModel) return null;

  return (
    <ExperimentProcessReviewPanel
      model={{
        ...selectedModel,
        scoreRows: selectedModel.scoreRows.map((row) => ({
          ...formatScoreCopy(row),
          details: row.details?.map(formatScoreCopy),
        })),
      }}
      language={language}
      onSelectedOptionChange={setSelectedOptionId}
    />
  );
};
