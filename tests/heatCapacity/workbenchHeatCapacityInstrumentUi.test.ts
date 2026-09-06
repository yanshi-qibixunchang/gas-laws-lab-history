import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentPath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityInstrumentScene.tsx');
const ultraModelPath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityUltraInstrumentModel.tsx');
const autoDemoPath = join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityAutoDemo.ts');
const hardSphereTogglePath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityHardSphereToggle.tsx');
const hardSphereLayerPath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityHardSphereLayer.tsx');
const hardSphereModelPath = join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityHardSphereModel.ts');
const hardSphereSimulationPath = join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityHardSphereSimulation.ts');
const leftPanelPath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityLeftPanel.tsx');
const processReviewPanelPath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityProcessReviewPanel.tsx');
const processReviewStylePath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityProcessReviewPanel.css');
const processReviewStageScalePath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'heatCapacityProcessReviewStageScale.ts');
const gasTheoryPath = join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityGasTheory.ts');
const idealParameterProfilePath = join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityFreeIdealParameterProfile.ts');
const parameterConfigPath = join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityFreeParameterConfig.ts');
const freeParameterPanelModelPath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'heatCapacityFreeParameterPanelModel.ts');
const toastControllerPath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'heatCapacityToastController.ts');
const toastPolicyPath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'heatCapacityToastPolicy.ts');
const viewportFeedbackControllerPath = join(process.cwd(), 'src', 'components', 'prompts', 'promptViewportFeedbackController.ts');
const viewportFeedbackStylePath = join(process.cwd(), 'src', 'components', 'prompts', 'PromptViewportFeedback.css');
const guideStepModelPath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'heatCapacityGuideStepModel.ts');
const instrumentFeedbackPath = join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityInstrumentFeedback.ts');
const modeTypesPath = join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityModeTypes.ts');
const modeControlModelPath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'heatCapacityModeControlModel.ts');
const defaultConfigPath = join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityDefaultConfig.ts');
const workbenchPath = join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.tsx');
const modeActivationSource = readFileSync(join(process.cwd(), 'src/features/workbench/workbenchHeatCapacityModeActivation.ts'), 'utf8');
const workbenchCopyPath = join(process.cwd(), 'src', 'features', 'workbench', 'workbenchStudioCopy.ts');
const heatCapacityRealtimeCopyPath = join(process.cwd(), 'src', 'features', 'workbench', 'workbenchHeatCapacityRealtimeCopy.ts');
const heatCapacityUiCheckpointPath = join(process.cwd(), 'src', 'features', 'workbench', 'workbenchHeatCapacityUiCheckpoint.ts');
const heatCapacityMaterialsWindowCoordinatorPath = join(process.cwd(), 'src', 'features', 'workbench', 'workbenchHeatCapacityMaterialsWindowCoordinator.ts');
const parameterDialogsPath = join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchHeatCapacityParameterDialogs.tsx');
const emptyWorkspacePath = join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchEmptyWorkspace.tsx');
const statePath = join(process.cwd(), 'src', 'features', 'workbench', 'workbenchState.ts');
const heatCapacityFileFactoryPath = join(
  process.cwd(),
  'src',
  'features',
  'workbench',
  'workbenchHeatCapacityFileFactory.ts',
);
const heatCapacityCalibrationCoordinatorPath = join(
  process.cwd(),
  'src',
  'features',
  'workbench',
  'workbenchHeatCapacityCalibrationCoordinator.ts',
);
const freeRuntimeCoordinatorPath = join(
  process.cwd(),
  'src',
  'features',
  'workbench',
  'workbenchHeatCapacityFreeRuntimeCoordinator.ts',
);
const guideRuntimeCoordinatorPath = join(
  process.cwd(),
  'src',
  'features',
  'workbench',
  'workbenchHeatCapacityGuideRuntimeCoordinator.ts',
);
const guideControlStatePath = join(
  process.cwd(),
  'src',
  'features',
  'workbench',
  'workbenchHeatCapacityGuideControlState.ts',
);
const heatCapacityRuntimeCoordinatorPath = join(
  process.cwd(),
  'src',
  'features',
  'workbench',
  'workbenchHeatCapacityRuntimeCoordinator.ts',
);
const teachingResultStatePath = join(
  process.cwd(),
  'src',
  'features',
  'workbench',
  'workbenchHeatCapacityTeachingResultState.ts',
);
const teachingLifecycleStatePath = join(
  process.cwd(),
  'src',
  'features',
  'workbench',
  'workbenchHeatCapacityTeachingLifecycleState.ts',
);
const freeTraceStatePath = join(
  process.cwd(),
  'src',
  'features',
  'workbench',
  'workbenchHeatCapacityFreeTraceState.ts',
);
const freeRunResetPath = join(
  process.cwd(),
  'src',
  'features',
  'workbench',
  'workbenchHeatCapacityFreeRunReset.ts',
);
const stateTypesPath = join(
  process.cwd(),
  'src',
  'features',
  'workbench',
  'workbenchHeatCapacityStateTypes.ts',
);
const instrumentStatePath = join(
  process.cwd(),
  'src',
  'features',
  'workbench',
  'workbenchHeatCapacityInstrumentState.ts',
);
const sessionPath = join(process.cwd(), 'src', 'features', 'workbench', 'workbenchSession.ts');
const indexedDbPersistencePath = join(process.cwd(), 'src', 'features', 'workbench', 'workbenchIndexedDbPersistence.ts');
const heatCapacitySessionRestorePath = join(process.cwd(), 'src', 'features', 'workbench', 'workbenchHeatCapacitySessionRestore.ts');
const stylePath = join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchStudioPrototype.css');
const waitControllerPath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityWaitController.tsx');
const waitControllerStylePath = join(process.cwd(), 'src', 'features', 'heatCapacity', 'HeatCapacityWaitController.css');
const pressureGaugeContractPath = join(
  process.cwd(),
  'docs',
  'instrument-modeling',
  'adiabatic-expansion',
  'controls',
  'heat-capacity-pressure-gauge-contract.md',
);

assert.equal(existsSync(componentPath), true, 'heatCapacity instrument scene component should exist');
assert.equal(existsSync(pressureGaugeContractPath), true, 'shared Heat Capacity pressure gauge contract should exist');

const sceneSource = readFileSync(componentPath, 'utf8');
const indexedDbPersistenceSource = readFileSync(indexedDbPersistencePath, 'utf8');
const ultraModelSource = readFileSync(ultraModelPath, 'utf8');
const orbitControlsSection = sceneSource.match(/<OrbitControls\s[\s\S]*?\/>/)?.[0] ?? '';
const stopcockSceneSection = sceneSource.match(/function GlassStopcock\([\s\S]*?function PressureBottle\(/)?.[0] ?? '';
const pumpValveSceneSection = sceneSource.match(/function PumpAssembly\([\s\S]*?function InstrumentSceneContent\(/)?.[0] ?? '';
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
const gasTheorySource = readFileSync(gasTheoryPath, 'utf8');
const idealParameterProfileSource = readFileSync(idealParameterProfilePath, 'utf8');
const freeRecordTableSection = leftPanelSource.match(/data-heat-capacity-free-record-table="true"[\s\S]*?<\/table>/)?.[0] ?? '';
const freeRecordTableHeaderSection = freeRecordTableSection.match(/<thead>[\s\S]*?<\/thead>/)?.[0] ?? '';
const freeCurrentTrialSection = leftPanelSource.match(/data-heat-capacity-free-current-trial-status="true"[\s\S]*?<\/section>/)?.[0] ?? '';
const freeResultSummarySection = leftPanelSource.match(/data-heat-capacity-free-result-summary="true"[\s\S]*?<\/section>/)?.[0] ?? '';
const guideDataResultsRendererSection = leftPanelSource.match(/const renderSingleTrialDataAndResultsTab = \([\s\S]*?\nexport const HeatCapacityLeftPanel/)?.[0] ?? '';
const simplifiedFreeCopySection = leftPanelSource.match(/'zh-CN': \{\s*freeRecording: \{[\s\S]*?\n    \},\n  \},\n  'zh-TW':/)?.[0] ?? '';
const freeCopySection = leftPanelSource.match(/const freeCopyByLanguage = \{[\s\S]*?\n\} as const;/)?.[0] ?? '';
const hardSphereToggleMountSection = sceneSource.match(/<HeatCapacityHardSphereToggle[\s\S]*?\/>/)?.[0] ?? '';
const parameterConfigSource = readFileSync(parameterConfigPath, 'utf8');
const freeParameterPanelModelSource = readFileSync(freeParameterPanelModelPath, 'utf8');
const toastControllerSource = readFileSync(toastControllerPath, 'utf8');
const toastPolicySource = readFileSync(toastPolicyPath, 'utf8');
const viewportFeedbackControllerSource = readFileSync(viewportFeedbackControllerPath, 'utf8');
const viewportFeedbackStyleSource = readFileSync(viewportFeedbackStylePath, 'utf8');
const guideStepModelSource = readFileSync(guideStepModelPath, 'utf8');
const instrumentFeedbackSource = readFileSync(instrumentFeedbackPath, 'utf8');
const modeTypesSource = readFileSync(modeTypesPath, 'utf8');
const modeControlModelSource = readFileSync(modeControlModelPath, 'utf8');
const defaultConfigSource = readFileSync(defaultConfigPath, 'utf8');
const stateSource = readFileSync(statePath, 'utf8');
const heatCapacityFileFactorySource = readFileSync(heatCapacityFileFactoryPath, 'utf8');
const heatCapacityCalibrationCoordinatorSource = readFileSync(
  heatCapacityCalibrationCoordinatorPath,
  'utf8',
);
const freeRuntimeCoordinatorSource = readFileSync(freeRuntimeCoordinatorPath, 'utf8');
const guideRuntimeCoordinatorSource = readFileSync(guideRuntimeCoordinatorPath, 'utf8');
const guideControlStateSource = readFileSync(guideControlStatePath, 'utf8');
const heatCapacityRuntimeCoordinatorSource = readFileSync(heatCapacityRuntimeCoordinatorPath, 'utf8');
const teachingResultStateSource = readFileSync(teachingResultStatePath, 'utf8');
const teachingLifecycleStateSource = readFileSync(teachingLifecycleStatePath, 'utf8');
const freeTraceStateSource = readFileSync(freeTraceStatePath, 'utf8');
const freeRunResetSource = readFileSync(freeRunResetPath, 'utf8');
const stateTypesSource = readFileSync(stateTypesPath, 'utf8');
const instrumentStateSource = readFileSync(instrumentStatePath, 'utf8');
const sessionSource = readFileSync(sessionPath, 'utf8');
const heatCapacitySessionRestoreSource = readFileSync(heatCapacitySessionRestorePath, 'utf8');
const heatCapacityPersistencePath = join(process.cwd(), 'src', 'features', 'workbench', 'workbenchHeatCapacityPersistence.ts');
const heatCapacityPersistenceSource = readFileSync(heatCapacityPersistencePath, 'utf8');
const heatCapacityPersistenceContractPath = join(process.cwd(), 'src', 'features', 'workbench', 'workbenchHeatCapacityPersistenceContract.ts');
const heatCapacityPersistenceContractSource = readFileSync(heatCapacityPersistenceContractPath, 'utf8');
const parameterDialogsSource = readFileSync(parameterDialogsPath, 'utf8');
const heatCapacityTabRegistryPath = join(process.cwd(), 'src', 'features', 'workbench', 'workbenchHeatCapacityTabRegistry.ts');
const heatCapacityTabRegistrySource = readFileSync(heatCapacityTabRegistryPath, 'utf8');
const heatCapacityMaterialsWindowCoordinatorSource = readFileSync(heatCapacityMaterialsWindowCoordinatorPath, 'utf8');
const workbenchGeneralSettingsPath = join(process.cwd(), 'src', 'features', 'workbench', 'workbenchGeneralSettings.ts');
const workbenchGeneralSettingsSource = readFileSync(workbenchGeneralSettingsPath, 'utf8');
const workbenchGeneralSettingsWindowPath = join(process.cwd(), 'src', 'features', 'workbench', 'WorkbenchGeneralSettingsWindow.tsx');
const workbenchGeneralSettingsWindowSource = readFileSync(workbenchGeneralSettingsWindowPath, 'utf8');
const styleSource = readFileSync(stylePath, 'utf8');
const promptShellStyleSource = readFileSync(
  join(process.cwd(), 'src', 'components', 'prompts', 'PromptDialogShell.css'),
  'utf8',
);
const promptFeedbackPolicySource = readFileSync(
  join(process.cwd(), 'src', 'components', 'prompts', 'promptFeedbackPolicy.ts'),
  'utf8',
);
const workbenchSource = readFileSync(workbenchPath, 'utf8');
const workbenchCopySource = readFileSync(workbenchCopyPath, 'utf8');
const heatCapacityRealtimeCopySource = readFileSync(heatCapacityRealtimeCopyPath, 'utf8');
const heatCapacityUiCheckpointSource = readFileSync(heatCapacityUiCheckpointPath, 'utf8');
const waitControllerSource = readFileSync(waitControllerPath, 'utf8');
const waitControllerStyleSource = readFileSync(waitControllerStylePath, 'utf8');
const emptyWorkspaceSource = readFileSync(emptyWorkspacePath, 'utf8');
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
  /const updateHeatCapacityPower = \(nextPowerOn\?: boolean[\s\S]*const resolvedPowerOn = nextPowerOn \?\? !file\.powerOn[\s\S]*powerHeatCapacityWorkbenchFile\(file, resolvedPowerOn, now\)/,
  'Fast 3D power-switch clicks should be able to toggle from the latest workbench file state instead of a stale scene prop',
);
assert.doesNotMatch(
  workbenchSource,
  /prepareHeatCapacityFreeExperimentGroupForUserOperation|prepareNextHeatCapacityFreeExperimentGroupWorkbenchState/,
  'ordinary apparatus actions must never create a hidden next Free group',
);
assert.match(
  workbenchSource,
  /updateHeatCapacityStopcockOpen[\s\S]*?source === 'user'[\s\S]*?collapseHeatCapacityFreeParameterSidebarForExperimentAction\(\)/,
  'Changing stopcock from user action should collapse the parameter sidebar',
);
assert.match(
  workbenchSource,
  /const updateHeatCapacityStopcockOpen = \(nextOpen\?: boolean[\s\S]*const resolvedOpen = nextOpen \?\? getHeatCapacityStopcockState\(file\.stopcockAngleDeg\) !== 'open'[\s\S]*setHeatCapacityFreeStopcockOpen\(file, resolvedOpen, now\)/,
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
  heatCapacityUiCheckpointSource,
  /export interface HeatCapacityFocusSession [\s\S]*?parametersCollapsedBeforeFocus[\s\S]*?nonReversibleAction/,
  'the Heat Capacity checkpoint boundary should keep a focus-session snapshot for exit-time sidebar recovery',
);
assert.match(
  workbenchSource,
  /const updateHeatCapacityFocusMode = \(mode: HeatCapacityFocusMode\) => \{[\s\S]*?heatCapacityFocusSessionRef\.current[\s\S]*?setParametersCollapsed\(true\)/,
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
  /getHeatCapacityFreeRecordButtonState/,
  'Free Mode record buttons should use the shared stage-aware button state helper',
);
assert.match(
  workbenchSource,
  /重新记录/,
  'Free Mode record buttons should switch to re-record labels while the current record is overwritable',
);
assert.doesNotMatch(
  workbenchSource,
  /data-heat-capacity-free-record="u0"[\s\S]{0,240}disabled=\{freeRecordU0Blocked\}/,
  'Free Mode should hide locked record buttons instead of leaving them visible and disabled',
);
assert.match(
  workbenchSource,
  /shouldPromptHeatCapacityFreePowerOffBeforeNextGroup\(activeFile\)[\s\S]*?getHeatCapacityRealtimeCopy\(language\)\.freePowerOffBeforeNextGroup/,
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
  getProcessReviewCssBlock('.hpr-standard-process-summary'),
  /border-left:/,
  'standard process summary should not keep a decorative orange left accent rail',
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
  getProcessReviewCssBlock('.hpr-standard-process-summary'),
  /grid-template-columns:\s*auto minmax\(0,\s*1fr\)/,
  'standard process summary should use a compact inline engineering layout',
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
  /event\.quickToggle \? copy\.quickToggleSuffix/,
  'process review should label a quick stopcock toggle as a neutral no-release event',
);
assert.match(
  processReviewPanelSource,
  /zh-TW[\s\S]*standardReference:\s*'標準過程'[\s\S]*en:[\s\S]*standardReference:\s*'Standard process'/,
  'standard reference review copy should cover Traditional Chinese and English while keeping the visible Standard process label',
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
assert.match(
  workbenchSource,
  /calculationSession,\s*scoringVersion:\s*viewedGroup\.scoringVersion/,
  'process review should receive the viewed experiment group calculation session and scoring version',
);
assert.match(
  processReviewPanelSource,
  /本组总分 = 各次实验操作分的平均值（75 分）\+ 本组计算（25 分）[\s\S]*首次正确 100%[\s\S]*仅修正有效数字 80%[\s\S]*数值纠错 60%[\s\S]*查看答案 20%/,
  'the visible scoring details should explain the 75/25 split and calculation answer credit',
);
assert.match(
  heatCapacityRealtimeCopySource,
  /demoProgressLabel:\s*'推进标准'/,
  'auto demo step panel should label the real-world progress criterion separately from the target control',
);
assert.match(
  workbenchSource,
  /setAutoDemoStepProgressCriterion\(step\.progressCriterion\)/,
  'auto demo runner should copy each step progress criterion into the visible panel state',
);
assert.match(
  workbenchSource,
  /heatCapacityRealtimeCopy\.demoProgressLabel[\s\S]*autoDemoStepProgressCriterion/,
  'auto demo step panel should render the progress criterion row',
);
assert.match(
  heatCapacityRealtimeCopySource,
  /pumping:\s*'连续打气至 Uₚ ≥ 120 mV，达到后停止加压。'/,
  'realtime pumping hint should teach the 120 mV progress standard',
);
assert.match(
  heatCapacityRealtimeCopySource,
  /sealedStabilizing:\s*'真实实验需封闭等待 5 min，稳定后记录 U₁。'/,
  'realtime sealed-stabilizing hint should teach the 5 min U1 wait',
);
assert.match(
  heatCapacityRealtimeCopySource,
  /recovering:\s*'关闭玻璃旋塞后等待 5 min，回温稳定后记录 U₂。'/,
  'realtime recovery hint should teach the 5 min U2 wait',
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
  /min-height:\s*54px;[\s\S]*border-bottom:\s*0;[\s\S]*padding:\s*0 16px;/,
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
  /box-shadow:\s*inset 0 -2px 0 var\(--studio-accent\);[\s\S]*font-weight:\s*600;/,
  'heat materials active tab should use a bottom rule and slightly stronger label weight',
);
assert.match(
  styleSource,
  /\.studio-theme-light \.studio-heat-materials-toolbar\s*\{[\s\S]*background:\s*var\(--studio-surface-2\);/,
  'heat materials title bar should use the shared secondary light-theme surface',
);
assert.match(
  styleSource,
  /\.studio-theme-light \.studio-heat-materials-tabs \.studio-results-tab-active\s*\{[\s\S]*box-shadow:\s*inset 0 -2px 0 var\(--studio-accent\);/,
  'light theme heat materials active tab should keep the bottom-rule treatment',
);
assert.match(
  styleSource,
  /\.studio-theme-light \.studio-heat-current-hint strong\s*\{[\s\S]*color:\s*var\(--studio-warning\);/,
  'light theme heat current hint highlight should use the shared amber semantic color',
);
assert.match(sceneSource, /overlayBottomRight/, '3D scene should keep a lower-right overlay path for Free Mode record actions');
assert.match(sceneSource, /overlayTopCenter/, '3D scene should expose a top-center overlay slot for Free wait speed controls');
assert.match(sceneSource, /studio-preview-overlay-slot-top-center/, 'top-center overlay should use the shared preview overlay slot system');
assert.match(workbenchSource, /deriveHeatCapacityFreeWorkbenchAttemptWaitTimer\(activeFile\)/, 'Free timer should derive from the explicit active-attempt state instead of U0/trial inference');
assert.match(workbenchSource, /heatCapacityWaitTimerDisplay &&[\s\S]*<HeatCapacityWaitController/, 'the shared wait controller must not render without a real Guide, Free, or Demo wait stage');
assert.match(workbenchSource, /data-heat-capacity-wait-overlay="true"/, 'wait overlay should use the new independent selector');
assert.match(workbenchSource, /deriveHeatCapacityAutoDemoWaitTimer\([\s\S]*heatCapacityAutoDemoTimelineRef\.current,[\s\S]*heatCapacityAutoDemoElapsedMs/, 'Demo waits should derive from the independent scripted timeline clock');
assert.match(workbenchSource, /activeFile\.heatCapacityMode === 'demo'[\s\S]*HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER/, 'Demo wait display should always select the fixed x16 speed');
assert.match(workbenchSource, /heatCapacitySpeedOptionsDisabled = activeFile\.heatCapacityMode === 'demo'/, 'Demo wait speed controls should remain disabled throughout automatic playback');
assert.match(workbenchSource, /data-heat-capacity-wait-mode=\{activeFile\.heatCapacityMode\}/, 'wait overlay should expose the active mode for browser verification');
assert.match(waitControllerSource, /data-heat-capacity-wait-controller="true"/, 'independent wait controller should expose stable markup');
assert.match(waitControllerSource, /data-heat-capacity-wait-timer="true"/, 'independent wait controller should expose its timer region');
assert.match(waitControllerSource, /HEAT_CAPACITY_WAIT_SPEED_OPTIONS = HEAT_CAPACITY_FREE_WAIT_SPEED_OPTIONS/, 'wait controller should consume the shared approved speed options');
assert.match(waitControllerSource, /const progressRatio = targetS > 0 \? clampUnit\(elapsedS \/ targetS\) : 0/, 'wait progress should clamp while elapsed time itself continues past five minutes');
assert.match(waitControllerSource, /formatHeatCapacityWaitDuration\(elapsedS\)/, 'wait controller should format live elapsed time internally');
assert.match(waitControllerSource, /--heat-capacity-wait-progress/, 'wait controller should own its progress CSS variables');
assert.match(waitControllerStyleSource, /conic-gradient\([\s\S]*var\(--heat-capacity-wait-progress-color\)/, 'independent timer ring should render live progress');
assert.match(waitControllerStyleSource, /\.heat-capacity-wait-controller__option:disabled\s*\{[\s\S]*cursor:\s*not-allowed;[\s\S]*opacity:\s*1;/, 'disabled Demo and Guide speed options should retain instrument styling and show a prohibited cursor');
assert.match(workbenchSource, /heatCapacityWaitTimer\?\.stage === 'u1-ready'[\s\S]*heatCapacityWaitTimer\?\.stage === 'u2-ready'/, 'Guide wait timer should stay visible after five minutes while the U1 or U2 record strong reminder is active');
assert.match(workbenchSource, /speedOptionsDisabled=\{heatCapacitySpeedOptionsDisabled\}/, 'shared wait timer should disable speed controls for Demo and ready-state Guide waits');
assert.match(waitControllerSource, /d="M 74 50 L 92 76 H 179 C 191 76 200 74 210 68 C 218 62 224 55 225 49 L 74 50 Z"/, 'independent timer should preserve the approved cabin geometry');
assert.match(workbenchSource, /freeWaitTimerLabel/, 'Free wait timer should use localized stage labels');
assert.match(heatCapacityRealtimeCopySource, /freeSpeedLabelCode:\s*'WAIT RATE'/, 'Free wait speed control should localize its engineering code label through Heat Capacity copy');
assert.match(heatCapacityRealtimeCopySource, /zh-CN[\s\S]*freeSpeedLabel:\s*'等待倍速'[\s\S]*zh-TW[\s\S]*freeSpeedLabel:\s*'等待倍速'[\s\S]*en[\s\S]*freeSpeedLabel:\s*'Wait speed'/, 'Free wait speed control should include zh-CN, zh-TW, and English labels');
assert.doesNotMatch(workbenchSource, /data-heat-capacity-free-speed-control|studio-heat-free-speed-control|heatCapacityFreeEquilibriumSpeedHintShown/, 'old speed-only UI and compatibility state must be physically absent');
assert.doesNotMatch(styleSource, /\.studio-heat-free-speed-|\.studio-heat-free-wait-/, 'old speed-only and attached timer styles must be deleted');
assert.doesNotMatch(workbenchSource, /getLocalizedHeatCapacityFreeProcessingMessage/, 'Free Mode should not keep the removed standalone processing log helper');
assert.match(workbenchSource, /freeModeActiveLog/, 'Free Mode activation logs should use Heat Capacity localized copy');
assert.doesNotMatch(`${workbenchSource}\n${heatCapacityRealtimeCopySource}`, /freeRunResetLog|resetFreeMode/, 'the removed ambiguous Free Mode reset copy should not remain');
assert.doesNotMatch(workbenchSource, /heat-capacity free mode active|heat-capacity free run reset|Free Mode 已记录 U[₀₁₂] 显示值/, 'Free Mode console logs should not contain hard-coded mixed-language strings');
assert.match(workbenchSource, /speedAriaLabel=\{heatCapacityRealtimeCopy\.freeSpeedAria\}/, 'Free wait speed radiogroup should localize its accessibility label');
assert.match(workbenchSource, /heatCapacityRealtimeCopy\.freeSpeedLabelCode[\s\S]*heatCapacityRealtimeCopy\.freeSpeedLabel/, 'Free wait speed label should render localized copy instead of hard-coded text');
assert.match(waitControllerSource, /heat-capacity-wait-controller__screw/, 'independent wait controller should keep compact hardware details');
assert.match(waitControllerSource, /×\{speed\}/, 'wait speed option text should use engineering multiplier notation');
assert.match(waitControllerSource, /HEAT_CAPACITY_WAIT_SPEED_OPTIONS\.map/, 'independent wait controller should render the canonical x2/x4/x8/x16 options');
assert.match(workbenchSource, /setHeatCapacityFreeEquilibriumSpeedMultiplier/, 'Free wait speed option clicks should update the persisted Free runtime multiplier');
assert.match(workbenchSource, /overlayTopCenter=\{heatCapacityTopCenterOverlay\}/, 'Workbench should mount the Free speed selector into the 3D top-center overlay');
assert.match(waitControllerStyleSource, /\.heat-capacity-wait-controller__options \{[\s\S]*border-radius:\s*999px/, 'speed options should sit in an inset capsule');
assert.match(waitControllerStyleSource, /\.heat-capacity-wait-controller__screw \{[\s\S]*border-radius:\s*50%/, 'screw details should remain circular hardware marks');
assert.match(waitControllerStyleSource, /\.heat-capacity-wait-controller__thumb \{[\s\S]*transition:\s*transform/, 'active speed highlight should slide between options');
assert.match(waitControllerStyleSource, /\.heat-capacity-wait-controller--speed-3 \.heat-capacity-wait-controller__thumb \{[\s\S]*translateX\(96px\)/, 'x16 should move the highlight to the fourth slot');
assert.match(styleSource, /\.studio-heat-wait-overlay \{[\s\S]*studioOverlayTopCenterIn/, 'wait controller should enter through the shared top-center overlay');
assert.match(styleSource, /\.studio-heat-wait-overlay \{[\s\S]*margin-left:\s*0;/, 'Free wait controller should use the available preview center when no step panel occupies the right side');
assert.match(styleSource, /\.studio-heat-wait-overlay\[data-heat-capacity-wait-mode='guide'\],[\s\S]*\.studio-heat-wait-overlay\[data-heat-capacity-wait-mode='demo'\][\s\S]*margin-left:\s*-150px;/, 'Guide and Demo should preserve the left-shifted timer center around their right-side instruction panels');
assert.match(styleSource, /\.studio-heat-wait-overlay-exiting \{[\s\S]*studioOverlayTopCenterOut/, 'automatic Demo waits should leave through the shared top-center exit motion');
assert.match(workbenchSource, /selectActiveHeatCapacityWorkbenchDisplay\(activeFile\)/, 'workbench should pass the active mode display source into the 3D instrument');
assert.match(emptyWorkspaceSource, /data-workbench-create-experiment="heatCapacity"/, 'Workbench should expose a stable heat-capacity creation selector for browser automation');
assert.match(workbenchSource, /recordFreeHeatCapacitySample\(kind\)/, 'Free Mode should route visible U0/U1/U2 record actions through the shared button renderer');
assert.match(workbenchSource, /data-heat-capacity-free-record=\{kind\}/, 'Free Mode record buttons should keep a stable browser-automation selector for the rendered record kind');
assert.match(workbenchSource, /getHeatCapacityFreeRecordButtonState\(activeFile,\s*'u0'\)[\s\S]*getHeatCapacityFreeRecordButtonState\(activeFile,\s*'u1'\)[\s\S]*getHeatCapacityFreeRecordButtonState\(activeFile,\s*'u2'\)/, 'Free Mode record buttons should use the shared stage-aware button states for all record kinds');
assert.match(workbenchSource, /getHeatCapacityFreeDisplayPhase\(activeFile\)/, 'Free Mode should derive a workflow-aware display phase for instrument panels');
assert.match(workbenchSource, /phase=\{heatCapacityDisplayPhase\}/, '3D instrument focus panel should receive the workflow-aware heat-capacity display phase');
assert.match(workbenchSource, /getHeatCapacityPhaseLabel\(heatCapacityDisplayPhase\)/, 'realtime phase badges should use the same workflow-aware heat-capacity display phase');
assert.match(workbenchSource, /data-heat-capacity-guided-record=\{stepRecordKind\}/, 'Guided record button should expose the active U0/U1/U2 kind from the current checklist row for browser automation');
assert.match(workbenchSource, /applyHeatCapacityFreeRecordWorkbenchState/, 'Free Mode record buttons should use one synchronous record-attempt helper');
assert.match(heatCapacityRealtimeCopySource, /'zero-not-ready': '请先打开电源并打开玻璃旋塞，再记录 U₀。'/, 'Free Mode U0 reject copy should state only the minimum physical record prerequisites');
assert.doesNotMatch(workbenchSource, /完成调零，待 Uₚ 稳定接近 0 后再记录 U₀|finish zeroing, and wait until Uₚ is stable near 0 before recording U₀/, 'Free Mode U0 reject copy should not imply strict zeroing and stability gates');
assert.match(freeTraceStateSource, /recordHeatCapacityFreeTraceEventWithReference/, 'Free Mode official records should capture hidden trace references before saving U0/U1/U2');
assert.match(processReviewStageScaleSource, /MIN_COMPRESSED_STAGE_DURATION_BY_ID/, 'process review timeline should keep each experiment stage readable even after long idle waits');
assert.match(processReviewStageScaleSource, /calculateHeatCapacityProcessReviewCompressedDurationS/, 'process review timeline should expose compressed process duration for independent actual and standard process traces');
assert.match(processReviewStageScaleSource, /axisTicks/, 'process review stage scale should expose mixed major/minor axis ticks');
assert.match(processReviewStageScaleSource, /createHeatCapacityAlignedReferencePointToX/, 'process review stage scale should expose a helper for start-aligning independent reference traces');
assert.match(processReviewPanelSource, /createHeatCapacityAlignedReferencePointToX/, 'process review charts should align the standard process display through the shared stage-scale helper');
assert.match(processReviewPanelSource, /actualStageId:\s*'pump'[\s\S]*referenceStageId:\s*'pump'/, 'standard process pump should be display-aligned to the actual pump start while preserving independent later stages');
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
assert.match(
  processReviewPanelSource,
  /className=\{`hpr-trial-select \$\{trialMenuOpen \? 'hpr-trial-select-open' : ''\}`\}/,
  'process review group selector should own one unambiguous control shell',
);
assert.match(
  processReviewPanelSource,
  /className="hpr-trial-select-trigger"[\s\S]*<ChevronDown[\s\S]*hpr-trial-select-chevron/,
  'process review group selector should use its dedicated trigger and animated chevron',
);
assert.match(
  processReviewPanelSource,
  /className="hpr-trial-select-menu"[\s\S]*className=\{option\.trialId === selectedTrialId \? 'hpr-trial-select-option-active' : ''\}/,
  'process review group selector menu should use its dedicated menu and active option styling',
);
assert.match(
  processReviewStyleSource,
  /\.hpr-trial-select-trigger\s*\{[\s\S]*min-height:\s*30px;[\s\S]*min-width:\s*112px;[\s\S]*border:\s*1px solid var\(--studio-border\);[\s\S]*border-radius:\s*4px;[\s\S]*background:\s*var\(--studio-surface\);/,
  'process review group selector trigger should match the display-scheme dropdown trigger sizing and surface',
);
assert.match(
  processReviewStyleSource,
  /\.hpr-trial-select-menu\s*\{[\s\S]*z-index:\s*6;[\s\S]*min-width:\s*142px;[\s\S]*border:\s*1px solid var\(--studio-accent-border\);[\s\S]*border-radius:\s*6px;[\s\S]*animation:\s*hprTrialSelectMenuIn 150ms ease both;/,
  'process review group selector menu should retain its reviewed border, radius, width, and animation',
);
assert.match(processReviewPanelSource, /trialOptions\.map/, 'process review menu should list all reviewable groups');
assert.match(processReviewPanelSource, /onSelectedTrialChange/, 'process review menu should report selected group changes to the workbench');
assert.match(processReviewPanelSource, /trialSelectRef/, 'process review menu should close from outside-click handling');
assert.match(processReviewPanelSource, /pointerdown/, 'process review menu should close as soon as an outside pointer is pressed');
assert.match(processReviewPanelSource, /Escape/, 'process review menu should close from Escape');
assert.doesNotMatch(processReviewPanelSource, /hpr-reference-line|标准基线|showStandardReference|referenceTrace/, 'process review charts should remove the standard baseline curve and toggle');
assert.match(processReviewPanelSource, /hpr-standard-process-line/, 'process review charts should render the standard process curve');
assert.match(processReviewPanelSource, /标准过程/, 'process review legend should label the reference curve as standard process');
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
assert.match(processReviewPanelSource, /buildContinuousLinePath/, 'standard process should use a continuous path builder');
assert.match(processReviewPanelSource, /buildPumpAwareLinePath/, 'actual measured trace should keep step-aware pump rendering');
assert.doesNotMatch(processReviewPanelSource, /hpr-pump-event-marker/, 'process review charts should keep pump strokes on the stage timeline instead of drawing full-height plot markers');
assert.match(processReviewPanelSource, /hpr-record-window/, 'process review charts should render actual fixed-width record windows');
assert.doesNotMatch(processReviewPanelSource, /hpr-best-window/, 'process review charts should not render old best-window bands');
assert.match(processReviewPanelSource, /hpr-line-legend-window/, 'actual record windows should be explained in the chart legend');
assert.match(processReviewPanelSource, /记录窗口/, 'actual record window legend label should stay concise');
assert.doesNotMatch(processReviewPanelSource, />记录时间：|>电信号：|>换算压强差：|>换算温度差：/, 'record hover callout labels should not be hard-coded Chinese JSX literals');
assert.doesNotMatch(processReviewPanelSource, /实际记录时刻：/, 'record window title should be localized instead of hard-coded Chinese');
assert.doesNotMatch(processReviewPanelSource, /hpr-best-window-label/, 'record windows should not place text inside the plot band');
assert.doesNotMatch(processReviewPanelSource, /hpr-line-legend-window" title=\{copy\.recordWindowTitle\}/, 'process review record-window legend should not keep the old browser-native title tooltip');
assert.doesNotMatch(processReviewPanelSource, /className="hpr-summary-help"[\s\S]*title=\{copy\.upperBoundHelp\}/, 'process review upper-bound help should not keep the old browser-native title tooltip');
assert.match(processReviewPanelSource, /hpr-tooltip-anchor[\s\S]*data-hpr-tooltip=\{copy\.recordWindowTitle\}/, 'process review record-window legend should use the shared fixed tooltip style');
assert.match(processReviewPanelSource, /chartLegendAria:\s*\(title: string\) => `\$\{title\}图例`/, 'process review chart legend aria labels should be localized for Simplified Chinese');
assert.match(processReviewPanelSource, /chartLegendAria:\s*\(title: string\) => `\$\{title\}圖例`/, 'process review chart legend aria labels should be localized for Traditional Chinese');
assert.doesNotMatch(processReviewPanelSource, /aria-label=\{`\$\{title\} legend`\}/, 'process review chart legend aria labels should not hard-code English in every language');
assert.match(processReviewPanelSource, /localizeProcessDiagnosisRow/, 'process review should localize diagnosis rows before rendering language-specific UI');
assert.doesNotMatch(processReviewPanelSource, /<strong>\{row\.title\}<\/strong>/, 'process review should not render raw domain diagnosis titles directly');
assert.match(processReviewStyleSource, /--hpr-status-reasonable:/, 'process review diagnosis status colors should use theme variables');
assert.match(processReviewStyleSource, /\.hpr-diagnosis-status-review\s*\{[\s\S]*color:\s*var\(--hpr-status-review\)/, 'process review review-status text should use a theme contrast variable');
assert.doesNotMatch(processReviewStyleSource, /\.hpr-diagnosis-status-review\s*\{[\s\S]*color:\s*#2e638f/, 'process review review-status text should not keep the low-contrast dark-theme color');
assert.match(processReviewPanelSource, /hpr-tooltip-anchor[\s\S]*data-hpr-tooltip=\{copy\.upperBoundHelp\}/, 'process review upper-bound help should use the shared fixed tooltip style');
assert.match(processReviewStyleSource, /\.hpr-tooltip-anchor::after\s*\{[\s\S]*font-size:\s*11px;[\s\S]*border-radius:\s*6px;/, 'process review fixed tooltips should match the unified Heat Capacity tooltip sizing');
assert.match(processReviewPanelSource, /chart\.actualTrace/, 'process review charts should consume the actual trace through the renamed actualTrace field');
assert.match(processReviewPanelSource, /standardReference\?\.trace/, 'process review charts should consume standard reference trace data from one snapshot object');
assert.match(processReviewPanelSource, /standardReference\?\.stages/, 'process review charts should consume standard reference stages from one snapshot object');
assert.match(processReviewPanelSource, /standardReferenceSummary/, 'process review should expose the standard reference summary from one snapshot object');
assert.match(processReviewPanelSource, /standardReference\?\.recordWindows/, 'process review should expose standard record windows from one snapshot object');
const oldScatteredStandardChartFields = new RegExp([
  'chart\\.' + 'standard' + 'Trace',
  'chart\\.' + 'standard' + 'Stages',
  'chart\\.' + 'standard' + 'Process',
  'chart\\.' + 'standard' + 'Windows',
].join('|'));
assert.doesNotMatch(processReviewPanelSource, oldScatteredStandardChartFields, 'process review should not consume old scattered standard-process chart fields');
assert.match(processReviewPanelSource, /upperBoundHelp/, 'operation upper-bound card should expose concise help copy');
assert.doesNotMatch(processReviewPanelSource, /idealReferenceAssumptions/, 'process review should not keep old ideal reference assumption copy');
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
assert.doesNotMatch(processReviewPanelSource, new RegExp('chart\\.' + 'best' + 'Windows\\.map'), 'process review charts should not consume best-window data for plot bands');
assert.match(processReviewPanelSource, /formatHeatCapacitySignalMv\(record\.signalMv\)/, 'process review record hover mV signal should show one truncated decimal');
assert.doesNotMatch(processReviewPanelSource, /record\.signalMv\.toFixed\(2\)/, 'process review record hover mV signal should not show two decimals');
assert.match(processReviewPanelSource, /const hoveredRecordDetail = hoveredRecordId[\s\S]*className="hpr-record-detail-layer"/, 'record hover detail should render from a dedicated top SVG layer');
assert.equal(
  processReviewPanelSource.indexOf('{hoveredRecordDetail ? (') > processReviewPanelSource.indexOf('{chart.controls.map((event) => {'),
  true,
  'record hover detail layer should be painted after control event dots so dots cannot cover the tooltip',
);
assert.doesNotMatch(leftPanelSource, /data-heat-capacity-calculate="free"/, 'Free Mode results should be derived automatically without a separate calculate button');
assert.doesNotMatch(leftPanelSource, /data-heat-capacity-calculate="teaching"/, 'Teaching data/results should be derived automatically without a separate calculate button');
assert.doesNotMatch(processReviewStyleSource, /\.hpr-reference-line|--hpr-reference-line/, 'standard reference styles should be removed');
assert.match(processReviewStyleSource, /\.hpr-standard-process-line/, 'standard process curve should have an explicit style');
assert.match(processReviewStyleSource, /\.hpr-record-window/, 'actual record window should have an explicit style');
assert.match(processReviewStyleSource, /\.hpr-line-legend-window/, 'record window legend marker should have an explicit style');
assert.doesNotMatch(processReviewStyleSource, /\.hpr-best-window-label/, 'plot-internal record window labels should not keep unused styles');
assert.match(processReviewStyleSource, /--hpr-pressure-line:/, 'process review should theme the measured pressure line through an explicit variable');
assert.match(processReviewStyleSource, /--hpr-temperature-line:/, 'process review should theme the measured temperature line through an explicit variable');
assert.match(processReviewStyleSource, /--hpr-standard-process-line:/, 'process review should give the standard process curve its own line color');
assert.match(processReviewPanelSource, /var\(--hpr-pressure-line\)/, 'pressure chart should use the themed pressure line color');
assert.match(processReviewPanelSource, /var\(--hpr-temperature-line\)/, 'temperature chart should use the themed temperature line color');
assert.match(processReviewStyleSource, /\.hpr-standard-process-line\s*\{[\s\S]*stroke:\s*var\(--hpr-standard-process-line\)/, 'standard process curve should use its dedicated line color');
assert.doesNotMatch(processReviewStyleSource, new RegExp('\\.hpr-recommend' + 'ed-line|--hpr-recommend' + 'ed-line'), 'old orange reference line styles should be removed');
assert.match(processReviewPanelSource, /标准过程/, 'process review should render the standard process summary title');
assert.match(processReviewPanelSource, /同一参数和干扰条件/, 'standard process summary should state same-condition reference logic');
assert.match(processReviewPanelSource, /标准操作/, 'standard process summary should disclose standard-operation reference logic');
assert.match(processReviewPanelSource, /row\.details/, 'diagnosis rows should render expandable sub-score details');
assert.match(processReviewPanelSource, /expandedDiagnosisRows/, 'diagnosis rows should keep local expand-collapse state');
assert.match(processReviewPanelSource, /hpr-diagnosis-expand-open/, 'diagnosis expand chevrons should animate by rotating the same pointed glyph');
assert.match(processReviewPanelSource, /import \{[^}]*ChevronRight[^}]*\} from 'lucide-react';/, 'diagnosis expand controls should reuse the same lucide chevron family as the left tree');
assert.match(processReviewPanelSource, /<ChevronRight\s+aria-hidden="true"/, 'diagnosis expand controls should render one reusable chevron icon');
assert.doesNotMatch(processReviewPanelSource, /<span aria-hidden="true">▸<\/span>/, 'diagnosis expand controls should not use a separate text glyph');
assert.doesNotMatch(processReviewPanelSource, /expanded \? '▾' : '▸'/, 'diagnosis expand controls should not swap glyphs instead of rotating');
assert.doesNotMatch(processReviewStyleSource, /\.hpr-diagnosis-expand\s*\{[^}]*border:\s*1px/, 'diagnosis expand control should not be framed as a rounded rectangle button');
assert.doesNotMatch(processReviewStyleSource, /\.hpr-diagnosis-expand\s*\{[^}]*border-radius:/, 'diagnosis expand control should not use rounded rectangle styling');
assert.match(processReviewStyleSource, /\.hpr-diagnosis-expand svg\s*\{[\s\S]*transition:\s*transform/, 'diagnosis expand chevron should rotate smoothly');
assert.match(processReviewPanelSource, /hpr-diagnosis-details-shell-open/, 'diagnosis details should keep a dedicated animated expansion shell');
assert.match(processReviewPanelSource, /aria-hidden=\{!expanded\}/, 'collapsed diagnosis details should be hidden from assistive technology');
assert.match(processReviewStyleSource, /\.hpr-diagnosis-details-shell\s*\{[\s\S]*grid-template-rows:\s*0fr[\s\S]*460ms/, 'diagnosis details should expand from a collapsed grid row with a visible transition');
assert.match(processReviewStyleSource, /\.hpr-diagnosis-details-shell-open\s*\{[\s\S]*grid-template-rows:\s*1fr/, 'expanded diagnosis details should animate to their full row height');
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
assert.match(
  processReviewPanelSource,
  /Number\.isInteger\(score\) \? score\.toFixed\(0\) : score\.toFixed\(1\)/,
  'process review should display integer scores without decimals and half-point scores with one decimal',
);
assert.match(processReviewStyleSource, /\.hpr-summary-grid > div\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-direction:\s*column;/, 'summary metric cells should use column flex layout so help buttons do not shift value baselines');
assert.match(processReviewStyleSource, /\.hpr-summary-grid \.hpr-summary-label-with-help\s*\{[\s\S]*height:\s*15px;/, 'summary help labels should keep the same title-row height as ordinary labels');
assert.match(processReviewPanelSource, /localizedRow\.relation/, 'diagnosis rows should explain relation to best windows or reference');
assert.match(processReviewPanelSource, /localizedRow\.score/, 'diagnosis rows should display item scores');
assert.match(processReviewPanelSource, /mode !== 'free'/, 'process review scoring should remain Free Mode only');
assert.doesNotMatch(processReviewPanelSource, /demo[^\n]+upperBoundGamma|guide[^\n]+upperBoundGamma/, 'Demo and Guide modes should not render upper-bound scoring');
assert.match(workbenchSource, /heatCapacityReviewSelectionByFileId/, 'workbench should keep process-review group selection as runtime UI state');
assert.doesNotMatch(sessionSource, /heatCapacityReviewSelectionByFileId|selectedProcessReviewTrialId/, 'process-review group selection must not be saved in session payloads');
assert.doesNotMatch(processReviewPanelSource, /data-hpr-scroll-up="true"|data-hpr-scroll-down="true"/, 'process review should rely on the standard result-tab vertical scrollbar instead of custom up/down buttons');
assert.match(workbenchSource, /const materialsSelected = selectedPanel === 'results'/, 'Heat Capacity materials parent row should have its own selected state instead of inheriting child tab state');
assert.match(workbenchSource, /studio-heat-materials-group \$\{materialsSelected \? 'studio-panel-row-active' : ''\}/, 'Heat Capacity materials parent row should only highlight when the parent itself is selected');
assert.match(workbenchSource, /setSelectedPanel\('results'\);[\s\S]*data-prompt-tooltip=\{heatCapacityRealtimeCopy\.materialsFolderTitle\}/, 'clicking the Heat Capacity materials parent should select the parent row without selecting the first child and should use the internal tooltip');
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
assert.match(workbenchSource, /const getHeatCapacityMaterialsMaxHeightRatio = \(\) => \{[\s\S]*?liveWorkspaceRef\.current\?\.getBoundingClientRect\(\)[\s\S]*?const liveWorkspaceCoverageHeight = liveWorkspaceRect\.height;[\s\S]*?liveWorkspaceCoverageHeight \/ workspaceRect\.height/, 'Heat Capacity materials maximum height should match the live 3D workspace height when fully expanded');
assert.match(workbenchSource, /const maxHeightRatio = getHeatCapacityMaterialsMaxHeightRatio\(\)[\s\S]*?HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO[\s\S]*?maxHeightRatio/, 'Heat Capacity materials resize should clamp to the workspace-aware maximum height ratio');
assert.match(workbenchSource, /const materialsMaxHeightRatio = getHeatCapacityMaterialsMaxHeightRatio\(\)[\s\S]*?HEAT_CAPACITY_MATERIALS_MIN_HEIGHT_RATIO[\s\S]*?materialsMaxHeightRatio/, 'Heat Capacity materials render height should clamp to the same workspace-aware maximum height ratio');
assert.doesNotMatch(workbenchSource, /const HEAT_CAPACITY_MATERIALS_MAX_HEIGHT_RATIO = 0\.82;/, 'Heat Capacity materials window should not use a fixed low maximum height ratio');
assert.doesNotMatch(workbenchSource, /const HEAT_CAPACITY_MATERIALS_MAX_HEIGHT_RATIO = IDEAL_RESULT_MAX_HEIGHT_RATIO;/, 'Heat Capacity materials window should not blindly inherit the full-height ideal result maximum');
assert.match(processReviewPanelSource, /normalizeDiagnosisText/, 'process review should normalize diagnosis copy before rendering');
assert.match(processReviewPanelSource, /normalizeDiagnosisText\(localizedRow\.evidence,\s*copy\.noIssue\)/, 'process review should remove heavy punctuation from visible diagnosis evidence');
assert.match(processReviewPanelSource, /normalizeDiagnosisText\(detail\.localizedRecommendation,\s*copy\.noIssue\)/, 'process review should remove heavy punctuation from detail recommendations');
assert.doesNotMatch(processReviewPanelSource, /<span className="hpr-diagnosis-summary-cell">\{row\.evidence\}<\/span>/, 'process review should not render raw diagnosis text with full stops');
const processReviewTimelineOpeningTag = processReviewPanelSource.match(/<section[\s\S]{0,180}className="hpr-timeline-block"[\s\S]{0,180}>/)?.[0] ?? '';
assert.doesNotMatch(processReviewTimelineOpeningTag, /onMouseLeave/, 'stage hover highlight should not be controlled by the whole timeline block');
assert.doesNotMatch(processReviewPanelSource, /hpr-stage-expanded|isRelease && onStageHover/, 'stage hover should no longer keep release-only expansion logic');
assert.doesNotMatch(processReviewPanelSource, /hpr-stage-hit-area/, 'stage hover should not use a broad transparent hover area that covers control dots');
assert.match(processReviewPanelSource, /className="hpr-stage-bar"[\s\S]*?onMouseEnter=\{\(\) => onStageHover\(stage\.id\)\}[\s\S]*?onMouseLeave=\{\(\) => onStageHover\(null\)\}/, 'stage hover highlight should be limited to the visible stage bar itself');
assert.match(workbenchSource, /data-heat-capacity-free-record-controls="true"/, 'Free Mode record actions should have a stable UI marker');
assert.doesNotMatch(workbenchSource, /data-heat-capacity-mode-action="reset-free"/, 'Free Mode should not expose an ambiguous icon-only reset action in the mode control');
assert.match(workbenchSource, /data-heat-capacity-mode-action="reset-guide"/, 'Guide Mode should expose its own reset action in the mode control');
assert.match(workbenchSource, /data-heat-capacity-mode-action="exit-free"[\s\S]*exitHeatCapacityFormalModeToExplore\('free'\)/, 'Free Mode should expose an explicit exit action that returns to Explore');
assert.match(workbenchSource, /<FreeExperimentProgress[\s\S]*onSelect: requestRestartHeatCapacityFreeExperiment[\s\S]*onSelect: requestRestartHeatCapacityFreeGroup[\s\S]*onSelect: openNextHeatCapacityFreeExperimentGroupSetup/, 'the shared progress control should own both scoped restart actions and the approved next-group action');
assert.match(
  workbenchSource,
  /heatCapacityRealtimeCopy\.trialBadge\([\s\S]*activeHeatCapacityFreeBatchProgress\?\.currentGroupNumber[\s\S]*Math\.max\(1, getActiveHeatCapacityFreeTrialIndex\(activeFile\) \+ 1\)/,
  'the live-data badge should show experiment 1 while the current group is still a draft instead of experiment 0',
);
assert.match(
  workbenchSource,
  /const updateHeatCapacityPower[\s\S]*prepareNextHeatCapacityFreeExperimentWorkbenchState\(nextFile, now\)/,
  'powering off a completed non-final experiment should initialize the next experiment in the current group automatically',
);
assert.match(workbenchSource, /const restartHeatCapacityFreeExperiment = \(\) => \{[\s\S]*restartCurrentHeatCapacityFreeExperimentWorkbenchState\(file, now\)/, 'the current-experiment action should clear only the active experiment through its scoped state transition');
assert.match(workbenchSource, /const restartHeatCapacityFreeBatch = \(\) => \{[\s\S]*restartHeatCapacityFreeBatchWorkbenchState\(file, now\)/, 'the whole-group action should use the separate group restart transition');
assert.match(
  workbenchSource,
  /interactionLocked=\{[\s\S]*activeHeatCapacityCurrentGroup === null[\s\S]*activeHeatCapacityCurrentGroup\.status !== 'draft'[\s\S]*activeHeatCapacityCurrentGroup\.status !== 'collecting'/,
  'the instrument should become read-only while a group awaits processing or after that group is completed',
);
assert.match(workbenchSource, /const restartHeatCapacityFreeExperiment = \(\) => \{[\s\S]*resetHeatCapacityGroupUiRuntime\(\)/, 'restarting the current experiment should return the 3D preview and transient UI to their initial state');
assert.match(freeRunResetSource, /resetHeatCapacityFreeRunWorkbenchStateCore[\s\S]*resolveHeatCapacityFreeResetStructure\(file\)[\s\S]*powerOn:\s*false[\s\S]*stopcockAngleDeg:\s*HEAT_CAPACITY_STOPCOCK_CLOSED_ANGLE_DEG[\s\S]*pumpValveOpen:\s*false[\s\S]*heatCapacityFreeRunWorkspace:[\s\S]*trials:\s*resetStructure\.trials/, 'Free Mode reset should clear the current run and return apparatus controls to their initial state without deleting completed Free groups');
assert.match(freeRunResetSource, /resetHeatCapacityFreeRunWorkbenchStateCore[\s\S]*pressureZeroed:\s*false[\s\S]*pressureZeroKnobAngle:\s*0/, 'Free Mode reset should reset zeroing and zero-knob state');
assert.doesNotMatch(stateSource, /heatCapacityProcessingCalculated|heatCapacityProcessingResult/, 'Heat Capacity state should not keep legacy standalone processing result flags');
assert.match(workbenchSource, /heatCapacityResetFeedbackActionId/, 'Guide reset should retain its short visual feedback state');
assert.match(workbenchSource, /showHeatCapacityResetFeedback\('reset-guide'\)/, 'Guide reset should retain its feedback controller');
assert.doesNotMatch(workbenchSource, /showHeatCapacityResetFeedback\('reset-free'\)/, 'the removed Free Mode reset must not retain mode-bar feedback wiring');
assert.match(workbenchSource, /action\.id === heatCapacityResetFeedbackActionId[\s\S]*studio-heat-mode-action-feedback/, 'the matching Guide reset button should receive the feedback class');
assert.match(styleSource, /\.studio-heat-mode-action-feedback \{[\s\S]*animation:\s*studio-heat-reset-feedback/, 'Guide Mode reset feedback should keep its explicit animation style');
assert.match(styleSource, /\.studio-heat-mode-action-feedback svg \{[\s\S]*animation:\s*studio-heat-reset-icon-spin/, 'the Guide reset icon should rotate during feedback');
assert.match(styleSource, /@keyframes studio-heat-reset-feedback/, 'Guide Mode reset feedback should define the confirmation keyframes');
assert.match(workbenchSource, /const handleHeatCapacityModeSegmentClick[\s\S]*heatCapacityTeachingCompleted && heatCapacityActiveMode === mode[\s\S]*showHeatCapacityTeachingCompletedLockedInteraction\(\)/, 'Completed teaching should only lock repeated clicks on whichever teaching segment is currently active');
assert.doesNotMatch(workbenchSource, /if \(heatCapacityTeachingCompleted\) \{\s*showHeatCapacityTeachingCompletedLockedInteraction\(\);\s*return;\s*\}\s*if \(heatCapacityActiveMode !== 'demo'/, 'Completed demo state should not block switching directly to another mode');
assert.doesNotMatch(workbenchSource, /if \(heatCapacityTeachingCompleted\) \{\s*showHeatCapacityTeachingCompletedLockedInteraction\(\);\s*return;\s*\}\s*if \(heatCapacityActiveMode !== 'guide'/, 'Completed guide state should not block switching directly to another mode');
assert.doesNotMatch(workbenchSource, /if \(heatCapacityTeachingCompleted\) \{\s*showHeatCapacityTeachingCompletedLockedInteraction\(\);\s*return;\s*\}\s*if \(\s*heatCapacityActiveMode !== 'free'/, 'Completed teaching state should not block switching directly to Free Mode');
assert.match(leftPanelSource, /const shouldShowSingleTrialResult =[\s\S]*file\.heatCapacityTeachingStatus === 'completed'[\s\S]*file\.heatCapacityGuideTrial !== null/, 'completed Demo and Guide results should remain visible while the teaching mode is waiting for explicit exit');
assert.match(leftPanelSource, /file\.heatCapacityMode === 'free' && !shouldShowSingleTrialResult[\s\S]*renderFreeDataAndResultsTab/, 'ordinary Free Mode panels should route to the merged Data & Results page');
assert.match(leftPanelSource, /data-heat-capacity-record-source=\{file\.heatCapacityMode\}/, 'recording panel should expose the active record source');
assert.match(leftPanelSource, /automaticU0/, 'Free record table should show automatic U0 status');
assert.match(heatCapacityRealtimeCopySource, /dataResultsTitle:\s*'数据与结果'/, 'Free Mode materials should expose a localized merged Data & Results title');
assert.match(heatCapacityTabRegistrySource, /HEAT_CAPACITY_TAB_IDS = \[[\s\S]*?'guide'[\s\S]*?'records'[\s\S]*?'review'/, 'Heat Capacity materials should expose the fixed guide / records / review tab order');
assert.match(heatCapacityTabRegistrySource, /getHeatCapacityMaterialsTabOrder[\s\S]*?heatCapacityMode === 'guide'[\s\S]*?\['guide', 'records'\][\s\S]*?heatCapacityMode === 'free'[\s\S]*?\[\.\.\.HEAT_CAPACITY_TAB_IDS\]/, 'Heat Capacity materials should follow the Guide / Free mode matrix');
assert.match(workbenchSource, /getHeatCapacityMaterialsTabOrder\(activeFile\)/, 'Heat Capacity material tree/window should use the shared mode-aware tab order');
assert.match(workbenchSource, /getHeatCapacityPanelDisplayDefinition\(tabId,\s*panel\)/, 'Heat Capacity material labels should be overridable per mode');
assert.doesNotMatch(workbenchSource, /heatCapacityProcessing|activeHeatCapacityTabId:\s*'processing'/, 'Heat Capacity should delete the legacy processing tab instead of redirecting it');
assert.match(leftPanelSource, /freeRecording:\s*\{/, 'Free record table copy should be localized through copyByLanguage');
assert.match(leftPanelSource, /dataAndResultsTitle:\s*'数据与结果'/, 'Free merged data panel should expose a localized Data & Results title');
assert.match(leftPanelSource, /renderFreeDataAndResultsTab = \(\s*file:[\s\S]*copy: LocalizedText/, 'Free data/result page should receive localized copy instead of hard-coded English');
assert.match(leftPanelSource, /copy\.freeRecording\.(title|source|automaticCandidate|emptyRecords|trial)/, 'Free record table should render localized Free recording labels');
assert.match(leftPanelSource, /summaryLine:\s*\(\s*theoreticalGamma:\s*string,\s*trialCount:\s*number,\s*meanGamma:\s*string,\s*relativeError:\s*string\s*\) => `理论 γ = \$\{theoreticalGamma\}　有效实验次数 = \$\{trialCount\}　平均 γ = \$\{meanGamma\}　相对误差 = \$\{relativeError\}`/, 'Free result summary should use experiment-count terminology in the approved one-line Simplified Chinese wording');
assert.match(leftPanelSource, /renderFreeDataAndResultsTab = \(\s*file:[\s\S]*pendingRemoveTrialRecord:[\s\S]*onRemoveTrialRecord:[\s\S]*onCancelRemoveTrialRecord:/, 'Free data/result page should receive deletion confirmation callbacks');
assert.match(leftPanelSource, /selectDisplayedHeatCapacityFreeDomain\(file\)[\s\S]*calculateFreeHeatCapacityMeanResult\(displayedTrials/, 'Free data/result page should calculate γ and mean automatically from the selected display domain');
assert.match(leftPanelSource, /data-heat-capacity-free-result-summary="true"/, 'Free data/result page should include the derived result summary in the merged panel');
assert.match(leftPanelSource, /copy\.freeRecording\.summaryLine\([\s\S]*displayedTheoreticalGamma[\s\S]*result\.validTrialCount[\s\S]*result\.meanGamma[\s\S]*result\.relativeErrorPercent/, 'Free result summary should render one localized summary line with theory, experiment count, mean gamma, and relative error');
assert.match(leftPanelSource, /viewedGroup\?\.parameterSnapshot\?\.physics\.gamma \?\? file\.theoreticalGamma/, 'Free data/result page should use the viewed experiment group parameter snapshot for theoretical gamma');
assert.doesNotMatch(freeResultSummarySection, /file\.theoreticalGamma/, 'Free data/result summary should not use the file top-level gamma when the displayed domain is ideal');
assert.match(leftPanelSource, /formatPercent\(result\.relativeErrorPercent\)/, 'Free result summary should format relative error through the shared percent formatter');
assert.doesNotMatch(freeResultSummarySection, /<span>\{copy\.freeRecording\.resultSummaryTitle\}<\/span>|<span>\{result\.message\}<\/span>|γair =|γmean =/, 'Free result summary should not split into multiple table-like cells or show internal English result messages');
assert.doesNotMatch(leftPanelSource, /const renderFreeProcessingTab/, 'Free Mode should not keep a separate processing renderer after merging data and results');
assert.match(leftPanelSource, /getHeatCapacityFreeRecordDisplayTrialIndex\(displayTrialSource\)/, 'Free current-record display should use a display-domain index separate from the active action target');
assert.match(leftPanelSource, /displayFreeTrialIndex === activeFreeTrialIndex/, 'Free current-record row actions should only appear for the active editable trial, not the post-power-off review display');
assert.match(leftPanelSource, /data-heat-capacity-free-record-table="true"[\s\S]*copy\.table\.action/, 'Free record table should include an action column');
assert.match(leftPanelSource, /completedAt:\s*'完成时间'/, 'Free table copy should include a localized completion-time label');
assert.match(leftPanelSource, /u0Display:\s*'U₀ 记录值 \/ mV'/, 'Free table should label U0 as the recorded instrument value');
assert.match(leftPanelSource, /u1Display:\s*'U₁ 记录值 \/ mV'/, 'Free table should label U1 as the recorded instrument value');
assert.match(leftPanelSource, /u2Display:\s*'U₂ 记录值 \/ mV'/, 'Free table should label U2 as the recorded instrument value');
assert.match(leftPanelSource, /u1Corrected:\s*'U₁ 扣零值 \/ mV'/, 'Free table should label corrected U1 as zero-offset corrected');
assert.match(leftPanelSource, /u2Corrected:\s*'U₂ 扣零值 \/ mV'/, 'Free table should label corrected U2 as zero-offset corrected');
assert.doesNotMatch(leftPanelSource, /U₀ 显示 \/ mV|U₁ 显示 \/ mV|U₂ 显示 \/ mV|U₁ 修正 \/ mV|U₂ 修正 \/ mV/, 'Free table should avoid ambiguous display/corrected column wording');
assert.match(leftPanelSource, /formatFreeTrialCompletedAt/, 'Free tables should use a dedicated formatter for saved completion timestamps');
assert.match(leftPanelSource, /data-heat-capacity-free-record-table="true"[\s\S]*copy\.freeRecording\.completedAt[\s\S]*formatFreeTrialCompletedAt\(trial\.completedAtMs\)/, 'Free record table should show each saved group completion time');
assert.doesNotMatch(freeRecordTableHeaderSection, /copy\.freeRecording\.u1Corrected|copy\.freeRecording\.u2Corrected/, 'Free main record table should keep zero-corrected values out of the primary columns');
assert.doesNotMatch(freeCurrentTrialSection, /copy\.freeRecording\.calibration|calibrationVersion/, 'Free current-trial main table should not show internal calibration version values');
assert.match(freeCurrentTrialSection, /studio-heat-free-record-grid/, 'Free current-trial status grid should use the fixed five-column Free record grid class');
assert.match(styleSource, /\.studio-heat-free-record-grid \.studio-heat-sample-row\s*\{[\s\S]*grid-template-columns:\s*1\.4fr 0\.9fr 0\.8fr 0\.8fr 0\.9fr/, 'Free record grids should have a stable five-column layout after removing calibration');
assert.match(leftPanelSource, /const currentFreeTrialActionsVisible = canRemoveCurrentFreeU0 \|\| canRemoveCurrentFreeU1 \|\| canRemoveCurrentFreeU2/, 'Free current-trial status should compute whether row actions are actually visible');
assert.match(freeCurrentTrialSection, /currentFreeTrialActionsVisible \? <span>\{copy\.table\.action\}<\/span> : null/, 'Free current-trial status should not render an empty action header while reviewing a read-only completed group');
assert.match(leftPanelSource, /currentFreeTrialActionsVisible \? <span>\{action\}<\/span> : null/, 'Free current-trial rows should not reserve an empty action cell while actions are hidden');
assert.match(styleSource, /\.studio-heat-free-record-grid-readonly \.studio-heat-sample-row\s*\{[\s\S]*grid-template-columns:\s*1\.4fr 0\.9fr 0\.8fr 0\.8fr/, 'Free current-trial read-only status grid should collapse to four columns when no row action exists');
assert.match(leftPanelSource, /data-heat-capacity-free-trial-detail="true"[\s\S]*copy\.freeRecording\.u1Corrected[\s\S]*copy\.freeRecording\.u2Corrected/, 'Free trial details should keep zero-corrected U1/U2 available without duplicating the main columns');
assert.match(freeCurrentTrialSection, /renderRemoveRecordButton\(currentFreeTrialIndex,\s*'u0'[\s\S]*renderRemoveRecordButton\(currentFreeTrialIndex,\s*'u1'[\s\S]*renderRemoveRecordButton\(currentFreeTrialIndex,\s*'u2'/, 'Free current-trial status should expose delete actions for U0, U1, and U2');
assert.match(freeRecordTableSection, /renderRemoveRecordButton\(\s*index,\s*'trial'/, 'Free record table should expose only whole-group deletion');
assert.doesNotMatch(freeRecordTableSection, /renderRemoveRecordButton\(\s*index,\s*'u[012]'/, 'Free record table should not delete individual U0/U1/U2 values');
assert.doesNotMatch(simplifiedFreeCopySection, /'[^\n']*(Free|trial|automaticU0)[^\n']*'/, 'Simplified Chinese Free data/result copy should not expose internal English Free/trial/automaticU0 wording');
assert.doesNotMatch(freeCopySection, /\bcalibration:|\bprocessingTitle:|\bresultSummaryTitle:|\bvalidTrials:|\bcompleteTrialCount:|\bcalculate:|\bprocessingEmpty:|\bprocessingMessage:|\bvalid:/, 'Free data/result copy should not keep obsolete fields from the removed standalone processing UI');
assert.doesNotMatch(leftPanelSource, /<strong>Free Mode records<\/strong>|<span>Source: Free physical|<th>Trial<\/th>|<td colSpan=\{8\}>No Free Mode records yet|<span>Free Mode processing|<div className="studio-empty-panel-tree">Complete a Free Mode|<em>automaticU0<\/em>/, 'Free table JSX should not contain hard-coded English labels in the localized rendering path');
assert.match(leftPanelSource, /includedInMean|copy\.freeRecording\.included|copy\.freeRecording\.notCalculable/, 'Free trial details should disclose whether each group participates in the current average');
assert.doesNotMatch(leftPanelSource, /operationUpperBound|bestValue|bestOperation|操作上限|最佳值/, 'Batch 9 should not add operation scoring, best-value columns, or upper-bound output');
assert.doesNotMatch(workbenchSource, /operationUpperBound|bestValue|bestOperation|操作上限|最佳值/, 'Batch 9 should keep automatic U0 as data foundation only, without scoring UI');
assert.match(guideDataResultsRendererSection, /data-heat-capacity-guide-result-summary-grid="true"/, 'Guide data/result page should use a single-experiment summary grid');
assert.match(guideDataResultsRendererSection, /copy\.guideResult\.theoreticalGamma[\s\S]*file\.theoreticalGamma\.toFixed\(3\)/, 'Guide summary should show the theoretical gamma at the top level');
assert.match(guideDataResultsRendererSection, /copy\.guideResult\.zeroCorrectedPressure/, 'Guide record table should include zero-corrected pressure signal values');
assert.match(guideDataResultsRendererSection, /DocumentDisclosure[\s\S]*copy\.guideResult\.calculationDetails/, 'Guide data/result page should keep a collapsed calculation explanation');
assert.match(guideDataResultsRendererSection, /ln\(P₁ \/ P₀\) \/ ln\(P₁ \/ P₂\)/, 'Guide calculation explanation should use the absolute-pressure logarithm formula');
assert.doesNotMatch(guideDataResultsRendererSection, /Math\.log/, 'Guide calculation explanation should not expose JavaScript implementation syntax');
assert.doesNotMatch(guideDataResultsRendererSection, /data-heat-capacity-guide-result-table="true"/, 'Guide data/result page should remove the old separate one-row processing table');
assert.match(freeRuntimeCoordinatorSource, /stepFreePhysics\(/, 'Free Mode workbench stepping should call the Free physics engine');
assert.match(freeRuntimeCoordinatorSource, /stepFreeSensor\(/, 'Free Mode workbench stepping should call the Free sensor layer');
assert.match(sceneSource, /@react-three\/fiber/);
assert.match(sceneSource, /@react-three\/drei/);
assert.doesNotMatch(autoDemoSource, asciiSubscriptPattern, 'auto demo user-facing copy should use real Unicode subscripts instead of underscores');
assert.match(autoDemoSource, /HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER = 16 as const/, 'auto demo should define one fixed x16 wait speed');
assert.match(autoDemoSource, /standardWaitMs \/ HEAT_CAPACITY_AUTO_DEMO_WAIT_SPEED_MULTIPLIER/, 'auto demo wall-clock waits should compress the scripted five-minute duration by x16');
assert.doesNotMatch(autoDemoSource, /实际等待 5 min|不压缩等待时长|HEAT_CAPACITY_AUTO_DEMO_(?:STABILIZATION|RECOVERY)_ACTION_DURATION_MS/, 'the obsolete real five-minute Demo wait path should be physically removed');
assert.doesNotMatch(leftPanelSource, asciiSubscriptPattern, 'heat-capacity guide copy should use real Unicode subscripts instead of underscores');
assert.doesNotMatch(workbenchSource, /heatRealtimeHint:\s*'[^']*U_/, 'heat-capacity realtime hint should not expose underscore subscripts');
assert.doesNotMatch(`${hardSphereToggleSource}\n${freeParameterPanelModelSource}`, asciiSubscriptPattern, 'current hard-sphere teaching copy should not expose underscore subscripts');
assert.doesNotMatch(workbenchSource, /(recordDialogPressure|recordDialogTemperature|readyToZero|sealedStabilizing|recovering|delta):\s*'[^']*U_/, 'heat-capacity status and dialog copy should not expose underscore subscripts');
assert.match(workbenchCopySource, /heatRealtimeHint:\s*'Uₜ \/ Uₚ、压强和过程采样'/, 'Simplified Chinese realtime hint should use real subscripts');
assert.doesNotMatch(sceneSource, /<Html[\s\S]*(TemperatureDisplay|PressureDisplay|FD-NCD-C|INPUT|PRESS IN)/, 'instrument panel labels should not use camera-facing Html overlays');
assert.match(sceneSource, /CanvasTexture/, 'instrument panel labels should use 3D canvas textures attached to the instrument face');
assert.match(sceneSource, /new THREE\.CanvasTexture\(canvas\)[\s\S]*\}, \[\]\)/, 'instrument panel text should create one stable CanvasTexture instead of recreating it for every readout change');
assert.match(sceneSource, /window\.setTimeout\(drawTexture, updateIntervalMs - elapsedMs\)/, 'instrument panel text should throttle canvas texture redraws');
assert.match(sceneSource, /qualityProfile=\{qualityProfile\}/, 'heat-capacity scene content should receive the active quality profile');
assert.match(sceneSource, /performanceMode:\s*HeatCapacityQualityMode;/, 'heat-capacity scene should accept the four clear quality tiers');
assert.match(sceneSource, /sceneTheme:\s*'dark' \| 'light'/, 'heat-capacity 3D scene should receive the resolved workbench theme');
assert.match(workbenchSource, /sceneTheme=\{resolvedWorkbenchTheme\}/, 'workbench should pass the resolved light or dark theme into the heat-capacity 3D scene');
assert.match(sceneSource, /const heatCapacityScenePalettes/, 'heat-capacity 3D scene should centralize dark and light scene material palettes');
assert.match(sceneSource, /light:\s*\{[\s\S]*background:\s*'#eef4f8'[\s\S]*deck:\s*'#b8c6cc'/, 'light heat-capacity scene should separate the pale background from the cooler lab bench');
assert.match(sceneSource, /light:\s*\{[\s\S]*instrument:\s*\{[\s\S]*body:\s*'#f7f9f8'[\s\S]*face:\s*'#c6d1d6'/, 'light heat-capacity scene should make the host body brighter than its front panel');
assert.match(sceneSource, /light:\s*\{[\s\S]*leads:\s*\{[\s\S]*positive:\s*'#0077c8'[\s\S]*negative:\s*'#111827'[\s\S]*pressure:\s*'#f2efe6'/, 'light heat-capacity scene should give signal leads and the pressure hose distinct functional colors');
assert.match(sceneSource, /light:\s*\{[\s\S]*pump:\s*\{[\s\S]*tubeIdle:\s*'#f2efe6'[\s\S]*tubeActive:\s*'#0077c8'[\s\S]*bulbIdle:\s*'#a64834'/, 'light heat-capacity scene should separate hoses, active flow, and the pump bulb by material color');
assert.match(sceneSource, /light:\s*\{[\s\S]*stopcockGlass:\s*'#c9f0fa'/, 'light heat-capacity scene should give the glass stopcock a stronger dedicated glass tint');
assert.match(sceneSource, /light:\s*\{[\s\S]*stopcockEdge:\s*'#2f7592'/, 'light heat-capacity scene should give the glass stopcock a dedicated blue-gray outline');
assert.match(sceneSource, /light:\s*\{[\s\S]*stopcockBodyOpacity:\s*0\.32[\s\S]*stopcockCoreOpacity:\s*0\.44[\s\S]*stopcockHandleOpacity:\s*0\.82/, 'light heat-capacity scene should reduce over-transparent stopcock materials');
assert.match(sceneSource, /<color attach="background" args=\{\[scenePalette\.scene\.background\]\}/, 'heat-capacity Canvas background should come from the active scene palette');
assert.match(sceneSource, /scenePalette=\{scenePalette\}/, 'heat-capacity scene content should receive the active material palette');
assert.match(sceneSource, /const scenePalette = heatCapacityScenePalettes\[sceneTheme\];[\s\S]*const canvasProps = useMemo/, 'scene theme palette selection should stay independent from performance-mode DPR selection');
assert.match(hardSphereLayerSource, /sceneTheme:\s*HeatCapacityHardSphereSceneTheme/, 'hard-sphere particles should receive the 3D scene theme for light-mode contrast');
assert.match(sceneSource, /sceneTheme=\{props\.sceneTheme\}/, 'hard-sphere particle layer should receive the active scene theme');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-instrument-scene/, 'light theme should style the heat-capacity 3D container separately');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-preview-stage \{[\s\S]*background:\s*#eef4f8;/, 'light theme heat-capacity preview stage should match the redesigned pale scene background');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-instrument-scene \{[\s\S]*background:\s*#eef4f8;/, 'light theme heat-capacity instrument scene should match the redesigned pale scene background');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-focus-panel/, 'light theme should restyle heat-capacity 3D focus panels');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-hard-sphere-tooltip/, 'light theme should restyle the hard-sphere tooltip');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-demo-step-panel/, 'light theme should restyle the heat-capacity auto-demo step panel');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-demo-complete-toast/, 'light theme should restyle centered heat-capacity demo and guide status toasts');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-pressure-warning/, 'light theme should restyle the centered heat-capacity pressure alarm panel');
assert.match(sceneSource, /dpr:\s*qualityProfile\.dpr/, '3D output DPR should come from the active quality profile');
assert.match(sceneSource, /isOrbitInteracting \|\| qualityProfile\.reduceInteractionQuality/, 'interaction quality reduction should come from the active quality profile');
assert.match(sceneSource, /const highClarityMode = props\.qualityProfile\.highClarityProcedural;/, 'high-clarity rendering extras should be enabled through the active quality profile');
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
assert.match(sceneSource, /gl: \{ preserveDrawingBuffer: false \}[\s\S]*\}\), \[applyInitialCameraPose, cameraViewScheme, canvasInitialCameraPose, qualityProfile\]\);/, 'quality-mode canvas memoization should include the active camera scheme and runtime-recovery pose without enabling WebGL buffer retention');
assert.match(sceneSource, /const panelTextUpdateIntervalMs = panelTextInteractionReduced[\s\S]*\?\s*qualityProfile\.panelTextDraggingUpdateIntervalMs[\s\S]*:\s*qualityProfile\.panelTextUpdateIntervalMs/, 'digital screen refresh should come from the active quality profile');
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
assert.doesNotMatch(hardSphereToggleSource, /title=\{disabled \? undefined : enabled \? copy\.tooltipOn : copy\.tooltipOff\}/, 'hard-sphere toggle should not keep the old browser-native tooltip path');
assert.match(hardSphereToggleSource, /aria-label=\{enabled \? copy\.tooltipOn : copy\.tooltipOff\}/, 'hard-sphere toggle should keep accessible tooltip copy without native title UI');
assert.match(sceneSource, /data-heat-capacity-hard-sphere-tooltip="true"/, 'hard-sphere explanation should have a stable tooltip marker');
assert.doesNotMatch(sceneSource, /const hardSphereViewUnavailable = props\.performanceMode === 'ultra'/, 'Ultra GLB tier should no longer disable the hard-sphere teaching layer');
assert.match(sceneSource, /const hardSphereViewActive = props\.hardSphereViewEnabled;/, 'Ultra GLB tier should preserve the saved hard-sphere enabled state');
assert.match(sceneSource, /const hardSphereTooltipId = 'heat-capacity-hard-sphere-tooltip';/, 'hard-sphere explanation should remain available from the toggle hover anchor in Ultra');
assert.doesNotMatch(sceneSource, /studio-heat-hard-sphere-tooltip-anchor[\s\S]*title=\{`\$\{hardSphereNoteCopy\.title\}/, 'hard-sphere explanation should not duplicate the custom tooltip with a browser-native title');
assert.match(sceneSource, /studio-heat-hard-sphere-tooltip-anchor[\s\S]*aria-label=\{`\$\{hardSphereNoteCopy\.title\}/, 'hard-sphere explanation should keep accessible copy on the custom tooltip anchor');
assert.match(sceneSource, /\{hardSphereTooltipId \? \([\s\S]*data-heat-capacity-hard-sphere-tooltip="true"[\s\S]*\) : null\}/, 'hard-sphere explanation panel should remain available for all supported model tiers');
assert.doesNotMatch(sceneSource, /data-heat-capacity-hard-sphere-note="true"/, 'hard-sphere explanation should not remain as a persistent note panel');
assert.match(
  sceneSource,
  /sceneAnimationClockActive = !props\.hardSpherePaused && !restoreAnimationsPaused;[\s\S]*hardSphereAnimationActive = hardSphereViewActive && sceneAnimationClockActive;[\s\S]*sceneShouldAnimate = sceneAnimationClockActive &&/,
  'a paused or restoring scene should request one state-change frame without keeping any Demo, pump, release, pulse, or particle 30fps invalidator alive',
);
assert.match(
  workbenchSource,
  /if \([\s\S]*!autoDemoRunning \|\|[\s\S]*heatCapacityRefreshRestoring \|\|[\s\S]*desktopExitQuiesced \|\|[\s\S]*heatCapacityRuntimeFailureFileId !== null[\s\S]*\) return undefined;[\s\S]*window\.setInterval\(refreshClock, 50\)/,
  'the Demo display clock must not advance or re-render while hydration, desktop exit, or runtime failure freezes the experiment',
);
assert.match(
  workbenchSource,
  /heatCapacityAutoDemoElapsedMs =[\s\S]*heatCapacityRefreshRestoring[\s\S]*initialHeatCapacityRefreshSession\.demo\.elapsedMs[\s\S]*desktopExitQuiesced[\s\S]*desktopExitAutoDemoClockRef\.current\.elapsedMs/,
  'a frozen Demo should render the persisted or desktop-quiesced elapsed time instead of deriving time from an uninitialized live clock',
);
assert.match(sceneSource, /data-heat-capacity-hard-sphere-view=\{hardSphereViewActive \? 'true' : undefined\}/, 'Ultra GLB tier should expose the particle-view scene marker when particles are enabled');
assert.match(sceneSource, /<InstrumentSceneContent[\s\S]*hardSphereViewEnabled=\{hardSphereViewActive\}/, 'procedural fallback should receive the effective hard-sphere visibility state');
assert.match(sceneSource, /<HeatCapacityUltraInstrumentModel[\s\S]*hardSphereViewEnabled=\{hardSphereViewActive\}/, 'Ultra GLB model should receive the enabled effective hard-sphere visibility state');
assert.match(hardSphereLayerSource, /containerProfile\?: 'skeleton-box' \| 'ultra-cylinder';/, 'hard-sphere layer should expose separate container profiles for the procedural skeleton and Ultra GLB');
assert.match(hardSphereLayerSource, /createHeatCapacityHardSphereCylinderContainer/, 'hard-sphere layer should create an Ultra cylinder container instead of reusing the skeleton box');
assert.match(hardSphereLayerSource, /particleRadius: PARTICLE_RADIUS,[\s\S]*particleCountScale: 1,[\s\S]*'ultra-cylinder':[\s\S]*particleRadius: ULTRA_HARD_SPHERE_PARTICLE_RADIUS,[\s\S]*particleCountScale: 0\.525/, 'Ultra GLB should use the conservative particle population without changing the skeleton profile');
assert.match(hardSphereLayerSource, /particleCountScale:\s*hardSphereProfile\.particleCountScale/, 'hard-sphere visual state should resolve the active profile particle-count scale in one population model');
assert.match(hardSphereLayerSource, /targetParticleCount:\s*currentVisual\.targetParticleCount/, 'hard-sphere simulation should consume the canonical visual particle target without a second scaling stage');
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
assert.doesNotMatch(hardSphereLayerSource, /material\.needsUpdate\s*=\s*true/, 'per-frame hard-sphere uniform changes must not force Three.js shader program recompilation');
assert.match(hardSphereLayerSource, /return scratchParticleColor\.copy\(temperatureColor\)/, 'hard-sphere instance colors should use the resolved temperature color directly');
assert.match(hardSphereLayerSource, /setColorAt/, 'hard-sphere particles should update instance colors from their current temperature color');
assert.match(hardSphereLayerSource, /instanceColor\.needsUpdate/, 'hard-sphere particle color changes should reach the instanced mesh');
assert.match(hardSphereLayerSource, /HEAT_CAPACITY_HARD_SPHERE_VISUAL_SMOOTHING_RESPONSE_S/, 'hard-sphere temperature color should use a visible smoothing response instead of jumping to the target color');
assert.match(hardSphereLayerSource, /displayVisualStateRef/, 'hard-sphere layer should keep a display visual state separate from the instantaneous target state');
assert.match(hardSphereLayerSource, /smoothHeatCapacityHardSphereVisualState/, 'hard-sphere layer should smooth temperature-driven visual fields frame by frame');
assert.match(hardSphereLayerSource, /applyVisualMaterial\(particleMaterial,\s*displayVisualState,/, 'hard-sphere material glow should use the smoothed display visual state');
assert.match(hardSphereLayerSource, /renderParticlePool\([\s\S]*displayVisualState,[\s\S]*sceneTheme,[\s\S]*\);/, 'hard-sphere instance colors should use the smoothed display visual state');
assert.match(hardSphereLayerSource, /!enabled \|\|[\s\S]*const mesh = meshRef\.current;[\s\S]*if \(!mesh\) return;[\s\S]*renderParticlePool\(\s*mesh,/, 'a mode restore must wait for an enabled, mounted particle mesh instead of writing into a null instance pool');
assert.match(hardSphereLayerSource, /depthTest:\s*true/, 'hard-sphere particles should respect scene depth and not cover foreground instruments');
assert.doesNotMatch(hardSphereLayerSource, /depthTest:\s*false/, 'hard-sphere particles should not render as an always-on-top overlay');
assert.doesNotMatch(hardSphereLayerSource, /particle\.size|size:\s*0\.88/, 'hard-sphere particles should keep a uniform visual size');
assert.doesNotMatch(hardSphereLayerSource, /exitScale/, 'hard-sphere particles should not shrink during release; visible particles should keep a constant radius until hidden');
assert.match(hardSphereLayerSource, /dummyObject\.scale\.setScalar\(visible \? particleRadius : 0\)/, 'hard-sphere particles should render at the active profile radius whenever visible');
assert.doesNotMatch(hardSphereLayerSource, /renderOrder=\{8\}/, 'hard-sphere particles should not use a high render order that covers the instrument');
assert.match(sceneSource, /name="VesselGlassCube"[\s\S]{0,320}depthWrite=\{false\}/, 'transparent glass bottle should not hide internal hard-sphere particles through depth writes');
assert.match(sceneSource, /name="BottleMouthNeck"[\s\S]{0,320}depthWrite=\{false\}/, 'transparent bottle neck should not hide internal hard-sphere particles through depth writes');
assert.match(sceneSource, /name="BottleMouthRim"[\s\S]{0,320}depthWrite=\{false\}/, 'transparent bottle rim should not hide internal hard-sphere particles through depth writes');
assert.match(sceneSource, /name="TopNeck"[\s\S]{0,320}depthWrite=\{false\}/, 'transparent top neck should not hide internal hard-sphere particles through depth writes');
assert.doesNotMatch(hardSphereLayerSource, /args=\{\[undefined,\s*undefined,/, 'hard-sphere instanced mesh should not initialize with empty geometry and material');
assert.match(sceneSource, /gasAmountRatio=\{props\.gasAmountRatio\}/, 'hard-sphere scene should pass physical gas amount so particle count matches pumped and released gas');
assert.match(sceneSource, /gasTemperatureK=\{props\.gasTemperatureK\}/, 'hard-sphere scene should pass physical gas temperature for color and speed mapping');
assert.match(sceneSource, /ambientTemperatureK=\{props\.ambientTemperatureK\}/, 'hard-sphere scene should pass ambient temperature for relative thermal visualization');
assert.match(sceneSource, /light:\s*\{[\s\S]*scene:\s*\{[\s\S]*deck:\s*'#b8c6cc'/, 'procedural light scene should use a cooler blue-gray workbench deck that separates from the pale scene background');
assert.match(sceneSource, /dark:\s*\{[\s\S]*scene:\s*\{[\s\S]*deck:\s*'#252b35'/, 'procedural dark scene should use a neutral charcoal workbench deck for stronger particle contrast');
assert.match(sceneSource, /hardSpherePaused:\s*boolean/, 'heat-capacity scene should accept a hard-sphere pause flag for guided record checkpoints');
assert.match(hardSphereLayerSource, /paused\?:\s*boolean/, 'hard-sphere layer should expose a pause input instead of only freezing Workbench physics state');
assert.match(hardSphereLayerSource, /if\s*\(paused\)\s*return;/, 'hard-sphere layer should stop particle simulation without rebuilding positions while guided checkpoints are paused');
assert.match(workbenchSource, /const heatCapacityHardSpherePaused =[\s\S]*activeFile\.runState === 'paused'[\s\S]*autoDemoPaused/, 'explicit demo or guide UI pause should also pause hard-sphere particle motion');
assert.match(workbenchSource, /const heatCapacityHardSphereGasAmountRatio =/, 'Workbench should derive hard-sphere gas amount through a mode-aware visual source');
assert.match(workbenchSource, /activeFile\.heatCapacityMode === 'guide'[\s\S]*activeFile\.heatCapacityGuidePhysicsState\.gasAmountRatio/, 'Guide hard-sphere visualization should use Guide physics gas amount, not stale Free physics');
assert.match(workbenchSource, /activeFile\.heatCapacityMode === 'guide'[\s\S]*activeFile\.heatCapacityGuidePhysicsState\.gasTemperatureK/, 'Guide hard-sphere visualization should use Guide physics gas temperature for color and speed mapping');
assert.doesNotMatch(workbenchSource, /gasAmountRatio=\{activeFile\.heatCapacityFreeInstrumentState\.physics\.gasAmountRatio\}/, 'Workbench should not pass Free gas amount directly to all Heat Capacity modes');
assert.doesNotMatch(workbenchSource, /gasTemperatureK=\{activeFile\.heatCapacityFreeInstrumentState\.physics\.gasTemperatureK\}/, 'Workbench should not pass Free gas temperature directly to all Heat Capacity modes');
assert.match(sceneSource, /glassStopcockOpen=\{stopcockState === 'open'\}/, 'procedural hard-sphere scene should pass the visual glass stopcock angle for directed outlet drift');
assert.match(ultraModelSource, /glassStopcockOpen=\{getHeatCapacityStopcockState\(props\.stopcockAngleDeg\) === 'open'\}/, 'Ultra hard-sphere scene should pass the visual glass stopcock angle for directed outlet drift');
assert.match(hardSphereModelSource, /type HeatCapacityHardSphereReleasePhase[\s\S]*'post-release-exchange'/, 'hard-sphere model should define an explicit release timeline phase for long-open exchange');
assert.match(sceneSource, /releaseTimeline:\s*HeatCapacityHardSphereReleaseTimeline/, 'instrument scene should receive the hard-sphere release timeline');
assert.match(sceneSource, /releaseTimeline=\{props\.releaseTimeline\}/, 'instrument scene should pass the release timeline into the hard-sphere layer');
assert.match(sceneSource, /<HeatCapacityUltraInstrumentModel[\s\S]*releaseTimeline=\{props\.releaseTimeline\}/, 'Ultra model should receive the same hard-sphere release timeline props');
assert.match(workbenchSource, /scheduleHeatCapacityAutoDemoLockedPointerToast/, 'demo locked pointer fallback should be scheduled instead of firing immediately from the preview wrapper');
assert.match(workbenchSource, /cancelHeatCapacityAutoDemoLockedPointerToast/, '3D control locked interactions should cancel the wrapper fallback toast to avoid duplicate locked messages');
assert.doesNotMatch(workbenchSource, /onPointerDownCapture=\{\(event\) => \{[\s\S]{0,360}if \(autoDemoInteractionLocked\) showHeatCapacityAutoDemoLockedToast\(\);/, 'preview wrapper should not immediately show the demo locked toast before 3D controls handle the same gesture');
assert.match(hardSphereLayerSource, /releaseTimeline\?:\s*HeatCapacityHardSphereReleaseTimeline/, 'hard-sphere layer should consume a release timeline instead of inferring release solely from pressure');
assert.match(hardSphereLayerSource, /getHeatCapacityHardSphereScheduleFrame/, 'hard-sphere layer should use the deterministic visual schedule for release budgeting');
assert.match(hardSphereLayerSource, /assignedReleaseExitCountRef/, 'hard-sphere layer should track only exit assignments accepted by the simulation');
assert.match(hardSphereLayerSource, /exitAssignmentCount[\s\S]*assignedReleaseExitCountRef\.current/, 'hard-sphere layer should retry any assignment budget the simulation could not accept');
assert.match(hardSphereLayerSource, /acceptedReleaseExitCount/, 'release accounting should advance from the simulation result rather than the requested budget');
assert.match(hardSphereLayerSource, /particleCountScale:\s*0\.525/, 'the Ultra cylinder should use the conservative 70-percent particle population');
assert.match(hardSphereLayerSource, /releaseScheduleDeltaS\s*=\s*Math\.min\(Math\.max\(delta,\s*0\),\s*0\.5\)/, 'hard-sphere release schedule should advance from visual frame time instead of the capped physics substep delta');
assert.match(sceneSource, /hardSphereVisualResetKey:\s*number/, 'heat-capacity scene should accept a hard-sphere visual reset key');
assert.match(workbenchSource, /const \[heatCapacityHardSphereVisualResetKey,\s*setHeatCapacityHardSphereVisualResetKey\] = useState\(0\)/, 'hard-sphere particle reset should have its own key separate from focus camera resets');
assert.match(workbenchSource, /hardSphereVisualResetKey=\{heatCapacityHardSphereVisualResetKey\}/, 'Heat Capacity scene should pass the dedicated hard-sphere reset key');
assert.doesNotMatch(workbenchSource, /hardSphereVisualResetKey=\{heatCapacityFocusResetKey\}/, 'recording or focus camera resets should not rebuild the hard-sphere particle pool');
assert.match(hardSphereLayerSource, /visualResetKey\?:\s*number/, 'hard-sphere layer should accept reset events from the workbench');
assert.match(hardSphereLayerSource, /const resetSignature = `\$\{enabled\}:\$\{containerProfile\}:\$\{particleMultiplier\}:\$\{visualResetKey\}`[\s\S]*lastResetSignatureRef\.current = resetSignature;[\s\S]*simulationRef\.current = createSimulation/, 'hard-sphere layer should rebuild the particle pool when reset events, container profiles, or performance particle presets change');
assert.match(
  hardSphereLayerSource,
  /const \[restoredInitialCheckpoint\] = useState\(\(\) => \([\s\S]*normalizeHeatCapacityHardSphereVisualCheckpoint[\s\S]*const \[initialSimulation\] = useState\(\(\) => \([\s\S]*createSimulationFromCheckpoint[\s\S]*useRef<HeatCapacityHardSphereSimulation>\(initialSimulation\)/,
  'ordinary React rerenders must not renormalize the initial 128-particle checkpoint or recreate the simulation',
);
assert.doesNotMatch(
  hardSphereLayerSource,
  /useRef<HeatCapacityHardSphereSimulation>\(\s*createSimulationFromCheckpoint/,
  'useRef arguments must not eagerly allocate a discarded hard-sphere simulation on every render',
);
assert.match(workbenchSource, /HEAT_CAPACITY_RELEASE_TIMING\.autoDemoReleaseDurationS/, 'particle visualization should read the canonical release timing config');
assert.match(workbenchSource, /const heatCapacityHardSphereReleaseTimeline/, 'Workbench should build a unified hard-sphere release timeline for the scene');
assert.match(workbenchSource, /phase:\s*'post-release-exchange'/, 'Workbench should map long-open stopcock state to post-release exchange for hard-sphere visualization');
assert.match(workbenchSource, /const heatCapacityPhysicalReleaseReference = activeFile\.heatCapacityMode === 'guide'[\s\S]*activeFile\.heatCapacityGuidePhysicsState\.releaseReference[\s\S]*activeFile\.heatCapacityFreeInstrumentState\.physics\.releaseReference/, 'Free and Guide modes should drive particle release from their own physical release reference');
assert.match(workbenchSource, /const physicalReleaseFlowActive = activeHeatCapacityUsesVisualPhysics[\s\S]*heatCapacityPhysicalStopcockFlowOpen[\s\S]*heatCapacityPhysicalReleaseReference !== null[\s\S]*activeFile\.pressureDeltaKPa > HEAT_CAPACITY_RELEASE_NEAR_AMBIENT_KPA/, 'Free and Guide release flow should use the common release state and live pressure difference');
assert.match(workbenchSource, /const teachingReleaseFlowActive = !activeHeatCapacityUsesVisualPhysics[\s\S]*isHeatCapacityMainReleaseFlowOpen\(activeFile\.heatCapacityReleaseState\)/, 'Demo mode should use the same main-release state as physical modes');
assert.match(workbenchSource, /const releaseFlowActive = physicalReleaseFlowActive \|\| teachingReleaseFlowActive/, 'release-flow note and scheduled release budget should combine physical and teaching modes');
assert.match(workbenchSource, /const stopcockFlowOpen = activeHeatCapacityUsesVisualPhysics[\s\S]*heatCapacityPhysicalStopcockFlowOpen[\s\S]*teachingStopcockFlowOpen/, 'release timeline state should come from the relevant physical or teaching mode');
assert.match(workbenchSource, /setHeatCapacityFreeStopcockOpen/, 'Free Mode stopcock interaction should route through the unified release-state action');
assert.match(sceneSource, /pressureDeltaKPa=\{props\.pressureDeltaKPa\}/, 'hard-sphere scene should still pass runtime pressure difference for secondary flow intensity and gauges');
assert.match(hardSphereLayerSource, /pressureDeltaKPa\?:\s*number/, 'hard-sphere particle layer should accept runtime pressure difference independent of powered instrument readouts');
assert.match(hardSphereLayerSource, /gasAmountRatio\?:\s*number/, 'hard-sphere particle layer should accept physical gas amount for molecule count');
assert.match(hardSphereModelSource, /const actualOutflow = input\.glassStopcockOpen === true &&[\s\S]*Math\.abs\(pressureDeltaKPa\) > HEAT_CAPACITY_HARD_SPHERE_OUTFLOW_EQUILIBRIUM_KPA/, 'hard-sphere directed drift should depend only on glass stopcock angle and pressure difference');
assert.match(hardSphereLayerSource, /material\.emissiveIntensity = clampNumber\(\s*particleColors\.emissiveBase \+ visualState\.emissiveIntensity \* particleColors\.emissiveScale/, 'hard-sphere particle brightness should be theme-specific instead of sharing one dark-scene formula');
assert.match(stateSource, /HEAT_CAPACITY_RELEASE_PRESSURE_DELTA_THRESHOLD_KPA/, 'workbench state should use an explicit pressure-difference threshold for stopcock release');
assert.doesNotMatch(teachingLifecycleStateSource, /prepareHeatCapacityAutoDemoStart[\s\S]{0,2600}hardSphereViewEnabled:\s*false/, 'auto demo start should not clear the hard-sphere teaching toggle');
assert.doesNotMatch(teachingResultStateSource, /completeHeatCapacityTeachingModeWorkbenchState[\s\S]{0,1800}hardSphereViewEnabled:\s*false/, 'returning from teaching mode should not clear the hard-sphere teaching toggle');
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
assert.match(sceneSource, /PUMP_VALVE_TRANSITION_MS = 420/, 'pump valve demo/user animation should remain visibly smooth');
assert.match(sceneSource, /const durationMs = targetAngle > startAngle[\s\S]*HEAT_CAPACITY_RELEASE_TIMING\.openingAnimationDurationMs[\s\S]*HEAT_CAPACITY_RELEASE_TIMING\.closingAnimationDurationMs/, 'glass stopcock transition should read both canonical animation durations');
assert.match(sceneSource, /demoHalo:\s*'#67e8f9'/, 'dark focus halo should use the unified higher-contrast guide cue color');
assert.match(sceneSource, /light:\s*\{[\s\S]*effects:\s*\{[\s\S]*demoHalo:\s*'#0ea5e9'[\s\S]*demoHaloMinOpacity:\s*0\.4[\s\S]*demoHaloMaxOpacity:\s*0\.78/, 'light focus halo should have a stronger independent breathing range');
assert.match(sceneSource, /const getHeatCapacityGuideCuePulse = \(elapsedS: number, cyclesPerSecond = 0\.58\) => \{[\s\S]*const phase =/, 'focus cues should share one smooth periodic pulse helper');
assert.match(sceneSource, /0\.5 - 0\.5 \* Math\.cos\(phase \* Math\.PI \* 2\)/, 'focus cue pulse should ease in and out at the loop boundary instead of using a jump-prone sawtooth phase');
assert.match(sceneSource, /const scale = focusHaloBaseScale \+ pulse \* focusHaloPulseScale/, 'auto demo focus halo should read its pulse scale from explicit props');
assert.match(sceneSource, /materialRef\.current\.opacity = focusHaloMinOpacity \+ pulse \* \(focusHaloMaxOpacity - focusHaloMinOpacity\)/, 'auto demo focus halo should read opacity from theme-specific props');
assert.match(sceneSource, /focusHaloMinOpacity=\{scenePalette\.effects\.demoHaloMinOpacity\}/, 'focus halo opacity should come from the active scene palette');
assert.match(sceneSource, /light:\s*\{[\s\S]*nonBulbHoverHaloOpacity:\s*0\.34[\s\S]*glassHoverHaloOpacity:\s*0\.3[\s\S]*pumpBulbHoverHaloOpacity:\s*0\.36/, 'light hover halos should be stronger than the dark-mode defaults');
assert.doesNotMatch(sceneSource, /function PumpBulbFocusCue|PumpBulbFocusCueWarmGlow|PumpBulbFocusCuePressHint|warmGlowColor|pumpBulbCueScale/, 'pump bulb guide cue should delete the old dedicated warm/internal flash implementation');
assert.match(sceneSource, /<DemoFocusHalo[\s\S]*name="DemoFocusHaloPumpBulb"[\s\S]*focusHaloColor=\{scenePalette\.effects\.demoHalo\}[\s\S]*<sphereGeometry args=\{\[0\.255, 36, 24\]\}/, 'procedural pump bulb guide cue should use the shared focus halo from the bulb surface');
assert.doesNotMatch(sceneSource, /PumpBulbFocusCueBandA|PumpBulbFocusCueBandB|<torusGeometry args=\{\[0\.32, 0\.014, 12, 56\]\}/, 'pump bulb guide cue should delete the old contour ring meshes');
assert.match(ultraModelSource, /id: 'pumpBulb'[\s\S]*focusShellNodeNames: \['Pump_Bulb', 'Pump_RearSoftEnd', 'Pump_Nozzle', 'Pump_NozzleClamp'\]/, 'Ultra GLB pump bulb focus cue should use the visible pump bulb assembly surface shells like the other controls');
assert.doesNotMatch(ultraModelSource, /focusCueKind|HSL_UltraPumpBulbFocusCue|pumpBulbCueWarmGlow|pumpBulbCuePressHint|pumpBulbCueScale/, 'Ultra GLB pump bulb focus cue should delete the old dedicated warm/internal flash implementation');
assert.match(sceneSource, /name="pumpValveHandle" position=\{\[0, 0, 0\]\} rotation=\{\[0, valveHandleAngle(?: \+ valveRollbackOffset)?, 0\]\}/, 'pump valve handle should rotate around its own vertical center axis in a horizontal plane');
assert.match(sceneSource, /name="pumpValveWingHandle" position=\{\[0, 0\.18, 0\]\}/, 'pump valve wing should sit above the fixed inline body while rotating around the valve body center axis');
assert.doesNotMatch(sceneSource, /name="pumpValveHandle"[\s\S]{0,120}rotation=\{\[0, 0, valveHandleAngle\]\}/, 'pump valve handle should not flip around the screen-facing Z axis');
assert.match(sceneSource, /onPumpValveToggle/, 'instrument scene should receive pump valve state updates from the workbench');
assert.match(sceneSource, /onPumpBulbPress/, 'instrument scene should report pump bulb presses to the workbench state');
assert.match(sceneSource, /pumpPulseId: number/, 'pump bulb visual feedback should receive a UI-only retrigger signal');
assert.match(sceneSource, /pumpPulseId=\{props\.pumpPulseId\}/, 'pump pulse signal should reach the pump assembly without being persisted in experiment state');
assert.match(
  pumpValveSceneSection,
  /lastHandledPumpPulseIdRef = useRef\(pumpPulseId\)[\s\S]*?previousPumpPulseId = lastHandledPumpPulseIdRef\.current[\s\S]*?lastHandledPumpPulseIdRef\.current = pumpPulseId[\s\S]*?pumpPulseId <= previousPumpPulseId/,
  'mounting a procedural scene with another file\'s historical pump pulse must establish a baseline instead of replaying it',
);
assert.match(sceneSource, /releaseTimerId = window\.setTimeout\(\(\) => \{[\s\S]*setPumpPulseVisualState\('releasing'\);[\s\S]*\}, 120\);/, 'procedural pump pulse should align its release transition with the workbench pump state timer');
assert.match(sceneSource, /idleTimerId = window\.setTimeout\(\(\) => \{[\s\S]*setPumpPulseVisualState\('idle'\);[\s\S]*\}, 380\);/, 'procedural pump pulse should hold local visual ownership until after the workbench pump state returns idle');
assert.doesNotMatch(sceneSource, /setPumpPulseVisualState\('idle'\);[\s\S]{0,80}\}, 280\);/, 'procedural pump pulse must not fall back to the persisted releasing state and twitch a second time');
assert.match(ultraModelSource, /const ULTRA_PUMP_PULSE_VISUAL_HOLD_S = 0\.42;/, 'Ultra GLB pump morph should define one visual ownership window per pump press');
assert.match(ultraModelSource, /pumpPulseVisualUntilRef/, 'Ultra GLB pump morph should remember the active pump pulse ownership window');
assert.match(ultraModelSource, /const pumpPulseOwnsVisual = clock\.elapsedTime < pumpPulseVisualUntilRef\.current;[\s\S]*if \(!props\.restorePaused && !pumpPulseOwnsVisual && props\.pumpBulbState !== 'idle'\)/, 'Ultra GLB pump morph should not let persisted pump state create a second twitch during the active pulse');
assert.match(sceneSource, /focusMode=\{props\.focusMode\}/, 'pump assembly should know whether it is in pump focus mode');
assert.match(sceneSource, /onPointerDown=\{focusMode === 'pump' \? handlePumpBulbPointerDown : undefined\}/, 'pump bulb pointer-down presses must remain unavailable before pump focus in every user mode');
assert.match(sceneSource, /if \(focusMode === 'pump'\) return;/, 'pump focus mode click events should not be filtered by click detail or double count after pointer down');
assert.doesNotMatch(sceneSource, /name="pumpBulb"[\s\S]*onClick=\{\(event\) => \{[\s\S]*onPumpBulbPress\(\);[\s\S]*onDoubleClick/, 'single-clicking the pump bulb outside pump focus should not trigger an effective pump stroke');
assert.doesNotMatch(sceneSource, /name="pumpAssembly"[\s\S]{0,260}onDoubleClick/, 'the pump assembly wrapper should not send valve or tube double-clicks into pump focus');
assert.match(sceneSource, /name="pumpBulb"[\s\S]*onDoubleClick/, 'double-clicking the pump bulb should enter the pump focus panel directly');
assert.doesNotMatch(sceneSource, /name="pumpBulb"[\s\S]{0,260}nativeEvent as MouseEvent\)\.detail > 1[\s\S]{0,120}onPumpBulbPress/, 'pump focus mode should not lose rapid clicks through native click-detail filtering');
assert.doesNotMatch(pumpValveSceneSection, /handlePumpValveDoubleClick|onFocus\('stopcock'\)/, 'pump valve should not keep the removed shared stopcock and valve focus entry');
assert.doesNotMatch(sceneSource, /name="pumpValve"[\s\S]{0,900}onFocus\('pump'\)/, 'double-clicking the pump valve should not enter the pump-bulb focus view');
assert.doesNotMatch(sceneSource, /data-heat-capacity-valve-focus-pump-valve-toggle="true"/, 'removed shared valve focus panel should not expose a pump valve toggle');
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
assert.match(sceneSource, /createHeatCapacityControlInteractionId\('pressureZero', 'drag'\)/, 'each pressure-zero drag should receive one stable operation id');
assert.match(sceneSource, /if \(dragState\.rejected\) return;[\s\S]*dragState\.rejected = !pressureZeroCoarseAdjustRef\.current/, 'a rejected pressure-zero drag should stop emitting callbacks for the rest of that gesture');
assert.match(sceneSource, /if \(event\.button !== 0 \|\| event\.isPrimary === false\) return;/, 'pressure-zero dragging should accept only the primary pointer');
assert.match(sceneSource, /if \(moveEvent\.pointerId !== pointerId\) return;/, 'pressure-zero dragging should ignore unrelated pointers');
assert.match(sceneSource, /interactionLocked \|\| focusMode !== 'instrument' \|\| !zeroEnabled[\s\S]*activePressureZeroGestureCleanupRef\.current\?\.\(\)/, 'pressure-zero dragging should release global listeners when the control becomes unavailable');
assert.match(sceneSource, /pressureZeroWheelGestureRef\.current\.getInteractionId\(now\)/, 'nearby wheel events should share one operation id without changing per-notch adjustments');
assert.match(sceneSource, /pointercancel[\s\S]*lostpointercapture/, 'pressure-zero drag cleanup should cover cancellation and lost pointer capture');
assert.match(sceneSource, /const nextKnobAngle = clampPressureZeroSceneKnobAngle\(requestedKnobAngle\)/, 'pressure zero wheel interaction should stop dispatching once it reaches a physical stop');
assert.match(sceneSource, /const requestedKnobAngle = dragState\.startKnobAngle \+ dragState\.totalDelta/, 'pressure zero drag should derive requested angle from the drag start angle and continuous pointer delta');
assert.match(sceneSource, /const nextKnobAngle = clampPressureZeroSceneKnobAngle\(requestedKnobAngle\)/, 'pressure zero drag should clamp the requested angle before dispatching scene updates');
assert.match(sceneSource, /已到调节上限|Upper adjustment limit reached/, 'pressure zero interaction should show a restrained toast at the upper physical stop');
assert.match(sceneSource, /已到调节下限|Lower adjustment limit reached/, 'pressure zero interaction should show a restrained toast at the lower physical stop');
assert.match(sceneSource, /onLockedInteraction\(limitMessage,\s*'pressureZero'\)/, 'pressure zero limit feedback should reuse the bottom-centered model-window toast path and identify the locked control');
assert.doesNotMatch(sceneSource, /appliedDelta/, 'pressure zero drag should not use unbounded circular applied deltas');
assert.match(instrumentStateSource, /HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MIN_DEG = -540/, 'pressure zero knob should expose a three-turn physical lower stop');
assert.match(instrumentStateSource, /HEAT_CAPACITY_PRESSURE_ZERO_KNOB_ANGLE_MAX_DEG = 540/, 'pressure zero knob should expose a three-turn physical upper stop');
assert.match(instrumentStateSource, /HEAT_CAPACITY_PRESSURE_ZERO_TOLERANCE_MV = 0\.1/, 'pressure zero readiness should use the strict +-0.1 mV tolerance');
assert.match(heatCapacityFileFactorySource, /pressureInitialBiasMv/, 'new heat-capacity files should keep the per-run initial zero bias');
assert.match(heatCapacityFileFactorySource, /pressureZeroDisplayedSamples/, 'new heat-capacity files should keep a displayed Uₚ zeroing window');
assert.match(teachingLifecycleStateSource, /createSeededFreePressureInitialBiasMv/, 'initial pressure-zero bias should use the deterministic sensor helper');
assert.doesNotMatch(`${heatCapacityFileFactorySource}\n${teachingLifecycleStateSource}`, /createHeatCapacityInitialPressureBiasMv/, 'the old non-deterministic pressure-bias helper should not remain');
assert.match(heatCapacityCalibrationCoordinatorSource, /isHeatCapacityPressureZeroWithinTolerance/, 'U0 readiness should be based on the displayed sample window');
assert.doesNotMatch(`${heatCapacityFileFactorySource}\n${teachingLifecycleStateSource}`, /HEAT_CAPACITY_MANUAL_INITIAL_PRESSURE_BIAS_MV\s*=\s*0\.6/, 'guide experiments must not use the old fixed +0.6 mV zero bias');
assert.doesNotMatch(heatCapacityCalibrationCoordinatorSource, /Math\.abs\(file\.pressureSignalReadoutMv\)\s*<=\s*0\.2/, 'U0 readiness must not use the old loose <=0.2 mV gate');
assert.match(heatCapacityCalibrationCoordinatorSource, /clampHeatCapacityPressureZeroKnobAngle/, 'pressure zero knob angle changes should clamp at physical stops');
assert.match(heatCapacityCalibrationCoordinatorSource, /getHeatCapacityPressureZeroOffsetForKnobAngle/, 'pressure zero offset should be derived from a continuous angle-to-offset mapping');
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
assert.match(sceneSource, /function useGuardedSceneSingleClick\(\)[\s\S]*const runRuntimeGuarded = useHeatCapacityRuntimeGuard\(\);[\s\S]*const schedule = useCallback\(\(run: \(\) => void, guardSingleClick = true\) => \{[\s\S]*if \(!guardSingleClick\) \{[\s\S]*runRuntimeGuarded\(run\);[\s\S]*return;[\s\S]*window\.setTimeout\(\(\) => \{[\s\S]*runRuntimeGuarded\(run\);[\s\S]*HEAT_CAPACITY_DOUBLE_CLICK_GUARD_MS[\s\S]*return \{ schedule, clear \};/, '3D controls should centralize guarded delayed single-click commits while allowing focused controls to execute immediately');
assert.match(sceneSource, /const \{ schedule: schedulePowerSwitchSingleClick, clear: clearPowerSwitchSingleClick \} = useGuardedSceneSingleClick\(\);[\s\S]*const handlePowerSwitchClick = \(event: ThreeEvent<MouseEvent>\) => \{[\s\S]*schedulePowerSwitchSingleClick\(\(\) => \{[\s\S]*onPowerToggle\(\);[\s\S]*\}, focusMode === 'none'\);[\s\S]*const handlePowerSwitchDoubleClick = \(event: ThreeEvent<MouseEvent>\) => \{[\s\S]*clearPowerSwitchSingleClick\(\);[\s\S]*onFocus\('instrument'\);/, 'power switch double-click should be protected before focus, but focused power clicks should execute immediately');
assert.doesNotMatch(stopcockSceneSection, /scheduleStopcockSingleClick|handleStopcockDoubleClick|onFocus\('stopcock'\)/, 'glass stopcock should keep direct click toggling without the removed shared valve focus entry');
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
assert.match(sceneSource, /name="HitboxPowerSwitch"[\s\S]*<boxGeometry args=\{\[0\.42, 0\.42, 0\.28\]\}/, 'power switch hitbox should be slightly expanded to tolerate 3D coordinate edge clicks');
assert.doesNotMatch(sceneSource, /name="HitboxPressureZeroKnob" visible=\{false\}/, 'pressure zero hitbox should remain raycastable instead of being invisible to raycaster');
assert.doesNotMatch(sceneSource, /name="pumpValveHitbox" visible=\{false\}/, 'pump valve hitbox should remain raycastable instead of being invisible to raycaster');
assert.doesNotMatch(sceneSource, /name="pumpBulbHitbox" visible=\{false\}/, 'pump bulb hitbox should remain raycastable instead of being invisible to raycaster');
assert.match(sceneSource, /pumpBulbScale/, 'pump bulb should animate through compression and release scale changes');
assert.match(sceneSource, /\? \[1\.08, 0\.7, 1\.06\][\s\S]*\? \[1\.02, 0\.92, 1\.01\]/, 'pump bulb should compress and reinflate without jelly-like overshoot');
assert.match(sceneSource, /name="pumpBulbStatusHalo"/, 'pump bulb active feedback should be an added halo, not a flat color replacement');
assert.doesNotMatch(sceneSource, /tooFast/, 'pump feedback must not introduce a too-fast state');
assert.match(sceneSource, /name="pumpValve"[\s\S]*onPointerDown=\{\(event\) => \{[\s\S]*stopImmediatePropagation/, 'pump valve pointer events should not bubble into neighboring controls');
assert.doesNotMatch(pumpValveSceneSection, /schedulePumpValveSingleClick|handlePumpValveDoubleClick|onFocus\('stopcock'\)/, 'pump valve should keep direct click toggling without the removed shared valve focus entry');
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
assert.match(sceneSource, /useHeatCapacityGuardedFrame[\s\S]*gaugeNeedlePivotRef\.current\.rotation\.z/, 'analog pressure gauge needle should smoothly track the mapped target angle behind the shared runtime guard');
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
assert.match(sceneSource, /frameloop:\s*qualityProfile\.frameLoop/, 'Heat Capacity 3D frame loop should come from the active quality profile');
assert.match(sceneSource, /dpr:\s*qualityProfile\.dpr/, 'Heat Capacity 3D mode should read supersampling from the active quality profile');
assert.match(sceneSource, /shadows: false/, 'heat-capacity 3D scene should disable shadow rendering');
assert.doesNotMatch(sceneSource, /castShadow|receiveShadow/, 'heat-capacity 3D scene should not keep mesh shadow flags when shadows are disabled');
assert.match(sceneSource, /onStart=\{onInteractionStart\}/, 'orbit controls should enter a reduced-quality interaction state when dragging starts');
assert.match(sceneSource, /onEnd=\{onInteractionEnd\}/, 'orbit controls should leave the reduced-quality interaction state when dragging ends');
assert.match(sceneSource, /const interactionActiveRef = useRef\(false\)[\s\S]*if \(!enabled\) onInteractionEnd\(\)[\s\S]*useEffect\(\(\) => \(\) => onInteractionEnd\(\)/, 'disabling or unmounting OrbitControls should reliably close an in-flight orbit motion lifecycle');
assert.match(sceneSource, /onChange=\{\(\) => runRuntimeGuarded\(invalidate\)\}/, 'orbit controls should guard demand-render invalidation when the camera changes');
assert.match(sceneSource, /resolveHeatCapacitySceneDiscreteMotionState\(\{[\s\S]*instrumentMotionActive: ultraDiscreteMotionActive \|\| proceduralDiscreteMotionActive/, 'scene motion blocking should use the real Ultra or procedural animation lifecycle');
assert.doesNotMatch(sceneSource, /ultraDiscreteMotionActive \|\| proceduralDiscreteMotionActive \|\| Boolean\(props\.guideRollbackAnimation\)/, 'a stale guide rollback descriptor should not keep instrument motion active forever');
assert.match(sceneSource, /panelTextInteractionReduced: boolean/, 'instrument display text throttling should distinguish orbit dragging from performance-mode visual reduction');
assert.match(sceneSource, /panelTextInteractionReduced=\{isOrbitInteracting\}/, 'instrument display text should only use the interaction throttle while the user is dragging the camera');
assert.match(sceneSource, /type CameraViewScheme = \{[\s\S]*defaultView: CameraFocusView;[\s\S]*fov: number;[\s\S]*responsiveFov\?:[\s\S]*autoDemoView\?: CameraFocusView;[\s\S]*focusViews\?: CameraFocusViews;/, 'heat-capacity camera views should be grouped into explicit model schemes');
assert.match(sceneSource, /const PROCEDURAL_CAMERA_VIEW_SCHEME: CameraViewScheme = \{[\s\S]*defaultView:[\s\S]*position: \[4\.15, 2\.9, 8\.25\][\s\S]*target: \[0\.25, -0\.05, 0\][\s\S]*autoDemoView:[\s\S]*position: \[3\.82, 2\.68, 7\.58\][\s\S]*target: \[0\.24, -0\.05, 0\.02\]/, 'procedural heat-capacity scheme should keep the approved skeleton default and auto-demo views');
assert.match(sceneSource, /const ULTRA_CAMERA_VIEW_SCHEME: CameraViewScheme = \{[\s\S]*defaultView:[\s\S]*position: \[3\.72, 4\.702, 5\.581\][\s\S]*target: \[0\.274, 0\.665, -0\.23\][\s\S]*fov: 36[\s\S]*responsiveFov:[\s\S]*aspect: 1\.35[\s\S]*narrowAspect: 0\.95[\s\S]*fov: 52[\s\S]*wideAspect: 3[\s\S]*wideFov: 56/, 'Ultra GLB scheme should use the captured default position and target while keeping the base FOV for responsive canvas sizing');
assert.match(sceneSource, /const getCameraViewScheme = \(qualityProfile: HeatCapacityQualityProfile\) => \([\s\S]*qualityProfile\.renderModel === 'ultraGlb' \? ULTRA_CAMERA_VIEW_SCHEME : PROCEDURAL_CAMERA_VIEW_SCHEME/, 'heat-capacity camera defaults should select exactly one of the two active schemes');
assert.doesNotMatch(sceneSource, /const getDefaultCameraView|const getAutoDemoCameraView|PROCEDURAL_DEFAULT_CAMERA_POSITION|PROCEDURAL_AUTO_DEMO_CAMERA_POSITION|ULTRA_DEFAULT_CAMERA_POSITION/, 'camera code should not keep the old scattered view selector functions or position constants');
assert.match(sceneSource, /const cameraViewScheme = useMemo\(\(\) => getCameraViewScheme\(qualityProfile\), \[qualityProfile\]\)/, 'scene should memoize the active camera scheme by quality profile');
assert.match(sceneSource, /camera: \{[\s\S]*position: canvasInitialCameraPose\?\.position \?\? cameraViewScheme\.defaultView\.position,[\s\S]*fov: canvasInitialCameraPose\?\.fov \?\? cameraViewScheme\.fov/, 'Canvas camera should use the active exact-or-recovery pose selected for this mount');
assert.match(sceneSource, /import \{ Canvas, createPointerEvents, useThree, type RootState, type ThreeEvent \} from '@react-three\/fiber';/, 'heat-capacity scene should use a custom pointer event layer for canvas hit testing');
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
assert.doesNotMatch(stopcockSceneSection, /onDoubleClick=\{handleStopcockDoubleClick\}|onFocus\('stopcock'\)/, 'glass stopcock should not keep the removed shared valve focus entry');
assert.doesNotMatch(pumpValveSceneSection, /onDoubleClick=\{handlePumpValveDoubleClick\}|onFocus\('stopcock'\)/, 'pump valve should not keep the removed shared valve focus entry');
assert.doesNotMatch(sceneSource, /ValveFocusBubbleState|ValveFocusControl|projectValveFocusAnchor|openValveFocusBubble|closeValveFocusBubble|VALVE_FOCUS_BUBBLE|data-heat-capacity-valve-focus-entry|sceneCopy\.focus\.enterValveFocus/, 'valve hover focus-entry bubble should be removed');
assert.match(sceneSource, /onFocus\('instrument'\)/, 'double-clicking the host should enter instrument focus mode');
assert.match(sceneSource, /const PROCEDURAL_CAMERA_VIEW_SCHEME: CameraViewScheme = \{[\s\S]*focusViews: \{[\s\S]*instrument:[\s\S]*position: \[2\.18, 0\.18, 3\.42\][\s\S]*pump:[\s\S]*position: \[2\.95, 0\.25, 3\.35\]/, 'procedural scheme should keep the original instrument and pump focus framing');
assert.doesNotMatch(sceneSource, /const PROCEDURAL_CAMERA_VIEW_SCHEME: CameraViewScheme = \{[\s\S]*focusViews: \{[\s\S]*stopcock:/, 'procedural scheme should not keep the removed stopcock focus view');
assert.match(sceneSource, /const ULTRA_CAMERA_VIEW_SCHEME: CameraViewScheme = \{[\s\S]*focusViews: \{[\s\S]*instrument:[\s\S]*position: \[2\.78,\s*1\.16,\s*3\.85\][\s\S]*target: \[2\.24,\s*0\.06,\s*0\.28\][\s\S]*fov: 32[\s\S]*pump:[\s\S]*position: \[2\.34,\s*1\.24,\s*3\.55\][\s\S]*target: \[0\.98,\s*0\.34,\s*0\.28\][\s\S]*fov: 36/, 'Ultra GLB scheme should keep model-specific instrument and pump focus views');
assert.doesNotMatch(sceneSource, /const ULTRA_CAMERA_VIEW_SCHEME: CameraViewScheme = \{[\s\S]*focusViews: \{[\s\S]*stopcock:/, 'Ultra GLB scheme should not keep the removed stopcock focus view');
assert.match(sceneSource, /if \(focusMode !== 'none'\) return;[\s\S]*const startFov = camera\.fov[\s\S]*const nextFov = focusView[\s\S]*\? focusView\.fov \?\? cameraViewScheme\.fov[\s\S]*: getCameraFovForAspect\(cameraViewScheme, aspect\)[\s\S]*targetFov: nextFov[\s\S]*camera\.fov = THREE\.MathUtils\.lerp\(runtime\.state\.startFov, runtime\.state\.targetFov, eased\)/, 'focused camera transitions should animate to each focus view FOV instead of using short-wide responsive FOV');
assert.doesNotMatch(sceneSource, /props\.performanceMode === 'ultra' && focusMode !== 'none'/, 'Ultra GLB should no longer clear focused modes immediately after entry');
assert.match(sceneSource, /const requestedFocusMode = modeRestoreRequest\?\.focusMode \?\? focusMode;[\s\S]*requestedFocusMode === 'instrument' \|\| requestedFocusMode === 'pump' \|\| requestedFocusMode === 'bottle'[\s\S]*cameraViewScheme\.focusViews\?\.\[requestedFocusMode\][\s\S]*const nextView = focusView \?\? \([\s\S]*cameraViewScheme\.autoDemoView \?\? cameraViewScheme\.defaultView[\s\S]*targetPosition: \[\.\.\.nextView\.position\][\s\S]*target: \[\.\.\.nextView\.target\]/, 'camera rig should resolve normal and mode-restored focus, auto-demo, and default views from the active scheme only');
assert.doesNotMatch(sceneSource, /data-heat-capacity-focus-mode=\{focusMode\}/, 'instrument focus should not move overlay controls through scene focus-mode attributes');
assert.doesNotMatch(styleSource, /data-heat-capacity-focus-mode="instrument"[\s\S]*studio-preview-overlay-slot-bottom-left[\s\S]*display:\s*none/, 'instrument focus should keep lower-left hints in their normal overlay slot');
assert.doesNotMatch(styleSource, /data-heat-capacity-focus-mode="instrument"[\s\S]*heat-parent-bottom-right[\s\S]*data-heat-capacity-focus-mode="instrument"[\s\S]*heat-focus-panel[\s\S]*align-self:\s*flex-start/, 'instrument focus should keep record controls and the focus panel in their normal lower-right slot');
assert.doesNotMatch(sceneSource, /className="studio-heat-focus-exit"/, 'focused modes should not use a separate top-right exit button');
assert.doesNotMatch(sceneSource, /data-heat-capacity-focus-panel="stopcock"/, 'removed stopcock focus mode should not expose a lower-right focus panel');
assert.doesNotMatch(sceneSource, /data-heat-capacity-valve-focus-stopcock-toggle="true"/, 'removed shared valve focus panel should not expose a glass stopcock toggle');
assert.doesNotMatch(sceneSource, /data-heat-capacity-valve-focus-pump-valve-toggle="true"/, 'removed shared valve focus panel should not expose a pump valve toggle');
assert.match(sceneSource, /data-heat-capacity-focus-panel="pump"/, 'pump focus mode should expose its own lower-right focus panel');
assert.match(sceneSource, /data-heat-capacity-focus-panel="instrument"/, 'instrument focus mode should expose its own lower-right focus panel');
assert.match(sceneSource, /data-heat-capacity-focus-exit="true"/, 'each focus panel should include the unified exit focus control');
assert.match(sceneSource, /const poweredInstrumentReadout = \(displayValue: string\) => props\.powerOn \? displayValue : sceneCopy\.unpowered/, 'instrument focus panel should hide instrument readouts while powered off');
assert.match(sceneSource, /const poweredInstrumentNumber = \(displayValue: string\) => props\.powerOn \? displayValue : '--'/, 'instrument focus panel should hide numeric placeholders while powered off');
assert.match(sceneSource, /<strong>\{poweredInstrumentReadout\(temperatureDisplay\)\}<\/strong>/, 'instrument focus Uₜ should be guarded by power state');
assert.match(sceneSource, /<strong>\{poweredInstrumentReadout\(pressureDisplay\)\}<\/strong>/, 'instrument focus Uₚ should be guarded by power state');
assert.match(sceneSource, /<strong>\{poweredInstrumentNumber\(`\$\{formatHeatCapacitySignalMv\(props\.pressureSignalReadoutMv\)\} mV`\)\}<\/strong>/, 'instrument focus displayed pressure should show one truncated mV decimal and hide while powered off');
assert.match(sceneSource, /<strong>\{poweredInstrumentNumber\(`\$\{formatHeatCapacitySignalMv\(props\.pressureZeroOffset\)\} mV`\)\}<\/strong>/, 'instrument focus zero offset should show one truncated mV decimal and hide while powered off');
assert.match(sceneSource, /<strong>\{poweredInstrumentNumber\(`\$\{formatPanelNumber\(props\.vesselPressureReadoutKPa, 2\)\} kPa`\)\}<\/strong>/, 'instrument focus vessel pressure should not leak values while powered off');
assert.match(sceneSource, /getPumpBulbDisplayLabel/, 'pump bulb display state should be mapped for user-facing UI');
assert.doesNotMatch(sceneSource, /sceneCopy\.focus\.opened|sceneCopy\.focus\.closed/, 'removed shared stopcock focus panel should not keep its pump-valve state copy path');
assert.doesNotMatch(sceneSource, /snapNearestOpen|吸附|磁吸|magnetic/i, 'stopcock focus panel should not expose magnetic snap controls');
assert.match(sceneSource, /const orbitControlsEnabled = focusMode === 'none' &&[\s\S]*sceneCommandState\.activeCommand === null &&[\s\S]*!cameraTransitionActive &&[\s\S]*!\(props\.cameraInteractionLocked \?\? props\.interactionLocked\);/, 'Ultra orbit controls should lock during active scene commands, camera transitions, and focus while completed teaching states can still allow camera inspection');
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
assert.doesNotMatch(styleSource, /\.studio-heat-valve-focus-bubble|\.studio-heat-valve-focus-button/, 'removed valve hover focus-entry styles should stay deleted');
assert.match(sceneSource, /const HEAT_CAPACITY_DRAG_CLICK_SUPPRESSION_PX = 4;/, 'scene click suppression should use an explicit small movement threshold for left-button drags');
assert.match(sceneSource, /const sceneDragClickGuardRef = useRef\(\{[\s\S]*pointerId: null as number \| null[\s\S]*suppressNextClick: false/, 'scene should keep a root-level drag click guard independent of individual 3D controls');
assert.match(sceneSource, /const handleScenePointerDownCapture = useCallback\(\(event: React\.PointerEvent<HTMLDivElement>\) => \{[\s\S]*event\.button === 0[\s\S]*sceneDragClickGuardRef\.current = \{[\s\S]*pointerId: event\.pointerId[\s\S]*suppressNextClick: false,[\s\S]*\}, \[clearSceneDragClickGuardResetTimer\]\);/, 'pressing the primary pointer anywhere should arm the drag click guard');
assert.match(sceneSource, /const handleScenePointerMoveCapture = useCallback\(\(event: React\.PointerEvent<HTMLDivElement>\) => \{[\s\S]*Math\.hypot\(event\.clientX - dragGuard\.startX, event\.clientY - dragGuard\.startY\)[\s\S]*HEAT_CAPACITY_DRAG_CLICK_SUPPRESSION_PX[\s\S]*dragGuard\.suppressNextClick = true;/, 'scene should mark the following click as unsafe once the primary pointer has dragged far enough');
assert.match(sceneSource, /const handleSceneClickCapture = useCallback\(\(event: React\.MouseEvent<HTMLDivElement>\) => \{[\s\S]*dragGuard\.suppressNextClick[\s\S]*event\.preventDefault\(\);[\s\S]*event\.stopPropagation\(\);[\s\S]*event\.nativeEvent\.stopImmediatePropagation\?\.\(\);/, 'drag-generated clicks should be swallowed before React Three Fiber can raycast them into another control');
assert.match(sceneSource, /onPointerDownCapture=\{handleScenePointerDownCapture\}[\s\S]*onPointerMoveCapture=\{handleScenePointerMoveCapture\}[\s\S]*onPointerUpCapture=\{handleScenePointerUpCapture\}[\s\S]*onPointerCancelCapture=\{handleScenePointerCancelCapture\}[\s\S]*onClickCapture=\{handleSceneClickCapture\}/, 'scene root should install the drag-click guard through capture handlers around the Canvas');
assert.doesNotMatch(sceneSource, /onWheelCapture=\{\(\) => closeValveFocusBubble\(\)\}|closeValveFocusBubble\(\)/, 'removed valve focus bubble should not keep scene-level close handlers');
assert.match(sceneSource, /onInteractionStart=\{\(\) => \{[\s\S]*setIsOrbitInteracting\(true\);[\s\S]*setStableHoveredControl\(null\);/, 'starting orbit interaction should still clear transient hover state');
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
assert.match(sceneSource, /const HEAT_CAPACITY_HOVER_TOOLTIP_DELAY_MS = 650;/, 'hover tooltip should wait 650ms before appearing near a stable hovered control');
assert.match(sceneSource, /const HEAT_CAPACITY_HOVER_TOOLTIP_MOVE_TOLERANCE_PX = 3;/, 'hover tooltip should use a small pointer-stillness tolerance before reveal');
assert.match(sceneSource, /const hoverTooltipShowTimerRef = useRef<number \| null>\(null\);/, 'hover tooltip reveal should be controlled by an explicit delay timer');
assert.match(sceneSource, /const \[hoverTooltipAnchor, setHoverTooltipAnchor\]/, 'hover tooltip should render from a fixed control-adjacent anchor instead of following the pointer');
assert.match(sceneSource, /const scheduleHoverTooltipReveal = useCallback\(\(control: Exclude<HeatCapacityHoveredControl, null>\)/, 'hover tooltip should schedule reveal only after a concrete control is hovered');
assert.match(sceneSource, /const scaleX = bounds\.width > 0 \? root\.offsetWidth \/ bounds\.width : 1;[\s\S]*x: \(event\.clientX - bounds\.left\) \* scaleX/, 'hover tooltip pointer anchors should convert scaled viewport coordinates into scene layout coordinates');
assert.match(sceneSource, /const layoutWidth = root\.offsetWidth \|\| bounds\.width;[\s\S]*const layoutHeight = root\.offsetHeight \|\| bounds\.height;/, 'hover tooltip clamping should use the scene layout box that CSS positioning uses');
assert.match(sceneSource, /Math\.hypot\([\s\S]*candidate\.x[\s\S]*candidate\.y[\s\S]*HEAT_CAPACITY_HOVER_TOOLTIP_MOVE_TOLERANCE_PX/, 'hover tooltip should cancel and restart when the pointer moves beyond the stillness tolerance');
assert.doesNotMatch(sceneSource, /updateHoverTooltipPosition\(event\)/, 'hover tooltip should not continuously follow the cursor during pointer movement');
assert.doesNotMatch(sceneSource, /preferredTopY|preferredBottomY[\s\S]*\?[\s\S]*preferredTopY/, 'hover tooltip vertical placement should not jump between below and above branches near the scene edge');
assert.match(sceneSource, /const verticalInset = HEAT_CAPACITY_HOVER_TOOLTIP_ESTIMATED_HEIGHT_PX \/ 2 \+ HEAT_CAPACITY_HOVER_TOOLTIP_INSET_PX;[\s\S]*const y = clampSceneNumber\(point\.y,\s*verticalInset/, 'hover tooltip vertical placement should continuously clamp around the hovered point');
assert.match(sceneSource, /data-heat-capacity-hover-tooltip="true"[\s\S]*--studio-heat-hover-tooltip-x/, 'hover tooltip should render at a clamped control-adjacent anchor');
assert.match(getCssBlock('.studio-heat-hover-tooltip'), /right:\s*var\(--studio-heat-hover-tooltip-right,\s*auto\);/, 'left-side hover tooltips should anchor their right edge beside the control so short copy does not drift away');
assert.match(getCssBlock('.studio-heat-hover-tooltip'), /top:\s*var\(--studio-heat-hover-tooltip-y,\s*0\);/, 'hover tooltip should use its y variable as a vertical center anchor');
assert.match(getCssBlock('.studio-heat-hover-tooltip'), /transform:\s*translate3d\(0,\s*-50%,\s*0\);/, 'hover tooltip should center vertically on the hovered point instead of translating by a top-edge offset');
assert.match(getCssBlock('.studio-heat-hover-tooltip'), /pointer-events:\s*none;/, 'hover tooltip should not steal canvas interactions');
assert.match(sceneSource, /studio-preview-overlay-slot-top-right[\s\S]*data-heat-capacity-view-reset="true"/, 'upper-right heat model window chrome should use the shared top-right slot');
assert.match(getCssBlock('.studio-heat-view-reset'), /border:\s*0\.5px solid rgba\(148,\s*163,\s*184,\s*0\.44\)/, 'default-view button should use the thin annotated border');
assert.match(styleSource, /\.studio-heat-demo-step-panel \{[\s\S]*width: min\(280px, 100%\);/, 'auto demo step panel should trade horizontal width for wrapped vertical content beside the wait controller');
assert.match(styleSource, /\[data-preview-overlay-item="heat-parent-top-right"\]\s*\{[\s\S]*display:\s*flex;[\s\S]*justify-content:\s*flex-end;[\s\S]*width:\s*100%;/, 'auto demo top-right wrapper should right-anchor the visual step panel inside the shared overlay slot');
assert.match(styleSource, /\.studio-heat-demo-step-panel div:not\(\.studio-heat-demo-step-kicker\) \{[\s\S]*grid-template-columns: 58px minmax\(0, 1fr\);/, 'step panel should keep the original compact field layout');
assert.match(styleSource, /\.studio-heat-preview-mount \{[\s\S]*overflow: hidden;/, 'heat preview mount should clip the step panel as it slides out to the right');
assert.match(styleSource, /\.studio-heat-demo-step-panel-visible \{[\s\S]*animation: studioOverlayEnterRight/, 'auto demo step panel should enter from the right when the demo starts');
assert.match(styleSource, /\.studio-heat-demo-step-panel-exiting \{[\s\S]*animation: studioOverlayExitRight/, 'auto demo step panel should exit to the right when the demo ends or is terminated');
assert.match(workbenchSource, /overlayCenter=\{heatCapacityCenterOverlay\}[\s\S]*data-heat-capacity-pressure-warning="true"|data-heat-capacity-pressure-warning="true"[\s\S]*overlayCenter=\{heatCapacityCenterOverlay\}/, 'pressure warning should use the centered overlay slot inside the heat model window');
assert.match(styleSource, /\.studio-heat-pressure-warning-kicker \{[\s\S]*font-family: "JetBrains Mono"/, 'pressure warning should expose a compact engineering status kicker');
assert.match(styleSource, /\.studio-heat-pressure-warning \{[\s\S]*animation: studioOverlayFadeIn/, 'centered pressure warning should fade in without scale or displacement');
assert.match(workbenchSource, /const heatCapacityCenterOverlay = \([\s\S]*<PromptViewportFeedback[\s\S]*data-heat-capacity-guide-step-hint[\s\S]*overlayCenter=\{heatCapacityCenterOverlay\}/, 'heat-capacity guide feedback should use the shared centered viewport surface');
assert.match(viewportFeedbackStyleSource, /\.prompt-viewport-feedback\s*\{[\s\S]*promptViewportFeedbackIn[\s\S]*promptViewportFeedbackOut/, 'shared viewport feedback should animate both entry and exit');
assert.match(viewportFeedbackStyleSource, /\.prompt-viewport-feedback-warning\s*\{[\s\S]*--prompt-viewport-feedback-tone:\s*var\(--prompt-warning/, 'heat-capacity toast queue should share the formal warning color token');
assert.match(viewportFeedbackStyleSource, /\.prompt-viewport-feedback-danger\s*\{[\s\S]*--prompt-viewport-feedback-tone:\s*var\(--prompt-danger/, 'heat-capacity toast queue should share the formal danger color token');
assert.match(workbenchSource, /overlayCenter=\{heatCapacityCenterOverlay\}[\s\S]*data-heat-capacity-demo-complete-toast="true"|data-heat-capacity-demo-complete-toast="true"[\s\S]*overlayCenter=\{heatCapacityCenterOverlay\}/, 'normal auto demo completion should use the centered overlay slot');
assert.match(styleSource, /\.studio-heat-demo-complete-toast \{[\s\S]*studioOverlayFadeIn[\s\S]*studioOverlayFadeOut/, 'centered demo completion toast should use fade-only in and out');
assert.match(styleSource, /\.studio-heat-toast-kicker \{[\s\S]*font-family: "JetBrains Mono"/, 'toast overlays should use compact engineering kicker labels');
assert.doesNotMatch(styleSource, /@keyframes heatDemoFocusPulse/, 'unused CSS keyframes should not remain after Three.js-driven focus halos');

assert.match(workbenchSource, /HeatCapacityInstrumentScene/);
assert.match(modeTypesSource, /export type HeatCapacityMode = 'demo' \| 'guide' \| 'free'/, 'heat-capacity modes should have one shared domain type');
assert.match(workbenchSource, /HeatCapacityMode,[\s\S]{0,100}from '\.\/workbenchHeatCapacityStateTypes\.ts'/, 'heat-capacity preview should use the shared mode type from the extracted state boundary instead of a local duplicate');
assert.match(modeControlModelSource, /selectHeatCapacityModeControlState/, 'heat-capacity mode action visibility should be selected by a dedicated model');
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
assert.match(modeControlModelSource, /teachingCompleted[\s\S]*\[\{ id: 'exit-teaching', tone: 'danger' \}\][\s\S]*id: 'stop-demo'/, 'completed demo mode should select one explicit teaching-exit action instead of stop controls');
assert.match(modeControlModelSource, /id: teachingCompleted \? 'exit-teaching' : 'exit-guide'[\s\S]*tone: 'danger'/, 'guide mode expansion should switch from stop to explicit exit when completed');
assert.match(workbenchSource, /data-heat-capacity-mode-action="exit-teaching"[\s\S]*<LogOut/, 'completed teaching exit should use a distinct exit icon');
assert.match(workbenchSource, /data-heat-capacity-mode-action="exit-guide"[\s\S]*<Square/, 'running guide exit should keep the stop icon');
assert.match(workbenchSource, /const heatCapacityModeActionClassName = \(action: HeatCapacityModeControlAction\) => \{[\s\S]*action\.tone === 'danger'[\s\S]*studio-heat-mode-action-danger/, 'completed guide exit should keep the same red stop-style color through the shared action renderer');
assert.doesNotMatch(workbenchSource, /data-heat-capacity-mode-action="next-trial"/, 'guide mode should not reveal an old next-trial action');
assert.match(workbenchSource, /className="studio-heat-mode-actions studio-heat-mode-actions-demo"[\s\S]*heatCapacityModeControlState\.demo\.actions\.map\(renderHeatCapacityModeAction\)/, 'demo actions should be rendered from the dedicated mode-control model inside the demo segment');
assert.match(workbenchSource, /className="studio-heat-mode-actions studio-heat-mode-actions-guide"[\s\S]*heatCapacityModeControlState\.guide\.actions\.map\(renderHeatCapacityModeAction\)/, 'guide actions should be rendered from the dedicated mode-control model inside the guide segment');
assert.doesNotMatch(workbenchSource, /HEAT_CAPACITY_GUIDE_NEXT_TRIAL_DELAY_MS/, 'next-trial reveal delay should be removed with guide multi-trial flow');
assert.match(heatCapacityRealtimeCopySource, /真实实验中需要等待系统稳定；程序已省略该等待过程。/, 'guide mode should show the confirmed omitted-stability-wait notice');
assert.doesNotMatch(workbenchSource, /setHeatCapacityGuideNextTrialReadyKey|nextTrialKey/, 'next-trial reveal key should be removed');
assert.match(workbenchSource, /data-heat-capacity-trial-badge=\{badge\.key === 'trial' \? 'true' : undefined\}/, 'current guide trial should move to a right-sidebar badge');
assert.doesNotMatch(workbenchSource, /data-heat-capacity-manual-reset="true"/, 'old bottom-right guide start button should be removed');
assert.doesNotMatch(workbenchSource, /startGuideExperiment:\s*'开始手动实验'|startGuideExperiment:\s*'開始手動實驗'|startGuideExperiment:\s*'Start Manual Trial'/, 'user-facing guide start copy should be renamed to guide mode');
assert.match(styleSource, /\.studio-heat-mode-control/, 'unified mode control should have dedicated styling');
assert.match(styleSource, /\.studio-heat-mode-actions/, 'mode-specific expanded actions should have a dedicated animated area');
assert.match(styleSource, /\.studio-heat-mode-control[\s\S]*transition:[\s\S]*cubic-bezier\(0\.2, 0, 0, 1\)/, 'mode bar movement and extension should use a non-elastic engineering transition');
assert.match(styleSource, /\.studio-heat-mode-segment \+ \.studio-heat-mode-segment \{[\s\S]*border-left:/, 'mode bar should draw divider lines between demo, guide, and free segments');
assert.match(getRootCssBlock('.studio-heat-mode-control'), /var\(--studio-success\)/, 'mode bar should use the shared semantic success palette instead of a component-local green');
assert.doesNotMatch(getRootCssBlock('.studio-heat-mode-control'), /rgba\(125, 211, 252|backdrop-filter|0 14px 30px/, 'mode bar should not keep the previous cyan glass styling');
assert.match(getRootCssBlock('.studio-heat-mode-action'), /var\(--studio-success-soft\)[\s\S]*var\(--studio-success\)/, 'positive mode actions should consume the shared semantic success tokens');
assert.doesNotMatch(styleSource, /studio-heat-mode-action-next-trial|studio-heat-next-trial-breathe/, 'next-trial button CSS should be deleted with the guide multi-trial flow');
assert.match(getRootCssBlock('.studio-heat-mode-action-danger'), /var\(--studio-danger\)[\s\S]*var\(--studio-action-primary-text\)/, 'stop mode action should consume the shared semantic danger tokens');
assert.match(styleSource, /\.studio-panel-actions \.studio-heat-mode-action \{[\s\S]*var\(--studio-success-soft\)[\s\S]*var\(--studio-success\)/, 'dark theme panel-action overrides should preserve semantic success actions');
assert.match(styleSource, /\.studio-panel-actions \.studio-heat-mode-action-danger \{[\s\S]*var\(--studio-danger\)[\s\S]*var\(--studio-action-primary-text\)/, 'dark theme panel-action overrides should preserve semantic danger actions');
assert.match(styleSource, /\.studio-theme-light \.studio-panel-actions \.studio-heat-mode-action \{[\s\S]*var\(--studio-success-soft\)[\s\S]*var\(--studio-success\)/, 'light theme panel-action overrides should preserve semantic success actions');
assert.match(styleSource, /\.studio-theme-light \.studio-panel-actions \.studio-heat-mode-action-danger \{[\s\S]*var\(--studio-danger-soft\)[\s\S]*var\(--studio-danger\)/, 'light theme panel-action overrides should preserve semantic danger actions');
assert.match(guideStepModelSource, /export type GuideHeatCapacityStep =[\s\S]*openStopcockForZeroRequired[\s\S]*recordU0Required[\s\S]*recordU1Required[\s\S]*recordU2Required[\s\S]*closePowerRequired[\s\S]*completed/, 'guide heat-capacity workflow should model one guided experiment with U0/U1/U2 recording and final power-off');
assert.match(workbenchSource, /getHeatCapacityGuideStepControlId/, 'Workbench should consume the shared guide step control-id model');
assert.match(workbenchSource, /getHeatCapacityGuideAllowedActions/, 'Workbench should consume the shared guide allowed-action model');
assert.match(workbenchSource, /getHeatCapacityGuideRollbackAnimation/, 'Workbench should consume the shared guide rollback-animation model');
assert.doesNotMatch(workbenchSource, /nextTrialRequired|calculateRequired|startNextTrial/, 'guide mode should not keep old multi-trial continuation or standalone calculation steps');
assert.match(workbenchSource, /guardGuideHeatCapacityAction/, 'guide heat-capacity controls should pass through one shared guard');
assert.match(workbenchSource, /guideHeatCapacityActiveFileId/, 'guide heat-capacity tutorial should have an explicit active file binding');
assert.match(workbenchSource, /guideHeatCapacityActiveFileId !== activeFile\.id\) return true/, 'guide guards should not constrain users before the guide tutorial is started');
assert.match(workbenchSource, /'data-heat-capacity-guide-step-hint': 'true'/, 'guide heat-capacity guard should surface a centered shared viewport hint in the 3D preview');
assert.match(workbenchSource, /studio-heat-record-controls-pulse/, 'guide heat-capacity guard should pulse the record entry when recording is the next required action');
assert.match(workbenchSource, /const recordHeatCapacityGuideSample = \(kind: HeatCapacityGuideRecordKind\)[\s\S]*const currentFile = filesRef\.current\.find\(\(file\) => file\.id === activeFile\.id\);[\s\S]*applyHeatCapacityGuideRecordWorkbenchState\(currentFile,\s*kind,\s*now\)/, 'direct record buttons should route through the guide domain guard using the latest active file');
assert.match(guideControlStateSource, /const activeDisplay = selectActiveHeatCapacityWorkbenchDisplay\(currentFile\);[\s\S]*displayPressureMv:\s*activeDisplay\.pressureMv[\s\S]*displayTemperatureMv:\s*activeDisplay\.temperatureMv/, 'guided U0/U1/U2 recording should write the current instrument readings into the single guide trial');
assert.match(workbenchSource, /if \(attempt\.accepted\) \{[\s\S]*showHeatCapacityRecordButtonExit\(kind\);[\s\S]*setHeatCapacityFocusResetKey\(\(key\) => key \+ 1\);[\s\S]*heatCapacityFocusSessionRef\.current = null;[\s\S]*showHeatCapacityRecordSuccessSequence/, 'successful guided U0/U1/U2 recording should automatically leave the focus view before the next guided target pulse');
assert.match(workbenchSource, /guideHeatCapacityActiveFileId === activeFile\.id[\s\S]*recordU0Required[\s\S]*recordU1Required[\s\S]*recordU2Required/, 'guide mode should only show the record button required by the current workflow step');
assert.doesNotMatch(workbenchSource, /guideHeatCapacityActiveFileId === activeFile\.id && activeFile\.powerOn[\s\S]*recordU0Required/, 'record buttons should not depend on a second powerOn gate once the guide workflow has reached a record step');
assert.match(workbenchSource, /const isGuideU1RecordReady =/, 'guide U1 record readiness should be centralized in a stable-window helper');
assert.match(workbenchSource, /const isGuideU2RecordReady =/, 'guide U2 record readiness should be centralized in a stable-window helper');
assert.match(workbenchSource, /const hasActiveTrialU1 =/, 'guide U1 completion should be scoped to the active trial instead of the whole trial table');
assert.match(workbenchSource, /const hasActiveTrialU2 =/, 'guide U2 completion should be scoped to the active trial instead of the whole trial table');
assert.doesNotMatch(workbenchSource, /const getActiveHeatCapacityTrial =|const isActiveTrialComplete =/, 'guide mode should not keep the old active-trial table helpers');
assert.match(workbenchSource, /const getActiveTrialRecordedU1Mv =/, 'guide U2 readiness should use the active trial U1 value');
assert.match(workbenchSource, /const getGuideHeatCapacityDecisionPressureMv =[\s\S]*pressureSignalTargetMv/, 'guide record readiness should prefer target pressure over display jitter');
assert.match(workbenchSource, /const getGuideHeatCapacityDecisionTemperatureMv =[\s\S]*temperatureSignalTargetMv/, 'guide record readiness should prefer target temperature over display jitter');
assert.doesNotMatch(guideControlStateSource, /const profilePressureSignalMv = profile[\s\S]*pressureSignalMv: profilePressureSignalMv \?\? file\.pressureSignalMv/, 'guide record input must not substitute profile pressure for the current instrument reading');
assert.doesNotMatch(guideControlStateSource, /const profileTemperatureSignalMv = profile[\s\S]*temperatureSignalMv: profileTemperatureSignalMv \?\? file\.temperatureSignalMv/, 'guide record input must not substitute profile temperature for the current instrument reading');
assert.match(guideControlStateSource, /recordGuideU1\(currentFile\.heatCapacityGuideTrial,\s*recordInput\)[\s\S]*recordGuideU2\(currentFile\.heatCapacityGuideTrial,\s*recordInput,\s*now/, 'guide U1 and U2 recording should preserve actual display readings in the single guide trial');
assert.match(workbenchSource, /const isGuideHeatCapacityTemperatureAtAmbient =/, 'guide U1/U2 readiness should verify Uₜ has returned near room temperature');
assert.match(workbenchSource, /const isGuideHeatCapacityReleaseCompleteForU2 =/, 'guide U2 flow should verify quick release is complete before allowing stopcock closure and recovery');
assert.match(workbenchSource, /if \(file\.heatCapacityPhase === 'recovering'\) return true;/, 'guide U2 release completion should remain true after the process has entered recovery');
assert.match(workbenchSource, /const isGuideHeatCapacityReleaseCompleteForU2 =[\s\S]*pressureTarget <= Math\.max\(5, recordedU1Mv \* 0\.14\)/, 'guide U2 release readiness should derive its pressure threshold from the active trial U1 instead of profile defaults');
assert.match(workbenchSource, /const isGuideU1RecordReady =[\s\S]*isGuideHeatCapacityTemperatureAtAmbient\(file\)/, 'U1 recording should require temperature recovery to the room baseline');
assert.match(workbenchSource, /const isGuideU2RecordReady =[\s\S]*isGuideHeatCapacityTemperatureAtAmbient\(file\)/, 'U2 recording should require temperature recovery to the room baseline');
assert.match(workbenchSource, /stabilizeBeforeReleaseRequired:\s*waitBeforeU1Message/, 'waiting for U1 should use the normal process guidance copy');
assert.match(workbenchSource, /recoverRequired:\s*recoverMessage/, 'waiting for U2 should use the normal process guidance copy');
assert.match(workbenchSource, /请保持气瓶封闭等待 5 min；计时到达后记录 U₁ \/ Uₜ₁。/, 'U1 waiting guidance should teach the sealed 5 min standard');
assert.match(workbenchSource, /请关闭玻璃旋塞后等待 5 min；回温稳定后记录 U₂ \/ Uₜ₂。/, 'U2 recovery guidance should teach the 5 min recovery standard');
assert.match(workbenchSource, /latestStep === 'stabilizeBeforeReleaseRequired' \|\| latestStep === 'recoverRequired'[\s\S]*return;/, 'waiting for stable U1 or U2 should never escalate to a strong reminder while the timer is still running');
assert.match(workbenchSource, /const isGuideU2RecordReady =[\s\S]*const recordedU1Mv = getActiveTrialRecordedU1Mv\(file\)/, 'U2 readiness should not borrow U1 from a previous completed trial');
assert.match(workbenchSource, /if \(!releaseComplete\) return 'openStopcockReleaseRequired';[\s\S]*if \(stopcockState === 'open'\) return 'closeStopcockAfterReleaseRequired'/, 'guide release flow should keep the stopcock open until Uₚ has dropped near zero');
assert.match(workbenchSource, /const u1Ready = isGuideU1RecordReady\(file\)/, 'guide workflow should use the U1 stable-window helper');
assert.match(workbenchSource, /const u2Ready = isGuideU2RecordReady\(file\)/, 'guide workflow should use the U2 stable-window helper');
assert.match(workbenchSource, /const hasU1 = hasActiveTrialU1\(file\)/, 'guide workflow should decide U1 completion from the active trial only');
assert.match(workbenchSource, /const hasU2 = hasActiveTrialU2\(file\)/, 'guide workflow should decide U2 completion from the active trial only');
assert.match(workbenchSource, /const recordedU1Mv = getActiveTrialRecordedU1Mv\(file\)/, 'guide workflow should derive release state from the active trial U1 only');
assert.doesNotMatch(workbenchSource, /isActiveTrialComplete\(file\) && completedTrialCount < file\.heatCapacityExpectedTrialCount/, 'guide workflow should not keep the old next-trial gate');
assert.doesNotMatch(workbenchSource, /const hasU1 = file\.heatCapacityTrials\.some\(\(trial\) => trial\.U1Mv !== null\)/, 'guide workflow must not use global U1 presence to advance the active trial');
assert.doesNotMatch(workbenchSource, /const hasU2 = file\.heatCapacityTrials\.some\(\(trial\) => trial\.U2Mv !== null\)/, 'guide workflow must not use global U2 presence to advance the active trial');
assert.doesNotMatch(workbenchSource, /file\.heatCapacityTrials\.find\(\(trial\) => trial\.U1Mv !== null\)\?\.U1Mv/, 'guide workflow must not borrow recorded U1 from earlier trials');
assert.doesNotMatch(workbenchSource, /const u1Ready =[\s\S]*pressureValue >= 80[\s\S]*!file\.pressureOverLimit/, 'guide U1 record readiness should not depend on the old single 80 mV threshold');
assert.doesNotMatch(workbenchSource, /expectedU1 \* 0\.62/, 'guide U1 readiness should not reintroduce the too-strict platform threshold');
const u1ReadyBlock = workbenchSource.match(/const isGuideU1RecordReady =[\s\S]*?const isGuideU2RecordReady =/)?.[0] ?? '';
assert.doesNotMatch(u1ReadyBlock, /file\.heatCapacityPhase === 'recovering'/, 'U1 readiness must not treat the post-release recovery phase as before-release stability');
assert.match(workbenchSource, /const isGuideU0ZeroReady =/, 'guide U0 recording should have a dedicated zero-ready helper');
assert.match(workbenchSource, /const isGuideU0ZeroAttempted =/, 'guide zero guidance should distinguish no adjustment from an incomplete adjustment');
assert.match(guideStepModelSource, /recordU0Required:\s*\['adjustPressureZero',\s*'recordU0'\]/, 'U0 recording stage should still allow continued pressure-zero adjustment');
assert.match(workbenchSource, /if \(!isGuideU0ZeroReady\(file\)\) return 'zeroAdjustRequired'/, 'guide workflow should not advance to U0 recording until the pressure-zero value is actually acceptable');
assert.doesNotMatch(workbenchSource, /if \(!file\.pressureZeroAdjusted\) return 'zeroAdjustRequired';\s*return 'recordU0Required';/, 'guide workflow should not treat any pressure-zero adjustment as a successful zero');
assert.doesNotMatch(workbenchSource, /kind === 'u0'[\s\S]*Math\.abs\(zeroReferenceMv\) > 1\.5[\s\S]*recordU0Warning/, 'record U0 click should not run a second, looser validation after the workflow already exposes the button');
assert.doesNotMatch(workbenchSource, /pressureValue\s*[<>]=?\s*80/, 'guide U1 flow should not keep the old fixed 80 mV transition threshold');
assert.doesNotMatch(workbenchSource, /不建议记录 U₀|不建議記錄 U₀|U₀ recording is not recommended/, 'U0 guidance should not imply optional recording after the workflow exposes the record button');
assert.doesNotMatch(workbenchSource, /--heat-record-focus-offset/, 'guide record controls should move through the shared overlay slot instead of a measured focus-panel offset');
assert.doesNotMatch(styleSource, /studio-heat-record-controls-focus-raised/, 'guide record controls should not use focus-only lift classes');
assert.match(guideStepModelSource, /openStopcockForZeroRequired:\s*\['openStopcock'\]/, 'guide workflow should require opening the stopcock before pressure zeroing');
assert.match(guideStepModelSource, /openStopcockReleaseRequired:\s*\['openStopcock',\s*'closeStopcock'\]/, 'guide release step should allow the user to close an already-open stopcock without deadlocking the checklist');
assert.doesNotMatch(workbenchSource, /getHeatCapacityCompletedTrialCount\(file\.heatCapacityTrials\)[\s\S]*file\.heatCapacityExpectedTrialCount[\s\S]*return 'nextTrialRequired'/, 'guide workflow should not require old expected trial counts');
assert.doesNotMatch(workbenchSource, /const startNextHeatCapacityGuideTrial|data-heat-capacity-mode-action="next-trial"|calculateRequired:\s*\['calculate'\]/, 'guide mode should not render or guard old next-trial/calculation actions');
assert.doesNotMatch(workbenchSource, /const animateHeatCapacityStopcockAngle =/, 'auto demo stopcock actions should not use the old continuous angle writer that fights the scene-level two-state animation');
assert.match(workbenchSource, /const setHeatCapacityStopcockOpenByFileId =[\s\S]*getHeatCapacityStopcockTargetAngle\(nextOpen\)[\s\S]*glassPistonState: nextOpen \? 'open' : 'closed'/, 'auto demo stopcock actions should write the same open/closed target state used by user interaction');
assert.match(workbenchSource, /closeStopcockForPumping' \|\| action === 'closeStopcockForRecovery'[\s\S]*setHeatCapacityStopcockOpenByFileId\(fileId, false\)/, 'auto demo close-stopcock actions should use the two-state stopcock helper');
assert.match(workbenchSource, /openStopcockForRelease' \|\| action === 'openStopcockForZero'[\s\S]*setHeatCapacityStopcockOpenByFileId\(fileId, true\)/, 'auto demo open-stopcock actions should use the two-state stopcock helper');
assert.doesNotMatch(workbenchSource, /GUIDE_HEAT_CAPACITY_IDLE_HINT_DELAY_MS|GUIDE_HEAT_CAPACITY_IDLE_HINT_REPEAT_MS/, 'guide workflow should not keep obsolete 1s/3s idle hint constants after moving to ten-second strong reminders');
assert.doesNotMatch(workbenchSource, /scheduleManualIdleHint/, 'guide workflow should not keep legacy idle-hint validation markers after moving to ten-second strong reminders');
assert.match(workbenchSource, /activeHeatCapacityGuideStep/, 'guide idle hint scheduling should depend on a stable guide step value instead of the whole active file object');
assert.doesNotMatch(workbenchSource, /useEffect\(\(\) => \{[\s\S]*guideHeatCapacityIdleTimerRef[\s\S]*\}, \[\s*activeFile,/, 'guide idle hint timer must not depend on the full activeFile object that ticks every 100ms');
assert.match(modeActivationSource, /const resolveHeatCapacityModeTarget = \([\s\S]*if \(targetMode === 'guide'\) \{[\s\S]*startHeatCapacityGuideWorkbenchState\(suspendedFile, now\)[\s\S]*activation: 'fresh-guide'/, 'activating Guide Mode should create a fresh tutorial state only when no resumable checkpoint exists');
assert.match(workbenchSource, /target\.activation === 'fresh-guide'[\s\S]*showHeatCapacityAutoDemoCompletionToast\([\s\S]*heatCapacityRealtimeCopy\.guideModeStartingToast,[\s\S]*HEAT_CAPACITY_GUIDE_START_NOTICE_MS/, 'starting a fresh Guide Mode should show the localized centered start notice as part of the prepared target projection');
assert.doesNotMatch(workbenchSource, /const activateHeatCapacityGuideExperiment|const startHeatCapacityGuideExperiment/, 'Guide Mode should not retain the old delayed activation wrappers after switching to checkpoint-aware mode sessions');
assert.match(workbenchSource, /setGuideHeatCapacityActiveFileId\(null\)/, 'starting auto demo should disable the guide tutorial state machine');
assert.match(viewportFeedbackStyleSource, /\.prompt-viewport-feedback/, 'guide heat-capacity feedback should use the shared viewport style');
assert.match(styleSource, /@keyframes studio-heat-guide-record-pulse/, 'recording guidance should use a restrained pulse animation');
assert.match(workbenchSource, /adjustHeatCapacityPressureZeroFine/, 'workbench should route pressure zero wheel changes to heatCapacity state');
assert.match(workbenchSource, /adjustHeatCapacityPressureZeroCoarse/, 'workbench should route pressure zero drag changes to heatCapacity state');
assert.match(workbenchSource, /const \[heatCapacityPumpPulseId, setHeatCapacityPumpPulseId\]/, 'workbench should keep pump pulse as local UI-only state');
assert.match(workbenchSource, /setHeatCapacityPumpPulseId\(\(pulseId\) => pulseId \+ 1\)/, 'each pump press should retrigger local visual feedback');
assert.doesNotMatch(workbenchSource, /heatCapacityGuideWorkflow\.step !== 'pumpRequired'[\s\S]{0,120}return;/, 'off-step guide bulb presses must reach the shared guard so partial rollback feedback can run');
assert.match(workbenchSource, /guardGuideHeatCapacityAction\('pumpBulb', source\)\) return;/, 'guide bulb presses should be rejected by the shared guard before any real pump pulse or data update');
assert.match(workbenchSource, /pumpPulseId=\{heatCapacityPumpPulseId\}/, 'workbench should pass local pump pulse signal into the 3D scene');
assert.match(workbenchSource, /pressureKPa={activeFile\.pressureKPa}/, 'workbench should pass current pressureKPa into the 3D gauge');
assert.match(workbenchSource, /pressureLimitKPa={activeFile\.pressureLimitKPa}/, 'workbench should pass pressureLimitKPa into the 3D gauge');
assert.match(workbenchSource, /gaugePressureMinKPa=\{activeFile\.gaugePressureMinKPa\}/, 'workbench should pass gauge pressure min into the 3D pressure gauge');
assert.match(workbenchSource, /gaugePressureMaxKPa=\{activeFile\.gaugePressureMaxKPa\}/, 'workbench should pass gauge pressure max into the 3D pressure gauge');
assert.match(workbenchSource, /pressureSafetyThresholdKPa=\{activeFile\.pressureSafetyThresholdKPa\}/, 'workbench should pass safety threshold into the 3D pressure gauge');
assert.match(workbenchSource, /pressureOverLimit=\{activeFile\.pressureOverLimit\}/, 'workbench should pass pressure over-limit state into the 3D pressure gauge');
assert.match(workbenchSource, /data-heat-capacity-pressure-warning="true"/, 'workbench should render a centered red pressure warning from pressureOverLimit');
assert.match(workbenchSource, /studio-heat-pressure-warning-kicker/, 'pressure warning markup should include an engineering status kicker');
assert.match(heatCapacityRealtimeCopySource, /pressureAlarmTitle:\s*'报警'/, 'center alarm title should be alarm, not generic danger warning');
assert.match(instrumentStateSource, /HEAT_CAPACITY_PRESSURE_INSUFFICIENT_THRESHOLD_MV = 90/, 'interactive pumping should consider 90 mV sufficient instead of the old 100 mV gate');
assert.match(instrumentStateSource, /HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV = 120/, 'suggested stop hint should begin at the confirmed 120 mV target');
assert.match(instrumentStateSource, /HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV = 140/, 'alarm should remain above the 4-stroke Free Mode target window');
assert.match(defaultConfigSource, /minimumUsefulU1CorrectedMv:\s*90/, 'Free U1 recording threshold should stay at 90 mV in the shared default config');
assert.match(instrumentStateSource, /压强已达到建议打气范围，请停止打气并等待回温。/, 'pressure warning copy should use ordinary suggested-stop wording');
assert.match(freeParameterPanelModelSource, /label:\s*\{ 'zh-CN': '建议停止阈值'[\s\S]*en: 'Suggested-stop threshold' \}/, 'pressure warning parameter label should use suggested-stop wording instead of error-like warning wording');
assert.match(heatCapacityRealtimeCopySource, /warning:\s*'建议停止'[\s\S]*warningNote:\s*'等待回温'/, 'warning safety status should read as a normal suggested-stop state');
assert.doesNotMatch(workbenchSource, /压力警告阈值|壓力警告閾值|Pressure warning threshold|warning:\s*'接近阈值'|warningNote:\s*'准备停止打气'/, 'old warning-like suggested-stop labels should be removed');
assert.match(instrumentStateSource, /压强已超过安全阈值，瓶塞可能被顶开，请立即停止打气。/, 'pressure alarm copy should use the confirmed alarm wording');
assert.doesNotMatch(instrumentStateSource, /压强接近预警值，请注意|压强接近安全阈值，请准备停止打气|压强超过安全阈值，请停止打气(?!。)/, 'old pressure warning and alarm wording should be removed');
assert.doesNotMatch(workbenchSource, /危险：压强超过阈值/, 'center alarm title should not keep the older threshold wording');
assert.match(workbenchSource, /HEAT_CAPACITY_PRESSURE_ALARM_DURATION_MS = 2000/, 'center alarm should stay visible for two seconds');
assert.match(workbenchSource, /HEAT_CAPACITY_CLOSE_PUMP_VALVE_REMINDER_AFTER_ALARM_MS = 220/, 'close-valve reminder should wait until after the center alarm has been cleared');
assert.match(heatCapacityRealtimeCopySource, /closePumpValveReminder:\s*'请关闭打气阀门。'/, 'alarm follow-up should ask the user to close the pump valve through localized copy');
assert.match(heatCapacityRealtimeCopySource, /closePumpValveReminder:\s*'Close the pump valve\.'/, 'alarm follow-up should have English localized copy');
assert.match(workbenchSource, /heatCapacityPressureAlarmVisible/, 'center pressure alarm should be controlled by a transient visible state instead of staying mounted while over limit');
assert.match(workbenchSource, /const effectivePressureSafetyStatus = activeHeatCapacityPressureAlarmVisible \? 'danger' : activeFile\.pressureSafetyStatus/, 'right-side safety card should show danger only while the active file owns the center alarm');
assert.match(workbenchSource, /studio-heat-safety-\$\{effectivePressureSafetyStatus\}/, 'right-side safety card color should follow the effective visible alarm status');
assert.match(workbenchSource, /showHeatCapacityPolicyToast\(heatCapacityRealtimeCopy\.pressureWarningMessage,\s*'pressureWarning'\)/, 'suggested-stop hint should use ordinary info styling while keeping localized copy visible');
assert.match(toastPolicySource, /pressureWarning:\s*\{[\s\S]*level:\s*'info'[\s\S]*priority:\s*HEAT_CAPACITY_PRESSURE_WARNING_TOAST_PRIORITY[\s\S]*source:\s*'pressure-warning'/, 'prewarning should have an explicit safety toast policy above ordinary guidance');
assert.match(toastPolicySource, /pressureAlarm:\s*\{[\s\S]*priority:\s*HEAT_CAPACITY_CRITICAL_TOAST_PRIORITY[\s\S]*source:\s*'pressure-alarm'[\s\S]*pressureCloseValve:\s*\{[\s\S]*priority:\s*HEAT_CAPACITY_CRITICAL_TOAST_PRIORITY[\s\S]*source:\s*'pressure-close-valve'/, 'alarm and close-valve reminders should have an explicit policy above prewarning');
assert.match(toastControllerSource, /export type HeatCapacityToastSource =[\s\S]*'guide'[\s\S]*'guide-blocked'[\s\S]*'pressure-warning'[\s\S]*'pressure-close-valve'/, 'heat-capacity bottom toasts should track their source in the shared toast controller');
assert.match(toastControllerSource, /export type HeatCapacityToastLevel = 'info' \| 'success' \| 'warning' \| 'danger'/, 'heat-capacity bottom toasts should support a green success level in the shared toast controller');
assert.match(workbenchSource, /resolveHeatCapacityToastShow/, 'Workbench should delegate heat-capacity toast queue decisions to the shared toast controller');
assert.match(viewportFeedbackStyleSource, /\.prompt-viewport-feedback-success\s*\{[\s\S]*--prompt-viewport-feedback-tone:\s*var\(--prompt-success/, 'successful heat-capacity records should share the formal success color token');
assert.match(promptShellStyleSource, /\.studio-workbench\.studio-theme-light[\s\S]*--prompt-success:\s*#2f8555;/, 'light theme should keep the shared success color readable');
assert.match(toastControllerSource, /export const isHeatCapacityPressureToast =[\s\S]*message\?\.source === 'pressure-warning'[\s\S]*message\?\.source === 'pressure-close-valve'/, 'pressure warning and post-alarm close-valve reminders should share the protected safety toast class');
assert.match(toastControllerSource, /isHeatCapacityPressureToast\(current\) && !isHeatCapacityPressureToast\(nextMessage\)[\s\S]*return unchangedToastQueue\(state\)/, 'ordinary guide hints must not interrupt an active pressure warning or post-alarm close-valve reminder');
assert.match(toastControllerSource, /isHeatCapacityPressureToast\(pending\) && !isHeatCapacityPressureToast\(nextMessage\)[\s\S]*return unchangedToastQueue\(state\)/, 'ordinary guide hints must not queue stale guidance behind a protected pressure toast');
assert.match(workbenchSource, /const clearGuideHeatCapacityGuidance = \(\) => \{[\s\S]*clearHeatCapacityToastBySource\(isHeatCapacityGuideToast\)/, 'clearing guide guidance must not erase pressure warning or post-alarm close-valve reminders');
assert.match(viewportFeedbackControllerSource, /current && current\.priority > nextMessage\.priority[\s\S]*return unchangedPromptViewportFeedbackQueue\(state\)/, 'lower-priority toasts must not interrupt an active safety warning or critical reminder');
assert.match(viewportFeedbackControllerSource, /nextMessage\.priority < current\.priority[\s\S]*return unchangedPromptViewportFeedbackQueue\(state\)/, 'lower-priority toasts must not queue behind an active safety warning');
assert.match(toastPolicySource, /pressureWarning:\s*\{[\s\S]*interrupt:\s*true,[\s\S]*priority:\s*HEAT_CAPACITY_PRESSURE_WARNING_TOAST_PRIORITY,[\s\S]*source:\s*'pressure-warning'/, 'suggested-stop hint should use the protected pressure-warning source and explicit priority');
assert.match(toastPolicySource, /pressureCloseValve:\s*\{[\s\S]*interrupt:\s*true,[\s\S]*priority:\s*HEAT_CAPACITY_CRITICAL_TOAST_PRIORITY,[\s\S]*source:\s*'pressure-close-valve'/, 'post-alarm close-valve reminder should use a protected source and outrank prewarning and ordinary guidance');
assert.match(workbenchSource, /else if \(pressureStatusAfterPump === 'warning'\) \{[\s\S]*showHeatCapacityPolicyToast\(heatCapacityRealtimeCopy\.pressureWarningMessage,\s*'pressureWarning'\)/, 'suggested-stop hint should remain visible when the user continues pumping inside the warning band');
assert.doesNotMatch(workbenchSource, /pressureStatusAfterPump === 'warning' && pressureStatusBeforePump === 'normal'/, 'prewarning should not depend only on a perfect normal-to-warning transition');
assert.match(workbenchSource, /clearHeatCapacityToastQueue\(\)[\s\S]*setHeatCapacityPressureAlarmVisible\(true\)/, 'showing the center alarm should immediately remove the bottom warning hint');
assert.match(workbenchSource, /<span>\{heatCapacityRealtimeCopy\.pressureWarningFallback\}<\/span>/, 'center pressure alarm should always show the confirmed alarm message instead of a stale realtime safety message');
assert.doesNotMatch(workbenchSource, /activeFile\.pressureSafetyMessage \?\? heatCapacityRealtimeCopy\.pressureWarningFallback/, 'center pressure alarm must not reuse warning-region safety copy');
assert.match(workbenchSource, /const showHeatCapacityPressureAlarm = [\s\S]*exitHeatCapacityFocusMode\(\);/, 'pressure alarm should exit any active focus mode');
assert.doesNotMatch(workbenchSource, /shouldBlockHeatCapacityPumpForPressureDanger/, 'pressure danger must not keep the user out of pump focus or suppress physical press feedback');
assert.match(workbenchSource, /const clearHeatCapacityPressureAlertUiState = \([\s\S]*heatCapacityPressureAlarmVisibleRef\.current = false;[\s\S]*setHeatCapacityPressureAlarmVisible\(false\)/, 'clearing transient pressure-alert UI should synchronously reset the alarm-visible ref as well as React state');
assert.match(workbenchSource, /const activeHeatCapacityPressureAlarmVisible = heatCapacityPressureAlarmVisible &&[\s\S]*heatCapacityPressureAlarmFileIdRef\.current === activeFile\.id;/, 'a center pressure alarm should be visible only in its owning Heat Capacity file');
assert.match(workbenchSource, /pausedPressureAlarm = desktopExitPausedPressureAlarmRef\.current\?\.fileId === currentFile\.id[\s\S]*resolveWorkbenchHeatCapacityPressureAlertRefreshProjection\(\{[\s\S]*pressureAlarmVisible: heatCapacityPressureAlarmFileIdRef\.current === currentFile\.id[\s\S]*pressureAlarmRemainingMs,[\s\S]*pressureAlarmVisible: pressureAlertRefreshProjection\.pressureAlarmVisible,[\s\S]*pressureAlarmRemainingMs: pressureAlertRefreshProjection\.pressureAlarmRemainingMs/, 'a pressure alarm must be serialized only into its owning file refresh checkpoint, including frozen desktop-exit timing and an atomic pagehide deadline projection');
assert.match(workbenchSource, /heatCapacityPressureAlarmFileIdRef\.current = restoreSession\.activeHeatCapacityFileId;[\s\S]*scheduleHeatCapacityPressureAlarmExpiry\(\s*restoreSession\.activeHeatCapacityFileId,[\s\S]*pressureAlarmRemainingMs/, 'restored pressure-alarm timing should retain explicit ownership by the restored file');
assert.match(workbenchSource, /const restartHeatCapacityFreeExperiment = \(\) => \{[\s\S]*resetHeatCapacityGroupUiRuntime\(\)/, 'restarting the current experiment should clear transient pressure-alert UI through the shared group UI reset');
assert.match(workbenchSource, /const clearHeatCapacityModeTransientUiRuntime = \(\) => \{[\s\S]*clearHeatCapacityPressureAlertUiState\(\)/, 'projecting an independent mode session should clear transient pressure-alert UI owned by the mode being left');
assert.match(workbenchSource, /const updateHeatCapacityFocusMode = \(mode: HeatCapacityFocusMode\) => \{[\s\S]*heatCapacityFocusSessionRef\.current =/, 'pump focus entry should use the normal focus-session path without pressure-based UI blocking');
assert.match(workbenchSource, /const pressHeatCapacityPumpBulb = [\s\S]*source !== 'autoDemo' && heatCapacitySceneFocusModeRef\.current !== 'pump'\) return;[\s\S]*guardGuideHeatCapacityAction\('pumpBulb', source\)[\s\S]*registerHeatCapacityPumpStroke\(fileBeforePump,\s*now\)[\s\S]*setHeatCapacityPumpPulseId/, 'focused user presses should follow one focus gate, one guide guard, one physical attempt, and one full feedback pulse');
assert.match(workbenchSource, /showHeatCapacityPolicyToast\(heatCapacityRealtimeCopy\.closePumpValveReminder,\s*'pressureCloseValve'\)/, 'post-alarm close-valve reminder should use the same overriding bottom-center hint path');
{
  const alarmFunctionStart = workbenchSource.indexOf('const scheduleHeatCapacityPressureAlarmExpiry =');
  const alarmTimerStart = workbenchSource.indexOf('heatCapacityPressureAlarmTimerRef.current = window.setTimeout(() => {', alarmFunctionStart);
  const alarmTimerEnd = workbenchSource.indexOf('}, normalizedDelayMs);', alarmTimerStart);
  const hideAlarm = workbenchSource.indexOf('setHeatCapacityPressureAlarmVisible(false);', alarmTimerStart);
  const closeValveReminder = workbenchSource.indexOf('scheduleHeatCapacityClosePumpValveReminder(', alarmTimerStart);
  assert.ok(
    alarmTimerStart > alarmFunctionStart &&
    hideAlarm > alarmTimerStart &&
    closeValveReminder > hideAlarm &&
    closeValveReminder < alarmTimerEnd,
    'close-valve reminder should be scheduled from inside the alarm-hide timer so it cannot overlap the center alarm',
  );
}
assert.match(workbenchSource, /if \(currentFile\?\.kind !== 'heatCapacity' \|\| !currentFile\.pumpValveOpen\) return;[\s\S]*if \(currentFile\.pressureSafetyStatus !== 'danger' && !currentFile\.pressureOverLimit\) return;[\s\S]*showHeatCapacityPolicyToast\(heatCapacityRealtimeCopy\.closePumpValveReminder,\s*'pressureCloseValve'\)/, 'post-alarm close-valve reminder should only persist while the valve is open and the current pressure is still dangerous');
assert.match(workbenchSource, /pausedClosePumpValveReminder =[\s\S]*desktopExitPausedClosePumpValveReminderRef\.current\?\.fileId === currentFile\.id[\s\S]*closePumpValveReminderRemainingMs,[\s\S]*closePumpValveReminderFileId: pressureAlertRefreshProjection\.closePumpValveReminderFileId,[\s\S]*pressureAlertRefreshProjection\.closePumpValveReminderRemainingMs/, 'the post-alarm close-valve delay should persist its file context and exact remaining time only in its owning file checkpoint');
assert.match(workbenchSource, /if \(nextAction === 'closePumpValve'\) \{[\s\S]*heatCapacityClosePumpValveReminderFileIdRef\.current === currentFile\?\.id[\s\S]*clearHeatCapacityClosePumpValveReminder\(\);/, 'closing the pump valve should cancel only that file’s pending post-alarm reminder');
assert.match(workbenchSource, /if \(\s*desktopExitQuiescedRef\.current \|\|\s*heatCapacityRuntimeFailureFileIdRef\.current === fileId\s*\) \{[\s\S]*desktopExitPausedClosePumpValveReminderRef\.current[\s\S]*return;[\s\S]*heatCapacityClosePumpValveReminderFileIdRef\.current = null;\s*if \(activeFileIdRef\.current !== fileId\) return;/, 'a delayed close-valve reminder must freeze for desktop exit or runtime failure and must not leak into another active file');
assert.doesNotMatch(workbenchSource, /if \(!currentFile\.pressureOverLimit \|\| !currentFile\.pumpValveOpen\) return;/, 'post-alarm close-valve reminder should not use the old one-field guard that ignored current safety status');
assert.doesNotMatch(workbenchSource, /let pumpedHeatCapacityFile[\s\S]*updateFileById\(fileId,\s*\(file\) => \{[\s\S]*pumpedHeatCapacityFile = nextFile/, 'pressure threshold events must not depend on assigning a value inside a React state updater');
assert.match(workbenchSource, /let nextHeatCapacityFile = fileBeforePump\?\.kind === 'heatCapacity'[\s\S]*registerHeatCapacityPumpStroke\(fileBeforePump,\s*now\)/, 'pump result should be calculated synchronously before updating React state');
assert.match(workbenchSource, /updateFileById\(fileId,\s*\(file\) => \{[\s\S]*return nextHeatCapacityFile;/, 'React state update should use the synchronously calculated pump result');
assert.match(workbenchSource, /source !== 'autoDemo'[\s\S]*nextHeatCapacityFile[\s\S]*!guidePumpTargetReached[\s\S]*nextHeatCapacityFile\.powerOn[\s\S]*showHeatCapacityPressureAlarm\(nextHeatCapacityFile\.id,\s*nextHeatCapacityFile\.name\)/, 'powered warning and alarm overlays should be triggered from the synchronously calculated pump result outside the Guide target-reached branch');
assert.match(workbenchSource, /nextHeatCapacityFile\.heatCapacityMode !== 'free' \|\| nextHeatCapacityFile\.heatCapacityFreePreheatCompleted/, 'Free electronic alarm overlays should require completed preheating');
assert.match(workbenchSource, /getHeatCapacityPressureThresholdsMv\(file\)/, 'pressure toast status should read the current Heat Capacity safety thresholds from the active file');
assert.doesNotMatch(workbenchSource, /getHeatCapacityPressureSafetyStatusFromMv[\s\S]{0,260}HEAT_CAPACITY_PRESSURE_DANGER_THRESHOLD_MV/, 'pressure status must not classify danger using the fixed 140 mV constant');
assert.doesNotMatch(workbenchSource, /getHeatCapacityPressureSafetyStatusFromMv[\s\S]{0,320}HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV/, 'pressure status must not classify warning using the fixed 115 mV constant');
assert.doesNotMatch(workbenchSource, /showHeatCapacityPressureThresholdToast[\s\S]{0,420}HEAT_CAPACITY_PRESSURE_(?:WARNING|DANGER)_THRESHOLD_MV/, 'pressure toast copy must not be gated by fixed 115/140 mV constants');
assert.match(workbenchSource, /pushLog\(\s*\(language\) => getHeatCapacityRealtimeCopy\(language\)\.pressureAlarmLog\(fileName\),\s*'warning'\s*,?\s*\)/, 'only alarm should write a language-reactive console warning');
assert.doesNotMatch(workbenchSource, /pushLog\(`\$\{[^`]+\.name\}: 压强已达到建议打气范围，请停止打气并等待回温。`,\s*'warning'\)/, 'suggested-stop hint should not write a console warning');
assert.match(workbenchSource, /nextFrequencyState\.pumpFrequencyStatus === 'tooSlow'/, 'slow-pump toast should follow the same frequency status as the realtime panel');
assert.match(workbenchSource, /nextFrequencyState\.timestamps\.length >= 2/, 'slow-pump toast should wait for at least two strokes before judging cadence');
assert.doesNotMatch(workbenchSource, /nextFrequencyState\.pumpFrequency < HEAT_CAPACITY_PUMP_RATE_SLOW_THRESHOLD_HZ/, 'slow-pump toast should not use a stale separate 2 Hz threshold');
assert.match(guideStepModelSource, /closePumpValveRequired:\s*\['closePumpValve'\]/, 'Guide should not accept more pump-bulb presses after the displayed pressure reaches the target');
assert.doesNotMatch(guideStepModelSource, /closePumpValveRequired:\s*\[[^\]]*'pumpBulb'/, 'Guide close-pump-valve step must not keep the old pump-bulb action path');
assert.doesNotMatch(u1ReadyBlock, /!file\.pressureOverLimit/, 'guide U1 readiness should allow continuing the experiment after an alarm once the user closes the valve and readings stabilize');
assert.doesNotMatch(workbenchSource, /input\.pressureOverLimit \|\| input\.pressureSafetyStatus === 'danger'/, 'current recording should not reject U1 solely because the pressure alarm was reached through a legacy trial helper');
assert.match(workbenchSource, /source === 'autoDemo' &&[\s\S]*getGuideHeatCapacityThresholdPressureMv\(nextHeatCapacityFile\) >= \([\s\S]*pressureDangerThresholdMv[\s\S]*\)\s*\{\s*return;/, 'auto demo pump strokes should be rejected before they can enter the alarm region');
assert.doesNotMatch(workbenchSource, /willHeatCapacityAutoDemoPumpExceedAlarm/, 'auto demo pressure guarding should not keep an unused duplicate projection helper');
assert.match(getLastRootCssBlock('.studio-heat-pressure-warning'), /aspect-ratio:\s*auto;/, 'center alarm should use a compact content-sized warning surface');
assert.match(getLastRootCssBlock('.studio-heat-pressure-warning'), /background:\s*color-mix\([\s\S]*var\(--prompt-feedback-surface\)/, 'center alarm should use the approved softly tinted formal feedback surface');
assert.match(getLastRootCssBlock('.studio-heat-pressure-warning'), /box-shadow:[\s\S]*0 0 0 1px[\s\S]*var\(--prompt-feedback-shadow\)/, 'center alarm should use a balanced outline and elevation');
assert.match(getLastRootCssBlock('.studio-heat-pressure-warning'), /backdrop-filter:\s*none;/, 'center alarm should not use blurred glass styling');
assert.match(styleSource, /\.studio-heat-pressure-warning \{[\s\S]*animation:\s*studioOverlayFadeIn/, 'center alarm should fade in without movement or scale');
assert.match(workbenchSource, /temperatureSignalMv=\{activeFile\.powerOn && !activeHeatCapacityPreheatLocked \? activeHeatCapacityDisplay\.temperatureMv : null\}/, 'instrument screens should read the active temperature display channel by mode and hide it during preheat');
assert.match(workbenchSource, /pressureSignalMv=\{activeFile\.powerOn && !activeHeatCapacityPreheatLocked \? activeHeatCapacityDisplay\.pressureMv : null\}/, 'instrument screens should read the active pressure display channel by mode and hide it during preheat');
assert.match(workbenchSource, /<HeatCapacityPreheatOverlay[\s\S]*paused=\{heatCapacityRefreshRestoring \|\| heatCapacityModeTransitionLocked \|\| \([\s\S]*activeHeatCapacityPreheatMode === 'demo' && autoDemoPaused[\s\S]*\)\}/, 'all heat-capacity modes should freeze the shared preheat overlay during refresh restoration or a mode transition, while Demo also follows the explicit pause state');
assert.equal((workbenchSource.match(/normalizeHeatCapacityAutoDemoResumeCursor\(timeline,/g) ?? []).length, 2, 'mode-session return and page-refresh return must share the same interrupted-preheat normalization model');
assert.match(workbenchSource, /overlayCenter=\{heatCapacityCenterOverlay\}[\s\S]*overlayCenterAboveGuideMask/, 'modal content and information toasts should be raised above scene locks, guide panels, and strong reminders');
assert.match(sceneSource, /studio-preview-overlay-center-above-guide-mask/, 'scene overlay should expose an explicit modal-above-mask layer');
assert.match(styleSource, /\.studio-preview-overlay-center-above-guide-mask\s*\{[\s\S]*?z-index:\s*20;/, 'raised center content should sit above the z-index 18 guide panel and z-index 11 strong reminder');
assert.match(sceneSource, /name="TemperatureDisplayChannelLabelText"[\s\S]*Uₜ \/ mV/, 'instrument host should label the left screen as the temperature signal channel');
assert.match(sceneSource, /name="PressureDisplayChannelLabelText"[\s\S]*Uₚ \/ mV/, 'instrument host should label the pressure screen as the pressure signal channel');
assert.doesNotMatch(sceneSource, /InstrumentPanelTitleText|FD-NCD-C/, 'the fallback instrument must not retain a standalone model label');
assert.match(sceneSource, /const INSTRUMENT_PANEL_CHANNEL_LABEL_TEXT_SIZE = 0\.034;/, 'instrument channel labels should be enlarged but remain smaller than display values');
assert.match(sceneSource, /const INSTRUMENT_PANEL_INPUT_LABEL_TEXT_SIZE = 0\.032;/, 'instrument input labels should be enlarged but stay below the terminals');
assert.match(ultraModelSource, /const ULTRA_MAIN_DISPLAY_SCALE = 1\.32;/, 'the complete Ultra nameplate and digital display should share one proportional scale');
assert.match(ultraModelSource, /ULTRA_MAIN_DISPLAY_MODEL_LABEL_NODE_NAMES[\s\S]*HSL_MainDisplay_ModelNameWhiteArt[\s\S]*node\.visible = false/, 'the Ultra instrument must hide the standalone model label and its backing nodes');
assert.match(ultraModelSource, /displayGroup\.scale\.set\(ULTRA_MAIN_DISPLAY_SCALE, ULTRA_MAIN_DISPLAY_SCALE, 1\)/, 'the display component should scale as one runtime group without changing depth');
assert.match(ultraModelSource, /ULTRA_MAIN_DISPLAY_ROW_HALO_SIZE[\s\S]*instrumentPressureDisplay[\s\S]*size: ULTRA_MAIN_DISPLAY_ROW_HALO_SIZE[\s\S]*instrumentTemperatureDisplay[\s\S]*size: ULTRA_MAIN_DISPLAY_ROW_HALO_SIZE/, 'display focus halos should follow the enlarged display geometry');
assert.match(sceneSource, /name="TemperatureDisplayChannelLabelText"\s+position=\{\[-0\.64, 0\.215, 0\.505\]\}\s+size=\{INSTRUMENT_PANEL_CHANNEL_LABEL_TEXT_SIZE\}/, 'temperature channel label should keep its safe gap above the screen');
assert.match(sceneSource, /name="PressureDisplayChannelLabelText"\s+position=\{\[0, 0\.215, 0\.505\]\}\s+size=\{INSTRUMENT_PANEL_CHANNEL_LABEL_TEXT_SIZE\}/, 'pressure channel label should keep its safe gap above the screen');
assert.match(sceneSource, /name="TemperatureInputPortLabelText"\s+position=\{\[-0\.64, -0\.23, 0\.505\]\}\s+size=\{INSTRUMENT_PANEL_INPUT_LABEL_TEXT_SIZE\}/, 'temperature input label should keep its safe lower-panel position');
assert.match(sceneSource, /name="PressureInputPortLabelText"\s+position=\{\[-0\.08, -0\.24, 0\.505\]\}\s+size=\{INSTRUMENT_PANEL_INPUT_LABEL_TEXT_SIZE\}/, 'pressure input label should keep its safe lower-panel position');
assert.match(sceneSource, /formatSignal = \(value: number \| null, fallback = '--\.- mV'\)[\s\S]*formatHeatCapacitySignalMv\(value\)/, '3D instrument model panel should show sensor mV readings to 0.1 mV');
assert.match(workbenchSource, /const temperatureSignalValue =[\s\S]*formatHeatCapacitySignalMv\(activeFile\.temperatureSignalMv\)/, 'right realtime model panel should show temperature mV readings to 0.1 mV without rounding up');
assert.match(workbenchSource, /const pressureSignalValue =[\s\S]*formatHeatCapacitySignalMv\(activeFile\.pressureSignalMv\)/, 'right realtime model panel should show pressure mV readings to 0.1 mV without rounding up');
assert.match(workbenchSource, /updateHeatCapacityPower/);
assert.match(workbenchSource, /updateHeatCapacityStopcockOpen/);
assert.doesNotMatch(workbenchSource, /const updateHeatCapacityStopcockAngle/, 'Workbench should not keep the continuous stopcock angle updater');
assert.doesNotMatch(workbenchSource, /zeroHeatCapacityPressure/, 'workbench should not keep the old one-click pressure-zero path');
assert.doesNotMatch(workbenchSource, /setHeatCapacityPressureZeroOffset\(file,\s*file\.pressureSignalRawReadoutMv/, 'pressure-zero action must not directly jump the displayed pressure to zero');
assert.doesNotMatch(workbenchSource, /captureHeatCapacityWorkbenchSample\(zeroedFile,\s*'zeroedSample'\)/, 'auto demo must not bypass U0 zero readiness by directly capturing after one-click zero');
assert.match(workbenchSource, /updateHeatCapacityPumpValve/);
assert.match(workbenchSource, /pressHeatCapacityPumpBulb/);
assert.match(workbenchSource, /pumpFrequencyStatus/);
assert.match(workbenchSource, /createHeatCapacityAutoDemoSteps/, 'workbench should wire the one-shot heat capacity auto demo script');
assert.match(workbenchSource, /getHeatCapacityAutoDemoTimeline/, 'workbench should schedule semantic auto demo highlight/action/observe stages');
assert.match(workbenchSource, /HEAT_CAPACITY_AUTO_DEMO_RESET_MS/, 'heat capacity auto demo should reserve a reset phase before step 1 starts');
assert.match(heatCapacityRealtimeCopySource, /Initializing auto demo|初始化自动演示|初始化自動演示/, 'auto demo start should show a centered automatic initialization message before running');
assert.match(heatCapacityRealtimeCopySource, /resetting controls|自动复位控件|自動復位控制項/, 'auto demo start should describe automatic reset instead of asking the user to reset controls');
assert.match(workbenchSource, /setAutoDemoStepTitle\(heatCapacityRealtimeCopy\.autoDemoPreparingTitle\)/, 'auto demo reset phase should not show stale completion copy in the step panel');
assert.match(workbenchSource, /heatCapacityAutoDemoExecutedItemKeysRef\.current\.has\(timelineItemKey\)/, 'auto demo refresh should skip only timeline items whose exact action keys were committed to the checkpoint');
assert.match(workbenchSource, /if \(applyHeatCapacityAutoDemoAction\(fileId, 'captureSample', 'zeroedSample', onDeferredComplete\)\) \{[\s\S]*onDeferredComplete\?\.\(\);/, 'a deferred zero-sample action should enter the refresh ledger only after its retry really completes');
assert.match(workbenchSource, /Math\.max\(0, initialDelayMs \+ timelineItem\.atMs - startFromElapsedMs\)/, 'overdue but uncommitted timeline items should run immediately instead of being lost after refresh');
assert.match(workbenchSource, /scheduleHeatCapacityAutoDemoTimeline\(demoFileId, timeline, 0, HEAT_CAPACITY_AUTO_DEMO_RESET_MS\)/, 'auto demo timeline should start after the default reset phase');
assert.match(workbenchSource, /timelineItem\.stage === 'preview'/, 'auto demo should update the step panel through explicit preview timeline items');
assert.match(workbenchSource, /autoDemoInteractionLocked/, 'workbench should lock user actions while auto demo is running');
assert.match(workbenchSource, /const \[autoDemoPhase, setAutoDemoPhase\] = useState<HeatCapacityAutoDemoPhase>\(\(\) => \([\s\S]*?initialHeatCapacityRefreshSession\.demo\.phase[\s\S]*?: 'idle'/, 'heat capacity auto demo should use one explicit lifecycle state with refresh hydration');
assert.match(workbenchSource, /pauseHeatCapacityAutoDemo/, 'heat capacity pause button should pause the demo instead of showing a future-batch warning');
assert.match(workbenchSource, /terminateHeatCapacityAutoDemo/, 'heat capacity stop button should terminate the demo instead of showing a future-batch warning');
assert.match(workbenchSource, /const terminateHeatCapacityAutoDemo = \(\) => \{[\s\S]*exitHeatCapacityTeachingModeToExplore\('demo'\)/, 'terminating heat capacity auto demo should discard Demo progress and return to Explore');
assert.doesNotMatch(workbenchSource, /future batch|后续批次|後續批次/, 'heat capacity pause and stop controls should now have real behavior');
assert.match(workbenchSource, /showHeatCapacityAutoDemoLockedToast/, 'workbench should show a single locked-interaction toast');
assert.match(heatCapacityRealtimeCopySource, /Cannot operate during (?:the )?demo|演示中无法操作|演示中無法操作/, 'locked heat capacity preview clicks should show the required toast text');
assert.match(workbenchSource, /studio-heat-toast-kicker/, 'toast markup should include engineering status kicker labels');
assert.match(heatCapacityRealtimeCopySource, /Demo complete|演示完成|演示完成/, 'normal heat capacity demo completion should show a centered completion message');
assert.match(workbenchSource, /onFocusModeChange=\{updateHeatCapacityFocusMode\}/, 'workbench should route heat-capacity focus changes through the focus-session policy');
assert.match(workbenchSource, /setHeatCapacityFocusResetKey\(\(key\) => key \+ 1\);[\s\S]*heatCapacityFocusSessionRef\.current = null/, 'auto demo should reset the heat scene to the default view before starting');
assert.match(workbenchSource, /setAutoDemoStepCount\(steps\.length\)/, 'auto demo should prepare the current step count before the reset phase');
assert.match(workbenchSource, /autoDemoStepPanelMode/, 'workbench should keep the auto demo step panel mounted long enough to animate in and out');
assert.match(workbenchSource, /hideHeatCapacityAutoDemoStepPanel\(\)/, 'normal completion and termination should slide the auto demo step panel out instead of leaving it pinned');
assert.match(workbenchSource, /timelineItem\.focusControlId/, 'auto demo timeline should support per-highlight focus targets inside one semantic step');
assert.match(
  workbenchSource,
  /createDefaultHeatCapacityFile\(index, workbenchLayoutDefaults\.heatCapacity\);[\s\S]*enterHeatCapacityExploreModeWorkbenchState\([\s\S]*if \(file\.kind === 'heatCapacity'\) \{[\s\S]*clearHeatCapacityAutoDemoUiState\(\);/,
  'creating a fresh heat-capacity file should enter Explore and clear stale auto-demo UI',
);
assert.match(workbenchSource, /renderScientificText/, 'visible heat-capacity labels should render U variables with real subscripts');
assert.doesNotMatch(workbenchSource, /renderHeatCapacityStopcockMiniReadout|studio-heat-stopcock-mini-readout|data-heat-capacity-stopcock-mini-readout|GAUGE kPa|heatCapacityFocusMode === 'stopcock'/, 'stopcock mini readout should be removed with the shared valve focus mode');
assert.doesNotMatch(styleSource, /studio-heat-stopcock-mini-/, 'stopcock mini readout styles should be removed');
assert.match(workbenchSource, /autoDemoStepTitle/, 'workbench should drive the right-top auto demo step panel');
assert.match(workbenchSource, /studio-heat-demo-step-panel/, 'preview should render the auto demo step panel inside the model window');
assert.match(workbenchSource, /'data-heat-capacity-toast': 'true'/, 'preview should render locked interaction feedback through the unified heat-capacity toast queue');
assert.match(workbenchSource, /heatCapacityToastCurrentRef/, 'guide heat-capacity toasts should track the currently displayed message');
assert.match(workbenchSource, /heatCapacityToastPendingRef/, 'guide heat-capacity toasts should retain only one pending message');
assert.match(toastControllerSource, /HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS:\s*number = PROMPT_TOAST_DURATION_MS\.short/, 'guide heat-capacity feedback should share the formal short-duration policy');
assert.match(promptFeedbackPolicySource, /short:\s*2000/, 'the shared short-duration policy should remain two seconds');
assert.match(workbenchSource, /setPendingHeatCapacityToast\(nextState\.pending\)/, 'new guide heat-capacity toasts should update the pending ref through the shared queue result');
assert.doesNotMatch(workbenchSource, /setHeatCapacityToastPending/, 'the ref-only pending toast queue should not trigger redundant React state updates');
assert.doesNotMatch(workbenchSource, /autoDemoToastMessage|guideHeatCapacityHintMessage/, 'old independent heat-capacity toast states should not remain');
assert.match(workbenchSource, /prepareHeatCapacityAutoDemoStart/, 'auto demo should initialize with a non-zero pressure display bias without changing gas pressure');
assert.doesNotMatch(teachingLifecycleStateSource, /prepareHeatCapacityAutoDemoStart[\s\S]*stopcockAngleDeg:\s*HEAT_CAPACITY_STOPCOCK_OPEN_ANGLE_DEG/, 'auto demo start must not silently open the stopcock during the power-on step');
assert.match(workbenchSource, /setHeatCapacityStopcockOpenByFileId\(fileId, true\)/, 'auto demo should request open stopcock movement through the shared two-state helper');
assert.match(workbenchSource, /setHeatCapacityStopcockOpenByFileId\(fileId, false\)/, 'auto demo should request closed stopcock movement through the shared two-state helper');
assert.doesNotMatch(workbenchSource, /animateHeatCapacityStopcockAngle/, 'auto demo should not write continuous stopcock angles that fight the scene-level smooth two-state animation');
assert.match(workbenchSource, /commitHeatCapacityAutoDemoPressureZero/, 'auto demo should commit pressure-zero logical state once instead of writing Workbench state through RAF');
assert.match(workbenchSource, /commitHeatCapacityAutoDemoDefaultReset/, 'auto demo default reset should commit the target logical state once while the scene owns local motion');
assert.match(workbenchSource, /commitHeatCapacityAutoDemoDefaultReset[\s\S]{0,500}prepareHeatCapacityAutoDemoReset/, 'auto demo reset should replace source-mode runtime with a canonical powered-off Demo state');
assert.match(modeActivationSource, /targetMode === 'demo'[\s\S]{0,500}prepareHeatCapacityAutoDemoReset/, 'fresh Demo mode preparation should be canonical before its first scripted action');
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
assert.doesNotMatch(workbenchSource, /phase === 'demoComplete'/, 'fixed realtime header should not keep the removed auto-demo terminal phase');
assert.doesNotMatch(workbenchSource, /heatCapacityDisplayPhase === 'demoComplete'/, 'fixed realtime hint should not branch on the removed auto-demo terminal phase');
assert.doesNotMatch(workbenchSource, /demoComplete:\s*'[^']*'/, 'fixed realtime phase labels and hints should not keep demoComplete entries');
assert.match(workbenchSource, /autoDemoPaused\s*\?\s*heatCapacityRealtimeCopy\.demoPaused[\s\S]*autoDemoRunning\s*\?\s*heatCapacityRealtimeCopy\.demoRunning[\s\S]*heatCapacityRealtimeCopy\.demoReady/, 'fixed realtime header should show localized automation badges only for active demo states');
assert.match(workbenchSource, /label: heatCapacityRealtimeCopy\.operationLocked/, 'fixed realtime header should show localized lock status only when interaction is locked');
assert.match(workbenchSource, /heatCapacityHeaderBadges\.map\(\(badge\)/, 'fixed realtime header should render badges from the compact display model');
assert.doesNotMatch(workbenchSource, /const powerLabel = activeFile\.powerOn \? '宸插紑鏈? : '鏈紑鏈?/, 'fixed realtime header should not keep a separate always-visible power badge');
assert.doesNotMatch(workbenchSource, /const modeLabel = [^\n]*'手动'/, 'fixed realtime header should not keep an old default mode badge');
assert.doesNotMatch(workbenchSource, /const lockLabel = [^\n]*'鍙搷浣?/, 'fixed realtime header should not keep a default actionable badge');
assert.doesNotMatch(workbenchSource, /\{powerLabel\}|\{modeLabel\}|\{lockLabel\}/, 'fixed realtime header should not render the removed static power/mode/lock labels');
assert.match(workbenchSource, /currentDeltaPKPa[\s\S]*activeFile\.pressureSignalMv[\s\S]*activeFile\.pressureSensitivityMvPerKPa/, 'fixed realtime window should derive current delta pressure from displayed Uₚ and the shared sensitivity');
assert.match(styleSource, /\.studio-heat-operation-status \{[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/, 'operation status should stay as one row of three control states');
assert.match(styleSource, /\.studio-realtime-panel-heat \{[\s\S]*grid-template-rows: auto auto auto auto;/, 'heat realtime panel should only reserve rows for header, readings, operation status, and hint');
assert.doesNotMatch(getCssBlock('.studio-heat-reading-card-primary'), /inset\s+\d+px\s+0\s+0|56,\s*189,\s*248/, 'heat realtime primary reading cards should not use a decorative blue left rail');
assert.match(getCssBlock('.studio-heat-reading-card-primary'), /border-width:\s*0\.5px;/, 'heat realtime primary reading cards should use the thin annotated border width');
assert.match(getRootCssBlock('.studio-heat-current-hint strong'), /font-weight:\s*400;/, 'heat current hint highlight should use regular annotated weight');
assert.match(heatCapacityRealtimeCopySource, /Air Heat Capacity Ratio Experiment|空气比热容比实验|空氣比熱容比實驗/);
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
assert.match(heatCapacityMaterialsWindowCoordinatorSource, /const activeHeatCapacityTabId = openHeatCapacityTabs\[0\];[\s\S]*if \(!activeHeatCapacityTabId\) return \{ kind: 'ignored' \};/, 'an unavailable mode-specific materials group must not open a fallback tab');
assert.match(workbenchSource, /materialPanels\.length > 0[\s\S]*studio-heat-materials-group/, 'the Heat Capacity materials group should only render when the active mode has available children');
assert.doesNotMatch(workbenchSource, /filter\(\(tabId\) => tabId !== 'records'/, 'the data/results tab should stay reachable independently from the mandatory calculation window');
assert.doesNotMatch(workbenchSource, /tabId === 'review'[\s\S]{0,180}activeHeatCapacityCalculationSession\?\.status !== 'completed'/, 'process review should open for a new group and render its empty current-group state');
assert.doesNotMatch(workbenchSource, /recordHeatCapacityU1|recordHeatCapacityU2|calculateHeatCapacityMeanResult|createHeatCapacityTrialFromAutoDemoSamples/, 'Heat Capacity should not keep the legacy multi-trial processing helpers');
assert.doesNotMatch(workbenchSource, /heatCapacityExpectedTrialCount|heatCapacityExpectedTrialCountMode|heatCapacityTrials|heatCapacityActiveTrialIndex/, 'Heat Capacity files should not carry legacy expected-trial table state');
assert.doesNotMatch(teachingResultStateSource, /createHeatCapacityDemoTrialFromPreset/, 'Workbench teaching completion should not reintroduce the old retained Demo result helper');
assert.doesNotMatch(teachingResultStateSource, /const demoTrial = createHeatCapacityDemoTrialFromProcessSamples/, 'auto demo completion should not calculate its final result from transient process samples');
assert.match(teachingResultStateSource, /createHeatCapacityAutoDemoResultTrial/, 'auto demo completion should build a clean single-trial result from the fixed teaching profile');
assert.match(workbenchSource, /if \(action === 'completeTeachingMode'\)[\s\S]*completeHeatCapacityTeachingModeWorkbenchState\(file, now\)[\s\S]*heatCapacityMaterialsExpanded:\s*true/, 'auto demo completion should leave the completed teaching result visible until the user explicitly exits');
assert.match(workbenchSource, /data-heat-capacity-mode-action="exit-teaching"/, 'completed Demo and Guide modes should replace stop controls with one explicit exit action');
assert.match(leftPanelSource, /formalExperimentMultiTrialNotice:\s*'正式实验需要进行多次测量，并对各次实验的 γᵢ 取平均值。'/, 'demo Data & Results page should teach that formal experiments require multiple averaged trials');
assert.match(leftPanelSource, /thinkingMeanTitle:\s*'为什么多次实验应先分别计算 γᵢ，再对结果取平均？'/, 'demo Data & Results page should keep the multi-trial averaging thinking prompt as teaching content');
assert.match(heatCapacityRealtimeCopySource, /startGuideExperiment:\s*'引导模式'/, 'auto-demo completion should expose a Simplified Chinese guide-mode action');
assert.match(heatCapacityRealtimeCopySource, /startGuideExperiment:\s*'引導模式'/, 'auto-demo completion should expose a Traditional Chinese guide-mode action');
assert.match(heatCapacityRealtimeCopySource, /startGuideExperiment:\s*'Guide mode'/, 'auto-demo completion should expose an English guide-mode action');
assert.match(workbenchSource, /data-heat-capacity-mode="guide"/, 'preview header should render guide mode in the unified mode bar');
assert.doesNotMatch(workbenchSource, /data-heat-capacity-manual-reset="true"/, 'preview should not keep the old guide-experiment reset button');
assert.doesNotMatch(workbenchSource, /resetHeatCapacityForGuideExperiment/, 'Workbench should not route normal Heat Capacity UI resets through the old Guide reset helper');
assert.match(guideStepModelSource, /export const isHeatCapacityGuideRecordStep = \(step: GuideHeatCapacityStep\) => \([\s\S]*recordU0Required[\s\S]*recordU1Required[\s\S]*recordU2Required/, 'record-ready guide steps should be classified separately from waiting-for-good-data steps');
assert.match(heatCapacityRealtimeCopySource, /recordU0SuccessToast:\s*'U₀ 记录成功。'/, 'U0 record success should have the confirmed Simplified Chinese success toast copy');
assert.match(heatCapacityRealtimeCopySource, /recordU1SuccessToast:\s*'U₁ 和 Uₜ 记录成功。'/, 'U1 record success should have the confirmed Simplified Chinese success toast copy');
assert.match(heatCapacityRealtimeCopySource, /recordU2SuccessToast:\s*'U₂ 和 Uₜ 记录成功。'/, 'U2 record success should have the confirmed Simplified Chinese success toast copy');
assert.doesNotMatch(`${workbenchSource}\n${heatCapacityRealtimeCopySource}`, /trialCompleteToast/, 'single guide mode should not keep the old completed-group toast copy');
assert.match(heatCapacityRealtimeCopySource, /finalTrialCompleteToast:\s*'本次实验已完成。'/, 'the final heat-capacity trial should use the confirmed final-completion copy');
assert.match(workbenchSource, /showHeatCapacityRecordSuccessSequence\(\{[\s\S]*recordMessage:\s*message[\s\S]*trialCompleteMessage:\s*null[\s\S]*\}\);/, 'successful records should only display the record-success toast; final guide completion belongs to the power-off step');
assert.doesNotMatch(workbenchSource, /recordHeatCapacityGuideSample[\s\S]*trialCompleteMessage:\s*kind === 'u2'/, 'U2 recording must not announce final completion before the user turns off the power');
assert.match(workbenchSource, /const shouldShowGuidePowerOffCompletionToast = [\s\S]*heatCapacityGuideWorkflow\.step === 'closePowerRequired'[\s\S]*guardedPowerOn === false[\s\S]*showHeatCapacityGuidePowerOffCompletionToast\(\)/, 'guide completion toast should be triggered by the final guided power-off action');
assert.match(workbenchSource, /<PromptViewportFeedback[\s\S]*key=\{heatCapacityToastCurrent\.id\}[\s\S]*'data-heat-capacity-toast': 'true'/, 'center heat-capacity feedback should remount by id so sequential success, completion, and wait notices restart their CSS animation');
assert.doesNotMatch(workbenchSource, /finalWaitMessage/, 'the final completed trial must not show the real-experiment stability-wait notice');
assert.doesNotMatch(workbenchSource, /shouldShowSkippedRecoveryWait|heatCapacityRealtimeCopy\.trialCompleteToast|trialCompleteLogMessage/, 'single guide mode should not keep old next-trial wait or group-complete logging');
assert.doesNotMatch(workbenchSource, /const recordHeatCapacityGuideSample = \(kind: HeatCapacityGuideRecordKind\) => \{[\s\S]*let ok = false;[\s\S]*updateActiveFile\(\(file\) => \{[\s\S]*ok = (?:true|result\.ok)[\s\S]*\}\);[\s\S]*if \(ok\)/, 'guide U1/U2 success feedback must not depend on values assigned inside a React state updater');
assert.match(workbenchSource, /const currentFile = filesRef\.current\.find\(\(file\) => file\.id === activeFile\.id\);[\s\S]*const attempt = applyHeatCapacityGuideRecordWorkbenchState\(currentFile,\s*kind,\s*now\);[\s\S]*updateFileById\(currentFile\.id/, 'guide U1/U2 success feedback should be driven by a synchronously calculated record result before updating React state');
assert.match(workbenchSource, /HeatCapacityRejectedInteractionTracker[\s\S]*shouldApplyFailure\([\s\S]*activeFile\.id,[\s\S]*action,[\s\S]*interactionId/, 'one rejected pressure-zero gesture should apply only one rollback, miss count, and toast');
assert.doesNotMatch(workbenchSource, /heatCapacityGuideNextTrialNoticeHoldKey|nextTrialKey/, 'next-trial wait-skip guidance state should be removed');
assert.match(workbenchSource, /heatCapacityRecordToastSequenceActive[\s\S]*return undefined;/, 'ordinary guide hints should not interrupt the record-success toast sequence');
assert.doesNotMatch(workbenchSource, /if \(action === 'turnPowerOff'\) return \{ allowed: true \}/, 'guide mode should not allow power-off clicks to bypass the current-step guard');
assert.match(instrumentFeedbackSource, /export type HeatCapacityGuideRollbackAnimation =[\s\S]*'powerBounce'/, 'invalid guide-mode power switch clicks should have a dedicated visual rollback animation');
assert.match(guideStepModelSource, /turnPowerOff:\s*'powerSwitch'[\s\S]*turnPowerOn:\s*'powerSwitch'|turnPowerOn:\s*'powerSwitch'[\s\S]*turnPowerOff:\s*'powerSwitch'/, 'invalid power actions should route through the shared power-switch feedback mapping');
assert.match(sceneSource, /animation: 'powerBounce'[\s\S]*active: guideRollbackAnimation === 'powerBounce'/, 'instrument scene should animate invalid power-switch clicks through the interruptible rollback controller without changing the real power state');
assert.match(workbenchSource, /isHeatCapacityGuideRecordStep\(step\)[\s\S]*suppressGuidance:\s*true/, 'clicks outside a visible U0/U1/U2 record button should be blocked without showing stale bad-data guidance');
assert.match(workbenchSource, /if \(guard\.suppressGuidance\) \{[\s\S]*if \(shouldOpenStrongReminder\) scheduleGuideHeatCapacityStrongReminderAfterToast[\s\S]*return;[\s\S]*\}/, 'suppressed record-ready guard failures should keep rollback feedback, skip ordinary guidance, and still allow delayed strong reminder escalation');
assert.match(workbenchSource, /isHeatCapacityGuideRecordStep\(activeHeatCapacityGuideStep\)[\s\S]*clearGuideHeatCapacityGuidance\(\)/, 'record-ready transitions should clear stale guide waiting guidance');
assert.match(workbenchSource, /isHeatCapacityGuideRecordStep\(latestStep\)[\s\S]*return;/, 'idle guide hints should not replace a visible record button with extra bottom guidance');
assert.match(workbenchSource, /HEAT_CAPACITY_GUIDE_START_NOTICE_MS = 1000/, 'guide mode should reserve a short centered start notice before process guidance begins');
assert.match(workbenchSource, /showHeatCapacityAutoDemoCompletionToast\(\s*heatCapacityRealtimeCopy\.guideModeStartingToast,\s*HEAT_CAPACITY_GUIDE_START_NOTICE_MS/, 'guide mode should show a centered localized start notice as the process starts');
assert.match(workbenchSource, /showHeatCapacityAutoDemoCompletionToast\(guideCompleted[\s\S]*heatCapacityRealtimeCopy\.teachingModeExitedToast[\s\S]*heatCapacityRealtimeCopy\.guideModeExitedToast\)/, 'exiting guide mode should show a centered status toast and distinguish completed exit from running termination');
assert.match(workbenchSource, /GUIDE_HEAT_CAPACITY_STRONG_REMINDER_DELAY_MS = 10_000/, 'guide mode strong reminder should appear after ten seconds without the target action');
assert.match(workbenchSource, /HEAT_CAPACITY_GUIDE_WAIT_DURATION_MS = 5 \* 60 \* 1000/, 'guide mode U1 and U2 waits should use the real five-minute teaching wait');
assert.doesNotMatch(workbenchSource, /HEAT_CAPACITY_GUIDE_RELEASE_DURATION_MS|350\s*\/\s*1000/, 'guide mode should not auto-close or block closing around the removed 0.35-second target');
assert.match(workbenchSource, /HEAT_CAPACITY_RELEASE_TIMING/, 'guide and demo UI should reference the shared release timing configuration');
assert.doesNotMatch(`${workbenchSource}\n${heatCapacityRealtimeCopySource}`, /放气时间到了|放氣時間到了|Release time has elapsed/, 'guide copy should not imply that a fixed release deadline controls closing');
assert.match(workbenchSource, /等待“咻”声结束，气体释放完毕，请立即关闭玻璃旋塞。/, 'guide checklist should state the concise sound-based closing criterion');
assert.match(workbenchSource, /GUIDE_HEAT_CAPACITY_GUIDANCE_PULSE_INTERVAL_MS = 4000/, 'guide mode should pulse the current target every four seconds before strong reminder escalation');
const guidePauseStepSection = guideStepModelSource.match(/export const isGuideHeatCapacityPauseStep = \(step: GuideHeatCapacityStep\) => \([\s\S]*?\);/)?.[0] ?? '';
assert.match(guidePauseStepSection, /recordU1Required[\s\S]*recordU2Required[\s\S]*closePowerRequired/, 'guide mode should pause physics at guided record and final-close checkpoints');
assert.match(guidePauseStepSection, /closeStopcockAfterReleaseRequired/, 'guide mode should freeze all physics while waiting for the user to close the stopcock');
assert.doesNotMatch(workbenchSource, /guideHeatCapacityActiveFileIdRef\.current === file\.id[\s\S]*isGuideHeatCapacityPauseStep\(getHeatCapacityGuideStep\(file\)\)[\s\S]*return file;/, 'guide pause ownership should stay inside the workflow engine so wall-clock time is rebased safely');
assert.match(guideRuntimeCoordinatorSource, /if \(guideWorkflow\.paused\)[\s\S]*lastUpdateMs:\s*now/, 'guide workflow pauses should rebase wall-clock time without advancing physical state');
assert.match(workbenchSource, /const heatCapacityHardSpherePaused =[\s\S]*heatCapacityGuideWorkflow\.paused/, 'guide release equilibrium should freeze the molecular visualization together with the physical state');
assert.match(workbenchSource, /shouldCommitHeatCapacityRealtimeTick\(file, steppedFile\)/, 'the realtime UI loop should delegate runtime commit decisions to the shared state comparator');
assert.match(heatCapacityRuntimeCoordinatorSource, /export const shouldCommitHeatCapacityRealtimeTick =[\s\S]*heatCapacityReleaseState !== previousFile\.heatCapacityReleaseState[\s\S]*heatCapacityGuideWorkflow !== previousFile\.heatCapacityGuideWorkflow/, 'the shared realtime comparator should preserve release-state and pure guide-workflow transitions while physics is paused');
assert.match(workbenchSource, /overlayCenter=\{heatCapacityCenterOverlay\}[\s\S]*overlayCenterAboveGuideMask/, 'all centered viewport feedback should stay raised above guide chrome and a simultaneous strong reminder');
assert.match(styleSource, /\[data-preview-overlay-item="heat-parent-top-right"\]\s*\{[\s\S]*z-index:\s*18;[\s\S]*\.studio-preview-overlay-center-above-guide-mask\s*\{[\s\S]*z-index:\s*20;/, 'viewport feedback should sit above the right guide panel at layer 18 and strong reminder at layer 11');
assert.match(styleSource, /\.studio-heat-guide-lesson-layer\s*\{[\s\S]*z-index:\s*22;/, 'time-freeze lesson cards should remain above viewport feedback');
assert.match(workbenchSource, /const shouldOpenStrongReminder = guard\.suppressStrongReminder \? false : registerGuideHeatCapacityMiss\(guard\);[\s\S]*showGuideHeatCapacityGuidance\(guard\.expectedMessage[\s\S]*if \(shouldOpenStrongReminder\) \{[\s\S]*scheduleGuideHeatCapacityStrongReminderAfterToast/, 'two wrong or premature guided clicks should show the reason toast before scheduling the strong reminder unless the current step explicitly suppresses strong escalation');
assert.match(workbenchSource, /showHeatCapacityPolicyToast\(message,\s*source === 'guide-blocked' \? 'guideBlocked' : 'guide',\s*level\)/, 'rapid repeated guide mistakes should replace the active guide-blocked toast instead of queueing stale prompts');
assert.match(toastPolicySource, /guideBlocked:\s*\{[\s\S]*options:\s*\{ source:\s*'guide-blocked',\s*interrupt:\s*true \}/, 'guide-blocked toast replacement should be centralized in the shared toast policy');
assert.match(workbenchSource, /guard\.suppressStrongReminder \? false : registerGuideHeatCapacityMiss\(guard\)/, 'guide waiting-step wrong clicks should be able to show ordinary feedback without accumulating strong-reminder misses');
assert.match(workbenchSource, /step === 'stabilizeBeforeReleaseRequired'[\s\S]*suppressStrongReminder:\s*true[\s\S]*step === 'recoverRequired'[\s\S]*suppressStrongReminder:\s*true/, 'U1 and U2 five-minute waiting steps should not trigger strong reminders from premature clicks');
assert.match(workbenchSource, /const rollbackAnimation = getHeatCapacityGuideRollbackAnimation\(action\);[\s\S]*step === 'stabilizeBeforeReleaseRequired'[\s\S]*rollbackAnimation,[\s\S]*step === 'recoverRequired'[\s\S]*rollbackAnimation,/, 'U1 and U2 five-minute waiting steps should still bounce visible controls without changing experiment state');
assert.match(workbenchSource, /const delayMs =[\s\S]*GUIDE_HEAT_CAPACITY_STRONG_REMINDER_DELAY_MS;[\s\S]*guideHeatCapacityStrongReminderDeadlineAtMsRef\.current = Date\.now\(\) \+ delayMs;[\s\S]*guideHeatCapacityStrongReminderTimerRef\.current = window\.setTimeout\([\s\S]*activateGuideHeatCapacityStrongReminder[\s\S]*}, delayMs\);/, 'guided target inactivity should escalate through a refresh-restorable ten-second strong reminder timer');
assert.match(workbenchSource, /const workflow = activeFile\.heatCapacityGuideWorkflow;[\s\S]*workflow\.strongReminderActive[\s\S]*heatCapacityRecordToastSequenceActive[\s\S]*return;[\s\S]*activateGuideHeatCapacityStrongReminder\(workflow\.strongReminderTargetControlId\)/, 'workflow-driven strong reminders should wait for record-success toasts and then reopen instead of being permanently cleared');
assert.match(workbenchSource, /activeHeatCapacityGuideStep === 'stabilizeBeforeReleaseRequired' \|\|[\s\S]*activeHeatCapacityGuideStep === 'recoverRequired'[\s\S]*return undefined;/, 'guided five-minute waiting steps should not start the inactivity strong-reminder timer');
assert.match(workbenchSource, /guideHeatCapacityGuidancePulseTimerRef\.current = window\.setInterval\([\s\S]*pulseGuideHeatCapacityControl\(guidance\.controlId\)[\s\S]*GUIDE_HEAT_CAPACITY_GUIDANCE_PULSE_INTERVAL_MS/, 'ordinary guided target hints should keep pulsing the current target before the strong mask appears');
assert.match(workbenchSource, /const heatCapacityGuideSteps = [\s\S]*getGuideStepGuidance\(step\.guideStep,\s*activeFile\)\.message/, 'ordinary guided process guidance should derive the checklist rows from guide step guidance');
assert.match(workbenchSource, /id:\s*'pump'[\s\S]*title:\s*\{\s*'zh-CN':\s*'打气至 120 mV'/, 'guided checklist pump row should expose the displayed 120 mV criterion');
assert.match(workbenchSource, /id:\s*'wait-u1'[\s\S]*title:\s*\{\s*'zh-CN':\s*'封闭等待 5 min'/, 'guided checklist U1 wait row should name the sealed 5 min standard');
assert.match(workbenchSource, /id:\s*'wait-u2'[\s\S]*title:\s*\{\s*'zh-CN':\s*'回温等待 5 min'/, 'guided checklist U2 wait row should name the recovery 5 min standard');
assert.match(workbenchSource, /data-heat-capacity-guide-step-panel="true"[\s\S]*data-heat-capacity-guide-step-list="true"[\s\S]*data-heat-capacity-guide-step-row=\{step\.id\}/, 'ordinary guided process guidance should render as a right-top checklist panel');
assert.match(workbenchSource, /const HEAT_CAPACITY_GUIDE_CHECKLIST_RETURN_MS = 5000;[\s\S]*returnHeatCapacityGuideChecklistToCurrentStep\(\);[\s\S]*HEAT_CAPACITY_GUIDE_CHECKLIST_RETURN_MS/, 'guided checklist should wait five seconds after the last wheel input before returning to the current step');
assert.match(workbenchSource, /const stepRecordKind = step\.status === 'current' && isCentered[\s\S]*data-heat-capacity-guide-step-record-action="true"[\s\S]*recordHeatCapacityGuideSample\(stepRecordKind\)/, 'current guided checklist rows should own the U0/U1/U2 record button instead of a separate floating action');
assert.doesNotMatch(heatCapacityRealtimeCopySource, /waitU1Ready:\s*'[^']*请点击按键|waitU2Ready:\s*'[^']*请点击按键|waitU1Ready:\s*'[^']*請點擊按鍵|waitU2Ready:\s*'[^']*請點擊按鍵|Click the button to record U[₁₂]/, 'U1 and U2 ready checklist copy should remove the click-the-button phrase so the in-row record button has room');
assert.doesNotMatch(workbenchSource, /data-heat-capacity-guide-process-prompt="true"/, 'ordinary guided process guidance should no longer render in the bottom-center prompt slot');
assert.match(heatCapacityRealtimeCopySource, /guideLessonButtonLabel:\s*'实验说明'[\s\S]*guideLessonContinueHint:\s*'点击空白区域来继续'[\s\S]*guideLessonIntroPages:\s*\[[\s\S]*本实验通过一次“加压、快速放气、回温”的过程[\s\S]*默认换算系数为 20 mV\/kPa[\s\S]*重新查看刚刚的实验说明[\s\S]*guideLessonButtonLabel:\s*'實驗說明'[\s\S]*guideLessonContinueHint:\s*'點擊空白區域繼續'[\s\S]*guideLessonButtonLabel:\s*'Experiment notes'[\s\S]*guideLessonContinueHint:\s*'Click blank area to continue'/, 'heat-capacity lesson intro copy should localize the button, continue hint, and reusable intro pages for all supported languages');
assert.match(heatCapacityRealtimeCopySource, /guideLessonStepExplanations:\s*\{[\s\S]*pressureZeroBaseline:[\s\S]*压强差调零才有明确基准[\s\S]*sealedInitialState:[\s\S]*气瓶与外界隔离[\s\S]*pressureTarget:[\s\S]*120 mV[\s\S]*preReleaseStability:[\s\S]*U₁ 代表放气前稳定高压状态[\s\S]*quickReleaseState:[\s\S]*近似绝热过程[\s\S]*thermalRecovery:[\s\S]*U₂[\s\S]*guideLessonStepExplanations:\s*\{[\s\S]*pressureZeroBaseline:[\s\S]*guideLessonStepExplanations:\s*\{[\s\S]*pressureZeroBaseline:/, 'guided lesson step explanations should cover the six completed-step explanations in zh-CN, zh-TW, and English');
assert.match(heatCapacityRealtimeCopySource, /Each experiment step supports reliable values/, 'English heat-capacity intro should describe experiment steps, not Guide-only operations');
assert.doesNotMatch(heatCapacityRealtimeCopySource, /Each guided operation supports reliable values/, 'English heat-capacity intro should not keep the old Guide-only wording');
assert.equal((heatCapacityRealtimeCopySource.match(/guideChecklistLabel:/g) ?? []).length, 3, 'Guide checklist title should have one localized copy key per supported language');
assert.equal((heatCapacityRealtimeCopySource.match(/guideStepLabel:/g) ?? []).length, 3, 'Guide step label should have one localized copy key per supported language');
assert.doesNotMatch(workbenchSource, /settingsLanguagePreference === 'en' \? 'Guide checklist'/, 'Guide checklist UI should not hard-code language ternaries in render');
assert.match(workbenchSource, /const HEAT_CAPACITY_GUIDE_LESSON_TRIGGER_BY_COMPLETED_STEP:[\s\S]*openStopcockForZeroRequired:\s*'pressureZeroBaseline'[\s\S]*closeStopcockRequired:\s*'sealedInitialState'[\s\S]*pumpRequired:\s*'pressureTarget'[\s\S]*stabilizeBeforeReleaseRequired:\s*'preReleaseStability'[\s\S]*closeStopcockAfterReleaseRequired:\s*'quickReleaseState'[\s\S]*recoverRequired:\s*'thermalRecovery'/, 'guided lesson step modals should map explanations to the guide step that has just been completed');
assert.match(workbenchSource, /const \[heatCapacityGuideLessonDialog,\s*setHeatCapacityGuideLessonDialog\]/, 'guided lesson dialog should keep explicit React state instead of piggybacking on transient toasts');
assert.match(workbenchSource, /className="studio-heat-mode-control-row"[\s\S]*data-heat-capacity-mode-control="true"[\s\S]*<\/div>\s*<button[\s\S]*className="studio-heat-guide-lesson-button"[\s\S]*data-heat-capacity-guide-lesson-button="true"/, 'heat-capacity lesson entry should render as one independent button frame outside the mode segmented frame');
assert.doesNotMatch(workbenchSource, /studio-heat-guide-lesson-shell/, 'guided lesson entry should not keep an extra outer frame around the wrench button');
assert.match(workbenchSource, /data-heat-capacity-guide-lesson-button="true"[\s\S]*<Wrench size=\{18\} strokeWidth=\{2\.1\}/, 'heat-capacity lesson entry should render a clear but lighter wrench icon beside the mode selector');
assert.match(workbenchSource, /onClick=\{\(\) => openHeatCapacityLessonIntro\(activeFile\.id\)\}/, 'heat-capacity lesson entry button should open the intro lesson for the active file');
assert.match(workbenchSource, /handleHeatCapacityGuideLessonDialogAdvance[\s\S]*kind === 'intro'[\s\S]*pageIndex < pageCount - 1[\s\S]*setHeatCapacityGuideLessonOutgoingView\(getHeatCapacityGuideLessonView\(heatCapacityGuideLessonDialog\)\)[\s\S]*pageIndex: pageIndex \+ 1[\s\S]*closeHeatCapacityGuideLessonDialog\(\)/, 'clicking blank lesson space should advance intro pages, then close after the final page instead of looping');
assert.match(workbenchSource, /handleHeatCapacityGuideLessonDialogAdvance[\s\S]*kind === 'step'[\s\S]*closeHeatCapacityGuideLessonDialog\(\)/, 'clicking blank lesson space should dismiss completed-step explanations through the shared fade-out close path');
assert.doesNotMatch(workbenchSource, /data-heat-capacity-guide-lesson-(?:next|prev)="true"/, 'heat-capacity lesson dialog should not render dedicated previous or next page buttons');
assert.match(workbenchSource, /data-heat-capacity-guide-lesson-dialog="true"[\s\S]*onMouseDown=\{\(event\) => event\.stopPropagation\(\)\}/, 'clicking inside the guided lesson card should not count as a blank-area advance or close action');
assert.doesNotMatch(workbenchSource, /guideLesson(?:Click|Dismiss)Hint|studio-heat-guide-lesson-card > small|<small>\{lessonHint\}<\/small>/, 'guided lesson dialogs should not render bottom click hints or keep obsolete hint copy');
assert.match(workbenchSource, /data-heat-capacity-guide-lesson-hint="true"[\s\S]*heatCapacityRealtimeCopy\.guideLessonContinueHint/, 'heat-capacity lesson dialogs should show a bottom hint telling users to click blank area to continue');
assert.doesNotMatch(workbenchSource, /pageIndex \+ 1\s*\}\s*\/\s*\{introPageCount\}|lessonMeta|<em>\{lessonMeta\}<\/em>/, 'guided lesson intro should not display page numbers or a secondary meta label');
assert.match(workbenchSource, /studio-heat-guide-lesson-layer-\$\{heatCapacityGuideLessonClosing \? 'closing' : 'open'\}/, 'guided lesson layer should keep mounted closing state so intro and step notes can fade out');
assert.match(workbenchSource, /heatCapacityGuideLessonOutgoingView[\s\S]*studio-heat-guide-lesson-content-outgoing[\s\S]*studio-heat-guide-lesson-content-current/, 'guided lesson intro page changes should cross-fade outgoing and incoming content');
assert.match(workbenchSource, /previousGuideStep !== activeHeatCapacityGuideStep[\s\S]*HEAT_CAPACITY_GUIDE_LESSON_TRIGGER_BY_COMPLETED_STEP\[previousGuideStep\][\s\S]*setHeatCapacityGuideLessonDialog\(\{ kind: 'step'/, 'completed-step lesson explanations should trigger only after the guide step changes away from the completed operation');
assert.match(workbenchSource, /data-heat-capacity-guide-lesson-close="true"[\s\S]*onMouseDown=\{handleHeatCapacityGuideLessonCloseButtonMouseDown\}[\s\S]*onClick=\{handleHeatCapacityGuideLessonCloseButtonClick\}/, 'guided lesson dialogs should provide a right-top close button that fades out without advancing the lesson');
assert.match(styleSource, /\.studio-heat-guide-lesson-card\s*\{[\s\S]*width:\s*min\(420px,[\s\S]*height:\s*180px;[\s\S]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto;/, 'guided lesson cards should keep the same fixed height while reserving a bottom continue hint row');
assert.match(styleSource, /\.studio-heat-guide-lesson-hint\s*\{[\s\S]*font-size:\s*11px;[\s\S]*text-align:\s*left;/, 'guided lesson continue hint should be a compact bottom-left instruction line');
assert.match(styleSource, /\.studio-heat-mode-control-row\s*\{[\s\S]*display:\s*inline-flex;[\s\S]*gap:\s*6px;/, 'heat-capacity mode controls should use a row wrapper so the lesson entry can sit outside the segmented frame');
assert.doesNotMatch(styleSource, /\.studio-heat-guide-lesson-shell\s*\{/, 'guided lesson entry should avoid a second visual shell frame');
assert.match(styleSource, /\.studio-heat-guide-lesson-button\s*\{[\s\S]*box-sizing:\s*border-box;[\s\S]*inline-size:\s*30px;[\s\S]*block-size:\s*30px;[\s\S]*border-radius:\s*4px;/, 'guided lesson wrench button should be a smaller single square frame using the mode control radius without border overflow');
assert.match(styleSource, /\.studio-panel-actions \.studio-heat-guide-lesson-button\s*\{[\s\S]*width:\s*30px;[\s\S]*height:\s*30px;[\s\S]*padding:\s*0;/, 'guided lesson wrench button should override generic panel button sizing so it remains square and compact');
assert.match(styleSource, /\.studio-heat-guide-lesson-content-current[\s\S]*animation:\s*studioOverlayFadeIn[\s\S]*\.studio-heat-guide-lesson-content-outgoing[\s\S]*animation:\s*studioOverlayFadeOut/, 'guided lesson content should use matching fade-in and fade-out animation for intro and step notes');
assert.match(styleSource, /\.studio-heat-guide-lesson-close\s*\{[\s\S]*inline-size:\s*22px;[\s\S]*block-size:\s*22px;[\s\S]*border-radius:\s*50%;/, 'guided lesson close control should be a compact circular icon button');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-guide-lesson-card/, 'guided lesson dialogs should have explicit light-theme contrast styling');
assert.match(styleSource, /\.studio-heat-guide-step-panel\s*\{[\s\S]*width:\s*min\(276px,[\s\S]*height:\s*174px/, 'guided process checklist panel should use the reduced compact right-top panel dimensions');
assert.match(styleSource, /\.studio-heat-guide-step-list\s*\{[\s\S]*overflow:\s*hidden;/, 'guided process checklist should hide the native scrollbar and use index-driven scrolling');
assert.match(styleSource, /\.studio-heat-guide-step-center-rail\s*\{[\s\S]*left:\s*0;[\s\S]*right:\s*0;/, 'guided process checklist center rail should span the full panel content width');
assert.match(styleSource, /\.studio-heat-guide-step-center-rail\s*\{[\s\S]*top:\s*42px;[\s\S]*height:\s*48px;/, 'guided process checklist should keep the same outer panel while giving the centered row more vertical room');
assert.match(styleSource, /\.studio-heat-guide-step-center-rail\s*\{[\s\S]*border:\s*1px solid var\(--studio-accent-border\)[\s\S]*background:\s*color-mix/, 'the centered guide step should use the approved full-border soft surface');
assert.doesNotMatch(styleSource, /\.studio-heat-guide-step-center-rail\s*\{[^}]*inset\s+[23]px\s+0\s+0/, 'the centered guide step should not carry a one-sided inset rail');
assert.match(styleSource, /\.studio-heat-guide-step-row\s*\{[\s\S]*height:\s*48px;/, 'guided process checklist rows should show one primary row with faded neighboring context');
assert.match(styleSource, /\.studio-heat-guide-step-text strong,\s*\n\.studio-heat-guide-step-text em\s*\{[\s\S]*white-space:\s*normal;/, 'guided process checklist text should support two-line readable step descriptions');
assert.match(styleSource, /\.studio-heat-guide-step-row-centered \.studio-heat-guide-step-text strong\s*\{[\s\S]*font-size:\s*13px;/, 'guided process checklist centered title should be larger after reducing visible row count');
assert.match(styleSource, /\.studio-heat-guide-step-row-centered \.studio-heat-guide-step-text em\s*\{[\s\S]*font-size:\s*10px;/, 'guided process checklist centered detail should remain readable in the two-line layout');
assert.match(styleSource, /\.studio-heat-guide-step-row-done \.studio-heat-guide-step-text strong::after\s*\{[\s\S]*right:\s*100%;/, 'completed guide checklist rows should stay readable without strike-through when users scroll back');
assert.match(styleSource, /\.studio-heat-guide-step-row-done\.studio-heat-guide-step-row-centered \.studio-heat-guide-step-marker\s*\{[\s\S]*background:/, 'completed guide checklist rows should keep the checked marker even when scrolled into the center rail');
assert.match(styleSource, /\[data-preview-overlay-item="heat-parent-top-right"\]\s*\{[\s\S]*z-index:\s*18;/, 'guided process checklist should remain visible above the strong-reminder mask');
assert.match(workbenchSource, /const activateGuideHeatCapacityStrongReminder = \(controlId\?: string \| null\) => \{[\s\S]*clearGuideHeatCapacityGuidance\(\);[\s\S]*pulseGuideHeatCapacityControl\(controlId \?\? null\);[\s\S]*setGuideHeatCapacityStrongReminderActive\(true\);/, 'activating the strong reminder should clear ordinary toasts and pulse the target without showing a duplicate center prompt');
const activateGuideStrongReminderSection = workbenchSource.match(/const activateGuideHeatCapacityStrongReminder = \(controlId\?: string \| null\) => \{[\s\S]*?\n  const scheduleGuideHeatCapacityStrongReminderAfterToast/)?.[0] ?? '';
assert.doesNotMatch(activateGuideStrongReminderSection, /showGuideHeatCapacityGuidance/, 'strong reminder activation should not enqueue the ordinary guidance toast');
assert.match(workbenchSource, /const clearHeatCapacityGuideTransientUiState = \(\) => \{[\s\S]*clearGuideHeatCapacityStrongReminder\(\);[\s\S]*clearGuideHeatCapacityGuidancePulseTimer\(\);[\s\S]*\}/, 'guide mode exits and restarts should clear strong reminders without owning scene restoration');
assert.match(workbenchSource, /const resetHeatCapacitySceneUiState = \(\) => \{[\s\S]*setHeatCapacityFocusResetKey\(\(key\) => key \+ 1\);[\s\S]*heatCapacityFocusSessionRef\.current = null;[\s\S]*\}/, 'explicit experiment resets should keep a dedicated path for resetting the 3D focus state');
assert.match(workbenchSource, /const exitHeatCapacityGuideMode = \(\) => \{[\s\S]*exitHeatCapacityTeachingModeToExplore\('guide'\)/, 'stopping Guide Mode should discard Guide progress and return to Explore');
assert.match(workbenchSource, /const resetHeatCapacityGuideExperiment = \(\) => \{[\s\S]*startHeatCapacityGuideWorkbenchState\([\s\S]*clearHeatCapacityModeSession\(activeFile, 'guide'\)[\s\S]*applyHeatCapacityModeUiProjection\(resetFile, null\)/, 'Guide reset should clear the previous checkpoint and initialize a clean Guide workflow through the shared mode UI projection path');
assert.match(workbenchSource, /guideHeatCapacityPendingStrongReminderTimerRef/, 'wrong-click escalation should keep a separate pending-strong timer so the reason toast can fade first');
assert.match(workbenchSource, /scheduleGuideHeatCapacityStrongReminderAfterToast[\s\S]*HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS[\s\S]*activateGuideHeatCapacityStrongReminder/, 'second guided miss should wait for the reason toast display duration before opening the strong mask');
assert.match(heatCapacityRealtimeCopySource, /guideStrongReminder:\s*'请点击目标控件，继续实验。'/, 'strong reminder copy should use the confirmed single Simplified Chinese sentence');
assert.match(heatCapacityRealtimeCopySource, /guideStrongReminderPressureZero:\s*'请调节压强调零旋钮，继续实验。'/, 'pressure-zero strong reminder should use adjustment wording instead of click wording');
assert.match(heatCapacityRealtimeCopySource, /guidePumpInsufficientReminder:\s*'Uₚ 未达到 120 mV，请继续打气。'[\s\S]*guidePumpInsufficientReminder:\s*'Uₚ 未達到 120 mV，請繼續打氣。'[\s\S]*guidePumpInsufficientReminder:\s*'Uₚ has not reached 120 mV\. Continue pumping\.'/, 'guide insufficient-pumping feedback should name the 120 mV displayed target in all supported languages');
assert.doesNotMatch(workbenchSource, /expectedMessage:\s*'充气不足，请继续打气/, 'guide insufficient-pumping feedback should not be hardcoded as Simplified Chinese at the call site');
assert.match(heatCapacityRealtimeCopySource, /guideRecordBlockedMessages:\s*\{[\s\S]*u0NeedZero:\s*'当前还不能记录 U₀。请先完成压力调零。'[\s\S]*u1NeedWait:\s*'当前还不能记录 U₁。请等待计时达到 5 min。'[\s\S]*u2NeedWait:\s*'当前还不能记录 U₂。请等待计时达到 5 min。'/, 'premature record feedback should name the single missing guided condition');
assert.match(heatCapacityRealtimeCopySource, /guideUsageHints:\s*\{[\s\S]*zeroFocus:\s*'请双击仪表进入聚焦模式，开始压力调零。'[\s\S]*zeroAdjust:\s*'拖拽旋钮进行粗调，使用滚轮进行细调。'[\s\S]*pumpValve:\s*'请打开打气阀门。'[\s\S]*pumpFocus:\s*'请双击打气球进入聚焦模式。'/, 'guide mode should include distinct hints for opening the pump valve and then focusing the pump bulb');
assert.match(workbenchSource, /openPumpValveRequired:\s*heatCapacityRealtimeCopy\.guideUsageHints\.pumpValve/, 'opening the pump-valve step should not show the pump-bulb focus instruction');
assert.doesNotMatch(workbenchSource, /nextFile\.heatCapacityMode === 'guide'[\s\S]*captureHeatCapacityWorkbenchSample\([^)]*,\s*'afterPumpSample'/, 'Guide pumping should not write old teaching process samples after the independent Guide runtime is introduced');
assert.match(workbenchSource, /registerHeatCapacityPumpStroke\(fileBeforePump,\s*now\)/, 'Guide pumping should route through the workbench state pump action, which owns Guide workflow transitions');
assert.match(workbenchSource, /const getGuideHeatCapacityMinimumU1PlatformMv = \([\s\S]*HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV[\s\S]*const hasGuideHeatCapacityReachedPumpTarget = \(/, 'guided pumping should require reaching the 120 mV suggested-stop target before the user can leave the pump stage');
assert.match(workbenchSource, /const pumpTargetReached = hasGuideHeatCapacityReachedPumpTarget\(file\);[\s\S]*file\.pumpValveOpen && !pumpTargetReached[\s\S]*return 'pumpRequired'/, 'guide mode should keep asking for rapid pumping until the 120 mV target has been reached');
assert.match(heatCapacityRealtimeCopySource, /pumpAction:\s*'双击聚焦打气球，快速点按打气球，按压至 Uₚ ≥ 120 mV 后自动退出。'/, 'Simplified Chinese guide pump instruction should tell users to focus the pump bulb, use rapid clicks, and stop at the displayed target');
assert.doesNotMatch(workbenchSource, /guidePumpInputLockedRef/, 'the removed guide pump synchronization lock must not leave a second rejection path beside focus and guide guards');
assert.match(workbenchSource, /const guidePumpTargetReached = [\s\S]*getGuideHeatCapacityDisplayedPressureMv\(nextHeatCapacityFile\)[\s\S]*HEAT_CAPACITY_PRESSURE_WARNING_THRESHOLD_MV/, 'Guide pump-target decisions should use the same one-decimal displayed pressure that the user sees');
assert.match(workbenchSource, /showGuideHeatCapacityGuidance\([\s\S]*getGuideStepGuidance\('closePumpValveRequired'[\s\S]*'pumpValve'[\s\S]*'guide'/, 'Guide should immediately show the close-pump-valve prompt after auto-exiting pump focus');
assert.match(guideControlStateSource, /setHeatCapacityGuideStopcockOpen[\s\S]*purpose:[\s\S]*beginHeatCapacityReleaseOpening[\s\S]*heatCapacityGuideTrial[\s\S]*eventLog/, 'opening the stopcock for guided release should record the release start in the independent Guide trial');
assert.match(workbenchSource, /hasGuideHeatCapacityWaitElapsed\(file,\s*'u1'\)/, 'guided U1 readiness should require the five-minute wait gate');
assert.match(workbenchSource, /hasGuideHeatCapacityWaitElapsed\(file,\s*'u2'\)/, 'guided U2 readiness should require the five-minute wait gate');
assert.match(workbenchSource, /hasGuideHeatCapacityFormedRelease\(file\)/, 'guided recovery checks should require an actual release without imposing a fixed close time');
assert.doesNotMatch(workbenchSource, /isGuideHeatCapacityReleaseDurationReady/, 'guided mode should not retain the removed fixed-duration readiness gate');
assert.match(workbenchSource, /heatCapacityToastCurrent \? \([\s\S]*<PromptViewportFeedback[\s\S]*'data-heat-capacity-guide-step-hint': 'true'[\s\S]*\) : null/, 'triggered guide toasts should keep rendering through the shared center feedback surface');
assert.doesNotMatch(workbenchSource, /const heatCapacityGuideProcessPromptBlocked = [^;]*heatCapacityToastCurrent/, 'ordinary bottom guide prompts should stay visible while a yellow click-error toast is displayed');
assert.doesNotMatch(workbenchSource, /const heatCapacityGuideProcessPromptBlocked = guideHeatCapacityStrongReminderActive/, 'guided checklist should stay visible when the strong-reminder mask is active');
assert.match(workbenchSource, /const heatCapacityGuideProcessPromptBlocked = activeHeatCapacityPressureAlarmVisible \|\|[\s\S]*null[\s\S]*getGuideStepGuidance/, 'ordinary guided checklist should still yield to the active file’s alarm surfaces, demo overlays, and mode notices');
assert.match(sceneSource, /overlayGuideMask\?: React\.ReactNode;/, 'Heat Capacity scene should accept a guide mask overlay for strong reminders');
assert.match(sceneSource, /guideFocusMode\?: HeatCapacityFocusMode \| null;/, 'Heat Capacity scene should accept guide-driven focus changes for strong reminders');
assert.match(sceneSource, /guideFocusKey\?: number;/, 'Heat Capacity scene should retrigger the requested guide focus even when the focus mode repeats');
assert.match(sceneSource, /export type HeatCapacityFocusMode = HeatCapacitySceneFocusMode;/, 'guide strong reminder should use the shared focus command identity including the bottle-controls view');
assert.match(sceneSource, /focusViews: \{[\s\S]*instrument:[\s\S]*pump:[\s\S]*bottle:/, 'camera schemes should define a bottle-controls focus view');
assert.match(sceneSource, /requestedFocusMode === 'instrument' \|\| requestedFocusMode === 'pump' \|\| requestedFocusMode === 'bottle'[\s\S]*cameraViewScheme\.focusViews\?\.\[requestedFocusMode\]/, 'camera rig should resolve ordinary and restored instrument, pump, and bottle focus views from the active scheme');
assert.match(sceneSource, /props\.guideFocusMode !== undefined && props\.guideFocusMode !== null[\s\S]*kind: 'script'[\s\S]*focusMode: props\.guideFocusMode[\s\S]*props\.guideFocusKey/, 'scene should submit strong-reminder guide focus through the prioritized command reducer');
assert.match(sceneSource, /onGuideTargetHolesChange\?: \(holes: HeatCapacityGuideProjectedHoles\) => void;/, 'Heat Capacity scene should report projected guide target holes for runtime mask alignment');
assert.match(sceneSource, /function HeatCapacityGuideProjectionBridge/, 'Heat Capacity scene should include a projection bridge for 3D guide targets');
assert.match(sceneSource, /projectHeatCapacityGuidePointToHole[\s\S]*point\.project\(camera\)/, '3D guide target holes should be derived from camera projection instead of static viewport percentages');
assert.match(sceneSource, /function HeatCapacityGuideTargetProbe/, 'procedural 3D guide target holes should be measured from live scene objects');
assert.match(sceneSource, /\{instrumentSceneContent\}[\s\S]*<HeatCapacityGuideProjectionBridge/, 'procedural guide projection should mount after scene content so target objects exist before the first measurement');
assert.match(sceneSource, /const retryProjection = \(\) => \{[\s\S]*runRuntimeGuarded\(\(\) => \{[\s\S]*emitProjectedHoles\(\);[\s\S]*window\.requestAnimationFrame\(retryProjection\)[\s\S]*runRuntimeGuarded\(emitProjectedHoles\)/, 'procedural guide projection should retry through the runtime guard after mount in demand-rendered canvases instead of keeping an empty first projection');
assert.match(sceneSource, /projectionSyncKey: number;[\s\S]*lastSignatureRef\.current = '';[\s\S]*projectionSyncKey/, 'procedural guide projection should re-emit identical holes after guide mode resets clear Workbench state');
assert.match(sceneSource, /guideProjectionKey=\{props\.focusResetKey\}[\s\S]*<HeatCapacityGuideProjectionBridge[\s\S]*projectionSyncKey=\{props\.focusResetKey\}/, 'Heat Capacity scene should use the focus reset key to resync projected guide holes for both model paths');
assert.match(sceneSource, /setFromObject/, 'procedural 3D guide target holes should project actual object bounds instead of hand-authored coordinates');
assert.doesNotMatch(sceneSource, /HEAT_CAPACITY_PROCEDURAL_GUIDE_TARGETS/, 'procedural 3D guide target holes should not depend on a static coordinate table');
const proceduralPressureZeroGuideTarget = sceneSource.match(/id:\s*'pressureZero'[\s\S]*?objectNames:\s*\['HitboxPressureZeroKnob'\][\s\S]*?\n  \}/)?.[0] ?? '';
assert.match(proceduralPressureZeroGuideTarget, /ellipseScale:\s*0\.82/, 'procedural pressure-zero guide hole should keep the tuned compact ellipse size');
assert.doesNotMatch(proceduralPressureZeroGuideTarget, /screenOffsetPx/, 'procedural pressure-zero guide hole should use its own hitbox-centered projection instead of the Ultra upward offset');
assert.match(ultraModelSource, /onGuideTargetHolesChange\?: \(holes: HeatCapacityGuideProjectedHoles\) => void;/, 'Ultra model should expose projected GLB-node guide holes through the same callback');
assert.match(ultraModelSource, /guideProjectionKey: number;/, 'Ultra model should accept the same guide projection resync key as the procedural scene');
assert.match(ultraModelSource, /emitUltraGuideTargetHoles[\s\S]*projectUltraGuideTargetsToHoles\(root,\s*camera,\s*size\)/, 'Ultra guide holes should be projected from runtime GLB and hitbox object bounds');
assert.match(ultraModelSource, /setFromObject/, 'Ultra guide holes should be measured from GLB object bounds instead of fixed pixel sizes');
assert.match(ultraModelSource, /const retryUltraGuideProjection = \(\) => \{[\s\S]*runRuntimeGuarded\(\(\) => \{[\s\S]*emitUltraGuideTargetHoles\(\);[\s\S]*window\.requestAnimationFrame\(retryUltraGuideProjection\)[\s\S]*runRuntimeGuarded\(emitUltraGuideTargetHoles\)/, 'Ultra guide projection should retry through the runtime guard after GLB hitboxes mount so strong reminders do not fall back to a generic rectangle');
assert.match(ultraModelSource, /guideTargetHoleSignatureRef\.current = '';[\s\S]*props\.guideProjectionKey/, 'Ultra guide projection should re-emit unchanged GLB holes after Workbench clears mask state');
assert.match(ultraModelSource, /id:\s*'pressureZero'[\s\S]*ellipseScale:\s*0\.82[\s\S]*screenOffsetPx:\s*\{ y:\s*-16 \}/, 'Ultra pressure-zero guide hole should keep the confirmed upward visual tuning');
assert.match(workbenchSource, /const getHeatCapacityGuideStrongTargetSpec = \(controlId: string \| null\): HeatCapacityGuideStrongTargetSpec =>/, 'strong reminders should use per-control runtime target specs');
assert.match(workbenchSource, /powerSwitch:[\s\S]*sceneHoleIds:\s*\['powerSwitch'\][\s\S]*pressureZero:[\s\S]*sceneHoleIds:\s*\['pressureZero',\s*'instrumentDisplay'\]/, 'power and zeroing strong reminder targets should use projected 3D holes and expose the digital display');
assert.match(workbenchSource, /pumpBulb:[\s\S]*sceneHoleIds:\s*\['pumpBulb',\s*'instrumentDisplay'\]/, 'pump bulb strong reminder should expose the pump bulb and instrument display through projected holes');
assert.match(workbenchSource, /pumpValve:[\s\S]*sceneHoleIds:\s*\['bottleControls'\][\s\S]*stopcock:[\s\S]*sceneHoleIds:\s*\['bottleControls'\]/, 'pump valve and glass stopcock should share the bottle-controls projected strong reminder view');
assert.match(workbenchSource, /recordU1:[\s\S]*domHoles:[\s\S]*data-heat-capacity-guided-record="u1"[\s\S]*data-heat-capacity-wait-timer="true"[\s\S]*sceneHoleIds:\s*\['instrumentDisplay'\][\s\S]*recordU2:[\s\S]*data-heat-capacity-guided-record="u2"[\s\S]*data-heat-capacity-wait-timer="true"[\s\S]*sceneHoleIds:\s*\['instrumentDisplay'\]/, 'U1 and U2 strong reminders should expose the record button, independent timer, and projected instrument display');
assert.match(workbenchSource, /guideHeatCapacityStrongReminderControlId[\s\S]*getHeatCapacityGuideStrongTargetSpec\(guideHeatCapacityStrongReminderControlId\)/, 'strong reminder rendering should use the active target control instead of a generic center ring');
assert.match(workbenchSource, /heatCapacityGuideProjectedHoles/, 'Workbench should store runtime projected 3D guide holes from the scene');
assert.match(workbenchSource, /getHeatCapacityGuideDomCutout[\s\S]*getBoundingClientRect\(\)/, 'Workbench should measure DOM guide cutouts from actual button and timer rectangles');
assert.match(workbenchSource, /viewBox=\{`0 0 \$\{heatCapacityGuideMaskBounds\.width\} \$\{heatCapacityGuideMaskBounds\.height\}`\}/, 'strong reminder mask SVG should use actual pixel bounds');
assert.doesNotMatch(workbenchSource, /viewBox="0 0 100 100"|preserveAspectRatio="none"/, 'strong reminder mask should not use a stretched static percentage viewport');
assert.match(workbenchSource, /guideFocusMode=\{heatCapacityGuideFocusMode\}/, 'Workbench should pass guide focus mode into the Heat Capacity scene');
assert.match(workbenchSource, /guideFocusKey=\{guideHeatCapacityStrongReminderFocusKey\}/, 'Workbench should pass a guide focus key so repeated strong reminders can reset the view');
assert.match(sceneSource, /demoCameraFocusMode\?: HeatCapacityFocusMode \| null;/, 'Heat Capacity scene should accept demo-driven camera focus without enabling guide UI');
assert.match(sceneSource, /props\.demoCameraFocusMode !== undefined && props\.demoCameraFocusMode !== null[\s\S]*kind: 'script'[\s\S]*focusMode: props\.demoCameraFocusMode[\s\S]*props\.demoCameraFocusKey/, 'scene should submit scripted demo camera focus through the prioritized command reducer');
assert.match(workbenchSource, /const \[demoCameraFocusMode, setDemoCameraFocusMode\] = useState<Exclude<HeatCapacityFocusMode, 'none'> \| null>\([\s\S]*?initialHeatCapacityRefreshSession\?\.demo\.cameraMode \?\? null/, 'Workbench should keep demo camera focus independent from guide strong reminders and restore it on refresh');
assert.match(heatCapacityUiCheckpointSource, /export const mapHeatCapacityAutoDemoCameraFocusMode = \([\s\S]*HeatCapacityAutoDemoTimelineItem\['cameraFocusMode'\][\s\S]*Exclude<HeatCapacityFocusMode, 'none'> \| null/, 'the checkpoint boundary should map auto-demo timeline camera modes to scene focus modes explicitly');
assert.match(workbenchSource, /if \(stage === 'highlight' \|\| stage === 'action'\) \{[\s\S]*const nextDemoCameraFocusMode = mapHeatCapacityAutoDemoCameraFocusMode\(cameraFocusMode\);[\s\S]*if \(nextDemoCameraFocusMode\) \{[\s\S]*setHeatCapacityAutoDemoCameraFocus\(nextDemoCameraFocusMode\);[\s\S]*\}/, 'auto demo highlight and action stages should move the camera without forcing preview gaps back to the default view');
assert.doesNotMatch(workbenchSource, /setHeatCapacityAutoDemoCameraFocus\(\(stage === 'highlight' \|\| stage === 'action'\) \? mapHeatCapacityAutoDemoCameraFocusMode\(cameraFocusMode\) : null\);/, 'auto demo preview and observe gaps should not reset an active scripted camera view');
const pauseAutoDemoBlock = workbenchSource.match(/const pauseHeatCapacityAutoDemo = \(\) => \{[\s\S]*?pushLog\([\s\S]*?getHeatCapacityRealtimeCopy\(language\)\.autoDemoPausedLog\(activeFile\.name\)[\s\S]*?'warning'[\s\S]*?\);\s*\};/)?.[0] ?? '';
assert.match(pauseAutoDemoBlock, /heatCapacityAutoDemoPausedElapsedMsRef\.current = elapsedMs;/, 'auto demo pause should preserve the elapsed timeline position for resume');
assert.match(pauseAutoDemoBlock, /setAutoDemoPhase\('paused'\)/, 'auto demo pause should transition the single lifecycle state');
assert.doesNotMatch(pauseAutoDemoBlock, /setHeatCapacityAutoDemoCameraFocus\(null\)|setDemoFocusControlId\(null\)|setDemoFocusPulseActive\(false\)|hideHeatCapacityAutoDemoStepPanel\(\)|pumpHint:\s*heatCapacityRealtimeCopy\.autoDemoPausedHint|showHeatCapacityAutoDemoLockedToast\(heatCapacityRealtimeCopy\.autoDemoPausedToast\)/, 'auto demo pause should not change the visible step panel, focus highlight, scripted camera view, or current hint surface');
assert.match(workbenchSource, /demoCameraFocusMode=\{demoCameraFocusMode\}/, 'Workbench should pass demo camera focus mode into the Heat Capacity scene');
assert.match(workbenchSource, /demoCameraFocusKey=\{demoCameraFocusKey\}/, 'Workbench should pass a demo camera focus key so repeated demo focus stages can retrigger the view');
assert.match(workbenchSource, /overlayGuideMask=\{heatCapacityGuideMaskOverlay\}/, 'Workbench should pass the strong-reminder mask into the Heat Capacity scene');
assert.match(workbenchSource, /onGuideTargetHolesChange=\{setHeatCapacityGuideProjectedHoles\}/, 'Workbench should receive scene-projected guide holes');
assert.match(workbenchSource, /const clearGuideHeatCapacityStrongReminderFocus = \(\) => \{[\s\S]*setHeatCapacityFocusResetKey\(\(key\) => key \+ 1\);[\s\S]*heatCapacityFocusSessionRef\.current = null;/, 'successful strong-reminder target actions should have a shared way to restore the default 3D view');
assert.match(workbenchSource, /if \(shouldResetStrongFocusAfterAllowedAction\(activeStrongReminderControlId,\s*action\)\) \{[\s\S]*clearGuideHeatCapacityStrongReminderFocus\(\);[\s\S]*\}/, 'allowed strong-reminder stopcock and pump-valve actions should reset the guide camera after the user clicks the target');
assert.match(workbenchSource, /activeHeatCapacityGuideStep !== 'closePumpValveRequired'[\s\S]*focusSession\?\.fileId === activeFile\.id && focusSession\.mode === 'pump'[\s\S]*exitHeatCapacityFocusMode\(\);/, 'Guide should leave pump focus after the visible target is reached so queued user input is stopped by the shared focus gate');
assert.doesNotMatch(sessionSource, /heatCapacityGuideSession|WorkbenchHeatCapacityGuideSessionState/, 'workbench session must not retain a second top-level owner for Guide state');
assert.match(workbenchSource, /captureHeatCapacityGuideUiCheckpoint[\s\S]*strongReminder:[\s\S]*pendingStrongReminder:[\s\S]*baseStrongReminder:/, 'the Guide mode checkpoint should own reminder state and deferred timer positions');
assert.match(workbenchSource, /restoreHeatCapacityGuideUiCheckpoint[\s\S]*guideCheckpoint\.strongReminder\.active[\s\S]*guideCheckpoint\.strongReminder\.controlId/, 'restoring Guide should reopen the exact strong-reminder target from the mode checkpoint');
assert.match(workbenchSource, /pendingHeatCapacityGuideUiRestoreRef[\s\S]*restoreHeatCapacityGuideUiCheckpoint/, 'Guide UI restoration should remain deferred until the coordinated mode transition completes');
assert.match(workbenchSource, /guideHeatCapacityStrongReminderActive &&[\s\S]*guideHeatCapacityStrongReminderControlId === guidance\.controlId[\s\S]*return undefined;/, 'the ordinary ten-second Guide timer should not clear an already restored strong reminder for the same step');
assert.match(styleSource, /\.studio-heat-guide-strong-mask\s*\{[\s\S]*position:\s*absolute;[\s\S]*inset:\s*0;[\s\S]*pointer-events:\s*none;/, 'strong reminder shell should preserve click-through target cutouts instead of blocking the highlighted target');
assert.match(workbenchSource, /<path[\s\S]*className="studio-heat-guide-strong-dim"[\s\S]*fillRule="evenodd"[\s\S]*clipRule="evenodd"/, 'strong reminder dimmed mask should use a real even-odd path so target cutouts remain clickable');
assert.doesNotMatch(workbenchSource, /<mask|maskUnits|className="studio-heat-guide-strong-dim"[\s\S]{0,220}\smask=/, 'strong reminder dimmed layer must not use the obsolete SVG mask hit-test path');
assert.match(styleSource, /\.studio-heat-guide-strong-dim\s*\{[^}]*pointer-events:\s*auto;/, 'strong reminder dimmed mask should intercept covered-area controls while leaving target holes usable');
assert.match(styleSource, /\.studio-preview-overlay-slot-top-center\s*\{[\s\S]*z-index:\s*14;/, 'guide wait timer and speed controls should render above the strong-reminder mask layer');
assert.match(styleSource, /\.studio-heat-guide-strong-cutout-svg\s*\{[\s\S]*position:\s*absolute;[\s\S]*inset:\s*0;/, 'strong reminder should render target cutouts through the even-odd SVG layer');
assert.doesNotMatch(workbenchSource, /studio-heat-guide-strong-ring/, 'strong reminder should not use the obsolete generic center ring');
assert.match(workbenchSource, /HEAT_CAPACITY_AUTO_DEMO_LOCKED_TOAST_DEDUPE_MS = 250/, 'auto demo locked-interaction feedback should dedupe pointer and scene callback events');
assert.match(workbenchSource, /heatCapacityAutoDemoLockedToastLastShownRef[\s\S]*now - lastShown\.at < HEAT_CAPACITY_AUTO_DEMO_LOCKED_TOAST_DEDUPE_MS/, 'auto demo locked-interaction toasts should ignore duplicate events from one click');
assert.doesNotMatch(workbenchSource, /onMouseDownCapture=\{\(event\) => \{[\s\S]*?autoDemoInteractionLocked[\s\S]*?showHeatCapacityAutoDemoLockedToast/, 'auto demo locked-interaction feedback should not be wired through both pointer and mouse capture handlers');
assert.match(viewportFeedbackStyleSource, /width:\s*min\(520px,[^;]*\);/, 'center guide feedback cards should keep a consistent bounded width');
assert.match(viewportFeedbackStyleSource, /background:\s*color-mix\([\s\S]*var\(--prompt-feedback-surface,/, 'center guide feedback cards should share the approved softly tinted formal feedback surface');
assert.doesNotMatch(viewportFeedbackStyleSource, /border-left:/, 'center guide feedback cards should not use a one-sided status rail');
assert.doesNotMatch(viewportFeedbackStyleSource, /backdrop-filter/, 'center guide feedback cards should not use blurred glass styling');
assert.doesNotMatch(stateSource, /WorkbenchHeatCapacityPausedTeachingSnapshot|heatCapacityPausedTeachingSnapshot|exitHeatCapacityFreeModeWorkbenchState/, 'Free mode should be the base state instead of storing resumable Demo/Guide snapshots in workbench state');
assert.doesNotMatch(heatCapacitySessionRestoreSource, /heatCapacityPausedTeachingSnapshot/, 'session migration should discard legacy paused teaching snapshots instead of reviving old mode semantics');
assert.doesNotMatch(heatCapacityPersistenceSource, /pausedTeachingSnapshot|heatCapacityPausedTeachingSnapshot/, 'Heat Capacity persistence should stop writing the obsolete paused teaching snapshot field');
assert.doesNotMatch(workbenchSource, /resolvedPowerOn && source === 'user'[\s\S]*heatCapacityPhase === 'demoComplete'[\s\S]*runState === 'finished'[\s\S]*resetHeatCapacityForGuideExperiment/, 'direct power-on after teaching mode must not route through the old Guide reset helper');
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
assert.doesNotMatch(waitControllerStyleSource, /\.heat-capacity-wait-controller \{[^}]*min-height:/, 'wait controller should avoid oversized fixed shells');
assert.doesNotMatch(styleSource, /\.studio-heat-demo-complete-toast \{[^}]*min-height:/, 'demo-complete toasts should avoid blank reserved height');
assert.doesNotMatch(viewportFeedbackStyleSource, /\.prompt-viewport-feedback\s*\{[^}]*min-height:/, 'guide-step hints should not use outer height to solve language switching');
assert.doesNotMatch(styleSource, /\.studio-heat-valve-focus-button/, 'removed valve focus buttons should not keep stable-height styles');
assert.match(workbenchSource, /temperatureSignalValue/, 'fixed realtime window should still expose the live temperature signal');
assert.match(workbenchSource, /pressureSignalValue/, 'fixed realtime window should still expose the live pressure signal');
assert.match(heatCapacityRealtimeCopySource, /realtimePanelTitle: '实时数据'/, 'Heat Capacity fixed panel title should not mention charts in Simplified Chinese');
assert.match(heatCapacityRealtimeCopySource, /realtimePanelTitle: '即時資料'/, 'Heat Capacity fixed panel title should not mention charts in Traditional Chinese');
assert.match(heatCapacityRealtimeCopySource, /realtimePanelTitle: 'Realtime Data'/, 'Heat Capacity fixed panel title should not mention charts in English');
assert.match(workbenchSource, /heatRealtimeTitle/, 'Heat Capacity left panel should have a dedicated realtime title without chart wording');
assert.match(workbenchSource, /renderScientificText\(panel\.hint\)/, 'dock headers should render Uₜ and Uₚ with real subscripts');
assert.match(workbenchSource, /renderScientificText\(heatCapacityRealtimeCopy\.realtimeSubtitle\)/, 'right Heat Capacity panel subtitle should render Uₜ and Uₚ with real subscripts');
assert.doesNotMatch(workbenchSource, /<div><span>鐞嗚 gamma<\/span>/, 'this batch must not render a gamma result field');
assert.doesNotMatch(workbenchSource, /鏃嬪瑙掑害/, 'realtime panel should not expose stopcock angle to users');
assert.doesNotMatch(workbenchSource, /stopcockAngleDeg, 1\)} deg/, 'realtime panel should not render internal stopcock degrees');
assert.match(workbenchGeneralSettingsSource, /performanceMode:\s*DEFAULT_HEAT_CAPACITY_QUALITY_MODE/, 'general settings should default performance mode through the quality profile module');
assert.match(workbenchGeneralSettingsSource, /type WorkbenchPerformanceMode = HeatCapacityQualityMode/, 'performance mode should use the clear quality-mode type');
assert.match(workbenchGeneralSettingsSource, /isWorkbenchPerformanceMode/, 'general settings should validate the current quality setting');
assert.match(workbenchSource, /updateSettingsPerformanceMode/, 'general settings should expose a persistent performance mode updater');
assert.match(workbenchCopySource, /performanceMode:\s*'3D 性能模式'/, 'performance setting should use performance-mode wording in Simplified Chinese');
assert.match(workbenchCopySource, /performanceModeSummary:\s*\{\s*lowLoad:\s*'低负载',\s*balanced:\s*'均衡',\s*highPerformance:\s*'高性能',\s*ultra:\s*'极致画质'\s*\}/, 'Simplified Chinese performance summaries should match the four mode names');
assert.match(workbenchCopySource, /performanceMode:\s*'3D 效能模式'/, 'performance setting should use performance-mode wording in Traditional Chinese');
assert.match(workbenchCopySource, /performanceModeSummary:\s*\{\s*lowLoad:\s*'低負載',\s*balanced:\s*'均衡',\s*highPerformance:\s*'高效能',\s*ultra:\s*'極致畫質'\s*\}/, 'Traditional Chinese performance summaries should match the four mode names');
assert.match(workbenchCopySource, /performanceMode:\s*'3D performance mode'/, 'performance setting should use performance-mode wording in English settings');
assert.match(workbenchCopySource, /performanceModeSummary:\s*\{\s*lowLoad:\s*'Low load',\s*balanced:\s*'Balanced',\s*highPerformance:\s*'High performance',\s*ultra:\s*'Ultra'\s*\}/, 'English performance summaries should match the four mode names');
assert.doesNotMatch(workbenchSource, /performanceModeOff|performanceModeOn|performanceModeBalanced|performanceModeUltra/, 'general settings copy should delete old binary performance labels');
assert.doesNotMatch(workbenchSource, /高清模式|低负载模式|高清|高畫質|Sharp mode|Low-load mode|性能优先|效能優先|Performance first/, 'settings copy should not keep old clarity or performance-first wording');
assert.match(workbenchGeneralSettingsWindowSource, /HEAT_CAPACITY_QUALITY_MODE_ORDER\.map/, 'general settings should render performance mode as a segmented control');
assert.match(workbenchGeneralSettingsWindowSource, /studio-settings-performance-segmented/, 'general settings should include segmented performance mode markup');
assert.doesNotMatch(workbenchGeneralSettingsWindowSource, /role="switch"[\s\S]*aria-checked=\{performanceMode === 'performance'\}/, 'general settings should not keep the old binary performance switch');
assert.doesNotMatch(workbenchSource, /handleAction\('Performance mode'\)/, 'top settings menu should not keep the old standalone performance action');
assert.match(workbenchSource, /performanceMode=\{settingsPerformanceMode\}/, 'Workbench should pass the selected quality mode into Heat Capacity 3D');
assert.doesNotMatch(workbenchSource, /const HEAT_CAPACITY_HARD_SPHERE_PERFORMANCE_PRESETS/, 'Workbench should not keep the old local hard-sphere performance preset table');
assert.match(workbenchSource, /const heatCapacityQualityProfile = HEAT_CAPACITY_QUALITY_PROFILES\[settingsPerformanceMode\]/, 'Workbench should derive the active visual preset from the selected quality profile');
assert.match(workbenchSource, /particleMultiplier=\{heatCapacityQualityProfile\.particleMultiplier\}/, 'Heat Capacity scene should receive particle multiplier from the quality profile');
assert.match(workbenchSource, /speedMultiplier=\{heatCapacityQualityProfile\.speedMultiplier\}/, 'Heat Capacity scene should receive speed multiplier from the quality profile');
assert.doesNotMatch(workbenchSource, /hardSphereParticleMultiplier=\{activeFile\.hardSphereParticleMultiplier\}/, 'Heat Capacity scene should no longer read particle multiplier from the saved file slider field');
assert.doesNotMatch(workbenchSource, /hardSphereSpeedMultiplier=\{activeFile\.hardSphereSpeedMultiplier\}/, 'Heat Capacity scene should no longer read speed multiplier from the saved file slider field');
assert.match(hardSphereLayerSource, /thermalSpeedMultiplier:\s*kineticSpeedState\.speed,/, 'hard-sphere layer should drive random molecular motion through the kinetic speed buffer');
assert.doesNotMatch(hardSphereLayerSource, /thermalSpeedMultiplier:\s*currentVisual\.thermalSpeedMultiplier,/, 'hard-sphere layer should not hard-cut random molecular motion directly from thermal speed');
assert.match(hardSphereLayerSource, /releaseFeedback,\s*\n\s*releaseJustStopped,/, 'hard-sphere layer should pass the shared aperture-and-pressure feedback through the current release path');
assert.doesNotMatch(hardSphereLayerSource, /exitSelectionRate|effectiveExitSelectionRate/, 'hard-sphere layer should not keep legacy pressure-driven exit selection after adopting release budgets');
assert.doesNotMatch(hardSphereLayerSource, /currentVisual\.outflowIntensity/, 'hard-sphere layer should stop consuming the legacy combined outflow intensity');
assert.doesNotMatch(hardSphereModelSource, /outflowIntensity|exitSelectionRate|releaseProgress\?:/, 'hard-sphere visual model should expose only the current drift and timeline inputs');
assert.doesNotMatch(hardSphereSimulationSource, /EXIT_SELECTION|exitSelectionRate/, 'hard-sphere simulation should not select release particles from the old pressure-rate path');
assert.doesNotMatch(hardSphereLayerSource, /currentVisual\.speedMultiplier\s*\*\s*\(0\.82\s*\+\s*\(1\s*-\s*currentVisual\.stability\)\s*\*\s*0\.42\)/, 'hard-sphere layer should not re-mix stability into random thermal speed');
assert.doesNotMatch(workbenchSource, /setHeatCapacityHardSphereMultiplier/, 'Workbench should not keep a direct small-ball multiplier updater after the right sidebar sliders are removed');
assert.doesNotMatch(styleSource, /studio-heat-visual-slider/, 'right Current Parameters sidebar should no longer expose hard-sphere particle or speed range sliders');
assert.doesNotMatch(workbenchSource, /hardSphereParticleMultiplier:\s*'粒子数量倍率'|hardSphereSpeedMultiplier:\s*'粒子速度倍率'|Particle multiplier|Speed multiplier/, 'right sidebar copy should not keep direct particle-count or speed multiplier labels');
assert.doesNotMatch(parameterConfigSource, /performanceMode|hardSphereParticleMultiplier|hardSphereSpeedMultiplier/, 'performance presets must stay out of heatCapacityFreeParameterDraft and config snapshots');
assert.equal(existsSync(join(process.cwd(), 'src', 'domain', 'heatCapacity', 'heatCapacityTrialModel.ts')), false, 'legacy Heat Capacity multi-trial model should be deleted');
assert.match(workbenchSource, /heatCapacityQualityProfile\.tickIntervalMs/, 'Heat Capacity file tick should come from the active quality profile');
assert.doesNotMatch(workbenchGeneralSettingsWindowSource, /studio-settings-performance-switch/, 'general settings should remove the old performance switch markup');
assert.doesNotMatch(leftPanelSource, /studio-heat-processing-summary|data-heat-capacity-processing-tab|renderProcessingTab/, 'Heat Capacity left panel should not keep the legacy standalone processing UI');
assert.doesNotMatch(leftPanelSource, /renderRecordingTab[\s\S]*heatCapacityTrials|validResults\.length < 2/, 'Heat Capacity left panel should not keep the legacy multi-trial recording/processing branch');
assert.match(leftPanelSource, /onRemoveTrialRecord/, 'Free Mode data/result UI should expose a callback for removing current records and whole free-trial values');
assert.match(leftPanelSource, /pendingRemoveTrialRecord/, 'Heat Capacity recording table should receive the pending removal confirmation state');
assert.match(leftPanelSource, /studio-table-action-row[\s\S]*studio-table-action-confirm[\s\S]*studio-table-action-cancel/, 'Heat Capacity recording table should reuse the existing two-step table deletion styles');
assert.match(leftPanelSource, /deleteTrial:\s*'删除本次实验'/, 'whole-experiment deletion should use the confirmed Simplified Chinese copy');
assert.doesNotMatch(leftPanelSource, /renderProcessSampleStatus = \([\s\S]*renderRemoveRecordButton|calculateHeatCapacityTrialResult\(trial/, 'legacy teaching record table should not remain after rebuilding mode-specific data pages');
assert.match(guideControlStateSource, /const currentFile = stepHeatCapacityGuideWorkbenchFile\(file,\s*now\);[\s\S]*const context = getHeatCapacityGuideActionContext\(currentFile,\s*action\);[\s\S]*const guard = getHeatCapacityGuideActionGuard\(currentFile\.heatCapacityGuideWorkflow,\s*context\);[\s\S]*if \(!guard\.allowed\)/, 'record U0/U1/U2 actions should obey the latest guide-step validation and block stale visible buttons');
assert.doesNotMatch(workbenchSource, /latestStep !== requiredStep && stepAtClick !== requiredStep/, 'stale record-ready state must not allow recording after the ideal-range guard has moved back to a waiting step');
assert.doesNotMatch(leftPanelSource, /actionVisible:\s*file\.heatCapacityProcessSamples\.recoverySample !== null/, 'U2 delete should not be controlled by a stale or placeholder recovery sample');
assert.match(leftPanelSource, /renderRemoveRecordButton\(\s*index,\s*'trial'/, 'the lower trial table should delete only the whole group');
assert.doesNotMatch(leftPanelSource, /renderRemoveRecordButton\(trialIndex,\s*'u1'[\s\S]*renderRemoveRecordButton\(trialIndex,\s*'u2'/, 'the lower trial table should no longer concentrate U1 and U2 delete controls inside the data group row');
assert.doesNotMatch(workbenchSource, /removeHeatCapacityTrialRecord|createDefaultHeatCapacityProcessingResult/, 'Workbench should not keep legacy trial rollback or standalone processing invalidation');
assert.match(styleSource, /\.studio-theme-light \.studio-table-action\.studio-table-action-confirm \{[\s\S]*background: var\(--studio-danger\);[\s\S]*color: #f8fafb;/, 'light theme two-step delete confirmation should keep readable light text on the semantic danger button');
assert.doesNotMatch(leftPanelSource, /5\s*\/\s*3|1\.667/, 'Heat Capacity processing UI should not show hard-sphere theoretical gamma');
assert.match(leftPanelSource, /zh-CN[\s\S]*实验指引[\s\S]*数据与结果/, 'Heat Capacity left panel should include Simplified Chinese copy for the merged result page');
assert.match(leftPanelSource, /zh-TW[\s\S]*實驗指引[\s\S]*資料與結果/, 'Heat Capacity left panel should include Traditional Chinese copy for the merged result page');
assert.match(leftPanelSource, /en[\s\S]*Experiment Guide[\s\S]*Data & Results/, 'Heat Capacity left panel should include English copy for the merged result page');
assert.match(leftPanelSource, /P₁ = P₀ \+ U₁′ \/ S/, 'Heat Capacity formulas should render the absolute-pressure path with real subscripts and prime symbols');
assert.match(leftPanelSource, /γ = ln\(P₁ \/ P₀\) \/ ln\(P₁ \/ P₂\)/, 'Heat Capacity formulas should render gamma with the real Greek symbol');
assert.doesNotMatch(leftPanelSource, /HEAT_CAPACITY_FORMULA_RESULT_PREVIEW_LIMIT|formulaResultsExpanded|slice\(0,\s*HEAT_CAPACITY_FORMULA_RESULT_PREVIEW_LIMIT\)/, 'legacy multi-group formula preview controls should be removed with the old processing page');
assert.match(leftPanelSource, /引导模式数据与结果[\s\S]*数据来源：引导模式固定标准流程/, 'recording page should rename guide mode to guide mode');
assert.doesNotMatch(leftPanelSource, /手动模式需在正确阶段使用 3D 预览中的记录按钮/, 'recording page should not keep the old pre-guide label');
assert.doesNotMatch(leftPanelSource, /本组已完成；提示结束后可在上方模式栏点击“下一组实验”。/, 'single guide mode should not keep old next-trial continuation copy');
assert.match(heatCapacityRealtimeCopySource, /真实实验中需要等待系统稳定；程序已省略该等待过程。/, 'U2 success guidance should use the confirmed two-second stability-wait notice');
assert.doesNotMatch(workbenchSource, /可立即进入下一组实验。/, 'old immediate next-trial wait-skip copy should be removed');
assert.doesNotMatch(workbenchSource, /showGuideHeatCapacityGuidance\(heatCapacityRealtimeCopy\.skipRecoveryWait,\s*'startNextTrial'/, 'U2 success should no longer reveal the next-trial control immediately');
assert.doesNotMatch(leftPanelSource, /铻東绾瑋钄殀鑴硘鐎箌鐠亅缁寍閻榺鈧琝?/, 'Heat Capacity left panel source should not contain mojibake or corrupted scientific symbols');
assert.doesNotMatch(leftPanelSource, /studio-heat-processing-intro[\s\S]{0,260}studio-analysis-cell/, 'Heat Capacity processing intro should not reuse the generic analysis cell layout');
assert.doesNotMatch(styleSource, /\.studio-heat-processing-summary/, 'legacy Heat Capacity processing summary CSS should be removed');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-panel-content/, 'light theme should cover Heat Capacity materials panel content');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-thinking-trigger:hover/, 'light theme should keep Heat Capacity thinking hover states light');
assert.match(styleSource, /\.studio-settings-performance-segmented/, 'performance mode segmented control should have dedicated CSS');
assert.match(styleSource, /\.studio-settings-performance-thumb/, 'performance mode segmented control should have a sliding thumb');
assert.match(styleSource, /\.studio-settings-performance-option/, 'performance mode segmented control should style each tier option');
assert.doesNotMatch(getRootCssBlock('.studio-settings-section'), /inset\s+3px\s+0\s+0/, 'settings sections should not keep a left accent stripe');
assert.doesNotMatch(getCssBlock('.studio-theme-light .studio-settings-section'), /inset\s+3px\s+0\s+0/, 'light settings sections should not keep a left accent stripe');
assert.match(sceneSource, /const INSTRUMENT_DIGITAL_DISPLAY_TEXT_SIZE = 0\.054;/, 'instrument digital display values should be enlarged while staying inside the model screen plane');
assert.match(sceneSource, /name="TemperatureDisplayText"[\s\S]*size=\{INSTRUMENT_DIGITAL_DISPLAY_TEXT_SIZE\}/, 'temperature digital screen should use the enlarged shared display value size');
assert.match(sceneSource, /name="PressureDisplayText"[\s\S]*size=\{INSTRUMENT_DIGITAL_DISPLAY_TEXT_SIZE\}/, 'pressure digital screen should use the enlarged shared display value size');
assert.doesNotMatch(sceneSource, /studio-preview-overlay-slot-bottom-right[\s\S]*data-heat-capacity-hover-tooltip="true"/, 'Heat Capacity hover tooltip should not share the lower-right panel space');
assert.match(getCssBlock('.studio-heat-hover-tooltip'), /position:\s*absolute;/, 'Heat Capacity hover tooltip should float near the hovered control instead of occupying a panel slot');
assert.match(styleSource, /\.studio-theme-light \.studio-settings-performance-segmented/, 'light theme should style the performance segmented control');
assert.match(styleSource, /\.studio-theme-light \.studio-settings-performance-option:hover/, 'light theme performance option hover should stay light');
assert.doesNotMatch(styleSource, /\.studio-settings-performance-toggle i/, 'settings performance switch should not keep a separate thumb implementation');

assert.match(workbenchSource, /canOpenHeatCapacityParameterSidebar/, 'Heat Capacity parameter rail should use the free-mode sidebar admission helper');
assert.match(workbenchSource, /getHeatCapacityParameterSidebarBlockReason/, 'blocked Heat Capacity parameter rail clicks should show the configured free-mode-only reason');
assert.match(freeParameterPanelModelSource, /heatCapacityFreeParameterLockText[\s\S]*freeModeOnly:[\s\S]*'zh-CN':\s*'只有自由实验模式可以调整参数。'[\s\S]*'zh-TW':\s*'只有自由實驗模式可以調整參數。'[\s\S]*en:\s*'Only Free Mode can adjust parameters\.'/,
  'demo and guide Heat Capacity parameter-sidebar lock copy should be localized for all three languages');
assert.doesNotMatch(workbenchSource, /HEAT_CAPACITY_FREE_PARAMETER_SIDEBAR_BLOCK_FALLBACK/, 'Workbench should not consume a single-language parameter-sidebar fallback string');
assert.match(workbenchSource, /const blockReason = getHeatCapacityParameterSidebarBlockReason\(activeFile\);[\s\S]*?getHeatCapacityFreeParameterLockMessage\(blockReason, language\)/,
  'blocked Heat Capacity parameter rail clicks should localize the configured lock reason id');
assert.match(heatCapacityRealtimeCopySource, /pumpHints:\s*\{[\s\S]*pumpValveOpen:\s*'打气阀门已打开'[\s\S]*pumpValveClosed:\s*'打气阀门已关闭'[\s\S]*observeInitialPressure:\s*'观察初始压强差示数是否为零'[\s\S]*pumpHints:\s*\{[\s\S]*pumpValveOpen:\s*'打氣閥門已打開'[\s\S]*pumpValveClosed:\s*'打氣閥門已關閉'[\s\S]*observeInitialPressure:\s*'觀察初始壓強差示數是否為零'[\s\S]*pumpHints:\s*\{[\s\S]*pumpValveOpen:\s*'Pump valve is open'[\s\S]*pumpValveClosed:\s*'Pump valve is closed'[\s\S]*observeInitialPressure:\s*'Observe whether the initial pressure-difference reading is zero'/,
  'Heat Capacity pump-status hints should be localized for zh-CN, zh-TW, and en');
assert.match(heatCapacityRealtimeCopySource, /export const getLocalizedHeatCapacityPumpHint = \(/, 'Heat Capacity pump hints stored in runtime state should be localized at display time');
assert.match(workbenchSource, /pumpHint=\{localizedHeatCapacityPumpHint\}/, '3D Heat Capacity scene should receive the localized pump hint');
assert.doesNotMatch(workbenchSource, /pumpHint=\{activeFile\.pumpHint\}/, '3D Heat Capacity scene should not render raw state pump hints');
assert.doesNotMatch(workbenchSource, /return activeFile\.pumpHint \|\| heatCapacityRealtimeCopy\.hints\.fallback/, 'Realtime hint fallback should localize raw state pump hints before display');
assert.doesNotMatch(workbenchSource, /pumpHint:\s*'(?:打气阀门已打开|打气阀门已关闭|观察初始压强差示数是否为零)'/, 'Workbench event handlers should not write new single-language pump hints directly');
assert.match(workbenchCopySource, /usageHintAria:\s*'文件树操作提示'[\s\S]*clickSelectHint:\s*'单击选中'[\s\S]*doubleClickOpenHint:\s*'双击打开'[\s\S]*usageHintAria:\s*'檔案樹操作提示'[\s\S]*clickSelectHint:\s*'單擊選取'[\s\S]*doubleClickOpenHint:\s*'雙擊開啟'[\s\S]*usageHintAria:\s*'File tree usage hint'[\s\S]*clickSelectHint:\s*'Click to select'[\s\S]*doubleClickOpenHint:\s*'Double-click to open'/,
  'left sidebar usage hints should be localized for all three languages');
assert.doesNotMatch(workbenchSource, /aria-label="文件树操作提示"|<span>单击选中<\/span>|<span>双击打开<\/span>/, 'left sidebar usage hints should not render hard-coded Simplified Chinese text');
assert.match(styleSource, /\.studio-workspace-shell\.studio-params-collapsed\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*0;/, 'collapsed parameter sidebars should keep winning over responsive workspace grid rules');
assert.match(styleSource, /\.studio-params-collapsed \.studio-current-params\s*\{[\s\S]*visibility:\s*hidden;/, 'collapsed parameter sidebars should hide the right panel content instead of leaving it visible in demo and guide modes');
assert.match(workbenchSource, /renderHeatCapacityFreeParameterPanel/, 'Free Mode should render a dedicated parameter panel instead of generic parameter rows');
assert.match(workbenchSource, /data-heat-capacity-free-parameter-panel="true"/, 'Free Mode parameter panel should expose stable markup');
assert.match(freeParameterPanelModelSource, /id:\s*'leakageEnabled'/, 'Free Mode parameter model should define the leakage checkbox');
assert.match(freeParameterPanelModelSource, /id:\s*'instrumentNoiseEnabled'/, 'Free Mode parameter model should define the instrument-noise checkbox');
assert.match(freeParameterPanelModelSource, /id:\s*'hardSphereViewEnabled'/, 'Free Mode parameter model should define the hard-sphere visualization checkbox');
assert.match(workbenchSource, /data-heat-capacity-basic-checkbox=\{definition\.id\}/, 'Free Mode parameter panel should render model-defined checkboxes with stable markup');
assert.match(workbenchSource, /definition\.id === 'hardSphereViewEnabled'[\s\S]*\? false[\s\S]*: activeHeatCapacityFreeParameterLocked/, 'Free Mode molecule visualization checkbox should remain available after Ultra cylinder visualization is connected');
assert.doesNotMatch(workbenchSource, /definition\.id === 'hardSphereViewEnabled'[\s\S]*settingsPerformanceMode === 'ultra'/, 'Ultra GLB mode should no longer disable the Free Mode molecule visualization checkbox');
assert.match(workbenchSource, /renderHeatCapacityParameterSymbol[\s\S]*<sub key=\{index\}>\{part\.sub\}<\/sub>/, 'Free Mode parameter symbols should render true subscript nodes');
const freeBasicNumberParametersSection = freeParameterPanelModelSource.match(/export const heatCapacityFreeBasicNumberParameters:[\s\S]*?\n\];/)?.[0] ?? '';
const freeAdvancedNumberParametersSection = freeParameterPanelModelSource.match(/export const heatCapacityFreeAdvancedNumberParameters:[\s\S]*?\n\];/)?.[0] ?? '';
const freeGasTypeOptionsSection = freeParameterPanelModelSource.match(/export const heatCapacityFreeGasTypeOptions:[\s\S]*?\n\];/)?.[0] ?? '';
const freeGasTypeRowRendererSection = workbenchSource.match(/const renderHeatCapacityFreeGasTypeRow = \(\) => \{[\s\S]*?const renderHeatCapacityBasicParameterRows/)?.[0] ?? '';
const freeBasicParameterRowsRendererSection = workbenchSource.match(/const renderHeatCapacityBasicParameterRows = \(\) => \{[\s\S]*?const renderHeatCapacityFreeParameterPanel/)?.[0] ?? '';
assert.match(freeGasTypeOptionsSection, /id:\s*'air'[\s\S]*id:\s*'helium'/, 'Free Mode gas type options should expose air and helium in order');
assert.match(freeParameterPanelModelSource, /getHeatCapacityFreeGasTypeGamma/, 'Free Mode gas type UI should read theory values from the shared gas configuration');
assert.match(freeGasTypeOptionsSection, /theoreticalGamma:\s*getHeatCapacityFreeGasTypeGamma\('air'\)[\s\S]*theoreticalGamma:\s*getHeatCapacityFreeGasTypeGamma\('helium'\)/, 'Free Mode gas type options should derive theory values from gas type');
assert.doesNotMatch(freeGasTypeOptionsSection, /theoreticalGamma:\s*(1\.4|5\s*\/\s*3)/, 'Free Mode gas type options should not duplicate hard-coded gamma values');
assert.doesNotMatch(gasTheorySource, /HEAT_CAPACITY_FREE_IDEAL_GAS_TYPE/, 'ideal Free Mode should no longer hard-code air as its only gas type');
assert.match(gasTheorySource, /export const getHeatCapacityFreeIdealTheoreticalGamma[\s\S]*gasType:\s*HeatCapacityFreeGasType\s*=\s*'air'[\s\S]*getHeatCapacityFreeGasTypeGamma\(gasType\)/, 'ideal Free Mode should derive theoretical gamma from its selected gas while preserving air as the compatibility default');
assert.match(idealParameterProfileSource, /getHeatCapacityFreeIdealTheoreticalGamma/, 'ideal parameter profile should consume the shared ideal-gas theory helper');
assert.doesNotMatch(idealParameterProfileSource, /gamma:\s*1\.4/, 'ideal parameter profile should not duplicate the fixed air gamma literal');
assert.match(freeTraceStateSource, /getHeatCapacityFreeIdealTheoreticalGamma/, 'Free trial evidence should consume the shared ideal-gas theory helper');
assert.doesNotMatch(stateSource, /export const HEAT_CAPACITY_FREE_IDEAL_GAS_TYPE|export const getHeatCapacityFreeIdealTheoreticalGamma/, 'Workbench state should not own ideal-gas theory constants');
assert.match(workbenchSource, /renderHeatCapacityFreeGasTypeRow[\s\S]*heatCapacityFreeGasTypeOptions\.map/, 'Free Mode basic parameters should render the gas type selector from model options');
assert.match(workbenchSource, /activeHeatCapacityExperimentTitle[\s\S]*heatCapacityRealtimeCopy\.gasExperimentTitle\(activeHeatCapacityGasLabel\)/, 'Free Mode experiment titles should follow the selected gas type');
assert.match(workbenchSource, /activeHeatCapacityCalculationHint[\s\S]*heatCapacityRealtimeCopy\.gasCalculationHint\(activeHeatCapacityGasLabel\)/, 'Free Mode calculation copy should follow the selected gas type');
assert.match(heatCapacityRealtimeCopySource, /gasExperimentTitle:\s*\(gasLabel: string\)/, 'heat-capacity realtime copy should expose localized gas-aware titles');
assert.match(workbenchSource, /renderHeatCapacityFreeGasTypeRow\(\)[\s\S]*heatCapacityFreeBasicNumberParameters\.map/, 'Free Mode gas type selector should sit before atmospheric pressure in the basic parameter area');
assert.match(workbenchSource, /data-heat-capacity-gas-type-option=\{option\.id\}/, 'Free Mode gas type choices should expose stable markup');
assert.match(freeGasTypeRowRendererSection, /const disabled = gasTypeLocked;/, 'ideal and real Free Mode should share the same gas-type lock boundary');
assert.doesNotMatch(workbenchSource, /if \(currentFile\.heatCapacityFreeParameterScheme === 'ideal'\)/, 'ideal Free Mode should allow gas selection before the experiment starts');
assert.match(workbenchSource, /studio-heat-free-gas-type-control-\$\{selectedGasType\}[\s\S]*studio-heat-free-gas-type-thumb/, 'Free Mode gas type selector should render a moving selected-state thumb bound to the current gas type');
assert.doesNotMatch(workbenchSource, /studio-heat-free-gas-type-option-active/, 'Free Mode gas type selector should not keep the old per-button active rectangle class after introducing the moving thumb');
assert.match(styleSource, /\.studio-heat-free-gas-type-control\s*\{[\s\S]*position:\s*relative;[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/, 'Free Mode gas type selector should use a two-segment grid so the selected thumb can slide between gases');
assert.match(styleSource, /\.studio-heat-free-gas-type-thumb\s*\{[\s\S]*width:\s*calc\(\(100% - 4px\) \/ 2\);[\s\S]*transition:\s*transform 220ms cubic-bezier\(0\.34,\s*0,\s*0\.2,\s*1\)/, 'Free Mode gas type selected thumb should move smoothly with an accelerate-then-decelerate timing curve');
assert.match(styleSource, /\.studio-heat-free-gas-type-control-helium \.studio-heat-free-gas-type-thumb\s*\{[\s\S]*transform:\s*translateX\(100%\);/, 'Free Mode gas type selected thumb should slide to the helium half when helium is selected');
assert.match(styleSource, /\.studio-heat-free-gas-type-option\[aria-pressed="true"\]\s*\{[\s\S]*color:\s*#d8ffe0;[\s\S]*\}/, 'Free Mode gas type selected text should be styled through aria-pressed while the selected rectangle belongs to the thumb');
assert.doesNotMatch(styleSource, /\.studio-heat-free-gas-type-option-active/, 'Free Mode gas type CSS should remove the old active-option rectangle style');
assert.match(workbenchSource, /renderHeatCapacityTooltipPopover/, 'Heat Capacity hover hints should use one shared tooltip renderer');
assert.match(workbenchSource, /renderHeatCapacityTooltipAnchor/, 'Heat Capacity hover hints should use one shared tooltip anchor');
assert.match(styleSource, /\.studio-heat-unified-tooltip\s*\{[\s\S]*font-size:\s*11px;[\s\S]*border-radius:\s*6px;/, 'Heat Capacity tooltips should share a fixed rounded-rectangle visual style');
assert.match(freeGasTypeRowRendererSection, /studio-heat-free-gas-type-help[\s\S]*renderHeatCapacityTooltipAnchor/, 'Free Mode gas type help question marks should use the shared tooltip anchor inside each selectable option');
assert.doesNotMatch(freeGasTypeRowRendererSection, /title=\{option\.help\[settingsLanguagePreference\]\}/, 'Free Mode gas type help should not fall back to the browser-native title tooltip');
assert.match(freeBasicParameterRowsRendererSection, /renderHeatCapacityTooltipAnchor[\s\S]*studio-heat-free-scheme-tooltip-anchor[\s\S]*heatCapacityFreeSharedText\.idealProfileLockedHint|heatCapacityFreeSharedText\.idealProfileLockedHint[\s\S]*renderHeatCapacityTooltipAnchor[\s\S]*studio-heat-free-scheme-tooltip-anchor/, 'locked real/ideal scheme switching should expose the shared disabled tooltip copy');
assert.match(freeParameterPanelModelSource, /idealProfileLockedHint:/, 'real/ideal locked tooltip copy should live in the shared parameter-panel copy');
assert.doesNotMatch(freeParameterPanelModelSource, /idealProfileLocked:\s*\{/, 'real/ideal switching should not keep a second shorter locked-copy path');
assert.match(workbenchSource, /showHeatCapacityFreeSchemeLockHint[\s\S]*heatCapacityFreeSharedText\.idealProfileLockedHint/, 'real/ideal locked click toast should use the same copy as the hover tooltip');
assert.match(
  freeBasicNumberParametersSection,
  /id:\s*'ambientPressureKPa'[\s\S]*id:\s*'ambientTemperatureK'/,
  'Free Mode basic parameter list should expose pressure and Celsius temperature in order',
);
assert.match(freeBasicNumberParametersSection, /parts:\s*\['P',\s*\{\s*sub:\s*'0'\s*\}\]/, 'Free Mode basic parameter list should include P subscript 0');
assert.match(freeBasicNumberParametersSection, /parts:\s*\['t',\s*\{\s*sub:\s*'0'\s*\}\]/, 'Free Mode basic temperature should use t subscript 0 because the displayed value is Celsius');
assert.match(freeBasicNumberParametersSection, /id:\s*'ambientTemperatureK'[\s\S]*unit:\s*'℃'[\s\S]*toInputValue:\s*\(kelvin\)\s*=>\s*kelvin - 273\.15[\s\S]*fromInputValue:\s*\(celsius\)\s*=>\s*celsius \+ 273\.15/, 'Free Mode basic temperature should display Celsius while storing Kelvin in the model draft');
assert.doesNotMatch(freeBasicNumberParametersSection, /id:\s*'vesselVolumeL'/, 'Free Mode basic parameter list should not expose fixed vessel volume');
assert.doesNotMatch(freeBasicNumberParametersSection, /id:\s*'pressureMvPerKPa'/, 'Free Mode basic parameter list should not expose fixed pressure sensitivity');
assert.doesNotMatch(freeBasicNumberParametersSection, /gasWallConductanceWPerK|wallAmbientConductanceWPerK/, 'Free Mode basic parameter list should not keep advanced heat-exchange conductance fields');
assert.doesNotMatch(freeAdvancedNumberParametersSection, /id:\s*'pressureMvPerKPa'|id:\s*'vesselVolumeL'/, 'Free Mode advanced parameters should not expose fixed pressure sensitivity or fixed vessel volume');
assert.match(freeAdvancedNumberParametersSection, /id:\s*'gasWallConductanceWPerK'[\s\S]*id:\s*'wallAmbientConductanceWPerK'/, 'Free Mode advanced parameters should retain heat-exchange conductance fields after they leave the basic panel');
assert.doesNotMatch(freeParameterPanelModelSource, /group:\s*'A' \| 'B' \| 'C' \| 'D'/, 'Free Mode parameter definitions should not keep the old letter-based group type');
assert.doesNotMatch(freeBasicNumberParametersSection, /group:\s*'[A-D]'/, 'Free Mode basic parameter definitions should not keep stale advanced grouping metadata');
assert.doesNotMatch(freeAdvancedNumberParametersSection, /group:\s*'[A-D]'/, 'Free Mode advanced parameter definitions should use semantic group ids instead of old letter groups');
assert.doesNotMatch(freeAdvancedNumberParametersSection, /id:\s*'gamma'/, 'gamma should not remain as a directly editable advanced parameter');
assert.doesNotMatch(freeParameterPanelModelSource, /id:\s*'gasTheory'/, 'advanced parameter groups should not keep an empty gas-theory group after gas type moves to basic parameters');
assert.match(freeAdvancedNumberParametersSection, /id:\s*'gasWallConductanceWPerK'[\s\S]*group:\s*'thermalExchange'[\s\S]*parts:\s*\[\]/, 'gas-wall conductance should belong to thermal exchange and show only the Chinese name');
assert.match(freeAdvancedNumberParametersSection, /id:\s*'wallAmbientConductanceWPerK'[\s\S]*group:\s*'thermalExchange'[\s\S]*parts:\s*\[\]/, 'wall-ambient conductance should belong to thermal exchange and show only the Chinese name');
assert.match(freeAdvancedNumberParametersSection, /id:\s*'wallHeatCapacityJPerK'[\s\S]*group:\s*'thermalExchange'/, 'wall heat capacity should belong to the thermal-exchange advanced group');
assert.match(freeAdvancedNumberParametersSection, /id:\s*'leakageRatePerS'[\s\S]*group:\s*'nonIdealCorrection'[\s\S]*parts:\s*\[\]/, 'leakage rate should belong to non-ideal corrections without exposing an internal symbol');
assert.match(freeAdvancedNumberParametersSection, /id:\s*'noiseMv'[\s\S]*group:\s*'nonIdealCorrection'[\s\S]*parts:\s*\[\]/, 'instrument noise should belong to non-ideal corrections without exposing an internal symbol');
assert.match(freeAdvancedNumberParametersSection, /id:\s*'sensorLagTimeS'[\s\S]*group:\s*'nonIdealCorrection'[\s\S]*parts:\s*\[\]/, 'sensor lag should belong to non-ideal corrections without exposing an internal symbol');
assert.match(freeAdvancedNumberParametersSection, /id:\s*'u0ZeroToleranceMv'[\s\S]*group:\s*'recordCriteria'[\s\S]*parts:\s*\['U',\s*\{\s*sub:\s*'0'\s*\}\]/, 'U0 record tolerance should keep a U0-related symbol');
assert.match(freeAdvancedNumberParametersSection, /id:\s*'pressureStableSlopeMvPerS'[\s\S]*group:\s*'recordCriteria'[\s\S]*parts:\s*\[\]/, 'record-stability slope limits should not expose internal slope symbols');
assert.match(freeAdvancedNumberParametersSection, /id:\s*'temperatureStableSlopeMvPerS'[\s\S]*group:\s*'recordCriteria'[\s\S]*parts:\s*\[\]/, 'temperature-stability slope limits should not expose internal slope symbols');
assert.match(freeAdvancedNumberParametersSection, /id:\s*'temperatureAmbientToleranceMv'[\s\S]*group:\s*'recordCriteria'[\s\S]*parts:\s*\[\]/, 'ambient temperature tolerance should not expose an internal epsilon symbol');
assert.match(freeAdvancedNumberParametersSection, /id:\s*'minimumUsefulU1CorrectedMv'[\s\S]*label:\s*\{\s*'zh-CN':\s*'最小有效值',\s*'zh-TW':\s*'最小有效值'/, 'minimum useful U1 Chinese labels should not repeat U1 because the symbol already shows it');
assert.match(freeAdvancedNumberParametersSection, /id:\s*'overVentedMinimumU2CorrectedMv'[\s\S]*label:\s*\{\s*'zh-CN':\s*'最小有效值',\s*'zh-TW':\s*'最小有效值'/, 'minimum useful U2 Chinese labels should not repeat U2 because the symbol already shows it');
assert.doesNotMatch(freeAdvancedNumberParametersSection, /'zh-CN':\s*'最小有效 U[12]'|'zh-TW':\s*'最小有效 U[12]'/, 'advanced parameter Chinese labels should not duplicate U1 or U2 text next to U symbols');
assert.match(freeParameterPanelModelSource, /parts:\s*\['U',\s*\{\s*sub:\s*'1,min'\s*\}\]/, 'Free Mode advanced parameter list should include U subscript 1,min without underscores');
assert.doesNotMatch(freeParameterPanelModelSource, /P_0|G_gw|lambda_leak|U_1,min/, 'Free Mode parameter model should not render underscore-style scientific codes');
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
assert.match(workbenchSource, /studio-heat-free-scheme-button/, 'Free Mode parameter rail should render a real-or-ideal scheme toggle button');
assert.match(
  workbenchSource,
  /\sdisabled=\{activeHeatCapacityFreeSchemeLocked\}/,
  'real/ideal scheme toggle should become a true disabled button once the current experiment has started',
);
assert.match(
  workbenchSource,
  /aria-disabled=\{activeHeatCapacityFreeSchemeLocked\}/,
  'real/ideal scheme toggle should expose locked state accessibly',
);
assert.match(workbenchSource, /<WorkbenchHeatCapacityIdealProfileIntroDialog/, 'first ideal profile activation should render a centered introduction confirmation');
assert.match(freeParameterPanelModelSource, /idealProfileIntroTitle:[\s\S]*idealProfileIntroBody:[\s\S]*confirmEnableIdealProfile:/, 'ideal profile introduction copy should live in shared free parameter copy');
assert.match(workbenchSource, /requestToggleHeatCapacityFreeParameterScheme[\s\S]*acknowledgeHeatCapacityFreeFileNoticeWorkbenchState\(file,\s*'idealParameterProfileIntro'\)[\s\S]*setHeatCapacityIdealIntroOpen\(true\)/, 'ideal profile intro should be acknowledged for the file as soon as the first prompt is opened, not after a later experiment group');
assert.match(workbenchSource, /confirmHeatCapacityIdealProfileIntro[\s\S]*isHeatCapacityFreeExperimentStarted/, 'ideal profile confirmation should re-check the latest file lock before switching schemes');
assert.match(styleSource, /\.studio-heat-free-scheme-button-active[\s\S]*box-shadow:/, 'ideal scheme toggle should have a visible selected glow');
assert.match(styleSource, /\.studio-heat-free-params\.is-ideal-readonly[\s\S]*opacity:/, 'ideal scheme should visibly grey out editable parameters');
assert.match(leftPanelSource, /groupCollection:[\s\S]*selectViewedHeatCapacityFreeExperimentGroup\(groupCollection\)/, 'Heat Capacity left panel should derive the viewed real-or-ideal scheme from the selected experiment group');
assert.match(leftPanelSource, /<HeatCapacityExperimentGroupContextBar/, 'data/results should render the shared experiment-group and experiment selector');
assert.doesNotMatch(`${leftPanelSource}\n${workbenchSource}`, /studio-heat-free-display-scheme-select/, 'real/ideal display switching should not use the browser-native select menu');
assert.doesNotMatch(`${processReviewPanelSource}\n${processReviewStyleSource}\n${styleSource}`, /studio-heat-free-display-scheme-(?:control|open|trigger|chevron|menu|active)/, 'the removed display-scheme component must not leave reusable-looking class names behind');
assert.match(`${leftPanelSource}\n${processReviewPanelSource}`, /理想实验条件不参与评分。/, 'ideal process review should explain why scoring is omitted');
assert.match(processReviewPanelSource, /operationScore[\s\S]*--/, 'ideal process review should render scoring as placeholders');
assert.match(workbenchSource, /acknowledgeHeatCapacityFreeFileNoticeWorkbenchState[\s\S]*advancedParametersRisk/, 'advanced risk confirmation should persist through the shared file acknowledgement object');
assert.match(workbenchSource, /applyHeatCapacityFreeParameterDraftWorkbenchState/, 'advanced parameter save should apply the draft through the shared Workbench helper');
assert.match(workbenchSource, /studio-heat-advanced-overlay/, 'advanced parameters should use a centered overlay');
assert.match(workbenchSource, /studio-heat-advanced-window/, 'advanced parameters should render a centered main window');
assert.match(parameterDialogsSource, /studio-heat-advanced-risk-window/, 'first advanced open should render a higher risk confirmation window');
assert.match(workbenchSource, /const riskPending = !activeFile\.heatCapacityFreeFileAcknowledgements\.advancedParametersRisk;/, 'advanced parameter risk prompt should be pending only until the current file has acknowledged it');
assert.match(workbenchSource, /<WorkbenchHeatCapacityAdvancedRiskDialog[\s\S]*open=\{riskPending\}/, 'advanced parameter dialog should render the risk confirmation before the current file is acknowledged');
assert.match(freeParameterPanelModelSource, /riskTitle:\s*\{[\s\S]*'zh-CN':\s*'确认调整高级参数'/, 'advanced risk title should describe a confirmation step, not a later experiment-group side effect');
assert.match(freeParameterPanelModelSource, /riskBody:\s*\{[\s\S]*'zh-CN':\s*'高级参数会影响当前实验文件的模型判定、传感器读数和记录阈值。确认后，本实验文件后续打开高级参数不再重复提示。'/, 'advanced risk body should state current-file-first acknowledgement semantics');
assert.doesNotMatch(freeParameterPanelModelSource, /调整高级参数会改变后续实验组|後續實驗組|future groups/, 'advanced risk copy should not keep the old future-group wording');
assert.match(workbenchSource, /studio-heat-advanced-grid/, 'advanced parameter form should use a responsive grid');
assert.match(workbenchSource, /heatCapacityFreeAdvancedParameterGroups/, 'advanced parameter form should use an explicit ordered group definition');
assert.doesNotMatch(freeParameterPanelModelSource, /title:\s*\{\s*'zh-CN':\s*'压力信号标定'/, 'advanced parameter groups should not keep an empty pressure calibration group after pressure sensitivity moves to the basic panel');
assert.match(freeParameterPanelModelSource, /id:\s*'thermalExchange'[\s\S]*title:\s*\{\s*'zh-CN':\s*'热交换模型'/, 'advanced parameters should expose a semantic thermal-exchange group');
assert.match(freeParameterPanelModelSource, /id:\s*'nonIdealCorrection'[\s\S]*title:\s*\{\s*'zh-CN':\s*'非理想过程修正'/, 'advanced parameters should expose a semantic non-ideal correction group');
assert.match(freeParameterPanelModelSource, /id:\s*'recordCriteria'[\s\S]*title:\s*\{\s*'zh-CN':\s*'记录判定与安全阈值'/, 'advanced parameters should expose a semantic record-criteria group');
assert.doesNotMatch(freeParameterPanelModelSource, /title:\s*\{\s*'zh-CN':\s*'气体状态模型'|title:\s*\{\s*'zh-CN':\s*'热交换与泄漏修正'|title:\s*\{\s*'zh-CN':\s*'读数采集与记录判定'/, 'advanced parameter groups should remove old merged group titles after regrouping');
assert.match(workbenchSource, /studio-heat-advanced-groups[\s\S]*heatCapacityFreeAdvancedParameterGroups\.map[\s\S]*studio-heat-advanced-group[\s\S]*studio-heat-advanced-group-title[\s\S]*heatCapacityFreeAdvancedNumberParameters\.filter\(\(definition\) => definition\.group === group\.id\)/, 'advanced parameters should render one titled three-column grid per group');
assert.doesNotMatch(freeParameterPanelModelSource, /A类|B类|C类|D类|A 類|B 類|C 類|D 類|Class A|Class B|Class C|Class D/, 'advanced parameter group titles should not expose letter-class wording');
assert.doesNotMatch(`${workbenchSource}\n${freeParameterPanelModelSource}`, /advancedSubtitle|这些参数只影响之后开始的新实验组|這些參數只影響之後開始的新實驗組|These values affect only future experiment groups/, 'advanced parameter main window should not keep the redundant future-groups subtitle');
assert.match(workbenchSource, /heatCapacityFreeSharedText\.valueTooLarge/, 'Free Mode parameter validation should have a localized over-limit message');
assert.match(freeAdvancedNumberParametersSection, /id:\s*'gasWallConductanceWPerK'[\s\S]*?max:\s*5/, 'gas-wall conductance should expose the model upper limit in the UI');
assert.match(freeAdvancedNumberParametersSection, /id:\s*'wallAmbientConductanceWPerK'[\s\S]*?max:\s*5/, 'wall-ambient conductance should expose the model upper limit in the UI');
assert.match(freeAdvancedNumberParametersSection, /id:\s*'wallHeatCapacityJPerK'[\s\S]*?max:\s*5000/, 'wall heat capacity should expose the model upper limit in the UI');
assert.match(freeAdvancedNumberParametersSection, /id:\s*'leakageRatePerS'[\s\S]*?max:\s*0\.02/, 'leakage rate should expose the model upper limit in the UI');
assert.match(freeAdvancedNumberParametersSection, /id:\s*'sensorLagTimeS'[\s\S]*?min:\s*1\s*\/\s*60[\s\S]*?max:\s*100/, 'pressure-channel lag time should expose both effective runtime bounds');
assert.match(workbenchSource, /definition\.max \?\? null/, 'Free Mode validation should consume parameter-model upper bounds');
assert.match(workbenchSource, /aria-invalid=\{error \? true : undefined\}/, 'invalid Free Mode parameter inputs should expose their error state');
assert.match(styleSource, /\.studio-heat-free-param-row-error \.studio-heat-free-input-cell input\s*\{[\s\S]*?border-color:/, 'invalid Free Mode parameter inputs should render a red error border');
assert.match(styleSource, /\.studio-heat-advanced-grid \.studio-heat-free-input-cell\s*\{[\s\S]*?position:\s*relative;/, 'advanced parameter input cells should anchor their validation message without changing row alignment');
assert.match(styleSource, /\.studio-heat-advanced-grid \.studio-heat-free-inline-error\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?inline-size:\s*max-content;[\s\S]*?white-space:\s*nowrap;/, 'advanced parameter validation should stay on one floating line instead of expanding and clipping its row');
assert.match(styleSource, /\.studio-heat-advanced-grid-item:nth-child\(3n\) \.studio-heat-free-inline-error\s*\{[\s\S]*?inset-inline-end:\s*0;/, 'rightmost advanced parameter validation should stay inside the dialog edge');
assert.match(workbenchSource, /HEAT_CAPACITY_FREE_ABSOLUTE_PRESSURE_LIMIT_KPA/, 'Free Mode parameter UI should share the 300 kPa absolute pressure ceiling');
assert.match(workbenchSource, /setScanInputToast\(message\)/, 'Free Mode parameter over-limit validation should surface a visible toast-style message');
assert.match(workbenchSource, /setHeatCapacityFreeGasType[\s\S]*isHeatCapacityFreeGasTypeEditingAvailable/, 'gas type should be locked separately after a file has started a recorded experiment');
assert.doesNotMatch(workbenchSource, /definition\.id === 'gamma'[\s\S]*isHeatCapacityFreeGammaEditingAvailable/, 'Free Mode should no longer lock an editable gamma row because gamma is derived from gas type');
assert.match(workbenchSource, /resetHeatCapacityFreeParametersToDefaultWorkbenchState/, 'Free Mode restore-default button should reuse the shared state reset instead of duplicating default constants in the UI');
assert.match(workbenchSource, /openHeatCapacityRestoreDefaultConfirm[\s\S]*setHeatCapacityRestoreDefaultConfirmOpen\(true\)/, 'Free Mode restore-default button should open a confirmation dialog before resetting parameters');
assert.match(workbenchSource, /confirmHeatCapacityRestoreDefault[\s\S]*resetHeatCapacityFreeParametersToDefaultWorkbenchState/, 'Free Mode restore-default confirmation should be the only path that applies the reset');
assert.match(workbenchSource, /studio-heat-free-default-row[\s\S]*studio-heat-free-default-button[\s\S]*onClick=\{openHeatCapacityRestoreDefaultConfirm\}/, 'Free Mode parameter panel should render a restore-default button above the first basic parameter row');
assert.match(parameterDialogsSource, /role="alertdialog"[\s\S]*studio-heat-restore-default-confirm/, 'Free Mode restore-default confirmation should use the shared alert-dialog shell');
assert.match(workbenchSource, /<WorkbenchHeatCapacityRestoreDefaultDialog[\s\S]*onConfirm=\{confirmHeatCapacityRestoreDefault\}/, 'Free Mode restore-default confirmation should retain an explicit confirm action');
assert.match(freeParameterPanelModelSource, /restoreDefault:\s*\{[\s\S]*'zh-CN':\s*'恢复默认'/, 'restore-default parameter action should use the shared heat-capacity parameter copy');
assert.match(freeParameterPanelModelSource, /restoreDefaultTitle:\s*\{[\s\S]*restoreDefaultBody:[\s\S]*confirmRestoreDefault:/, 'restore-default confirmation should keep title, body, and confirm copy in the shared parameter copy');
assert.match(freeParameterPanelModelSource, /'zh-CN':\s*'这会把普通参数和高级参数全部恢复为默认值，当前手动调整会被覆盖。'/, 'restore-default confirmation should describe the reset in user-facing parameter terms');
assert.doesNotMatch(freeParameterPanelModelSource, /已暴露/, 'restore-default confirmation should not expose implementation vocabulary to users');
assert.match(styleSource, /\.studio-heat-free-default-row\s*\{[\s\S]*display:\s*flex;[\s\S]*justify-content:\s*flex-end;/, 'Free Mode restore-default action should sit on its own right-aligned row above atmospheric pressure');
assert.match(promptShellStyleSource, /\.prompt-dialog-overlay\.prompt-dialog-overlay\[data-prompt-shell-overlay='true'\][\s\S]*display:\s*grid;[\s\S]*place-items:\s*center;/, 'Free Mode restore-default confirmation should inherit shared viewport centering');
assert.match(styleSource, /\.studio-heat-free-params\.is-locked[\s\S]*cursor:\s*not-allowed/, 'locked Free Mode parameter panel should visibly use not-allowed interaction');
assert.match(styleSource, /\.studio-heat-free-param-row\s*\{[\s\S]*grid-template-columns:\s*minmax\(104px,\s*1fr\)\s*112px;[\s\S]*border-radius:\s*4px;/, 'Free Mode parameter rows should keep one left label tab stop and one fixed right input tab stop on the same line');
assert.match(styleSource, /\.studio-heat-free-param-label\s*\{[\s\S]*display:\s*grid;[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*48px\s*20px;[\s\S]*gap:\s*5px;/, 'Free Mode parameter labels should reserve enough symbol space before the help button on one line');
assert.match(workbenchSource, /parts\.length > 0\s*\?\s*'studio-heat-free-param-label-with-symbol'\s*:\s*'studio-heat-free-param-label-no-symbol'/, 'Free Mode parameter labels should explicitly separate symbol and no-symbol layouts');
assert.match(styleSource, /\.studio-heat-free-param-label-no-symbol\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*20px;/, 'Free Mode no-symbol parameter labels should restore the name width instead of reserving the wide symbol slot');
assert.match(styleSource, /\.studio-heat-free-param-label-no-symbol \.studio-param-symbol-empty\s*\{[\s\S]*display:\s*none;/, 'Free Mode no-symbol parameter labels should not let empty symbol nodes consume layout space');
assert.match(styleSource, /\.studio-heat-free-param-label \.studio-param-symbol\s*\{[\s\S]*inline-size:\s*48px;[\s\S]*justify-content:\s*flex-start;/, 'Free Mode parameter symbols should shift left inside a wider tab stop instead of overlapping the help button');
assert.match(workbenchSource, /className="studio-heat-free-input-shell"[\s\S]*<input[\s\S]*\{definition\.unit \? <span className="studio-heat-free-unit">\{definition\.unit\}<\/span> : null\}/, 'Free Mode numeric rows should render the unit inside the input shell');
assert.match(styleSource, /\.studio-heat-free-input-cell input\s*\{[\s\S]*text-align:\s*center;/, 'Free Mode basic and advanced numeric inputs should center their values');
assert.match(styleSource, /\.studio-heat-free-input-shell\s*\{[\s\S]*position:\s*relative;/, 'Free Mode input shell should provide the positioning context for the in-field unit');
assert.match(styleSource, /\.studio-heat-free-unit\s*\{[\s\S]*position:\s*absolute;[\s\S]*inset-inline-end:\s*10px;[\s\S]*text-align:\s*right;/, 'Free Mode numeric units should sit inside the input field and align to the right edge');
assert.doesNotMatch(styleSource, /@container\s*\(max-width:\s*320px\)[\s\S]*studio-heat-free-param-row/, 'Free Mode parameter rows should not keep the old narrow-sidebar stacked fallback');
assert.doesNotMatch(styleSource, /@media\s*\(max-width:\s*640px\)\s*\{\s*\.studio-heat-advanced-grid,\s*\.studio-heat-free-param-row/, 'Free Mode parameter rows should not be reintroduced into the generic small-screen stacked media rule');
assert.match(
  getRootCssBlock('.studio-file-tab-name'),
  /font-weight:\s*650;/,
  'top file-tab names should be slightly heavier than secondary tab metadata',
);
assert.match(
  getRootCssBlock('.studio-tree-row span:nth-child(2)'),
  /font-weight:\s*650;/,
  'left sidebar rows should share one clearer medium-bold label weight',
);
assert.match(
  getRootCssBlock('.studio-tree-row span:nth-child(2)'),
  /font-size:\s*12px;/,
  'left sidebar rows should share the same label size as the 3D preview row',
);
assert.match(
  getRootCssBlock('.studio-tree-row-child:not(.studio-heat-materials-group) > svg'),
  /stroke-width:\s*2\.25;/,
  'left sidebar direct panel icons should use a slightly stronger stroke',
);
assert.match(
  getRootCssBlock('.studio-tree-row span:nth-child(2)'),
  /font-weight:\s*650;/,
  'Heat Capacity materials parent row should inherit the shared sidebar label weight',
);
assert.match(
  getRootCssBlock('.studio-tree-row span:nth-child(2)'),
  /font-size:\s*12px;/,
  'Heat Capacity materials parent row should inherit the shared sidebar label size',
);
assert.match(
  getLastRootCssBlock('.studio-heat-materials-nav button'),
  /font-weight:\s*650;/,
  'Heat Capacity materials child buttons should match the direct panel row label weight',
);
assert.match(
  getLastRootCssBlock('.studio-heat-materials-nav button'),
  /font-size:\s*12px;/,
  'Heat Capacity materials child buttons should match the direct panel row label size',
);
assert.match(
  getRootCssBlock('.studio-heat-materials-nav button > svg'),
  /stroke-width:\s*2\.25;/,
  'Heat Capacity materials child icons should use the same stronger stroke as panel rows',
);
assert.match(styleSource, /\.studio-heat-advanced-groups\s*\{[\s\S]*display:\s*grid;[\s\S]*gap:\s*12px;[\s\S]*padding:\s*14px 18px 16px;/, 'advanced parameter groups should stack vertically with the modal body padding');
assert.match(styleSource, /\.studio-heat-advanced-group-title\s*\{[\s\S]*font-size:\s*12px;[\s\S]*font-weight:\s*700;/, 'advanced parameter group titles should use compact engineering-style headings');
assert.match(getCssBlock('.studio-heat-advanced-group-title::before'), /display:\s*none;/, 'advanced parameter group titles should not add decorative color bars');
assert.match(styleSource, /\.studio-heat-advanced-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/, 'advanced parameter form should use a three-column desktop grid');
assert.match(styleSource, /\.studio-heat-advanced-window\s*\{[\s\S]*overflow-x:\s*hidden/, 'advanced parameter window should never require horizontal scrolling');
assert.match(styleSource, /\.studio-heat-advanced-actions button,\s*\.studio-heat-advanced-risk-window button\s*\{[\s\S]*min-width:\s*86px;[\s\S]*justify-content:\s*center;/, 'advanced parameter confirm/cancel buttons should be wide enough for Chinese labels');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-advanced-window\s*\{[\s\S]*background:\s*#[0-9a-fA-F]{6};[\s\S]*color:\s*#[0-9a-fA-F]{6};[\s\S]*border-color:/, 'advanced parameter window should have a dedicated light-theme surface');
assert.match(styleSource, /\.studio-theme-light \.studio-heat-free-input-cell input\s*\{[\s\S]*background:\s*var\(--studio-surface\);[\s\S]*color:\s*var\(--studio-text\);[\s\S]*border-color:\s*var\(--studio-border\)/, 'Free Mode parameter inputs should consume the shared light-theme contrast tokens');
assert.match(
  styleSource,
  /\.studio-theme-light \.studio-heat-free-scheme-button\s*\{[\s\S]*background:\s*var\(--studio-success-soft\);[\s\S]*color:\s*var\(--studio-success\);[\s\S]*border-color:\s*color-mix/,
  'light theme real-simulation button should use the shared readable success surface',
);
assert.match(
  styleSource,
  /\.studio-theme-light \.studio-heat-free-scheme-button-active\s*\{[\s\S]*background:\s*var\(--studio-accent-soft\);[\s\S]*color:\s*var\(--studio-accent-strong\);[\s\S]*border-color:\s*var\(--studio-accent-border\)/,
  'light theme ideal-state button should use the shared high-contrast selected surface',
);
assert.match(
  styleSource,
  /\.studio-theme-light \.studio-heat-free-advanced-button\s*\{[\s\S]*background:\s*var\(--studio-accent-softer\);[\s\S]*color:\s*var\(--studio-accent-strong\);[\s\S]*border-color:\s*var\(--studio-accent-border\)/,
  'light theme advanced-parameter entry button should use the shared restrained accent surface',
);
assert.match(
  styleSource,
  /\.studio-theme-light \.studio-heat-free-advanced-button,\s*\.studio-theme-light \.studio-heat-advanced-actions button,\s*\.studio-theme-light \.studio-heat-advanced-risk-window button\s*\{[\s\S]*background:\s*var\(--studio-surface-2\);[\s\S]*color:\s*var\(--studio-muted\);[\s\S]*border-color:\s*var\(--studio-border\)/,
  'light theme advanced-parameter neutral buttons should consume shared light-theme tokens',
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
  `${leftPanelSource}\n${freeParameterPanelModelSource}\n${processReviewPanelSource}`,
  /'zh-CN'[\s\S]*'zh-TW'[\s\S]*en:/,
  'Heat Capacity user-facing copy touched since v4.1.17 should keep Simplified Chinese, Traditional Chinese, and English variants',
);
assert.match(
  stateTypesSource,
  /heatCapacityLessonIntroAutoShown:\s*boolean;/,
  'Heat Capacity files should store a durable intro-lesson acknowledgement flag instead of relying on transient UI state',
);
assert.match(
  heatCapacityFileFactorySource,
  /heatCapacityLessonIntroAutoShown:\s*false,/,
  'New Heat Capacity files should auto-show the intro lesson once before marking it acknowledged',
);
assert.match(
  heatCapacityPersistenceContractSource,
  /lessonIntroAutoShown:\s*boolean;/,
  'Heat Capacity persistence common data should include the intro-lesson acknowledgement flag',
);
assert.match(
  heatCapacityPersistenceSource,
  /lessonIntroAutoShown:\s*file\.heatCapacityLessonIntroAutoShown/,
  'Saving a Heat Capacity file should persist whether the intro lesson has already auto-shown',
);
assert.match(
  heatCapacityPersistenceSource,
  /heatCapacityLessonIntroAutoShown:\s*typeof common\.lessonIntroAutoShown === 'boolean'\s*\?\s*common\.lessonIntroAutoShown\s*:\s*true/,
  'Restoring old Heat Capacity files without the intro flag should treat the lesson as already shown',
);
assert.match(
  workbenchSource,
  /const HEAT_CAPACITY_LESSON_DIALOG_ANIMATION_MS = 180 as const;/,
  'Heat Capacity lesson animation duration should be a named constant for future timing adjustments',
);
assert.match(
  workbenchSource,
  /const heatCapacityLessonDialogActive = heatCapacityGuideLessonDialog !== null \|\| heatCapacityGuideLessonClosing;/,
  'Heat Capacity lesson overlays should have one shared active-state flag used by timers and visuals',
);
assert.match(
  workbenchSource,
  /heatCapacityLessonDialogActiveRef\.current = heatCapacityLessonDialogActive;/,
  'Asynchronous timers should read the current lesson active state from a ref',
);
assert.doesNotMatch(
  workbenchSource,
  /openHeatCapacityLessonIntro[\s\S]{0,180}heatCapacityMode !== 'guide'/,
  'The wrench lesson intro should not be limited to Guide Mode',
);
assert.doesNotMatch(
  workbenchSource,
  /heatCapacityActiveMode === 'guide'\s*\?\s*\(\s*<button[\s\S]{0,260}data-heat-capacity-guide-lesson-button/,
  'The wrench lesson button should render for every Heat Capacity mode, not only Guide Mode',
);
assert.match(
  workbenchSource,
  /activeFile\.kind !== 'heatCapacity' \|\| activeFile\.heatCapacityLessonIntroAutoShown[\s\S]*openHeatCapacityLessonIntro\(activeFile\.id\)[\s\S]*heatCapacityLessonIntroAutoShown:\s*true/,
  'New Heat Capacity files should auto-open the intro lesson once and immediately persist the acknowledgement',
);
assert.match(
  workbenchSource,
  /if \(!activeGuideLessonFile\) \{[\s\S]*?if \(heatCapacityGuideLessonDialog\?\.kind === 'step'\) \{[\s\S]*?clearHeatCapacityGuideLessonState\(\);[\s\S]*?\}[\s\S]*?return;/,
  'Leaving Guide mode should clear only step lessons and preserve the all-mode experiment intro',
);
assert.match(
  workbenchSource,
  /heatCapacityLessonPausedFileIdRef\.current === file\.id[\s\S]*return file;/,
  'The Heat Capacity stepping loop should not advance the active file while a lesson overlay is open',
);
assert.match(
  workbenchSource,
  /const resetHeatCapacityLessonResumeClock = \(fileId: string \| null = heatCapacityLessonPausedFileIdRef\.current\)[\s\S]*lastUpdateMs: file\.powerOn \? now : file\.lastUpdateMs/,
  'Closing a lesson overlay should reset the runtime clock so reading time is not counted as experiment time',
);
assert.match(
  workbenchSource,
  /const clearHeatCapacityGuideLessonState = \(\) => \{[\s\S]*resetHeatCapacityLessonResumeClock\(heatCapacityLessonPausedFileIdRef\.current\)[\s\S]*heatCapacityLessonPausedFileIdRef\.current = null;/,
  'Cancelling a lesson because the active Guide file changed should reset the paused file clock before clearing lesson refs',
);
assert.match(
  workbenchSource,
  /const openHeatCapacityLessonIntro = [\s\S]*heatCapacityLessonDialogActiveRef\.current = true;[\s\S]*setHeatCapacityGuideLessonDialog\(\{ kind: 'intro', pageIndex: 0 \}\)/,
  'Opening the reusable lesson intro should synchronously mark the lesson queue as blocked before React effects run',
);
assert.match(
  workbenchSource,
  /heatCapacityLessonPausedFileIdRef\.current = activeFile\.id;[\s\S]*heatCapacityLessonDialogActiveRef\.current = true;[\s\S]*setHeatCapacityGuideLessonDialog\(\{ kind: 'step', lessonId \}\)/,
  'Completed-step lesson explanations should synchronously block reminders before React effects run',
);
assert.match(
  workbenchSource,
  /const isHeatCapacityLessonQueueBlocked = \(\) => heatCapacityLessonDialogActiveRef\.current;/,
  'Guide reminder scheduling should share a named lesson-queue blocker',
);
assert.match(
  workbenchSource,
  /if \(isHeatCapacityLessonQueueBlocked\(\)\) return;/,
  'Strong reminder activation should be blocked while the lesson overlay is open',
);
assert.match(
  workbenchSource,
  /if \(heatCapacityLessonDialogActive\) return undefined;[\s\S]*GUIDE_HEAT_CAPACITY_STRONG_REMINDER_DELAY_MS/,
  'The ordinary Guide strong-reminder timer should not start underneath a lesson overlay',
);
assert.match(
  workbenchSource,
  /restoreHeatCapacityGuideUiCheckpoint[\s\S]*setGuideHeatCapacityStrongReminderActive\(guideCheckpoint\.strongReminder\.active\)[\s\S]*const lessonDialog = guideCheckpoint\.lessonDialog/,
  'Restored Guide strong reminders and lesson overlays should come from the same mode-owned checkpoint',
);
assert.match(
  workbenchSource,
  /isGuideHeatCapacityPauseStep\(activeHeatCapacityGuideStep\)[\s\S]*if \(heatCapacityLessonDialogActive\) return;[\s\S]*settingsLanguagePreference/,
  'Guided pause-step pulses should retry after lesson overlays close',
);
assert.match(
  workbenchSource,
  /useEffect\(\(\) => \(\) => \{[\s\S]*clearHeatCapacityGuideLessonTimers\(\);[\s\S]*guideHeatCapacityStrongReminderTimerRef\.current !== null[\s\S]*guideHeatCapacityPendingStrongReminderTimerRef\.current !== null/,
  'Unmount cleanup should cancel Guide timers without erasing restored semantic deadlines during Strict Mode replay',
);
assert.match(
  workbenchSource,
  /role="dialog"[\s\S]*aria-modal="true"[\s\S]*onKeyDown=\{handleHeatCapacityGuideLessonDialogKeyDown\}/,
  'The lesson dialog should expose modal semantics and keyboard handling',
);
assert.match(
  workbenchSource,
  /data-heat-capacity-guide-lesson-close="true"[\s\S]*onMouseDown=\{handleHeatCapacityGuideLessonCloseButtonMouseDown\}[\s\S]*onClick=\{handleHeatCapacityGuideLessonCloseButtonClick\}/,
  'The lesson close button should work for both pointer and keyboard activation',
);
assert.match(
  workbenchSource,
  /const heatCapacityHardSpherePaused = desktopExitQuiesced \|\|[\s\S]*heatCapacityRefreshRestoring[\s\S]*activeFile\.runState === 'paused'[\s\S]*heatCapacityLessonDialogActive[\s\S]*autoDemoPaused/,
  'Molecular visualization should pause during desktop exit, refresh hydration, explicit time-stop state, and whenever a Heat Capacity lesson overlay is open',
);
assert.match(
  workbenchSource,
  /const persistCurrentHeatCapacityRefreshSession = \(\) => \{\s*if \(heatCapacityRefreshRestorePendingRef\.current\) return;/,
  'A second refresh during scene loading must retain the original frozen checkpoint instead of advancing capturedAt',
);
assert.match(
  workbenchSource,
  /const \[heatCapacitySceneReadyFileId, setHeatCapacitySceneReadyFileId\] = useState<string \| null>\(null\);[\s\S]*if \(activeFileId !== restoreSession\.activeHeatCapacityFileId\) \{\s*cancelPendingRestore\(\);[\s\S]*if \(heatCapacitySceneReadyFileId !== restoreSession\.activeHeatCapacityFileId\) return;/,
  'Scene readiness must be tied to the exact restored file and cancel safely if the user switches files during GLB loading',
);
assert.match(
  workbenchSource,
  /const cancelPendingHeatCapacityRefreshRestore = \(\) => \{[\s\S]*heatCapacityPressureAlarmFileIdRef\.current === restoreSession\.activeHeatCapacityFileId[\s\S]*heatCapacityPressureAlarmDeadlineAtMsRef\.current = null;[\s\S]*setHeatCapacityPressureAlarmVisible\(false\);[\s\S]*clearHeatCapacityToastQueue\(\);[\s\S]*const cancelPendingRestore = \(\) => \{\s*cancelPendingHeatCapacityRefreshRestore\(\);/,
  'cancelling a load-time restore must discard uncommitted pressure alarm and toast state owned by the abandoned file',
);
assert.match(
  workbenchSource,
  /onSceneReady=\{\(\) => handleHeatCapacitySceneReady\(activeFile\.id\)\}/,
  'Each keyed Heat Capacity scene should report the file id through the ready-gated runtime recovery policy',
);
assert.match(
  indexedDbPersistenceSource,
  /if \(!persistenceReady\)[\s\S]*last successful workspace remains unchanged[\s\S]*transactionComplete\(transaction\)[\s\S]*await completed/,
  'Quota or initialization failure should leave the last atomic IndexedDB workspace untouched instead of writing an empty fallback',
);
assert.match(
  workbenchSource,
  /const pauseHeatCapacityPumpAnimation =[\s\S]*pausedReleaseRemainingMs[\s\S]*const resumeHeatCapacityPumpAnimation =[\s\S]*scheduleHeatCapacityPumpAnimation/,
  'Pump compression and release timers should freeze and resume with Demo, Guide, and lesson time-stop states',
);
assert.match(
  workbenchSource,
  /const baseTimer =[\s\S]*guideHeatCapacityStrongReminderDeadlineAtMsRef\.current[\s\S]*guideHeatCapacityRestoredStrongReminderTimerRef\.current\?\.remainingMs[\s\S]*baseStrongReminder: baseTimer/,
  'The shared Guide checkpoint capture should preserve the restored base strong-reminder deadline',
);
assert.match(
  workbenchSource,
  /baseStrongReminderRemainingMs: getHeatCapacityModeDeferredTimerRemainingMs\(\s*guideCapture\.baseStrongReminder\?\.timer/,
  'The full refresh layout should serialize the base reminder from the shared Guide checkpoint instead of a parallel timer path',
);
assert.match(
  workbenchSource,
  /initialCameraTransition=\{[\s\S]*initialUltraVisualState=\{[\s\S]*initialHardSphereVisualCheckpoint=\{[\s\S]*sceneRestoreAcknowledged=\{heatCapacitySceneRestoreAcknowledged\}/,
  'Workbench should restore all scene-internal transition checkpoints and explicitly acknowledge the committed parent state',
);
assert.match(
  heatCapacityRealtimeCopySource,
  /guideLessonIntroPages:\s*\[[\s\S]*重新查看刚刚的实验说明[\s\S]*重新查看剛剛的實驗說明[\s\S]*rewatch these experiment notes/,
  'The intro lesson should include a third localized page that tells users where to reopen it with the upper-right wrench',
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
