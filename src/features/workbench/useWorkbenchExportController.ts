import { useState } from 'react';
import { createWorkbenchExportActions, type WorkbenchExportActionPorts } from './workbenchExportActions.ts';
import { getDefaultHeatCapacityReportGroupIds } from './workbenchHeatCapacityExport.ts';
export const useWorkbenchExportController = (ports: Omit<WorkbenchExportActionPorts, 'setExportInProgress' | 'window'>) => {
  const { activeFile } = ports;
  const [exportInProgress, setExportInProgress] = useState(false);
  const [heatCapacityReportExportOpen, setHeatCapacityReportExportOpen] = useState(false);
  const [heatCapacityReportSelectedGroupIds, setHeatCapacityReportSelectedGroupIds] = useState<string[]>([]);
  const { isExportModeDataReady, handleExportAction } = createWorkbenchExportActions({ ...ports, setExportInProgress, window });
  const openHeatCapacityReportExport = () => {
  if (activeFile.kind !== 'heatCapacity') return;
  setHeatCapacityReportSelectedGroupIds(getDefaultHeatCapacityReportGroupIds(activeFile));
  setHeatCapacityReportExportOpen(true);
};
  const confirmHeatCapacityReportExport = () => {
  const selectedIds = [...heatCapacityReportSelectedGroupIds];
  setHeatCapacityReportExportOpen(false);
  void handleExportAction('report', selectedIds);
};
  return { exportInProgress, heatCapacityReportExportOpen, heatCapacityReportSelectedGroupIds, isExportModeDataReady, handleExportAction, openHeatCapacityReportExport, confirmHeatCapacityReportExport,
    closeHeatCapacityReportExport: () => setHeatCapacityReportExportOpen(false),
    selectHeatCapacityReportGroups: (ids: string[]) => setHeatCapacityReportSelectedGroupIds(ids),
  };
};
