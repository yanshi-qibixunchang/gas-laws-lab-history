import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const COMPARISON_PATH = path.join(
  ROOT,
  'docs',
  'instrument-modeling',
  'analysis',
  'piston-oscillation-waveform-commonality-comparison-2026-08-30.json',
);
const OUTPUT_DIR = path.join(
  ROOT,
  'docs',
  'instrument-modeling',
  'analysis',
  'piston-oscillation-waveform-commonality-report-2026-08-30',
);
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'artifact.json');
const REVIEWED_DATA_PATH = path.join(OUTPUT_DIR, 'reviewed-report-datasets.json');

const comparison = JSON.parse(fs.readFileSync(COMPARISON_PATH, 'utf8'));
const currentDamping = comparison.dampingSweep.find(
  (row) => row.dampingNsPerM === 0.434,
);
const selectedDamping = comparison.dampingSweep.find(
  (row) => row.dampingNsPerM
    === comparison.selectedOfflineDampingCandidateNsPerM,
);
const observationById = Object.fromEntries(
  comparison.observationCandidates.map((candidate) => [candidate.id, candidate]),
);

const relativePath = (absolutePath) => path.relative(ROOT, absolutePath).replace(/\\/g, '/');
const round = (value, decimalPlaces = 3) => Number(value.toFixed(decimalPlaces));
const midpoint = (minimum, maximum) => (minimum + maximum) / 2;

const dampingRows = comparison.dampingSweep.map((row) => ({
  dampingLabel: row.dampingNsPerM.toFixed(3).replace(/0+$/, '').replace(/\.$/, ''),
  dampingNsPerM: row.dampingNsPerM,
  averageVisibleDurationErrorMs: round(row.averageVisibleDurationErrorMs, 2),
  averageTimingRmseMs: round(row.averageTimingRmseMs, 3),
  averageAmplitudeRmseKpa: round(row.averageAmplitudeRmseKpa, 3),
  averageDiagnosticScore: round(row.averageScore, 3),
  status: row.dampingNsPerM === 0.434
    ? '现行默认'
    : row.dampingNsPerM === selectedDamping.dampingNsPerM
      ? '本轮离线最优'
      : '离线候选',
}));

const heightRows = currentDamping.runs.map((currentRun) => {
  const candidateRun = selectedDamping.runs.find(
    (run) => run.heightMm === currentRun.heightMm,
  );
  const [realMinimumMs, realMaximumMs] = currentRun.realVisibleRangeMs;
  return {
    heightMm: currentRun.heightMm,
    heightLabel: `${currentRun.heightMm} mm`,
    realPeriodMs: round(currentRun.realPeriodMs, 2),
    currentPeriodMs: round(currentRun.modelPeriodMs, 2),
    candidatePeriodMs: round(candidateRun.modelPeriodMs, 2),
    candidatePeriodAbsoluteErrorMs: round(
      Math.abs(candidateRun.modelPeriodMs - currentRun.realPeriodMs),
      2,
    ),
    realVisibleMinimumMs: realMinimumMs,
    realVisibleMaximumMs: realMaximumMs,
    realVisibleMidpointMs: midpoint(realMinimumMs, realMaximumMs),
    realVisibleRange: `${realMinimumMs}–${realMaximumMs}`,
    currentVisibleDurationMs: round(currentRun.modelVisibleDurationMs, 0),
    candidateVisibleDurationMs: round(candidateRun.modelVisibleDurationMs, 0),
    currentReleaseAmplitudeMm: round(currentRun.releaseAmplitudeMm, 2),
    candidateReleaseAmplitudeMm: round(candidateRun.releaseAmplitudeMm, 2),
  };
});

const sensitivityRows = comparison.pressDurationSensitivity.map((row) => ({
  pressDurationMs: row.pressDurationMs,
  pressDurationLabel: `${row.pressDurationMs} ms`,
  selectedDampingNsPerM: row.selectedDampingNsPerM,
  averageVisibleDurationErrorMs: round(row.averageVisibleDurationErrorMs, 2),
  averageTimingRmseMs: round(row.averageTimingRmseMs, 3),
  averageAmplitudeRmseKpa: round(row.averageAmplitudeRmseKpa, 3),
  averageDiagnosticScore: round(row.averageScore, 3),
}));

const morphologyDefinitions = [
  {
    metric: '尾段标准差',
    unit: 'kPa',
    key: 'tailStandardDeviationKpa',
    interpretation: '包含残余主振荡、慢变化和传感器波动，不能单独当作噪声。',
  },
  {
    metric: '11 ms 高频残差标准差',
    unit: 'kPa',
    key: 'fastResidualStandardDeviationKpa',
    interpretation: '最接近四组共有的细小起伏量级；连续微波动候选与实测中位数最接近。',
  },
  {
    metric: '尾段相邻点相关系数',
    unit: '',
    key: 'tailLagOneCorrelation',
    interpretation: '同时受尚未消失的主振荡影响，不用于单独识别传感器噪声。',
  },
  {
    metric: '最长连续相同读数',
    unit: 'ms',
    key: 'longestExactPlateauMs',
    interpretation: '0.01 kPa 量化与低斜率共同形成；不需要独立的“平台事件”模型。',
  },
];

const morphologyRows = morphologyDefinitions.map((definition) => {
  const real = comparison.realMetricRanges[definition.key];
  const current = observationById['current-observation']
    .metricDistributions[definition.key];
  const white = observationById['larger-independent-white-noise']
    .metricDistributions[definition.key];
  const correlated = observationById['multi-timescale-correlated-residual']
    .metricDistributions[definition.key];
  const secondOrder = observationById[
    'correlated-residual-with-weak-second-order-response'
  ].metricDistributions[definition.key];
  return {
    metric: definition.metric,
    unit: definition.unit,
    realMinimum: round(real.minimum, 5),
    realMedian: round(real.median, 5),
    realMaximum: round(real.maximum, 5),
    realRange: `${round(real.minimum, 5)}–${round(real.maximum, 5)}`,
    currentMedian: round(current.median, 5),
    whiteMedian: round(white.median, 5),
    correlatedMedian: round(correlated.median, 5),
    secondOrderMedian: round(secondOrder.median, 5),
    interpretation: definition.interpretation,
  };
});

const currentVisibleErrorMs = currentDamping.averageVisibleDurationErrorMs;
const candidateVisibleErrorMs = selectedDamping.averageVisibleDurationErrorMs;
const visibleErrorReduction = 1 - candidateVisibleErrorMs / currentVisibleErrorMs;
const realFastResidualMedian = comparison.realMetricRanges
  .fastResidualStandardDeviationKpa.median;
const correlatedFastResidualMedian = observationById[
  'multi-timescale-correlated-residual'
].metricDistributions.fastResidualStandardDeviationKpa.median;
const realPlateauMedianMs = comparison.realMetricRanges.longestExactPlateauMs.median;
const correlatedPlateauMedianMs = observationById[
  'multi-timescale-correlated-residual'
].metricDistributions.longestExactPlateauMs.median;
const whitePlateauMedianMs = observationById[
  'larger-independent-white-noise'
].metricDistributions.longestExactPlateauMs.median;
const maximumCandidatePeriodErrorMs = Math.max(
  ...heightRows.map((row) => row.candidatePeriodAbsoluteErrorMs),
);
const secondOrderMaximumPeriodShiftMs = Math.max(
  Math.abs(observationById['correlated-residual-with-weak-second-order-response']
    .primaryPeriodShiftMs.minimum),
  Math.abs(observationById['correlated-residual-with-weak-second-order-response']
    .primaryPeriodShiftMs.maximum),
);

const comparisonPath = relativePath(COMPARISON_PATH);
const comparisonScriptPath = 'scripts/analysis/pistonOscillationWaveformCommonalityComparison.mjs';
const reviewedDataPath = relativePath(REVIEWED_DATA_PATH);
const datasetSource = (id, label, dataset, description, metricDefinitions) => ({
  id,
  label,
  path: reviewedDataPath,
  query: {
    engine: 'duckdb',
    language: 'sql',
    sql: `SELECT * EXCLUDE (dataset) FROM read_json_auto('${reviewedDataPath}') WHERE dataset = '${dataset}'`,
    description,
    tables_used: [reviewedDataPath],
    filters: [`dataset = '${dataset}'`],
    metric_definitions: metricDefinitions,
  },
});

const headlineRows = [{
  currentVisibleErrorMs: round(currentVisibleErrorMs, 2),
  candidateVisibleErrorMs: round(candidateVisibleErrorMs, 2),
  visibleErrorReduction,
  realFastResidualMedianKpa: round(realFastResidualMedian, 5),
  correlatedFastResidualMedianKpa: round(correlatedFastResidualMedian, 5),
  maximumCandidatePeriodErrorMs: round(maximumCandidatePeriodErrorMs, 2),
}];

const sources = [
  datasetSource(
    'headline_source',
    '比较结论头部指标',
    'headline',
    '读取现行与离线候选的包络、周期和连续微波动头部指标。',
    [
      '现行时长区间外误差：0.434 N·s/m 下四组可见时长到各自人工区间最近边界的平均距离。',
      '连续微波动残差：四高度 × 32 固定种子下，尾部 100 ms 减去 11 ms 居中移动平均后的标准差中位数。',
      '最大周期偏差：1.1 N·s/m 候选在四组高度相对已确认实测周期的最大绝对偏差。',
    ],
  ),
  datasetSource(
    'damping_source',
    '等效线性损耗离线扫描',
    'damping_comparison',
    '读取七个等效线性损耗候选的平均时刻、幅值、可见时长和综合诊断误差。',
    [
      '可见时长：最后一个相对稳定压强至少 0.5 kPa 的主极值时刻。',
      '可见时长区间外误差：模型时长低于人工清晰下限或高于微弱上限时，到最近边界的距离。',
      '综合诊断分数：时刻 RMSE/1.5 ms + 幅值 RMSE/0.75 kPa + 可见时长区间外误差/30 ms。',
    ],
  ),
  datasetSource(
    'height_source',
    '四个高度逐组比较',
    'height_comparison',
    '读取实测、现行默认和 1.1 N·s/m 离线候选在四个高度的周期与可见时长。',
    [
      '实测周期采用用户确认的同相位端点差除以完整周期数。',
      '模型周期采用匹配主极值序列首尾时间差除以完整周期数。',
      '释放幅度只作为每组 2.5–12.0 mm 的对齐干扰参数。',
    ],
  ),
  datasetSource(
    'morphology_source',
    '观测层共同形态比较',
    'morphology_comparison',
    '读取四种观测层机制探针在四个高度 × 32 个固定种子下的形态指标。',
    [
      '11 ms 高频残差：尾部 100 ms 压力减去居中 11 点移动平均后的标准差。',
      '最长连续相同读数：经过 0.01 kPa 向零量化后，一段连续相等采样值首尾采样时刻的最大差值。',
      '实测范围来自 20、30、40、50 mm 各一条 1000 Hz、501 点记录。',
    ],
  ),
  datasetSource(
    'sensitivity_source',
    '按压时长稳健性检查',
    'press_duration_sensitivity',
    '读取 40、80、160 ms 三种假设按压时长下重新扫描得到的最佳损耗候选。',
    [
      '每种按压时长均重新扫描全部七个损耗候选和每组 2.5–12.0 mm 的释放幅度干扰参数。',
      '最佳候选按相同综合诊断分数选择，不沿用 80 ms 条件下的既定答案。',
      '该检查仍假设松手瞬间速度为零，不能替代真实按压与释放轨迹。',
    ],
  ),
];

const title = '活塞振动曲线共同形态与候选机制比较';
const generatedAt = new Date().toISOString();
const manifest = {
  version: 1,
  surface: 'report',
  title,
  description:
    '比较四组实测曲线与现行完整模型，判断应先调整主振荡包络还是增加观测层微波动。',
  generatedAt,
  blocks: [
    {
      id: 'title',
      type: 'markdown',
      layout: 'full',
      body: `# ${title}`,
    },
    {
      id: 'technical_summary',
      type: 'markdown',
      layout: 'full',
      body:
        `## 技术结论：先修正衰减包络，再小幅补充连续微波动\n\n`
        + `现行物理模型的周期—高度趋势已经正确，但临时等效损耗 **0.434 N·s/m** 使四组平均可见时长区间外误差达到 **${round(currentVisibleErrorMs, 2)} ms**。在不改变质量、直径、死体积、比热容比和热模型的前提下，离线候选 **${selectedDamping.dampingNsPerM} N·s/m** 把该误差降到 **${round(candidateVisibleErrorMs, 2)} ms**，周期最大绝对偏差仍为 **${round(maximumCandidatePeriodErrorMs, 2)} ms**。这构成了复核等效损耗的明确证据，但还不是参数认证。\n\n`
        + `观测层方面，当前 0.01 kPa 量化已经能自然产生与实测相近的短平台；真正缺少的是约 **${round(realFastResidualMedian, 5)} kPa** 量级的细小连续起伏。多时间尺度连续微波动候选达到 **${round(correlatedFastResidualMedian, 5)} kPa**，而单纯提高独立白噪声会过度增加高频锯齿。弱二阶响应没有改善共同指标，反而带来最高约 **${round(secondOrderMaximumPeriodShiftMs, 3)} ms** 的周期扰动，因此本轮不建议接入。`,
    },
    {
      id: 'headline_metrics',
      type: 'metric-strip',
      layout: 'full',
      cardIds: ['visible_error', 'fast_residual', 'period_guardrail'],
    },
    {
      id: 'envelope_finding',
      type: 'markdown',
      layout: 'full',
      body:
        `## 现行主要偏差来自振荡衰减过慢，而不是周期趋势错误\n\n`
        + `在 20–50 mm 四个高度，现行模型的周期仍保持“高度越低、周期越短”的正确关系。问题集中在包络：0.434 N·s/m 下，40、30、20 mm 的可见振荡分别比实测微弱上限长约 115、110、124 ms。离线扫描显示 1.0–1.1 N·s/m 区间明显更合理；继续提高到 1.2–1.4 N·s/m 后，又开始出现过早衰减。`,
    },
    {
      id: 'damping_chart_block',
      type: 'chart',
      layout: 'full',
      chartId: 'damping_visible_error_chart',
    },
    {
      id: 'height_table_block',
      type: 'table',
      layout: 'full',
      tableId: 'height_comparison_table',
    },
    {
      id: 'observation_finding',
      type: 'markdown',
      layout: 'full',
      sourceId: 'morphology_source',
      body:
        `## 微波动应采用连续残差，短平台继续由量化自然形成\n\n`
        + `四组实测的 11 ms 高频残差中位数为 **${round(realFastResidualMedian, 5)} kPa**。在相同离线包络下，当前观测层为 **${round(observationById['current-observation'].metricDistributions.fastResidualStandardDeviationKpa.median, 5)} kPa**，略显平滑；多时间尺度连续微波动为 **${round(correlatedFastResidualMedian, 5)} kPa**，平台中位数为 **${round(correlatedPlateauMedianMs, 1)} ms**，接近实测的 **${round(realPlateauMedianMs, 1)} ms**。单纯把独立白噪声提高到 12 Pa 后，高频残差升至 **${round(observationById['larger-independent-white-noise'].metricDistributions.fastResidualStandardDeviationKpa.median, 5)} kPa**，平台中位数缩短到 **${round(whitePlateauMedianMs, 1)} ms**，因此不采用。`,
    },
    {
      id: 'morphology_table_block',
      type: 'table',
      layout: 'full',
      tableId: 'morphology_comparison_table',
    },
    {
      id: 'scope_definitions',
      type: 'markdown',
      layout: 'full',
      body:
        `## 比较范围：识别共同形态，不逐点拟合任何一条曲线\n\n`
        + `每个高度只有一条真实记录，因此本轮只把四组都出现的特征视为“共同目标”，把两至三组出现的现象视为概率性变体，把单组现象排除在默认模型之外。每组只允许一个释放幅度作为对齐干扰参数；它不代表真实按压位移，也不会写入产品。压力基线、相位和幅度对齐仅用于比较主周期、包络及观测残差。`,
    },
    {
      id: 'methodology',
      type: 'markdown',
      layout: 'full',
      body:
        `## 方法：物理包络和观测残差分别比较\n\n`
        + `物理比较固定现行有限热交换模型，只离线扫描等效线性损耗和每组释放幅度；观测比较再固定本轮最佳包络，对当前观测层、提高白噪声、连续多时间尺度残差、连续残差加弱二阶响应分别运行四个高度 × 32 个固定种子。所有候选最后都经过 1000 Hz 采样和 0.01 kPa 向零量化。`,
    },
    {
      id: 'robustness_finding',
      type: 'markdown',
      layout: 'full',
      sourceId: 'sensitivity_source',
      body:
        `## 稳健性：结论不依赖单一按压时长假设\n\n`
        + `把假设按压时长分别设为 40、80、160 ms，并为每种条件重新扫描全部损耗和释放幅度后，最佳候选只在 **1.0–1.1 N·s/m** 之间变化，平均可见时长区间外误差保持在 **6.5–7.0 ms**。因此“0.434 N·s/m 下衰减过慢”是稳定结论；但由于没有真实松手速度与按压轨迹，当前证据只能把 1.0–1.1 N·s/m 定为回归候选区间，不能认证单一参数。`,
    },
    {
      id: 'sensitivity_table_block',
      type: 'table',
      layout: 'full',
      tableId: 'press_duration_sensitivity_table',
    },
    {
      id: 'limitations',
      type: 'markdown',
      layout: 'full',
      body:
        `## 限制：1.1 N·s/m 和微波动系数都仍是工程候选\n\n`
        + `四组数据不能分离高度效应和重复实验差异，也没有记录真实释放速度、按压时长、软管几何或传感器腔体。离线最佳损耗可能仍吸收了未显式建模的热耗散、微小摩擦或释放过程；连续残差的两个时间尺度只证明“这种机制足以产生共同形态”，不能宣称为传感器实测常数。第 1 组较大的尾段摆动和第 4 组初始不对称均未用于新增模型项。`,
    },
    {
      id: 'next_steps',
      type: 'markdown',
      layout: 'full',
      body:
        `## 建议下一步：用受控候选同时守住包络、周期和错误后果\n\n`
        + `1. 先在 **0.9、1.0、1.1 N·s/m** 三个窄候选上运行现有正确/错误后果矩阵，验证结果方向、框选和最终计算不会被破坏。\n`
        + `2. 在通过的损耗候选上加入“快速小幅连续分量＋较慢微弱分量＋少量白噪声”，继续保留现有 3 ms 响应和 0.01 kPa 量化。\n`
        + `3. 每次新实验生成新种子，记录保存后固定；对多种子运行正确/错误回归，要求随机范围明显小于操作错误效应。\n`
        + `4. 暂不加入二阶管路响应、摩擦、平台事件或按高度写死的噪声参数。`,
    },
    {
      id: 'further_questions',
      type: 'markdown',
      layout: 'full',
      body:
        `## 待审核的实施选择\n\n`
        + `本轮证据支持进入一个受控实现小闭环：先比较 0.9/1.0/1.1 N·s/m 对既有正确与错误场景的影响，再接入连续微波动候选。若用户要求绝不动现行等效损耗，也可以只加微波动，但会保留已经确认的振荡持续过长问题。`,
    },
  ],
  cards: [
    {
      id: 'visible_error',
      dataset: 'headline',
      sourceId: 'headline_source',
      description: '四组模型可见时长超出各自实测人工区间的平均距离。',
      metrics: [
        { label: '现行时长区间外误差', field: 'currentVisibleErrorMs', format: 'number', unit: 'ms' },
        { label: '1.1 候选', field: 'candidateVisibleErrorMs', format: 'number', unit: 'ms' },
        { label: '相对降低', field: 'visibleErrorReduction', format: 'percent' },
      ],
    },
    {
      id: 'fast_residual',
      dataset: 'headline',
      sourceId: 'headline_source',
      description: '尾段减去 11 ms 居中移动平均后的标准差中位数。',
      metrics: [
        { label: '连续微波动残差', field: 'correlatedFastResidualMedianKpa', format: 'number', unit: 'kPa' },
        { label: '实测中位数', field: 'realFastResidualMedianKpa', format: 'number', unit: 'kPa' },
      ],
    },
    {
      id: 'period_guardrail',
      dataset: 'headline',
      sourceId: 'headline_source',
      description: '1.1 N·s/m 离线候选在四个高度相对已确认实测周期的最大绝对偏差。',
      metrics: [
        { label: '最大周期偏差', field: 'maximumCandidatePeriodErrorMs', format: 'number', unit: 'ms' },
      ],
    },
  ],
  charts: [
    {
      id: 'damping_visible_error_chart',
      title: '等效线性损耗候选的平均可见时长区间外误差',
      subtitle: '四组高度平均；越低表示衰减包络越接近实测人工可见区间。',
      type: 'bar',
      intent: 'comparison',
      dataset: 'damping_comparison',
      sourceId: 'damping_source',
      encodings: {
        x: { field: 'dampingLabel', type: 'nominal' },
        y: { field: 'averageVisibleDurationErrorMs', type: 'quantitative' },
      },
    },
  ],
  tables: [
    {
      id: 'height_comparison_table',
      title: '四个高度的周期与可见振荡时长',
      description: '现行默认与 1.1 N·s/m 离线候选；释放幅度仅用于波形对齐。',
      dataset: 'height_comparison',
      sourceId: 'height_source',
      defaultSort: { field: 'heightLabel', direction: 'desc' },
      columns: [
        { field: 'heightLabel', label: '高度' },
        { field: 'realPeriodMs', label: '实测周期 / ms', format: 'number' },
        { field: 'currentPeriodMs', label: '现行周期 / ms', format: 'number' },
        { field: 'candidatePeriodMs', label: '1.1 候选周期 / ms', format: 'number' },
        { field: 'realVisibleRange', label: '实测可见区间 / ms' },
        { field: 'currentVisibleDurationMs', label: '现行可见时长 / ms', format: 'number' },
        { field: 'candidateVisibleDurationMs', label: '1.1 候选时长 / ms', format: 'number' },
      ],
    },
    {
      id: 'morphology_comparison_table',
      title: '观测层共同形态指标',
      description: '所有观测候选固定在 1.1 N·s/m 离线包络，并汇总四个高度 × 32 个种子。',
      dataset: 'morphology_comparison',
      sourceId: 'morphology_source',
      defaultSort: { field: 'metric', direction: 'asc' },
      columns: [
        { field: 'metric', label: '指标' },
        { field: 'unit', label: '单位' },
        { field: 'realRange', label: '四组实测范围' },
        { field: 'realMedian', label: '实测中位数', format: 'number' },
        { field: 'currentMedian', label: '当前观测层', format: 'number' },
        { field: 'whiteMedian', label: '提高白噪声', format: 'number' },
        { field: 'correlatedMedian', label: '连续微波动', format: 'number' },
        { field: 'secondOrderMedian', label: '连续微波动＋二阶', format: 'number' },
        { field: 'interpretation', label: '解释' },
      ],
    },
    {
      id: 'press_duration_sensitivity_table',
      title: '假设按压时长的敏感性复核',
      description: '每种按压时长均独立重扫损耗与释放幅度；结果用于检验结论是否依赖单一输入假设。',
      dataset: 'press_duration_sensitivity',
      sourceId: 'sensitivity_source',
      defaultSort: { field: 'pressDurationMs', direction: 'asc' },
      columns: [
        { field: 'pressDurationMs', label: '假设按压时长 / ms', format: 'number' },
        { field: 'selectedDampingNsPerM', label: '最佳损耗 / N·s/m', format: 'number' },
        { field: 'averageVisibleDurationErrorMs', label: '时长区间外误差 / ms', format: 'number' },
        { field: 'averageTimingRmseMs', label: '极值时刻 RMSE / ms', format: 'number' },
        { field: 'averageAmplitudeRmseKpa', label: '极值幅值 RMSE / kPa', format: 'number' },
      ],
    },
  ],
  sources,
};

const artifact = {
  surface: 'report',
  manifest,
  snapshot: {
    version: 1,
    generatedAt,
    status: 'ready',
    datasets: {
      headline: headlineRows,
      damping_comparison: dampingRows,
      height_comparison: heightRows,
      morphology_comparison: morphologyRows,
      press_duration_sensitivity: sensitivityRows,
    },
    accessIssues: [],
  },
  sources,
  package_info: {
    root: 'repository',
    artifactPath: relativePath(OUTPUT_PATH),
    comparisonPath,
    comparisonScriptPath,
    reviewedDataPath,
  },
};

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const reviewedRows = [
  ...headlineRows.map((row) => ({ dataset: 'headline', ...row })),
  ...dampingRows.map((row) => ({ dataset: 'damping_comparison', ...row })),
  ...heightRows.map((row) => ({ dataset: 'height_comparison', ...row })),
  ...morphologyRows.map((row) => ({ dataset: 'morphology_comparison', ...row })),
  ...sensitivityRows.map((row) => ({ dataset: 'press_duration_sensitivity', ...row })),
];
fs.writeFileSync(
  REVIEWED_DATA_PATH,
  `${JSON.stringify(reviewedRows, null, 2)}\n`,
  'utf8',
);
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
console.log(OUTPUT_PATH);
