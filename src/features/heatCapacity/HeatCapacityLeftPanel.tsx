import React, { useMemo, useState } from 'react';
import { BarChart3, ChevronDown } from 'lucide-react';
import type {
  WorkbenchHeatCapacityPanelKey,
  WorkbenchHeatCapacityState,
} from '../workbench/workbenchState.ts';
import {
  getActiveHeatCapacityFreeTrialIndex,
  getHeatCapacityFreeRecordDisplayTrialIndex,
} from '../workbench/workbenchState.ts';
import {
  calculateHeatCapacityTrialResult,
  getHeatCapacityCompletedTrialCount,
  getHeatCapacityNextActiveTrialIndex,
  type HeatCapacityProcessingTrialResult,
  type HeatCapacityTrialRecordRemovalKind,
  type HeatCapacityTrialStatus,
} from '../../domain/heatCapacity/heatCapacityTrialModel.ts';
import {
  calculateFreeHeatCapacityMeanResult,
  type HeatCapacityFreeProcessingTrialResult,
} from '../../domain/heatCapacity/heatCapacityFreeTrialModel.ts';

type WorkbenchLanguagePreference = 'zh-CN' | 'zh-TW' | 'en';

interface HeatCapacityLeftPanelProps {
  file: WorkbenchHeatCapacityState;
  language: WorkbenchLanguagePreference;
  panelKey: WorkbenchHeatCapacityPanelKey;
  onExpectedTrialCountChange: (
    count: number,
    mode: WorkbenchHeatCapacityState['heatCapacityExpectedTrialCountMode'],
  ) => void;
  onCalculateResults: () => void;
  pendingRemoveTrialRecord: {
    trialIndex: number;
    kind: HeatCapacityTrialRecordRemovalKind;
  } | null;
  onRemoveTrialRecord: (
    trialIndex: number,
    kind: HeatCapacityTrialRecordRemovalKind,
  ) => void;
  onCancelRemoveTrialRecord: () => void;
}

interface DocumentDisclosureProps {
  id: string;
  title: React.ReactNode;
  children: React.ReactNode;
}

type LocalizedText = ReturnType<typeof text>;

const formatNumber = (value: number | null | undefined, digits = 2) => (
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--'
);

const formatGamma = (value: number | null | undefined) => (
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3) : '--'
);

const formatPercent = (value: number | null | undefined) => (
  typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)}%` : '--'
);

const formatFreeTrialCompletedAt = (value: number | null | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  const pad = (part: number) => part.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const HeatSub = ({ children }: { children: React.ReactNode }) => <sub>{children}</sub>;
const VarU = ({ index }: { index: React.ReactNode }) => <>U<sub>{index}</sub></>;
const VarUT = ({ index }: { index: React.ReactNode }) => <>U<sub>T{index}</sub></>;
const VarP = ({ index }: { index: React.ReactNode }) => <>P<sub>{index}</sub></>;
const VarDeltaP = ({ index }: { index: React.ReactNode }) => <>ΔP<sub>{index}</sub></>;
const VarGamma = ({ index }: { index?: React.ReactNode }) => <>γ{index !== undefined ? <sub>{index}</sub> : null}</>;
const GammaAir = () => <>γ<sub>air</sub></>;
const GammaMean = () => <>γ<sub>mean</sub></>;

const statusClass = (status: HeatCapacityTrialStatus) => (
  `studio-heat-trial-status studio-heat-trial-status-${status}`
);

const HEAT_CAPACITY_FORMULA_RESULT_PREVIEW_LIMIT = 3;

const copyByLanguage = {
  'zh-CN': {
    guide: '实验指引',
    recording: '数据记录',
    processing: '数据处理',
    dataAndResults: '数据与结果',
    panelKicker: '空气比热容比',
    title: '空气比热容比实验',
    subtitle: '本实验通过压缩空气、快速放气和回温过程记录压强差信号，并使用绝对压强对数公式计算空气比热容比。粒子动画只作为气体运动状态的可视化。',
    thinking: '进一步思考',
    known: '已知量',
    measured: '实验测得量',
    calculate: '计算结果',
    imported: '组完整数据已导入',
    emptyProcessing: '请先在数据记录页完成至少一组有效数据，再进行计算。',
    sampleScope: '仅属于空气比热容比实验',
    recordingHint: '引导模式需在正确阶段使用 3D 预览中的记录按钮；自动演示会自动记录相同字段。',
    recordingComplete: '数据记录已完成。请前往数据处理页并点击“计算结果”。',
    recordingNextTrial: '本组已完成；提示结束后可在上方模式栏点击“下一组实验”。',
    recordingReadyToProcess: '数据记录已完成，可进入数据处理并计算结果。',
    expectedTrials: '预计组数',
    currentTrial: (trialIndex: number) => `当前组：第 ${trialIndex} 组`,
    group: '组',
    custom: '自定义',
    customAria: '自定义预计组数',
    progress: (done: number, total: number) => `进度：已完成 ${done} / ${total} 组`,
    status: {
      waiting: '等待',
      partial: '部分记录',
      complete: '完成',
      invalid: '异常',
    } satisfies Record<HeatCapacityTrialStatus, string>,
    sample: {
      title: 'U₀ / U₁ / U₂ 过程采样',
      point: '采样点',
      value: '数值 / mV',
      time: '时间 / s',
      phase: '阶段',
      status: '状态',
      recorded: '已记录',
      pending: '待记录',
      zeroLabel: '调零后压强差信号',
      zeroPhase: '调零完成',
      u1Label: '快速放气前稳定值',
      u1Phase: '放气前稳定',
      u2Label: '回温后稳定值',
      u2Phase: '回温后稳定',
    },
    guideSections: {
      aimTitle: '1. 实验目的',
      aimBody: '测定空气的比热容比 γ，并理解压缩、快速放气和回温三个过程对压强与温度信号的影响。',
      apparatusTitle: '2. 仪器与读数',
      apparatusBody: '实验主要观察 Uₚ、Uₜ、指针压力表和玻璃旋塞状态。Uₚ 是压强差电压，Uₜ 是温度信号电压，最终计算采用空气实验的绝对压强对数公式。',
      procedureTitle: '3. 实验步骤',
      steps: [
        {
          title: 'Step 1：开启电源',
          body: '打开主机电源，等待数字仪表进入工作状态。未开机时读数无效，实时窗口也不应显示有效采集线。',
        },
        {
          title: 'Step 2：压强调零',
          body: '观察 Uₚ 是否接近 0，旋转压力调零旋钮，使 Uₚ 接近 0。调零只修正传感器显示基准，不改变瓶内真实气体状态。',
          question: '调零的意义是什么？',
          answer: '调零的意义不是改变瓶内气体状态，而是让压力传感器的显示基准回到零点附近。由于后续计算依赖放气前后的压强差电压，如果初始零点存在偏差，U₁ 和 U₂ 都可能带入系统误差。调零的目的就是尽量消除仪器初始偏移，使后续记录的 Uₚ 更接近真实压强差变化。',
        },
        {
          title: 'Step 3：打气加压',
          body: '关闭玻璃旋塞，打开打气阀门，连续打气，使瓶内压强升高。观察 Uₚ 快速升高，Uₜ 滞后变化，指针压力表同步上升。',
          question: '打气过程中 P、T、n 如何变化？',
          answer: '打气向瓶内加入空气，瓶内气体的物质的量 n 增加。瓶体体积 V 在实验中近似固定，根据 PV = nRT，n 的增加会使压强 P 明显升高。短时间压缩也可能使温度 T 升高，但温度传感器存在热响应过程，因此 Uₜ 的变化通常慢于 Uₚ。',
        },
        {
          title: 'Step 4：封闭等待稳定',
          body: '停止打气并保持瓶内封闭，等待 Uₚ 和 Uₜ 逐渐进入小范围波动。读数稳定后记录 U₁ / Uₜ₁。',
          question: '为什么要等待稳定后再记录？',
          answer: '打气结束后，瓶内气体仍在混合，传感器读数也可能继续变化，温度信号尤其容易滞后。如果在读数快速变化时记录，U₁ 不能代表放气前的稳定状态，从而影响 P₁ 和 γ 的计算。',
        },
        {
          title: 'Step 5：快速放气',
          body: '快速打开玻璃旋塞，使瓶内空气与外界连通，放气后及时关闭玻璃旋塞。不要在刚放气瞬间记录 U₂。',
          question: '为什么放气动作要尽量快速？',
          answer: '快速放气可以让瓶内气体在短时间内膨胀并对外做功，这个过程更接近绝热过程。若放气太慢，气体有更多时间与环境换热，实验计算会受到影响。',
        },
        {
          title: 'Step 6：等待回温并记录',
          body: '关闭玻璃旋塞后等待气体回温，直到 Uₜ 和 Uₚ 再次趋稳，然后记录 U₂ / Uₜ₂。',
          question: '为什么 U₂ 不能取放气瞬间值？',
          answer: '放气瞬间瓶内压强接近外界大气压，但瓶内气体温度尚未恢复。真实计算所需的 P₂ 是关闭旋塞并等待气体回温后得到的稳定压强，而不是刚放气时的瞬时压强。',
        },
      ],
    },
    formula: {
      pressure: '压强差换算',
      absolute: '绝对压强计算',
      gamma: '比热容比计算',
      average: '平均值与相对误差',
      result: '结果',
      meanGamma: '平均 γ',
      relativeError: '相对误差',
      showAllResults: '展开全部',
      collapseResults: '收起',
      previewLimitNotice: (visible: number, total: number) => `已显示前 ${visible} 组，共 ${total} 组`,
      resultStatus: '结果状态',
      valid: '有效',
      invalid: '异常',
      reasonable: '合理',
      notReady: '没有可用于计算的完整有效实验组。',
    },
    chart: {
      title: '各组 γ 计算结果',
      subtitle: '单组 γ / 理论 γ / 平均 γ',
      trialGamma: '单组 γ',
      theoreticalGamma: '理论 γ',
      meanGamma: '平均 γ',
    },
    table: {
      trial: '组次',
      status: '状态',
      action: '操作',
      deleteU0: '删除 U₀',
      deleteU1: '删除 U₁',
      deleteU2: '删除 U₂',
      deleteTrial: '删除本组',
      confirmDelete: '确认删除',
      cancel: '取消',
    },
    thinkingMeanTitle: '为什么多组实验应先分别计算 γᵢ，再对结果取平均？',
    thinkingMeanBody: '多组实验中，每组 U₁ᵢ 和 U₂ᵢ 是一对对应数据，应保持配对关系。本实验主公式是非线性公式，因此不应先平均多组 U₁ 和 U₂ 后只计算一次 γ。更合理的流程是每组先分别计算 γᵢ，再对所有有效 γᵢ 求平均。这样既保留每组实验内部数据的对应关系，也能让结果表显示每组实验的离散程度。',
  },
  'zh-TW': {
    guide: '實驗指引',
    recording: '資料記錄',
    processing: '資料處理',
    dataAndResults: '資料與結果',
    panelKicker: '空氣比熱容比',
    title: '空氣比熱容比實驗',
    subtitle: '本實驗透過壓縮空氣、快速放氣和回溫過程記錄壓強差信號，並使用絕對壓強對數公式計算空氣比熱容比。粒子動畫只作為氣體運動狀態的視覺化。',
    thinking: '進一步思考',
    known: '已知量',
    measured: '實驗測得量',
    calculate: '計算結果',
    imported: '組完整資料已匯入',
    emptyProcessing: '請先在資料記錄頁完成至少一組有效資料，再進行計算。',
    sampleScope: '僅屬於空氣比熱容比實驗',
    recordingHint: '引導模式需在正確階段使用 3D 預覽中的記錄按鈕；自動演示會自動記錄相同欄位。',
    recordingComplete: '資料記錄已完成。請前往資料處理頁並點擊「計算結果」。',
    recordingNextTrial: '本組已完成；提示結束後可在上方模式列點擊「下一組實驗」。',
    recordingReadyToProcess: '資料記錄已完成，可進入資料處理並計算結果。',
    expectedTrials: '預計組數',
    currentTrial: (trialIndex: number) => `目前組：第 ${trialIndex} 組`,
    group: '組',
    custom: '自訂',
    customAria: '自訂預計組數',
    progress: (done: number, total: number) => `進度：已完成 ${done} / ${total} 組`,
    status: {
      waiting: '等待',
      partial: '部分記錄',
      complete: '完成',
      invalid: '異常',
    } satisfies Record<HeatCapacityTrialStatus, string>,
    sample: {
      title: 'U₀ / U₁ / U₂ 過程採樣',
      point: '採樣點',
      value: '數值 / mV',
      time: '時間 / s',
      phase: '階段',
      status: '狀態',
      recorded: '已記錄',
      pending: '待記錄',
      zeroLabel: '調零後壓強差信號',
      zeroPhase: '調零完成',
      u1Label: '快速放氣前穩定值',
      u1Phase: '放氣前穩定',
      u2Label: '回溫後穩定值',
      u2Phase: '回溫後穩定',
    },
    guideSections: {
      aimTitle: '1. 實驗目的',
      aimBody: '測定空氣的比熱容比 γ，並理解壓縮、快速放氣和回溫三個過程對壓強與溫度信號的影響。',
      apparatusTitle: '2. 儀器與讀數',
      apparatusBody: '實驗主要觀察 Uₚ、Uₜ、指針壓力表和玻璃旋塞狀態。Uₚ 是壓強差電壓，Uₜ 是溫度信號電壓，最終計算採用空氣實驗的絕對壓強對數公式。',
      procedureTitle: '3. 實驗步驟',
      steps: [
        { title: 'Step 1：開啟電源', body: '打開主機電源，等待數位儀表進入工作狀態。未開機時讀數無效，實時窗口也不應顯示有效採集線。' },
        { title: 'Step 2：壓強調零', body: '觀察 Uₚ 是否接近 0，旋轉壓力調零旋鈕，使 Uₚ 接近 0。調零只修正感測器顯示基準，不改變瓶內真實氣體狀態。', question: '調零的意義是什麼？', answer: '調零的意義不是改變瓶內氣體狀態，而是讓壓力感測器的顯示基準回到零點附近。後續計算依賴放氣前後的壓強差電壓，如果初始零點存在偏差，U₁ 和 U₂ 都可能帶入系統誤差。' },
        { title: 'Step 3：打氣加壓', body: '關閉玻璃旋塞，打開打氣閥門，連續打氣，使瓶內壓強升高。觀察 Uₚ 快速升高，Uₜ 滯後變化，指針壓力表同步上升。', question: '打氣過程中 P、T、n 如何變化？', answer: '打氣向瓶內加入空氣，瓶內氣體的物質的量 n 增加。瓶體體積 V 近似固定，根據 PV = nRT，n 的增加會使壓強 P 明顯升高。短時間壓縮也可能使溫度 T 升高，但 Uₜ 的變化通常慢於 Uₚ。' },
        { title: 'Step 4：封閉等待穩定', body: '停止打氣並保持瓶內封閉，等待 Uₚ 和 Uₜ 逐漸進入小範圍波動。讀數穩定後記錄 U₁ / Uₜ₁。', question: '為什麼要等待穩定後再記錄？', answer: '打氣結束後，瓶內氣體仍在混合，感測器讀數也可能繼續變化。如果在讀數快速變化時記錄，U₁ 不能代表放氣前的穩定狀態，從而影響 P₁ 和 γ 的計算。' },
        { title: 'Step 5：快速放氣', body: '快速打開玻璃旋塞，使瓶內空氣與外界連通，放氣後及時關閉玻璃旋塞。不要在剛放氣瞬間記錄 U₂。', question: '為什麼放氣動作要盡量快速？', answer: '快速放氣可以讓瓶內氣體在短時間內膨脹並對外做功，這個過程更接近絕熱過程。若放氣太慢，氣體有更多時間與環境換熱，實驗計算會受到影響。' },
        { title: 'Step 6：等待回溫並記錄', body: '關閉玻璃旋塞後等待氣體回溫，直到 Uₜ 和 Uₚ 再次趨穩，然後記錄 U₂ / Uₜ₂。', question: '為什麼 U₂ 不能取放氣瞬間值？', answer: '放氣瞬間瓶內壓強接近外界大氣壓，但瓶內氣體溫度尚未恢復。真實計算所需的 P₂ 是關閉旋塞並等待氣體回溫後得到的穩定壓強，而不是剛放氣時的瞬時壓強。' },
      ],
    },
    formula: {
      pressure: '壓強差換算',
      absolute: '絕對壓強計算',
      gamma: '比熱容比計算',
      average: '平均值與相對誤差',
      result: '結果',
      meanGamma: '平均 γ',
      relativeError: '相對誤差',
      showAllResults: '展開全部',
      collapseResults: '收起',
      previewLimitNotice: (visible: number, total: number) => `已顯示前 ${visible} 組，共 ${total} 組`,
      resultStatus: '結果狀態',
      valid: '有效',
      invalid: '異常',
      reasonable: '合理',
      notReady: '沒有可用於計算的完整有效實驗組。',
    },
    chart: {
      title: '各組 γ 計算結果',
      subtitle: '單組 γ / 理論 γ / 平均 γ',
      trialGamma: '單組 γ',
      theoreticalGamma: '理論 γ',
      meanGamma: '平均 γ',
    },
    table: {
      trial: '組次',
      status: '狀態',
      action: '操作',
      deleteU0: '刪除 U₀',
      deleteU1: '刪除 U₁',
      deleteU2: '刪除 U₂',
      deleteTrial: '刪除本組',
      confirmDelete: '確認刪除',
      cancel: '取消',
    },
    thinkingMeanTitle: '為什麼多組實驗應先分別計算 γᵢ，再對結果取平均？',
    thinkingMeanBody: '多組實驗中，每組 U₁ᵢ 和 U₂ᵢ 是一對對應資料，應保持配對關係。本實驗主公式是非線性公式，因此不應先平均多組 U₁ 和 U₂ 後只計算一次 γ。更合理的流程是每組先分別計算 γᵢ，再對所有有效 γᵢ 求平均。',
  },
  en: {
    guide: 'Experiment Guide',
    recording: 'Data Recording',
    processing: 'Data Processing',
    dataAndResults: 'Data & Results',
    panelKicker: 'Air Heat Capacity Ratio',
    title: 'Air Heat Capacity Ratio Experiment',
    subtitle: 'This experiment records pressure-difference signals during air compression, quick release, and thermal recovery, then calculates the air heat capacity ratio with the absolute-pressure logarithm formula. The particle animation is only a gas-motion visualization.',
    thinking: 'Further Thinking',
    known: 'Known Values',
    measured: 'Measured Values',
    calculate: 'Calculate Results',
    imported: 'complete trial(s) imported',
    emptyProcessing: 'Complete at least one valid trial in Data Recording before calculating results.',
    sampleScope: 'Heat Capacity only',
    recordingHint: 'Guide mode records through the stage buttons in the 3D preview. Auto demo records the same fields automatically.',
    recordingComplete: 'Data recording complete. Go to Data Processing and click Calculate Results.',
    recordingNextTrial: 'This trial is complete. After the notice, use Next Trial in the mode bar.',
    recordingReadyToProcess: 'Data recording is complete. You can calculate results in Data Processing.',
    expectedTrials: 'Expected trials',
    currentTrial: (trialIndex: number) => `Current trial: ${trialIndex}`,
    group: 'trials',
    custom: 'Custom',
    customAria: 'Custom expected trial count',
    progress: (done: number, total: number) => `Progress: ${done} / ${total} trials completed`,
    status: {
      waiting: 'Waiting',
      partial: 'Partial',
      complete: 'Complete',
      invalid: 'Invalid',
    } satisfies Record<HeatCapacityTrialStatus, string>,
    sample: {
      title: 'U₀ / U₁ / U₂ Process Samples',
      point: 'Sample',
      value: 'Value / mV',
      time: 'Time / s',
      phase: 'Phase',
      status: 'Status',
      recorded: 'Recorded',
      pending: 'Pending',
      zeroLabel: 'Zeroed pressure-difference signal',
      zeroPhase: 'Zero complete',
      u1Label: 'Stable value before quick release',
      u1Phase: 'Before release stable',
      u2Label: 'Stable value after thermal recovery',
      u2Phase: 'After recovery stable',
    },
    guideSections: {
      aimTitle: '1. Aim',
      aimBody: 'Measure the heat capacity ratio γ of air and understand how compression, quick release, and thermal recovery affect pressure and temperature signals.',
      apparatusTitle: '2. Apparatus and Readings',
      apparatusBody: 'The experiment observes Uₚ, Uₜ, the pointer pressure gauge, and the glass stopcock. Uₚ is the pressure-difference voltage, Uₜ is the temperature signal voltage, and the final calculation uses the absolute-pressure logarithm formula for air.',
      procedureTitle: '3. Procedure',
      steps: [
        { title: 'Step 1: Power on', body: 'Turn on the instrument and wait for the digital meters to enter working state. Before power-on, readings are invalid.' },
        { title: 'Step 2: Zero the pressure signal', body: 'Observe whether Uₚ is close to 0 and rotate the pressure-zero knob until Uₚ approaches 0. Zeroing corrects the sensor display reference, not the real gas state.', question: 'What is the purpose of zeroing?', answer: 'Zeroing does not change the gas state inside the bottle. It brings the pressure sensor display reference back near zero. Because later calculations depend on pressure-difference voltages before and after release, an initial offset would introduce systematic error into both U₁ and U₂.' },
        { title: 'Step 3: Pump and pressurize', body: 'Close the glass stopcock, open the pump valve, and pump continuously so that the bottle pressure rises. Uₚ rises quickly, Uₜ responds with delay, and the pointer pressure gauge rises.', question: 'How do P, T, and n change during pumping?', answer: 'Pumping adds air to the bottle, so the amount of gas n increases. With nearly fixed volume V, PV = nRT means that increasing n drives pressure P upward. Short compression may also raise temperature T, but Uₜ usually changes more slowly than Uₚ because of sensor thermal response.' },
        { title: 'Step 4: Wait for sealed stabilization', body: 'Stop pumping and keep the bottle sealed until Uₚ and Uₜ enter small-range fluctuation. Record U₁ / Uₜ₁ after readings stabilize.', question: 'Why record after stabilization?', answer: 'After pumping, gas mixing and sensor response continue for a short time. Recording while readings are changing would make U₁ fail to represent the stable state before release, affecting P₁ and γ.' },
        { title: 'Step 5: Quick release', body: 'Open the glass stopcock quickly to connect the bottle to the atmosphere, then close it promptly. Do not record U₂ at the release instant.', question: 'Why must release be quick?', answer: 'A quick release lets the gas expand and do work over a short period, which is closer to an adiabatic process. If release is too slow, heat exchange with the environment becomes significant and affects the calculation.' },
        { title: 'Step 6: Recover and record', body: 'After closing the stopcock, wait for the gas to recover thermally until Uₜ and Uₚ stabilize again, then record U₂ / Uₜ₂.', question: 'Why cannot U₂ be the instant release value?', answer: 'At the release instant, bottle pressure is near atmospheric pressure, but the gas temperature has not recovered. The required P₂ is the stable pressure after the closed bottle returns toward ambient temperature, not the transient pressure right after release.' },
      ],
    },
    formula: {
      pressure: 'Pressure Difference Conversion',
      absolute: 'Absolute Pressure Calculation',
      gamma: 'Gamma Calculation',
      average: 'Average and Relative Error',
      result: 'Result',
      meanGamma: 'Mean γ',
      relativeError: 'Relative error',
      showAllResults: 'Show all',
      collapseResults: 'Collapse',
      previewLimitNotice: (visible: number, total: number) => `Showing first ${visible} of ${total} trials`,
      resultStatus: 'Result status',
      valid: 'Valid',
      invalid: 'Invalid',
      reasonable: 'Reasonable',
      notReady: 'No complete valid trial is available for calculation.',
    },
    chart: {
      title: 'Gamma Result by Trial',
      subtitle: 'Trial γ / theoretical γ / mean γ',
      trialGamma: 'Trial γ',
      theoreticalGamma: 'Theoretical γ',
      meanGamma: 'Mean γ',
    },
    table: {
      trial: 'Trial',
      status: 'Status',
      action: 'Action',
      deleteU0: 'Delete U₀',
      deleteU1: 'Delete U₁',
      deleteU2: 'Delete U₂',
      deleteTrial: 'Delete trial',
      confirmDelete: 'Confirm Delete',
      cancel: 'Cancel',
    },
    thinkingMeanTitle: 'Why calculate each γᵢ first, then average the results?',
    thinkingMeanBody: 'In repeated experiments, each U₁ᵢ and U₂ᵢ pair belongs to one trial and should remain paired. The main formula is nonlinear, so averaging all U₁ and U₂ values first and calculating a single γ would change that pairing. Calculating γᵢ for each valid trial first preserves the internal relationship of each trial and exposes trial-to-trial variation.',
  },
} as const;

const freeCopyByLanguage = {
  'zh-CN': {
    freeRecording: {
      dataAndResultsTitle: '数据与结果',
      title: '自由模式记录',
      source: '数据来源',
      automaticCandidate: '自动 U₀ 候选',
      automaticWaiting: '等待稳定的调零开旋塞状态',
      automaticSource: '传感器候选值',
      currentTrialTitle: '当前实验组记录',
      currentTrialBadge: (trialIndex: number) => `第 ${trialIndex} 组`,
      manualU0: 'U₀ 正式记录',
      manualU1: 'U₁ 正式记录',
      manualU2: 'U₂ 正式记录',
      record: '记录',
      pressure: '压强 / mV',
      temperature: '温度 / mV',
      freeTrialSource: '实验组概况',
      completeTrials: (count: number) => `${count} 组完整实验`,
      totalRows: (count: number) => `共 ${count} 组记录`,
      trial: '组次',
      completedAt: '完成时间',
      u0Display: 'U₀ 记录值 / mV',
      u1Display: 'U₁ 记录值 / mV',
      u2Display: 'U₂ 记录值 / mV',
      u1Corrected: 'U₁ 扣零值 / mV',
      u2Corrected: 'U₂ 扣零值 / mV',
      status: '状态',
      emptyRecords: '暂无实验组记录。',
      statusComplete: '完成',
      statusPending: '待记录',
      summaryLine: (theoreticalGamma: string, trialCount: number, meanGamma: string, relativeError: string) => `理论 γ = ${theoreticalGamma}　实验组数 = ${trialCount}　平均 γ = ${meanGamma}　相对误差 = ${relativeError}`,
      calculationDetails: '计算详情',
      includedInMean: '是否参与当前平均',
      included: '参与',
      excluded: '不参与',
      notCalculable: '无法计算',
      reason: '原因',
    },
    guideResult: {
      title: '引导模式单组结果',
      source: '数据来源：引导模式独立实验组',
      waiting: '尚未完成引导实验。',
      completed: '引导实验已完成。',
      record: '记录',
      pressure: '压强 / mV',
      temperature: '温度 / mV',
      corrected: '扣零值 / mV',
      gamma: 'γ',
      completedAt: '完成时间',
      status: '状态',
      pending: '待记录',
      done: '完成',
      resultSummary: (theoreticalGamma: string, gamma: string, relativeError: string) => `理论 γ = ${theoreticalGamma}　单组 γ = ${gamma}　相对误差 = ${relativeError}`,
    },
  },
  'zh-TW': {
    freeRecording: {
      dataAndResultsTitle: '資料與結果',
      title: '自由模式記錄',
      source: '資料來源',
      automaticCandidate: '自動 U₀ 候選',
      automaticWaiting: '等待穩定的調零開旋塞狀態',
      automaticSource: '感測器候選值',
      currentTrialTitle: '目前實驗組記錄',
      currentTrialBadge: (trialIndex: number) => `第 ${trialIndex} 組`,
      manualU0: 'U₀ 正式記錄',
      manualU1: 'U₁ 正式記錄',
      manualU2: 'U₂ 正式記錄',
      record: '記錄',
      pressure: '壓強 / mV',
      temperature: '溫度 / mV',
      freeTrialSource: '實驗組概況',
      completeTrials: (count: number) => `${count} 組完整實驗`,
      totalRows: (count: number) => `共 ${count} 組記錄`,
      trial: '組次',
      completedAt: '完成時間',
      u0Display: 'U₀ 記錄值 / mV',
      u1Display: 'U₁ 記錄值 / mV',
      u2Display: 'U₂ 記錄值 / mV',
      u1Corrected: 'U₁ 扣零值 / mV',
      u2Corrected: 'U₂ 扣零值 / mV',
      status: '狀態',
      emptyRecords: '暫無實驗組記錄。',
      statusComplete: '完成',
      statusPending: '待記錄',
      summaryLine: (theoreticalGamma: string, trialCount: number, meanGamma: string, relativeError: string) => `理論 γ = ${theoreticalGamma}　實驗組數 = ${trialCount}　平均 γ = ${meanGamma}　相對誤差 = ${relativeError}`,
      calculationDetails: '計算詳情',
      includedInMean: '是否參與目前平均',
      included: '參與',
      excluded: '不參與',
      notCalculable: '無法計算',
      reason: '原因',
    },
    guideResult: {
      title: '引導模式單組結果',
      source: '資料來源：引導模式獨立實驗組',
      waiting: '尚未完成引導實驗。',
      completed: '引導實驗已完成。',
      record: '記錄',
      pressure: '壓強 / mV',
      temperature: '溫度 / mV',
      corrected: '扣零值 / mV',
      gamma: 'γ',
      completedAt: '完成時間',
      status: '狀態',
      pending: '待記錄',
      done: '完成',
      resultSummary: (theoreticalGamma: string, gamma: string, relativeError: string) => `理論 γ = ${theoreticalGamma}　單組 γ = ${gamma}　相對誤差 = ${relativeError}`,
    },
  },
  en: {
    freeRecording: {
      dataAndResultsTitle: 'Data & Results',
      title: 'Free Mode records',
      source: 'Source: Free physical / sensor / calibration / record layers',
      automaticCandidate: 'Automatic U₀ candidate',
      automaticWaiting: 'Waiting for stable zeroed open-stopcock state',
      automaticSource: 'Free sensor display candidate',
      currentTrialTitle: 'Current Free trial records',
      currentTrialBadge: (trialIndex: number) => `Trial ${trialIndex}`,
      manualU0: 'Official U₀ record',
      manualU1: 'Official U₁ record',
      manualU2: 'Official U₂ record',
      record: 'Record',
      pressure: 'Pressure / mV',
      temperature: 'Temperature / mV',
      freeTrialSource: 'Free trial source',
      completeTrials: (count: number) => `${count} complete Free trial(s)`,
      totalRows: (count: number) => `${count} total Free record row(s)`,
      trial: 'Trial',
      completedAt: 'Completed at',
      u0Display: 'U₀ recorded / mV',
      u1Display: 'U₁ recorded / mV',
      u2Display: 'U₂ recorded / mV',
      u1Corrected: 'U₁ zero-corrected / mV',
      u2Corrected: 'U₂ zero-corrected / mV',
      status: 'Status',
      emptyRecords: 'No Free Mode records yet.',
      statusComplete: 'complete',
      statusPending: 'pending',
      summaryLine: (theoreticalGamma: string, trialCount: number, meanGamma: string, relativeError: string) => `theoretical γ = ${theoreticalGamma}  experiment groups = ${trialCount}  mean γ = ${meanGamma}  relative error = ${relativeError}`,
      calculationDetails: 'Calculation details',
      includedInMean: 'Included in current mean',
      included: 'included',
      excluded: 'excluded',
      notCalculable: 'not calculable',
      reason: 'Reason',
    },
    guideResult: {
      title: 'Guide single-trial result',
      source: 'Source: independent Guide trial',
      waiting: 'Guide experiment is not complete yet.',
      completed: 'Guide experiment complete.',
      record: 'Record',
      pressure: 'Pressure / mV',
      temperature: 'Temperature / mV',
      corrected: 'Zero-corrected / mV',
      gamma: 'γ',
      completedAt: 'Completed at',
      status: 'Status',
      pending: 'pending',
      done: 'complete',
      resultSummary: (theoreticalGamma: string, gamma: string, relativeError: string) => `theoretical γ = ${theoreticalGamma}  single-trial γ = ${gamma}  relative error = ${relativeError}`,
    },
  },
} as const;

const text = (language: WorkbenchLanguagePreference) => ({
  ...(copyByLanguage[language] ?? copyByLanguage['zh-CN']),
  ...(freeCopyByLanguage[language] ?? freeCopyByLanguage['zh-CN']),
});

const DocumentDisclosure = ({ id, title, children }: DocumentDisclosureProps) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`studio-heat-thinking ${open ? 'studio-heat-thinking-open' : ''}`} data-thinking-id={id}>
      <button
        type="button"
        className="studio-heat-thinking-trigger"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{title}</span>
        <ChevronDown size={14} className="studio-heat-thinking-chevron" />
      </button>
      <div className="studio-heat-thinking-body">
        <div>{children}</div>
      </div>
    </div>
  );
};

const renderProcessSampleStatus = (
  file: WorkbenchHeatCapacityState,
  copy: LocalizedText,
  renderRemoveRecordButton: (
    trialIndex: number,
    kind: HeatCapacityTrialRecordRemovalKind,
    visible: boolean,
  ) => React.ReactNode,
) => {
  const beforeReleaseSample = file.heatCapacityProcessSamples.stableBeforeReleaseSample
    ?? file.heatCapacityProcessSamples.beforeReleaseSample
    ?? file.heatCapacityProcessSamples.pumpPeakSample
    ?? null;
  const sampleTrialIndex = Math.min(
    file.heatCapacityTrials.length - 1,
    Math.max(0, file.heatCapacityActiveTrialIndex),
  );
  const sampleTrial = file.heatCapacityTrials[sampleTrialIndex] ?? null;
  const hasSampleTrialU1Record = sampleTrial !== null &&
    (sampleTrial.U1Mv !== null || sampleTrial.UT1Mv !== null);
  const hasSampleTrialU2Record = sampleTrial !== null &&
    (sampleTrial.U2Mv !== null || sampleTrial.UT2Mv !== null);
  const rows = [
    {
      key: 'U₀',
      label: copy.sample.zeroLabel,
      phase: copy.sample.zeroPhase,
      sample: file.heatCapacityProcessSamples.zeroedSample ?? null,
      kind: null,
      actionVisible: false,
    },
    {
      key: 'U₁',
      label: copy.sample.u1Label,
      phase: copy.sample.u1Phase,
      sample: beforeReleaseSample,
      kind: 'u1' as const,
      actionVisible: hasSampleTrialU1Record,
    },
    {
      key: 'U₂',
      label: copy.sample.u2Label,
      phase: copy.sample.u2Phase,
      sample: file.heatCapacityProcessSamples.recoverySample ?? null,
      kind: 'u2' as const,
      actionVisible: hasSampleTrialU2Record,
    },
  ];

  return (
    <section className="studio-heat-sample-status" data-heat-capacity-sample-status="true">
      <div className="studio-heat-sample-status-header">
        <strong>{copy.sample.title}</strong>
        <span>{copy.sampleScope}</span>
      </div>
      <div className="studio-heat-sample-grid">
        <div className="studio-heat-sample-row studio-heat-sample-head">
          <span>{copy.sample.point}</span>
          <span>{copy.sample.value}</span>
          <span>{copy.sample.time}</span>
          <span>{copy.sample.phase}</span>
          <span>{copy.sample.status}</span>
          <span>{copy.table.action}</span>
        </div>
        {rows.map((row) => (
          <div className="studio-heat-sample-row" key={row.key}>
            <span><strong>{row.key}</strong><em>{row.label}</em></span>
            <span>{formatNumber(row.sample?.pressureSignalMv, 2)}</span>
            <span>{formatNumber(row.sample?.timeS, 1)}</span>
            <span>{row.phase}</span>
            <span className={row.sample ? 'studio-heat-sample-recorded' : 'studio-heat-sample-waiting'}>
              {row.sample ? copy.sample.recorded : copy.sample.pending}
            </span>
            <span>
              {row.kind ? renderRemoveRecordButton(sampleTrialIndex, row.kind, row.actionVisible) : null}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

const renderGuideTab = (language: WorkbenchLanguagePreference) => {
  const copy = text(language);
  return (
    <div className="studio-heat-guide-doc">
      <header className="studio-heat-doc-header">
        <span className="studio-heat-doc-kicker">FD-NCD-C</span>
        <h3>{copy.title}</h3>
        <p>{copy.subtitle}</p>
      </header>

      <section className="studio-heat-guide-section">
        <h4>{copy.guideSections.aimTitle}</h4>
        <p>{copy.guideSections.aimBody}</p>
      </section>

      <section className="studio-heat-guide-section">
        <h4>{copy.guideSections.apparatusTitle}</h4>
        <p>
          {copy.guideSections.apparatusBody}
        </p>
      </section>

      <section className="studio-heat-guide-section">
        <h4>{copy.guideSections.procedureTitle}</h4>
        {copy.guideSections.steps.map((step, index) => (
          <div className="studio-heat-step-block" key={step.title}>
            <h5>{step.title}</h5>
            <p>{step.body}</p>
            {'question' in step && step.question ? (
              <DocumentDisclosure id={`heat-guide-thinking-${index}`} title={`${copy.thinking}: ${step.question}`}>
                <p>{step.answer}</p>
              </DocumentDisclosure>
            ) : null}
          </div>
        ))}
      </section>
    </div>
  );
};

const renderFreeDataAndResultsTab = (
  file: WorkbenchHeatCapacityState,
  copy: LocalizedText,
  pendingRemoveTrialRecord: HeatCapacityLeftPanelProps['pendingRemoveTrialRecord'],
  onRemoveTrialRecord: HeatCapacityLeftPanelProps['onRemoveTrialRecord'],
  onCancelRemoveTrialRecord: HeatCapacityLeftPanelProps['onCancelRemoveTrialRecord'],
) => {
  const automaticU0 = file.heatCapacityFreeCalibrationState.automaticU0;
  const completed = file.heatCapacityFreeTrials.filter((trial) => trial.u0 && trial.u1 && trial.u2).length;
  const result = calculateFreeHeatCapacityMeanResult(file.heatCapacityFreeTrials, {
    theoreticalGamma: file.theoreticalGamma,
    atmosphericPressureKPa: file.heatCapacityFreeEnvironmentConfig.ambientPressureKPa,
    pressureSensitivityMvPerKPa: file.heatCapacityFreeSensorConfig.pressureMvPerKPa,
  });
  const trialResultsById = new Map<string, HeatCapacityFreeProcessingTrialResult>(
    result.trialResults.map((trial) => [trial.trialId, trial]),
  );
  const activeFreeTrialIndex = getActiveHeatCapacityFreeTrialIndex(file);
  const displayFreeTrialIndex = getHeatCapacityFreeRecordDisplayTrialIndex(file);
  const currentFreeTrialIndex = displayFreeTrialIndex >= 0 ? displayFreeTrialIndex : file.heatCapacityFreeTrials.length;
  const currentFreeTrial = displayFreeTrialIndex >= 0 ? file.heatCapacityFreeTrials[displayFreeTrialIndex] ?? null : null;
  const currentFreeTrialEditable = displayFreeTrialIndex === activeFreeTrialIndex && activeFreeTrialIndex >= 0;
  const summaryLine = copy.freeRecording.summaryLine(
    file.theoreticalGamma.toFixed(2),
    result.validTrialCount,
    formatGamma(result.meanGamma),
    formatPercent(result.relativeErrorPercent),
  );
  const renderRemoveRecordButton = (
    trialIndex: number,
    kind: HeatCapacityTrialRecordRemovalKind,
    visible: boolean,
  ) => {
    if (!visible) return null;
    const pending = pendingRemoveTrialRecord?.trialIndex === trialIndex &&
      pendingRemoveTrialRecord.kind === kind;
    const label = kind === 'u0'
      ? copy.table.deleteU0
      : kind === 'u1'
        ? copy.table.deleteU1
        : kind === 'u2'
          ? copy.table.deleteU2
          : copy.table.deleteTrial;
    return (
      <span className={`studio-table-action-row ${pending ? 'studio-table-action-row-pending' : ''}`}>
        <button
          type="button"
          className={`studio-table-action ${pending ? 'studio-table-action-confirm' : ''}`}
          onClick={() => onRemoveTrialRecord(trialIndex, kind)}
        >
          {pending ? copy.table.confirmDelete : label}
        </button>
        {pending ? (
          <button
            type="button"
            className="studio-table-action studio-table-action-cancel"
            onClick={onCancelRemoveTrialRecord}
          >
            {copy.table.cancel}
          </button>
        ) : null}
      </span>
    );
  };
  const renderCurrentFreeRecordRow = (
    key: string,
    label: string,
    record: NonNullable<WorkbenchHeatCapacityState['heatCapacityFreeTrials'][number]['u0']> | null,
    action: React.ReactNode,
  ) => (
    <div className="studio-heat-sample-row" key={key}>
      <span><strong>{key}</strong><em>{label}</em></span>
      <span>{formatNumber(record?.displayPressureMv, 2)}</span>
      <span>{formatNumber(record?.displayTemperatureMv, 2)}</span>
      <span className={record ? 'studio-heat-sample-recorded' : 'studio-heat-sample-waiting'}>
        {record ? copy.freeRecording.statusComplete : copy.freeRecording.statusPending}
      </span>
      <span>{action}</span>
    </div>
  );
  return (
    <div
      className="studio-heat-recording"
      data-heat-capacity-recording-tab="true"
      data-heat-capacity-record-source={file.heatCapacityMode}
    >
      <div className="studio-result-status studio-result-status-ready">
        <strong>{copy.freeRecording.dataAndResultsTitle}</strong>
        <span>{copy.freeRecording.source}</span>
      </div>
      <section className="studio-heat-sample-status" data-heat-capacity-free-u0-status="true">
        <div className="studio-heat-sample-status-header">
          <strong>{copy.freeRecording.automaticCandidate}</strong>
          <span>{automaticU0 ? automaticU0.zeroEventId : copy.freeRecording.automaticWaiting}</span>
        </div>
        <div className="studio-heat-sample-grid studio-heat-free-record-grid">
          <div className="studio-heat-sample-row studio-heat-sample-head">
            <span>{copy.freeRecording.record}</span>
            <span>{copy.freeRecording.pressure}</span>
            <span>{copy.freeRecording.temperature}</span>
            <span>{copy.freeRecording.status}</span>
            <span>{copy.freeRecording.source}</span>
          </div>
          <div className="studio-heat-sample-row">
            <span><strong>{copy.freeRecording.automaticCandidate}</strong></span>
            <span>{formatNumber(automaticU0?.displayPressureMv, 2)}</span>
            <span>{formatNumber(automaticU0?.displayTemperatureMv, 2)}</span>
            <span className={automaticU0 ? 'studio-heat-sample-recorded' : 'studio-heat-sample-waiting'}>
              {automaticU0 ? copy.freeRecording.statusComplete : copy.freeRecording.statusPending}
            </span>
            <span>{copy.freeRecording.automaticSource}</span>
          </div>
        </div>
      </section>
      <section className="studio-heat-sample-status" data-heat-capacity-free-current-trial-status="true">
        <div className="studio-heat-sample-status-header">
          <strong>{copy.freeRecording.currentTrialTitle}</strong>
          <span>{currentFreeTrial ? copy.freeRecording.currentTrialBadge(currentFreeTrialIndex + 1) : copy.freeRecording.statusPending}</span>
        </div>
        <div className="studio-heat-sample-grid studio-heat-free-record-grid">
          <div className="studio-heat-sample-row studio-heat-sample-head">
            <span>{copy.freeRecording.record}</span>
            <span>{copy.freeRecording.pressure}</span>
            <span>{copy.freeRecording.temperature}</span>
            <span>{copy.freeRecording.status}</span>
            <span>{copy.table.action}</span>
          </div>
          {renderCurrentFreeRecordRow(
            'U₀',
            copy.freeRecording.manualU0,
            currentFreeTrial?.u0 ?? null,
            renderRemoveRecordButton(currentFreeTrialIndex, 'u0', currentFreeTrialEditable && (currentFreeTrial?.u0 ?? null) !== null),
          )}
          {renderCurrentFreeRecordRow(
            'U₁',
            copy.freeRecording.manualU1,
            currentFreeTrial?.u1 ?? null,
            renderRemoveRecordButton(currentFreeTrialIndex, 'u1', currentFreeTrialEditable && (currentFreeTrial?.u1 ?? null) !== null),
          )}
          {renderCurrentFreeRecordRow(
            'U₂',
            copy.freeRecording.manualU2,
            currentFreeTrial?.u2 ?? null,
            renderRemoveRecordButton(currentFreeTrialIndex, 'u2', currentFreeTrialEditable && (currentFreeTrial?.u2 ?? null) !== null),
          )}
        </div>
      </section>
      <div className="studio-heat-recording-controls">
        <div className="studio-heat-recording-progress">
          <span>{copy.freeRecording.freeTrialSource}</span>
          <strong>{copy.freeRecording.completeTrials(completed)}</strong>
          <span>{copy.freeRecording.totalRows(file.heatCapacityFreeTrials.length)}</span>
        </div>
      </div>
      <section className="studio-heat-result-summary-line" data-heat-capacity-free-result-summary="true">
        <strong>{summaryLine}</strong>
      </section>
      <div className="studio-heat-table-scroll">
        <table className="studio-table studio-heat-recording-table" data-heat-capacity-free-record-table="true">
          <thead>
            <tr>
              <th>{copy.freeRecording.trial}</th>
              <th>{copy.freeRecording.completedAt}</th>
              <th>{copy.freeRecording.u0Display}</th>
              <th>{copy.freeRecording.u1Display}</th>
              <th>{copy.freeRecording.u2Display}</th>
              <th>γ</th>
              <th>{copy.freeRecording.status}</th>
              <th>{copy.table.action}</th>
            </tr>
          </thead>
          <tbody>
            {file.heatCapacityFreeTrials.length === 0 ? (
              <tr>
                <td colSpan={8}>{copy.freeRecording.emptyRecords}</td>
              </tr>
            ) : file.heatCapacityFreeTrials.map((trial, index) => {
              const trialResult = trialResultsById.get(trial.id) ?? null;
              const completeTrial = Boolean(trial.u0 && trial.u1 && trial.u2);
              const includedInMean = trialResult?.status === 'valid' && trialResult.gamma !== null;
              const statusText = !completeTrial
                ? trial.blockedReason ?? copy.freeRecording.statusPending
                : includedInMean
                  ? copy.freeRecording.statusComplete
                  : copy.freeRecording.notCalculable;
              return (
                <React.Fragment key={trial.id}>
                  <tr>
                    <td>{index + 1}</td>
                    <td>{formatFreeTrialCompletedAt(trial.completedAtMs)}</td>
                    <td>{formatNumber(trial.u0?.displayPressureMv, 2)}</td>
                    <td>{formatNumber(trial.u1?.displayPressureMv, 2)}</td>
                    <td>{formatNumber(trial.u2?.displayPressureMv, 2)}</td>
                    <td>{formatGamma(trialResult?.gamma)}</td>
                    <td>{statusText}</td>
                    <td>
                      <div className="studio-table-action-row">
                        {renderRemoveRecordButton(
                          index,
                          'trial',
                          trial.u0 !== null || trial.u1 !== null || trial.u2 !== null,
                        )}
                      </div>
                    </td>
                  </tr>
                  <tr data-heat-capacity-free-trial-detail="true">
                    <td colSpan={8}>
                      <DocumentDisclosure id={`free-trial-detail-${trial.id}`} title={copy.freeRecording.calculationDetails}>
                        <div className="studio-heat-sample-grid">
                          <div className="studio-heat-sample-row">
                            <span>{copy.freeRecording.u1Corrected}</span>
                            <span>{formatNumber(trialResult?.U1CorrectedMv, 2)}</span>
                          </div>
                          <div className="studio-heat-sample-row">
                            <span>{copy.freeRecording.u2Corrected}</span>
                            <span>{formatNumber(trialResult?.U2CorrectedMv, 2)}</span>
                          </div>
                          <div className="studio-heat-sample-row">
                            <span>{copy.freeRecording.includedInMean}</span>
                            <span>{includedInMean ? copy.freeRecording.included : copy.freeRecording.excluded}</span>
                          </div>
                          {!includedInMean ? (
                            <div className="studio-heat-sample-row">
                              <span>{copy.freeRecording.reason}</span>
                              <span>{trialResult?.message ?? copy.freeRecording.notCalculable}</span>
                            </div>
                          ) : null}
                        </div>
                      </DocumentDisclosure>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const renderGuideDataAndResultsTab = (
  file: WorkbenchHeatCapacityState,
  copy: LocalizedText,
) => {
  const trial = file.heatCapacityGuideTrial;
  const signals = trial?.correctedSignals ?? null;
  const completed = signals !== null;
  const relativeError = signals
    ? Math.abs((signals.gamma - file.theoreticalGamma) / file.theoreticalGamma) * 100
    : null;
  const renderGuideRecordRow = (
    key: string,
    record: NonNullable<WorkbenchHeatCapacityState['heatCapacityGuideTrial']>['u0'] | null | undefined,
    corrected: number | null | undefined,
  ) => (
    <tr>
      <td>{key}</td>
      <td>{formatNumber(record?.displayPressureMv, 2)}</td>
      <td>{formatNumber(record?.displayTemperatureMv, 2)}</td>
      <td>{formatNumber(corrected, 2)}</td>
      <td>{record ? copy.guideResult.done : copy.guideResult.pending}</td>
    </tr>
  );

  return (
    <div
      className="studio-heat-recording"
      data-heat-capacity-recording-tab="true"
      data-heat-capacity-record-source="guide"
    >
      <div className={`studio-result-status ${completed ? 'studio-result-status-ready' : 'studio-result-status-waiting'}`}>
        <strong>{copy.guideResult.title}</strong>
        <span>{completed ? copy.guideResult.completed : copy.guideResult.waiting}</span>
      </div>
      <section className="studio-heat-result-summary-line" data-heat-capacity-guide-result-summary="true">
        <strong>
          {copy.guideResult.resultSummary(
            file.theoreticalGamma.toFixed(2),
            formatGamma(signals?.gamma),
            formatPercent(relativeError),
          )}
        </strong>
        <span>{copy.guideResult.source}</span>
      </section>
      <div className="studio-heat-table-scroll">
        <table className="studio-table studio-heat-recording-table" data-heat-capacity-guide-record-table="true">
          <thead>
            <tr>
              <th>{copy.guideResult.record}</th>
              <th>{copy.guideResult.pressure}</th>
              <th>{copy.guideResult.temperature}</th>
              <th>{copy.guideResult.corrected}</th>
              <th>{copy.guideResult.status}</th>
            </tr>
          </thead>
          <tbody>
            {renderGuideRecordRow('U₀', trial?.u0 ?? null, 0)}
            {renderGuideRecordRow('U₁', trial?.u1 ?? null, signals?.U1CorrectedMv)}
            {renderGuideRecordRow('U₂', trial?.u2 ?? null, signals?.U2CorrectedMv)}
          </tbody>
        </table>
      </div>
      <div className="studio-heat-table-scroll">
        <table className="studio-table studio-heat-processing-table" data-heat-capacity-guide-result-table="true">
          <thead>
            <tr>
              <th>{copy.guideResult.gamma}</th>
              <th>{copy.guideResult.completedAt}</th>
              <th>{copy.guideResult.status}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{formatGamma(signals?.gamma)}</td>
              <td>{formatFreeTrialCompletedAt(trial?.completedAtMs)}</td>
              <td>{completed ? copy.guideResult.done : copy.guideResult.pending}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const renderRecordingTab = (
  file: WorkbenchHeatCapacityState,
  copy: LocalizedText,
  onExpectedTrialCountChange: HeatCapacityLeftPanelProps['onExpectedTrialCountChange'],
  pendingRemoveTrialRecord: HeatCapacityLeftPanelProps['pendingRemoveTrialRecord'],
  onRemoveTrialRecord: HeatCapacityLeftPanelProps['onRemoveTrialRecord'],
  onCancelRemoveTrialRecord: HeatCapacityLeftPanelProps['onCancelRemoveTrialRecord'],
) => {
  if (file.heatCapacityMode === 'free') {
    return renderFreeDataAndResultsTab(
      file,
      copy,
      pendingRemoveTrialRecord,
      onRemoveTrialRecord,
      onCancelRemoveTrialRecord,
    );
  }
  const completed = getHeatCapacityCompletedTrialCount(file.heatCapacityTrials);
  const expected = file.heatCapacityExpectedTrialCount;
  const allTrialsComplete = completed >= expected;
  const nextActiveTrialIndex = getHeatCapacityNextActiveTrialIndex(file.heatCapacityTrials);
  const currentTrialNumber = Math.min(expected, nextActiveTrialIndex + 1);
  const currentTrial = file.heatCapacityTrials[nextActiveTrialIndex];
  const processSampleCount = Object.keys(file.heatCapacityProcessSamples).length;
  const waitingForNextTrial = completed > 0
    && completed < expected
    && currentTrial?.status === 'waiting'
    && !file.powerOn
    && processSampleCount === 0;
  const recordingStatusTitle = allTrialsComplete
    ? copy.recordingReadyToProcess
    : waitingForNextTrial
      ? copy.recordingNextTrial
      : `${completed} ${copy.imported}`;
  const recordingStatusBody = allTrialsComplete
    ? copy.recordingComplete
    : waitingForNextTrial
      ? copy.recordingNextTrial
      : copy.recordingHint;
  const renderRemoveRecordButton = (
    trialIndex: number,
    kind: HeatCapacityTrialRecordRemovalKind,
    visible: boolean,
  ) => {
    if (!visible) return null;
    const pending = pendingRemoveTrialRecord?.trialIndex === trialIndex &&
      pendingRemoveTrialRecord.kind === kind;
    return (
      <span className={`studio-table-action-row ${pending ? 'studio-table-action-row-pending' : ''}`}>
        <button
          type="button"
          className={`studio-table-action ${pending ? 'studio-table-action-confirm' : ''}`}
          onClick={() => onRemoveTrialRecord(trialIndex, kind)}
        >
          {pending
            ? copy.table.confirmDelete
            : kind === 'u0'
              ? copy.table.deleteU0
              : kind === 'u1'
                ? copy.table.deleteU1
                : kind === 'u2'
                  ? copy.table.deleteU2
                  : copy.table.deleteTrial}
        </button>
        {pending ? (
          <button
            type="button"
            className="studio-table-action studio-table-action-cancel"
            onClick={onCancelRemoveTrialRecord}
          >
            {copy.table.cancel}
          </button>
        ) : null}
      </span>
    );
  };
  return (
    <div
      className="studio-heat-recording"
      data-heat-capacity-recording-tab="true"
      data-heat-capacity-record-source={file.heatCapacityMode}
    >
      {renderProcessSampleStatus(file, copy, renderRemoveRecordButton)}
      <div className="studio-heat-recording-controls">
        <div className="studio-heat-recording-progress">
          <span>{copy.expectedTrials}</span>
          <strong>{copy.progress(completed, expected)}</strong>
          <span>{copy.currentTrial(currentTrialNumber)}</span>
        </div>
        <div className="studio-heat-trial-count">
          <button type="button" className={file.heatCapacityExpectedTrialCountMode === '3' ? 'studio-heat-trial-count-active' : ''} onClick={() => onExpectedTrialCountChange(3, '3')}>3 {copy.group}</button>
          <button type="button" className={file.heatCapacityExpectedTrialCountMode === '5' ? 'studio-heat-trial-count-active' : ''} onClick={() => onExpectedTrialCountChange(5, '5')}>5 {copy.group}</button>
          <button type="button" className={file.heatCapacityExpectedTrialCountMode === 'custom' ? 'studio-heat-trial-count-active' : ''} onClick={() => onExpectedTrialCountChange(file.heatCapacityExpectedTrialCount, 'custom')}>{copy.custom}</button>
          {file.heatCapacityExpectedTrialCountMode === 'custom' ? (
            <input
              type="number"
              min={1}
              max={10}
              value={file.heatCapacityExpectedTrialCount}
              onChange={(event) => onExpectedTrialCountChange(Number(event.target.value), 'custom')}
              aria-label={copy.customAria}
            />
          ) : null}
        </div>
      </div>
      <div className={`studio-result-status ${allTrialsComplete ? 'studio-result-status-ready' : 'studio-result-status-waiting'}`}>
        <strong>{recordingStatusTitle}</strong>
        <span>{recordingStatusBody}</span>
      </div>
      <div className="studio-heat-table-scroll">
        <table className="studio-table studio-heat-recording-table">
          <thead>
            <tr>
              <th>{copy.table.trial}</th>
              <th><VarU index={1} /> / mV</th>
              <th><VarU index={2} /> / mV</th>
              <th><VarUT index={1} /> / mV</th>
              <th><VarUT index={2} /> / mV</th>
              <th><VarGamma index="i" /></th>
              <th>{copy.table.status}</th>
              <th>{copy.table.action}</th>
            </tr>
          </thead>
          <tbody>
            {file.heatCapacityTrials.map((trial, trialIndex) => {
              const trialResult = calculateHeatCapacityTrialResult(trial, {
                atmosphericPressureKPa: file.ambientPressureKPa,
                pressureSensitivityMvPerKPa: file.pressureSensitivityMvPerKPa,
                theoreticalGamma: file.theoreticalGamma,
              });
              return (
                <tr key={trial.id}>
                  <td>{trial.trialIndex}</td>
                  <td>{formatNumber(trial.U1Mv, 2)}</td>
                  <td>{formatNumber(trial.U2Mv, 2)}</td>
                  <td>{formatNumber(trial.UT1Mv, 1)}</td>
                  <td>{formatNumber(trial.UT2Mv, 1)}</td>
                  <td>{formatGamma(trialResult.gamma)}</td>
                  <td><span className={statusClass(trial.status)}>{copy.status[trial.status]}</span></td>
                  <td>
                    <div className="studio-table-action-row">
                      {renderRemoveRecordButton(
                        trialIndex,
                        'trial',
                        trial.U1Mv !== null || trial.U2Mv !== null || trial.UT1Mv !== null || trial.UT2Mv !== null,
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const renderFormulaPanel = (
  title: string,
  formula: React.ReactNode,
  result: React.ReactNode,
) => (
  <div className="studio-heat-formula-panel">
    <div className="studio-heat-formula-title"><strong>{title}</strong></div>
    <div className="studio-heat-formula-expression">{formula}</div>
    <div className="studio-heat-formula-result">{result}</div>
  </div>
);

const renderFormulaTrialResults = (
  trialResults: HeatCapacityProcessingTrialResult[],
  copy: LocalizedText,
  formulaResultsExpanded: boolean,
  setFormulaResultsExpanded: React.Dispatch<React.SetStateAction<boolean>>,
  renderTrial: (trial: HeatCapacityProcessingTrialResult) => React.ReactNode,
) => {
  const shouldCollapse = trialResults.length > HEAT_CAPACITY_FORMULA_RESULT_PREVIEW_LIMIT;
  const visibleResults = shouldCollapse && !formulaResultsExpanded
    ? trialResults.slice(0, HEAT_CAPACITY_FORMULA_RESULT_PREVIEW_LIMIT)
    : trialResults;
  return (
    <div className="studio-heat-formula-result-list">
      {visibleResults.map((trial) => (
        <div className="studio-heat-formula-result-row" key={trial.trialIndex}>
          <strong>{copy.table.trial} {trial.trialIndex}</strong>
          <span>{renderTrial(trial)}</span>
        </div>
      ))}
      {shouldCollapse && !formulaResultsExpanded ? (
        <span className="studio-heat-formula-preview-note">
          {copy.formula.previewLimitNotice(HEAT_CAPACITY_FORMULA_RESULT_PREVIEW_LIMIT, trialResults.length)}
        </span>
      ) : null}
      {shouldCollapse ? (
        <button
          className="studio-heat-formula-expand"
          type="button"
          onClick={() => setFormulaResultsExpanded((expanded) => !expanded)}
        >
          {formulaResultsExpanded ? copy.formula.collapseResults : copy.formula.showAllResults}
        </button>
      ) : null}
    </div>
  );
};

const renderGammaChart = (
  trialResults: HeatCapacityProcessingTrialResult[],
  theoreticalGamma: number,
  meanGamma: number | null,
  copy: LocalizedText['chart'],
) => {
  const validResults = trialResults.filter((trial) => trial.status === 'valid' && trial.gamma !== null);
  if (validResults.length < 2 || meanGamma === null) return null;
  const values = validResults.map((trial) => trial.gamma ?? 0);
  const minY = Math.min(1.25, theoreticalGamma, meanGamma, ...values) - 0.03;
  const maxY = Math.max(1.45, theoreticalGamma, meanGamma, ...values) + 0.03;
  const width = 420;
  const height = 170;
  const left = 42;
  const right = 18;
  const top = 18;
  const bottom = 30;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const y = (value: number) => top + (maxY - value) / (maxY - minY) * plotHeight;
  const barWidth = Math.max(18, Math.min(42, plotWidth / validResults.length * 0.5));
  const xFor = (index: number) => left + (index + 0.5) * (plotWidth / validResults.length);

  return (
    <div className="studio-heat-gamma-chart" data-heat-capacity-gamma-chart="true">
      <div className="studio-heat-formula-title">
        <strong>{copy.title}</strong>
        <span>{copy.subtitle}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={copy.title}>
        {[0, 1, 2].map((index) => {
          const value = minY + (maxY - minY) * (index / 2);
          return (
            <g key={index}>
              <line x1={left} x2={width - right} y1={y(value)} y2={y(value)} className="studio-heat-chart-grid-line" />
              <text x={left - 8} y={y(value) + 3} textAnchor="end">{value.toFixed(2)}</text>
            </g>
          );
        })}
        <line x1={left} x2={width - right} y1={y(theoreticalGamma)} y2={y(theoreticalGamma)} className="studio-heat-chart-theory-line" />
        <line x1={left} x2={width - right} y1={y(meanGamma)} y2={y(meanGamma)} className="studio-heat-chart-mean-line" />
        {validResults.map((trial, index) => {
          const gamma = trial.gamma ?? 0;
          const x = xFor(index) - barWidth / 2;
          const barTop = y(gamma);
          return (
            <g key={trial.trialIndex}>
              <rect x={x} y={barTop} width={barWidth} height={top + plotHeight - barTop} rx="3" className="studio-heat-gamma-bar" />
              <text x={xFor(index)} y={height - 10} textAnchor="middle">{trial.trialIndex}</text>
            </g>
          );
        })}
      </svg>
      <div className="studio-heat-chart-legend">
        <span><i className="studio-heat-legend-bar" />{copy.trialGamma}</span>
        <span><i className="studio-heat-legend-theory" />{copy.theoreticalGamma}</span>
        <span><i className="studio-heat-legend-mean" />{copy.meanGamma}</span>
      </div>
    </div>
  );
};

const renderProcessingTab = (
  file: WorkbenchHeatCapacityState,
  copy: LocalizedText,
  onCalculateResults: () => void,
  formulaResultsExpanded: boolean,
  setFormulaResultsExpanded: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  const result = file.heatCapacityProcessingResult;
  const completed = getHeatCapacityCompletedTrialCount(file.heatCapacityTrials);
  const validFormulaResults = result.trialResults.filter((trial) => trial.status === 'valid' && trial.gamma !== null);

  return (
    <div className="studio-heat-processing" data-heat-capacity-processing-tab="true">
      <div className="studio-heat-processing-summary">
        <div className="studio-heat-processing-summary-cell">
          <span>{copy.known}</span>
          <div className="studio-heat-processing-summary-values">
            <strong><VarP index={0} /> = {formatNumber(file.ambientPressureKPa, 2)} kPa</strong>
            <strong>S = {formatNumber(file.pressureSensitivityMvPerKPa, 0)} mV/kPa</strong>
            <strong><GammaAir /> = {file.theoreticalGamma.toFixed(2)}</strong>
          </div>
        </div>
        <div className="studio-heat-processing-summary-cell">
          <span>{copy.measured}</span>
          <div className="studio-heat-processing-summary-values studio-heat-processing-summary-symbols">
            <strong><VarU index={1} /></strong>
            <strong><VarU index={2} /></strong>
            <strong><VarUT index={1} /></strong>
            <strong><VarUT index={2} /></strong>
          </div>
        </div>
      </div>
      <div className="studio-heat-calculate-row">
        <span>{completed} {copy.imported}</span>
        <button
          type="button"
          data-heat-capacity-calculate="teaching"
          onClick={onCalculateResults}
          disabled={completed < file.heatCapacityExpectedTrialCount}
        >
          <BarChart3 size={14} />
          {copy.calculate}
        </button>
      </div>
      {!result.calculated ? <div className="studio-empty-panel-tree">{copy.emptyProcessing}</div> : null}
      {result.calculated ? (
        <div className="studio-heat-processing-results">
          <div className="studio-heat-formula-grid">
            {renderFormulaPanel(
              copy.formula.pressure,
              <span><VarDeltaP index="1,i" /> = <VarU index="1,i" /> / S; <VarDeltaP index="2,i" /> = <VarU index="2,i" /> / S</span>,
              renderFormulaTrialResults(
                result.trialResults,
                copy,
                formulaResultsExpanded,
                setFormulaResultsExpanded,
                (trial) => <><VarDeltaP index={`1,${trial.trialIndex}`} /> = {formatNumber(trial.deltaP1KPa, 2)} kPa, <VarDeltaP index={`2,${trial.trialIndex}`} /> = {formatNumber(trial.deltaP2KPa, 2)} kPa</>,
              ),
            )}
            {renderFormulaPanel(
              copy.formula.absolute,
              <span><VarP index="1,i" /> = <VarP index={0} /> + <VarDeltaP index="1,i" />; <VarP index="2,i" /> = <VarP index={0} /> + <VarDeltaP index="2,i" /></span>,
              renderFormulaTrialResults(
                result.trialResults,
                copy,
                formulaResultsExpanded,
                setFormulaResultsExpanded,
                (trial) => <><VarP index={`1,${trial.trialIndex}`} /> = {formatNumber(trial.P1KPa, 2)} kPa, <VarP index={`2,${trial.trialIndex}`} /> = {formatNumber(trial.P2KPa, 2)} kPa</>,
              ),
            )}
            {renderFormulaPanel(
              copy.formula.gamma,
              <span><VarGamma index="i" /> = <VarU index="1,i" /> / (<VarU index="1,i" /> - <VarU index="2,i" />)</span>,
              renderFormulaTrialResults(
                result.trialResults,
                copy,
                formulaResultsExpanded,
                setFormulaResultsExpanded,
                (trial) => <><VarGamma index={trial.trialIndex} /> = {formatGamma(trial.gamma)}</>,
              ),
            )}
            {renderFormulaPanel(
              copy.formula.average,
              <span><GammaMean /> = average(<VarGamma index="i" />); ε = |<GammaMean /> - <GammaAir />| / <GammaAir /> × 100%</span>,
              <div className="studio-heat-formula-average">
                {renderFormulaTrialResults(
                  validFormulaResults,
                  copy,
                  formulaResultsExpanded,
                  setFormulaResultsExpanded,
                  (trial) => <><VarGamma index={trial.trialIndex} /> = {formatGamma(trial.gamma)}</>,
                )}
                <span>{copy.formula.result}: {copy.formula.meanGamma} = {formatGamma(result.meanGamma)}, {copy.formula.relativeError} = {formatNumber(result.relativeErrorPercent, 2)}%</span>
              </div>,
            )}
          </div>
          <div className={`studio-result-status ${result.status === 'ready' ? 'studio-result-status-ready' : 'studio-result-status-waiting'}`}>
            <strong>{copy.formula.meanGamma} = {formatGamma(result.meanGamma)}</strong>
            <span><GammaAir /> = {result.theoreticalGamma.toFixed(3)} · {copy.formula.relativeError} = {formatNumber(result.relativeErrorPercent, 2)}% · {copy.formula.resultStatus}: {result.status === 'ready' ? copy.formula.reasonable : (result.message || copy.formula.notReady)}</span>
          </div>
          <div className="studio-heat-table-scroll">
            <table className="studio-table studio-heat-processing-table">
              <thead>
                <tr>
                  <th>{copy.table.trial}</th>
                  <th><VarU index={1} /></th>
                  <th><VarU index={2} /></th>
                  <th><VarDeltaP index={1} /></th>
                  <th><VarDeltaP index={2} /></th>
                  <th><VarP index={1} /></th>
                  <th><VarP index={2} /></th>
                  <th><VarGamma index="i" /></th>
                  <th>{copy.table.status}</th>
                </tr>
              </thead>
              <tbody>
                {result.trialResults.map((trial) => (
                  <tr key={trial.trialIndex}>
                    <td>{trial.trialIndex}</td>
                    <td>{formatNumber(trial.U1Mv, 2)}</td>
                    <td>{formatNumber(trial.U2Mv, 2)}</td>
                    <td>{formatNumber(trial.deltaP1KPa, 2)}</td>
                    <td>{formatNumber(trial.deltaP2KPa, 2)}</td>
                    <td>{formatNumber(trial.P1KPa, 2)}</td>
                    <td>{formatNumber(trial.P2KPa, 2)}</td>
                    <td>{formatGamma(trial.gamma)}</td>
                    <td>{trial.status === 'valid' ? copy.formula.valid : copy.formula.invalid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderGammaChart(result.trialResults, result.theoreticalGamma, result.meanGamma, copy.chart)}
        </div>
      ) : null}
      <DocumentDisclosure id="mean-gamma-first" title={<>{copy.thinking}: {copy.thinkingMeanTitle}</>}>
        <p>{copy.thinkingMeanBody}</p>
      </DocumentDisclosure>
    </div>
  );
};

export const HeatCapacityLeftPanel = ({
  file,
  language,
  panelKey,
  onExpectedTrialCountChange,
  onCalculateResults,
  pendingRemoveTrialRecord,
  onRemoveTrialRecord,
  onCancelRemoveTrialRecord,
}: HeatCapacityLeftPanelProps) => {
  const copy = text(language);
  const [formulaResultsExpanded, setFormulaResultsExpanded] = useState(false);
  const freeDataResultsPanel = file.heatCapacityMode === 'free' && (
    panelKey === 'heatCapacityRecords' || panelKey === 'heatCapacityProcessing'
  );
  const guideDataResultsPanel = file.heatCapacityMode === 'guide' && (
    panelKey === 'heatCapacityRecords' || panelKey === 'heatCapacityProcessing'
  );
  const contentTitle = useMemo(() => {
    if (
      (file.heatCapacityMode === 'free' || file.heatCapacityMode === 'guide') &&
      (panelKey === 'heatCapacityRecords' || panelKey === 'heatCapacityProcessing')
    ) {
      return copy.dataAndResults;
    }
    if (panelKey === 'heatCapacityRecords') return copy.recording;
    if (panelKey === 'heatCapacityProcessing') return copy.processing;
    return copy.guide;
  }, [copy.dataAndResults, copy.guide, copy.processing, copy.recording, file.heatCapacityMode, panelKey]);

  return (
    <section className="studio-heat-panel-content" data-heat-capacity-panel-content="true" data-heat-capacity-panel-key={panelKey}>
      <div className="studio-heat-panel-content-header">
        <span>{copy.panelKicker}</span>
        <strong>{contentTitle}</strong>
      </div>
      <div className="studio-heat-left-content">
        {panelKey === 'heatCapacityGuide'
          ? renderGuideTab(language)
          : freeDataResultsPanel
            ? renderFreeDataAndResultsTab(
                file,
                copy,
                pendingRemoveTrialRecord,
                onRemoveTrialRecord,
                onCancelRemoveTrialRecord,
              )
          : guideDataResultsPanel
            ? renderGuideDataAndResultsTab(file, copy)
          : panelKey === 'heatCapacityRecords'
            ? renderRecordingTab(
                file,
                copy,
                onExpectedTrialCountChange,
                pendingRemoveTrialRecord,
                onRemoveTrialRecord,
                onCancelRemoveTrialRecord,
              )
            : renderProcessingTab(file, copy, onCalculateResults, formulaResultsExpanded, setFormulaResultsExpanded)}
      </div>
    </section>
  );
};
