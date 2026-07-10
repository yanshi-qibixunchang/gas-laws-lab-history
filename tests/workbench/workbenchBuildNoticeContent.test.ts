import assert from 'node:assert/strict';
import {
  buildNoticeLegalMaterialFiles,
  buildNoticeSections,
} from '../../src/features/workbench/workbenchBuildNoticeContent.ts';

const languages = ['zh-CN', 'zh-TW', 'en'] as const;
const expectedMaterialIds = Object.keys(buildNoticeLegalMaterialFiles).sort();
const canonicalSectionIds = buildNoticeSections['zh-CN'].map((section) => section.id);

assert.deepEqual(Object.keys(buildNoticeSections), languages, 'build notice content should define all supported languages in stable order');
assert.equal(new Set(canonicalSectionIds).size, canonicalSectionIds.length, 'build notice section ids should be unique');

for (const language of languages) {
  const sections = buildNoticeSections[language];
  assert.deepEqual(
    sections.map((section) => section.id),
    canonicalSectionIds,
    `${language} should preserve the canonical section order`,
  );
  assert.ok(sections.every((section) => section.title && section.eyebrow && section.paragraphs.length > 0), `${language} sections should contain display copy`);

  const materialIds = sections.flatMap((section) => section.materials?.map((material) => material.id) ?? []).sort();
  assert.deepEqual(materialIds, expectedMaterialIds, `${language} should expose every registered legal material exactly once`);
}

assert.equal(buildNoticeLegalMaterialFiles.chromium.largeFile, true, 'large Chromium notices should remain external-file only');
assert.equal(buildNoticeLegalMaterialFiles.dependencies.previewKind, 'html', 'generated dependency notices should retain HTML preview metadata');

console.log('workbenchBuildNoticeContent tests passed');
