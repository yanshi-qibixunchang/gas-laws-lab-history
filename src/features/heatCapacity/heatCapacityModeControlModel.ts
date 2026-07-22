import type { HeatCapacityMode } from '../../domain/heatCapacity/heatCapacityModeTypes.ts';

export type HeatCapacityModeControlActionId =
  | 'pause-demo'
  | 'resume-demo'
  | 'stop-demo'
  | 'reset-guide'
  | 'exit-guide'
  | 'exit-teaching'
  | 'reset-free'
  | 'exit-free';

export type HeatCapacityAutoDemoPhase = 'idle' | 'running' | 'paused';

export interface HeatCapacityModeControlAction {
  id: HeatCapacityModeControlActionId;
  tone: 'default' | 'danger';
  disabled?: boolean;
}

export interface HeatCapacityModeControlSegment {
  active: boolean;
  actionsVisible: boolean;
  actions: HeatCapacityModeControlAction[];
}

export interface HeatCapacityModeControlState {
  activeMode: HeatCapacityMode | null;
  expanded: boolean;
  demo: HeatCapacityModeControlSegment;
  guide: HeatCapacityModeControlSegment;
  free: HeatCapacityModeControlSegment;
}

export interface HeatCapacityModeControlInput {
  activeMode: HeatCapacityMode | null;
  autoDemoPhase: HeatCapacityAutoDemoPhase;
  teachingCompleted: boolean;
  freeBatchCompleted: boolean;
}

export const selectHeatCapacityModeControlState = ({
  activeMode,
  autoDemoPhase,
  teachingCompleted,
  freeBatchCompleted,
}: HeatCapacityModeControlInput): HeatCapacityModeControlState => {
  const autoDemoActive = autoDemoPhase !== 'idle';
  const demoActionsVisible = activeMode === 'demo' && (autoDemoActive || teachingCompleted);
  const guideActionsVisible = activeMode === 'guide';
  const freeActionsVisible = activeMode === 'free';
  const demoActions: HeatCapacityModeControlAction[] = demoActionsVisible
    ? teachingCompleted
      ? [{ id: 'exit-teaching', tone: 'danger' }]
      : [
          { id: autoDemoPhase === 'paused' ? 'resume-demo' : 'pause-demo', tone: 'default' },
          { id: 'stop-demo', tone: 'danger' },
        ]
    : [];
  const guideActions: HeatCapacityModeControlAction[] = guideActionsVisible
    ? [
        { id: 'reset-guide', tone: 'danger' },
        { id: teachingCompleted ? 'exit-teaching' : 'exit-guide', tone: 'danger' },
      ]
    : [];
  const freeActions: HeatCapacityModeControlAction[] = freeActionsVisible
    ? [
        ...(!freeBatchCompleted
          ? [{ id: 'reset-free', tone: 'danger' } as const]
          : []),
        { id: 'exit-free', tone: 'danger' },
      ]
    : [];

  return {
    activeMode,
    expanded: demoActionsVisible || guideActionsVisible || freeActionsVisible,
    demo: {
      active: activeMode === 'demo',
      actionsVisible: demoActionsVisible,
      actions: demoActions,
    },
    guide: {
      active: activeMode === 'guide',
      actionsVisible: guideActionsVisible,
      actions: guideActions,
    },
    free: {
      active: activeMode === 'free',
      actionsVisible: freeActionsVisible,
      actions: freeActions,
    },
  };
};
