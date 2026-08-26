import { useEffect, useMemo, useRef, useState } from 'react';
import type { PistonOscillationLanguage } from './pistonOscillationCopy.ts';
import {
  createPistonOscillationOperationCueSignature,
  type PistonOscillationMouseAction,
  type PistonOscillationOperationCue,
  type PistonOscillationOperationKey,
} from './pistonOscillationOperationVisualizationModel.ts';

const COPY = {
  'zh-CN': {
    label: '操作可视化',
    on: '开',
    off: '关',
    tooltipOn: '关闭键鼠操作提示。',
    tooltipOff: '开启键鼠操作提示，用于学习仪器操作中的 Space 与鼠标配合。',
    shift: 'Shift 键',
    space: '空格键',
    mouseLeft: '鼠标左键',
    click: '单击',
    moveUp: '向上拖动',
    moveDown: '向下拖动',
    rotateClockwise: '顺时针拖动',
    rotateCounterclockwise: '逆时针拖动',
  },
  'zh-TW': {
    label: '操作視覺化',
    on: '開',
    off: '關',
    tooltipOn: '關閉鍵鼠操作提示。',
    tooltipOff: '開啟鍵鼠操作提示，用於學習儀器操作中的 Space 與滑鼠配合。',
    shift: 'Shift 鍵',
    space: '空白鍵',
    mouseLeft: '滑鼠左鍵',
    click: '按一下',
    moveUp: '向上拖曳',
    moveDown: '向下拖曳',
    rotateClockwise: '順時針拖曳',
    rotateCounterclockwise: '逆時針拖曳',
  },
  en: {
    label: 'Input Hints',
    on: 'ON',
    off: 'OFF',
    tooltipOn: 'Hide keyboard and mouse operation hints.',
    tooltipOff: 'Show Space and mouse hints while operating the instrument.',
    shift: 'Shift key',
    space: 'Space bar',
    mouseLeft: 'Left mouse button',
    click: 'Click',
    moveUp: 'Drag upward',
    moveDown: 'Drag downward',
    rotateClockwise: 'Drag clockwise',
    rotateCounterclockwise: 'Drag counterclockwise',
  },
} as const;

const ACTION_GLYPHS: Record<PistonOscillationMouseAction, string> = {
  click: '•',
  moveUp: '↑',
  moveDown: '↓',
  rotateClockwise: '↻',
  rotateCounterclockwise: '↺',
};

const getKeyLabel = (
  key: PistonOscillationOperationKey,
  language: PistonOscillationLanguage,
) => {
  const copy = COPY[language];
  if (key === 'shift') return copy.shift;
  if (key === 'space') return copy.space;
  return copy.mouseLeft;
};

export interface PistonOscillationOperationVisualizationToggleProps {
  enabled: boolean;
  onToggle: () => void;
  language: PistonOscillationLanguage;
  disabled?: boolean;
}

export const PistonOscillationOperationVisualizationToggle = ({
  enabled,
  onToggle,
  language,
  disabled = false,
}: PistonOscillationOperationVisualizationToggleProps) => {
  const copy = COPY[language];
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (disabled && document.activeElement === buttonRef.current) {
      buttonRef.current?.blur();
    }
  }, [disabled]);

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`studio-heat-hard-sphere-toggle ${
        enabled
          ? 'studio-heat-hard-sphere-toggle-on'
          : 'studio-heat-hard-sphere-toggle-off'
      } piston-operation-visualization-toggle`}
      data-piston-operation-visualization-toggle="true"
      data-piston-operation-visualization-enabled={enabled ? 'true' : 'false'}
      data-piston-operation-visualization-interactive={disabled ? 'false' : 'true'}
      aria-pressed={enabled}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      aria-label={enabled ? copy.tooltipOn : copy.tooltipOff}
      title={enabled ? copy.tooltipOn : copy.tooltipOff}
      onPointerDown={(event) => {
        event.stopPropagation();
        if (disabled) event.preventDefault();
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (disabled) return;
        onToggle();
      }}
    >
      <span className="studio-heat-hard-sphere-toggle-label">{copy.label}</span>
      <span className="studio-heat-hard-sphere-toggle-state">
        {enabled ? copy.on : copy.off}
      </span>
      <span className="studio-heat-hard-sphere-switch" aria-hidden="true">
        <span />
      </span>
    </button>
  );
};

export interface PistonOscillationOperationCueViewProps {
  cue: PistonOscillationOperationCue | null;
  language: PistonOscillationLanguage;
}

export const PistonOscillationOperationCueView = ({
  cue,
  language,
}: PistonOscillationOperationCueViewProps) => {
  const signature = createPistonOscillationOperationCueSignature(cue);
  const [displayedCue, setDisplayedCue] = useState<PistonOscillationOperationCue | null>(cue);
  const [visible, setVisible] = useState(Boolean(cue));
  const exitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    if (cue) {
      setDisplayedCue(cue);
      setVisible(true);
      return undefined;
    }
    setVisible(false);
    exitTimerRef.current = window.setTimeout(() => {
      setDisplayedCue(null);
      exitTimerRef.current = null;
    }, 1_400);
    return () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [signature]);

  const copy = COPY[language];
  const accessibleLabel = useMemo(() => {
    if (!displayedCue) return '';
    const keyLabels = displayedCue.keys.map((key) => getKeyLabel(key, language));
    const action = displayedCue.mouseAction
      ? copy[displayedCue.mouseAction]
      : null;
    return [...keyLabels, action].filter(Boolean).join(' + ');
  }, [copy, displayedCue, language]);

  if (!displayedCue) return null;

  return (
    <div
      className={`piston-operation-visualization-cue ${visible ? 'is-visible' : 'is-exiting'}`}
      data-piston-operation-cue={signature}
      role="status"
      aria-live="polite"
      aria-label={accessibleLabel}
    >
      {displayedCue.keys.map((key, index) => (
        <span className="piston-operation-cue-part" key={key}>
          {index > 0 ? <span className="piston-operation-cue-plus" aria-hidden="true">+</span> : null}
          {key === 'mouseLeft' ? (
            <span className="piston-operation-cue-mouse" aria-hidden="true">
              <svg viewBox="0 0 36 50" focusable="false">
                <rect x="5" y="2" width="26" height="45" rx="12" />
                <path d="M18 3v17M6 20h24" />
                <path className="is-active-button" d="M6 20V14C6 7.4 10.6 3 17 3v17Z" />
              </svg>
              {displayedCue.mouseAction ? (
                <span className={`piston-operation-cue-direction is-${displayedCue.mouseAction}`}>
                  {ACTION_GLYPHS[displayedCue.mouseAction]}
                </span>
              ) : null}
            </span>
          ) : (
            <kbd className={`piston-operation-cue-key is-${key}`}>
              {key === 'shift' ? 'Shift' : 'Space'}
            </kbd>
          )}
        </span>
      ))}
    </div>
  );
};
