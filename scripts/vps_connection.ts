import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

type AskPass = { file: string; dir: string };

export type VpsConnection = {
  env: NodeJS.ProcessEnv;
  host: string;
  keyArgument: string;
  port: string;
  remote: string;
  rsyncSshCommand: string;
  scpArgs: string[];
  sshArgs: string[];
  user: string;
  dispose(): void;
};

function fail(message: string): never {
  throw new Error(message);
}

function resolvePathMaybeHome(value: string): string {
  if (!value) return value;
  return value.startsWith('~/') ? path.join(os.homedir(), value.slice(2)) : value;
}

function assertNoShellMeta(value: string, label: string): void {
  if (/[\0\r\n`$"'\\;&|<>!(){}[\]*?]/.test(value)) {
    fail(`${label} contains unsupported shell metacharacters.`);
  }
}

function assertRegularFile(filePath: string, label: string): void {
  if (!fs.existsSync(filePath)) fail(`${label} does not exist: ${filePath}`);
  const stat = fs.lstatSync(filePath);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    fail(`${label} must point to a regular file, not a symbolic link.`);
  }
}

function quoteTransportArgument(value: string): string {
  if (value.includes("'")) fail('SSH transport arguments cannot contain single quotes.');
  return `'${value}'`;
}

function createAskPassScript(): AskPass {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'astro-deploy-ssh-askpass-'));
  if (process.platform === 'win32') {
    const file = path.join(dir, 'askpass.cmd');
    fs.writeFileSync(
      file,
      '@echo off\r\npowershell -NoProfile -Command "[Console]::Out.Write($env:VPS_SSH_PASSPHRASE)"\r\n',
      { mode: 0o700 }
    );
    return { file, dir };
  }

  const file = path.join(dir, 'askpass.sh');
  fs.writeFileSync(file, '#!/bin/sh\nprintf \'%s\' "$VPS_SSH_PASSPHRASE"\n', {
    mode: 0o700,
  });
  fs.chmodSync(file, 0o700);
  return { file, dir };
}

export function createVpsConnection(
  onPassphraseDetected?: (() => void) | undefined
): VpsConnection {
  const host = process.env.VPS_HOST?.trim() ?? '';
  const user = process.env.VPS_USER?.trim() ?? '';
  const port = process.env.VPS_PORT?.trim() || '22';
  const keyPath = resolvePathMaybeHome(
    process.env.VPS_SSH_KEY_PATH?.trim() || '~/.ssh/id_rsa'
  );
  const passphrase = process.env.VPS_SSH_PASSPHRASE || '';

  if (!host || !user) fail('VPS_HOST and VPS_USER are required.');
  if (!/^[A-Za-z0-9._-]+$/.test(user)) fail('VPS_USER contains unsupported characters.');
  if (!/^[A-Za-z0-9._:-]+$/.test(host)) fail('VPS_HOST contains unsupported characters.');
  if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    fail('VPS_PORT must be a number between 1 and 65535.');
  }

  assertRegularFile(keyPath, 'VPS_SSH_KEY_PATH');
  const keyStat = fs.lstatSync(keyPath);
  if (process.platform !== 'win32' && (keyStat.mode & 0o077) !== 0) {
    fail('SSH private-key permissions are too open. Run chmod 600 on VPS_SSH_KEY_PATH.');
  }
  const keyArgument = path.resolve(keyPath).replaceAll('\\', '/');
  assertNoShellMeta(keyArgument, 'VPS_SSH_KEY_PATH');

  const knownHostsValue = process.env.VPS_KNOWN_HOSTS_FILE?.trim() ?? '';
  const knownHostsPath = knownHostsValue ? resolvePathMaybeHome(knownHostsValue) : '';
  if (knownHostsPath) {
    assertRegularFile(knownHostsPath, 'VPS_KNOWN_HOSTS_FILE');
    assertNoShellMeta(knownHostsPath, 'VPS_KNOWN_HOSTS_FILE');
  }

  const remoteHost = host.includes(':') ? `[${host}]` : host;
  const remote = `${user}@${remoteHost}`;
  const env: NodeJS.ProcessEnv = { ...process.env };
  let askPass: AskPass | null = null;
  if (passphrase) {
    onPassphraseDetected?.();
    askPass = createAskPassScript();
    env.VPS_SSH_PASSPHRASE = passphrase;
    env.SSH_ASKPASS = askPass.file;
    env.SSH_ASKPASS_REQUIRE = 'force';
    env.DISPLAY = env.DISPLAY || 'astro-deploy';
  }

  const hostKeyArgs = knownHostsPath
    ? [
        '-o',
        'StrictHostKeyChecking=yes',
        '-o',
        `UserKnownHostsFile=${path.resolve(knownHostsPath).replaceAll('\\', '/')}`,
      ]
    : ['-o', 'StrictHostKeyChecking=accept-new'];
  const commonOptions = [
    '-i',
    keyArgument,
    '-o',
    'ConnectTimeout=15',
    '-o',
    'IdentitiesOnly=yes',
    ...hostKeyArgs,
  ];
  const sshArgs = [
    ...commonOptions,
    '-p',
    port,
    remote,
  ];
  const scpArgs = [...commonOptions, '-P', port];
  const rsyncSshCommand = ['ssh', ...commonOptions, '-p', port]
    .map(quoteTransportArgument)
    .join(' ');

  return {
    env,
    host,
    keyArgument,
    port,
    remote,
    rsyncSshCommand,
    scpArgs,
    sshArgs,
    user,
    dispose() {
      if (askPass) fs.rmSync(askPass.dir, { recursive: true, force: true });
    },
  };
}
