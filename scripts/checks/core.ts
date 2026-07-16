import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { packageManagerCommand } from '../deploy_runtime.ts';

type Severity = 'error' | 'warning';
export type Finding = { severity: Severity; code: string; message: string; file?: string };

/*
 * Findings use stable codes so documentation and CI logs can identify the
 * protected boundary. Errors fail the final command; warnings are advisory.
 */
export class Audit {
  readonly findings: Finding[] = [];

  error(code: string, message: string, file?: string): void {
    this.findings.push({ severity: 'error', code, message, ...(file ? { file } : {}) });
  }

  warn(code: string, message: string, file?: string): void {
    this.findings.push({ severity: 'warning', code, message, ...(file ? { file } : {}) });
  }

  print(): void {
    for (const finding of this.findings) {
      const location = finding.file ? ` ${finding.file}` : '';
      console.log(
        `[${finding.severity.toUpperCase()}] ${finding.code}${location}: ${finding.message}`
      );
    }
    const errors = this.findings.filter(item => item.severity === 'error').length;
    const warnings = this.findings.length - errors;
    console.log(`\nSelf-check findings: ${errors} error(s), ${warnings} warning(s).`);
  }

  get failed(): boolean {
    return this.findings.some(item => item.severity === 'error');
  }
}

const ignoredDirectories = new Set([
  '.astro',
  '.git',
  '.vercel',
  '.wrangler',
  'dist',
  'lighthouse_tmp',
  'node_modules',
  'playwright-report',
  'test-results',
  'tmp',
]);

// Walk only reviewable project files; generated/vendor directories are audited separately.
export function walkFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

export function relative(file: string): string {
  return path.relative(process.cwd(), file).replaceAll('\\', '/');
}

export function readText(file: string): string {
  return fs.readFileSync(file, 'utf8');
}

export function run(command: string, args: string[], label: string): void {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) throw new Error(`${label} could not start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${label} failed with exit code ${result.status ?? 1}.`);
}

export function capture(command: string, args: string[]): string | null {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    shell: false,
  });
  return result.status === 0 ? result.stdout : null;
}

export function runPackageManager(args: string[], label: string): void {
  const command = packageManagerCommand(args);
  run(command.command, command.args, label);
}
