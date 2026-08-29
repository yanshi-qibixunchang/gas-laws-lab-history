const RUNTIME_RELEASE_CONFIG = Object.freeze({
  githubPublishTarget: Object.freeze({
    provider: 'github',
    owner: 'yanshi-qibixunchang',
    repo: 'gas-laws-lab-release',
  }),
  nsisArtifactName: 'heat-capacity-lab-setup-${version}.${ext}',
});

module.exports = {
  RUNTIME_RELEASE_CONFIG,
};
