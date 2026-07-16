export type VpsTransport = 'rsync' | 'scp';

const SAFE_REMOTE_PATH = /^\/[A-Za-z0-9._~/-]*$/;
const SAFE_NONCE = /^[A-Za-z0-9-]+$/;

export function isSafeRemoteTargetPath(target: string): boolean {
  const segments = target.split('/').filter(Boolean);
  return (
    SAFE_REMOTE_PATH.test(target) &&
    !target.includes('//') &&
    !target.endsWith('/') &&
    segments.length > 0 &&
    segments.every(segment => segment !== '.' && segment !== '..')
  );
}

export function selectVpsTransport(hasRsync: boolean, hasScp: boolean): VpsTransport | null {
  if (hasRsync) return 'rsync';
  if (hasScp) return 'scp';
  return null;
}

function quoteRemote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

export function getStagingPaths(target: string, nonce: string): {
  staging: string;
  backup: string;
} {
  if (!isSafeRemoteTargetPath(target) || !SAFE_NONCE.test(nonce)) {
    throw new Error('Unsafe VPS staging path input.');
  }
  return {
    staging: `${target}.astro-upload-${nonce}`,
    backup: `${target}.astro-backup-${nonce}`,
  };
}

export function prepareStagingCommand(target: string, nonce: string): string {
  const { staging } = getStagingPaths(target, nonce);
  return `set -eu; rm -rf -- ${quoteRemote(staging)}; mkdir -p -- ${quoteRemote(staging)}`;
}

export function cleanupStagingCommand(target: string, nonce: string): string {
  const { staging } = getStagingPaths(target, nonce);
  return `rm -rf -- ${quoteRemote(staging)}`;
}

export function activateStagingCommand(target: string, nonce: string): string {
  const { staging, backup } = getStagingPaths(target, nonce);
  const quotedTarget = quoteRemote(target);
  const quotedStaging = quoteRemote(staging);
  const quotedBackup = quoteRemote(backup);
  return [
    'set -eu',
    `target=${quotedTarget}`,
    `staging=${quotedStaging}`,
    `backup=${quotedBackup}`,
    '[ ! -L "$target" ] || { echo "Refusing to replace a symbolic-link target." >&2; exit 65; }',
    'rm -rf -- "$backup"',
    'had_target=0',
    'if [ -e "$target" ]; then mv -- "$target" "$backup"; had_target=1; fi',
    'if mv -- "$staging" "$target"; then rm -rf -- "$backup"',
    'else status=$?; if [ "$had_target" -eq 1 ] && [ ! -e "$target" ]; then mv -- "$backup" "$target"; fi; exit "$status"; fi',
  ].join('; ');
}
