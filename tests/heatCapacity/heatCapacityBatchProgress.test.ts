import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentSource = readFileSync(join(
  process.cwd(),
  'src',
  'features',
  'heatCapacity',
  'HeatCapacityBatchProgress.tsx',
), 'utf8');
const styleSource = readFileSync(join(
  process.cwd(),
  'src',
  'features',
  'heatCapacity',
  'HeatCapacityBatchProgress.css',
), 'utf8');

assert.match(
  componentSource,
  /currentGroup:\s*number;[\s\S]*targetGroupCount:\s*number \| null;[\s\S]*onRestartBatch:\s*\(\) => void;[\s\S]*language:\s*WorkbenchLanguagePreference;/,
  'batch progress should expose the approved props-driven API',
);
assert.match(
  componentSource,
  /if \(!isConfiguredTarget\(targetGroupCount\)\) return null;/,
  'an unconfigured batch should not render a progress control',
);
assert.match(
  componentSource,
  /'zh-CN':[\s\S]*第 \$\{current\} \/ \$\{target\} 组[\s\S]*'zh-TW':[\s\S]*en:/,
  'the current/target group label should be localized in all workbench languages',
);
assert.match(
  componentSource,
  /aria-haspopup="menu"[\s\S]*aria-expanded=\{menuOpen\}/,
  'the ellipsis trigger should expose menu semantics',
);
assert.match(
  componentSource,
  /if \(!restartPending\)[\s\S]*setRestartPending\(true\)[\s\S]*onRestartBatch\(\)/,
  'restarting a batch should require an inline second confirmation',
);
assert.match(
  componentSource,
  /data-heat-capacity-batch-restart=\{restartPending \? 'confirm' : 'request'\}/,
  'the restart action should expose its confirmation phase for integration tests',
);
assert.match(
  componentSource,
  /rootRef\.current\?\.contains\(target\)\) return;[\s\S]*closeMenu\(\);/,
  'pointer events inside the control or trigger should not count as outside clicks',
);
assert.match(
  componentSource,
  /document\.addEventListener\('pointerdown', handlePointerDown\)/,
  'outside pointer presses should close the menu',
);
assert.match(
  componentSource,
  /event\.key !== 'Escape'[\s\S]*closeMenu\(true\)/,
  'Escape should close the menu and restore trigger focus',
);
assert.match(
  componentSource,
  /const closeMenu =[\s\S]*setMenuOpen\(false\);[\s\S]*setRestartPending\(false\);/,
  'every close path should also clear the temporary restart confirmation',
);

assert.match(
  styleSource,
  /\.studio-heat-batch-progress\s*\{[\s\S]*height:\s*28px;[\s\S]*backdrop-filter:\s*blur\(9px\);/,
  'batch progress should match the compact glass treatment of the Default View control',
);
assert.match(
  styleSource,
  /\.studio-heat-batch-progress-menu\s*\{[\s\S]*top:\s*calc\(100% \+ 6px\);[\s\S]*right:\s*0;/,
  'the action menu should align below the top-right progress control',
);
assert.match(
  styleSource,
  /\.studio-theme-light \.studio-heat-batch-progress\s*\{/,
  'the control should provide the same light-theme adaptation as other preview overlays',
);

console.log('heatCapacityBatchProgress tests passed');
