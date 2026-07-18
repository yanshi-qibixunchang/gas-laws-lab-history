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

const expectedPreviewStateCopy = {
  'zh-CN': {
    loadingTitle: '正在加载仪器模型',
    loadingBody: '正在从本地实验资源中载入活塞振动装置。',
    loadErrorTitle: '3D 模型加载失败',
    loadErrorBody: '当前实验仍可安全关闭；请检查本地模型文件后重新打开。',
    restoreDefaultView: '默认视角',
  },
  'zh-TW': {
    loadingTitle: '正在載入儀器模型',
    loadingBody: '正在從本機實驗資源中載入活塞振動裝置。',
    loadErrorTitle: '3D 模型載入失敗',
    loadErrorBody: '目前實驗仍可安全關閉；請檢查本機模型檔案後重新開啟。',
    restoreDefaultView: '預設視角',
  },
  en: {
    loadingTitle: 'Loading instrument model',
    loadingBody: 'Loading the piston-oscillation apparatus from local experiment resources.',
    loadErrorTitle: '3D model failed to load',
    loadErrorBody: 'The experiment can be closed safely. Check the local model file, then reopen it.',
    restoreDefaultView: 'Default view',
  },
} as const;

for (const language of PISTON_OSCILLATION_LANGUAGES) {
  const preview = getPistonOscillationShellCopy(language).preview;
  assert.deepEqual(
    {
      loadingTitle: preview.loadingTitle,
      loadingBody: preview.loadingBody,
      loadErrorTitle: preview.loadErrorTitle,
      loadErrorBody: preview.loadErrorBody,
      restoreDefaultView: preview.restoreDefaultView,
    },
    expectedPreviewStateCopy[language],
    `${language} must provide complete loading, error, and reset-view copy`,
  );
}

assert.match(PISTON_OSCILLATION_SHELL_COPY['zh-CN'].realtime.title, /开发阶段/);
assert.match(PISTON_OSCILLATION_SHELL_COPY['zh-CN'].realtime.body, /暂不可用/);
assert.match(PISTON_OSCILLATION_SHELL_COPY['zh-TW'].realtime.title, /開發階段/);
assert.match(PISTON_OSCILLATION_SHELL_COPY['zh-TW'].realtime.body, /暫不可用/);
assert.match(PISTON_OSCILLATION_SHELL_COPY.en.realtime.title, /development/i);
assert.match(PISTON_OSCILLATION_SHELL_COPY.en.realtime.body, /unavailable/i);

console.log('pistonOscillationCopy tests passed');
