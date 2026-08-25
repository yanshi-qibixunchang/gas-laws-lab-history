import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const panelSource = readFileSync(
  new URL('../../src/features/pistonOscillation/PistonOscillationDataProcessingPanel.tsx', import.meta.url),
  'utf8',
);
const panelStyle = readFileSync(
  new URL('../../src/features/pistonOscillation/PistonOscillationDataProcessingPanel.css', import.meta.url),
  'utf8',
);
const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);
const workbenchStyle = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url),
  'utf8',
);

const pointerMoveStart = panelSource.indexOf('const handlePointerMove');
const pointerMoveEnd = panelSource.indexOf('const finishPointerInteraction', pointerMoveStart);
const pointerMoveSource = panelSource.slice(pointerMoveStart, pointerMoveEnd);

assert.match(
  pointerMoveSource,
  /const position = getPointerPosition\(event\);[\s\S]*const currentX = clamp\(position\.x,[\s\S]*setChartDrag\(\(current\) =>[\s\S]*currentX/,
  'pointer coordinates must be captured while the React pointer event still has a currentTarget',
);
assert.doesNotMatch(
  pointerMoveSource,
  /setChartDrag\(\(current\) =>[\s\S]*getPointerPosition\(event\)/,
  'a deferred state updater must not read a released React synthetic event',
);
assert.match(
  pointerMoveSource,
  /chartDrag\.type === 'selection'[\s\S]*timeShift = -\(position\.x - chartDrag\.startX\)[\s\S]*pressureShift = \(position\.y - chartDrag\.startY\)/,
  'the explicit selection mode must stay horizontal while hand mode pans both axes directly',
);
assert.match(
  panelSource,
  /const isHorizontalGesture = Math\.abs\(event\.deltaX\) > Math\.abs\(event\.deltaY\)[\s\S]*const zoomRequested = event\.ctrlKey;[\s\S]*const horizontalPanRequested = isHorizontalGesture && !event\.shiftKey;[\s\S]*if \(!zoomRequested && !horizontalPanRequested\) return;[\s\S]*event\.preventDefault\(\);[\s\S]*event\.stopPropagation\(\);/,
  'plain vertical and Shift-wheel input must reach the page while Ctrl zoom and native horizontal gestures remain chart interactions',
);
assert.match(
  panelSource,
  /if \(zoomRequested\)[\s\S]*zoomFactor[\s\S]*const shift = event\.deltaX \* currentSpan \* 0\.0009;[\s\S]*setViewDomain/,
  'Ctrl + wheel must zoom x while only native horizontal wheel or trackpad gestures pan x',
);
assert.match(
  panelSource,
  /chart\.addEventListener\('wheel', handleNativeWheel, \{ passive: false \}\)/,
  'the chart wheel listener must remain non-passive so only handled gestures can suppress page scrolling',
);
assert.match(
  panelSource,
  /piston-acquisition-actions piston-processing-chart-actions[\s\S]*<Crosshair[\s\S]*<Hand[\s\S]*<Eraser[\s\S]*<Focus/,
  'period processing must reuse the acquisition action shell for its three reviewed chart tools',
);
assert.match(
  panelSource,
  /event\.key === 'Shift'[\s\S]*!event\.repeat[\s\S]*!event\.ctrlKey[\s\S]*!event\.metaKey[\s\S]*!event\.altKey[\s\S]*event\.preventDefault\(\);[\s\S]*current === 'pan' \? 'selection' : 'pan'[\s\S]*event\.key === 'Escape'/,
  'Shift must toggle the chart mode without hijacking modified shortcuts, and Escape must safely return to hand mode',
);
assert.match(
  panelSource,
  /const handleChartKeyDown[\s\S]*chartMode === 'pan'[\s\S]*'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'[\s\S]*event\.key !== 'Enter' && event\.key !== ' '[\s\S]*keyboardAnchorExtremum[\s\S]*selectPeriodRange/,
  'the mandatory range-selection step must have a complete keyboard path for panning and choosing both extrema',
);
assert.match(
  panelSource,
  /role="group"[\s\S]*aria-describedby=\{`\$\{chartId\}-keyboard-help`\}[\s\S]*onKeyDown=\{handleChartKeyDown\}[\s\S]*role="status" aria-live="polite"/,
  'the interactive chart must expose keyboard instructions and selection announcements to assistive technology',
);
assert.match(
  panelSource,
  /aria-describedby=\{`\$\{answerDescriptionId\}-precision \$\{answerDescriptionId\}-feedback`\}[\s\S]*id=\{`\$\{answerDescriptionId\}-precision`\}[\s\S]*id=\{`\$\{answerDescriptionId\}-feedback`\}/,
  'period answer inputs must expose their precision rule and live feedback as accessible descriptions',
);
assert.match(
  panelSource,
  /answerFocusProgressRef[\s\S]*periodInputRef\.current\?\.focus\(\)[\s\S]*nextRunButtonRef\.current\?\.focus\(\)/,
  'successful endpoint and period submissions must move keyboard focus to the newly unlocked action',
);
assert.match(
  panelSource,
  /tick\.value\.toFixed\(3\)[\s\S]*tick\.value\.toFixed\(2\)/,
  'processing chart ticks must keep the sensor-facing three-decimal time and two-decimal pressure formats',
);
assert.match(
  panelSource,
  /INITIAL_OBSERVATION_VIEW_SPAN_S = 0\.2[\s\S]*getInitialTimeDomain[\s\S]*setViewDomain\(getInitialTimeDomain\(record\)\)/,
  'the initial processing viewport must match the reviewed 200 ms observation window without discarding the full record',
);
assert.match(
  panelSource,
  /const sampleMarkerRadius = sampleDensity[\s\S]*sample\.absolutePressureKpa[\s\S]*a \$\{radius\.toFixed\(2\)\}/,
  'ordinary sample markers must be real circular vertices positioned from the quantized observation samples',
);
assert.doesNotMatch(
  panelSource,
  /<button[\s\S]{0,120}role="listitem"/,
  'Run controls must retain their native button semantics',
);
assert.match(
  panelSource,
  /getDefaultPressureDomain\(record\)[\s\S]*setPressureViewDomain\(clampPressureView/,
  'the y-domain must start from the full record and change only through explicit view panning',
);

assert.match(
  workbenchSource,
  /activeFile\.kind !== 'heatCapacityPistonOscillation'[\s\S]*effectiveParametersCollapsed \? \(/,
  'the unavailable Current Parameters rail must stay hidden for piston files',
);
assert.match(
  workbenchSource,
  /activePistonOscillationDataProcessing \? 'studio-center-workspace-piston-processing' : ''/,
  'data processing must mark the center workspace so it can become one continuous canvas',
);
assert.match(
  workbenchStyle,
  /\.studio-center-workspace-piston-processing\s*\{[\s\S]*gap:\s*0;[\s\S]*padding:\s*0;/,
  'the data-processing center workspace must not retain the acquisition card gutters',
);
assert.match(
  workbenchStyle,
  /\.studio-live-workspace-piston-processing > \.studio-dock-panel-realtime\s*\{[\s\S]*overflow:\s*hidden;[\s\S]*border:\s*0;/,
  'the outer realtime dock must not create a second scrollbar or card edge',
);
assert.match(
  panelStyle,
  /\.studio-theme-light \.piston-processing-panel\s*\{[\s\S]*--piston-processing-bg:\s*#ffffff;/,
  'the light processing workspace must use one continuous white background',
);
assert.match(
  panelStyle,
  /\.piston-processing-selection-section,[\s\S]*\.piston-period-calculation-section\s*\{[\s\S]*background:\s*transparent;[\s\S]*border-radius:\s*0;/,
  'processing sections must not reintroduce stacked white cards over the canvas',
);
assert.match(
  panelStyle,
  /\.piston-processing-panel\s*\{[\s\S]*grid-template-rows:\s*repeat\(4, auto\);[\s\S]*align-content:\s*start;/,
  'the chart and calculation areas must use their real content heights instead of overlapping',
);
assert.match(
  panelStyle,
  /\.piston-processing-selection-section\s*\{[\s\S]*grid-template-rows:\s*repeat\(3, auto\);/,
  'the selection section must keep the heading, chart shell, and selection status in normal flow',
);
assert.match(
  panelSource,
  /className="piston-period-chart-viewport"[\s\S]*style=\{\{ aspectRatio: `\$\{chartWidth\} \/ \$\{CHART_HEIGHT\}` \}\}/,
  'the chart viewport must derive its display ratio from the same dimensions as the SVG viewBox',
);
assert.doesNotMatch(
  panelStyle,
  /\.piston-period-chart-wrap\s*\{[^}]*aspect-ratio:\s*2\.5\s*\/\s*1/,
  'the chart shell must not restore the width-driven ratio that created vertical letterboxing',
);
assert.match(
  panelStyle,
  /\.piston-period-chart-wrap\s*\{[\s\S]*grid-template-rows:\s*auto 14px 32px;[\s\S]*\.piston-period-chart-footer\s*\{[\s\S]*grid-template-columns:\s*84px minmax\(0, 1fr\) 84px;[\s\S]*\.piston-processing-chart-actions\s*\{[\s\S]*position:\s*static;[\s\S]*justify-self:\s*start;/,
  'the chart must reserve one compact scrollbar row while keeping the tools and x-axis title in a shared footer',
);
assert.match(
  panelSource,
  /className="piston-period-chart-footer"[\s\S]*piston-processing-chart-actions[\s\S]*className="piston-period-axis-footer-label"\>\{copy\.timeAxis\}/,
  'the compact footer must keep the tools on the left and the localized x-axis title centered',
);
assert.match(
  panelSource,
  /data-piston-chart-horizontal-scrollbar="true"[\s\S]*role="scrollbar"[\s\S]*aria-label=\{copy\.horizontalScrollbar\}[\s\S]*aria-valuemin=\{fullTimeDomain\.startS\}[\s\S]*aria-valuemax=\{fullTimeDomain\.startS \+ horizontalScrollRangeS\}[\s\S]*aria-valuenow=\{effectiveDomain\.startS\}[\s\S]*onScroll=\{handleHorizontalScrollbarScroll\}[\s\S]*horizontalScrollContentScale \* 100/,
  'the curve must expose a synchronized, localized, accessible horizontal scrollbar below the plot',
);
assert.match(
  panelStyle,
  /\.piston-period-horizontal-scrollbar\s*\{[\s\S]*overflow-x:\s*scroll;[\s\S]*scrollbar-color:\s*var\(--piston-processing-border-strong\)[\s\S]*\.piston-period-horizontal-scrollbar:focus-visible[\s\S]*var\(--piston-processing-accent\)/,
  'the horizontal scrollbar must remain visible, keyboard-focusable, and theme-aware',
);
assert.match(
  panelStyle,
  /\.piston-period-selection-info span\s*\{[\s\S]*font-size:\s*13px;/,
  'the three selection measurements must remain legible inside the chart callout',
);
assert.match(
  panelStyle,
  /\.piston-period-sample-markers\s*\{[\s\S]*fill:\s*var\(--piston-processing-accent-strong\);[\s\S]*opacity:\s*0\.78;[\s\S]*\.piston-period-sample-markers\.is-sparse\s*\{[\s\S]*opacity:\s*1;/,
  'quantized observation samples must remain visibly distinct from the connecting polyline',
);
assert.match(
  panelStyle,
  /\.piston-processing-run-list button\.is-active\s*\{[\s\S]*border-color:[\s\S]*background:[\s\S]*0 0 0 1px/,
  'the active curve should use an even outline and balanced shadow',
);
assert.doesNotMatch(
  panelStyle,
  /\.piston-processing-run-list button\.is-active\s*\{[^}]*inset\s+3px\s+0\s+0/,
  'the active curve must not restore a heavy left rail',
);
assert.match(
  panelStyle,
  /\.piston-period-formula\s*\{[\s\S]*border:\s*1px solid var\(--piston-processing-border-strong\)[\s\S]*background:\s*var\(--piston-processing-accent-soft\)/,
  'the period formula should use the approved full thin border and soft fill',
);
assert.doesNotMatch(
  panelStyle,
  /\.piston-period-formula\s*\{[^}]*border-left:/,
  'the period formula must not use a one-sided rule',
);
assert.match(
  panelStyle,
  /\.piston-period-chart-viewport svg\s*\{[\s\S]*cursor:\s*default;[\s\S]*\.piston-period-interaction-surface\s*\{[\s\S]*cursor:\s*grab;[\s\S]*pointer-events:\s*all;[\s\S]*svg\.is-selection \.piston-period-interaction-surface\s*\{[\s\S]*cursor:\s*crosshair;/,
  'only the white plotting rectangle may expose the move or selection cursor; axes and chart margins stay arrow-shaped',
);
assert.match(
  panelSource,
  /className="piston-period-interaction-surface"[\s\S]*x=\{CHART_LEFT\}[\s\S]*y=\{CHART_TOP\}[\s\S]*width=\{plotWidth\}[\s\S]*height=\{plotHeight\}/,
  'the cursor hit surface must exactly match the plotting rectangle',
);
assert.match(
  panelSource,
  /targetCenterInScrollArea[\s\S]*panel\.scrollTo\([\s\S]*behavior:\s*reduceMotion \? 'auto' : 'smooth'/,
  'a calculation reminder must bring its target fully into view before the strong mask appears',
);
assert.match(
  workbenchSource,
  /root\.addEventListener\('scroll', updateLayout, true\);[\s\S]*root\.removeEventListener\('scroll', updateLayout, true\);/,
  'the strong reminder cutout must track its target while the processing workspace scrolls',
);
assert.match(
  workbenchSource,
  /handlePistonOscillationGuideChecklistKeyDown[\s\S]*'ArrowDown'[\s\S]*'ArrowUp'[\s\S]*'Home'[\s\S]*'End'[\s\S]*role="listbox"[\s\S]*aria-activedescendant/,
  'the piston guide checklist must support keyboard review in addition to wheel review',
);
assert.match(
  workbenchSource,
  /event\.key === 'Tab'[\s\S]*querySelectorAll<HTMLElement>[\s\S]*pistonOscillationGuideLessonReturnFocusRef[\s\S]*returnTarget\?\.isConnected/,
  'the modal guide lesson must trap Tab focus and restore the previously focused control',
);
assert.match(
  workbenchSource,
  /fill="var\(--studio-piston-guide-cutout-fill\)"[\s\S]*stroke="var\(--studio-piston-guide-cutout-stroke\)"/,
  'the strong reminder outline must use theme-aware colors',
);
assert.match(
  workbenchStyle,
  /\.studio-theme-light \.studio-piston-guide-strong-mask\s*\{[\s\S]*--studio-piston-guide-cutout-fill:[\s\S]*--studio-piston-guide-cutout-stroke:/,
  'the light theme must provide an explicit strong-reminder palette',
);

console.log('pistonOscillationDataProcessingInteraction tests passed');
