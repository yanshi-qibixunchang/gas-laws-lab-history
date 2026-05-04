import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const studioSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const stateSource = readFileSync(new URL('../components/workbenchState.ts', import.meta.url), 'utf8');
const sessionSource = readFileSync(new URL('../components/workbenchSession.ts', import.meta.url), 'utf8');
const resultsSource = readFileSync(new URL('../components/workbenchResults.ts', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

assert.match(
  stateSource,
  /liveWorkspaceSplitRatio: number;/,
  'WorkbenchFileState should store the 3D / Realtime split ratio per file',
);

assert.match(
  stateSource,
  /WORKBENCH_LIVE_SPLIT_DEFAULT_RATIO = 0\.48/,
  'live workspace default split should make Realtime Data wider than before',
);

assert.match(
  stateSource,
  /WORKBENCH_LIVE_SPLIT_MIN_RATIO = 0\.34/,
  'live workspace split should have a minimum clamp',
);

assert.match(
  stateSource,
  /WORKBENCH_LIVE_SPLIT_MAX_RATIO = 0\.66/,
  'live workspace split should have a maximum clamp',
);

assert.match(
  sessionSource,
  /liveWorkspaceSplitRatio: clampWorkbenchLiveSplitRatio\(file\.liveWorkspaceSplitRatio\)/,
  'session encode/decode should preserve and clamp split ratio',
);

assert.match(
  studioSource,
  /WORKBENCH_LAYOUT_DEFAULTS_STORAGE_KEY = 'hsl_workbench_layout_defaults_v1'/,
  'generic workbench layout defaults should use their own storage key',
);

assert.match(
  studioSource,
  /standard: \{[\s\S]*?resultsHeightRatio[\s\S]*?liveWorkspaceSplitRatio/,
  'standard default layout should store result height and split ratio',
);

assert.match(
  studioSource,
  /ideal: \{[\s\S]*?resultsHeightRatio[\s\S]*?liveWorkspaceSplitRatio/,
  'ideal default layout should store result height and split ratio',
);

assert.match(
  studioSource,
  /createDefaultStandardFile\(index, workbenchLayoutDefaults\.standard\)/,
  'new standard files should apply saved standard layout defaults',
);

assert.match(
  studioSource,
  /createDefaultIdealFile\(index, workbenchLayoutDefaults\.ideal\)/,
  'new ideal files should apply saved ideal layout defaults',
);

assert.match(
  studioSource,
  /const startLiveWorkspaceResize = \(event: React\.PointerEvent<HTMLButtonElement>\) => \{/,
  '3D / Realtime splitter should have a pointer drag handler',
);

assert.match(
  studioSource,
  /className="studio-live-workspace-resizer"/,
  '3D / Realtime splitter should render between the two live panels',
);

assert.match(
  styles,
  /\.studio-live-workspace \{[\s\S]*?calc\(var\(--studio-live-preview-ratio, 48%\) - 4px\)[\s\S]*?calc\(var\(--studio-live-realtime-ratio, 52%\) - 4px\)/,
  'live workspace CSS should divide the full available width into 48/52 columns',
);

assert.match(
  studioSource,
  /const availableWidth = workspaceRect\.width - resizerWidth;/,
  'drag math should use the available content width after subtracting the splitter',
);

assert.match(
  studioSource,
  /\(clientX - workspaceRect\.left - resizerWidth \/ 2\) \/ availableWidth/,
  'drag math should compute the split from the pointer position instead of accumulating deltas',
);

assert.match(
  styles,
  /\.studio-live-workspace-resizer/,
  'live workspace splitter should have CSS styling',
);

assert.match(
  resultsSource,
  /export type WorkbenchExportLanguage = 'zh-CN' \| 'zh-TW' \| 'en';/,
  'export helpers should accept the Workbench language preference',
);

assert.match(
  resultsSource,
  /createWorkbenchFigureSpecs = \([\s\S]*?language: WorkbenchExportLanguage = 'en'/,
  'figure specs should receive a language parameter',
);

assert.match(
  resultsSource,
  /createWorkbenchExportPayload = \([\s\S]*?language: WorkbenchExportLanguage = 'en'/,
  'export payload should receive a language parameter',
);

assert.match(
  studioSource,
  /createWorkbenchFigureSpecs\(activeFile, settingsLanguagePreference\)/,
  'rendered figure specs should follow current Workbench language',
);

assert.match(
  studioSource,
  /createWorkbenchExportPayload\(activeFile, mode, settingsLanguagePreference\)/,
  'export payload should follow current Workbench language',
);

console.log('workbenchLayoutExport tests passed');
