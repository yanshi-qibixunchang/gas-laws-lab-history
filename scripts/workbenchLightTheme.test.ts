import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../components/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

assert.match(
  source,
  /const resolvedWorkbenchTheme = settingsThemePreference === 'system' \? 'dark' : settingsThemePreference;/,
  'system theme should resolve to the current dark UI while light mode is being developed',
);

assert.match(
  source,
  /className=\{`studio-workbench studio-theme-\$\{resolvedWorkbenchTheme\}`\}/,
  'workbench root should expose the resolved theme as a CSS class',
);

assert.match(
  styles,
  /\.studio-theme-light \{[\s\S]*?--studio-bg: #[0-9a-fA-F]{6};[\s\S]*?--studio-surface: #[0-9a-fA-F]{6};[\s\S]*?--studio-text: #[0-9a-fA-F]{6};[\s\S]*?\}/,
  'light theme should define the core Workbench color variables',
);

for (const selector of [
  '.studio-theme-light .studio-menu',
  '.studio-theme-light .studio-command-menu',
  '.studio-theme-light .studio-file-menu',
  '.studio-theme-light .studio-file-menu-button:hover',
  '.studio-theme-light .studio-file-menu-confirm:hover',
  '.studio-theme-light .studio-file-menu-cancel:hover',
  '.studio-theme-light .studio-left-rail',
  '.studio-theme-light .studio-right-rail',
  '.studio-theme-light .studio-empty-workbench',
  '.studio-theme-light .studio-command-button:hover',
  '.studio-theme-light .studio-command-button-active',
  '.studio-theme-light .studio-command-menu .studio-window-switch-on',
  '.studio-theme-light .studio-command-menu .studio-window-switch-off',
  '.studio-theme-light .studio-command-menu .studio-window-switch-locked',
  '.studio-theme-light .studio-command-menu .studio-window-switch-locked.studio-window-switch-on',
  '.studio-theme-light .studio-settings-window',
  '.studio-theme-light .studio-settings-shortcuts-card',
  '.studio-theme-light .studio-current-params',
  '.studio-theme-light .studio-current-params-locked .studio-current-params-body',
  '.studio-theme-light .studio-sidebar',
  '.studio-theme-light .studio-dock-panel',
  '.studio-theme-light .studio-live-workspace-resizer',
  '.studio-theme-light .studio-console',
  '.studio-theme-light .studio-console-summary',
  '.studio-theme-light .studio-console-summary > div',
  '.studio-theme-light .studio-console-summary-wide',
  '.studio-theme-light .studio-status',
  '.studio-theme-light .studio-realtime-summary div',
  '.studio-theme-light .studio-ideal-point-strip div',
  '.studio-theme-light .studio-results-toolbar',
  '.studio-theme-light .studio-results-tabs',
  '.studio-theme-light .studio-ideal-results-card',
  '.studio-theme-light .studio-ideal-results-status-grid div',
  '.studio-theme-light .studio-ideal-export-actions button:disabled',
  '.studio-theme-light .studio-table-action-confirm:hover',
  '.studio-theme-light .studio-table-action-cancel:hover',
  '.studio-theme-light .studio-results-subheader .studio-results-clear-confirm:hover',
  '.studio-theme-light .studio-results-subheader .studio-results-clear-cancel:hover',
  '.studio-theme-light .studio-ideal-relation-buttons button',
  '.studio-theme-light .studio-ideal-relation-buttons button:disabled',
  '.studio-theme-light .studio-ideal-variable-card',
  '.studio-theme-light .studio-ideal-scan-derived small',
  '.studio-theme-light .studio-ideal-preset-trigger:disabled',
  '.studio-theme-light .studio-param-row-editing input',
  '.studio-theme-light .studio-param-edit-button:hover',
  '.studio-theme-light .studio-param-save-button:hover',
  '.studio-theme-light .studio-ideal-chart-card',
  '.studio-theme-light .simulation-canvas-workbench-tool',
  '.studio-theme-light .simulation-canvas-workbench-hint-pill',
]) {
  assert.match(styles, new RegExp(selector.replaceAll('.', '\\.')), `light theme should cover ${selector}`);
}

console.log('workbenchLightTheme tests passed');
