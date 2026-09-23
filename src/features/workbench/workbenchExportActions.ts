import { workbenchCopies, type WorkbenchCopy } from './workbenchStudioCopy.ts';
import { isExportEnvironmentAvailableStatus } from './workbenchDesktopCapabilities.ts';
import type { WorkbenchExportEnvironmentStatus } from './workbenchFileState.ts';
import type { WorkbenchFileState } from './workbenchFileUnion.ts';
import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import type { WorkbenchLogWriter } from './workbenchActionPorts.ts';
import { createWorkbenchExportPayload, type WorkbenchExportMode } from './workbenchResults.ts';
import { isHeatCapacityExportModeReady } from './workbenchHeatCapacityExport.ts';
import { isPistonOscillationReportReady } from './workbenchPistonOscillationExport.ts';

export interface WorkbenchExportActionPorts {
  activeFile: WorkbenchFileState;
  idealPointCount: number;
  resultSummary: { ready: boolean };
  settingsLanguagePreference: WorkbenchLanguagePreference;
  workbenchCopy: WorkbenchCopy;
  exportEnvironmentStatus: WorkbenchExportEnvironmentStatus;
  guardWorkbenchTutorialAction: (action: 'export-file') => boolean;
  pushLog: WorkbenchLogWriter;
  setExportInProgress: (active: boolean) => void;
  window: Window;
}
export const createWorkbenchExportActions = ({ activeFile, idealPointCount, resultSummary, settingsLanguagePreference, workbenchCopy, exportEnvironmentStatus, guardWorkbenchTutorialAction, pushLog, setExportInProgress, window }: WorkbenchExportActionPorts) => {
  const exportAvailable = isExportEnvironmentAvailableStatus(exportEnvironmentStatus);
  const isExportModeDataReady = (mode: WorkbenchExportMode) => (
    activeFile.kind === 'heatCapacity'
      ? isHeatCapacityExportModeReady(activeFile, mode)
      : activeFile.kind === 'heatCapacityPistonOscillation'
        ? ['report', 'figuresZip', 'tablesCsv', 'completeBundle'].includes(mode) && isPistonOscillationReportReady(activeFile)
      : activeFile.kind === 'ideal'
      ? mode === 'pointsCsv' || mode === 'completeBundle' || mode === 'tablesCsv'
        ? idealPointCount > 0
        : idealPointCount >= 2
      : resultSummary.ready
  );
  
  const getExportActionLabel = (
    language: WorkbenchLanguagePreference,
    mode: WorkbenchExportMode,
  ) => {
    if (activeFile.kind !== 'heatCapacity') {
      return workbenchCopies[language].logs.exportLabels[mode];
    }
    const labels = language === 'en'
      ? { completeBundle: 'Export Experiment Package', report: 'Export Report', figuresZip: 'Export Figures' }
      : language === 'zh-TW'
        ? { completeBundle: '匯出實驗包', report: '匯出報告', figuresZip: '匯出圖表' }
        : { completeBundle: '导出实验包', report: '导出报告', figuresZip: '导出图表' };
    return mode in labels
      ? labels[mode as keyof typeof labels]
      : workbenchCopies[language].logs.exportLabels[mode];
  };
  
  const getExportFolderLabel = (mode: WorkbenchExportMode) => {
    if (mode === 'tablesCsv') return workbenchCopy.results.exportTables;
    if (activeFile.kind === 'heatCapacity') {
      if (mode === 'completeBundle') {
        return settingsLanguagePreference === 'en'
          ? 'Experiment Package'
          : settingsLanguagePreference === 'zh-TW' ? '實驗包' : '实验包';
      }
      if (mode === 'figuresZip' || mode === 'verificationFigure') {
        return settingsLanguagePreference === 'en'
          ? 'Figures'
          : settingsLanguagePreference === 'zh-TW' ? '圖表' : '图表';
      }
      return settingsLanguagePreference === 'en'
        ? 'Report'
        : settingsLanguagePreference === 'zh-TW' ? '報告' : '报告';
    }
    if (mode === 'completeBundle') return workbenchCopy.results.exportAll;
    if (mode === 'figuresZip' || mode === 'verificationFigure') return workbenchCopy.results.exportFigures;
    return 'Export';
  };
  
  const handleExportAction = async (
    mode: WorkbenchExportMode,
    heatCapacityGroupIds?: readonly string[],
  ) => {
    if (!guardWorkbenchTutorialAction('export-file')) return;
    if (!isExportModeDataReady(mode)) {
      pushLog(
        (language) => activeFile.kind === 'ideal' && !['pointsCsv', 'tablesCsv', 'completeBundle'].includes(mode) && idealPointCount > 0
          ? workbenchCopies[language].logs.exportNeedsTwoPoints(activeFile.name)
          : workbenchCopies[language].logs.exportNotReady(activeFile.name),
        'warning',
      );
      return;
    }
  
    const payload = createWorkbenchExportPayload(
      activeFile,
      mode,
      settingsLanguagePreference,
      { includedGroupIds: heatCapacityGroupIds },
    );
    const bridge = window.hardSphereLabExporter;
  
    if (!exportAvailable) {
      pushLog(
        (language) => workbenchCopies[language].logs.exportPayloadPrepared(
          activeFile.name,
          getExportActionLabel(language, mode),
          payload.filename,
          workbenchCopies[language].exportEnvironment[exportEnvironmentStatus].detail,
        ),
        'warning',
      );
      return;
    }
  
    if (!bridge) {
      pushLog(
        (language) => workbenchCopies[language].logs.exportPayloadPrepared(
          activeFile.name,
          getExportActionLabel(language, mode),
          payload.filename,
          workbenchCopies[language].exportEnvironment.unavailable.detail,
        ),
        'warning',
      );
      return;
    }
  
    setExportInProgress(true);
    pushLog(
      (language) => workbenchCopies[language].logs.exportPreparing(
        activeFile.name,
        getExportActionLabel(language, mode),
      ),
      'info',
    );
  
    try {
      const result = await bridge.exportWorkbenchPayload(payload, {
        mode,
        fileName: activeFile.name,
        defaultDirName: `${activeFile.name} ${getExportFolderLabel(mode)}`,
      });
  
      if (result.status === 'cancelled') {
        pushLog(
          (language) => workbenchCopies[language].logs.exportCancelled(
            activeFile.name,
            getExportActionLabel(language, mode),
          ),
          'warning',
        );
        return;
      }
  
      if (result.status !== 'ok') {
        pushLog(
          (language) => workbenchCopies[language].logs.exportFailed(
            activeFile.name,
            getExportActionLabel(language, mode),
            result.message ?? workbenchCopies[language].logs.unknownExporterError,
          ),
          'error',
        );
        return;
      }
  
      const fileCount = result.files?.length ?? 0;
      if (mode === 'pointsCsv') {
        pushLog(
          (language) => workbenchCopies[language].logs.exportCsvSaved(
            activeFile.name,
            result.files?.[0] ?? result.outDir ?? workbenchCopies[language].logs.selectedLocation,
          ),
          'success',
        );
        return;
      }
  
      pushLog(
        (language) => workbenchCopies[language].logs.exportCompleted(
          activeFile.name,
          getExportActionLabel(language, mode),
          result.outDir ?? workbenchCopies[language].logs.selectedFolder,
          fileCount,
          mode === 'verificationFigure' || mode === 'figuresZip'
            ? ` ${workbenchCopies[language].logs.exportFigureHint}`
            : '',
        ),
        'success',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : null;
      pushLog(
        (language) => workbenchCopies[language].logs.exportFailed(
          activeFile.name,
          getExportActionLabel(language, mode),
          message ?? workbenchCopies[language].logs.unknownExporterError,
        ),
        'error',
      );
    } finally {
      setExportInProgress(false);
    }
  };
  return { isExportModeDataReady, handleExportAction };
};
