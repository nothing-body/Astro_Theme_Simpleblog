#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { ensureGitignoreSafety } from './deploy_safety.ts';
import { readBoundedJsonResponse } from './deploy_http.ts';
import { loadEnvFile } from './deploy_env.ts';
import { stripLangArgs, t } from './deploy_i18n.ts';
import {
  ensureNodeRuntime,
  ensurePackageManagerRuntime,
  runPackageScript,
} from './deploy_runtime.ts';
import {
  assertSafeOutputPath,
  collectStaticDeployFiles,
  type StaticDeployFile,
} from './static_deploy_files.ts';
import { createVercelStaticConfig } from './vercel_static_config.ts';

const MAX_DEPLOY_FILES = 10_000;
const MAX_DEPLOY_BYTES = 256 * 1024 * 1024;
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_RESPONSE_BYTES = 128 * 1024;
const UPLOAD_CONCURRENCY = 4;
const args = stripLangArgs(process.argv.slice(2));
const options = {
  env: '.env.vercel',
  production: true,
  skipClean: false,
};

for (const arg of args) {
  if (arg === '--preview') options.production = false;
  else if (arg === '--skip-clean') options.skipClean = true;
  else if (arg.startsWith('--env=')) options.env = arg.slice('--env='.length);
  else throw new Error(`Unknown Vercel deployment option: ${arg}`);
}

function fail(message: string): never {
  throw new Error(`[vercel-deploy] ${message}`);
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

function readProjectName(): string {
  const configured = process.env.VERCEL_PROJECT_NAME?.trim();
  if (configured) return configured;
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { name?: unknown };
    return typeof pkg.name === 'string' ? pkg.name : '';
  } catch {
    return '';
  }
}

function apiUrl(pathname: string, teamId: string): URL {
  const url = new URL(pathname, 'https://api.vercel.com');
  if (teamId) url.searchParams.set('teamId', teamId);
  return url;
}

async function readApiResponse(response: Response): Promise<unknown> {
  try {
    return await readBoundedJsonResponse(response, MAX_RESPONSE_BYTES, 'Vercel');
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

function apiError(result: unknown, status: number): string {
  if (typeof result !== 'object' || result === null) return `HTTP ${status}`;
  const error = (result as { error?: unknown }).error;
  if (typeof error === 'object' && error !== null) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message.slice(0, 300);
  }
  return `HTTP ${status}`;
}

type VercelFile = StaticDeployFile & {
  sha: string;
};

async function sha1File(filePath: string): Promise<string> {
  const hash = createHash('sha1');
  for await (const chunk of fs.createReadStream(filePath)) {
    hash.update(chunk as Buffer);
  }
  return hash.digest('hex');
}

async function describeFiles(files: StaticDeployFile[]): Promise<VercelFile[]> {
  const described: VercelFile[] = [];
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      fail(`Vercel deployment file exceeds 64 MiB: ${file.deploymentPath}`);
    }
    described.push({ ...file, sha: await sha1File(file.absolutePath) });
  }
  return described;
}

async function uploadFile(file: VercelFile, token: string, teamId: string): Promise<void> {
  const body = Readable.toWeb(fs.createReadStream(file.absolutePath)) as ReadableStream<Uint8Array>;
  const response = await fetch(apiUrl('/v2/files', teamId), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Length': String(file.size),
      'Content-Type': 'application/octet-stream',
      'x-vercel-digest': file.sha,
    },
    body,
    duplex: 'half',
    signal: AbortSignal.timeout(120_000),
  } as RequestInit & { duplex: 'half' });
  const result = await readApiResponse(response);
  if (!response.ok) {
    fail(
      `Vercel file upload failed for ${file.deploymentPath}: ${apiError(result, response.status)}`
    );
  }
}

async function uploadFiles(files: VercelFile[], token: string, teamId: string): Promise<void> {
  const unique = [...new Map(files.map(file => [file.sha, file])).values()];
  for (let index = 0; index < unique.length; index += UPLOAD_CONCURRENCY) {
    await Promise.all(
      unique.slice(index, index + UPLOAD_CONCURRENCY).map(file => uploadFile(file, token, teamId))
    );
  }
}

async function createDeployment(
  files: VercelFile[],
  credentials: {
    projectId: string;
    projectName: string;
    teamId: string;
    token: string;
  }
): Promise<{ id?: string; readyState?: string; url?: string }> {
  const response = await fetch(apiUrl('/v13/deployments', credentials.teamId), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${credentials.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: credentials.projectName,
      project: credentials.projectId,
      files: files.map(file => ({
        file: file.deploymentPath,
        sha: file.sha,
        size: file.size,
      })),
      projectSettings: { framework: null },
      ...(options.production ? { target: 'production' } : {}),
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const result = await readApiResponse(response);
  if (!response.ok) fail(`Vercel deployment failed: ${apiError(result, response.status)}`);
  if (typeof result !== 'object' || result === null || Array.isArray(result)) {
    fail('Vercel returned an invalid deployment response.');
  }
  return result as { id?: string; readyState?: string; url?: string };
}

ensureNodeRuntime();
ensurePackageManagerRuntime();
await ensureGitignoreSafety();
loadEnvFile(options.env);

const token = process.env.VERCEL_TOKEN?.trim() ?? '';
const projectId = process.env.VERCEL_PROJECT_ID?.trim() ?? '';
const teamId = process.env.VERCEL_ORG_ID?.trim() ?? '';
const projectName = readProjectName();
if (!token || !projectId) fail('VERCEL_TOKEN and VERCEL_PROJECT_ID are required.');
if (/[\0\r\n]/.test(token) || token.length > 2048) fail('VERCEL_TOKEN is invalid.');
if (!/^[A-Za-z0-9_-]{3,100}$/.test(projectId)) fail('VERCEL_PROJECT_ID is invalid.');
if (teamId && !/^[A-Za-z0-9_-]{3,100}$/.test(teamId)) fail('VERCEL_ORG_ID is invalid.');
if (!/^[a-z0-9][a-z0-9._-]{0,99}$/.test(projectName)) {
  fail('VERCEL_PROJECT_NAME or package.json name must be a safe lowercase project name.');
}

const distPath = path.resolve(process.cwd(), 'dist');
try {
  assertSafeOutputPath(process.cwd(), distPath);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
if (!options.skipClean && fs.existsSync(distPath)) {
  fs.rmSync(distPath, { force: true, recursive: true });
}

if (process.env.DEPLOY_CHECKED !== '1') {
  runPackageScript('check', [], run, 'Project checks failed.');
}
runPackageScript('build', [], run, 'Build failed.');
if (!fs.existsSync(distPath)) fail(`${t('common.distMissing')}: dist`);

const files = collectStaticDeployFiles(distPath, {
  maxFiles: MAX_DEPLOY_FILES - 1,
  maxTotalBytes: MAX_DEPLOY_BYTES,
});
if (files.some(file => file.deploymentPath === 'vercel.json')) {
  fail('Build output unexpectedly contains vercel.json.');
}
const configPath = path.resolve('vercel.json');
const configStat = fs.lstatSync(configPath);
if (configStat.isSymbolicLink() || !configStat.isFile()) {
  fail('vercel.json must be a regular file.');
}
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-vercel-deploy-'));
try {
  const deploymentConfigPath = path.join(temporaryDirectory, 'vercel.json');
  let sourceConfig: unknown;
  try {
    sourceConfig = JSON.parse(fs.readFileSync(configPath, 'utf8')) as unknown;
  } catch {
    fail('vercel.json contains invalid JSON.');
  }
  const deploymentConfig = JSON.stringify(createVercelStaticConfig(sourceConfig));
  if (Buffer.byteLength(deploymentConfig, 'utf8') > 256 * 1024) {
    fail('The generated Vercel static configuration is too large.');
  }
  fs.writeFileSync(deploymentConfigPath, deploymentConfig, {
    encoding: 'utf8',
    mode: 0o600,
  });
  const deploymentConfigStat = fs.lstatSync(deploymentConfigPath);
  files.push({
    absolutePath: deploymentConfigPath,
    deploymentPath: 'vercel.json',
    size: deploymentConfigStat.size,
  });
  if (files.reduce((total, file) => total + file.size, 0) > MAX_DEPLOY_BYTES) {
    fail('Vercel deployment exceeds the total byte safety limit.');
  }

  const describedFiles = await describeFiles(files);
  await uploadFiles(describedFiles, token, teamId);
  const deployment = await createDeployment(describedFiles, {
    projectId,
    projectName,
    teamId,
    token,
  });
  const deploymentUrl = deployment.url ? `https://${deployment.url}` : '';
  console.log(
    `${t('common.deployCompleted')} ${deploymentUrl || deployment.id || deployment.readyState || ''}`.trim()
  );
} finally {
  fs.rmSync(temporaryDirectory, { force: true, recursive: true });
}
