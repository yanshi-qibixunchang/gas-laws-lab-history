import { type WorkbenchAdvancedParameterKey } from './workbenchParameterRegistry.ts';
import { type WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import { type WorkbenchParameterRow } from './workbenchParameterState.ts';
import { type WorkbenchCopy } from './workbenchStudioCopy.ts';
import { type HeatCapacityFreeParameterLockReasonId, heatCapacityFreeParameterLockText } from '../heatCapacity/heatCapacityFreeParameterPanelModel.ts';

export type WorkbenchParameterSymbolPart = string | { sub: string };

export const WORKBENCH_PARAMETER_DETAILS: Record<WorkbenchAdvancedParameterKey, {
  symbol: WorkbenchParameterSymbolPart[];
  help: Record<WorkbenchLanguagePreference, string>;
}> = {
  N: {
    symbol: ['N'],
    help: {
      'zh-CN': '控制容器内参与碰撞和压强统计的粒子数量。',
      'zh-TW': '控制容器內參與碰撞和壓強統計的粒子數量。',
      en: 'Sets the number of particles used for collisions and pressure statistics.',
    },
  },
  r: {
    symbol: ['r'],
    help: {
      'zh-CN': '决定硬球半径，影响碰撞截面和可占据空间。',
      'zh-TW': '決定硬球半徑，影響碰撞截面和可佔據空間。',
      en: 'Sets the hard-sphere radius, affecting collision size and available space.',
    },
  },
  L: {
    symbol: ['L'],
    help: {
      'zh-CN': '决定立方容器边长，改变体积和压强换算基准。',
      'zh-TW': '決定立方容器邊長，改變體積和壓強換算基準。',
      en: 'Sets the cubic container side length, changing volume and pressure scaling.',
    },
  },
  dt: {
    symbol: ['dt'],
    help: {
      'zh-CN': '决定每一步积分时间间隔，影响模拟推进精度和速度。',
      'zh-TW': '決定每一步積分時間間隔，影響模擬推進精度和速度。',
      en: 'Sets the integration time step, affecting simulation precision and pace.',
    },
  },
  nu: {
    symbol: ['ν'],
    help: {
      'zh-CN': '控制 Andersen 热浴碰撞频率，影响达到目标温度的速度。',
      'zh-TW': '控制 Andersen 熱浴碰撞頻率，影響達到目標溫度的速度。',
      en: 'Sets the Andersen thermostat collision frequency and equilibration speed.',
    },
  },
  equilibriumTime: {
    symbol: ['t', { sub: 'eq' }],
    help: {
      'zh-CN': '决定开始统计前等待热平衡的时间。',
      'zh-TW': '決定開始統計前等待熱平衡的時間。',
      en: 'Sets how long the run equilibrates before statistics are collected.',
    },
  },
  statsDuration: {
    symbol: ['t', { sub: 'stat' }],
    help: {
      'zh-CN': '决定用于结果统计的采样持续时间。',
      'zh-TW': '決定用於結果統計的採樣持續時間。',
      en: 'Sets the duration of the statistics collection window.',
    },
  },
};

export const WORKBENCH_VALIDATION_ERROR_COPIES: Record<WorkbenchLanguagePreference, Record<string, string>> = {
  'zh-CN': {
    'N must be greater than 0.': 'N 必须大于 0。',
    'N must be a safe integer.': 'N 必须是安全整数。',
    'N must be 1000 or less.': 'N 必须小于或等于 1000。',
    'L must be greater than 0.': 'L 必须大于 0。',
    'r must be greater than 0.': 'r 必须大于 0。',
    'm must be greater than 0.': 'm 必须大于 0。',
    'k must be greater than 0.': 'k 必须大于 0。',
    'dt must be greater than 0.': 'dt 必须大于 0。',
    'dt must be 0.1 or less.': 'dt 必须小于或等于 0.1。',
    'nu must be 0 or greater.': 'nu 必须大于或等于 0。',
    'dt * nu must be 1 or less.': 'dt 与 nu 的乘积必须小于或等于 1。',
    'L must be greater than 2 * r.': 'L 必须大于 2r。',
    'Particle packing fraction must be 0.5 or less.': '粒子填充率必须小于或等于 0.5。',
    'equilibriumTime must be 0 or greater.': 'equilibriumTime 必须大于或等于 0。',
    'statsDuration must be greater than 0.': 'statsDuration 必须大于 0。',
    'targetTemperature must be greater than 0.': 'targetTemperature 必须大于 0。',
  },
  'zh-TW': {
    'N must be greater than 0.': 'N 必須大於 0。',
    'N must be a safe integer.': 'N 必須是安全整數。',
    'N must be 1000 or less.': 'N 必須小於或等於 1000。',
    'L must be greater than 0.': 'L 必須大於 0。',
    'r must be greater than 0.': 'r 必須大於 0。',
    'm must be greater than 0.': 'm 必須大於 0。',
    'k must be greater than 0.': 'k 必須大於 0。',
    'dt must be greater than 0.': 'dt 必須大於 0。',
    'dt must be 0.1 or less.': 'dt 必須小於或等於 0.1。',
    'nu must be 0 or greater.': 'nu 必須大於或等於 0。',
    'dt * nu must be 1 or less.': 'dt 與 nu 的乘積必須小於或等於 1。',
    'L must be greater than 2 * r.': 'L 必須大於 2r。',
    'Particle packing fraction must be 0.5 or less.': '粒子填充率必須小於或等於 0.5。',
    'equilibriumTime must be 0 or greater.': 'equilibriumTime 必須大於或等於 0。',
    'statsDuration must be greater than 0.': 'statsDuration 必須大於 0。',
    'targetTemperature must be greater than 0.': 'targetTemperature 必須大於 0。',
  },
  en: {
    'N must be greater than 0.': 'N must be greater than 0.',
    'N must be a safe integer.': 'N must be a safe integer.',
    'N must be 1000 or less.': 'N must be 1000 or less.',
    'L must be greater than 0.': 'L must be greater than 0.',
    'r must be greater than 0.': 'r must be greater than 0.',
    'm must be greater than 0.': 'm must be greater than 0.',
    'k must be greater than 0.': 'k must be greater than 0.',
    'dt must be greater than 0.': 'dt must be greater than 0.',
    'dt must be 0.1 or less.': 'dt must be 0.1 or less.',
    'nu must be 0 or greater.': 'nu must be 0 or greater.',
    'dt * nu must be 1 or less.': 'dt * nu must be 1 or less.',
    'L must be greater than 2 * r.': 'L must be greater than 2 * r.',
    'Particle packing fraction must be 0.5 or less.': 'Particle packing fraction must be 0.5 or less.',
    'equilibriumTime must be 0 or greater.': 'equilibriumTime must be 0 or greater.',
    'statsDuration must be greater than 0.': 'statsDuration must be greater than 0.',
    'targetTemperature must be greater than 0.': 'targetTemperature must be greater than 0.',
  },
};

export const getLocalizedWorkbenchValidationErrors = (
  errors: string[],
  language: WorkbenchLanguagePreference,
) => {
  const copy = WORKBENCH_VALIDATION_ERROR_COPIES[language] ?? WORKBENCH_VALIDATION_ERROR_COPIES['zh-CN'];
  return errors.map((error) => copy[error] ?? error);
};

export const getWorkbenchParameterDisplayLabel = (
  param: WorkbenchParameterRow,
  copy: WorkbenchCopy,
) => copy.parameters.parameterLabels[param.key] ?? (param.unit ? `${param.label} (${param.unit})` : param.label);

export const getWorkbenchParameterDisplayUnit = (
  param: WorkbenchParameterRow,
  language: WorkbenchLanguagePreference,
) => {
  if (!param.unit) return '';
  if (param.key === 'N' && param.unit === 'particles') {
    if (language === 'zh-CN') return '个';
    if (language === 'zh-TW') return '個';
  }
  return param.unit;
};

export const getWorkbenchParameterDetail = (param: WorkbenchParameterRow) => (
  WORKBENCH_PARAMETER_DETAILS[param.key]
);

export const getHeatCapacityFreeParameterLockMessage = (
  reason: HeatCapacityFreeParameterLockReasonId | null,
  language: WorkbenchLanguagePreference,
) => (reason ? heatCapacityFreeParameterLockText[reason][language] : null);
