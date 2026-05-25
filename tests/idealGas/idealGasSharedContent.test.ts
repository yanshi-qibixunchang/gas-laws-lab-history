import assert from 'node:assert/strict';
import {
  getIdealFailureReasonText,
  getIdealHistoryContent,
  getIdealRecommendationText,
} from '../../src/domain/idealGas/idealGasExperiment.ts';

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
console.log('idealGasSharedContent tests passed');
