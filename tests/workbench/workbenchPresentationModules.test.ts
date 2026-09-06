const consoleStateHook = readFileSync(new URL('../../src/features/workbench/useWorkbenchConsoleState.ts', import.meta.url), 'utf8');
const consoleStatePresentation = readFileSync(new URL('../../src/features/workbench/workbenchConsoleState.ts', import.meta.url), 'utf8');
const guideMaskPresentation = readFileSync(new URL('../../src/features/workbench/workbenchHeatPreviewGuideMask.ts', import.meta.url), 'utf8');
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createHeatCapacityGuideStrongRectPath,
  createHeatCapacityGuideStrongCutoutPath,
  createHeatCapacityGuideStrongDimPath,
} from '../../src/features/workbench/workbenchHeatCapacityGuideMaskGeometry.ts';
import {
  getHeatCapacityGuideDomCutout,
  getHeatCapacityGuideStrongCutouts,
} from '../../src/features/workbench/workbenchHeatCapacityGuideMaskDom.ts';
import {
  getPistonOscillationGuideRoundedRectPath,
  getPistonOscillationGuideStrongDimPath,
  type PistonOscillationGuideStrongMaskLayout,
} from '../../src/features/workbench/workbenchPistonGuideMaskGeometry.ts';
import { getPistonOscillationGuideStrongMaskLayout } from '../../src/features/workbench/workbenchPistonGuideMaskDom.ts';
import {
  getHeatCapacityGuideChecklistIndex,
  getHeatCapacityGuideStrongTargetSpec,
  HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS,
} from '../../src/features/workbench/workbenchHeatCapacityGuidePresentation.ts';
import {
  getWorkbenchParameterDisplayLabel,
  getWorkbenchParameterDisplayUnit,
  getLocalizedWorkbenchValidationErrors,
  WORKBENCH_PARAMETER_DETAILS,
} from '../../src/features/workbench/workbenchParameterPresentation.ts';
import { workbenchCopies } from '../../src/features/workbench/workbenchStudioCopy.ts';
import { createInitialLogs } from '../../src/features/workbench/workbenchConsolePresentation.ts';
import { resolveWorkbenchConsoleMessage } from '../../src/features/workbench/workbenchConsoleLocalization.ts';

// Paths must retain separate holes and radius clamping without changing the supplied geometry.
const rect = Object.freeze({ id: 'record', shape: 'rect' as const, x: 5, y: 7, width: 10, height: 8, rx: 99 });
const ellipse = Object.freeze({ id: 'gauge', shape: 'ellipse' as const, cx: 30, cy: 40, rx: 6, ry: 4 });
assert.equal(createHeatCapacityGuideStrongRectPath(0, 0, -1, 4), '');
assert.equal(createHeatCapacityGuideStrongRectPath(0, 0, 4, 0), '');
assert.equal(createHeatCapacityGuideStrongRectPath(1, 2, 4, 5), 'M1 2H5V7H1Z');
assert.equal(createHeatCapacityGuideStrongCutoutPath(rect), 'M9 7H11Q15 7 15 11V11Q15 15 11 15H9Q5 15 5 11V11Q5 7 9 7Z');
assert.equal(createHeatCapacityGuideStrongCutoutPath(ellipse), 'M36 40A6 4 0 1 0 24 40A6 4 0 1 0 36 40Z');
assert.equal(createHeatCapacityGuideStrongCutoutPath({ ...ellipse, rx: 0 }), '');
assert.equal(createHeatCapacityGuideStrongDimPath({ width: 100, height: 80 }, [rect, ellipse]),
  `M0 0H100V80H0Z${createHeatCapacityGuideStrongCutoutPath(rect)}${createHeatCapacityGuideStrongCutoutPath(ellipse)}`);

const pistonCutout = Object.freeze({ x: 20, y: 30, width: 40, height: 20, rx: 100 });
const pistonLayout: PistonOscillationGuideStrongMaskLayout = {
  top: 40, width: 600, height: 360, cutout: pistonCutout, contextCutouts: [],
  card: { x: 300, y: 100, width: 232, compact: true },
};
assert.match(getPistonOscillationGuideRoundedRectPath(pistonCutout), /^M 30 30 H 50 Q 60 30 60 40/);
assert.equal((getPistonOscillationGuideStrongDimPath(pistonLayout).match(/M /g) ?? []).length, 2);
assert.equal((getPistonOscillationGuideStrongDimPath({ ...pistonLayout,
  contextCutouts: [{ x: 10, y: 20, width: 60, height: 40, rx: 2 }],
}).match(/M /g) ?? []).length, 2, 'a containing context hole must not duplicate the target');
assert.equal((getPistonOscillationGuideStrongDimPath({ ...pistonLayout,
  contextCutouts: [{ x: 10, y: 20, width: 20, height: 20, rx: 2 }],
}).match(/M /g) ?? []).length, 3, 'partial overlap must keep both complete holes');

const domRect = (left: number, top: number, width: number, height: number) => ({
  left, top, width, height, right: left + width, bottom: top + height,
});
const targetElement = { getBoundingClientRect: () => domRect(95, 45, 40, 30) };
const heatRoot = {
  getBoundingClientRect: () => domRect(100, 50, 100, 80),
  closest: () => ({ querySelector: (selector: string) => selector === '#record' ? targetElement : null }),
} as unknown as HTMLElement;
assert.equal(getHeatCapacityGuideDomCutout(null, { id: 'record', selector: '#record' }, { width: 100, height: 80 }), null);
assert.deepEqual(getHeatCapacityGuideDomCutout(heatRoot, { id: 'record', selector: '#record', padding: 10, rx: 12 }, { width: 100, height: 80 }),
  { id: 'record', shape: 'rect', x: 0, y: 0, width: 45, height: 35, rx: 12 });
const projected = { instrumentDisplay: rect };
assert.strictEqual(getHeatCapacityGuideStrongCutouts(getHeatCapacityGuideStrongTargetSpec('pressureZero'), projected, null, { width: 100, height: 80 })[0], rect,
  'projected scene holes retain identity');
assert.deepEqual(getHeatCapacityGuideStrongCutouts(getHeatCapacityGuideStrongTargetSpec(null), {}, null, { width: 100, height: 80 }),
  [{ id: 'centerViewport', shape: 'rect', x: 33, y: 25.6, width: 34, height: 20.8, rx: 14 }]);

// The DOM adapter must undo ancestor scaling and preserve the processing-area header rule.
const makePistonRoot = (scale: number, processing = false) => {
  const elements = new Map<string, unknown>([
    ['[data-piston-guide-target="primary"]', { getBoundingClientRect: () => domRect(100 + 50 * scale, 40 + 100 * scale, 80 * scale, 30 * scale) }],
  ]);
  return {
    clientWidth: 600, clientHeight: 400, offsetWidth: 600, offsetHeight: 400,
    getBoundingClientRect: () => domRect(100, 40, 600 * scale, 400 * scale),
    classList: { contains: (value: string) => processing && value === 'studio-live-workspace-piston-processing' },
    querySelector: (selector: string) => elements.get(selector) ?? null,
    querySelectorAll: (selector: string) => selector === '.studio-dock-header'
      ? [{ getBoundingClientRect: () => domRect(100, 40, 600 * scale, 40 * scale) }]
      : [],
  } as unknown as HTMLElement;
};
const normalMask = getPistonOscillationGuideStrongMaskLayout(makePistonRoot(1), 'primary');
assert.ok(normalMask);
assert.deepEqual(getPistonOscillationGuideStrongMaskLayout(makePistonRoot(2), 'primary'), normalMask,
  'CSS-scaled workspaces must produce the same local geometry and card placement');
assert.deepEqual(normalMask.cutout, { x: 40, y: 50, width: 100, height: 50, rx: 8 });
assert.equal(normalMask.top, 40);
const processingMask = getPistonOscillationGuideStrongMaskLayout(makePistonRoot(1, true), 'primary');
assert.equal(processingMask?.top, 0);
assert.equal(processingMask?.cutout.y, 90);
assert.equal(getPistonOscillationGuideStrongMaskLayout(makePistonRoot(1), 'settings'), null);
assert.equal(getPistonOscillationGuideStrongMaskLayout(makePistonRoot(0), 'primary'), null);

assert.equal(getHeatCapacityGuideChecklistIndex('completed'), HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS.length - 1);
for (const [index, step] of HEAT_CAPACITY_GUIDE_CHECKLIST_STEPS.entries()) {
  assert.equal(getHeatCapacityGuideChecklistIndex(step.guideStep), index);
}
const row = Object.freeze({ key: 'N', label: 'N', value: '500', unit: 'particles', editable: true });
assert.equal(getWorkbenchParameterDisplayUnit(row, 'zh-CN'), '个');
assert.equal(getWorkbenchParameterDisplayUnit(row, 'zh-TW'), '個');
assert.equal(getWorkbenchParameterDisplayUnit(row, 'en'), 'particles');
assert.equal(getWorkbenchParameterDisplayLabel(row, workbenchCopies['zh-CN']), workbenchCopies['zh-CN'].parameters.parameterLabels.N);
assert.equal(WORKBENCH_PARAMETER_DETAILS.N.symbol[0], 'N');
assert.deepEqual(getLocalizedWorkbenchValidationErrors(['N must be greater than 0.', 'unrecognized'], 'zh-CN'), ['N 必须大于 0。', 'unrecognized']);
const logs = createInitialLogs('en');
assert.deepEqual(logs.map(log => log.kind), ['info', 'success', 'success', 'warning']);
assert.equal(resolveWorkbenchConsoleMessage(logs[0], 'zh-CN'), workbenchCopies['zh-CN'].logs.initialized);

const workbench = readFileSync(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
for (const moduleName of ['workbenchParameterPresentation', 'workbenchPanelDefinitions']) {
  assert.match(workbench, new RegExp(`from '\\./${moduleName}\\.tsx?'`), `${moduleName} must remain wired to the live shell`);
}
console.log('workbenchPresentationModules tests passed');

const pistonGuideOwner = readFileSync(new URL('../../src/features/workbench/useWorkbenchPistonGuideRuntime.ts', import.meta.url), 'utf8');
assert.match(pistonGuideOwner, /from '\.\/workbenchPistonGuideMaskDom\.ts'/, 'Piston guide runtime owns the live mask geometry binding');
assert.match(workbench, /useWorkbenchPistonController\(\{/);

assert.match(guideMaskPresentation, /from '\.\/workbenchHeatCapacityGuideMaskGeometry\.ts'/); assert.match(workbench, /deriveWorkbenchHeatPreviewGuideMask\(\{/);

assert.match(consoleStatePresentation, /from '\.\/workbenchConsolePresentation\.ts'/); assert.match(consoleStateHook, /from '\.\/workbenchConsoleState\.ts'/); assert.match(workbench, /useWorkbenchConsoleState\(\{/);
