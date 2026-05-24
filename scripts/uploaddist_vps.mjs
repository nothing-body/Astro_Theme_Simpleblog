#!/usr/bin/env node
/**
 * Upload built dist/ to a VPS directory via rsync over SSH.
 * CI friendly: intended for GitHub/GitLab/Codeberg pipeline usage.
 *
 * Primary usage:
 *   pnpm uploaddist:vps:node
 *
 * Required environment variables:
 *   VPS_HOST              e.g. xxx.xxx.xxx
 *   VPS_USER              e.g. deploy
 *   VPS_TARGET_DIR        e.g. /var/www/example.com
 *
 * Optional environment variables:
 *   VPS_PORT              default: 22
 *   VPS_SSH_KEY_PATH      default: ~/.ssh/id_rsa
 *   VPS_SSH_PASSPHRASE    optional private-key passphrase; ssh-agent is safer
 *
 * Common CI flow:
 *   1) Write secret key into ~/.ssh/id_rsa
 *   2) chmod 600 ~/.ssh/id_rsa
 *   3) run pnpm uploaddist:vps:node
 *
 * Options:
 *   --dist=dist
 *   --env=.env.vps
 *   --passphrase=<value>
 *   --skip-clean
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { ensureGitignoreSafety } from "./deploy_safety.mjs";
import { stripLangArgs, t } from "./deploy_i18n.mjs";
import {
  ensureNodeRuntime,
  runPackageScript,
  warnAboutPackageManager,
  warnIfPnpmMissing,
} from "./deploy_runtime.mjs";

const args = stripLangArgs(process.argv.slice(2));
const options = {
  dist: "dist",
  env: ".env.vps",
  passphrase: "",
  skipClean: false,
};

for (const arg of args) {
  if (arg === "--skip-clean") {
    options.skipClean = true;
    continue;
  }
  if (arg.startsWith("--dist=")) {
    options.dist = arg.slice("--dist=".length);
    continue;
  }
  if (arg.startsWith("--env=")) {
    options.env = arg.slice("--env=".length);
    continue;
  }
  if (arg.startsWith("--passphrase=")) {
    options.passphrase = arg.slice("--passphrase=".length);
  }
}

const color = {
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  reset: "\x1b[0m",
};

function info(message, tone = "cyan") {
  const c = color[tone] ?? "";
  const reset = c ? color.reset : "";
  console.log(`${c}${message}${reset}`);
}

function fail(message) {
  console.error(`\n[vps-deploy] ${message}`);
  process.exit(1);
}

function run(command, commandArgs, errorMessage, env = process.env) {
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    env,
  });
  if (result.error || result.status !== 0) fail(errorMessage);
}

function runPnpm(args, errorMessage) {
  if (args.length === 1 && args[0] === "build") {
    runPackageScript("build", [], run, errorMessage);
  }
}

function assertCommand(name, args = ["--version"]) {
  const probe = spawnSync(name, args, { stdio: "ignore" });
  if (probe.error || probe.status !== 0) fail(`Required command '${name}' not found. Please install it first.`);
}

function resolvePathMaybeHome(p) {
  if (!p) return p;
  return p.startsWith("~/") ? path.join(os.homedir(), p.slice(2)) : p;
}

function loadEnvFile(envFilePath) {
  const fullPath = path.resolve(process.cwd(), envFilePath);
  if (!fs.existsSync(fullPath)) {
    info(`==> ${t("common.envMissing")} (${envFilePath})`, "yellow");
    return;
  }

  info(`==> ${t("common.loadingEnv")}: '${envFilePath}'`);
  const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) process.env[key] = value;
  }
}

function assertSafeDistPath(distPath) {
  const cwd = process.cwd();
  const relative = path.relative(cwd, distPath);

  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    fail(`Refusing to use unsafe dist path '${options.dist}'. It must stay inside the project.`);
  }
}

function assertNoShellMeta(value, label) {
  if (/[\0\r\n`$"'\\;]/.test(value)) {
    fail(`${label} contains unsupported shell metacharacters.`);
  }
}

function createAskPassScript(passphrase) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "astro-deploy-ssh-askpass-"));
  if (process.platform === "win32") {
    const file = path.join(dir, "askpass.cmd");
    fs.writeFileSync(
      file,
      "@echo off\r\npowershell -NoProfile -Command \"[Console]::Out.Write($env:VPS_SSH_PASSPHRASE)\"\r\n",
      { mode: 0o700 }
    );
    return { file, dir };
  }

  const file = path.join(dir, "askpass.sh");
  fs.writeFileSync(file, "#!/bin/sh\nprintf '%s' \"$VPS_SSH_PASSPHRASE\"\n", { mode: 0o700 });
  fs.chmodSync(file, 0o700);
  process.env.VPS_SSH_PASSPHRASE = passphrase;
  return { file, dir };
}

ensureNodeRuntime();
warnAboutPackageManager();
await ensureGitignoreSafety();
assertCommand("rsync");
assertCommand("ssh");
loadEnvFile(options.env);

const host = process.env.VPS_HOST ?? "";
const user = process.env.VPS_USER ?? "";
const targetDir = process.env.VPS_TARGET_DIR ?? "";
const port = process.env.VPS_PORT ?? "22";
const keyPath = resolvePathMaybeHome(process.env.VPS_SSH_KEY_PATH ?? "~/.ssh/id_rsa");
const passphrase = options.passphrase || process.env.VPS_SSH_PASSPHRASE || "";

if (!host || !user || !targetDir) {
  fail(
    "Missing required VPS envs. Need VPS_HOST, VPS_USER, VPS_TARGET_DIR."
  );
}

if (!/^[A-Za-z0-9._-]+$/.test(user)) {
  fail("VPS_USER contains unsupported characters.");
}

if (!/^[A-Za-z0-9._:-]+$/.test(host)) {
  fail("VPS_HOST contains unsupported characters.");
}

if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  fail("VPS_PORT must be a number between 1 and 65535.");
}

if (!/^\/[A-Za-z0-9._~/-]*$/.test(targetDir) || targetDir.includes("//")) {
  fail("VPS_TARGET_DIR must be an absolute Unix path using only letters, numbers, dot, dash, underscore, tilde and slash.");
}

if (!fs.existsSync(keyPath)) {
  fail(`SSH key file does not exist: ${keyPath}`);
}
assertNoShellMeta(keyPath, "VPS_SSH_KEY_PATH");

const distPath = path.resolve(process.cwd(), options.dist);
assertSafeDistPath(distPath);
if (!options.skipClean && fs.existsSync(distPath)) {
  info(`==> ${t("common.cleaning")} '${options.dist}'...`, "yellow");
  fs.rmSync(distPath, { recursive: true, force: true });
}

info(`==> ${t("common.building")}`);
runPnpm(["build"], "Build failed.");

if (!fs.existsSync(distPath)) {
  fail(`${t("common.distMissing")}: '${options.dist}'.`);
}

info(`==> ${t("notice.vpsUser")}: ${user}`);
info(`==> ${t("notice.vpsTarget")}: ${targetDir}`);
if (user !== "root" && targetDir.startsWith("/var/www/")) {
  info(`==> ${t("notice.vpsNonRoot")}`, "yellow");
}
info(`==> ${t("vps.uploading")}: ${user}@${host}:${targetDir}`);
let askPass = null;
const rsyncEnv = { ...process.env };
if (passphrase) {
  info(`==> ${t("vps.passDetected")}`, "yellow");
  askPass = createAskPassScript(passphrase);
  rsyncEnv.VPS_SSH_PASSPHRASE = passphrase;
  rsyncEnv.SSH_ASKPASS = askPass.file;
  rsyncEnv.SSH_ASKPASS_REQUIRE = "force";
  rsyncEnv.DISPLAY = rsyncEnv.DISPLAY || "astro-deploy";
}
run(
  "rsync",
  [
    "-az",
    "--delete",
    "-e",
    `ssh -i "${keyPath}" -p ${port} -o StrictHostKeyChecking=accept-new`,
    `${options.dist}/`,
    `${user}@${host}:${targetDir}/`,
  ],
  "Rsync upload failed.",
  rsyncEnv
);
if (askPass) {
  fs.rmSync(askPass.dir, { recursive: true, force: true });
}

info(`==> ${t("common.deployCompleted")}`, "green");
warnIfPnpmMissing();
