const packageJson = require('../package.json');
const releaseNotesCatalog = require('../docs/releases/release-notes.json');

const MAX_DOWNLOAD_ATTEMPTS = 3;
const DEFAULT_LOCALE = 'zh-CN';
const FALLBACK_LOCALE = 'en';

const getGithubPublishTarget = () => {
  const publish = Array.isArray(packageJson.build?.publish) ? packageJson.build.publish : [];
  return publish.find((target) => target?.provider === 'github') || null;
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

const isAllowedManualDownloadUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const publishTarget = getGithubPublishTarget();
  if (!publishTarget) return false;

  try {
    const parsed = new URL(url);
    const expectedPathPrefix = `/${publishTarget.owner}/${publishTarget.repo}/releases/`;
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') return false;
    if (!parsed.pathname.startsWith(expectedPathPrefix)) return false;
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
  getInstallerAssetName,
  getLocalizedReleaseText,
  getReleaseMetadataForVersion,
  isAllowedManualDownloadUrl,
  isTransientUpdateError,
  normalizeVersion,
};
