import type React from 'react';
import {
  getWorkbenchParameterDetail,
  getWorkbenchParameterDisplayLabel,
  getWorkbenchParameterDisplayUnit,
} from './workbenchParameterPresentation.ts';

export interface WorkbenchSimulationParameterRowProps {
  param: import('./workbenchParameterState.ts').WorkbenchParameterRow;
  workbenchCopy: import('./workbenchStudioCopy.ts').WorkbenchCopy;
  parameterControlsLocked: boolean;
  isIdealControlledVariableLocked: (key: keyof import('../../shared/types.ts').SimulationParams | "relation") => boolean;
  controlledVariableLockHint: string;
  parameterInputDrafts: Record<string, string>;
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
  renderWorkbenchParameterSymbol: (parts: import('./workbenchParameterPresentation.ts').WorkbenchParameterSymbolPart[]) => React.ReactElement;
  renderWorkbenchParameterHelpButton: (parameterId: string, modelEffect: string) => React.ReactElement;
  setParameterInputDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setParameterErrors: React.Dispatch<React.SetStateAction<string[]>>;
  commitWorkbenchParameterInput: (param: import('./workbenchParameterState.ts').WorkbenchParameterRow, rawValue: string) => void;
  revertWorkbenchParameterInput: (paramKey: string) => void;
}

export const WorkbenchSimulationParameterRow = ({
  param,
  workbenchCopy,
  parameterControlsLocked,
  isIdealControlledVariableLocked,
  controlledVariableLockHint,
  parameterInputDrafts,
  settingsLanguagePreference,
  renderWorkbenchParameterSymbol,
  renderWorkbenchParameterHelpButton,
  setParameterInputDrafts,
  setParameterErrors,
  commitWorkbenchParameterInput,
  revertWorkbenchParameterInput,
}: WorkbenchSimulationParameterRowProps) => {
    const detail = getWorkbenchParameterDetail(param);
    const displayLabel = getWorkbenchParameterDisplayLabel(param, workbenchCopy);
    const isParamLocked = parameterControlsLocked || isIdealControlledVariableLocked(param.key);
    const paramLockHint = isIdealControlledVariableLocked(param.key) ? controlledVariableLockHint : undefined;
    const parameterValue = parameterInputDrafts[param.key] ?? param.value;
    const displayUnit = getWorkbenchParameterDisplayUnit(param, settingsLanguagePreference);

    return (
      <div
        className={`studio-param-input-row ${isParamLocked ? 'studio-param-input-row-locked' : ''}`}
        key={param.label}
        data-prompt-tooltip={paramLockHint}
        aria-disabled={isParamLocked}
      >
        <span className="studio-param-input-label">
          <span className="studio-param-input-title">
            <span>{displayLabel}</span>
            {detail ? renderWorkbenchParameterSymbol(detail.symbol) : null}
          </span>
          {detail ? renderWorkbenchParameterHelpButton(param.key, detail.help[settingsLanguagePreference]) : null}
        </span>
        <span className="studio-param-input-cell">
          <input
            type="text"
            inputMode="decimal"
            aria-label={`${workbenchCopy.parameters.edit} ${displayLabel}`}
            value={parameterValue}
            disabled={isParamLocked || !param.editable}
            onChange={(event) => {
              const nextValue = event.target.value;
              setParameterInputDrafts((current) => ({ ...current, [param.key]: nextValue }));
              setParameterErrors([]);
            }}
            onBlur={() => commitWorkbenchParameterInput(param, parameterValue)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitWorkbenchParameterInput(param, parameterValue);
              } else if (event.key === 'Escape') {
                event.preventDefault();
                revertWorkbenchParameterInput(param.key);
              }
            }}
          />
          {displayUnit ? <span className="studio-param-input-unit">{displayUnit}</span> : null}
        </span>
      </div>
    );
  };
