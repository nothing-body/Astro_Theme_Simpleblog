import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ENV_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

function isEnvFileName(name: string): boolean {
  if (name === '.env') return true;
  if (!name.startsWith('.env.')) return false;
  return name
    .slice(5)
    .split('.')
    .every(segment => segment && [...segment].every(char => /[A-Za-z0-9_-]/.test(char)));
}

export function resolveEnvFilePath(envFile: string): string {
  const name = envFile.trim();
  if (!isEnvFileName(name) || path.basename(name) !== name) {
    throw new Error(`Environment file must be a root-level .env or .env.* file: ${envFile}`);
  }
  return path.join(process.cwd(), name);
}

function assertRegularEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const stat = fs.lstatSync(filePath);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`Environment file must be a regular file, not a link: ${path.basename(filePath)}`);
  }
}

export function readEnvFileValues(envFile: string): Map<string, string> {
  const filePath = resolveEnvFilePath(envFile);
  assertRegularEnvFile(filePath);
  const values = new Map<string, string>();
  if (!fs.existsSync(filePath)) return values;

  for (const [index, rawLine] of fs.readFileSync(filePath, 'utf8').split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const assignment = line.startsWith('export ') ? line.slice(7).trimStart() : line;
    const separator = assignment.indexOf('=');
    if (separator < 1) {
      throw new Error(`Invalid environment assignment on line ${index + 1} of ${envFile}.`);
    }
    const key = assignment.slice(0, separator).trim();
    if (!ENV_KEY.test(key)) {
      throw new Error(`Invalid environment key '${key}' in ${envFile}.`);
    }
    let value = assignment.slice(separator + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values.set(key, value);
  }
  return values;
}

export function loadEnvFile(
  envFile: string,
  target: NodeJS.ProcessEnv = process.env
): boolean {
  const filePath = resolveEnvFilePath(envFile);
  const exists = fs.existsSync(filePath);
  for (const [key, value] of readEnvFileValues(envFile)) {
    if (target[key] === undefined) target[key] = value;
  }
  return exists;
}

export function updateEnvValue(envFile: string, key: string, value: string): void {
  if (!ENV_KEY.test(key)) throw new Error(`Invalid environment key: ${key}`);
  if (/[\0\r\n]/.test(value)) throw new Error(`Environment value for ${key} contains a line break.`);

  const filePath = resolveEnvFilePath(envFile);
  assertRegularEnvFile(filePath);
  readEnvFileValues(envFile);
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const lines = existing.split(/\r?\n/);
  const assignment = `${key}=${value}`;
  const index = lines.findIndex(line => {
    const trimmed = line.trim();
    const assignment = trimmed.startsWith('export ') ? trimmed.slice(7).trimStart() : trimmed;
    const separator = assignment.indexOf('=');
    return separator > 0 && assignment.slice(0, separator).trim() === key;
  });
  while (lines.at(-1) === '') lines.pop();
  if (index >= 0) lines[index] = assignment;
  else lines.push(assignment);
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, { encoding: 'utf8', mode: 0o600 });
}
