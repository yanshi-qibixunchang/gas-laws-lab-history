import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);
const workbenchStudioCopySource = readFileSync(
  new URL('../../src/features/workbench/workbenchStudioCopy.ts', import.meta.url),
  'utf8',
);
const topCommandsSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchTopCommands.tsx', import.meta.url),
  'utf8',
);
const emptyWorkspaceSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchEmptyWorkspace.tsx', import.meta.url),
  'utf8',
);
const placeholderStyles = readFileSync(
  new URL('../../src/features/pistonOscillation/PistonOscillationInstrumentScene.css', import.meta.url),
  'utf8',
);
const acquisitionStyles = readFileSync(
  new URL('../../src/features/pistonOscillation/PistonOscillationAcquisitionPanel.css', import.meta.url),
  'utf8',
);
const acquisitionSource = readFileSync(
  new URL('../../src/features/pistonOscillation/PistonOscillationAcquisitionPanel.tsx', import.meta.url),
  'utf8',
);
const parameterPanelSource = readFileSync(
  new URL('../../src/features/pistonOscillation/PistonOscillationParameterPanel.tsx', import.meta.url),
  'utf8',
);
const pistonOscillationCopySource = readFileSync(
  new URL('../../src/features/pistonOscillation/pistonOscillationCopy.ts', import.meta.url),
  'utf8',
);
const acquisitionBridgeSource = readFileSync(
  new URL('../../src/features/pistonOscillation/pistonOscillationGuideAcquisitionBridge.ts', import.meta.url),
  'utf8',
);
const guideWorkflowSource = readFileSync(
  new URL('../../src/domain/pistonOscillation/pistonOscillationGuideWorkflowModel.ts', import.meta.url),
  'utf8',
);
const guideScrewInteractionSource = readFileSync(
  new URL('../../src/features/pistonOscillation/pistonOscillationGuideScrewInteraction.ts', import.meta.url),
  'utf8',
);
const dataProcessingSource = readFileSync(
  new URL('../../src/features/pistonOscillation/PistonOscillationDataProcessingPanel.tsx', import.meta.url),
  'utf8',
);
const dataProcessingStyles = readFileSync(
  new URL('../../src/features/pistonOscillation/PistonOscillationDataProcessingPanel.css', import.meta.url),
  'utf8',
);
const instrumentSceneSource = readFileSync(
  new URL('../../src/features/pistonOscillation/PistonOscillationInstrumentScene.tsx', import.meta.url),
  'utf8',
);
const focusInteractionSource = readFileSync(
  new URL('../../src/features/pistonOscillation/PistonOscillationInteractionWorkspace.tsx', import.meta.url),
  'utf8',
);
const focusInteractionStyles = readFileSync(
  new URL('../../src/features/pistonOscillation/PistonOscillationInteractionWorkspace.css', import.meta.url),
  'utf8',
);
const workbenchStyles = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url),
  'utf8',
);

const sourceSlice = (start: string, end: string) => {
  const startIndex = workbenchSource.indexOf(start);
  const endIndex = workbenchSource.indexOf(end, startIndex);
  assert.notEqual(startIndex, -1, `missing source marker: ${start}`);
  assert.notEqual(endIndex, -1, `missing source marker: ${end}`);
  return workbenchSource.slice(startIndex, endIndex);
};

assert.match(
  topCommandsSource,
  /onCreateFile\('heatCapacity'\)[\s\S]*onCreateFile\('heatCapacityPistonOscillation'\)/,
);
assert.match(
  emptyWorkspaceSource,
  /data-workbench-create-experiment="heatCapacityPistonOscillation"[\s\S]*onCreateFile\('heatCapacityPistonOscillation'\)/,
);
assert.match(workbenchStudioCopySource, /heatCapacityStudy:\s*'空气热容比（绝热膨胀法）'/);
assert.match(workbenchStudioCopySource, /heatCapacityPistonOscillationStudy:\s*'空气热容比（活塞振动法）'/);
assert.match(
  workbenchSource,
  /const handlePistonOscillationFreeInstrumentSnapshot = \([\s\S]*if \(snapshot\.pistonPhase !== 'idle'\) return;[\s\S]*updateRuntimeFileById/,
  'transient piston animation frames must not rerender and persist the entire free-mode workbench',
);
assert.match(
  parameterPanelSource,
  /const parameters = useMemo\([\s\S]*getPistonOscillationFreeEffectiveParameters\(session\)[\s\S]*\[session\.experimentGroup, session\.parameterDraft\]/,
  'the Ideal parameter profile must keep a stable reference so draft synchronization effects cannot loop',
);

assert.match(
  workbenchSource,
  /const pistonOscillationPanels = useMemo\([\s\S]*createPistonOscillationPanels\([\s\S]*workbenchCopy,[\s\S]*pistonOscillationCopy,[\s\S]*heatCapacityRealtimeCopy/,
  'the piston experiment should keep its own panel adapter so Data processing can open independently of Heat panels',
);
assert.match(
  workbenchSource,
  /const isPistonOscillationUnavailableMaterialsPanelKey = \([\s\S]*file\.kind !== 'heatCapacityPistonOscillation'[\s\S]*isHeatCapacityPanelKey\(panel\)/,
);
assert.match(
  workbenchSource,
  /getPistonOscillationMaterialsPanelOrder\(file\)\.includes\(panel\)/,
  'Data processing availability should follow the currently active Free or Guide session without leaking stale data from the other mode',
);

const openPanelSource = sourceSlice(
  'const openPanel = (panel: WorkbenchPanelKey) => {',
  'const closePanel = (panel: WorkbenchPanelKey',
);
assert.ok(
  openPanelSource.indexOf('isPistonOscillationUnavailableMaterialsPanelKey(activeFile, panel)') <
    openPanelSource.indexOf('setSelectedPanel(panel)'),
  'unavailable piston materials panels must be intercepted before selection or persistence changes',
);
assert.match(
  openPanelSource,
  /if \(isPistonOscillationUnavailableMaterialsPanelKey\(activeFile, panel\)\) \{\s*return;\s*\}/,
  'hidden piston materials must return silently before creating undo or warning noise',
);

const sidebarRailSource = sourceSlice(
  'const openParameterSidebarFromRail = () => {',
  'const collapseHeatCapacityFreeParameterSidebarForExperimentAction',
);
assert.match(sidebarRailSource, /setParametersCollapsed\(false\)/);
assert.match(
  sidebarRailSource,
  /activeFile\.kind === 'heatCapacityPistonOscillation'[\s\S]*!activePistonOscillationParameterSidebarAvailable[\s\S]*getPistonOscillationParameterSidebarFreeOnlyMessage[\s\S]*return;/,
  'the Piston right rail must reject Demo and Guide while remaining reopenable in Free Mode',
);
assert.match(
  workbenchSource,
  /const activePistonOscillationParameterSidebarAvailable =[\s\S]*activePistonOscillationParameterMode === 'free'/,
  'only Piston Free Mode should make its parameter sidebar available',
);
assert.match(
  workbenchSource,
  /if \(!activePistonOscillationParameterSidebarAvailable\) \{\s*setParametersCollapsed\(true\);\s*\}/,
  'leaving Piston Free Mode should collapse the parameter sidebar immediately',
);
assert.match(workbenchSource, /const effectiveParametersCollapsed = parametersCollapsed;/);
assert.doesNotMatch(
  workbenchSource,
  /shouldCollapseWorkbenchFileSidebar/,
  'file activation must not keep a Piston-specific left-sidebar collapse rule',
);
assert.match(
  workbenchSource,
  /const selectFile = \(file: WorkbenchFileState\) => \{[\s\S]*setSelectedFileId\(file\.id\);[\s\S]*if \(file\.id === activeFileIdRef\.current\) return;[\s\S]*setLeftCollapsed\(false\);[\s\S]*setParametersCollapsed\(true\);/,
  'activating any file should present the left file tree and collapse the right sidebar',
);
assert.match(
  workbenchSource,
  /storedSplitRatio === WORKBENCH_HEAT_CAPACITY_SPLIT_DEFAULT_RATIO[\s\S]*defaults\.heatCapacityPistonOscillation\.liveWorkspaceSplitRatio[\s\S]*: storedSplitRatio/,
  'the former heat-capacity split should migrate to the piston-specific default',
);
assert.match(
  workbenchSource,
  /!isWorkbenchEmpty \? \([\s\S]*<aside[\s\S]*activeFile\.kind === 'heatCapacityPistonOscillation'[\s\S]*<PistonOscillationParameterPanel/,
  'Piston should use the same reopenable right sidebar shell with its dedicated parameter panel',
);
assert.doesNotMatch(
  workbenchSource,
  /activeFile\.kind === 'heatCapacityPistonOscillation'[\s\S]{0,240}pistonOscillationCopy\.unavailable\.rightSidebar/,
  'the implemented Piston parameter sidebar must not retain the old unavailable placeholder',
);
assert.doesNotMatch(
  parameterPanelSource,
  /装置固定参数（只读）|Fixed apparatus constants \(read only\)|renderApparatusConstant/,
  'the Piston advanced dialog should expose only editable parameters',
);
assert.match(
  parameterPanelSource,
  /freeMode \? \([\s\S]*data-piston-oscillation-scheme=\{session\.experimentGroup\.scheme\}[\s\S]*onExperimentSchemeChange[\s\S]*data-piston-oscillation-param-id="gasType"[\s\S]*onGasTypeChange/,
  'the Free-only parameter panel must expose persisted scheme and gas selectors',
);
assert.match(
  parameterPanelSource,
  /const idealReadonly = freeMode && session\.experimentGroup\.scheme === 'ideal';[\s\S]*disabled=\{physicsLocked\}/,
  'the Ideal preset must keep its physical and acquisition parameters read-only',
);
assert.match(
  parameterPanelSource,
  /session\.experimentGroup\.scheme === 'real'[\s\S]*gasMaterialSnapshot\.gasType === 'helium'[\s\S]*data-piston-oscillation-helium-profile-note="true"[\s\S]*heliumRealProfileNote/,
  'Real helium must disclose that its apparatus-specific preset is a software teaching candidate rather than a physical calibration',
);
assert.match(
  acquisitionSource,
  /if \(!freeExperimentRunnable\) \{[\s\S]*showFreeParameterFeedback\(copy\.experimentProfileUnavailable\);[\s\S]*return;[\s\S]*if \(freeSelected\) onFreeAcquisitionStarted\?\.\(\);/,
  'an unavailable scheme or gas profile must be stopped before formal acquisition starts',
);
assert.match(
  workbenchSource,
  /renderParameterHelpButton=\{\(parameterId, modelEffect\) => \([\s\S]*renderHeatCapacityParameterHelpButton/,
  'Piston parameters should reuse the established Heat Capacity help-button and popover implementation',
);
assert.match(
  parameterPanelSource,
  /<PromptDialogShell[\s\S]*variant="task"[\s\S]*studio-heat-advanced-window[\s\S]*<WorkbenchHeatCapacityAdvancedRiskDialog[\s\S]*open=\{riskPending\}/,
  'Piston advanced settings should reuse the established task window and first-open risk confirmation layer',
);
assert.match(
  parameterPanelSource,
  /document\.querySelector<HTMLElement>\('\.studio-workbench'\) \?\? document\.body[\s\S]*createPortal\([\s\S]*dialogPortalHost/,
  'Piston parameter dialogs should mount at the Workbench root so the sidebar cannot clip the established full-window UI',
);
assert.match(
  acquisitionSource,
  /value=\{demoFrame\?\.sampleRateInput\s*\?\?\s*\(guideSelected \? guideSession\.parameterDrafts\.sampleRateHz : sampleRateDraft\)\}/,
  'the Demo and Guide sample-rate field must remain sourced from its own teaching workflow',
);
assert.match(
  acquisitionSource,
  /value=\{demoFrame\?\.triggerInput\s*\?\?\s*\(guideSelected \? guideSession\.parameterDrafts\.triggerThresholdKpa : triggerDraft\)\}/,
  'the Demo and Guide trigger field must remain sourced from its own teaching workflow',
);

const windowMenuSource = sourceSlice(
  'const topMenuWindowPanels = availablePanels',
  'const activeLayoutDefaults',
);
assert.match(
  windowMenuSource,
  /!isHeatCapacityPanelKey\(panel\.key\)[\s\S]*activeExperimentMaterialsPanelKeys\.includes\(panel\.key\)/,
);
assert.match(
  workbenchSource,
  /getPistonOscillationMaterialsPanelOrder\(activeFile\)[\s\S]*materialsPanels\.length > 0[\s\S]*studio-heat-materials-group/,
  'the Piston materials group should only render when the current mode has a real, usable child panel',
);
assert.doesNotMatch(
  sourceSlice('const renderPistonOscillationPanelTree = () => {', 'const topMenuResultChildren'),
  /developmentBadge|data-development-unavailable|studio-panel-row-development/,
  'the Piston sidebar should not keep misleading development placeholders',
);

assert.match(
  workbenchSource,
  /<PistonOscillationInstrumentScene[\s\S]*?activePistonOscillationParameterSignature[\s\S]*?language=\{settingsLanguagePreference\}[\s\S]*?physicsConfig=\{activePistonOscillationPhysicsConfig\}[\s\S]*?thermalConfig=\{activePistonOscillationThermalConfig\}[\s\S]*?guideSessionRevision=\{[\s\S]*?activeFile\.pistonOscillationGuideSession\.startedAtMs \?\? 0[\s\S]*?\}[\s\S]*?overlayTopRight=\{pistonOscillationGuideStepPanel\}[\s\S]*?onReleaseEvent=\{\(event\) =>/,
  'the piston preview must apply the active parameter profile, reset Guide sessions explicitly, inject Guide into its top-right slot, and publish two-hand releases',
);
assert.match(
  workbenchSource,
  /const pistonOscillationLivePressureChannel = useMemo\([\s\S]*createPistonOscillationLivePressureChannel\([\s\S]*activePistonOscillationSensorConfig,[\s\S]*exactObservation:[\s\S]*activePistonOscillationEffectiveConfig\?\.exactSensorObservation[\s\S]*activeFile\.id,[\s\S]*activePistonOscillationEffectiveConfig\?\.exactSensorObservation,[\s\S]*activePistonOscillationSensorConfig,[\s\S]*onLivePhysicalStateChange=\{[\s\S]*pistonOscillationLivePressureChannel\.publishPhysicalState[\s\S]*<PistonOscillationAcquisitionPanel[\s\S]*livePressureChannel=\{pistonOscillationLivePressureChannel\}/,
  'one scheme-aware file-scoped observation channel must connect the physical scene to the acquisition graph without persisting pre-trigger samples',
);
assert.match(
  workbenchSource,
  /onPressStartEvent=\{\(event\) => \{[\s\S]*setPistonOscillationPressStartEventsByFileId[\s\S]*\[activeFile\.id\]: event[\s\S]*pressStartEvent=\{pistonOscillationPressStartEventsByFileId\[activeFile\.id\] \?\? null\}/,
  'the scene and acquisition panel must share later two-hand press-start events for one continuous Free record',
);
assert.match(
  workbenchSource,
  /onFreeAcquisitionStarted=\{\(\) => \{[\s\S]*type: 'observeOperation'[\s\S]*operation: 'startAcquisition'/,
  'Free acquisition start must reach the persisted irreversible-operation boundary',
);
assert.doesNotMatch(
  workbenchSource,
  /releaseControlExternallyHeld|onReleaseControlHoldChange|pistonOscillationReleaseControlHoldsByFileId/,
  'the acquisition lifecycle must not extend the scene motion lock',
);
assert.match(
  workbenchSource,
  /<PistonOscillationAcquisitionPanel[\s\S]*key=\{`\$\{activeFile\.id\}:\$\{[\s\S]*activePistonOscillationGuideSession\?\.startedAtMs \?\? 'standalone'[\s\S]*activePistonOscillationGuideSession\?\.measurementIndex \?\? 'free'[\s\S]*`\}/,
  'each guided measurement must mount an isolated acquisition state so a saved curve cannot block or appear in the next run',
);
assert.doesNotMatch(
  workbenchSource,
  /studio-piston-guide-overlay/,
  'Workbench must not mount a second Guide overlay outside the instrument scene',
);
assert.match(workbenchSource, /renderPistonOscillationModeControl/);
assert.match(workbenchSource, /data-piston-oscillation-mode-control="true"/);
assert.match(workbenchSource, /data-piston-oscillation-mode="guide"[\s\S]*onClick=\{startGuide\}/);
assert.match(workbenchSource, /data-piston-oscillation-guide-step-panel="true"/);
const pistonModeControlSource = sourceSlice(
  'const renderPistonOscillationModeControl = () => {',
  'const renderPistonOscillationGuideStepPanel = () => {',
);
assert.match(
  pistonModeControlSource,
  /const guideSessionSelected = activeFile\.pistonOscillationGuideSession\.status === 'active'[\s\S]*status === 'completed'[\s\S]*!activeFile\.pistonOscillationGuideSession\.completionExited[\s\S]*const guideCompleted = activeFile\.pistonOscillationGuideSession\.status === 'completed'/,
  'a completed Guide remains selected until the user explicitly exits it',
);
assert.match(
  pistonModeControlSource,
  /status === 'completed'[\s\S]*completionExited[\s\S]*type: 'reopenCompletedSession'[\s\S]*return;/,
  'selecting Guide again after a normal completed exit should reopen the saved result instead of starting a new run',
);
assert.doesNotMatch(
  pistonModeControlSource,
  /pause-guide|resume-guide|pauseSession|resumeSession|labels\.(?:pauseGuide|resumeGuide)/,
  'Guide should not expose Demo-style Pause or Resume controls',
);
assert.match(
  pistonModeControlSource,
  /data-piston-oscillation-mode-action="reset-guide"[\s\S]*<RotateCcw size=\{13\} strokeWidth=\{2\.7\} \/>[\s\S]*data-piston-oscillation-mode-action="exit-guide"[\s\S]*guideCompleted \? \([\s\S]*<LogOut size=\{13\} strokeWidth=\{2\.7\} \/>[\s\S]*<Square size=\{12\} strokeWidth=\{2\.8\} \/>/,
  'Guide completion should retain Reset and change Exit from the active stop glyph to LogOut',
);
assert.match(
  pistonModeControlSource,
  /const resetGuide = \(\) => \{[\s\S]*type: 'resetSession'/,
  'the Guide reset control should dispatch a fresh-session event',
);
assert.match(
  pistonModeControlSource,
  /const exitGuide = \(\) => \{[\s\S]*type: 'exitSession'[\s\S]*onClick=\{exitGuide\}/,
  'the Guide exit control should dispatch its workflow event',
);
assert.match(
  pistonModeControlSource,
  /const activateDemo = \(\) => \{[\s\S]*guideSessionSelected[\s\S]*type: 'exitSession'[\s\S]*pistonOscillationDemoSession: demoSession[\s\S]*setLeftCollapsed\(true\);[\s\S]*setParametersCollapsed\(true\);/,
  'confirmed Demo activation should clear an unfinished Guide and collapse both sidebars once',
);
assert.match(
  pistonModeControlSource,
  /const startDemo = \(\) => \{[\s\S]*if \(demoSelected\) return;[\s\S]*unfinishedGuide[\s\S]*requestPistonTeachingModeSwitch\(activateDemo\)/,
  'reselecting Demo must be inert while switching away from an unfinished Guide requires confirmation',
);
assert.match(
  pistonModeControlSource,
  /const pauseDemo = \(\) => \{[\s\S]*pausePistonOscillationDemoSession[\s\S]*const resumeDemo = \(\) => \{[\s\S]*resumePistonOscillationDemoSession[\s\S]*const stopDemo = \(\) => \{[\s\S]*createDefaultPistonOscillationDemoSession[\s\S]*setLeftCollapsed\(false\);[\s\S]*const exitDemo = \(\) => \{[\s\S]*setLeftCollapsed\(false\);/,
  'Demo must persist Pause/Resume and expose Stop while active plus Exit after natural completion',
);
assert.match(
  pistonModeControlSource,
  /data-piston-oscillation-mode-action=\{demoPaused \? 'resume-demo' : 'pause-demo'\}[\s\S]*data-piston-oscillation-mode-action="stop-demo"[\s\S]*demoCompleted \? \([\s\S]*data-piston-oscillation-mode-action="exit-demo"/,
);
assert.match(
  pistonModeControlSource,
  /const startGuide = \(\) => \{[\s\S]*if \(guideSelected\) return;[\s\S]*demoRunning \|\| demoPaused[\s\S]*requestPistonTeachingModeSwitch\(activateGuide\)/,
  'reselecting Guide must be inert while switching away from an unfinished Demo requires confirmation',
);

const pistonGuidePanelSource = sourceSlice(
  'const renderPistonOscillationGuideStepPanel = () => {',
  'const pistonOscillationGuideStepPanel = renderPistonOscillationGuideStepPanel();',
);
assert.match(
  pistonGuidePanelSource,
  /\{ id: 'firstHeightAdjustment-1', steps: \['firstHeightAdjustment'\],[\s\S]*adjustHeightTitle\(PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM\[0\]\)[\s\S]*adjustHeightDetail\(PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM\[0\]\)/,
  'entering piston focus and aligning the first target height must be one real operation step',
);
assert.doesNotMatch(
  pistonGuidePanelSource,
  /steps:\s*\['enterPistonFocus'\]/,
  'entering the focus camera must not consume an independent checklist step',
);
assert.match(
  pistonGuidePanelSource,
  /const guidePages:[\s\S]*firstHeightAdjustment-1[\s\S]*createFollowingMeasurementPage\(1\)[\s\S]*createFollowingMeasurementPage\(2\)/,
  'the Guide should render one page per 80, 70, and 60 mm measurement',
);
assert.doesNotMatch(
  pistonGuidePanelSource,
  /completed-3|steps:\s*\['completed'\]/,
  'Guide completion is a terminal state, not a standalone visible checklist step',
);
assert.match(
  pistonGuidePanelSource,
  /const guideCompleted = guideSession\.status === 'completed'[\s\S]*currentPage\.length - 1[\s\S]*\(guideCompleted \|\| index < currentLocalStepIndex\)[\s\S]*\? 'done'/,
  'after the third save, the final real row and every preceding row should render as done',
);
const followingPageFactoryStart = pistonGuidePanelSource.indexOf(
  'const createFollowingMeasurementPage =',
);
const guidePagesStart = pistonGuidePanelSource.indexOf(
  'const guidePages:',
  followingPageFactoryStart,
);
assert.ok(followingPageFactoryStart >= 0 && guidePagesStart > followingPageFactoryStart);
const followingPageFactorySource = pistonGuidePanelSource.slice(
  followingPageFactoryStart,
  guidePagesStart,
);
assert.doesNotMatch(
  followingPageFactorySource,
  /steps:\s*\['crossRunStabilizing'\]/,
  'legacy cross-Run stabilization must not return as a standalone row at the start of the next Run',
);
const canonicalGuideStepTypeSource = guideWorkflowSource.slice(
  guideWorkflowSource.indexOf('export type PistonOscillationGuideStep ='),
  guideWorkflowSource.indexOf('export type PistonOscillationGuideParameterField ='),
);
assert.doesNotMatch(
  canonicalGuideStepTypeSource,
  /baselineStabilizing|crossRunStabilizing/,
  'internal baseline states must not remain canonical Guide steps',
);
assert.match(
  guideWorkflowSource,
  /const normalizedStep = value\.step === 'baselineStabilizing'[\s\S]*\? 'acquisitionReady' as const[\s\S]*value\.step === 'crossRunStabilizing'[\s\S]*\? 'crossRunDisconnect' as const/,
  'persisted legacy baseline steps should migrate directly onto their current visible operation steps',
);
assert.match(
  workbenchSource,
  /setPistonOscillationGuidePistonStable\(snapshot\.pistonPhase === 'idle'\)[\s\S]*<PistonOscillationAcquisitionPanel[\s\S]*guidePauseReady=\{pistonOscillationGuidePistonStable\}/,
  'Pause must remain locked until the physical piston has settled',
);
assert.match(
  `${acquisitionBridgeSource}\n${workbenchSource}`,
  /case 'restoreInterruptedAcquisition':[\s\S]*type: 'discardAcquisitionAttempt'[\s\S]*event\.type === 'restoreInterruptedAcquisition'[\s\S]*setPistonOscillationGuideStrongReminderActive\(false\)[\s\S]*pistonOscillationGuideStrongReminderTimerRef\.current = null/,
  'refresh recovery must realign the workflow and clear a stale blocking reminder',
);
const crossRunPhysicalOrder = [
  'crossRunDisconnect',
  'nextHeightAdjustment',
] as const;
let previousCrossRunStepIndex = -1;
for (const step of crossRunPhysicalOrder) {
  const stepIndex = followingPageFactorySource.indexOf(`steps: ['${step}']`);
  assert.ok(
    stepIndex > previousCrossRunStepIndex,
    `cross-Run Guide step ${step} should follow the fixed physical order`,
  );
  previousCrossRunStepIndex = stepIndex;
}
assert.doesNotMatch(
  followingPageFactorySource,
  /crossRunPlatformSupport/,
  'the cross-Run checklist must not expose a transient platform-support row',
);
assert.match(
  followingPageFactorySource,
  /targetHeightMm = PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM\[measurementIndex\][\s\S]*adjustHeightTitle\(targetHeightMm\)[\s\S]*\.\.\.createAcquisitionSteps\(measurementNumber\)/,
  'each following page should use its own target height before repeating acquisition',
);
assert.match(
  pistonGuidePanelSource,
  /const currentPageIndex = guideSession\.status === 'completed'[\s\S]*\? 2[\s\S]*: guideSession\.measurementIndex/,
  'the visible page should follow the measurement index and stay on page three after completion',
);
assert.match(
  pistonGuidePanelSource,
  /className="studio-piston-guide-page-track"[\s\S]*transform: `translate3d\(-\$\{currentPageIndex \* 100\}%, 0, 0\)`[\s\S]*guidePages\.map\(\(page, pageIndex\)[\s\S]*\{\[0, 1, 2\]\.map\(\(pageIndex\)/,
  'the three measurement pages and their three dots should share one horizontal translate3d track',
);
assert.match(
  pistonGuidePanelSource,
  /const currentPageViewedIndex = Math\.max\([\s\S]*pistonOscillationGuideChecklistViewedIndex[\s\S]*const currentStepNumber = currentPageViewedIndex \+ 1;[\s\S]*const totalStepCount = currentPage\.length;[\s\S]*\{currentStepNumber\} \/ \{totalStepCount\}/,
  'each measurement page should restart its own local counter while reflecting the wheel-centered row',
);
assert.doesNotMatch(
  pistonGuidePanelSource,
  /completedPageStepCount|visibleSteps|visibleStartIndex/,
  'the checklist should not merge page counts or reduce a page to a two-row window',
);
assert.match(
  pistonGuidePanelSource,
  /guidePages\.map\(\(page, pageIndex\)[\s\S]*className="studio-heat-guide-step-list"[\s\S]*pageIndex === currentPageIndex[\s\S]*handlePistonOscillationGuideChecklistWheel[\s\S]*studio-heat-guide-step-fade-top[\s\S]*studio-heat-guide-step-center-rail[\s\S]*studio-heat-guide-step-track studio-heat-guide-step-track-snapping[\s\S]*page\.map\(\(step, index\)[\s\S]*studio-heat-guide-step-row-centered[\s\S]*studio-heat-guide-step-fade-bottom/,
  'every horizontal measurement page should reuse the Heat wheel-picker DOM and activate wheel input only on the visible page',
);
assert.match(
  workbenchSource,
  /const HEAT_CAPACITY_GUIDE_CHECKLIST_ROW_HEIGHT_PX = 48;[\s\S]*const HEAT_CAPACITY_GUIDE_CHECKLIST_SNAP_MS = 120;[\s\S]*const HEAT_CAPACITY_GUIDE_CHECKLIST_RETURN_MS = 5000;[\s\S]*const HEAT_CAPACITY_GUIDE_CHECKLIST_WHEEL_SCALE = 0\.72;[\s\S]*const PISTON_OSCILLATION_GUIDE_CHECKLIST_ROW_HEIGHT_PX = 64;/,
  'the piston picker should keep Heat wheel timing while reserving a fixed 64 px row for three-line experiment guidance',
);
assert.match(
  workbenchSource,
  /const processPistonOscillationGuideChecklistWheelFrame = \(\) => \{[\s\S]*pendingDelta \* HEAT_CAPACITY_GUIDE_CHECKLIST_WHEEL_SCALE[\s\S]*const rowHeight = PISTON_OSCILLATION_GUIDE_CHECKLIST_ROW_HEIGHT_PX;[\s\S]*HEAT_CAPACITY_GUIDE_CHECKLIST_MAX_FRAME_STEPS[\s\S]*HEAT_CAPACITY_GUIDE_CHECKLIST_SNAP_MS[\s\S]*returnPistonOscillationGuideChecklistToCurrentStep\(\);[\s\S]*HEAT_CAPACITY_GUIDE_CHECKLIST_RETURN_MS/,
  'the piston picker should reuse Heat wheel scaling, bounded row commits, snap timing, and automatic return',
);
assert.match(
  workbenchSource,
  /useLayoutEffect\(\(\) => \{[\s\S]*pistonOscillationGuideChecklistTrackRef\.current[\s\S]*track\.dataset\.pistonGuideCurrentIndex[\s\S]*track\.dataset\.pistonGuidePageLength[\s\S]*applyPistonOscillationGuideChecklistView\(currentIndex, 0, true\);[\s\S]*activePistonOscillationGuideSession\?\.measurementIndex[\s\S]*activePistonOscillationGuideSession\?\.step/,
  'page and workflow changes should reset the wheel picker to the real current step',
);
assert.match(
  workbenchStyles,
  /\.studio-piston-guide-page-track\s*\{[\s\S]*transition:\s*transform 280ms cubic-bezier\(0\.2, 0, 0, 1\);/,
  'measurement page changes should use the reviewed 280 ms horizontal slide',
);
assert.match(
  workbenchStyles,
  /\.studio-heat-guide-step-panel\.studio-piston-guide-step-panel\s*\{[\s\S]*grid-template-rows:\s*auto minmax\(0, 1fr\) 14px;[\s\S]*height:\s*220px;/,
  'the checklist should reserve only a compact dot rail and leave room for the view-reset control above the focus panel',
);
assert.match(
  workbenchSource,
  /const PISTON_OSCILLATION_GUIDE_CHECKLIST_CENTER_OFFSET_PX = 52;/,
  'the shorter piston picker should keep its current row vertically centered',
);
assert.match(
  workbenchStyles,
  /\.studio-piston-guide-page \.studio-heat-guide-step-center-rail\s*\{[\s\S]*top:\s*52px;[\s\S]*height:\s*64px;/,
  'the visual center rail should use the same compact symmetric offset as the picker motion',
);
assert.match(
  workbenchStyles,
  /\.studio-piston-guide-page \.studio-heat-guide-step-row\s*\{[\s\S]*height:\s*64px;[\s\S]*\.studio-piston-guide-page \.studio-heat-guide-step-row:not\(\.studio-heat-guide-step-row-centered\)[\s\S]*-webkit-line-clamp:\s*1;[\s\S]*\.studio-piston-guide-page \.studio-heat-guide-step-row-centered[\s\S]*-webkit-line-clamp:\s*3;/,
  'the centered piston instruction should show three complete lines while adjacent rows stay symmetrically compact',
);
assert.match(
  workbenchStyles,
  /\.studio-heat-guide-step-panel\.studio-piston-guide-step-panel\s*\{[\s\S]*box-sizing:\s*border-box;[\s\S]*height:\s*220px;[\s\S]*min-height:\s*220px;[\s\S]*max-height:\s*220px;/,
  'changing row visibility must never resize the fixed piston Guide panel shell',
);
assert.match(
  workbenchStyles,
  /\.studio-piston-guide-page\s*\{[\s\S]*overflow:\s*hidden;[\s\S]*\.studio-piston-guide-page \.studio-heat-guide-step-list\s*\{[\s\S]*height:\s*100%;/,
  'each page should clip the translated Heat picker while giving its picker the full page height',
);
assert.match(
  workbenchStyles,
  /\.studio-heat-guide-step-row\s*\{[\s\S]*height:\s*48px;[\s\S]*opacity:\s*max\(0\.08, calc\(1 - var\(--studio-heat-guide-step-distance\) \* 0\.44\)\);[\s\S]*transform:\s*scale\(calc\(1 - min\(var\(--studio-heat-guide-step-distance\), 2\) \* 0\.055\)\);[\s\S]*\.studio-heat-guide-step-row-centered\s*\{[\s\S]*opacity:\s*1;[\s\S]*transform:\s*scale\(1\.02\);/,
  'the shared picker should fade and shrink distant 48 px rows while magnifying the centered row',
);
assert.match(
  workbenchStyles,
  /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.studio-piston-guide-page-track,[\s\S]*transition-duration:\s*80ms;/,
  'the page track must honor the shared reduced-motion timing',
);

assert.match(
  workbenchSource,
  /PISTON_OSCILLATION_GUIDE_HEIGHT_CONFIRM_PULSE_DELAY_MS = 3000[\s\S]*pistonGuideHeightConfirmationReady[\s\S]*\? PISTON_OSCILLATION_GUIDE_HEIGHT_CONFIRM_PULSE_DELAY_MS[\s\S]*: GUIDE_HEAT_CAPACITY_GUIDANCE_PULSE_INTERVAL_MS[\s\S]*pistonGuidePulseWithinCycleMs < 2_200/,
  'the ready height-confirmation button should begin breathing after three seconds while other Guide targets retain the shared cadence',
);
assert.match(
  workbenchSource,
  /PISTON_OSCILLATION_GUIDE_CLOCK_INTERVAL_MS = 250[\s\S]*activePistonOscillationGuideSession\?\.status !== 'active'[\s\S]*setPistonOscillationGuidePulseElapsedMs\(\(elapsedMs\) => elapsedMs \+ deltaMs\)[\s\S]*PISTON_OSCILLATION_GUIDE_CLOCK_INTERVAL_MS/,
  'Guide pause should freeze its reduced-frequency scheduling clock instead of repainting the full Workbench at animation frame cadence',
);
assert.match(
  workbenchSource,
  /PISTON_OSCILLATION_GUIDE_STRONG_REMINDER_DELAY_MS[\s\S]*pistonOscillationGuidePulseElapsedMs[\s\S]*data-piston-guide-strong-mask-blocking="true"/,
  'the Guide should add its ten-second strong reminder and block interactions outside the cutout',
);
assert.match(
  workbenchSource,
  /createPistonOscillationDemoPlaybackChannel\(\)[\s\S]*pistonOscillationDemoPlaybackChannel\.publish\([\s\S]*setPistonOscillationDemoPlayback\([\s\S]*demoPlaybackChannel=\{[\s\S]*activePistonOscillationDemoPlaybackPhase === 'idle'[\s\S]*pistonOscillationDemoPlaybackChannel[\s\S]*demoPlaybackFileId=\{activeFile\.id\}/,
  'Demo playback should publish high-frequency frames through its focused channel while Workbench owns only lifecycle state',
);
assert.doesNotMatch(
  workbenchSource,
  /activePistonOscillationDemoFrame|getPistonOscillationDemoFrame\(/,
  'the full Workbench must not derive every 50 ms demonstration frame',
);
assert.match(
  workbenchSource,
  /activePistonOscillationDemoPlaybackPhase[\s\S]*pistonOscillationDemoPlayback\.fileId === activeFile\.id[\s\S]*demoPlaybackPhase=\{activePistonOscillationDemoPlaybackPhase\}/,
  'demo completion and termination feedback should stay scoped to the piston file that owns the playback',
);
assert.match(workbenchSource, /PISTON_OSCILLATION_DEMO_DURATION_MS/);
assert.match(
  workbenchSource,
  /data-piston-oscillation-realtime=\{[\s\S]*activePistonOscillationProcessReview[\s\S]*\? 'process-review'[\s\S]*activePistonOscillationDataProcessing[\s\S]*\? 'data-processing'[\s\S]*: 'acquisition'/,
);
assert.match(
  workbenchSource,
  /activePistonOscillationProcessReview \? \([\s\S]*<PistonOscillationProcessReviewPanel[\s\S]*activePistonOscillationDataProcessing \? \([\s\S]*<PistonOscillationDataProcessingPanel[\s\S]*onProcessingEvent=\{handlePistonOscillationProcessingEvent\}[\s\S]*\) : \([\s\S]*<PistonOscillationAcquisitionPanel/,
  'the realtime panel should host process review, data processing, or acquisition without opening a second workspace implementation',
);
assert.match(
  pistonOscillationCopySource,
  /title: '过程回顾'[\s\S]*真实实验显示评分，理想实验不评分[\s\S]*navigationItem: '过程回顾'/,
  'the shared review entry must not promise a score for Ideal experiment files',
);
assert.match(
  workbenchSource,
  /experimentGroup\.scheme === 'ideal'[\s\S]*不评分的过程证据[\s\S]*score summary as PDF/,
  'report export copy must distinguish unscored Ideal evidence from Real score summaries',
);
assert.match(
  workbenchSource,
  /activePistonOscillationFreeSession\.dataProcessing\.status !== 'completed'[\s\S]*pistonOscillationCompletedDataProcessingReview/,
  'completed Free processing should leave the instrument workspace unless the user explicitly opens review',
);
assert.match(
  workbenchSource,
  /studio-live-workspace-piston-processing[\s\S]*disabled=\{activePistonOscillationExpandedRealtime\}/,
  'processing and process review should collapse the instrument pane and lock the live split resizer',
);
assert.match(dataProcessingSource, /onPointerDown=\{handlePointerDown\}[\s\S]*onPointerUp=\{finishPointerInteraction\}/);
assert.match(dataProcessingSource, /data-piston-guide-target="period-chart"/);
assert.match(dataProcessingSource, /data-piston-guide-target="period-tool"/);
assert.match(dataProcessingSource, /data-piston-guide-target="period-endpoints"/);
assert.match(dataProcessingSource, /data-piston-guide-target="period-answer"/);
assert.match(dataProcessingSource, /data-piston-guide-target="period-next"/);
assert.match(dataProcessingStyles, /\.piston-period-selection-band/);
assert.match(dataProcessingStyles, /\.piston-period-extremum-ring/);
assert.match(
  dataProcessingSource,
  /selectionToolPulse \? 'is-guide-highlighted' : ''/,
  'the hand/crosshair mode switch should receive the approved acquisition control pulse',
);
assert.match(
  workbenchSource,
  /periodTool: '\[data-piston-guide-target="period-tool"\]'[\s\S]*targetId === 'periodTool'[\s\S]*selectionToolReminder/,
  'the strong reminder must cut out the mode switch and explain its localized interaction',
);
assert.match(
  workbenchSource,
  /openPistonOscillationDataProcessingReview[\s\S]*setPistonOscillationDataProcessingReviewOpen\(true\)[\s\S]*panel\.key === 'heatCapacityGuide'[\s\S]*openPistonOscillationDataProcessingReview\(\)/,
  'double-clicking Data processing after completion must reopen the B-stage review before C/D calculations',
);
assert.match(
  workbenchSource,
  /const dataProcessing = activeFile\.pistonOscillationFreeSession\.status === 'active'[\s\S]*if \(!dataProcessing\) return;[\s\S]*setPistonOscillationProcessingSuppressedFileId\(null\)/,
  'the Data processing double-click entry should reopen saved Free or Guide processing after recovery',
);
assert.match(
  dataProcessingSource,
  /reviewMode[\s\S]*setReviewRunIndex\(index\)/,
  'the read-only B review must navigate saved Runs',
);
assert.match(
  dataProcessingSource,
  /reviewMode \? \([\s\S]*piston-processing-navigation is-review-navigation[\s\S]*copy\.viewFitAndCalculation[\s\S]*copy\.reviewAttemptSummary/,
  'the review action bar must appear above the saved validation summary and expose C/D review without scrolling to the bottom',
);
assert.match(
  workbenchSource,
  /closingKind === 'completion'[\s\S]*type: 'acknowledgeCompletion'[\s\S]*setLeftCollapsed\(false\)[\s\S]*showPistonOscillationGuideCompletionToast/,
  'dismissing the final explanation must expand the file sidebar as the completion toast begins',
);
assert.match(
  workbenchSource,
  /<PistonOscillationAcquisitionPanel[\s\S]*releaseEvent=\{pistonOscillationReleaseEventsByFileId\[activeFile\.id\] \?\? null\}[\s\S]*pressStartEvent=\{pistonOscillationPressStartEventsByFileId\[activeFile\.id\] \?\? null\}/,
  'the realtime area should consume release and later press events from the formal 3D interaction scene',
);
assert.doesNotMatch(
  pistonGuidePanelSource,
  /id: `baselineStabilizing-|title: pistonOscillationCopy\.guide\.baseline/,
  'baseline stabilization is an internal acquisition guard, not a visible checklist row',
);
assert.match(
  pistonGuidePanelSource,
  /id: `acquisitionReady-\$\{measurementNumber\}`[\s\S]*steps: \['acquisitionReady'\][\s\S]*startAcquisitionTitle[\s\S]*startAcquisitionDetail/,
  'the acquisition row should map directly to the canonical Start action without exposing an internal baseline state',
);
assert.match(
  workbenchSource,
  /<PistonOscillationInstrumentScene[\s\S]*guideTimeFrozen=\{[\s\S]*activePistonOscillationGuideTimeFrozen[\s\S]*pistonOscillationGuideLessonDialog !== null[\s\S]*guideVisualCue=\{pistonGuideVisualCue\}[\s\S]*onGuideInstrumentSnapshotChange=\{[\s\S]*handlePistonOscillationGuideInstrumentSnapshot/,
  'the formal scene should freeze only for instructional recovery and continue to receive semantic Guide cues and snapshots',
);
assert.doesNotMatch(
  workbenchSource,
  /guidePulseElapsedSeconds=\{pistonGuidePulseWithinCycleMs \/ 1_000\}/,
  'Guide shell animation should advance inside the demand-rendered scene rather than forcing full Workbench rerenders',
);
assert.match(
  workbenchSource,
  /activePistonOscillationGuideSnapTargetHeightMm =[\s\S]*status === 'active'[\s\S]*firstHeightAdjustment[\s\S]*nextHeightAdjustment[\s\S]*PISTON_OSCILLATION_GUIDE_TARGET_HEIGHTS_MM[\s\S]*guideSnapTargetHeightMm=\{activePistonOscillationGuideSnapTargetHeightMm\}/,
  'only active Guide height steps should pass an 80, 70, or 60 mm magnetic target into the instrument',
);
assert.match(
  instrumentSceneSource,
  /guidePaused\?: boolean;[\s\S]*guideTimeFrozen\?: boolean;[\s\S]*guideScrewInteractionMode\?: PistonOscillationGuideScrewInteractionMode \| null;[\s\S]*guideSnapTargetHeightMm\?: number \| null;[\s\S]*guideInitialInstrumentState\?: PistonOscillationGuideInstrumentRestoreState \| null;[\s\S]*guideHeightReset\?: PistonOscillationGuideHeightResetRequest \| null;[\s\S]*onGuideScrewDirectionFeedback\?:[\s\S]*onGuideSupportLoss\?:[\s\S]*<PistonOscillationInteractionWorkspace[\s\S]*guidePaused=\{guidePaused\}[\s\S]*guideTimeFrozen=\{guideTimeFrozen\}[\s\S]*guideScrewInteractionMode=\{guideScrewInteractionMode\}[\s\S]*guideSnapTargetHeightMm=\{guideSnapTargetHeightMm\}[\s\S]*guideInitialInstrumentState=\{guideInitialInstrumentState\}[\s\S]*guideHeightReset=\{guideHeightReset\}[\s\S]*onGuideScrewDirectionFeedback=\{onGuideScrewDirectionFeedback\}[\s\S]*onGuideSupportLoss=\{onGuideSupportLoss\}[\s\S]*onGuideHeightResetComplete=\{onGuideHeightResetComplete\}/,
  'the scene boundary should forward time freeze, screw guidance, and the exclusive height-reset lifecycle into the shared 3D workspace',
);
assert.match(
  workbenchSource,
  /activePistonOscillationGuideInstrumentRestoreState =[\s\S]*getPistonOscillationGuideInstrumentRestoreState\([\s\S]*activePistonOscillationGuideSession[\s\S]*guideInitialInstrumentState=\{[\s\S]*activePistonOscillationGuideInstrumentRestoreState/,
  'Workbench should restore the physical Guide checkpoint together with the persisted checklist after remount or refresh',
);
assert.match(
  focusInteractionSource,
  /onGuideInstrumentSnapshotChangeRef\.current\?\.\(\{[\s\S]*focusMode: mode,[\s\S]*hoseState,[\s\S]*equilibriumHeightMm: pistonEquilibriumHeightMm,[\s\S]*lockingScrewProgress,[\s\S]*lockingScrewState: lockingScrewClampState,[\s\S]*heightAdjustmentStage,[\s\S]*spaceHeld,[\s\S]*mouseHeld,[\s\S]*pistonPhase/,
  'the 3D workspace snapshot should include the height-reading stage and every physical state needed by Guide',
);
assert.match(
  focusInteractionSource,
  /effectiveMainFocusTarget[\s\S]*guideFocusTarget[\s\S]*effectiveMirrorFocusTarget[\s\S]*guidePulseElapsedSeconds/,
  'Guide geometry cues and their elapsed pulse time should share the reviewed exact-model shells',
);
assert.match(
  workbenchSource,
  /const previousSnapshot = pistonOscillationGuideInstrumentSnapshotRef\.current;[\s\S]*previousHeightAdjustmentStage = previousSnapshot\?\.heightAdjustmentStage[\s\S]*previousHeightAdjustmentStage !== snapshot\.heightAdjustmentStage[\s\S]*setPistonOscillationGuideHeightAdjustmentStage\(snapshot\.heightAdjustmentStage\)/,
  'Workbench should retain the live height-adjustment stage published by the instrument snapshot',
);
assert.match(
  workbenchSource,
  /pistonGuideStep === 'firstHeightAdjustment'[\s\S]*pistonGuideStep === 'nextHeightAdjustment'[\s\S]*pistonGuideHeightConfirmationReady \? 'heightStageAction' : 'platform'[\s\S]*pistonGuideStep === 'screwLock'[\s\S]*\? 'screw'[\s\S]*pistonGuideStep === 'screwLoosen'[\s\S]*\? 'screw'/,
  'height steps should switch from platform to confirmation, while both screw operations keep the screw cue continuously active',
);
assert.match(
  guideScrewInteractionSource,
  /case 'acquisitionReady':[\s\S]*case 'awaitingSaveOrRedo':[\s\S]*return 'protectLoose';[\s\S]*case 'screwLock':[\s\S]*return 'tighten';[\s\S]*case 'hoseReconnect':[\s\S]*return 'protectLocked';[\s\S]*case 'screwLoosen':[\s\S]*return 'loosen'/,
  'each canonical Guide phase should select the correct active or protected screw mode',
);
assert.match(
  workbenchSource,
  /const pistonGuideScrewInteractionMode =[\s\S]*getPistonOscillationGuideScrewInteractionMode\([\s\S]*activePistonOscillationGuideSession\.step[\s\S]*guideScrewInteractionMode=\{pistonGuideScrewInteractionMode\}[\s\S]*onGuideScrewDirectionFeedback=\{[\s\S]*handlePistonOscillationGuideScrewDirectionFeedback/,
  'Workbench should derive screw mode from the live canonical step and wire both mode and direction feedback into the scene',
);
assert.match(
  focusInteractionSource,
  /guideScrewInteractionMode === 'tighten'[\s\S]*\? 'clockwise'[\s\S]*guideScrewInteractionMode === 'loosen'[\s\S]*\? 'counterclockwise'[\s\S]*guideVisualCue === 'screw' \? guideScrewCueDirection : null[\s\S]*data-piston-screw-direction=\{displayedScrewCueDirection\}[\s\S]*role="img"[\s\S]*screwTightenDirectionAria[\s\S]*screwLoosenDirectionAria/,
  'the breathing screw cue should expose an accessible clockwise or counterclockwise arrow for the active operation',
);

assert.match(
  focusInteractionSource,
  /demoFrame\?\.activeControl === 'screw'[\s\S]*demoHighlightControls\.includes\('screw'\)[\s\S]*data-piston-screw-direction-mode=\{[\s\S]*demoScrewCueDirection === null \? 'guide' : 'demo'/,
  'Demo mode should render the clockwise or counterclockwise screw arrow during its screw stages',
);
assert.match(
  workbenchSource,
  /handlePistonOscillationGuideHeightConfirmed[\s\S]*type: 'confirmHeight'[\s\S]*heightMm: snapshot\.equilibriumHeightMm[\s\S]*leftHandSupporting: snapshot\.spaceHeld[\s\S]*rightHandReleased: !snapshot\.mouseHeld/,
  'height confirmation should commit the same physical reading that the action guard accepted',
);
assert.match(
  workbenchSource,
  /currentStep === 'screwLock'[\s\S]*snapshot\.lockingScrewState === 'locked'[\s\S]*currentStep === 'crossRunDisconnect'[\s\S]*snapshot\.spaceHeld[\s\S]*snapshot\.hoseState === 'disconnected'/,
  'snapshot auto-advance should retain only functionally observable locks, hose states, and the left-supported cross-Run disconnect',
);
assert.doesNotMatch(
  workbenchSource,
  /crossRunPlatformSupport|type: 'supportPlatform'/,
  'the Workbench must not retain an instantaneous platform-support state or event',
);
assert.doesNotMatch(
  workbenchSource,
  /type: 'adjustHeight'|steps: \['platformSupport'\]|currentStep === 'platformSupport'/,
  'Run 1 must not retain an auto-skipped height event or transient platformSupport checklist step',
);
assert.match(
  workbenchSource,
  /<PistonOscillationAcquisitionPanel[\s\S]*guideSession=\{[\s\S]*activePistonOscillationGuideSelected[\s\S]*activePistonOscillationDemoPlaybackPhase === 'idle'[\s\S]*\? activeFile\.pistonOscillationGuideSession[\s\S]*: undefined[\s\S]*\}[\s\S]*guidePaused=\{[\s\S]*activePistonOscillationGuideTimeFrozen[\s\S]*pistonOscillationGuideLessonDialog !== null[\s\S]*\}[\s\S]*guideCue=\{pistonGuideAcquisitionCue\}/,
  'the realtime panel should receive the persisted Guide session only outside Demo playback and freeze during recovery explanations',
);
assert.doesNotMatch(workbenchSource, /activePistonOscillationGuidePaused/);
assert.match(
  workbenchSource,
  /onGuideAcquisitionEvent=\{[\s\S]*activePistonOscillationDemoPlaybackPhase === 'idle'[\s\S]*\? handlePistonOscillationGuideAcquisitionEvent[\s\S]*: undefined[\s\S]*\}/,
  'Demo playback should not retain the Guide acquisition callback bridge',
);
assert.match(
  acquisitionBridgeSource,
  /case 'curvePaused':[\s\S]*session\.step !== 'pauseAvailable'[\s\S]*type: 'updateRecording'[\s\S]*type: 'pauseRecording'[\s\S]*type: 'curveFreezeComplete'/,
  'Guide Pause must calculate update, pause, and freeze as one accepted acquisition transition',
);
assert.match(
  workbenchSource,
  /commitPistonOscillationGuideAcquisitionSession = \([\s\S]*currentFiles\[fileIndex\] !== liveFile[\s\S]*filesRef\.current = nextFiles;[\s\S]*setFiles\(nextFiles\)[\s\S]*handlePistonOscillationGuideAcquisitionEvent = \([\s\S]*transitionPistonOscillationGuideAcquisitionSession\([\s\S]*nextSession === null[\s\S]*!commitPistonOscillationGuideAcquisitionSession\(liveFile, nextSession, nowMs\)[\s\S]*return false/,
  'every Guide acquisition event must compare-and-swap one accepted canonical session before the panel advances',
);
assert.match(
  workbenchSource,
  /onGuideParameterEdit=\{\(field, value\) => \{[\s\S]*editPistonOscillationGuideParameterWorkbenchState[\s\S]*PISTON_OSCILLATION_GUIDE_SAMPLE_RATE_HZ[\s\S]*PISTON_OSCILLATION_GUIDE_TRIGGER_THRESHOLD_KPA[\s\S]*Number\(value\) === expectedValue[\s\S]*commitPistonOscillationGuideParameterWorkbenchState/,
  'correct Guide parameter values must commit in the same update instead of waiting for a later blur',
);
assert.doesNotMatch(
  workbenchSource,
  /baselineStabilizing|crossRunStabilizing|baselineStabilized|expectedTrueBaselineHeightMm/,
  'Workbench must not recreate the removed hidden baseline timer or its synthetic transition event',
);
assert.doesNotMatch(workbenchSource, /PistonOscillationRealtimeUnavailable/);
assert.match(
  placeholderStyles,
  /\.studio-preview\.studio-preview-piston-oscillation\s*\{[\s\S]*grid-template-rows:\s*minmax\(0,\s*1fr\)/,
);
assert.match(
  placeholderStyles,
  /\.studio-realtime-panel\.studio-realtime-panel-piston-oscillation\s*\{[\s\S]*grid-template-rows:\s*minmax\(0,\s*1fr\)/,
);
assert.match(
  workbenchStyles,
  /\.studio-left-rail\s*\{[\s\S]*left:\s*0;[\s\S]*top:\s*84px;/,
  'the collapsed file rail should begin below the 3D preview header',
);
assert.match(
  acquisitionStyles,
  /\.studio-params-collapsed[\s\S]*\.studio-realtime-panel-piston-oscillation[\s\S]*\.piston-acquisition-run-summary\s*\{[\s\S]*margin-inline-end:\s*12px;/,
  'the acquisition run summary should leave room for the collapsed parameter rail',
);
assert.match(
  workbenchStyles,
  /\.studio-piston-guide-page-dots\s*\{[\s\S]*align-items:\s*center;[\s\S]*padding-block:\s*1px;/,
  'the three Guide page dots should retain small symmetric breathing room without increasing panel height',
);

assert.match(
  workbenchSource,
  /!activeFile\.pistonOscillationLessonIntroAutoShown[\s\S]*kind: 'intro'[\s\S]*pageIndex: 0[\s\S]*pistonOscillationLessonIntroAutoShown: true/,
  'experiment notes should auto-open once for a newly created piston file rather than when Guide starts',
);
assert.match(
  workbenchSource,
  /onMouseDown=\{advancePistonOscillationGuideLessonDialog\}[\s\S]*onMouseDown=\{\(event\) => event\.stopPropagation\(\)\}[\s\S]*studio-piston-guide-lesson-content-stack-transitioning[\s\S]*studio-heat-guide-lesson-content-outgoing[\s\S]*studio-heat-guide-lesson-content-current/,
  'piston notes should reuse the Heat blank-area advance boundary and expose a dedicated non-overlapping transition state',
);
assert.match(
  workbenchStyles,
  /\.studio-piston-guide-lesson-content-stack-transitioning[\s\S]*\.studio-heat-guide-lesson-content-outgoing\s*\{[\s\S]*studioOverlayFadeOut 90ms[\s\S]*\.studio-piston-guide-lesson-content-stack-transitioning[\s\S]*\.studio-heat-guide-lesson-content-current\s*\{[\s\S]*opacity:\s*0;[\s\S]*studioOverlayFadeIn 90ms[^;]*90ms both;/,
  'piston note pages should finish the old-text fade before starting the new-text fade',
);
assert.doesNotMatch(
  workbenchSource,
  /studio-piston-guide-lesson-(?:nav|previous|next)|pistonOscillationCopy\.lesson\.(?:previous|next|pageLabel)/,
  'piston notes must not retain custom previous, next, or page-number controls',
);
assert.match(
  workbenchStyles,
  /\.studio-heat-guide-lesson-card\.studio-piston-guide-lesson-card-long\s*\{[\s\S]*width:\s*min\(540px,[\s\S]*height:\s*min\(260px,/,
  'long piston copy may enlarge only the shared Heat lesson card dimensions',
);
assert.match(
  workbenchStyles,
  /\.studio-heat-guide-lesson-card\s*\{[^}]*border:\s*1px solid rgba\(125, 211, 252, 0\.52\);[^}]*outline:\s*none;/,
  'the shared lesson card should retain its thin teaching border without a browser-supplied dark focus outline',
);
assert.match(
  workbenchSource,
  /const heightSubmitRequiresReset = action === 'confirmHeight'[\s\S]*wrongTargetHeight[\s\S]*leftHandRequired[\s\S]*rightHandMustBeReleased[\s\S]*type: 'beginHeightReset'[\s\S]*reason: 'wrongHeightConfirmation'/,
  'an invalid explicit height confirmation should bypass generic miss accumulation and start the exclusive reset immediately',
);
assert.match(
  workbenchSource,
  /handlePistonOscillationGuideSupportLoss[\s\S]*pistonOscillationGuideResumeStrongReminderAfterLessonRef\.current =[\s\S]*setPistonOscillationGuideStrongReminderActive\(false\)[\s\S]*type: 'beginHeightReset'[\s\S]*reason: 'supportLost'/,
  'losing both supports should suspend any active generic reminder and start the same exclusive reset',
);
assert.match(
  workbenchSource,
  /pistonGuideStrongTargetContext[\s\S]*pistonGuideExpectedStrongTargetId[\s\S]*setPistonOscillationGuideStrongReminderActive\(false\)[\s\S]*setPistonOscillationGuidePulseElapsedMs\(0\)[\s\S]*pistonOscillationGuideMissCountRef\.current = 0/,
  'each successful operation target change should end the old strong reminder and start a fresh timer and miss count',
);
assert.match(
  workbenchSource,
  /setPistonOscillationGuideStrongReminderActive = \([\s\S]*expectedContext\?: string \| null[\s\S]*expectedContext !== pistonOscillationGuideStrongTargetContextRef\.current[\s\S]*pistonOscillationGuideStrongReminderActiveContextRef\.current = expectedContext/,
  'a delayed reminder may activate only the exact operation target that scheduled it, never the following target',
);
assert.match(
  workbenchSource,
  /const releaseOnly = action === 'platformRelease' \|\| action === 'leftHandRelease';[\s\S]*if \(guard\.allowed\) \{[\s\S]*!releaseOnly[\s\S]*!isPistonOscillationGuideStrongReminderActive\(\)[\s\S]*setPistonOscillationGuidePulseElapsedMs\(0\)[\s\S]*if \(!releaseOnly\) \{[\s\S]*clearPistonOscillationGuideFeedback\(\)/,
  'allowed release-only gestures should preserve the guidance clock and feedback while other accepted operations advance it',
);
assert.match(
  workbenchSource,
  /showPistonOscillationGuideFeedback\(message, 'warning', 'guide'\);[\s\S]*if \(!isPistonOscillationGuideStrongReminderActive\(\)\) \{[\s\S]*setPistonOscillationGuidePulseElapsedMs\(0\)/,
  'a rejected generic Guide action should restart only the ordinary reminder clock when no strong reminder is active',
);
assert.match(
  workbenchSource,
  /feedback\.kind === 'boundaryBlocked'[\s\S]*screwBoundaryBlockedTighten[\s\S]*screwBoundaryBlockedLoosen[\s\S]*screwWrongDirectionTighten[\s\S]*screwWrongDirectionLoosen[\s\S]*feedback\.kind === 'boundaryBlocked' \? 'warning' : 'info'/,
  'screw direction feedback should remain informational until the protected functional boundary is blocked',
);
assert.match(
  workbenchSource,
  /pistonGuideStrongHoseInteractionHidden[\s\S]*pistonOscillationGuideHoseDragging[\s\S]*hoseDisconnect[\s\S]*pistonOscillationGuideHoseState === 'disconnected'[\s\S]*hoseReconnect[\s\S]*pistonOscillationGuideHoseState === 'connected'/,
  'hose reminders should hide only during the drag or after the endpoint has physically changed, allowing a failed rebound to restore the same reminder',
);
assert.doesNotMatch(
  workbenchSource,
  /pistonGuideStrongPlatformInteractionHidden|setPistonOscillationGuideMouseHeld/,
  'an authorized platform drag should keep the reminder wall visible instead of hiding it while the mouse is held',
);
assert.match(
  workbenchSource,
  /stage\.dataset\.pistonFocusPlatformX[\s\S]*stage\.dataset\.pistonFocusPlatformY[\s\S]*pistonGuideStrongTargetId === 'platform' \? 32 : 120/,
  'the platform cutout should follow the live projected platform position throughout the drag',
);
assert.match(
  workbenchSource,
  /closingKind === 'heightReset'[\s\S]*dismissHeightReset[\s\S]*pistonOscillationGuideResumeStrongReminderAfterLessonRef\.current[\s\S]*setPistonOscillationGuideStrongReminderActive\([\s\S]*true,[\s\S]*pistonOscillationGuideStrongTargetContextRef\.current/,
  'a strong reminder suspended by the exclusive lesson card should resume only after that failed recovery is dismissed',
);
assert.match(
  workbenchSource,
  /currentSession\?\.status === 'active'[\s\S]*currentSession\.step === 'completionReview'[\s\S]*previousSession\.step !== 'completionReview'[\s\S]*setPistonOscillationGuideLessonDialog\(\{[\s\S]*kind: 'completion'[\s\S]*fileId: currentSession\.fileId[\s\S]*closing: false/,
  'finishing the calculation should enter the persisted completion-review stage and open its lesson layer',
);
assert.match(
  workbenchSource,
  /dialog\.kind === 'completion'[\s\S]*pistonOscillationCopy\.guide\.completedTitle[\s\S]*pistonOscillationCopy\.guide\.completedDetail/,
  'the completion lesson should render the approved localized title and full explanation',
);
assert.match(
  workbenchSource,
  /current\?\.kind === 'completion'[\s\S]*currentSession\?\.fileId !== current\.fileId[\s\S]*currentSession\.status !== 'active'[\s\S]*currentSession\.step !== 'completionReview'/,
  'resetting, exiting, or switching files should clear a stale completion lesson',
);
assert.match(
  workbenchSource,
  /closingKind === 'completion'[\s\S]*step === 'completionReview'[\s\S]*type: 'acknowledgeCompletion'[\s\S]*showPistonOscillationGuideCompletionToast/,
  'only dismissing the completion explanation should acknowledge and truly finish Guide mode',
);
assert.match(
  workbenchSource,
  /showPistonOscillationGuideCompletionToast[\s\S]*HEAT_CAPACITY_TOAST_DISPLAY_DURATION_MS[\s\S]*className="studio-heat-demo-complete-toast"[\s\S]*data-piston-oscillation-guide-complete-toast="true"[\s\S]*role="status"/,
  'the final piston Guide notice should reuse the heat-capacity completion toast timing, styling, and accessibility semantics',
);
const mandatoryProcessingBlock = workbenchSource.match(
  /const pistonOscillationMandatoryDataProcessing = Boolean\(([\s\S]*?)\n  \);/,
)?.[1];
assert.ok(mandatoryProcessingBlock, 'the mandatory processing workspace gate should exist');
assert.match(
  mandatoryProcessingBlock,
  /step === 'periodProcessing'[\s\S]*step === 'completionReview'/,
  'period selection and the completion explanation should keep the enlarged processing workspace',
);
assert.doesNotMatch(
  mandatoryProcessingBlock,
  /step === 'powerOff'|step === 'calculationReady'/,
  'shutdown and offline calculation should restore the split instrument/realtime layout',
);
assert.match(
  workbenchSource,
  /showPistonOscillationGuideFeedback\(message, 'warning', 'guide'\)/,
  'ordinary piston guide rejections should use the shared warning feedback channel',
);
assert.match(
  workbenchSource,
  /PISTON_OSCILLATION_GUIDE_ORDINARY_REMINDER_DURATION_MS[\s\S]*event\.type === 'pressureAttemptRejected'[\s\S]*setPistonOscillationGuideStrongReminderActive\(false\)[\s\S]*showPistonOscillationGuideFeedback\([\s\S]*pressureTooLowFeedback[\s\S]*pressureTooHighFeedback[\s\S]*nextMissCount >= 2[\s\S]*PISTON_OSCILLATION_GUIDE_ORDINARY_REMINDER_DURATION_MS/,
  'pressure mistakes must show one complete ordinary reminder before a second miss may escalate',
);
assert.match(
  workbenchSource,
  /pistonGuideStrongTargetContext === null[\s\S]*pistonOscillationGuidePressureIssue !== null[\s\S]*pistonOscillationGuideStrongReminderClockContext !== null/,
  'a single pressure mistake should pause the generic inactivity-based strong reminder so pressure escalation still requires a repeated miss',
);
assert.match(
  workbenchSource,
  /clearPistonOscillationGuideFeedbackRef\.current\(\)[\s\S]*pistonOscillationGuideStrongReminderActiveContextRef\.current = expectedContext/,
  'activating a strong reminder must remove the ordinary feedback so the two layers never compete',
);
assert.match(
  workbenchSource,
  /pistonOscillationGuideStrongReminderActiveContext !== null[\s\S]*pistonOscillationGuidePressureIssue === 'overpressure'[\s\S]*\? 'redo'[\s\S]*pressureTooLowStrongReminder[\s\S]*pressureTooHighStrongReminder/,
  'a strong pressure reminder must pulse and cut out the exact platform or Redo target with concise copy',
);
assert.match(
  workbenchSource,
  /kind: 'pressureRange'[\s\S]*kind: 'lockingScrew'[\s\S]*kind: 'multiPeriod'[\s\S]*pressureRangeLessonTitle[\s\S]*pressureRangeLessonBody[\s\S]*lockingScrewLessonTitle[\s\S]*lockingScrewLessonBody[\s\S]*multiPeriodLessonTitle[\s\S]*multiPeriodLessonBody/,
  'pressure-range, locking-screw, and multi-period explanations must use the shared exclusive lesson dialog',
);
assert.match(
  workbenchSource,
  /event\.reason === 'underpressure'[\s\S]*pistonOscillationGuidePressureRangeLessonTimerRef\.current = window\.setTimeout[\s\S]*openPistonOscillationGuideOneTimeLesson\('pressureRange'\)[\s\S]*event\.type === 'redoOverpressureAttempt'[\s\S]*openPistonOscillationGuideOneTimeLesson\('pressureRange'\)[\s\S]*event\.type === 'selectPeriodRange'[\s\S]*selection\?\.issue === null && selection\.periodCount >= 3[\s\S]*openPistonOscillationGuideOneTimeLesson\('multiPeriod'\)/,
  'each new lesson must open once at its approved completed-action checkpoint',
);
assert.match(
  acquisitionBridgeSource,
  /case 'redoOverpressureAttempt':[\s\S]*type: 'discardAcquisitionAttempt'/,
  'the accepted overpressure Redo checkpoint must discard the invalid attempt before its lesson opens',
);
assert.match(
  workbenchSource,
  /currentStep === 'screwLoosen'[\s\S]*previousSnapshot\?\.lockingScrewState !== 'loose'[\s\S]*snapshot\.lockingScrewState === 'loose'[\s\S]*openPistonOscillationGuideOneTimeLesson\('lockingScrew'\)/,
  'the locking-screw explanation should open once after the first completed loosening action',
);
assert.match(
  workbenchSource,
  /text\.split\(\/\(Uₜ₁\|Uₜ₂\|Uₜ\|Uₚ\|t₁\|t₂\|T²[\s\S]*part === 't₁'[\s\S]*<sub>1<\/sub>[\s\S]*part === 't₂'[\s\S]*<sub>2<\/sub>[\s\S]*part === 'T²'[\s\S]*<sup>2<\/sup>/,
  'lesson formulas must render semantic subscripts and superscripts instead of exposing source markup',
);
assert.match(
  instrumentSceneSource,
  /overlayCenter\?: React\.ReactNode;[\s\S]*overlayCenterAboveGuideMask\?: boolean;[\s\S]*overlayCenter=\{overlayCenter\}/,
  'the piston scene shell should forward the shared center feedback host',
);
assert.match(
  focusInteractionSource,
  /data-piston-viewport-feedback-layer="true"[\s\S]*\{demoFeedbackMessage \?[\s\S]*<PromptViewportFeedback[\s\S]*\{overlayCenter\}/,
  'piston demo and guide feedback should share one independent viewport feedback layer',
);
assert.match(
  focusInteractionStyles,
  /\.studio-preview-overlay-center\.piston-focus-interaction-viewport-feedback-layer\s*\{[\s\S]*z-index:\s*36;/,
  'piston viewport feedback should sit above the z-index 35 operation mirror',
);
assert.match(
  workbenchStyles,
  /\.studio-piston-guide-strong-mask\s*> \.studio-heat-guide-strong-cutout-svg\s*\{[\s\S]*z-index:\s*35;[\s\S]*\.studio-piston-guide-lesson-layer\s*\{[\s\S]*z-index:\s*37;/,
  'the piston feedback layer should remain between the strong reminder and exclusive lesson card',
);
assert.doesNotMatch(workbenchStyles, /\.studio-piston-guide-feedback/, 'the obsolete piston-only brown feedback surface should be removed');
assert.match(
  acquisitionSource,
  /getRecordedPressureGraphDomain[\s\S]*getObservedPressureKpa/,
  'persisted observed pressure samples should provide their own graph domain and discrete readout',
);
assert.match(
  acquisitionSource,
  /restoredGuideSavedMeasurement[\s\S]*guideSession\.savedMeasurements\.find[\s\S]*displayedObservationSamples[\s\S]*if \(restoredGuideMeasurement\) return restoredGuideMeasurement\.samples/,
  'persisted Guide curve samples should remain directly usable after the acquisition panel remounts',
);
assert.match(
  acquisitionSource,
  /pressure\.toFixed\(2\)[\s\S]*graphDomainSeconds\)\.toFixed\(3\)/,
  'the acquisition chart must display the formal sensor precision on both axes',
);
assert.match(
  workbenchSource,
  /overlapsMovingCutout[\s\S]*card: currentLayout\.card[\s\S]*pistonGuideStrongTargetId === 'platform' \? 32 : 120/,
  'the platform cutout should follow at interactive cadence while keeping the reminder card stable unless the moving target would overlap it',
);

console.log('workbenchPistonOscillationShell tests passed');
