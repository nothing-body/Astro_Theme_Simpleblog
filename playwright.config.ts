import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { defineConfig } from '@playwright/test';

function chromiumExecutable(): string | undefined {
  const configured = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();
  if (configured) return configured;

  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) return undefined;
  const candidate = path.join(localAppData, 'Chromium', 'Application', 'chrome.exe');
  return fs.existsSync(candidate) ? candidate : undefined;
}

const executablePath = chromiumExecutable();

export default defineConfig({
  testDir: './tests',
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || 'test-results',
  timeout: 30_000,
  use: {
    headless: true,
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4321',
    trace: 'on-first-retry',
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
    },
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
});
