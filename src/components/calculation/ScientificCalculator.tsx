import { Calculator, Copy, GripHorizontal, X } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { CalculatorError, evaluateCalculatorExpression, type CalculatorErrorCode } from './scientificCalculator.ts';
import './ScientificCalculator.css';

type Language = 'zh-CN' | 'zh-TW' | 'en';
const COPY = {
  'zh-CN': { title: '计算器', close: '关闭计算器', drag: '拖动计算器', expression: '算式', result: '结果', copy: '复制结果', copied: '已复制', copyFailed: '请选中结果后复制', clear: '清空', back: '退格', calculate: '计算', square: '平方', root: '平方根', power: '乘方', absolute: '绝对值', scientific: '科学计数法', previous: '上次结果', hint: '支持键盘输入，Enter 计算；结果按题目要求修约', errors: { empty: '请先输入算式', syntax: '请检查算式和括号', divisionByZero: '除数不能为零', domain: '超出实数计算范围', overflow: '数值过大，无法计算', tooLong: '算式过长，请分步计算' } },
  'zh-TW': { title: '計算器', close: '關閉計算器', drag: '拖動計算器', expression: '算式', result: '結果', copy: '複製結果', copied: '已複製', copyFailed: '請選取結果後複製', clear: '清空', back: '退格', calculate: '計算', square: '平方', root: '平方根', power: '乘方', absolute: '絕對值', scientific: '科學記號', previous: '上次結果', hint: '支援鍵盤輸入，Enter 計算；結果按題目要求修約', errors: { empty: '請先輸入算式', syntax: '請檢查算式和括號', divisionByZero: '除數不能為零', domain: '超出實數計算範圍', overflow: '數值過大，無法計算', tooLong: '算式過長，請分步計算' } },
  en: { title: 'Calculator', close: 'Close calculator', drag: 'Move calculator', expression: 'Expression', result: 'Result', copy: 'Copy result', copied: 'Copied', copyFailed: 'Select the result to copy it', clear: 'Clear', back: 'Backspace', calculate: 'Calculate', square: 'Square', root: 'Square root', power: 'Power', absolute: 'Absolute value', scientific: 'Scientific notation', previous: 'Previous result', hint: 'Type an expression; Enter to calculate. Round as the exercise requires.', errors: { empty: 'Enter an expression', syntax: 'Check the expression and parentheses', divisionByZero: 'Cannot divide by zero', domain: 'Outside the real-number domain', overflow: 'The result is too large', tooLong: 'Expression too long; calculate in steps' } },
} as const;

const FloatingCalculator = ({ open, id, language, onClose }: { open: boolean; id: string; language: Language; onClose: () => void }) => {
  const copy = COPY[language];
  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ x: number; y: number; left: number; top: number; scale: number } | null>(null);
  const positionedRef = useRef(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [draft, setDraft] = useState('');
  const [answer, setAnswer] = useState<number | null>(null);
  const [evaluatedDraft, setEvaluatedDraft] = useState<string | null>(null);
  const [error, setError] = useState<CalculatorErrorCode | null>(null);
  const [copyStatus, setCopyStatus] = useState<'copied' | 'copyFailed' | null>(null);
  const [keypadFinished, setKeypadFinished] = useState(false);
  const clamp = (left: number, top: number) => {
    const panel = panelRef.current;
    const parent = panel?.offsetParent as HTMLElement | null;
    if (!panel || !parent) return { left, top };
    const minTop = (parent.querySelector('header') as HTMLElement | null)?.offsetHeight ?? 48;
    return {
      left: Math.max(8, Math.min(left, parent.clientWidth - panel.offsetWidth - 8)),
      top: Math.max(minTop + 4, Math.min(top, parent.clientHeight - panel.offsetHeight - 8)),
    };
  };
  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current!;
    const parent = panel.offsetParent as HTMLElement;
    if (positionedRef.current) setPosition(current => clamp(current.left, current.top));
    else setPosition(clamp(parent.clientWidth - panel.offsetWidth - 12, 58));
    positionedRef.current = true;
    dragRef.current = null;
    const observer = new ResizeObserver(() => setPosition(current => clamp(current.left, current.top)));
    observer.observe(parent); observer.observe(panel);
    inputRef.current?.focus({ preventScroll: true });
    return () => observer.disconnect();
  }, [open]);

  const changeDraft = (value: string) => {
    setDraft(value); setError(null); setCopyStatus(null); setKeypadFinished(false);
  };
  const insert = (text: string, wrap = false) => {
    const input = inputRef.current!;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    let value = text;
    let caret: number;
    if (wrap && end > start) {
      value = text === '^2' ? `(${draft.slice(start, end)})^2` : `${text}${draft.slice(start, end)})`;
      changeDraft(draft.slice(0, start) + value + draft.slice(end));
      caret = start + value.length;
    } else if (keypadFinished && answer !== null) {
      if (/^[+−×÷^%]/.test(text)) value = `Ans${text}`;
      else if (text === 'e') value = 'Ans×10^';
      else if (wrap) value = `${text}Ans)`;
      changeDraft(value); caret = value.length;
    } else {
      changeDraft(draft.slice(0, start) + value + draft.slice(end));
      caret = start + value.length;
    }
    input.focus({ preventScroll: true });
    requestAnimationFrame(() => input.setSelectionRange(caret, caret));
  };
  const calculate = () => {
    try {
      setAnswer(evaluateCalculatorExpression(draft, answer ?? 0));
      setEvaluatedDraft(draft); setError(null); setCopyStatus(null); setKeypadFinished(true);
    } catch (issue) {
      setError(issue instanceof CalculatorError ? issue.code : 'syntax');
      setCopyStatus(null); setKeypadFinished(false);
    }
  };
  const backspace = () => {
    const input = inputRef.current!;
    const start = input.selectionStart, end = input.selectionEnd;
    const from = start === end ? Math.max(0, start - 1) : start;
    changeDraft(draft.slice(0, from) + draft.slice(end));
    input.focus({ preventScroll: true });
    requestAnimationFrame(() => input.setSelectionRange(from, from));
  };
  const beginDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as Element).closest('button')) return;
    const parent = panelRef.current!.offsetParent as HTMLElement;
    dragRef.current = { x: event.clientX, y: event.clientY, ...position, scale: parent.getBoundingClientRect().width / parent.offsetWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  if (!open) return null;
  const validResult = answer !== null && !error && evaluatedDraft === draft;
  const key = (label: string, text: string, title?: string, wrap = false) => <button type="button" key={label} title={title} aria-label={title ?? label} onMouseDown={event => event.preventDefault()} onClick={() => insert(text, wrap)}>{label}</button>;
  return <section ref={panelRef} id={id} className="scientific-calculator" aria-label={copy.title} style={position}>
    <div className="scientific-calculator-drag" title={copy.drag} aria-label={copy.drag} tabIndex={0} onPointerDown={beginDrag}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
        if (!direction) return;
        event.preventDefault(); event.stopPropagation();
        setPosition(current => clamp(current.left + direction[0] * 16, current.top + direction[1] * 16));
      }}
      onPointerMove={event => { const drag = dragRef.current; if (drag) setPosition(clamp(drag.left + (event.clientX - drag.x) / drag.scale, drag.top + (event.clientY - drag.y) / drag.scale)); }}
      onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} onLostPointerCapture={() => { dragRef.current = null; }}>
      <Calculator size={15} aria-hidden="true" /><strong>{copy.title}</strong><GripHorizontal size={17} aria-hidden="true" />
      <button type="button" aria-label={copy.close} onClick={onClose}><X size={15} /></button>
    </div>
    <div className="scientific-calculator-content">
      <label htmlFor={`${id}-expression`}>{copy.expression}</label>
      <textarea id={`${id}-expression`} ref={inputRef} value={draft} maxLength={1000} spellCheck={false} autoComplete="off" placeholder="sqrt(0.03^2 + 0.02^2)"
        onChange={event => changeDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); calculate(); } }} />
      <div className="scientific-calculator-result">
        <label htmlFor={`${id}-result`}>{copy.result}</label>
        <input id={`${id}-result`} ref={resultRef} readOnly value={validResult ? String(answer) : ''} placeholder="—" onFocus={event => event.currentTarget.select()} />
        <button type="button" aria-label={copy.copy} title={copy.copy} disabled={!validResult} onClick={async () => {
          try { await navigator.clipboard.writeText(String(answer)); setCopyStatus('copied'); }
          catch { setCopyStatus('copyFailed'); resultRef.current?.focus(); resultRef.current?.select(); }
        }}><Copy size={14} /></button>
      </div>
      <div className={`scientific-calculator-status${error ? ' scientific-calculator-error' : ''}`} role="status">{error ? copy.errors[error] : copyStatus ? copy[copyStatus] : '\u00a0'}</div>
      <div className="scientific-calculator-keys">
        <button type="button" title={copy.clear} onClick={() => { changeDraft(''); inputRef.current?.focus(); }}>AC</button>
        <button type="button" aria-label={copy.back} onMouseDown={event => event.preventDefault()} onClick={backspace}>⌫</button>
        {key('(', '(')}{key(')', ')')}{key('÷', '÷')}
        {key('x²', '^2', copy.square, true)}{key('√', 'sqrt(', copy.root, true)}{key('xʸ', '^', copy.power)}{key('π', 'π')}{key('×', '×')}
        {key('7', '7')}{key('8', '8')}{key('9', '9')}{key('ln', 'ln(', 'ln', true)}{key('−', '−')}
        {key('4', '4')}{key('5', '5')}{key('6', '6')}{key('|x|', 'abs(', copy.absolute, true)}{key('+', '+')}
        {key('1', '1')}{key('2', '2')}{key('3', '3')}{key('×10ⁿ', 'e', copy.scientific)}{key('%', '%')}
        {key('0', '0')}{key('.', '.')}{key('Ans', 'Ans', copy.previous)}
        <button type="button" className="scientific-calculator-equals" aria-label={copy.calculate} onClick={calculate}>=</button>
      </div>
      <p>{copy.hint}</p>
    </div>
  </section>;
};

export const useScientificCalculator = (windowOpen: boolean, language: Language) => {
  const id = `calculator-${useId()}`;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!windowOpen) setOpen(false); }, [windowOpen]);
  const close = () => { setOpen(false); triggerRef.current?.focus({ preventScroll: true }); };
  return {
    trigger: <button ref={triggerRef} type="button" className="scientific-calculator-trigger" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(current => !current)}><Calculator size={15} aria-hidden="true" />{COPY[language].title}</button>,
    panel: <FloatingCalculator open={open} id={id} language={language} onClose={close} />,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (open && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    },
  };
};
