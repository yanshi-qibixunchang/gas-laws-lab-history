const runtimeUseWorkbenchPistonProcessingViewSource = readPistonRuntimeSource(new URL('../../src/features/workbench/useWorkbenchPistonProcessingView.ts', import.meta.url), 'utf8');
const runtimeWorkbenchPistonAcquisitionProcessingActionsSource = readPistonRuntimeSource(new URL('../../src/features/workbench/workbenchPistonAcquisitionProcessingActions.ts', import.meta.url), 'utf8');
import { readFileSync as readPistonRuntimeSource } from 'node:fs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const readSource = (...segments: string[]) => readFileSync(
  join(process.cwd(), ...segments),
  'utf8',
);

const componentSource = readSource(
  'src',
  'features',
  'pistonOscillation',
  'PistonOscillationCalculationWindow.tsx',
);
const styleSource = readSource(
  'src',
  'features',
  'pistonOscillation',
  'PistonOscillationCalculationWindow.css',
);
const copySource = readSource(
  'src',
  'features',
  'pistonOscillation',
  'pistonOscillationCalculationCopy.ts',
);
const modelSource = readSource(
  'src',
  'domain',
  'pistonOscillation',
  'pistonOscillationDataProcessingModel.ts',
);
const workbenchSource = readSource(
  'src',
  'features',
  'workbench',
  'WorkbenchStudioPrototype.tsx',
);

assert.match(componentSource, /<PromptDialogShell[\s\S]*variant="task"[\s\S]*role="dialog"/);
assert.match(
  componentSource,
  /dismiss=\{\{ closeButton: canDismiss, escape: canDismiss, backdrop: canDismiss \}\}/,
  'the fit/calculation workflow must lock every ambient close channel until answers are complete',
);
assert.match(
  componentSource,
  /calculationSession\.status === 'ready-to-exit'[\s\S]*calculationSession\.status === 'completed'/,
  'only ready or completed sessions may be dismissed',
);

assert.match(
  componentSource,
  /<CalculationKnownGrid[\s\S]*shortRowAlignment="start"/,
  'piston known values should reuse the shared grid while keeping m, d, and P on the left',
);
assert.match(
  componentSource,
  /const buildKnownConstantRows =[\s\S]*label: 'm（kg）'[\s\S]*label: 'd（mm）'[\s\S]*label: 'P（Pa）'/,
  'the fixed constants should live in their own non-interactive known-values grid',
);
assert.match(
  componentSource,
  /formatDecimalPlacesHalfEven\(knowns\.movingMassKg, 4\)/,
  'the nameplate mass must render as 0.0485 kg instead of rounding to 0.049 kg',
);
assert.match(componentSource, /formatKnownPressure\(knowns\.pressurePa\)/);
assert.match(
  componentSource,
  /const buildFitDataRows =[\s\S]*label: 'T（s）'[\s\S]*label: 'T²（s²）'[\s\S]*label: 'h（mm）'[\s\S]*label: '（T², h）'/,
  'the measured data groups should live in a separate fit-selection grid',
);
assert.match(
  componentSource,
  /studio-piston-calculation-known-panel[\s\S]*rows=\{knownRows\}[\s\S]*studio-piston-fit-selection[\s\S]*rows=\{fitDataRows\}/,
  'known constants and selectable fit rows must render as two clearly separated sections',
);
assert.doesNotMatch(
  componentSource,
  /fitKnownRows|studio-piston-fit-known-grid|label:\s*copy\.slope|label:\s*copy\.intercept/,
  'fit results should stay in the chart callout instead of being appended as a fifth known-data row',
);
assert.doesNotMatch(componentSource, /type="checkbox"/, 'fit rows should be selected directly, without checkboxes');
assert.match(componentSource, /'aria-pressed': selected[\s\S]*data-piston-fit-run-index/);
assert.match(
  componentSource,
  /studio-piston-fit-confirm-disabled[\s\S]*aria-disabled=\{!guidedSelectionComplete\}[\s\S]*onClick=\{submitFit\}/,
  'guided fit confirmation should look disabled but still capture an invalid click for teaching feedback',
);
assert.match(styleSource, /\.studio-piston-fit-data-row-selected[\s\S]*var\(--studio-accent-strong\)/);
assert.doesNotMatch(
  styleSource,
  /\.studio-piston-fit-selection \.studio-piston-fit-data-row-selected\s*\{[^}]*inset\s+3px\s+0\s+0/,
  'selected fit rows should use a balanced outline instead of a left rail',
);
assert.match(
  styleSource,
  /\.studio-piston-calculation-step-active\s*\{[\s\S]*background:\s*color-mix[\s\S]*0 0 0 1px/,
  'active piston calculation steps should use the shared symmetric emphasis treatment',
);
assert.match(
  styleSource,
  /\.studio-piston-calculation-step-main\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) max-content/,
  'calculation action buttons must size to their localized label instead of a fixed narrow column',
);
assert.match(styleSource, /studioPistonFitGuidancePulse/);

assert.match(componentSource, /groups\.at\(-1\)[\s\S]*entry\.runIndex === previous\.last \+ 1/);
assert.match(componentSource, /studio-piston-fit-reminder-shade[\s\S]*mask=\{`url\(#\$\{maskId\}\)`\}/);
assert.match(componentSource, /role="alertdialog"[\s\S]*missingFitTitle/);
assert.match(
  componentSource,
  /fitReminderReturnFocusRef[\s\S]*fitReminderDismissButtonRef\.current\?\.focus\(\)[\s\S]*event\.key === 'Escape'[\s\S]*event\.key === 'Tab'/,
  'the modal fit reminder must take focus, trap Tab, support Escape, and return focus',
);
assert.match(
  componentSource,
  /aria-describedby=\{`\$\{generatedId\}-fit-reminder-body`\}[\s\S]*id=\{`\$\{generatedId\}-fit-reminder-body`\}/,
  'the fit reminder must expose its explanatory body to assistive technology',
);

for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
  assert.match(componentSource, new RegExp(`corner: '${corner}'`));
}
assert.match(componentSource, /distanceFromPointToRect[\s\S]*lineSamples[\s\S]*pointClearance/);
assert.match(componentSource, /className="studio-piston-fit-line"/);
assert.match(componentSource, /studio-piston-fit-point-selected/);
assert.match(componentSource, /studio-piston-fit-point-omitted/);
assert.match(componentSource, /（m）`/);
assert.match(componentSource, /R² = \{formatDecimalPlacesHalfEven\(fit\.rSquared, 5\)\}/);
assert.match(componentSource, /formatSignificantFiguresHalfEven/);
assert.match(styleSource, /\.studio-piston-fit-callout rect[\s\S]*stroke:\s*var\(--studio-accent-strong\)/);

assert.match(componentSource, /A = πd² \/ 4 =/);
assert.match(componentSource, /γ = 4π²ms \/ \(AP\) =/);
assert.match(
  componentSource,
  /const formattedReferenceGamma = formatDecimalPlacesHalfEven\(referenceGamma, 2\)/,
);
assert.match(
  componentSource,
  /Eᵣ = \|γ − \$\{formattedReferenceGamma\}\| \/ \$\{formattedReferenceGamma\} × 100% =/,
);
assert.match(componentSource, /referenceGamma=\{calculationSession\.knowns\.referenceGamma\}/);
assert.match(componentSource, /continueCalculationAnswer/);
assert.match(componentSource, /revealCalculationAnswer/);
assert.match(componentSource, /formatPistonOscillationCalculationAnswer/);
assert.match(modelSource, /PISTON_OSCILLATION_DATA_PROCESSING_SCHEMA_VERSION = 7/);
assert.match(componentSource, /batchMode[^]*revealNextCalculationField[^]*submitCalculationBatch/);
assert.match(componentSource, /getInvalidPistonOscillationCalculationBatchFields/);
assert.match(modelSource, /visibleFieldIds: PistonOscillationCalculationFieldId\[\]/);
assert.match(modelSource, /batchAttempts: PistonOscillationCalculationBatchAttemptSnapshot\[\]/);
assert.match(modelSource, /attemptedAtMs:\s*number \| null;[\s\S]*draftRaw:\s*string \| null;[\s\S]*resolution:\s*PistonOscillationAnswerResolution/);
assert.match(modelSource, /display-rounded-ordinary-least-squares-v3/);
assert.match(modelSource, /display-rounded-piston-slope-calculation-v3/);
assert.match(componentSource, /const fitHeightMm = run\.fitHeightMm/);
assert.match(
  componentSource,
  /x: Number\(formatDataValue\(run\.result\.periodSquaredS2, 5\)\)[\s\S]*y: Number\(formatDataValue\(run\.fitHeightMm, 4\)\) \/ 1000/,
  'the chart points must use the same displayed coordinates as the fitted data table',
);
assert.match(
  modelSource,
  /const firstConfig = records\[0\]\?\.physicsSnapshot\.config;[\s\S]*records\.some\(\(record\) => \([\s\S]*record\.physicsSnapshot\.config\.ambientPressurePa,[\s\S]*firstConfig\.ambientPressurePa[\s\S]*throw new RangeError\('All fitted runs must use the same saved apparatus parameters\.'\)[\s\S]*pressurePa: firstConfig\?\.ambientPressurePa[\s\S]*\?\? PISTON_OSCILLATION_REFERENCE_PRESSURE_PA/,
  'calculation knowns must use the pressure frozen in the records and reject mixed apparatus profiles',
);
assert.match(modelSource, /status:\s*'selecting-points' \| 'calculating' \| 'ready-to-exit' \| 'completed'/);

for (const language of ["'zh-CN'", "'zh-TW'", 'en:']) {
  assert.match(copySource, new RegExp(language.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
assert.match(copySource, /继续作答/);
assert.match(copySource, /查看并继续/);
assert.match(copySource, /Select every data group first/);
assert.match(copySource, /实验已知量/);
assert.match(copySource, /以下全部数据均已参与本次拟合；拟合函数与 R² 显示在下方图中。/);
assert.match(copySource, /后续步骤仅使用前一步已显示、已舍入的数值继续计算/);
assert.doesNotMatch(copySource, /数值落在允许容差内即可判定正确/);

assert.match(runtimeUseWorkbenchPistonProcessingViewSource, /calculationWindowOpen: pistonOscillationCalculationWindowOpen[\s\S]*selectWorkbenchPistonOscillationViewState\(/);
assert.match(workbenchSource, /pistonOscillationCalculationReviewOpen/);
assert.match(workbenchSource, /openPistonOscillationCalculationReview/);
assert.match(workbenchSource, /<PistonOscillationCalculationWindow[\s\S]*onCompleteAndExit=\{completeAndExitPistonOscillationCalculation\}/);
assert.match(
  runtimeWorkbenchPistonAcquisitionProcessingActionsSource,
  /const completeAndExitPistonOscillationCalculation[\s\S]*completingFreeSession[\s\S]*setPistonOscillationDataProcessingReviewOpen\(false\)[\s\S]*setSelectedPanel\('preview'\)[\s\S]*setLeftCollapsed\(false\)/,
  'finishing the Free calculation should close processing review, restore the instrument workspace, and expand the left sidebar',
);
assert.match(
  runtimeWorkbenchPistonAcquisitionProcessingActionsSource,
  /const closePistonOscillationDataProcessingReview[\s\S]*setSelectedPanel\('preview'\)[\s\S]*setLeftCollapsed\(false\)/,
  'closing a completed processing review should return to the instrument workspace',
);

console.log('pistonOscillationCalculationWindow tests passed');
