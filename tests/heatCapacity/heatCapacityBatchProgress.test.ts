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
  /currentExperiment:\s*number;[\s\S]*targetExperimentCount:\s*number \| null;[\s\S]*groupStatus:[\s\S]*onRestartExperiment:\s*\(\) => void;[\s\S]*onRestartGroup:\s*\(\) => void;[\s\S]*onAbandonDraft:\s*\(\) => void;[\s\S]*onStartNextGroup:\s*\(\) => void;/,
  'batch progress should expose the approved props-driven API',
);
assert.match(
  componentSource,
  /if \(!isConfiguredTarget\(targetExperimentCount\)\) return null;/,
  'an unconfigured experiment group should not render a progress control',
);
assert.match(
  componentSource,
  /'zh-CN':[\s\S]*第 \$\{current\} \/ \$\{target\} 次实验[\s\S]*'zh-TW':[\s\S]*en:/,
  'the current/target experiment label should be localized in all workbench languages',
);
assert.match(
  componentSource,
  /aria-haspopup="menu"[\s\S]*aria-expanded=\{menuOpen\}/,
  'the ellipsis trigger should expose menu semantics',
);
assert.match(
  componentSource,
  /groupStatus === 'completed'[\s\S]*data-heat-capacity-next-experiment-group="true"[\s\S]*onClick=\{onStartNextGroup\}/,
  'a completed group should replace the ellipsis action with the next-group button',
);
assert.match(
  componentSource,
  /groupStatus === 'draft'[\s\S]*onAbandonDraft\(\)[\s\S]*data-heat-capacity-group-action="restart-experiment"[\s\S]*onRestartExperiment\(\)[\s\S]*data-heat-capacity-group-action="restart-group"[\s\S]*onRestartGroup\(\)/,
  'draft groups should be abandonable while collecting groups expose separate experiment and group restart actions',
);
assert.match(
  componentSource,
  /restartExperiment:\s*\(current: number\)[\s\S]*restartGroup:[\s\S]*role="separator"/,
  'the menu should clearly distinguish the current-experiment restart from the destructive whole-group restart',
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
  /const closeMenu =[\s\S]*setMenuOpen\(false\);/,
  'every close path should clear the temporary menu state',
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
assert.match(
  styleSource,
  /\.studio-heat-batch-progress-menu \.studio-heat-batch-progress-danger[\s\S]*\.studio-theme-light \.studio-heat-batch-progress-menu \.studio-heat-batch-progress-danger/,
  'the whole-group restart should retain a destructive treatment in both themes',
);

console.log('heatCapacityBatchProgress tests passed');
