import { getHeatCapacityHardSphereTemperatureLegend, type HeatCapacityHardSphereSceneTheme } from '../../domain/heatCapacity/heatCapacityHardSphereColor';

interface HeatCapacityTemperatureLegendProps {
  ambientTemperatureK?: number;
  sceneTheme: HeatCapacityHardSphereSceneTheme;
  language: 'zh-CN' | 'zh-TW' | 'en';
}

export default function HeatCapacityTemperatureLegend({ ambientTemperatureK, sceneTheme, language }: HeatCapacityTemperatureLegendProps) {
  const { minC, maxC, gradient } = getHeatCapacityHardSphereTemperatureLegend(sceneTheme, ambientTemperatureK);
  const format = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });
  const minLabel = `${format.format(minC)} °C`;
  const maxLabel = `${format.format(maxC)} °C`;
  const label = language === 'en' ? 'Molecular color temperature range'
    : language === 'zh-TW' ? '分子顏色對應溫度範圍' : '分子颜色对应温度范围';
  return (
    <div
      className="studio-heat-temperature-legend"
      data-heat-capacity-temperature-legend="true"
      data-scene-theme={sceneTheme}
      role="img"
      aria-label={`${label}: ${minLabel} – ${maxLabel}`}
    >
      <div className="studio-heat-temperature-legend-gradient" style={{ background: gradient }} />
      <div className="studio-heat-temperature-legend-labels" aria-hidden="true">
        <span>{minLabel}</span><span>{maxLabel}</span>
      </div>
    </div>
  );
}
