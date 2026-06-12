import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentPath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityInstrumentScene.tsx');
const autoDemoPath = join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityAutoDemo.ts');
const hardSphereTogglePath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityHardSphereToggle.tsx');
const hardSphereLayerPath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityHardSphereLayer.tsx');
const hardSphereModelPath = join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityHardSphereModel.ts');
const hardSphereSimulationPath = join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityHardSphereSimulation.ts');
const leftPanelPath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityLeftPanel.tsx');
const processReviewPanelPath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityProcessReviewPanel.tsx');
const processReviewStylePath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityProcessReviewPanel.css');
const processReviewStageScalePath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'heatCapacityProcessReviewStageScale.ts');
const trialModelPath = join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityTrialModel.ts');
const parameterConfigPath = join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityFreeParameterConfig.ts');
const workbenchPath = join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.tsx');
const statePath = join(process.cwd(), 'src', 'features', 'workbench', 'workbenchState.ts');
const sessionPath = join(process.cwd(), 'src', 'features', 'workbench', 'workbenchSession.ts');
const stylePath = join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.css');
const pressureGaugeContractPath = join(process.cwd(), 'docs', 'instrument-modeling', 'heat-capacity-pressure-gauge-contract.md');

assert.equal(existsSync(componentPath), true, 'heatCapacity instrument scene component should exist');
assert.equal(existsSync(pressureGaugeContractPath), true, 'shared Heat Capacity pressure gauge contract should exist');

const sceneSource = readFileSync(componentPath, 'utf8');
const orbitControlsSection = sceneSource.match(/<OrbitControls\s[\s\S]*?\/>/)?.[0] ?? '';
const stopcockSceneSection = sceneSource.match(/function GlassStopcock\([\s\S]*?function PressureBottle\(/)?.[0] ?? '';
const pumpValveSceneSection = sceneSource.match(/function PumpAssembly\([\s\S]*?function InstrumentSceneContent\(/)?.[0] ?? '';
const hoverTooltipSceneSection = sceneSource.match(/data-preview-overlay-item="heat-hover-tooltip"[\s\S]*?\{props\.overlayBottomRight/)?.[0] ?? '';
const autoDemoSource = readFileSync(autoDemoPath, 'utf8');
const hardSphereToggleSource = readFileSync(hardSphereTogglePath, 'utf8');
const hardSphereLayerSource = readFileSync(hardSphereLayerPath, 'utf8');
const hardSphereModelSource = readFileSync(hardSphereModelPath, 'utf8');
const hardSphereSimulationSource = readFileSync(hardSphereSimulationPath, 'utf8');
const leftPanelSource = readFileSync(leftPanelPath, 'utf8');
const processReviewPanelSource = readFileSync(processReviewPanelPath, 'utf8');
const processReviewStyleSource = readFileSync(processReviewStylePath, 'utf8');
const getProcessReviewCssBlock = (selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = processReviewStyleSource.match(new RegExp(`${escapedSelector}\\s*\\{[^}]*\\}`));
  assert.ok(match, `${selector} should have a process review CSS block`);
  return match[0];
};
const processReviewStageScaleSource = readFileSync(processReviewStageScalePath, 'utf8');
const freeRecordTableSection = leftPanelSource.match(/data-heat-capacity-free-record-table="true"[\s\S]*?<\/table>/)?.[0] ?? '';
const freeCurrentTrialSection = leftPanelSource.match(/data-heat-capacity-free-current-trial-status="true"[\s\S]*?<\/section>/)?.[0] ?? '';
const hardSphereToggleMountSection = sceneSource.match(/<HeatCapacityHardSphereToggle[\s\S]*?\/>/)?.[0] ?? '';
const trialModelSource = readFileSync(trialModelPath, 'utf8');
const parameterConfigSource = readFileSync(parameterConfigPath, 'utf8');
const stateSource = readFileSync(statePath, 'utf8');
const sessionSource = readFileSync(sessionPath, 'utf8');
const heatCapacityPersistencePath = join(process.cwd(), 'src', 'features', 'workbench', 'workbenchHeatCapacityPersistence.ts');
const heatCapacityPersistenceSource = readFileSync(heatCapacityPersistencePath, 'utf8');
const styleSource = readFileSync(stylePath, 'utf8');
const workbenchSource = readFileSync(workbenchPath, 'utf8');
const pressureGaugeContractSource = readFileSync(pressureGaugeContractPath, 'utf8');
const previewMountSection = workbenchSource.match(/data-heat-capacity-preview-mount="true"[\s\S]*?<HeatCapacityInstrumentScene/)?.[0] ?? '';
assert.match(
  pressureGaugeContractSource,
  /visualAngle = Math\.PI \/ 2 - modelAngle/,
  'shared pressure gauge contract should define the GLB front-view model-to-visual conversion',
);
assert.match(
  workbenchSource,
  /const collapseHeatCapacityFreeParameterSidebarForExperimentAction = (?:useCallback\(\(\) =>|\(\) =>) \{[\s\S]*?filesRef\.current\.find\(\(file\) => file\.id === activeFileIdRef\.current\)[\s\S]*?setParametersCollapsed\(true\)/,
  'Workbench should centralize heat-capacity free parameter auto-collapse behavior',
);
assert.match(
  workbenchSource,
  /updateHeatCapacityPower[\s\S]*?source === 'user'[\s\S]*?collapseHeatCapacityFreeParameterSidebarForExperimentAction\(\)/,
  'Turning heat-capacity power on from user action should collapse the parameter sidebar',
);
assert.match(
  workbenchSource,
  /const updateHeatCapacityPower = \(nextPowerOn\?: boolean[\s\S]*const resolvedPowerOn = nextPowerOn \?\? !file\.powerOn[\s\S]*powerHeatCapacityWorkbenchFile\(cleanFile, resolvedPowerOn, now\)/,
  'Fast 3D power-switch clicks should be able to toggle from the latest workbench file state instead of a stale scene prop',
);
assert.match(
  workbenchSource,
  /updateHeatCapacityStopcockOpen[\s\S]*?source === 'user'[\s\S]*?collapseHeatCapacityFreeParameterSidebarForExperimentAction\(\)/,
  'Changing stopcock from user action should collapse the parameter sidebar',
);
assert.match(
  workbenchSource,
  /const updateHeatCapacityStopcockOpen = \(nextOpen\?: boolean[\s\S]*const resolvedOpen = nextOpen \?\? getHeatCapacityStopcockState\(file\.stopcockAngleDeg\) !== 'open'[\s\S]*getHeatCapacityStopcockTargetAngle\(resolvedOpen\)/,
  'Fast 3D stopcock clicks should be able to toggle from the latest workbench file state instead of a stale scene prop',
);
assert.match(
  workbenchSource,
  /updateHeatCapacityPumpValve[\s\S]*?source === 'user'[\s\S]*?collapseHeatCapacityFreeParameterSidebarForExperimentAction\(\)/,
  'Changing pump valve from user action should collapse the parameter sidebar',
);
assert.match(
  workbenchSource,
  /pressHeatCapacityPumpBulb[\s\S]*?source === 'user'[\s\S]*?collapseHeatCapacityFreeParameterSidebarForExperimentAction\(\)/,
  'Pressing pump bulb from user action should collapse the parameter sidebar',
);
assert.match(
  workbenchSource,
  /recordFreeHeatCapacitySample[\s\S]*?collapseHeatCapacityFreeParameterSidebarForExperimentAction\(\)/,
  'Recording free heat-capacity readings should collapse the parameter sidebar',
);
assert.match(
  workbenchSource,
  /type HeatCapacityFocusSession = [\s\S]*?parametersCollapsedBeforeFocus[\s\S]*?nonReversibleAction/,
  'Workbench should keep a heat-capacity focus session snapshot for exit-time sidebar recovery',
);
assert.match(
  workbenchSource,
  /const updateHeatCapacityFocusMode = \(mode: 'none' \| 'stopcock' \| 'instrument' \| 'pump'\) => \{[\s\S]*?heatCapacityFocusSessionRef\.current[\s\S]*?setParametersCollapsed\(true\)/,
  'Entering heat-capacity focus mode should collapse the parameter sidebar and remember prior state',
);
assert.match(
  workbenchSource,
  /exitHeatCapacityFocusMode[\s\S]*?heatCapacityFocusSessionRef\.current[\s\S]*?setParametersCollapsed\(false\)/,
  'Exiting focus mode without meaningful experiment impact should restore a previously open parameter sidebar',
);
assert.match(
  workbenchSource,
  /onFocusModeChange=\{updateHeatCapacityFocusMode\}/,
  'Heat-capacity scene focus changes should flow through the workbench focus-session policy',
);
assert.match(
  workbenchSource,
  /pressHeatCapacityPumpBulb[\s\S]*?source === 'user'[\s\S]*?markHeatCapacityFocusSessionNonReversible\(\)/,
  'Pressing the pump bulb in focus mode should mark the focus session as experimentally meaningful',
);
assert.match(
  workbenchSource,
  /recordFreeHeatCapacitySample[\s\S]*?if \(attempt\.accepted\) \{[\s\S]*?markHeatCapacityFocusSessionNonReversible\(\)/,
  'Accepted U0/U1/U2 records in focus mode should prevent sidebar restoration on exit',
);
assert.match(
  workbenchSource,
  /shouldPromptHeatCapacityFreePowerOffBeforeNextGroup\(activeFile\)[\s\S]*?heatCapacityRealtimeCopy\.freePowerOffBeforeNextGroup/,
  'Right parameter rail should prompt for power-off only after all three Free Mode record buttons have accepted data',
);
assert.match(
  stateSource,
  /shouldPromptHeatCapacityFreePowerOffBeforeNextGroup/,
  'Free Mode power-off completion prompt should come from shared workbench state helpers',
);
assert.match(processReviewPanelSource, /pumpValve:\s*'#14804f'/, 'process review should color pump valve as green so it is visually distinct from pump bulb');
assert.match(processReviewPanelSource, /pumpBulb:\s*'#0b6fae'/, 'process review should color pump bulb as blue so it is visually distinct from pump valve');
assert.doesNotMatch(
  processReviewPanelSource,
  /hpr-pump-event-marker/,
  'process review charts should not draw full-height pump-stroke guide lines over the plot area',
);
assert.doesNotMatch(
  processReviewStyleSource,
  /\.hpr-pump-event-marker/,
  'process review styles should remove the old full-height pump-stroke marker rule',
);
assert.doesNotMatch(
  getProcessReviewCssBlock('.hpr-summary'),
  /border-left:\s*3px/,
  'process review summary should not keep a decorative left accent rail',
);
assert.doesNotMatch(
  getProcessReviewCssBlock('.hpr-ideal-reference-summary'),
  /border-left:/,
  'ideal reference summary should not keep a decorative orange left accent rail',
);
assert.doesNotMatch(
  getProcessReviewCssBlock('.hpr-diagnosis-details'),
  /border-left:/,
  'expanded diagnosis details should not keep a decorative left accent rail',
);
assert.match(
  processReviewStyleSource,
  /\.studio-theme-light \.hpr-panel,\s*\.studio-theme-light \.hpr-empty\s*\{[\s\S]*--hpr-process-note-bg:/,
  'process review should define dedicated light-theme note surfaces for the redesigned engineering summary',
);
assert.match(
  getProcessReviewCssBlock('.hpr-ideal-reference-summary'),
  /grid-template-columns:\s*auto minmax\(0,\s*1fr\)/,
  'ideal reference summary should use a compact inline engineering layout',
);
assert.match(
  processReviewPanelSource,
  /type HeatCapacityProcessReviewLanguage = 'zh-CN' \| 'zh-TW' \| 'en';/,
  'process review panel should accept the Workbench language preference for new visible copy',
);
assert.match(
  processReviewPanelSource,
  /const heatCapacityProcessReviewCopy: Record<HeatCapacityProcessReviewLanguage,/,
  'process review panel should keep new review labels in a localized copy map',
);
assert.match(
  processReviewPanelSource,
  /zh-TW[\s\S]*idealReference:\s*'理想參考'[\s\S]*en:[\s\S]*idealReference:\s*'Ideal reference'/,
  'ideal reference review copy should cover Traditional Chinese and English',
);
assert.match(
  processReviewPanelSource,
  /stageLabels:\s*Record<HeatCapacityProcessStageId,\s*string>/,
  'process review timeline stage labels should be localized by stage id',
);
assert.match(
  processReviewPanelSource,
  /recordTimeLabel[\s\S]*recordTitle/,
  'process review record callouts should keep their static labels in the localized copy map',
);
assert.match(
  processReviewPanelSource,
  /en:[\s\S]*timelineTitle:\s*'Stage timeline'[\s\S]*recordTimeLabel:\s*'Record time'[\s\S]*processTitle:\s*'Process diagnostics'/,
  'process review English copy should cover the new timeline, record, and diagnostics shell',
);
assert.match(
  workbenchSource,
  /<HeatCapacityProcessReviewPanel[\s\S]*language=\{settingsLanguagePreference\}/,
  'Workbench should pass the persisted language preference into Heat Capacity process review',
);
assert.match(hardSphereToggleSource, /label:\s*'微观可视化'/, 'Simplified Chinese hard-sphere toggle label should be readable');
assert.match(hardSphereToggleSource, /zh-TW[\s\S]*label:\s*'微觀可視化'/, 'Traditional Chinese hard-sphere toggle label should be readable');
assert.match(hardSphereToggleSource, /tooltipOff:\s*'开启瓶内小球分子可视化，用于观察分子运动、密度和速度变化。'/, 'Simplified Chinese hard-sphere enable tooltip should be localized');
assert.match(hardSphereToggleSource, /tooltipOn:\s*'关闭瓶内小球分子可视化。该显示仅用于教学解释，不参与数据计算。'/, 'Simplified Chinese hard-sphere disable tooltip should be localized');
assert.doesNotMatch(hardSphereToggleSource, /寰|闁|鍏|鍚|鐡|瑙|瀛|鈥|锛|銆/, 'hard-sphere toggle copy should not contain mojibake');
assert.match(
  previewMountSection,
  /target\?\.closest\('\[data-heat-capacity-hard-sphere-toggle="true"\]'\)\) return;[\s\S]*autoDemoInteractionLocked[\s\S]*target\?\.closest\('\[data-heat-capacity-hard-sphere-toggle="true"\]'\)\) return;[\s\S]*autoDemoInteractionLocked/,
  'preview lock interception should explicitly exempt the hard-sphere toggle for pointer and mouse interactions',
);
assert.match(
  styleSource,
  /\[data-preview-overlay-item="heat-parent-top-right"\]\s*\{[\s\S]*pointer-events:\s*none/,
  'top-right overlay wrapper should not cover the hard-sphere toggle with an invisible full-width hit area',
);
assert.match(
  styleSource,
  /\[data-preview-overlay-item="heat-parent-top-right"\]\s*>\s*\*\s*\{[\s\S]*pointer-events:\s*auto/,
  'top-right overlay wrapper should restore pointer events only on its real child panel',
);
assert.match(
  styleSource,
  /\.studio-heat-advanced-risk-window strong \{[\s\S]*color:\s*var\(--studio-action-warning-bg\)\s*!important/,
  'Advanced-parameter risk title should use the same orange token as the warning confirm button',
);
assert.match(
  styleSource,
  /\.studio-theme-light \.studio-heat-advanced-risk-window strong \{[\s\S]*color:\s*var\(--studio-action-warning-bg\)\s*!important/,
  'Light theme advanced-parameter risk title should also match the warning confirm button background',
);
assert.doesNotMatch(
  orbitControlsSection,
  /target=\{DEFAULT_CAMERA_TARGET\}/,
  'OrbitControls should not re-apply the default camera target during hover-driven React rerenders',
);
assert.doesNotMatch(
  sceneSource,
  /props\.onFocusModeChange\(focusMode\);\s*\}, \[focusMode, props\.onFocusModeChange\]\)/,
  'Heat-capacity focus reporting should not loop when the parent callback identity changes after a state update',
);
assert.match(
  workbenchSource,
  /studio-tree-title-button studio-tree-title-button-\$\{kind\}/,
  'sidebar tree title buttons should expose a scoped kind modifier for visual annotation changes',
);
assert.doesNotMatch(
  hardSphereToggleMountSection,
  /interactionLocked/,
  'hard-sphere visualization toggle should not be disabled by auto-demo interaction lock',
);
assert.match(
  hardSphereToggleMountSection,
  /enabled=\{hardSphereViewActive\}/,
  'hard-sphere visualization toggle should show the effective particle-layer state',
);
assert.match(
  hardSphereToggleMountSection,
  /disabled=\{props\.hardSphereViewLocked\}/,
  'hard-sphere visualization toggle should be disabled only by the Free Mode parameter lock',
);
assert.doesNotMatch(
  hardSphereToggleMountSection,
  /hardSphereViewUnavailable/,
  'Ultra GLB should not disable the hard-sphere visualization toggle now that it has its own cylinder container',
);
assert.match(
  hardSphereLayerSource,
  /stepHeatCapacityHardSphereKineticSpeed/,
  'hard-sphere layer should smooth molecule motion speed separately from the temperature color mapping',
);
assert.match(
  hardSphereLayerSource,
  /thermalSpeedMultiplier:\s*kineticSpeedState\.speed/,
  'hard-sphere simulation should receive the kinetic speed buffer instead of the immediate temperature speed',
);
assert.doesNotMatch(
  hardSphereLayerSource,
  /thermalSpeedMultiplier:\s*currentVisual\.thermalSpeedMultiplier/,
  'hard-sphere simulation should not hard-cut particle motion speed when the gas temperature changes abruptly',
);
const asciiSubscriptPattern = /U_[0-9TtPp]/;
const getCssBlock = (selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = styleSource.match(new RegExp(`${escapedSelector}\\s*\\{[^}]*\\}`));
  assert.ok(match, `${selector} should have a CSS block`);
  return match[0];
};
const getLastCssBlock = (selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...styleSource.matchAll(new RegExp(`${escapedSelector}\\s*\\{[^}]*\\}`, 'g'))];
  assert.ok(matches.length > 0, `${selector} should have a CSS block`);
  return matches[matches.length - 1][0];
};
const getLastRootCssBlock = (selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...styleSource.matchAll(new RegExp(`(?:^|\\n)${escapedSelector}\\s*\\{[^}]*\\}`, 'g'))];
  assert.ok(matches.length > 0, `${selector} should have a root CSS block`);
  return matches[matches.length - 1][0];
};
const getRootCssBlock = (selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = styleSource.match(new RegExp(`(?:^|\\n)${escapedSelector}\\s*\\{[^}]*\\}`));
  assert.ok(match, `${selector} should have a root CSS block`);
  return match[0];
};
assert.match(
  getLastRootCssBlock('.studio-heat-materials-toolbar'),
  /min-height:\s*44px;[\s\S]*border-bottom:\s*0;[\s\S]*padding:\s*0 16px;/,
  'heat materials window title bar should have enough room and should not visually merge with the tab row',
);
assert.match(
  getRootCssBlock('.studio-results-window'),
  /box-shadow:\s*none;/,
  'standard and heat-capacity result windows should use plain panel borders instead of floating shadows',
);
assert.match(
  getRootCssBlock('.studio-ideal-result-window-layer'),
  /box-shadow:\s*none;/,
  'ideal-gas result windows should match same-level result panels without a top drop shadow',
);
assert.doesNotMatch(
  styleSource,
  /\.studio-theme-light \.studio-results-window,[\s\S]{0,120}box-shadow:/,
  'light-theme result windows should not be included in shared dialog shadow rules',
);
assert.match(
  getLastRootCssBlock('.studio-heat-materials-tabs'),
  /border-top:\s*1px solid var\(--studio-border-soft\);[\s\S]*padding-left:\s*16px;/,
  'heat materials tab strip should align with the title text and use a clear divider',
);
assert.match(
  getLastRootCssBlock('.studio-heat-materials-tabs .studio-results-tab-active'),
  /box-shadow:\s*inset 0 -2px 0 var\(--studio-accent\);/,
  'heat materials active tab should use a bottom rule so it does not collide with the title area',
);
assert.match(
  styleSource,
  /\.studio-theme-light \.studio-heat-materials-toolbar\s*\{[\s\S]*background:\s*#f8fafc;/,
  'heat materials title bar should define a dedicated light-theme surface',
);
assert.match(
  styleSource,
  /\.studio-theme-light \.studio-heat-materials-tabs \.studio-results-tab-active\s*\{[\s\S]*box-shadow:\s*inset 0 -2px 0 #2563eb;/,
  'light theme heat materials active tab should keep the bottom-rule treatment',
);
assert.match(
  styleSource,
  /\.studio-theme-light \.studio-heat-current-hint strong\s*\{[\s\S]*color:\s*#92400e;/,
  'light theme heat current hint highlight should use a darker amber text color for contrast',
);
assert.match(sceneSource, /overlayBottomRight/, '3D scene should keep a lower-right overlay path for Free Mode record actions');
assert.match(sceneSource, /overlayTopCenter/, '3D scene should expose a top-center overlay slot for Free wait speed controls');
assert.match(sceneSource, /studio-preview-overlay-slot-top-center/, 'top-center overlay should use the shared preview overlay slot system');
assert.match(workbenchSource, /真实实验等待过程较慢，仿真已提供倍速等待以加快达到平衡。/, 'Free wait speed should show the confirmed one-time centered explanation copy');
assert.match(workbenchSource, /HEAT_CAPACITY_FREE_SPEED_NOTICE_DURATION_MS = 2400/, 'Free wait speed explanation should use the planned 2.4 second notice window');
assert.match(workbenchSource, /isHeatCapacityFreeEquilibriumSpeedAvailable\(activeFile\)/, 'Free wait speed UI should appear only during sealed/recovery waiting phases');
assert.match(workbenchSource, /heatCapacityFreeEquilibriumSpeedHintShown/, 'Free wait speed explanation should be tracked once per experiment run');
assert.match(workbenchSource, /data-heat-capacity-free-speed-control="true"/, 'Free wait speed control should have stable testable markup');
assert.match(workbenchSource, /freeSpeedLabelCode:\s*'WAIT RATE'/, 'Free wait speed control should localize its engineering code label through Heat Capacity copy');
assert.match(workbenchSource, /zh-CN[\s\S]*freeSpeedLabel:\s*'等待倍速'[\s\S]*zh-TW[\s\S]*freeSpeedLabel:\s*'等待倍速'[\s\S]*en[\s\S]*freeSpeedLabel:\s*'Wait speed'/, 'Free wait speed control should include zh-CN, zh-TW, and English labels');
assert.match(workbenchSource, /zh-CN[\s\S]*freeSpeedNotice:\s*'真实实验等待过程较慢，仿真已提供倍速等待以加快达到平衡。'[\s\S]*zh-TW[\s\S]*freeSpeedNotice:\s*'真實實驗等待過程較慢，仿真已提供倍速等待以加快達到平衡。'[\s\S]*en[\s\S]*freeSpeedNotice:\s*'Real experiments wait slowly; simulation speed controls are available to reach equilibrium faster\.'/, 'Free wait speed explanation should be localized for all workbench languages');
assert.match(workbenchSource, /getLocalizedHeatCapacityFreeProcessingMessage/, 'Free Mode processing logs should localize domain result messages before writing to the console');
assert.match(workbenchSource, /freeModeActiveLog[\s\S]*freeRunResetLog/, 'Free Mode lifecycle console logs should use Heat Capacity localized copy');
assert.doesNotMatch(workbenchSource, /heat-capacity free mode active|heat-capacity free run reset|Free Mode 已记录 U[₀₁₂] 显示值/, 'Free Mode console logs should not contain hard-coded mixed-language strings');
assert.match(workbenchSource, /aria-label=\{heatCapacityRealtimeCopy\.freeSpeedAria\}/, 'Free wait speed radiogroup should localize its accessibility label');
assert.match(workbenchSource, /heatCapacityRealtimeCopy\.freeSpeedLabelCode[\s\S]*heatCapacityRealtimeCopy\.freeSpeedLabel/, 'Free wait speed label should render localized copy instead of hard-coded text');
assert.match(workbenchSource, /studio-heat-free-speed-screw/, 'Free wait speed control should include compact screw details for an instrument-panel look');
assert.match(workbenchSource, /×\{speed\}/, 'Free wait speed option text should use engineering multiplier notation');
assert.match(workbenchSource, /HEAT_CAPACITY_FREE_EQUILIBRIUM_SPEED_OPTIONS\.map/, 'Free wait speed control should render the canonical x1/x2/x4/x8 options');
assert.match(workbenchSource, /setHeatCapacityFreeEquilibriumSpeedMultiplier/, 'Free wait speed option clicks should update the persisted Free runtime multiplier');
assert.match(workbenchSource, /overlayTopCenter=\{heatCapacityTopCenterOverlay\}/, 'Workbench should mount the Free speed selector into the 3D top-center overlay');
assert.match(styleSource, /\.studio-heat-free-speed-control \{[\s\S]*border-radius:\s*999px/, 'Free speed selector should be a two-semicircle capsule');
assert.match(styleSource, /\.studio-heat-free-speed-control \{[\s\S]*linear-gradient\(180deg,[\s\S]*rgba\(42,\s*52,\s*63/, 'Free speed selector should use a restrained dark engineering panel finish');
assert.match(styleSource, /\.studio-heat-free-speed-screw \{[\s\S]*border-radius:\s*50%/, 'Free speed selector screw details should be small circular hardware marks');
assert.match(styleSource, /\.studio-heat-free-speed-options \{[\s\S]*inset 0 1px 3px rgba\(0,\s*0,\s*0,\s*0\.65\)/, 'Free speed selector options should sit in an inset mechanical track');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-free-speed-control \{[\s\S]*linear-gradient\(180deg,[\s\S]*rgba\(238,\s*243,\s*247/, 'Free speed selector should have a dedicated light-theme panel finish');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-free-speed-label \{[\s\S]*color:/, 'Free speed selector label should be recolored in light theme');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-free-speed-thumb \{[\s\S]*linear-gradient\(180deg/, 'Free speed selector thumb should be recolored in light theme');
assert.match(styleSource, /\.studio-heat-free-speed-circle \{[\s\S]*border-radius:\s*50%/, 'Free speed selector should render circular option targets');
assert.match(styleSource, /\.studio-heat-free-speed-thumb \{[\s\S]*transition:\s*transform/, 'Free speed selector highlight should slide smoothly between options');
assert.match(styleSource, /\.studio-heat-free-speed-control-index-3 \.studio-heat-free-speed-thumb \{[\s\S]*translateX\(calc\(3 \* 32px\)\)/, 'x8 should move the highlight to the fourth mechanical slot');
assert.doesNotMatch(getCssBlock('.studio-heat-free-speed-circle:hover'), /color\s*:/, 'Free speed option hover should not change number color');
assert.doesNotMatch(getCssBlock('.studio-theme-light .studio-heat-free-speed-circle:hover'), /color\s*:/, 'light theme Free speed option hover should not darken number color');
assert.match(styleSource, /\.studio-heat-free-speed-circle-active:hover \{[\s\S]*color:\s*#f2f8ff/, 'active Free speed option should keep its selected text color while hovered in dark theme');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-free-speed-circle-active:hover \{[\s\S]*color:\s*#ffffff/, 'active Free speed option should keep white selected text while hovered in light theme');
assert.match(styleSource, /\.studio-heat-free-speed-overlay-visible \{[\s\S]*studioOverlayTopCenterIn/, 'Free speed selector should enter from above with fade-in');
assert.match(styleSource, /\.studio-heat-free-speed-overlay-exiting \{[\s\S]*studioOverlayTopCenterOut/, 'Free speed selector should exit upward with fade-out');
assert.match(styleSource, /\.studio-heat-free-speed-notice \{[\s\S]*studioOverlayFadeIn[\s\S]*studioOverlayFadeOut/, 'Free speed centered notice should fade in and out automatically');
assert.match(workbenchSource, /selectActiveHeatCapacityWorkbenchDisplay\(activeFile\)/, 'workbench should pass the active mode display source into the 3D instrument');
assert.match(workbenchSource, /recordFreeHeatCapacitySample\('u0'\)/, 'Free Mode should expose a persistent U0 record action');
assert.match(workbenchSource, /recordFreeHeatCapacitySample\('u1'\)/, 'Free Mode should expose a persistent U1 record action');
assert.match(workbenchSource, /recordFreeHeatCapacitySample\('u2'\)/, 'Free Mode should expose a persistent U2 record action');
assert.match(workbenchSource, /applyHeatCapacityFreeRecordWorkbenchState/, 'Free Mode record buttons should use one synchronous record-attempt helper');
assert.match(stateSource, /recordHeatCapacityFreeTraceEventWithReference/, 'Free Mode official records should capture hidden trace references before saving U0/U1/U2');
assert.match(processReviewStageScaleSource, /MIN_COMPRESSED_STAGE_DURATION_BY_ID/, 'process review timeline should keep each experiment stage readable even after long idle waits');
assert.match(processReviewStageScaleSource, /calculateHeatCapacityProcessReviewCompressedDurationS/, 'process review timeline should expose compressed process duration for independent actual and ideal reference traces');
assert.match(processReviewStageScaleSource, /axisTicks/, 'process review stage scale should expose mixed major/minor axis ticks');
assert.match(processReviewStageScaleSource, /createHeatCapacityAlignedReferencePointToX/, 'process review stage scale should expose a helper for start-aligning independent reference traces');
assert.match(processReviewPanelSource, /createHeatCapacityAlignedReferencePointToX/, 'process review charts should align the ideal reference display through the shared stage-scale helper');
assert.match(processReviewPanelSource, /actualStageId:\s*'pump'[\s\S]*referenceStageId:\s*'fill'/, 'ideal reference fill should be display-aligned to the actual pump start while preserving independent later stages');
assert.match(
  processReviewPanelSource,
  /\[copy\.stageLabels\[stage\.id\],\s*stage\.countText,\s*stage\.durationText\][\s\S]*filter\(Boolean\)[\s\S]*join\(' '\)/,
  'stage timeline labels should combine count and duration add-ons into one centered label',
);
assert.doesNotMatch(
  processReviewPanelSource,
  /className="hpr-stage-count"[\s\S]*textAnchor="end"/,
  'stage timeline count labels should not render as a separate right-aligned text node',
);
assert.match(processReviewPanelSource, /hoveredStageId/, 'process review should track generic stage hover instead of release-only expansion');
assert.doesNotMatch(processReviewPanelSource, /expandedStageId/, 'process review should not keep hover-expand stage state after stage widths became fixed');
assert.doesNotMatch(processReviewPanelSource, /hpr-release-focus-area/, 'process review should not use a release-only chart hover highlight');
assert.match(processReviewPanelSource, /hpr-stage-focus-area/, 'process review should draw a generic stage hover background in charts');
assert.match(processReviewPanelSource, /hpr-axis-tick-minor/, 'process review should render short unlabeled ticks separately from long labeled ticks');
assert.match(processReviewPanelSource, /hpr-record-window/, 'process review should render actual fixed-width record windows from U0/U1/U2 records');
assert.match(processReviewStyleSource, /\.hpr-stage-focus-area/, 'generic stage hover backgrounds should have dedicated styling');
assert.match(processReviewPanelSource, /handleReviewWheel/, 'process review chart should translate horizontal wheel input into horizontal chart scrolling');
assert.match(processReviewPanelSource, /data-hpr-scroll-window="true"/, 'process review chart should expose a stable horizontal scroll window');
assert.match(processReviewPanelSource, /data-hpr-trial-select="true"/, 'process review should expose a group-selection menu');
assert.match(processReviewPanelSource, /trialOptions\.map/, 'process review menu should list all reviewable groups');
assert.match(processReviewPanelSource, /onSelectedTrialChange/, 'process review menu should report selected group changes to the workbench');
assert.match(processReviewPanelSource, /trialSelectRef/, 'process review menu should close from outside-click handling');
assert.match(processReviewPanelSource, /pointerdown/, 'process review menu should close as soon as an outside pointer is pressed');
assert.match(processReviewPanelSource, /Escape/, 'process review menu should close from Escape');
assert.doesNotMatch(processReviewPanelSource, /hpr-reference-line|标准基线|showStandardReference|referenceTrace/, 'process review charts should remove the standard baseline curve and toggle');
assert.match(processReviewPanelSource, /hpr-ideal-reference-line/, 'process review charts should render the ideal reference curve');
assert.match(processReviewPanelSource, /理想参考/, 'process review legend should label the orange curve as ideal reference');
const oldOrangeReferenceUiPattern = new RegExp([
  '推荐' + '参考',
  '推荐' + '操作',
  '可达' + '最佳',
  'operableBestTrace',
  `recommend${'edTrace'}`,
  `recommend${'edReference'}`,
  `recommend${'edStages'}`,
  'hpr-operable-best-line',
  `hpr-recommend${'ed-line'}`,
].join('|'));
assert.doesNotMatch(processReviewPanelSource, oldOrangeReferenceUiPattern, 'process review should no longer expose old recommendation wording or field names in the UI layer');
assert.match(processReviewPanelSource, /buildContinuousLinePath/, 'ideal reference should use a continuous path builder');
assert.match(processReviewPanelSource, /buildPumpAwareLinePath/, 'actual measured trace should keep step-aware pump rendering');
assert.doesNotMatch(processReviewPanelSource, /hpr-pump-event-marker/, 'process review charts should keep pump strokes on the stage timeline instead of drawing full-height plot markers');
assert.match(processReviewPanelSource, /hpr-record-window/, 'process review charts should render actual fixed-width record windows');
assert.doesNotMatch(processReviewPanelSource, /hpr-best-window/, 'process review charts should not render old best-window bands');
assert.match(processReviewPanelSource, /hpr-line-legend-window/, 'actual record windows should be explained in the chart legend');
assert.match(processReviewPanelSource, /记录窗口/, 'actual record window legend label should stay concise');
assert.doesNotMatch(processReviewPanelSource, />记录时间：|>电信号：|>换算压强差：|>换算温度差：/, 'record hover callout labels should not be hard-coded Chinese JSX literals');
assert.doesNotMatch(processReviewPanelSource, /实际记录时刻：/, 'record window title should be localized instead of hard-coded Chinese');
assert.doesNotMatch(processReviewPanelSource, /hpr-best-window-label/, 'record windows should not place text inside the plot band');
assert.match(processReviewPanelSource, /idealReferenceTrace/, 'process review charts should consume ideal reference trace data');
assert.match(processReviewPanelSource, /idealReferenceStages/, 'process review charts should consume ideal reference stages');
assert.match(processReviewPanelSource, /idealReference/, 'process review should expose an ideal reference summary');
assert.match(processReviewPanelSource, /createNiceAxis/, 'process review charts should use readable engineering axis ticks instead of raw equal divisions');
assert.match(
  processReviewPanelSource,
  /createHeatCapacityProcessReviewStageLayout/,
  'process review charts should use the stage-normalized time layout',
);
assert.doesNotMatch(
  processReviewPanelSource,
  /const createTimeScale/,
  'process review top timeline should share the same stage-normalized layout as the charts',
);
assert.doesNotMatch(
  processReviewPanelSource,
  /createLinearTimeScale\(totalSeconds\)/,
  'process review charts should not use a linear total-seconds x-axis',
);
assert.doesNotMatch(
  processReviewPanelSource,
  /totalSeconds:\s*number;/,
  'process review chart props should not keep unused totalSeconds after switching to stage-normalized axes',
);
assert.doesNotMatch(processReviewPanelSource, /kind === 'pressure' \? 5 : 7/, 'process review charts should not generate uneven temperature tick labels by fixed count splitting');
assert.match(processReviewPanelSource, /ΔP \(kPa\)/, 'pressure chart y-axis label should use parenthesized units');
assert.match(processReviewPanelSource, /ΔT \(K\)/, 'temperature chart y-axis label should use parenthesized units');
assert.match(processReviewPanelSource, /过程时间 \(s，等待压缩\)/, 'process review charts should disclose the compressed waiting axis');
assert.doesNotMatch(processReviewPanelSource, /时间 \/ s|ΔP \/ kPa|ΔT \/ K/, 'process review chart axes should not use slash unit labels');
assert.doesNotMatch(processReviewPanelSource, /showXAxis=\{?false\}?|showXAxis\s*=\s*false/, 'both process review charts should expose the time axis label');
assert.match(processReviewPanelSource, /chart\.records\.map/, 'process review charts should consume actual record events for record windows');
assert.doesNotMatch(processReviewPanelSource, /chart\.bestWindows\.map/, 'process review charts should not consume best-window data for plot bands');
assert.doesNotMatch(processReviewStyleSource, /\.hpr-reference-line|--hpr-reference-line/, 'standard reference styles should be removed');
assert.match(processReviewStyleSource, /\.hpr-ideal-reference-line/, 'ideal reference curve should have an explicit style');
assert.match(processReviewStyleSource, /\.hpr-record-window/, 'actual record window should have an explicit style');
assert.match(processReviewStyleSource, /\.hpr-line-legend-window/, 'record window legend marker should have an explicit style');
assert.doesNotMatch(processReviewStyleSource, /\.hpr-best-window-label/, 'plot-internal record window labels should not keep unused styles');
assert.match(processReviewStyleSource, /--hpr-pressure-line:/, 'process review should theme the measured pressure line through an explicit variable');
assert.match(processReviewStyleSource, /--hpr-temperature-line:/, 'process review should theme the measured temperature line through an explicit variable');
assert.match(processReviewStyleSource, /--hpr-ideal-reference-line:/, 'process review should give the ideal reference curve its own line color');
assert.match(processReviewPanelSource, /var\(--hpr-pressure-line\)/, 'pressure chart should use the themed pressure line color');
assert.match(processReviewPanelSource, /var\(--hpr-temperature-line\)/, 'temperature chart should use the themed temperature line color');
assert.match(processReviewStyleSource, /\.hpr-ideal-reference-line\s*\{[\s\S]*stroke:\s*var\(--hpr-ideal-reference-line\)/, 'ideal reference curve should use its dedicated line color');
assert.doesNotMatch(processReviewStyleSource, new RegExp('\\.hpr-recommend' + 'ed-line|--hpr-recommend' + 'ed-line'), 'old orange reference line styles should be removed');
assert.match(processReviewPanelSource, /理想参考/, 'process review should render the ideal reference summary title');
assert.match(processReviewPanelSource, /连续快速充气约/, 'ideal reference summary should state the continuous-fast fill rule');
assert.match(processReviewPanelSource, /无噪声、无传感器滞后、无泄漏/, 'ideal reference summary should disclose ideal assumptions');
assert.match(processReviewPanelSource, /未找到同时满足安全阈值、记录阈值和 γ 目标的理想参考过程/, 'ideal reference summary should handle infeasible parameters');
assert.match(processReviewPanelSource, /row\.details/, 'diagnosis rows should render expandable sub-score details');
assert.match(processReviewPanelSource, /expandedDiagnosisRows/, 'diagnosis rows should keep local expand-collapse state');
assert.match(processReviewPanelSource, /hpr-diagnosis-expand-open/, 'diagnosis expand chevrons should animate by rotating the same pointed glyph');
assert.match(processReviewPanelSource, /import \{ ChevronRight \} from 'lucide-react';/, 'diagnosis expand controls should reuse the same lucide chevron family as the left tree');
assert.match(processReviewPanelSource, /<ChevronRight\s+aria-hidden="true"/, 'diagnosis expand controls should render one reusable chevron icon');
assert.doesNotMatch(processReviewPanelSource, /<span aria-hidden="true">▸<\/span>/, 'diagnosis expand controls should not use a separate text glyph');
assert.doesNotMatch(processReviewPanelSource, /expanded \? '▾' : '▸'/, 'diagnosis expand controls should not swap glyphs instead of rotating');
assert.doesNotMatch(processReviewStyleSource, /\.hpr-diagnosis-expand\s*\{[^}]*border:\s*1px/, 'diagnosis expand control should not be framed as a rounded rectangle button');
assert.doesNotMatch(processReviewStyleSource, /\.hpr-diagnosis-expand\s*\{[^}]*border-radius:/, 'diagnosis expand control should not use rounded rectangle styling');
assert.match(processReviewStyleSource, /\.hpr-diagnosis-expand svg\s*\{[\s\S]*transition:\s*transform/, 'diagnosis expand chevron should rotate smoothly');
assert.match(processReviewPanelSource, /className="hpr-diagnosis-summary-cell"/, 'diagnosis overview cells should be classed for fading when details are expanded');
assert.match(processReviewStyleSource, /\.hpr-diagnosis-summary-cell\s*\{[\s\S]*transition:/, 'diagnosis overview cells should fade smoothly');
assert.match(processReviewStyleSource, /\.hpr-diagnosis-row-expanded \.hpr-diagnosis-summary-cell\s*\{[\s\S]*opacity:\s*0/, 'expanded diagnosis rows should fade out overview cells to avoid duplicated information');
assert.doesNotMatch(getProcessReviewCssBlock('.hpr-diagnosis-details'), /border-left:/, 'diagnosis sub-score details should not reintroduce the old colored left rail');
assert.match(processReviewStyleSource, /\.hpr-diagnosis-detail-row\s*\{[\s\S]*padding:\s*7px 12px 7px 52px/, 'diagnosis sub-score rows should indent under the main score row');
assert.doesNotMatch(processReviewPanelSource, /不保存诊断结论/, 'diagnosis header should avoid explanatory storage implementation copy');
assert.doesNotMatch(processReviewPanelSource, /主线 trace · 仪器显示值换算 · 事件样本固定保留/, 'process review title should avoid long implementation copy');
assert.match(processReviewPanelSource, /hpr-stage-focus-area-\$\{hoveredStage\.id\}/, 'stage hover background should be generic for every timeline stage');
assert.doesNotMatch(processReviewStyleSource, /--hpr-release-focus-bg/, 'process review should not keep release-only hover color tokens');
assert.match(processReviewStyleSource, /\.hpr-stage-focus-area\s*\{[\s\S]*fill-opacity:/, 'generic stage focus background should have an explicit visible style');
assert.match(processReviewPanelSource, /upperBoundGamma/, 'summary should display operation upper-bound gamma');
assert.match(processReviewPanelSource, /upperBoundGapPercent/, 'summary should display actual-vs-upper-bound gap');
assert.match(processReviewPanelSource, /review\.score\.total/, 'summary should display operation score');
assert.match(processReviewPanelSource, /row\.relation/, 'diagnosis rows should explain relation to best windows or reference');
assert.match(processReviewPanelSource, /row\.score/, 'diagnosis rows should display item scores');
assert.match(processReviewPanelSource, /mode !== 'free'/, 'process review scoring should remain Free Mode only');
assert.doesNotMatch(processReviewPanelSource, /demo[^\n]+upperBoundGamma|guide[^\n]+upperBoundGamma/, 'Demo and Guide modes should not render upper-bound scoring');
assert.match(workbenchSource, /heatCapacityReviewSelectionByFileId/, 'workbench should keep process-review group selection as runtime UI state');
assert.doesNotMatch(sessionSource, /heatCapacityReviewSelectionByFileId|selectedProcessReviewTrialId/, 'process-review group selection must not be saved in session payloads');
assert.doesNotMatch(processReviewPanelSource, /data-hpr-scroll-up="true"|data-hpr-scroll-down="true"/, 'process review should rely on the standard result-tab vertical scrollbar instead of custom up/down buttons');
assert.match(workbenchSource, /const materialsSelected = selectedPanel === 'results'/, 'Heat Capacity materials parent row should have its own selected state instead of inheriting child tab state');
assert.match(workbenchSource, /studio-heat-materials-group \$\{materialsSelected \? 'studio-panel-row-active' : ''\}/, 'Heat Capacity materials parent row should only highlight when the parent itself is selected');
assert.match(workbenchSource, /setSelectedPanel\('results'\);[\s\S]*title=\{heatCapacityRealtimeCopy\.materialsFolderTitle\}/, 'clicking the Heat Capacity materials parent should select the parent row without selecting the first child');
assert.match(workbenchSource, /className=\{selectedPanel === panel\.key \? 'studio-results-nav-active studio-panel-row-active' : ''\}[\s\S]*?onClick=\{\(event\) => \{[\s\S]*?event\.stopPropagation\(\);[\s\S]*?setSelectedPanel\(panel\.key\);[\s\S]*?\}\}[\s\S]*?onDoubleClick=\{\(event\) => \{[\s\S]*?openHeatCapacityTab\(tabId\);/, 'clicking a Heat Capacity material child should only move the left selection; double-clicking should open or activate the tab');
assert.doesNotMatch(workbenchSource, /className=\{selectedPanel === panel\.key \? 'studio-results-nav-active studio-panel-row-active' : ''\}[\s\S]*?onClick=\{\(event\) => \{[\s\S]*?activateHeatCapacityTab\(tabId\)/, 'single-clicking an already-open Heat Capacity material child should not switch the active material tab');
assert.doesNotMatch(workbenchSource, /materialPanels\.some\(\(\{ tabId \}\) => activeFile\.activeHeatCapacityTabId === tabId\)/, 'Heat Capacity left tree selection should not follow the active materials tab when another top panel is selected');
assert.doesNotMatch(workbenchSource, /state === 'active' \|\| selectedPanel === panel\.key/, 'Heat Capacity material child rows should not stay highlighted just because their tab is active');
assert.match(workbenchSource, /className=\{selectedPanel === panel\.key \? 'studio-results-nav-active studio-panel-row-active' : ''\}/, 'Heat Capacity material child rows should highlight only the selected child panel');
assert.match(workbenchSource, /activeFile\.kind === 'heatCapacity' && selectedPanel === 'results'[\s\S]*heatCapacityRealtimeCopy\.materialsTitle/, 'status text should name the Heat Capacity materials parent when that parent row is selected');
assert.match(processReviewStyleSource, /--hpr-panel-bg/, 'process review should use theme variables instead of hard-coded light-only colors');
assert.match(processReviewStyleSource, /\.studio-theme-light \.hpr-panel/, 'process review should explicitly adapt variables for light mode while keeping dark mode as the default');
assert.match(processReviewStyleSource, /\.hpr-section-heading > div\s*\{[\s\S]*gap:\s*10px/, 'process review section headings should separate titles from explanatory copy');
assert.doesNotMatch(processReviewStyleSource, /\.hpr-scroll-actions/, 'process review should not add a second vertical scroll control');
assert.match(processReviewStyleSource, /--hpr-review-canvas-min:\s*1320px/, 'process review should keep the horizontal canvas close to the visible chart width');
assert.match(processReviewStyleSource, /--hpr-review-canvas-max:\s*1600px/, 'process review horizontal scroll extent should stay close to the chart content');
assert.match(processReviewStyleSource, /width:\s*clamp\(var\(--hpr-review-canvas-min\),\s*108vw,\s*var\(--hpr-review-canvas-max\)\)/, 'process review should avoid excessive right-side horizontal overscroll');
assert.match(processReviewStyleSource, /padding:\s*14px 18px 18px/, 'process review horizontal canvas should keep symmetric left and right padding');
assert.match(workbenchSource, /className="studio-results-body studio-heat-materials-body"[\s\S]*\{renderPanelContent\(activePanel\)\}/, 'Heat Capacity material tabs should put panel content in the standard results scroll body');
assert.match(styleSource, /\.studio-heat-materials-body\s*\{[\s\S]*overflow:\s*auto;/, 'Heat Capacity material tabs should use the same native vertical scroll behavior as other result tabs');
assert.match(workbenchSource, /const HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO = IDEAL_RESULT_MIN_HEIGHT_RATIO;/, 'Heat Capacity materials window should use the same minimum resize ratio as other result windows');
assert.match(workbenchSource, /const getHeatCapacityMaterialsMaxHeightRatio = \(\) => \{[\s\S]*?fileTabsRect[\s\S]*?RESIZER_GRAB_SAFE_SPACE[\s\S]*?IDEAL_RESULT_MAX_HEIGHT_RATIO/, 'Heat Capacity materials window should use the file-tab-aware maximum height calculation');
assert.match(workbenchSource, /const maxHeightRatio = getHeatCapacityMaterialsMaxHeightRatio\(\)[\s\S]*?HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO[\s\S]*?maxHeightRatio/, 'Heat Capacity materials resize should clamp to the workspace-aware maximum height ratio');
assert.match(workbenchSource, /const materialsMaxHeightRatio = getHeatCapacityMaterialsMaxHeightRatio\(\)[\s\S]*?HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO[\s\S]*?materialsMaxHeightRatio/, 'Heat Capacity materials render height should clamp to the same workspace-aware maximum height ratio');
assert.doesNotMatch(workbenchSource, /const HEAT_CAPACITY_MATERIALS_MAX_HEIGHT_RATIO = 0\.82;/, 'Heat Capacity materials window should not use a fixed low maximum height ratio');
assert.doesNotMatch(workbenchSource, /const HEAT_CAPACITY_MATERIALS_MAX_HEIGHT_RATIO = IDEAL_RESULT_MAX_HEIGHT_RATIO;/, 'Heat Capacity materials window should not blindly inherit the full-height ideal result maximum');
assert.match(processReviewPanelSource, /normalizeDiagnosisText/, 'process review should normalize diagnosis copy before rendering');
assert.match(processReviewPanelSource, /normalizeDiagnosisText\(row\.evidence,\s*copy\.noIssue\)/, 'process review should remove heavy punctuation from visible diagnosis evidence');
assert.match(processReviewPanelSource, /normalizeDiagnosisText\(detail\.recommendation,\s*copy\.noIssue\)/, 'process review should remove heavy punctuation from detail recommendations');
assert.doesNotMatch(processReviewPanelSource, /<span className="hpr-diagnosis-summary-cell">\{row\.evidence\}<\/span>/, 'process review should not render raw diagnosis text with full stops');
const processReviewTimelineOpeningTag = processReviewPanelSource.match(/<section[\s\S]{0,180}className="hpr-timeline-block"[\s\S]{0,180}>/)?.[0] ?? '';
assert.doesNotMatch(processReviewTimelineOpeningTag, /onMouseLeave/, 'stage hover highlight should not be controlled by the whole timeline block');
assert.doesNotMatch(processReviewPanelSource, /hpr-stage-expanded|isRelease && onStageHover/, 'stage hover should no longer keep release-only expansion logic');
assert.doesNotMatch(processReviewPanelSource, /hpr-stage-hit-area/, 'stage hover should not use a broad transparent hover area that covers control dots');
assert.match(processReviewPanelSource, /className="hpr-stage-bar"[\s\S]*?onMouseEnter=\{\(\) => onStageHover\(stage\.id\)\}[\s\S]*?onMouseLeave=\{\(\) => onStageHover\(null\)\}/, 'stage hover highlight should be limited to the visible stage bar itself');
assert.match(workbenchSource, /data-heat-capacity-free-record-controls="true"/, 'Free Mode record actions should have a stable UI marker');
assert.match(workbenchSource, /data-heat-capacity-mode-action="reset-free"/, 'Free Mode should expose an icon-only reset action in the mode control');
assert.match(workbenchSource, /resetHeatCapacityFreeRun/, 'Free Mode reset action should use an explicit handler instead of piggybacking on mode entry');
assert.match(workbenchSource, /resetHeatCapacityFreeRunWorkbenchState\(file, now\)/, 'Free Mode reset should use the shared Free run reset helper');
assert.match(workbenchSource, /resetHeatCapacityFreeRun[\s\S]*setHeatCapacityFocusResetKey\(\(key\) => key \+ 1\)/, 'Free Mode reset should return the 3D preview camera to its default view');
assert.match(stateSource, /resetHeatCapacityFreeRunWorkbenchState[\s\S]*resolveHeatCapacityFreeResetStructure\(file\)[\s\S]*powerOn:\s*false[\s\S]*stopcockAngleDeg:\s*HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG[\s\S]*pumpValveOpen:\s*false[\s\S]*heatCapacityFreeTrials:\s*resetStructure\.heatCapacityFreeTrials/, 'Free Mode reset should clear the current run and return apparatus controls to their initial state without deleting completed Free groups');
assert.match(stateSource, /resetHeatCapacityFreeRunWorkbenchState[\s\S]*pressureZeroed:\s*false[\s\S]*pressureZeroKnobAngle:\s*0[\s\S]*heatCapacityProcessingCalculated:\s*false/, 'Free Mode reset should reset zeroing and invalidate stale processing results');
assert.match(workbenchSource, /heatCapacityFreeResetFeedbackActive/, 'Free Mode reset should keep a short visual feedback state');
assert.match(workbenchSource, /setHeatCapacityFreeResetFeedbackActive\(true\)[\s\S]*window\.setTimeout\(\(\) => \{[\s\S]*setHeatCapacityFreeResetFeedbackActive\(false\)/, 'Free Mode reset should visibly confirm clicks and then clear the feedback');
assert.match(workbenchSource, /studio-heat-mode-action-feedback[\s\S]*data-heat-capacity-mode-action="reset-free"/, 'Free Mode reset button should apply a visible feedback class after clicks');
assert.match(styleSource, /\.studio-heat-mode-action-feedback \{[\s\S]*animation:\s*studio-heat-reset-feedback/, 'Free Mode reset feedback should have an explicit animation style');
assert.match(styleSource, /@keyframes studio-heat-reset-feedback/, 'Free Mode reset feedback should define the reset confirmation keyframes');
assert.match(leftPanelSource, /file\.heatCapacityMode === 'free'[\s\S]*heatCapacityFreeTrials/, 'recording panel should choose Free records when Free Mode is active');
assert.match(leftPanelSource, /data-heat-capacity-record-source=\{file\.heatCapacityMode\}/, 'recording panel should expose the active record source');
assert.match(leftPanelSource, /automaticU0/, 'Free record table should show automatic U0 status');
assert.match(leftPanelSource, /freeRecording:\s*\{/, 'Free record table copy should be localized through copyByLanguage');
assert.match(leftPanelSource, /renderFreeRecordingTab = \(\s*file:[\s\S]*copy: LocalizedText/, 'Free record table should receive localized copy instead of hard-coded English');
assert.match(leftPanelSource, /copy\.freeRecording\.(title|source|automaticCandidate|emptyRecords|trial)/, 'Free record table should render localized Free recording labels');
assert.match(leftPanelSource, /renderFreeRecordingTab = \(\s*file:[\s\S]*pendingRemoveTrialRecord:[\s\S]*onRemoveTrialRecord:[\s\S]*onCancelRemoveTrialRecord:/, 'Free record table should receive deletion confirmation callbacks');
assert.match(leftPanelSource, /data-heat-capacity-free-record-table="true"[\s\S]*copy\.table\.action/, 'Free record table should include an action column');
assert.match(freeCurrentTrialSection, /renderRemoveRecordButton\(currentFreeTrialIndex,\s*'u0'[\s\S]*renderRemoveRecordButton\(currentFreeTrialIndex,\s*'u1'[\s\S]*renderRemoveRecordButton\(currentFreeTrialIndex,\s*'u2'/, 'Free current-trial status should expose delete actions for U0, U1, and U2');
assert.match(freeRecordTableSection, /renderRemoveRecordButton\(\s*index,\s*'trial'/, 'Free record table should expose only whole-group deletion');
assert.doesNotMatch(freeRecordTableSection, /renderRemoveRecordButton\(\s*index,\s*'u[012]'/, 'Free record table should not delete individual U0/U1/U2 values');
assert.doesNotMatch(leftPanelSource, /<strong>Free Mode records<\/strong>|<span>Source: Free physical|<th>Trial<\/th>|<td colSpan=\{8\}>No Free Mode records yet|<span>Free Mode processing|<div className="studio-empty-panel-tree">Complete a Free Mode/, 'Free table JSX should not contain hard-coded English labels in the localized rendering path');
assert.match(leftPanelSource, /correctedSignals|U1CorrectedMv|copy\.freeRecording\.u2Corrected/, 'Free record table should show corrected U1/U2 values');
assert.doesNotMatch(leftPanelSource, /operationUpperBound|bestValue|bestOperation|操作上限|最佳值/, 'Batch 9 should not add operation scoring, best-value columns, or upper-bound output');
assert.doesNotMatch(workbenchSource, /operationUpperBound|bestValue|bestOperation|操作上限|最佳值/, 'Batch 9 should keep automatic U0 as data foundation only, without scoring UI');
assert.match(stateSource, /stepFreePhysics\(/, 'Free Mode workbench stepping should call the Free physics engine');
assert.match(stateSource, /stepFreeSensor\(/, 'Free Mode workbench stepping should call the Free sensor layer');
assert.match(sceneSource, /@react-three\/fiber/);
assert.match(sceneSource, /@react-three\/drei/);
assert.doesNotMatch(autoDemoSource, asciiSubscriptPattern, 'auto demo user-facing copy should use real Unicode subscripts instead of underscores');
assert.doesNotMatch(leftPanelSource, asciiSubscriptPattern, 'heat-capacity guide copy should use real Unicode subscripts instead of underscores');
assert.doesNotMatch(workbenchSource, /heatRealtimeHint:\s*'[^']*U_/, 'heat-capacity realtime hint should not expose underscore subscripts');
assert.doesNotMatch(workbenchSource, /hardSphereTeachingOnly:\s*'[^']*U_/, 'hard-sphere teaching note should not expose underscore subscripts');
assert.doesNotMatch(workbenchSource, /(recordDialogPressure|recordDialogTemperature|readyToZero|sealedStabilizing|recovering|delta):\s*'[^']*U_/, 'heat-capacity status and dialog copy should not expose underscore subscripts');
assert.match(workbenchSource, /heatRealtimeHint:\s*'Uₜ \/ Uₚ、压强和过程采样'/, 'Simplified Chinese realtime hint should use real subscripts');
assert.doesNotMatch(sceneSource, /<Html[\s\S]*(TemperatureDisplay|PressureDisplay|FD-NCD-C|INPUT|PRESS IN)/, 'instrument panel labels should not use camera-facing Html overlays');
assert.match(sceneSource, /CanvasTexture/, 'instrument panel labels should use 3D canvas textures attached to the instrument face');
assert.match(sceneSource, /new THREE\.CanvasTexture\(canvas\)[\s\S]*\}, \[\]\)/, 'instrument panel text should create one stable CanvasTexture instead of recreating it for every readout change');
assert.match(sceneSource, /window\.setTimeout\(drawTexture, updateIntervalMs - elapsedMs\)/, 'instrument panel text should throttle canvas texture redraws');
assert.match(sceneSource, /performanceMode=\{props\.performanceMode\}/, 'heat-capacity scene content should receive the global performance mode');
assert.match(sceneSource, /performanceMode:\s*'standard' \| 'balanced' \| 'performance' \| 'ultra'/, 'heat-capacity scene should accept the four performance tiers');
assert.match(sceneSource, /sceneTheme:\s*'dark' \| 'light'/, 'heat-capacity 3D scene should receive the resolved workbench theme');
assert.match(workbenchSource, /sceneTheme=\{resolvedWorkbenchTheme\}/, 'workbench should pass the resolved light or dark theme into the heat-capacity 3D scene');
assert.match(sceneSource, /const heatCapacityScenePalettes/, 'heat-capacity 3D scene should centralize dark and light scene material palettes');
assert.match(sceneSource, /light:\s*\{[\s\S]*background:\s*'#eaf1f8'/, 'light heat-capacity scene should use a dedicated pale blue-gray background');
assert.match(sceneSource, /light:\s*\{[\s\S]*stopcockGlass:\s*'#b8e4f6'/, 'light heat-capacity scene should give the glass stopcock a stronger dedicated glass tint');
assert.match(sceneSource, /light:\s*\{[\s\S]*stopcockEdge:\s*'#3f6f92'/, 'light heat-capacity scene should give the glass stopcock a dedicated blue-gray outline');
assert.match(sceneSource, /light:\s*\{[\s\S]*stopcockBodyOpacity:\s*0\.32[\s\S]*stopcockCoreOpacity:\s*0\.44[\s\S]*stopcockHandleOpacity:\s*0\.82/, 'light heat-capacity scene should reduce over-transparent stopcock materials');
assert.match(sceneSource, /<color attach="background" args=\{\[scenePalette\.scene\.background\]\}/, 'heat-capacity Canvas background should come from the active scene palette');
assert.match(sceneSource, /scenePalette=\{scenePalette\}/, 'heat-capacity scene content should receive the active material palette');
assert.match(sceneSource, /const scenePalette = heatCapacityScenePalettes\[sceneTheme\];[\s\S]*const canvasProps = useMemo/, 'scene theme palette selection should stay independent from performance-mode DPR selection');
assert.match(hardSphereLayerSource, /sceneTheme:\s*HeatCapacityHardSphereSceneTheme/, 'hard-sphere particles should receive the 3D scene theme for light-mode contrast');
assert.match(sceneSource, /sceneTheme=\{props\.sceneTheme\}/, 'hard-sphere particle layer should receive the active scene theme');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-instrument-scene/, 'light theme should style the heat-capacity 3D container separately');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-focus-panel/, 'light theme should restyle heat-capacity 3D focus panels');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-hard-sphere-tooltip/, 'light theme should restyle the hard-sphere tooltip');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-demo-step-panel/, 'light theme should restyle the heat-capacity auto-demo step panel');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-demo-complete-toast/, 'light theme should restyle centered heat-capacity demo and guide status toasts');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-pressure-warning/, 'light theme should restyle the centered heat-capacity pressure alarm panel');
assert.match(sceneSource, /props\.performanceMode === 'standard'\s*\?\s*2\.5/, 'standard tier should use visible supersampling for clearer 3D output');
assert.match(sceneSource, /props\.performanceMode === 'balanced'\s*\?\s*1\.5/, 'balanced tier should stay visibly between standard and performance tiers');
assert.match(sceneSource, /props\.performanceMode === 'ultra'\s*\?\s*1\.75/, 'ultra tier should use a higher fixed DPR for the GLB model without matching the standard supersampling cost');
assert.match(sceneSource, /isOrbitInteracting \|\| props\.performanceMode === 'performance'/, 'ultra tier should stop sharing the lowest-load interaction-quality path after GLB integration');
assert.match(sceneSource, /const highClarityMode = props\.performanceMode === 'standard';/, 'high-clarity rendering extras should only be enabled for the standard display-quality tier');
assert.match(sceneSource, /<PressureBottle[\s\S]*highClarityMode=\{highClarityMode\}/, 'high-clarity mode should strengthen glass vessel and stopcock clarity');
assert.match(sceneSource, /<InstrumentLeads[\s\S]*highClarityMode=\{highClarityMode\}/, 'high-clarity mode should strengthen lead wire readability');
assert.match(sceneSource, /<InstrumentBox[\s\S]*highClarityMode=\{highClarityMode\}/, 'high-clarity mode should strengthen instrument panel and screen edges');
assert.match(sceneSource, /opacity=\{highClarityMode \? 0\.22 : 0\.16\}/, 'high-clarity glass vessel should be less washed out while keeping transparency');
assert.match(sceneSource, /transmission=\{highClarityMode \? 0\.3 : 0\.45\}/, 'high-clarity glass vessel should reduce transmission slightly for clearer boundaries');
assert.match(sceneSource, /scenePalette\.glass\.stopcockOutlineVisible \|\| highClarityMode/, 'high-clarity mode should show stopcock outlines even in the dark palette');
assert.match(sceneSource, /highClarityMode \? <Edges color=\{scenePalette\.instrument\.hoverHalo\} \/> : null/, 'high-clarity mode should add visible instrument and display screen edges');
assert.match(sceneSource, /lineWidth=\{highClarityMode \? 3 : 2\}/, 'high-clarity mode should slightly thicken the positive lead');
assert.match(sceneSource, /lineWidth=\{highClarityMode \? 4 : 3\}/, 'high-clarity mode should slightly thicken the negative lead');
assert.match(sceneSource, /lineWidth=\{highClarityMode \? 5 : 4\}/, 'high-clarity mode should slightly thicken the pressure lead');
assert.match(sceneSource, /\}\), \[cameraViewScheme, props\.performanceMode\]\);/, 'performance-mode canvas memoization should include the active camera scheme without remounting on theme-only changes');
assert.match(sceneSource, /const panelTextUpdateIntervalMs = panelTextInteractionReduced[\s\S]*\?\s*400[\s\S]*\(performanceMode === 'performance' \|\| performanceMode === 'ultra'\)[\s\S]*\?\s*250[\s\S]*performanceMode === 'balanced'[\s\S]*\?\s*180[\s\S]*:\s*120/, 'digital screen refresh should keep the Ultra GLB renderer on the low-load update cadence');
assert.doesNotMatch(sceneSource, /panelTextUpdateIntervalMs[\s\S]{0,260}1000/, 'digital screen refresh should not fall back to a one-second update interval');
assert.doesNotMatch(sceneSource, /\[0\.75,\s*1\]/, 'performance mode should no longer use sub-1 DPR that blurs the scene');
assert.match(sceneSource, /texture\.dispose\(\)/, 'instrument panel text should dispose GPU texture resources on unmount');
assert.match(sceneSource, /<planeGeometry args=\{\[0\.46, 0\.115\]\}/, 'instrument panel labels should be rendered as face-mounted planes');
assert.match(sceneSource, /onPowerToggle/);
assert.match(sceneSource, /interactionLocked: boolean/, 'instrument scene should receive an interaction lock during auto demo');
assert.match(sceneSource, /language: 'zh-CN' \| 'zh-TW' \| 'en'/, 'instrument scene should receive the current language');
assert.match(sceneSource, /hardSphereViewEnabled: boolean/, 'instrument scene should receive the hard-sphere teaching layer state');
assert.match(sceneSource, /HeatCapacityHardSphereToggle/, 'instrument scene should render a fixed overlay hard-sphere toggle');
assert.match(sceneSource, /HeatCapacityHardSphereLayer/, 'instrument scene should render the hard-sphere particle layer inside the 3D canvas');
assert.match(hardSphereToggleSource, /data-heat-capacity-hard-sphere-toggle="true"/, 'hard-sphere toggle should have a stable UI marker');
assert.match(hardSphereToggleSource, /descriptionId\?:\s*string/, 'hard-sphere toggle should accept a tooltip description id for keyboard focus');
assert.match(hardSphereToggleSource, /title=\{disabled \? undefined : enabled \? copy\.tooltipOn : copy\.tooltipOff\}/, 'disabled hard-sphere toggle should not expose the normal teaching tooltip');
assert.match(sceneSource, /data-heat-capacity-hard-sphere-tooltip="true"/, 'hard-sphere explanation should have a stable tooltip marker');
assert.doesNotMatch(sceneSource, /const hardSphereViewUnavailable = props\.performanceMode === 'ultra'/, 'Ultra GLB tier should no longer disable the hard-sphere teaching layer');
assert.match(sceneSource, /const hardSphereViewActive = props\.hardSphereViewEnabled;/, 'Ultra GLB tier should preserve the saved hard-sphere enabled state');
assert.match(sceneSource, /const hardSphereTooltipId = 'heat-capacity-hard-sphere-tooltip';/, 'hard-sphere explanation should remain available from the toggle hover anchor in Ultra');
assert.match(sceneSource, /studio-heat-hard-sphere-tooltip-anchor[\s\S]*title=\{`\$\{hardSphereNoteCopy\.title\}/, 'hard-sphere explanation title should not be removed for Ultra');
assert.match(sceneSource, /\{hardSphereTooltipId \? \([\s\S]*data-heat-capacity-hard-sphere-tooltip="true"[\s\S]*\) : null\}/, 'hard-sphere explanation panel should remain available for all supported model tiers');
assert.doesNotMatch(sceneSource, /data-heat-capacity-hard-sphere-note="true"/, 'hard-sphere explanation should not remain as a persistent note panel');
assert.match(sceneSource, /sceneShouldAnimate = hardSphereViewActive/, 'enabled particle visualization should keep the demand-rendered scene animating only when the selected tier supports it');
assert.match(sceneSource, /data-heat-capacity-hard-sphere-view=\{hardSphereViewActive \? 'true' : undefined\}/, 'Ultra GLB tier should expose the particle-view scene marker when particles are enabled');
assert.match(sceneSource, /<InstrumentSceneContent[\s\S]*hardSphereViewEnabled=\{hardSphereViewActive\}/, 'procedural fallback should receive the effective hard-sphere visibility state');
assert.match(sceneSource, /<HeatCapacityUltraInstrumentModel[\s\S]*hardSphereViewEnabled=\{hardSphereViewActive\}/, 'Ultra GLB model should receive the enabled effective hard-sphere visibility state');
assert.match(hardSphereLayerSource, /containerProfile\?: 'skeleton-box' \| 'ultra-cylinder';/, 'hard-sphere layer should expose separate container profiles for the procedural skeleton and Ultra GLB');
assert.doesNotMatch(hardSphereLayerSource, /motionMode|pump-only|staticMotionOnly/, 'hard-sphere layer should not keep retired breakpoint-only motion modes after Ultra release synchronization is connected');
assert.match(hardSphereLayerSource, /createHeatCapacityHardSphereCylinderContainer/, 'hard-sphere layer should create an Ultra cylinder container instead of reusing the skeleton box');
assert.match(hardSphereLayerSource, /particleRadius: PARTICLE_RADIUS,[\s\S]*particleCountScale: 1,[\s\S]*'ultra-cylinder':[\s\S]*particleRadius: ULTRA_HARD_SPHERE_PARTICLE_RADIUS,[\s\S]*particleCountScale: 0\.75/, 'Ultra GLB should scale only its cylinder particle radius and count without changing the skeleton profile');
assert.match(hardSphereLayerSource, /resolveProfileParticleCount\(currentVisual\.targetParticleCount,\s*hardSphereProfile\)/, 'hard-sphere layer should apply the active profile particle-count scale before stepping the simulation');
assert.match(hardSphereLayerSource, /instancedMesh/, 'hard-sphere particles should use an instanced mesh');
assert.match(hardSphereLayerSource, /HEAT_CAPACITY_HARD_SPHERE_MAX_PARTICLES/, 'hard-sphere layer should cap the particle pool');
assert.match(
  hardSphereLayerSource,
  /createHeatCapacityHardSphereSimulation/,
  'hard-sphere layer should create the reusable pure simulation state',
);
assert.match(
  hardSphereLayerSource,
  /stepHeatCapacityHardSphereSimulation/,
  'hard-sphere layer should step particles through the pure simulation module',
);
assert.doesNotMatch(
  hardSphereLayerSource,
  /const resolveWallBounce =/,
  'hard-sphere layer should no longer own wall collision logic',
);
assert.match(hardSphereLayerSource, /new THREE\.SphereGeometry\(1,\s*16,\s*16\)/, 'hard-sphere particles should pass a smooth explicit sphere geometry to the instanced mesh');
assert.match(hardSphereLayerSource, /new THREE\.MeshStandardMaterial/, 'hard-sphere particles should use a lit material with visible spherical shading');
assert.match(hardSphereLayerSource, /vertexColors:\s*true/, 'hard-sphere particles should support speed-dependent per-instance colors');
assert.match(hardSphereLayerSource, /resolveHeatCapacityHardSphereTemperatureColor/, 'hard-sphere particles should resolve color from a dedicated temperature color ramp');
assert.match(hardSphereLayerSource, /temperatureColorFactor/, 'hard-sphere particles should receive the temperature color factor separately from speed');
assert.doesNotMatch(hardSphereLayerSource, /speedBand/, 'hard-sphere particle color should not be derived from speed bands');
assert.doesNotMatch(hardSphereLayerSource, /particle\.thermalBias[\s\S]*setColorAt/, 'hard-sphere particle colors should not add per-particle thermal hue bias when the same temperature should map to one color');
assert.match(hardSphereLayerSource, /dark:\s*\{[\s\S]*material:\s*'#ffffff'[\s\S]*emissive:\s*'#22d3ee'/, 'dark hard-sphere particles should keep a dark-scene material tuning separate from the temperature ramp');
assert.match(hardSphereLayerSource, /light:\s*\{[\s\S]*material:\s*'#ffffff'[\s\S]*emissive:\s*'#06a6bd'/, 'light hard-sphere particles should keep a light-scene material tuning separate from the temperature ramp');
assert.match(hardSphereLayerSource, /emissiveBase:\s*0\.36[\s\S]*emissiveScale:\s*0\.38[\s\S]*opacityBase:\s*0\.93/, 'light hard-sphere particles should be brighter and more opaque than the old dark-scene material defaults');
assert.match(hardSphereLayerSource, /neutralParticleMaterialColor/, 'hard-sphere particle material should use a neutral base so instance colors are not multiplied into the wrong hue');
assert.doesNotMatch(hardSphereLayerSource, /material\.color\.copy\(particleColors\.material\)/, 'hard-sphere material color must not tint and cancel per-instance thermal colors');
assert.match(hardSphereLayerSource, /const visualTemperatureColor = scratchVisualTemperatureColor\.set\(resolveHeatCapacityHardSphereTemperatureColor\(sceneTheme, visualState\.temperatureColorFactor\)\)/, 'hard-sphere particle material glow should follow only the live temperature color');
assert.match(hardSphereLayerSource, /material\.emissive\.copy\(visualTemperatureColor\)/, 'hard-sphere particle glow should not stay fixed cyan across temperature bands');
assert.match(hardSphereLayerSource, /return scratchParticleColor\.copy\(temperatureColor\)/, 'hard-sphere instance colors should use the resolved temperature color directly');
assert.match(hardSphereLayerSource, /setColorAt/, 'hard-sphere particles should update instance colors from their current temperature color');
assert.match(hardSphereLayerSource, /instanceColor\.needsUpdate/, 'hard-sphere particle color changes should reach the instanced mesh');
assert.match(hardSphereLayerSource, /HEAT_CAPACITY_HARD_SPHERE_VISUAL_SMOOTHING_RESPONSE_S/, 'hard-sphere temperature color should use a visible smoothing response instead of jumping to the target color');
assert.match(hardSphereLayerSource, /displayVisualStateRef/, 'hard-sphere layer should keep a display visual state separate from the instantaneous target state');
assert.match(hardSphereLayerSource, /smoothHeatCapacityHardSphereVisualState/, 'hard-sphere layer should smooth temperature-driven visual fields frame by frame');
assert.match(hardSphereLayerSource, /applyVisualMaterial\(particleMaterial,\s*displayVisualState,/, 'hard-sphere material glow should use the smoothed display visual state');
assert.match(hardSphereLayerSource, /getParticleColor\(displayVisualState,\s*sceneTheme\)/, 'hard-sphere instance colors should use the smoothed display visual state');
assert.match(hardSphereLayerSource, /depthTest:\s*true/, 'hard-sphere particles should respect scene depth and not cover foreground instruments');
assert.doesNotMatch(hardSphereLayerSource, /depthTest:\s*false/, 'hard-sphere particles should not render as an always-on-top overlay');
assert.doesNotMatch(hardSphereLayerSource, /particle\.size|size:\s*0\.88/, 'hard-sphere particles should keep a uniform visual size');
assert.doesNotMatch(hardSphereLayerSource, /exitScale/, 'hard-sphere particles should not shrink during release; visible particles should keep a constant radius until hidden');
assert.match(hardSphereLayerSource, /dummyObject\.scale\.setScalar\(visible \? hardSphereProfile\.particleRadius : 0\)/, 'hard-sphere particles should render at the active profile radius whenever visible');
assert.doesNotMatch(hardSphereLayerSource, /renderOrder=\{8\}/, 'hard-sphere particles should not use a high render order that covers the instrument');
assert.match(sceneSource, /name="VesselGlassCube"[\s\S]{0,320}depthWrite=\{false\}/, 'transparent glass bottle should not hide internal hard-sphere particles through depth writes');
assert.match(sceneSource, /name="BottleMouthNeck"[\s\S]{0,320}depthWrite=\{false\}/, 'transparent bottle neck should not hide internal hard-sphere particles through depth writes');
assert.match(sceneSource, /name="BottleMouthRim"[\s\S]{0,320}depthWrite=\{false\}/, 'transparent bottle rim should not hide internal hard-sphere particles through depth writes');
assert.match(sceneSource, /name="TopNeck"[\s\S]{0,320}depthWrite=\{false\}/, 'transparent top neck should not hide internal hard-sphere particles through depth writes');
assert.doesNotMatch(hardSphereLayerSource, /args=\{\[undefined,\s*undefined,/, 'hard-sphere instanced mesh should not initialize with empty geometry and material');
assert.match(sceneSource, /gasAmountRatio=\{props\.gasAmountRatio\}/, 'hard-sphere scene should pass physical gas amount so particle count matches pumped and released gas');
assert.match(sceneSource, /gasTemperatureK=\{props\.gasTemperatureK\}/, 'hard-sphere scene should pass physical gas temperature for color and speed mapping');
assert.match(sceneSource, /ambientTemperatureK=\{props\.ambientTemperatureK\}/, 'hard-sphere scene should pass ambient temperature for relative thermal visualization');
assert.match(sceneSource, /releaseFlowActive=\{props\.releaseFlowActive\}/, 'hard-sphere scene should pass confirmed release flow instead of click timing');
assert.match(sceneSource, /stopcockFlowOpen=\{props\.stopcockFlowOpen\}/, 'hard-sphere scene should distinguish confirmed stopcock flow from the visual valve angle');
assert.match(hardSphereModelSource, /type HeatCapacityHardSphereReleasePhase[\s\S]*'post-release-exchange'/, 'hard-sphere model should define an explicit release timeline phase for long-open exchange');
assert.match(sceneSource, /releaseTimeline:\s*HeatCapacityHardSphereReleaseTimeline/, 'instrument scene should receive the hard-sphere release timeline');
assert.match(sceneSource, /releaseTimeline=\{props\.releaseTimeline\}/, 'instrument scene should pass the release timeline into the hard-sphere layer');
assert.match(sceneSource, /<HeatCapacityUltraInstrumentModel[\s\S]*releaseTimeline=\{props\.releaseTimeline\}/, 'Ultra model should receive the same hard-sphere release timeline props');
assert.doesNotMatch(hardSphereLayerSource, /pumpMotionEnabled|releaseMotionEnabled/, 'hard-sphere layer should not keep old pump/release motion gates after the full Ultra path is connected');
assert.match(hardSphereLayerSource, /releaseTimeline\?:\s*HeatCapacityHardSphereReleaseTimeline/, 'hard-sphere layer should consume a release timeline instead of inferring release solely from pressure');
assert.match(hardSphereLayerSource, /getHeatCapacityHardSphereScheduleFrame/, 'hard-sphere layer should use the deterministic visual schedule for release budgeting');
assert.match(hardSphereLayerSource, /submittedReleaseExitCountRef/, 'hard-sphere layer should track cumulative release budget already sent to the simulation');
assert.match(hardSphereLayerSource, /expectedExitedCount[\s\S]*submittedReleaseExitCountRef\.current/, 'hard-sphere layer should catch up from schedule progress instead of stretching release during slow frames');
assert.match(hardSphereLayerSource, /releaseScheduleDeltaS\s*=\s*Math\.min\(Math\.max\(delta,\s*0\),\s*0\.5\)/, 'hard-sphere release schedule should advance from visual frame time instead of the capped physics substep delta');
assert.doesNotMatch(hardSphereLayerSource, /previousTargetParticleCount\s*-\s*currentVisual\.targetParticleCount/, 'hard-sphere release should not trim particles from target-count deltas during scheduled release');
assert.match(sceneSource, /hardSphereVisualResetKey:\s*number/, 'heat-capacity scene should accept a hard-sphere visual reset key');
assert.match(workbenchSource, /hardSphereVisualResetKey=\{heatCapacityFocusResetKey\}/, 'Free Mode reset should propagate the existing focus reset key to the hard-sphere particle pool');
assert.match(hardSphereLayerSource, /visualResetKey\?:\s*number/, 'hard-sphere layer should accept reset events from the workbench');
assert.match(hardSphereLayerSource, /\},\s*\[enabled,\s*hardSphereProfile,\s*particleMultiplier,\s*visualResetKey\]\)/, 'hard-sphere layer should rebuild the particle pool when reset events, container profiles, or performance particle presets change');
assert.match(workbenchSource, /FREE_RELEASE_RESPONSE_DELAY_S[\s\S]*FREE_RELEASE_MAIN_DURATION_S/, 'Workbench should use the existing free-mode release timing constants for particle visualization');
assert.match(workbenchSource, /const heatCapacityHardSphereReleaseTimeline/, 'Workbench should build a unified hard-sphere release timeline for the scene');
assert.match(workbenchSource, /phase:\s*'post-release-exchange'/, 'Workbench should map long-open stopcock state to post-release exchange for hard-sphere visualization');
assert.doesNotMatch(sceneSource, /releaseBurstActive=\{props\.pressureReleaseBurstActive\}/, 'particle outflow must not be driven by the click-time release burst window');
assert.match(workbenchSource, /const heatCapacitySceneNow = Date\.now\(\)/, 'Workbench should use one scene timestamp when deriving release flow props');
assert.match(workbenchSource, /const freeReleaseFlowActive = activeFile\.heatCapacityMode === 'free'[\s\S]*activeFile\.heatCapacityFreeStopcockFlowOpen[\s\S]*activeReleaseProcess !== null[\s\S]*freeReleaseProgress > 0/, 'Free Mode should keep using confirmed physics release flow for particles');
assert.match(workbenchSource, /const teachingReleaseFlowActive = activeFile\.heatCapacityMode !== 'free'[\s\S]*teachingStopcockFlowOpen[\s\S]*teachingReleaseRemainingMs > 0/, 'Demo and Guide modes should convert confirmed open-stopcock release windows into particle outflow');
assert.match(workbenchSource, /const releaseFlowActive = freeReleaseFlowActive \|\| teachingReleaseFlowActive/, 'particle release flow should combine Free and teaching modes instead of Free Mode only');
assert.match(workbenchSource, /const stopcockFlowOpen = activeFile\.heatCapacityMode === 'free'[\s\S]*activeFile\.heatCapacityFreeStopcockFlowOpen[\s\S]*teachingStopcockFlowOpen/, 'particle stopcock-flow state should come from the relevant mode');
assert.match(sceneSource, /pressureDeltaKPa=\{props\.pressureDeltaKPa\}/, 'hard-sphere scene should still pass runtime pressure difference for secondary flow intensity and gauges');
assert.match(hardSphereLayerSource, /pressureDeltaKPa\?:\s*number/, 'hard-sphere particle layer should accept runtime pressure difference independent of powered instrument readouts');
assert.match(hardSphereLayerSource, /gasAmountRatio\?:\s*number/, 'hard-sphere particle layer should accept physical gas amount for molecule count');
assert.match(hardSphereLayerSource, /releaseFlowActive\?:\s*boolean/, 'hard-sphere particle layer should accept confirmed release flow state');
assert.doesNotMatch(hardSphereLayerSource, /releaseProgress\?:\s*number|releaseProgress,/, 'hard-sphere particle layer should not keep the old release-progress prop after adopting release timelines');
assert.doesNotMatch(hardSphereLayerSource, /outflowActive:\s*actualOutflow[\s\S]*releaseBurstActive === true && input\.glassStopcockOpen/, 'hard-sphere outflow must not be triggered by visual stopcock click state');
assert.match(hardSphereLayerSource, /material\.emissiveIntensity = clampNumber\(\s*particleColors\.emissiveBase \+ visualState\.emissiveIntensity \* particleColors\.emissiveScale/, 'hard-sphere particle brightness should be theme-specific instead of sharing one dark-scene formula');
assert.match(stateSource, /HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA/, 'workbench state should use an explicit pressure-difference threshold for stopcock release');
assert.match(stateSource, /pressureReleaseBurstUntilMs/, 'heat-capacity state should persist the one-second pressure release burst window');
assert.match(sessionSource, /pressureReleaseBurstUntilMs:\s*normalizeNullableNumber/, 'session migration should preserve the pressure release burst timestamp when present');
assert.doesNotMatch(stateSource, /prepareHeatCapacityAutoDemoStart[\s\S]{0,2600}hardSphereViewEnabled:\s*false/, 'auto demo start should not clear the hard-sphere teaching toggle');
assert.doesNotMatch(stateSource, /markHeatCapacityDemoComplete[\s\S]{0,1800}hardSphereViewEnabled:\s*false/, 'auto demo completion should not clear the hard-sphere teaching toggle');
assert.match(sceneSource, /heatCapacitySceneCopies/, 'instrument scene should localize its internal labels and hints');
assert.match(sceneSource, /getHeatCapacityInteractionHints\(focusMode, sceneCopy\)/, 'instrument hints should use localized copy');
assert.match(sceneSource, /getHeatCapacityHoverTooltip\(hoveredControl, props\.pumpValveOpen, sceneCopy\)/, 'hover tooltips should use localized copy');
assert.match(sceneSource, /demoFocusControlId/, 'instrument scene should receive the current auto-demo focus target');
assert.match(sceneSource, /onLockedInteraction/, 'instrument scene should surface locked user interaction attempts');
assert.match(sceneSource, /DemoFocusHalo/, 'auto demo should render a soft focus halo before operating controls');
assert.match(sceneSource, /onStopcockOpenChange/, 'instrument scene should expose a two-state stopcock open/closed action');
assert.doesNotMatch(sceneSource, /onStopcockAngleChange/, 'stopcock should no longer expose a continuous angle-change API to the UI');
assert.doesNotMatch(sceneSource, /onPressureZero\b/, 'pressure-zero knob should not expose a one-click zero action');
assert.match(sceneSource, /onPressureZeroFineAdjust/, 'instrument scene should expose pressure zero fine wheel adjustment');
assert.match(sceneSource, /onPressureZeroCoarseAdjust/, 'instrument scene should expose pressure zero coarse drag adjustment');
assert.match(sceneSource, /GLB replacement contract/i);
assert.match(sceneSource, /name="SensorStopperPort"/);
assert.match(sceneSource, /name="StopcockDownTube"/);
assert.match(sceneSource, /name="pumpAssembly"/, 'external pump assembly should have a stable GLB replacement root');
assert.match(sceneSource, /name="pumpPortOnStopper"/, 'stopper should expose an independent pump port');
assert.match(sceneSource, /name="pumpTube"/, 'pump tube should connect the stopper pump port to the external bulb');
assert.match(sceneSource, /name="pumpValve"/, 'pump valve should sit near the stopper-side pump route');
assert.match(sceneSource, /name="pumpValveHandle"/, 'pump valve should expose a handle for open/closed interaction');
assert.match(sceneSource, /name="pumpBulb"/, 'external pump bulb should exist');
assert.match(sceneSource, /name="pumpBulbHitbox"/, 'pump bulb should expose an independent click target');
assert.match(sceneSource, /name="pumpPortOnStopper" position=\{\[-1\.72, 0\.9, 0\.26\]\}/, 'pump port should move to the left side of the stopper');
assert.match(sceneSource, /name="pumpShortConnectorIn"/, 'pump route should include a short inlet connector before the inline valve body');
assert.match(sceneSource, /name="pumpShortConnectorOut"/, 'pump route should include a short outlet connector after the inline valve body');
assert.match(sceneSource, /name="pumpValveBody"/, 'pump valve body should be the fixed inline segment of the pump route');
assert.match(sceneSource, /name="pumpPortOnStopper"[\s\S]*name="pumpShortConnectorIn"[\s\S]*name="pumpValve"[\s\S]*name="pumpValveBody"[\s\S]*name="pumpShortConnectorOut"[\s\S]*name="pumpTube"/, 'pump route should read as stopper port -> inlet connector -> inline valve -> outlet connector -> tube');
assert.match(sceneSource, /name="pumpValve"[\s\S]*position=\{\[-1\.72, 0\.9, 0\.54\]\}/, 'inline valve should sit on the same local centerline as the stopper pump port and tube inlet');
assert.match(sceneSource, /name="pumpValveBody"[\s\S]*rotation=\{\[Math\.PI \/ 2, 0, 0\]\}/, 'inline valve body should be aligned with the pump tube axis rather than attached as a side decoration');
assert.match(sceneSource, /name="pumpValveHandle" position=\{\[0, 0, 0\]\} rotation=\{\[0, valveHandleAngle(?: \+ valveRollbackOffset)?, 0\]\}/, 'inline valve handle should rotate around the valve body center without moving the valve body');
assert.match(sceneSource, /name="pumpTube"[\s\S]*\[-1\.72, 0\.9, 0\.74\]/, 'pump tube should start from the inline valve outlet, not bypass the valve from the stopper port');
assert.match(sceneSource, /\[-2\.18, 0\.72, 0\.92\][\s\S]*\[-2\.18, -0\.3, 1\.52\][\s\S]*\[1\.66, -0\.98, 1\.08\]/, 'pump tube should route around the outside before reaching the bulb');
assert.match(sceneSource, /name="pumpTube"[\s\S]*lineWidth=\{8\}/, 'pump tube should be visibly thicker than temperature and pressure leads');
assert.match(sceneSource, /name="pumpValveBody"/, 'pump valve should use a recognizable metal ball-valve body');
assert.match(sceneSource, /name="pumpValveWingHandle"/, 'pump valve should use a wing or lever handle instead of a plain block');
assert.match(sceneSource, /name="pumpValveStateBadge"/, 'pump valve should expose a local open-closed status badge without repainting the whole body');
assert.match(sceneSource, /setValveHandleAngle/, 'pump valve handle should animate smoothly between open and closed states');
assert.match(sceneSource, /PUMP_VALVE_TRANSITION_MS = 420/, 'pump valve demo/manual animation should remain visibly smooth');
assert.match(sceneSource, /const durationMs = PUMP_VALVE_TRANSITION_MS;/, 'glass stopcock transition should use the same smooth duration as the pump valve');
assert.match(sceneSource, /demoHalo:\s*'#bae6fd'/, 'dark focus halo should keep the existing breathing color');
assert.match(sceneSource, /light:\s*\{[\s\S]*effects:\s*\{[\s\S]*demoHalo:\s*'#0284c7'[\s\S]*demoHaloMinOpacity:\s*0\.34[\s\S]*demoHaloMaxOpacity:\s*0\.72/, 'light focus halo should have a stronger independent breathing range');
assert.match(sceneSource, /const scale = focusHaloBaseScale \+ pulse \* focusHaloPulseScale/, 'auto demo focus halo should read its pulse scale from explicit props');
assert.match(sceneSource, /materialRef\.current\.opacity = focusHaloMinOpacity \+ pulse \* \(focusHaloMaxOpacity - focusHaloMinOpacity\)/, 'auto demo focus halo should read opacity from theme-specific props');
assert.match(sceneSource, /focusHaloMinOpacity=\{scenePalette\.effects\.demoHaloMinOpacity\}/, 'focus halo opacity should come from the active scene palette');
assert.match(sceneSource, /light:\s*\{[\s\S]*nonBulbHoverHaloOpacity:\s*0\.34[\s\S]*glassHoverHaloOpacity:\s*0\.3[\s\S]*pumpBulbHoverHaloOpacity:\s*0\.36/, 'light hover halos should be stronger than the dark-mode defaults');
assert.match(sceneSource, /name="pumpValveHandle" position=\{\[0, 0, 0\]\} rotation=\{\[0, valveHandleAngle(?: \+ valveRollbackOffset)?, 0\]\}/, 'pump valve handle should rotate around its own vertical center axis in a horizontal plane');
assert.match(sceneSource, /name="pumpValveWingHandle" position=\{\[0, 0\.18, 0\]\}/, 'pump valve wing should sit above the fixed inline body while rotating around the valve body center axis');
assert.doesNotMatch(sceneSource, /name="pumpValveHandle"[\s\S]{0,120}rotation=\{\[0, 0, valveHandleAngle\]\}/, 'pump valve handle should not flip around the screen-facing Z axis');
assert.match(sceneSource, /onPumpValveToggle/, 'instrument scene should receive pump valve state updates from the workbench');
assert.match(sceneSource, /onPumpBulbPress/, 'instrument scene should report pump bulb presses to the workbench state');
assert.match(sceneSource, /pumpPulseId: number/, 'pump bulb visual feedback should receive a UI-only retrigger signal');
assert.match(sceneSource, /pumpPulseId=\{props\.pumpPulseId\}/, 'pump pulse signal should reach the pump assembly without being persisted in experiment state');
assert.match(sceneSource, /focusMode=\{props\.focusMode\}/, 'pump assembly should know whether it is in pump focus mode');
assert.match(sceneSource, /onPointerDown=\{focusMode === 'pump' \? handlePumpBulbPointerDown : undefined\}/, 'pump focus mode should use pointer down for rapid pump clicks');
assert.match(sceneSource, /if \(focusMode === 'pump'\) return;/, 'pump focus mode click events should not be filtered by click detail or double count after pointer down');
assert.doesNotMatch(sceneSource, /name="pumpBulb"[\s\S]*onClick=\{\(event\) => \{[\s\S]*onPumpBulbPress\(\);[\s\S]*onDoubleClick/, 'single-clicking the pump bulb outside pump focus should not trigger an effective pump stroke');
assert.doesNotMatch(sceneSource, /name="pumpAssembly"[\s\S]{0,260}onDoubleClick/, 'the pump assembly wrapper should not send valve or tube double-clicks into pump focus');
assert.match(sceneSource, /name="pumpBulb"[\s\S]*onDoubleClick/, 'double-clicking the pump bulb should enter the pump focus panel directly');
assert.doesNotMatch(sceneSource, /name="pumpBulb"[\s\S]{0,260}nativeEvent as MouseEvent\)\.detail > 1[\s\S]{0,120}onPumpBulbPress/, 'pump focus mode should not lose rapid clicks through native click-detail filtering');
assert.match(pumpValveSceneSection, /const handlePumpValveDoubleClick = \(event: ThreeEvent<MouseEvent>\) => \{[\s\S]*clearPumpValveSingleClick\(\);[\s\S]*onFocus\('stopcock'\);/, 'pump valve double-click should enter the shared stopcock and valve focus panel after canceling pending single-click toggle');
assert.doesNotMatch(sceneSource, /name="pumpValve"[\s\S]{0,900}onFocus\('pump'\)/, 'double-clicking the pump valve should not enter the pump-bulb focus view');
assert.match(sceneSource, /data-heat-capacity-valve-focus-pump-valve-toggle="true"/, 'combined valve focus view should expose a direct pump valve toggle');
assert.match(sceneSource, /setHoveredControl\('pumpBulb'\)/, 'pump bulb should expose hover feedback');
assert.match(sceneSource, /setHoveredControl\('pumpValve'\)/, 'pump valve should expose hover feedback');
assert.match(sceneSource, /setHoveredControl\('stopcock'\)/, 'stopcock handle should expose hover feedback for two-state switching');
assert.match(sceneSource, /setHoveredControl\('powerSwitch'\)/, 'power switch should expose hover feedback');
assert.match(sceneSource, /setHoveredControl\('pressureZero'\)/, 'pressure zero knob should expose hover feedback');
assert.match(sceneSource, /点击切换玻璃旋塞状态|Click to toggle the glass stopcock/, 'stopcock hover tooltip should describe only the two-state click interaction');
assert.match(sceneSource, /Pump valve: click to toggle|打气阀门：点击切换/, 'pump valve hover tooltip should name the control before explaining interaction');
assert.match(sceneSource, /Pump bulb: enter focus|打气球：聚焦/, 'pump bulb hover tooltip should name the control before explaining interaction');
assert.match(sceneSource, /Power switch: click to toggle power|电源开关：点击/, 'power switch hover tooltip should name the control before explaining interaction');
assert.match(sceneSource, /Pressure-zero knob: drag for coarse adjustment \/ wheel for fine adjustment|压力调零旋钮：拖拽粗调/, 'pressure zero hover tooltip should name the control before explaining coarse drag and fine wheel');
assert.match(sceneSource, /handlePressureZeroWheel/, 'pressure zero knob should support wheel fine adjustment');
assert.match(sceneSource, /startPressureZeroDrag/, 'pressure zero knob should support drag coarse adjustment');
assert.match(sceneSource, /PRESSURE_ZERO_FINE_ANGLE_STEP_DEG/, 'pressure zero fine adjustment should have a tunable angle step');
assert.match(sceneSource, /PRESSURE_ZERO_DRAG_DIRECTION = -1/, 'pressure zero drag should use an explicit direction factor for the current oblique view');
assert.doesNotMatch(sceneSource, /pressureZeroKnobAngle\s*%|pressureZeroKnobAngle[\s\S]{0,80}normalizeDisplayAngle/, 'pressure zero knob should not use modulo-style angle wraparound');
assert.match(sceneSource, /HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG/, 'pressure zero scene interactions should import the physical lower stop');
assert.match(sceneSource, /HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG/, 'pressure zero scene interactions should import the physical upper stop');
assert.match(sceneSource, /clampPressureZeroSceneKnobAngle/, 'pressure zero scene interactions should clamp visual interaction at physical stops');
assert.match(sceneSource, /const requestedKnobAngle = pressureZeroKnobAngle \+ requestedDelta/, 'pressure zero wheel interaction should calculate the requested physical knob angle');
assert.match(sceneSource, /const nextKnobAngle = clampPressureZeroSceneKnobAngle\(requestedKnobAngle\)/, 'pressure zero wheel interaction should stop dispatching once it reaches a physical stop');
assert.match(sceneSource, /const requestedKnobAngle = dragState\.startKnobAngle \+ dragState\.totalDelta/, 'pressure zero drag should derive requested angle from the drag start angle and continuous pointer delta');
assert.match(sceneSource, /const nextKnobAngle = clampPressureZeroSceneKnobAngle\(requestedKnobAngle\)/, 'pressure zero drag should clamp the requested angle before dispatching scene updates');
assert.match(sceneSource, /已到调节上限|Upper adjustment limit reached/, 'pressure zero interaction should show a restrained toast at the upper physical stop');
assert.match(sceneSource, /已到调节下限|Lower adjustment limit reached/, 'pressure zero interaction should show a restrained toast at the lower physical stop');
assert.match(sceneSource, /onLockedInteraction\(limitMessage\)/, 'pressure zero limit feedback should reuse the bottom-centered model-window toast path');
assert.doesNotMatch(sceneSource, /appliedDelta/, 'pressure zero drag should not use unbounded circular applied deltas');
assert.match(stateSource, /HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG = -540/, 'pressure zero knob should expose a three-turn physical lower stop');
assert.match(stateSource, /HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG = 540/, 'pressure zero knob should expose a three-turn physical upper stop');
assert.match(stateSource, /HEAT_CAPACITY_PRESSURE_ZERO_TOLERANCE_MV = 0\.1/, 'pressure zero readiness should use the strict +-0.1 mV tolerance');
assert.match(stateSource, /pressureInitialBiasMv/, 'heat-capacity state should keep the per-run initial zero bias');
assert.match(stateSource, /pressureZeroDisplayedSamples/, 'heat-capacity state should keep a displayed Uₚ zeroing window');
assert.match(stateSource, /createHeatCapacityInitialPressureBiasMv/, 'initial pressure-zero bias should be generated through one helper');
assert.match(stateSource, /isHeatCapacityPressureZeroWithinTolerance/, 'U0 readiness should be based on the displayed sample window');
assert.doesNotMatch(stateSource, /HEAT_CAPACITY_MANUAL_INITIAL_PRESSURE_BIAS_MV\s*=\s*0\.6/, 'manual experiments must not use the old fixed +0.6 mV zero bias');
assert.doesNotMatch(stateSource, /Math\.abs\(file\.pressureDisplayedPlaceholder\)\s*<=\s*0\.2/, 'U0 readiness must not use the old loose <=0.2 mV gate');
assert.match(stateSource, /clampHeatCapacityPressureZeroKnobAngle/, 'pressure zero knob angle changes should clamp at physical stops');
assert.match(stateSource, /getHeatCapacityPressureZeroOffsetForKnobAngle/, 'pressure zero offset should be derived from a continuous angle-to-offset mapping');
assert.match(sceneSource, /pressureZeroInteractionEnabled = focusMode === 'instrument'/, 'pressure zero knob should only rotate in instrument focus mode');
assert.match(sceneSource, /onPointerDown=\{pressureZeroInteractionEnabled \? startPressureZeroDrag : undefined\}/, 'pressure zero drag should be disabled outside instrument focus mode');
assert.match(sceneSource, /onWheel=\{pressureZeroInteractionEnabled \? handlePressureZeroWheel : undefined\}/, 'pressure zero wheel adjustment should be disabled outside instrument focus mode');
assert.match(sceneSource, /name="PressureZeroKnobBody"/, 'pressure zero knob should use a named industrial knob body');
assert.match(sceneSource, /name="PressureZeroKnobFace"/, 'pressure zero knob should expose a distinct front face');
assert.match(sceneSource, /name="PressureZeroKnobCenter"/, 'pressure zero knob should show a clear centered hub');
assert.match(sceneSource, /name="PressureZeroIndicatorLine"/, 'pressure zero knob should use one clear centered indicator line');
assert.match(sceneSource, /name="PressureZeroScaleTick"/, 'pressure zero knob should have simple fixed reference ticks around it');
assert.match(sceneSource, /name="PressureZeroIndicatorGroup" rotation=\{\[0, 0, THREE\.MathUtils\.degToRad\(pressureZeroKnobAngle(?: \+ pressureZeroRollbackOffsetDeg)?\)\]\}[\s\S]*name="PressureZeroIndicatorLine"/, 'pressure zero indicator line should rotate as one centered group');
assert.doesNotMatch(sceneSource, /name="PressureZeroDirectionMark"/, 'pressure zero knob should not keep the old second off-center direction mark');
assert.doesNotMatch(sceneSource, /pressureZeroed=\{props\.pressureZeroed\}/, '3D scene should not keep the obsolete pressureZeroed visual prop path');
assert.doesNotMatch(sceneSource, /setHoveredControl\('instrument'\)/, 'instrument front panel should not expose a hover prompt');
assert.match(sceneSource, /name="StopcockRodHandleHoverHalo"/, 'stopcock hover should use a soft halo instead of a stark white edge');
assert.match(sceneSource, /name="PowerSwitchHoverHalo"/, 'power switch hover should use a soft halo instead of a stark white edge');
assert.match(sceneSource, /name="PressureZeroHoverHalo"/, 'pressure zero hover should use a soft halo instead of a stark white edge');
assert.match(sceneSource, /nonBulbHoverEmissiveIntensity:\s*0\.26/, 'dark non-bulb hover glow should keep the previous strength');
assert.match(sceneSource, /nonBulbHoverHaloOpacity:\s*0\.22/, 'dark non-bulb hover halos should keep the previous strength');
assert.match(sceneSource, /light:\s*\{[\s\S]*nonBulbHoverEmissiveIntensity:\s*0\.36/, 'light non-bulb hover glow should be stronger than the dark baseline');
assert.doesNotMatch(sceneSource, /name="InstrumentFaceHoverSheen"/, 'instrument front panel should not glow on hover');
assert.doesNotMatch(sceneSource, /hoveredControl === 'instrument'/, 'instrument front panel should not keep a hover state branch');
assert.doesNotMatch(sceneSource, /instrumentHovered \? <Edges color="#dbeafe"/, 'instrument hover should not rely on a stark edge outline');
assert.doesNotMatch(sceneSource, /powerSwitchHovered \? <Edges color="#ecfeff"/, 'power switch hover should not rely on a stark edge outline');
assert.doesNotMatch(sceneSource, /pressureZeroHovered \? <Edges color="#ecfeff"/, 'pressure zero hover should not rely on a stark edge outline');
assert.doesNotMatch(sceneSource, /stopcockHovered \? <Edges color="#ecfeff"/, 'stopcock hover should not rely on a stark edge outline');
assert.match(sceneSource, /getHeatCapacityInteractionHints/, '3D scene should show mode-specific interaction hints');
assert.match(sceneSource, /data-heat-capacity-interaction-hints="true"/, 'interaction hint panel should be rendered in the scene chrome');
assert.match(sceneSource, /getHeatCapacityHoverTooltip/, 'hovered controls should expose compact tooltips');
assert.match(sceneSource, /data-heat-capacity-hover-tooltip="true"/, 'hover tooltip should be rendered when an interactive control is hovered');
assert.doesNotMatch(sceneSource, /STOPCOCK_WHEEL_STEP_DEG/, 'stopcock wheel adjustment should be removed from user interaction');
assert.doesNotMatch(sceneSource, /handleStopcockWheel/, 'stopcock handle should not support wheel-based angle adjustment');
assert.doesNotMatch(sceneSource, /onWheel=\{handleStopcockWheel\}/, 'wheel events over the stopcock should no longer adjust the valve');
assert.match(sceneSource, /onStopcockOpenChange\(\)/, 'clicking the stopcock should toggle the latest open/closed state directly');
assert.match(sceneSource, /const HEAT_CAPACITY_DOUBLE_CLICK_GUARD_MS = 220;/, '3D controls should share a short single-click guard window before committing click side effects');
assert.match(sceneSource, /function useGuardedSceneSingleClick\(\)[\s\S]*const schedule = useCallback\(\(run: \(\) => void, guardSingleClick = true\) => \{[\s\S]*if \(!guardSingleClick\) \{[\s\S]*run\(\);[\s\S]*return;[\s\S]*HEAT_CAPACITY_DOUBLE_CLICK_GUARD_MS[\s\S]*return \{ schedule, clear \};/, '3D controls should centralize delayed single-click commits while allowing focused controls to execute immediately');
assert.match(sceneSource, /const \{ schedule: schedulePowerSwitchSingleClick, clear: clearPowerSwitchSingleClick \} = useGuardedSceneSingleClick\(\);[\s\S]*const handlePowerSwitchClick = \(event: ThreeEvent<MouseEvent>\) => \{[\s\S]*schedulePowerSwitchSingleClick\(\(\) => \{[\s\S]*onPowerToggle\(\);[\s\S]*\}, focusMode === 'none'\);[\s\S]*const handlePowerSwitchDoubleClick = \(event: ThreeEvent<MouseEvent>\) => \{[\s\S]*clearPowerSwitchSingleClick\(\);[\s\S]*onFocus\('instrument'\);/, 'power switch double-click should be protected before focus, but focused power clicks should execute immediately');
assert.match(stopcockSceneSection, /const \{ schedule: scheduleStopcockSingleClick, clear: clearStopcockSingleClick \} = useGuardedSceneSingleClick\(\);[\s\S]*const handleStopcockToggle = \(event: ThreeEvent<MouseEvent>\) => \{[\s\S]*scheduleStopcockSingleClick\(\(\) => \{[\s\S]*onStopcockOpenChange\(\);[\s\S]*\}, focusMode === 'none'\);[\s\S]*const handleStopcockDoubleClick = \(event: ThreeEvent<MouseEvent>\) => \{[\s\S]*clearStopcockSingleClick\(\);[\s\S]*onFocus\('stopcock'\);/, 'stopcock double-click should be protected before focus, but focused stopcock clicks should execute immediately');
assert.match(sceneSource, /HOVER_CLEAR_DELAY_MS = 220/, 'hover state should use a short grace period to avoid cursor flicker on projected 3D boundaries');
assert.match(sceneSource, /hoverClearTimerRef/, 'hover state should cancel pending hover clears when entering adjacent meshes');
assert.match(sceneSource, /setStableHoveredControl/, 'hover updates should go through a stable boundary helper');
assert.match(sceneSource, /raycast=\{DISABLE_RAYCAST\}/, 'decorative hover halos should not compete with interaction hitboxes');
assert.doesNotMatch(sceneSource, /ProceduralControlHitTargets|data-heat-capacity-procedural-hit-target|studio-heat-procedural-hit-target/, 'procedural skeleton guide controls should use the original 3D mesh hitboxes, not DOM-backed overlay hit targets');
assert.doesNotMatch(sceneSource, /<Html[\s\S]*data-heat-capacity-procedural-hit-target/, 'procedural control hit regions should not be projected through 2D Html overlays');
assert.doesNotMatch(styleSource, /\.studio-heat-procedural-hit-target/, 'workbench CSS should not keep transparent DOM hit-target styles for 3D instrument controls');
assert.doesNotMatch(sceneSource, /name="HitboxStopcockHandle" visible=\{false\}/, 'stopcock hitbox should remain raycastable instead of being invisible to raycaster');
assert.match(sceneSource, /name="HitboxStopcockHandle"[\s\S]*<boxGeometry args=\{\[1\.02, 0\.72, 0\.34\]\}/, 'stopcock hitbox should stay tight enough not to overlap the pump valve hitbox');
assert.doesNotMatch(sceneSource, /name="HitboxPowerSwitch" visible=\{false\}/, 'power switch hitbox should remain raycastable instead of being invisible to raycaster');
assert.doesNotMatch(sceneSource, /name="HitboxPressureZeroKnob" visible=\{false\}/, 'pressure zero hitbox should remain raycastable instead of being invisible to raycaster');
assert.doesNotMatch(sceneSource, /name="pumpValveHitbox" visible=\{false\}/, 'pump valve hitbox should remain raycastable instead of being invisible to raycaster');
assert.doesNotMatch(sceneSource, /name="pumpBulbHitbox" visible=\{false\}/, 'pump bulb hitbox should remain raycastable instead of being invisible to raycaster');
assert.match(sceneSource, /pumpBulbScale/, 'pump bulb should animate through compression and release scale changes');
assert.match(sceneSource, /\? \[1\.08, 0\.7, 1\.06\][\s\S]*\? \[1\.02, 0\.92, 1\.01\]/, 'pump bulb should compress and reinflate without jelly-like overshoot');
assert.match(sceneSource, /name="pumpBulbStatusHalo"/, 'pump bulb active feedback should be an added halo, not a flat color replacement');
assert.doesNotMatch(sceneSource, /tooFast/, 'pump feedback must not introduce a too-fast state');
assert.match(sceneSource, /name="pumpValve"[\s\S]*onPointerDown=\{\(event\) => \{[\s\S]*stopImmediatePropagation/, 'pump valve pointer events should not bubble into neighboring controls');
assert.match(pumpValveSceneSection, /const \{ schedule: schedulePumpValveSingleClick, clear: clearPumpValveSingleClick \} = useGuardedSceneSingleClick\(\);[\s\S]*const handlePumpValveClick = \(event: ThreeEvent<MouseEvent>\) => \{[\s\S]*schedulePumpValveSingleClick\(\(\) => \{[\s\S]*onPumpValveToggle\(\);[\s\S]*\}, focusMode === 'none'\);[\s\S]*const handlePumpValveDoubleClick = \(event: ThreeEvent<MouseEvent>\) => \{[\s\S]*clearPumpValveSingleClick\(\);[\s\S]*onFocus\('stopcock'\);/, 'pump valve double-click should be protected before focus, but focused valve clicks should execute immediately');
assert.doesNotMatch(sceneSource, /name="pumpValve"[\s\S]{0,420}onStopcockOpenChange/, 'pump valve click path must not call the stopcock action');
assert.match(
  sceneSource,
  /name="AnalogPressureGauge"[\s\S]*name="AnalogPressureGaugeDial"[\s\S]*rotation=\{\[Math\.PI \/ 2, 0, 0\]\}/,
  'analog pressure gauge dial should be vertical on the instrument face',
);
assert.match(sceneSource, /PRESSURE_GAUGE_TICKS/, 'analog pressure gauge should expose visible dial ticks');
assert.match(sceneSource, /tickModelAngle >= gaugeSafetyRotation/, 'analog pressure gauge should derive the danger tick range from the fixed semantic danger boundary');
assert.match(sceneSource, /mapPressureGaugeValueToRotation/, 'analog pressure gauge should use a linear clamp mapping from pressure to angle');
assert.match(sceneSource, /PRESSURE_GAUGE_DANGER_START_ROTATION\s*=\s*0\.86/, 'analog pressure gauge should keep the GLB danger-zone boundary at 0.86 rad');
assert.match(sceneSource, /const gaugeSafetyRotation = PRESSURE_GAUGE_DANGER_START_ROTATION/, 'analog pressure gauge danger ticks should stay on the fixed GLB red-zone boundary');
assert.doesNotMatch(sceneSource, /const gaugeSafetyRotation = mapPressureGaugeValueToRotation/, 'danger marker geometry must not move when the editable danger threshold changes');
assert.match(sceneSource, /const modelPressureGaugeAngleToVisualAngle = \(modelAngle: number\) => Math\.PI \/ 2 - modelAngle;/, 'analog pressure gauge should share the GLB front-view model-to-visual angle conversion');
assert.match(sceneSource, /const tickVisualAngle = modelPressureGaugeAngleToVisualAngle\(tickModelAngle\);/, 'analog pressure gauge ticks should convert semantic model angles before drawing');
assert.match(sceneSource, /position=\{\[Math\.cos\(tickVisualAngle\) \* tickRadius,\s*Math\.sin\(tickVisualAngle\) \* tickRadius/, 'analog pressure gauge tick positions should be drawn from converted visual angles');
assert.match(sceneSource, /rotation=\{\[0, 0, tickVisualAngle\]\}/, 'analog pressure gauge tick rotation should use converted visual angles');
assert.match(sceneSource, /gaugeNeedlePivotRef\.current\.rotation\.z = modelPressureGaugeAngleToVisualAngle\(gaugeDisplayedRotationRef\.current\)/, 'analog pressure gauge needle should convert semantic model angle before rendering');
assert.match(sceneSource, /rotation=\{\[0, 0, modelPressureGaugeAngleToVisualAngle\(gaugeDisplayedRotationRef\.current\)\]\}/, 'analog pressure gauge initial needle rotation should use the shared front-view conversion');
assert.doesNotMatch(sceneSource, /position=\{\[Math\.cos\(tickRotation\) \* tickRadius,\s*Math\.sin\(tickRotation\) \* tickRadius/, 'analog pressure gauge must not place front-view ticks from raw model angles');
assert.doesNotMatch(sceneSource, /rotation=\{\[0, 0, tickRotation\]\}/, 'analog pressure gauge must not rotate visible ticks by raw model angle');
assert.doesNotMatch(sceneSource, /gaugeNeedlePivotRef\.current\.rotation\.z = gaugeDisplayedRotationRef\.current/, 'analog pressure gauge must not render the needle with raw model angle');
assert.doesNotMatch(sceneSource, /GaugeWarning|WarningMarker|warningMarker|#facc15|#f59e0b/, 'analog pressure gauge should not render a yellow warning range');
assert.doesNotMatch(sceneSource, /PRESSURE_GAUGE_DANGER_MARKERS|AnalogPressureGaugeDangerMarker/, 'analog pressure gauge should render one tick layer only, without overlapping red danger marker geometry');
assert.match(sceneSource, /const PRESSURE_GAUGE_NORMAL_TICK_COLOR = '#1e293b';/, 'normal pressure gauge ticks should use a dark high-contrast color on the light dial face');
assert.match(sceneSource, /const PRESSURE_GAUGE_DANGER_TICK_COLOR = '#dc2626';/, 'danger pressure gauge ticks should remain red without a separate duplicate marker layer');
assert.match(sceneSource, /color=\{dangerTick \? PRESSURE_GAUGE_DANGER_TICK_COLOR : PRESSURE_GAUGE_NORMAL_TICK_COLOR\}/, 'normal and danger gauge ticks should be colored from a single tick render path');
assert.match(sceneSource, /getPressureGaugeNeedleRotation/, 'analog pressure gauge should derive needle rotation from pressure data');
assert.match(sceneSource, /gaugePressureMinKPa: number/, 'instrument scene should receive gauge min pressure for gauge data binding');
assert.match(sceneSource, /gaugePressureMaxKPa: number/, 'instrument scene should receive gauge max pressure for gauge data binding');
assert.match(sceneSource, /pressureSafetyThresholdKPa: number/, 'instrument scene should receive pressure safety threshold for warning and danger-area alignment');
assert.match(sceneSource, /useFrame[\s\S]*gaugeNeedlePivotRef\.current\.rotation\.z/, 'analog pressure gauge needle should smoothly track the mapped target angle');
assert.match(sceneSource, /name="TemperaturePositiveInputTerminal"/, 'instrument host should show the red temperature input terminal below the left display');
assert.match(sceneSource, /name="TemperatureNegativeInputTerminal"/, 'instrument host should show the black temperature input terminal below the left display');
assert.match(sceneSource, /name="PressureSensorInputPort"/, 'instrument host should show one central metal pressure sensor input below the pressure display');
assert.match(sceneSource, /name="TemperaturePositiveLead"/, 'temperature positive lead should connect the sensor area to the red terminal');
assert.match(sceneSource, /name="TemperatureNegativeLead"/, 'temperature negative lead should connect the sensor area to the black terminal');
assert.match(sceneSource, /name="PressureSensorLead"/, 'pressure sensor lead should connect the side gas/pressure area to the central pressure port');
assert.match(sceneSource, /name="ExternalTemperatureLeadAnchor"/, 'temperature leads should route outside the glass vessel before entering the stopper');
assert.match(sceneSource, /name="ExternalPressureLeadAnchor"/, 'pressure lead should route outside the glass vessel before reaching the side pressure pickup');
assert.match(sceneSource, /name="SharedServiceCablePort" position=\{\[0\.2, 1\.17, 0\.36\]\}/, 'temperature and pressure connections should share one small rear-right cable/service port on top of the stopper');
assert.match(sceneSource, /name="ServicePortBundleAnchor" position=\{\[-1\.1, 0\.92, 1\.1\]\}/, 'all external leads should first leave the bottle assembly through a shared rear route');
assert.doesNotMatch(sceneSource, /name="SensorRearCableOutlet"/, 'old dedicated sensor wire outlet should be replaced by the shared service port');
assert.doesNotMatch(sceneSource, /name="SensorSurfaceLeadGroove"/, 'old dedicated sensor surface groove should be replaced by the shared service port');
assert.match(sceneSource, /name="TemperaturePositiveLead"[\s\S]*\[-1\.1, 0\.89, 0\.36\][\s\S]*\[-1\.1, 0\.92, 1\.1\][\s\S]*\[1\.12, -0\.62, 0\.51\]/, 'positive temperature lead should run from the shared service port to the red host input');
assert.match(sceneSource, /name="TemperatureNegativeLead"[\s\S]*\[-1\.08, 0\.885, 0\.38\][\s\S]*\[-1\.1, 0\.92, 1\.1\][\s\S]*\[1\.3, -0\.62, 0\.51\]/, 'negative temperature lead should run from the shared service port to the black host input');
assert.match(sceneSource, /name="PressureSensorLead"[\s\S]*\[-1\.12, 0\.88, 0\.34\][\s\S]*\[-1\.1, 0\.92, 1\.1\][\s\S]*\[1\.77, -0\.63, 0\.51\]/, 'pressure tube should run from the shared service port to the central pressure input');
assert.match(sceneSource, /name="PressureSensorLead"[\s\S]*color=\{scenePalette\.leads\.pressure\}[\s\S]*lineWidth=\{highClarityMode \? 5 : 4\}/, 'pressure tube should use the scene palette and stay thicker than the temperature wires');
assert.doesNotMatch(sceneSource, /clampStopcockAngle/, 'stopcock drag should no longer be clamped to a 0-90 degree range');
assert.match(
  sceneSource,
  /name="AnalogPressureGauge"[\s\S]*position=\{\[0\.58, 0\.05, 0\.52\]\}/,
  'pressure gauge should stay right-of-center instead of colliding with the far-right power switch',
);
assert.match(
  sceneSource,
  /name="PowerSwitch"[\s\S]*position=\{\[0\.98, -0\.14, 0\.56\]\}/,
  'power switch should be on the far right and separated from the circular pressure gauge',
);
assert.match(sceneSource, /name="CentralSensorStopperHole" position=\{\[0\.16, 1\.16, 0\.24\]\}/, 'sensor top hole should be offset toward the shared service port instead of being locked to the absolute center axis');
assert.match(sceneSource, /name="SensorStopperPort" position=\{\[0\.16, 0\.96, 0\.24\]\}/, 'sensor stopper port should follow the offset sensor axis while staying inside the bottle mouth area');
assert.match(sceneSource, /name="SensorRod" position=\{\[0\.16, 0\.52, 0\.24\]\}/, 'sensor rod should remain vertical but shift toward the shared service port');
assert.match(sceneSource, /name="SensorToServicePortTrace" position=\{\[0\.18, 1\.176, 0\.3\]\}/, 'a short top trace should clarify the sensor signal path into the shared service port');
assert.doesNotMatch(sceneSource, /name="SensorRod" position=\{\[0, 0\.52, 0\]\}/, 'sensor rod should no longer be forced onto the old central stopcock axis');
assert.match(sceneSource, /<cylinderGeometry args=\{\[0\.035, 0\.035, 0\.875, 16\]\}/, 'sensor rod length should be half of the 1.75-high vessel');
assert.match(sceneSource, /name="RubberStopper" position=\{\[0, 1\.02, 0\]\}[\s\S]*<cylinderGeometry args=\{\[0\.54, 0\.42, 0\.24, 40\]\}/, 'rubber stopper should be a frustum with the larger end on top and smaller end inserted into the bottle mouth');
assert.match(sceneSource, /name="BottleMouthNeck"/, 'glass vessel should include a bottle mouth neck that carries the stopper');
assert.match(sceneSource, /name="BottleMouthRim"/, 'glass vessel should include a visible mouth rim around the stopper');
assert.match(sceneSource, /name="StopcockBody"[\s\S]*<cylinderGeometry args=\{\[0\.16, 0\.16, 0\.76, 32\]\}/, 'horizontal stopcock body should be shorter and more compact');
assert.match(sceneSource, /name="StopcockBody"[\s\S]*color=\{scenePalette\.glass\.stopcockGlass\}[\s\S]*opacity=\{scenePalette\.glass\.stopcockBodyOpacity\}[\s\S]*<Edges color=\{scenePalette\.glass\.stopcockEdge\}/, 'stopcock body should use the high-contrast light-mode glass material and outline');
assert.match(sceneSource, /name="StopcockSidePort"/, 'stopcock assembly should expose a side handle/end cap distinct from the vertical gas path');
assert.match(sceneSource, /name="StopcockTopVentOutlet"/, 'stopcock assembly should expose a top vent outlet to atmosphere');
assert.match(sceneSource, /name="StopcockTopVentOutlet" position=\{\[0, 0\.25, 0\]\}[\s\S]*<cylinderGeometry args=\{\[0\.043, 0\.048, 0\.36, 24\]\}/, 'top vent outlet should be half as long and half as thick as the previous skeleton');
assert.match(sceneSource, /name="StopcockRotatingCore"[\s\S]*rotation=\{\[angleRad, 0, 0\]\}/, 'stopcock rotating core should pivot around the horizontal stopcock body axis');
assert.match(sceneSource, /name="StopcockRotatingCore"[\s\S]*name="StopcockRotatingFlowChannel"[\s\S]*name="StopcockRodHandle"/, 'rotating flow channel and rod handle should be rigidly attached in the rotating core group');
assert.match(sceneSource, /const STOPCOCK_CLOSED_BASE_ROTATION_RAD = -Math\.PI \/ 2;/, 'stopcock angle definition should make zero degrees the closed baseline instead of the visual open direction');
assert.match(sceneSource, /name="StopcockCorePlug"[\s\S]*color=\{stopcockHovered \? scenePalette\.glass\.hover : scenePalette\.glass\.stopcockCore\}[\s\S]*opacity=\{stopcockHovered \? scenePalette\.glass\.stopcockHoverOpacity : scenePalette\.glass\.stopcockCoreOpacity\}[\s\S]*<Edges color=\{scenePalette\.glass\.stopcockEdge\}/, 'stopcock core plug should stay readable against the light-mode scene background');
assert.match(sceneSource, /name="StopcockRodHandleStem"[\s\S]*opacity=\{stopcockHovered \? scenePalette\.glass\.stopcockHandleHoverOpacity : scenePalette\.glass\.stopcockHandleOpacity\}[\s\S]*<Edges color=\{scenePalette\.glass\.stopcockEdge\}/, 'stopcock handle stem should keep a visible outline in light mode');
assert.match(sceneSource, /name="StopcockRotatingFlowChannel" position=\{\[0, 0, 0\]\} rotation=\{\[STOPCOCK_CLOSED_BASE_ROTATION_RAD, 0, 0\]\}[\s\S]*<cylinderGeometry args=\{\[0\.03, 0\.03, 0\.24, 16\]\}/, 'rotating gas channel should align with the stopcock handle axis while staying constrained inside the glass core');
assert.match(sceneSource, /name="StopcockRodHandle" position=\{\[0\.44, 0, 0\]\} rotation=\{\[STOPCOCK_CLOSED_BASE_ROTATION_RAD, 0, 0\]\}/, 'stopcock handle should share the same closed baseline as the internal gas channel');
assert.doesNotMatch(sceneSource, /name="StopcockRotatingFlowChannel" position=\{\[0, 0, 0\]\} rotation=\{\[Math\.PI \/ 2, 0, 0\]\}/, 'rotating gas channel should not keep the old perpendicular channel rotation');
assert.match(sceneSource, /state === 'open' \? scenePalette\.glass\.flowOpen : scenePalette\.glass\.flowClosed/, 'stopcock rotating channel should visibly distinguish open and closed states through the scene palette');
assert.doesNotMatch(sceneSource, /getPointerAngleOnValvePlane/, 'stopcock should not keep the old drag plane angle solver');
assert.doesNotMatch(sceneSource, /new THREE\.Raycaster\(\)/, 'stopcock should not cast pointer rays for continuous angle dragging');
assert.doesNotMatch(sceneSource, /getPointerAngleOnValvePlane[\s\S]*setFromCamera/, 'stopcock drag projection should be removed');
assert.doesNotMatch(sceneSource, /angleOffsetRef/, 'stopcock should not preserve pointer-to-valve angle offsets because dragging is removed');
assert.doesNotMatch(sceneSource, /clientX - startX/, 'stopcock drag should not use screen-space mouse delta to accumulate angle');
assert.match(sceneSource, /depthTest=\{false\}/, 'internal rotating tube should remain visible through the transparent stopcock shell');
assert.match(sceneSource, /name="StopcockVentFlowArrow"/, 'open stopcock state should show a green vent flow arrow');
assert.doesNotMatch(sceneSource, /name="StopcockCoaxialFlowChannel"/, 'controlled gas path should not be a fixed coaxial channel in the stopper or vent outlet');
assert.doesNotMatch(sceneSource, /name="StopcockFlowSlot"/, 'stopcock should not use the old offset rotating slot as the internal gas path');
assert.match(sceneSource, /name="StopcockRodHandle"/, 'stopcock control should be a rod-shaped glass handle');
assert.doesNotMatch(sceneSource, /name="StopcockRotatingCore"[\s\S]*name="StopcockTopVentOutlet"/, 'top vent outlet should remain fixed and outside the rotating core');
assert.doesNotMatch(sceneSource, /name="StopcockRotatingCore"[\s\S]*name="StopcockDownTube"/, 'down tube should remain fixed and outside the rotating core');
assert.doesNotMatch(sceneSource, /name="SideGasStopperHole"/, 'stopper should not reserve a separate offset side gas hole for the stopcock path');
assert.match(sceneSource, /name="StopcockDownTube" position=\{\[0, -0\.36, 0\]\}/, 'glass stopcock down tube should align with the central bottle-mouth axis');
assert.match(sceneSource, /const controlsRef = useRef<.*OrbitControls/, '3D preview should keep a control ref so the view can be reset');
assert.match(sceneSource, /enablePan=\{true\}/, '3D preview should allow moving the model view');
assert.match(sceneSource, /enableZoom=\{true\}/, '3D preview should allow scaling the model view with zoom');
assert.match(sceneSource, /frameloop: 'demand'/, 'heat-capacity 3D scene should render on demand instead of continuously');
assert.match(sceneSource, /props\.performanceMode === 'standard'\s*\?\s*2\.5/, 'standard Heat Capacity 3D mode should supersample above native DPR when needed');
assert.match(sceneSource, /shadows: false/, 'heat-capacity 3D scene should disable shadow rendering');
assert.doesNotMatch(sceneSource, /castShadow|receiveShadow/, 'heat-capacity 3D scene should not keep mesh shadow flags when shadows are disabled');
assert.match(sceneSource, /onStart=\{onInteractionStart\}/, 'orbit controls should enter a reduced-quality interaction state when dragging starts');
assert.match(sceneSource, /onEnd=\{onInteractionEnd\}/, 'orbit controls should leave the reduced-quality interaction state when dragging ends');
assert.match(sceneSource, /onChange=\{\(\) => invalidate\(\)\}/, 'orbit controls should invalidate demand rendering only when the camera changes');
assert.match(sceneSource, /panelTextInteractionReduced: boolean/, 'instrument display text throttling should distinguish orbit dragging from performance-mode visual reduction');
assert.match(sceneSource, /panelTextInteractionReduced=\{isOrbitInteracting\}/, 'instrument display text should only use the interaction throttle while the user is dragging the camera');
assert.match(sceneSource, /type CameraViewScheme = \{[\s\S]*defaultView: CameraFocusView;[\s\S]*fov: number;[\s\S]*responsiveFov\?:[\s\S]*autoDemoView\?: CameraFocusView;[\s\S]*focusViews\?: CameraFocusViews;/, 'heat-capacity camera views should be grouped into explicit model schemes');
assert.match(sceneSource, /const PROCEDURAL_CAMERA_VIEW_SCHEME: CameraViewScheme = \{[\s\S]*defaultView:[\s\S]*position: \[4\.15, 2\.9, 8\.25\][\s\S]*target: \[0\.25, -0\.05, 0\][\s\S]*autoDemoView:[\s\S]*position: \[3\.82, 2\.68, 7\.58\][\s\S]*target: \[0\.24, -0\.05, 0\.02\]/, 'procedural heat-capacity scheme should keep the approved skeleton default and auto-demo views');
assert.match(sceneSource, /const ULTRA_CAMERA_VIEW_SCHEME: CameraViewScheme = \{[\s\S]*defaultView:[\s\S]*position: \[0\.58, 3\.05, 6\.25\][\s\S]*target: \[0\.02, 0\.52, 0\.02\][\s\S]*fov: 36[\s\S]*responsiveFov:[\s\S]*aspect: 1\.35[\s\S]*narrowAspect: 0\.95[\s\S]*fov: 52[\s\S]*wideAspect: 3[\s\S]*wideFov: 56/, 'Ultra GLB scheme should keep the approved closer view and widen FOV for narrow and wide-short resized canvases');
assert.match(sceneSource, /const getCameraViewScheme = \(performanceMode: HeatCapacityInstrumentSceneProps\['performanceMode'\]\) => \([\s\S]*performanceMode === 'ultra' \? ULTRA_CAMERA_VIEW_SCHEME : PROCEDURAL_CAMERA_VIEW_SCHEME/, 'heat-capacity camera defaults should select exactly one of the two active schemes');
assert.doesNotMatch(sceneSource, /const getDefaultCameraView|const getAutoDemoCameraView|PROCEDURAL_DEFAULT_CAMERA_POSITION|PROCEDURAL_AUTO_DEMO_CAMERA_POSITION|ULTRA_DEFAULT_CAMERA_POSITION/, 'camera code should not keep the old scattered view selector functions or position constants');
assert.match(sceneSource, /const cameraViewScheme = useMemo\(\(\) => getCameraViewScheme\(props\.performanceMode\), \[props\.performanceMode\]\)/, 'scene should memoize the active camera scheme by performance mode');
assert.match(sceneSource, /camera: \{ position: cameraViewScheme\.defaultView\.position, fov: cameraViewScheme\.fov \}/, 'Canvas camera should use the active scheme default camera position and initial FOV');
assert.match(sceneSource, /import \{ Canvas, createPointerEvents, useFrame, useThree, type ThreeEvent \} from '@react-three\/fiber';/, 'heat-capacity scene should use a custom pointer event layer for canvas hit testing');
assert.match(sceneSource, /const createHeatCapacityPointerEvents: typeof createPointerEvents = \(store\) => \{[\s\S]*state\.gl\.domElement\.getBoundingClientRect\(\)[\s\S]*event\.clientX - bounds\.left[\s\S]*event\.clientY - bounds\.top[\s\S]*state\.raycaster\.setFromCamera\(state\.pointer, state\.camera\)/, 'heat-capacity pointer events should compute raycasting from the current canvas rect instead of stale offset dimensions');
assert.match(sceneSource, /<Canvas \{\.\.\.canvasProps\} events=\{createHeatCapacityPointerEvents\}>/, 'heat-capacity Canvas should install the rect-based pointer event layer');
assert.match(sceneSource, /cameraViewScheme=\{cameraViewScheme\}/, 'CameraRig should receive the active camera scheme');
assert.match(sceneSource, /defaultCameraTarget=\{cameraViewScheme\.defaultView\.target\}/, 'OrbitControls should reset to the active scheme default target');
assert.match(sceneSource, /const ORBIT_MIN_DISTANCE = 2\.7;/, 'heat-capacity preview should allow closer zoom-in than before');
assert.match(sceneSource, /const ORBIT_MAX_DISTANCE = 11\.5;/, 'heat-capacity preview should allow wheel zoom-out from the default view');
assert.match(sceneSource, /focusMode/, '3D preview should track focused operation mode');
assert.match(sceneSource, /viewResetKey/, 'default view resets should use a local key to trigger the smooth camera rig');
assert.match(sceneSource, /triggerSmoothDefaultView/, 'default view resets and auto-demo resets should share the smooth reset path');
assert.doesNotMatch(sceneSource, /controlsRef\.current\?\.reset\(\)/, 'default view reset should not jump the camera through OrbitControls.reset');
assert.match(stopcockSceneSection, /name="StopcockRotatingCore"[\s\S]{0,520}onDoubleClick=\{handleStopcockDoubleClick\}/, 'glass stopcock should use double-click as a direct focus entry while canceling the guarded single click');
assert.match(pumpValveSceneSection, /name="pumpValve"[\s\S]{0,620}onDoubleClick=\{handlePumpValveDoubleClick\}/, 'pump valve should use double-click as a direct stopcock focus entry while canceling the guarded single click');
assert.match(sceneSource, /type ValveFocusBubbleState = \{[\s\S]*source: ValveFocusControl[\s\S]*closing: boolean/, 'valve focus entry should keep independent anchored bubble state instead of relying only on hover state');
assert.match(sceneSource, /const projectValveFocusAnchor = useCallback/, 'valve focus bubble should project the 3D control anchor instead of following the mouse');
assert.match(sceneSource, /const openValveFocusBubble = useCallback/, 'hovering either valve control should open or migrate one shared anchored focus bubble');
assert.match(sceneSource, /const openValveFocusBubble = useCallback\([\s\S]*if \(focusMode !== 'none'\) return;/, 'valve focus bubble should not appear after the scene is already in a focused mode');
assert.match(sceneSource, /const valveFocusPointerDownRef = useRef\(false\)/, 'valve focus bubble should track pointer-down state so hold-to-rotate closes immediately');
assert.match(sceneSource, /const openValveFocusBubble = useCallback\([\s\S]*if \(valveFocusPointerDownRef\.current\) return;/, 'valve focus bubble should not reopen while the pointer is held down for model rotation');
assert.match(sceneSource, /clampValveFocusBubblePosition/, 'valve focus bubble should clamp to the model window bounds');
assert.match(sceneSource, /const scaleX = rect\.width \/ \(sceneRoot\.offsetWidth \|\| rect\.width\) \|\| 1;[\s\S]*const scaleY = rect\.height \/ \(sceneRoot\.offsetHeight \|\| rect\.height\) \|\| 1;[\s\S]*const anchorX = \(clientX - rect\.left\) \/ scaleX;[\s\S]*const anchorY = \(clientY - rect\.top\) \/ scaleY;/, 'valve focus bubble should convert viewport anchor coordinates into the scaled scene-local coordinate space');
assert.match(sceneSource, /VALVE_FOCUS_BUBBLE_GAP_PX = 34/, 'valve focus bubble should leave a visible gap above the 3D valve control');
assert.match(sceneSource, /closeValveFocusBubble/, 'valve focus bubble should close from explicit outside actions instead of pointer leave');
assert.match(sceneSource, /VALVE_FOCUS_BUBBLE_EXIT_MS = 160/, 'valve focus bubble should keep the fade-out duration aligned with the shared overlay exit duration');
assert.doesNotMatch(sceneSource, /VALVE_FOCUS_PROMPT_OFFSET_PX|hideValveFocusPromptSoon|onValveFocusPointerLeave/, 'valve focus bubble should not use the old mouse-adjacent prompt or hover-leave dismissal path');
assert.match(sceneSource, /data-heat-capacity-valve-focus-entry="true"/, 'valve hover prompt should expose a stable focus-entry button marker');
assert.match(sceneSource, /sceneCopy\.focus\.enterValveFocus/, 'valve focus entry button should use localized copy');
assert.match(sceneSource, /onFocus\('instrument'\)/, 'double-clicking the host should enter instrument focus mode');
assert.match(sceneSource, /const PROCEDURAL_CAMERA_VIEW_SCHEME: CameraViewScheme = \{[\s\S]*focusViews: \{[\s\S]*stopcock:[\s\S]*position: \[1\.38, 2\.18, 2\.92\][\s\S]*instrument:[\s\S]*position: \[2\.18, 0\.18, 3\.42\][\s\S]*pump:[\s\S]*position: \[2\.95, 0\.25, 3\.35\]/, 'procedural scheme should keep the original skeleton focus framing');
assert.match(sceneSource, /const ULTRA_CAMERA_VIEW_SCHEME: CameraViewScheme = \{[\s\S]*focusViews: \{[\s\S]*stopcock:[\s\S]*position: \[-0\.45,\s*2\.58,\s*4\.85\][\s\S]*target: \[-1\.2,\s*1\.06,\s*0\.44\][\s\S]*fov: 50[\s\S]*instrument:[\s\S]*position: \[2\.78,\s*1\.16,\s*3\.85\][\s\S]*target: \[2\.24,\s*0\.06,\s*0\.28\][\s\S]*fov: 32[\s\S]*pump:[\s\S]*position: \[2\.34,\s*1\.24,\s*3\.55\][\s\S]*target: \[0\.98,\s*0\.34,\s*0\.28\][\s\S]*fov: 36/, 'Ultra GLB scheme should define dedicated focus views aligned to the shifted GLB controls');
assert.match(sceneSource, /if \(focusMode !== 'none'\) return;[\s\S]*const startFov = camera\.fov[\s\S]*const nextFov = focusView[\s\S]*\? focusView\.fov \?\? cameraViewScheme\.fov[\s\S]*: getCameraFovForAspect\(cameraViewScheme, aspect\)[\s\S]*camera\.fov = THREE\.MathUtils\.lerp\(startFov, nextFov, eased\)/, 'focused camera transitions should animate to each focus view FOV instead of using short-wide responsive FOV');
assert.doesNotMatch(sceneSource, /props\.performanceMode === 'ultra' && focusMode !== 'none'/, 'Ultra GLB should no longer clear focused modes immediately after entry');
assert.match(sceneSource, /focusMode === 'stopcock' \|\| focusMode === 'instrument' \|\| focusMode === 'pump'[\s\S]*cameraViewScheme\.focusViews\?\.\[focusMode\][\s\S]*const nextView = focusView \?\? \([\s\S]*cameraViewScheme\.autoDemoView \?\? cameraViewScheme\.defaultView[\s\S]*nextPosition\.set\(\.\.\.nextView\.position\)[\s\S]*nextTarget\.set\(\.\.\.nextView\.target\)/, 'camera rig should resolve focus, auto-demo, and default views from the active scheme only');
assert.doesNotMatch(sceneSource, /data-heat-capacity-focus-mode=\{focusMode\}/, 'instrument focus should not move overlay controls through scene focus-mode attributes');
assert.doesNotMatch(styleSource, /data-heat-capacity-focus-mode="instrument"[\s\S]*studio-preview-overlay-slot-bottom-left[\s\S]*display:\s*none/, 'instrument focus should keep lower-left hints in their normal overlay slot');
assert.doesNotMatch(styleSource, /data-heat-capacity-focus-mode="instrument"[\s\S]*heat-parent-bottom-right[\s\S]*data-heat-capacity-focus-mode="instrument"[\s\S]*heat-focus-panel[\s\S]*align-self:\s*flex-start/, 'instrument focus should keep record controls and the focus panel in their normal lower-right slot');
assert.doesNotMatch(sceneSource, /className="studio-heat-focus-exit"/, 'focused modes should not use a separate top-right exit button');
assert.match(sceneSource, /data-heat-capacity-focus-panel="stopcock"/, 'stopcock focus mode should expose a compact lower-right focus panel');
assert.match(sceneSource, /data-heat-capacity-valve-focus-stopcock-toggle="true"/, 'combined valve focus panel should expose a direct glass stopcock toggle');
assert.match(sceneSource, /data-heat-capacity-valve-focus-pump-valve-toggle="true"/, 'combined valve focus panel should expose a direct pump valve toggle');
assert.match(sceneSource, /data-heat-capacity-focus-panel="pump"/, 'pump focus mode should expose its own lower-right focus panel');
assert.match(sceneSource, /data-heat-capacity-focus-panel="instrument"/, 'instrument focus mode should expose its own lower-right focus panel');
assert.match(sceneSource, /data-heat-capacity-focus-exit="true"/, 'each focus panel should include the unified exit focus control');
assert.match(sceneSource, /const poweredInstrumentReadout = \(displayValue: string\) => props\.powerOn \? displayValue : sceneCopy\.unpowered/, 'instrument focus panel should hide instrument readouts while powered off');
assert.match(sceneSource, /const poweredInstrumentNumber = \(displayValue: string\) => props\.powerOn \? displayValue : '--'/, 'instrument focus panel should hide numeric placeholders while powered off');
assert.match(sceneSource, /<strong>\{poweredInstrumentReadout\(temperatureDisplay\)\}<\/strong>/, 'instrument focus Uₜ should be guarded by power state');
assert.match(sceneSource, /<strong>\{poweredInstrumentReadout\(pressureDisplay\)\}<\/strong>/, 'instrument focus Uₚ should be guarded by power state');
assert.match(sceneSource, /<strong>\{poweredInstrumentNumber\(`\$\{formatPanelNumber\(props\.pressureDisplayedPlaceholder, 2\)\} mV`\)\}<\/strong>/, 'instrument focus displayed pressure should not leak values while powered off');
assert.match(sceneSource, /<strong>\{poweredInstrumentNumber\(`\$\{formatPanelNumber\(props\.pressurePlaceholder, 2\)\} kPa`\)\}<\/strong>/, 'instrument focus placeholder pressure should not leak values while powered off');
assert.match(sceneSource, /getPumpBulbDisplayLabel/, 'pump bulb display state should be mapped for user-facing UI');
assert.match(sceneSource, /props\.pumpValveOpen \? sceneCopy\.focus\.opened : sceneCopy\.focus\.closed/, 'shared stopcock focus panel should show pump valve open-closed state');
assert.doesNotMatch(sceneSource, /snapNearestOpen|吸附|磁吸|magnetic/i, 'stopcock focus panel should not expose magnetic snap controls');
assert.match(sceneSource, /const orbitControlsEnabled = focusMode === 'none' && !props\.interactionLocked;/, 'Ultra orbit controls should lock during focus just like the procedural model so the focused framing stays stable');
assert.match(sceneSource, /enabled=\{orbitControlsEnabled\}/, 'orbit controls should use the explicit Ultra-safe enable policy');
assert.match(sceneSource, /data-heat-capacity-view-reset="true"/, '3D preview should expose a reset-default-view control');
assert.match(sceneSource, /studio-preview-overlay-slot-bottom-right[\s\S]*data-heat-capacity-focus-panel/, 'focus panels should sit in the shared lower-right overlay slot');
assert.doesNotMatch(styleSource, /\.studio-heat-stopcock-panel \{[\s\S]*left: 14px;/, 'stopcock focus panel should no longer sit in the lower-left corner');
assert.match(styleSource, /\.studio-heat-interaction-hints \{[\s\S]*border: 1px solid rgba\(100, 116, 139/, 'lower-left interaction hints should use the same restrained engineering panel frame');
assert.match(styleSource, /\.studio-heat-interaction-hints strong::before/, 'lower-left interaction hints should use a compact status-dot heading');
assert.match(sceneSource, /studio-preview-overlay-slot-top-left[\s\S]*data-preview-overlay-item="heat-hard-sphere-toggle"/, 'hard-sphere toggle should sit in the shared top-left overlay slot');
assert.doesNotMatch(getCssBlock('.studio-heat-hard-sphere-toggle'), /position:\s*absolute/, 'hard-sphere toggle should no longer use a model-window left-mid absolute position');
assert.match(getCssBlock('.studio-heat-hard-sphere-toggle'), /border:\s*0\.5px solid rgba\(100,\s*116,\s*139,\s*0\.58\)/, 'hard-sphere toggle should use the thin annotated outer border');
assert.match(getCssBlock('.studio-heat-hard-sphere-tooltip'), /translate3d\(-18px,\s*0,\s*0\)/, 'hard-sphere explanation tooltip should leave to the left instead of staying resident');
assert.match(styleSource, /\.studio-heat-hard-sphere-tooltip-anchor:hover \.studio-heat-hard-sphere-tooltip,[\s\S]*\.studio-heat-hard-sphere-tooltip-anchor:focus-within \.studio-heat-hard-sphere-tooltip/, 'hard-sphere explanation tooltip should appear on hover and keyboard focus');
assert.match(styleSource, /\.studio-heat-hard-sphere-toggle:disabled[\s\S]*cursor:\s*not-allowed/, 'disabled hard-sphere toggle should visibly become unavailable instead of looking interactive');
assert.match(styleSource, /\.studio-heat-hard-sphere-toggle:disabled \.studio-heat-hard-sphere-switch span::after[\s\S]*transform:\s*rotate\(-45deg\)/, 'disabled hard-sphere toggle should draw a clear static/unavailable symbol without extra text');
assert.doesNotMatch(styleSource, /data-heat-capacity-hard-sphere-view="true"[\s\S]*\.studio-heat-interaction-hints[\s\S]*display: none/, 'hard-sphere view should not hide the lower-left interaction hints');
assert.match(styleSource, /\.studio-heat-focus-panel \{[\s\S]*border: 1px solid rgba\(100, 116, 139/, 'lower-right focus panel should use the engineering panel frame');
assert.match(styleSource, /\.studio-heat-valve-focus-bubble \{[\s\S]*position:\s*absolute;[\s\S]*border-radius:\s*10px;/, 'valve focus entry should render as a rounded anchored bubble');
assert.match(styleSource, /\.studio-heat-valve-focus-bubble::after \{[\s\S]*border-top:/, 'valve focus bubble should have a lower pointer tail aimed at the control');
assert.match(styleSource, /\.studio-heat-valve-focus-bubble-closing \{[\s\S]*studioOverlayFadeOut var\(--studio-overlay-exit-duration\)/, 'valve focus bubble should fade out with the shared overlay exit motion');
assert.match(styleSource, /\.studio-heat-valve-focus-button \{/, 'valve hover focus entry should have explicit button styling');
assert.match(getCssBlock('.studio-heat-valve-focus-button'), /pointer-events:\s*auto;/, 'valve hover focus entry button should remain clickable');
assert.match(sceneSource, /onPointerDownCapture=\{\(\) => \{\s*valveFocusPointerDownRef\.current = true;\s*closeValveFocusBubble\(\);?\s*\}\}/, 'pressing the pointer down anywhere should immediately close the valve focus bubble before mouseup');
assert.match(sceneSource, /onPointerUpCapture=\{\(\) => \{\s*valveFocusPointerDownRef\.current = false;?\s*\}\}/, 'releasing the pointer should allow future hover bubbles again');
assert.match(sceneSource, /onPointerCancelCapture=\{\(\) => \{\s*valveFocusPointerDownRef\.current = false;?\s*\}\}/, 'cancelled pointer interactions should clear the pointer-down guard');
assert.match(sceneSource, /onWheelCapture=\{\(\) => closeValveFocusBubble\(\)\}/, 'scrolling the model should close the valve focus bubble');
assert.match(sceneSource, /onInteractionStart=\{\(\) => \{[\s\S]*closeValveFocusBubble\(\)/, 'starting orbit interaction should close the valve focus bubble');
assert.match(sceneSource, /data-preview-overlay-item="heat-focus-panel"[\s\S]{0,160}<div\s+className="studio-heat-focus-panel/, 'focus panels should use a stable FLIP wrapper around their animated visual panel');
assert.match(styleSource, /\.studio-heat-focus-title \{[\s\S]*font-family: "JetBrains Mono"/, 'focus panel title should read like an engineering status header');
assert.match(styleSource, /\.studio-heat-focus-panel-pump \{[\s\S]*pointer-events: none;/, 'pump focus panel should not steal rapid pump clicks from the bulb behind non-control panel areas');
assert.match(styleSource, /\.studio-heat-focus-panel-pump \.studio-heat-focus-panel-actions button \{[\s\S]*pointer-events: auto;/, 'pump focus panel exit button should remain clickable when the panel body passes pointer events through');
assert.match(sceneSource, /className="studio-heat-focus-instrument-columns"/, 'instrument focus panel should organize readouts into explicit left and right columns');
assert.match(styleSource, /\.studio-heat-focus-panel-instrument \{[\s\S]*width: min\(390px, 100%\);/, 'instrument focus panel should be wide enough for aligned readout values inside the lower-right slot');
assert.match(styleSource, /\.studio-heat-focus-instrument-columns \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\);/, 'instrument focus readouts should use balanced two-column groups');
assert.match(styleSource, /\.studio-heat-focus-panel-instrument \.studio-heat-focus-panel-row \{[\s\S]*grid-template-columns: 64px minmax\(0, 1fr\);/, 'instrument focus rows should use fixed label and value columns');
assert.match(styleSource, /\.studio-heat-focus-panel-instrument \.studio-heat-focus-panel-row strong \{[\s\S]*white-space: nowrap;[\s\S]*overflow: hidden;/, 'instrument focus values should keep number and unit on one line without spilling outside the panel');
assert.match(sceneSource, /studio-preview-overlay-slot-bottom-left[\s\S]*data-heat-capacity-interaction-hints="true"/, 'interaction hints should sit in the shared lower-left overlay slot');
assert.match(sceneSource, /data-preview-overlay-item="heat-hover-tooltip"[\s\S]{0,160}<div\s+className="studio-heat-hover-tooltip"/, 'hover tooltip should use a stable FLIP wrapper around its animated visual panel');
assert.match(getCssBlock('.studio-heat-hover-tooltip'), /pointer-events:\s*none;/, 'hover tooltip should not steal canvas interactions');
assert.doesNotMatch(hoverTooltipSceneSection, /data-heat-capacity-valve-focus-entry="true"/, 'valve focus entry should no longer live in the lower-right hover tooltip');
assert.match(sceneSource, /studio-preview-overlay-slot-top-right[\s\S]*data-heat-capacity-view-reset="true"/, 'upper-right heat model window chrome should use the shared top-right slot');
assert.match(getCssBlock('.studio-heat-view-reset'), /border:\s*0\.5px solid rgba\(148,\s*163,\s*184,\s*0\.44\)/, 'default-view button should use the thin annotated border');
assert.match(styleSource, /\.studio-heat-demo-step-panel \{[\s\S]*width: min\(330px, 100%\);/, 'auto demo step panel should stay compact inside its overlay slot');
assert.match(styleSource, /\[data-preview-overlay-item="heat-parent-top-right"\]\s*\{[\s\S]*display:\s*flex;[\s\S]*justify-content:\s*flex-end;[\s\S]*width:\s*100%;/, 'auto demo top-right wrapper should right-anchor the visual step panel inside the shared overlay slot');
assert.match(styleSource, /\.studio-heat-demo-step-panel div:not\(\.studio-heat-demo-step-kicker\) \{[\s\S]*grid-template-columns: 58px minmax\(0, 1fr\);/, 'step panel should keep the original compact field layout');
assert.match(styleSource, /\.studio-heat-preview-mount \{[\s\S]*overflow: hidden;/, 'heat preview mount should clip the step panel as it slides out to the right');
assert.match(styleSource, /\.studio-heat-demo-step-panel-visible \{[\s\S]*animation: studioOverlayEnterRight/, 'auto demo step panel should enter from the right when the demo starts');
assert.match(styleSource, /\.studio-heat-demo-step-panel-exiting \{[\s\S]*animation: studioOverlayExitRight/, 'auto demo step panel should exit to the right when the demo ends or is terminated');
assert.match(workbenchSource, /overlayCenter=\{heatCapacityCenterOverlay\}[\s\S]*data-heat-capacity-pressure-warning="true"|data-heat-capacity-pressure-warning="true"[\s\S]*overlayCenter=\{heatCapacityCenterOverlay\}/, 'pressure warning should use the centered overlay slot inside the heat model window');
assert.match(styleSource, /\.studio-heat-pressure-warning-kicker \{[\s\S]*font-family: "JetBrains Mono"/, 'pressure warning should expose a compact engineering status kicker');
assert.match(styleSource, /\.studio-heat-pressure-warning \{[\s\S]*animation: studioOverlayFadeIn/, 'centered pressure warning should fade in without scale or displacement');
assert.match(workbenchSource, /overlayBottomCenter=\{heatCapacityBottomCenterOverlay\}[\s\S]*data-heat-capacity-manual-step-hint="true"|data-heat-capacity-manual-step-hint="true"[\s\S]*overlayBottomCenter=\{heatCapacityBottomCenterOverlay\}/, 'heat-capacity manual toast queue should use one bottom-centered overlay slot');
assert.match(styleSource, /\.studio-heat-manual-step-hint \{[\s\S]*studioOverlayBottomCenterIn[\s\S]*studioOverlayBottomCenterOut/, 'bottom-centered manual hints should float in from below and fade down on exit');
assert.match(styleSource, /\.studio-heat-manual-step-hint-warning \{[\s\S]*border-color: rgba\(245, 158, 11, 0\.7\)/, 'heat-capacity toast queue should expose a warning level style');
assert.match(styleSource, /\.studio-heat-manual-step-hint-danger \{[\s\S]*border-color: rgba\(248, 113, 113, 0\.75\)/, 'heat-capacity toast queue should expose a danger level style');
assert.match(workbenchSource, /overlayCenter=\{heatCapacityCenterOverlay\}[\s\S]*data-heat-capacity-demo-complete-toast="true"|data-heat-capacity-demo-complete-toast="true"[\s\S]*overlayCenter=\{heatCapacityCenterOverlay\}/, 'normal auto demo completion should use the centered overlay slot');
assert.match(styleSource, /\.studio-heat-demo-complete-toast \{[\s\S]*studioOverlayFadeIn[\s\S]*studioOverlayFadeOut/, 'centered demo completion toast should use fade-only in and out');
assert.match(styleSource, /\.studio-heat-toast-kicker \{[\s\S]*font-family: "JetBrains Mono"/, 'toast overlays should use compact engineering kicker labels');
assert.doesNotMatch(styleSource, /@keyframes heatDemoFocusPulse/, 'unused CSS keyframes should not remain after Three.js-driven focus halos');

assert.match(workbenchSource, /HeatCapacityInstrumentScene/);
assert.match(workbenchSource, /type HeatCapacityMode = 'demo' \| 'guide' \| 'free'/, 'heat-capacity preview should model the three requested top modes');
assert.match(workbenchSource, /data-heat-capacity-mode-control="true"/, 'heat-capacity preview should render one unified top-right mode control');
assert.match(workbenchSource, /<div className="studio-panel-actions">[\s\S]*renderHeatCapacityModeControl\(\)/, 'heat-capacity mode control should sit in the preview header where the old auto-demo button was');
assert.doesNotMatch(workbenchSource, /overlayTopRight=\{heatCapacityTopRightOverlay\}[\s\S]{0,900}data-heat-capacity-mode-control="true"/, 'heat-capacity mode control should not occupy the 3D model overlay space');
assert.match(workbenchSource, /data-heat-capacity-mode="demo"[\s\S]*data-heat-capacity-mode="guide"[\s\S]*data-heat-capacity-mode="free"/, 'top mode control should keep the order: demo, guide, free');
assert.match(workbenchSource, /data-heat-capacity-mode-action="pause-demo"/, 'demo mode expansion should expose pause');
assert.match(workbenchSource, /data-heat-capacity-mode-action="resume-demo"/, 'paused demo mode expansion should expose resume');
assert.match(workbenchSource, /data-heat-capacity-mode-action="stop-demo"/, 'demo mode expansion should expose stop');
assert.match(workbenchSource, /data-heat-capacity-mode-action="pause-demo"[\s\S]{0,260}>\s*<Pause/, 'demo pause action should use the same icon-only pause control as other experiment run buttons');
assert.match(workbenchSource, /data-heat-capacity-mode-action="resume-demo"[\s\S]{0,260}>\s*<Play/, 'demo resume action should use the same icon-only play control as other experiment run buttons');
assert.match(workbenchSource, /data-heat-capacity-mode-action="stop-demo"[\s\S]{0,260}>\s*<Square/, 'demo stop action should use the same icon-only stop control as other experiment run buttons');
assert.match(workbenchSource, /data-heat-capacity-mode-action="exit-guide"/, 'guide mode expansion should expose exit guide');
assert.match(workbenchSource, /data-heat-capacity-mode-action="exit-guide"[\s\S]{0,320}>\s*<Square/, 'guide exit action should use the same icon-only stop-style control as demo termination');
assert.match(workbenchSource, /className="studio-heat-mode-action studio-heat-mode-action-icon studio-heat-mode-action-danger"[\s\S]{0,260}data-heat-capacity-mode-action="exit-guide"/, 'guide exit action should share the red stop-control styling');
assert.match(workbenchSource, /data-heat-capacity-mode-action="next-trial"/, 'guide mode should reveal next-trial inside the mode bar after the wait notice');
assert.match(workbenchSource, /data-heat-capacity-mode-segment="demo"[\s\S]*data-heat-capacity-mode="demo"[\s\S]*data-heat-capacity-mode-action="pause-demo"[\s\S]*data-heat-capacity-mode-segment="guide"/, 'demo actions should extend immediately after the demo mode segment before the guide segment');
assert.match(workbenchSource, /data-heat-capacity-mode-segment="guide"[\s\S]*data-heat-capacity-mode="guide"[\s\S]*data-heat-capacity-mode-action="exit-guide"[\s\S]*data-heat-capacity-mode-segment="free"/, 'guide actions should extend immediately after the guide mode segment before the free segment');
assert.match(workbenchSource, /HEAT_CAPACITY_GUIDE_NEXT_TRIAL_DELAY_MS = 2000/, 'next-trial reveal should wait exactly two seconds after completing a guide trial');
assert.match(workbenchSource, /真实实验中需要等待系统稳定；程序已省略该等待过程。/, 'guide mode should show the confirmed omitted-stability-wait notice');
assert.match(workbenchSource, /setHeatCapacityGuideNextTrialReadyKey\(nextTrialKey\)/, 'next-trial control should appear only after the delayed reveal key is set');
assert.match(workbenchSource, /data-heat-capacity-trial-badge=\{badge\.key === 'trial' \? 'true' : undefined\}/, 'current guide trial should move to a right-sidebar badge');
assert.doesNotMatch(workbenchSource, /data-heat-capacity-manual-reset="true"/, 'old bottom-right manual start button should be removed');
assert.doesNotMatch(workbenchSource, /startManualExperiment:\s*'开始手动实验'|startManualExperiment:\s*'開始手動實驗'|startManualExperiment:\s*'Start Manual Trial'/, 'user-facing manual start copy should be renamed to guide mode');
assert.match(styleSource, /\.studio-heat-mode-control/, 'unified mode control should have dedicated styling');
assert.match(styleSource, /\.studio-heat-mode-actions/, 'mode-specific expanded actions should have a dedicated animated area');
assert.match(styleSource, /\.studio-heat-mode-control[\s\S]*transition:[\s\S]*cubic-bezier\(0\.2, 0, 0, 1\)/, 'mode bar movement and extension should use a non-elastic engineering transition');
assert.match(styleSource, /\.studio-heat-mode-segment \+ \.studio-heat-mode-segment \{[\s\S]*border-left:/, 'mode bar should draw divider lines between demo, guide, and free segments');
assert.match(getRootCssBlock('.studio-heat-mode-control'), /rgba\(123, 184, 139/, 'mode bar should use the old run-control green palette instead of the previous blue glow');
assert.doesNotMatch(getRootCssBlock('.studio-heat-mode-control'), /rgba\(125, 211, 252|backdrop-filter|0 14px 30px/, 'mode bar should not keep the previous cyan glass styling');
assert.match(getRootCssBlock('.studio-heat-mode-action'), /#3f474f[\s\S]*#7bb88b/, 'positive mode actions should match the old simple green run-control style');
assert.match(getRootCssBlock('.studio-heat-mode-action-next-trial'), /--studio-heat-next-trial-pulse-shadow:[\s\S]*inset 0 0 0 2px rgba\(220,\s*252,\s*231,\s*0\.42\)[\s\S]*inset 0 0 16px rgba\(190,\s*242,\s*202,\s*0\.34\)[\s\S]*margin-inline-start:\s*4px;/, 'dark theme next-trial action should use symmetric spacing and an internal pulse');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-mode-action-next-trial \{[\s\S]*--studio-heat-next-trial-pulse-bg: #15803d;[\s\S]*--studio-heat-next-trial-pulse-shadow:[\s\S]*inset 0 0 0 2px rgba\(220,\s*252,\s*231,\s*0\.48\)[\s\S]*inset 0 0 16px rgba\(187,\s*247,\s*208,\s*0\.4\)/, 'light theme next-trial action should use its own stronger internal green pulse');
assert.doesNotMatch(styleSource, /@keyframes studio-heat-next-trial-breathe \{[^@]*transform:/, 'next-trial breathing animation should not scale or move the button because the mode bar clips tight controls');
assert.match(getRootCssBlock('.studio-heat-mode-action-danger'), /#c96a6f[\s\S]*#ffffff/, 'stop mode action should match the old simple red stop-control style');
assert.match(styleSource, /\.studio-panel-actions \.studio-heat-mode-action \{[\s\S]*background: #3f474f;[\s\S]*color: #7bb88b;/, 'dark theme panel-action overrides should preserve green heat-capacity mode actions');
assert.match(styleSource, /\.studio-panel-actions \.studio-heat-mode-action-danger \{[\s\S]*background: #c96a6f;[\s\S]*color: #ffffff;/, 'dark theme panel-action overrides should preserve red heat-capacity stop actions');
assert.match(styleSource, /\.studio-theme-light \.studio-panel-actions \.studio-heat-mode-action \{[\s\S]*#edf7ef[\s\S]*#16783a/, 'light theme panel-action overrides should preserve green heat-capacity mode actions');
assert.match(styleSource, /\.studio-theme-light \.studio-panel-actions \.studio-heat-mode-action-danger \{[\s\S]*#fee2e2[\s\S]*#991b1b/, 'light theme panel-action overrides should preserve red heat-capacity stop actions');
assert.match(workbenchSource, /type ManualHeatCapacityStep =[\s\S]*openStopcockForZeroRequired[\s\S]*recordU0Required[\s\S]*recordU1Required[\s\S]*recordU2Required[\s\S]*nextTrialRequired[\s\S]*calculateRequired/, 'manual heat-capacity workflow should model stopcock-zeroing, U0/U1/U2 recording, and multi-trial continuation as required steps');
assert.match(workbenchSource, /guardManualHeatCapacityAction/, 'manual heat-capacity controls should pass through one shared guard');
assert.match(workbenchSource, /manualHeatCapacityActiveFileId/, 'manual heat-capacity tutorial should have an explicit active file binding');
assert.match(workbenchSource, /manualHeatCapacityActiveFileId !== activeFile\.id\) return true/, 'manual guards should not constrain users before the manual tutorial is started');
assert.match(workbenchSource, /data-heat-capacity-manual-step-hint="true"/, 'manual heat-capacity guard should surface a top-centered step hint in the 3D preview');
assert.match(workbenchSource, /studio-heat-record-controls-pulse/, 'manual heat-capacity guard should pulse the record entry when recording is the next required action');
assert.match(workbenchSource, /const recordHeatCapacityManualSample = \(kind: HeatCapacityManualRecordKind\)[\s\S]*const currentFile = filesRef\.current\.find\(\(file\) => file\.id === activeFile\.id\);[\s\S]*const latestStep = getHeatCapacityManualStep\(currentFile\)[\s\S]*latestStep !== requiredStep/, 'direct record buttons should revalidate against the latest manual workflow step');
assert.match(workbenchSource, /kind === 'u0'[\s\S]*captureHeatCapacityWorkbenchSample\(currentFile, 'zeroedSample', now, \{ applyProfile: false \}\)/, 'direct U0 recording should write the zeroed sample through the shared sample structure using actual instrument readings');
assert.match(workbenchSource, /manualHeatCapacityActiveFileId === activeFile\.id[\s\S]*recordU0Required[\s\S]*recordU1Required[\s\S]*recordU2Required/, 'manual mode should only show the record button required by the current workflow step');
assert.doesNotMatch(workbenchSource, /manualHeatCapacityActiveFileId === activeFile\.id && activeFile\.powerOn[\s\S]*recordU0Required/, 'record buttons should not depend on a second powerOn gate once the manual workflow has reached a record step');
assert.match(workbenchSource, /const isManualU1RecordReady =/, 'manual U1 record readiness should be centralized in a stable-window helper');
assert.match(workbenchSource, /const isManualU2RecordReady =/, 'manual U2 record readiness should be centralized in a stable-window helper');
assert.match(workbenchSource, /const getActiveHeatCapacityTrial =/, 'manual multi-trial flow should read the current active heat-capacity trial');
assert.match(workbenchSource, /const hasActiveTrialU1 =/, 'manual U1 completion should be scoped to the active trial instead of the whole trial table');
assert.match(workbenchSource, /const hasActiveTrialU2 =/, 'manual U2 completion should be scoped to the active trial instead of the whole trial table');
assert.match(workbenchSource, /const isActiveTrialComplete =/, 'manual next-trial transition should require the active trial to be complete');
assert.match(workbenchSource, /const getActiveTrialRecordedU1Mv =/, 'manual U2 readiness should use the active trial U1 value');
assert.match(workbenchSource, /const getManualHeatCapacityDecisionPressureMv =[\s\S]*pressureSignalTargetMv/, 'manual record readiness should prefer target pressure over display jitter');
assert.match(workbenchSource, /const getManualHeatCapacityDecisionTemperatureMv =[\s\S]*temperatureSignalTargetMv/, 'manual record readiness should prefer target temperature over display jitter');
assert.doesNotMatch(workbenchSource, /const profilePressureSignalMv = profile[\s\S]*pressureSignalMv: profilePressureSignalMv \?\? file\.pressureSignalMv/, 'manual record input must not substitute profile pressure for the current instrument reading');
assert.doesNotMatch(workbenchSource, /const profileTemperatureSignalMv = profile[\s\S]*temperatureSignalMv: profileTemperatureSignalMv \?\? file\.temperatureSignalMv/, 'manual record input must not substitute profile temperature for the current instrument reading');
assert.match(workbenchSource, /captureHeatCapacityWorkbenchSample\([\s\S]*kind === 'u1' \? 'stableBeforeReleaseSample' : 'recoverySample'[\s\S]*\{ applyProfile: false \}/, 'manual U1 and U2 sampling should preserve actual readings instead of profile-adjusted samples');
assert.match(workbenchSource, /const isManualHeatCapacityTemperatureAtAmbient =/, 'manual U1/U2 readiness should verify Uₜ has returned near room temperature');
assert.match(workbenchSource, /const isManualHeatCapacityReleaseCompleteForU2 =/, 'manual U2 flow should verify quick release is complete before allowing stopcock closure and recovery');
assert.match(workbenchSource, /if \(file\.heatCapacityPhase === 'recovering'\) return true;/, 'manual U2 release completion should remain true after the process has entered recovery');
assert.match(workbenchSource, /if \(recordedU1Mv !== null\) return recordedU1Mv \* \(1 - 1 \/ file\.theoreticalGamma\);/, 'manual U2 readiness should derive the target from the recorded U1 before falling back to profile defaults');
assert.match(workbenchSource, /const isManualU1RecordReady =[\s\S]*isManualHeatCapacityTemperatureAtAmbient\(file\)/, 'U1 recording should require temperature recovery to the room baseline');
assert.match(workbenchSource, /const isManualU2RecordReady =[\s\S]*isManualHeatCapacityTemperatureAtAmbient\(file\)/, 'U2 recording should require temperature recovery to the room baseline');
assert.match(workbenchSource, /stabilizeBeforeReleaseRequired:\s*waitBeforeU1Message/, 'waiting for U1 should use the normal process guidance copy');
assert.match(workbenchSource, /recoverRequired:\s*recoverMessage/, 'waiting for U2 should use the normal process guidance copy');
assert.match(workbenchSource, /请等待 U₁ 和 Uₜ 稳定；稳定后记录 U₁ 和 Uₜ。/, 'U1 waiting guidance should use the confirmed normal-process copy');
assert.match(workbenchSource, /请等待 U₂ 和 Uₜ 稳定；稳定后记录 U₂ 和 Uₜ。/, 'U2 waiting guidance should use the confirmed normal-process copy');
assert.doesNotMatch(workbenchSource, /latestStep === 'stabilizeBeforeReleaseRequired' \|\| latestStep === 'recoverRequired'[\s\S]*return;/, 'waiting for stable U1 or U2 should emit normal blue process guidance without requiring a blocked user action');
assert.match(workbenchSource, /const isManualU2RecordReady =[\s\S]*const recordedU1Mv = getActiveTrialRecordedU1Mv\(file\)/, 'U2 readiness should not borrow U1 from a previous completed trial');
assert.match(workbenchSource, /if \(!releaseComplete\) return 'openStopcockReleaseRequired';[\s\S]*if \(stopcockState === 'open'\) return 'closeStopcockAfterReleaseRequired'/, 'manual release flow should keep the stopcock open until Uₚ has dropped near zero');
assert.match(workbenchSource, /const u1Ready = isManualU1RecordReady\(file\)/, 'manual workflow should use the U1 stable-window helper');
assert.match(workbenchSource, /const u2Ready = isManualU2RecordReady\(file\)/, 'manual workflow should use the U2 stable-window helper');
assert.match(workbenchSource, /const hasU1 = hasActiveTrialU1\(file\)/, 'manual workflow should decide U1 completion from the active trial only');
assert.match(workbenchSource, /const hasU2 = hasActiveTrialU2\(file\)/, 'manual workflow should decide U2 completion from the active trial only');
assert.match(workbenchSource, /const recordedU1Mv = getActiveTrialRecordedU1Mv\(file\)/, 'manual workflow should derive release state from the active trial U1 only');
assert.match(workbenchSource, /isActiveTrialComplete\(file\) && completedTrialCount < file\.heatCapacityExpectedTrialCount/, 'manual workflow should show next-trial only after the active trial is complete');
assert.doesNotMatch(workbenchSource, /const hasU1 = file\.heatCapacityTrials\.some\(\(trial\) => trial\.U1Mv !== null\)/, 'manual workflow must not use global U1 presence to advance the active trial');
assert.doesNotMatch(workbenchSource, /const hasU2 = file\.heatCapacityTrials\.some\(\(trial\) => trial\.U2Mv !== null\)/, 'manual workflow must not use global U2 presence to advance the active trial');
assert.doesNotMatch(workbenchSource, /file\.heatCapacityTrials\.find\(\(trial\) => trial\.U1Mv !== null\)\?\.U1Mv/, 'manual workflow must not borrow recorded U1 from earlier trials');
assert.doesNotMatch(workbenchSource, /const u1Ready =[\s\S]*pressureValue >= 80[\s\S]*!file\.pressureOverLimit/, 'manual U1 record readiness should not depend on the old single 80 mV threshold');
assert.doesNotMatch(workbenchSource, /expectedU1 \* 0\.62/, 'manual U1 readiness should not reintroduce the too-strict platform threshold');
const u1ReadyBlock = workbenchSource.match(/const isManualU1RecordReady =[\s\S]*?const isManualU2RecordReady =/)?.[0] ?? '';
assert.doesNotMatch(u1ReadyBlock, /file\.heatCapacityPhase === 'recovering'/, 'U1 readiness must not treat the post-release recovery phase as before-release stability');
assert.match(workbenchSource, /const isManualU0ZeroReady =/, 'manual U0 recording should have a dedicated zero-ready helper');
assert.match(workbenchSource, /const isManualU0ZeroAttempted =/, 'manual zero guidance should distinguish no adjustment from an incomplete adjustment');
assert.match(workbenchSource, /recordU0Required:\s*\['adjustPressureZero',\s*'recordU0'\]/, 'U0 recording stage should still allow continued pressure-zero adjustment');
assert.match(workbenchSource, /if \(!isManualU0ZeroReady\(file\)\) return 'zeroAdjustRequired'/, 'manual workflow should not advance to U0 recording until the pressure-zero value is actually acceptable');
assert.doesNotMatch(workbenchSource, /if \(!file\.pressureZeroAdjusted\) return 'zeroAdjustRequired';\s*return 'recordU0Required';/, 'manual workflow should not treat any pressure-zero adjustment as a successful zero');
assert.doesNotMatch(workbenchSource, /kind === 'u0'[\s\S]*Math\.abs\(zeroReferenceMv\) > 1\.5[\s\S]*recordU0Warning/, 'record U0 click should not run a second, looser validation after the workflow already exposes the button');
assert.doesNotMatch(workbenchSource, /pressureValue\s*[<>]=?\s*80/, 'manual U1 flow should not keep the old fixed 80 mV transition threshold');
assert.doesNotMatch(workbenchSource, /不建议记录 U₀|不建議記錄 U₀|U₀ recording is not recommended/, 'U0 guidance should not imply optional recording after the workflow exposes the record button');
assert.doesNotMatch(workbenchSource, /--heat-record-focus-offset/, 'manual record controls should move through the shared overlay slot instead of a measured focus-panel offset');
assert.doesNotMatch(styleSource, /studio-heat-record-controls-focus-raised/, 'manual record controls should not use focus-only lift classes');
assert.match(workbenchSource, /openStopcockForZeroRequired:\s*\['openStopcock'\]/, 'manual workflow should require opening the stopcock before pressure zeroing');
assert.match(workbenchSource, /openStopcockReleaseRequired:\s*\['openStopcock'\]/, 'manual workflow should block release until the U1 step has been satisfied');
assert.match(workbenchSource, /nextTrialRequired:\s*\['startNextTrial'\]/, 'manual workflow should expose a guarded next-trial action after each completed trial before the final one');
assert.match(workbenchSource, /getHeatCapacityCompletedTrialCount\(file\.heatCapacityTrials\)[\s\S]*file\.heatCapacityExpectedTrialCount[\s\S]*return 'nextTrialRequired'/, 'manual workflow should require starting the next trial until expected trial count is complete');
assert.match(workbenchSource, /const startNextHeatCapacityManualTrial =[\s\S]*getHeatCapacityNextActiveTrialIndex[\s\S]*heatCapacityProcessSamples: \{\}/, 'starting the next heat-capacity trial should preserve completed trials while clearing current process samples');
assert.match(workbenchSource, /data-heat-capacity-mode-action="next-trial"[\s\S]*startNextHeatCapacityManualTrial/, 'header mode bar should render the next-trial button after the delayed nextTrialRequired reveal');
assert.match(workbenchSource, /calculateRequired:\s*\['calculate'\]/, 'manual workflow should make calculation an explicit final step');
assert.doesNotMatch(workbenchSource, /const animateHeatCapacityStopcockAngle =/, 'auto demo stopcock actions should not use the old continuous angle writer that fights the scene-level two-state animation');
assert.match(workbenchSource, /const setHeatCapacityStopcockOpenByFileId =[\s\S]*getHeatCapacityStopcockTargetAngle\(nextOpen\)[\s\S]*glassPistonState: nextOpen \? 'open' : 'closed'/, 'auto demo stopcock actions should write the same open/closed target state used by manual interaction');
assert.match(workbenchSource, /closeStopcockForPumping' \|\| action === 'closeStopcockForRecovery'[\s\S]*setHeatCapacityStopcockOpenByFileId\(fileId, false\)/, 'auto demo close-stopcock actions should use the two-state stopcock helper');
assert.match(workbenchSource, /openStopcockForRelease' \|\| action === 'openStopcockForZero'[\s\S]*setHeatCapacityStopcockOpenByFileId\(fileId, true\)/, 'auto demo open-stopcock actions should use the two-state stopcock helper');
assert.match(workbenchSource, /MANUAL_HEAT_CAPACITY_IDLE_HINT_DELAY_MS = 1000/, 'manual workflow idle hint should use the temporary 1s validation delay');
assert.match(workbenchSource, /scheduleManualIdleHint\(MANUAL_HEAT_CAPACITY_IDLE_HINT_REPEAT_MS\)/, 'manual workflow hints should repeat while the user stays on the same step');
assert.match(workbenchSource, /activeHeatCapacityManualStep/, 'manual idle hint scheduling should depend on a stable manual step value instead of the whole active file object');
assert.doesNotMatch(workbenchSource, /useEffect\(\(\) => \{[\s\S]*manualHeatCapacityIdleTimerRef[\s\S]*\}, \[\s*activeFile,/, 'manual idle hint timer must not depend on the full activeFile object that ticks every 100ms');
assert.match(workbenchSource, /const activateHeatCapacityManualExperiment =[\s\S]*setManualHeatCapacityActiveFileId\(fileId\)/, 'activating guide mode should enter the tutorial state machine');
assert.match(workbenchSource, /const startHeatCapacityManualExperiment = \(\) => \{[\s\S]*activateHeatCapacityManualExperiment\(guideFileId, guideFileName\);[\s\S]*showHeatCapacityAutoDemoCompletionToast\(heatCapacityRealtimeCopy\.guideModeStartingToast, HEAT_CAPACITY_GUIDE_START_NOTICE_MS\);/, 'starting guide mode should activate the process and show the localized centered start notice in the same click');
assert.doesNotMatch(workbenchSource, /heatCapacityGuideStartTimerRef\.current = window\.setTimeout\(\(\) => \{[\s\S]*activateHeatCapacityManualExperiment\(guideFileId, guideFileName\)/, 'starting guide mode should not delay the exit button behind the centered start notice');
assert.match(workbenchSource, /setManualHeatCapacityActiveFileId\(null\)/, 'starting auto demo should disable the manual tutorial state machine');
assert.match(styleSource, /\.studio-heat-manual-step-hint/, 'manual heat-capacity step hints should have a dedicated overlay style');
assert.match(styleSource, /@keyframes studio-heat-manual-record-pulse/, 'recording guidance should use a restrained pulse animation');
assert.match(workbenchSource, /adjustHeatCapacityPressureZeroFine/, 'workbench should route pressure zero wheel changes to heatCapacity state');
assert.match(workbenchSource, /adjustHeatCapacityPressureZeroCoarse/, 'workbench should route pressure zero drag changes to heatCapacity state');
assert.match(workbenchSource, /const \[heatCapacityPumpPulseId, setHeatCapacityPumpPulseId\]/, 'workbench should keep pump pulse as local UI-only state');
assert.match(workbenchSource, /setHeatCapacityPumpPulseId\(\(pulseId\) => pulseId \+ 1\)/, 'each pump press should retrigger local visual feedback');
assert.match(workbenchSource, /pumpPulseId=\{heatCapacityPumpPulseId\}/, 'workbench should pass local pump pulse signal into the 3D scene');
assert.match(workbenchSource, /pressureKPa={activeFile\.pressureKPa}/, 'workbench should pass current pressureKPa into the 3D gauge');
assert.match(workbenchSource, /pressureLimitKPa={activeFile\.pressureLimitKPa}/, 'workbench should pass pressureLimitKPa into the 3D gauge');
assert.match(workbenchSource, /gaugePressureMinKPa=\{activeFile\.gaugePressureMinKPa\}/, 'workbench should pass gauge pressure min into the 3D pressure gauge');
assert.match(workbenchSource, /gaugePressureMaxKPa=\{activeFile\.gaugePressureMaxKPa\}/, 'workbench should pass gauge pressure max into the 3D pressure gauge');
assert.match(workbenchSource, /pressureSafetyThresholdKPa=\{activeFile\.pressureSafetyThresholdKPa\}/, 'workbench should pass safety threshold into the 3D pressure gauge');
assert.match(workbenchSource, /pressureOverLimit=\{activeFile\.pressureOverLimit\}/, 'workbench should pass pressure over-limit state into the 3D pressure gauge');
assert.match(workbenchSource, /data-heat-capacity-pressure-warning="true"/, 'workbench should render a centered red pressure warning from pressureOverLimit');
assert.match(workbenchSource, /studio-heat-pressure-warning-kicker/, 'pressure warning markup should include an engineering status kicker');
assert.match(stateSource, /HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV = 90/, 'manual pumping should consider 90 mV sufficient instead of the old 100 mV gate');
assert.match(stateSource, /HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV = 115/, 'warning should begin at the 4-stroke Free Mode target window');
assert.match(stateSource, /HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV = 140/, 'alarm should remain above the 4-stroke Free Mode target window');
assert.match(parameterConfigSource, /minimumUsefulU1CorrectedMv:\s*90/, 'Free U1 recording threshold should stay at 90 mV instead of being lowered');
assert.match(stateSource, /压强接近安全阈值，请准备停止打气。/, 'pressure warning copy should use the confirmed pre-alarm wording');
assert.match(stateSource, /压强已超过安全阈值，请停止打气。/, 'pressure alarm copy should use the confirmed alarm wording');
assert.doesNotMatch(stateSource, /压强接近预警值，请注意|压强超过安全阈值，请停止打气(?!。)/, 'old pressure warning and alarm wording should be removed');
assert.doesNotMatch(workbenchSource, /危险：压强超过阈值/, 'center alarm title should not keep the older threshold wording');
assert.match(workbenchSource, /HEAT_CAPACITY_PRESSURE_ALARM_DURATION_MS = 2000/, 'center alarm should stay visible for two seconds');
assert.match(workbenchSource, /HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER_AFTER_ALARM_MS = 220/, 'close-valve reminder should wait until after the center alarm has been cleared');
assert.match(workbenchSource, /closePumpValveReminder:\s*'请关闭打气阀门。'/, 'alarm follow-up should ask the user to close the pump valve through localized copy');
assert.match(workbenchSource, /closePumpValveReminder:\s*'Close the pump valve\.'/, 'alarm follow-up should have English localized copy');
assert.match(workbenchSource, /heatCapacityPressureAlarmVisible/, 'center pressure alarm should be controlled by a transient visible state instead of staying mounted while over limit');
assert.match(workbenchSource, /const effectivePressureSafetyStatus = heatCapacityPressureAlarmVisible \? 'danger' : activeFile\.pressureSafetyStatus/, 'right-side safety card should show danger while the center alarm is visible');
assert.match(workbenchSource, /studio-heat-safety-\$\{effectivePressureSafetyStatus\}/, 'right-side safety card color should follow the effective visible alarm status');
assert.match(workbenchSource, /showHeatCapacityToast\(heatCapacityRealtimeCopy\.pressureWarningMessage,\s*'warning',\s*\{[\s\S]*interrupt:\s*true,[\s\S]*priority:\s*HEAT_CAPACITY_PRESSURE_WARNING_TOAST_PRIORITY,[\s\S]*\}\)/, 'prewarning should visually cover the current bottom-center hint with localized copy');
assert.match(workbenchSource, /HEAT_CAPACITY_PRESSURE_WARNING_TOAST_PRIORITY/, 'prewarning should have an explicit safety toast priority above ordinary guidance');
assert.match(workbenchSource, /HEAT_CAPACITY_CRITICAL_TOAST_PRIORITY/, 'alarm and close-valve reminders should have an explicit priority above prewarning');
assert.match(workbenchSource, /type HeatCapacityToastSource =[\s\S]*'manual-guide'[\s\S]*'manual-blocked'[\s\S]*'pressure-warning'[\s\S]*'pressure-close-valve'/, 'heat-capacity bottom toasts should track their source so safety hints and ordinary guidance do not fight for one slot');
assert.match(workbenchSource, /type HeatCapacityToastLevel = 'info' \| 'success' \| 'warning' \| 'danger'/, 'heat-capacity bottom toasts should support a green success level for successful records');
assert.match(styleSource, /\.studio-heat-manual-step-hint-success \{[\s\S]*rgba\(34,\s*197,\s*94/, 'successful heat-capacity records should use a green bottom-center toast style');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-manual-step-hint-success \{[\s\S]*rgba\(22,\s*163,\s*74/, 'light theme should keep successful record toasts green and readable');
assert.match(workbenchSource, /const isHeatCapacityPressureToast =[\s\S]*message\??\.source === 'pressure-warning'[\s\S]*message\??\.source === 'pressure-close-valve'/, 'pressure warning and post-alarm close-valve reminders should share the protected safety toast class');
assert.match(workbenchSource, /isHeatCapacityPressureToast\(currentMessage\) && !isHeatCapacityPressureToast\(nextMessage\)[\s\S]*return;/, 'ordinary guide hints must not interrupt an active pressure warning or post-alarm close-valve reminder');
assert.match(workbenchSource, /isHeatCapacityPressureToast\(currentMessage\) && !isHeatCapacityPressureToast\(nextMessage\)[\s\S]*return;/, 'ordinary guide hints must not queue stale guidance behind a protected pressure toast');
assert.match(workbenchSource, /const clearManualHeatCapacityGuidance = \(\) => \{[\s\S]*clearHeatCapacityToastBySource\(isHeatCapacityManualToast\)/, 'clearing manual guidance must not erase pressure warning or post-alarm close-valve reminders');
assert.match(workbenchSource, /currentMessage\.priority > nextMessage\.priority[\s\S]*return;/, 'lower-priority toasts must not interrupt an active safety warning or critical reminder');
assert.match(workbenchSource, /nextMessage\.priority < currentMessage\.priority[\s\S]*return;/, 'lower-priority toasts must not queue behind an active safety warning');
assert.match(workbenchSource, /heatCapacityRealtimeCopy\.pressureWarningMessage,\s*'warning',\s*\{[\s\S]*interrupt:\s*true,[\s\S]*priority:\s*HEAT_CAPACITY_PRESSURE_WARNING_TOAST_PRIORITY,[\s\S]*source:\s*'pressure-warning'[\s\S]*\}/, 'prewarning should use the protected pressure-warning source and explicit priority');
assert.match(workbenchSource, /heatCapacityRealtimeCopy\.closePumpValveReminder,\s*'warning',\s*\{[\s\S]*interrupt:\s*true,[\s\S]*priority:\s*HEAT_CAPACITY_CRITICAL_TOAST_PRIORITY,[\s\S]*source:\s*'pressure-close-valve'[\s\S]*\}/, 'post-alarm close-valve reminder should use a protected source and outrank prewarning and ordinary guidance');
assert.match(workbenchSource, /else if \(pressureStatusAfterPump === 'warning'\) \{[\s\S]*showHeatCapacityToast\(heatCapacityRealtimeCopy\.pressureWarningMessage,\s*'warning'/, 'prewarning should remain visible when the user continues pumping inside the warning band');
assert.doesNotMatch(workbenchSource, /pressureStatusAfterPump === 'warning' && pressureStatusBeforePump === 'normal'/, 'prewarning should not depend only on a perfect normal-to-warning transition');
assert.match(workbenchSource, /clearHeatCapacityToastQueue\(\)[\s\S]*setHeatCapacityPressureAlarmVisible\(true\)/, 'showing the center alarm should immediately remove the bottom warning hint');
assert.match(workbenchSource, /<span>\{heatCapacityRealtimeCopy\.pressureWarningFallback\}<\/span>/, 'center pressure alarm should always show the confirmed alarm message instead of a stale realtime safety message');
assert.doesNotMatch(workbenchSource, /activeFile\.pressureSafetyMessage \?\? heatCapacityRealtimeCopy\.pressureWarningFallback/, 'center pressure alarm must not reuse warning-region safety copy');
assert.match(workbenchSource, /setHeatCapacityFocusResetKey\(\(key\) => key \+ 1\);[\s\S]*setHeatCapacityFocusMode\('none'\)/, 'pressure alarm should exit any manual focus mode');
assert.match(workbenchSource, /showHeatCapacityToast\(heatCapacityRealtimeCopy\.closePumpValveReminder,\s*'warning',\s*\{[\s\S]*interrupt:\s*true,[\s\S]*priority:\s*HEAT_CAPACITY_CRITICAL_TOAST_PRIORITY,[\s\S]*\}\)/, 'post-alarm close-valve reminder should use the same overriding bottom-center hint path');
{
  const alarmFunctionStart = workbenchSource.indexOf('const showHeatCapacityPressureAlarm =');
  const alarmTimerStart = workbenchSource.indexOf('heatCapacityPressureAlarmTimerRef.current = window.setTimeout(() => {', alarmFunctionStart);
  const alarmTimerEnd = workbenchSource.indexOf('}, HEAT_CAPACITY_PRESSURE_ALARM_DURATION_MS);', alarmTimerStart);
  const hideAlarm = workbenchSource.indexOf('setHeatCapacityPressureAlarmVisible(false);', alarmTimerStart);
  const closeValveReminder = workbenchSource.indexOf('heatCapacityClosePumpValveReminderTimerRef.current = window.setTimeout(() => {', alarmTimerStart);
  assert.ok(
    alarmTimerStart > alarmFunctionStart &&
    hideAlarm > alarmTimerStart &&
    closeValveReminder > hideAlarm &&
    closeValveReminder < alarmTimerEnd,
    'close-valve reminder should be scheduled from inside the alarm-hide timer so it cannot overlap the center alarm',
  );
}
assert.match(workbenchSource, /if \(!currentFile\.pumpValveOpen\) return;[\s\S]*showHeatCapacityToast\(heatCapacityRealtimeCopy\.closePumpValveReminder,\s*'warning'/, 'post-alarm close-valve reminder should depend on the valve still being open, not on pressure still being over limit');
assert.doesNotMatch(workbenchSource, /if \(!currentFile\.pressureOverLimit \|\| !currentFile\.pumpValveOpen\) return;/, 'post-alarm close-valve reminder must not disappear just because pressure naturally falls below the alarm threshold');
assert.doesNotMatch(workbenchSource, /let pumpedHeatCapacityFile[\s\S]*updateFileById\(fileId,\s*\(file\) => \{[\s\S]*pumpedHeatCapacityFile = nextFile/, 'manual pressure threshold events must not depend on assigning a value inside a React state updater');
assert.match(workbenchSource, /const nextHeatCapacityFile = fileBeforePump\?\.kind === 'heatCapacity'[\s\S]*registerHeatCapacityPumpStroke\(fileBeforePump,\s*now\)/, 'pump result should be calculated synchronously before updating React state');
assert.match(workbenchSource, /updateFileById\(fileId,\s*\(file\) => \{[\s\S]*return nextHeatCapacityFile;/, 'React state update should use the synchronously calculated pump result');
assert.match(workbenchSource, /if \(source !== 'autoDemo' && nextHeatCapacityFile\) \{[\s\S]*showHeatCapacityPressureAlarm\(nextHeatCapacityFile\.id,\s*nextHeatCapacityFile\.name\)/, 'warning and alarm overlays should be triggered from the synchronously calculated pump result');
assert.match(workbenchSource, /getHeatCapacityPressureThresholdsMv\(file\)/, 'manual pressure toast status should read the current Heat Capacity safety thresholds from the active file');
assert.doesNotMatch(workbenchSource, /getHeatCapacityPressureSafetyStatusFromMv[\s\S]{0,260}HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV/, 'manual pressure status must not classify danger using the fixed 140 mV constant');
assert.doesNotMatch(workbenchSource, /getHeatCapacityPressureSafetyStatusFromMv[\s\S]{0,320}HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV/, 'manual pressure status must not classify warning using the fixed 115 mV constant');
assert.doesNotMatch(workbenchSource, /showHeatCapacityPressureThresholdToast[\s\S]{0,420}HEAT_CAPACITY_PRESSURE_(?:WARNING|DANGER)_THRESHOLD_MV/, 'manual pressure toast copy must not be gated by fixed 115/140 mV constants');
assert.match(workbenchSource, /pushLog\(heatCapacityRealtimeCopy\.pressureAlarmLog\(fileName\),\s*'warning'\)/, 'only alarm should write a localized console warning');
assert.doesNotMatch(workbenchSource, /pushLog\(`\$\{[^`]+\.name\}: 压强接近安全阈值，请准备停止打气。`,\s*'warning'\)/, 'prewarning should not write a console warning');
assert.match(workbenchSource, /nextFrequencyState\.pumpFrequencyStatus === 'tooSlow'/, 'slow-pump toast should follow the same frequency status as the realtime panel');
assert.match(workbenchSource, /nextFrequencyState\.timestamps\.length >= 2/, 'slow-pump toast should wait for at least two strokes before judging cadence');
assert.doesNotMatch(workbenchSource, /nextFrequencyState\.pumpFrequency < HEAT_CAPACITY_PUMP_RATE_SLOW_THRESHOLD_HZ/, 'slow-pump toast should not use a stale separate 2 Hz threshold');
assert.match(workbenchSource, /closePumpValveRequired:\s*\['closePumpValve',\s*'pumpBulb'\]/, 'manual workflow should still allow pumping from the warning region toward alarm');
assert.doesNotMatch(u1ReadyBlock, /!file\.pressureOverLimit/, 'manual U1 readiness should allow continuing the experiment after an alarm once the user closes the valve and readings stabilize');
assert.doesNotMatch(trialModelSource, /input\.pressureOverLimit \|\| input\.pressureSafetyStatus === 'danger'/, 'trial recording should not reject U1 solely because the pressure alarm was reached');
assert.match(workbenchSource, /willHeatCapacityAutoDemoPumpExceedAlarm/, 'auto demo pumping should have an explicit alarm-boundary guard');
assert.match(workbenchSource, /source === 'autoDemo'[\s\S]*willHeatCapacityAutoDemoPumpExceedAlarm/, 'auto demo pump strokes should be checked before they can enter the alarm region');
assert.match(styleSource, /\.studio-heat-pressure-warning \{[\s\S]*aspect-ratio:\s*1\s*\/\s*1;/, 'center alarm should be a large square warning surface');
assert.match(styleSource, /\.studio-heat-pressure-warning \{[\s\S]*background:[^;]*rgba/, 'center alarm should keep a translucent background');
assert.match(styleSource, /\.studio-heat-pressure-warning \{[\s\S]*animation:\s*studioOverlayFadeIn/, 'center alarm should fade in without movement or scale');
assert.match(workbenchSource, /temperatureSignalMv=\{activeFile\.powerOn \? activeHeatCapacityDisplay\.temperatureMv : null\}/, 'instrument screens should read the active temperature display channel by mode');
assert.match(workbenchSource, /pressureSignalMv=\{activeFile\.powerOn \? activeHeatCapacityDisplay\.pressureMv : null\}/, 'instrument screens should read the active pressure display channel by mode');
assert.match(sceneSource, /name="TemperatureDisplayChannelLabelText"[\s\S]*Uₜ \/ mV/, 'instrument host should label the left screen as the temperature signal channel');
assert.match(sceneSource, /name="PressureDisplayChannelLabelText"[\s\S]*Uₚ \/ mV/, 'instrument host should label the pressure screen as the pressure signal channel');
assert.match(sceneSource, /const INSTRUMENT_PANEL_TITLE_TEXT_SIZE = 0\.044;/, 'instrument title label should be enlarged without moving outside the host panel');
assert.match(sceneSource, /const INSTRUMENT_PANEL_CHANNEL_LABEL_TEXT_SIZE = 0\.034;/, 'instrument channel labels should be enlarged but remain smaller than display values');
assert.match(sceneSource, /const INSTRUMENT_PANEL_INPUT_LABEL_TEXT_SIZE = 0\.032;/, 'instrument input labels should be enlarged but stay below the terminals');
assert.match(sceneSource, /name="InstrumentPanelTitleText"\s+position=\{\[0, 0\.28, 0\.505\]\}\s+size=\{INSTRUMENT_PANEL_TITLE_TEXT_SIZE\}/, 'instrument title label should keep its safe top-panel position');
assert.match(sceneSource, /name="TemperatureDisplayChannelLabelText"\s+position=\{\[-0\.64, 0\.215, 0\.505\]\}\s+size=\{INSTRUMENT_PANEL_CHANNEL_LABEL_TEXT_SIZE\}/, 'temperature channel label should keep its safe gap above the screen');
assert.match(sceneSource, /name="PressureDisplayChannelLabelText"\s+position=\{\[0, 0\.215, 0\.505\]\}\s+size=\{INSTRUMENT_PANEL_CHANNEL_LABEL_TEXT_SIZE\}/, 'pressure channel label should keep its safe gap above the screen');
assert.match(sceneSource, /name="TemperatureInputPortLabelText"\s+position=\{\[-0\.64, -0\.23, 0\.505\]\}\s+size=\{INSTRUMENT_PANEL_INPUT_LABEL_TEXT_SIZE\}/, 'temperature input label should keep its safe lower-panel position');
assert.match(sceneSource, /name="PressureInputPortLabelText"\s+position=\{\[-0\.08, -0\.24, 0\.505\]\}\s+size=\{INSTRUMENT_PANEL_INPUT_LABEL_TEXT_SIZE\}/, 'pressure input label should keep its safe lower-panel position');
assert.match(sceneSource, /formatSignal = \(value: number \| null, fallback = '--\.-- mV'\)[\s\S]*value\.toFixed\(2\)/, '3D instrument model panel should show sensor mV readings to 0.01 mV');
assert.match(workbenchSource, /const temperatureSignalValue =[\s\S]*formatMetric\(activeFile\.temperatureSignalMv, 2\)/, 'right realtime model panel should show temperature mV readings to 0.01 mV');
assert.match(workbenchSource, /const pressureSignalValue =[\s\S]*formatMetric\(activeFile\.pressureSignalMv, 2\)/, 'right realtime model panel should show pressure mV readings to 0.01 mV');
assert.match(workbenchSource, /updateHeatCapacityPower/);
assert.match(workbenchSource, /updateHeatCapacityStopcockOpen/);
assert.doesNotMatch(workbenchSource, /const updateHeatCapacityStopcockAngle/, 'Workbench should not keep the continuous stopcock angle updater');
assert.doesNotMatch(workbenchSource, /zeroHeatCapacityPressure/, 'workbench should not keep the old one-click pressure-zero path');
assert.doesNotMatch(workbenchSource, /setHeatCapacityPressureZeroOffset\(file,\s*file\.pressureRawPlaceholder/, 'pressure-zero action must not directly jump the displayed pressure to zero');
assert.doesNotMatch(workbenchSource, /captureHeatCapacityWorkbenchSample\(zeroedFile,\s*'zeroedSample'\)/, 'auto demo must not bypass U0 zero readiness by directly capturing after one-click zero');
assert.match(workbenchSource, /updateHeatCapacityPumpValve/);
assert.match(workbenchSource, /pressHeatCapacityPumpBulb/);
assert.match(workbenchSource, /pumpFrequencyStatus/);
assert.match(workbenchSource, /createHeatCapacityAutoDemoSteps/, 'workbench should wire the one-shot heat capacity auto demo script');
assert.match(workbenchSource, /getHeatCapacityAutoDemoTimeline/, 'workbench should schedule semantic auto demo highlight/action/observe stages');
assert.match(workbenchSource, /HEAT_CAPACITY_AUTO_DEMO_RESET_MS/, 'heat capacity auto demo should reserve a reset phase before step 1 starts');
assert.match(workbenchSource, /Initializing auto demo|初始化自动演示|初始化自動演示/, 'auto demo start should show a centered automatic initialization message before running');
assert.match(workbenchSource, /resetting controls|自动复位控件|自動復位控制項/, 'auto demo start should describe automatic reset instead of asking the user to reset manually');
assert.match(workbenchSource, /setAutoDemoStepTitle\(heatCapacityRealtimeCopy\.autoDemoPreparingTitle\)/, 'auto demo reset phase should not show stale completion copy in the step panel');
assert.match(workbenchSource, /timelineItem\.atMs < startFromElapsedMs/, 'auto demo timeline should not skip the first zero-time step after the reset delay');
assert.match(workbenchSource, /scheduleHeatCapacityAutoDemoTimeline\(demoFileId, timeline, 0, HEAT_CAPACITY_AUTO_DEMO_RESET_MS\)/, 'auto demo timeline should start after the default reset phase');
assert.match(workbenchSource, /timelineItem\.stage === 'preview'/, 'auto demo should update the step panel one second before the next highlight');
assert.match(workbenchSource, /autoDemoInteractionLocked/, 'workbench should lock user actions while auto demo is running');
assert.match(workbenchSource, /autoDemoPaused/, 'heat capacity auto demo should keep an explicit paused state');
assert.match(workbenchSource, /pauseHeatCapacityAutoDemo/, 'heat capacity pause button should pause the demo instead of showing a future-batch warning');
assert.match(workbenchSource, /terminateHeatCapacityAutoDemo/, 'heat capacity stop button should terminate the demo instead of showing a future-batch warning');
assert.match(workbenchSource, /terminateHeatCapacityAutoDemo[\s\S]*markHeatCapacityDemoComplete/, 'terminating heat capacity auto demo should reset controls through the same default-state path as normal completion');
assert.doesNotMatch(workbenchSource, /future batch|后续批次|後續批次/, 'heat capacity pause and stop controls should now have real behavior');
assert.match(workbenchSource, /showHeatCapacityAutoDemoLockedToast/, 'workbench should show a single locked-interaction toast');
assert.match(workbenchSource, /Cannot operate during demo|演示中无法操作|演示中無法操作/, 'locked heat capacity preview clicks should show the required toast text');
assert.match(workbenchSource, /studio-heat-toast-kicker/, 'toast markup should include engineering status kicker labels');
assert.match(workbenchSource, /Demo complete|演示完成|演示完成/, 'normal heat capacity demo completion should show a centered completion message');
assert.match(workbenchSource, /onFocusModeChange=\{updateHeatCapacityFocusMode\}/, 'workbench should route heat-capacity focus changes through the focus-session policy');
assert.match(workbenchSource, /setHeatCapacityFocusResetKey\(\(key\) => key \+ 1\);[\s\S]*heatCapacityFocusModeRef\.current = 'none'/, 'auto demo should reset the heat scene to the default view before starting');
assert.match(workbenchSource, /setAutoDemoStepCount\(steps\.length\)/, 'auto demo should prepare the current step count before the reset phase');
assert.match(workbenchSource, /autoDemoStepPanelMode/, 'workbench should keep the auto demo step panel mounted long enough to animate in and out');
assert.match(workbenchSource, /hideHeatCapacityAutoDemoStepPanel\(\)/, 'normal completion and termination should slide the auto demo step panel out instead of leaving it pinned');
assert.match(workbenchSource, /timelineItem\.focusControlId/, 'auto demo timeline should support per-highlight focus targets inside one semantic step');
assert.match(
  workbenchSource,
  /createDefaultHeatCapacityFile\(index, workbenchLayoutDefaults\.heatCapacity\);[\s\S]*if \(file\.kind === 'heatCapacity'\) \{[\s\S]*clearHeatCapacityAutoDemoUiState\(\);/,
  'creating a fresh heat-capacity file should clear stale auto-demo UI so the initial state stays clean',
);
assert.match(workbenchSource, /renderScientificText/, 'visible heat-capacity labels should render U variables with real subscripts');
assert.match(workbenchSource, /studio-heat-stopcock-mini-readout/, 'manual stopcock focus should render a compact host-readout mirror');
assert.match(workbenchSource, /heatCapacityFocusMode === 'stopcock' && !autoDemoRunning && !autoDemoPaused && !autoDemoInteractionLocked/, 'stopcock mini readout should only appear in manual stopcock focus mode');
assert.match(workbenchSource, /activeFile\.temperatureSignalMv/, 'stopcock mini readout should mirror the displayed temperature channel');
assert.match(workbenchSource, /activeFile\.pressureSignalMv/, 'stopcock mini readout should mirror the displayed pressure channel');
assert.match(workbenchSource, /activeFile\.pressureGaugeNeedleAngle/, 'stopcock mini gauge should mirror the shared pressure gauge needle angle');
assert.match(workbenchSource, /const gaugeStatusAttribute = activeFile\.powerOn \? activeFile\.pressureSafetyStatus : 'offline'/, 'stopcock mini readout should expose the shared pressure safety status without recalculating thresholds');
assert.match(workbenchSource, /data-heat-capacity-pressure-status=\{gaugeStatusAttribute\}/, 'stopcock mini readout should make normal, warning, danger, and offline states theme-addressable');
assert.match(workbenchSource, /studio-heat-stopcock-mini-statusbar/, 'stopcock mini readout should use a compact engineering status bar');
assert.match(workbenchSource, /studio-heat-stopcock-mini-readout-row/, 'stopcock mini readout should use aligned instrument readout rows');
assert.match(workbenchSource, /GAUGE kPa/, 'stopcock mini gauge should include an engineering gauge label');
assert.match(workbenchSource, /LIMIT|WARN|SAFE|OFFLINE/, 'stopcock mini readout should show compact engineering status text');
assert.match(workbenchSource, /studio-heat-stopcock-mini-gauge-track/, 'stopcock mini gauge should render a neutral scale track behind the safety ranges');
assert.match(workbenchSource, /studio-heat-stopcock-mini-gauge-tick-minor/, 'stopcock mini gauge should include minor ticks for a clearer pointer dial');
assert.match(workbenchSource, /studio-heat-stopcock-mini-gauge-scale-limit/, 'stopcock mini gauge should label the danger end of the pointer dial');
assert.match(workbenchSource, /overlayTopLeft=\{heatCapacityTopLeftOverlay\}[\s\S]*renderHeatCapacityStopcockMiniReadout|renderHeatCapacityStopcockMiniReadout[\s\S]*overlayTopLeft=\{heatCapacityTopLeftOverlay\}/, 'stopcock mini readout should sit inside the model window upper-left slot');
assert.match(styleSource, /\.studio-heat-stopcock-mini-readout \{[\s\S]*pointer-events: none;/, 'stopcock mini readout should not steal glass stopcock interactions');
assert.match(styleSource, /\.studio-heat-stopcock-mini-statusbar \{/, 'stopcock mini readout should style the engineering status bar');
assert.match(styleSource, /\.studio-heat-stopcock-mini-readout-row \{[\s\S]*grid-template-columns:/, 'stopcock mini readout rows should align labels, values, and units');
assert.match(styleSource, /\.studio-heat-stopcock-mini-gauge-label \{/, 'stopcock mini gauge should style the compact gauge label');
assert.match(styleSource, /\.studio-heat-stopcock-mini-gauge-track \{[\s\S]*stroke:/, 'stopcock mini gauge should style a visible neutral scale track');
assert.match(styleSource, /\.studio-heat-stopcock-mini-readout-warning \.studio-heat-stopcock-mini-gauge-needle \{[\s\S]*stroke:/, 'stopcock mini gauge should color the needle in the warning state');
assert.match(styleSource, /\.studio-heat-stopcock-mini-readout-danger \.studio-heat-stopcock-mini-gauge-needle \{[\s\S]*stroke:/, 'stopcock mini gauge should color the needle in the danger state');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-stopcock-mini-readout \{[\s\S]*background:/, 'light theme should restyle the stopcock mini readout surface');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-stopcock-mini-readout-row \{[\s\S]*background:/, 'light theme should restyle the stopcock mini readout rows');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-stopcock-mini-gauge-track \{[\s\S]*stroke:/, 'light theme should restyle the stopcock mini gauge track');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-stopcock-mini-readout-warning \.studio-heat-stopcock-mini-gauge-needle \{[\s\S]*stroke:\s*#b45309;/, 'light theme warning state should color the mini gauge needle amber');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-stopcock-mini-readout-danger \.studio-heat-stopcock-mini-gauge-needle \{[\s\S]*stroke:\s*#b42318;/, 'light theme danger state should color the mini gauge needle red');
assert.match(workbenchSource, /autoDemoStepTitle/, 'workbench should drive the right-top auto demo step panel');
assert.match(workbenchSource, /studio-heat-demo-step-panel/, 'preview should render the auto demo step panel inside the model window');
assert.match(workbenchSource, /data-heat-capacity-toast="true"/, 'preview should render locked interaction feedback through the unified heat-capacity toast queue');
assert.match(workbenchSource, /heatCapacityToastCurrentRef/, 'manual heat-capacity toasts should track the currently displayed message');
assert.match(workbenchSource, /heatCapacityToastPendingRef/, 'manual heat-capacity toasts should retain only one pending message');
assert.match(workbenchSource, /HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS = 2000/, 'manual heat-capacity toasts should display each visible message for two seconds');
assert.match(workbenchSource, /setHeatCapacityToastPendingState\(nextMessage\)/, 'new manual heat-capacity toasts should update the pending message without interrupting current text');
assert.doesNotMatch(workbenchSource, /autoDemoToastMessage|manualHeatCapacityHintMessage/, 'old independent heat-capacity toast states should not remain');
assert.match(workbenchSource, /prepareHeatCapacityAutoDemoStart/, 'auto demo should initialize with a non-zero pressure display bias without changing gas pressure');
assert.doesNotMatch(stateSource, /prepareHeatCapacityAutoDemoStart[\s\S]*stopcockAngleDeg:\s*HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG/, 'auto demo start must not silently open the stopcock during the power-on step');
assert.match(workbenchSource, /setHeatCapacityStopcockOpenByFileId\(fileId, true\)/, 'auto demo should request open stopcock movement through the shared two-state helper');
assert.match(workbenchSource, /setHeatCapacityStopcockOpenByFileId\(fileId, false\)/, 'auto demo should request closed stopcock movement through the shared two-state helper');
assert.doesNotMatch(workbenchSource, /animateHeatCapacityStopcockAngle/, 'auto demo should not write continuous stopcock angles that fight the scene-level smooth two-state animation');
assert.match(workbenchSource, /commitHeatCapacityAutoDemoPressureZero/, 'auto demo should commit pressure-zero logical state once instead of writing Workbench state through RAF');
assert.match(workbenchSource, /commitHeatCapacityAutoDemoDefaultReset/, 'auto demo default reset should commit the target logical state once while the scene owns local motion');
assert.doesNotMatch(workbenchSource, /animateHeatCapacityPressureZero|animateHeatCapacityDefaultReset/, 'auto demo should not keep the old Workbench-owned reset or pressure-zero animation functions');
assert.match(workbenchSource, /data-heat-capacity-mode="demo"/, 'preview header should expose heat-capacity demo mode through the unified mode bar');
assert.match(workbenchSource, /stepHeatCapacityWorkbenchFile/, 'workbench should step the heat capacity process model from the shared file state');
assert.match(workbenchSource, /captureHeatCapacityWorkbenchSample/, 'workbench should capture process sample placeholders without formal p0/p1/p2 records');
assert.match(workbenchSource, /heatCapacityPumpAnimationRef/, 'pump bulb animation should be retriggerable instead of locked by old timers');
assert.match(workbenchSource, /clearHeatCapacityPumpAnimationTimers/, 'new pump clicks should clear stale release and idle timers before scheduling fresh feedback');
assert.doesNotMatch(workbenchSource, /pumpBulbState === 'compressing'[\s\S]{0,80}return/, 'rapid pump clicks should not be ignored while the bulb is compressing');
assert.doesNotMatch(workbenchSource, /pumpBulbState === 'releasing'[\s\S]{0,80}return/, 'rapid pump clicks should not be ignored while the bulb is releasing');
assert.match(workbenchSource, /setInterval[\s\S]*refreshHeatCapacityPumpFrequency/, 'pump frequency should refresh on a sliding window even after clicking stops');
assert.match(workbenchSource, /data-heat-capacity-realtime-header="true"/, 'fixed realtime window should have a dedicated monitor header');
assert.match(workbenchSource, /data-heat-capacity-live-readings="true"/, 'fixed realtime window should group live readings');
assert.match(workbenchSource, /data-heat-capacity-operation-status="true"/, 'fixed realtime window should group safety and operation status');
assert.doesNotMatch(workbenchSource, /data-heat-capacity-live-charts="true"/, 'fixed realtime window should not mount Heat Capacity realtime charts');
assert.match(workbenchSource, /data-heat-capacity-current-hint="true"/, 'fixed realtime window should expose a concise current hint');
assert.match(workbenchSource, /getHeatCapacityPhaseLabel/, 'fixed realtime window should map internal heat-capacity phase ids to readable labels');
assert.match(workbenchSource, /getHeatCapacityRealtimeCopy/, 'fixed realtime Heat Capacity copy should be localized outside the render body');
assert.match(workbenchSource, /settingsLanguagePreference/, 'fixed realtime Heat Capacity panel should read the current language preference');
assert.match(workbenchSource, /const heatCapacityHeaderBadges = \[/, 'fixed realtime header should render a compact dynamic badge list');
assert.match(workbenchSource, /label: `\$\{heatCapacityRealtimeCopy\.stagePrefix\}\$\{phaseLabel\}`/, 'fixed realtime header should keep stage as the only always-visible localized badge');
assert.match(workbenchSource, /className="studio-heat-monitor-title"/, 'fixed realtime header title should have its own shrink-safe layout target');
assert.match(styleSource, /\.studio-realtime-panel-heat \{[\s\S]*container-type: inline-size;/, 'heat realtime panel should expose an inline container for narrow header layout rules');
assert.match(styleSource, /\.studio-heat-monitor-header \{[\s\S]*display: grid;[\s\S]*grid-template-columns: minmax\(0, 1fr\) fit-content\(62%\);/, 'heat realtime header should use a two-column grid that prevents badge/title overlap');
assert.match(styleSource, /\.studio-heat-monitor-title \{[\s\S]*min-width: 0;/, 'heat realtime title column should be allowed to shrink without being covered by badges');
assert.match(styleSource, /\.studio-heat-status-badges \{[\s\S]*flex-wrap: wrap;[\s\S]*justify-content: flex-end;[\s\S]*max-width: min\(100%, 62%\);/, 'heat realtime badges should wrap on the right instead of forcing a single overlapping row');
assert.match(styleSource, /\.studio-heat-status-badge \{[\s\S]*overflow: hidden;[\s\S]*text-overflow: ellipsis;[\s\S]*white-space: nowrap;/, 'heat realtime badges should truncate long labels inside their own pills');
assert.match(styleSource, /@container \(max-width: 430px\) \{[\s\S]*\.studio-heat-monitor-header \{[\s\S]*grid-template-columns: minmax\(0, 1fr\);[\s\S]*\.studio-heat-status-badges \{[\s\S]*max-width: 100%;/, 'heat realtime header should place badges below the title in narrow panel widths');
assert.match(workbenchSource, /demoComplete:\s*'演示结束'/, 'fixed realtime copy should label the final auto-demo state as a demo ending in zh-CN');
assert.match(workbenchSource, /demoComplete:\s*'Demo ended'/, 'fixed realtime copy should include an English terminal auto-demo label');
assert.doesNotMatch(workbenchSource, /phase === 'demoComplete'[\s\S]{0,80}return '实验完成'/, 'fixed realtime header should not call the auto-demo terminal phase formal experiment completion');
assert.match(workbenchSource, /demoComplete:\s*'自动演示已结束，可重新开始或查看后续数据处理结果。'/, 'fixed realtime hint should keep the demoComplete copy in the auto-demo context');
assert.match(workbenchSource, /if \(activeFile\.heatCapacityPhase === 'demoComplete'\) return heatCapacityRealtimeCopy\.hints\.demoComplete;[\s\S]*if \(!activeFile\.powerOn/, 'fixed realtime hint should check demoComplete before the powered-off fallback');
assert.match(workbenchSource, /autoDemoPaused\s*\?\s*heatCapacityRealtimeCopy\.demoPaused[\s\S]*autoDemoRunning\s*\?\s*heatCapacityRealtimeCopy\.demoRunning[\s\S]*heatCapacityRealtimeCopy\.demoReady/, 'fixed realtime header should show localized automation badges only for active demo states');
assert.match(workbenchSource, /label: heatCapacityRealtimeCopy\.operationLocked/, 'fixed realtime header should show localized lock status only when interaction is locked');
assert.match(workbenchSource, /heatCapacityHeaderBadges\.map\(\(badge\)/, 'fixed realtime header should render badges from the compact display model');
assert.doesNotMatch(workbenchSource, /const powerLabel = activeFile\.powerOn \? '宸插紑鏈? : '鏈紑鏈?/, 'fixed realtime header should not keep a separate always-visible power badge');
assert.doesNotMatch(workbenchSource, /const modeLabel = [^\n]*'手动'/, 'fixed realtime header should not keep a default manual-mode badge');
assert.doesNotMatch(workbenchSource, /const lockLabel = [^\n]*'鍙搷浣?/, 'fixed realtime header should not keep a default actionable badge');
assert.doesNotMatch(workbenchSource, /\{powerLabel\}|\{modeLabel\}|\{lockLabel\}/, 'fixed realtime header should not render the removed static power/mode/lock labels');
assert.match(workbenchSource, /currentDeltaPKPa[\s\S]*activeFile\.pressureSignalMv[\s\S]*activeFile\.pressureSensitivityMvPerKPa/, 'fixed realtime window should derive current delta pressure from displayed Uₚ and the shared sensitivity');
assert.match(styleSource, /\.studio-heat-operation-status \{[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/, 'operation status should stay as one row of three control states');
assert.match(styleSource, /\.studio-realtime-panel-heat \{[\s\S]*grid-template-rows: auto auto auto auto;/, 'heat realtime panel should only reserve rows for header, readings, operation status, and hint');
assert.doesNotMatch(getCssBlock('.studio-heat-reading-card-primary'), /inset\s+\d+px\s+0\s+0|56,\s*189,\s*248/, 'heat realtime primary reading cards should not use a decorative blue left rail');
assert.match(getCssBlock('.studio-heat-reading-card-primary'), /border-width:\s*0\.5px;/, 'heat realtime primary reading cards should use the thin annotated border width');
assert.match(getRootCssBlock('.studio-heat-current-hint strong'), /font-weight:\s*400;/, 'heat current hint highlight should use regular annotated weight');
assert.match(workbenchSource, /Air Heat Capacity Ratio Experiment|空气比热容比实验|空氣比熱容比實驗/);
assert.match(workbenchSource, /pressureStatus|Pressure status|压力状态|壓力狀態/);
assert.match(workbenchSource, /pumpValve|Pump valve|打气阀门|打氣閥門/);
assert.match(workbenchSource, /glassStopcock|Glass stopcock|玻璃旋塞/);
assert.match(workbenchSource, /zeroStatusLabel|pressureZero|Pressure zero|压强调零|壓強調零/);
assert.match(workbenchSource, /currentHint|Current hint|当前提示|目前提示/);
assert.doesNotMatch(workbenchSource, /<div><span>閲囨牱璁板綍<\/span>/, 'fixed realtime window should not show the full process-sample table entry');
assert.doesNotMatch(workbenchSource, /<div><span>鐩爣 \{renderScientificText\('Uₜ'\)/, 'fixed realtime window should not show target temperature debug fields');
assert.doesNotMatch(workbenchSource, /<div><span>鐩爣 \{renderScientificText\('Uₚ'\)/, 'fixed realtime window should not show target pressure debug fields');
assert.doesNotMatch(workbenchSource, /<div><span>闆剁偣鍋忕Щ<\/span>/, 'fixed realtime window should not show pressure-zero offset as a constant debug field');
assert.doesNotMatch(workbenchSource, /<div><span>压强余量<\/span>/, 'fixed realtime window should not show pressure headroom as a constant debug field');
assert.doesNotMatch(workbenchSource, /<div><span>压力安全<\/span>/, 'operation status should not repeat pressure safety under the safety card');
assert.match(workbenchSource, /Uₜ \/ mV/);
assert.match(workbenchSource, /Uₚ \/ mV/);
assert.match(workbenchSource, /ΔP \/ kPa/, 'fixed realtime window should use the delta symbol for pressure difference');
assert.doesNotMatch(workbenchSource, /heatCapacityTrace/, 'Heat Capacity should not keep realtime chart trace in the workbench component');
assert.doesNotMatch(workbenchSource, /<polyline points=\{points\} \/>/, 'Heat Capacity realtime polyline renderer should be removed');
assert.doesNotMatch(styleSource, /studio-heat-trace|studio-heat-live-chart/, 'Heat Capacity realtime chart CSS should be removed');
assert.doesNotMatch(workbenchSource, /bezierCurveTo|quadraticCurveTo|studio-heat-trace-glow|heatCapacityRuntimeStore/, 'heat-capacity realtime chart should not reintroduce the later complex chart/runtime implementation');
assert.equal(existsSync(join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityTraceChart.tsx')), false, 'this stable-version optimization should not add the later standalone trace chart component');
assert.match(workbenchSource, /renderHeatCapacityMaterialsWindow/, 'Heat Capacity should have a browser-style materials/results window');
assert.match(workbenchSource, /openAllHeatCapacityMaterialsTabs/, 'double-clicking the Heat Capacity materials group should open all child tabs');
assert.match(workbenchSource, /recordHeatCapacityU1/, 'Heat Capacity should support U1 / UT1 trial recording');
assert.match(workbenchSource, /recordHeatCapacityU2/, 'Heat Capacity should support U2 / UT2 trial recording');
assert.match(workbenchSource, /calculateHeatCapacityMeanResult/, 'Heat Capacity data processing should calculate trial gamma and mean gamma');
assert.match(workbenchSource, /createHeatCapacityTrialFromAutoDemoSamples/, 'auto demo completion should import one complete trial from process samples');
assert.match(workbenchSource, /heatCapacityExpectedTrialCount:\s*1[\s\S]*heatCapacityExpectedTrialCountMode:\s*'custom'/, 'auto demo completion should force a single imported trial table');
assert.match(workbenchSource, /activeHeatCapacityTabId:\s*'processing'[\s\S]*heatCapacityProcessingCalculated:\s*processingResult\.calculated/, 'auto demo completion should open data processing and show calculated results');
assert.match(workbenchSource, /startManualExperiment:\s*'引导模式'/, 'auto-demo completion should expose a Simplified Chinese guide-mode action');
assert.match(workbenchSource, /startManualExperiment:\s*'引導模式'/, 'auto-demo completion should expose a Traditional Chinese guide-mode action');
assert.match(workbenchSource, /startManualExperiment:\s*'Guide mode'/, 'auto-demo completion should expose an English guide-mode action');
assert.match(workbenchSource, /data-heat-capacity-mode="guide"/, 'preview header should render guide mode in the unified mode bar');
assert.doesNotMatch(workbenchSource, /data-heat-capacity-manual-reset="true"/, 'preview should not keep the old manual-experiment reset button');
assert.match(workbenchSource, /resetHeatCapacityForManualExperiment/, 'Workbench should use the dedicated Heat Capacity manual reset helper');
assert.match(workbenchSource, /const isHeatCapacityManualRecordStep = \(step: ManualHeatCapacityStep\) => \([\s\S]*recordU0Required[\s\S]*recordU1Required[\s\S]*recordU2Required/, 'record-ready guide steps should be classified separately from waiting-for-good-data steps');
assert.match(workbenchSource, /recordU0SuccessToast:\s*'U₀ 记录成功。'/, 'U0 record success should have the confirmed Simplified Chinese success toast copy');
assert.match(workbenchSource, /recordU1SuccessToast:\s*'U₁ 和 Uₜ 记录成功。'/, 'U1 record success should have the confirmed Simplified Chinese success toast copy');
assert.match(workbenchSource, /recordU2SuccessToast:\s*'U₂ 和 Uₜ 记录成功。'/, 'U2 record success should have the confirmed Simplified Chinese success toast copy');
assert.match(workbenchSource, /trialCompleteToast:\s*'本组实验已完成。'/, 'U2 success should have a separate completed-trial toast copy');
assert.match(workbenchSource, /finalTrialCompleteToast:\s*'本次实验已完成。'/, 'the final heat-capacity trial should use the confirmed final-completion copy');
assert.match(workbenchSource, /showHeatCapacityRecordSuccessSequence\(\{[\s\S]*recordMessage:\s*getHeatCapacityRecordSuccessToast\(kind\)[\s\S]*trialCompleteMessage:\s*kind === 'u2'/, 'successful records should display a bottom-center success toast, with a separate trial-complete toast after U2');
assert.match(workbenchSource, /key=\{heatCapacityToastCurrent\.id\}[\s\S]*data-heat-capacity-toast="true"/, 'bottom-center heat-capacity toasts should remount by id so sequential success, completion, and wait notices restart their CSS animation');
assert.doesNotMatch(workbenchSource, /finalWaitMessage/, 'the final completed trial must not show the real-experiment stability-wait notice');
assert.match(workbenchSource, /trialCompleteMessage:\s*kind === 'u2'[\s\S]*shouldShowSkippedRecoveryWait[\s\S]*heatCapacityRealtimeCopy\.trialCompleteToast[\s\S]*heatCapacityRealtimeCopy\.finalTrialCompleteToast/, 'U2 completion should choose group-complete copy before another trial and final-complete copy for the last trial');
assert.match(workbenchSource, /pushLog\(recordSuccessMessage,\s*'success'\)[\s\S]*pushLog\(trialCompleteLogMessage,\s*'success'\)/, 'record success and selected completed-trial messages should both write success console entries');
assert.doesNotMatch(workbenchSource, /const recordHeatCapacityManualSample = \(kind: HeatCapacityManualRecordKind\) => \{[\s\S]*let ok = false;[\s\S]*updateActiveFile\(\(file\) => \{[\s\S]*ok = (?:true|result\.ok)[\s\S]*\}\);[\s\S]*if \(ok\)/, 'manual U1/U2 success feedback must not depend on values assigned inside a React state updater');
assert.match(workbenchSource, /const currentFile = filesRef\.current\.find\(\(file\) => file\.id === activeFile\.id\);[\s\S]*let nextManualRecordFile:[\s\S]*updateFileById\(currentFile\.id/, 'manual U1/U2 success feedback should be driven by a synchronously calculated record result before updating React state');
assert.match(workbenchSource, /heatCapacityGuideNextTrialNoticeHoldKey === nextTrialKey[\s\S]*return undefined;/, 'next-trial wait-skip guidance should be held until record-success and trial-complete toasts finish');
assert.match(workbenchSource, /heatCapacityRecordToastSequenceActive[\s\S]*return undefined;/, 'ordinary guide hints should not interrupt the record-success toast sequence');
assert.doesNotMatch(workbenchSource, /if \(action === 'turnPowerOff'\) return \{ allowed: true \}/, 'guide mode should not allow power-off clicks to bypass the current-step guard');
assert.match(workbenchSource, /type ManualHeatCapacityRollbackAnimation =[\s\S]*'powerBounce'/, 'invalid guide-mode power switch clicks should have a dedicated visual rollback animation');
assert.match(workbenchSource, /turnPowerOff:\s*'powerBounce'[\s\S]*turnPowerOn:\s*'powerBounce'|turnPowerOn:\s*'powerBounce'[\s\S]*turnPowerOff:\s*'powerBounce'/, 'invalid power switch actions should route to the power-switch rollback animation');
assert.match(sceneSource, /manualRollbackAnimation !== 'powerBounce'/, 'instrument scene should animate invalid power-switch clicks without changing the real power state');
assert.match(workbenchSource, /isHeatCapacityManualRecordStep\(step\)[\s\S]*suppressGuidance:\s*true/, 'clicks outside a visible U0/U1/U2 record button should be blocked without showing stale bad-data guidance');
assert.match(workbenchSource, /if \(guard\.suppressGuidance\) return;/, 'suppressed record-ready guard failures should keep rollback feedback but skip bottom guidance');
assert.match(workbenchSource, /isHeatCapacityManualRecordStep\(activeHeatCapacityManualStep\)[\s\S]*clearManualHeatCapacityGuidance\(\)/, 'record-ready transitions should clear stale manual waiting guidance');
assert.match(workbenchSource, /isHeatCapacityManualRecordStep\(latestStep\)[\s\S]*return;/, 'idle guide hints should not replace a visible record button with extra bottom guidance');
assert.match(workbenchSource, /HEAT_CAPACITY_GUIDE_START_NOTICE_MS = 1000/, 'guide mode should reserve a short centered start notice before process guidance begins');
assert.match(workbenchSource, /showHeatCapacityAutoDemoCompletionToast\(heatCapacityRealtimeCopy\.guideModeStartingToast,\s*HEAT_CAPACITY_GUIDE_START_NOTICE_MS\)/, 'guide mode should show a centered localized start notice before activating the process');
assert.match(workbenchSource, /showHeatCapacityAutoDemoCompletionToast\(heatCapacityRealtimeCopy\.guideModeExitedToast\)/, 'exiting guide mode should use the same localized centered status toast as demo termination');
assert.doesNotMatch(stateSource, /WorkbenchHeatCapacityPausedTeachingSnapshot|heatCapacityPausedTeachingSnapshot|exitHeatCapacityFreeModeWorkbenchState/, 'Free mode should be the base state instead of storing resumable Demo/Guide snapshots in workbench state');
assert.doesNotMatch(sessionSource, /heatCapacityPausedTeachingSnapshot/, 'session migration should discard legacy paused teaching snapshots instead of reviving old mode semantics');
assert.doesNotMatch(heatCapacityPersistenceSource, /pausedTeachingSnapshot|heatCapacityPausedTeachingSnapshot/, 'Heat Capacity persistence should stop writing the obsolete paused teaching snapshot field');
assert.match(workbenchSource, /resolvedPowerOn && source === 'user'[\s\S]*heatCapacityPhase === 'demoComplete'[\s\S]*runState === 'finished'[\s\S]*resetHeatCapacityForManualExperiment/, 'direct power-on after auto demo should defensively reset stale demo pressure state');
assert.match(workbenchSource, /pressureSignalTargetMv/, 'right realtime panel should retain target pressure signal separately from displayed pressure');
assert.match(workbenchSource, /temperatureSignalTargetMv/, 'right realtime panel should retain target temperature signal separately from displayed temperature');
assert.doesNotMatch(workbenchSource, /打气过快|tooFast|频率偏高/, 'workbench should not show or calculate a too-fast pump state');
assert.doesNotMatch(sceneSource, /pressureOverLimit\s*\?\s*12\s*:\s*9/, 'pressure gauge needle movement should not branch on alarm state');
assert.match(workbenchSource, /zeroStatusLabel/, 'fixed realtime window should still expose pressure-zero status in the operation group');
assert.doesNotMatch(styleSource, /\.studio-heat-interaction-hints \{[^}]*min-height:/, 'interaction hints should not reserve language-driven outer height');
assert.doesNotMatch(styleSource, /\.studio-heat-hover-tooltip \{[^}]*min-height:/, 'hover tooltips should size to their current-language copy');
assert.doesNotMatch(styleSource, /\.studio-heat-valve-focus-bubble \{[^}]*min-height:/, 'valve focus bubbles should not create blank space for other languages');
assert.doesNotMatch(styleSource, /\.studio-heat-hard-sphere-tooltip \{[^}]*min-height:/, 'hard-sphere tooltips should size to current-language content');
assert.doesNotMatch(styleSource, /\.studio-heat-demo-step-panel \{[^}]*min-height:/, 'auto-demo step cards should not reserve language-switch height');
assert.doesNotMatch(styleSource, /\.studio-heat-free-speed-notice \{[^}]*min-height:/, 'free-speed notices should avoid oversized fixed shells');
assert.doesNotMatch(styleSource, /\.studio-heat-demo-complete-toast \{[^}]*min-height:/, 'demo-complete toasts should avoid blank reserved height');
assert.doesNotMatch(styleSource, /\.studio-heat-manual-step-hint \{[^}]*min-height:/, 'manual-step hints should not use outer height to solve language switching');
assert.match(styleSource, /\.studio-heat-valve-focus-button \{[^}]*min-height:\s*28px;/, 'stateful valve focus buttons should keep a stable control height');
assert.match(workbenchSource, /temperatureSignalValue/, 'fixed realtime window should still expose the live temperature signal');
assert.match(workbenchSource, /pressureSignalValue/, 'fixed realtime window should still expose the live pressure signal');
assert.match(workbenchSource, /realtimePanelTitle: '实时数据'/, 'Heat Capacity fixed panel title should not mention charts in Simplified Chinese');
assert.match(workbenchSource, /realtimePanelTitle: '即時資料'/, 'Heat Capacity fixed panel title should not mention charts in Traditional Chinese');
assert.match(workbenchSource, /realtimePanelTitle: 'Realtime Data'/, 'Heat Capacity fixed panel title should not mention charts in English');
assert.match(workbenchSource, /heatRealtimeTitle/, 'Heat Capacity left panel should have a dedicated realtime title without chart wording');
assert.match(workbenchSource, /renderScientificText\(panel\.hint\)/, 'dock headers should render Uₜ and Uₚ with real subscripts');
assert.match(workbenchSource, /renderScientificText\(heatCapacityRealtimeCopy\.realtimeSubtitle\)/, 'right Heat Capacity panel subtitle should render Uₜ and Uₚ with real subscripts');
assert.doesNotMatch(workbenchSource, /<div><span>鐞嗚 gamma<\/span>/, 'this batch must not render a gamma result field');
assert.doesNotMatch(workbenchSource, /鏃嬪瑙掑害/, 'realtime panel should not expose stopcock angle to users');
assert.doesNotMatch(workbenchSource, /stopcockAngleDeg, 1\)} deg/, 'realtime panel should not render internal stopcock degrees');
assert.match(workbenchSource, /performanceMode:\s*'standard'/, 'general settings should default performance mode to standard');
assert.match(workbenchSource, /type WorkbenchPerformanceMode = 'standard' \| 'balanced' \| 'performance' \| 'ultra'/, 'performance mode should support standard, balanced, performance, and ultra tiers');
assert.match(workbenchSource, /isWorkbenchPerformanceMode/, 'general settings should migrate legacy settings without a performance field');
assert.match(workbenchSource, /updateSettingsPerformanceMode/, 'general settings should expose a persistent performance mode updater');
assert.match(workbenchSource, /performanceModeBalanced/, 'general settings copy should include a balanced performance tier');
assert.match(workbenchSource, /performanceMode:\s*'3D 性能模式'/, 'performance setting should use performance-mode wording in Simplified Chinese');
assert.match(workbenchSource, /performanceModeOff:\s*'高性能'/, 'standard tier should be labeled as high performance');
assert.match(workbenchSource, /performanceModeBalanced:\s*'均衡'/, 'balanced tier should keep the required Chinese label');
assert.match(workbenchSource, /performanceModeOn:\s*'低负载'/, 'lowest-load tier should keep the required Chinese label');
assert.match(workbenchSource, /performanceModeSummary:\s*\{\s*standard:\s*'高性能',\s*balanced:\s*'均衡',\s*performance:\s*'低负载',\s*ultra:\s*'极致画质'\s*\}/, 'Simplified Chinese performance summaries should match the four mode names');
assert.match(workbenchSource, /performanceMode:\s*'3D 效能模式'/, 'performance setting should use performance-mode wording in Traditional Chinese');
assert.match(workbenchSource, /performanceModeOff:\s*'高效能'/, 'standard tier should be localized in Traditional Chinese');
assert.match(workbenchSource, /performanceModeOn:\s*'低負載'/, 'lowest-load tier should be localized in Traditional Chinese');
assert.match(workbenchSource, /performanceMode:\s*'3D performance mode'/, 'performance setting should use performance-mode wording in English settings');
assert.match(workbenchSource, /performanceModeOff:\s*'High performance'/, 'standard tier should be localized in English settings');
assert.match(workbenchSource, /performanceModeOn:\s*'Low load'/, 'lowest-load tier should be localized in English settings');
assert.doesNotMatch(workbenchSource, /高清模式|低负载模式|高清|高畫質|Sharp mode|Low-load mode|性能优先|效能優先|Performance first/, 'settings copy should not keep old clarity or performance-first wording');
assert.match(workbenchSource, /performanceModeOptions\.map/, 'general settings should render performance mode as a segmented control');
assert.match(workbenchSource, /studio-settings-performance-segmented/, 'general settings should include segmented performance mode markup');
assert.doesNotMatch(workbenchSource, /role="switch"[\s\S]*aria-checked=\{settingsPerformanceMode === 'performance'\}/, 'general settings should not keep the old binary performance switch');
assert.doesNotMatch(workbenchSource, /handleAction\('Performance mode'\)/, 'top settings menu should not keep the old standalone performance action');
assert.match(workbenchSource, /performanceMode=\{settingsPerformanceMode\}/, 'Workbench should pass the selected performance mode into Heat Capacity 3D');
assert.match(workbenchSource, /const HEAT_CAPACITY_HARD_SPHERE_PERFORMANCE_PRESETS = \{[\s\S]*standard:\s*\{\s*particleMultiplier:\s*1,\s*speedMultiplier:\s*1\.1875\s*\}[\s\S]*balanced:\s*\{\s*particleMultiplier:\s*0\.75,\s*speedMultiplier:\s*1\s*\}[\s\S]*performance:\s*\{\s*particleMultiplier:\s*0\.5,\s*speedMultiplier:\s*0\.8125\s*\}[\s\S]*ultra:\s*\{\s*particleMultiplier:\s*1\.25,\s*speedMultiplier:\s*1\.25\s*\}[\s\S]*\} as const;/, 'skeleton hard-sphere speeds should keep balanced at 1, halve the previous speed range, speed up low load, and slow high performance');
assert.match(workbenchSource, /const heatCapacityHardSpherePerformancePreset = HEAT_CAPACITY_HARD_SPHERE_PERFORMANCE_PRESETS\[settingsPerformanceMode\]/, 'Workbench should derive the active hard-sphere visual preset from the selected performance mode');
assert.match(workbenchSource, /hardSphereParticleMultiplier=\{heatCapacityHardSpherePerformancePreset\.particleMultiplier\}/, 'Heat Capacity scene should receive particle multiplier from the performance preset');
assert.match(workbenchSource, /hardSphereSpeedMultiplier=\{heatCapacityHardSpherePerformancePreset\.speedMultiplier\}/, 'Heat Capacity scene should receive speed multiplier from the performance preset');
assert.doesNotMatch(workbenchSource, /hardSphereParticleMultiplier=\{activeFile\.hardSphereParticleMultiplier\}/, 'Heat Capacity scene should no longer read particle multiplier from the saved file slider field');
assert.doesNotMatch(workbenchSource, /hardSphereSpeedMultiplier=\{activeFile\.hardSphereSpeedMultiplier\}/, 'Heat Capacity scene should no longer read speed multiplier from the saved file slider field');
assert.match(hardSphereLayerSource, /thermalSpeedMultiplier:\s*kineticSpeedState\.speed,/, 'hard-sphere layer should drive random molecular motion through the kinetic speed buffer');
assert.doesNotMatch(hardSphereLayerSource, /thermalSpeedMultiplier:\s*currentVisual\.thermalSpeedMultiplier,/, 'hard-sphere layer should not hard-cut random molecular motion directly from thermal speed');
assert.match(hardSphereLayerSource, /outflowDriftSpeed:\s*effectiveOutflowDriftSpeed,/, 'hard-sphere layer should pass the pressure-driven outflow drift through the current release path');
assert.doesNotMatch(hardSphereLayerSource, /exitSelectionRate|effectiveExitSelectionRate/, 'hard-sphere layer should not keep legacy pressure-driven exit selection after adopting release budgets');
assert.doesNotMatch(hardSphereLayerSource, /currentVisual\.outflowIntensity/, 'hard-sphere layer should stop consuming the legacy combined outflow intensity');
assert.doesNotMatch(hardSphereModelSource, /outflowIntensity|exitSelectionRate|releaseProgress\?:/, 'hard-sphere visual model should expose only the current drift and timeline inputs');
assert.doesNotMatch(hardSphereSimulationSource, /EXIT_SELECTION|exitSelectionRate/, 'hard-sphere simulation should not select release particles from the old pressure-rate path');
assert.doesNotMatch(hardSphereLayerSource, /currentVisual\.speedMultiplier\s*\*\s*\(0\.82\s*\+\s*\(1\s*-\s*currentVisual\.stability\)\s*\*\s*0\.42\)/, 'hard-sphere layer should not re-mix stability into random thermal speed');
assert.doesNotMatch(workbenchSource, /setHeatCapacityHardSphereMultiplier/, 'Workbench should not keep a direct small-ball multiplier updater after the right sidebar sliders are removed');
assert.doesNotMatch(styleSource, /studio-heat-visual-slider/, 'right Current Parameters sidebar should no longer expose hard-sphere particle or speed range sliders');
assert.doesNotMatch(workbenchSource, /hardSphereParticleMultiplier:\s*'粒子数量倍率'|hardSphereSpeedMultiplier:\s*'粒子速度倍率'|Particle multiplier|Speed multiplier/, 'right sidebar copy should not keep direct particle-count or speed multiplier labels');
assert.doesNotMatch(parameterConfigSource, /performanceMode|hardSphereParticleMultiplier|hardSphereSpeedMultiplier/, 'performance presets must stay out of heatCapacityFreeParameterDraft and config snapshots');
assert.doesNotMatch(trialModelSource, /performanceMode|hardSphereParticleMultiplier|hardSphereSpeedMultiplier/, 'performance presets must stay out of Heat Capacity trial result calculation');
assert.match(workbenchSource, /settingsPerformanceMode === 'performance'\s*\?\s*240\s*:\s*settingsPerformanceMode === 'balanced'\s*\?\s*150\s*:\s*100/, 'Heat Capacity file tick should keep ultra responsive after GLB integration and reserve the slow tick for low-load mode only');
assert.doesNotMatch(workbenchSource, /studio-settings-performance-switch/, 'general settings should remove the old performance switch markup');
assert.match(leftPanelSource, /studio-heat-processing-summary/, 'Heat Capacity data processing should use a dedicated engineering summary strip');
assert.match(leftPanelSource, /validResults\.length < 2/, 'single-trial processing should hide the gamma chart');
assert.match(leftPanelSource, /onRemoveTrialRecord/, 'Heat Capacity recording UI should expose a callback for removing recorded U1, U2, and whole-trial values');
assert.match(leftPanelSource, /pendingRemoveTrialRecord/, 'Heat Capacity recording table should receive the pending removal confirmation state');
assert.match(leftPanelSource, /studio-table-action-row[\s\S]*studio-table-action-confirm[\s\S]*studio-table-action-cancel/, 'Heat Capacity recording table should reuse the existing two-step table deletion styles');
assert.match(trialModelSource, /export type HeatCapacityTrialRecordRemovalKind = 'u0' \| 'u1' \| 'u2' \| 'trial'/, 'Heat Capacity record removal should support U0, U1, U2, and whole-trial deletion');
assert.match(leftPanelSource, /deleteTrial:\s*'删除本组'/, 'whole-group deletion should use the confirmed Simplified Chinese copy');
assert.match(leftPanelSource, /renderProcessSampleStatus = \([\s\S]*renderRemoveRecordButton[\s\S]*kind:\s*'u1'[\s\S]*kind:\s*'u2'/, 'U1 and U2 delete controls should move to the upper process-sample table');
assert.match(leftPanelSource, /const sampleTrial = file\.heatCapacityTrials\[sampleTrialIndex\] \?\? null/, 'upper U1/U2 delete controls should be tied to the current trial record');
assert.match(leftPanelSource, /const hasSampleTrialU1Record = sampleTrial !== null[\s\S]*sampleTrial\.U1Mv !== null \|\| sampleTrial\.UT1Mv !== null/, 'U1 delete should appear only after actual U1/UT1 data exists');
assert.match(leftPanelSource, /const hasSampleTrialU2Record = sampleTrial !== null[\s\S]*sampleTrial\.U2Mv !== null \|\| sampleTrial\.UT2Mv !== null/, 'U2 delete should appear only after actual U2/UT2 data exists');
assert.match(leftPanelSource, /calculateHeatCapacityTrialResult\(trial,\s*\{[\s\S]*atmosphericPressureKPa:\s*file\.ambientPressureKPa[\s\S]*pressureSensitivityMvPerKPa:\s*file\.pressureSensitivityMvPerKPa[\s\S]*theoreticalGamma:\s*file\.theoreticalGamma/, 'recording table should calculate per-trial gamma before all expected groups are complete');
assert.match(leftPanelSource, /<th><VarGamma index="i" \/><\/th>/, 'recording table should include a per-trial gamma column');
assert.match(leftPanelSource, /<td>\{formatGamma\(trialResult\.gamma\)\}<\/td>/, 'recording rows should display each completed group gamma');
assert.match(workbenchSource, /if \(manualHeatCapacityActiveFileId === currentFile\.id && latestStep !== requiredStep\) \{[\s\S]*message = getManualStepGuidance\(latestStep, currentFile\)\.message/, 'record U0/U1/U2 actions should obey the latest guide-step validation and block stale visible buttons');
assert.doesNotMatch(workbenchSource, /latestStep !== requiredStep && stepAtClick !== requiredStep/, 'stale record-ready state must not allow recording after the ideal-range guard has moved back to a waiting step');
assert.doesNotMatch(leftPanelSource, /actionVisible:\s*file\.heatCapacityProcessSamples\.recoverySample !== null/, 'U2 delete should not be controlled by a stale or placeholder recovery sample');
assert.match(leftPanelSource, /renderRemoveRecordButton\([\s\S]{0,120}trialIndex,[\s\S]{0,120}'trial'/, 'the lower trial table should delete only the whole group');
assert.doesNotMatch(leftPanelSource, /renderRemoveRecordButton\(trialIndex,\s*'u1'[\s\S]*renderRemoveRecordButton\(trialIndex,\s*'u2'/, 'the lower trial table should no longer concentrate U1 and U2 delete controls inside the data group row');
assert.match(workbenchSource, /removeHeatCapacityTrialRecord/, 'Workbench should remove Heat Capacity U1 and U2 records through a shared trial rollback helper');
assert.match(trialModelSource, /kind === 'trial'[\s\S]*createHeatCapacityTrial/, 'whole-trial deletion should shift later trials up and append a fresh empty trial opportunity');
assert.match(workbenchSource, /heatCapacityProcessingCalculated:\s*false[\s\S]*createDefaultHeatCapacityProcessingResult/, 'removing a Heat Capacity record should invalidate previous processing results');
assert.match(styleSource, /\.studio-theme-light \.studio-table-action\.studio-table-action-confirm \{[\s\S]*background: #b42318;[\s\S]*color: #ffffff;/, 'light theme two-step delete confirmation should keep readable white text on the red button');
assert.match(leftPanelSource, /<GammaAir \/> = \{file\.theoreticalGamma\.toFixed\(2\)\}/, 'processing summary should display air theoretical gamma from the Heat Capacity file');
assert.doesNotMatch(leftPanelSource, /5\s*\/\s*3|1\.667/, 'Heat Capacity processing UI should not show hard-sphere theoretical gamma');
assert.match(leftPanelSource, /zh-CN[\s\S]*实验指引[\s\S]*数据记录[\s\S]*数据处理/, 'Heat Capacity left panel should include Simplified Chinese copy');
assert.match(leftPanelSource, /zh-TW[\s\S]*實驗指引[\s\S]*資料記錄[\s\S]*資料處理/, 'Heat Capacity left panel should include Traditional Chinese copy');
assert.match(leftPanelSource, /en[\s\S]*Experiment Guide[\s\S]*Data Recording[\s\S]*Data Processing/, 'Heat Capacity left panel should include English copy');
assert.match(leftPanelSource, /<>ΔP<sub>\{index\}<\/sub><\/>/, 'Heat Capacity formulas should render Delta P with the real delta symbol');
assert.match(leftPanelSource, /<>γ\{index !== undefined/, 'Heat Capacity formulas should render gamma with the real Greek symbol');
assert.match(leftPanelSource, /HEAT_CAPACITY_FORMULA_RESULT_PREVIEW_LIMIT\s*=\s*3/, 'formula result cards should default to showing at most three trial groups');
assert.match(leftPanelSource, /formulaResultsExpanded/, 'formula result cards should expose a local expand-collapse state');
assert.match(leftPanelSource, /slice\(0,\s*HEAT_CAPACITY_FORMULA_RESULT_PREVIEW_LIMIT\)/, 'formula result cards should collapse to the first three trial groups by default');
assert.match(leftPanelSource, /展开全部/, 'formula result cards should include Simplified Chinese show-all copy');
assert.match(leftPanelSource, /收起/, 'formula result cards should include collapse copy');
assert.match(leftPanelSource, /已显示前 \${visible} 组，共 \${total} 组/, 'formula result cards should explain the three-group preview limit');
assert.doesNotMatch(leftPanelSource, /getFormulaExample/, 'formula result cards should not rely on a single example trial');
assert.match(leftPanelSource, /引导模式需在正确阶段使用 3D 预览中的记录按钮/, 'recording page should rename manual mode to guide mode');
assert.doesNotMatch(leftPanelSource, /手动模式需在正确阶段使用 3D 预览中的记录按钮/, 'recording page should not keep the old manual-mode label');
assert.match(leftPanelSource, /本组已完成；提示结束后可在上方模式栏点击“下一组实验”。/, 'recording page should point next-trial continuation to the top mode bar');
assert.match(workbenchSource, /真实实验中需要等待系统稳定；程序已省略该等待过程。/, 'U2 success guidance should use the confirmed two-second stability-wait notice');
assert.doesNotMatch(workbenchSource, /已省略真实实验中约 5 分钟的恢复室温等待过程，可立即进入下一组实验。/, 'old immediate next-trial wait-skip copy should be removed');
assert.doesNotMatch(workbenchSource, /showManualHeatCapacityGuidance\(heatCapacityRealtimeCopy\.skipRecoveryWait,\s*'startNextTrial'/, 'U2 success should no longer reveal the next-trial control immediately');
assert.doesNotMatch(leftPanelSource, /铻東绾瑋钄殀鑴硘鐎箌鐠亅缁寍閻榺鈧琝?/, 'Heat Capacity left panel source should not contain mojibake or corrupted scientific symbols');
assert.doesNotMatch(leftPanelSource, /studio-heat-processing-intro[\s\S]{0,260}studio-analysis-cell/, 'Heat Capacity processing intro should not reuse the generic analysis cell layout');
assert.match(styleSource, /\.studio-heat-processing-summary/, 'Heat Capacity processing summary should have dedicated CSS');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-panel-content/, 'light theme should cover Heat Capacity materials panel content');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-thinking-trigger:hover/, 'light theme should keep Heat Capacity thinking hover states light');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-trial-count button:hover/, 'light theme should cover Heat Capacity trial count button hover states');
assert.match(styleSource, /\.studio-settings-performance-segmented/, 'performance mode segmented control should have dedicated CSS');
assert.match(styleSource, /\.studio-settings-performance-thumb/, 'performance mode segmented control should have a sliding thumb');
assert.match(styleSource, /\.studio-settings-performance-option/, 'performance mode segmented control should style each tier option');
assert.doesNotMatch(getRootCssBlock('.studio-settings-section'), /inset\s+3px\s+0\s+0/, 'settings sections should not keep a left accent stripe');
assert.doesNotMatch(getCssBlock('.studio-theme-light .studio-settings-section'), /inset\s+3px\s+0\s+0/, 'light settings sections should not keep a left accent stripe');
assert.match(sceneSource, /const INSTRUMENT_DIGITAL_DISPLAY_TEXT_SIZE = 0\.054;/, 'instrument digital display values should be enlarged while staying inside the model screen plane');
assert.match(sceneSource, /name="TemperatureDisplayText"[\s\S]*size=\{INSTRUMENT_DIGITAL_DISPLAY_TEXT_SIZE\}/, 'temperature digital screen should use the enlarged shared display value size');
assert.match(sceneSource, /name="PressureDisplayText"[\s\S]*size=\{INSTRUMENT_DIGITAL_DISPLAY_TEXT_SIZE\}/, 'pressure digital screen should use the enlarged shared display value size');
assert.match(sceneSource, /studio-preview-overlay-slot-bottom-right[\s\S]*data-heat-capacity-hover-tooltip="true"/, 'Heat Capacity hover tooltip should avoid the lower-left operation hints by using the lower-right slot');
assert.doesNotMatch(getCssBlock('.studio-heat-hover-tooltip'), /z-index:/, 'Heat Capacity hover tooltip should rely on overlay slot ordering rather than a standalone z-index');
assert.match(styleSource, /\.studio-theme-light \.studio-settings-performance-segmented/, 'light theme should style the performance segmented control');
assert.match(styleSource, /\.studio-theme-light \.studio-settings-performance-option:hover/, 'light theme performance option hover should stay light');
assert.doesNotMatch(styleSource, /\.studio-settings-performance-toggle i/, 'settings performance switch should not keep a separate thumb implementation');

assert.match(workbenchSource, /canOpenHeatCapacityParameterSidebar/, 'Heat Capacity parameter rail should use the free-mode sidebar admission helper');
assert.match(workbenchSource, /getHeatCapacityParameterSidebarBlockReason/, 'blocked Heat Capacity parameter rail clicks should show the configured free-mode-only reason');
assert.match(workbenchSource, /只有自由实验模式可以调整参数。/, 'demo and guide Heat Capacity modes should explain why the parameter rail cannot expand');
assert.match(styleSource, /\.studio-workspace-shell\.studio-params-collapsed\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*0;/, 'collapsed parameter sidebars should keep winning over responsive workspace grid rules');
assert.match(styleSource, /\.studio-params-collapsed \.studio-current-params\s*\{[\s\S]*visibility:\s*hidden;/, 'collapsed parameter sidebars should hide the right panel content instead of leaving it visible in demo and guide modes');
assert.match(workbenchSource, /renderHeatCapacityFreeParameterPanel/, 'Free Mode should render a dedicated parameter panel instead of generic parameter rows');
assert.match(workbenchSource, /data-heat-capacity-free-parameter-panel="true"/, 'Free Mode parameter panel should expose stable markup');
assert.match(workbenchSource, /id:\s*'leakageEnabled'[\s\S]*data-heat-capacity-basic-checkbox=\{definition\.id\}/, 'Free Mode parameter panel should expose leakage checkbox');
assert.match(workbenchSource, /id:\s*'instrumentNoiseEnabled'[\s\S]*data-heat-capacity-basic-checkbox=\{definition\.id\}/, 'Free Mode parameter panel should expose instrument-noise checkbox');
assert.match(workbenchSource, /id:\s*'hardSphereViewEnabled'[\s\S]*data-heat-capacity-basic-checkbox=\{definition\.id\}/, 'Free Mode parameter panel should expose hard-sphere visualization checkbox');
assert.match(workbenchSource, /definition\.id === 'hardSphereViewEnabled'[\s\S]*\? false[\s\S]*: activeHeatCapacityFreeParameterLocked/, 'Free Mode molecule visualization checkbox should remain available after Ultra cylinder visualization is connected');
assert.doesNotMatch(workbenchSource, /definition\.id === 'hardSphereViewEnabled'[\s\S]*settingsPerformanceMode === 'ultra'/, 'Ultra GLB mode should no longer disable the Free Mode molecule visualization checkbox');
assert.match(workbenchSource, /renderHeatCapacityParameterSymbol[\s\S]*<sub key=\{index\}>\{part\.sub\}<\/sub>/, 'Free Mode parameter symbols should render true subscript nodes');
assert.match(workbenchSource, /parts:\s*\['P',\s*\{\s*sub:\s*'0'\s*\}\]/, 'Free Mode basic parameter list should include P subscript 0');
assert.match(workbenchSource, /parts:\s*\['G',\s*\{\s*sub:\s*'gw'\s*\}\]/, 'Free Mode basic parameter list should include G subscript gw');
assert.match(workbenchSource, /parts:\s*\['U',\s*\{\s*sub:\s*'1,min'\s*\}\]/, 'Free Mode advanced parameter list should include U subscript 1,min without underscores');
assert.doesNotMatch(workbenchSource, /P_0|G_gw|lambda_leak|U_1,min/, 'Free Mode parameter UI should not render underscore-style scientific codes');
assert.match(workbenchSource, /hoveredHeatCapacityParamHelpId/, 'Free Mode parameter help should track hover state');
assert.match(workbenchSource, /pinnedHeatCapacityParamHelpId/, 'Free Mode parameter help should track pinned state');
assert.match(workbenchSource, /studio-param-help-button/, 'Free Mode parameter rows should include circular help buttons');
assert.match(workbenchSource, /studio-param-help-popover/, 'Free Mode parameter help should render a popover');
assert.match(workbenchSource, /heatCapacityParamHelpPopoverStyle[\s\S]*getBoundingClientRect\(\)[\s\S]*setHeatCapacityParamHelpPopoverStyle/, 'Free Mode parameter help popovers should compute a viewport position instead of staying inside the clipped right sidebar');
assert.match(workbenchSource, /createPortal\([\s\S]*studio-param-help-popover[\s\S]*document\.body/, 'Free Mode parameter help popovers should portal to document.body to escape transformed and overflow-hidden workbench containers');
assert.match(workbenchSource, /studio-param-help-popover-\$\{resolvedWorkbenchTheme\}/, 'ported Free Mode parameter help popovers should carry an explicit theme class after leaving the workbench theme scope');
assert.match(styleSource, /\.studio-param-help-popover\s*\{[\s\S]*position:\s*fixed;[\s\S]*width:\s*min\(260px,\s*calc\(100vw - 48px\)\);[\s\S]*max-height:\s*min\(220px,\s*calc\(100vh - 48px\)\);[\s\S]*overflow-y:\s*auto;/, 'Free Mode parameter help popovers should be fixed to the viewport so the right sidebar does not clip them');
assert.match(styleSource, /\.studio-param-help-popover-dark\s*\{[\s\S]*background:\s*#[0-9a-fA-F]{6};[\s\S]*color:\s*#[0-9a-fA-F]{6};[\s\S]*border-color:/, 'ported Free Mode parameter help popovers should use explicit dark-theme contrast colors');
assert.match(styleSource, /\.studio-param-help-popover-light\s*\{[\s\S]*background:\s*#[0-9a-fA-F]{6};[\s\S]*color:\s*#[0-9a-fA-F]{6};[\s\S]*border-color:/, 'ported Free Mode parameter help popovers should use explicit light-theme contrast colors');
assert.doesNotMatch(getCssBlock('.studio-param-help-popover'), /inset\s+\d+px\s+0\s+0|82,\s*198,\s*201|56,\s*189,\s*248|37,\s*99,\s*235/, 'Free Mode parameter help popovers should be plain rounded rectangles without blue accent rails');
assert.match(workbenchSource, /handleHeatCapacityParamHelpPointerDown[\s\S]*event\.preventDefault\(\);[\s\S]*event\.stopPropagation\(\);[\s\S]*setPinnedHeatCapacityParamHelpId\(null\)/, 'pinned Free Mode parameter help should consume the first outside pointerdown');
assert.match(workbenchSource, /getHeatCapacityFreeParameterLockReason\(activeFile\)/, 'Free Mode parameter panel should use the shared lock-reason helper');
assert.match(workbenchSource, /showHeatCapacityFreeParameterLockHint/, 'locked Free Mode parameter controls should surface the lock reason on click');
assert.match(workbenchSource, /acknowledgeHeatCapacityFreeAdvancedRiskWorkbenchState/, 'advanced risk confirmation should persist acceptance on the current file');
assert.match(workbenchSource, /applyHeatCapacityFreeParameterDraftWorkbenchState/, 'advanced parameter save should apply the draft through the shared Workbench helper');
assert.match(workbenchSource, /studio-heat-advanced-overlay/, 'advanced parameters should use a centered overlay');
assert.match(workbenchSource, /studio-heat-advanced-window/, 'advanced parameters should render a centered main window');
assert.match(workbenchSource, /studio-heat-advanced-risk-window/, 'first advanced open should render a higher risk confirmation window');
assert.match(workbenchSource, /studio-heat-advanced-grid/, 'advanced parameter form should use a responsive grid');
assert.match(workbenchSource, /heatCapacityFreeAdvancedParameterGroups/, 'advanced parameter form should use an explicit ordered group definition');
assert.match(workbenchSource, /title:\s*\{\s*'zh-CN':\s*'压力信号标定'/, 'advanced parameter group A should be titled by model role, not by letter');
assert.match(workbenchSource, /title:\s*\{\s*'zh-CN':\s*'气体状态模型'/, 'advanced parameter group B should be titled by model role, not by letter');
assert.match(workbenchSource, /title:\s*\{\s*'zh-CN':\s*'热交换与泄漏修正'/, 'advanced parameter group C should be titled by model role, not by letter');
assert.match(workbenchSource, /title:\s*\{\s*'zh-CN':\s*'读数采集与记录判定'/, 'advanced parameter group D should be titled by model role, not by letter');
assert.match(workbenchSource, /studio-heat-advanced-groups[\s\S]*heatCapacityFreeAdvancedParameterGroups\.map[\s\S]*studio-heat-advanced-group[\s\S]*studio-heat-advanced-group-title[\s\S]*heatCapacityFreeAdvancedNumberParameters\.filter\(\(definition\) => definition\.group === group\.id\)/, 'advanced parameters should render one titled three-column grid per group');
assert.doesNotMatch(workbenchSource, /A类|B类|C类|D类|A 類|B 類|C 類|D 類|Class A|Class B|Class C|Class D/, 'advanced parameter group titles should not expose letter-class wording');
assert.doesNotMatch(workbenchSource, /advancedSubtitle|这些参数只影响之后开始的新实验组|這些參數只影響之後開始的新實驗組|These values affect only future experiment groups/, 'advanced parameter main window should not keep the redundant future-groups subtitle');
assert.match(workbenchSource, /heatCapacityFreeSharedText\.valueTooLarge/, 'Free Mode parameter validation should have a localized over-limit message');
assert.match(workbenchSource, /HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA/, 'Free Mode parameter UI should share the 300 kPa absolute pressure ceiling');
assert.match(workbenchSource, /setScanInputToast\(message\)/, 'Free Mode parameter over-limit validation should surface a visible toast-style message');
assert.match(workbenchSource, /definition\.id === 'gamma'[\s\S]*isHeatCapacityFreeGammaEditingAvailable/, 'gamma should be locked separately after a file has started a recorded experiment');
assert.match(styleSource, /\.studio-heat-free-params\.is-locked[\s\S]*cursor:\s*not-allowed/, 'locked Free Mode parameter panel should visibly use not-allowed interaction');
assert.match(styleSource, /\.studio-heat-free-param-row\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(112px,\s*136px\);[\s\S]*border-radius:\s*4px;/, 'Free Mode parameter rows should use compact engineering-style alignment instead of loose card spacing');
assert.match(styleSource, /\.studio-heat-free-input-cell input\s*\{[\s\S]*text-align:\s*center;/, 'Free Mode basic and advanced numeric inputs should center their values');
assert.match(styleSource, /\.studio-heat-advanced-groups\s*\{[\s\S]*display:\s*grid;[\s\S]*gap:\s*12px;[\s\S]*padding:\s*14px 18px 16px;/, 'advanced parameter groups should stack vertically with the modal body padding');
assert.match(styleSource, /\.studio-heat-advanced-group-title\s*\{[\s\S]*font-size:\s*12px;[\s\S]*font-weight:\s*700;/, 'advanced parameter group titles should use compact engineering-style headings');
assert.match(getCssBlock('.studio-heat-advanced-group-title::before'), /display:\s*none;/, 'advanced parameter group titles should not add decorative color bars');
assert.match(styleSource, /\.studio-heat-advanced-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/, 'advanced parameter form should use a three-column desktop grid');
assert.match(styleSource, /\.studio-heat-advanced-window\s*\{[\s\S]*overflow-x:\s*hidden/, 'advanced parameter window should never require horizontal scrolling');
assert.match(styleSource, /\.studio-heat-advanced-actions button,\s*\.studio-heat-advanced-risk-window button\s*\{[\s\S]*min-width:\s*86px;[\s\S]*justify-content:\s*center;/, 'advanced parameter confirm/cancel buttons should be wide enough for Chinese labels');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-advanced-window\s*\{[\s\S]*background:\s*#[0-9a-fA-F]{6};[\s\S]*color:\s*#[0-9a-fA-F]{6};[\s\S]*border-color:/, 'advanced parameter window should have a dedicated light-theme surface');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-free-input-cell input\s*\{[\s\S]*background:\s*#[0-9a-fA-F]{6};[\s\S]*color:\s*#[0-9a-fA-F]{6};[\s\S]*border-color:/, 'Free Mode parameter inputs should have dedicated light-theme contrast');
assert.match(
  styleSource,
  /\.studio-theme-light \.studio-heat-free-advanced-button\s*\{[\s\S]*background:\s*#eaf2ff;[\s\S]*color:\s*#1f3f67;[\s\S]*border-color:\s*rgba\(37,\s*99,\s*235,\s*0\.28\)/,
  'light theme advanced-parameter entry button should use an independent light blue surface instead of dark neutral buttons',
);
assert.match(
  styleSource,
  /\.studio-theme-light \.studio-heat-free-advanced-button,\s*\.studio-theme-light \.studio-heat-advanced-actions button,\s*\.studio-theme-light \.studio-heat-advanced-risk-window button\s*\{[\s\S]*background:\s*#eef4fb;[\s\S]*color:\s*#334155;[\s\S]*border-color:\s*#c5d2df/,
  'light theme advanced-parameter neutral buttons should use dedicated light colors',
);
assert.match(
  getCssBlock('.studio-heat-free-record-controls button'),
  /border-width:\s*0\.5px;/,
  'free-mode record U buttons should use the thin annotated border width',
);
assert.match(
  getRootCssBlock('.studio-tree-row'),
  /border:\s*0\.5px solid transparent;/,
  'left sidebar file and panel rows should use the thin annotated border width',
);
assert.match(
  getRootCssBlock('.studio-console-tabs button'),
  /border:\s*0\.5px solid transparent;/,
  'console filter tabs should use the thin annotated border width',
);
assert.match(
  styleSource,
  /\.studio-heat-materials-nav button\s*\{[\s\S]*font-size:\s*12px;[\s\S]*font-weight:\s*300;/,
  'heat materials tree child buttons should use the light annotated font weight',
);
assert.match(
  getCssBlock('.studio-tree-title-button-panels'),
  /font-weight:\s*800;/,
  'Panels section title should use the heavier annotated font weight without changing file title buttons',
);
assert.match(
  getRootCssBlock('.studio-sidebar-usage-hint'),
  /font-weight:\s*700;/,
  'file tree usage hint should use the bold annotated weight',
);
assert.match(
  getRootCssBlock('.studio-status'),
  /font-weight:\s*300;/,
  'workbench status bar should use the light annotated weight',
);

assert.match(
  styleSource,
  /\.studio-heat-advanced-risk-window \.studio-heat-advanced-primary\s*\{[\s\S]*background:\s*var\(--studio-action-warning-bg\)[\s\S]*?color:\s*var\(--studio-action-warning-text\)/,
  'advanced risk confirmation primary action should use high-contrast warning colors instead of success green',
);

assert.match(
  styleSource,
  /\.studio-heat-advanced-risk-window strong\s*\{[\s\S]*color:\s*var\(--studio-action-warning-bg\)\s*!important;[\s\S]*\}/,
  'advanced risk confirmation title should use explicit warning contrast',
);
assert.match(styleSource, /prefers-reduced-motion:\s*reduce[\s\S]*\.studio-heat-free-params \*/, 'Free Mode parameter motion should include a reduced-motion fallback');

console.log('workbenchHeatCapacityInstrumentUi tests passed');
