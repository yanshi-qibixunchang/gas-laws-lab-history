import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cssSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');
const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');

const getRuleBody = (selector: string) => {
  for (const match of cssSource.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(',').map((item) => item.trim());
    if (selectors.includes(selector)) return match[2];
  }

  return '';
};

const childWindowBody = getRuleBody('.studio-ideal-child-window-body');
const verificationPanel = getRuleBody('.studio-verification-panel');
const verificationLayout = getRuleBody('.studio-verification-main-layout');
const verificationSide = getRuleBody('.studio-verification-side');
const verificationSideGrid = getRuleBody('.studio-verification-side .studio-analysis-grid');

assert.match(
  childWindowBody,
  /overflow:\s*auto/,
  'the ideal child window body should own scrolling for Verification content',
);

assert.doesNotMatch(
  verificationPanel,
  /height:\s*calc\(100%\s*-\s*36px\)/,
  'Verification panel must not force itself shorter than the child window body',
);

assert.doesNotMatch(
  verificationPanel,
  /overflow:\s*auto/,
  'Verification panel must not create a nested scroll area that clips the chart',
);

assert.doesNotMatch(
  verificationPanel,
  /min-height:\s*0/,
  'Verification panel must contribute its chart height to the outer grid flow',
);

assert.match(
  source,
  /<div className="studio-verification-main-layout">[\s\S]*?<div className="studio-verification-chart-column">[\s\S]*?<section className="studio-verification-chart-section">[\s\S]*?renderIdealValidationChart\(idealAnalysis\)[\s\S]*?<div className="studio-verification-side">[\s\S]*?studio-result-status[\s\S]*?studio-analysis-grid[\s\S]*?<\/div>/,
  'Verification window should lay out chart content on the left and status metrics on the right',
);

assert.match(
  source,
  /\{renderVerificationPanel\(\)\}[\s\S]*?studio-ideal-history-locked[\s\S]*?studio-ideal-export-actions/,
  'History and Export should remain outside the local Verification two-column layout',
);

assert.match(
  verificationLayout,
  /grid-template-columns:\s*minmax\(420px,\s*1fr\)\s+minmax\(360px,\s*0\.9fr\)/,
  'Verification local layout should use chart-left and status-right columns on desktop',
);

assert.match(
  verificationSideGrid,
  /grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  'Verification metrics on the right should render as one parameter per row',
);

assert.match(
  verificationSide,
  /align-content:\s*start/,
  'Verification right-side status area should keep rows compact instead of stretching',
);

assert.match(
  getRuleBody('.studio-verification-chart-section'),
  /min-height:\s*160px/,
  'Verification chart sections should keep a visible chart-sized block in the outer scroll flow',
);

assert.match(
  getRuleBody('.studio-verification-chart-section .studio-ideal-chart-card'),
  /height:\s*168px/,
  'Verification chart card should use a compact fixed preview height',
);

assert.match(
  getRuleBody('.studio-verification-chart-section .studio-ideal-chart-card svg'),
  /height:\s*140px/,
  'Verification chart SVG should not grow from its intrinsic aspect ratio',
);

assert.match(
  getRuleBody('.studio-verification-chart-section .studio-ideal-chart-card svg'),
  /min-height:\s*140px/,
  'Verification chart SVG should be compact inside the left-column preview',
);

console.log('workbenchVerificationChartVisibility tests passed');
