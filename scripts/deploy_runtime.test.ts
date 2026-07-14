import process from 'node:process';
import { getPackageManager, packageExecCommand, packageScriptCommand } from './deploy_runtime';

const originalExecPath = process.env.npm_execpath;
const originalUserAgent = process.env.npm_config_user_agent;

afterEach(() => {
  if (originalExecPath === undefined) delete process.env.npm_execpath;
  else process.env.npm_execpath = originalExecPath;
  if (originalUserAgent === undefined) delete process.env.npm_config_user_agent;
  else process.env.npm_config_user_agent = originalUserAgent;
});

test('uses npm syntax when npm launched the script', () => {
  process.env.npm_execpath = 'C:\\node\\npm-cli.js';
  process.env.npm_config_user_agent = 'npm/11.12.1 node/v24.15.0 win32 x64';

  expect(getPackageManager().name).toBe('npm');
  expect(packageScriptCommand('deploy:switch', ['--mode=direct:cf'])).toMatchObject({
    args: ['C:\\node\\npm-cli.js', 'run', 'deploy:switch', '--', '--mode=direct:cf'],
    display: 'npm run deploy:switch -- --mode=direct:cf',
  });
  expect(packageExecCommand('vercel', ['--version'])).toMatchObject({
    args: ['C:\\node\\npm-cli.js', 'exec', '--', 'vercel', '--version'],
    display: 'npm exec -- vercel --version',
  });
});

test('uses pnpm syntax when pnpm launched the script', () => {
  process.env.npm_execpath = 'C:\\node\\pnpm.cjs';
  process.env.npm_config_user_agent = 'pnpm/10.33.4 npm/? node/v24.15.0 win32 x64';

  expect(getPackageManager().name).toBe('pnpm');
  expect(packageScriptCommand('deploy:switch', ['--mode=direct:cf'])).toMatchObject({
    args: ['C:\\node\\pnpm.cjs', 'run', 'deploy:switch', '--mode=direct:cf'],
    display: 'pnpm deploy:switch --mode=direct:cf',
  });
  expect(packageExecCommand('vercel', ['--version'])).toMatchObject({
    args: ['C:\\node\\pnpm.cjs', 'exec', 'vercel', '--version'],
    display: 'pnpm exec vercel --version',
  });
});
