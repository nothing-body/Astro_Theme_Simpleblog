import { existsSync } from 'node:fs';
import path from 'node:path';
import { Audit, readText } from './core.ts';

const manifestName = 'link-reputation.audit.json';
const allowedGroups = [
  'client',
  'api',
  'core',
  'sync',
  'storage',
  'upstream',
  'disclosure',
] as const;
type FileGroup = (typeof allowedGroups)[number];
type Strategy = 'local-feed' | 'remote-api';

type LinkReputationManifest = {
  version: 2;
  mode: 'api';
  strategy: Strategy;
  provider: string;
  backendLocation: 'same-repository' | 'external-service';
  files: Record<FileGroup, string[]>;
};

function projectFile(rawPath: string): string | null {
  if (!rawPath || path.isAbsolute(rawPath)) return null;
  const normalized = rawPath.replaceAll('\\', '/');
  if (normalized.split('/').includes('..')) return null;
  const resolved = path.resolve(process.cwd(), normalized);
  const root = `${path.resolve(process.cwd())}${path.sep}`;
  return resolved.startsWith(root) ? resolved : null;
}

function parseManifest(audit: Audit): LinkReputationManifest | null {
  const manifestPath = path.join(process.cwd(), manifestName);
  if (!existsSync(manifestPath)) return null;

  let value: unknown;
  try {
    value = JSON.parse(readText(manifestPath));
  } catch {
    audit.error(
      'LINKCHECK018',
      'The link-reputation audit manifest is not valid JSON.',
      manifestName
    );
    return null;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    audit.error(
      'LINKCHECK018',
      'The link-reputation audit manifest must be an object.',
      manifestName
    );
    return null;
  }

  const candidate = value as Partial<LinkReputationManifest>;
  const provider = candidate.provider?.trim() ?? '';
  const providerHasControlCharacters = [...provider].some(character => {
    const code = character.codePointAt(0) ?? 0;
    return code <= 0x1f || code === 0x7f;
  });
  if (
    candidate.version !== 2 ||
    candidate.mode !== 'api' ||
    !['local-feed', 'remote-api'].includes(candidate.strategy ?? '') ||
    !['same-repository', 'external-service'].includes(candidate.backendLocation ?? '') ||
    provider.length < 2 ||
    provider.length > 80 ||
    providerHasControlCharacters ||
    !candidate.files ||
    typeof candidate.files !== 'object'
  ) {
    audit.error(
      'LINKCHECK018',
      'The manifest must declare version 2, mode api, a valid strategy/provider, backendLocation, and file groups.',
      manifestName
    );
    return null;
  }

  for (const group of allowedGroups) {
    const entries = candidate.files[group];
    if (!Array.isArray(entries) || entries.some(entry => typeof entry !== 'string')) {
      audit.error(
        'LINKCHECK018',
        `Manifest group '${group}' must be a string array.`,
        manifestName
      );
      return null;
    }
  }
  return { ...(candidate as LinkReputationManifest), provider };
}

function declaredText(audit: Audit, manifest: LinkReputationManifest, group: FileGroup): string {
  const output: string[] = [];
  for (const entry of manifest.files[group]) {
    const file = projectFile(entry);
    if (!file || !existsSync(file)) {
      audit.error(
        'LINKCHECK019',
        `Declared ${group} file is missing or unsafe: ${entry}`,
        manifestName
      );
      continue;
    }
    if (!['.ts', '.tsx', '.astro', '.md'].includes(path.extname(file).toLowerCase())) {
      audit.error(
        'LINKCHECK019',
        `Declared ${group} file must be TypeScript, Astro, or Markdown: ${entry}`,
        manifestName
      );
      continue;
    }
    if (group !== 'disclosure' && path.extname(file).toLowerCase() === '.md') {
      audit.error(
        'LINKCHECK019',
        `Declared ${group} runtime cannot be a Markdown file: ${entry}`,
        manifestName
      );
      continue;
    }
    output.push(readText(file));
  }
  return output.join('\n');
}

function requirePattern(
  audit: Audit,
  code: string,
  text: string,
  pattern: RegExp,
  message: string
): void {
  if (!pattern.test(text)) audit.error(code, message, manifestName);
}

function requireFiles(audit: Audit, manifest: LinkReputationManifest, groups: FileGroup[]): void {
  for (const group of groups) {
    if (manifest.files[group].length === 0) {
      audit.error(
        'LINKCHECK019',
        `${manifest.strategy} mode must declare at least one ${group} file.`,
        manifestName
      );
    }
  }
}

export function hasLinkReputationManifest(): boolean {
  return existsSync(path.join(process.cwd(), manifestName));
}

export function checkEnabledLinkReputation(audit: Audit): void {
  const manifest = parseManifest(audit);
  if (!manifest) return;

  requireFiles(audit, manifest, ['client', 'disclosure']);
  const client = declaredText(audit, manifest, 'client');
  const disclosure = declaredText(audit, manifest, 'disclosure');

  requirePattern(
    audit,
    'LINKCHECK020',
    client,
    /import\.meta\.env\.PUBLIC_REPUTATION_ENDPOINT/,
    'The client endpoint must come from PUBLIC_REPUTATION_ENDPOINT instead of a hard-coded URL.'
  );
  requirePattern(
    audit,
    'LINKCHECK020',
    client,
    /\bfetch\s*\(/,
    'API mode must declare the TypeScript client that performs the reputation request.'
  );
  requirePattern(
    audit,
    'LINKCHECK020',
    client,
    /\bmethod\s*:\s*['"]POST['"]/i,
    'The browser-to-site reputation lookup must use POST.'
  );
  requirePattern(
    audit,
    'LINKCHECK020',
    client,
    /\bJSON\.stringify\s*\(/,
    'The client must serialize bounded JSON instead of putting the destination in the query string.'
  );
  requirePattern(
    audit,
    'LINKCHECK020',
    client,
    /AbortSignal\.timeout|AbortController/,
    'The reputation request must have a finite timeout.'
  );
  requirePattern(
    audit,
    'LINKCHECK020',
    client,
    /\bresponse\.ok\b/,
    'The client must reject non-success HTTP responses.'
  );
  requirePattern(
    audit,
    'LINKCHECK020',
    client,
    /content-type/i,
    'The client must validate response content type before parsing JSON.'
  );
  if (/credentials\s*:\s*['"]include['"]/i.test(client)) {
    audit.error(
      'LINKCHECK020',
      'Cross-origin reputation requests must not include browser credentials.',
      manifestName
    );
  }

  if (
    disclosure &&
    !disclosure.toLocaleLowerCase().includes(manifest.provider.toLocaleLowerCase())
  ) {
    audit.error(
      'LINKCHECK028',
      `The user-facing disclosure must name the configured provider: ${manifest.provider}.`,
      manifestName
    );
  }

  if (manifest.backendLocation === 'external-service') {
    if (
      (['api', 'core', 'sync', 'storage', 'upstream'] as const).some(
        group => manifest.files[group].length > 0
      )
    ) {
      audit.error(
        'LINKCHECK021',
        'External-service mode must not claim backend files from this repository.',
        manifestName
      );
    }
    audit.warn(
      'LINKCHECK022',
      'The reputation backend is external; this repository can verify only the client and disclosure. Run strategy-specific checks in the backend repository.',
      manifestName
    );
    return;
  }

  requireFiles(audit, manifest, ['api', 'core']);
  if (manifest.strategy === 'local-feed') requireFiles(audit, manifest, ['sync', 'storage']);
  else requireFiles(audit, manifest, ['upstream']);

  const api = declaredText(audit, manifest, 'api');
  const core = declaredText(audit, manifest, 'core');
  const sync = declaredText(audit, manifest, 'sync');
  const storage = declaredText(audit, manifest, 'storage');
  const upstream = declaredText(audit, manifest, 'upstream');
  const backend = `${api}\n${core}\n${sync}\n${storage}\n${upstream}`;

  requirePattern(
    audit,
    'LINKCHECK023',
    `${api}\n${core}`,
    /\bPOST\b[\s\S]*\bOPTIONS\b|\bOPTIONS\b[\s\S]*\bPOST\b/,
    'The public API must explicitly handle only POST and CORS preflight requests.'
  );
  requirePattern(
    audit,
    'LINKCHECK023',
    `${api}\n${core}`,
    /allowedOrigins|allowlist|Access-Control-Allow-Origin/i,
    'The API must enforce an exact origin allowlist.'
  );
  requirePattern(
    audit,
    'LINKCHECK023',
    `${api}\n${core}`,
    /content-length|max(?:imum)?(?:Request|Body|Bytes)|byteLength|bounded/i,
    'The API must bound the request body before parsing it.'
  );
  requirePattern(
    audit,
    'LINKCHECK024',
    core,
    /\bnew URL\s*\(/,
    'The shared core must parse destinations with the URL API.'
  );
  requirePattern(
    audit,
    'LINKCHECK024',
    core,
    /localhost|private|linkLocal|isPublic|isPrivate|169\.254|127\.0\.0\.1/i,
    'The shared core must reject localhost, private, and link-local destinations.'
  );
  if (/fetch\s*\(\s*(?:target|destination|url)(?:\.href)?\b/i.test(backend)) {
    audit.error(
      'LINKCHECK024',
      'The backend must query a fixed reputation provider endpoint, never fetch the user-supplied destination itself.',
      manifestName
    );
  }
  if (/PUBLIC_[A-Z0-9_]*(?:TOKEN|SECRET|KEY|DATABASE|SERVICE_ROLE|CREDENTIAL)/.test(backend)) {
    audit.error(
      'LINKCHECK027',
      'Backend credentials must never use PUBLIC_ environment variables.',
      manifestName
    );
  }

  if (manifest.strategy === 'local-feed') {
    requirePattern(
      audit,
      'LINKCHECK024',
      backend,
      /SHA-256|sha256|subtle\.digest/i,
      'A local-feed backend must hash normalized destinations rather than expose raw lookup URLs.'
    );
    requirePattern(
      audit,
      'LINKCHECK024',
      backend,
      /updatedAt|lastCheckedAt|stale|fresh/i,
      'A local-feed backend must validate snapshot freshness and fail closed on stale data.'
    );
    requirePattern(
      audit,
      'LINKCHECK025',
      sync,
      /redirect\s*:\s*['"]manual['"]/,
      'The feed downloader must reject redirects explicitly.'
    );
    requirePattern(
      audit,
      'LINKCHECK025',
      sync,
      /AbortSignal\.timeout|AbortController/,
      'The feed download must have a finite timeout.'
    );
    requirePattern(
      audit,
      'LINKCHECK025',
      sync,
      /content-type/i,
      'The feed downloader must validate response content type.'
    );
    requirePattern(
      audit,
      'LINKCHECK025',
      sync,
      /max(?:imum)?(?:Feed|Bytes|Lines|Size)|byteLength|bounded/i,
      'The feed downloader must enforce size or line-count limits.'
    );
    requirePattern(
      audit,
      'LINKCHECK026',
      storage,
      /\bget\s*\(|\bget\s*[:=]/,
      'The storage adapter must provide bounded reads.'
    );
    requirePattern(
      audit,
      'LINKCHECK026',
      storage,
      /\bput\s*\(|\bset\s*\(|\bput\s*[:=]|\bset\s*[:=]/,
      'The storage adapter must provide writes through the declared adapter.'
    );
    return;
  }

  requirePattern(
    audit,
    'LINKCHECK029',
    upstream,
    /\bfetch\s*\(/,
    'Remote-api mode must declare the server-side provider request.'
  );
  requirePattern(
    audit,
    'LINKCHECK029',
    upstream,
    /AbortSignal\.timeout|AbortController/,
    'The provider request must have a finite timeout.'
  );
  requirePattern(
    audit,
    'LINKCHECK029',
    upstream,
    /\bresponse\.ok\b/,
    'The backend must reject non-success responses from the reputation provider.'
  );
  requirePattern(
    audit,
    'LINKCHECK029',
    upstream,
    /content-type/i,
    'The backend must validate the provider response content type.'
  );
  requirePattern(
    audit,
    'LINKCHECK029',
    upstream,
    /redirect\s*:\s*['"]manual['"]/,
    'The backend must reject unexpected provider redirects.'
  );
  requirePattern(
    audit,
    'LINKCHECK029',
    upstream,
    /allowedUpstreamOrigins|upstreamAllowlist|UPSTREAM_REPUTATION_ORIGIN|safebrowsing\.googleapis\.com|webrisk\.googleapis\.com/i,
    'The provider request must use a fixed, explicitly allowlisted upstream origin.'
  );
}
