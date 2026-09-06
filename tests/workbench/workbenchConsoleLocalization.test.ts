const workbenchViewShellSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url), 'utf8');
import { readFileSync as readWorkbenchViewSource } from 'node:fs';
const workbenchConsoleSource = readWorkbenchViewSource(new URL('../../src/features/workbench/WorkbenchConsole.tsx', import.meta.url), 'utf8');
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  materializeWorkbenchConsoleMessage,
  normalizeWorkbenchConsoleMessageTranslations,
  resolveWorkbenchConsoleMessage,
} from '../../src/features/workbench/workbenchConsoleLocalization.ts';

const localized = materializeWorkbenchConsoleMessage(
  (language) => ({
    'zh-CN': '简体消息',
    'zh-TW': '繁體訊息',
    en: 'English message',
  })[language],
  'en',
);

assert.equal(localized.message, 'English message');
assert.equal(resolveWorkbenchConsoleMessage(localized, 'zh-CN'), '简体消息');
assert.equal(resolveWorkbenchConsoleMessage(localized, 'zh-TW'), '繁體訊息');
assert.equal(resolveWorkbenchConsoleMessage(localized, 'en'), 'English message');

const legacy = materializeWorkbenchConsoleMessage('legacy raw message', 'zh-CN');
assert.equal(resolveWorkbenchConsoleMessage(legacy, 'en'), 'legacy raw message');

assert.deepEqual(
  normalizeWorkbenchConsoleMessageTranslations({
    'zh-CN': '简体消息',
    'zh-TW': '繁體訊息',
    en: 'English message',
  }),
  localized.messages,
);
assert.equal(normalizeWorkbenchConsoleMessageTranslations({ 'zh-CN': 'missing languages' }), null);

const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);
assert.match(
  workbenchSource,
  /const pushLog = \(message: WorkbenchConsoleMessageInput,[\s\S]*?createConsoleLog\(current\.length \+ 1, kind, message, settingsLanguagePreference\)/,
  'console entries should materialize every localized message factory when they are appended',
);
assert.match(
  workbenchConsoleSource,
  /resolveWorkbenchConsoleMessage\(consoleSummary\.latest, settingsLanguagePreference\)/,
  'the summary latest-message row should resolve against the current language',
);
assert.match(
  workbenchConsoleSource,
  /resolveWorkbenchConsoleMessage\(log, settingsLanguagePreference\)/,
  'every visible console row should resolve against the current language',
);

console.log('workbenchConsoleLocalization tests passed');

assert.match(workbenchViewShellSource, /import \{ WorkbenchConsole \} from '\.\/WorkbenchConsole\.tsx';/);
