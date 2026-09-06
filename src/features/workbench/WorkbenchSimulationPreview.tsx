import type React from 'react';
import SimulationCanvas from '../../components/SimulationCanvas';

export interface WorkbenchSimulationPreviewProps {
  activeFile: Extract<import('./workbenchFileUnion.ts').WorkbenchFileState, { kind: 'standard' | 'ideal' }>;
  workbenchTranslation: import('../../shared/types.ts').Translation;
  isCanvasFocused: boolean;
  setIsCanvasFocused: React.Dispatch<React.SetStateAction<boolean>>;
  showWorkbenchSimulationPreviewNotification: (text: string) => void;
}

export const WorkbenchSimulationPreview = ({
  activeFile,
  workbenchTranslation,
  isCanvasFocused,
  setIsCanvasFocused,
  showWorkbenchSimulationPreviewNotification,
}: WorkbenchSimulationPreviewProps) => {
  return <div className="studio-canvas-host">
          <SimulationCanvas
            particles={activeFile.particles}
            L={activeFile.kind === 'ideal' ? activeFile.activeParams.L : activeFile.appliedParams.L}
            r={activeFile.kind === 'ideal' ? activeFile.activeParams.r : activeFile.appliedParams.r}
            isRunning={activeFile.runState === 'running'}
            t={workbenchTranslation}
            isFocused={isCanvasFocused}
            onFocusChange={setIsCanvasFocused}
            showNotification={showWorkbenchSimulationPreviewNotification}
            supportsHover
            touchLike={false}
            isCompactLandscape={false}
            variant="workbench"
          />
        </div>;
};
