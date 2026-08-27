import type { PistonOscillationLanguage } from './pistonOscillationCopy.ts';

export interface PistonOscillationCalculationCopy {
  title: string;
  subtitle: string;
  reviewSubtitle: string;
  close: string;
  tolerance: string;
  knownTitle: string;
  fitTitle: string;
  fitInstruction: string;
  fitReviewInstruction: string;
  fitSelectedCount: (selected: number, total: number) => string;
  fitRowAria: (runNumber: number, selected: boolean) => string;
  confirmFit: string;
  missingFitTitle: string;
  missingFitBody: string;
  dismissReminder: string;
  fitResultTitle: string;
  fitGraphAria: string;
  chartXAxis: string;
  chartYAxis: string;
  stepTitle: Record<'area' | 'gamma' | 'relativeError', string>;
  precisionSignificant: (digits: number) => string;
  correct: string;
  revealed: string;
  reference: string;
  feedback: Record<
    'empty' | 'invalid' | 'numeric-wrong' | 'precision-wrong' | 'wrong',
    string
  >;
  continueAnswer: string;
  revealAnswer: string;
  check: string;
  ready: string;
  completeAndExit: string;
  closeButton: string;
}

export const PISTON_OSCILLATION_CALCULATION_COPY = {
  'zh-CN': {
    title: '活塞振动法数据计算',
    subtitle: '引导模式 · 离线拟合与计算',
    reviewSubtitle: '数据处理 · 已保存过程回顾',
    close: '关闭活塞振动法计算窗口',
    tolerance: '判定说明：答案同时检查数值与规定精度；数值落在允许容差内即可判定正确，因此你的答案可能与参考答案略有差异。',
    knownTitle: '实验已知量',
    fitTitle: '第一步：选择拟合数据点',
    fitInstruction: '单击数据行可选中或取消选中。引导模式需要选中三组数据，再由软件拟合 h = sT² + b。',
    fitReviewInstruction: '以下三组数据均已参与本次拟合；拟合函数与 R² 显示在下方图中。',
    fitSelectedCount: (selected, total) => `已选择 ${selected} / ${total} 组`,
    fitRowAria: (runNumber, selected) => `第 ${runNumber} 组数据，${selected ? '已选中' : '未选中'}`,
    confirmFit: '确认并拟合',
    missingFitTitle: '请先选中全部三组数据',
    missingFitBody: '引导模式需要使用三组数据完成教学拟合。请单击高亮区域内尚未选中的数据行，再次确认。',
    dismissReminder: '我知道了',
    fitResultTitle: '线性拟合结果',
    fitGraphAria: '以 T 平方为横轴、h 为纵轴的线性拟合图',
    chartXAxis: 'T² / s²',
    chartYAxis: 'h / m',
    stepTitle: {
      area: '第二步：计算气缸横截面积 A',
      gamma: '第三步：使用斜率计算空气比热容比 γ',
      relativeError: '第四步：计算相对误差',
    },
    precisionSignificant: (digits) => `保留 ${digits} 位有效数字`,
    correct: '正确',
    revealed: '已显示答案',
    reference: '参考答案：',
    feedback: {
      empty: '尚未填写',
      invalid: '请输入有效数值',
      'numeric-wrong': '数值不在容差内',
      'precision-wrong': '数值正确，有效数字不符合要求',
      wrong: '数值或有效数字不正确',
    },
    continueAnswer: '继续作答',
    revealAnswer: '查看并继续',
    check: '确认',
    ready: '拟合和全部计算均已完成，可以退出并保存本次引导结果。',
    completeAndExit: '完成并退出',
    closeButton: '关闭',
  },
  'zh-TW': {
    title: '活塞振動法資料計算',
    subtitle: '引導模式 · 離線擬合與計算',
    reviewSubtitle: '資料處理 · 已儲存過程回顧',
    close: '關閉活塞振動法計算視窗',
    tolerance: '判定說明：答案同時檢查數值與規定精度；數值落在允許容差內即可判定正確，因此你的答案可能與參考答案略有差異。',
    knownTitle: '實驗已知量',
    fitTitle: '第一步：選擇擬合資料點',
    fitInstruction: '單擊資料列可選取或取消選取。引導模式需要選取三組資料，再由軟體擬合 h = sT² + b。',
    fitReviewInstruction: '以下三組資料均已參與本次擬合；擬合函數與 R² 顯示在下方圖中。',
    fitSelectedCount: (selected, total) => `已選擇 ${selected} / ${total} 組`,
    fitRowAria: (runNumber, selected) => `第 ${runNumber} 組資料，${selected ? '已選取' : '未選取'}`,
    confirmFit: '確認並擬合',
    missingFitTitle: '請先選取全部三組資料',
    missingFitBody: '引導模式需要使用三組資料完成教學擬合。請單擊高亮區域內尚未選取的資料列，再次確認。',
    dismissReminder: '我知道了',
    fitResultTitle: '線性擬合結果',
    fitGraphAria: '以 T 平方為橫軸、h 為縱軸的線性擬合圖',
    chartXAxis: 'T² / s²',
    chartYAxis: 'h / m',
    stepTitle: {
      area: '第二步：計算氣缸橫截面積 A',
      gamma: '第三步：使用斜率計算空氣比熱容比 γ',
      relativeError: '第四步：計算相對誤差',
    },
    precisionSignificant: (digits) => `保留 ${digits} 位有效數字`,
    correct: '正確',
    revealed: '已顯示答案',
    reference: '參考答案：',
    feedback: {
      empty: '尚未填寫',
      invalid: '請輸入有效數值',
      'numeric-wrong': '數值不在容差內',
      'precision-wrong': '數值正確，有效數字不符合要求',
      wrong: '數值或有效數字不正確',
    },
    continueAnswer: '繼續作答',
    revealAnswer: '查看並繼續',
    check: '確認',
    ready: '擬合與全部計算均已完成，可以退出並儲存本次引導結果。',
    completeAndExit: '完成並退出',
    closeButton: '關閉',
  },
  en: {
    title: 'Piston-oscillation calculations',
    subtitle: 'Guided mode · Offline fit and calculation',
    reviewSubtitle: 'Data processing · Saved-work review',
    close: 'Close piston-oscillation calculation window',
    tolerance: 'Answer check: both the numerical value and required precision are checked. Values within the stated tolerance are accepted, so your entry may differ slightly from the reference.',
    knownTitle: 'Experimental known values',
    fitTitle: 'Step 1: select data points for the fit',
    fitInstruction: 'Click a data row to select or clear it. Guided mode requires all three rows before the software fits h = sT² + b.',
    fitReviewInstruction: 'All three data groups were used in this fit. The fitted function and R² appear in the chart below.',
    fitSelectedCount: (selected, total) => `${selected} / ${total} groups selected`,
    fitRowAria: (runNumber, selected) => `Data group ${runNumber}, ${selected ? 'selected' : 'not selected'}`,
    confirmFit: 'Confirm and fit',
    missingFitTitle: 'Select all three data groups first',
    missingFitBody: 'Guided mode uses all three groups for the teaching fit. Click each unselected row inside the highlighted area, then confirm again.',
    dismissReminder: 'Got it',
    fitResultTitle: 'Linear-fit result',
    fitGraphAria: 'Linear fit with T squared on the horizontal axis and h on the vertical axis',
    chartXAxis: 'T² / s²',
    chartYAxis: 'h / m',
    stepTitle: {
      area: 'Step 2: calculate cylinder area A',
      gamma: 'Step 3: calculate heat-capacity ratio γ from the slope',
      relativeError: 'Step 4: calculate relative error',
    },
    precisionSignificant: (digits) => `${digits} significant figures`,
    correct: 'Correct',
    revealed: 'Answer shown',
    reference: 'Reference: ',
    feedback: {
      empty: 'No answer entered',
      invalid: 'Enter a valid number',
      'numeric-wrong': 'Value is outside the tolerance',
      'precision-wrong': 'The numerical value is correct, but its precision is incorrect',
      wrong: 'Value or precision is incorrect',
    },
    continueAnswer: 'Try again',
    revealAnswer: 'Show & continue',
    check: 'Check',
    ready: 'The fit and all calculations are complete. Exit to save this guided result.',
    completeAndExit: 'Finish & exit',
    closeButton: 'Close',
  },
} as const satisfies Record<PistonOscillationLanguage, PistonOscillationCalculationCopy>;

export const getPistonOscillationCalculationCopy = (
  language: PistonOscillationLanguage,
) => PISTON_OSCILLATION_CALCULATION_COPY[language];
