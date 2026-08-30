import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const releaseNotes = JSON.parse(
  readFileSync(new URL('../../docs/releases/release-notes.json', import.meta.url), 'utf8'),
) as {
  schemaVersion?: number;
  app?: string;
  releases?: Array<{
    version?: string;
    date?: string;
    channel?: string;
    download?: { releasePage?: string; windowsInstaller?: string };
    summary?: Record<string, string>;
    sections?: Array<{
      type?: string;
      title?: Record<string, string>;
      items?: Array<{
        scope?: string;
        importance?: string;
        title?: Record<string, string>;
        body?: Record<string, string>;
      }>;
    }>;
  }>;
};
const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
  version?: string;
};
const releaseMetadataScript = readFileSync(new URL('../../scripts/writeReleaseMetadata.cjs', import.meta.url), 'utf8');
const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
const readmeZhCn = readFileSync(new URL('../../README.zh-CN.md', import.meta.url), 'utf8');
const readmeZhTw = readFileSync(new URL('../../README.zh-TW.md', import.meta.url), 'utf8');
const buildNoticeZhCn = readFileSync(new URL('../../docs/build-notice-zh-CN.md', import.meta.url), 'utf8');

const {
  getReleaseMetadataForVersion,
  getReleaseMetadataForUpdateInfo,
  getLatestReleasePageUrl,
  isAllowedManualDownloadUrl,
  isTransientUpdateError,
  MAX_DOWNLOAD_ATTEMPTS,
} = require('../../electron/updaterMetadata.cjs') as {
  getReleaseMetadataForVersion: (version: string) => {
    manualDownloadUrl: string | null;
    releasePageUrl: string | null;
    releaseSummary: Record<string, string> | null;
    releaseSections: Array<{ type: string; title: Record<string, string>; items: unknown[] }> | null;
  };
  getReleaseMetadataForUpdateInfo: (info: {
    version?: string;
    releaseNotes?: string | Array<{ version?: string; note?: string } | string>;
    releaseSummary?: Record<string, string> | null;
    releaseSections?: Array<{ type: string; title: Record<string, string>; items: unknown[] }> | null;
    releasePageUrl?: string | null;
    manualDownloadUrl?: string | null;
  }) => {
    manualDownloadUrl: string | null;
    releasePageUrl: string | null;
    releaseSummary: Record<string, string> | null;
    releaseSections: Array<{ type: string; title: Record<string, string>; items: unknown[] }> | null;
    releaseNotes: string | null;
  };
  getLatestReleasePageUrl: () => string | null;
  isAllowedManualDownloadUrl: (url: string | null | undefined) => boolean;
  isTransientUpdateError: (error: unknown) => boolean;
  MAX_DOWNLOAD_ATTEMPTS: number;
};

const locales = ['zh-CN', 'zh-TW', 'en'];
const findRelease = (version: string) => releaseNotes.releases?.find((release) => release.version === version);

assert.equal(releaseNotes.schemaVersion, 1, 'release notes should declare schema version 1');
assert.equal(releaseNotes.app, 'hard-sphere-lab', 'release notes should be scoped to this app');
assert.ok(Array.isArray(releaseNotes.releases) && releaseNotes.releases.length > 0, 'release notes should contain releases');
assert.equal(packageJson.version, '6.3.1', 'next desktop update release should bump package version to 6.3.1');
assert.match(readme, /latest published desktop release is `v6\.3\.1`/, 'English README should name the current public release');
assert.match(readmeZhCn, /当前已公开发布的桌面稳定版是 `v6\.3\.1`/, 'Simplified Chinese README should name the current public release');
assert.match(readmeZhTw, /目前已公開發佈的桌面穩定版是 `v6\.3\.1`/, 'Traditional Chinese README should name the current public release');
assert.match(buildNoticeZhCn, /当前项目版本：6\.3\.1。/, 'the reviewed build notice should name the current project version');

const currentRelease = findRelease(packageJson.version ?? '');
assert.equal(releaseNotes.releases[0]?.version, packageJson.version, 'latest release notes entry should match package.json version');
assert.ok(currentRelease, `release notes should include the ${packageJson.version} desktop update release`);
for (const locale of locales) {
  assert.ok(currentRelease.summary?.[locale]?.trim(), `${packageJson.version} release summary should include ${locale}`);
}
assert.equal(
  currentRelease.download?.releasePage,
  `https://github.com/yanshi-qibixunchang/gas-laws-lab-release/releases/tag/v${packageJson.version}`,
  `${packageJson.version} release page should be published in the public release repository`,
);
assert.equal(
  currentRelease.download?.windowsInstaller,
  `https://github.com/yanshi-qibixunchang/gas-laws-lab-release/releases/download/v${packageJson.version}/heat-capacity-lab-setup-${packageJson.version}.exe`,
  `${packageJson.version} installer should be published in the public release repository`,
);
const currentItems = currentRelease.sections?.flatMap((section) => section.items ?? []) ?? [];
assert.ok(
  currentItems.some((item) => item.scope === 'piston-primary-cycle-reacquisition' && item.importance === 'high'),
  '6.3.1 should include the high-importance primary-cycle reacquisition update',
);
assert.ok(
  currentItems.some((item) => item.scope === 'piston-free-unified-validation' && item.importance === 'high'),
  '6.3.1 should include the high-importance Free unified-validation update',
);
assert.ok(
  currentItems.some((item) => item.scope === 'piston-unified-equivalent-loss' && item.importance === 'high'),
  '6.3.1 should include the high-importance unified equivalent-loss update',
);
assert.ok(
  currentItems.some((item) => item.scope === 'piston-acquisition-display-pacing' && item.importance === 'high'),
  '6.3.1 should include the high-importance acquisition display pacing update',
);
assert.ok(
  currentItems.some((item) => item.scope === 'piston-missed-trigger-retry' && item.importance === 'high'),
  '6.3.1 should include the high-importance missed-trigger retry fix',
);
assert.ok(
  currentItems.some((item) => item.scope === 'piston-tail-observation' && item.importance === 'medium'),
  '6.3.1 should include the tail-observation update and its documented scope',
);

const acquisitionRelease = findRelease('6.3.0');
assert.ok(acquisitionRelease, 'release notes should retain the 6.3.0 acquisition and audio release');
const acquisitionItems = acquisitionRelease.sections?.flatMap((section) => section.items ?? []) ?? [];
assert.ok(
  acquisitionItems.some((item) => item.scope === 'piston-thermal-sensor-acquisition' && item.importance === 'high'),
  '6.3.0 should retain the high-importance thermal and sensor acquisition update',
);
assert.ok(
  acquisitionItems.some((item) => item.scope === 'piston-interaction-audio' && item.importance === 'high'),
  '6.3.0 should retain the high-importance piston interaction audio update',
);

const freeModeRelease = findRelease('6.2.0');
assert.ok(freeModeRelease, 'release notes should retain the 6.2.0 Free Mode release');
const freeModeItems = freeModeRelease.sections?.flatMap((section) => section.items ?? []) ?? [];
assert.ok(
  freeModeItems.some((item) => item.scope === 'piston-free-plan-lifecycle' && item.importance === 'high'),
  '6.2.0 should retain the high-importance piston Free plan lifecycle',
);
assert.ok(
  freeModeItems.some((item) => item.scope === 'piston-free-acquisition-processing' && item.importance === 'high'),
  '6.2.0 should retain the high-importance piston Free acquisition workflow',
);
assert.ok(
  freeModeItems.some((item) => item.scope === 'piston-loaded-equilibrium' && item.importance === 'high'),
  '6.2.0 should retain the high-importance loaded-gas equilibrium update',
);

const startupHotfixRelease = findRelease('5.2.2');
assert.ok(startupHotfixRelease, 'release notes should retain the 5.2.2 startup hotfix');
const startupHotfixItems = startupHotfixRelease.sections?.flatMap((section) => section.items ?? []) ?? [];
assert.ok(
  startupHotfixItems.some((item) => item.scope === 'startup-completion' && item.importance === 'high'),
  '5.2.2 should retain the high-importance startup completion fix',
);

const onboardingRelease = findRelease('5.2.1');
assert.ok(onboardingRelease, 'release notes should retain the 5.2.1 onboarding release');
const onboardingItems = onboardingRelease.sections?.flatMap((section) => section.items ?? []) ?? [];
assert.ok(
  onboardingItems.some((item) => item.scope === 'first-run-onboarding' && item.importance === 'high'),
  '5.2.1 should include the high-importance trilingual first-run flow',
);
assert.ok(
  onboardingItems.some((item) => item.scope === 'product-introduction' && item.importance === 'high'),
  '5.2.1 should include the high-importance animated product introduction',
);
assert.ok(
  onboardingItems.some((item) => item.scope === 'startup-experience' && item.importance === 'high'),
  '5.2.1 should include the high-importance real-progress startup experience',
);
assert.ok(
  onboardingItems.some((item) => item.scope === 'tutorial-session-recovery' && item.importance === 'high'),
  '5.2.1 should include the high-importance tutorial session recovery',
);

const stabilityRelease = findRelease('5.2.0');
assert.ok(stabilityRelease, 'release notes should retain the 5.2.0 stability release');
const stabilityItems = stabilityRelease.sections?.flatMap((section) => section.items ?? []) ?? [];
assert.ok(
  stabilityItems.some((item) => item.scope === 'persistence-worker-scheduler' && item.importance === 'high'),
  '5.2.0 should include the high-importance background persistence scheduler',
);
assert.ok(
  stabilityItems.some((item) => item.scope === 'save-failure-recovery' && item.importance === 'high'),
  '5.2.0 should include the high-importance save failure recovery',
);
assert.ok(
  stabilityItems.some((item) => item.scope === 'legacy-workspace-compatibility' && item.importance === 'high'),
  '5.2.0 should include the high-importance 4.2.3/5.1.1/5.1.2 compatibility boundary',
);
assert.ok(
  stabilityItems.some((item) => item.scope === 'free-trace-v6-bounds' && item.importance === 'high'),
  '5.2.0 should include the high-importance Free trace V6 bounds',
);

const standardResultsRelease = findRelease('4.1.22');
assert.ok(standardResultsRelease, 'release notes should retain the 4.1.22 standard result figure polish release');
const standardResultsItems = standardResultsRelease.sections?.flatMap((section) => section.items ?? []) ?? [];
assert.ok(
  standardResultsItems.some((item) => item.scope === 'standard-results-ui' && item.importance === 'high'),
  '4.1.22 should retain the high-importance standard results UI figure polish',
);
assert.ok(
  standardResultsItems.some((item) => item.scope === 'export-figures' && item.importance === 'high'),
  '4.1.22 should retain the high-importance formal export figure layout update',
);
assert.ok(
  standardResultsItems.some((item) => item.scope === 'legend-layout' && item.importance === 'medium'),
  '4.1.22 should retain the compact in-app legend layout update',
);
assert.ok(
  releaseMetadataScript.includes('相比上一版本的更新内容'),
  'release metadata plain-text fallback should use readable Chinese instead of mojibake',
);
assert.equal(
  releaseMetadataScript.includes('鐩告瘮'),
  false,
  'release metadata script should not contain the old mojibake release-notes heading',
);

const migrationRelease = findRelease('4.1.6');
assert.ok(migrationRelease, 'release notes should include the 4.1.6 migration release');
for (const locale of locales) {
  assert.ok(migrationRelease.summary?.[locale]?.trim(), `4.1.6 migration summary should include ${locale}`);
}
assert.equal(
  migrationRelease.download?.releasePage,
  'https://github.com/yanshi-qibixunchang/hard-sphere-lab-1/releases/tag/v4.1.6',
  '4.1.6 release page should remain in the old source repository for 4.1.5 clients',
);
assert.equal(
  migrationRelease.download?.windowsInstaller,
  'https://github.com/yanshi-qibixunchang/hard-sphere-lab-1/releases/download/v4.1.6/heat-capacity-lab-setup-4.1.6.exe',
  '4.1.6 installer should remain in the old source repository for 4.1.5 clients',
);
const migrationItems = migrationRelease.sections?.flatMap((section) => section.items ?? []) ?? [];
assert.ok(
  migrationItems.some((item) => item.scope === 'desktop-update' && item.importance === 'high'),
  '4.1.6 should include a high-importance desktop-update migration note',
);

const acceptanceRelease = findRelease('4.1.7');
assert.ok(acceptanceRelease, 'release notes should include the 4.1.7 public release repository acceptance release');
for (const locale of locales) {
  assert.ok(acceptanceRelease.summary?.[locale]?.trim(), `4.1.7 acceptance summary should include ${locale}`);
}
assert.equal(
  acceptanceRelease.download?.releasePage,
  'https://github.com/yanshi-qibixunchang/gas-laws-lab-release/releases/tag/v4.1.7',
  '4.1.7 release page should be published only in the new public release repository',
);
assert.equal(
  acceptanceRelease.download?.windowsInstaller,
  'https://github.com/yanshi-qibixunchang/gas-laws-lab-release/releases/download/v4.1.7/heat-capacity-lab-setup-4.1.7.exe',
  '4.1.7 installer should be published only in the new public release repository',
);
const acceptanceItems = acceptanceRelease.sections?.flatMap((section) => section.items ?? []) ?? [];
const helpItem = acceptanceItems.find((item) => item.scope === 'help');
assert.equal(helpItem?.importance, 'medium', '4.1.7 should include the medium-importance Help > User Guide item');
for (const locale of locales) {
  assert.ok(helpItem?.title?.[locale]?.trim(), `4.1.7 Help item title should include ${locale}`);
  assert.ok(helpItem?.body?.[locale]?.trim(), `4.1.7 Help item body should include ${locale}`);
}

const futureTargets = getReleaseMetadataForVersion('4.1.8');
assert.equal(
  futureTargets.releasePageUrl,
  'https://github.com/yanshi-qibixunchang/gas-laws-lab-release/releases/tag/v4.1.8',
  'future generated release pages should use the new public release repository',
);
assert.equal(
  futureTargets.manualDownloadUrl,
  'https://github.com/yanshi-qibixunchang/gas-laws-lab-release/releases/download/v4.1.8/heat-capacity-lab-setup-4.1.8.exe',
  'future generated installers should use the new public release repository',
);

const firstRelease = releaseNotes.releases[0];
assert.match(firstRelease.version ?? '', /^\d+\.\d+\.\d+$/, 'release versions should not include a leading v');
assert.equal(firstRelease.channel, 'stable', 'release notes should identify the stable channel');
assert.match(
  firstRelease.download?.releasePage ?? '',
  /^https:\/\/github\.com\/yanshi-qibixunchang\/(?:hard-sphere-lab-1|gas-laws-lab-release)\/releases\/tag\/v\d+\.\d+\.\d+$/,
);
assert.match(
  firstRelease.download?.windowsInstaller ?? '',
  /^https:\/\/github\.com\/yanshi-qibixunchang\/(?:hard-sphere-lab-1|gas-laws-lab-release)\/releases\/download\/v\d+\.\d+\.\d+\/heat-capacity-lab-setup-\d+\.\d+\.\d+\.exe$/,
  'manual download should point directly to the Windows installer exe',
);

for (const locale of locales) {
  assert.ok(firstRelease.summary?.[locale]?.trim(), `release summary should include ${locale}`);
}

assert.ok(Array.isArray(firstRelease.sections) && firstRelease.sections.length > 0, 'release notes should be grouped into sections');
for (const section of firstRelease.sections ?? []) {
  assert.ok(section.type, 'each release section should have a type');
  for (const locale of locales) {
    assert.ok(section.title?.[locale]?.trim(), `release section ${section.type} should include ${locale} title`);
  }
  assert.ok(Array.isArray(section.items) && section.items.length > 0, `release section ${section.type} should include items`);
  for (const item of section.items ?? []) {
    assert.ok(item.scope, 'each release item should declare an impact scope');
    assert.ok(item.importance, 'each release item should declare an importance');
    for (const locale of locales) {
      assert.ok(item.title?.[locale]?.trim(), `release item should include ${locale} title`);
      assert.ok(item.body?.[locale]?.trim(), `release item should include ${locale} body`);
    }
  }
}

assert.equal(MAX_DOWNLOAD_ATTEMPTS, 3, 'automatic update downloads should retry three attempts at most');

const metadata = getReleaseMetadataForVersion(firstRelease.version ?? '');
assert.equal(metadata.manualDownloadUrl, firstRelease.download?.windowsInstaller, 'metadata should use the direct exe download URL');
assert.equal(metadata.releasePageUrl, firstRelease.download?.releasePage, 'metadata should expose the matching GitHub release page');
assert.ok(metadata.releaseSummary?.['zh-CN'], 'metadata should expose localized release summary');
assert.ok(metadata.releaseSections?.length, 'metadata should expose structured release sections');

const remoteStructuredMetadata = getReleaseMetadataForUpdateInfo({
  version: '4.1.5',
  releasePageUrl: 'https://github.com/yanshi-qibixunchang/hard-sphere-lab-1/releases/tag/v4.1.5',
  manualDownloadUrl: 'https://github.com/yanshi-qibixunchang/hard-sphere-lab-1/releases/download/v4.1.5/heat-capacity-lab-setup-4.1.5.exe',
  releaseSummary: {
    'zh-CN': '远端简体摘要',
    'zh-TW': '遠端繁體摘要',
    en: 'Remote English summary',
  },
  releaseSections: [
    {
      type: 'fixed',
      title: {
        'zh-CN': '修复',
        'zh-TW': '修復',
        en: 'Fixed',
      },
      items: [
        {
          scope: 'desktop-update',
          importance: 'high',
          title: {
            'zh-CN': '远端结构化说明',
            'zh-TW': '遠端結構化說明',
            en: 'Remote structured notes',
          },
          body: {
            'zh-CN': '客户端应读取远端结构化字段。',
            'zh-TW': '客戶端應讀取遠端結構化欄位。',
            en: 'The client should read remote structured fields.',
          },
        },
      ],
    },
  ],
  releaseNotes: '<h1>HTML fallback</h1><ul><li>Do not show tags</li></ul>',
});
const firstRemoteItem = remoteStructuredMetadata.releaseSections?.[0]?.items?.[0] as { title?: Record<string, string> };
assert.equal(
  remoteStructuredMetadata.releaseSummary?.['zh-CN'],
  '远端简体摘要',
  'remote structured summary should take priority over packaged release notes',
);
assert.equal(
  firstRemoteItem.title?.en,
  'Remote structured notes',
  'renderer localization helpers should select the requested language from remote sections',
);
assert.equal(remoteStructuredMetadata.releaseSections?.[0]?.type, 'fixed', 'remote structured sections should be preserved');
assert.equal(remoteStructuredMetadata.releaseNotes?.includes('<h1>'), false, 'HTML fallback release notes should be sanitized');
assert.match(remoteStructuredMetadata.releaseNotes ?? '', /HTML fallback/, 'sanitized fallback should keep readable text');

const htmlNotes = getReleaseMetadataForUpdateInfo({
  version: '4.1.5',
  releaseNotes: [
    { version: '4.1.5', note: '<h2>修复</h2><ul><li>测试修复后续版本更新说明的远端结构化读取与语言匹配。</li></ul>' },
  ],
}).releaseNotes;
assert.equal(htmlNotes?.includes('<li>'), false, 'array release notes should also strip HTML tags');
assert.match(htmlNotes ?? '', /4\.1\.5/, 'array release notes should keep the source version');
assert.match(htmlNotes ?? '', /测试修复后续版本更新说明/, 'array release notes should keep the readable note body');


assert.equal(isAllowedManualDownloadUrl(firstRelease.download?.windowsInstaller), true, 'direct installer URL should be allowed');
assert.equal(isAllowedManualDownloadUrl(firstRelease.download?.releasePage), true, 'release page URL should be allowed');
assert.equal(
  getLatestReleasePageUrl(),
  'https://github.com/yanshi-qibixunchang/gas-laws-lab-release/releases/latest',
  'persistence recovery should derive a trusted latest-release fallback from the configured publish target',
);
assert.equal(
  isAllowedManualDownloadUrl(getLatestReleasePageUrl()),
  true,
  'the configured latest-release fallback should be accepted by the same strict URL allowlist',
);
assert.equal(
  isAllowedManualDownloadUrl('https://github.com/yanshi-qibixunchang/gas-laws-lab-release/releases/download/v4.1.8/heat-capacity-lab-setup-4.1.8.exe'),
  true,
  'new public release repository installer URL should be allowed',
);
assert.equal(
  isAllowedManualDownloadUrl('https://github.com/yanshi-qibixunchang/other-release/releases/download/v4.1.8/heat-capacity-lab-setup-4.1.8.exe'),
  false,
  'manual download should reject unrelated GitHub repositories',
);
assert.equal(isAllowedManualDownloadUrl('https://example.com/heat-capacity-lab-setup-4.1.4.exe'), false, 'manual download should reject unrelated hosts');

assert.equal(isTransientUpdateError(new Error('net::ERR_NETWORK_CHANGED')), true, 'network change should be treated as retryable');
assert.equal(
  isTransientUpdateError(Object.assign(new Error('checksum failed'), { code: 'ERR_UPDATER_INVALID_SIGNATURE' })),
  false,
  'signature or checksum failures should not be retried',
);

console.log('workbenchUpdateReleaseNotes tests passed');
