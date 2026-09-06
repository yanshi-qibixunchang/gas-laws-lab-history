import type React from 'react';
export interface WorkbenchDockPanelProps {
  panel: import('./workbenchPanelDefinitions.tsx').PanelDefinition;
  optional?: boolean;
  setSelectedPanel: React.Dispatch<React.SetStateAction<import('./workbenchFileState.ts').WorkbenchPanelKey>>;
  renderDockHeader: (panel: import('./workbenchPanelDefinitions.tsx').PanelDefinition) => React.ReactElement;
  renderPanelContent: (panel: import('./workbenchPanelDefinitions.tsx').PanelDefinition) => React.ReactElement;
}

export const WorkbenchDockPanel = ({
  panel,
  optional = false,
  setSelectedPanel,
  renderDockHeader,
  renderPanelContent,
}: WorkbenchDockPanelProps) => {
  return (
    <section
      className={`studio-dock-panel studio-dock-panel-${panel.key} ${optional ? 'studio-optional-panel' : 'studio-fixed-panel'} ${panel.key === 'results' ? 'studio-results-window' : ''}`}
      key={panel.key}
      onClick={() => setSelectedPanel(panel.key)}
    >
      {panel.key === 'results' ? null : renderDockHeader(panel)}
      {renderPanelContent(panel)}
    </section>
  );
};
