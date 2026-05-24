#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const pnpmExecPath = process.env.npm_execpath;
const pnpmCommand = pnpmExecPath ? process.execPath : process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const pnpmArgsPrefix = pnpmExecPath ? [pnpmExecPath] : [];

const checks = [
  {
    name: 'Build',
    command: pnpmCommand,
    args: [...pnpmArgsPrefix, 'build'],
  },
  {
    name: 'Astro check',
    command: pnpmCommand,
    args: [...pnpmArgsPrefix, 'check'],
  },
  {
    name: 'ESLint',
    command: pnpmCommand,
    args: [...pnpmArgsPrefix, 'lint'],
  },
  {
    name: 'Stylelint',
    command: pnpmCommand,
    args: [...pnpmArgsPrefix, 'lint:css'],
  },
  {
    name: 'Unit and e2e tests',
    command: pnpmCommand,
    args: [...pnpmArgsPrefix, 'test'],
  },
];

const dangerousPatterns = [
  'eval\\(',
  'new Function',
  'innerHTML',
  'outerHTML',
  'insertAdjacentHTML',
  'document\\.write',
  'shell:\\s*true',
];

function runCheck(check) {
  console.log(`\n=== ${check.name} ===`);
  const result = spawnSync(check.command, check.args, {
    stdio: 'inherit',
    env: process.env,
    shell: false,
  });

  if (result.error) {
    console.error(`Unable to run ${check.name}: ${result.error.message}`);
    return 1;
  }

  return result.status ?? 1;
}

function runRipgrep(pattern) {
  const result = spawnSync(
    'rg',
    [
      '-n',
      '-g',
      '!scripts/analysis.mjs',
      '-g',
      '!backup/**',
      '-g',
      '!dist/**',
      '-g',
      '!node_modules/**',
      pattern,
      'src',
      'scripts',
      'astro.config.mjs',
      'run-lh.mjs',
      'eslint.config.mjs',
      'postcss.config.cjs',
      'playwright.config.cjs',
      'jest.config.cjs',
    ],
    {
      stdio: 'inherit',
      env: process.env,
    }
  );

  if (result.error) {
    console.error(`Unable to run rg: ${result.error.message}`);
    return 1;
  }

  return result.status === 0 ? 1 : 0;
}

let failures = 0;
for (const check of checks) {
  if (runCheck(check) !== 0) failures += 1;
}

console.log('\n=== Dangerous syntax scan ===');
for (const pattern of dangerousPatterns) {
  console.log(`\nPattern: ${pattern}`);
  failures += runRipgrep(pattern);
}

if (failures > 0) {
  console.error(`\nAnalysis completed with ${failures} failing check(s).`);
  process.exit(1);
}

console.log('\nAnalysis completed successfully.');
