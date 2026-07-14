import path from 'node:path';
import { Audit, capture, readText, relative, walkFiles } from './core.ts';

const textExtensions = new Set(['.astro', '.conf', '.css', '.cjs', '.html', '.js', '.json', '.md', '.mjs', '.ts', '.tsx', '.yml', '.yaml', '.toml']);
const executableJsAllowlist = new Set([
  'eslint.config.mjs', 'jest.config.cjs', 'stylelint.config.cjs',
]);

function isSensitiveTrackedFile(name: string): boolean {
  const normalized = name.replaceAll('\\', '/');
  const basename = path.posix.basename(normalized).toLowerCase();
  if (basename === '.env.example' || (/^\.env\./.test(basename) && basename.endsWith('.example'))) return false;
  if (basename === '.env' || basename.startsWith('.env.')) return true;
  if (['.npmrc', '.pnpmrc', '.yarnrc', 'id_rsa', 'id_ed25519'].includes(basename)) return true;
  if ((basename.startsWith('credentials') || basename.startsWith('service-account')) && basename.endsWith('.json')) return true;
  return ['.pem', '.key', '.p8', '.p12', '.pfx', '.jks', '.keystore'].includes(path.posix.extname(basename));
}

export function checkSource(audit: Audit): void {
  const files = walkFiles(process.cwd());
  const sourceFiles = files.filter(file =>
    textExtensions.has(path.extname(file).toLowerCase()) &&
    path.basename(file) !== 'pnpm-lock.yaml'
  );

  for (const file of sourceFiles) {
    const name = relative(file);
    const extension = path.extname(file).toLowerCase();
    const text = readText(file);

    if ((extension === '.js' || extension === '.mjs' || extension === '.cjs') && !executableJsAllowlist.has(name)) {
      audit.error('JS001', 'Executable JavaScript must be migrated to TypeScript or explicitly documented as a tool config.', name);
    }
    if (/\bstyle\s*=/.test(text) && (extension === '.astro' || extension === '.md')) {
      audit.error('CSS001', 'Inline style attributes prevent a strict style-src-attr CSP.', name);
    }
    if (/\b(?:eval|Function)\s*\(/.test(text) || /\bdocument\.write\s*\(/.test(text)) {
      audit.error('SEC001', 'Dynamic code execution or document.write is not allowed.', name);
    }
    if (/\.(?:innerHTML|outerHTML)\s*=/.test(text)) {
      audit.error('SEC002', 'Direct HTML assignment is an XSS risk; use DOM APIs.', name);
    }
    const definesAuditRules = name.startsWith('scripts/checks/');
    if (!definesAuditRules && /set:html/.test(text) && !/safeJsonStringify/.test(text)) {
      audit.error('SEC003', 'set:html is only allowed with safeJsonStringify for structured data.', name);
    }
    if (/<script\b(?![^>]*type=["']application\/ld\+json["'])(?=[^>]*is:inline)[^>]*>\s*[^<\s]/i.test(text)) {
      audit.error('CSP001', 'Executable inline scripts are incompatible with the strict CSP.', name);
    }
    if (/\b(?:javascript|vbscript)\s*:/i.test(text)) {
      audit.error('SEC004', 'Dangerous URL protocol found.', name);
    }
    if (/\b(?:@ts-ignore|@ts-nocheck)\b/.test(text)) {
      audit.error('TS001', 'TypeScript diagnostics may not be suppressed with @ts-ignore or @ts-nocheck.', name);
    }
    if (!definesAuditRules && /\btransition\s*:\s*all\b/i.test(text)) {
      audit.error('CSS002', 'transition: all causes unnecessary layout and paint work.', name);
    }
    if (!definesAuditRules && /\bletter-spacing\s*:\s*-/.test(text)) {
      audit.error('CSS003', 'Negative letter-spacing is not allowed because it can break localized text.', name);
    }
    if (!definesAuditRules && (/\bbackdrop-filter\s*:/.test(text) || /\bfilter\s*:\s*(?:blur|brightness)\s*\(/.test(text))) {
      audit.error('CSS004', 'Blur and brightness filters are not allowed because they reduce clarity and add compositing work.', name);
    }
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) {
      audit.error('SECRET001', 'Private key material found in project files.', name);
    }
    if (/(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{30,}|sk_live_[A-Za-z0-9]{20,})/.test(text)) {
      audit.error('SECRET002', 'A token-shaped secret was found in project files.', name);
    }
  }

  const packageJson = JSON.parse(readText(path.join(process.cwd(), 'package.json'))) as {
    overrides?: Record<string, string>;
    pnpm?: { overrides?: Record<string, string> };
    scripts?: Record<string, string>;
  };
  const npmOverrides = Object.entries(packageJson.overrides ?? {}).sort(([left], [right]) => left.localeCompare(right));
  const pnpmOverrides = Object.entries(packageJson.pnpm?.overrides ?? {}).sort(([left], [right]) => left.localeCompare(right));
  if (JSON.stringify(npmOverrides) !== JSON.stringify(pnpmOverrides)) {
    audit.error('PACKAGE001', 'npm and pnpm security overrides must stay identical.', 'package.json');
  }
  for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
    if (/\bpnpm(?:\.cmd)?\b/i.test(command)) {
      audit.error('PACKAGE002', `Package script '${name}' hard-codes pnpm and breaks npm fallback.`, 'package.json');
    }
  }

  if (walkFiles(path.join(process.cwd(), 'public', 'scripts')).length > 0) {
    audit.error('JS002', 'public/scripts bypasses Vite and TypeScript; keep browser code under src/scripts.', 'public/scripts');
  }

  for (const file of walkFiles(path.join(process.cwd(), 'public')).filter(file => file.endsWith('.html'))) {
    const name = relative(file);
    const content = readText(file).trim();
    const basename = path.basename(file);
    const isGoogleVerification = /^google[a-z0-9_-]+\.html$/i.test(basename) &&
      content === `google-site-verification: ${basename}`;
    if (!isGoogleVerification) {
      audit.error('PUBLIC001', 'Raw public HTML bypasses Astro safety checks; only exact Google verification files are allowed.', name);
    }
  }

  const tracked = capture('git', ['ls-files', '-z']);
  if (tracked !== null) {
    const sensitive = tracked
      .split('\0')
      .filter(Boolean)
      .filter(isSensitiveTrackedFile);
    for (const name of sensitive) audit.error('GIT002', 'Sensitive file must not be tracked by Git.', name);
  }

  const gitignore = readText(path.join(process.cwd(), '.gitignore'));
  for (const pattern of ['.env*', '.npmrc', '.wrangler/', '.vercel/', '*.pem', '*.key', 'credentials*.json', '!.env.example', '!.env.*.example']) {
    if (!gitignore.split(/\r?\n/).map(line => line.trim()).includes(pattern)) {
      audit.error('GIT001', `Missing required ignore rule: ${pattern}`, '.gitignore');
    }
  }

  const headers = readText(path.join(process.cwd(), 'public', '_headers'));
  for (const directive of ['Content-Security-Policy:', "script-src 'self'", "script-src-attr 'none'", 'X-Content-Type-Options: nosniff', 'Referrer-Policy:', 'Strict-Transport-Security:']) {
    if (!headers.includes(directive)) audit.error('HEADER001', `Missing security header or directive: ${directive}`, 'public/_headers');
  }
  if (/(?:script|style)-src[^;\n]*'unsafe-inline'/.test(headers)) audit.error('HEADER002', 'CSP must not allow unsafe-inline.', 'public/_headers');

  const vercelConfig = readText(path.join(process.cwd(), 'vercel.json'));
  const nginxHeaders = readText(path.join(process.cwd(), 'deploy', 'nginx-security-headers.conf'));
  for (const [name, config] of [
    ['vercel.json', vercelConfig],
    ['deploy/nginx-security-headers.conf', nginxHeaders],
  ] as const) {
    for (const directive of [
      'Content-Security-Policy',
      "script-src 'self'",
      "script-src-attr 'none'",
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Strict-Transport-Security',
    ]) {
      if (!config.includes(directive)) {
        audit.error('HEADER003', `Missing cross-platform security header or directive: ${directive}`, name);
      }
    }
    if (/(?:script|style)-src[^;\n"]*'unsafe-inline'/.test(config)) {
      audit.error('HEADER004', 'Cross-platform CSP must not allow unsafe-inline.', name);
    }
  }

  const cloudflareCsp = headers.match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1]?.trim();
  const vercelCsp = (JSON.parse(vercelConfig) as {
    headers?: Array<{ headers?: Array<{ key?: string; value?: string }> }>;
  }).headers?.flatMap(rule => rule.headers ?? []).find(header => header.key === 'Content-Security-Policy')?.value;
  const nginxCsp = nginxHeaders.match(/add_header\s+Content-Security-Policy\s+"([^"]+)"/i)?.[1];
  const cloudflareAnalyticsSources = [
    'https://static.cloudflareinsights.com/beacon.min.js',
    'https://static.cloudflareinsights.com/beacon.min.js/',
  ];
  const cloudflareScriptSrc = cloudflareCsp
    ?.split(';')
    .map(directive => directive.trim())
    .find(directive => directive.startsWith('script-src '));
  const cloudflareScriptSources = cloudflareScriptSrc?.split(/\s+/) ?? [];
  if (cloudflareAnalyticsSources.some(source => !cloudflareScriptSources.includes(source))) {
    audit.error('HEADER005', 'Cloudflare CSP must allow the Web Analytics beacon and its versioned path.', 'public/_headers');
  }

  const cloudflareBaselineCsp = cloudflareCsp
    ?.split(';')
    .map(directive => {
      const values = directive.trim().split(/\s+/);
      return values[0] === 'script-src'
        ? values.filter(value => !cloudflareAnalyticsSources.includes(value)).join(' ')
        : values.join(' ');
    })
    .join('; ');
  if (!cloudflareBaselineCsp || !vercelCsp || !nginxCsp || new Set([cloudflareBaselineCsp, vercelCsp, nginxCsp]).size !== 1) {
    audit.error('HEADER006', 'Cloudflare, Vercel, and Nginx CSP baselines must remain identical.');
  }

  const tsconfig = JSON.parse(readText(path.join(process.cwd(), 'tsconfig.json'))) as {
    compilerOptions?: Record<string, unknown>;
  };
  for (const option of ['strictNullChecks', 'exactOptionalPropertyTypes', 'noImplicitAny', 'noUncheckedIndexedAccess']) {
    if (tsconfig.compilerOptions?.[option] !== true) {
      audit.error('TS002', `Strict TypeScript option must remain enabled: ${option}`, 'tsconfig.json');
    }
  }

  const redirects = readText(path.join(process.cwd(), 'public', '_redirects'));
  if (/(?:^|\s)\/(?:zh-tw\/|zh-cn\/)?page\/1\/?(?:\s|$)/m.test(redirects)) {
    audit.error('ROUTE001', 'Legacy page/1 redirects must not be retained.', 'public/_redirects');
  }
}
