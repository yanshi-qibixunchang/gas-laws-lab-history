import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cssSource = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

const expectToken = (name: string, value: string) => {
  assert.match(
    cssSource,
    new RegExp(`${name}:\\s*${value.replace('#', '\\#')};`),
    `${name} should use the matte engineering palette value ${value}`,
  );
};

expectToken('--studio-bg', '#20242a');
expectToken('--studio-surface', '#242a31');
expectToken('--studio-surface-2', '#2d343d');
expectToken('--studio-surface-3', '#343c46');
expectToken('--studio-border', '#343c46');
expectToken('--studio-border-soft', '#2b323a');
expectToken('--studio-accent', '#4f7fb8');
expectToken('--studio-accent-strong', '#6d95c4');

assert.doesNotMatch(
  cssSource,
  /radial-gradient\(circle at center,\s*rgba\(110,\s*168,\s*254/,
  'global blue radial glow should be removed from the matte engineering style',
);

assert.doesNotMatch(
  cssSource,
  /border-radius:\s*(14|18)px/,
  'large rounded menu/card radii should be removed for a desktop engineering feel',
);

assert.match(
  cssSource,
  /\.studio-console\s*\{[^}]*?overflow:\s*hidden;/,
  'console region should clip overflowing log content instead of covering the status bar',
);

assert.match(
  cssSource,
  /\.studio-status span\s*\{[^}]*?text-overflow:\s*ellipsis;/,
  'status bar labels should ellipsize in narrow viewports',
);

assert.match(
  cssSource,
  /\.studio-file-tabs\s*\{[^}]*?border-bottom:\s*2px solid #151a20;/,
  'top tab strip should use a darker separator so the workspace gap reads clearly',
);

assert.match(
  cssSource,
  /\.studio-current-params\s*\{[^}]*?border-left:\s*2px solid #151a20;[^}]*?border-top:\s*2px solid #151a20;/,
  'right parameter rail should use darker left and top separators against the workspace',
);

assert.match(
  cssSource,
  /\.studio-body\s*\{[^}]*?transition:\s*grid-template-columns 180ms ease-out;/,
  'workbench body should animate the left sidebar grid column when collapsing or expanding',
);

assert.match(
  cssSource,
  /\.studio-sidebar\s*\{[^}]*?transition:\s*transform 180ms cubic-bezier\(0\.2,\s*0\.7,\s*0\.2,\s*1\),\s*opacity 140ms ease-out;/,
  'left sidebar should transition its own slide and fade state',
);

assert.match(
  cssSource,
  /\.studio-left-collapsed \.studio-sidebar\s*\{[^}]*?transform:\s*translateX\(-18px\);[^}]*?opacity:\s*0;/,
  'collapsed left sidebar should slide left and fade out',
);

assert.match(
  cssSource,
  /\.studio-body:not\(\.studio-left-collapsed\) \.studio-sidebar\s*\{[^}]*?animation:\s*studio-left-sidebar-slide-in 180ms/,
  'expanded left sidebar should use a fast slide-in animation',
);

assert.match(
  cssSource,
  /@keyframes studio-left-sidebar-slide-in[\s\S]*?transform:\s*translateX\(-18px\)/,
  'left sidebar slide-in animation should enter from the left',
);

console.log('workbenchMatteVisualStyle tests passed');
