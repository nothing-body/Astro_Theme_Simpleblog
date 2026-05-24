import fs from "node:fs";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { t } from "./deploy_i18n.mjs";

let pnpmMissingWarning = false;

export const color = {
  reset: "\x1b[0m",
  red: text => `\x1b[31m${text}\x1b[0m`,
  amber: text => `\x1b[38;5;214m${text}\x1b[0m`,
  yellow: text => `\x1b[33m${text}\x1b[0m`,
  green: text => `\x1b[32m${text}\x1b[0m`,
  cyan: text => `\x1b[36m${text}\x1b[0m`,
  dim: text => `\x1b[2m${text}\x1b[0m`,
  bold: text => `\x1b[1m${text}\x1b[0m`,
};

function parseVersion(value) {
  const match = String(value ?? "").trim().replace(/^v/, "").match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function compareVersions(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function readNodeEngine() {
  try {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const engine = pkg?.engines?.node;
    if (typeof engine !== "string") return null;
    const match = engine.match(/^>=\s*(\d+\.\d+\.\d+)/);
    return match ? { raw: engine, min: parseVersion(match[1]) } : { raw: engine, min: null };
  } catch {
    return null;
  }
}

function commandExists(command, args = ["--version"]) {
  const result = spawnSync(command, args, { stdio: "ignore" });
  if (!result.error && result.status === 0) return true;
  if (process.platform === "win32") {
    const where = spawnSync("where.exe", [command], { stdio: "ignore" });
    return !where.error && where.status === 0;
  }
  return false;
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

export function getPackageManager() {
  ensureNodeRuntime();

  const userAgent = process.env.npm_config_user_agent || "";
  const execPath = process.env.npm_execpath || "";
  const launchedByPnpm = /pnpm/i.test(userAgent) || /pnpm/i.test(execPath);
  const launchedByNpm = /npm/i.test(userAgent) || /npm-cli/i.test(execPath);

  if (launchedByPnpm && execPath) {
    return {
      name: "pnpm",
      command: process.execPath,
      scriptPrefix: [execPath, "run"],
      execPrefix: [execPath, "exec"],
      displayPrefix: "pnpm",
    };
  }

  if (launchedByNpm && execPath) {
    if (!commandExists(process.platform === "win32" ? "pnpm.cmd" : "pnpm")) pnpmMissingWarning = true;
    return {
      name: "npm",
      command: process.execPath,
      scriptPrefix: [execPath, "run"],
      execPrefix: [execPath, "exec", "--"],
      displayPrefix: "npm run",
    };
  }

  const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  if (commandExists(pnpmCommand)) {
    return {
      name: "pnpm",
      command: pnpmCommand,
      scriptPrefix: ["run"],
      execPrefix: ["exec"],
      displayPrefix: "pnpm",
    };
  }

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  if (commandExists(npmCommand)) {
    pnpmMissingWarning = true;
    return {
      name: "npm",
      command: npmCommand,
      scriptPrefix: ["run"],
      execPrefix: ["exec", "--"],
      displayPrefix: "npm run",
    };
  }

  console.error(color.red(t("common.npmPnpmMissing")));
  process.exit(1);
}

export function packageScriptCommand(script, args = []) {
  const pm = getPackageManager();
  const displayArgs = args.length ? (pm.name === "npm" ? ` -- ${args.join(" ")}` : ` ${args.join(" ")}`) : "";
  return {
    command: pm.command,
    args: [...pm.scriptPrefix, script, ...(pm.name === "npm" && args.length ? ["--"] : []), ...args],
    display: `${pm.displayPrefix} ${script}${displayArgs}`,
  };
}

export function packageExecCommand(bin, args = []) {
  const pm = getPackageManager();
  return {
    command: pm.command,
    args: [...pm.execPrefix, bin, ...args],
    display: `${pm.name === "pnpm" ? "pnpm exec" : "npm exec --"} ${bin}${args.length ? ` ${args.join(" ")}` : ""}`,
  };
}

export function runPackageScript(script, args, runner, errorMessage, env = process.env) {
  const cmd = packageScriptCommand(script, args);
  return runner(cmd.command, cmd.args, errorMessage, env);
}

export function runPackageExec(bin, args, runner, errorMessage, env = process.env) {
  const cmd = packageExecCommand(bin, args);
  return runner(cmd.command, cmd.args, errorMessage, env);
}

export function warnIfPnpmMissing() {
  if (!pnpmMissingWarning) return;
  console.error(color.red(t("common.pnpmMissing")));
}

export function warnAboutPackageManager() {
  const pm = getPackageManager();
  if (pm.name === "npm") {
    console.error(color.amber(t("common.usingNpm")));
  }
}
