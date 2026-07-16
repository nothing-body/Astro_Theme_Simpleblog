import {
  assertSafeGitBranch,
  assertSafeGitRemote,
  parseArgs,
  parseMode,
} from './deploy_lib';

describe('deployment argument validation', () => {
  test('accepts known typed options', () => {
    const parsed = parseArgs(['--mode=direct:cf', '--yes', '--cf-project=site', '--dry-run']);
    expect(parsed.mode).toBe('direct:cf');
    expect(parsed.yes).toBe(true);
    expect(parsed.options).toEqual(
      new Map<string, string | boolean>([
        ['cf-project', 'site'],
        ['dry-run', true],
      ])
    );
  });

  test.each([['--unknown'], ['--cf-project'], ['--dry-run=yes'], ['positional']])(
    'rejects invalid argument %s',
    argument => expect(() => parseArgs([argument])).toThrow()
  );

  test('validates Git remote and branch names before spawning Git', () => {
    expect(() => assertSafeGitRemote('origin')).not.toThrow();
    expect(() => assertSafeGitBranch('feature/search-page')).not.toThrow();
    expect(() => assertSafeGitRemote('--upload-pack=bad')).toThrow();
    expect(() => assertSafeGitBranch('--force')).toThrow();
    expect(() => assertSafeGitBranch('main:evil')).toThrow();
  });

  test.each([
    ['direct:netlify', '', ['netlify']],
    ['direct:supabase', '', ['supabase']],
    ['direct:vps-docker', '', ['vps-docker']],
    ['github:cf+netlify+supabase', 'github', ['cf', 'netlify', 'supabase']],
  ] as const)('parses deployment mode %s', (value, provider, targets) => {
    expect(parseMode(value)).toEqual({ id: value, provider, targets });
  });

  test.each([
    'direct:unknown',
    'github:cf+cf',
    'unknown:cf',
    'direct:',
  ])('rejects invalid deployment mode %s', value => {
    expect(parseMode(value)).toBeNull();
  });
});
