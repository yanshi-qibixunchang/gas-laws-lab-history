import assert from 'node:assert/strict';
import {
  PISTON_OSCILLATION_LANGUAGES,
  PISTON_OSCILLATION_SHELL_COPY,
  getPistonOscillationShellCopy,
} from '../../src/features/pistonOscillation/pistonOscillationCopy.ts';

assert.deepEqual(PISTON_OSCILLATION_LANGUAGES, ['zh-CN', 'zh-TW', 'en']);

for (const language of PISTON_OSCILLATION_LANGUAGES) {
  const copy = getPistonOscillationShellCopy(language);
  assert.equal(copy, PISTON_OSCILLATION_SHELL_COPY[language]);
  assert.ok(copy.experimentName.length > 0);
  assert.ok(copy.methodName.length > 0);
  assert.ok(copy.developmentBadge.length > 0);
  assert.ok(copy.preview.ariaLabel.length > 0);
  assert.ok(copy.preview.title.length > 0);
  assert.ok(copy.preview.body.length > 0);
  assert.ok(copy.realtime.ariaLabel.length > 0);
  assert.ok(copy.realtime.title.length > 0);
  assert.ok(copy.realtime.body.length > 0);
  assert.ok(copy.unavailable.navigationItem.length > 0);
  assert.ok(copy.unavailable.rightSidebar.length > 0);
}

assert.match(PISTON_OSCILLATION_SHELL_COPY['zh-CN'].realtime.title, /开发阶段/);
assert.match(PISTON_OSCILLATION_SHELL_COPY['zh-CN'].realtime.body, /暂不可用/);
assert.match(PISTON_OSCILLATION_SHELL_COPY['zh-TW'].realtime.title, /開發階段/);
assert.match(PISTON_OSCILLATION_SHELL_COPY['zh-TW'].realtime.body, /暫不可用/);
assert.match(PISTON_OSCILLATION_SHELL_COPY.en.realtime.title, /development/i);
assert.match(PISTON_OSCILLATION_SHELL_COPY.en.realtime.body, /unavailable/i);

console.log('pistonOscillationCopy tests passed');
