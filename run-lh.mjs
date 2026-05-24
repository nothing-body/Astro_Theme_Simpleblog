import { chromium } from '@playwright/test';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import fs from 'fs';
import path from 'path';
import process from 'process';

(async () => {
  const tmpDir = path.resolve(process.cwd(), 'lighthouse_tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const dummy = await chromium.launch({ headless: true });
  const chromePath = dummy._executablePath;
  await dummy.close();

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
      output: 'html',
      logLevel: 'info',
      port: chrome.port,
      temporaryDirectory: tmpDir,
    };

    const { lhr, report } = await lighthouse(targetUrl, lhOptions);

    const reportPath = path.resolve(process.cwd(), 'lighthouse-report.html');
    fs.writeFileSync(reportPath, report);
    console.log('Lighthouse report saved to', reportPath);
    console.log('Performance score:', Math.round(lhr.categories.performance.score * 100));
  } finally {
    chrome.kill();
  }
})();
