import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assertSafeOutputPath,
  collectStaticDeployFiles,
} from './static_deploy_files';

describe('static deployment file boundaries', () => {
  let root = '';

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-static-deploy-test-'));
  });

  afterEach(() => {
    fs.rmSync(root, { force: true, recursive: true });
  });

  test('collects sorted files with portable deployment paths', () => {
    fs.mkdirSync(path.join(root, 'nested'));
    fs.writeFileSync(path.join(root, 'z.txt'), 'z');
    fs.writeFileSync(path.join(root, 'nested', 'a.txt'), 'a');

    expect(
      collectStaticDeployFiles(root, { maxFiles: 2, maxTotalBytes: 2 }).map(file => ({
        deploymentPath: file.deploymentPath,
        size: file.size,
      }))
    ).toEqual([
      { deploymentPath: 'nested/a.txt', size: 1 },
      { deploymentPath: 'z.txt', size: 1 },
    ]);
  });

  test('rejects file-count and byte limits', () => {
    fs.writeFileSync(path.join(root, 'a.txt'), 'abc');
    fs.writeFileSync(path.join(root, 'b.txt'), 'def');

    expect(() =>
      collectStaticDeployFiles(root, { maxFiles: 1, maxTotalBytes: 100 })
    ).toThrow(/file safety limit/);
    expect(() =>
      collectStaticDeployFiles(root, { maxFiles: 10, maxTotalBytes: 5 })
    ).toThrow(/MiB safety limit/);
  });

  test('requires the output directory to stay below the project root', () => {
    const project = path.join(root, 'project');
    const output = path.join(project, 'dist');
    fs.mkdirSync(output, { recursive: true });

    expect(() => assertSafeOutputPath(project, output)).not.toThrow();
    expect(() => assertSafeOutputPath(project, root)).toThrow(/Unsafe output directory/);
  });
});
