import { useEffect, useMemo, useRef } from 'react';
import {
  activePistonUncertaintyPhase, calculatePistonUncertainty, PISTON_UNCERTAINTY_FIELDS,
  PISTON_UNCERTAINTY_PHASES, pistonUncertaintyComplete, pistonUncertaintyReference, pistonUncertaintyDigits,
  type PistonUncertaintyAction, type PistonUncertaintyCourse, type PistonUncertaintyAnalysis,
} from '../../domain/pistonOscillation/pistonOscillationUncertaintyModel.ts';
import { buildPistonUncertaintyPresentation } from '../../domain/pistonOscillation/pistonOscillationUncertaintyPresentation.ts';
import type { PistonOscillationDataProcessingSession } from '../../domain/pistonOscillation/pistonOscillationDataProcessingModel.ts';
import type { CalculationKnownDatum } from '../../components/calculation/CalculationKnownGrid.tsx';
import { PistonMathNumber, PistonMathUnit, PistonRichText, PistonUncertaintyFormula, PistonUncertaintyGammaBasis } from './PistonUncertaintyMath.tsx';
import './PistonOscillationUncertainty.css';

export const buildPistonUncertaintyKnownData = (
  course: PistonUncertaintyCourse,
  analysis: PistonUncertaintyAnalysis | null,
  language: string,
): CalculationKnownDatum[] => buildPistonUncertaintyPresentation(course, analysis, language).parameterRows.flatMap((row, index) => [0, 2].map(column => ({
  key: `uncertainty-known-${index}-${column}`,
  label: <PistonRichText text={row[column]!} language={language} />,
  value: row[column + 1]!,
  formattedValue: <PistonMathNumber value={row[column + 1]!} />,
})));

export const PistonOscillationUncertainty = ({ processing, language, onAction }: {
  processing: PistonOscillationDataProcessingSession;
  language: string;
  onAction: (action: PistonUncertaintyAction) => void;
}) => {
  const course = processing.calculationSession?.uncertainty;
  const fit = processing.linearFitResult;
  const knowns = processing.calculationSession?.knowns;
  const analysis = useMemo(() => course && fit && knowns ? calculatePistonUncertainty(knowns, fit, processing.runs, course.profile) : null, [course?.profile, fit, knowns, processing.runs]);
  const currentPhase = course ? activePistonUncertaintyPhase(course) : null;
  const currentField = course && currentPhase ? PISTON_UNCERTAINTY_FIELDS[currentPhase].find(id => course.answers[id].status === 'unresolved') : null;
  const root = useRef<HTMLDivElement>(null);
  const read = course && currentPhase ? course.readPhases.includes(currentPhase) : false;
  useEffect(() => {
    const target = root.current?.querySelector<HTMLElement>(currentPhase
      ? '[data-uncertainty-current="true"]' : '.piston-uncertainty-result');
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (read) target?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus({ preventScroll: true });
  }, [currentPhase, currentField, read]);
  if (!course || !analysis) return null;
  const en = language === 'en';
  const t = (zh: string, english: string) => en ? english : zh;
  const { fields, lessons } = buildPistonUncertaintyPresentation(course, analysis, language);
  const completed = pistonUncertaintyComplete(course);
  const feedbackText = {
    empty: t('请先填写计算结果。', 'Enter a result first.'),
    invalid: t('请输入有限数值，可使用 e 表示科学计数法。', 'Enter a finite number; e notation is accepted.'),
    'numeric-wrong': t('计算结果不正确，请检查公式、单位和所用数据。', 'Check the formula, units and supplied working values.'),
    'precision-wrong': t('数值正确，但末位或有效数字不符合本题要求。', 'The value is correct; check significant figures or the last written digit.'),
  };
  if (analysis.issue) return <section className="piston-uncertainty" role="status">
    <strong>{t('不确定度计算需要复核数据', 'Review data before evaluating uncertainty')}</strong>
    <p>{analysis.issue === 'precision-boundary' ? t('当前数据无法确定稳定的修约结果，请重新选取周期或调整高度范围。', 'A stable rounded result cannot be established for these data. Reselect the time interval or height range.') : analysis.issue === 'time-resolution'
      ? t('端点时间分辨率相对于 T² 数据跨度过大，本课程的一阶拟合近似不适用。请增加选取的周期数、扩展高度范围或提高采样率后重新处理。原计算与当前进度仍保留，可先保存退出。', 'Endpoint resolution is too large relative to the T² span for this first-order fit. Select more cycles, widen the height range or increase the sample rate, then reprocess. Existing results and progress are retained.')
      : t('至少需要三个有效点、正斜率及有效的周期和采样率；请返回数据处理复核。', 'At least three valid points, a positive slope, and valid periods and sample rates are required.')}</p>
  </section>;
  return <div className="piston-uncertainty" ref={root} data-piston-uncertainty>
    <header><strong>{t('不确定度 · 从来源到结果', 'Uncertainty · from sources to result')}</strong>
      <span>{Object.values(course.answers).filter(a => a.status !== 'unresolved').length} / {Object.keys(course.answers).length}</span></header>
    <p className="piston-uncertainty-note"><PistonRichText language={language} text={t('使用前一步通过核验的结果继续计算，位数要求见各题。中间量保留必要的保护位；最终 Uγ 保留 2 位有效数字，γ 的末位与 Uγ 对齐。零值填 0。', 'Use each checked result in subsequent steps, with the precision stated for each question. Keep guard digits in intermediate values; report Uγ to 2 significant figures and align the last digit of γ. Enter 0 for a zero value.')} /></p>
    {course.resetNotice && <p role="status">{t('观测数据或仪器资料已变化，不确定度作答已重置，请按当前数据重新计算。', 'Observations or instrument data changed. Uncertainty answers were reset; recalculate using current data.')}</p>}
    <details><summary><PistonRichText language={language} text={t('拟合数据与计算参数', 'Fit data and calculation parameters')} /></summary>
      <p><PistonRichText language={language} text={t('以下数据与前面的周期、拟合和 γ 计算一致。相对误差使用修约为最终报告值之前的 γ。', 'These are the same periods, fit and γ used above. Relative error uses γ before its final report rounding.')} /></p>
      <div className="piston-uncertainty-formula piston-uncertainty-basis"><PistonUncertaintyGammaBasis gamma={analysis.gamma} slope={analysis.slope} /></div>
      <p className="piston-uncertainty-inputs"><PistonRichText language={language} text={`n = ${analysis.n}; b = ${analysis.intercept ?? fit.interceptM} m; Q = ${analysis.q} m²; Sxx = ${analysis.sxx} s⁴${analysis.meanX !== undefined ? `; x̄ = ${analysis.meanX} s²; h̄ = ${analysis.meanY} m` : ''}`} /></p>
      <div className="piston-uncertainty-table-scroll"><table><thead><tr>{['#', 'T² (s²)', 'h (m)', 'eᵢ (m)'].map(s => <th key={s}><PistonRichText text={s} language={language} /></th>)}</tr></thead>
        <tbody>{analysis.rows.map(row => <tr key={row.runIndex}><td>{row.runIndex + 1}</td><td><PistonMathNumber value={row.x} /></td><td><PistonMathNumber value={row.y} /></td><td><PistonMathNumber value={row.residual} /></td></tr>)}</tbody></table></div>
    </details>
    {PISTON_UNCERTAINTY_PHASES.map((phase, index) => {
      const phaseRead = course.readPhases.includes(phase);
      if (!phaseRead && phase !== currentPhase) return null;
      const lesson = lessons[phase];
      const ids = PISTON_UNCERTAINTY_FIELDS[phase];
      const unresolvedIndex = ids.findIndex(id => course.answers[id].status === 'unresolved');
      const visible = unresolvedIndex < 0 ? ids : ids.slice(0, unresolvedIndex + 1);
      return <details className="piston-uncertainty-phase" key={phase} open={phase === currentPhase || (completed && phase === 'C')}
        data-uncertainty-current={phase === currentPhase && !phaseRead ? 'true' : undefined}>
        <summary>{index + 1}. {lesson.title}{unresolvedIndex < 0 ? ' ✓' : ''}</summary>
        <div className="piston-uncertainty-lesson">
          {lesson.lines.map(line => <p key={line}><PistonRichText text={line} language={language} /></p>)}
          {lesson.why.map(why => <details key={why.title}><summary><PistonRichText text={why.title} language={language} /></summary><p><PistonRichText text={why.body} language={language} /></p></details>)}
          {!phaseRead && <button type="button" onClick={() => onAction({ kind: 'read', phase })}>{t('已了解，开始计算', 'Understood · start calculating')}</button>}
        </div>
        {phaseRead && visible.map(id => {
          const answer = course.answers[id];
          const field = fields[id];
          const active = id === currentField;
          const inputId = `piston-uncertainty-${id}`;
          const digits = pistonUncertaintyDigits(id, analysis);
          const precision = id === 'result' ? t('末位与 Uγ 对齐', 'Align the last digit with Uγ') : t(`${digits} 位有效数字（零填 0）`, `${digits} significant figures (0 for zero)`);
          return <section key={id} className={`piston-uncertainty-exercise ${active ? 'piston-uncertainty-active' : ''}`} data-uncertainty-current={active ? 'true' : undefined}>
            <label htmlFor={inputId}><strong><PistonRichText text={field.label} language={language} /></strong></label>
            <div className="piston-uncertainty-formula"><PistonUncertaintyFormula field={id} language={language} coverage={course.profile.coverage} label={field.formula} /></div>
            <p className="piston-uncertainty-inputs"><PistonRichText text={field.inputs} language={language} /></p>
            <div className="piston-uncertainty-answer-row">
              <input id={inputId} type="text" inputMode="decimal" autoComplete="off" spellCheck={false}
                value={answer.draft} disabled={!active} aria-invalid={!!answer.feedback}
                aria-describedby={`${inputId}-help ${inputId}-feedback`}
                onChange={e => onAction({ kind: 'edit', field: id, value: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter' && active) { e.preventDefault(); onAction({ kind: 'check', field: id }); } }} />
              <span><PistonMathUnit value={field.unit} /></span>
              {active && <button type="button" onClick={() => onAction({ kind: 'check', field: id })}>{t('核验', 'Check')}</button>}
              {active && answer.attempts.length > 0 && <button type="button" className="piston-uncertainty-secondary" onClick={() => onAction({ kind: 'reveal', field: id })}>{t('查看答案', 'Show answer')}</button>}
              {!active && <span>{answer.status === 'revealed' ? t('已查看答案', 'Answer shown') : t('核验通过', 'Correct')}</span>}
            </div>
            <small id={`${inputId}-help`}><PistonRichText text={precision} language={language} /></small>
            <p id={`${inputId}-feedback`} className="piston-uncertainty-feedback" role="status">{answer.feedback ? feedbackText[answer.feedback] : ''}</p>
          </section>;
        })}
      </details>;
    })}
    {completed && <div className="piston-uncertainty-result" role="status">
      <strong><PistonRichText text={`γ = ${pistonUncertaintyReference('result', analysis)} ± ${pistonUncertaintyReference('expanded', analysis)} (k = ${course.profile.coverage})`} language={language} /></strong>
      <p><PistonRichText text={`uc(γ) = ${pistonUncertaintyReference('combined', analysis)}; ur = ${pistonUncertaintyReference('relative', analysis)}%`} language={language} /></p>
      <p>{t('本结果基于本实验给定的仪器参数和测量条件。', 'This result uses the instrument parameters and measurement conditions specified for this experiment.')}</p>
    </div>}
  </div>;
};
