import {
  getLocalizedStatusValue,
} from './workbenchPresentationFormatting.ts';

export interface WorkbenchSimulationMetricsProps {
  workbenchCopy: import('./workbenchStudioCopy.ts').WorkbenchCopy;
  activeFile: Extract<import('./workbenchFileUnion.ts').WorkbenchFileState, { kind: 'standard' | 'ideal' }>;
}

export const WorkbenchSimulationMetrics = ({
  workbenchCopy,
  activeFile,
}: WorkbenchSimulationMetricsProps) => {
  return <div className="studio-preview-metrics">
        <div className="studio-metric"><span>{workbenchCopy.results.temperature}</span><strong>{activeFile.stats.temperature.toFixed(3)}</strong></div>
        <div className="studio-metric"><span>{workbenchCopy.results.pressure}</span><strong>{activeFile.stats.pressure.toFixed(4)}</strong></div>
        <div className="studio-metric"><span>{workbenchCopy.results.meanSpeed}</span><strong>{activeFile.stats.meanSpeed.toFixed(3)}</strong></div>
        <div className="studio-metric"><span>{workbenchCopy.results.finalState}</span><strong>{getLocalizedStatusValue(activeFile.runState, workbenchCopy)}</strong></div>
      </div>;
};
