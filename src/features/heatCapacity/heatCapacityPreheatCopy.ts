import type { WorkbenchLanguagePreference } from '../workbench/workbenchGeneralSettings.ts';
import type { HeatCapacityPreheatPhase } from '../../domain/heatCapacity/heatCapacityPreheatModel.ts';

export interface HeatCapacityPreheatCopy {
  title: string;
  status: Record<HeatCapacityPreheatPhase, string>;
  minuteUnit: string;
  description: string;
  progressAria: (minutes: number) => string;
}

export const heatCapacityPreheatCopies: Record<WorkbenchLanguagePreference, HeatCapacityPreheatCopy> = {
  'zh-CN': {
    title: '传感器预热',
    status: {
      warming: '进行中',
      'nearly-ready': '即将完成',
      complete: '预热完成',
    },
    minuteUnit: '分钟',
    description: '现实仪器每次开机实验前需连续预热 20 分钟。虚拟仿真将该过程压缩为 5 秒，无需实际等待 20 分钟。',
    progressAria: (minutes) => `等效预热时间：${minutes} / 20 分钟`,
  },
  'zh-TW': {
    title: '感測器預熱',
    status: {
      warming: '進行中',
      'nearly-ready': '即將完成',
      complete: '預熱完成',
    },
    minuteUnit: '分鐘',
    description: '實際儀器每次開機進行實驗前需連續預熱 20 分鐘。虛擬模擬將此過程壓縮為 5 秒，無需實際等待 20 分鐘。',
    progressAria: (minutes) => `等效預熱時間：${minutes} / 20 分鐘`,
  },
  en: {
    title: 'Sensor warm-up',
    status: {
      warming: 'Warming up',
      'nearly-ready': 'Nearly ready',
      complete: 'Warm-up complete',
    },
    minuteUnit: 'min',
    description: 'Before each experiment, the real instrument must remain powered on for a 20 min warm-up. The simulation compresses this process into 5 s, so no real 20-minute wait is required.',
    progressAria: (minutes) => `Equivalent warm-up time: ${minutes} of 20 minutes`,
  },
};
