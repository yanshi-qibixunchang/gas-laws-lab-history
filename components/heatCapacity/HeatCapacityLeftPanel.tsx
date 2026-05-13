import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
} from 'lucide-react';
import type {
  WorkbenchHeatCapacityPanelKey,
  WorkbenchHeatCapacityState,
} from '../workbenchState.ts';
import {
  getHeatCapacityCompletedTrialCount,
  type HeatCapacityProcessingTrialResult,
  type HeatCapacityTrial,
  type HeatCapacityTrialStatus,
} from './heatCapacityTrialModel.ts';

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
}

interface DocumentDisclosureProps {
  id: string;
  title: React.ReactNode;
  children: React.ReactNode;
}

const formatNumber = (value: number | null | undefined, digits = 2) => (
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--'
);

const formatGamma = (value: number | null | undefined) => (
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3) : '--'
);

type HeatCapacityProcessSampleCopy = {
  statusTitle: string;
  statusScope: string;
  headers: {
    sample: string;
    value: string;
    time: string;
    phase: string;
    status: string;
  };
  rows: {
    U0: string;
    U1: string;
    U2: string;
    zeroed: string;
    beforeRelease: string;
    afterRecovery: string;
  };
  recorded: string;
  waiting: string;
};

type HeatCapacityTrialStatusCopy = Record<HeatCapacityTrialStatus, string>;

const statusLabel = (status: HeatCapacityTrialStatus, labels: HeatCapacityTrialStatusCopy) => (
  labels[status] ?? labels.waiting
);

const statusClass = (status: HeatCapacityTrialStatus) => (
  `studio-heat-trial-status studio-heat-trial-status-${status}`
);

const getHeatCapacityProcessSampleRows = (
  file: WorkbenchHeatCapacityState,
  copy: HeatCapacityProcessSampleCopy,
) => {
  const beforeReleaseSample = file.heatCapacityProcessSamples.stableBeforeReleaseSample
    ?? file.heatCapacityProcessSamples.beforeReleaseSample
    ?? file.heatCapacityProcessSamples.pumpPeakSample
    ?? null;

  return [
    {
      key: 'U0',
      label: copy.rows.U0,
      phase: copy.rows.zeroed,
      sample: file.heatCapacityProcessSamples.zeroedSample ?? null,
    },
    {
      key: 'U1',
      label: copy.rows.U1,
      phase: copy.rows.beforeRelease,
      sample: beforeReleaseSample,
    },
    {
      key: 'U2',
      label: copy.rows.U2,
      phase: copy.rows.afterRecovery,
      sample: file.heatCapacityProcessSamples.recoverySample ?? null,
    },
  ];
};

const renderProcessSampleStatus = (
  file: WorkbenchHeatCapacityState,
  copy: HeatCapacityProcessSampleCopy,
) => (
  <section className="studio-heat-sample-status" data-heat-capacity-sample-status="true">
    <div className="studio-heat-sample-status-header">
      <strong>{copy.statusTitle}</strong>
      <span>{copy.statusScope}</span>
    </div>
    <div className="studio-heat-sample-grid">
      <div className="studio-heat-sample-row studio-heat-sample-head">
        <span>{copy.headers.sample}</span>
        <span>{copy.headers.value}</span>
        <span>{copy.headers.time}</span>
        <span>{copy.headers.phase}</span>
        <span>{copy.headers.status}</span>
      </div>
      {getHeatCapacityProcessSampleRows(file, copy).map((row) => (
        <div className="studio-heat-sample-row" key={row.key}>
          <span><strong>{row.key}</strong><em>{row.label}</em></span>
          <span>{formatNumber(row.sample?.pressureSignalMv, 2)}</span>
          <span>{formatNumber(row.sample?.timeS, 1)}</span>
          <span>{row.phase}</span>
          <span className={row.sample ? 'studio-heat-sample-recorded' : 'studio-heat-sample-waiting'}>
            {row.sample ? copy.recorded : copy.waiting}
          </span>
        </div>
      ))}
    </div>
  </section>
);

const isZhTW = (language: WorkbenchLanguagePreference) => language === 'zh-TW';

const text = (language: WorkbenchLanguagePreference) => {
  if (language === 'en') {
    return {
      guide: 'Experiment Guide',
      recording: 'Data Recording',
      processing: 'Data Processing',
      title: 'Air Heat Capacity Ratio Experiment',
      subtitle: 'Record U_p during compression, fast release, and thermal recovery, then calculate air heat capacity ratio with absolute pressure logarithms. U_T is used to observe temperature response; particle animation is only a motion-state visualization.',
      thinking: 'Further Thinking',
      known: 'Known Values',
      measured: 'Measured Values',
      calculate: 'Calculate Results',
      imported: 'complete trials imported',
      emptyProcessing: 'Complete at least one trial in Data Recording before calculating results.',
      panelKicker: 'Heat Capacity Ratio',
      processSamples: {
        statusTitle: 'U0 / U1 / U2 Process Samples',
        statusScope: 'Heat Capacity only',
        headers: {
          sample: 'Sample',
          value: 'Value / mV',
          time: 'Time / s',
          phase: 'Phase',
          status: 'Status',
        },
        rows: {
          U0: 'U0 zeroed pressure signal',
          U1: 'U1 before quick release',
          U2: 'U2 after thermal recovery',
          zeroed: 'zeroed',
          beforeRelease: 'before release stable',
          afterRecovery: 'after recovery',
        },
        recorded: 'Recorded',
        waiting: 'Waiting',
      },
      trialStatus: {
        waiting: 'Waiting',
        partial: 'Partial',
        complete: 'Complete',
        invalid: 'Invalid',
      },
      recordingCopy: {
        expectedTrials: 'Expected trials',
        progress: (completed: number, total: number) => `Progress: ${completed} / ${total} trials completed`,
        options: {
          three: '3 trials',
          five: '5 trials',
          custom: 'Custom',
          customAria: 'Custom expected trial count',
        },
        completeTitle: 'Data recording complete',
        completeHint: 'Data recording complete. Go to Data Processing and click Calculate Results.',
        activeHint: 'Manual recording uses the buttons in the 3D preview at the correct stages. Auto demo records the same fields automatically.',
        headers: {
          trial: 'Trial',
          status: 'Status',
        },
      },
      processingCopy: {
        formula: {
          pressure: 'Pressure Difference Conversion',
          absolute: 'Absolute Pressure Calculation',
          gamma: 'Gamma Calculation',
          average: 'Average and Relative Error',
          result: 'Result',
          meanGamma: 'Mean gamma',
          relativeError: 'Relative error',
          resultStatus: 'Result',
          reasonable: 'Reasonable',
          valid: 'Valid',
          invalid: 'Invalid',
          averageExpression: 'Mean γ formula',
        },
        table: {
          trial: 'Trial',
          status: 'Status',
        },
      },
      chart: {
        title: 'γ Result by Trial',
        subtitle: 'Trial γ / theoretical γ / mean γ',
        trialGamma: 'Trial γ',
        theoreticalGamma: 'Theoretical γ',
        meanGamma: 'Mean γ',
      },
    };
  }
  if (isZhTW(language)) {
    return {
      guide: '實驗指引',
      recording: '資料記錄',
      processing: '資料處理',
      title: '空氣比熱容比實驗',
      subtitle: '本實驗通過壓縮空氣、快速放氣和回溫過程，記錄壓強差電壓 U_p，並根據絕對壓強對數公式計算空氣比熱容比 γ。U_T 用於輔助觀察溫度信號變化，硬球/粒子動畫僅作為氣體運動狀態的可視化。',
      thinking: '進一步思考',
      known: '已知量',
      measured: '實驗測得量',
      calculate: '計算結果',
      imported: '組完整資料已匯入',
      emptyProcessing: '請先在資料記錄頁完成至少一組有效資料，再進行計算。',
      panelKicker: '空氣比熱容比',
      processSamples: {
        statusTitle: 'U0 / U1 / U2 過程採樣',
        statusScope: '僅屬於空氣比熱容比實驗',
        headers: {
          sample: '採樣點',
          value: '數值 / mV',
          time: '時間 / s',
          phase: '階段',
          status: '狀態',
        },
        rows: {
          U0: 'U0 調零後壓強差信號',
          U1: 'U1 快速放氣前穩定值',
          U2: 'U2 回溫後穩定值',
          zeroed: '調零完成',
          beforeRelease: '放氣前穩定',
          afterRecovery: '回溫後穩定',
        },
        recorded: '已記錄',
        waiting: '待記錄',
      },
      trialStatus: {
        waiting: '等待',
        partial: '部分記錄',
        complete: '完成',
        invalid: '異常',
      },
      recordingCopy: {
        expectedTrials: '預期組數',
        progress: (completed: number, total: number) => `進度：已完成 ${completed} / ${total} 組`,
        options: {
          three: '3 組',
          five: '5 組',
          custom: '自訂',
          customAria: '自訂預期組數',
        },
        completeTitle: '資料記錄已完成',
        completeHint: '資料記錄已完成。請前往資料處理頁並點擊「計算結果」。',
        activeHint: '手動模式需在正確階段使用 3D 預覽中的記錄按鈕；自動演示會自動記錄相同欄位。',
        headers: {
          trial: '組次',
          status: '狀態',
        },
      },
      processingCopy: {
        formula: {
          pressure: '壓強差換算',
          absolute: '絕對壓強計算',
          gamma: '比熱容比計算',
          average: '平均值與相對誤差',
          result: '結果',
          meanGamma: '平均 γ',
          relativeError: '相對誤差',
          resultStatus: '結果狀態',
          reasonable: '合理',
          valid: '有效',
          invalid: '異常',
          averageExpression: '平均 γ 公式',
        },
        table: {
          trial: '組次',
          status: '狀態',
        },
      },
      chart: {
        title: '各組 γ 計算結果',
        subtitle: '單組 γ / 理論 γ / 平均 γ',
        trialGamma: '單組 γ',
        theoreticalGamma: '理論 γ',
        meanGamma: '平均 γ',
      },
    };
  }
  return {
    guide: '实验指引',
    recording: '数据记录',
    processing: '数据处理',
    title: '空气比热容比实验',
    subtitle: '本实验通过压缩空气、快速放气和回温过程，记录压强差电压 U_p，并根据绝对压强对数公式计算空气比热容比 γ。U_T 用于辅助观察温度信号变化，硬球/粒子动画仅作为气体运动状态的可视化。',
    thinking: '进一步思考',
    known: '已知量',
    measured: '实验测得量',
    calculate: '计算结果',
    imported: '组完整数据已导入',
    emptyProcessing: '请先在数据记录页完成至少一组有效数据，再进行计算。',
    panelKicker: '空气比热容比',
    processSamples: {
      statusTitle: 'U0 / U1 / U2 过程采样',
      statusScope: '仅属于空气比热容比实验',
      headers: {
        sample: '采样点',
        value: '数值 / mV',
        time: '时间 / s',
        phase: '阶段',
        status: '状态',
      },
      rows: {
        U0: 'U0 调零后压强差信号',
        U1: 'U1 快速放气前稳定值',
        U2: 'U2 回温后稳定值',
        zeroed: '调零完成',
        beforeRelease: '放气前稳定',
        afterRecovery: '回温后稳定',
      },
      recorded: '已记录',
      waiting: '待记录',
    },
    trialStatus: {
      waiting: '等待',
      partial: '部分记录',
      complete: '完成',
      invalid: '异常',
    },
    recordingCopy: {
      expectedTrials: '预期组数',
      progress: (completed: number, total: number) => `进度：已完成 ${completed} / ${total} 组`,
      options: {
        three: '3 组',
        five: '5 组',
        custom: '自定义',
        customAria: '自定义预期组数',
      },
      completeTitle: '数据记录已完成',
      completeHint: '数据记录已完成。请前往数据处理页并点击“计算结果”。',
      activeHint: '手动模式需在正确阶段使用 3D 预览中的记录按钮；自动演示会自动记录相同字段。',
      headers: {
        trial: '组次',
        status: '状态',
      },
    },
    processingCopy: {
      formula: {
        pressure: '压强差换算',
        absolute: '绝对压强计算',
        gamma: '比热容比计算',
        average: '平均值与相对误差',
        result: '结果',
        meanGamma: '平均 γ',
        relativeError: '相对误差',
        resultStatus: '结果状态',
        reasonable: '合理',
        valid: '有效',
        invalid: '异常',
        averageExpression: '平均 γ 公式',
      },
      table: {
        trial: '组次',
        status: '状态',
      },
    },
    chart: {
      title: '各组 γ 计算结果',
      subtitle: '单组 γ / 理论 γ / 平均 γ',
      trialGamma: '单组 γ',
      theoreticalGamma: '理论 γ',
      meanGamma: '平均 γ',
    },
  };
};

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

const HeatSub = ({ children }: { children: string }) => <sub>{children}</sub>;
const VarU = ({ index }: { index: string | number }) => <>U<sub>{index}</sub></>;
const VarUT = ({ index }: { index: string | number }) => <>U<sub>T{index}</sub></>;
const VarP = ({ index }: { index: string | number }) => <>P<sub>{index}</sub></>;
const VarDeltaP = ({ index }: { index: string | number }) => <>ΔP<sub>{index}</sub></>;
const VarGamma = ({ index }: { index?: string | number }) => <>γ{index !== undefined ? <sub>{index}</sub> : null}</>;
const GammaAir = () => <>γ<sub>air</sub></>;
const GammaMean = () => <>γ<sub>mean</sub></>;

const renderGuideTab = (language: WorkbenchLanguagePreference) => {
  const copy = text(language);
  const thinkingLabel = copy.thinking;
  return (
    <div className="studio-heat-guide-doc">
      <header className="studio-heat-doc-header">
        <span className="studio-heat-doc-kicker">FD-NCD-C</span>
        <h3>{copy.title}</h3>
        <p>{copy.subtitle}</p>
      </header>

      <section className="studio-heat-guide-section">
        <h4>1. Aim / 实验目的</h4>
        <p>测定空气的比热容比 γ，并理解压缩、快速放气和回温三个过程对压强与温度信号的影响。</p>
      </section>

      <section className="studio-heat-guide-section">
        <h4>2. Apparatus and Readings / 仪器与读数</h4>
        <p>实验主要观察 U<HeatSub>p</HeatSub>、U<HeatSub>T</HeatSub>、指针压力表和玻璃旋塞状态。U<HeatSub>p</HeatSub> 是压强差电压，U<HeatSub>T</HeatSub> 是温度信号电压，最终计算以空气实验的绝对压强对数公式为准。</p>
      </section>

      <section className="studio-heat-guide-section">
        <h4>3. Procedure / 实验步骤</h4>
        <div className="studio-heat-step-block">
          <h5>Step 1：开启电源</h5>
          <p><strong>操作：</strong>打开主机电源，等待数字仪表进入工作状态。</p>
          <p><strong>观察：</strong>U<HeatSub>T</HeatSub> 与 U<HeatSub>p</HeatSub> 数字屏开始显示；实时曲线从开机后开始采集有效数据。</p>
          <p><strong>注意事项：</strong>未开机时读数无效，实时曲线也不应显示有效数据线。只有在仪器通电并开始采集后，U<HeatSub>T</HeatSub> 和 U<HeatSub>p</HeatSub> 才具有实验意义。</p>
        </div>

        <div className="studio-heat-step-block">
          <h5>Step 2：压强调零</h5>
          <p><strong>操作：</strong>观察 U<HeatSub>p</HeatSub> 是否接近 0，旋转压力调零旋钮，使 U<HeatSub>p</HeatSub> 接近 0。</p>
          <p><strong>观察：</strong>U<HeatSub>p</HeatSub> 应逐渐接近 0；U<HeatSub>T</HeatSub> 不应随压力调零明显变化。</p>
          <p><strong>注意事项：</strong>压强调零只修正 U<HeatSub>p</HeatSub> 的显示零点，不改变真实瓶内压力，也不影响 U<HeatSub>T</HeatSub> 温度信号。</p>
          <DocumentDisclosure id="zero-meaning" title={`${thinkingLabel}：调零的意义是什么？`}>
            <p>调零的意义不是改变瓶内气体状态，而是让压力传感器的显示基准回到零点附近。由于后续计算依赖放气前后的压强差电压 U<HeatSub>p</HeatSub>，如果初始零点存在偏差，后续 U1 和 U2 都可能带入系统误差。调零的目的就是尽量消除仪器初始偏移，使后续记录的 U<HeatSub>p</HeatSub> 更接近真实的压强差变化。</p>
          </DocumentDisclosure>
        </div>

        <div className="studio-heat-step-block">
          <h5>Step 3：打气加压</h5>
          <p><strong>操作：</strong>关闭玻璃旋塞，打开打气阀门，连续打气，使瓶内压强升高。</p>
          <p><strong>观察：</strong>U<HeatSub>p</HeatSub> 快速升高；U<HeatSub>T</HeatSub> 滞后后可能升高；指针压力表上升。</p>
          <p><strong>注意事项：</strong>打气不能过慢，且不能超过压力安全范围。玻璃旋塞应处于关闭状态，否则瓶内无法有效加压。若压力表接近或超过安全范围，应停止打气。</p>
          <DocumentDisclosure id="pump-ptn" title={`${thinkingLabel}：打气过程中 P、T、n 如何变化？`}>
            <p>打气向瓶内加入空气，瓶内气体的物质的量 n 增加。瓶体体积 V 在实验中近似固定，根据 PV = nRT，n 的增加会使压强 P 明显升高。短时间内的压缩过程也可能使温度 T 升高，但温度传感器存在热响应过程，因此 U<HeatSub>T</HeatSub> 的变化通常慢于 U<HeatSub>p</HeatSub>。这个阶段最直观的现象是 U<HeatSub>p</HeatSub> 快速上升，而 U<HeatSub>T</HeatSub> 的变化更缓慢。</p>
          </DocumentDisclosure>
        </div>

        <div className="studio-heat-step-block">
          <h5>Step 4：封闭等待稳定</h5>
          <p><strong>操作：</strong>停止打气，保持瓶内封闭，等待 U<HeatSub>p</HeatSub> 和 U<HeatSub>T</HeatSub> 逐渐进入小范围波动。</p>
          <p><strong>观察：</strong>U<HeatSub>p</HeatSub> 从高值逐渐趋稳；U<HeatSub>T</HeatSub> 可能继续缓慢变化。</p>
          <p><strong>注意事项：</strong>不要在读数剧烈变化时记录。需要等读数相对稳定后再记录 <VarU index={1} /> / <VarUT index={1} />。</p>
          <DocumentDisclosure id="stable-u1" title={`${thinkingLabel}：为什么要等待稳定后再记录？`}>
            <p>打气结束后，瓶内气体并不会立刻达到稳定状态。气体仍在混合，传感器读数也可能继续变化，温度信号尤其容易出现滞后。如果在读数快速变化时记录，<VarU index={1} /> 不能代表放气前的稳定状态，从而影响后续 <VarP index={1} /> 和 <VarGamma /> 的计算。等待稳定的本质是让记录点更接近实验定义中的“放气前稳定状态”。</p>
          </DocumentDisclosure>
        </div>

        <div className="studio-heat-step-block">
          <h5>Step 5：记录放气前数据 <VarU index={1} /> / <VarUT index={1} /></h5>
          <p><strong>操作：</strong>在封闭等待稳定后，记录当前 U<HeatSub>p</HeatSub> 为 <VarU index={1} />，同时记录当前 U<HeatSub>T</HeatSub> 为 <VarUT index={1} />。</p>
          <p><strong>观察：</strong><VarU index={1} /> 是放气前稳定压强差电压；<VarUT index={1} /> 是对应时刻的温度信号。</p>
          <p><strong>注意事项：</strong><VarU index={1} /> 是后续计算 <VarGamma /> 的核心数据；<VarUT index={1} /> 是辅助温度数据，不直接进入主 <VarGamma /> 公式。手动模式下应点击三维窗口中的 Record <VarU index={1} /> / <VarUT index={1} /> 按钮。</p>
          <DocumentDisclosure id="why-u1" title={<>{thinkingLabel}：为什么 <VarU index={1} /> 要在放气前稳定后记录？</>}>
            <p><VarU index={1} /> 对应的是放气前瓶内高压状态与外界大气压之间的压强差。如果记录过早，压强可能还没有稳定，<VarP index={1} /> 的换算就会偏离真实状态；如果记录过晚或在装置状态变化后记录，数据也不能代表放气前状态。因此 <VarU index={1} /> 的记录时机必须和实验过程严格对应。</p>
          </DocumentDisclosure>
        </div>

        <div className="studio-heat-step-block">
          <h5>Step 6：快速放气</h5>
          <p><strong>操作：</strong>快速打开玻璃旋塞，使瓶内空气与外界连通，放气后及时关闭玻璃旋塞。</p>
          <p><strong>观察：</strong>U<HeatSub>p</HeatSub> 快速下降；U<HeatSub>T</HeatSub> 滞后下降；压力表指针回落。</p>
          <p><strong>注意事项：</strong>放气动作要快速。不要在刚放气瞬间记录 <VarU index={2} />，放气后必须等待回温。</p>
          <DocumentDisclosure id="quick-release" title={`${thinkingLabel}：为什么放气动作要尽量快速？`}>
            <p>快速放气可以让瓶内气体在短时间内膨胀并对外做功，这个过程更接近绝热过程。若放气太慢，气体有更多时间与环境换热，过程就不再接近理想的快速膨胀，实验计算会受到影响。放气后温度会短时下降，因此不能立刻把放气瞬间的压强读数作为 <VarU index={2} />。</p>
          </DocumentDisclosure>
        </div>

        <div className="studio-heat-step-block">
          <h5>Step 7：等待回温</h5>
          <p><strong>操作：</strong>关闭玻璃旋塞后，等待瓶内气体与环境换热，直到 U<HeatSub>T</HeatSub> 和 U<HeatSub>p</HeatSub> 再次趋稳。</p>
          <p><strong>观察：</strong>U<HeatSub>T</HeatSub> 缓慢恢复；U<HeatSub>p</HeatSub> 可能恢复到较小正值。</p>
          <p><strong>注意事项：</strong>不能刚放气就记录 <VarU index={2} />。<VarU index={2} /> 应在回温稳定后记录。</p>
          <DocumentDisclosure id="recovery-pressure" title={`${thinkingLabel}：为什么回温后压强会重新上升？`}>
            <p>快速放气后，瓶内剩余气体的温度通常低于环境温度。关闭旋塞后，气体与外界环境逐渐换热，温度回升。在瓶体体积近似固定的条件下，温度 T 的回升会使压强 P 同步升高，因此 U<HeatSub>p</HeatSub> 可能从接近零的状态恢复到一个较小的正值。这个回温后的稳定压强差就是后续计算 <VarP index={2} /> 的基础。</p>
          </DocumentDisclosure>
        </div>

        <div className="studio-heat-step-block">
          <h5>Step 8：记录回温后数据 <VarU index={2} /> / <VarUT index={2} /></h5>
          <p><strong>操作：</strong>回温稳定后，记录当前 U<HeatSub>p</HeatSub> 为 <VarU index={2} />，同时记录当前 U<HeatSub>T</HeatSub> 为 <VarUT index={2} />。</p>
          <p><strong>观察：</strong><VarU index={2} /> 是回温后稳定压强差电压；<VarUT index={2} /> 是对应时刻的温度信号。</p>
          <p><strong>注意事项：</strong><VarU index={2} /> 是计算 <VarP index={2} /> 的核心数据；<VarUT index={2} /> 作为辅助温度数据，用于判断回温状态。手动模式下应点击三维窗口中的 Record <VarU index={2} /> / <VarUT index={2} /> 按钮。</p>
          <DocumentDisclosure id="why-u2" title={<>{thinkingLabel}：为什么 <VarU index={2} /> 不能取放气瞬间值？</>}>
            <p>放气瞬间瓶内压强接近外界大气压，但此时瓶内气体温度尚未恢复。如果把这一瞬间的读数作为 <VarU index={2} />，就会把快速膨胀后的非平衡状态误当成回温后的稳定状态。真实计算所需的 <VarP index={2} /> 是关闭旋塞并等待气体回温后得到的稳定压强，而不是刚放气时的瞬时压强。</p>
          </DocumentDisclosure>
        </div>
      </section>

      <section className="studio-heat-guide-section">
        <h4>4. Data to Record / 需要记录的数据</h4>
        <p>每组实验记录 <VarU index={1} />、<VarU index={2} />、<VarUT index={1} /> 和 <VarUT index={2} />。<VarU index={1} />、<VarU index={2} /> 用于换算 <VarP index={1} />、<VarP index={2} /> 并计算 <VarGamma />，<VarUT index={1} />、<VarUT index={2} /> 用于辅助判断温度响应与回温状态。</p>
      </section>
    </div>
  );
};

const renderRecordingTab = (
  file: WorkbenchHeatCapacityState,
  copy: ReturnType<typeof text>,
  onExpectedTrialCountChange: HeatCapacityLeftPanelProps['onExpectedTrialCountChange'],
) => {
  const completed = getHeatCapacityCompletedTrialCount(file.heatCapacityTrials);
  return (
    <div className="studio-heat-recording" data-heat-capacity-recording-tab="true">
      {renderProcessSampleStatus(file, copy.processSamples)}

      <div className="studio-heat-recording-controls">
        <div>
          <span>{copy.recordingCopy.expectedTrials}</span>
          <strong>{copy.recordingCopy.progress(completed, file.heatCapacityExpectedTrialCount)}</strong>
        </div>
        <div className="studio-heat-trial-count">
          {[
            { label: copy.recordingCopy.options.three, count: 3, mode: '3' as const },
            { label: copy.recordingCopy.options.five, count: 5, mode: '5' as const },
            { label: copy.recordingCopy.options.custom, count: file.heatCapacityExpectedTrialCount, mode: 'custom' as const },
          ].map((option) => (
            <button
              key={option.mode}
              type="button"
              className={file.heatCapacityExpectedTrialCountMode === option.mode ? 'studio-heat-trial-count-active' : ''}
              onClick={() => onExpectedTrialCountChange(option.count, option.mode)}
            >
              {option.label}
            </button>
          ))}
          {file.heatCapacityExpectedTrialCountMode === 'custom' ? (
            <input
              type="number"
              min={1}
              max={10}
              value={file.heatCapacityExpectedTrialCount}
              onChange={(event) => onExpectedTrialCountChange(Number(event.target.value), 'custom')}
              aria-label={copy.recordingCopy.options.customAria}
            />
          ) : null}
        </div>
      </div>

      <div className={`studio-result-status ${completed >= file.heatCapacityExpectedTrialCount ? 'studio-result-status-ready' : 'studio-result-status-waiting'}`}>
        <strong>{completed >= file.heatCapacityExpectedTrialCount ? copy.recordingCopy.completeTitle : `${completed} ${copy.imported}`}</strong>
        <span>{completed >= file.heatCapacityExpectedTrialCount ? copy.recordingCopy.completeHint : copy.recordingCopy.activeHint}</span>
      </div>

      <div className="studio-heat-table-scroll">
        <table className="studio-table studio-heat-recording-table">
          <thead>
            <tr>
              <th>{copy.recordingCopy.headers.trial}</th>
              <th><VarU index={1} /> / mV</th>
              <th><VarU index={2} /> / mV</th>
              <th><VarUT index={1} /> / mV</th>
              <th><VarUT index={2} /> / mV</th>
              <th>{copy.recordingCopy.headers.status}</th>
            </tr>
          </thead>
          <tbody>
            {file.heatCapacityTrials.map((trial) => (
              <tr key={trial.id}>
                <td>{trial.trialIndex}</td>
                <td>{formatNumber(trial.U1Mv, 2)}</td>
                <td>{formatNumber(trial.U2Mv, 2)}</td>
                <td>{formatNumber(trial.UT1Mv, 1)}</td>
                <td>{formatNumber(trial.UT2Mv, 1)}</td>
                <td><span className={statusClass(trial.status)}>{statusLabel(trial.status, copy.trialStatus)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const getFormulaExample = (trialResults: HeatCapacityProcessingTrialResult[]) => (
  trialResults.find((trial) => trial.status === 'valid') ?? trialResults[0] ?? null
);

const renderGammaChart = (
  trialResults: HeatCapacityProcessingTrialResult[],
  theoreticalGamma: number,
  meanGamma: number | null,
  copy: ReturnType<typeof text>['chart'],
) => {
  const validResults = trialResults.filter((trial) => trial.status === 'valid' && trial.gamma !== null);
  if (validResults.length === 0 || meanGamma === null) return null;
  const values = validResults.map((trial) => trial.gamma ?? 0);
  const minY = Math.min(1.2, theoreticalGamma, meanGamma, ...values) - 0.04;
  const maxY = Math.max(1.55, theoreticalGamma, meanGamma, ...values) + 0.04;
  const width = 420;
  const height = 180;
  const left = 38;
  const right = 18;
  const top = 18;
  const bottom = 30;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const y = (value: number) => top + (maxY - value) / (maxY - minY) * plotHeight;
  const barWidth = Math.max(18, Math.min(44, plotWidth / validResults.length * 0.52));
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
          const barHeight = top + plotHeight - barTop;
          return (
            <g key={trial.trialIndex}>
              <rect x={x} y={barTop} width={barWidth} height={barHeight} rx="3" className="studio-heat-gamma-bar" />
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

const renderFormulaPanel = (
  title: string,
  formula: React.ReactNode,
  result: React.ReactNode,
) => (
  <div className="studio-heat-formula-panel">
    <div className="studio-heat-formula-title">
      <strong>{title}</strong>
    </div>
    <div className="studio-heat-formula-expression">{formula}</div>
    <div className="studio-heat-formula-result">{result}</div>
  </div>
);

const renderProcessingTab = (
  file: WorkbenchHeatCapacityState,
  copy: ReturnType<typeof text>,
  onCalculateResults: () => void,
) => {
  const result = file.heatCapacityProcessingResult;
  const completed = getHeatCapacityCompletedTrialCount(file.heatCapacityTrials);
  const example = getFormulaExample(result.trialResults);
  return (
    <div className="studio-heat-processing" data-heat-capacity-processing-tab="true">
      <div className="studio-heat-processing-intro">
        <div className="studio-analysis-cell">
          <span>{copy.known}</span>
          <strong><VarP index={0} /> = {formatNumber(file.ambientPressureKPa, 2)} kPa; S = {formatNumber(file.pressureSensitivityMvPerKPa, 0)} mV/kPa; <GammaAir /> = {file.theoreticalGamma.toFixed(2)}</strong>
        </div>
        <div className="studio-analysis-cell">
          <span>{copy.measured}</span>
          <strong><VarU index={1} />, <VarU index={2} />, <VarUT index={1} />, <VarUT index={2} /></strong>
        </div>
      </div>

      <div className="studio-heat-calculate-row">
        <span>{completed} {copy.imported}</span>
        <button type="button" onClick={onCalculateResults} disabled={completed === 0}>
          <BarChart3 size={14} />
          {copy.calculate}
        </button>
      </div>

      {!result.calculated ? (
        <div className="studio-empty-panel-tree">{copy.emptyProcessing}</div>
      ) : null}

      {result.calculated ? (
        <div className="studio-heat-processing-results">
          <div className="studio-heat-formula-grid">
            {renderFormulaPanel(
              copy.processingCopy.formula.pressure,
              <span><VarDeltaP index="1,i" /> = <VarU index="1,i" /> / S; <VarDeltaP index="2,i" /> = <VarU index="2,i" /> / S</span>,
              <span>{copy.processingCopy.formula.result}: <VarDeltaP index={1} /> = {formatNumber(example?.deltaP1KPa, 2)} kPa, <VarDeltaP index={2} /> = {formatNumber(example?.deltaP2KPa, 2)} kPa</span>,
            )}
            {renderFormulaPanel(
              copy.processingCopy.formula.absolute,
              <span><VarP index="1,i" /> = <VarP index={0} /> + <VarDeltaP index="1,i" />; <VarP index="2,i" /> = <VarP index={0} /> + <VarDeltaP index="2,i" /></span>,
              <span>{copy.processingCopy.formula.result}: <VarP index={1} /> = {formatNumber(example?.P1KPa, 2)} kPa, <VarP index={2} /> = {formatNumber(example?.P2KPa, 2)} kPa</span>,
            )}
            {renderFormulaPanel(
              copy.processingCopy.formula.gamma,
              <span><VarGamma index="i" /> = log(<VarP index="1,i" /> / <VarP index={0} />) / log(<VarP index="1,i" /> / <VarP index="2,i" />)</span>,
              <span>{copy.processingCopy.formula.result}: <VarGamma index="i" /> = {formatGamma(example?.gamma)}</span>,
            )}
            {renderFormulaPanel(
              copy.processingCopy.formula.average,
              <span><GammaMean /> = average(<VarGamma index="i" />); ε = |<GammaMean /> - <GammaAir />| / <GammaAir /> × 100%</span>,
              <span>{copy.processingCopy.formula.result}: {copy.processingCopy.formula.meanGamma} = {formatGamma(result.meanGamma)}, {copy.processingCopy.formula.relativeError} = {formatNumber(result.relativeErrorPercent, 2)}%</span>,
            )}
          </div>

          <div className={`studio-result-status ${result.status === 'ready' ? 'studio-result-status-ready' : 'studio-result-status-waiting'}`}>
            <strong>{copy.processingCopy.formula.meanGamma} = {formatGamma(result.meanGamma)}</strong>
            <span><GammaAir /> = {result.theoreticalGamma.toFixed(3)} · {copy.processingCopy.formula.relativeError} = {formatNumber(result.relativeErrorPercent, 2)}% · {copy.processingCopy.formula.resultStatus}: {result.status === 'ready' ? copy.processingCopy.formula.reasonable : result.message}</span>
          </div>

          <div className="studio-heat-table-scroll">
            <table className="studio-table studio-heat-processing-table">
              <thead>
                <tr>
                  <th>{copy.processingCopy.table.trial}</th>
                  <th><VarU index={1} /></th>
                  <th><VarU index={2} /></th>
                  <th><VarDeltaP index={1} /></th>
                  <th><VarDeltaP index={2} /></th>
                  <th><VarP index={1} /></th>
                  <th><VarP index={2} /></th>
                  <th><VarGamma index="i" /></th>
                  <th>{copy.processingCopy.table.status}</th>
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
                    <td>{trial.status === 'valid' ? copy.processingCopy.formula.valid : copy.processingCopy.formula.invalid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {renderGammaChart(result.trialResults, result.theoreticalGamma, result.meanGamma, copy.chart)}
        </div>
      ) : null}

      <DocumentDisclosure id="mean-gamma-first" title={<>{copy.thinking}：为什么多组实验应先分别计算 <VarGamma index="i" />，再对结果取平均？</>}>
        <p>多组实验中，每组 <VarU index="1,i" /> 和 <VarU index="2,i" /> 是一对对应数据，应保持配对关系。本实验主公式 <VarGamma /> = log(<VarP index={1} /> / <VarP index={0} />) / log(<VarP index={1} /> / <VarP index={2} />) 是非线性公式，因此不应优先把多组 <VarU index={1} /> 分别平均、<VarU index={2} /> 分别平均后只计算一次 <VarGamma />。更合理的流程是每组先分别计算 <VarGamma index="i" />，再对所有有效 <VarGamma index="i" /> 求平均。这样既保留了每组实验内部数据的对应关系，也能让结果柱状图显示每组实验的离散程度。</p>
        <p>同一组实验内部，为减少仪表末位跳动，可以对稳定阶段短时间读数取平均来得到更稳定的 <VarU index="1,i" /> 或 <VarU index="2,i" />；但这不同于跨多组实验先平均 <VarU index={1} /> / <VarU index={2} />。前者是同一状态下的读数平滑，后者会改变多组实验之间的数据配对关系。</p>
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
}: HeatCapacityLeftPanelProps) => {
  const copy = text(language);
  const contentTitle = useMemo(() => {
    if (panelKey === 'heatCapacityRecords') return copy.recording;
    if (panelKey === 'heatCapacityProcessing') return copy.processing;
    return copy.guide;
  }, [copy.guide, copy.processing, copy.recording, panelKey]);

  return (
    <section className="studio-heat-panel-content" data-heat-capacity-panel-content="true" data-heat-capacity-panel-key={panelKey}>
      <div className="studio-heat-panel-content-header">
        <span>{copy.panelKicker}</span>
        <strong>{contentTitle}</strong>
      </div>
      <div className="studio-heat-left-content">
        {panelKey === 'heatCapacityGuide'
          ? renderGuideTab(language)
          : panelKey === 'heatCapacityRecords'
            ? renderRecordingTab(file, copy, onExpectedTrialCountChange)
            : renderProcessingTab(file, copy, onCalculateResults)}
      </div>
    </section>
  );
};
