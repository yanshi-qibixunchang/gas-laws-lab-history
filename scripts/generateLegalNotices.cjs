const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const {
  assertExporterLegalInventory,
  createExporterSourceDescriptor,
} = require('../build/exporterBundlePolicy.cjs');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'public', 'legal');
const packageJsonPath = path.join(rootDir, 'package.json');
const packageLockPath = path.join(rootDir, 'package-lock.json');
const nodeModulesDir = path.join(rootDir, 'node_modules');
const audioManifestPath = path.join(rootDir, 'public', 'audio', 'experiments', 'heat-capacity', 'manifest.json');
const exporterLegalInventoryPath = path.join(
  rootDir,
  'resources',
  'exporter',
  'hsl-exporter.legal.json',
);
const summaryPath = path.join(outputDir, 'third-party-summary.json');
const checkOnly = process.argv.includes('--check');
const staleOutputs = [];
const packageLicenseOverrides = Object.freeze({
  'webgl-constants@1.1.1': Object.freeze({
    license: 'MIT',
    licenseFileName: 'LICENSE',
    sha256: '0969fa65680b694452c2c65981df14af5c192da24f2b1f87bdd51d8ed24efcfa',
  }),
});

let generatedAt = new Date().toISOString();
let contentFingerprint = '';

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const readJsonIfExists = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  try {
    return readJson(filePath);
  } catch {
    return null;
  }
};

const writeTextFileIfChanged = (filePath, content) => {
  const normalizedContent = content.replace(/[ \t]+$/gm, '');
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === normalizedContent) return false;
  if (checkOnly) {
    staleOutputs.push(path.relative(rootDir, filePath));
    return true;
  }
  fs.writeFileSync(filePath, normalizedContent, 'utf8');
  return true;
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const renderExternalLink = (href, label = href) => (
  `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
);

const normalizePathForHtml = (value) => value.split(path.sep).join('/');

const ensureOutputDir = () => {
  if (checkOnly) return;
  fs.mkdirSync(outputDir, { recursive: true });
};

const packageNameFromLockPath = (lockPath) => {
  const parts = lockPath.split('/');
  const index = parts.lastIndexOf('node_modules');
  if (index < 0 || index + 1 >= parts.length) return lockPath;

  const first = parts[index + 1];
  if (first.startsWith('@') && index + 2 < parts.length) {
    return `${first}/${parts[index + 2]}`;
  }
  return first;
};

const getTopLevelPackagePath = (name) => `node_modules/${name}`;

const getNpmUrl = (name) => `https://www.npmjs.com/package/${name.replace('/', '%2F')}`;

const resolvePackageLicense = (name, version, lockPath, declaredLicense) => {
  if (typeof declaredLicense === 'string' && declaredLicense.trim()) return declaredLicense;
  const override = packageLicenseOverrides[`${name}@${version}`];
  if (!override) return 'UNKNOWN';
  const licensePath = path.join(rootDir, lockPath, override.licenseFileName);
  if (!fs.existsSync(licensePath)) {
    throw new Error(`License override evidence is missing for ${name}@${version}: ${licensePath}`);
  }
  const stat = fs.lstatSync(licensePath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`License override evidence is not a regular file for ${name}@${version}.`);
  }
  const actualSha256 = createHash('sha256').update(fs.readFileSync(licensePath)).digest('hex');
  if (actualSha256 !== override.sha256) {
    throw new Error(`License override evidence hash mismatch for ${name}@${version}.`);
  }
  return override.license;
};

const getPackageRecords = () => {
  const packageJson = readJson(packageJsonPath);
  const packageLock = readJson(packageLockPath);
  const runtimeDependencies = new Set(Object.keys(packageJson.dependencies || {}));
  const devDependencies = new Set(Object.keys(packageJson.devDependencies || {}));
  const records = new Map();

  for (const [lockPath, metadata] of Object.entries(packageLock.packages || {})) {
    if (!lockPath.startsWith('node_modules/') || !metadata?.version) continue;
    const name = packageNameFromLockPath(lockPath);
    const license = resolvePackageLicense(name, metadata.version, lockPath, metadata.license);
    const key = `${name}@${metadata.version}|${license}`;
    const record = records.get(key) || {
      name,
      version: metadata.version,
      license,
      paths: [],
      source: getNpmUrl(name),
      category: 'Transitive dependency',
    };
    record.paths.push(lockPath);
    records.set(key, record);
  }

  for (const record of records.values()) {
    const isTopLevel = record.paths.includes(getTopLevelPackagePath(record.name));
    if (isTopLevel && runtimeDependencies.has(record.name)) {
      record.category = 'Direct runtime dependency';
    } else if (isTopLevel && devDependencies.has(record.name)) {
      record.category = 'Direct development/build dependency';
    }
  }

  const categoryRank = {
    'Direct runtime dependency': 0,
    'Direct development/build dependency': 1,
    'Transitive dependency': 2,
  };

  const sortedRecords = [...records.values()].sort((left, right) => (
    categoryRank[left.category] - categoryRank[right.category]
    || left.name.localeCompare(right.name)
    || left.version.localeCompare(right.version)
  ));
  const unknownLicenses = sortedRecords.filter((record) => record.license === 'UNKNOWN');
  if (unknownLicenses.length > 0) {
    throw new Error(`Unclassified package licenses: ${unknownLicenses.map((record) => `${record.name}@${record.version}`).join(', ')}`);
  }
  return sortedRecords;
};

const getLicenseFilesForPackagePath = (lockPath) => {
  const packageDir = path.join(rootDir, lockPath);
  if (!fs.existsSync(packageDir)) return [];

  return fs.readdirSync(packageDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^(license|licence|notice|copying)(\..*)?$/i.test(name))
    .sort((left, right) => left.localeCompare(right))
    .map((name) => path.join(packageDir, name));
};

const getLegalNoticeInputFingerprint = (records) => {
  const hash = createHash('sha256');
  const appendFile = (filePath) => {
    if (!fs.existsSync(filePath)) return;
    hash.update(normalizePathForHtml(path.relative(rootDir, filePath)));
    hash.update('\0');
    hash.update(fs.readFileSync(filePath));
    hash.update('\0');
  };

  const packageJson = readJson(packageJsonPath);
  const dependencyManifest = Object.fromEntries([
    ...Object.entries(packageJson.dependencies || {}),
    ...Object.entries(packageJson.devDependencies || {}),
    ...Object.entries(packageJson.optionalDependencies || {}),
  ].sort(([left], [right]) => left.localeCompare(right)));
  hash.update(JSON.stringify(dependencyManifest));
  hash.update('\0');
  appendFile(packageLockPath);
  appendFile(__filename);
  appendFile(path.join(nodeModulesDir, 'electron', 'dist', 'LICENSE'));
  appendFile(path.join(rootDir, 'public', 'fonts', 'LICENSES.txt'));
  appendFile(audioManifestPath);
  appendFile(exporterLegalInventoryPath);

  for (const record of records) {
    for (const lockPath of record.paths) {
      for (const filePath of getLicenseFilesForPackagePath(lockPath)) appendFile(filePath);
    }
  }

  return hash.digest('hex');
};

const createHtmlDocument = ({ title, body }) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: dark light;
      font-family: "Noto Sans SC", "Microsoft YaHei UI", "Segoe UI", ui-sans-serif, system-ui, sans-serif;
      line-height: 1.55;
    }
    body {
      margin: 0;
      padding: 32px;
      color: #d9e2ec;
      background: #17202a;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 24px;
      line-height: 1.25;
    }
    h2 {
      margin: 28px 0 10px;
      font-size: 18px;
    }
    p {
      margin: 0 0 14px;
      color: #aab7c6;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 18px;
      font-size: 13px;
    }
    th,
    td {
      border-bottom: 1px solid rgba(148, 163, 184, 0.24);
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }
    th {
      color: #f1f5f9;
      font-weight: 700;
    }
    a {
      color: #8ec5ff;
    }
    pre {
      overflow: auto;
      padding: 14px;
      color: #d9e2ec;
      background: rgba(2, 6, 23, 0.36);
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 6px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .meta {
      margin-bottom: 24px;
      color: #94a3b8;
      font-size: 12px;
    }
  </style>
</head>
<body>
${body}
</body>
</html>
`;

const writeDependenciesHtml = (records) => {
  const rows = records.map((record) => {
    const installLocation = record.paths.length === 1
      ? normalizePathForHtml(record.paths[0])
      : `${record.paths.length} locations`;
    return `<tr>
      <td><code>${escapeHtml(record.name)}</code></td>
      <td>${escapeHtml(record.version)}</td>
      <td>${escapeHtml(record.license)}</td>
      <td>${escapeHtml(record.category)}</td>
      <td>${escapeHtml(installLocation)}</td>
      <td>${renderExternalLink(record.source)}</td>
    </tr>`;
  }).join('\n');

  const html = createHtmlDocument({
    title: 'Third-Party Dependency List',
    body: `
      <h1>Third-Party Dependency List</h1>
      <p class="meta">Generated at ${escapeHtml(generatedAt)} from package-lock.json. ${records.length} unique package/version/license records are listed.</p>
      <table>
        <thead>
          <tr>
            <th>Package</th>
            <th>Version</th>
            <th>License</th>
            <th>Type</th>
            <th>Install location</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `,
  });
  writeTextFileIfChanged(path.join(outputDir, 'third-party-dependencies.html'), html);
};

const writeLicenseTextsHtml = (records) => {
  const seenFiles = new Set();
  const sections = [];

  for (const record of records) {
    for (const lockPath of record.paths) {
      for (const filePath of getLicenseFilesForPackagePath(lockPath)) {
        const realPath = fs.realpathSync(filePath);
        if (seenFiles.has(realPath)) continue;
        seenFiles.add(realPath);

        const relativePath = normalizePathForHtml(path.relative(rootDir, filePath));
        const content = fs.readFileSync(filePath, 'utf8');
        sections.push(`
          <section>
            <h2>${escapeHtml(record.name)} ${escapeHtml(record.version)} - ${escapeHtml(path.basename(filePath))}</h2>
            <p>${escapeHtml(relativePath)} | License metadata: ${escapeHtml(record.license)}</p>
            <pre>${escapeHtml(content)}</pre>
          </section>
        `);
      }
    }
  }

  const html = createHtmlDocument({
    title: 'Third-Party License Texts',
    body: `
      <h1>Third-Party License Texts</h1>
      <p class="meta">Generated at ${escapeHtml(generatedAt)} from installed package license, notice, and copying files. Chromium license notices are provided separately by LICENSES.chromium.html.</p>
      ${sections.join('\n')}
    `,
  });
  writeTextFileIfChanged(path.join(outputDir, 'third-party-license-texts.html'), html);
};

const writeExporterLicensesHtml = (inventory) => {
  const componentRows = [
    {
      type: 'Frozen runtime',
      name: inventory.pythonRuntime.name,
      version: inventory.pythonRuntime.version,
      license: inventory.pythonRuntime.license,
      source: inventory.pythonRuntime.source,
      frozenEntryCount: inventory.runtimeLibraries.length,
    },
    ...inventory.frozenDistributions.map((record) => ({
      type: 'Frozen distribution',
      ...record,
    })),
    ...inventory.buildComponents.map((record) => ({
      type: 'Bundling component',
      ...record,
    })),
  ].map((record) => `<tr>
      <td>${escapeHtml(record.type)}</td>
      <td><code>${escapeHtml(record.name)}</code></td>
      <td>${escapeHtml(record.version)}</td>
      <td>${escapeHtml(record.license)}</td>
      <td>${escapeHtml(record.frozenEntryCount)}</td>
      <td>${record.source ? renderExternalLink(record.source) : ''}</td>
    </tr>`).join('\n');
  const runtimeComponentLabels = {
    'python-runtime': 'CPython runtime and standard-library extension',
    'microsoft-runtime': 'Microsoft Distributable Code covered by the CPython Windows license notice',
    openssl: 'OpenSSL runtime covered by the CPython Windows binary notices',
    libffi: 'libffi runtime covered by the CPython Windows binary notices',
  };
  const runtimeRows = inventory.runtimeLibraries.map((runtimeLibrary) => `<tr>
      <td><code>${escapeHtml(runtimeLibrary.name)}</code></td>
      <td>${escapeHtml(runtimeComponentLabels[runtimeLibrary.component] || runtimeLibrary.component)}</td>
      <td>${escapeHtml(runtimeLibrary.licenseEvidence.owner)} / ${escapeHtml(runtimeLibrary.licenseEvidence.licenseFileName)} / SHA-256 ${escapeHtml(runtimeLibrary.licenseEvidence.sha256)}</td>
    </tr>`).join('\n');
  const renderLicenseSections = (record, category) => record.licenseFiles.map((licenseFile) => `
      <section>
        <h2>${escapeHtml(record.name)} ${escapeHtml(record.version)} - ${escapeHtml(licenseFile.name)}</h2>
        <p>${escapeHtml(category)} | ${escapeHtml(record.license)} | SHA-256 ${escapeHtml(licenseFile.sha256)}</p>
        <pre>${escapeHtml(licenseFile.text)}</pre>
      </section>
    `).join('\n');
  const licenseSections = [
    `
      <section>
        <h2>${escapeHtml(inventory.pythonRuntime.name)} ${escapeHtml(inventory.pythonRuntime.version)} - ${escapeHtml(inventory.pythonRuntime.licenseFile.name)}</h2>
        <p>Frozen runtime and bundled Windows-library notices | SHA-256 ${escapeHtml(inventory.pythonRuntime.licenseFile.sha256)}</p>
        <pre>${escapeHtml(inventory.pythonRuntime.licenseFile.text)}</pre>
      </section>
    `,
    ...inventory.frozenDistributions.map((record) => renderLicenseSections(record, 'Frozen distribution')),
    ...inventory.buildComponents.map((record) => renderLicenseSections(record, 'Bundling component')),
  ].join('\n');
  const html = createHtmlDocument({
    title: 'Exporter Component Licenses',
    body: `
      <h1>Exporter Component Licenses</h1>
      <p class="meta">Generated at ${escapeHtml(generatedAt)} from the frozen exporter archive. Archive fingerprint: ${escapeHtml(inventory.archiveFingerprint)}.</p>
      <p>The inventory lists ${escapeHtml(inventory.frozenDistributions.length)} frozen Python distributions, ${escapeHtml(inventory.buildComponents.length)} bundling components, ${escapeHtml(inventory.runtimeLibraries.length)} runtime libraries, ${escapeHtml(inventory.archiveEntryCount)} top-level archive entries, and ${escapeHtml(inventory.pyzModuleCount)} embedded Python modules. Unknown license ownership fails the exporter bundle gate.</p>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Component</th>
            <th>Version</th>
            <th>License</th>
            <th>Frozen evidence</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>${componentRows}</tbody>
      </table>
      <h2>Frozen runtime libraries</h2>
      <table>
        <thead><tr><th>Archive entry</th><th>Notice coverage</th><th>Hashed license evidence</th></tr></thead>
        <tbody>${runtimeRows}</tbody>
      </table>
      ${licenseSections}
    `,
  });
  writeTextFileIfChanged(path.join(outputDir, 'exporter-licenses.html'), html);
};

const writeAudioMaterialsHtml = (manifest) => {
  const assetsBySource = new Map();
  for (const asset of manifest.assets || []) {
    if (!asset.sourceAssetId) continue;
    const audioIds = assetsBySource.get(asset.sourceAssetId) || new Set();
    audioIds.add(asset.audioId);
    assetsBySource.set(asset.sourceAssetId, audioIds);
  }
  const renderRows = () => (manifest.sources || []).map((source) => {
    const audioIds = [...(assetsBySource.get(source.assetId) || [])].sort().join(', ');
    return `<tr>
      <td><code>${escapeHtml(audioIds)}</code></td>
      <td>${escapeHtml(source.sourceTitle)}</td>
      <td>${escapeHtml(source.author)}</td>
      <td>${renderExternalLink(source.sourceUrl)}</td>
      <td>${renderExternalLink(source.licenseUrl, source.license)}</td>
    </tr>`;
  }).join('\n');
  const proceduralAudioIds = (manifest.assets || [])
    .filter((asset) => asset.kind === 'first-party-procedural')
    .map((asset) => asset.audioId)
    .sort()
    .join(', ');
  const sections = [
    {
      lang: 'zh-CN',
      title: '音效素材与许可',
      intro: '以下音效素材由项目内的音频清单自动生成。第三方录音均标记为 CC0 1.0；素材标题、作者和来源链接保持原始写法。',
      headers: ['用途 / 音频 ID', '来源标题', '作者', '来源', '许可'],
      procedural: `音频 ${proceduralAudioIds} 为软件运行时生成的第一方程序化音效，仅使用噪声、滤波器和包络合成，不包含外部录音样本。`,
    },
    {
      lang: 'zh-TW',
      title: '音效素材與授權',
      intro: '以下音效素材由專案內的音訊清單自動生成。第三方錄音均標記為 CC0 1.0；素材標題、作者和來源連結保持原始寫法。',
      headers: ['用途 / 音訊 ID', '來源標題', '作者', '來源', '授權'],
      procedural: `音訊 ${proceduralAudioIds} 為軟體執行時生成的第一方程式化音效，僅使用雜訊、濾波器和包絡合成，不包含外部錄音樣本。`,
    },
    {
      lang: 'en',
      title: 'Audio Materials and Licenses',
      intro: 'This list is generated from the project audio manifest. All third-party recordings are marked CC0 1.0; original source titles, author names, and source links are preserved.',
      headers: ['Use / audio ID', 'Source title', 'Author', 'Source', 'License'],
      procedural: `Audio ${proceduralAudioIds} is first-party procedural audio generated at runtime from noise, filters, and envelopes. It contains no external recording samples.`,
    },
  ];
  const body = sections.map((section) => `
    <section lang="${section.lang}">
      <h2>${escapeHtml(section.title)}</h2>
      <p>${escapeHtml(section.intro)}</p>
      <table>
        <thead><tr>${section.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
        <tbody>${renderRows()}</tbody>
      </table>
      <p><strong>${escapeHtml(section.procedural)}</strong></p>
    </section>
  `).join('\n');
  const html = createHtmlDocument({
    title: 'Audio Materials and Licenses',
    body: `<h1>Audio Materials / 音效素材 / 音效素材</h1>
      <p class="meta">Generated at ${escapeHtml(generatedAt)} from public/audio/experiments/heat-capacity/manifest.json.</p>
      ${body}`,
  });
  writeTextFileIfChanged(path.join(outputDir, 'audio-materials.html'), html);
};

const copyIfExists = (sourcePath, fileName) => {
  if (!fs.existsSync(sourcePath)) return false;
  const targetPath = path.join(outputDir, fileName);
  const source = fs.readFileSync(sourcePath);
  if (fs.existsSync(targetPath) && fs.readFileSync(targetPath).equals(source)) return false;
  if (checkOnly) {
    staleOutputs.push(path.relative(rootDir, targetPath));
    return true;
  }
  fs.writeFileSync(targetPath, source);
  return true;
};

const writeSummary = (records) => {
  const licenseCounts = records.reduce((counts, record) => {
    counts[record.license] = (counts[record.license] || 0) + 1;
    return counts;
  }, {});
  const summary = {
    generatedAt,
    contentFingerprint,
    packageRecordCount: records.length,
    licenseCounts,
    files: [
      { id: 'dependencies', path: 'third-party-dependencies.html', title: 'Third-Party Dependency List' },
      { id: 'licenseTexts', path: 'third-party-license-texts.html', title: 'Third-Party License Texts' },
      { id: 'electron', path: 'LICENSE.electron.txt', title: 'Electron License' },
      { id: 'fonts', path: 'font-licenses.txt', title: 'Font Licenses' },
      { id: 'exporter', path: 'exporter-licenses.html', title: 'Exporter Component Licenses' },
      { id: 'audio', path: 'audio-materials.html', title: 'Audio Materials and Licenses' },
    ],
  };
  writeTextFileIfChanged(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
};

ensureOutputDir();
const records = getPackageRecords();
contentFingerprint = getLegalNoticeInputFingerprint(records);
const existingSummary = readJsonIfExists(summaryPath);
if (
  existingSummary?.contentFingerprint === contentFingerprint &&
  typeof existingSummary.generatedAt === 'string' &&
  !Number.isNaN(Date.parse(existingSummary.generatedAt))
) {
  generatedAt = existingSummary.generatedAt;
}
writeDependenciesHtml(records);
writeLicenseTextsHtml(records);
const exporterLegalInventory = assertExporterLegalInventory(
  readJson(exporterLegalInventoryPath),
  createExporterSourceDescriptor(rootDir),
);
writeExporterLicensesHtml(exporterLegalInventory);
writeAudioMaterialsHtml(readJson(audioManifestPath));
copyIfExists(path.join(rootDir, 'node_modules', 'electron', 'dist', 'LICENSE'), 'LICENSE.electron.txt');
copyIfExists(path.join(rootDir, 'public', 'fonts', 'LICENSES.txt'), 'font-licenses.txt');
writeSummary(records);

if (checkOnly && staleOutputs.length > 0) {
  console.error(`Legal notices are out of date:\n${staleOutputs.map((filePath) => `- ${filePath}`).join('\n')}`);
  process.exitCode = 1;
} else if (checkOnly) {
  console.log(`Legal notices are current (${records.length} package records).`);
} else {
  console.log(`Generated legal notices in ${path.relative(rootDir, outputDir)} (${records.length} package records).`);
}
