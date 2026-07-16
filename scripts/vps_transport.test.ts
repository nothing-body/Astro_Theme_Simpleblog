import {
  activateStagingCommand,
  getStagingPaths,
  isSafeRemoteTargetPath,
  prepareStagingCommand,
  selectVpsTransport,
} from './vps_transport';

describe('cross-platform VPS transport planning', () => {
  test('prefers rsync and falls back to OpenSSH scp', () => {
    expect(selectVpsTransport(true, true)).toBe('rsync');
    expect(selectVpsTransport(false, true)).toBe('scp');
    expect(selectVpsTransport(false, false)).toBeNull();
  });

  test.each(['/var/www/example.com', '/home/deploy/site-dist', '/srv/site_1']) (
    'accepts safe remote target %s',
    target => expect(isSafeRemoteTargetPath(target)).toBe(true)
  );

  test.each(['/var/www/../root', 'relative/path', '/var//www', '/var/www/site/', "/var/www/site\nrm -rf /"]) (
    'rejects unsafe remote target %s',
    target => expect(isSafeRemoteTargetPath(target)).toBe(false)
  );

  test('builds staging commands with rollback paths derived from validated data', () => {
    expect(getStagingPaths('/var/www/site', '123-45')).toEqual({
      staging: '/var/www/site.astro-upload-123-45',
      backup: '/var/www/site.astro-backup-123-45',
    });
    expect(prepareStagingCommand('/var/www/site', '123-45')).toContain('mkdir -p');
    const activation = activateStagingCommand('/var/www/site', '123-45');
    expect(activation).toContain('Refusing to replace a symbolic-link target');
    expect(activation).toContain('mv -- "$backup" "$target"');
  });
});
