import { ChevronDown } from 'lucide-react';
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import './ExperimentCountSelector.css';

export interface ExperimentCountSelectorCopy {
  inputAria: string;
  menuAria: string;
  menuButtonAria: string;
  placeholder: string;
  emptyHint: string;
  unit: string;
  invalid: string;
  selected: (count: number) => string;
  option: (count: number) => string;
  optionHint: (count: number) => string;
}

export interface ExperimentCountSelectorProps {
  options: readonly number[];
  draft: string;
  onDraftChange: (draft: string) => void;
  onValidValueChange?: (count: number) => void;
  onValidValueEnter?: (count: number) => void;
  copy: ExperimentCountSelectorCopy;
  describedBy?: string;
  disabled?: boolean;
  className?: string;
  dataOwner?: string;
  onMenuOpenChange?: (open: boolean) => void;
}

export const parseExperimentCountDraft = (
  draft: string,
  options: readonly number[],
): number | null => {
  const trimmed = draft.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const count = Number(trimmed);
  return options.includes(count) ? count : null;
};

const getOptionIndex = (value: number | null, options: readonly number[]) => (
  value === null ? 0 : Math.max(0, options.indexOf(value))
);

export const ExperimentCountSelector = forwardRef<
HTMLInputElement,
ExperimentCountSelectorProps
>(({
  options,
  draft,
  onDraftChange,
  onValidValueChange,
  onValidValueEnter,
  copy,
  describedBy,
  disabled = false,
  className = '',
  dataOwner,
  onMenuOpenChange,
}, forwardedInputRef) => {
  const generatedId = useId();
  const listboxId = `${generatedId}-listbox`;
  const feedbackId = `${generatedId}-feedback`;
  const controlRef = useRef<HTMLDivElement | null>(null);
  const localInputRef = useRef<HTMLInputElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const selectedValue = parseExperimentCountDraft(draft, options);
  const draftIsEmpty = draft.trim().length === 0;
  const draftIsInvalid = !draftIsEmpty && selectedValue === null;
  const [highlightedIndex, setHighlightedIndex] = useState(
    () => getOptionIndex(selectedValue, options),
  );

  useEffect(() => {
    onMenuOpenChange?.(menuOpen);
  }, [menuOpen, onMenuOpenChange]);

  const assignInputRef = (node: HTMLInputElement | null) => {
    localInputRef.current = node;
    if (typeof forwardedInputRef === 'function') {
      forwardedInputRef(node);
    } else if (forwardedInputRef) {
      forwardedInputRef.current = node;
    }
  };

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !controlRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setMenuOpen(false);
      window.requestAnimationFrame(() => localInputRef.current?.focus());
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    setHighlightedIndex(getOptionIndex(selectedValue, options));
  }, [menuOpen, options, selectedValue]);

  const selectValue = (count: number) => {
    onDraftChange(String(count));
    onValidValueChange?.(count);
    setHighlightedIndex(getOptionIndex(count, options));
    setMenuOpen(false);
    window.requestAnimationFrame(() => localInputRef.current?.focus());
  };

  const moveHighlight = (direction: 1 | -1) => {
    setHighlightedIndex((current) => (
      (current + direction + options.length) % options.length
    ));
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextDraft = event.target.value.replace(/[^0-9]/g, '');
    onDraftChange(nextDraft);
    const nextValue = parseExperimentCountDraft(nextDraft, options);
    if (nextValue !== null) onValidValueChange?.(nextValue);
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!menuOpen) {
        setHighlightedIndex(
          event.key === 'ArrowUp' && selectedValue === null
            ? options.length - 1
            : getOptionIndex(selectedValue, options),
        );
        setMenuOpen(true);
      } else {
        moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
      }
      return;
    }
    if (event.key === 'Home' && menuOpen) {
      event.preventDefault();
      setHighlightedIndex(0);
      return;
    }
    if (event.key === 'End' && menuOpen) {
      event.preventDefault();
      setHighlightedIndex(options.length - 1);
      return;
    }
    if (event.key === 'Enter') {
      if (menuOpen) {
        event.preventDefault();
        selectValue(options[highlightedIndex]!);
      } else if (selectedValue !== null) {
        onValidValueChange?.(selectedValue);
        onValidValueEnter?.(selectedValue);
      }
      return;
    }
    if (event.key === 'Escape' && menuOpen) {
      event.preventDefault();
      event.stopPropagation();
      setMenuOpen(false);
    }
  };

  return (
    <div
      className={`experiment-count-selector-field ${className}`.trim()}
      data-experiment-count-selector={dataOwner ?? 'shared'}
    >
      <div
        ref={controlRef}
        className={`experiment-count-selector ${menuOpen ? 'is-open' : ''} ${
          draftIsInvalid ? 'is-invalid' : ''
        }`.trim()}
      >
        <div className="experiment-count-selector-content">
          <div className="experiment-count-selector-value">
            <input
              ref={assignInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={draft}
              placeholder={copy.placeholder}
              disabled={disabled}
              role="combobox"
              aria-label={copy.inputAria}
              aria-describedby={[describedBy, feedbackId].filter(Boolean).join(' ') || undefined}
              aria-invalid={draftIsInvalid}
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              aria-controls={menuOpen ? listboxId : undefined}
              aria-activedescendant={
                menuOpen ? `${listboxId}-option-${options[highlightedIndex]}` : undefined
              }
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onFocus={(event) => event.currentTarget.select()}
            />
            {!draftIsEmpty ? (
              <span className="experiment-count-selector-unit" aria-hidden="true">
                {copy.unit}
              </span>
            ) : null}
          </div>
          <small
            id={feedbackId}
            className={draftIsInvalid ? 'is-error' : ''}
            role={draftIsInvalid ? 'alert' : undefined}
            aria-live="polite"
          >
            {draftIsEmpty
              ? copy.emptyHint
              : draftIsInvalid
                ? copy.invalid
                : copy.selected(selectedValue!)}
          </small>
        </div>
        <button
          ref={menuButtonRef}
          type="button"
          disabled={disabled}
          aria-label={copy.menuButtonAria}
          aria-haspopup="listbox"
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? listboxId : undefined}
          onClick={() => {
            setHighlightedIndex(getOptionIndex(selectedValue, options));
            setMenuOpen((current) => !current);
          }}
        >
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={menuOpen ? 'is-open' : ''}
          />
        </button>

        {menuOpen ? (
          <div
            id={listboxId}
            className="experiment-count-selector-menu"
            role="listbox"
            aria-label={copy.menuAria}
          >
            {options.map((count, index) => {
              const selected = selectedValue === count;
              const highlighted = highlightedIndex === index;
              return (
                <button
                  id={`${listboxId}-option-${count}`}
                  key={count}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={selected}
                  className={`${selected ? 'is-selected' : ''} ${
                    highlighted ? 'is-highlighted' : ''
                  }`.trim()}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectValue(count)}
                >
                  <strong>{copy.option(count)}</strong>
                  <span>{copy.optionHint(count)}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
});

ExperimentCountSelector.displayName = 'ExperimentCountSelector';

export default ExperimentCountSelector;
