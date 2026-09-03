import {
  EXPERIMENT_LEARNING_ORDER,
  type ExperimentLearningId,
} from './experimentLearningModel.ts';

export interface ExperimentLearningDefinition {
  id: ExperimentLearningId;
  available: boolean;
  tutorialFileName: string;
}

export const EXPERIMENT_LEARNING_REGISTRY: Record<ExperimentLearningId, ExperimentLearningDefinition> = {
  heatCapacity: {
    id: 'heatCapacity',
    available: true,
    tutorialFileName: '绝热膨胀学习实验（临时）',
  },
  pistonOscillation: {
    id: 'pistonOscillation',
    available: true,
    tutorialFileName: '活塞振动学习实验（临时）',
  },
};

export const getAvailableExperimentLearningDefinitions = () => (
  EXPERIMENT_LEARNING_ORDER
    .map((experiment) => EXPERIMENT_LEARNING_REGISTRY[experiment])
    .filter((definition) => definition.available)
);
