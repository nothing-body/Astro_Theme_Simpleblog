#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { loadEnvFile } from './deploy_env.ts';
import { stripLangArgs, t } from './deploy_i18n.ts';
import {
  ensureNodeRuntime,
  ensurePackageManagerRuntime,
  packageExecCommand,
  runPackageScript,
} from './deploy_runtime.ts';
import { ensureGitignoreSafety } from './deploy_safety.ts';

const args = stripLangArgs(process.argv.slice(2));
const options = { env: '.env.supabase', functionName: '' };

for (const arg of args) {
  if (arg.startsWith('--env=')) options.env = arg.slice('--env='.length);
  else if (arg.startsWith('--function=')) {
    options.functionName = arg.slice('--function='.length);
  } else {
    throw new Error(`Unknown Supabase deployment option: ${arg}`);
  }
}

function fail(message: string): never {
  throw new Error(`[supabase-deploy] ${message}`);
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

function availableFunctions(): string[] {
  const functionsDir = path.resolve('supabase/functions');
  if (!fs.existsSync(functionsDir)) return [];
  return fs
    .readdirSync(functionsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^[a-z0-9][a-z0-9_-]{0,62}$/.test(entry.name))
    .filter(entry => fs.existsSync(path.join(functionsDir, entry.name, 'index.ts')))
    .map(entry => entry.name)
    .sort();
}

ensureNodeRuntime();
ensurePackageManagerRuntime();
await ensureGitignoreSafety();
loadEnvFile(options.env);

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim() ?? '';
const projectRef =
  process.env.SUPABASE_PROJECT_REF?.trim() ||
  process.env.SUPABASE_PROJECT_ID?.trim() ||
  '';
if (!token || !projectRef) {
  fail('SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF are required.');
}
if (!/^[a-z0-9]{16,32}$/.test(projectRef)) fail('SUPABASE_PROJECT_REF is invalid.');

const functions = availableFunctions();
if (functions.length === 0) {
  fail(
    'No deployable TypeScript Edge Function was found under supabase/functions/<name>/index.ts.'
  );
}
if (options.functionName && !functions.includes(options.functionName)) {
  fail(`Unknown Edge Function '${options.functionName}'. Available: ${functions.join(', ')}`);
}

if (process.env.DEPLOY_CHECKED !== '1') {
  runPackageScript('check', [], run, 'Project checks failed.');
}

const command = packageExecCommand('supabase', [
  'functions',
  'deploy',
  ...(options.functionName ? [options.functionName] : []),
  '--project-ref',
  projectRef,
]);
run(command.command, command.args, 'Supabase Edge Functions deployment failed.', {
  ...process.env,
  SUPABASE_ACCESS_TOKEN: token,
});
console.log(t('common.deployCompleted'));
