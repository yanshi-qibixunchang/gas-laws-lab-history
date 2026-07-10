import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
};
const afterPackSource = readFileSync(join(root, 'build', 'afterPack.cjs'), 'utf8');
const bundleSource = readFileSync(join(root, 'scripts', 'bundleExporter.cjs'), 'utf8');
const policySource = readFileSync(join(root, 'build', 'exporterBundlePolicy.cjs'), 'utf8');
const exporterSource = readFileSync(join(root, 'tools', 'exporter', 'hsl_exporter.py'), 'utf8');

for (const scriptName of ['desktop:installer', 'desktop:portable']) {
  const script = packageJson.scripts?.[scriptName] ?? '';
  assert.match(script, /npm run exporter:bundle/, `${scriptName} should rebuild the bundled exporter before packaging`);
  assert.match(script, /npm run exporter:check/, `${scriptName} should verify the bundled exporter before packaging`);
}

assert.match(afterPackSource, /assertBundledExporterCurrent\(context\.packager\.projectDir\)/, 'direct electron-builder runs should reject a stale bundled exporter');
assert.match(bundleSource, /HSL_EXPORTER_SOURCE_FINGERPRINT/, 'PyInstaller should embed the current exporter source fingerprint');
assert.match(bundleSource, /finally[\s\S]*?rmSync\(distDir[\s\S]*?rmSync\(buildDir/, 'exporter builds should clean temporary output directories');
assert.match(policySource, /selfCheck\.sourceFingerprint !== expected\.sourceFingerprint/, 'exporter policy should compare the executable fingerprint with current source');
assert.match(exporterSource, /EXPORTER_SOURCE_FINGERPRINT = os\.environ\.get/, 'exporter self-check should report its embedded source fingerprint');

console.log('workbenchExporterBundlePolicy tests passed');
