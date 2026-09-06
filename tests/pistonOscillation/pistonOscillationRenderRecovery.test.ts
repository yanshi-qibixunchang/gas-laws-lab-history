
const runtimeWorkbenchPistonAcquisitionProcessingActionsSource = readPistonRuntimeSource(new URL('../../src/features/workbench/workbenchPistonAcquisitionProcessingActions.ts', import.meta.url), 'utf8');
import { readFileSync as readPistonRuntimeSource } from 'node:fs';
const workbenchViewShellSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchViewSource } from 'node:fs';
const workbenchPistonOscillationRealtimeSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchPistonOscillationRealtime.tsx', import.meta.url), 'utf8');
const workbenchRealtimeBoundarySource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchRealtimeBoundary.tsx', import.meta.url), 'utf8');
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readSource = (relativePath: string) => readFileSync(
  new URL(`../../${relativePath}`, import.meta.url),
  'utf8',
);

const appSource = readSource('src/app/App.tsx');
const workbenchSource = readSource(
  'src/features/workbench/WorkbenchStudioPrototype.tsx',
);
const fallbackSource = readSource(
  'src/features/workbench/WorkbenchRenderErrorFallback.tsx',
);
const windowControlsSource = readSource(
  'src/features/workbench/WorkbenchWindowControls.tsx',
);
const workbenchCssSource = readSource(
  'src/features/workbench/WorkbenchStudioPrototype.css',
);
const developmentFaultSource = readSource(
  'src/development/DevelopmentRenderFault.tsx',
);

assert.match(
  appSource,
  /<RecoverableRenderErrorBoundary[\s\S]*<DevelopmentRenderFault target="workbench" \/>[\s\S]*<WorkbenchStudioPrototype/,
  'the outer boundary must remain above the whole workbench body',
);
assert.match(
  fallbackSource,
  /data-workbench-outer-render-error="true"[\s\S]*<WorkbenchWindowControls language=\{language\} \/>/,
  'the outer fallback must preserve the shared real desktop controls',
);
assert.match(
  fallbackSource,
  /onPrepareExit[\s\S]*reportPersistenceResult[\s\S]*saved: true/,
  'the outer fallback must still answer the desktop close persistence handshake',
);
assert.match(
  workbenchPistonOscillationRealtimeSource,
  /<RecoverableRenderErrorBoundary[\s\S]*area="data-processing"[\s\S]*<PistonOscillationDataProcessingPanel/,
  'data processing must be protected independently of the workbench shell',
);
assert.match(
  workbenchSource,
  /<RecoverableRenderErrorBoundary[\s\S]*area="calculation"[\s\S]*<PistonOscillationCalculationWindow/,
  'calculation must be protected independently of the workbench shell',
);
assert.match(
  workbenchSource,
  /createPortal\([\s\S]*area="calculation"[\s\S]*pistonOscillationContentRenderRecoveryHostRef\.current/,
  "a calculation render failure must be portaled into the piston content region so the surrounding workbench stays visible",
);
assert.match(
  workbenchSource,
  /area="calculation"[\s\S]*onReturnToInstrument=\{\(\) => \{[\s\S]*returnToPistonOscillationInstrumentAfterDisplayError\(\);[\s\S]*retry\(\);/,
  'returning from a calculation render failure must clear the boundary so it cannot keep covering the restored instrument',
);
assert.match(
  workbenchCssSource,
  /\.studio-render-error-calculation\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?inset:\s*0;[\s\S]*?\}/,
  'the calculation fallback must replace only its positioned content host rather than covering the workbench shell',
);
assert.match(
  fallbackSource,
  /重试显示[\s\S]*返回仪器/,
  'a local display failure must expose both recovery actions',
);
assert.match(
  runtimeWorkbenchPistonAcquisitionProcessingActionsSource,
  /returnToPistonOscillationInstrumentAfterDisplayError[\s\S]*setPistonOscillationProcessingSuppressedFileId\(activeFile\.id\)[\s\S]*setPistonOscillationCalculationSuppressedFileId\(activeFile\.id\)[\s\S]*setSelectedPanel\('preview'\)[\s\S]*setLeftCollapsed\(false\)/,
  'returning to the instrument must preserve data while restoring the normal layout',
);
assert.match(
  windowControlsSource,
  /hardSphereLabWindow\?\.minimize[\s\S]*hardSphereLabWindow\?\.toggleMaximize[\s\S]*hardSphereLabWindow\?\.close/,
  'all fallback window buttons must reuse the actual desktop bridge',
);
assert.match(
  developmentFaultSource,
  /hslDevRenderFault[\s\S]*import\.meta\.env\.DEV/,
  'the render fault injector must be development-only',
);
assert.match(
  developmentFaultSource,
  /recoveredTargets[\s\S]*recoverDevelopmentRenderFault/,
  'the injected fault must remain active until the user deliberately retries recovery',
);
assert.match(
  workbenchRealtimeBoundarySource,
  /isDevelopmentRenderFaultRequested\('data-processing'\)[\s\S]*<DevelopmentRenderFault target="data-processing" \/>/,
  'desktop acceptance can deliberately trigger the protected data-processing region',
);

console.log('pistonOscillationRenderRecovery tests passed');

assert.match(workbenchViewShellSource, /import \{ WorkbenchPistonOscillationRealtime \} from '\.\/WorkbenchPistonOscillationRealtime\.tsx';/);
assert.match(workbenchViewShellSource, /import \{ WorkbenchRealtimeBoundary \} from '\.\/WorkbenchRealtimeBoundary\.tsx';/);
