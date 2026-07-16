#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { loadEnvFile } from './deploy_env.ts';
import { stripLangArgs, t } from './deploy_i18n.ts';
import {
  commandAvailable,
  ensureNodeRuntime,
  ensurePackageManagerRuntime,
  packageScriptCommand,
  runPackageScript,
} from './deploy_runtime.ts';
import { ensureGitignoreSafety } from './deploy_safety.ts';
import { isSafeRemoteTargetPath } from './vps_transport.ts';
import { createVpsConnection } from './vps_connection.ts';

const args = stripLangArgs(process.argv.slice(2));
const options = { env: '.env.vps-docker', skipClean: false };
for (const arg of args) {
  if (arg === '--skip-clean') options.skipClean = true;
  else if (arg.startsWith('--env=')) options.env = arg.slice('--env='.length);
  else throw new Error(`Unknown VPS Docker deployment option: ${arg}`);
}

const bundleDir = '.deploy-vps-docker';
const distDir = 'dist';

function fail(message: string): never {
  throw new Error(`[vps-docker-deploy] ${message}`);
}

function run(
  command: string,
  commandArgs: string[],
  errorMessage: string,
  env: NodeJS.ProcessEnv = process.env
): void {
  const result = spawnSync(command, commandArgs, { env, stdio: 'inherit' });
  if (result.error || result.status !== 0) fail(errorMessage);
}

function quoteRemote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function isIpv4Address(value: string): boolean {
  const parts = value.split('.');
  return (
    parts.length === 4 &&
    parts.every(part => {
      if (!part || part.length > 3 || [...part].some(character => character < '0' || character > '9')) {
        return false;
      }
      const octet = Number(part);
      return octet >= 0 && octet <= 255;
    })
  );
}

ensureNodeRuntime();
ensurePackageManagerRuntime();
await ensureGitignoreSafety();
loadEnvFile(options.env);
if (!commandAvailable('ssh')) fail("Required command 'ssh' was not found.");

const appDir = process.env.VPS_DOCKER_APP_DIR?.trim() ?? '';
const projectName = process.env.VPS_DOCKER_PROJECT_NAME?.trim() || 'astro-simpleblog';
const bindAddress = process.env.VPS_DOCKER_BIND_ADDRESS?.trim() || '127.0.0.1';
const httpPort = process.env.VPS_DOCKER_HTTP_PORT?.trim() || '8080';
if (!isSafeRemoteTargetPath(appDir)) {
  fail('VPS_DOCKER_APP_DIR must be a safe absolute Unix path.');
}
if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(projectName)) {
  fail('VPS_DOCKER_PROJECT_NAME is invalid.');
}
if (!isIpv4Address(bindAddress)) {
  fail('VPS_DOCKER_BIND_ADDRESS must be an IPv4 address.');
}
if (
  bindAddress === '0.0.0.0' &&
  process.env.VPS_DOCKER_ALLOW_PUBLIC_BIND?.trim() !== '1'
) {
  fail('Public Docker binding requires VPS_DOCKER_ALLOW_PUBLIC_BIND=1.');
}
if (!/^\d{1,5}$/.test(httpPort) || Number(httpPort) < 1 || Number(httpPort) > 65535) {
  fail('VPS_DOCKER_HTTP_PORT must be between 1 and 65535.');
}

if (process.env.DEPLOY_CHECKED !== '1') {
  runPackageScript('check', [], run, 'Project checks failed.');
}
if (!options.skipClean && fs.existsSync(distDir)) {
  fs.rmSync(distDir, { force: true, recursive: true });
}
runPackageScript('build', [], run, 'Build failed.');

const bundlePath = path.resolve(bundleDir);
if (fs.existsSync(bundlePath)) fs.rmSync(bundlePath, { force: true, recursive: true });
fs.mkdirSync(bundlePath, { recursive: true });
fs.cpSync(path.resolve(distDir), path.join(bundlePath, 'site'), { recursive: true });
fs.copyFileSync('deploy/vps-docker/Dockerfile', path.join(bundlePath, 'Dockerfile'));
fs.copyFileSync('deploy/vps-docker/compose.yaml', path.join(bundlePath, 'compose.yaml'));
fs.copyFileSync('deploy/vps-docker/nginx.conf', path.join(bundlePath, 'nginx.conf'));
fs.copyFileSync(
  'deploy/nginx-security-headers.conf',
  path.join(bundlePath, 'security-headers.conf')
);
fs.writeFileSync(
  path.join(bundlePath, '.env'),
  `SITE_BIND_ADDRESS=${bindAddress}\nSITE_HTTP_PORT=${httpPort}\n`,
  'utf8'
);

process.env.VPS_TARGET_DIR = appDir;
const upload = packageScriptCommand('uploaddist:vps:node', [
  `--dist=${bundleDir}`,
  `--env=${options.env}`,
  '--prebuilt',
]);
run(upload.command, upload.args, 'Unable to upload the Docker deployment bundle.', {
  ...process.env,
  DEPLOY_CHECKED: '1',
});

const connection = createVpsConnection();
try {
  const app = quoteRemote(appDir);
  const project = quoteRemote(projectName);
  const remoteCommand = [
    'set -eu',
    'docker compose version >/dev/null',
    `cd ${app}`,
    `docker compose --project-name ${project} up -d --build --remove-orphans`,
  ].join('; ');
  run('ssh', [...connection.sshArgs, remoteCommand], 'Remote Docker deployment failed.', connection.env);
} finally {
  connection.dispose();
  fs.rmSync(bundlePath, { force: true, recursive: true });
}

console.log(t('common.deployCompleted'));
