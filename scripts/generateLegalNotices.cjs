const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'public', 'legal');
const packageJsonPath = path.join(rootDir, 'package.json');
const packageLockPath = path.join(rootDir, 'package-lock.json');
const nodeModulesDir = path.join(rootDir, 'node_modules');
const summaryPath = path.join(outputDir, 'third-party-summary.json');
const checkOnly = process.argv.includes('--check');
const staleOutputs = [];

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

const getPackageRecords = () => {
  const packageJson = readJson(packageJsonPath);
  const packageLock = readJson(packageLockPath);
  const runtimeDependencies = new Set(Object.keys(packageJson.dependencies || {}));
  const devDependencies = new Set(Object.keys(packageJson.devDependencies || {}));
  const records = new Map();

  for (const [lockPath, metadata] of Object.entries(packageLock.packages || {})) {
    if (!lockPath.startsWith('node_modules/') || !metadata?.version) continue;
    const name = packageNameFromLockPath(lockPath);
    const license = metadata.license || 'UNKNOWN';
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

  return [...records.values()].sort((left, right) => (
    categoryRank[left.category] - categoryRank[right.category]
    || left.name.localeCompare(right.name)
    || left.version.localeCompare(right.version)
  ));
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
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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

const writeExporterLicensesHtml = () => {
  const html = createHtmlDocument({
    title: 'Exporter Component Licenses',
    body: `
      <h1>Exporter Component Licenses</h1>
      <p class="meta">Generated at ${escapeHtml(generatedAt)}.</p>
      <p>The local report exporter is built from tools/exporter/hsl_exporter.py and may be distributed as resources/exporter/hsl-exporter.exe.</p>
      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>License family</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>matplotlib</td><td>Matplotlib license, BSD-style</td><td>${renderExternalLink('https://matplotlib.org/')}</td></tr>
          <tr><td>reportlab</td><td>BSD-style ReportLab license</td><td>${renderExternalLink('https://www.reportlab.com/dev/docs/')}</td></tr>
          <tr><td>PyInstaller</td><td>GPL with special exception for packaging applications</td><td>${renderExternalLink('https://pyinstaller.org/')}</td></tr>
        </tbody>
      </table>
      <p>Depending on the local exporter build environment, the bundled exporter may also include runtime packages such as numpy, Pillow, contourpy, cycler, fonttools, kiwisolver, packaging, pyparsing, python-dateutil, and six. Release builds should keep the full license texts and binary-library notices from the actual exporter bundle.</p>
    `,
  });
  writeTextFileIfChanged(path.join(outputDir, 'exporter-licenses.html'), html);
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
writeExporterLicensesHtml();
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
