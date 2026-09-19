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

  test('rejects excessive nesting even when there are no files', () => {
    fs.mkdirSync(path.join(root, ...Array<string>(66).fill('d')), { recursive: true });
    expect(() => collectStaticDeployFiles(root, { maxFiles: 100, maxTotalBytes: 1024 }))
      .toThrow('directory depth limit');
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
    for (const name of ['src', 'public', 'scripts', '.git', 'node_modules']) {
      expect(() => assertSafeOutputPath(project, path.join(project, name))).toThrow(/Unsafe output directory/);
    }
  });

  test.each(['.env.production', 'id_ed25519', 'private.pem', '.npmrc'])('rejects sensitive output %s', name => {
    fs.writeFileSync(path.join(root, name), 'fixture');
    expect(() => collectStaticDeployFiles(root, { maxFiles: 10, maxTotalBytes: 100 })).toThrow(/sensitive file/);
  });
});
