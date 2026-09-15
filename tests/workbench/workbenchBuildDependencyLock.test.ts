import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { posix } from 'node:path';

type LockedPackage = {
  version?: string;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
};

const require = createRequire(import.meta.url);
const { satisfies } = require('semver') as {
  satisfies: (version: string, range: string, options: { includePrerelease: boolean }) => boolean;
};
const { packages } = JSON.parse(readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8')) as {
  packages: Record<string, LockedPackage>;
};

const resolveLockedPeer = (location: string, name: string) => {
  let directory = location;
  for (;;) {
    const candidate = `${directory ? `${directory}/` : ''}node_modules/${name}`;
    if (packages[candidate]) return packages[candidate];
    if (!directory) return undefined;
    const parent = posix.dirname(directory);
    directory = parent === '.' ? '' : parent;
  }
};

let checkedPeers = 0;
for (const [location, entry] of Object.entries(packages)) {
  for (const [name, range] of Object.entries(entry.peerDependencies ?? {})) {
    if (entry.peerDependenciesMeta?.[name]?.optional) continue;
    const peer = resolveLockedPeer(location, name);
    assert.ok(peer?.version, `${location} requires a locked peer ${name}@${range}; include optional platform branches`);
    assert.ok(satisfies(peer.version, range, { includePrerelease: true }),
      `${location} requires ${name}@${range}, but resolves ${peer.version}`);
    checkedPeers += 1;
  }
}

assert.ok(checkedPeers > 0, 'the dependency graph should contain required peers to validate');
console.log(`Build lockfile resolves all ${checkedPeers} required peers, including optional platform branches.`);
