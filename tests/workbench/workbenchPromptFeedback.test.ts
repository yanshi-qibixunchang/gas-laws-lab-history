import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readSource = (relativePath: string) => readFileSync(
  new URL(`../../${relativePath}`, import.meta.url),
  'utf8',
);

const feedbackSource = readSource('src/components/prompts/PromptFeedback.tsx');
const feedbackStyles = readSource('src/components/prompts/PromptFeedback.css');
const feedbackPolicySource = readSource('src/components/prompts/promptFeedbackPolicy.ts');
const feedbackCopySource = readSource('src/components/prompts/promptFeedbackCopy.ts');
const tooltipSource = readSource('src/components/prompts/PromptTooltipProvider.tsx');
const tooltipStyles = readSource('src/components/prompts/PromptTooltipProvider.css');
const appSource = readSource('src/app/App.tsx');
const workbenchSource = readSource('src/features/workbench/WorkbenchStudioPrototype.tsx');
const workbenchStyles = readSource('src/features/workbench/WorkbenchStudioPrototype.css');
const simulationCanvasSource = readSource('src/components/SimulationCanvas.tsx');
const buildNoticeSource = readSource('src/features/workbench/WorkbenchBuildNoticeWindow.tsx');
const calculationWindowSource = readSource('src/features/heatCapacity/HeatCapacityCalculationWindow.tsx');

assert.match(
  feedbackPolicySource,
  /PromptFeedbackKind = 'success' \| 'info' \| 'warning' \| 'danger'/,
  'shared feedback policy should define the four formal status levels',
);
assert.match(feedbackPolicySource, /PROMPT_TOAST_MAX_VISIBLE = 4/, 'toast stacks should have an explicit maximum count');
assert.match(
  feedbackPolicySource,
  /PROMPT_TOAST_DURATION_MS = \{[\s\S]*short:\s*2000[\s\S]*standard:\s*2600[\s\S]*extended:\s*6200/,
  'short, standard, and extended toast durations should be centralized',
);
assert.match(
  feedbackPolicySource,
  /PROMPT_FEEDBACK_PRIORITY:[\s\S]*success:\s*0[\s\S]*info:\s*1[\s\S]*warning:\s*2[\s\S]*danger:\s*3/,
  'danger messages should outrank warning, info, and success messages',
);
assert.match(feedbackSource, /CheckCircle2[\s\S]*Info[\s\S]*AlertTriangle[\s\S]*ShieldAlert/, 'each feedback level should have a distinct icon');
assert.match(feedbackSource, /\.sort\([\s\S]*PROMPT_FEEDBACK_PRIORITY[\s\S]*\.slice\(0, maxVisible\)/, 'the shared region should sort by priority and cap the visible stack');
assert.match(feedbackSource, /role=\{assertive \? 'alert' : 'status'\}/, 'danger should be assertive while ordinary feedback remains a polite status');
assert.match(feedbackSource, /aria-live=\{assertive \? 'assertive' : 'polite'\}/, 'toast announcements should expose matching live-region behavior');
assert.match(feedbackSource, /message\.onDismiss && message\.closeLabel/, 'dismiss buttons should only appear for dismissible messages with localized labels');
assert.match(feedbackStyles, /\.prompt-toast-region\s*\{[\s\S]*width:\s*min\(360px,[\s\S]*pointer-events:\s*none/, 'toast position, maximum width, and pass-through stack behavior should be shared');
assert.match(feedbackStyles, /\.prompt-toast\[data-prompt-feedback-kind='success'\]/, 'success toast styling should be explicit');
assert.match(feedbackStyles, /\.prompt-toast\[data-prompt-feedback-kind='warning'\]/, 'warning toast styling should be explicit');
assert.match(feedbackStyles, /\.prompt-toast\[data-prompt-feedback-kind='danger'\]/, 'danger toast styling should be explicit');
assert.match(feedbackStyles, /@media \(max-width:\s*520px\)/, 'shared feedback should adapt to small windows');
assert.match(feedbackStyles, /@media \(prefers-reduced-motion:\s*reduce\)/, 'shared feedback should honor reduced motion');
assert.doesNotMatch(feedbackStyles, /(?:linear|radial)-gradient|backdrop-filter/, 'formal feedback surfaces should stay solid and unblurred');

assert.match(feedbackCopySource, /'zh-CN':[\s\S]*'zh-TW':[\s\S]*en:/, 'feedback labels should cover Simplified Chinese, Traditional Chinese, and English');
assert.match(appSource, /<PromptTooltipProvider>[\s\S]*<PromptPersistentBanner[\s\S]*<\/PromptTooltipProvider>/, 'the app should mount one global tooltip provider around persistent feedback and the workbench frame');
assert.match(appSource, /<WorkbenchAspectFrame>/, 'the global provider should retain the existing workbench frame around gated startup content');
assert.match(appSource, /dataAttributes=\{\{ 'data-workbench-persistence-safe-mode': 'true' \}\}/, 'safe-mode persistence recovery should use the shared persistent banner without changing its state contract');

assert.match(tooltipSource, /const tooltipSelector = '\[data-prompt-tooltip\]'/, 'internal tooltips should use one delegated target contract');
assert.match(tooltipSource, /MutationObserver[\s\S]*attributeFilter:\s*\['title'\]/, 'runtime native titles should be promoted even when mounted later');
assert.match(tooltipSource, /element instanceof HTMLIFrameElement\) return;/, 'iframe title attributes should remain available as semantic accessible names');
assert.match(tooltipSource, /element\.dataset\.promptTooltip = nativeTitle[\s\S]*element\.removeAttribute\('title'\)/, 'native titles should be replaced instead of duplicated');
assert.match(tooltipSource, /addEventListener\('pointerover'[\s\S]*addEventListener\('focusin'[\s\S]*addEventListener\('keydown'/, 'tooltips should support pointer, keyboard focus, and Escape handling');
assert.match(tooltipSource, /event\.key !== 'Escape'[\s\S]*hideTooltip\(0\)/, 'Escape should immediately close an active tooltip');
assert.match(tooltipSource, /target\.setAttribute\('aria-describedby'[\s\S]*target\.removeAttribute\('aria-describedby'\)/, 'tooltips should attach and restore accessible descriptions');
assert.match(tooltipSource, /Math\.min\([\s\S]*Math\.max\(edge, centeredLeft\)[\s\S]*viewportWidth - tooltipRect\.width - edge/, 'tooltip positions should clamp to viewport edges');
assert.match(tooltipSource, /fitsAbove \? 'top' : 'bottom'/, 'tooltips should flip below controls when the top edge has insufficient space');
assert.match(tooltipSource, /studio-theme-light[\s\S]*\? 'light'[\s\S]*: 'dark'/, 'tooltips should follow the active app theme');
assert.match(tooltipSource, /role="tooltip"/, 'the internal tooltip surface should expose the tooltip role');
assert.match(tooltipStyles, /max-width:\s*min\(280px, calc\(100vw - 16px\)\)/, 'tooltip copy should wrap within a bounded viewport-safe width');
assert.match(tooltipStyles, /\.prompt-tooltip\[data-prompt-theme='light'\]/, 'the tooltip surface should define a light-theme treatment');
assert.match(tooltipStyles, /@media \(prefers-reduced-motion:\s*reduce\)/, 'tooltip animation should honor reduced motion');
assert.doesNotMatch(tooltipStyles, /(?:linear|radial)-gradient|backdrop-filter/, 'tooltips should use a solid non-glass surface');

assert.match(simulationCanvasSource, /data-prompt-tooltip=\{isPanMode \? t\.tooltips\.rotateMode : t\.tooltips\.panMode\}/, 'canvas mode help should use the internal tooltip');
assert.match(simulationCanvasSource, /data-prompt-tooltip=\{t\.tooltips\.resetCamera\}/, 'camera reset help should use the internal tooltip');
assert.match(buildNoticeSource, /<iframe[\s\S]*title=\{activeMaterial\.title\}/, 'embedded legal material should retain its semantic iframe title');
assert.match(calculationWindowSource, /data-prompt-tooltip=\{disabled \? copy\.futureGroup : undefined\}/, 'disabled calculation actions should use the internal tooltip');
assert.match(workbenchSource, /data-prompt-tooltip=\{windowControlCopy\.minimize\}/, 'desktop window controls should use the internal tooltip');
assert.match(workbenchSource, /data-prompt-tooltip=\{file\.name\}/, 'file tabs should use the internal tooltip');

assert.match(
  workbenchSource,
  /data-heat-capacity-pressure-warning="true"[\s\S]*data-prompt-feedback-kind="danger"[\s\S]*data-prompt-feedback-persistent="true"[\s\S]*role="alert"/,
  'the pressure over-limit alarm should remain persistent and scoped inside the experiment viewport',
);
assert.match(
  workbenchSource,
  /data-heat-capacity-demo-complete-toast="true"[\s\S]*data-prompt-feedback-kind="success"[\s\S]*role="status"/,
  'teaching completion feedback should keep its viewport scope while sharing formal status semantics',
);
assert.match(workbenchStyles, /Unified prompt feedback semantics: teaching and alarms keep their original scope/, 'viewport-specific feedback should document its retained scope');
assert.match(workbenchStyles, /\.studio-heat-pressure-warning\s*\{[\s\S]*aspect-ratio:\s*auto[\s\S]*background:\s*var\(--prompt-feedback-surface\)[\s\S]*backdrop-filter:\s*none/, 'pressure alarms should use a compact solid formal surface');
assert.match(workbenchStyles, /\.studio-heat-demo-step-panel,[\s\S]*background:\s*var\(--prompt-teaching-surface\)[\s\S]*backdrop-filter:\s*none/, 'teaching cards should share formal typography, layers, and solid surface tokens');

console.log('workbenchPromptFeedback tests passed');
