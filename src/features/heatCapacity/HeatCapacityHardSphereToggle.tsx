import React from 'react';

interface HeatCapacityHardSphereToggleProps {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  language: 'zh-CN' | 'zh-TW' | 'en';
  descriptionId?: string;
}

const hardSphereToggleCopy = {
  'zh-CN': {
    label: '微观可视化',
    on: '开',
    off: '关',
    tooltipOff: '开启瓶内小球分子可视化，用于观察分子运动、密度和速度变化。',
    tooltipOn: '关闭瓶内小球分子可视化。该显示仅用于教学解释，不参与数据计算。',
  },
  'zh-TW': {
    label: '微觀可視化',
    on: '開',
    off: '關',
    tooltipOff: '開啟瓶內小球分子可視化，用於觀察分子運動、密度和速度變化。',
    tooltipOn: '關閉瓶內小球分子可視化。該顯示僅用於教學解釋，不參與資料計算。',
  },
  en: {
    label: 'Molecule View',
    on: 'ON',
    off: 'OFF',
    tooltipOff: 'Enable the in-bottle molecule visualization for molecular motion, density, and speed changes.',
    tooltipOn: 'Disable the in-bottle molecule visualization. This display is explanatory only and is not used in calculations.',
  },
} as const;

const HeatCapacityHardSphereToggle: React.FC<HeatCapacityHardSphereToggleProps> = ({
  enabled,
  onToggle,
  disabled = false,
  language,
  descriptionId,
}) => {
  const copy = hardSphereToggleCopy[language] ?? hardSphereToggleCopy['zh-CN'];
  const stateLabel = enabled ? copy.on : copy.off;

  return (
    <button
      type="button"
      className={`studio-heat-hard-sphere-toggle ${enabled ? 'studio-heat-hard-sphere-toggle-on' : 'studio-heat-hard-sphere-toggle-off'}`}
      data-heat-capacity-hard-sphere-toggle="true"
      data-heat-capacity-hard-sphere-enabled={enabled ? 'true' : 'false'}
      aria-pressed={enabled}
      disabled={disabled}
      aria-describedby={disabled ? undefined : descriptionId}
      aria-label={enabled ? copy.tooltipOn : copy.tooltipOff}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (disabled) return;
        onToggle();
      }}
    >
      <span className="studio-heat-hard-sphere-toggle-label">{copy.label}</span>
      <span className="studio-heat-hard-sphere-toggle-state">{stateLabel}</span>
      <span className="studio-heat-hard-sphere-switch" aria-hidden="true">
        <span />
      </span>
    </button>
  );
};

export default HeatCapacityHardSphereToggle;
