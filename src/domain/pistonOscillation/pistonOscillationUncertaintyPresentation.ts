import { pistonSlopeBAvailable, pistonUncertaintyReference } from './pistonOscillationUncertaintyModel.ts';
import type { PistonUncertaintyAnalysis, PistonUncertaintyCourse, PistonUncertaintyField, PistonUncertaintyExerciseField, PistonUncertaintyPhase } from './pistonOscillationUncertaintyModel.ts';

export const buildPistonUncertaintyPresentation = (course: PistonUncertaintyCourse, analysis: PistonUncertaintyAnalysis | null, language: string) => {
  const en = language === 'en';
  const t = (zh: string, english: string) => en ? english : zh;
  const p = course.profile;
  const number = (n: number) => String(Number(n.toPrecision(12)));
  const v = (id: PistonUncertaintyField) => analysis ? pistonUncertaintyReference(id, analysis) : '—';
  const a = analysis ? number(analysis.slope) : 'a';
  const g = analysis ? number(analysis.gamma) : 'γ';
  const slopeB = analysis && pistonSlopeBAvailable(course) ? v('slopeB') : '—';
  const resolved = (id: 'meanX' | 'sxx') => analysis && course.answers[id] && course.answers[id].status !== 'unresolved'
    ? v(id) : '—';
  // Same four-column variable/value layout as the calculation dialog.
  const parameterRows = [
    ['Δm (kg)', number(p.massLimitKg), 'Δd (mm)', number(p.diameterLimitM * 1000)],
    [t('u仪器(P) (Pa)', 'uinstrument(P) (Pa)'), number(p.pressureStandardPa), '', ''],
    ['n', analysis ? String(analysis.n) : '—', 'Q (m²)', analysis ? number(analysis.q) : '—'],
    ['Sxx (s⁴)', resolved('sxx'), 'uB(a) (m/s²)', slopeB],
    ['a (m/s²)', analysis ? a : '—', 'b (m)', analysis?.intercept !== undefined ? number(analysis.intercept) : '—'],
    ['T²̄ (s²)', resolved('meanX'), '', ''],
  ];
  const lessons: Record<PistonUncertaintyPhase, { title: string; lines: string[]; why: Array<{ title: string; body: string }> }> = {
    A: {
      title: t('A 类：由拟合数据评定', 'Type A: evaluate from the fit'),
      lines: [
        t('本实验拟合 h = aT² + b（a 对应上图的 s）。根据各点偏离拟合直线的程度，先计算斜率的 A 类不确定度，再传播到 γ。', 'Fit h = aT² + b (a is s in the chart). Use the scatter about the fitted line to evaluate the slope uncertainty, then propagate it to γ.'),
        t('先求各次 T² 的平均值 T²̄，再将各次 T² 与平均值之差平方求和，得到 Sxx。它表示横坐标的分散程度，用于计算斜率的不确定度。', 'First calculate the mean of T², then sum the squared differences from this mean to obtain Sxx. It describes the spread of the horizontal coordinates and is used to calculate the slope uncertainty.'),
        t('T²̄ 是“周期平方的平均值”，不是“平均周期的平方”。', 'This is the mean of the squared periods, not the square of the mean period.'),
        t('n 为拟合点数，Q 为残差平方和，由系统给出。', 'n is the number of fitted points; Q is the residual sum of squares, supplied by the system.'),
      ],
      why: [{ title: t('为什么是 n−2？', 'Why n−2?'), body: t('拟合直线需要确定斜率和截距两个参数，因此剩余自由度为 n−2。', 'The fit estimates two parameters, the slope and intercept, leaving n−2 degrees of freedom.') }],
    },
    B: {
      title: t('B 类：误差限换算与传播', 'Type B: error limits and propagation'),
      lines: [
        t('质量和直径的 Δ 表示误差范围的半宽。本题按均匀分布计算：标准不确定度为 Δ/√3。', 'For mass and diameter, Δ is the half-width of the error interval. Under the specified uniform distribution, the standard uncertainty is Δ/√3.'),
        t('压强的 u仪器(P) 已是标准不确定度，直接使用。斜率的 uB(a) 由系统根据本次数据评定，见上方表格。', 'The given uinstrument(P) is already a standard uncertainty and is used directly. The system evaluates uB(a) from this data set and displays it in the table above.'),
        t('传播公式的四项依次对应斜率、质量、直径和压强。直径项的系数 2 来自 γ 与 d 的平方成反比；其余各项的幂次绝对值为 1。', 'The four propagation terms represent slope, mass, diameter and pressure. The factor 2 for diameter comes from the inverse-square dependence on d; the other exponent magnitudes are 1.'),
      ],
      why: [],
    },
    C: {
      title: t('合成与结果表达', 'Combine and report the result'),
      lines: [
        t('将 γ 的 A 类和 B 类标准不确定度合成，得到 uc(γ)，再计算相对标准不确定度 ur。', 'Combine the Type A and Type B standard uncertainties of γ to obtain uc(γ), then calculate the relative standard uncertainty ur.'),
        t('报告中的 uc(γ) 保留 2 位有效数字，最终 γ 的末位与其对齐，以 γ ± uc(γ) 表达结果。', 'Round uc(γ) to 2 significant figures for the report, align the last digit of γ with it, and report γ ± uc(γ).'),
      ],
      why: [],
    },
  };
  const fields: Record<PistonUncertaintyExerciseField, { label: string; unit: string; formula: string; inputs: string }> = {
    meanX: { label: t('周期平方的平均值 T²̄', 'Mean squared period'), unit: 's²', formula: 'T²̄ = (T₁² + ⋯ + Tₙ²) / n', inputs: `T² (s²): ${analysis ? analysis.rows.map(row => number(row.x)).join(', ') : '—'}; n = ${analysis?.n ?? '—'}` },
    sxx: { label: t('T² 离差平方和 Sxx', 'Sum of squared T² deviations Sxx'), unit: 's⁴', formula: 'Sxx = Σ(Tᵢ² − T²̄)²', inputs: `T² (s²): ${analysis ? analysis.rows.map(row => number(row.x)).join(', ') : '—'}; T²̄ = ${resolved('meanX')} s²` },
    residual: { label: t('残差标准差 sr', 'Residual standard deviation sr'), unit: 'm', formula: 'sr = √[Q / (n−2)]', inputs: `Q = ${analysis ? number(analysis.q) : '—'} m²; n = ${analysis?.n ?? '—'}` },
    slopeA: { label: t('斜率的 A 类 uA(a)', 'Slope Type A uA(a)'), unit: 'm/s²', formula: 'uA(a) = sr / √Sxx', inputs: `sr = ${v('residual')} m; Sxx = ${resolved('sxx')} s⁴` },
    gammaA: { label: t('γ 的 A 类 uA(γ)', 'γ Type A uA(γ)'), unit: '', formula: 'uA(γ) = |γ/a|·uA(a)', inputs: `γ = ${g}; a = ${a} m/s²; uA(a) = ${v('slopeA')} m/s²` },
    mass: { label: t('质量 uB(m)', 'Mass uB(m)'), unit: 'kg', formula: 'uB(m) = Δm / √3', inputs: `Δm = ${number(p.massLimitKg)} kg` },
    diameter: { label: t('直径 uB(d)', 'Diameter uB(d)'), unit: 'm', formula: 'uB(d) = Δd / √3', inputs: `Δd = ${number(p.diameterLimitM)} m` },
    gammaB: { label: t('γ 的 B 类 uB(γ)', 'γ Type B uB(γ)'), unit: '', formula: 'uB(γ) = |γ|·√[(uB(a)/a)² + (uB(m)/m)² + (2uB(d)/d)² + (u仪器(P)/P)²]', inputs: `γ = ${g}; a = ${a} m/s²; uB(a) = ${slopeB} m/s²; m = ${analysis?.massKg} kg; uB(m) = ${v('mass')} kg; d = ${analysis?.diameterM} m; uB(d) = ${v('diameter')} m; P = ${analysis?.pressurePa} Pa; u仪器(P) = ${p.pressureStandardPa} Pa` },
    combined: { label: t('合成标准不确定度 uc(γ)', 'Combined standard uncertainty uc(γ)'), unit: '', formula: 'uc(γ) = √[uA²(γ) + uB²(γ)]', inputs: `uA(γ) = ${v('gammaA')}; uB(γ) = ${v('gammaB')}` },
    relative: { label: t('相对标准不确定度 ur', 'Relative standard uncertainty ur'), unit: '%', formula: 'ur = uc(γ) / |γ| × 100%', inputs: `uc(γ) = ${v('combined')}; γ = ${g}` },
    reportCombined: { label: t('报告中 uc(γ) 的修约', 'Round uc(γ) for the report'), unit: '', formula: 'uc(γ)', inputs: `uc(γ) = ${v('combined')}; ${t('保留 2 位有效数字', 'Keep 2 significant figures')}` },
    result: { label: t('规范报告的 γ', 'Reported γ'), unit: '', formula: 'γ ± uc(γ)', inputs: `γ = ${g}; uc(γ) = ${v('reportCombined')}; ${t('γ 的末位与报告中的 uc(γ) 对齐', 'Align γ with the reported uc(γ)')}` },
  };
  if (en) for (const field of Object.values(fields)) {
    field.formula = field.formula.replaceAll('u仪器', 'uinstrument');
    field.inputs = field.inputs.replaceAll('u仪器', 'uinstrument');
  }
  return { parameterRows, lessons, fields };
};
