#!/usr/bin/env node
import process from 'node:process';
import { Audit, runPackageManager } from './checks/core.ts';
import { checkSource } from './checks/source.ts';
import { checkContent } from './checks/content.ts';
import { checkOutput } from './checks/output.ts';

const flags = new Set(process.argv.slice(2));
const quick = flags.has('--quick');
const audit = new Audit();

console.log('SimpleBlog full-project self-check');

function inspect(label: string, task: () => void): boolean {
  try {
    task();
    return true;
  } catch (error) {
    audit.error('CHECK001', `${label}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

function command(args: string[], label: string): boolean {
  return inspect(label, () => runPackageManager(args, label));
}

inspect('Source audit failed', () => checkSource(audit));
inspect('Content audit failed', () => checkContent(audit));

command(['run', 'check:base'], 'Type, lint, CSS, dependency, and unit checks');
if (!quick) {
  command(['audit', '--audit-level', 'low'], 'Dependency vulnerability audit');
  const built = command(['run', 'build'], 'Production build');
  if (built) inspect('Generated output audit failed', () => checkOutput(audit));
  else audit.error('BUILD005', 'Generated output audit and E2E were skipped because the production build failed.');

  for (const mode of ['direct:cf', 'direct:vps', 'direct:vercel', 'direct:cf+vps+vercel', 'github:cf+vps+vercel']) {
    command(
      ['run', 'deploy:switch', '--', `--mode=${mode}`, '--dry-run', '--yes'],
      `Deployment dry run (${mode})`
    );
  }
  if (built) command(['run', 'test:e2e'], 'Playwright end-to-end checks');
}

audit.print();
if (audit.failed) process.exitCode = 1;
