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
import { PistonCalculationAnswerField } from './PistonCalculationAnswerField.tsx';
import { getPistonOscillationCalculationCopy } from './pistonOscillationCalculationCopy.ts';

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
  const answerCopy = getPistonOscillationCalculationCopy(language === 'en' ? 'en' : language === 'zh-TW' ? 'zh-TW' : 'zh-CN');

  if (analysis.issue) return <section className="piston-uncertainty" role="status">
    <strong>{t('不确定度计算需要复核数据', 'Review data before evaluating uncertainty')}</strong>
    <p>{analysis.issue === 'precision-boundary' ? t('当前数据无法确定稳定的修约结果，请重新选取周期或调整高度范围。', 'A stable rounded result cannot be established for these data. Reselect the time interval or height range.') : analysis.issue === 'time-resolution'
      ? t('端点时间分辨率相对于 T² 数据跨度过大，本课程的一阶拟合近似不适用。请增加选取的周期数、扩展高度范围或提高采样率后重新处理。原计算与当前进度仍保留，可先保存退出。', 'Endpoint resolution is too large relative to the T² span for this first-order fit. Select more cycles, widen the height range or increase the sample rate, then reprocess. Existing results and progress are retained.')
      : t('至少需要三个有效点、正斜率及有效的周期和采样率；请返回数据处理复核。', 'At least three valid points, a positive slope, and valid periods and sample rates are required.')}</p>
  </section>;
  return <div className="piston-uncertainty" ref={root} data-piston-uncertainty>
    <header><strong>{t('不确定度', 'Uncertainty')}</strong>
      <span>{Object.values(course.answers).filter(a => a.status !== 'unresolved').length} / {Object.keys(course.answers).length}</span></header>
    {course.resetNotice && <p role="status">{t('不确定度题目或数据已更新，请重新完成本段计算。', 'Uncertainty exercises or data have changed. Please complete this section again.')}</p>}
    <details><summary><PistonRichText language={language} text={t('拟合数据与计算参数', 'Fit data and calculation parameters')} /></summary>
      <p><PistonRichText language={language} text={t('以下数据与前面的周期、拟合和 γ 计算一致。相对误差使用修约为最终报告值之前的 γ。', 'These are the same periods, fit and γ used above. Relative error uses γ before its final report rounding.')} /></p>
      <div className="piston-uncertainty-formula piston-uncertainty-basis"><PistonUncertaintyGammaBasis gamma={analysis.gamma} slope={analysis.slope} /></div>
      <p className="piston-uncertainty-inputs"><PistonRichText language={language} text={`n = ${analysis.n}; b = ${analysis.intercept} m; Q = ${analysis.q} m²; h̄ = ${analysis.meanY} m`} /></p>
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
          const precision = id === 'result' ? t('末位与 uc(γ) 对齐', 'Align the last digit with uc(γ)') : answerCopy.precisionSignificant(digits);
          return <div key={id} data-uncertainty-current={active ? 'true' : undefined}>
            <PistonCalculationAnswerField fieldId={id} inputId={inputId}
              title={<PistonRichText text={field.label} language={language} />}
              formula={<PistonUncertaintyFormula field={id} language={language} label={field.formula} />}
              unit={<PistonMathUnit value={field.unit} />}
              details={<p className="piston-uncertainty-inputs"><PistonRichText text={field.inputs} language={language} /></p>}
              precision={<PistonRichText text={precision} language={language} />}
              value={answer.draft} status={answer.status}
              feedback={answer.feedback ? answerCopy.feedback[answer.feedback] : null}
              reference={pistonUncertaintyReference(id, analysis)} active={active}
              actionLabel={answerCopy.check} copy={answerCopy}
              onDraftChange={value => onAction({ kind: 'edit', field: id, value })}
              onContinue={() => onAction({ kind: 'continue', field: id })}
              onReveal={() => onAction({ kind: 'reveal', field: id })}
              onCheck={() => onAction({ kind: 'check', field: id })} />
          </div>;
        })}
      </details>;
    })}
    {completed && <div className="piston-uncertainty-result" role="status">
      <strong><PistonRichText text={`γ = ${pistonUncertaintyReference('result', analysis)} ± ${pistonUncertaintyReference('reportCombined', analysis)}`} language={language} /></strong>
      <p>{t('本结果报告 A 类与 B 类合成的标准不确定度。', 'This result reports the combined standard uncertainty from Type A and Type B evaluations.')}</p>
      <p><PistonRichText text={`uc(γ) = ${pistonUncertaintyReference('combined', analysis)}; ur = ${pistonUncertaintyReference('relative', analysis)}%`} language={language} /></p>
      <p>{t('本结果基于本实验给定的仪器参数和测量条件。', 'This result uses the instrument parameters and measurement conditions specified for this experiment.')}</p>
    </div>}
  </div>;
};
