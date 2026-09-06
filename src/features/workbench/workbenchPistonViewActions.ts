import { commitPistonOscillationGuideParameterWorkbenchState, editPistonOscillationGuideParameterWorkbenchState, transitionPistonOscillationFreeWorkbenchState } from './workbenchPistonOscillationState.ts';

import { PISTON_OSCILLATION_GUIDE_SAMPLE_RATE_HZ, PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA } from '../../domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts';
import type React from 'react';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { PistonOscillationInstrumentSceneProps } from '../pistonOscillation/PistonOscillationInstrumentScene.tsx';
import type { PistonOscillationAcquisitionPanelProps } from '../pistonOscillation/PistonOscillationAcquisitionPanel.tsx';
export interface WorkbenchPistonViewActionPorts {
 activeFile: WorkbenchFileState;
 updateActiveFile: (updater: (file:WorkbenchFileState)=>WorkbenchFileState)=>void;
 setPistonOscillationReleaseEventsByFileId: React.Dispatch<React.SetStateAction<Record<string, Parameters<NonNullable<PistonOscillationInstrumentSceneProps['onReleaseEvent']>>[0]>>>;
 setPistonOscillationPressStartEventsByFileId: React.Dispatch<React.SetStateAction<Record<string, Parameters<NonNullable<PistonOscillationInstrumentSceneProps['onPressStartEvent']>>[0]>>>;
 setPistonOscillationMeasurementCyclesByFileId: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}
export const createWorkbenchPistonViewActions = (ports: WorkbenchPistonViewActionPorts) => {
 const {activeFile,updateActiveFile,setPistonOscillationReleaseEventsByFileId,setPistonOscillationPressStartEventsByFileId,setPistonOscillationMeasurementCyclesByFileId}=ports;
  const handlePistonOscillationReleaseEvent: NonNullable<PistonOscillationInstrumentSceneProps['onReleaseEvent']> = (event) => {
                setPistonOscillationReleaseEventsByFileId((current) => ({
                  ...current,
                  [activeFile.id]: event,
                }));
              };

  const handlePistonOscillationPressStartEvent: NonNullable<PistonOscillationInstrumentSceneProps['onPressStartEvent']> = (event) => {
                setPistonOscillationPressStartEventsByFileId((current) => ({
                  ...current,
                  [activeFile.id]: event,
                }));
              };

  const handlePistonOscillationFreeOperationObserved: NonNullable<PistonOscillationInstrumentSceneProps['onFreeOperationObserved']> = ({ operation, payload }) => {
                      updateActiveFile((file) => (
                        file.kind === 'heatCapacityPistonOscillation'
                        && file.pistonOscillationFreeSession.status === 'active'
                          ? transitionPistonOscillationFreeWorkbenchState(file, {
                              type: 'observeOperation',
                              operation,
                              payload,
                              nowMs: Date.now(),
                            })
                          : file
                      ));
                    };

  const editPistonOscillationGuideParameter: NonNullable<PistonOscillationAcquisitionPanelProps['onGuideParameterEdit']> = (field, value) => {
            const nowMs = Date.now();
            updateActiveFile((file) => {
              if (file.kind !== 'heatCapacityPistonOscillation') return file;
              const editedFile = editPistonOscillationGuideParameterWorkbenchState(
                file,
                field,
                value,
                nowMs,
              );
              const expectedValue = field === 'sampleRateHz'
                ? PISTON_OSCILLATION_GUIDE_SAMPLE_RATE_HZ
                : PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA;
              return value.trim().length > 0 && Number(value) === expectedValue
                ? commitPistonOscillationGuideParameterWorkbenchState(
                    editedFile,
                    field,
                    nowMs,
                  )
                : editedFile;
            });
          };

  const commitPistonOscillationGuideParameter: NonNullable<PistonOscillationAcquisitionPanelProps['onGuideParameterCommit']> = (field) => {
            updateActiveFile((file) => file.kind === 'heatCapacityPistonOscillation'
              ? commitPistonOscillationGuideParameterWorkbenchState(file, field)
              : file);
          };

  const commitPistonOscillationFreeAcquisitionSetting: NonNullable<PistonOscillationAcquisitionPanelProps['onFreeAcquisitionSettingCommit']> = (field, value) => {
            updateActiveFile((file) => file.kind === 'heatCapacityPistonOscillation'
              ? transitionPistonOscillationFreeWorkbenchState(file, {
                  type: 'setAcquisitionSetting',
                  field,
                  value,
                  nowMs: Date.now(),
                })
              : file);
          };

  const changePistonOscillationFreeCandidate: NonNullable<PistonOscillationAcquisitionPanelProps['onFreeCandidateChange']> = (candidate) => {
            updateActiveFile((file) => {
              if (file.kind !== 'heatCapacityPistonOscillation') return file;
              const nowMs = Date.now();
              return transitionPistonOscillationFreeWorkbenchState(file, candidate
                ? {
                    type: 'freezeAcquisition',
                    measurement: candidate,
                    nowMs,
                  }
                : {
                    type: 'clearAcquisition',
                    nowMs,
                  });
            });
          };

  const startPistonOscillationFreeAcquisition: NonNullable<PistonOscillationAcquisitionPanelProps['onFreeAcquisitionStarted']> = () => {
            updateActiveFile((file) => file.kind === 'heatCapacityPistonOscillation'
              ? transitionPistonOscillationFreeWorkbenchState(file, {
                  type: 'observeOperation',
                  operation: 'startAcquisition',
                  nowMs: Date.now(),
                })
              : file);
          };

  const savePistonOscillationFreeMeasurement: NonNullable<PistonOscillationAcquisitionPanelProps['onFreeMeasurementSave']> = (measurement) => {
            updateActiveFile((file) => file.kind === 'heatCapacityPistonOscillation'
              ? transitionPistonOscillationFreeWorkbenchState(file, {
                  type: 'saveMeasurement',
                  measurement,
                  nowMs: Date.now(),
                })
              : file);
          };

  const retainPistonOscillationRun: NonNullable<PistonOscillationAcquisitionPanelProps['onRunRetained']> = () => {
            setPistonOscillationMeasurementCyclesByFileId((current) => ({
              ...current,
              [activeFile.id]: (current[activeFile.id] ?? 0) + 1,
            }));
          };
 return { handlePistonOscillationReleaseEvent, handlePistonOscillationPressStartEvent, handlePistonOscillationFreeOperationObserved, editPistonOscillationGuideParameter, commitPistonOscillationGuideParameter, commitPistonOscillationFreeAcquisitionSetting, changePistonOscillationFreeCandidate, startPistonOscillationFreeAcquisition, savePistonOscillationFreeMeasurement, retainPistonOscillationRun };
};
