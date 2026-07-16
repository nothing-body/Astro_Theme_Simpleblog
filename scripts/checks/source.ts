import { existsSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { Audit, capture, readText, relative, walkFiles } from './core.ts';
import { checkEnabledLinkReputation, hasLinkReputationManifest } from './link-reputation.ts';

const textExtensions = new Set([
  '.astro',
  '.conf',
  '.css',
  '.cjs',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.yml',
  '.yaml',
  '.toml',
]);
const executableJsAllowlist = new Set([
  'eslint.config.mjs',
  'jest.config.cjs',
  'stylelint.config.cjs',
]);

/*
 * Source audit:
 * - scans reviewable text files for unsafe syntax, inline execution, secrets,
 *   expensive CSS, and executable JavaScript outside the small config allowlist;
 * - verifies public/private feature boundaries and required package wiring;
 * - compares Git ignore policy and security headers across hosting providers;
 * - confirms strict TypeScript, canonical route, search, analytics, and image
 *   integration settings before a production build is trusted.
 */
function isSensitiveTrackedFile(name: string): boolean {
  const normalized = name.replaceAll('\\', '/');
  const basename = path.posix.basename(normalized).toLowerCase();
  if (basename === '.env.example' || (/^\.env\./.test(basename) && basename.endsWith('.example')))
    return false;
  if (basename === '.env' || basename.startsWith('.env.')) return true;
  if (['.npmrc', '.pnpmrc', '.yarnrc', 'id_rsa', 'id_ed25519'].includes(basename)) return true;
  if (
    (basename.startsWith('credentials') || basename.startsWith('service-account')) &&
    basename.endsWith('.json')
  )
    return true;
  return ['.pem', '.key', '.p8', '.p12', '.pfx', '.jks', '.keystore'].includes(
    path.posix.extname(basename)
  );
}

export function checkSource(audit: Audit): void {
  const files = walkFiles(process.cwd());
  const sourceFiles = files.filter(
    file =>
      textExtensions.has(path.extname(file).toLowerCase()) &&
      path.basename(file) !== 'pnpm-lock.yaml'
  );

  for (const file of sourceFiles) {
    const name = relative(file);
    const extension = path.extname(file).toLowerCase();
    const text = readText(file);

    if (
      (extension === '.js' || extension === '.mjs' || extension === '.cjs') &&
      !executableJsAllowlist.has(name)
    ) {
      audit.error(
        'JS001',
        'Executable JavaScript must be migrated to TypeScript or explicitly documented as a tool config.',
        name
      );
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
      audit.error(
        'SEC003',
        'set:html is only allowed with safeJsonStringify for structured data.',
        name
      );
    }
    if (
      /<script\b(?![^>]*type=["']application\/ld\+json["'])(?=[^>]*is:inline)[^>]*>\s*[^<\s]/i.test(
        text
      )
    ) {
      audit.error(
        'CSP001',
        'Executable inline scripts are incompatible with the strict CSP.',
        name
      );
    }
    if (/\b(?:javascript|vbscript)\s*:/i.test(text)) {
      audit.error('SEC004', 'Dangerous URL protocol found.', name);
    }
    if (/\b(?:@ts-ignore|@ts-nocheck)\b/.test(text)) {
      audit.error(
        'TS001',
        'TypeScript diagnostics may not be suppressed with @ts-ignore or @ts-nocheck.',
        name
      );
    }
    if (!definesAuditRules && /\btransition\s*:\s*all\b/i.test(text)) {
      audit.error('CSS002', 'transition: all causes unnecessary layout and paint work.', name);
    }
    if (!definesAuditRules && /\bletter-spacing\s*:\s*-/.test(text)) {
      audit.error(
        'CSS003',
        'Negative letter-spacing is not allowed because it can break localized text.',
        name
      );
    }
    if (
      !definesAuditRules &&
      (/\bbackdrop-filter\s*:/.test(text) || /\bfilter\s*:\s*(?:blur|brightness)\s*\(/.test(text))
    ) {
      audit.error(
        'CSS004',
        'Blur and brightness filters are not allowed because they reduce clarity and add compositing work.',
        name
      );
    }
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) {
      audit.error('SECRET001', 'Private key material found in project files.', name);
    }
    if (/(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{30,}|sk_live_[A-Za-z0-9]{20,})/.test(text)) {
      audit.error('SECRET002', 'A token-shaped secret was found in project files.', name);
    }
  }

  const runtimeSourceText = sourceFiles
    .filter(file => path.extname(file).toLowerCase() !== '.md')
    .filter(file => !relative(file).startsWith('scripts/checks/'))
    .filter(file => relative(file) !== 'link-reputation.audit.example.json')
    .map(readText)
    .join('\n');

  const simpleNoticeFiles = [
    'src/lib/external-links.ts',
    'src/components/LeavingNotice.astro',
    'src/pages/leaving.astro',
    'src/pages/zh-tw/leaving.astro',
    'src/pages/zh-cn/leaving.astro',
    'src/scripts/leaving-notice.ts',
  ];
  for (const noticeFile of simpleNoticeFiles) {
    if (!existsSync(path.join(process.cwd(), ...noticeFile.split('/')))) {
      audit.error(
        'LINKCHECK014',
        'The public template must retain the API-free external-link notice.',
        noticeFile
      );
    }
  }
  const noticeRuntimeText = simpleNoticeFiles
    .filter(file => existsSync(path.join(process.cwd(), ...file.split('/'))))
    .map(file => readText(path.join(process.cwd(), ...file.split('/'))))
    .join('\n');
  const reputationIndicators =
    /\bfetch\s*\(/.test(noticeRuntimeText) ||
    /PUBLIC_(?:REPUTATION|SAFE_BROWSING|WEB_RISK|URL_CHECK)_ENDPOINT|OpenPhishStore|OPENPHISH_ALLOWED_ORIGINS|BLACKLIST_KV|SafeBrowsing|WebRisk/i.test(
      runtimeSourceText
    ) ||
    sourceFiles
      .map(relative)
      .some(name =>
        /^(?:functions|workers)\/.*(?:reputation|openphish|link-check|safe-browsing|web-risk|urlhaus|virus.?total|threat-check)/i.test(
          name
        )
      );
  const reputationEnabled = hasLinkReputationManifest();
  if (reputationIndicators && !reputationEnabled) {
    audit.error(
      'LINKCHECK017',
      'A URL-reputation implementation was detected. Copy link-reputation.audit.example.json to link-reputation.audit.json and declare every client/backend file so the enabled-mode checks can run.'
    );
  }
  if (reputationEnabled) {
    checkEnabledLinkReputation(audit);
  } else if (/\bfetch\s*\(|OpenPhish|BLACKLIST_KV|SYNC_TOKEN/.test(noticeRuntimeText)) {
    audit.error(
      'LINKCHECK015',
      'Static notice mode must not call a reputation API or contain private integration markers.'
    );
  }
  for (const requiredUse of [
    ['src/components/ExternalLink.astro', 'getLeavingNoticeHref'],
    ['src/markdown/processor.ts', 'getLeavingNoticeHref'],
  ] as const) {
    const filePath = path.join(process.cwd(), ...requiredUse[0].split('/'));
    if (!existsSync(filePath) || !readText(filePath).includes(requiredUse[1])) {
      audit.error(
        'LINKCHECK016',
        'External links must use the shared static notice route.',
        requiredUse[0]
      );
    }
  }

  for (const guide of [
    'OPENPHISH_GUIDE.en.md',
    'OPENPHISH_GUIDE.zh-TW.md',
    'OPENPHISH_GUIDE.zh-CN.md',
  ]) {
    const guidePath = path.join(process.cwd(), guide);
    if (!existsSync(guidePath) || !readText(guidePath).includes('OpenPhish')) {
      audit.error(
        'LINKCHECK013',
        'The public template must retain the optional setup guide without bundling its runtime.',
        guide
      );
    }
  }

  // Keep operator documentation synchronized with the public command surface.
  const deploymentGuideRequirements = [
    'deploy:menu',
    'deploy:cf:only',
    'deploy:vercel:only',
    'deploy:netlify:only',
    'deploy:vps:only',
    'deploy:vps-docker:only',
    'deploy:supabase:only',
    'deploy:all',
    'deploy:all:static',
    'deploy:all:including-functions',
    '--dry-run',
    '--yes',
    '--skip-clean',
    '--dist=<dir>',
    '--cf-project=<name>',
    '--cf-branch=<branch>',
    '--cf-env=<file>',
    '--vps-env=<file>',
    '--vps-docker-env=<file>',
    '--vercel-env=<file>',
    '--vercel-preview',
    '--netlify-env=<file>',
    '--netlify-preview',
    '--supabase-env=<file>',
    '--supabase-function=<name>',
    '--git-remote=<name>',
    '--git-branch=<name>',
    '--git-set-upstream',
    '--git-follow-tags',
    '--lang=<language>',
  ];
  for (const guide of ['DEPLOYMENT.en.md', 'DEPLOYMENT.zh-TW.md', 'DEPLOYMENT.zh-CN.md']) {
    const guidePath = path.join(process.cwd(), guide);
    const text = existsSync(guidePath) ? readText(guidePath) : '';
    const missing = deploymentGuideRequirements.filter(token => !text.includes(token));
    if (missing.length > 0) {
      audit.error(
        'DOC001',
        `Deployment guide is missing supported commands or options: ${missing.join(', ')}`,
        guide
      );
    }
  }
  for (const guide of [
    'SELF_CHECK_GUIDE.en.md',
    'SELF_CHECK_GUIDE.zh-TW.md',
    'SELF_CHECK_GUIDE.zh-CN.md',
  ]) {
    const guidePath = path.join(process.cwd(), guide);
    const text = existsSync(guidePath) ? readText(guidePath) : '';
    if (
      !text.includes('selfcheck -- --explain') ||
      !text.includes('ERROR') ||
      !text.includes('WARNING') ||
      !text.includes('LINKCHECK') ||
      !text.includes('CSP') ||
      !text.includes('link-reputation.audit.json')
    ) {
      audit.error(
        'DOC002',
        'Self-check guide must explain the rule catalog, severities, and security boundaries.',
        guide
      );
    }
  }

  const packageJson = JSON.parse(readText(path.join(process.cwd(), 'package.json'))) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    overrides?: Record<string, string>;
    pnpm?: { overrides?: Record<string, string> };
    scripts?: Record<string, string>;
  };
  const npmOverrides = Object.entries(packageJson.overrides ?? {}).sort(([left], [right]) =>
    left.localeCompare(right)
  );
  const pnpmOverrides = Object.entries(packageJson.pnpm?.overrides ?? {}).sort(([left], [right]) =>
    left.localeCompare(right)
  );
  if (JSON.stringify(npmOverrides) !== JSON.stringify(pnpmOverrides)) {
    audit.error(
      'PACKAGE001',
      'npm and pnpm security overrides must stay identical.',
      'package.json'
    );
  }
  for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
    if (/\bpnpm(?:\.cmd)?\b/i.test(command)) {
      audit.error(
        'PACKAGE002',
        `Package script '${name}' hard-codes pnpm and breaks npm fallback.`,
        'package.json'
      );
    }
  }
  if (!packageJson.dependencies?.['@astrojs/partytown']) {
    audit.error(
      'PACKAGE003',
      'The official Astro Partytown integration must remain installed.',
      'package.json'
    );
  }
  const siteConfig = readText(path.join(process.cwd(), 'src', 'lib', 'site.ts'));
  for (const marker of [
    'PUBLIC_SITE_NAME',
    'PUBLIC_SITE_AUTHOR',
    'PUBLIC_SITE_DESCRIPTION',
    'publicText(',
  ]) {
    if (!siteConfig.includes(marker)) {
      audit.error(
        'CONFIG001',
        `Site identity must use the validated shared configuration: ${marker}.`,
        'src/lib/site.ts'
      );
    }
  }
  for (const obsoletePackage of ['netlify-cli', 'vercel']) {
    if (
      packageJson.dependencies?.[obsoletePackage] ||
      packageJson.devDependencies?.[obsoletePackage]
    ) {
      audit.error(
        'PACKAGE006',
        `${obsoletePackage} must not be installed because direct deployment uses the smaller reviewed API client.`,
        'package.json'
      );
    }
  }
  if (!packageJson.devDependencies?.fflate) {
    audit.error('PACKAGE007', 'The bounded Netlify ZIP deployer requires fflate.', 'package.json');
  }
  if (!packageJson.devDependencies?.['image-size']) {
    audit.error('PACKAGE004', 'Image dimension checks require image-size.', 'package.json');
  }
  if (!packageJson.dependencies?.sharp) {
    audit.error(
      'PACKAGE005',
      'Astro image generation requires Sharp as a build dependency.',
      'package.json'
    );
  }
  if (packageJson.devDependencies?.pagefind !== '1.5.2') {
    audit.error(
      'SEARCH001',
      'Pagefind must stay pinned to the reviewed 1.5.2 release or be deliberately re-audited.',
      'package.json'
    );
  }
  if (
    !packageJson.scripts?.build?.includes('pagefind --site dist --glob "**/index.html"') ||
    !packageJson.scripts.build.includes('tsx ./scripts/finalize-search.ts')
  ) {
    audit.error(
      'SEARCH002',
      'The production build must generate and minimize the Pagefind index.',
      'package.json'
    );
  }

  const astroConfig = readText(path.join(process.cwd(), 'astro.config.ts'));
  const analyticsSource = readText(path.join(process.cwd(), 'src', 'scripts', 'analytics.ts'));
  const markdownProcessor = readText(path.join(process.cwd(), 'src', 'markdown', 'processor.ts'));
  const searchSource = readText(path.join(process.cwd(), 'src', 'scripts', 'search.ts'));
  const postLayout = readText(path.join(process.cwd(), 'src', 'layouts', 'BlogPostLayout.astro'));
  for (const token of [
    "from '@astrojs/partytown'",
    'partytown({',
    "forward: [['dataLayer.push'",
    'debug: false',
  ]) {
    if (!astroConfig.includes(token))
      audit.error('PARTYTOWN001', `Missing Partytown configuration: ${token}`, 'astro.config.ts');
  }
  for (const token of ["script.type = 'text/partytown'", "new CustomEvent('ptupdate')"]) {
    if (!analyticsSource.includes(token))
      audit.error(
        'PARTYTOWN002',
        `GA4 is not connected to Partytown: ${token}`,
        'src/scripts/analytics.ts'
      );
  }
  for (const token of ["layout: 'constrained'", 'responsiveStyles: false']) {
    if (!astroConfig.includes(token))
      audit.error(
        'IMAGE007',
        `Missing responsive image configuration: ${token}`,
        'astro.config.ts'
      );
  }
  for (const token of ['validateArticleImages', 'optimizeImageLoading', 'rejectRawHtml']) {
    if (!markdownProcessor.includes(token))
      audit.error(
        'IMAGE008',
        `Missing Markdown image protection: ${token}`,
        'src/markdown/processor.ts'
      );
  }
  for (const token of [
    'safeResultUrl',
    'textContent',
    'replaceChildren',
    'MAX_QUERY_LENGTH',
    '#initialization',
    'pagefindPromise = undefined',
  ]) {
    if (!searchSource.includes(token)) {
      audit.error(
        'SEARCH003',
        `Missing safe search rendering control: ${token}`,
        'src/scripts/search.ts'
      );
    }
  }

  for (const routeFile of [
    'src/pages/posts.astro',
    'src/pages/page/[page].astro',
    'src/pages/zh-tw/posts.astro',
    'src/pages/zh-tw/page/[page].astro',
    'src/pages/zh-cn/posts.astro',
    'src/pages/zh-cn/page/[page].astro',
  ]) {
    if (!readText(path.join(process.cwd(), routeFile)).includes('PostsPage')) {
      audit.error(
        'ARCH001',
        'Post list routes must use the shared PostsPage component.',
        routeFile
      );
    }
  }

  const notFoundSource = readText(path.join(process.cwd(), 'src', 'scripts', 'not-found.ts'));
  if (!notFoundSource.includes("replace(/\\/+$/, '')")) {
    audit.error(
      'ROUTE001',
      'Localized 404 redirects must normalize trailing slashes to prevent loops.',
      'src/scripts/not-found.ts'
    );
  }

  for (const deployFile of [
    'scripts/uploaddist_cf.ts',
    'scripts/uploaddist_vps.ts',
    'scripts/uploaddist_vercel.ts',
    'scripts/uploaddist_netlify.ts',
    'scripts/uploaddist_supabase.ts',
    'scripts/uploaddist_vps_docker.ts',
  ]) {
    const source = readText(path.join(process.cwd(), deployFile));
    if (!source.includes("from './deploy_env.ts'") || /function\s+loadEnvFile\s*\(/.test(source)) {
      audit.error(
        'DEPLOY001',
        'Direct deploy targets must use the shared deploy_env parser.',
        deployFile
      );
    }
  }
  const vpsDeploy = readText(path.join(process.cwd(), 'scripts', 'uploaddist_vps.ts'));
  for (const boundary of [
    "commandAvailable('rsync')",
    "commandAvailable('scp')",
    'activateStagingCommand',
  ]) {
    if (!vpsDeploy.includes(boundary)) {
      audit.error(
        'PLATFORM001',
        `VPS deployment is missing its cross-platform transport boundary: ${boundary}`,
        'scripts/uploaddist_vps.ts'
      );
    }
  }
  const netlifyDeploy = readText(path.join(process.cwd(), 'scripts', 'uploaddist_netlify.ts'));
  for (const marker of [
    'https://api.netlify.com/api/v1/sites/',
    "'Content-Type': 'application/zip'",
    'MAX_DEPLOY_FILES',
    'MAX_DEPLOY_BYTES',
    'collectStaticDeployFiles',
  ]) {
    if (!netlifyDeploy.includes(marker)) {
      audit.error(
        'DEPLOY002',
        `Netlify API deployment is missing required control: ${marker}.`,
        'scripts/uploaddist_netlify.ts'
      );
    }
  }
  const vercelDeploy = readText(path.join(process.cwd(), 'scripts', 'uploaddist_vercel.ts'));
  for (const marker of [
    "'/v2/files'",
    "'/v13/deployments'",
    "'x-vercel-digest'",
    'UPLOAD_CONCURRENCY',
    'MAX_FILE_BYTES',
    'collectStaticDeployFiles',
  ]) {
    if (!vercelDeploy.includes(marker)) {
      audit.error(
        'DEPLOY003',
        `Vercel API deployment is missing required control: ${marker}.`,
        'scripts/uploaddist_vercel.ts'
      );
    }
  }
  const supabaseDeploy = readText(path.join(process.cwd(), 'scripts', 'uploaddist_supabase.ts'));
  for (const marker of [
    "'functions'",
    "'deploy'",
    "'--project-ref'",
    "'index.ts'",
    'SUPABASE_ACCESS_TOKEN',
  ]) {
    if (!supabaseDeploy.includes(marker)) {
      audit.error(
        'DEPLOY004',
        `Supabase Edge Functions deployment is missing required control: ${marker}.`,
        'scripts/uploaddist_supabase.ts'
      );
    }
  }
  const dockerCompose = readText(path.join(process.cwd(), 'deploy', 'vps-docker', 'compose.yaml'));
  const dockerfile = readText(path.join(process.cwd(), 'deploy', 'vps-docker', 'Dockerfile'));
  const dockerNginx = readText(path.join(process.cwd(), 'deploy', 'vps-docker', 'nginx.conf'));
  for (const marker of ['read_only: true', 'cap_drop:', 'no-new-privileges:true', 'tmpfs:']) {
    if (!dockerCompose.includes(marker)) {
      audit.error(
        'DEPLOY005',
        `VPS Docker Compose is missing required hardening: ${marker}.`,
        'deploy/vps-docker/compose.yaml'
      );
    }
  }
  if (!dockerfile.includes('USER nginx')) {
    audit.error(
      'DEPLOY005',
      'The VPS Docker image must run as the unprivileged nginx user.',
      'deploy/vps-docker/Dockerfile'
    );
  }
  if (
    !dockerNginx.includes('location /_astro/') ||
    !dockerNginx.includes('include /etc/nginx/security-headers.conf;')
  ) {
    audit.error(
      'DEPLOY005',
      'The Docker Nginx asset location must retain security headers.',
      'deploy/vps-docker/nginx.conf'
    );
  }
  for (const yamlFile of [
    '.github/workflows/cross-platform.yml',
    '.github/workflows/deploy.yml',
    '.gitlab-ci.yml',
    '.woodpecker.yml',
    'deploy/vps-docker/compose.yaml',
  ]) {
    try {
      parseYaml(readText(path.join(process.cwd(), ...yamlFile.split('/'))));
    } catch (error) {
      audit.error(
        'DEPLOY006',
        `Invalid YAML: ${error instanceof Error ? error.message : String(error)}`,
        yamlFile
      );
    }
  }
  const e2eRunner = readText(path.join(process.cwd(), 'scripts', 'run-e2e.ts'));
  for (const boundary of ['net.createServer()', 'CHROME_LOG_FILE', "process.once('SIGINT'"]) {
    if (!e2eRunner.includes(boundary)) {
      audit.error(
        'PLATFORM002',
        `E2E runner is missing a cross-platform lifecycle boundary: ${boundary}`,
        'scripts/run-e2e.ts'
      );
    }
  }
  if (e2eRunner.includes("path.join(projectRoot, 'debug.log')")) {
    audit.error(
      'PLATFORM002',
      'E2E must not delete a project-owned debug.log.',
      'scripts/run-e2e.ts'
    );
  }
  const platformWorkflowPath = path.join(
    process.cwd(),
    '.github',
    'workflows',
    'cross-platform.yml'
  );
  const platformWorkflow = readText(platformWorkflowPath);
  for (const runner of ['ubuntu-latest', 'macos-latest', 'windows-latest']) {
    if (!platformWorkflow.includes(runner)) {
      audit.error(
        'PLATFORM003',
        `Cross-platform CI matrix is missing ${runner}.`,
        '.github/workflows/cross-platform.yml'
      );
    }
  }
  for (const marker of [
    'direct:cf+vps+vps-docker+vercel+netlify+supabase',
    '--lang=en',
    '--lang=zh-tw',
    '--lang=zh-cn',
    'github:cf+vps+vps-docker+vercel+netlify+supabase',
    'gitlab:cf+netlify+supabase',
    'codeberg:vps+vps-docker',
    'npm run deploy:switch',
    'pnpm audit:security',
  ]) {
    if (!platformWorkflow.includes(marker)) {
      audit.error(
        'PLATFORM004',
        `Cross-platform CI is missing deployment validation: ${marker}.`,
        '.github/workflows/cross-platform.yml'
      );
    }
  }
  for (const token of ['data-pagefind-body', 'data-pagefind-filter', 'data-pagefind-meta']) {
    if (!postLayout.includes(token)) {
      audit.error(
        'SEARCH004',
        `Missing Pagefind article indexing boundary: ${token}`,
        'src/layouts/BlogPostLayout.astro'
      );
    }
  }

  if (walkFiles(path.join(process.cwd(), 'public', 'scripts')).length > 0) {
    audit.error(
      'JS002',
      'public/scripts bypasses Vite and TypeScript; keep browser code under src/scripts.',
      'public/scripts'
    );
  }

  for (const file of walkFiles(path.join(process.cwd(), 'public')).filter(file =>
    file.endsWith('.html')
  )) {
    const name = relative(file);
    const content = readText(file).trim();
    const basename = path.basename(file);
    const isGoogleVerification =
      /^google[a-z0-9_-]+\.html$/i.test(basename) &&
      content === `google-site-verification: ${basename}`;
    if (!isGoogleVerification) {
      audit.error(
        'PUBLIC001',
        'Raw public HTML bypasses Astro safety checks; only exact Google verification files are allowed.',
        name
      );
    }
  }

  const tracked = capture('git', ['ls-files', '-z']);
  if (tracked !== null) {
    const sensitive = tracked.split('\0').filter(Boolean).filter(isSensitiveTrackedFile);
    for (const name of sensitive)
      audit.error('GIT002', 'Sensitive file must not be tracked by Git.', name);
  }

  const gitignore = readText(path.join(process.cwd(), '.gitignore'));
  for (const pattern of [
    '.env*',
    '.npmrc',
    '.wrangler/',
    '.wrangler-dry-run/',
    '.vercel/',
    '*.pem',
    '*.key',
    '*.ppk',
    '*.secret',
    'secrets.*',
    '.git-credentials',
    '.netrc',
    'credentials*.json',
    '.supabase/',
    'supabase/.temp/',
    '!.env.example',
    '!.env.*.example',
  ]) {
    if (
      !gitignore
        .split(/\r?\n/)
        .map(line => line.trim())
        .includes(pattern)
    ) {
      audit.error('GIT001', `Missing required ignore rule: ${pattern}`, '.gitignore');
    }
  }

  const vercelIgnore = readText(path.join(process.cwd(), '.vercelignore'));
  for (const pattern of ['.env*', '.dev.vars*', '.npmrc', '.ssh/', '*.pem', '*.key']) {
    if (
      !vercelIgnore
        .split(/\r?\n/)
        .map(line => line.trim())
        .includes(pattern)
    ) {
      audit.error('GIT002', `Missing Vercel upload ignore rule: ${pattern}`, '.vercelignore');
    }
  }

  const headers = readText(path.join(process.cwd(), 'public', '_headers'));
  for (const directive of [
    'Content-Security-Policy:',
    "script-src 'self'",
    "'wasm-unsafe-eval'",
    "script-src-attr 'none'",
    "worker-src 'self' blob:",
    "frame-src 'none'",
    "child-src 'self' blob:",
    'X-Content-Type-Options: nosniff',
    'X-Permitted-Cross-Domain-Policies: none',
    'Referrer-Policy:',
    'Strict-Transport-Security:',
  ]) {
    if (!headers.includes(directive))
      audit.error(
        'HEADER001',
        `Missing security header or directive: ${directive}`,
        'public/_headers'
      );
  }
  if (/(?:script|style)-src[^;\n]*'unsafe-inline'/.test(headers))
    audit.error('HEADER002', 'CSP must not allow unsafe-inline.', 'public/_headers');
  if (/Strict-Transport-Security:[^\n]*(?:includeSubDomains|preload)/i.test(headers)) {
    audit.error(
      'HEADER008',
      'Reusable templates must not force includeSubDomains or preload without domain-owner review.',
      'public/_headers'
    );
  }

  const vercelConfig = readText(path.join(process.cwd(), 'vercel.json'));
  const nginxHeaders = readText(path.join(process.cwd(), 'deploy', 'nginx-security-headers.conf'));
  for (const [name, config] of [
    ['vercel.json', vercelConfig],
    ['deploy/nginx-security-headers.conf', nginxHeaders],
  ] as const) {
    for (const directive of [
      'Content-Security-Policy',
      "script-src 'self'",
      "'wasm-unsafe-eval'",
      "script-src-attr 'none'",
      "worker-src 'self' blob:",
      "frame-src 'none'",
      "child-src 'self' blob:",
      'X-Content-Type-Options',
      'X-Permitted-Cross-Domain-Policies',
      'Referrer-Policy',
      'Strict-Transport-Security',
    ]) {
      if (!config.includes(directive)) {
        audit.error(
          'HEADER003',
          `Missing cross-platform security header or directive: ${directive}`,
          name
        );
      }
    }
    if (/(?:script|style)-src[^;\n"]*'unsafe-inline'/.test(config)) {
      audit.error('HEADER004', 'Cross-platform CSP must not allow unsafe-inline.', name);
    }
    if (/connect-src[^;\n"]*\shttps:(?=\s|;|$)/.test(config)) {
      audit.error(
        'HEADER009',
        'connect-src must list exact HTTPS origins instead of allowing every HTTPS destination.',
        name
      );
    }
    if (/Strict-Transport-Security[^\n"]*(?:includeSubDomains|preload)/i.test(config)) {
      audit.error(
        'HEADER008',
        'Reusable deployment templates must use the conservative HSTS baseline.',
        name
      );
    }
  }

  const cloudflareCsp = headers.match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1]?.trim();
  if (cloudflareCsp && /connect-src[^;]*\shttps:(?=\s|;|$)/.test(cloudflareCsp)) {
    audit.error(
      'HEADER009',
      'connect-src must list exact HTTPS origins instead of allowing every HTTPS destination.',
      'public/_headers'
    );
  }
  const vercelCsp = (
    JSON.parse(vercelConfig) as {
      headers?: Array<{ headers?: Array<{ key?: string; value?: string }> }>;
    }
  ).headers
    ?.flatMap(rule => rule.headers ?? [])
    .find(header => header.key === 'Content-Security-Policy')?.value;
  const nginxCsp = nginxHeaders.match(/add_header\s+Content-Security-Policy\s+"([^"]+)"/i)?.[1];
  const cloudflareAnalyticsSources = ['https://static.cloudflareinsights.com/beacon.min.js'];
  const cloudflareScriptSrc = cloudflareCsp
    ?.split(';')
    .map(directive => directive.trim())
    .find(directive => directive.startsWith('script-src '));
  const cloudflareScriptSources = cloudflareScriptSrc?.split(/\s+/) ?? [];
  if (!cloudflareScriptSources.some(source => /^'sha256-[A-Za-z0-9+/]{43}='$/.test(source))) {
    audit.error(
      'HEADER007',
      'CSP must include the exact SHA-256 hash for the Partytown initializer.',
      'public/_headers'
    );
  }
  if (cloudflareAnalyticsSources.some(source => !cloudflareScriptSources.includes(source))) {
    audit.error(
      'HEADER005',
      'Cloudflare CSP must allow the exact automatic Web Analytics beacon URL.',
      'public/_headers'
    );
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
  if (
    !cloudflareBaselineCsp ||
    !vercelCsp ||
    !nginxCsp ||
    new Set([cloudflareBaselineCsp, vercelCsp, nginxCsp]).size !== 1
  ) {
    audit.error('HEADER006', 'Cloudflare, Vercel, and Nginx CSP baselines must remain identical.');
  }

  const tsconfig = JSON.parse(readText(path.join(process.cwd(), 'tsconfig.json'))) as {
    compilerOptions?: Record<string, unknown>;
  };
  for (const option of [
    'strictNullChecks',
    'exactOptionalPropertyTypes',
    'noImplicitAny',
    'noUncheckedIndexedAccess',
  ]) {
    if (tsconfig.compilerOptions?.[option] !== true) {
      audit.error(
        'TS002',
        `Strict TypeScript option must remain enabled: ${option}`,
        'tsconfig.json'
      );
    }
  }

  const redirects = readText(path.join(process.cwd(), 'public', '_redirects'));
  if (/(?:^|\s)\/(?:zh-tw\/|zh-cn\/)?page\/1\/?(?:\s|$)/m.test(redirects)) {
    audit.error('ROUTE001', 'Legacy page/1 redirects must not be retained.', 'public/_redirects');
  }

  if (/PUBLIC_[A-Z0-9_]*(?:SYNC_TOKEN|API_KEY)/.test(sourceFiles.map(readText).join('\n'))) {
    audit.error('LINKCHECK005', 'Server credentials must never use a PUBLIC_ environment name.');
  }
}
