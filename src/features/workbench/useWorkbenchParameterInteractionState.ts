import { useRef, useState } from 'react';

/** Transient standard/ideal input and scroll state; experiment data remains in the file owner. */
export const useWorkbenchParameterInteractionState = () => {
  const [pendingRemovePointId, setPendingRemovePointId] = useState<string | null>(null);
  const [pendingClearRelationKey, setPendingClearRelationKey] = useState<string | null>(null);
  const [samplingPresetMenuOpen, setSamplingPresetMenuOpen] = useState(false);
  const [idealAdvancedSettingsOpen, setIdealAdvancedSettingsOpen] = useState(false);
  const [idealAdvancedSettingsBodyVisible, setIdealAdvancedSettingsBodyVisible] = useState(false);
  const [parameterInputDrafts, setParameterInputDrafts] = useState<Record<string, string>>({});
  const [parameterErrors, setParameterErrors] = useState<string[]>([]);
  const [scanInputDraft, setScanInputDraft] = useState('');
  const [scanInputFocused, setScanInputFocused] = useState(false);
  const [scanInputError, setScanInputError] = useState<string | null>(null);
  const [scanInputToast, setScanInputToast] = useState<string | null>(null);
  const [scanSliderThumbHover, setScanSliderThumbHover] = useState(false);
  const [scanSliderDragging, setScanSliderDragging] = useState(false);
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const lastScanInputErrorRef = useRef<string | null>(null);
  const samplingPresetSelectRef = useRef<HTMLDivElement | null>(null);
  const currentParametersBodyRef = useRef<HTMLDivElement | null>(null);
  const idealAdvancedSettingsBodyRef = useRef<HTMLDivElement | null>(null);
  const idealAdvancedSettingsPreviousScrollTopRef = useRef(0);
  const idealAdvancedScrollFrameRef = useRef<number | null>(null);
  return { pendingRemovePointId, setPendingRemovePointId, pendingClearRelationKey, setPendingClearRelationKey, samplingPresetMenuOpen, setSamplingPresetMenuOpen, idealAdvancedSettingsOpen, setIdealAdvancedSettingsOpen, idealAdvancedSettingsBodyVisible, setIdealAdvancedSettingsBodyVisible, parameterInputDrafts, setParameterInputDrafts, parameterErrors, setParameterErrors, scanInputDraft, setScanInputDraft, scanInputFocused, setScanInputFocused, scanInputError, setScanInputError, scanInputToast, setScanInputToast, scanSliderThumbHover, setScanSliderThumbHover, scanSliderDragging, setScanSliderDragging, scanInputRef, lastScanInputErrorRef, samplingPresetSelectRef, currentParametersBodyRef, idealAdvancedSettingsBodyRef, idealAdvancedSettingsPreviousScrollTopRef, idealAdvancedScrollFrameRef };
};
