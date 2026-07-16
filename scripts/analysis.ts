#!/usr/bin/env node
/*
 * Self-check orchestrator.
 *
 * Quick mode audits source, content, images, TypeScript, lint rules,
 * dependency usage, and unit tests. Full mode additionally performs the OSV
 * vulnerability query, production build/output audit, every supported
 * deployment plan as a no-upload dry run, and Playwright E2E tests.
 *
 * Individual findings are accumulated so one run exposes multiple problems.
 * ERROR findings make the process exit non-zero; WARNING findings remain
 * visible without blocking release. Use --explain for the rule-group catalog.
 */
import process from 'node:process';
import { Audit, runPackageManager } from './checks/core.ts';
import { checkSource } from './checks/source.ts';
import { checkContent } from './checks/content.ts';
import { checkImages } from './checks/images.ts';
import { checkOutput } from './checks/output.ts';
import { printRuleCatalog } from './checks/rule-catalog.ts';

const flags = new Set(process.argv.slice(2));
if (flags.has('--explain') || flags.has('--help')) {
  printRuleCatalog();
  process.exit(0);
}
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
inspect('Image audit failed', () => checkImages(audit));

command(['run', 'check:base'], 'Type, lint, CSS, dependency, and unit checks');
if (!quick) {
  command(['run', 'audit:security'], 'Dependency vulnerability audit');
  const built = command(['run', 'build'], 'Production build');
  if (built) inspect('Generated output audit failed', () => checkOutput(audit));
  else
    audit.error(
      'BUILD005',
      'Generated output audit and E2E were skipped because the production build failed.'
    );

  const deploymentModes = [
    'direct:cf',
    'direct:vps',
    'direct:vps-docker',
    'direct:vercel',
    'direct:netlify',
    'direct:supabase',
    'direct:cf+vps+vps-docker+vercel+netlify',
    'github:cf+vps+vps-docker+vercel+netlify+supabase',
    'gitlab:cf+netlify+supabase',
    'codeberg:vps+vps-docker',
  ];
  for (const language of ['en', 'zh-tw', 'zh-cn']) {
    for (const mode of deploymentModes) {
      command(
        ['run', 'deploy:switch', `--mode=${mode}`, `--lang=${language}`, '--dry-run', '--yes'],
        `Deployment dry run (${mode}, ${language})`
      );
    }
  }
  if (built) command(['run', 'test:e2e'], 'Playwright end-to-end checks');
}

audit.print();
if (audit.failed) process.exitCode = 1;
