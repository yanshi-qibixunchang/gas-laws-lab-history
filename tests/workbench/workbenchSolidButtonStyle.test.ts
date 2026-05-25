import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.css', import.meta.url), 'utf8');

assert.match(css, /--studio-action-neutral-bg:/, 'Workbench should define a solid neutral action background token');
assert.match(css, /--studio-action-primary-bg:/, 'Workbench should define a solid primary action background token');
assert.match(css, /--studio-action-warning-bg:/, 'Workbench should define a solid warning action background token');
assert.match(css, /\.studio-update-secondary\s*\{[\s\S]*?background:\s*var\(--studio-action-neutral-bg\)/, 'Update secondary buttons should use solid neutral fill');
assert.match(css, /\.studio-update-primary\s*\{[\s\S]*?background:\s*var\(--studio-action-primary-bg\)/, 'Update primary buttons should use solid primary fill');
assert.match(css, /\.studio-heat-advanced-risk-window \.studio-heat-advanced-primary\s*\{[\s\S]*?background:\s*var\(--studio-action-warning-bg\)/, 'Advanced risk confirmation should use warning fill');
assert.match(css, /\.studio-heat-advanced-risk-window strong\s*\{[\s\S]*?color:\s*var\(--studio-action-warning-bg\)|color:\s*#[0-9a-fA-F]{6}/, 'Advanced risk title should use a warning color');

console.log('workbenchSolidButtonStyle tests passed');
