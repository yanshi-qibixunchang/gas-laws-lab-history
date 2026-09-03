import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, Wrench } from 'lucide-react';
import {
  PISTON_OSCILLATION_FREE_PARAMETER_RANGES,
  getPistonOscillationFreeTriggerThresholdRange,
  type PistonOscillationFreeParameterDraft,
} from '../../domain/pistonOscillation/pistonOscillationFreeParameterConfig.ts';
import {
  getPistonOscillationFreeEffectiveParameters,
  isPistonOscillationFreeExperimentLocked,
  PistonOscillationFreeSession,
} from '../../domain/pistonOscillation/pistonOscillationFreeWorkflowModel.ts';
import type { PistonOscillationLanguage } from './pistonOscillationCopy.ts';
import { PromptDialogShell } from '../../components/prompts/PromptDialogShell.tsx';
import {
  WorkbenchHeatCapacityAdvancedRiskDialog,
  WorkbenchHeatCapacityRestoreDefaultDialog,
} from '../workbench/WorkbenchHeatCapacityParameterDialogs.tsx';

type PistonOscillationParameterMode = 'explore' | 'demo' | 'guide' | 'free';

type NumericParameterKey = Exclude<keyof PistonOscillationFreeParameterDraft,
  | 'sensorFluctuationEnabled'
  | 'tailIrregularityEnabled'
>;

interface NumericParameterDefinition {
  key: NumericParameterKey;
  label: Record<PistonOscillationLanguage, string>;
  unit: string;
  minimum: number;
  maximum: number;
  precision: number;
  integer?: boolean;
  nullable?: boolean;
}

const text = {
  'zh-CN': {
    section: '自由模式参数',
    ambientPressure: '环境压强',
    ambientTemperature: '环境温度',
    sampleRate: '采样频率',
    trigger: '下降触发阈值',
    sensorFluctuation: '传感器波动',
    tailIrregularity: '尾段不规则',
    operationVisualization: '键鼠操作可视化',
    on: '开',
    off: '关',
    advanced: '高级设置',
    restore: '恢复默认参数',
    freeOnly: '当前参数仅可在自由模式中打开和调整。',
    locked: '当前实验已留下不可逆记录；完整重置或新建文件后可重新设置参数。',
    editable: '开始正式采集或发生不可逆操作后，整套参数将锁定。',
    advancedTitle: '活塞振动法高级设置',
    cancel: '取消',
    apply: '保存设置',
    confirm: '确认并继续',
    riskTitle: '确认调整高级参数',
    riskBody: '高级参数会影响当前实验文件的物理过程、传感器读数和采集结果。确认后，本实验文件后续打开高级参数不再重复提示。',
    restoreTitle: '恢复活塞振动法默认参数？',
    restoreBody: '所有自由模式普通与高级参数将恢复默认值，键鼠操作可视化将关闭。',
    restoreConfirm: '恢复默认值',
    thermal: '热过程与等效损耗',
    sensor: '传感器观测',
    release: '双手松开不对称',
    tail: '尾段不规则',
    invalid: '请输入允许范围内的数值',
    relationInvalid: '饱和时间差必须大于中性时间差',
    plan: '当前高度方案',
    notConfigured: '尚未配置',
  },
  'zh-TW': {
    section: '自由模式參數', ambientPressure: '環境壓強', ambientTemperature: '環境溫度',
    sampleRate: '取樣頻率', trigger: '下降觸發閾值', sensorFluctuation: '感測器波動',
    tailIrregularity: '尾段不規則', operationVisualization: '鍵鼠操作視覺化', on: '開', off: '關',
    advanced: '進階設定', restore: '恢復預設參數', locked: '目前實驗已留下不可逆記錄；完整重設或建立新檔案後可重新設定參數。',
    freeOnly: '目前參數僅可在自由模式中開啟和調整。',
    editable: '開始正式採集或發生不可逆操作後，整套參數將鎖定。', advancedTitle: '活塞振動法進階設定',
    cancel: '取消', apply: '儲存設定', confirm: '確認並繼續', riskTitle: '確認調整進階參數',
    riskBody: '進階參數會影響目前實驗檔案的物理過程、感測器讀數和採集結果。確認後，本實驗檔案後續開啟進階參數不再重複提示。',
    restoreTitle: '恢復活塞振動法預設參數？', restoreBody: '所有自由模式普通與進階參數將恢復預設值，鍵鼠操作視覺化將關閉。',
    restoreConfirm: '恢復預設值', thermal: '熱過程與等效損耗',
    sensor: '感測器觀測', release: '雙手鬆開不對稱', tail: '尾段不規則', invalid: '請輸入允許範圍內的數值',
    relationInvalid: '飽和時間差必須大於中性時間差', plan: '目前高度方案', notConfigured: '尚未設定',
  },
  en: {
    section: 'Free-mode parameters', ambientPressure: 'Ambient pressure', ambientTemperature: 'Ambient temperature',
    sampleRate: 'Sample rate', trigger: 'Falling trigger', sensorFluctuation: 'Sensor fluctuation',
    tailIrregularity: 'Tail irregularity', operationVisualization: 'Input visualization', on: 'On', off: 'Off', freeOnly: 'Current parameters are available only in Free mode.',
    advanced: 'Advanced settings', restore: 'Restore defaults', locked: 'This experiment contains an irreversible record. Fully reset it or create a new file to change parameters.',
    editable: 'The complete profile freezes when formal acquisition starts or another irreversible operation occurs.', advancedTitle: 'Piston-oscillation advanced settings', cancel: 'Cancel', apply: 'Save settings', confirm: 'Confirm and continue',
    riskTitle: 'Confirm advanced-parameter editing', riskBody: 'Advanced parameters affect this file’s physical process, sensor readings, and acquisition results. After confirmation, this file will not show the warning again.',
    restoreTitle: 'Restore piston-oscillation defaults?', restoreBody: 'All basic and advanced Free parameters will be restored, and input visualization will be turned off.',
    restoreConfirm: 'Restore defaults', thermal: 'Thermal process and equivalent loss',
    sensor: 'Sensor observation', release: 'Two-hand release asymmetry', tail: 'Tail irregularity', invalid: 'Enter a value within the allowed range',
    relationInvalid: 'The saturation gap must be greater than the neutral gap', plan: 'Current height plan', notConfigured: 'Not configured',
  },
} satisfies Record<PistonOscillationLanguage, Record<string, string>>;

export const getPistonOscillationParameterSidebarFreeOnlyMessage = (
  language: PistonOscillationLanguage,
) => text[language].freeOnly;

export const getPistonOscillationParameterLockMessage = (
  session: PistonOscillationFreeSession,
  language: PistonOscillationLanguage,
) => isPistonOscillationFreeExperimentLocked(session)
  ? text[language].locked
  : text[language].editable;

const parameterEffects = {
  'zh-CN': {
    ambientPressureKpa: '决定气体平衡压强，并进入最终比热比计算。',
    ambientTemperatureK: '决定初始热力学状态和按压、回弹过程中的温度响应。',
    sampleRateHz: '决定每秒写入的正式样本数；同时与实时数据区保持同步。',
    triggerThresholdKpa: '决定下降穿越哪一条压强线后开始形成正式曲线；同时与实时数据区保持同步。',
    sensorFluctuationEnabled: '控制连续传感器波动、游走和漂移是否进入观测数据。',
    tailIrregularityEnabled: '控制振动尾段是否出现可重复但每次实验自然不同的不规则形态。',
    operationVisualizationEnabled: '仅改变键盘和鼠标操作提示，不改变实验数据。',
    equivalentLinearLossNsPerM: '统一作用于虚拟手按压和松手后的自由振动，决定等效能量损耗。',
    thermalRelaxationTimeS: '控制气体温度向环境状态恢复的快慢。',
    heatFlowLagTimeS: '控制热交换建立的短时滞后。',
    sensorResponseTimeS: '控制传感器读数跟随真实压强的响应速度。',
    fastFluctuationStandardDeviationPa: '控制高频、小尺度连续波动的强度。',
    slowFluctuationStandardDeviationPa: '控制低频、较缓慢波动的强度。',
    driftWanderAmplitudePa: '控制传感器基线缓慢游走的幅度。',
    driftRatePaPerS: '控制传感器基线随时间产生的定向漂移。',
    releaseNeutralGapS: '小于此时间差时，双手松开近似视为同步。',
    releaseSaturationGapS: '达到此时间差后，松手不对称造成的附加损耗不再继续增加。',
    releaseMaximumExtraLossNsPerM: '控制双手明显不同步时可能产生的最大附加损耗。',
    releaseAlignmentTimePeriods: '控制松手不对称影响衰减回固有状态所需的周期数。',
    tailOnsetCycles: '决定从第几个振动周期开始逐渐出现尾段不规则。',
    tailIntensity: '统一缩放尾段时移和局部肩部扰动的强度。',
    plan: '显示本实验文件已选定的各次平衡高度，只读且不在此处修改。',
  },
  'zh-TW': {
    ambientPressureKpa: '決定氣體平衡壓強，並進入最終比熱比計算。',
    ambientTemperatureK: '決定初始熱力學狀態和按壓、回彈過程中的溫度響應。',
    sampleRateHz: '決定每秒寫入的正式樣本數；同時與即時資料區保持同步。',
    triggerThresholdKpa: '決定下降穿越哪一條壓強線後開始形成正式曲線；同時與即時資料區保持同步。',
    sensorFluctuationEnabled: '控制連續感測器波動、遊走和漂移是否進入觀測資料。',
    tailIrregularityEnabled: '控制振動尾段是否出現可重複但每次實驗自然不同的不規則形態。',
    operationVisualizationEnabled: '僅改變鍵盤和滑鼠操作提示，不改變實驗資料。',
    equivalentLinearLossNsPerM: '統一作用於虛擬手按壓和鬆手後的自由振動，決定等效能量損耗。',
    thermalRelaxationTimeS: '控制氣體溫度向環境狀態恢復的快慢。',
    heatFlowLagTimeS: '控制熱交換建立的短時遲滯。',
    sensorResponseTimeS: '控制感測器讀數跟隨真實壓強的響應速度。',
    fastFluctuationStandardDeviationPa: '控制高頻、小尺度連續波動的強度。',
    slowFluctuationStandardDeviationPa: '控制低頻、較緩慢波動的強度。',
    driftWanderAmplitudePa: '控制感測器基線緩慢遊走的幅度。',
    driftRatePaPerS: '控制感測器基線隨時間產生的定向漂移。',
    releaseNeutralGapS: '小於此時間差時，雙手鬆開近似視為同步。',
    releaseSaturationGapS: '達到此時間差後，鬆手不對稱造成的附加損耗不再繼續增加。',
    releaseMaximumExtraLossNsPerM: '控制雙手明顯不同步時可能產生的最大附加損耗。',
    releaseAlignmentTimePeriods: '控制鬆手不對稱影響衰減回固有狀態所需的週期數。',
    tailOnsetCycles: '決定從第幾個振動週期開始逐漸出現尾段不規則。',
    tailIntensity: '統一縮放尾段時移和局部肩部擾動的強度。',
    plan: '顯示本實驗檔案已選定的各次平衡高度，唯讀且不在此處修改。',
  },
  en: {
    ambientPressureKpa: 'Sets the gas equilibrium pressure used by the final heat-capacity-ratio calculation.',
    ambientTemperatureK: 'Sets the initial thermodynamic state and the temperature response during pressing and rebound.',
    sampleRateHz: 'Sets the formal samples written per second and stays synchronized with Realtime Data.',
    triggerThresholdKpa: 'Sets the falling pressure crossing that begins the formal curve and stays synchronized with Realtime Data.',
    sensorFluctuationEnabled: 'Controls whether continuous fluctuation, wander, and drift enter observed data.',
    tailIrregularityEnabled: 'Controls whether late cycles contain naturally varying irregular structure.',
    operationVisualizationEnabled: 'Changes keyboard and mouse cues only; experiment data are unaffected.',
    equivalentLinearLossNsPerM: 'Applies to virtual-hand pressing and free vibration as the shared equivalent energy loss.',
    thermalRelaxationTimeS: 'Controls how quickly gas temperature relaxes toward the environment.',
    heatFlowLagTimeS: 'Controls the short delay while heat exchange is established.',
    sensorResponseTimeS: 'Controls how quickly sensor output follows physical pressure.',
    fastFluctuationStandardDeviationPa: 'Controls high-frequency, small-scale continuous fluctuation.',
    slowFluctuationStandardDeviationPa: 'Controls lower-frequency, slowly varying fluctuation.',
    driftWanderAmplitudePa: 'Controls slow baseline wander amplitude.',
    driftRatePaPerS: 'Controls directional baseline drift over time.',
    releaseNeutralGapS: 'Release gaps below this value are treated as approximately synchronized.',
    releaseSaturationGapS: 'Additional release-asymmetry loss stops increasing at this gap.',
    releaseMaximumExtraLossNsPerM: 'Sets the maximum added loss caused by strongly asynchronous release.',
    releaseAlignmentTimePeriods: 'Sets how many periods the release-asymmetry effect takes to decay.',
    tailOnsetCycles: 'Sets the cycle from which late irregularity begins to appear.',
    tailIntensity: 'Scales late-cycle timing shifts and local shoulder disturbances together.',
    plan: 'Shows the selected equilibrium heights for this file; it is read-only here.',
  },
} satisfies Record<PistonOscillationLanguage, Record<string, string>>;

const basicDefinitions: NumericParameterDefinition[] = [
  {
    key: 'ambientPressureKpa', label: { 'zh-CN': text['zh-CN'].ambientPressure, 'zh-TW': text['zh-TW'].ambientPressure, en: text.en.ambientPressure },
    unit: 'kPa', minimum: PISTON_OSCILLATION_FREE_PARAMETER_RANGES.ambientPressureKpa.minimum,
    maximum: PISTON_OSCILLATION_FREE_PARAMETER_RANGES.ambientPressureKpa.maximum, precision: 3,
  },
  {
    key: 'ambientTemperatureK', label: { 'zh-CN': text['zh-CN'].ambientTemperature, 'zh-TW': text['zh-TW'].ambientTemperature, en: text.en.ambientTemperature },
    unit: 'K', minimum: PISTON_OSCILLATION_FREE_PARAMETER_RANGES.ambientTemperatureK.minimum,
    maximum: PISTON_OSCILLATION_FREE_PARAMETER_RANGES.ambientTemperatureK.maximum, precision: 2,
  },
  {
    key: 'sampleRateHz', label: { 'zh-CN': text['zh-CN'].sampleRate, 'zh-TW': text['zh-TW'].sampleRate, en: text.en.sampleRate },
    unit: 'Hz', minimum: PISTON_OSCILLATION_FREE_PARAMETER_RANGES.sampleRateHz.minimum,
    maximum: PISTON_OSCILLATION_FREE_PARAMETER_RANGES.sampleRateHz.maximum, precision: 0, integer: true, nullable: true,
  },
  {
    key: 'triggerThresholdKpa', label: { 'zh-CN': text['zh-CN'].trigger, 'zh-TW': text['zh-TW'].trigger, en: text.en.trigger },
    unit: 'kPa', minimum: PISTON_OSCILLATION_FREE_PARAMETER_RANGES.triggerThresholdKpa.minimum,
    maximum: PISTON_OSCILLATION_FREE_PARAMETER_RANGES.triggerThresholdKpa.maximum, precision: 1, nullable: true,
  },
];

const advancedGroups: Array<{
  titleKey: 'thermal' | 'sensor' | 'release' | 'tail';
  definitions: NumericParameterDefinition[];
}> = [
  {
    titleKey: 'thermal',
    definitions: [
      { key: 'equivalentLinearLossNsPerM', label: { 'zh-CN': '等效线性损耗', 'zh-TW': '等效線性損耗', en: 'Equivalent linear loss' }, unit: 'N·s/m', minimum: 0, maximum: 10, precision: 3 },
      { key: 'thermalRelaxationTimeS', label: { 'zh-CN': '参考高度热弛豫', 'zh-TW': '參考高度熱弛豫', en: 'Reference thermal relaxation' }, unit: 's', minimum: 0.001, maximum: 5, precision: 4 },
      { key: 'heatFlowLagTimeS', label: { 'zh-CN': '热流建立滞后', 'zh-TW': '熱流建立遲滯', en: 'Heat-flow lag' }, unit: 's', minimum: 0.0005, maximum: 0.05, precision: 4 },
    ],
  },
  {
    titleKey: 'sensor',
    definitions: [
      { key: 'sensorResponseTimeS', label: { 'zh-CN': '传感器响应时间', 'zh-TW': '感測器響應時間', en: 'Sensor response time' }, unit: 's', minimum: 0.0001, maximum: 1, precision: 4 },
      { key: 'fastFluctuationStandardDeviationPa', label: { 'zh-CN': '快速波动标准差', 'zh-TW': '快速波動標準差', en: 'Fast fluctuation SD' }, unit: 'Pa', minimum: 0, maximum: 1_000, precision: 1 },
      { key: 'slowFluctuationStandardDeviationPa', label: { 'zh-CN': '慢速波动标准差', 'zh-TW': '慢速波動標準差', en: 'Slow fluctuation SD' }, unit: 'Pa', minimum: 0, maximum: 1_000, precision: 1 },
      { key: 'driftWanderAmplitudePa', label: { 'zh-CN': '漂移游走幅度', 'zh-TW': '漂移遊走幅度', en: 'Drift wander amplitude' }, unit: 'Pa', minimum: 0, maximum: 1_000, precision: 1 },
      { key: 'driftRatePaPerS', label: { 'zh-CN': '漂移速率', 'zh-TW': '漂移速率', en: 'Drift rate' }, unit: 'Pa/s', minimum: -100, maximum: 100, precision: 2 },
    ],
  },
  {
    titleKey: 'release',
    definitions: [
      { key: 'releaseNeutralGapS', label: { 'zh-CN': '中性松手时间差', 'zh-TW': '中性鬆手時間差', en: 'Neutral release gap' }, unit: 's', minimum: 0, maximum: 10, precision: 3 },
      { key: 'releaseSaturationGapS', label: { 'zh-CN': '饱和松手时间差', 'zh-TW': '飽和鬆手時間差', en: 'Saturation release gap' }, unit: 's', minimum: 0, maximum: 10, precision: 3 },
      { key: 'releaseMaximumExtraLossNsPerM', label: { 'zh-CN': '最大附加损耗', 'zh-TW': '最大附加損耗', en: 'Maximum extra loss' }, unit: 'N·s/m', minimum: 0, maximum: 100, precision: 2 },
      { key: 'releaseAlignmentTimePeriods', label: { 'zh-CN': '对中衰减周期', 'zh-TW': '對中衰減週期', en: 'Alignment decay' }, unit: 'T', minimum: 0.05, maximum: 10, precision: 2 },
    ],
  },
  {
    titleKey: 'tail',
    definitions: [
      { key: 'tailOnsetCycles', label: { 'zh-CN': '尾段起始周期', 'zh-TW': '尾段起始週期', en: 'Tail onset' }, unit: 'T', minimum: 0, maximum: 20, precision: 2 },
      { key: 'tailIntensity', label: { 'zh-CN': '尾段综合强度', 'zh-TW': '尾段綜合強度', en: 'Aggregate tail intensity' }, unit: '×', minimum: 0, maximum: 3, precision: 2 },
    ],
  },
];

const formatValue = (value: number | null, precision: number) => (
  value === null ? '' : Number(value.toFixed(precision)).toString()
);

const parseDefinitionValue = (
  raw: string,
  definition: NumericParameterDefinition,
) => {
  const trimmed = raw.trim();
  if (trimmed.length === 0 && definition.nullable) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)
    || value < definition.minimum
    || value > definition.maximum
    || (definition.integer && !Number.isSafeInteger(value))) return undefined;
  return value;
};

export interface PistonOscillationParameterPanelProps {
  language: PistonOscillationLanguage;
  mode: PistonOscillationParameterMode;
  session: PistonOscillationFreeSession;
  operationVisualizationEnabled: boolean;
  renderParameterHelpButton?: (parameterId: string, modelEffect: string) => ReactNode;
  onParameterDraftChange: (draft: PistonOscillationFreeParameterDraft) => void;
  onOperationVisualizationChange: (enabled: boolean) => void;
  onAcknowledgeAdvancedParametersRisk: () => void;
  onRestoreDefaults: () => void;
  onLockedInteraction?: () => void;
}

export const PistonOscillationParameterPanel = ({
  language,
  mode,
  session,
  operationVisualizationEnabled,
  renderParameterHelpButton,
  onParameterDraftChange,
  onOperationVisualizationChange,
  onAcknowledgeAdvancedParametersRisk,
  onRestoreDefaults,
  onLockedInteraction,
}: PistonOscillationParameterPanelProps) => {
  const copy = text[language];
  const effects = parameterEffects[language];
  const parameters = getPistonOscillationFreeEffectiveParameters(session);
  const freeMode = mode === 'free';
  const physicsLocked = !freeMode
    || isPistonOscillationFreeExperimentLocked(session);
  const lockMessage = !freeMode
    ? getPistonOscillationParameterSidebarFreeOnlyMessage(language)
    : getPistonOscillationParameterLockMessage(session, language);
  const [basicDrafts, setBasicDrafts] = useState<Record<string, string>>({});
  const [basicErrors, setBasicErrors] = useState<Record<string, string>>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedDrafts, setAdvancedDrafts] = useState<Record<string, string>>({});
  const [advancedErrors, setAdvancedErrors] = useState<Record<string, string>>({});
  const [restoreOpen, setRestoreOpen] = useState(false);
  const basic = useMemo(() => {
    const triggerRange = getPistonOscillationFreeTriggerThresholdRange(
      parameters.ambientPressureKpa,
    );
    return basicDefinitions.map((definition) => (
      definition.key === 'triggerThresholdKpa'
        ? {
            ...definition,
            minimum: triggerRange.minimumKpa,
            maximum: triggerRange.maximumKpa,
          }
        : definition
    ));
  }, [parameters.ambientPressureKpa]);

  useEffect(() => {
    setBasicDrafts(Object.fromEntries(basic.map((definition) => [
      definition.key,
      formatValue(parameters[definition.key] as number | null, definition.precision),
    ])));
    setBasicErrors({});
  }, [basic, parameters]);

  useEffect(() => {
    if (!advancedOpen) return;
    const definitions = advancedGroups.flatMap((group) => group.definitions);
    setAdvancedDrafts(Object.fromEntries(definitions.map((definition) => [
      definition.key,
      formatValue(parameters[definition.key] as number, definition.precision),
    ])));
    setAdvancedErrors({});
  }, [advancedOpen, parameters]);

  useEffect(() => {
    if (!advancedOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setAdvancedOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [advancedOpen]);

  useEffect(() => {
    if (freeMode) return;
    setAdvancedOpen(false);
    setRestoreOpen(false);
  }, [freeMode]);

  const commitBasic = (definition: NumericParameterDefinition) => {
    if (physicsLocked) return;
    const raw = basicDrafts[definition.key]
      ?? formatValue(parameters[definition.key] as number | null, definition.precision);
    const parsed = parseDefinitionValue(raw, definition);
    if (parsed === undefined) {
      setBasicErrors((current) => ({ ...current, [definition.key]: copy.invalid }));
      setBasicDrafts((current) => ({
        ...current,
        [definition.key]: formatValue(
          parameters[definition.key] as number | null,
          definition.precision,
        ),
      }));
      return;
    }
    setBasicErrors((current) => {
      const { [definition.key]: _removed, ...rest } = current;
      return rest;
    });
    setBasicDrafts((current) => ({
      ...current,
      [definition.key]: formatValue(parsed, definition.precision),
    }));
    onParameterDraftChange({ ...parameters, [definition.key]: parsed });
  };

  const applyAdvanced = () => {
    if (physicsLocked) return;
    const next = { ...parameters };
    const errors: Record<string, string> = {};
    for (const definition of advancedGroups.flatMap((group) => group.definitions)) {
      const parsed = parseDefinitionValue(
        advancedDrafts[definition.key]
          ?? formatValue(parameters[definition.key] as number, definition.precision),
        definition,
      );
      if (parsed === undefined || parsed === null) {
        errors[definition.key] = copy.invalid;
      } else {
        (next[definition.key] as number) = parsed;
      }
    }
    if (next.releaseSaturationGapS <= next.releaseNeutralGapS) {
      errors.releaseSaturationGapS = copy.relationInvalid;
    }
    if (Object.keys(errors).length > 0) {
      setAdvancedErrors(errors);
      return;
    }
    onParameterDraftChange(next);
    setAdvancedOpen(false);
  };

  const renderParameterLabel = (
    parameterId: string,
    label: string,
    modelEffect: string,
  ) => (
    <span className="studio-heat-free-param-label studio-heat-free-param-label-no-symbol">
      <span className="studio-heat-free-param-name">{label}</span>
      {renderParameterHelpButton?.(parameterId, modelEffect) ?? (
        <button
          type="button"
          className="studio-param-help-button"
          aria-label={modelEffect}
          title={modelEffect}
        >
          ?
        </button>
      )}
    </span>
  );

  const renderNumberRow = (
    definition: NumericParameterDefinition,
    scope: 'basic' | 'advanced',
  ) => {
    const drafts = scope === 'basic' ? basicDrafts : advancedDrafts;
    const errors = scope === 'basic' ? basicErrors : advancedErrors;
    const setDrafts = scope === 'basic' ? setBasicDrafts : setAdvancedDrafts;
    const value = drafts[definition.key]
      ?? formatValue(parameters[definition.key] as number | null, definition.precision);
    const error = errors[definition.key];
    return (
      <div
        key={definition.key}
        className={`studio-heat-free-param-row ${physicsLocked ? 'studio-heat-free-param-row-locked' : ''} ${error ? 'studio-heat-free-param-row-error' : ''}`}
        data-piston-oscillation-param-id={definition.key}
      >
        {renderParameterLabel(
          definition.key,
          definition.label[language],
          effects[definition.key],
        )}
        <span className="studio-heat-free-input-cell">
          <span className="studio-heat-free-input-shell">
            <input
              type="text"
              inputMode={definition.integer ? 'numeric' : 'decimal'}
              disabled={physicsLocked}
              value={value}
              aria-invalid={error ? true : undefined}
              onChange={(event) => {
                setDrafts((current) => ({ ...current, [definition.key]: event.target.value }));
                if (scope === 'basic') {
                  setBasicErrors((current) => {
                    const { [definition.key]: _removed, ...rest } = current;
                    return rest;
                  });
                } else {
                  setAdvancedErrors((current) => {
                    const { [definition.key]: _removed, ...rest } = current;
                    return rest;
                  });
                }
              }}
              onBlur={() => {
                if (scope === 'basic') commitBasic(definition);
              }}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === 'Enter' && scope === 'basic') {
                  event.preventDefault();
                  commitBasic(definition);
                  event.currentTarget.blur();
                } else if (event.key === 'Escape' && scope === 'basic') {
                  event.preventDefault();
                  setBasicDrafts((current) => ({
                    ...current,
                    [definition.key]: formatValue(
                      parameters[definition.key] as number | null,
                      definition.precision,
                    ),
                  }));
                  event.currentTarget.blur();
                }
              }}
            />
            <span className="studio-heat-free-unit">{definition.unit}</span>
          </span>
          {error ? <small className="studio-heat-free-inline-error">{error}</small> : null}
        </span>
      </div>
    );
  };

  const renderCheckbox = (
    label: string,
    checked: boolean,
    disabled: boolean,
    onChange: (checked: boolean) => void,
    id: string,
    modelEffect: string,
  ) => (
    <div
      className={`studio-heat-free-param-row studio-heat-free-check-row ${disabled ? 'studio-heat-free-param-row-locked' : ''}`}
      data-piston-oscillation-param-id={id}
    >
      {renderParameterLabel(id, label, modelEffect)}
      <label className="studio-heat-free-check-control">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{checked ? copy.on : copy.off}</span>
      </label>
    </div>
  );

  const planText = session.experimentPlan?.targetHeightsMm.length
    ? session.experimentPlan.targetHeightsMm.join(' / ')
    : copy.notConfigured;

  const riskPending = advancedOpen && !session.advancedParametersRiskAcknowledged;
  const dialogPortalHost = typeof document === 'undefined'
    ? null
    : document.querySelector<HTMLElement>('.studio-workbench') ?? document.body;

  return (
    <>
      <section
        className={`studio-heat-free-params ${physicsLocked ? 'is-locked' : ''}`}
        data-piston-oscillation-parameter-panel="true"
        aria-disabled={physicsLocked}
        title={physicsLocked ? lockMessage : undefined}
        onPointerDownCapture={(event) => {
          if (!physicsLocked) return;
          const target = event.target instanceof Element ? event.target : null;
          if (target?.closest('[data-piston-oscillation-param-id="operationVisualizationEnabled"]')) return;
          if (target?.closest('[data-heat-capacity-param-help-button="true"]')) return;
          event.preventDefault();
          onLockedInteraction?.();
        }}
      >
        <div className={`studio-heat-free-default-row ${physicsLocked ? 'studio-heat-free-default-row-locked' : ''}`}>
          <button
            type="button"
            className="studio-heat-free-default-button"
            disabled={physicsLocked}
            title={physicsLocked ? lockMessage : copy.restore}
            onClick={() => setRestoreOpen(true)}
          >
            <RotateCcw size={13} />
            <span>{copy.restore}</span>
          </button>
        </div>
        {basic.map((definition) => renderNumberRow(definition, 'basic'))}
        {renderCheckbox(
          copy.sensorFluctuation,
          parameters.sensorFluctuationEnabled,
          physicsLocked,
          (enabled) => onParameterDraftChange({
            ...parameters,
            sensorFluctuationEnabled: enabled,
          }),
          'sensorFluctuationEnabled',
          effects.sensorFluctuationEnabled,
        )}
        {renderCheckbox(
          copy.tailIrregularity,
          parameters.tailIrregularityEnabled,
          physicsLocked,
          (enabled) => onParameterDraftChange({
            ...parameters,
            tailIrregularityEnabled: enabled,
          }),
          'tailIrregularityEnabled',
          effects.tailIrregularityEnabled,
        )}
        {renderCheckbox(
          copy.operationVisualization,
          operationVisualizationEnabled,
          false,
          onOperationVisualizationChange,
          'operationVisualizationEnabled',
          effects.operationVisualizationEnabled,
        )}
        <div
          className="studio-heat-free-param-row studio-heat-free-param-row-locked"
          data-piston-oscillation-param-id="experimentPlan"
        >
          {renderParameterLabel('experimentPlan', copy.plan, effects.plan)}
          <span className="studio-heat-free-input-cell">
            <span className="studio-heat-free-input-shell">
              <input type="text" value={planText} readOnly disabled />
              {session.experimentPlan ? <span className="studio-heat-free-unit">mm</span> : null}
            </span>
          </span>
        </div>
        <div className={`studio-heat-free-advanced-entry ${physicsLocked ? 'studio-heat-free-advanced-entry-locked' : ''}`}>
          <button
            type="button"
            className="studio-heat-free-advanced-button"
            disabled={physicsLocked}
            title={physicsLocked ? lockMessage : copy.advanced}
            onClick={() => setAdvancedOpen(true)}
          >
            <Wrench size={14} />
            <span>{copy.advanced}</span>
          </button>
        </div>
      </section>

      {advancedOpen && dialogPortalHost ? createPortal(
        <>
          <PromptDialogShell
            title={copy.advancedTitle}
            titleId="studio-piston-advanced-title"
            variant="task"
            closeLabel={copy.cancel}
            dismiss={{ closeButton: true, escape: true, backdrop: true }}
            onRequestClose={() => setAdvancedOpen(false)}
            overlayClassName="studio-heat-advanced-overlay"
            dialogClassName={`studio-heat-advanced-window ${riskPending ? 'studio-heat-advanced-window-blocked' : ''}`}
            headerClassName="studio-heat-advanced-header"
            closeButtonClassName="studio-heat-advanced-close"
            windowOverflow="auto"
          >
            <div className="studio-heat-advanced-groups" aria-disabled={riskPending}>
              {advancedGroups.map((group) => (
                <section
                  className="studio-heat-advanced-group"
                  key={group.titleKey}
                  data-piston-oscillation-advanced-group={group.titleKey}
                >
                  <h3 className="studio-heat-advanced-group-title">{copy[group.titleKey]}</h3>
                  <div className="studio-heat-advanced-grid">
                    {group.definitions.map((definition) => (
                      <div className="studio-heat-advanced-grid-item" key={definition.key}>
                        {renderNumberRow(definition, 'advanced')}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <footer className="studio-heat-advanced-actions">
              <button type="button" onClick={() => setAdvancedOpen(false)}>{copy.cancel}</button>
              <button
                type="button"
                className="studio-heat-advanced-primary"
                disabled={riskPending}
                onClick={applyAdvanced}
              >
                {copy.apply}
              </button>
            </footer>
          </PromptDialogShell>
          <WorkbenchHeatCapacityAdvancedRiskDialog
            open={riskPending}
            copy={{
              title: copy.riskTitle,
              body: copy.riskBody,
              cancel: copy.cancel,
              confirm: copy.confirm,
            }}
            onCancel={() => setAdvancedOpen(false)}
            onConfirm={onAcknowledgeAdvancedParametersRisk}
          />
        </>,
        dialogPortalHost,
      ) : null}

      {dialogPortalHost ? createPortal(
        <WorkbenchHeatCapacityRestoreDefaultDialog
          open={restoreOpen}
          copy={{
            title: copy.restoreTitle,
            body: copy.restoreBody,
            cancel: copy.cancel,
            confirm: copy.restoreConfirm,
          }}
          onCancel={() => setRestoreOpen(false)}
          onConfirm={() => {
            setRestoreOpen(false);
            onRestoreDefaults();
          }}
        />,
        dialogPortalHost,
      ) : null}
    </>
  );
};
