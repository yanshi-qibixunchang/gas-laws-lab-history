import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cssSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');
const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');

assert.match(
  source,
  /'--studio-ideal-scan-progress':\s*`\$\{scanProgressPercent\}%`/,
  'ideal scan slider should pass its value as a CSS progress percentage',
);
assert.match(
  source,
  /scanSliderThumbHover/,
  'ideal scan slider should track whether the pointer is hovering the thumb',
);
assert.match(
  source,
  /scanSliderDragging/,
  'ideal scan slider should track whether the thumb is being dragged',
);
assert.match(
  source,
  /isPointerOnIdealScanThumb/,
  'ideal scan slider should distinguish thumb hover from track hover',
);

assert.match(
  cssSource,
  /\.studio-ideal-scan-slider::?-webkit-slider-runnable-track[\s\S]*?background:\s*var\(--studio-ideal-scan-track-background\)/,
  'ideal scan slider should use a stable custom WebKit track background',
);
assert.match(
  cssSource,
  /\.studio-ideal-scan-slider::?-webkit-slider-runnable-track[\s\S]*?height:\s*5\.2px/,
  'ideal scan slider should use a 5.2px WebKit track',
);
assert.match(
  cssSource,
  /\.studio-ideal-scan-slider:hover::?-webkit-slider-runnable-track[\s\S]*?background:\s*var\(--studio-ideal-scan-track-background\)/,
  'hovering the ideal scan slider track should keep the WebKit track background unchanged',
);
assert.match(
  cssSource,
  /--studio-ideal-scan-thumb:\s*#2f9aaa/,
  'ideal scan slider should define a custom default thumb colour',
);
assert.match(
  cssSource,
  /\.studio-ideal-scan-slider::?-webkit-slider-thumb[\s\S]*?background:\s*var\(--studio-ideal-scan-thumb-current\)/,
  'ideal scan slider WebKit thumb should use the current thumb colour variable',
);
assert.match(
  cssSource,
  /\.studio-ideal-scan-slider::?-webkit-slider-thumb[\s\S]*?width:\s*13px[\s\S]*?height:\s*13px/,
  'ideal scan slider should use a 13px WebKit thumb by default',
);
assert.match(
  cssSource,
  /\.studio-ideal-scan-slider-thumb-hover[\s\S]*?--studio-ideal-scan-fill-current:\s*var\(--studio-ideal-scan-fill-hover\)/,
  'hovering the ideal scan slider thumb should make the filled track use the hover colour',
);
assert.match(
  cssSource,
  /\.studio-ideal-scan-slider-thumb-hover[\s\S]*?--studio-ideal-scan-thumb-current:\s*var\(--studio-ideal-scan-thumb-hover\)/,
  'hovering the ideal scan slider thumb should make the thumb use the hover colour',
);
assert.match(
  cssSource,
  /\.studio-ideal-scan-slider-dragging::?-webkit-slider-thumb[\s\S]*?width:\s*15\.6px[\s\S]*?height:\s*15\.6px/,
  'dragging the ideal scan slider should grow the WebKit thumb to 15.6px',
);
assert.match(
  cssSource,
  /\.studio-ideal-scan-slider::?-moz-range-track[\s\S]*?background:\s*var\(--studio-ideal-scan-track-background\)/,
  'ideal scan slider should use a stable custom Firefox track background',
);
assert.match(
  cssSource,
  /\.studio-ideal-scan-slider::?-moz-range-track[\s\S]*?height:\s*5\.2px/,
  'ideal scan slider should use a 5.2px Firefox track',
);
assert.match(
  cssSource,
  /\.studio-ideal-scan-slider:hover::?-moz-range-track[\s\S]*?background:\s*var\(--studio-ideal-scan-track-background\)/,
  'hovering the ideal scan slider track should keep the Firefox track background unchanged',
);
assert.match(
  cssSource,
  /\.studio-ideal-scan-slider::?-moz-range-thumb[\s\S]*?width:\s*13px[\s\S]*?height:\s*13px/,
  'ideal scan slider should use a 13px Firefox thumb by default',
);
assert.match(
  cssSource,
  /\.studio-ideal-scan-slider-dragging::?-moz-range-thumb[\s\S]*?width:\s*15\.6px[\s\S]*?height:\s*15\.6px/,
  'dragging the ideal scan slider should grow the Firefox thumb to 15.6px',
);

console.log('workbenchIdealScanSliderHover tests passed');
