const fs = require('node:fs');
const path = require('node:path');

const LEGACY_USER_DATA_DIRECTORY_NAME = 'hard-sphere-lab';

const ensureLegacyUserDataPath = (electronApp) => {
  const legacyUserDataPath = path.join(
    electronApp.getPath('appData'),
    LEGACY_USER_DATA_DIRECTORY_NAME,
  );
  fs.mkdirSync(legacyUserDataPath, { recursive: true });
  electronApp.setPath('userData', legacyUserDataPath);
  return legacyUserDataPath;
};

module.exports = {
  LEGACY_USER_DATA_DIRECTORY_NAME,
  ensureLegacyUserDataPath,
};
