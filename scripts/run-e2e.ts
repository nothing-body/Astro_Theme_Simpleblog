#!/usr/bin/env node
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { setTimeout } from 'node:timers';
import { fileURLToPath } from 'node:url';

const isWindows = process.platform === 'win32';
const astroCli = fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url));
const playwrightCli = fileURLToPath(new URL('../node_modules/playwright/cli.js', import.meta.url));
const host = '127.0.0.1';
const tempRoot = path.join(os.tmpdir(), `astro-playwright-${process.pid}`);
const outputDir = path.join(tempRoot, 'results');
const chromiumDebugLog = path.join(tempRoot, 'chromium-debug.log');

function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, host, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Unable to reserve a local E2E port.')));
        return;
      }
      server.close(error => (error ? reject(error) : resolve(address.port)));
    });
  });
}

function waitForServer(url: string, timeoutMs = 30000): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  return new Promise<void>((resolve, reject) => {
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

function run(command: string, args: string[], options: Parameters<typeof spawn>[2] = {}): Promise<number> {
  return new Promise<number>(resolve => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      env: process.env,
      ...options,
    });
    let settled = false;
    const finish = (code: number) => {
      if (settled) return;
      settled = true;
      activeCommand = null;
      resolve(code);
    };
    activeCommand = child;
    child.once('error', () => finish(1));
    child.once('exit', code => finish(code ?? 1));
  });
}

function stop(child: ChildProcess | null | undefined): void {
  if (!child || child.killed) return;
  if (isWindows) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  child.kill('SIGTERM');
}

let activeCommand: ChildProcess | null = null;
const port = await findAvailablePort();
const baseUrl = `http://${host}:${port}`;
const preview = spawn(process.execPath, [astroCli, 'preview', '--host', host, '--port', String(port)], {
  stdio: 'ignore',
  shell: false,
  env: process.env,
});
let interrupted = false;
const handleSignal = () => {
  interrupted = true;
  stop(activeCommand);
  stop(preview);
};
process.once('SIGINT', handleSignal);
process.once('SIGTERM', handleSignal);

try {
  await Promise.race([
    waitForServer(baseUrl),
    new Promise<never>((_, reject) => {
      preview.once('error', reject);
      preview.once('exit', code => reject(new Error(`Astro preview exited before startup (${code ?? 1}).`)));
    }),
  ]);
  const code = await run(process.execPath, [playwrightCli, 'test', '--reporter=list', ...process.argv.slice(2)], {
    env: {
      ...process.env,
      CHROME_LOG_FILE: chromiumDebugLog,
      PLAYWRIGHT_BASE_URL: baseUrl,
      PLAYWRIGHT_OUTPUT_DIR: outputDir,
    },
  });
  process.exitCode = code;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  process.removeListener('SIGINT', handleSignal);
  process.removeListener('SIGTERM', handleSignal);
  stop(activeCommand);
  stop(preview);
  fs.rmSync(chromiumDebugLog, { force: true });
  if ((process.exitCode ?? 0) === 0) fs.rmSync(tempRoot, { recursive: true, force: true });
  process.exit(interrupted ? 130 : (process.exitCode ?? 0));
}
