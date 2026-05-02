import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const stateSource = readFileSync(new URL('../components/workbenchState.ts', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

assert.match(
  stateSource,
  /export interface WorkbenchIdealWindowLayout/,
  'ideal files should store per-file result window layout state',
);
assert.match(
  stateSource,
  /IDEAL_RESULT_HEIGHT_RATIO\s*=\s*0\.5/,
  'ideal result window should default to half height',
);
assert.match(
  stateSource,
  /idealWindowLayout:\s*createDefaultIdealWindowLayout\(\)/,
  'new ideal files should receive default ideal result child window layout',
);

assert.match(
  source,
  /IDEAL_RESULT_WINDOW_DEFAULTS_STORAGE_KEY/,
  'workbench should define a localStorage key for saved ideal result window defaults',
);
assert.match(
  source,
  /loadIdealResultWindowDefaults/,
  'workbench should load ideal result window defaults from localStorage',
);
assert.match(
  source,
  /saveCurrentIdealResultWindowLayoutAsDefault/,
  'Settings should save the current ideal result window layout as the global default',
);
assert.match(
  source,
  /openIdealResultWindow/,
  'workbench should open ideal Points and Verification tabs through a dedicated path',
);
assert.doesNotMatch(
  source,
  /focusIdealResultWindow/,
  'clicking inside the tabbed result window should not swap foreground layers',
);
assert.match(
  source,
  /startIdealResultWindowResize/,
  'ideal child result windows should have a mouse resize handler',
);
assert.match(
  source,
  /idealResultWindowRegionRef/,
  'ideal child result window resize should measure the usable result window region, not the padded center workspace',
);
assert.match(
  source,
  /clamp\(nextRatio,\s*IDEAL_RESULT_MIN_HEIGHT_RATIO,\s*IDEAL_RESULT_MAX_HEIGHT_RATIO\)/,
  'ideal child result window resize should clamp height between one-quarter and full workspace height',
);
assert.match(
  source,
  /createEditSnapshot\('resized ideal result window'\)[\s\S]*?pushUndoSnapshot\(snapshot\)/,
  'resizing an ideal child result window should enter undo history once with the pre-drag snapshot',
);

assert.match(
  cssSource,
  /\.studio-ideal-result-window-resizer[\s\S]*?cursor:\s*ns-resize/,
  'ideal result window should expose a normal vertical resize affordance on its top edge',
);
assert.match(
  source,
  /className="studio-results-tabs studio-ideal-results-tabs"[\s\S]*?role="tablist"/,
  'ideal result window should render its tabs as the same full-width tab row used by standard Results',
);
assert.match(
  cssSource,
  /\.studio-ideal-results-region[\s\S]*?position:\s*absolute/,
  'ideal result window should occupy the bottom workspace as an absolute layer',
);
assert.match(
  cssSource,
  /\.studio-ideal-results-region[\s\S]*?inset:\s*10px/,
  'ideal result window should be sized inside the usable workspace inset so it does not touch hidden workspace edges',
);
assert.match(
  cssSource,
  /\.studio-ideal-result-window-layer[\s\S]*?left:\s*0[\s\S]*?right:\s*0[\s\S]*?bottom:\s*0/,
  'ideal result window should span the full usable result region width',
);
assert.doesNotMatch(
  cssSource,
  /\.studio-ideal-result-window-layer[\s\S]*?min-height:\s*180px/,
  'ideal result window should not force a pixel minimum that can exceed the available workspace height',
);

console.log('workbenchIdealResultStacking tests passed');
