import type React from 'react';
import {
  renderHeatCapacityGuideStrongCutoutOutline,
} from './WorkbenchGuideCutoutOutline.tsx';
import {
  renderScientificText,
} from './WorkbenchScientificText.tsx';

export interface WorkbenchHeatCapacityStrongMaskProps {
  heatCapacityGuideMaskRef: React.MutableRefObject<HTMLDivElement>;
  heatCapacityGuideStrongTargetSpec: import('./workbenchHeatCapacityGuidePresentation.ts').HeatCapacityGuideStrongTargetSpec;
  heatCapacityGuideMaskBounds: { width: number; height: number; };
  heatCapacityGuideDimPath: string;
  heatCapacityGuideCutouts: import('./workbenchHeatCapacityGuideMaskGeometry.ts').HeatCapacityGuideStrongCutout[];
  heatCapacityGuideStrongReminderText: "请点击目标控件，继续实验。" | "请调节压强调零旋钮，继续实验。" | "請點擊目標控件，繼續實驗。" | "請調節壓強調零旋鈕，繼續實驗。" | "Click the target control to continue the experiment." | "Adjust the pressure-zero knob to continue the experiment.";
}

export const WorkbenchHeatCapacityStrongMask = ({
  heatCapacityGuideMaskRef,
  heatCapacityGuideStrongTargetSpec,
  heatCapacityGuideMaskBounds,
  heatCapacityGuideDimPath,
  heatCapacityGuideCutouts,
  heatCapacityGuideStrongReminderText,
}: WorkbenchHeatCapacityStrongMaskProps) => {
  return <div
                  ref={heatCapacityGuideMaskRef}
                  className={`studio-heat-guide-strong-mask studio-heat-guide-strong-mask-${heatCapacityGuideStrongTargetSpec.id}`}
                  data-heat-capacity-guide-strong-mask="true"
                  data-heat-capacity-guide-mask-target={heatCapacityGuideStrongTargetSpec.id}
                >
                  <svg
                    className="studio-heat-guide-strong-cutout-svg"
                    viewBox={`0 0 ${heatCapacityGuideMaskBounds.width} ${heatCapacityGuideMaskBounds.height}`}
                    aria-hidden="true"
                  >
                    <path
                      className="studio-heat-guide-strong-dim"
                      d={heatCapacityGuideDimPath}
                      fillRule="evenodd"
                      clipRule="evenodd"
                    />
                    <g>
                      {heatCapacityGuideCutouts.map(renderHeatCapacityGuideStrongCutoutOutline)}
                    </g>
                  </svg>
                  <div className="studio-heat-guide-strong-card">
                    <strong>{renderScientificText(heatCapacityGuideStrongReminderText)}</strong>
                  </div>
                </div>;
};
