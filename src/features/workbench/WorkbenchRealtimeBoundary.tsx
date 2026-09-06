import type React from 'react';
import {
  isDevelopmentRenderFaultRequested,
  recoverDevelopmentRenderFault,
  DevelopmentRenderFault,
} from '../../development/DevelopmentRenderFault.tsx';
import {
  RecoverableRenderErrorBoundary,
} from '../../components/errors/RecoverableRenderErrorBoundary.tsx';
import {
  WorkbenchContentRenderErrorFallback,
} from './WorkbenchRenderErrorFallback.tsx';

export interface WorkbenchRealtimeBoundaryProps {
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  returnToPistonOscillationInstrumentAfterDisplayError: () => void;
  renderRealtimePanelContent: () => React.ReactElement;
}

export const WorkbenchRealtimeBoundary = ({
  activeFile,
  settingsLanguagePreference,
  returnToPistonOscillationInstrumentAfterDisplayError,
  renderRealtimePanelContent,
}: WorkbenchRealtimeBoundaryProps) => {
  return (
    isDevelopmentRenderFaultRequested('data-processing') ? (
      <RecoverableRenderErrorBoundary
        resetKeys={[activeFile.id]}
        fallback={({ error, retry }) => (
          <WorkbenchContentRenderErrorFallback
            area="data-processing"
            language={settingsLanguagePreference}
            error={error}
            onRetry={() => {
              recoverDevelopmentRenderFault('data-processing');
              retry();
            }}
            onReturnToInstrument={() => {
              recoverDevelopmentRenderFault('data-processing');
              returnToPistonOscillationInstrumentAfterDisplayError();
              retry();
            }}
          />
        )}
      >
        <DevelopmentRenderFault target="data-processing" />
        {renderRealtimePanelContent()}
      </RecoverableRenderErrorBoundary>
    ) : renderRealtimePanelContent()
  );
};
