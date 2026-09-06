import type { HeatCapacityToastLevel } from '../heatCapacity/heatCapacityToastController.ts';
import type { HeatCapacityGuideRollbackAnimation } from '../../domain/heatCapacity/heatCapacityInstrumentFeedback.ts';

export interface GuideHeatCapacityGuardResult {
  allowed: boolean;
  expectedControlId?: string;
  expectedMessage?: string;
  expectedLevel?: HeatCapacityToastLevel;
  rollbackAnimation?: HeatCapacityGuideRollbackAnimation;
  suppressGuidance?: boolean;
  suppressStrongReminder?: boolean;
}
