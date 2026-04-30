import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cssSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

const getRuleBody = (selector: string) => {
  for (const match of cssSource.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(',').map((item) => item.trim());
    if (selectors.includes(selector)) return match[2];
  }

  return '';
};

const expectRadius = (selector: string, message: string) => {
  assert.match(
    getRuleBody(selector),
    /border-radius:\s*8px/,
    message,
  );
};

expectRadius(
  '.studio-ideal-results-card-header button',
  'clear buttons in ideal results card headers should be rounded',
);
expectRadius(
  '.studio-panel-lock-button',
  'locked panel badges should be rounded',
);
expectRadius(
  '.studio-param-file .studio-param-state',
  'current-parameter state badges should be rounded',
);
expectRadius(
  '.studio-param-row input',
  'right-side parameter edit inputs should be rounded',
);
expectRadius(
  '.studio-ideal-relation-buttons button',
  'ideal-gas relation buttons should be rounded',
);
expectRadius(
  '.studio-ideal-scan-input',
  'ideal-gas scan variable value input should be rounded',
);
expectRadius(
  '.studio-ideal-preset-trigger',
  'sampling preset selected result trigger should be rounded',
);
expectRadius(
  '.studio-param-errors',
  'parameter validation error boxes should be rounded',
);
expectRadius(
  '.studio-export-actions button',
  'standard export buttons should be rounded',
);
expectRadius(
  '.studio-ideal-export-actions button',
  'ideal export buttons should be rounded',
);
expectRadius(
  '.studio-figure-row em',
  'figure status badges should be rounded',
);
expectRadius(
  '.studio-panel-actions button',
  'panel tool buttons should be rounded',
);

assert.doesNotMatch(
  getRuleBody('.studio-ideal-preset-menu'),
  /border-radius:/,
  'sampling preset dropdown menu should stay rectangular',
);

console.log('workbenchRoundedControls tests passed');
