import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..", "..");
const sweepPath = resolve(
  repoRoot,
  "docs/instrument-modeling/analysis/piston-oscillation-dissipation-sweep-2026-08-25.json",
);
const outputPath = resolve(
  repoRoot,
  "docs/instrument-modeling/analysis/piston-oscillation-checkpoint-2-parameter-identification-report-2026-08-25/artifact.json",
);
const sweep = JSON.parse(readFileSync(sweepPath, "utf8"));

const currentModel = sweep.comparatorCandidates.find(
  (candidate) => candidate.viscousDampingNsPerM === 0.434,
);
const adiabaticBest = sweep.bestByModelFamily.adiabaticNoDryFriction;
const mathematicalBest = sweep.bestByModelFamily.unrestricted;
const engineeringCandidate = sweep.candidates.find(
  (candidate) =>
    candidate.viscousDampingNsPerM === 1 &&
    candidate.coulombFrictionN === 0.005 &&
    candidate.thermalRelaxationTimeS === 0.05 &&
    candidate.thermalVolumeExponent === 1,
);

if (!currentModel || !adiabaticBest || !mathematicalBest || !engineeringCandidate) {
  throw new Error("The sweep output is missing a required comparator or candidate.");
}

const totalCombinationCount =
  sweep.matrix.coarseCombinationCount +
  sweep.matrix.fineCombinationCount +
  sweep.matrix.focusedCombinationCount +
  sweep.matrix.volumeScaledThermalCombinationCount;
const scoreImprovement = (currentModel.score - engineeringCandidate.score) / currentModel.score;
const thermalImprovement = (adiabaticBest.score - mathematicalBest.score) / adiabaticBest.score;

const round = (value, digits = 3) => Number(value.toFixed(digits));
const tauLabel = (candidate) =>
  typeof candidate.thermalRelaxationTimeS === "number"
    ? `${Math.round(candidate.thermalRelaxationTimeS * 1000)} ms`
    : "绝热（无热松弛）";

const familyRows = [
  { name: "当前模型", shortName: "当前", candidate: currentModel, decision: "衰减显著过慢" },
  { name: "仅绝热 + 速度阻尼最佳", shortName: "绝热对照", candidate: adiabaticBest, decision: "可作为无热交换对照" },
  { name: "数学最优", shortName: "数学最优", candidate: mathematicalBest, decision: "干摩擦未被数据识别" },
  { name: "工程候选", shortName: "工程候选", candidate: engineeringCandidate, decision: "进入波形验收，暂不改默认值" },
].map(({ name, shortName, candidate, decision }) => ({
  model: name,
  modelShort: shortName,
  score: round(candidate.score),
  timingRmseMs: round(candidate.timingRmseMs),
  amplitudeRmseKpa: round(candidate.amplitudeRmseKpa),
  visibleDurationRmseMs: round(candidate.visibleDurationRmseMs),
  residualVelocityDampingNsPerM: candidate.viscousDampingNsPerM,
  residualVelocityDampingDisplay: candidate.viscousDampingNsPerM.toFixed(3),
  coulombFrictionN: candidate.coulombFrictionN,
  coulombFrictionDisplay: candidate.coulombFrictionN.toFixed(4),
  thermalRelaxation: tauLabel(candidate),
  thermalVolumeExponent: candidate.thermalVolumeExponent,
  decision,
}));

const realPeriodByHeight = new Map([
  [20, 22],
  [30, 26.5],
  [40, 29],
  [50, 30.5],
]);
const analyticPeriodByHeight = new Map([
  [20, 21.57],
  [30, 25.08],
  [40, 28.16],
  [50, 30.94],
]);
const stiffnessByHeight = new Map([
  [20, 4116.67],
  [30, 3043.48],
  [40, 2414.13],
  [50, 2000.46],
]);

const periodRows = [...realPeriodByHeight.keys()].map((heightMm) => ({
  heightMm,
  realPeriodMs: realPeriodByHeight.get(heightMm),
  analyticAdiabaticPeriodMs: analyticPeriodByHeight.get(heightMm),
  deltaMs: round(analyticPeriodByHeight.get(heightMm) - realPeriodByHeight.get(heightMm), 2),
  gasSpringStiffnessNPerM: stiffnessByHeight.get(heightMm),
  massG: 48.5,
  diameterMm: 32.5,
  equivalentDeadHeightMm: 8.359,
}));

const realDurationByRun = new Map([
  [1, [0.24, 0.35]],
  [2, [0.241, 0.271]],
  [3, [0.159, 0.209]],
  [4, [0.153, 0.183]],
]);
const engineeringRunRows = engineeringCandidate.runResults.map((runResult) => {
  const [realMinimumS, realMaximumS] = realDurationByRun.get(runResult.run);
  const stiffness = stiffnessByHeight.get(runResult.heightMm);
  const releaseAmplitudeM = runResult.releaseAmplitudeMm / 1000;
  const tauAtHeightMs =
    50 * ((runResult.heightMm + 8.359) / (50 + 8.359));
  return {
    run: runResult.run,
    heightMm: runResult.heightMm,
    equivalentReleaseAmplitudeMm: runResult.releaseAmplitudeMm,
    equivalentInitialEnergyMj: round(0.5 * stiffness * releaseAmplitudeM ** 2 * 1000, 2),
    timingRmseMs: round(runResult.timingRmseMs),
    amplitudeRmseKpa: round(runResult.amplitudeRmseKpa),
    modelVisibleDurationMs: round(runResult.modelVisibleDurationS * 1000, 1),
    realVisibleMinimumMs: round(realMinimumS * 1000, 1),
    realVisibleMaximumMs: round(realMaximumS * 1000, 1),
    realVisibleRangeMs: `${round(realMinimumS * 1000, 1)}–${round(realMaximumS * 1000, 1)}`,
    thermalRelaxationMs: round(tauAtHeightMs, 1),
  };
});

const secondaryExtremaRows = [
  {
    run: 1,
    heightMm: 50,
    acceptedFullPeriods: 6,
    naiveFullPeriods: 7,
    extraExtrema: 2,
    sampleSequence: "0.160 s / 99.01 → 0.162 s / 99.14 → 0.164 s / 99.09 kPa",
    interpretation: "尾部 0.05–0.13 kPa 小回摆会被朴素局部极值算法多计 1 周期",
  },
  {
    run: 2,
    heightMm: 40,
    acceptedFullPeriods: 4,
    naiveFullPeriods: 4,
    extraExtrema: 0,
    sampleSequence: "未发现会改变周期数的附加极值",
    interpretation: "当前人工端点区间内主峰谷清晰",
  },
  {
    run: 3,
    heightMm: 30,
    acceptedFullPeriods: 4,
    naiveFullPeriods: 5,
    extraExtrema: 2,
    sampleSequence: "0.111 s / 98.13 → 0.112 s / 98.34 → 0.114 s / 98.20 kPa",
    interpretation: "1–3 ms 的小平台/回摆会被朴素算法多计 1 周期",
  },
  {
    run: 4,
    heightMm: 20,
    acceptedFullPeriods: 3,
    naiveFullPeriods: 3,
    extraExtrema: 0,
    sampleSequence: "未发现会改变周期数的附加极值",
    interpretation: "主峰谷清晰，但首个正峰仍是最大幅值残差来源",
  },
];

const headlineRows = [
  {
    combinations: totalCombinationCount,
    currentScore: round(currentModel.score),
    engineeringScore: round(engineeringCandidate.score),
    scoreImprovement,
    nearOptimalCount: sweep.nearOptimalFivePercent.count,
  },
];

const sourcePath =
  "docs/instrument-modeling/reference/piston-oscillation-real-data/capstone-piston-oscillation-4runs-1000hz.csv";
const sweepScriptPath = "scripts/analysis/pistonOscillationDissipationSweep.mjs";
const sweepOutputPath =
  "docs/instrument-modeling/analysis/piston-oscillation-dissipation-sweep-2026-08-25.json";
const reviewedDatasetPath =
  "docs/instrument-modeling/analysis/piston-oscillation-checkpoint-2-parameter-identification-report-2026-08-25/reviewed-report-datasets.json";

const datasetSource = (id, label, dataset, tablesUsed, description) => ({
  id,
  label,
  path: reviewedDatasetPath,
  query: {
    engine: "duckdb",
    language: "sql",
    sql:
      `SELECT * EXCLUDE (dataset) FROM read_json_auto('${reviewedDatasetPath}') ` +
      `WHERE dataset = '${dataset}'`,
    description,
    tables_used: [reviewedDatasetPath, ...tablesUsed],
    filters: [`dataset = ${dataset}`],
  },
});

const artifactSources = [
  {
    id: "real_csv",
    label: "真实四组 1000 Hz 观测数据",
    path: sourcePath,
    query: {
      engine: "file",
      language: "csv",
      description: "读取四组各 501 点的时间—绝对压强观测样本，并按已确认的同相位端点提取主峰谷。",
      tables_used: [sourcePath],
      filters: ["Run 1–4", "用户确认的同相位端点区间", "不使用亚采样插值"],
      metric_definitions: {
        accepted_period: "(t2 - t1) / N，t1、t2 均为 1000 Hz 离散观测时刻",
        secondary_extremum: "会在相邻主极值之间额外造成一次离散导数变号的观测样本",
      },
    },
  },
  {
    id: "matrix_sweep",
    label: "耗散参数矩阵分析",
    path: sweepOutputPath,
    query: {
      engine: "node",
      language: "javascript",
      description: "运行 RK4 活塞—气体—热交换模型，扫描共享耗散参数并为每条真实记录扫描等效释放幅度。",
      tables_used: [sourcePath, sweepScriptPath],
      filters: [
        "质量 48.5 g",
        "活塞直径 32.5 mm",
        "等效非标尺高度 8.359 mm",
        "1000 Hz 观测",
        "压力 0.01 kPa 向零截断",
      ],
      metric_definitions: {
        score: "四组平均：时刻 RMSE/1.5 ms + 幅值 RMSE/0.75 kPa + 可见时长区间外误差/30 ms",
        timing_rmse: "各组已确认相位锁定极值相对首个锚点时刻的均方根误差",
        amplitude_rmse: "各组相位锁定极值相对尾部平衡压强偏差的均方根误差",
        visible_duration: "模型中最后一个绝对幅值至少 0.5 kPa 的极值时刻",
      },
    },
  },
  datasetSource(
    "headline_source",
    "报告头部指标",
    "headline",
    [sweepOutputPath],
    "读取本轮矩阵规模、工程候选得分、相对改善和近最优候选数。",
  ),
  datasetSource(
    "family_source",
    "模型家族比较",
    "family_comparison",
    [sweepOutputPath],
    "读取当前模型、绝热对照、数学最优和工程候选的参数与误差。",
  ),
  datasetSource(
    "period_source",
    "高度—周期比较",
    "period_comparison",
    [sourcePath, sweepScriptPath],
    "读取真实人工端点周期和固定保守参数下的绝热气弹簧周期。",
  ),
  datasetSource(
    "run_fit_source",
    "工程候选逐组结果",
    "engineering_runs",
    [sourcePath, sweepOutputPath],
    "读取工程候选对四组真实观测的逐组拟合误差和持续时间。",
  ),
  datasetSource(
    "secondary_source",
    "附加极值审计",
    "secondary_extrema",
    [sourcePath],
    "读取用户确认端点区间内会改变朴素周期计数的附加离散极值。",
  ),
];

const artifact = {
  surface: "report",
  manifest: {
    version: 1,
    surface: "report",
    title: "活塞振动法断点二：耗散参数矩阵与次峰来源诊断",
    description: "基于四组 1000 Hz 真实观测数据，对残余速度阻尼、微小干摩擦、热交换和释放幅度进行可复算比较。",
    generatedAt: new Date().toISOString(),
    blocks: [
      {
        id: "title",
        type: "markdown",
        layout: "full",
        body: "# 活塞振动法断点二：耗散参数矩阵与次峰来源诊断",
      },
      {
        id: "technical_summary",
        type: "markdown",
        layout: "full",
        body:
          "## 技术结论：热交换应独立建模，干摩擦只能限定为小量\n\n在固定铭牌质量 **48.5 g**、活塞直径 **32.5 mm**、等效非标尺高度 **8.359 mm** 后，本轮共比较 **1,615** 组共享参数，并为每条真实记录单独拟合一个“等效释放幅度”。数学最优为残余速度阻尼 **1.1 N·s/m**、干摩擦 **0 N**、50 mm 参考热松弛时间 **50 ms**、热松弛时间随有效气体高度一次缩放。考虑真实活塞虽为超低摩擦但不可能绝对无摩擦，建议把 **1.0 N·s/m + 0.005 N + 50 ms + 体积指数 1** 作为下一轮工程候选；它只比数学最优差约 3.4%，但目前仍不能写成正式参数。\n\n这一结论是当前模型的数值识别结果，不是对真实装置全部耗散机制的唯一反演。",
      },
      {
        id: "headline_metrics",
        type: "metric-strip",
        layout: "full",
        cardIds: ["matrix_count", "engineering_score", "score_improvement", "near_optimal_count"],
      },
      {
        id: "thermal_result",
        type: "markdown",
        layout: "full",
        body:
          "## 有限热交换把衰减解释得更好，但基本不破坏周期量级\n\n只用绝热气体和速度阻尼时，最优残余阻尼约为 **1.5 N·s/m**，综合得分为 **3.078**；加入体积相关的有限热交换后，最优得分降到 **2.534**，改善约 **17.7%**，可见持续时间 RMSE 从 **24.6 ms** 降到 **10.3 ms**。50 mm 处 50 ms 的热松弛时间，在 20–50 mm 四组中随体积变为约 24–50 ms；线性化后的有效比热容指数实部仍约为 1.392–1.396，因此它主要补充衰减而不是把周期改成近等温值。",
      },
      { id: "family_score_chart_block", type: "chart", layout: "full", chartId: "family_score_chart" },
      { id: "family_table_block", type: "table", layout: "full", tableId: "family_table" },
      {
        id: "conservative_base",
        type: "markdown",
        layout: "full",
        body:
          "## 气弹簧底子已经达到正确量级，耗散不应继续替代质量和体积\n\n在 20、30、40、50 mm，固定几何参数给出的绝热小振幅周期分别约为 **21.57、25.08、28.16、30.94 ms**，与真实人工端点的 **22、26.5、29、30.5 ms** 同量级且趋势一致。对应气弹簧刚度约为 **4,117→2,000 N/m**。因此下一步应保留这一保守底子，再叠加可解释的热耗散、残余速度损失和极小干摩擦。",
      },
      { id: "period_chart_block", type: "chart", layout: "full", chartId: "period_chart" },
      {
        id: "engineering_candidate",
        type: "markdown",
        layout: "full",
        body:
          "## 工程候选能复现大部分包络，20 mm 首峰仍是主要残差\n\n工程候选下，四次记录需要的等效释放幅度约为 **3.5–6.25 mm**，对应初始气弹簧能量约 **25–40 mJ**。这里的幅度只是把真实记录对齐到首个已确认极值的干扰参数：真实采集从按压释放过程的某个相位开始，不能把它解释成记录零时刻的实际活塞位移，也不能按高度硬编码。20 mm 组的幅值 RMSE 仍约 **1.52 kPa**，明显高于另外三组，说明仅靠同一套光滑耗散项还不能解释所有首峰不对称和传感链响应。",
      },
      { id: "run_fit_table_block", type: "table", layout: "full", tableId: "run_fit_table" },
      {
        id: "secondary_peaks",
        type: "markdown",
        layout: "full",
        body:
          "## 次峰与平台更像观测链和低幅离散判定问题，不应随机写进气体压力\n\n真实第 1、3 组在尾部各出现一对很小的附加极值。若直接把每次导数变号都当作波峰或波谷，第 1 组会从 6 周期误计为 7 周期，第 3 组会从 4 周期误计为 5 周期。平滑的热交换和线性阻尼只能改变相位与包络，通常不会单独产生这种 1–3 ms、0.05–0.21 kPa 的局部回摆。\n\n更合理的来源顺序是：**(1)** 1000 Hz 下传感器动态过采样减弱，叠加 0.01 kPa 量化后，在斜率接近零的峰顶更容易出现平台或导数反转；**(2)** 软管、接头和传感器腔体组成的压力传输系统会带来衰减、相位滞后和共振；**(3)** 低振幅阶段的静摩擦/粘滑可能产生拐折或突然停滞，但 PASCO 的石墨活塞是超低摩擦结构，因此不宜先把早期主波形异常都归因于干摩擦。",
      },
      { id: "secondary_extrema_table_block", type: "table", layout: "full", tableId: "secondary_extrema_table" },
      {
        id: "literature_evidence",
        type: "markdown",
        layout: "full",
        body:
          "## 文献证据支持把热耗散与传感器管路分成不同层\n\n- [PASCO TD-8572A 官方页面](https://www.pasco.com/products/lab-apparatus/thermodynamics/heat-engine/td-8572)确认 32.5 mm 石墨活塞和精密 Pyrex 气缸为超低摩擦结构。\n- [PASCO PS-2181 官方说明](https://www.pasco.com/products/sensors/pasport/ps-2181)给出最高 1000 Hz；[传感器手册](https://cdn.pasco.com/product_document/PASPORT-Dual-Pressure-Sensor-Manual-PS-2181.pdf)明确动态过采样随采样率变化，低采样率时降噪和分辨率提升更强。其 0.01 kPa 规格注明在 10 Hz，不能直接外推成 1000 Hz 下完全无噪声。\n- Bringuier 的[无摩擦活塞热阻尼研究](https://doi.org/10.1088/0143-0807/36/5/055024)指出，有限热传递本身可解释阻尼而无需假设机械摩擦。\n- [黏性与库仑阻尼辨识研究](https://www.sciencedirect.com/science/article/pii/S0022460X04003578)指出黏性阻尼更接近指数衰减，库仑摩擦更接近逐周期固定减量并在低幅阶段更重要。\n- [气体软管—传感器响应研究](https://www.sciencedirect.com/science/article/pii/S0301679X19305249)实测到软管引起压力衰减及自身固有频率附近的放大；[Bergh–Tijdeman 管路模型资料](https://repository.tudelft.nl/record/uuid%3Ae88af84e-120f-4c27-8123-3225c2acd4ad)说明细管和终端容腔可形成具有幅频和相频响应的测压系统。",
      },
      {
        id: "scope_metrics",
        type: "markdown",
        layout: "full",
        body:
          "## 数据、指标与矩阵边界\n\n真实数据为 20、30、40、50 mm 四组，每组 0.5 s、501 个 1000 Hz 观测样本；端点和主峰谷采用用户已确认的同相位序列。每个候选以三项归一化误差评分：主峰谷相对时刻 RMSE / 1.5 ms、相对平衡压强的幅值 RMSE / 0.75 kPa、明显振动持续时间偏离人工区间的误差 / 30 ms。分数越低越好，但它是工程诊断分数，不是概率、置信区间或卡方统计量。\n\n矩阵同时扫描残余速度阻尼、平滑库仑摩擦、热松弛时间、热松弛体积指数和每组等效释放幅度。压力先经 1000 Hz 采样并向零截断到 0.01 kPa，再提取离散极值；没有读取连续极值，也没有亚采样插值。",
      },
      {
        id: "model_specification",
        type: "markdown",
        layout: "full",
        body:
          "## 建议的下一版模型结构\n\n### 物理真值层\n\n使用 `V=A(h+x)+V_dead`，气体状态由 `P=nRT/V` 给出；能量方程加入压缩功和有限热交换，热松弛时间按有效气体体积缩放。活塞受力分开保存为气弹簧力、残余速度阻尼和极小库仑摩擦，不再把三者合成一个含义模糊的阻尼常数。\n\n### 模拟传感器层\n\n将气缸真实压强先通过“软管 + 接头 + 传感器腔体”的连续传递模型，再施加传感器噪声/动态过采样行为，最后做 1000 Hz 采样和 0.01 kPa 向零截断。次峰或平台若来自观测链，只能出现在这一层，不能反写进底层气体真值。\n\n### 数据处理层\n\n主峰谷识别需要在未来真实化传感链之前加入相位连续性、最小间距或显著性策略，并保留“主候选”和“次候选”的区别。阈值应可配置、可版本化；引导模式仍保证可得到至少 3 个完整周期，不启用亚采样极值。",
      },
      {
        id: "limitations",
        type: "markdown",
        layout: "full",
        body:
          "## 不能由现有四组数据确定的内容\n\n- `0–0.01 N` 干摩擦都落在近最优区，无法声称 0.005 N 是测量值。\n- 50 ms 热松弛时间和体积指数 1 是当前离散网格最优，不是统计置信区间；需要更多高度和不同释放幅度复核。\n- 真实按压位移、释放速度和触发相位未知，因此等效释放幅度不能直接变成产品操作参数。\n- 实际使用的软管长度、接头容积和传感器腔体容积尚未测量，无法从四条压力曲线唯一反推出管路共振参数。\n- 第 4 组首正峰的不对称残差可能同时包含释放过程、传感链和非线性因素；单组异常不能独立确定新力项。",
      },
      {
        id: "next_steps",
        type: "markdown",
        layout: "full",
        body:
          "## 下一步：先做候选波形验收，再决定是否写入物理模型 v3\n\n1. 用工程候选 `c=1.0 N·s/m、F=0.005 N、τ₅₀=50 ms、α=1` 生成 20–80 mm 的确定性波形，但先作为分析预设，不替换正式默认值。\n2. 与数学最优 `c=1.1 N·s/m、F=0` 和绝热对照 `c=1.5 N·s/m` 同屏比较周期、首峰、包络和三周期可用性。\n3. 用户确认基本波形后再建立物理模型 v3，并把热参数、残余速度阻尼和干摩擦分别版本化。\n4. 单独测量实际软管长度；若能做快速压力阶跃，再用阶跃响应识别管路传递函数。\n5. 只有传感器层模型可验证后，才加入可控的次峰/噪声，并同步升级主峰谷识别策略。",
      },
      {
        id: "further_questions",
        type: "markdown",
        layout: "full",
        body:
          "## 仍需确认或补测\n\n- 本机实验实际使用的软管长度是多少，是否每次保持一致？\n- 能否补做同一高度、不同按压幅度的重复记录，以区分速度阻尼、热耗散与干摩擦？\n- 是否可以用一个快速阀门动作或已知压力阶跃单独测量软管—传感器响应？\n- 下一轮视觉验收是否接受同时展示“数学最优、工程候选、绝热对照”三条后台曲线，而不先改产品默认值？",
      },
    ],
    cards: [
      {
        id: "matrix_count",
        dataset: "headline",
        sourceId: "headline_source",
        description: "共享物理参数组合数；每组还会扫描各真实 Run 的等效释放幅度。",
        metrics: [{ label: "已比较参数组", field: "combinations", format: "number" }],
      },
      {
        id: "engineering_score",
        dataset: "headline",
        sourceId: "headline_source",
        description: "时刻、幅值和持续时间三项归一化误差的综合工程分数，越低越好。",
        metrics: [
          { label: "工程候选得分", field: "engineeringScore", format: "number" },
          { label: "当前模型", field: "currentScore", format: "number" },
        ],
      },
      {
        id: "score_improvement",
        dataset: "headline",
        sourceId: "headline_source",
        description: "工程候选相对当前 0.434 N·s/m 绝热模型的诊断分数改善。",
        metrics: [{ label: "相对当前模型改善", field: "scoreImprovement", format: "percent" }],
      },
      {
        id: "near_optimal_count",
        dataset: "headline",
        sourceId: "headline_source",
        description: "综合分数不超过数学最优 105% 的离散候选数。",
        metrics: [{ label: "近最优候选", field: "nearOptimalCount", format: "number" }],
      },
    ],
    charts: [
      {
        id: "family_score_chart",
        title: "四类模型的综合诊断分数",
        subtitle: "有限热交换显著降低持续时间误差；工程候选只比数学最优略差。",
        type: "bar",
        intent: "comparison",
        question: "当前模型、绝热对照、数学最优和工程候选的综合表现相差多少？",
        rationale: "模型家族是离散类别，综合分数使用共同尺度，竖向柱状图便于直接比较。",
        dataset: "family_comparison",
        sourceId: "family_source",
        encodings: {
          x: { field: "modelShort", type: "nominal" },
          y: { field: "score", type: "quantitative" },
        },
      },
      {
        id: "period_chart",
        title: "高度与周期：真实观测和绝热气弹簧基线",
        subtitle: "固定质量、直径和附加容积后，基础周期的量级与趋势已经一致。",
        type: "line",
        intent: "custom",
        question: "保守气弹簧模型是否已经解释真实周期随高度变化的主要趋势？",
        rationale: "高度是有序连续变量，连接四个观测点可直观看出两组周期趋势与偏差。",
        dataset: "period_comparison",
        sourceId: "period_source",
        encodings: {
          x: { field: "heightMm", type: "quantitative" },
          y: {
            fields: ["realPeriodMs", "analyticAdiabaticPeriodMs"],
            type: "quantitative",
          },
        },
      },
    ],
    tables: [
      {
        id: "family_table",
        title: "模型家族参数与误差",
        description: "分数不是概率；它只用于本轮候选排序。",
        dataset: "family_comparison",
        sourceId: "family_source",
        defaultSort: { field: "score", direction: "asc" },
        columns: [
          { field: "model", label: "模型" },
          { field: "residualVelocityDampingDisplay", label: "残余速度阻尼 / N·s·m⁻¹" },
          { field: "coulombFrictionDisplay", label: "干摩擦 / N" },
          { field: "thermalRelaxation", label: "热松弛" },
          { field: "score", label: "综合分数", format: "number" },
          { field: "decision", label: "结论" },
        ],
      },
      {
        id: "run_fit_table",
        title: "工程候选逐组结果",
        description: "等效释放幅度是拟合干扰参数，不是记录零时刻的真实位移。",
        dataset: "engineering_runs",
        sourceId: "run_fit_source",
        defaultSort: { field: "run", direction: "asc" },
        columns: [
          { field: "run", label: "Run" },
          { field: "heightMm", label: "h / mm", format: "number" },
          { field: "equivalentReleaseAmplitudeMm", label: "等效释放幅度 / mm", format: "number" },
          { field: "equivalentInitialEnergyMj", label: "等效初始能量 / mJ", format: "number" },
          { field: "amplitudeRmseKpa", label: "幅值 RMSE / kPa", format: "number" },
          { field: "modelVisibleDurationMs", label: "模型可见时长 / ms", format: "number" },
          { field: "realVisibleRangeMs", label: "真实可见区间 / ms" },
        ],
      },
      {
        id: "secondary_extrema_table",
        title: "真实记录中的附加极值及误计风险",
        description: "仅列出用户已确认端点区间内会影响周期计数的离散局部极值。",
        dataset: "secondary_extrema",
        sourceId: "secondary_source",
        defaultSort: { field: "run", direction: "asc" },
        columns: [
          { field: "run", label: "Run" },
          { field: "heightMm", label: "h / mm", format: "number" },
          { field: "acceptedFullPeriods", label: "确认周期数", format: "number" },
          { field: "naiveFullPeriods", label: "朴素算法周期数", format: "number" },
          { field: "interpretation", label: "影响" },
        ],
      },
    ],
    sources: artifactSources,
  },
  snapshot: {
    version: 1,
    generatedAt: new Date().toISOString(),
    status: "ready",
    datasets: {
      headline: headlineRows,
      family_comparison: familyRows,
      period_comparison: periodRows,
      engineering_runs: engineeringRunRows,
      secondary_extrema: secondaryExtremaRows,
    },
    accessIssues: [],
  },
  sources: artifactSources,
  package_info: {
    root: "repository",
    manifestPath:
      "docs/instrument-modeling/analysis/piston-oscillation-checkpoint-2-parameter-identification-report-2026-08-25/artifact.json",
    snapshotPath: sweepOutputPath,
  },
};

mkdirSync(dirname(outputPath), { recursive: true });
const reviewedRows = [
  ...headlineRows.map((row) => ({ dataset: "headline", ...row })),
  ...familyRows.map((row) => ({ dataset: "family_comparison", ...row })),
  ...periodRows.map((row) => ({ dataset: "period_comparison", ...row })),
  ...engineeringRunRows.map((row) => ({ dataset: "engineering_runs", ...row })),
  ...secondaryExtremaRows.map((row) => ({ dataset: "secondary_extrema", ...row })),
];
writeFileSync(resolve(repoRoot, reviewedDatasetPath), `${JSON.stringify(reviewedRows, null, 2)}\n`, "utf8");
writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(outputPath);
