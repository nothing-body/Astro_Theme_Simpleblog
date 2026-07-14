import { chromium } from '@playwright/test';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import fs from 'fs';
import path from 'path';
import process from 'process';

function resolveChromiumExecutable(): string {
  const configured =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim() ||
    process.env.CHROME_PATH?.trim();
  if (configured) return configured;

  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const candidate = path.join(localAppData, 'Chromium', 'Application', 'chrome.exe');
    if (fs.existsSync(candidate)) return candidate;
  }

  return chromium.executablePath();
}

(async () => {
  const tmpDir = path.resolve(process.cwd(), 'lighthouse_tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const chromePath = resolveChromiumExecutable();

  const chromeFlags = ['--headless', '--disable-gpu'];
  if (process.env.LIGHTHOUSE_CHROME_NO_SANDBOX === '1') {
    chromeFlags.push('--no-sandbox');
  }

  const chrome = await launch({
    chromePath,
    chromeFlags,
  });

  try {
    const targetUrl = process.env.LIGHTHOUSE_URL || 'http://127.0.0.1:4321';
    console.log('Running Lighthouse on', targetUrl);

    const lhOptions = {
      output: 'html' as const,
      logLevel: 'info' as const,
      port: chrome.port,
      temporaryDirectory: tmpDir,
    };

    const result = await lighthouse(targetUrl, lhOptions);
    if (!result) throw new Error('Lighthouse did not return a report.');
    const { lhr, report } = result;

    const reportPath = path.resolve(process.cwd(), 'lighthouse-report.html');
    fs.writeFileSync(reportPath, Array.isArray(report) ? report.join('\n') : report);
    console.log('Lighthouse report saved to', reportPath);
    const score = lhr.categories.performance?.score ?? null;
    console.log('Performance score:', score === null ? 'unavailable' : Math.round(score * 100));
  } finally {
    chrome.kill();
  }
})();
