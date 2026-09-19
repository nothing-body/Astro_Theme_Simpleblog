import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Audit } from './core';
import { checkOutput } from './output';

describe('output audit mutation regressions', () => {
  const cwd = process.cwd();
  let root = '';
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-output-audit-'));
    process.chdir(root);
    fs.mkdirSync('dist');
    fs.mkdirSync('public');
    fs.writeFileSync('public/_headers', '/*\n  Content-Security-Policy: default-src self\n');
    fs.writeFileSync('dist/index.html', '<html lang="en"><head></head><body></body></html>');
  });
  afterEach(() => {
    process.chdir(cwd);
    fs.rmSync(root, { recursive: true, force: true });
  });
  const codes = () => {
    const audit = new Audit();
    checkOutput(audit);
    return audit.findings.map(finding => finding.code);
  };
  test('detects a credential file added after the build', () => {
    expect(codes()).not.toContain('BUILD006');
    fs.writeFileSync('dist/.env.production', 'FIXTURE=not-a-secret');
    expect(codes()).toContain('BUILD006');
  });
  test('detects an executable inline script added to generated HTML', () => {
    expect(codes()).not.toContain('CSP002');
    fs.appendFileSync('dist/index.html', '<script>window.fixture = true</script>');
    expect(codes()).toContain('CSP002');
  });
  test('reports missing build output instead of passing an empty scan', () => {
    fs.rmSync('dist', { recursive: true });
    expect(codes()).toContain('BUILD001');
  });
});
