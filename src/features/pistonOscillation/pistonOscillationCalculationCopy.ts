import type { PistonOscillationLanguage } from './pistonOscillationCopy.ts';

export interface PistonOscillationCalculationCopy {
  title: string;
  subtitle: string;
  freeSubtitle: string;
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
  nextCalculation: string;
  checkAll: string;
  numericFormatReminder: string;
  ready: string;
  freeReady: string;
  completeAndExit: string;
  closeButton: string;
}

export const PISTON_OSCILLATION_CALCULATION_COPY = {
  'zh-CN': {
    title: '活塞振动法数据计算',
    subtitle: '引导模式 · 离线拟合与计算',
    freeSubtitle: '自由模式 · 离线拟合与统一校验',
    reviewSubtitle: '数据处理 · 已保存过程回顾',
    close: '关闭活塞振动法计算窗口',
    tolerance: '判定说明：答案必须与按界面数据和规定精度逐步计算得到的参考值一致；后续步骤仅使用前一步已显示、已舍入的数值继续计算。',
    knownTitle: '实验已知量',
    fitTitle: '第一步：选择拟合数据点',
    fitInstruction: '单击数据行可选中或取消选中。需要选中全部已保存的数据，再由软件拟合 h = sT² + b。',
    fitReviewInstruction: '以下全部数据均已参与本次拟合；拟合函数与 R² 显示在下方图中。',
    fitSelectedCount: (selected, total) => `已选择 ${selected} / ${total} 组`,
    fitRowAria: (runNumber, selected) => `第 ${runNumber} 组数据，${selected ? '已选中' : '未选中'}`,
    confirmFit: '确认并拟合',
    missingFitTitle: '请先选中全部数据',
    missingFitBody: '本次拟合需要使用全部已保存的数据。请单击高亮区域内尚未选中的数据行，再次确认。',
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
      'numeric-wrong': '数值与参考答案不一致',
      'precision-wrong': '数值正确，有效数字不符合要求',
      wrong: '数值或有效数字不正确',
    },
    continueAnswer: '继续作答',
    revealAnswer: '查看并继续',
    check: '确认',
    nextCalculation: '继续下一项',
    checkAll: '统一校验三项结果',
    numericFormatReminder: '请先把三项输入都改为有效数值。空值、字母或不完整数字不会计入正式尝试。',
    ready: '拟合和全部计算均已完成，可以退出并保存本次引导结果。',
    freeReady: '拟合和三项计算均已完成，可以退出并保存本次自由模式结果。',
    completeAndExit: '完成并退出',
    closeButton: '关闭',
  },
  'zh-TW': {
    title: '活塞振動法資料計算',
    subtitle: '引導模式 · 離線擬合與計算',
    freeSubtitle: '自由模式 · 離線擬合與統一校驗',
    reviewSubtitle: '資料處理 · 已儲存過程回顧',
    close: '關閉活塞振動法計算視窗',
    tolerance: '判定說明：答案必須與按介面資料和規定精度逐步計算得到的參考值一致；後續步驟僅使用前一步已顯示、已舍入的數值繼續計算。',
    knownTitle: '實驗已知量',
    fitTitle: '第一步：選擇擬合資料點',
    fitInstruction: '單擊資料列可選取或取消選取。需要選取全部已儲存的資料，再由軟體擬合 h = sT² + b。',
    fitReviewInstruction: '以下全部資料均已參與本次擬合；擬合函數與 R² 顯示在下方圖中。',
    fitSelectedCount: (selected, total) => `已選擇 ${selected} / ${total} 組`,
    fitRowAria: (runNumber, selected) => `第 ${runNumber} 組資料，${selected ? '已選取' : '未選取'}`,
    confirmFit: '確認並擬合',
    missingFitTitle: '請先選取全部資料',
    missingFitBody: '本次擬合需要使用全部已儲存的資料。請單擊高亮區域內尚未選取的資料列，再次確認。',
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
      'numeric-wrong': '數值與參考答案不一致',
      'precision-wrong': '數值正確，有效數字不符合要求',
      wrong: '數值或有效數字不正確',
    },
    continueAnswer: '繼續作答',
    revealAnswer: '查看並繼續',
    check: '確認',
    nextCalculation: '繼續下一項',
    checkAll: '統一校驗三項結果',
    numericFormatReminder: '請先把三項輸入都改為有效數值。空值、字母或不完整數字不會計入正式嘗試。',
    ready: '擬合與全部計算均已完成，可以退出並儲存本次引導結果。',
    freeReady: '擬合與三項計算均已完成，可以退出並儲存本次自由模式結果。',
    completeAndExit: '完成並退出',
    closeButton: '關閉',
  },
  en: {
    title: 'Piston-oscillation calculations',
    subtitle: 'Guided mode · Offline fit and calculation',
    freeSubtitle: 'Free mode · Offline fit and unified validation',
    reviewSubtitle: 'Data processing · Saved-work review',
    close: 'Close piston-oscillation calculation window',
    tolerance: 'Answer check: the value must exactly match the reference obtained from the displayed data at the required precision. Each later step uses only the preceding displayed, rounded value.',
    knownTitle: 'Experimental known values',
    fitTitle: 'Step 1: select data points for the fit',
    fitInstruction: 'Click a data row to select or clear it. Select every saved row before the software fits h = sT² + b.',
    fitReviewInstruction: 'All saved data groups were used in this fit. The fitted function and R² appear in the chart below.',
    fitSelectedCount: (selected, total) => `${selected} / ${total} groups selected`,
    fitRowAria: (runNumber, selected) => `Data group ${runNumber}, ${selected ? 'selected' : 'not selected'}`,
    confirmFit: 'Confirm and fit',
    missingFitTitle: 'Select every data group first',
    missingFitBody: 'This fit uses every saved data group. Click each unselected row inside the highlighted area, then confirm again.',
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
      'numeric-wrong': 'Value does not match the reference',
      'precision-wrong': 'The numerical value is correct, but its precision is incorrect',
      wrong: 'Value or precision is incorrect',
    },
    continueAnswer: 'Try again',
    revealAnswer: 'Show & continue',
    check: 'Check',
    nextCalculation: 'Continue to next item',
    checkAll: 'Check all three results',
    numericFormatReminder: 'Make all three entries valid numbers first. Empty, alphabetic, or incomplete values are not recorded as a formal attempt.',
    ready: 'The fit and all calculations are complete. Exit to save this guided result.',
    freeReady: 'The fit and all three calculations are complete. Exit to save this Free-mode result.',
    completeAndExit: 'Finish & exit',
    closeButton: 'Close',
  },
} as const satisfies Record<PistonOscillationLanguage, PistonOscillationCalculationCopy>;

export const getPistonOscillationCalculationCopy = (
  language: PistonOscillationLanguage,
) => PISTON_OSCILLATION_CALCULATION_COPY[language];
