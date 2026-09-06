import assert from 'node:assert/strict';
import { createWorkbenchSettingsActions, type WorkbenchSettingsActionPorts } from '../../src/features/workbench/workbenchSettingsActions.ts';
import { createDefaultAppExperienceProfile } from '../../src/features/learning/experimentLearningModel.ts';
import type { WorkbenchGeneralSettings } from '../../src/features/workbench/workbenchGeneralSettings.ts';
const createHarness = () => {
  const events: string[] = [];
  const saved: WorkbenchGeneralSettings[] = [];
  const profile = { ...createDefaultAppExperienceProfile('zh-CN'), firstRunCompleted: true };
  const ports: WorkbenchSettingsActionPorts = {
    settingsThemePreference: 'system', settingsLanguagePreference: 'zh-CN', settingsPerformanceMode: 'balanced',
    audioSettings: { enabled: true, volume: 0.7 },
    updateAudioSettings: (settings) => events.push('audio:' + settings.enabled + ':' + settings.volume),
    setSettingsThemePreference: value => events.push('theme:' + value),
    setSettingsLanguagePreference: value => events.push('language:' + value),
    setSettingsPerformanceMode: value => events.push('performance:' + value),
    setSettingsLanguageMenuOpen: value => events.push('menu:' + value),
    readExperienceProfile: () => profile,
    commitExperienceProfile: (next) => { events.push('profile:' + next.committedLanguage); return true; },
    persist: settings => { events.push('save'); saved.push(settings); },
    deferLanguageFocus: () => events.push('focus'),
  };
  return { ports, events, saved, actions: () => createWorkbenchSettingsActions(ports) };
};
{
  const h = createHarness(); h.ports.commitExperienceProfile = () => { h.events.push('profile:failed'); return false; };
  h.actions().updateSettingsLanguagePreference('en');
  assert.deepEqual(h.events, ['profile:failed'], 'a failed tutorial language commit prevents local language and storage updates');
  assert.equal(h.saved.length, 0);
}
{
  const h = createHarness(); h.actions().updateSettingsLanguagePreference('en');
  assert.deepEqual(h.events, ['profile:en', 'language:en', 'menu:false', 'save', 'focus']);
  assert.deepEqual(h.saved[0], { theme: 'system', language: 'en', performanceMode: 'balanced', audioEnabled: true, audioVolume: 0.7 });
}
{
  const h = createHarness(); h.actions().updateSettingsLanguagePreference('zh-CN');
  assert.deepEqual(h.events, ['language:zh-CN', 'menu:false', 'save', 'focus'], 'the already committed language does not repeat profile persistence');
}
{
  const h = createHarness(); h.ports.readExperienceProfile = () => createDefaultAppExperienceProfile('zh-CN');
  h.actions().updateSettingsLanguagePreference('zh-TW');
  assert.equal(h.events[0], 'language:zh-TW', 'uncompleted first-run preferences do not commit a learning milestone');
}
{
  const h = createHarness(); h.actions().updateSettingsThemePreference('dark');
  assert.deepEqual(h.events, ['theme:dark', 'save']);
  assert.deepEqual(h.saved[0], { theme: 'dark', language: 'zh-CN', performanceMode: 'balanced', audioEnabled: true, audioVolume: 0.7 });
}
{
  const h = createHarness(); h.actions().updateSettingsPerformanceMode('highPerformance');
  assert.deepEqual(h.events, ['performance:highPerformance', 'save']);
  assert.equal(h.saved[0].audioVolume, 0.7);
}
{
  const h = createHarness(); h.actions().updateSettingsAudioEnabled(false);
  assert.deepEqual(h.events, ['audio:false:0.7', 'save']);
  assert.equal(h.saved[0].audioEnabled, false);
}
for (const [input, expected] of [[2, 1], [-1, 0], [0.4, 0.4]]) {
  const h = createHarness(); h.actions().updateSettingsAudioVolume(input);
  assert.deepEqual(h.events, ['audio:true:' + expected, 'save']);
  assert.equal(h.saved[0].audioVolume, expected);
}
console.log('Workbench preference actions preserve language gating and save ordering.');
