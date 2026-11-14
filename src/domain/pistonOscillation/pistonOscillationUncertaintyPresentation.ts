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
        t('先将各组周期平方 Tᵢ² 求和，再除以拟合点数 n，得到周期平方的平均值 T²̄。用各组周期平方减去这个平均值，将差值逐一平方后相加，得到周期平方的离差平方和 Sxx。', 'Add the squared periods Tᵢ² and divide by the number of fitted points n to get the mean squared period T²̄. Subtract this mean from each squared period, square the differences, and add them to get the sum of squared deviations Sxx.'),
        t('根据测量点与拟合直线的高度差，计算斜率 a 的 A 类不确定度，再用它计算比热容比 γ 的 A 类不确定度。残差平方和 Q 由软件给出。', 'Use the height differences between the measured points and the fitted line to calculate the Type A uncertainty of slope a. Use that result to calculate the Type A uncertainty of the heat-capacity ratio γ. The software provides the residual sum of squares Q.'),
      ],
      why: [{ title: t('为什么是 n−2？', 'Why n−2?'), body: t('拟合直线需要确定斜率和截距两个参数，因此剩余自由度为 n−2。', 'The fit estimates two parameters, the slope and intercept, leaving n−2 degrees of freedom.') }],
    },
    B: {
      title: t('B 类：由仪器和读数误差评定', 'Type B: evaluate from instrument and reading errors'),
      lines: [
        t('将质量误差限 Δm 和气缸内径误差限 Δd 分别除以 √3，得到质量和气缸内径的标准不确定度。压强的标准不确定度 u仪器(P) 直接使用仪器给定值。斜率的 B 类不确定度 uB(a) 由软件给出。', 'Divide the mass error limit Δm and the cylinder inner diameter error limit Δd by √3 to get their standard uncertainties. Use the instrument’s specified standard pressure uncertainty uinstrument(P). The software provides the Type B uncertainty of the slope uB(a).'),
        t('用斜率、质量、气缸内径和压强这四项的相对不确定度，计算比热容比的 B 类不确定度 uB(γ)。直径这一项乘以 2，因为比热容比与气缸内径的平方成反比。', 'Use the relative uncertainties in slope, mass, cylinder inner diameter, and pressure to calculate the Type B uncertainty of the heat-capacity ratio uB(γ). Multiply the diameter term by 2 because the heat-capacity ratio is inversely proportional to the square of the cylinder’s inner diameter.'),
      ],
      why: [],
    },
    C: {
      title: t('合成与结果表达', 'Combine and report the result'),
      lines: [
        t('将比热容比的 A 类和 B 类标准不确定度合成，得到合成标准不确定度 uc(γ)。再计算它占比热容比绝对值的百分比，得到相对标准不确定度 ur。', 'Combine the Type A and Type B standard uncertainties of the heat-capacity ratio to get the combined standard uncertainty uc(γ). Express it as a percentage of the magnitude of the heat-capacity ratio to get the relative standard uncertainty ur.'),
        t('报告中的合成标准不确定度保留 2 位有效数字，比热容比的末位与它对齐。', 'Report the combined standard uncertainty to 2 significant figures and round the heat-capacity ratio to the same decimal place.'),
      ],
      why: [],
    },
  };
  const fields: Record<PistonUncertaintyExerciseField, { label: string; unit: string; formula: string; inputs: string }> = {
    meanX: { label: t('周期平方的平均值 T²̄', 'Mean squared period'), unit: 's²', formula: 'T²̄ = (∑ᵢ₌₁ⁿ Tᵢ²) / n', inputs: `T² (s²): ${analysis ? analysis.rows.map(row => number(row.x)).join(', ') : '—'}; n = ${analysis?.n ?? '—'}` },
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
