import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const main = readFileSync(join(process.cwd(), 'electron', 'main.cjs'), 'utf8');
const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');

assert.match(main, /contextIsolation: true/);
assert.match(main, /nodeIntegration: false/);
assert.match(main, /sandbox: true/);
assert.match(main, /webSecurity: true/);
assert.match(main, /setWindowOpenHandler\(\(\) => \(\{ action: 'deny' \}\)\)/);
assert.match(main, /webContents\.on\('will-navigate'[\s\S]*event\.preventDefault\(\)/);
assert.match(html, /http-equiv="Content-Security-Policy"/);
assert.match(html, /object-src 'none'/);
assert.match(html, /base-uri 'self'/);
assert.doesNotMatch(html, /script-src[^;]*'unsafe-eval'/);

console.log('workbenchElectronSecurity tests passed');
