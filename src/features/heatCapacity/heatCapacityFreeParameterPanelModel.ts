import {
  getHeatCapacityFreeGasTypeGamma,
  type HeatCapacityFreeGasType,
  type HeatCapacityFreeParameterDraft,
} from '../../domain/heatCapacity/heatCapacityFreeParameterConfig.ts';

export type HeatCapacityParameterLanguage = 'zh-CN' | 'zh-TW' | 'en';

export type HeatCapacityFreeDraftNumberKey = {
  [Key in keyof HeatCapacityFreeParameterDraft]: HeatCapacityFreeParameterDraft[Key] extends number ? Key : never;
}[keyof HeatCapacityFreeParameterDraft];

export type HeatCapacityFreeBasicCheckboxKey =
  | 'leakageEnabled'
  | 'instrumentNoiseEnabled'
  | 'hardSphereViewEnabled';

export type HeatCapacityFreeParameterSymbolPart = string | { sub: string };

export type HeatCapacityFreeAdvancedParameterGroupId =
  | 'thermalExchange'
  | 'nonIdealCorrection'
  | 'recordCriteria';

export interface HeatCapacityFreeNumberParameterDefinition {
  id: HeatCapacityFreeDraftNumberKey;
  group?: HeatCapacityFreeAdvancedParameterGroupId;
  label: Record<HeatCapacityParameterLanguage, string>;
  parts: HeatCapacityFreeParameterSymbolPart[];
  unit: string;
  effect: Record<HeatCapacityParameterLanguage, string>;
  precision: number;
  min: number;
  max?: number;
  toInputValue?: (draftValue: number) => number;
  fromInputValue?: (inputValue: number) => number;
}

export interface HeatCapacityFreeAdvancedParameterGroupDefinition {
  id: HeatCapacityFreeAdvancedParameterGroupId;
  title: Record<HeatCapacityParameterLanguage, string>;
}

export interface HeatCapacityFreeCheckboxDefinition {
  id: HeatCapacityFreeBasicCheckboxKey;
  label: Record<HeatCapacityParameterLanguage, string>;
  parts: HeatCapacityFreeParameterSymbolPart[];
  onText: Record<HeatCapacityParameterLanguage, string>;
  offText: Record<HeatCapacityParameterLanguage, string>;
  effect: Record<HeatCapacityParameterLanguage, string>;
}

export interface HeatCapacityFreeGasTypeOptionDefinition {
  id: HeatCapacityFreeGasType;
  label: Record<HeatCapacityParameterLanguage, string>;
  help: Record<HeatCapacityParameterLanguage, string>;
  theoreticalGamma: number;
}

export type HeatCapacityFreeParameterLockReasonId =
  | 'freeModeOnly'
  | 'runningOrPaused'
  | 'powerOffBeforeNextGroup'
  | 'batchStarted'
  | 'groupStarted';

export const heatCapacityFreeParameterLockText: Record<
  HeatCapacityFreeParameterLockReasonId,
  Record<HeatCapacityParameterLanguage, string>
> = {
  freeModeOnly: {
    'zh-CN': '只有自由实验模式可以调整参数。',
    'zh-TW': '只有自由實驗模式可以調整參數。',
    en: 'Only Free Mode can adjust parameters.',
  },
  runningOrPaused: {
    'zh-CN': '当前实验正在运行或暂停，参数已锁定。',
    'zh-TW': '目前實驗正在執行或暫停，參數已鎖定。',
    en: 'The current experiment is running or paused, so parameters are locked.',
  },
  powerOffBeforeNextGroup: {
    'zh-CN': '请先关闭电源，完成本组实验后再调整参数。',
    'zh-TW': '請先關閉電源，完成本組實驗後再調整參數。',
    en: 'Turn off power first, then adjust parameters after this group is complete.',
  },
  batchStarted: {
    'zh-CN': '本轮实验已开始，所有实验组共用同一组参数；重新开始本轮后才能调整。',
    'zh-TW': '本輪實驗已開始，所有實驗組共用同一組參數；重新開始本輪後才能調整。',
    en: 'This batch has started. All groups share one parameter set; restart the batch to edit it.',
  },
  groupStarted: {
    'zh-CN': '当前实验组已开始，参数已锁定。',
    'zh-TW': '目前實驗組已開始，參數已鎖定。',
    en: 'The current experiment group has started, so parameters are locked.',
  },
};

export const heatCapacityFreeSharedText = {
  gasTypeLabel: {
    'zh-CN': '气体类型',
    'zh-TW': '氣體類型',
    en: 'Gas type',
  },
  gasTypeLocked: {
    'zh-CN': '本文件已有自由实验记录，气体类型已锁定。',
    'zh-TW': '本檔案已有自由實驗記錄，氣體類型已鎖定。',
    en: 'This file already has Free Mode records, so the gas type is locked.',
  },
  advancedTitle: {
    'zh-CN': '高级参数',
    'zh-TW': '進階參數',
    en: 'Advanced Parameters',
  },
  advancedOpen: {
    'zh-CN': '高级参数',
    'zh-TW': '進階參數',
    en: 'Advanced',
  },
  restoreDefault: {
    'zh-CN': '恢复默认',
    'zh-TW': '恢復預設',
    en: 'Restore default',
  },
  realSimulation: {
    'zh-CN': '真实模拟',
    'zh-TW': '真實模擬',
    en: 'Real Simulation',
  },
  idealProfile: {
    'zh-CN': '理想状态',
    'zh-TW': '理想狀態',
    en: 'Ideal State',
  },
  idealProfileLockedHint: {
    'zh-CN': '该实验文件已经有进程或实验组，真实模拟 / 理想状态只能在新建的自由实验文件中切换。',
    'zh-TW': '此實驗檔案已經有進程或實驗組，真實模擬 / 理想狀態只能在新建的自由實驗檔案中切換。',
    en: 'This experiment file already has progress or experiment groups. Real Simulation / Ideal State can only be changed in a newly created Free Mode file.',
  },
  idealProfileReadonlyNote: {
    'zh-CN': '理想状态下，普通参数和高级参数由系统按理想过程自动设定，暂不可编辑。',
    'zh-TW': '理想狀態下，普通參數和進階參數由系統按理想過程自動設定，暫不可編輯。',
    en: 'In Ideal State, basic and advanced parameters are set automatically by the ideal process and cannot be edited.',
  },
  idealProfileReadonlyToast: {
    'zh-CN': '理想状态下参数由系统自动设定。',
    'zh-TW': '理想狀態下參數由系統自動設定。',
    en: 'Parameters are automatically set in Ideal State.',
  },
  idealProfileIntroTitle: {
    'zh-CN': '确认开启理想状态',
    'zh-TW': '確認開啟理想狀態',
    en: 'Enable Ideal State',
  },
  idealProfileIntroBody: {
    'zh-CN': '理想状态用于体验完全理想条件下的空气比热容比实验流程。开启后，普通参数和高级参数由系统按理想过程自动设定，暂不可编辑。如需回到真实模拟，再次点击此按钮即可。',
    'zh-TW': '理想狀態用於體驗完全理想條件下的空氣比熱容比實驗流程。開啟後，普通參數和進階參數由系統按理想過程自動設定，暫不可編輯。如需回到真實模擬，再次點擊此按鈕即可。',
    en: 'Ideal State lets you experience the heat-capacity ratio experiment under fully idealized conditions. Basic and advanced parameters are set automatically by the ideal process and cannot be edited. Click this button again to return to Real Simulation.',
  },
  confirmEnableIdealProfile: {
    'zh-CN': '确认开启',
    'zh-TW': '確認開啟',
    en: 'Enable',
  },
  restoreDefaultTitle: {
    'zh-CN': '确认恢复默认参数',
    'zh-TW': '確認恢復預設參數',
    en: 'Confirm Restore Defaults',
  },
  restoreDefaultBody: {
    'zh-CN': '这会把普通参数和高级参数全部恢复为默认值，当前手动调整会被覆盖。',
    'zh-TW': '這會把普通參數和進階參數全部恢復為預設值，目前手動調整會被覆蓋。',
    en: 'This restores all basic and advanced parameters to their defaults and overwrites current manual edits.',
  },
  confirmRestoreDefault: {
    'zh-CN': '确认恢复',
    'zh-TW': '確認恢復',
    en: 'Restore',
  },
  cancel: {
    'zh-CN': '取消',
    'zh-TW': '取消',
    en: 'Cancel',
  },
  save: {
    'zh-CN': '保存',
    'zh-TW': '儲存',
    en: 'Save',
  },
  confirm: {
    'zh-CN': '确认',
    'zh-TW': '確認',
    en: 'Confirm',
  },
  riskTitle: {
    'zh-CN': '确认调整高级参数',
    'zh-TW': '確認調整進階參數',
    en: 'Confirm Advanced Parameter Changes',
  },
  riskBody: {
    'zh-CN': '高级参数会影响当前实验文件的模型判定、传感器读数和记录阈值。确认后，本实验文件后续打开高级参数不再重复提示。',
    'zh-TW': '進階參數會影響目前實驗檔案的模型判定、感測器讀數和記錄閾值。確認後，本實驗檔案後續開啟進階參數不再重複提示。',
    en: "Advanced parameters affect this experiment file's model checks, sensor readings, and record thresholds. After confirmation, this file will not ask again when Advanced Parameters are opened.",
  },
  invalidNumber: {
    'zh-CN': '请输入合法数值。',
    'zh-TW': '請輸入合法數值。',
    en: 'Enter a valid number.',
  },
  valueTooSmall: {
    'zh-CN': '数值不能小于下限。',
    'zh-TW': '數值不能小於下限。',
    en: 'Value is below the minimum.',
  },
  valueTooLarge: {
    'zh-CN': '已超过可用上限。',
    'zh-TW': '已超過可用上限。',
    en: 'Value exceeds the usable upper limit.',
  },
} as const;

export const heatCapacityFreeGasTypeOptions: HeatCapacityFreeGasTypeOptionDefinition[] = [
  {
    id: 'air',
    label: { 'zh-CN': '空气', 'zh-TW': '空氣', en: 'Air' },
    help: {
      'zh-CN': '空气：近似双原子分子，理论 γ = 1.400。',
      'zh-TW': '空氣：近似雙原子分子，理論 γ = 1.400。',
      en: 'Air: approximated as a diatomic gas, theoretical γ = 1.400.',
    },
    theoreticalGamma: getHeatCapacityFreeGasTypeGamma('air'),
  },
  {
    id: 'helium',
    label: { 'zh-CN': '氦气', 'zh-TW': '氦氣', en: 'Helium' },
    help: {
      'zh-CN': '氦气：单原子分子，理论 γ = 1.667。',
      'zh-TW': '氦氣：單原子分子，理論 γ = 1.667。',
      en: 'Helium: a monatomic gas, theoretical γ = 1.667.',
    },
    theoreticalGamma: getHeatCapacityFreeGasTypeGamma('helium'),
  },
];

export const heatCapacityFreeBasicNumberParameters: HeatCapacityFreeNumberParameterDefinition[] = [
  {
    id: 'ambientPressureKPa',
    label: { 'zh-CN': '大气压', 'zh-TW': '大氣壓', en: 'Atmospheric pressure' },
    parts: ['P', { sub: '0' }],
    unit: 'kPa',
    effect: {
      'zh-CN': '作为环境压力基准，影响初始压力、压力换算和自由实验修正量。',
      'zh-TW': '作為環境壓力基準，影響初始壓力、壓力換算和自由實驗修正量。',
      en: 'Sets the ambient pressure baseline for initial pressure, conversion, and corrections.',
    },
    precision: 2,
    min: 0.001,
  },
  {
    id: 'ambientTemperatureK',
    label: { 'zh-CN': '环境温度', 'zh-TW': '環境溫度', en: 'Ambient temperature' },
    parts: ['t', { sub: '0' }],
    unit: '℃',
    effect: {
      'zh-CN': '以摄氏度设置初始热平衡温度和回温目标；底层模型仍以 K 计算。',
      'zh-TW': '以攝氏度設定初始熱平衡溫度和回溫目標；底層模型仍以 K 計算。',
      en: 'Sets the initial equilibrium temperature and recovery target in Celsius; the model still computes in K.',
    },
    precision: 2,
    min: -273.14,
    toInputValue: (kelvin) => kelvin - 273.15,
    fromInputValue: (celsius) => celsius + 273.15,
  },
];

export const heatCapacityFreeBasicCheckboxes: HeatCapacityFreeCheckboxDefinition[] = [
  {
    id: 'leakageEnabled',
    label: { 'zh-CN': '泄漏', 'zh-TW': '洩漏', en: 'Leakage' },
    parts: [],
    onText: { 'zh-CN': '开', 'zh-TW': '開', en: 'On' },
    offText: { 'zh-CN': '关', 'zh-TW': '關', en: 'Off' },
    effect: {
      'zh-CN': '勾选后启用慢速泄漏，未勾选时密封。',
      'zh-TW': '勾選後啟用慢速洩漏，未勾選時密封。',
      en: 'Enables slow leakage when checked; leaves the vessel sealed when unchecked.',
    },
  },
  {
    id: 'instrumentNoiseEnabled',
    label: { 'zh-CN': '仪器噪声', 'zh-TW': '儀器雜訊', en: 'Instrument noise' },
    parts: [],
    onText: { 'zh-CN': '开', 'zh-TW': '開', en: 'On' },
    offText: { 'zh-CN': '关', 'zh-TW': '關', en: 'Off' },
    effect: {
      'zh-CN': '勾选后读数叠加噪声，未勾选时有效噪声为 0。',
      'zh-TW': '勾選後讀數疊加雜訊，未勾選時有效雜訊為 0。',
      en: 'Adds sensor noise when checked; effective noise is zero when unchecked.',
    },
  },
  {
    id: 'hardSphereViewEnabled',
    label: { 'zh-CN': '小球可视化', 'zh-TW': '小球視覺化', en: 'Molecule visualization' },
    parts: [],
    onText: { 'zh-CN': '显示', 'zh-TW': '顯示', en: 'Shown' },
    offText: { 'zh-CN': '隐藏', 'zh-TW': '隱藏', en: 'Hidden' },
    effect: {
      'zh-CN': '只影响三维小球显示，不写入实验组物理参数快照。',
      'zh-TW': '只影響三維小球顯示，不寫入實驗組物理參數快照。',
      en: 'Controls only the 3D molecule display and is not written to the group physics snapshot.',
    },
  },
];

export const heatCapacityFreeAdvancedNumberParameters: HeatCapacityFreeNumberParameterDefinition[] = [
  {
    id: 'gasWallConductanceWPerK',
    group: 'thermalExchange',
    label: { 'zh-CN': '气体-屏壁导热系数', 'zh-TW': '氣體-屏壁導熱係數', en: 'Gas-wall conductance' },
    parts: [],
    unit: 'W/K',
    effect: {
      'zh-CN': '控制气体向容器壁传热的快慢。',
      'zh-TW': '控制氣體向容器壁傳熱的快慢。',
      en: 'Controls how quickly gas transfers heat to the vessel wall.',
    },
    precision: 3,
    min: 0,
    max: 5,
  },
  {
    id: 'wallAmbientConductanceWPerK',
    group: 'thermalExchange',
    label: { 'zh-CN': '屏壁-环境导热系数', 'zh-TW': '屏壁-環境導熱係數', en: 'Wall-ambient conductance' },
    parts: [],
    unit: 'W/K',
    effect: {
      'zh-CN': '控制容器壁向环境散热的快慢。',
      'zh-TW': '控制容器壁向環境散熱的快慢。',
      en: 'Controls how quickly the vessel wall dissipates heat to the environment.',
    },
    precision: 3,
    min: 0,
    max: 5,
  },
  {
    id: 'wallHeatCapacityJPerK',
    group: 'thermalExchange',
    label: { 'zh-CN': '屏壁热容', 'zh-TW': '屏壁熱容', en: 'Wall heat capacity' },
    parts: ['C', { sub: 'w' }],
    unit: 'J/K',
    effect: {
      'zh-CN': '决定容器壁温度变化的快慢。',
      'zh-TW': '決定容器壁溫度變化的快慢。',
      en: 'Controls how quickly the vessel wall temperature changes.',
    },
    precision: 2,
    min: 1,
    max: 5000,
  },
  {
    id: 'leakageRatePerS',
    group: 'nonIdealCorrection',
    label: { 'zh-CN': '泄漏速率', 'zh-TW': '洩漏速率', en: 'Leakage rate' },
    parts: [],
    unit: 's⁻¹',
    effect: {
      'zh-CN': '泄漏开关开启时，决定封闭状态下向环境压力双向平衡的速度。',
      'zh-TW': '洩漏開關開啟時，決定封閉狀態下向環境壓力雙向平衡的速度。',
      en: 'Sets how quickly a sealed vessel equalizes both ways toward ambient pressure when leakage is enabled.',
    },
    precision: 5,
    min: 0,
    max: 0.02,
  },
  {
    id: 'noiseMv',
    group: 'nonIdealCorrection',
    label: { 'zh-CN': '仪器噪声强度', 'zh-TW': '儀器雜訊強度', en: 'Noise amplitude' },
    parts: [],
    unit: 'mV',
    effect: {
      'zh-CN': '仪器噪声开关开启时，决定压力/温度读数抖动幅度。',
      'zh-TW': '儀器雜訊開關開啟時，決定壓力/溫度讀數抖動幅度。',
      en: 'Sets the reading jitter when instrument noise is enabled.',
    },
    precision: 3,
    min: 0,
  },
  {
    id: 'sensorLagTimeS',
    group: 'nonIdealCorrection',
    label: { 'zh-CN': '压强通道滞后时间', 'zh-TW': '壓強通道滯後時間', en: 'Pressure-channel lag time' },
    parts: [],
    unit: 's',
    effect: {
      'zh-CN': '决定压强读数追随真实压强的快慢；数值越大，压强读数越滞后。温度通道使用独立的共享传感器模型。',
      'zh-TW': '決定壓強讀數追隨真實壓強的快慢；數值越大，壓強讀數越滯後。溫度通道使用獨立的共享感測器模型。',
      en: 'Controls how slowly the pressure reading follows true pressure. The temperature channel uses its independent shared sensor model.',
    },
    precision: 3,
    min: 1 / 60,
    max: 100,
  },
  {
    id: 'u0ZeroToleranceMv',
    group: 'recordCriteria',
    label: { 'zh-CN': '零点记录容差', 'zh-TW': '零點記錄容差', en: 'Zero record tolerance' },
    parts: ['U', { sub: '0' }],
    unit: 'mV',
    effect: {
      'zh-CN': '决定 U0 记录时压力读数接近 0 的合格范围。',
      'zh-TW': '決定 U0 記錄時壓力讀數接近 0 的合格範圍。',
      en: 'Sets how close to zero the pressure reading must be for U0.',
    },
    precision: 3,
    min: 0,
  },
  {
    id: 'pressureStableSlopeMvPerS',
    group: 'recordCriteria',
    label: { 'zh-CN': '压力稳定斜率阈值', 'zh-TW': '壓力穩定斜率閾值', en: 'Pressure slope limit' },
    parts: [],
    unit: 'mV/s',
    effect: {
      'zh-CN': '决定压力读数足够平稳后才允许记录。',
      'zh-TW': '決定壓力讀數足夠平穩後才允許記錄。',
      en: 'Requires pressure readings to settle before recording.',
    },
    precision: 3,
    min: 0,
  },
  {
    id: 'temperatureStableSlopeMvPerS',
    group: 'recordCriteria',
    label: { 'zh-CN': '温度稳定斜率阈值', 'zh-TW': '溫度穩定斜率閾值', en: 'Temperature slope limit' },
    parts: [],
    unit: 'mV/s',
    effect: {
      'zh-CN': '决定温度读数足够平稳后才允许记录。',
      'zh-TW': '決定溫度讀數足夠平穩後才允許記錄。',
      en: 'Requires temperature readings to settle before recording.',
    },
    precision: 3,
    min: 0,
  },
  {
    id: 'temperatureAmbientToleranceMv',
    group: 'recordCriteria',
    label: { 'zh-CN': '环境温度容差', 'zh-TW': '環境溫度容差', en: 'Ambient temperature tolerance' },
    parts: [],
    unit: 'mV',
    effect: {
      'zh-CN': '决定温度是否已经回到环境附近。',
      'zh-TW': '決定溫度是否已經回到環境附近。',
      en: 'Sets how close temperature must be to ambient.',
    },
    precision: 3,
    min: 0,
  },
  {
    id: 'minimumUsefulU1CorrectedMv',
    group: 'recordCriteria',
    label: { 'zh-CN': '最小有效值', 'zh-TW': '最小有效值', en: 'Minimum useful U1' },
    parts: ['U', { sub: '1,min' }],
    unit: 'mV',
    effect: {
      'zh-CN': '防止打气不足时记录无效数据。',
      'zh-TW': '防止打氣不足時記錄無效資料。',
      en: 'Prevents recording invalid data when pumping is insufficient.',
    },
    precision: 2,
    min: 0,
  },
  {
    id: 'overVentedMinimumU2CorrectedMv',
    group: 'recordCriteria',
    label: { 'zh-CN': '最小有效值', 'zh-TW': '最小有效值', en: 'Minimum useful U2' },
    parts: ['U', { sub: '2,min' }],
    unit: 'mV',
    effect: {
      'zh-CN': '防止放气后压力读数异常或过低。',
      'zh-TW': '防止放氣後壓力讀數異常或過低。',
      en: 'Prevents accepting abnormal or too-low post-release readings.',
    },
    precision: 2,
    min: 0,
  },
  {
    id: 'pressureWarningMv',
    group: 'recordCriteria',
    label: { 'zh-CN': '建议停止阈值', 'zh-TW': '建議停止閾值', en: 'Suggested-stop threshold' },
    parts: ['U', { sub: 'warn' }],
    unit: 'mV',
    effect: {
      'zh-CN': '控制进入建议停止打气区的普通提示，不作为错误或报警。',
      'zh-TW': '控制進入建議停止打氣區的一般提示，不作為錯誤或警報。',
      en: 'Controls the ordinary suggested-stop hint, not an error or alarm.',
    },
    precision: 2,
    min: 0,
  },
  {
    id: 'pressureDangerMv',
    group: 'recordCriteria',
    label: { 'zh-CN': '压力危险阈值', 'zh-TW': '壓力危險閾值', en: 'Pressure danger threshold' },
    parts: ['U', { sub: 'danger' }],
    unit: 'mV',
    effect: {
      'zh-CN': '控制危险状态、禁止继续打气或记录失败边界；绝对压强最高受 300 kPa 可用上限保护。',
      'zh-TW': '控制危險狀態、禁止繼續打氣或記錄失敗邊界；絕對壓強最高受 300 kPa 可用上限保護。',
      en: 'Controls danger state, pumping block, and failed-record boundaries; absolute pressure is capped at 300 kPa.',
    },
    precision: 2,
    min: 0,
  },
];

export const heatCapacityFreeAdvancedParameterGroups: HeatCapacityFreeAdvancedParameterGroupDefinition[] = [
  {
    id: 'thermalExchange',
    title: { 'zh-CN': '热交换模型', 'zh-TW': '熱交換模型', en: 'Heat Exchange Model' },
  },
  {
    id: 'nonIdealCorrection',
    title: { 'zh-CN': '非理想过程修正', 'zh-TW': '非理想過程修正', en: 'Non-Ideal Corrections' },
  },
  {
    id: 'recordCriteria',
    title: { 'zh-CN': '记录判定与安全阈值', 'zh-TW': '記錄判定與安全閾值', en: 'Record Criteria and Safety Limits' },
  },
];

export const formatHeatCapacityFreeParameterValue = (
  value: number,
  precision: number,
) => {
  if (!Number.isFinite(value)) return '';
  const rounded = value.toFixed(precision);
  return rounded.replace(/\.?0+$/, '');
};

export const getHeatCapacityFreeParameterInputValue = (
  definition: HeatCapacityFreeNumberParameterDefinition,
  draftValue: number,
) => (
  definition.toInputValue ? definition.toInputValue(draftValue) : draftValue
);

export const getHeatCapacityFreeParameterDraftValue = (
  definition: HeatCapacityFreeNumberParameterDefinition,
  inputValue: number,
) => (
  definition.fromInputValue ? definition.fromInputValue(inputValue) : inputValue
);
