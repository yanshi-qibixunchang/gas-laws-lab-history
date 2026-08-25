export const PISTON_MODEL_HIT_TARGETS = {
  pistonPlatform: {
    id: 'piston_platform',
    objectName: 'HIT_PistonPlatform',
    sourceObjectName: 'MassPlatform',
    semanticRole: 'adjust_height_or_press',
    focusPolicy: 'focus_required',
  },
  pistonCylinderFocusEntry: {
    id: 'piston_cylinder_focus_entry',
    objectName: 'HIT_PistonCylinder_FocusEntry',
    sourceObjectName: 'Cylinder_Pyrex',
    semanticRole: 'enter_piston_focus',
    focusPolicy: 'focus_required',
  },
  pistonFrameFocusEntry: {
    id: 'piston_frame_focus_entry',
    objectName: 'HIT_PistonFrame_FocusEntry',
    sourceObjectName: 'ProtectiveFrame',
    semanticRole: 'enter_piston_focus',
    focusPolicy: 'focus_required',
  },
  pistonLockingScrewFocusEntry: {
    id: 'piston_locking_screw_focus_entry',
    objectName: 'HIT_PistonLockingScrew_FocusEntry',
    sourceObjectName: 'PistonLockingScrew_MovingPart',
    semanticRole: 'enter_piston_focus',
    focusPolicy: 'focus_required',
  },
  pistonLockingScrew: {
    id: 'piston_locking_screw',
    objectName: 'HIT_PistonLockingScrew',
    sourceObjectName: 'PistonLockingScrew_KnurledKnob',
    semanticRole: 'tighten_or_loosen',
    focusPolicy: 'focus_required',
  },
  connectedHoseConnector: {
    id: 'main_hose_connector_connected',
    objectName: 'HIT_HoseConnector_Connected',
    sourceObjectName: 'Connector_Main_QuickDisconnect',
    semanticRole: 'disconnect_hose',
    focusPolicy: 'direct_interaction',
  },
  connectedHoseHandle: {
    id: 'main_hose_handle_connected',
    objectName: 'HIT_HoseHandle_Connected',
    sourceObjectName: 'Connector_Main_White',
    semanticRole: 'disconnect_hose',
    focusPolicy: 'direct_interaction',
  },
  connectedHoseBody: {
    id: 'main_hose_body_connected',
    objectName: 'HIT_HoseBody_Connected',
    sourceObjectName: 'Hose_Main_Connected',
    semanticRole: 'disconnect_hose',
    focusPolicy: 'direct_interaction',
  },
  detachedHoseConnector: {
    id: 'main_hose_connector_detached',
    objectName: 'HIT_HoseConnector_Detached',
    sourceObjectName: 'Detached_Main_QuickDisconnect',
    semanticRole: 'reconnect_hose',
    focusPolicy: 'direct_interaction',
  },
  detachedHoseHandle: {
    id: 'main_hose_handle_detached',
    objectName: 'HIT_HoseHandle_Detached',
    sourceObjectName: 'Detached_Main_QuickDisconnect',
    semanticRole: 'reconnect_hose',
    focusPolicy: 'direct_interaction',
  },
  detachedHoseBody: {
    id: 'main_hose_body_detached',
    objectName: 'HIT_HoseBody_Detached',
    sourceObjectName: 'Hose_Main_Disconnected',
    semanticRole: 'reconnect_hose',
    focusPolicy: 'direct_interaction',
  },
} as const;

export type PistonModelHitTargetKey = keyof typeof PISTON_MODEL_HIT_TARGETS;

export const createPistonModelHitTargetMetadata = (key: PistonModelHitTargetKey) => {
  const contract = PISTON_MODEL_HIT_TARGETS[key];
  return {
    hitTargetId: contract.id,
    semanticRole: contract.semanticRole,
    focusPolicy: contract.focusPolicy,
    interactionEnabled: true,
  };
};
