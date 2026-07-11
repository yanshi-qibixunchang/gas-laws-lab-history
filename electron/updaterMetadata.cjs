const packageJson = require('../package.json');
const releaseNotesCatalog = require('../docs/releases/release-notes.json');

const MAX_DOWNLOAD_ATTEMPTS = 3;
const DEFAULT_LOCALE = 'zh-CN';
const FALLBACK_LOCALE = 'en';
const LEGACY_RELEASE_TARGETS = [
  { owner: 'yanshi-qibixunchang', repo: 'hard-sphere-lab-1' },
];

const getGithubPublishTarget = () => {
  const publish = Array.isArray(packageJson.build?.publish) ? packageJson.build.publish : [];
  return publish.find((target) => target?.provider === 'github') || null;
};

const getAllowedGithubReleaseTargets = () => {
  const publishTarget = getGithubPublishTarget();
  const targets = [];
  if (publishTarget?.owner && publishTarget?.repo) {
    targets.push({ owner: publishTarget.owner, repo: publishTarget.repo });
  }
  for (const target of LEGACY_RELEASE_TARGETS) {
    if (!targets.some((existing) => existing.owner === target.owner && existing.repo === target.repo)) {
      targets.push(target);
    }
  }
  return targets;
};

const normalizeVersion = (version) => String(version || '').trim().replace(/^v/i, '');

const getReleaseTag = (version) => `v${normalizeVersion(version)}`;

const getInstallerAssetName = (version) => {
  const artifactName = packageJson.build?.nsis?.artifactName || 'heat-capacity-lab-setup-${version}.${ext}';
  return artifactName
    .replace('${version}', normalizeVersion(version))
    .replace('${ext}', 'exe');
};

const getGeneratedReleaseTargets = (version) => {
  const publishTarget = getGithubPublishTarget();
  const normalizedVersion = normalizeVersion(version);
  if (!publishTarget || !normalizedVersion) {
    return {
      releasePageUrl: null,
      manualDownloadUrl: null,
    };
  }

  const base = `https://github.com/${publishTarget.owner}/${publishTarget.repo}/releases`;
  const tag = getReleaseTag(normalizedVersion);
  return {
    releasePageUrl: `${base}/tag/${tag}`,
    manualDownloadUrl: `${base}/download/${tag}/${getInstallerAssetName(normalizedVersion)}`,
  };
};

const findReleaseEntry = (version) => {
  const normalizedVersion = normalizeVersion(version);
  const releases = Array.isArray(releaseNotesCatalog.releases) ? releaseNotesCatalog.releases : [];
  return releases.find((release) => normalizeVersion(release?.version) === normalizedVersion) || null;
};

const getLocalizedReleaseText = (value, language) => {
  if (!value || typeof value !== 'object') return null;
  const normalizedLanguage = language === 'zh-TW' || language === 'en' ? language : DEFAULT_LOCALE;
  return value[normalizedLanguage] || value[DEFAULT_LOCALE] || value[FALLBACK_LOCALE] || null;
};

const isLocalizedTextMap = (value) => (
  Boolean(value) &&
  typeof value === 'object' &&
  ['zh-CN', 'zh-TW', 'en'].some((locale) => typeof value[locale] === 'string' && value[locale].trim())
);

const isStructuredReleaseSection = (section) => (
  Boolean(section) &&
  typeof section === 'object' &&
  typeof section.type === 'string' &&
  isLocalizedTextMap(section.title) &&
  Array.isArray(section.items)
);

const decodeHtmlEntities = (value) => String(value || '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/&#(\d+);/g, (_match, code) => {
    const point = Number.parseInt(code, 10);
    return Number.isFinite(point) ? String.fromCodePoint(point) : '';
  })
  .replace(/&#x([0-9a-f]+);/gi, (_match, code) => {
    const point = Number.parseInt(code, 16);
    return Number.isFinite(point) ? String.fromCodePoint(point) : '';
  });

const stripHtmlToText = (value) => decodeHtmlEntities(value)
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<li\b[^>]*>/gi, '\n- ')
  .replace(/<\/(p|div|section|article|h[1-6]|ul|ol|li)>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .split(/\r?\n/)
  .map((line) => line.replace(/[ \t]+/g, ' ').trim())
  .filter(Boolean)
  .join('\n');

const normalizeReleaseNotesText = (value) => {
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (typeof item === 'string') return stripHtmlToText(item);
        if (!item || typeof item !== 'object') return '';
        const version = item.version ? `v${normalizeVersion(item.version)}` : '';
        const note = stripHtmlToText(item.note || '');
        return [version, note].filter(Boolean).join('\n');
      })
      .filter(Boolean);
    return parts.length > 0 ? parts.join('\n\n') : null;
  }

  if (typeof value !== 'string') return null;
  const normalized = stripHtmlToText(value);
  return normalized || null;
};

const getReleaseMetadataForVersion = (version) => {
  const release = findReleaseEntry(version);
  const generated = getGeneratedReleaseTargets(version);
  return {
    releasePageUrl: release?.download?.releasePage || generated.releasePageUrl,
    manualDownloadUrl: release?.download?.windowsInstaller || generated.manualDownloadUrl,
    releaseSummary: release?.summary || null,
    releaseSections: Array.isArray(release?.sections) ? release.sections : null,
  };
};

const getReleaseMetadataForUpdateInfo = (info = {}) => {
  const latestVersion = normalizeVersion(info.version || '');
  const fallback = getReleaseMetadataForVersion(latestVersion);
  const generated = getGeneratedReleaseTargets(latestVersion);
  const remoteSummary = isLocalizedTextMap(info.releaseSummary) ? info.releaseSummary : null;
  const remoteSections = Array.isArray(info.releaseSections) && info.releaseSections.every(isStructuredReleaseSection)
    ? info.releaseSections
    : null;

  return {
    releasePageUrl: isAllowedManualDownloadUrl(info.releasePageUrl)
      ? info.releasePageUrl
      : fallback.releasePageUrl || generated.releasePageUrl,
    manualDownloadUrl: isAllowedManualDownloadUrl(info.manualDownloadUrl)
      ? info.manualDownloadUrl
      : fallback.manualDownloadUrl || generated.manualDownloadUrl,
    releaseSummary: remoteSummary || fallback.releaseSummary,
    releaseSections: remoteSections || fallback.releaseSections,
    releaseNotes: normalizeReleaseNotesText(info.releaseNotes),
  };
};

const isAllowedManualDownloadUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const allowedTargets = getAllowedGithubReleaseTargets();
  if (allowedTargets.length === 0) return false;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') return false;
    if (!allowedTargets.some((target) => parsed.pathname.startsWith(`/${target.owner}/${target.repo}/releases/`))) {
      return false;
    }
    return /\/tag\/v[^/]+$/.test(parsed.pathname) || /\/download\/v[^/]+\/[^/]+\.exe$/i.test(parsed.pathname);
  } catch (_error) {
    return false;
  }
};

const isTransientUpdateError = (error) => {
  const message = error instanceof Error ? error.message : String(error || '');
  const code = typeof error === 'object' && error ? String(error.code || '') : '';
  const text = `${code} ${message}`.toLowerCase();
  if (/checksum|signature|sha512|not found|404|403|unauthori[sz]ed|invalid/.test(text)) return false;
  return /econnreset|etimedout|enotfound|eai_again|network|timeout|socket|5\d\d|err_network_changed|err_internet_disconnected/.test(text);
};

module.exports = {
  MAX_DOWNLOAD_ATTEMPTS,
  getGeneratedReleaseTargets,
  getLocalizedReleaseText,
  getReleaseMetadataForUpdateInfo,
  getReleaseMetadataForVersion,
  isAllowedManualDownloadUrl,
  isTransientUpdateError,
  normalizeReleaseNotesText,
};
