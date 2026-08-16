export const PISTON_MODEL_HIT_TARGETS = {
  pistonPressPlatform: {
    id: 'piston_press_platform',
    objectName: 'HIT_PistonPressPlatform',
    sourceObjectName: 'MassPlatform',
    semanticRole: 'adjust_height_or_press',
  },
  pistonLockingScrew: {
    id: 'piston_locking_screw',
    objectName: 'HIT_PistonLockingScrew',
    sourceObjectName: 'PistonLockingScrew_KnurledKnob_Preview',
    semanticRole: 'tighten_or_loosen',
  },
  connectedHoseConnector: {
    id: 'main_hose_connector_connected',
    objectName: 'HIT_HoseConnector_Connected',
    sourceObjectName: 'Connector_Main_QuickDisconnect',
    semanticRole: 'disconnect_hose',
  },
  connectedHoseBody: {
    id: 'main_hose_body_connected',
    objectName: 'HIT_HoseBody_Connected',
    sourceObjectName: 'Hose_Main_SizeCorrectedPreview',
    semanticRole: 'disconnect_hose',
  },
  detachedHoseConnector: {
    id: 'main_hose_connector_detached',
    objectName: 'HIT_HoseConnector_Detached',
    sourceObjectName: 'Detached_Main_QuickDisconnect_Preview',
    semanticRole: 'reconnect_hose',
  },
  detachedHoseBody: {
    id: 'main_hose_body_detached',
    objectName: 'HIT_HoseBody_Detached',
    sourceObjectName: 'Hose_Main_Disconnected_Preview',
    semanticRole: 'reconnect_hose',
  },
} as const;

export type PistonModelHitTargetKey = keyof typeof PISTON_MODEL_HIT_TARGETS;

export const createPistonModelHitTargetMetadata = (key: PistonModelHitTargetKey) => {
  const contract = PISTON_MODEL_HIT_TARGETS[key];
  return {
    hitTargetId: contract.id,
    semanticRole: contract.semanticRole,
    focusPolicy: 'deferred' as const,
    interactionEnabled: false,
  };
};
