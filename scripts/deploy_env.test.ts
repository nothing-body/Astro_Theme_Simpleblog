import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadEnvFile, readEnvFileValues, resolveEnvFilePath, updateEnvValue } from './deploy_env';

describe('deployment environment files', () => {
  const originalCwd = process.cwd();
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-deploy-env-'));
    process.chdir(workspace);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  test('reads quoted values and does not overwrite existing process values', () => {
    fs.writeFileSync('.env.test', 'TOKEN="from-file"\nexport TARGET=pages\n', 'utf8');
    expect(readEnvFileValues('.env.test')).toEqual(
      new Map([
        ['TOKEN', 'from-file'],
        ['TARGET', 'pages'],
      ])
    );
    const target: NodeJS.ProcessEnv = { TOKEN: 'existing' };
    expect(loadEnvFile('.env.test', target)).toBe(true);
    expect(target).toMatchObject({ TOKEN: 'existing', TARGET: 'pages' });
  });

  test('rejects paths outside the project root and malformed keys', () => {
    expect(() => resolveEnvFilePath('../.env.secret')).toThrow('root-level');
    fs.writeFileSync('.env.test', 'BAD-KEY=value\n', 'utf8');
    expect(() => readEnvFileValues('.env.test')).toThrow('Invalid environment key');
  });

  test('updates only a validated single-line assignment', () => {
    fs.writeFileSync('.env.test', 'TOKEN=old\n', 'utf8');
    updateEnvValue('.env.test', 'TOKEN', 'new');
    expect(fs.readFileSync('.env.test', 'utf8')).toBe('TOKEN=new\n');
    expect(() => updateEnvValue('.env.test', 'TOKEN', 'bad\nvalue')).toThrow('line break');
  });

  test('refuses to update an environment file that already contains invalid data', () => {
    fs.writeFileSync('.env.test', 'BROKEN LINE\nTOKEN=old\n', 'utf8');
    expect(() => updateEnvValue('.env.test', 'TOKEN', 'new')).toThrow(
      'Invalid environment assignment'
    );
    expect(fs.readFileSync('.env.test', 'utf8')).toBe('BROKEN LINE\nTOKEN=old\n');
  });
});
