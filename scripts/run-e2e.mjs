#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { setTimeout } from 'node:timers';
import { fileURLToPath } from 'node:url';

const isWindows = process.platform === 'win32';
const astroCli = fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url));
const playwrightCli = fileURLToPath(new URL('../node_modules/playwright/cli.js', import.meta.url));
const host = '127.0.0.1';
const port = 4321;
const baseUrl = `http://${host}:${port}`;
const outputDir = path.join(os.tmpdir(), `astro-playwright-${process.pid}`);

function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    function probe() {
      const req = http.get(url, res => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() >= deadline) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(probe, 500);
      });
      req.setTimeout(1000, () => {
        req.destroy();
      });
    }

    probe();
  });
}

function run(command, args, options = {}) {
  return new Promise(resolve => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      env: process.env,
      ...options,
    });
    child.on('exit', code => resolve(code ?? 1));
  });
}

function stop(child) {
  if (!child || child.killed) return;
  if (isWindows) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  child.kill('SIGTERM');
}

const preview = spawn(process.execPath, [astroCli, 'preview', '--host', host, '--port', String(port)], {
  stdio: 'ignore',
  shell: false,
  env: process.env,
});

try {
  await waitForServer(baseUrl);
  const code = await run(process.execPath, [playwrightCli, 'test', '--reporter=list'], {
    env: {
      ...process.env,
      PLAYWRIGHT_BASE_URL: baseUrl,
      PLAYWRIGHT_OUTPUT_DIR: outputDir,
    },
  });
  process.exitCode = code;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  stop(preview);
  process.exit(process.exitCode ?? 0);
}
