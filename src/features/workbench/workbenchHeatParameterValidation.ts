import { type HeatCapacityFreeNumberParameterDefinition, formatHeatCapacityFreeParameterValue, heatCapacityFreeSharedText, getHeatCapacityFreeParameterInputValue, getHeatCapacityFreeParameterDraftValue } from '../heatCapacity/heatCapacityFreeParameterPanelModel.ts';
import { type HeatCapacityFreeParameterDraft, getHeatCapacityFreePressureDangerUpperLimitMv } from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';
import { type WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import { HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA } from '../../domain/heatCapacity/heatCapacityFreePhysicsEngine.ts';
import { type WorkbenchConsoleMessageFactory } from './workbenchConsoleLocalization.ts';

export interface createWorkbenchHeatParameterValidationPorts {
  settingsLanguagePreference: "zh-CN" | "zh-TW" | "en";
}

export function createWorkbenchHeatParameterValidation({
  settingsLanguagePreference,
}: createWorkbenchHeatParameterValidationPorts) {
const getHeatCapacityFreeParameterMaximum = (
    definition: HeatCapacityFreeNumberParameterDefinition,
    draft: HeatCapacityFreeParameterDraft,
  ) => (
    definition.id === 'pressureDangerMv'
      ? getHeatCapacityFreePressureDangerUpperLimitMv(draft)
      : definition.max ?? null
  );

const getHeatCapacityFreeValueTooSmallMessage = (
    definition: HeatCapacityFreeNumberParameterDefinition,
    language: WorkbenchLanguagePreference = settingsLanguagePreference,
  ) => {
    const label = definition.label[language];
    const formattedMin = formatHeatCapacityFreeParameterValue(
      definition.min,
      definition.precision,
    );
    const limitText = `${formattedMin} ${definition.unit}`.trim();
    return `${label}${heatCapacityFreeSharedText.valueTooSmall[language]} ${limitText}`;
  };

const getHeatCapacityFreeValueTooLargeMessage = (
    definition: HeatCapacityFreeNumberParameterDefinition,
    maxValue: number,
    language: WorkbenchLanguagePreference = settingsLanguagePreference,
  ) => {
    const label = definition.label[language];
    const formattedMax = formatHeatCapacityFreeParameterValue(
      getHeatCapacityFreeParameterInputValue(definition, maxValue),
      definition.precision,
    );
    const limitText = definition.id === 'pressureDangerMv'
      ? `${formattedMax} ${definition.unit} / ${HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA} kPa`
      : `${formattedMax} ${definition.unit}`.trim();
    return `${label}${heatCapacityFreeSharedText.valueTooLarge[language]} ${limitText}`;
  };

const validateHeatCapacityFreeNumberValue = (
    definition: HeatCapacityFreeNumberParameterDefinition,
    valueText: string,
    draft: HeatCapacityFreeParameterDraft,
    options: { checkMax?: boolean } = {},
  ): { valid: true; value: number } | { valid: false; message: string; getMessage: WorkbenchConsoleMessageFactory } => {
    const invalid = (getMessage: WorkbenchConsoleMessageFactory) => ({
      valid: false as const,
      message: getMessage(settingsLanguagePreference),
      getMessage,
    });
    if (valueText.trim() === '') {
      return invalid((language) => heatCapacityFreeSharedText.invalidNumber[language]);
    }
    const parsedValue = Number(valueText.trim());
    if (!Number.isFinite(parsedValue)) {
      return invalid((language) => heatCapacityFreeSharedText.invalidNumber[language]);
    }
    if (parsedValue < definition.min) {
      return invalid((language) => getHeatCapacityFreeValueTooSmallMessage(definition, language));
    }
    const draftValue = getHeatCapacityFreeParameterDraftValue(definition, parsedValue);
    if (options.checkMax !== false) {
      const maxValue = getHeatCapacityFreeParameterMaximum(definition, {
        ...draft,
        [definition.id]: draftValue,
      });
      if (maxValue !== null && draftValue > maxValue) {
        return invalid((language) => getHeatCapacityFreeValueTooLargeMessage(definition, maxValue, language));
      }
    }
    return { valid: true, value: draftValue };
  };

  return { getHeatCapacityFreeParameterMaximum, getHeatCapacityFreeValueTooLargeMessage, validateHeatCapacityFreeNumberValue };
}
