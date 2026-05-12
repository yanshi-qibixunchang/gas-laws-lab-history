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
const verificationPvLayout = getRuleBody('.studio-verification-layout-pv');
const verificationSingleLayout = getRuleBody('.studio-verification-layout-single');
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

assert.match(
  verificationPanel,
  /min-height:\s*0/,
  'Verification panel should allow the fixed internal workspace to size inside the result window',
);

assert.match(
  source,
  /<div className=\{`studio-verification-main-layout \$\{isPvVerification \? 'studio-verification-layout-pv' : 'studio-verification-layout-single'\}`\}>[\s\S]*?<div className="studio-verification-chart-column">[\s\S]*?<section className="studio-verification-chart-section studio-verification-chart-primary">[\s\S]*?renderIdealValidationChart\(idealAnalysis\)[\s\S]*?<div className="studio-verification-side">[\s\S]*?studio-result-status[\s\S]*?studio-analysis-grid[\s\S]*?<\/div>/,
  'Verification window should lay out chart content on the left and status metrics on the right',
);

assert.match(
  source,
  /\{renderVerificationPanel\(\)\}[\s\S]*?studio-ideal-history-locked[\s\S]*?studio-ideal-export-actions/,
  'History and Export should remain outside the local Verification two-column layout',
);

assert.match(
  verificationLayout,
  /display:\s*grid/,
  'Verification local layout should use a grid container',
);

assert.match(
  verificationPvLayout,
  /grid-template-columns:\s*minmax\(440px,\s*1fr\)\s+minmax\(340px,\s*0\.82fr\)/,
  'P-V Verification local layout should use chart-left and status-right columns on desktop',
);

assert.match(
  verificationSingleLayout,
  /grid-template-columns:\s*minmax\(460px,\s*1\.12fr\)\s+minmax\(340px,\s*0\.88fr\)/,
  'Single-chart Verification local layout should use chart-left and status-right columns on desktop',
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
  /min-height:\s*0/,
  'Verification chart sections should allow the variant-specific chart sizing rules to fit the window',
);

assert.match(
  getRuleBody('.studio-verification-layout-single .studio-verification-chart-primary'),
  /min-height:\s*300px/,
  'Single-chart Verification layout should reserve enough vertical space for the chart',
);

assert.match(
  getRuleBody('.studio-verification-layout-pv .studio-verification-chart-primary'),
  /min-height:\s*210px/,
  'P-V Verification primary chart should keep a visible compact chart block',
);

assert.match(
  getRuleBody('.studio-verification-layout-pv .studio-verification-chart-secondary'),
  /min-height:\s*190px/,
  'P-V Verification secondary chart should keep a visible compact chart block',
);

assert.match(
  getRuleBody('.studio-verification-chart-section .studio-ideal-chart-card'),
  /height:\s*100%/,
  'Verification chart card should fill its variant-sized chart section',
);

assert.match(
  getRuleBody('.studio-verification-layout-pv .studio-verification-chart-primary .studio-ideal-chart-card svg'),
  /min-height:\s*116px/,
  'P-V Verification chart SVGs should remain compact inside the left-column preview',
);

console.log('workbenchVerificationChartVisibility tests passed');
