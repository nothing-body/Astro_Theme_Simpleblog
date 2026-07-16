#!/usr/bin/env node
/**
 * Upload built dist/ to a VPS directory through OpenSSH.
 * Uses rsync when available and an atomic scp/ssh fallback otherwise.
 *
 * Primary usage:
 *   pnpm uploaddist:vps:node
 *
 * Required environment variables:
 *   VPS_HOST              e.g. 203.0.113.10
 *   VPS_USER              e.g. deploy
 *   VPS_TARGET_DIR        e.g. /var/www/example.com
 *
 * Optional environment variables:
 *   VPS_PORT              default: 22
 *   VPS_SSH_KEY_PATH      default: ~/.ssh/id_rsa
 *   VPS_SSH_PASSPHRASE    optional private-key passphrase; ssh-agent is safer
 *
 * Common CI flow:
 *   1) Write secret key into ~/.ssh/id_rsa
 *   2) chmod 600 ~/.ssh/id_rsa
 *   3) run pnpm uploaddist:vps:node
 *
 * Options:
 *   --dist=dist
 *   --env=.env.vps
 *   --skip-clean
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { ensureGitignoreSafety } from './deploy_safety.ts';
import { loadEnvFile } from './deploy_env.ts';
import { stripLangArgs, t } from './deploy_i18n.ts';
import {
  commandAvailable,
  ensureNodeRuntime,
  ensurePackageManagerRuntime,
  runPackageScript,
} from './deploy_runtime.ts';
import {
  activateStagingCommand,
  cleanupStagingCommand,
  getStagingPaths,
  isSafeRemoteTargetPath,
  prepareStagingCommand,
  selectVpsTransport,
} from './vps_transport.ts';
import { createVpsConnection } from './vps_connection.ts';

const args = stripLangArgs(process.argv.slice(2));
const options = {
  dist: 'dist',
  env: '.env.vps',
  skipClean: false,
  prebuilt: false,
};

for (const arg of args) {
  if (arg === '--skip-clean') {
    options.skipClean = true;
    continue;
  }
  if (arg === '--prebuilt') {
    options.prebuilt = true;
    continue;
  }
  if (arg.startsWith('--dist=')) {
    options.dist = arg.slice('--dist='.length);
    continue;
  }
  if (arg.startsWith('--env=')) {
    options.env = arg.slice('--env='.length);
    continue;
  }
}

const color = {
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  reset: '\x1b[0m',
};
type Tone = 'yellow' | 'cyan' | 'green';

function info(message: string, tone: Tone = 'cyan'): void {
  const c = color[tone] ?? '';
  const reset = c ? color.reset : '';
  console.log(`${c}${message}${reset}`);
}

function fail(message: string): never {
  console.error(`\n[vps-deploy] ${message}`);
  process.exit(1);
}

const unknownArgs = args.filter(
  arg =>
    arg !== '--skip-clean' &&
    arg !== '--prebuilt' &&
    !['--dist=', '--env='].some(prefix => arg.startsWith(prefix))
);
if (unknownArgs.length > 0) fail(`Unknown option: ${unknownArgs.join(', ')}`);

function run(
  command: string,
  commandArgs: string[],
  errorMessage: string,
  env: NodeJS.ProcessEnv = process.env
): void {
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    env,
  });
  if (result.error || result.status !== 0) fail(errorMessage);
}

function runPackageTool(args: [string, ...string[]], errorMessage: string): void {
  const [script, ...scriptArgs] = args;
  if (script === 'check' || script === 'build') {
    runPackageScript(script, scriptArgs, run, errorMessage);
  }
}

function assertSafeDistPath(distPath: string): void {
  const cwd = process.cwd();
  const relative = path.relative(cwd, distPath);

  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    fail(`Refusing to use unsafe dist path '${options.dist}'. It must stay inside the project.`);
  }
  const generatedName = ['dist', 'build', 'output'].some(
    prefix =>
      relative === prefix ||
      ['-', '_', '.'].some(separator => relative.startsWith(`${prefix}${separator}`))
  );
  const safeName = [...relative].every(char => /[A-Za-z0-9._-]/.test(char));
  if (!options.skipClean && !options.prebuilt && (!generatedName || !safeName)) {
    fail(
      `Refusing to delete custom output path '${options.dist}'. Use --skip-clean for a prebuilt custom directory.`
    );
  }
}

ensureNodeRuntime();
ensurePackageManagerRuntime();
await ensureGitignoreSafety();
if (!commandAvailable('ssh')) fail("Required command 'ssh' was not found.");
const transport = selectVpsTransport(commandAvailable('rsync'), commandAvailable('scp'));
if (!transport) fail("Install 'rsync' or the OpenSSH 'scp' command before VPS deployment.");
if (loadEnvFile(options.env)) info(`==> ${t('common.loadingEnv')}: '${options.env}'`);
else info(`==> ${t('common.envMissing')} (${options.env})`, 'yellow');

const host = process.env.VPS_HOST ?? '';
const user = process.env.VPS_USER ?? '';
const targetDir = process.env.VPS_TARGET_DIR ?? '';

if (!host || !user || !targetDir) {
  fail('Missing required VPS envs. Need VPS_HOST, VPS_USER, VPS_TARGET_DIR.');
}

if (!isSafeRemoteTargetPath(targetDir)) {
  fail(
    'VPS_TARGET_DIR must be an absolute Unix path using only letters, numbers, dot, dash, underscore, tilde and slash.'
  );
}

const distPath = path.resolve(process.cwd(), options.dist);
assertSafeDistPath(distPath);
if (!options.skipClean && !options.prebuilt && fs.existsSync(distPath)) {
  info(`==> ${t('common.cleaning')} '${options.dist}'...`, 'yellow');
  fs.rmSync(distPath, { recursive: true, force: true });
}

if (process.env.DEPLOY_CHECKED !== '1') {
  info(`==> ${t('common.deploymentCheck')}`);
  runPackageTool(['check'], 'Project checks failed.');
}

if (!options.prebuilt) {
  info(`==> ${t('common.building')}`);
  runPackageTool(
    options.dist === 'dist' ? ['build'] : ['build', '--outDir', options.dist],
    'Build failed.'
  );
}

if (!fs.existsSync(distPath)) {
  fail(`${t('common.distMissing')}: '${options.dist}'.`);
}

info(`==> ${t('notice.vpsUser')}: ${user}`);
info(`==> ${t('notice.vpsTarget')}: ${targetDir}`);
if (user !== 'root' && targetDir.startsWith('/var/www/')) {
  info(`==> ${t('notice.vpsNonRoot')}`, 'yellow');
}
info(`==> ${t('vps.uploading')}: ${user}@${host}:${targetDir}`);
info(`==> VPS transport: ${transport}`);
const connection = createVpsConnection(() => info(`==> ${t('vps.passDetected')}`, 'yellow'));
try {
  const { env: sshEnv, remote, rsyncSshCommand, scpArgs, sshArgs } = connection;
  const nonce = `${Date.now()}-${process.pid}`;
  const { staging } = getStagingPaths(targetDir, nonce);
  run(
    'ssh',
    [...sshArgs, prepareStagingCommand(targetDir, nonce)],
    'Unable to prepare VPS staging directory.',
    sshEnv
  );
  if (transport === 'rsync') {
    const copied = spawnSync(
      'rsync',
      ['-az', '--delete', '-e', rsyncSshCommand, `${options.dist}/`, `${remote}:${staging}/`],
      { stdio: 'inherit', env: sshEnv, cwd: process.cwd() }
    );
    if (copied.error || copied.status !== 0) {
      spawnSync('ssh', [...sshArgs, cleanupStagingCommand(targetDir, nonce)], {
        stdio: 'ignore',
        env: sshEnv,
      });
      fail('Rsync upload failed. The current deployed directory was not changed.');
    }
  } else {
    const copied = spawnSync(
      'scp',
      ['-r', ...scpArgs, `${options.dist.replaceAll('\\', '/')}/.`, `${remote}:${staging}/`],
      { stdio: 'inherit', env: sshEnv, cwd: process.cwd() }
    );
    if (copied.error || copied.status !== 0) {
      spawnSync('ssh', [...sshArgs, cleanupStagingCommand(targetDir, nonce)], {
        stdio: 'ignore',
        env: sshEnv,
      });
      fail('SCP upload failed. The current deployed directory was not changed.');
    }
  }
  run(
    'ssh',
    [...sshArgs, activateStagingCommand(targetDir, nonce)],
    'Unable to activate the staged VPS deployment.',
    sshEnv
  );
} finally {
  connection.dispose();
}

info(`==> ${t('common.deployCompleted')}`, 'green');
