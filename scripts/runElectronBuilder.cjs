'use strict';

const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

const ELECTRON_BUILDER_TARGETS = new Set(['nsis', 'portable']);
const NPM_COLLECTOR_ARGUMENT_SETS = [
  ['config', 'list'],
  ['list', '-a', '--include', 'prod', '--include', 'optional', '--omit', 'dev', '--json', '--long', '--silent', '--loglevel=error'],
];
const CMD_UNSAFE_TOKEN_PATTERN = /[\u0000-\u001f"&|<>^%!()]/;

const getElectronBuilderCliArgs = (target) => {
  if (!ELECTRON_BUILDER_TARGETS.has(target)) {
    throw new Error(`Unsupported electron-builder target: ${target || '<missing>'}`);
  }
  return ['--win', target, '--x64', '--publish', 'never'];
};

const inspectElectronBuilderNpmCollectorSpawn = (
  command,
  args,
  options,
  { platform = process.platform, readFileSync = fs.readFileSync } = {},
) => {
  if (
    platform !== 'win32'
    || typeof command !== 'string'
    || command.toLowerCase() !== 'cmd.exe'
    || options?.shell !== true
    || !Array.isArray(args)
    || args.length < 3
    || typeof args[0] !== 'string'
    || args[0].toLowerCase() !== '/c'
    || typeof args[1] !== 'string'
    || !args[1].startsWith('"')
    || !args[1].endsWith('"')
  ) {
    return null;
  }

  const batchPath = args[1].slice(1, -1);
  if (path.extname(batchPath).toLowerCase() !== '.bat') {
    return null;
  }

  let batchSource;
  try {
    batchSource = readFileSync(batchPath, 'utf8');
  } catch {
    return null;
  }

  const forwardingMatch = /^@echo off\r\n"([^"\r\n]+)" %\*\r\n$/.exec(batchSource);
  if (forwardingMatch === null || path.basename(forwardingMatch[1]).toLowerCase() !== 'npm.cmd') {
    return null;
  }

  const npmCommandPath = forwardingMatch[1];
  const collectorArgs = args.slice(2);
  const hasKnownArguments = NPM_COLLECTOR_ARGUMENT_SETS.some((expected) => (
    expected.length === collectorArgs.length
    && expected.every((value, index) => collectorArgs[index] === value)
  ));
  if (!hasKnownArguments) {
    return { kind: 'unsafe', reason: 'unexpected npm collector arguments' };
  }
  if (options.env?.COREPACK_ENABLE_STRICT !== '0') {
    return { kind: 'unsafe', reason: 'unexpected npm collector environment' };
  }
  if (
    !path.win32.isAbsolute(batchPath)
    || !path.win32.isAbsolute(npmCommandPath)
    || CMD_UNSAFE_TOKEN_PATTERN.test(batchPath)
    || CMD_UNSAFE_TOKEN_PATTERN.test(npmCommandPath)
  ) {
    return { kind: 'unsafe', reason: 'CMD-unsafe collector path' };
  }

  return { kind: 'safe', batchPath };
};

const isElectronBuilderNpmCollectorSpawn = (...args) => (
  inspectElectronBuilderNpmCollectorSpawn(...args)?.kind === 'safe'
);

const createElectronBuilderSafeSpawn = (
  spawn,
  detectionOptions,
) => function electronBuilderSafeSpawn(command, args, options) {
  const inspection = inspectElectronBuilderNpmCollectorSpawn(
    command,
    args,
    options,
    detectionOptions,
  );
  if (inspection?.kind === 'unsafe') {
    throw new Error(`Refusing unsafe electron-builder npm collector spawn: ${inspection.reason}`);
  }
  const safeArgs = inspection?.kind === 'safe'
    ? [args[0], inspection.batchPath, ...args.slice(2)]
    : args;
  const safeOptions = inspection?.kind === 'safe' ? { ...options, shell: false } : options;
  return Reflect.apply(spawn, this, [command, safeArgs, safeOptions]);
};

const installElectronBuilderSpawnSafety = () => {
  childProcess.spawn = createElectronBuilderSafeSpawn(childProcess.spawn);
};

const run = () => {
  if (process.argv.length !== 3) {
    throw new Error('Usage: node scripts/runElectronBuilder.cjs <nsis|portable>');
  }

  const cliArgs = getElectronBuilderCliArgs(process.argv[2]);
  const packageRoot = path.dirname(require.resolve('electron-builder/package.json'));
  const cliPath = path.join(packageRoot, 'out', 'cli', 'cli.js');
  installElectronBuilderSpawnSafety();
  process.argv = [process.execPath, cliPath, ...cliArgs];
  require(cliPath);
};

module.exports = {
  createElectronBuilderSafeSpawn,
  getElectronBuilderCliArgs,
  inspectElectronBuilderNpmCollectorSpawn,
  isElectronBuilderNpmCollectorSpawn,
};

if (require.main === module) {
  run();
}
