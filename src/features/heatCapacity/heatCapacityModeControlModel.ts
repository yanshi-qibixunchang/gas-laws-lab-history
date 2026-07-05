import type { HeatCapacityMode } from '../../domain/heatCapacity/heatCapacityModeTypes.ts';

export type HeatCapacityModeControlActionId =
  | 'pause-demo'
  | 'resume-demo'
  | 'stop-demo'
  | 'exit-guide'
  | 'exit-teaching'
  | 'reset-free';

export interface HeatCapacityModeControlAction {
  id: HeatCapacityModeControlActionId;
  tone: 'default' | 'danger';
}

export interface HeatCapacityModeControlSegment {
  active: boolean;
  actionsVisible: boolean;
  actions: HeatCapacityModeControlAction[];
}

export interface HeatCapacityModeControlState {
  activeMode: HeatCapacityMode;
  expanded: boolean;
  demo: HeatCapacityModeControlSegment;
  guide: HeatCapacityModeControlSegment;
  free: HeatCapacityModeControlSegment;
}

export interface HeatCapacityModeControlInput {
  activeMode: HeatCapacityMode;
  autoDemoInteractionLocked: boolean;
  autoDemoPaused: boolean;
  autoDemoRunning: boolean;
  teachingCompleted: boolean;
}

export const selectHeatCapacityModeControlState = ({
  activeMode,
  autoDemoInteractionLocked,
  autoDemoPaused,
  autoDemoRunning,
  teachingCompleted,
}: HeatCapacityModeControlInput): HeatCapacityModeControlState => {
  const demoActionsVisible = activeMode === 'demo' && (
    autoDemoRunning ||
    autoDemoPaused ||
    autoDemoInteractionLocked ||
    teachingCompleted
  );
  const guideActionsVisible = activeMode === 'guide';
  const freeActionsVisible = activeMode === 'free';
  const demoActions: HeatCapacityModeControlAction[] = demoActionsVisible
    ? teachingCompleted
      ? [{ id: 'exit-teaching', tone: 'danger' }]
      : [
          { id: autoDemoPaused ? 'resume-demo' : 'pause-demo', tone: 'default' },
          { id: 'stop-demo', tone: 'danger' },
        ]
    : [];
  const guideActions: HeatCapacityModeControlAction[] = guideActionsVisible
    ? [{ id: teachingCompleted ? 'exit-teaching' : 'exit-guide', tone: 'danger' }]
    : [];
  const freeActions: HeatCapacityModeControlAction[] = freeActionsVisible
    ? [{ id: 'reset-free', tone: 'danger' }]
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
