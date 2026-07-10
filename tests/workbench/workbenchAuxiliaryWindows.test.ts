import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workbenchSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchStudioPrototype.tsx', import.meta.url),
  'utf8',
);
const aboutSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchAboutWindow.tsx', import.meta.url),
  'utf8',
);
const buildNoticeSource = readFileSync(
  new URL('../../src/features/workbench/WorkbenchBuildNoticeWindow.tsx', import.meta.url),
  'utf8',
);
const buildNoticeContractSource = readFileSync(
  new URL('../../src/features/workbench/workbenchBuildNoticeContract.ts', import.meta.url),
  'utf8',
);

assert.match(aboutSource, /interface WorkbenchAboutWindowProps/, 'about window should have a typed presentation boundary');
assert.match(aboutSource, /onCheckUpdates: \(\) => void;/, 'about update checks should remain controller callbacks');
assert.match(aboutSource, /onCheckEnvironment: \(\) => void;/, 'environment checks should remain controller callbacks');
assert.doesNotMatch(aboutSource, /hardSphereLabUpdater|hardSphereLabExporter/, 'about view should not call desktop bridges directly');

assert.match(buildNoticeContractSource, /export interface WorkbenchBuildNoticeSection/, 'build notice content should use an exported section contract');
assert.match(buildNoticeContractSource, /export interface WorkbenchBuildNoticeFilePreview/, 'legal preview state should use a shared contract');
assert.match(buildNoticeSource, /onOpenLegalFile: \(materialId: WorkbenchLegalMaterialId\) => void;/, 'legal file opening should cross an explicit callback boundary');
assert.doesNotMatch(buildNoticeSource, /window\.hardSphereLabLegal/, 'build notice view should not call the desktop legal bridge directly');
assert.match(buildNoticeSource, /from '\.\/workbenchBuildNoticeContract\.ts';/, 'build notice view should depend on the shared contract instead of owning data types');

assert.match(workbenchSource, /onCheckUpdates=\{runAboutUpdateCheck\}/, 'workbench should connect about update behavior');
assert.match(workbenchSource, /onOpenLegalFile=\{openBuildNoticeLegalFile\}/, 'workbench should connect legal file behavior');
assert.doesNotMatch(workbenchSource, /const renderAboutWindow|const renderBuildNoticeWindow/, 'workbench should not retain auxiliary-window JSX renderers');

console.log('workbenchAuxiliaryWindows tests passed');
