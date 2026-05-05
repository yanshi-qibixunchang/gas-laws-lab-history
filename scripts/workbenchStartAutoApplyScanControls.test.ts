import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');
const saveParameterDraftBody = source.slice(
  source.indexOf('  const saveParameterDraft = () => {'),
  source.indexOf('  const applyActiveFileParams = ('),
);

assert.ok(saveParameterDraftBody.length > 0, 'saveParameterDraft function body should be located for scoped assertions');

assert.doesNotMatch(
  source,
  /studio-param-reset-button|<RotateCcw size=\{12\}[\s\S]*?Reset/,
  'Current Parameters should not render a user-facing Reset button',
);

assert.doesNotMatch(
  source,
  /pending Reset|needs reset|Reset rebuilds|Reset, then Run|pending Reset/,
  'parameter guidance should not tell users to press Reset before running',
);

assert.match(
  source,
  /const prepareActiveFileForRun = \(\): boolean => \{[\s\S]*?if \(parametersEditing\) \{[\s\S]*?setParametersEditing\(false\)[\s\S]*?setParameterDraft\(\{\}\)[\s\S]*?setParameterErrors\(\[\]\)[\s\S]*?\}[\s\S]*?parametersDirty[\s\S]*?applyActiveFileParams\(undefined,\s*\{ silent: true/,
  'starting while Edit is open should ignore unsaved draft values and keep the pre-edit saved parameters',
);

assert.match(
  saveParameterDraftBody,
  /const saveParameterDraft = \(\) => \{[\s\S]*?const nextParams = parseParameterDraft\(\);[\s\S]*?if \(!nextParams\) return;[\s\S]*?if \(rejectLockedIdealControlledVariables\(nextParams\)\) return;[\s\S]*?applyActiveFileParams\(nextParams\);[\s\S]*?\};/,
  'right-sidebar Save should immediately apply saved parameter values and rebuild the 3D runtime',
);

assert.doesNotMatch(
  saveParameterDraftBody,
  /updateActiveFile\(\(file\) => \(\{[\s\S]*?params: nextParams[\s\S]*?needsReset: true/,
  'right-sidebar Save should not only save params and defer the runtime rebuild until Start',
);

assert.doesNotMatch(
  source,
  /if \(parametersEditing\) \{[\s\S]*?parseParameterDraft\(\)[\s\S]*?applyActiveFileParams\(nextParams/,
  'unsaved Edit drafts should not be parsed or applied by Start',
);

assert.match(
  source,
  /const runActiveFile = \(\) => \{[\s\S]*?prepareActiveFileForRun\(\)[\s\S]*?return;[\s\S]*?pauseRunningFilesExcept/,
  'runActiveFile should prepare pending edits and reset-needed runtimes before scheduling frames',
);

assert.doesNotMatch(
  source,
  /saved parameter changes are pending Reset|reset the ideal-gas runtime before running/,
  'runActiveFile should not block on pending Reset or ideal needsReset states',
);

assert.match(
  source,
  /const IDEAL_SCAN_SNAP_THRESHOLD: Record<ExperimentRelation, number> = \{[\s\S]*?pt:\s*0\.04[\s\S]*?pv:\s*0\.25[\s\S]*?pn:\s*8/,
  'ideal scan snapping should use short relation-specific thresholds',
);

assert.match(
  source,
  /const getSnappedIdealScanValue = \([\s\S]*?presetSequence\.reduce[\s\S]*?distance <= threshold[\s\S]*?closest\.value : rawValue/,
  'ideal scan updates should snap only to nearby preset values',
);

assert.ok(
  source.includes('const parseIdealScanInput = (') &&
    source.includes('const decimalPattern = /^(?:\\d+(?:\\.\\d*)?|\\.\\d+)$/;') &&
    source.includes('const integerPattern = /^\\d+$/;') &&
    source.includes('return { valid: false'),
  'ideal scan keyboard input should reject unsupported decimal/integer formats before updating params',
);

assert.match(
  source,
  /const scanInputRef = useRef<HTMLInputElement \| null>\(null\);/,
  'ideal scan input should keep a ref so invalid submissions can keep the user in the same editor',
);

assert.match(
  source,
  /const showScanInputError = \(message: string,\s*options: \{ refocus\?: boolean; rawValue\?: string \} = \{\}\) => \{[\s\S]*?setScanInputToast\(message\)[\s\S]*?pushLog\(`\$\{activeFile\.name\}: \$\{message\}`,\s*'error'\)[\s\S]*?scanInputRef\.current\?\.focus\(\)[\s\S]*?scanInputRef\.current\?\.select\(\)/,
  'invalid scan input should set inline error, show a transient app toast, write to the console log, and refocus for direct correction',
);

assert.match(
  source,
  /const validateIdealScanDraft = \(rawValue: string\) => \{[\s\S]*?parseIdealScanInput\(rawValue[\s\S]*?showScanInputError\(parsed\.message,\s*\{ rawValue \}\)[\s\S]*?return false;/,
  'typing an unsupported scan value should validate immediately and send the error to the console/log flow',
);

assert.doesNotMatch(
  source,
  /if \(!trimmedValue\) \{[\s\S]*?setScanInputError\(null\)[\s\S]*?return true;[\s\S]*?\}/,
  'empty scan input should report an error immediately instead of silently clearing the error state',
);

assert.match(
  source,
  /const getIdealScanStep = \(relation: ExperimentRelation\) =>[\s\S]*?relation === 'pn' \? 1[\s\S]*?relation === 'pv' \? 0\.1[\s\S]*?: 0\.01/,
  'scan input validation should use relation-specific minimum steps of temperature 0.01, L 0.1, and N 1',
);

assert.match(
  source,
  /const getIdealScanDecimals = \(relation: ExperimentRelation\) =>[\s\S]*?relation === 'pn' \? 0[\s\S]*?relation === 'pv' \? 1[\s\S]*?: 2/,
  'scan input display precision should be temperature 2 decimals, L 1 decimal, and N integer',
);

assert.match(
  source,
  /const getIdealScanStepLabel = \(relation: ExperimentRelation\) =>[\s\S]*?relation === 'pt' \? '0\.01'[\s\S]*?relation === 'pv' \? '0\.1'[\s\S]*?: '1'/,
  'scan input minimum-step errors should show the exact supported step for each relation',
);

assert.match(
  source,
  /const isIdealScanValueOnStep = \(rawValue: string,\s*relation: ExperimentRelation\) =>[\s\S]*?trimmedFractionalPart\.length <= getIdealScanDecimals\(relation\)/,
  'decimal scan input should reject values that use finer precision than the supported minimum step',
);

assert.match(
  source,
  /message: `\$\{getIdealScanInputLabel\(relation\)\} minimum step is \$\{getIdealScanStepLabel\(relation\)\}\.`/,
  'valid-looking scan input with unsupported precision should mention the minimum step',
);

assert.match(
  source,
  /onKeyDown=\{\(event\) => \{[\s\S]*?event\.key === 'Enter'[\s\S]*?commitIdealScanInput\(\)[\s\S]*?event\.key === 'Escape'/,
  'ideal scan input should commit on Enter and support Escape cancellation',
);

assert.match(
  source,
  /onBlur=\{\(\) => commitIdealScanInput\(\)\}/,
  'ideal scan input should validate and commit on blur',
);

assert.match(
  source,
  /ref=\{scanInputRef\}[\s\S]*?onChange=\{\(event\) => \{[\s\S]*?setScanInputDraft\(event\.target\.value\)[\s\S]*?validateIdealScanDraft\(event\.target\.value\)/,
  'scan input should validate unsupported edits as the user types instead of waiting for a separate edit cycle',
);

assert.match(
  source,
  /showScanInputError\(parsed\.message,\s*\{ refocus: true,\s*rawValue: scanInputDraft \}\);[\s\S]*?return;/,
  'invalid scan input submission should keep the same editor focused and preserve the current draft',
);

assert.match(
  source,
  /updateIdealScanVariable\(parsed\.value,\s*\{ snap: false \}\);[\s\S]*?scanInputRef\.current\?\.blur\(\);[\s\S]*?setScanInputFocused\(false\)/,
  'valid keyboard scan input should preserve nearby manual values like 1.01, then exit the input editor after Enter',
);

assert.match(
  source,
  /const scanStep = getIdealScanStep\(activeFile\.relation\);[\s\S]*?const scanDecimals = getIdealScanDecimals\(activeFile\.relation\);/,
  'slider step and displayed scan precision should come from the same relation-aware helpers',
);

assert.match(
  source,
  /setScanInputDraft\(formatMetric\(nextValue,\s*getIdealScanDecimals\(activeFile\.relation\)\)\)/,
  'accepted scan input should display with the supported precision after submit or snapping',
);

assert.match(
  source,
  /<button[\s\S]*?className=\{`studio-ideal-scan-tick-button \$\{Math\.abs\(value - relationVariableValue\) <= 1e-6 \? 'studio-ideal-scan-tick-active' : ''\}`\}[\s\S]*?onClick=\{\(\) => updateIdealScanVariable\(value\)\}/,
  'recommended preset values under the slider should be clickable buttons',
);

assert.match(
  cssSource,
  /\.studio-ideal-scan-input-error[\s\S]*?border-color:\s*rgba\(223,\s*123,\s*123,\s*0\.82\)/,
  'scan input should have a visible error state',
);

assert.match(
  cssSource,
  /\.studio-scan-input-toast[\s\S]*?position:\s*fixed[\s\S]*?background:\s*#35191d/,
  'invalid scan input should have an in-app transient popup style',
);

console.log('workbenchStartAutoApplyScanControls tests passed');
