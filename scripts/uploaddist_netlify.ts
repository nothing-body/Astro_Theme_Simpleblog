#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { Zip, ZipDeflate } from 'fflate';
import { loadEnvFile } from './deploy_env.ts';
import { stripLangArgs, t } from './deploy_i18n.ts';
import {
  ensureNodeRuntime,
  ensurePackageManagerRuntime,
  runPackageScript,
} from './deploy_runtime.ts';
import { ensureGitignoreSafety } from './deploy_safety.ts';
import { readBoundedJsonResponse } from './deploy_http.ts';
import {
  assertSafeOutputPath,
  collectStaticDeployFiles,
  type StaticDeployFile,
} from './static_deploy_files.ts';

const MAX_DEPLOY_FILES = 25_000;
const MAX_DEPLOY_BYTES = 128 * 1024 * 1024;
const MAX_RESPONSE_BYTES = 64 * 1024;
const args = stripLangArgs(process.argv.slice(2));
const options = {
  dist: 'dist',
  env: '.env.netlify',
  production: true,
  skipClean: false,
};

for (const arg of args) {
  if (arg === '--preview') options.production = false;
  else if (arg === '--skip-clean') options.skipClean = true;
  else if (arg.startsWith('--dist=')) options.dist = arg.slice('--dist='.length);
  else if (arg.startsWith('--env=')) options.env = arg.slice('--env='.length);
  else throw new Error(`Unknown Netlify deployment option: ${arg}`);
}

function fail(message: string): never {
  throw new Error(`[netlify-deploy] ${message}`);
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

async function createDeployArchive(files: StaticDeployFile[], zipPath: string): Promise<void> {
  const descriptor = fs.openSync(zipPath, 'wx', 0o600);
  let settle: (() => void) | null = null;
  let rejectArchive: ((error: Error) => void) | null = null;
  const completed = new Promise<void>((resolve, reject) => {
    settle = resolve;
    rejectArchive = reject;
  });
  const archive = new Zip((error, data, final) => {
    if (error) {
      rejectArchive?.(error);
      return;
    }
    fs.writeSync(descriptor, data);
    if (final) settle?.();
  });

  try {
    for (const file of files) {
      const entry = new ZipDeflate(file.deploymentPath, { level: 6 });
      entry.mtime = new Date('1980-01-01T00:00:00.000Z');
      archive.add(entry);
      for await (const chunk of fs.createReadStream(file.absolutePath)) {
        entry.push(chunk as Buffer);
      }
      entry.push(new Uint8Array(), true);
    }
    archive.end();
    await completed;
  } catch (error) {
    archive.terminate();
    throw error;
  } finally {
    fs.closeSync(descriptor);
  }
}

async function deployArchive(
  zipPath: string,
  siteId: string,
  token: string
): Promise<{ id?: string; state?: string; url?: string }> {
  const endpoint = new URL(
    `https://api.netlify.com/api/v1/sites/${encodeURIComponent(siteId)}/deploys`
  );
  endpoint.searchParams.set('production', options.production ? 'true' : 'false');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/zip',
      'User-Agent': 'astro-simpleblog-deployer/1',
    },
    body: fs.readFileSync(zipPath),
    signal: AbortSignal.timeout(120_000),
  });
  try {
    const result = await readBoundedJsonResponse(response, MAX_RESPONSE_BYTES, 'Netlify');
    if (!response.ok) {
      const message =
        typeof result === 'object' &&
        result !== null &&
        typeof (result as { message?: unknown }).message === 'string'
          ? (result as { message: string }).message.slice(0, 300)
          : `HTTP ${response.status}`;
      fail(`Netlify deployment failed: ${message}`);
    }
    if (typeof result !== 'object' || result === null || Array.isArray(result)) {
      fail('Netlify returned an invalid deployment response.');
    }
    return result as { id?: string; state?: string; url?: string };
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

ensureNodeRuntime();
ensurePackageManagerRuntime();
await ensureGitignoreSafety();
loadEnvFile(options.env);

const token = process.env.NETLIFY_AUTH_TOKEN?.trim() ?? '';
const siteId = process.env.NETLIFY_SITE_ID?.trim() ?? '';
if (!token || !siteId) fail('NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID are required.');
if (/[\0\r\n]/.test(token) || token.length > 2048) fail('NETLIFY_AUTH_TOKEN is invalid.');
if (!/^[A-Za-z0-9.-]{3,100}$/.test(siteId)) fail('NETLIFY_SITE_ID is invalid.');

const distPath = path.resolve(process.cwd(), options.dist);
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
runPackageScript(
  'build',
  options.dist === 'dist' ? [] : ['--outDir', options.dist],
  run,
  'Build failed.'
);
if (!fs.existsSync(distPath)) fail(`${t('common.distMissing')}: ${options.dist}`);

const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-netlify-deploy-'));
const zipPath = path.join(tempDirectory, 'site.zip');
try {
  const files = collectStaticDeployFiles(distPath, {
    maxFiles: MAX_DEPLOY_FILES,
    maxTotalBytes: MAX_DEPLOY_BYTES,
  });
  await createDeployArchive(files, zipPath);
  const result = await deployArchive(zipPath, siteId, token);
  console.log(
    `${t('common.deployCompleted')} ${result.url ?? result.id ?? result.state ?? ''}`.trim()
  );
} finally {
  fs.rmSync(tempDirectory, { force: true, recursive: true });
}
