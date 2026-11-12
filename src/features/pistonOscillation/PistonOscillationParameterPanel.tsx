import {
  isPistonRecordingDurationS,
  PISTON_DEFAULT_RECORDING_DURATION_S,
  PISTON_RECORDING_DURATION_RANGE_S,
} from '../../domain/pistonOscillation/pistonOscillationRecordingSettings.ts';
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
import {
  isPistonOscillationFreeExperimentProfileImplemented,
  type PistonOscillationExperimentScheme,
} from '../../domain/pistonOscillation/pistonOscillationFreeExperimentGroupModel.ts';
import type {
  PistonOscillationGasType,
} from '../../domain/pistonOscillation/pistonOscillationGasMaterialModel.ts';
import type { PistonOscillationLanguage } from './pistonOscillationCopy.ts';
import { PromptDialogShell } from '../../components/prompts/PromptDialogShell.tsx';
import {
  WorkbenchHeatCapacityAdvancedRiskDialog,
  WorkbenchHeatCapacityRestoreDefaultDialog,
} from '../workbench/WorkbenchHeatCapacityParameterDialogs.tsx';

type PistonOscillationParameterMode = 'explore' | 'demo' | 'guide' | 'free';

type NumericParameterKey = keyof PistonOscillationFreeParameterDraft
  & keyof typeof parameterEffects.en;

interface NumericParameterDefinition {
  key: NumericParameterKey;
  label: Record<PistonOscillationLanguage, string>;
  unit: string;
  minimum: number;
  maximum: number;
  precision?: number;
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
    duration: '记录时间',
    observationDisturbance: '观测扰动',
    partiallyOn: '部分开启',
    operationVisualization: '键鼠操作可视化',
    on: '开',
    off: '关',
    advanced: '高级设置',
    restore: '恢复默认参数',
    scheme: '实验方案',
    real: '真实实验条件',
    ideal: '理想实验过程',
    gasType: '气体类型',
    air: '空气',
    helium: '氦气',
    schemeHelp: '真实实验条件保留仪器损耗和读数误差。理想实验过程使用内置理想设置。',
    gasHelp: '选择空气或氦气。不同气体的理论比热容比不同。',
    idealReadonly: '理想实验过程可选择气体并调整触发阈值和记录时间，物理参数使用内置预设。',
    profilePending: '当前条件已保存，但完整物理参数档案尚未接入，暂不能开始正式采集。',
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
    restoreBody: '所有自由模式普通与高级参数将恢复为当前气体的默认值，键鼠操作可视化将关闭。',
    restoreConfirm: '恢复默认值',
    thermal: '热过程与等效损耗',
    sensor: '传感器观测',
    release: '双手松开不对称',
    invalid: '请输入允许范围内的数值',
    plan: '当前高度方案',
    notConfigured: '尚未配置',
  },
  'zh-TW': {
    section: '自由模式參數', ambientPressure: '環境壓強', ambientTemperature: '環境溫度',
    sampleRate: '取樣頻率', trigger: '下降觸發閾值', duration: '記錄時間', observationDisturbance: '觀測擾動',
    partiallyOn: '部分開啟', operationVisualization: '鍵鼠操作視覺化', on: '開', off: '關',
    advanced: '進階設定', restore: '恢復預設參數', locked: '目前實驗已留下不可逆記錄；完整重設或建立新檔案後可重新設定參數。',
    scheme: '實驗方案', real: '真實實驗條件', ideal: '理想實驗過程',
    gasType: '氣體類型', air: '空氣', helium: '氦氣',
    schemeHelp: '真實實驗條件保留儀器損耗和讀數誤差。理想實驗過程使用內建理想設定。',
    gasHelp: '選擇空氣或氦氣。不同氣體的理論比熱容比不同。',
    idealReadonly: '理想實驗過程可選擇氣體並調整觸發閾值和記錄時間，物理參數使用內建預設。',
    profilePending: '目前條件已儲存，但完整物理參數檔案尚未接入，暫不能開始正式採集。',
    freeOnly: '目前參數僅可在自由模式中開啟和調整。',
    editable: '開始正式採集或發生不可逆操作後，整套參數將鎖定。', advancedTitle: '活塞振動法進階設定',
    cancel: '取消', apply: '儲存設定', confirm: '確認並繼續', riskTitle: '確認調整進階參數',
    riskBody: '進階參數會影響目前實驗檔案的物理過程、感測器讀數和採集結果。確認後，本實驗檔案後續開啟進階參數不再重複提示。',
    restoreTitle: '恢復活塞振動法預設參數？', restoreBody: '所有自由模式普通與進階參數將恢復為目前氣體的預設值，鍵鼠操作視覺化將關閉。',
    restoreConfirm: '恢復預設值', thermal: '熱過程與等效損耗',
    sensor: '感測器觀測', release: '雙手鬆開不對稱', invalid: '請輸入允許範圍內的數值',
    plan: '目前高度方案', notConfigured: '尚未設定',
  },
  en: {
    section: 'Free-mode parameters', ambientPressure: 'Ambient pressure', ambientTemperature: 'Ambient temperature',
    sampleRate: 'Sample rate', trigger: 'Falling trigger', duration: 'Recording duration', observationDisturbance: 'Observation disturbances',
    partiallyOn: 'Partly on', operationVisualization: 'Input visualization', on: 'On', off: 'Off', freeOnly: 'Current parameters are available only in Free mode.',
    advanced: 'Advanced settings', restore: 'Restore defaults', locked: 'This experiment contains an irreversible record. Fully reset it or create a new file to change parameters.',
    scheme: 'Experiment scheme', real: 'Real conditions', ideal: 'Ideal process',
    gasType: 'Gas type', air: 'Air', helium: 'Helium',
    schemeHelp: 'Real conditions retain instrument losses and reading errors. The Ideal process uses built-in ideal settings.',
    gasHelp: 'Choose air or helium. Each gas has a different theoretical heat-capacity ratio.',
    idealReadonly: 'In the Ideal process, you can choose the gas and adjust the trigger threshold and recording duration. Physical parameters use the built-in profile.',
    profilePending: 'This condition is saved, but its complete physical profile is not connected yet, so formal acquisition is temporarily unavailable.',
    editable: 'The complete profile freezes when formal acquisition starts or another irreversible operation occurs.', advancedTitle: 'Piston-oscillation advanced settings', cancel: 'Cancel', apply: 'Save settings', confirm: 'Confirm and continue',
    riskTitle: 'Confirm advanced-parameter editing', riskBody: 'Advanced parameters affect this file’s physical process, sensor readings, and acquisition results. After confirmation, this file will not show the warning again.',
    restoreTitle: 'Restore piston-oscillation defaults?', restoreBody: 'All basic and advanced Free parameters will be restored for the selected gas, and input visualization will be turned off.',
    restoreConfirm: 'Restore defaults', thermal: 'Thermal process and equivalent loss',
    sensor: 'Sensor observation', release: 'Two-hand release asymmetry', invalid: 'Enter a value within the allowed range',
    plan: 'Current height plan', notConfigured: 'Not configured',
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
    ambientPressureKpa: '设置实验所在环境的大气压。',
    ambientTemperatureK: '设置实验开始时的环境温度。',
    observationDisturbance: '开启后，记录的压强曲线会出现波动、基线漂移和尾段不规则。关闭后，传感器响应时间仍然生效。',
    sampleRateHz: '每秒记录多少个压强样本。采样间隔越长，越难精确定位峰谷时刻。',
    triggerThresholdKpa: '压强从高向低越过这个值时，开始正式记录。',
    recordingDurationS: '从下降触发开始计时。达到设定时长后自动停止记录。',
    operationVisualizationEnabled: '显示空格键和鼠标左键的操作提示。',
    equivalentLinearLossNsPerM: '模拟活塞运动时持续受到的阻力。数值越大，松手后的振幅衰减越快。即使两手同时松开，这项也会生效。',
    thermalRelaxationTimeS: '以活塞位于 50 mm 为基准。固定活塞、忽略热流滞后时，每过这么久，气体与室温的温差就剩下原来的约 37%。数值越大，气体回到室温越慢。',
    heatFlowLagTimeS: '用来近似缸壁附近的温度分布对传热的影响。气体平均温度变了，模型中的实际传热速率会逐步调整。数值越大，传热速率跟上温差变化就越慢。',
    sensorResponseTimeS: '设置仪器跟上真实压强变化的快慢。数值越大，记录的峰谷越圆，出现得越晚。',
    releaseGapOverrideMs: '两只手松开相差的时间。留空时，软件使用空格键和鼠标左键实际松开的时间差。输入一个数值，可以比较不同时间差造成的附加阻尼。',
    releaseMaximumExtraLossNsPerM: '决定两手松开不同步时，活塞刚开始振动最多会受到多大的额外阻力。数值越大，同样的松手时间差带来的附加阻尼就越强。',
    plan: '显示本实验文件已选定的各次平衡高度，只读且不在此处修改。',
  },
  'zh-TW': {
    ambientPressureKpa: '設定實驗所在環境的大氣壓。',
    ambientTemperatureK: '設定實驗開始時的環境溫度。',
    observationDisturbance: '開啟後，記錄的壓強曲線會出現波動、基線漂移和尾段不規則。關閉後，感測器響應時間仍然生效。',
    sampleRateHz: '每秒記錄多少個壓強樣本。取樣間隔越長，越難精確定位峰谷時刻。',
    triggerThresholdKpa: '壓強從高向低越過這個值時，開始正式記錄。',
    recordingDurationS: '從下降觸發開始計時。達到設定時間後自動停止記錄。',
    operationVisualizationEnabled: '顯示空白鍵和滑鼠左鍵的操作提示。',
    equivalentLinearLossNsPerM: '模擬活塞運動時持續受到的阻力。數值越大，鬆手後的振幅衰減越快。即使兩手同時鬆開，這項也會生效。',
    thermalRelaxationTimeS: '以活塞位於 50 mm 為基準。固定活塞、忽略熱流遲滯時，每過這麼久，氣體與室溫的溫差就剩下原來的約 37%。數值越大，氣體回到室溫越慢。',
    heatFlowLagTimeS: '用來近似缸壁附近的溫度分布對傳熱的影響。氣體平均溫度變了，模型中的實際傳熱速率會逐步調整。數值越大，傳熱速率跟上溫差變化就越慢。',
    sensorResponseTimeS: '設定儀器跟上真實壓強變化的快慢。數值越大，記錄的峰谷越圓，出現得越晚。',
    releaseGapOverrideMs: '兩隻手鬆開相差的時間。留空時，軟體使用空白鍵和滑鼠左鍵實際鬆開的時間差。輸入一個數值，可以比較不同時間差造成的附加阻尼。',
    releaseMaximumExtraLossNsPerM: '決定兩手鬆開不同步時，活塞剛開始振動最多會受到多大的額外阻力。數值越大，同樣的鬆手時間差帶來的附加阻尼就越強。',
    plan: '顯示本實驗檔案已選定的各次平衡高度，唯讀且不在此處修改。',
  },
  en: {
    ambientPressureKpa: 'Sets the atmospheric pressure in the experiment environment.',
    ambientTemperatureK: 'Sets the ambient temperature at the start of the experiment.',
    observationDisturbance: 'When on, the recorded pressure curve shows fluctuations, baseline drift, and irregularities in the later cycles. The sensor response time still applies when this is off.',
    sampleRateHz: 'Sets how many pressure samples are recorded per second. Longer sampling intervals make the timing of peaks and troughs harder to pinpoint.',
    triggerThresholdKpa: 'Recording begins when pressure falls through this threshold.',
    recordingDurationS: 'Recording stops automatically after this much time has elapsed since the falling trigger.',
    operationVisualizationEnabled: 'Shows cues for the spacebar and left mouse button.',
    equivalentLinearLossNsPerM: 'Models the resistance acting on the piston as it moves. Higher values make the oscillations decay faster after release. This damping also applies when both hands release together.',
    thermalRelaxationTimeS: 'Uses a piston height of 50 mm as the reference. With the piston fixed and heat-flow lag ignored, the temperature difference between the gas and the room falls to about 37% of its previous value after each interval of this length. Higher values make the gas return to room temperature more slowly.',
    heatFlowLagTimeS: 'Approximates how the temperature distribution near the cylinder wall affects heat transfer. When the average gas temperature changes, the modeled heat transfer rate adjusts gradually. Higher values make that rate respond more slowly to changes in the temperature difference.',
    sensorResponseTimeS: 'Sets how quickly the sensor follows the actual pressure. Higher values make the recorded peaks and troughs rounder and later.',
    releaseGapOverrideMs: 'The time between releasing the two hands. Leave blank to use the actual time between releasing the spacebar and the left mouse button. Enter a value to compare the additional damping from different gaps.',
    releaseMaximumExtraLossNsPerM: 'Sets the maximum additional resistance at the start of oscillation when the hands release at different times. For the same release gap, higher values produce more additional damping.',
    plan: 'Shows the selected equilibrium heights for this file; it is read-only here.',
  },
} as const;

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
  {
    key: 'recordingDurationS', label: { 'zh-CN': text['zh-CN'].duration, 'zh-TW': text['zh-TW'].duration, en: text.en.duration },
    unit: 's', minimum: PISTON_RECORDING_DURATION_RANGE_S.minimum,
    maximum: PISTON_RECORDING_DURATION_RANGE_S.maximum, precision: 3,
  },
];

const isEditableIdealAcquisitionSetting = (key: NumericParameterDefinition['key']) => (
  key === 'triggerThresholdKpa' || key === 'recordingDurationS'
);

const advancedGroups: Array<{
  titleKey: 'thermal' | 'sensor' | 'release';
  definitions: NumericParameterDefinition[];
}> = [
  {
    titleKey: 'thermal',
    definitions: [
      { key: 'equivalentLinearLossNsPerM', label: { 'zh-CN': '活塞基础阻尼', 'zh-TW': '活塞基礎阻尼', en: 'Baseline piston damping' }, unit: 'N·s/m', minimum: 0, maximum: 10, precision: 3 },
      { key: 'thermalRelaxationTimeS', label: { 'zh-CN': '气体温差衰减时间', 'zh-TW': '氣體溫差衰減時間', en: 'Gas temperature difference decay time' }, unit: 's', minimum: 0.001, maximum: 5, precision: 4 },
      { key: 'heatFlowLagTimeS', label: { 'zh-CN': '近壁传热响应时间', 'zh-TW': '近壁傳熱響應時間', en: 'Near-wall heat transfer response time' }, unit: 's', minimum: 0.0005, maximum: 0.05, precision: 4 },
    ],
  },
  {
    titleKey: 'sensor',
    definitions: [
      { key: 'sensorResponseTimeS', label: { 'zh-CN': '传感器响应时间', 'zh-TW': '感測器響應時間', en: 'Sensor response time' }, unit: 's', minimum: 0.0001, maximum: 1, precision: 4 },
    ],
  },
  {
    titleKey: 'release',
    definitions: [
      {
        key: 'releaseGapOverrideMs',
        label: { 'zh-CN': '松手时间差', 'zh-TW': '鬆手時間差', en: 'Release-time gap' },
        unit: 'ms',
        ...PISTON_OSCILLATION_FREE_PARAMETER_RANGES.releaseGapOverrideMs,
        nullable: true,
      },
      {
        key: 'releaseMaximumExtraLossNsPerM',
        label: { 'zh-CN': '松手附加阻尼系数', 'zh-TW': '鬆手附加阻尼係數', en: 'Additional release damping coefficient' },
        unit: 'N·s/m',
        ...PISTON_OSCILLATION_FREE_PARAMETER_RANGES.releaseMaximumExtraLossNsPerM,
        precision: 2,
      },
    ],
  },
];

const formatValue = (value: number | null | undefined, precision?: number) => (
  value == null ? '' : (precision === undefined ? value : Number(value.toFixed(precision))).toString()
);

const parseDefinitionValue = (
  raw: string,
  definition: NumericParameterDefinition,
) => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return definition.nullable ? null : undefined;
  const value = Number(trimmed);
  if (!Number.isFinite(value)
    || value < definition.minimum
    || value > definition.maximum
    || (definition.integer && !Number.isSafeInteger(value))
    || (definition.key === 'recordingDurationS' && !isPistonRecordingDurationS(value))) return undefined;
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
  onExperimentSchemeChange: (scheme: PistonOscillationExperimentScheme) => void;
  onGasTypeChange: (gasType: PistonOscillationGasType) => void;
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
  onExperimentSchemeChange,
  onGasTypeChange,
  onLockedInteraction,
}: PistonOscillationParameterPanelProps) => {
  const copy = text[language];
  const effects = parameterEffects[language];
  const parameters = useMemo(
    () => ({
      recordingDurationS: PISTON_DEFAULT_RECORDING_DURATION_S,
      ...getPistonOscillationFreeEffectiveParameters(session),
    }),
    [session.experimentGroup, session.parameterDraft],
  );
  const freeMode = mode === 'free';
  const conditionLocked = !freeMode
    || isPistonOscillationFreeExperimentLocked(session);
  const idealReadonly = freeMode && session.experimentGroup.scheme === 'ideal';
  const physicsLocked = conditionLocked || idealReadonly;
  const isNumberRowLocked = (key: NumericParameterDefinition['key']) => (
    conditionLocked || (idealReadonly && !isEditableIdealAcquisitionSetting(key))
  );
  const profileImplemented = isPistonOscillationFreeExperimentProfileImplemented(
    session.experimentGroup,
  );
  const lockMessage = !freeMode
    ? getPistonOscillationParameterSidebarFreeOnlyMessage(language)
    : getPistonOscillationParameterLockMessage(session, language);
  const physicsLockMessage = idealReadonly ? copy.idealReadonly : lockMessage;
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
      formatValue(parameters[definition.key], definition.precision),
    ])));
    setBasicErrors({});
  }, [basic, parameters]);

  useEffect(() => {
    if (!advancedOpen) return;
    const definitions = advancedGroups.flatMap((group) => group.definitions);
    setAdvancedDrafts(Object.fromEntries(definitions.map((definition) => [
      definition.key,
      formatValue(parameters[definition.key], definition.precision),
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
    if (isNumberRowLocked(definition.key)) return;
    const raw = basicDrafts[definition.key]
      ?? formatValue(parameters[definition.key], definition.precision);
    const parsed = parseDefinitionValue(raw, definition);
    if (parsed === undefined) {
      setBasicErrors((current) => ({ ...current, [definition.key]: copy.invalid }));
      setBasicDrafts((current) => ({
        ...current,
        [definition.key]: formatValue(
          parameters[definition.key],
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
      const current = formatValue(parameters[definition.key], definition.precision);
      const raw = advancedDrafts[definition.key] ?? current;
      if (raw === current) continue;
      const parsed = parseDefinitionValue(raw, definition);
      if (parsed === undefined) {
        errors[definition.key] = copy.invalid;
      } else {
        (next[definition.key] as number | null) = parsed;
      }
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
      ?? formatValue(parameters[definition.key], definition.precision);
    const error = errors[definition.key];
    const rowLocked = isNumberRowLocked(definition.key);
    return (
      <div
        key={definition.key}
        className={`studio-heat-free-param-row ${rowLocked ? 'studio-heat-free-param-row-locked' : ''} ${error ? 'studio-heat-free-param-row-error' : ''}`}
        data-piston-oscillation-param-id={definition.key}
        title={rowLocked ? physicsLockMessage : undefined}
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
              aria-label={definition.label[language]}
              disabled={rowLocked}
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
                      parameters[definition.key],
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
    checked: boolean | 'mixed',
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
          aria-label={label}
          checked={checked === true}
          ref={(input) => {
            if (input) input.indeterminate = checked === 'mixed';
          }}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{checked === 'mixed' ? copy.partiallyOn : checked ? copy.on : copy.off}</span>
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
        className={`studio-heat-free-params ${conditionLocked ? 'is-locked' : ''}`}
        data-piston-oscillation-parameter-panel="true"
        aria-disabled={conditionLocked}
        title={conditionLocked ? lockMessage : undefined}
        onPointerDownCapture={(event) => {
          if (!conditionLocked) return;
          const target = event.target instanceof Element ? event.target : null;
          if (target?.closest('[data-piston-oscillation-param-id="operationVisualizationEnabled"]')) return;
          if (target?.closest('[data-heat-capacity-param-help-button="true"]')) return;
          event.preventDefault();
          onLockedInteraction?.();
        }}
      >
        <div className={`studio-heat-free-default-row ${conditionLocked ? 'studio-heat-free-default-row-locked' : ''}`}>
          {freeMode ? (
            <button
              type="button"
              className={`studio-heat-free-scheme-button ${session.experimentGroup.scheme === 'ideal' ? 'studio-heat-free-scheme-button-active' : ''} ${conditionLocked ? 'studio-heat-free-scheme-button-locked' : ''}`}
              data-piston-oscillation-scheme={session.experimentGroup.scheme}
              disabled={conditionLocked}
              aria-pressed={session.experimentGroup.scheme === 'ideal'}
              title={conditionLocked ? lockMessage : copy.schemeHelp}
              onClick={() => onExperimentSchemeChange(
                session.experimentGroup.scheme === 'ideal' ? 'real' : 'ideal',
              )}
            >
              <span>
                {session.experimentGroup.scheme === 'ideal' ? copy.ideal : copy.real}
              </span>
            </button>
          ) : null}
          <button
            type="button"
            className="studio-heat-free-default-button"
            disabled={physicsLocked}
            title={physicsLocked ? physicsLockMessage : copy.restore}
            onClick={() => setRestoreOpen(true)}
          >
            <RotateCcw size={13} />
            <span>{copy.restore}</span>
          </button>
        </div>
        {freeMode ? (
          <div
            className={`studio-heat-free-param-row studio-heat-free-gas-type-row ${conditionLocked ? 'studio-heat-free-param-row-locked' : ''}`}
            data-piston-oscillation-param-id="gasType"
          >
            {renderParameterLabel('gasType', copy.gasType, copy.gasHelp)}
            <span
              className={`studio-heat-free-gas-type-control studio-heat-free-gas-type-control-${session.experimentGroup.gasMaterialSnapshot.gasType}`}
              role="group"
              aria-label={copy.gasType}
            >
              <span className="studio-heat-free-gas-type-thumb" aria-hidden="true" />
              {(['air', 'helium'] as const).map((gasType) => (
                <button
                  key={gasType}
                  type="button"
                  className="studio-heat-free-gas-type-option"
                  data-piston-oscillation-gas-type={gasType}
                  aria-pressed={session.experimentGroup.gasMaterialSnapshot.gasType === gasType}
                  aria-disabled={conditionLocked}
                  disabled={conditionLocked}
                  title={conditionLocked ? lockMessage : copy.gasHelp}
                  onClick={() => onGasTypeChange(gasType)}
                >
                  <span>{gasType === 'helium' ? copy.helium : copy.air}</span>
                </button>
              ))}
            </span>
          </div>
        ) : null}
        {idealReadonly ? (
          <div className="studio-panel-note" data-piston-oscillation-ideal-readonly="true">
            {copy.idealReadonly}
          </div>
        ) : null}
        {!profileImplemented ? (
          <div className="studio-panel-note" data-piston-oscillation-profile-pending="true">
            {copy.profilePending}
          </div>
        ) : null}
        {basic.slice(0, 2).map((definition) => renderNumberRow(definition, 'basic'))}
        {renderCheckbox(
          copy.observationDisturbance,
          parameters.sensorFluctuationEnabled === parameters.tailIrregularityEnabled
            ? parameters.sensorFluctuationEnabled
            : 'mixed',
          physicsLocked,
          (enabled) => onParameterDraftChange({
            ...parameters,
            sensorFluctuationEnabled: enabled,
            tailIrregularityEnabled: enabled,
          }),
          'observationDisturbance',
          effects.observationDisturbance,
        )}
        {basic.slice(2).map((definition) => renderNumberRow(definition, 'basic'))}
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
            title={physicsLocked ? physicsLockMessage : copy.advanced}
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
