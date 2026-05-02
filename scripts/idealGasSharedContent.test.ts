import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getIdealFailureReasonText,
  getIdealHistoryContent,
  getIdealRecommendationText,
} from '../utils/idealGasExperiment.ts';

const standaloneSource = readFileSync(new URL('../components/IdealGasExperimentMode.tsx', import.meta.url), 'utf8');

const history = getIdealHistoryContent('zh-CN', 'pv');
assert.equal(history.title, '玻意耳-马略特定律');
assert.ok(history.discovery.includes('压强与体积成反比'));
assert.ok(history.simulation.includes('P-1/V'));

assert.equal(
  getIdealFailureReasonText('insufficient_points', 'zh-CN'),
  '数据点还不够，至少需要完成一轮覆盖不同取值的采样。',
);
assert.ok(
  getIdealRecommendationText('insufficient_range', 'notYet', 'pn', 'zh-CN').includes('更小 N 或更大 N'),
  'P-N insufficient range recommendation should mention extending particle-count coverage',
);
assert.ok(
  getIdealRecommendationText(null, 'verified', 'pt', 'en-GB').includes('supports the pressure-temperature relation'),
  'verified P-T recommendation should have relation-specific English copy',
);
assert.match(
  standaloneSource,
  /getIdealHistoryContent\(lang,\s*historyModalRelation\)/,
  'standalone ideal mode should consume shared history content',
);
assert.match(
  standaloneSource,
  /calculateLinearRegression\(/,
  'standalone ideal mode should consume shared regression helper',
);
assert.match(
  standaloneSource,
  /getSharedRelationXValue\(relation,\s*point\)/,
  'standalone ideal mode should consume shared relation x helper',
);

console.log('idealGasSharedContent tests passed');
