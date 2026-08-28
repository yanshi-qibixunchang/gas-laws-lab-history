import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PROMPT_FEEDBACK_COPY } from '../../src/components/prompts/promptFeedbackCopy.ts';

const readSource = (relativePath: string) => readFileSync(
  new URL(`../../${relativePath}`, import.meta.url),
  'utf8',
);

const feedbackSource = readSource('src/components/prompts/PromptFeedback.tsx');
const feedbackStyles = readSource('src/components/prompts/PromptFeedback.css');
const feedbackPolicySource = readSource('src/components/prompts/promptFeedbackPolicy.ts');
const feedbackCopySource = readSource('src/components/prompts/promptFeedbackCopy.ts');
const viewportFeedbackSource = readSource('src/components/prompts/PromptViewportFeedback.tsx');
const viewportFeedbackStyles = readSource('src/components/prompts/PromptViewportFeedback.css');
const noticeDialogStyles = readSource('src/components/prompts/PromptNoticeDialog.css');
const viewportFeedbackControllerSource = readSource('src/components/prompts/promptViewportFeedbackController.ts');
const tooltipSource = readSource('src/components/prompts/PromptTooltipProvider.tsx');
const tooltipStyles = readSource('src/components/prompts/PromptTooltipProvider.css');
const appSource = readSource('src/app/App.tsx');
const workbenchSource = readSource('src/features/workbench/WorkbenchStudioPrototype.tsx');
const windowControlsSource = readSource('src/features/workbench/WorkbenchWindowControls.tsx');
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
assert.deepEqual(
  {
    'zh-CN': PROMPT_FEEDBACK_COPY['zh-CN'].kindLabels,
    'zh-TW': PROMPT_FEEDBACK_COPY['zh-TW'].kindLabels,
    en: PROMPT_FEEDBACK_COPY.en.kindLabels,
  },
  {
    'zh-CN': { success: '成功', info: '信息', warning: '警告', danger: '危险' },
    'zh-TW': { success: '成功', info: '資訊', warning: '警告', danger: '危險' },
    en: { success: 'Success', info: 'Information', warning: 'Warning', danger: 'Danger' },
  },
  'shared status labels should remain explicit and complete in all three supported languages',
);

assert.match(
  viewportFeedbackControllerSource,
  /PROMPT_VIEWPORT_FEEDBACK_PRIORITY:[\s\S]*info:\s*0[\s\S]*success:\s*0[\s\S]*warning:\s*1[\s\S]*danger:\s*2/,
  'the viewport queue should retain the four shared levels and escalate warning and danger',
);
assert.match(
  viewportFeedbackControllerSource,
  /durationMs:\s*options\.durationMs\s*\?\?\s*PROMPT_TOAST_DURATION_MS\.short/,
  'viewport feedback should reuse the shared short-duration token by default',
);
assert.match(
  viewportFeedbackControllerSource,
  /resolvePromptViewportFeedbackShow[\s\S]*resolvePromptViewportFeedbackAdvance[\s\S]*resolvePromptViewportFeedbackClear/,
  'show, leave/advance, and scoped clear behavior should live in one shared viewport controller',
);

assert.match(
  viewportFeedbackSource,
  /import type \{ PromptFeedbackKind \} from '\.\/promptFeedbackPolicy\.ts'/,
  'the shared viewport surface should consume the same four-level policy as global feedback',
);
assert.match(
  viewportFeedbackSource,
  /data-prompt-viewport-feedback="true"[\s\S]*data-prompt-feedback-kind=\{kind\}/,
  'viewport feedback should expose stable shared semantics for hosts and tests',
);
assert.match(
  viewportFeedbackSource,
  /const assertive = kind === 'danger'[\s\S]*role=\{assertive \? 'alert' : 'status'\}[\s\S]*aria-live=\{assertive \? 'assertive' : 'polite'\}[\s\S]*aria-atomic="true"/,
  'danger should interrupt assistive technology while ordinary viewport feedback remains a polite atomic status',
);
assert.match(
  viewportFeedbackSource,
  /prompt-viewport-feedback-kicker">\{label\}<\/span>/,
  'viewport hosts should pass the localized shared level label into the common surface',
);
assert.match(
  viewportFeedbackSource,
  /durationMs - PROMPT_VIEWPORT_FEEDBACK_EXIT_DURATION_MS/,
  'the shared component should derive its exit point from the requested visible duration',
);

assert.match(
  viewportFeedbackStyles,
  /\.prompt-viewport-feedback\s*\{[\s\S]*--prompt-viewport-feedback-tone:\s*var\(--prompt-accent[\s\S]*--prompt-viewport-feedback-border:\s*var\(--prompt-accent-border/,
  'info viewport feedback should use the shared accent tone and border tokens',
);
assert.match(
  viewportFeedbackStyles,
  /\.prompt-viewport-feedback-success\s*\{[\s\S]*var\(--prompt-success[\s\S]*var\(--prompt-success-border/,
  'success viewport feedback should use the shared success tokens',
);
assert.match(
  viewportFeedbackStyles,
  /\.prompt-viewport-feedback-warning\s*\{[\s\S]*var\(--prompt-warning[\s\S]*var\(--prompt-warning-border/,
  'warning viewport feedback should use the shared warning tokens',
);
assert.match(
  viewportFeedbackStyles,
  /\.prompt-viewport-feedback-danger\s*\{[\s\S]*var\(--prompt-danger[\s\S]*var\(--prompt-danger-border/,
  'danger viewport feedback should use the shared danger tokens',
);
assert.doesNotMatch(
  viewportFeedbackStyles,
  /border-left:/,
  'shared viewport feedback should use an even semantic border instead of a left rail',
);
assert.match(
  viewportFeedbackStyles,
  /background:\s*color-mix\([\s\S]*box-shadow:[\s\S]*0 0 0 1px/,
  'shared viewport feedback should use the approved soft fill and balanced outline',
);
assert.match(
  noticeDialogStyles,
  /\.prompt-notice-details\s*\{[\s\S]*border:\s*1px solid var\(--prompt-tone-border\)[\s\S]*background:\s*color-mix/,
  'global notice details should use the same full-border emphasis surface',
);
assert.doesNotMatch(noticeDialogStyles, /border-left:/, 'global notice details should not restore a left rail');
assert.match(
  viewportFeedbackStyles,
  /animation:[\s\S]*promptViewportFeedbackIn[\s\S]*promptViewportFeedbackOut[\s\S]*--prompt-viewport-feedback-exit-delay/,
  'viewport feedback should pair a shared entrance with a timer-delayed exit',
);
assert.match(viewportFeedbackStyles, /@keyframes promptViewportFeedbackIn/, 'the shared entrance keyframes should be explicit');
assert.match(viewportFeedbackStyles, /@keyframes promptViewportFeedbackOut/, 'the shared exit keyframes should be explicit');
assert.match(
  viewportFeedbackStyles,
  /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*animation-duration:\s*1ms\s*!important/,
  'viewport feedback should retain enter/leave semantics without prolonged motion when reduced motion is requested',
);
assert.doesNotMatch(
  viewportFeedbackStyles,
  /(?:linear|radial)-gradient|backdrop-filter/,
  'shared viewport feedback should use the same solid formal surface language as global feedback',
);

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
assert.match(windowControlsSource, /data-prompt-tooltip=\{copy\.minimize\}/, 'desktop window controls should use the internal tooltip');
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
assert.match(workbenchStyles, /\.studio-heat-pressure-warning\s*\{[\s\S]*aspect-ratio:\s*auto[\s\S]*background:\s*color-mix\([\s\S]*backdrop-filter:\s*none/, 'pressure alarms should use a compact symmetric formal surface');
assert.doesNotMatch(workbenchStyles, /\.studio-heat-pressure-warning\s*\{[^}]*border-left:/, 'pressure alarms should not use a heavy left rail');
assert.match(workbenchStyles, /\.studio-heat-demo-complete-toast\s*\{[\s\S]*background:\s*color-mix\([\s\S]*0 0 0 1px/, 'completion feedback should use the approved balanced success surface');
assert.match(workbenchStyles, /\.studio-heat-demo-step-panel,[\s\S]*background:\s*var\(--prompt-teaching-surface\)[\s\S]*backdrop-filter:\s*none/, 'teaching cards should share formal typography, layers, and solid surface tokens');
assert.match(workbenchStyles, /--studio-heat-guide-step-fade-start:\s*rgba\(48, 57, 67, 0\.98\)/, 'dark guide fades should begin with the solid teaching-card surface color');
assert.match(workbenchStyles, /--studio-heat-guide-step-fade-end:\s*rgba\(48, 57, 67, 0\)/, 'dark guide fades should become transparent without changing hue');
assert.match(workbenchStyles, /\.studio-heat-guide-step-fade-top\s*\{[^}]*var\(--studio-heat-guide-step-fade-start\)[^}]*var\(--studio-heat-guide-step-fade-end\)/, 'the upper guide fade should use the theme-aware guide surface tokens');
assert.match(workbenchStyles, /\.studio-heat-guide-step-fade-bottom\s*\{[^}]*var\(--studio-heat-guide-step-fade-start\)[^}]*var\(--studio-heat-guide-step-fade-end\)/, 'the lower guide fade should use the theme-aware guide surface tokens');
assert.match(workbenchStyles, /\.studio-heat-guide-step-header\s*\{[^}]*background:\s*var\(--prompt-teaching-surface\)/, 'dark guide headers should join the body into one continuous teaching-card surface');
assert.match(workbenchStyles, /\.studio-theme-light \.studio-heat-guide-step-header\s*\{[^}]*background:\s*var\(--prompt-surface-muted\)/, 'the already-approved light guide header treatment should remain unchanged');
assert.doesNotMatch(workbenchStyles, /\.studio-heat-guide-step-fade-(?:top|bottom)\s*\{[^}]*rgba\(15, 23, 42/, 'guide fades must not restore the obsolete darker navy band');

console.log('workbenchPromptFeedback tests passed');
