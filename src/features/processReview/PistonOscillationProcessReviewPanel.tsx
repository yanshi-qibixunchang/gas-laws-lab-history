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
import {
  selectPistonOscillationProcessReviewModels,
} from './pistonOscillationProcessReviewModel.ts';

interface PistonOscillationProcessReviewPanelProps {
  session: PistonOscillationFreeSession;
  language: PistonOscillationLanguage;
}

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
      model={selectedModel}
      language={language}
      onSelectedOptionChange={setSelectedOptionId}
    />
  );
};
