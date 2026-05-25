const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const rootDir = path.resolve(__dirname, '..');
const packageJson = require(path.join(rootDir, 'package.json'));
const releaseNotesCatalog = require(path.join(rootDir, 'docs', 'releases', 'release-notes.json'));

const locale = 'zh-CN';
const latestYmlPath = path.join(rootDir, 'release', 'latest.yml');

const normalizeVersion = (version) => String(version || '').trim().replace(/^v/i, '');

const getLocalizedText = (value, language = locale) => {
  if (!value || typeof value !== 'object') return '';
  return value[language] || value['zh-CN'] || value.en || '';
};

const renderPlainReleaseNotes = (release) => {
  const lines = [
    `v${release.version} 相比上一版本的更新内容`,
    '',
  ];

  for (const section of release.sections || []) {
    const title = getLocalizedText(section.title);
    if (title) {
      lines.push(title);
    }

    for (const item of section.items || []) {
      const itemTitle = getLocalizedText(item.title);
      const itemBody = getLocalizedText(item.body);
      if (itemTitle && itemBody) {
        lines.push(`- ${itemTitle}：${itemBody}`);
      } else if (itemTitle || itemBody) {
        lines.push(`- ${itemTitle || itemBody}`);
      }
    }

    lines.push('');
  }

  return lines.join('\n').trim();
};

const findRelease = (version) => {
  const normalizedVersion = normalizeVersion(version);
  const releases = Array.isArray(releaseNotesCatalog.releases) ? releaseNotesCatalog.releases : [];
  return releases.find((release) => normalizeVersion(release.version) === normalizedVersion) || null;
};

const main = () => {
  const version = normalizeVersion(process.argv[2] || packageJson.version);
  const release = findRelease(version);
  if (!release) {
    throw new Error(`No release notes entry found for version ${version}`);
  }
  if (!fs.existsSync(latestYmlPath)) {
    throw new Error(`Cannot find ${latestYmlPath}. Run electron-builder before writing release metadata.`);
  }

  const latest = yaml.load(fs.readFileSync(latestYmlPath, 'utf8'));
  const enriched = {
    ...latest,
    releasePageUrl: release.download?.releasePage || null,
    manualDownloadUrl: release.download?.windowsInstaller || null,
    releaseSummary: release.summary || null,
    releaseSections: Array.isArray(release.sections) ? release.sections : null,
    releaseNotes: renderPlainReleaseNotes(release),
  };

  fs.writeFileSync(latestYmlPath, yaml.dump(enriched, { lineWidth: -1, noRefs: true }), 'utf8');
  console.log(`Wrote structured release metadata for v${version} to ${latestYmlPath}`);
};

main();
