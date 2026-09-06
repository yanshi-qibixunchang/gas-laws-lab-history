import type React from 'react';
import {
  heatCapacityFreeSharedText,
} from '../heatCapacity/heatCapacityFreeParameterPanelModel.ts';
import {
  Wrench,
} from 'lucide-react';

export interface WorkbenchHeatCapacityParametersProps {
  activeFile: import('./workbenchFileUnion.ts').WorkbenchFileState;
  activeHeatCapacityFreeParameterLocked: boolean;
  activeHeatCapacityFreeIdealReadonly: boolean;
  showHeatCapacityFreeParameterLockHint: () => void;
  renderHeatCapacityBasicParameterRows: () => React.ReactElement;
  renderHeatCapacityTooltipAnchor: (tooltipId: string, message: string, children: React.ReactNode, options?: { className?: string; target?: string; focusable?: boolean; }) => React.ReactElement;
  activeHeatCapacityFreeParameterLockMessage: string;
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  openHeatCapacityAdvancedSettings: () => void;
}

export const WorkbenchHeatCapacityParameters = ({
  activeFile,
  activeHeatCapacityFreeParameterLocked,
  activeHeatCapacityFreeIdealReadonly,
  showHeatCapacityFreeParameterLockHint,
  renderHeatCapacityBasicParameterRows,
  renderHeatCapacityTooltipAnchor,
  activeHeatCapacityFreeParameterLockMessage,
  settingsLanguagePreference,
  openHeatCapacityAdvancedSettings,
}: WorkbenchHeatCapacityParametersProps) => {
    if (activeFile.kind !== 'heatCapacity' || activeFile.heatCapacityMode !== 'free') return null;
    return (
      <section
        className={`studio-heat-free-params ${activeHeatCapacityFreeParameterLocked ? 'is-locked' : ''} ${activeHeatCapacityFreeIdealReadonly ? 'is-ideal-readonly' : ''}`}
        data-heat-capacity-free-parameter-panel="true"
        aria-disabled={activeHeatCapacityFreeParameterLocked ? true : undefined}
        onPointerDownCapture={(event) => {
          if (!activeHeatCapacityFreeParameterLocked) return;
          const target = event.target instanceof Element ? event.target : null;
          if (target?.closest('[data-heat-capacity-param-help-button="true"]')) return;
          if (target?.closest('.studio-param-help-popover')) return;
          if (target?.closest('[data-heat-capacity-free-param-id="hardSphereViewEnabled"]')) return;
          event.preventDefault();
          showHeatCapacityFreeParameterLockHint();
        }}
      >
        {renderHeatCapacityBasicParameterRows()}
        <div className={`studio-heat-free-advanced-entry ${activeHeatCapacityFreeParameterLocked ? 'studio-heat-free-advanced-entry-locked' : ''}`}>
          {renderHeatCapacityTooltipAnchor(
            'heatCapacityAdvancedSettings',
            activeHeatCapacityFreeParameterLockMessage ?? heatCapacityFreeSharedText.advancedOpen[settingsLanguagePreference],
            <button
              type="button"
              className="studio-heat-free-advanced-button"
              disabled={activeHeatCapacityFreeParameterLocked}
              onClick={openHeatCapacityAdvancedSettings}
              onPointerDownCapture={() => {
                if (activeHeatCapacityFreeParameterLocked) showHeatCapacityFreeParameterLockHint();
              }}
            >
              <Wrench size={14} />
              <span>{heatCapacityFreeSharedText.advancedOpen[settingsLanguagePreference]}</span>
            </button>,
            {
              className: 'studio-heat-free-advanced-tooltip-anchor',
              target: 'advanced-settings',
              focusable: activeHeatCapacityFreeParameterLocked,
            },
          )}
        </div>
      </section>
    );
  };
