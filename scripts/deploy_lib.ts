import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { packageScriptCommand } from './deploy_runtime.ts';
import { getLanguage, t } from './deploy_i18n.ts';
export { readEnvFileValues } from './deploy_env.ts';

export type TargetId = 'cf' | 'vps' | 'vps-docker' | 'vercel' | 'netlify' | 'supabase';
type ProviderId = 'github' | 'gitlab' | 'codeberg';
export type DeployOptions = Map<string, string | boolean>;
export type DeployMode = {
  id: string;
  provider: ProviderId | '';
  targets: TargetId[];
};
export type DeployCommand = {
  label: string;
  command: string;
  args: string[];
  display: string;
  kind: string;
  env: NodeJS.ProcessEnv;
};
type GitProvider = {
  id: ProviderId;
  name: string;
  defaultRemote: string;
  ciFile: string;
  notesKey: string;
};
type DeployTarget = {
  id: TargetId;
  name: string;
  packageScript: string;
  directAlias: string;
  envFile: string;
  requiredEnv: string[];
  noteKeys: string[];
};
export type ExtraFlag = {
  key: string;
  label: string;
  scope: Array<TargetId | 'git' | 'all'>;
  value: boolean;
  placeholder?: string;
  descKey: string;
};

const GIT_PROVIDERS: GitProvider[] = [
  {
    id: 'github',
    name: 'GitHub',
    defaultRemote: 'github',
    ciFile: '.github/workflows/deploy.yml',
    notesKey: 'notice.gitCredentials',
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    defaultRemote: 'gitlab',
    ciFile: '.gitlab-ci.yml',
    notesKey: 'notice.gitCredentials',
  },
  {
    id: 'codeberg',
    name: 'Codeberg',
    defaultRemote: 'codeberg',
    ciFile: '.woodpecker.yml',
    notesKey: 'notice.gitCredentials',
  },
];

const DEPLOY_TARGETS: DeployTarget[] = [
  {
    id: 'cf',
    name: 'Cloudflare Pages',
    packageScript: 'uploaddist:cf:node',
    directAlias: 'deploy:cf:only',
    envFile: '.env.cloudflare',
    requiredEnv: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_PAGES_PROJECT_NAME'],
    noteKeys: ['target.cf.note1', 'target.cf.note2'],
  },
  {
    id: 'vps',
    name: 'VPS',
    packageScript: 'uploaddist:vps:node',
    directAlias: 'deploy:vps:only',
    envFile: '.env.vps',
    requiredEnv: ['VPS_HOST', 'VPS_USER', 'VPS_TARGET_DIR'],
    noteKeys: ['target.vps.note1', 'target.vps.note2', 'notice.vpsPassphrase', 'notice.vpsNonRoot'],
  },
  {
    id: 'vps-docker',
    name: 'VPS Docker',
    packageScript: 'uploaddist:vps-docker:node',
    directAlias: 'deploy:vps-docker:only',
    envFile: '.env.vps-docker',
    requiredEnv: ['VPS_HOST', 'VPS_USER', 'VPS_DOCKER_APP_DIR'],
    noteKeys: ['target.vpsDocker.note1', 'target.vpsDocker.note2'],
  },
  {
    id: 'vercel',
    name: 'Vercel',
    packageScript: 'uploaddist:vercel:node',
    directAlias: 'deploy:vercel:only',
    envFile: '.env.vercel',
    requiredEnv: ['VERCEL_TOKEN', 'VERCEL_PROJECT_ID'],
    noteKeys: ['target.vercel.note1', 'target.vercel.note2'],
  },
  {
    id: 'netlify',
    name: 'Netlify',
    packageScript: 'uploaddist:netlify:node',
    directAlias: 'deploy:netlify:only',
    envFile: '.env.netlify',
    requiredEnv: ['NETLIFY_AUTH_TOKEN', 'NETLIFY_SITE_ID'],
    noteKeys: ['target.netlify.note1', 'target.netlify.note2'],
  },
  {
    id: 'supabase',
    name: 'Supabase Edge Functions',
    packageScript: 'uploaddist:supabase:node',
    directAlias: 'deploy:supabase:only',
    envFile: '.env.supabase',
    requiredEnv: ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF'],
    noteKeys: ['target.supabase.note1', 'target.supabase.note2'],
  },
];

const DEPLOY_COMBOS: TargetId[][] = [
  ['cf'],
  ['vps'],
  ['vps-docker'],
  ['vercel'],
  ['netlify'],
  ['supabase'],
  ['cf', 'vps'],
  ['cf', 'vercel'],
  ['vps', 'vercel'],
  ['cf', 'vps', 'vercel'],
  ['cf', 'vps', 'vps-docker', 'vercel', 'netlify'],
  ['cf', 'vps', 'vps-docker', 'vercel', 'netlify', 'supabase'],
];

const DIRECT_COMBO_ALIASES = new Map<string, string>([
  ['cf', 'deploy:cf:only'],
  ['vps', 'deploy:vps:only'],
  ['vps-docker', 'deploy:vps-docker:only'],
  ['vercel', 'deploy:vercel:only'],
  ['netlify', 'deploy:netlify:only'],
  ['supabase', 'deploy:supabase:only'],
  ['cf+vps', 'deploy:cf:vps'],
  ['cf+vercel', 'deploy:cf:vercel'],
  ['vps+vercel', 'deploy:vps:vercel'],
  ['cf+vps+vercel', 'deploy:all'],
  ['cf+vps+vps-docker+vercel+netlify', 'deploy:all:static'],
  ['cf+vps+vps-docker+vercel+netlify+supabase', 'deploy:all:including-functions'],
]);

export const EXTRA_FLAGS: ExtraFlag[] = [
  {
    key: 'skip-clean',
    label: '--skip-clean',
    scope: ['cf', 'vps', 'vps-docker', 'vercel', 'netlify'],
    value: false,
    descKey: 'flag.skipClean',
  },
  {
    key: 'dist',
    label: '--dist=<dir>',
    scope: ['cf', 'vps', 'netlify'],
    value: true,
    placeholder: 'dist',
    descKey: 'flag.dist',
  },
  {
    key: 'cf-project',
    label: '--cf-project=<name>',
    scope: ['cf'],
    value: true,
    placeholder: 'my-pages-project',
    descKey: 'flag.cfProject',
  },
  {
    key: 'cf-branch',
    label: '--cf-branch=<branch>',
    scope: ['cf'],
    value: true,
    placeholder: 'main',
    descKey: 'flag.cfBranch',
  },
  {
    key: 'cf-env',
    label: '--cf-env=<file>',
    scope: ['cf'],
    value: true,
    placeholder: '.env.cloudflare',
    descKey: 'flag.cfEnv',
  },
  {
    key: 'vps-env',
    label: '--vps-env=<file>',
    scope: ['vps'],
    value: true,
    placeholder: '.env.vps',
    descKey: 'flag.vpsEnv',
  },
  {
    key: 'vps-docker-env',
    label: '--vps-docker-env=<file>',
    scope: ['vps-docker'],
    value: true,
    placeholder: '.env.vps-docker',
    descKey: 'flag.vpsDockerEnv',
  },
  {
    key: 'vercel-env',
    label: '--vercel-env=<file>',
    scope: ['vercel'],
    value: true,
    placeholder: '.env.vercel',
    descKey: 'flag.vercelEnv',
  },
  {
    key: 'vercel-preview',
    label: '--vercel-preview',
    scope: ['vercel'],
    value: false,
    descKey: 'flag.vercelPreview',
  },
  {
    key: 'netlify-env',
    label: '--netlify-env=<file>',
    scope: ['netlify'],
    value: true,
    placeholder: '.env.netlify',
    descKey: 'flag.netlifyEnv',
  },
  {
    key: 'netlify-preview',
    label: '--netlify-preview',
    scope: ['netlify'],
    value: false,
    descKey: 'flag.netlifyPreview',
  },
  {
    key: 'supabase-env',
    label: '--supabase-env=<file>',
    scope: ['supabase'],
    value: true,
    placeholder: '.env.supabase',
    descKey: 'flag.supabaseEnv',
  },
  {
    key: 'supabase-function',
    label: '--supabase-function=<name>',
    scope: ['supabase'],
    value: true,
    placeholder: 'example-function',
    descKey: 'flag.supabaseFunction',
  },
  {
    key: 'git-remote',
    label: '--git-remote=<remote>',
    scope: ['git'],
    value: true,
    placeholder: 'origin',
    descKey: 'flag.gitRemote',
  },
  {
    key: 'git-branch',
    label: '--git-branch=<branch>',
    scope: ['git'],
    value: true,
    placeholder: 'main',
    descKey: 'flag.gitBranch',
  },
  {
    key: 'git-set-upstream',
    label: '--git-set-upstream',
    scope: ['git'],
    value: false,
    descKey: 'flag.gitSetUpstream',
  },
  {
    key: 'git-follow-tags',
    label: '--git-follow-tags',
    scope: ['git'],
    value: false,
    descKey: 'flag.gitFollowTags',
  },
  { key: 'dry-run', label: '--dry-run', scope: ['all'], value: false, descKey: 'flag.dryRun' },
];

function comboId(targetIds: readonly TargetId[]): string {
  return targetIds.join('+');
}

export function targetById(id: string): DeployTarget | undefined {
  return DEPLOY_TARGETS.find(target => target.id === id);
}

export function providerById(id: string): GitProvider | undefined {
  return GIT_PROVIDERS.find(provider => provider.id === id);
}

export function modeLabel(mode: DeployMode): string {
  const targetNames = mode.targets.map(id => targetById(id)?.name ?? id).join(' + ');
  if (mode.provider) {
    const providerName = providerById(mode.provider)?.name ?? mode.provider;
    return t('mode.git', { provider: providerName, targets: targetNames });
  }
  return t('mode.direct', { targets: targetNames });
}

export function createDeployModes(): DeployMode[] {
  const directModes: DeployMode[] = DEPLOY_COMBOS.map(targets => ({
    id: `direct:${comboId(targets)}`,
    provider: '',
    targets,
  }));
  const gitModes: DeployMode[] = GIT_PROVIDERS.flatMap(provider =>
    DEPLOY_COMBOS.map(targets => ({
      id: `${provider.id}:${comboId(targets)}`,
      provider: provider.id,
      targets,
    }))
  );
  return [...directModes, ...gitModes];
}

export function parseMode(rawMode: unknown): DeployMode | null {
  const mode = String(rawMode ?? '')
    .trim()
    .toLowerCase();
  if (mode && !mode.includes(':')) return parseMode(`direct:${mode}`);
  const [providerValue, targetValue, ...extra] = mode.split(':');
  if (extra.length > 0 || !providerValue || !targetValue) return null;
  const provider =
    providerValue === 'direct'
      ? ''
      : providerById(providerValue)
        ? (providerValue as ProviderId)
        : null;
  if (provider === null) return null;
  const targets = targetValue.split('+') as TargetId[];
  if (
    targets.length === 0 ||
    new Set(targets).size !== targets.length ||
    targets.some(target => !targetById(target))
  ) {
    return null;
  }
  return { id: `${providerValue}:${comboId(targets)}`, provider, targets };
}

export function parseArgs(argv: string[]): { mode: string; yes: boolean; options: DeployOptions } {
  const result = { mode: '', yes: false, options: new Map<string, string | boolean>() };
  for (const arg of argv) {
    if (arg === '--yes' || arg === '-y') result.yes = true;
    else if (arg.startsWith('--mode=')) {
      result.mode = arg.slice('--mode='.length);
      if (!result.mode) throw new Error('--mode requires a value.');
    } else if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      const key = arg.slice(2, eqIndex === -1 ? undefined : eqIndex);
      const flag = EXTRA_FLAGS.find(item => item.key === key);
      if (!flag) throw new Error(`Unknown deployment option: --${key}`);
      if (flag.value) {
        if (eqIndex === -1 || eqIndex === arg.length - 1) {
          throw new Error(`Deployment option --${key} requires a value.`);
        }
        result.options.set(key, arg.slice(eqIndex + 1));
      } else {
        if (eqIndex !== -1) throw new Error(`Deployment option --${key} does not accept a value.`);
        result.options.set(key, true);
      }
    } else {
      throw new Error(`Unexpected deployment argument: ${arg}`);
    }
  }
  return result;
}

export function assertSafeGitRemote(remote: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(remote)) {
    throw new Error(`Git remote must be a configured remote name: ${remote}`);
  }
}

export function assertSafeGitBranch(branch: string): void {
  const invalid =
    !branch ||
    branch.length > 244 ||
    branch.startsWith('-') ||
    branch.startsWith('/') ||
    branch.endsWith('/') ||
    branch.endsWith('.') ||
    branch.includes('..') ||
    branch.includes('//') ||
    branch.includes('@{') ||
    /[\0-\x20\x7f~^:?*[\\]/.test(branch);
  if (invalid) throw new Error(`Invalid or unsafe Git branch name: ${branch}`);
}

function commandToString(command: string, commandArgs: readonly string[]): string {
  return [command, ...commandArgs]
    .map(part => {
      if (/^[A-Za-z0-9_./:=@+-]+$/.test(part)) return part;
      return `"${String(part).replaceAll('"', '\\"')}"`;
    })
    .join(' ');
}

export function displayCommandToString(
  commandInfo: Pick<DeployCommand, 'display' | 'command' | 'args'>
): string {
  return commandInfo.display || commandToString(commandInfo.command, commandInfo.args);
}

export function runCommand(
  command: string,
  commandArgs: string[],
  env: NodeJS.ProcessEnv = process.env
): void {
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', env });
  if (result.error || result.status !== 0) process.exit(result.status ?? 1);
}

function runCapture(command: string, commandArgs: string[]) {
  return spawnSync(command, commandArgs, { stdio: 'pipe', encoding: 'utf8', env: process.env });
}

function currentGitBranch(): string {
  const result = runCapture('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  return result.status === 0 ? result.stdout.trim() : '';
}

function destinationArgs(targetId: TargetId, options: DeployOptions): string[] {
  const args: string[] = [];
  if (targetId === 'cf') {
    if (options.has('skip-clean')) args.push('--skip-clean');
    if (options.has('dist')) args.push(`--dist=${options.get('dist')}`);
    if (options.has('cf-project')) args.push(`--project=${options.get('cf-project')}`);
    if (options.has('cf-branch')) args.push(`--branch=${options.get('cf-branch')}`);
    if (options.has('cf-env')) args.push(`--env=${options.get('cf-env')}`);
  }
  if (targetId === 'vps') {
    if (options.has('skip-clean')) args.push('--skip-clean');
    if (options.has('dist')) args.push(`--dist=${options.get('dist')}`);
    if (options.has('vps-env')) args.push(`--env=${options.get('vps-env')}`);
  }
  if (targetId === 'vps-docker') {
    if (options.has('skip-clean')) args.push('--skip-clean');
    if (options.has('vps-docker-env')) args.push(`--env=${options.get('vps-docker-env')}`);
  }
  if (targetId === 'vercel') {
    if (options.has('skip-clean')) args.push('--skip-clean');
    if (options.has('vercel-env')) args.push(`--env=${options.get('vercel-env')}`);
    if (options.has('vercel-preview')) args.push('--preview');
  }
  if (targetId === 'netlify') {
    if (options.has('skip-clean')) args.push('--skip-clean');
    if (options.has('dist')) args.push(`--dist=${options.get('dist')}`);
    if (options.has('netlify-env')) args.push(`--env=${options.get('netlify-env')}`);
    if (options.has('netlify-preview')) args.push('--preview');
  }
  if (targetId === 'supabase') {
    if (options.has('supabase-env')) args.push(`--env=${options.get('supabase-env')}`);
    if (options.has('supabase-function')) {
      args.push(`--function=${options.get('supabase-function')}`);
    }
  }
  return args;
}

export function plannedCommands(mode: DeployMode, options: DeployOptions): DeployCommand[] {
  const commands: DeployCommand[] = [];
  if (mode.provider) {
    const provider = providerById(mode.provider);
    const remote = String(options.get('git-remote') || provider?.defaultRemote || mode.provider);
    const branch = String(options.get('git-branch') || currentGitBranch() || 'main');
    assertSafeGitRemote(remote);
    assertSafeGitBranch(branch);
    const gitArgs = ['push'];
    if (options.has('git-set-upstream')) gitArgs.push('--set-upstream');
    if (options.has('git-follow-tags')) gitArgs.push('--follow-tags');
    gitArgs.push(remote, branch);
    commands.push({
      label: modeLabel(mode),
      command: 'git',
      args: gitArgs,
      display: commandToString('git', gitArgs),
      kind: 'git',
      env: { ...process.env, DEPLOY_LANG: getLanguage() },
    });
    return commands;
  }

  for (const targetId of mode.targets) {
    const target = targetById(targetId);
    if (!target) continue;
    const extraArgs = destinationArgs(targetId, options);
    const command = packageScriptCommand(target.packageScript, extraArgs);
    const env: NodeJS.ProcessEnv = { ...process.env, DEPLOY_LANG: getLanguage() };
    const display =
      mode.targets.length === 1 && extraArgs.length === 0
        ? command.display.replace(target.packageScript, target.directAlias)
        : command.display;
    commands.push({
      label: t('mode.direct', { targets: target.name }),
      command: command.command,
      args: command.args,
      display,
      env,
      kind: targetId,
    });
  }
  return commands;
}

export function directModeAlias(mode: DeployMode): string {
  if (mode.provider) return '';
  return DIRECT_COMBO_ALIASES.get(comboId(mode.targets)) ?? '';
}

export function ciCommandForTargets(targetIds: readonly TargetId[]): string {
  return packageScriptCommand('deploy:switch', [`--mode=direct:${comboId(targetIds)}`, '--yes'])
    .display;
}
