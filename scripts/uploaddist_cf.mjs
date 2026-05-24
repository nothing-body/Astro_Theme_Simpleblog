#!/usr/bin/env node
/**
 * Upload built dist/ to Cloudflare Pages (cross-platform).
 * CI friendly: works in local dev and CI runners.
 *
 * Quick deploy command:
 *   pnpm uploaddist:cf:node
 *   (Recommended for daily use)
 *
 * Direct upload command:
 *   node ./scripts/uploaddist_cf.mjs
 *   (Same behavior as pnpm uploaddist:cf:node)
 *
 * This file is cross-platform (Windows/macOS/Linux).
 *
 * Options:
 * --project=<name>        Target Cloudflare Pages project name
 * --branch=main           Deploy to target branch (preview / production control)
 * --dist=dist             Build output folder to upload
 * --env=.env.cloudflare   Env file for CLOUDFLARE_API_TOKEN / ACCOUNT_ID
 * --skip-clean            Do NOT delete dist/ before build
 *
 * CI usage examples:
 * - PR preview:
 *   pnpm uploaddist:cf:node --branch=pr-123
 * - production on main:
 *   pnpm uploaddist:cf:node --branch=main
 *
 * Examples:
 * - Default (clean dist, then build + upload):
 *   node ./scripts/uploaddist_cf.mjs
 * - Keep dist (skip cleanup):
 *   node ./scripts/uploaddist_cf.mjs --skip-clean
 * - Custom project/env:
 *   node ./scripts/uploaddist_cf.mjs --project=<existing-pages-project> --env=.env.cloudflare
 * - Full command (all options):
 *   node ./scripts/uploaddist_cf.mjs --project=<existing-pages-project> --dist=dist --env=.env.cloudflare --skip-clean
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { ensureGitignoreSafety } from "./deploy_safety.mjs";
import { stripLangArgs, t } from "./deploy_i18n.mjs";
import {
  ensureNodeRuntime,
  packageExecCommand,
  runPackageScript,
  warnIfPnpmMissing,
  warnAboutPackageManager,
} from "./deploy_runtime.mjs";

function parseVersion(v) {
  // Accept: "v22.12.0" or "22.12.0"
  const raw = String(v ?? "").trim().replace(/^v/, "");
  const m = raw.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function compareVersions(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function readEnginesNodeMinVersion() {
  try {
    const pkgPath = path.resolve(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const engine = pkg?.engines?.node;
    if (typeof engine !== "string") return null;

    // Support the common form: ">=22.12.0"
    const m = engine.trim().match(/^>=\s*(\d+\.\d+\.\d+)/);
    if (!m) return { raw: engine, min: null };
    return { raw: engine, min: parseVersion(m[1]) };
  } catch {
    return null;
  }
}

const args = stripLangArgs(process.argv.slice(2));
const options = {
  project: "",
  branch: "",
  dist: "dist",
  env: ".env.cloudflare",
  skipClean: false,
};

for (const arg of args) {
  if (arg === "--skip-clean") {
    options.skipClean = true;
    continue;
  }
  if (arg.startsWith("--project=")) {
    options.project = arg.slice("--project=".length);
    continue;
  }
  if (arg.startsWith("--branch=")) {
    options.branch = arg.slice("--branch=".length);
    continue;
  }
  if (arg.startsWith("--dist=")) {
    options.dist = arg.slice("--dist=".length);
    continue;
  }
  if (arg.startsWith("--env=")) {
    options.env = arg.slice("--env=".length);
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
  console.error(`\n[deploy] ${message}`);
  process.exit(1);
}

function redactSensitive(text) {
  if (!text) return text;
  let out = text;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (token) out = out.split(token).join("[REDACTED_CLOUDFLARE_API_TOKEN]");
  return out;
}

function run(command, commandArgs, errorMessage, env = process.env) {
  const result = spawnSync(command, commandArgs, {
    stdio: "pipe",
    env,
    encoding: "utf8",
  });

  if (result.stdout) process.stdout.write(redactSensitive(result.stdout));
  if (result.stderr) process.stderr.write(redactSensitive(result.stderr));

  if (result.status !== 0) fail(errorMessage);
}

function runCapture(command, commandArgs, errorMessage, env = process.env) {
  const result = spawnSync(command, commandArgs, {
    stdio: "pipe",
    env,
    encoding: "utf8",
  });

  if (result.status !== 0 || result.error) {
    if (result.stdout) process.stdout.write(redactSensitive(result.stdout));
    if (result.stderr) process.stderr.write(redactSensitive(result.stderr));
    fail(errorMessage);
  }

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function runPnpm(args, errorMessage) {
  if (args.length === 1 && args[0] === "build") {
    runPackageScript("build", [], run, errorMessage);
    return;
  }
  const command = packageExecCommand(args[1], args.slice(2));
  run(command.command, command.args, errorMessage);
}

function sleepSync(ms) {
  const buffer = new SharedArrayBuffer(4);
  const view = new Int32Array(buffer);
  Atomics.wait(view, 0, 0, ms);
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
    if (key) {
      process.env[key] = value;
    }
  }
}

// 從 wrangler.toml 中解析專案名稱，作為自動後備方案
function readWranglerProjectName() {
  try {
    const tomlPath = path.resolve(process.cwd(), "wrangler.toml");
    if (fs.existsSync(tomlPath)) {
      const content = fs.readFileSync(tomlPath, "utf8");
      // 使用正規表示式匹配 name = "專案名稱" 或 name = '專案名稱'
      const m = content.match(/^\s*name\s*=\s*["']([^"']+)["']/m);
      if (m) return m[1].trim();
    }
  } catch {
    // 忽略讀取錯誤，這只是一個後備機制
  }
  return "";
}

function getCloudflarePagesProjectName() {
  const envProject =
    process.env.CLOUDFLARE_PAGES_PROJECT_NAME ||
    process.env.CLOUDFLARE_PROJECT_NAME ||
    process.env.CF_PAGES_PROJECT_NAME ||
    "";

  const wranglerProject = readWranglerProjectName();

  return (options.project || envProject || wranglerProject).trim();
}

function readPackageProjectName() {
  try {
    const pkgPath = path.resolve(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return String(pkg?.name || "").trim();
  } catch {
    return "";
  }
}

function assertSafeDistPath(distPath) {
  const cwd = process.cwd();
  const relative = path.relative(cwd, distPath);

  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    fail(`Refusing to use unsafe dist path '${options.dist}'. It must stay inside the project.`);
  }
}

function normalizePagesProjects(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.projects)) return payload.projects;
  if (Array.isArray(payload?.result?.projects)) return payload.result.projects;
  return [];
}

function getProjectName(project) {
  return project?.name || project?.["Project Name"] || "";
}

function updateEnvValue(envFilePath, key, value) {
  const fullPath = path.resolve(process.cwd(), envFilePath);
  const nextLine = `${key}=${value}`;

  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, `${nextLine}\n`, "utf8");
    return;
  }

  const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/);
  let changed = false;
  const updated = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) return line;
    const currentKey = line.slice(0, eqIndex).trim();
    if (currentKey !== key) return line;
    changed = true;
    return nextLine;
  });

  if (!changed) {
    if (updated.length > 0 && updated.at(-1) !== "") updated.push("");
    updated.push(nextLine);
  }

  fs.writeFileSync(fullPath, `${updated.join("\n").replace(/\n+$/, "")}\n`, "utf8");
}

function createPagesProject(projectName, env) {
  const productionBranch = options.branch || "main";
  info(`==> ${t("cf.create")}: '${projectName}'`, "yellow");
  const wrangler = packageExecCommand("wrangler", [
    "pages",
    "project",
    "create",
    projectName,
    "--production-branch",
    productionBranch,
  ]);
  run(
    wrangler.command,
    wrangler.args,
    `Unable to create Cloudflare Pages project '${projectName}'. Check token permissions and project name.`,
    env
  );
  updateEnvValue(options.env, "CLOUDFLARE_PAGES_PROJECT_NAME", projectName);
  info(`==> ${t("cf.saved")}: ${projectName} -> '${options.env}'.`, "green");
}

function ensurePagesProject(projectName, env) {
  info(`==> ${t("cf.verify")}: '${projectName}'`);
  const wrangler = packageExecCommand("wrangler", ["pages", "project", "list", "--json"]);
  const output = runCapture(
    wrangler.command,
    wrangler.args,
    "Unable to list Cloudflare Pages projects. Check .env.cloudflare token/account permissions.",
    env
  );

  let payload;
  try {
    payload = JSON.parse(output.stdout);
  } catch {
    fail("Unable to parse Wrangler project list JSON. Aborting to avoid creating a wrong Pages project.");
  }

  const projects = normalizePagesProjects(payload);
  const exists = projects.some(project => getProjectName(project) === projectName);
  if (exists) return;

  const knownProjects = projects
    .map(getProjectName)
    .filter(Boolean)
    .sort()
    .join(", ");
  if (knownProjects) info(`==> Existing Pages projects: ${knownProjects}`, "yellow");
  createPagesProject(projectName, env);
}

const wranglerConfigHome = path.resolve(process.cwd(), ".wrangler", "xdg-config");
fs.mkdirSync(wranglerConfigHome, { recursive: true });

ensureNodeRuntime();
warnAboutPackageManager();
await ensureGitignoreSafety();
loadEnvFile(options.env);

// Version alignment check (fail fast)
const enginesNode = readEnginesNodeMinVersion();
if (enginesNode?.min) {
  const current = parseVersion(process.version);
  if (!current) {
    info(`==> Warning: unable to parse current Node version '${process.version}'.`, "yellow");
  } else if (compareVersions(current, enginesNode.min) < 0) {
    fail(
      `Node version too old. Required ${enginesNode.raw}, current ${process.version}. ` +
        `Please upgrade Node to avoid build/runtime issues.`
    );
  }
} else if (enginesNode?.raw) {
  info(`==> Note: engines.node is '${enginesNode.raw}'. This script currently enforces only '>=x.y.z'.`, "yellow");
}

if (!process.env.CLOUDFLARE_API_TOKEN) {
  fail("CLOUDFLARE_API_TOKEN is missing. Put it in .env.cloudflare or process env.");
}
if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
  fail("CLOUDFLARE_ACCOUNT_ID is missing. Put it in .env.cloudflare or process env.");
}

const projectName = getCloudflarePagesProjectName() || readPackageProjectName();
if (!projectName) {
  fail(
    "CLOUDFLARE_PAGES_PROJECT_NAME is missing and package.json name could not be used as a fallback. " +
      "Put a Pages project name in .env.cloudflare or pass --project=<pages-project-name>."
  );
}

const wranglerEnv = {
  ...process.env,
  XDG_CONFIG_HOME: wranglerConfigHome,
};
ensurePagesProject(projectName, wranglerEnv);

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

// 針對 Windows 平台引入安全延時解鎖緩衝
// 當 Astro 剛完成大量的 HTML 寫入時，Windows Defender 或即時掃描防毒軟體會鎖定剛生成的檔案進行掃描
// 若 Wrangler 立刻發起讀取，會造成作業系統鎖定衝突（Lock Competition）而引發假性的 ENOENT/EACCES 錯誤
if (process.platform === "win32") {
  info("==> Windows system detected. Waiting 2 seconds for file system locks to release...", "yellow");
  sleepSync(2000);
}

info(`==> ${t("notice.cfProject")}: ${projectName}`);
info(`==> ${t("cf.deploying")}: '${projectName}'`);
const deployArgs = [
  "pages",
  "deploy",
  options.dist,
  "--project-name",
  projectName,
];
if (options.branch) {
  deployArgs.push("--branch", options.branch);
}
const wranglerDeploy = packageExecCommand("wrangler", deployArgs);
run(wranglerDeploy.command, wranglerDeploy.args, "Wrangler deploy failed.", wranglerEnv);

info(`==> ${t("common.deployCompleted")}`, "green");
warnIfPnpmMissing();
