import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { t } from "./deploy_i18n.ts";

type Version = { major: number; minor: number; patch: number };
export type PackageCommand = { command: string; args: string[]; display: string };
export type PackageManager = {
  name: 'pnpm' | 'npm';
  command: string;
  commandPrefix: string[];
  scriptPrefix: string[];
  execPrefix: string[];
  displayPrefix: string;
};
type CommandRunner<T> = (
  command: string,
  args: string[],
  errorMessage: string,
  env: NodeJS.ProcessEnv
) => T;

const paint = (code: string) => (text: unknown): string => `\x1b[${code}m${String(text)}\x1b[0m`;

export const color = {
  reset: "\x1b[0m",
  red: paint('31'),
  amber: paint('38;5;214'),
  yellow: paint('33'),
  green: paint('32'),
  cyan: paint('36'),
  dim: paint('2'),
  bold: paint('1'),
};

function parseVersion(value: unknown): Version | null {
  const match = String(value ?? "").trim().replace(/^v/, "").match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function compareVersions(a: Version, b: Version): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function readNodeEngine(): { raw: string; min: Version | null } | null {
  try {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
      engines?: { node?: unknown };
    };
    const engine = pkg.engines?.node;
    if (typeof engine !== "string") return null;
    const match = engine.match(/^>=\s*(\d+\.\d+\.\d+)/);
    return match ? { raw: engine, min: parseVersion(match[1]) } : { raw: engine, min: null };
  } catch {
    return null;
  }
}

export function commandAvailable(command: string, args: string[] = ["--version"]): boolean {
  const result = spawnSync(command, args, { stdio: "ignore" });
  if (!result.error) return true;
  if (process.platform === "win32") {
    const where = spawnSync("where.exe", [command], { stdio: "ignore" });
    return !where.error && where.status === 0;
  }
  return false;
}

function commandSucceeds(command: string, args: string[] = ['--version']): boolean {
  const result = spawnSync(command, args, { stdio: 'ignore' });
  return !result.error && result.status === 0;
}

type CommandInvocation = { command: string; prefix: string[] };

function packageManagerInvocation(name: 'pnpm' | 'npm'): CommandInvocation | null {
  if (process.platform !== 'win32') {
    return commandSucceeds(name) ? { command: name, prefix: [] } : null;
  }

  const result = spawnSync('where.exe', [`${name}.cmd`], { encoding: 'utf8', shell: false });
  if (result.status !== 0) return null;
  const wrapper = result.stdout
    .split(/\r?\n/)
    .map(value => value.trim())
    .find(value => value.toLowerCase().endsWith('.cmd') && fs.existsSync(value));
  if (!wrapper) return null;

  const marker = '%~dp0';
  const scriptRelative = fs.readFileSync(wrapper, 'utf8')
    .split(/\r?\n/)
    .map(line => {
      const start = line.toLowerCase().lastIndexOf(marker.toLowerCase());
      if (start < 0) return null;
      const valueStart = start + marker.length;
      const lower = line.toLowerCase();
      const ends = ['.cjs', '.js']
        .map(extension => lower.indexOf(extension, valueStart))
        .filter(index => index >= 0);
      const end = Math.min(...ends);
      return Number.isFinite(end) ? line.slice(valueStart, end + (lower.startsWith('.cjs', end) ? 4 : 3)) : null;
    })
    .find((value): value is string => Boolean(value));
  if (!scriptRelative) return null;
  let relativeScript = scriptRelative;
  while (relativeScript.startsWith('/') || relativeScript.startsWith('\\')) {
    relativeScript = relativeScript.slice(1);
  }
  const script = path.resolve(path.dirname(wrapper), relativeScript);
  return fs.existsSync(script) ? { command: process.execPath, prefix: [script] } : null;
}

function packageManagerFromInvocation(
  name: 'pnpm' | 'npm',
  invocation: CommandInvocation
): PackageManager {
  const npmSeparator = name === 'npm' ? ['--'] : [];
  return {
    name,
    command: invocation.command,
    commandPrefix: invocation.prefix,
    scriptPrefix: [...invocation.prefix, 'run'],
    execPrefix: [...invocation.prefix, 'exec', ...npmSeparator],
    displayPrefix: name,
  };
}

export function ensureNodeRuntime() {
  const engine = readNodeEngine();
  if (!engine?.min) return;
  const current = parseVersion(process.version);
  if (!current || compareVersions(current, engine.min) >= 0) return;

  console.error(color.red(`${t("common.nodeTooOld")}: current ${process.version}, required ${engine.raw}.`));
  console.error(color.red(t("common.installNode")));
  process.exit(1);
}

export function getPackageManager(): PackageManager {
  ensureNodeRuntime();

  const userAgent = process.env.npm_config_user_agent || "";
  const execPath = process.env.npm_execpath || "";
  const launchedByPnpm = /pnpm/i.test(userAgent) || /pnpm/i.test(execPath);

  if (launchedByPnpm && execPath) {
    return {
      name: "pnpm",
      command: process.execPath,
      commandPrefix: [execPath],
      scriptPrefix: [execPath, "run"],
      execPrefix: [execPath, "exec"],
      displayPrefix: "pnpm",
    };
  }

  const launchedByNpm = /(?:^|\s)npm\//i.test(userAgent) || /npm(?:-cli)?/i.test(execPath);
  if (launchedByNpm && execPath) {
    return {
      name: "npm",
      command: process.execPath,
      commandPrefix: [execPath],
      scriptPrefix: [execPath, "run"],
      execPrefix: [execPath, "exec", "--"],
      displayPrefix: "npm",
    };
  }

  const pnpm = packageManagerInvocation('pnpm');
  if (pnpm) return packageManagerFromInvocation('pnpm', pnpm);

  const npm = packageManagerInvocation('npm');
  if (npm) return packageManagerFromInvocation('npm', npm);

  console.error(color.red(t("common.packageManagerRequired")));
  process.exit(1);
}

export function ensurePackageManagerRuntime(): void {
  getPackageManager();
}

export function packageScriptCommand(script: string, args: string[] = []): PackageCommand {
  const pm = getPackageManager();
  const displayArgs = args.length ? ` ${args.join(" ")}` : "";
  const separator = pm.name === "npm" && args.length > 0 ? ["--"] : [];
  return {
    command: pm.command,
    args: [...pm.scriptPrefix, script, ...separator, ...args],
    display: `${pm.displayPrefix}${pm.name === "npm" ? " run" : ""} ${script}${pm.name === "npm" && args.length ? " --" : ""}${displayArgs}`,
  };
}

export function packageManagerCommand(args: string[]): PackageCommand {
  const pm = getPackageManager();
  return {
    command: pm.command,
    args: [...pm.commandPrefix, ...args],
    display: `${pm.displayPrefix}${args.length ? ` ${args.join(" ")}` : ""}`,
  };
}

export function packageExecCommand(bin: string, args: string[] = []): PackageCommand {
  const pm = getPackageManager();
  return {
    command: pm.command,
    args: [...pm.execPrefix, bin, ...args],
    display: `${pm.displayPrefix} exec${pm.name === "npm" ? " --" : ""} ${bin}${args.length ? ` ${args.join(" ")}` : ""}`,
  };
}

export function runPackageScript<T>(script: string, args: string[], runner: CommandRunner<T>, errorMessage: string, env: NodeJS.ProcessEnv = process.env): T {
  const cmd = packageScriptCommand(script, args);
  return runner(cmd.command, cmd.args, errorMessage, env);
}
