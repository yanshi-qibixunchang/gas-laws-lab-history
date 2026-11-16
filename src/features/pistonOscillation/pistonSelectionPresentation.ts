import type { PistonOscillationLanguage } from './pistonOscillationCopy.ts';
const COPY = {
  'zh-CN': {
    title: '框选规则', start: '起始', end: '结束', peak: '波峰', trough: '波谷', units: '坐标：时间 / s，绝对压强 / kPa',
    free: '横向框选一段振荡曲线。系统取选区内已标记的最左侧、最右侧主振动波峰或波谷作为计算起点和终点。相邻波峰与波谷之间计半个周期，选区至少需包含半个周期。将两点的时间差除以所含周期数 N，得到平均周期 T。框选边界用于限定取点范围。',
    guided: '横向框选一段稳定的振荡曲线。系统在选区内选择跨越周期数最多的两个波峰或两个波谷作为计算起点和终点，两点之间需至少包含两个完整周期。将两点的时间差除以所含周期数 N，得到平均周期 T。框选边界用于限定取点范围。',
    instruction: '手形：观察曲线 / 十字：框选曲线',
  },
  'zh-TW': {
    title: '框選規則', start: '起始', end: '結束', peak: '波峰', trough: '波谷', units: '座標：時間 / s，絕對壓強 / kPa',
    free: '橫向框選一段振盪曲線。系統取選區內已標記的最左側、最右側主振動波峰或波谷作為計算起點和終點。相鄰波峰與波谷之間計半個週期，選區至少需包含半個週期。將兩點的時間差除以所含週期數 N，得到平均週期 T。框選邊界用於限定取點範圍。',
    guided: '橫向框選一段穩定的振盪曲線。系統在選區內選擇跨越週期數最多的兩個波峰或兩個波谷作為計算起點和終點，兩點之間需至少包含兩個完整週期。將兩點的時間差除以所含週期數 N，得到平均週期 T。框選邊界用於限定取點範圍。',
    instruction: '手形：觀察曲線 / 十字：框選曲線',
  },
  en: {
    title: 'Selection rules', start: 'Starting ', end: 'Ending ', peak: 'peak', trough: 'trough', units: 'Coordinates: time / s, absolute pressure / kPa',
    free: 'Drag horizontally over the oscillations. The leftmost and rightmost marked primary peaks or troughs within the range are used as the calculation endpoints. Adjacent peaks and troughs span half a period; select at least half a period. Divide the elapsed time between these points by the number of periods N to obtain the mean period T. The selection edges delimit the search range.',
    guided: 'Select a stable section of the oscillations. Within the range, the system chooses two peaks or two troughs spanning the greatest number of periods. At least two complete periods are required. Divide their elapsed time by the number of periods N to obtain the mean period T. The selection edges delimit the search range.',
    instruction: 'Hand: inspect curve / Crosshair: select curve',
  },
} as const;
export const getPistonSelectionCopy = (language: PistonOscillationLanguage) => COPY[language];
export const getPistonEndpointLabel = (language: PistonOscillationLanguage, side: 'start' | 'end', type: 'peak' | 'trough') => COPY[language][side] + COPY[language][type];
