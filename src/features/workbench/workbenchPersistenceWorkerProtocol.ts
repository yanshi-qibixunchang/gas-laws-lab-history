import type {
  WorkbenchPersistenceV3ProductionSnapshot,
  WorkbenchPersistenceV3RetainedState,
} from './persistenceV3/productionFacade.ts';

export const WORKBENCH_PERSISTENCE_WORKER_TIMEOUT_MS = 30_000;

export type WorkbenchPersistenceWorkerSaveRequest = {
  type: 'save';
  requestId: string;
  namespace: string;
  generationId: string;
  capturedAtMs: number;
  snapshot: WorkbenchPersistenceV3ProductionSnapshot;
  retained: WorkbenchPersistenceV3RetainedState;
};

export type WorkbenchPersistenceWorkerRequest =
  WorkbenchPersistenceWorkerSaveRequest;

export type WorkbenchPersistenceWorkerSaveCompleted = {
  type: 'save-completed';
  requestId: string;
  retained: WorkbenchPersistenceV3RetainedState;
};

export type WorkbenchPersistenceWorkerSaveFailed = {
  type: 'save-failed';
  requestId: string;
  error: {
    name: string;
    message: string;
  };
};

export type WorkbenchPersistenceWorkerResponse =
  | WorkbenchPersistenceWorkerSaveCompleted
  | WorkbenchPersistenceWorkerSaveFailed;
