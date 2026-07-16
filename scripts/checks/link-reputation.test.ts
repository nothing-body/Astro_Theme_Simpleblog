import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Audit } from './core';
import { checkEnabledLinkReputation } from './link-reputation';

type Strategy = 'local-feed' | 'remote-api';

describe('link-reputation strategy audit', () => {
  const originalCwd = process.cwd();
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'link-reputation-audit-'));
    process.chdir(workspace);
    fs.mkdirSync('src', { recursive: true });
    fs.writeFileSync(
      'src/client.ts',
      `
        const endpoint = import.meta.env.PUBLIC_REPUTATION_ENDPOINT;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url: 'https://example.com' }),
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok || !response.headers.get('content-type')) throw new Error('invalid');
      `,
      'utf8'
    );
    fs.writeFileSync(
      'src/api.ts',
      `
        const allowedOrigins = new Set(['https://frontend.example']);
        const methods = ['POST', 'OPTIONS'];
        const maximumRequestBody = 4096;
        void allowedOrigins;
        void methods;
        void maximumRequestBody;
      `,
      'utf8'
    );
    fs.writeFileSync(
      'src/core.ts',
      `
        const target = new URL('https://example.com');
        const privateDestinations = ['localhost', '127.0.0.1', '169.254.0.1'];
        void target;
        void privateDestinations;
      `,
      'utf8'
    );
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  function writeManifest(strategy: Strategy, provider: string): void {
    const localFeed = strategy === 'local-feed';
    fs.writeFileSync(
      'link-reputation.audit.json',
      JSON.stringify({
        version: 2,
        mode: 'api',
        strategy,
        provider,
        backendLocation: 'same-repository',
        files: {
          client: ['src/client.ts'],
          api: ['src/api.ts'],
          core: ['src/core.ts'],
          sync: localFeed ? ['src/sync.ts'] : [],
          storage: localFeed ? ['src/storage.ts'] : [],
          upstream: localFeed ? [] : ['src/upstream.ts'],
          disclosure: ['src/disclosure.md'],
        },
      }),
      'utf8'
    );
    fs.writeFileSync('src/disclosure.md', `This site uses ${provider}.`, 'utf8');
  }

  test('accepts a bounded local-feed implementation', () => {
    writeManifest('local-feed', 'Fixture Feed');
    fs.appendFileSync(
      'src/core.ts',
      `
        const algorithm = 'SHA-256';
        const updatedAt = new Date().toISOString();
        void algorithm;
        void updatedAt;
      `,
      'utf8'
    );
    fs.writeFileSync(
      'src/sync.ts',
      `
        const maxFeedBytes = 1024;
        const response = await fetch('https://feed.example', {
          redirect: 'manual',
          signal: AbortSignal.timeout(5000),
        });
        if (!response.headers.get('content-type')) throw new Error('invalid');
        void maxFeedBytes;
      `,
      'utf8'
    );
    fs.writeFileSync(
      'src/storage.ts',
      'export const store = { get: async () => null, put: async () => undefined };',
      'utf8'
    );

    const audit = new Audit();
    checkEnabledLinkReputation(audit);
    expect(audit.findings).toEqual([]);
  });

  test('accepts a fixed remote reputation provider', () => {
    writeManifest('remote-api', 'Google Safe Browsing');
    fs.writeFileSync(
      'src/upstream.ts',
      `
        const allowedUpstreamOrigins = new Set(['https://safebrowsing.googleapis.com']);
        const response = await fetch('https://safebrowsing.googleapis.com/v5/urls:search', {
          redirect: 'manual',
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok || !response.headers.get('content-type')) throw new Error('invalid');
        void allowedUpstreamOrigins;
      `,
      'utf8'
    );

    const audit = new Audit();
    checkEnabledLinkReputation(audit);
    expect(audit.findings).toEqual([]);
  });

  test('rejects a remote provider without a fixed upstream allowlist', () => {
    writeManifest('remote-api', 'Example Provider');
    fs.writeFileSync(
      'src/upstream.ts',
      `
        const response = await fetch('https://provider.example/v1/check', {
          redirect: 'manual',
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok || !response.headers.get('content-type')) throw new Error('invalid');
      `,
      'utf8'
    );

    const audit = new Audit();
    checkEnabledLinkReputation(audit);
    expect(audit.findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'LINKCHECK029' })])
    );
  });
});
