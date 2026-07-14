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
 *   pnpm exec tsx ./scripts/uploaddist_cf.ts
 *   (Same behavior as pnpm uploaddist:cf:node)
 *
 * This file is cross-platform (Windows/macOS/Linux).
 *
 * Options:
 * --project=<name>        Target Cloudflare Pages project name
 * --branch=main           Override the Cloudflare Pages production branch
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
 *   pnpm exec tsx ./scripts/uploaddist_cf.ts
 * - Keep dist (skip cleanup):
 *   pnpm exec tsx ./scripts/uploaddist_cf.ts --skip-clean
 * - Custom project/env:
 *   pnpm exec tsx ./scripts/uploaddist_cf.ts --project=<existing-pages-project> --env=.env.cloudflare
 * - Full command (all options):
 *   pnpm exec tsx ./scripts/uploaddist_cf.ts --project=<existing-pages-project> --dist=dist --env=.env.cloudflare --skip-clean
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { ensureGitignoreSafety } from "./deploy_safety.ts";
import { stripLangArgs, t } from "./deploy_i18n.ts";
import {
  ensureNodeRuntime,
  ensurePackageManagerRuntime,
  packageExecCommand,
  runPackageScript,
} from "./deploy_runtime.ts";

type Version = { major: number; minor: number; patch: number };
type Tone = 'yellow' | 'cyan' | 'green';
type PagesProject = { name?: unknown; 'Project Name'?: unknown };
type CloudflarePayload = {
  success?: unknown;
  result?: unknown;
  projects?: unknown;
};

function parseVersion(v: unknown): Version | null {
  // Accept: "v22.12.0" or "22.12.0"
  const raw = String(v ?? "").trim().replace(/^v/, "");
  const m = raw.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function compareVersions(a: Version, b: Version): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function readEnginesNodeMinVersion(): { raw: string; min: Version | null } | null {
  try {
    const pkgPath = path.resolve(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { engines?: { node?: unknown } };
    const engine = pkg.engines?.node;
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

function info(message: string, tone: Tone = "cyan"): void {
  const c = color[tone] ?? "";
  const reset = c ? color.reset : "";
  console.log(`${c}${message}${reset}`);
}

function fail(message: string): never {
  console.error(`\n[deploy] ${message}`);
  process.exit(1);
}

function redactSensitive(text: string): string {
  if (!text) return text;
  let out = text;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (token) out = out.split(token).join("[REDACTED_CLOUDFLARE_API_TOKEN]");
  return out;
}

function run(command: string, commandArgs: string[], errorMessage: string, env: NodeJS.ProcessEnv = process.env): void {
  const result = spawnSync(command, commandArgs, {
    stdio: "pipe",
    env,
    encoding: "utf8",
  });

  if (result.stdout) process.stdout.write(redactSensitive(result.stdout));
  if (result.stderr) process.stderr.write(redactSensitive(result.stderr));

  if (result.error || result.status !== 0) fail(errorMessage);
}

function runCapture(command: string, commandArgs: string[], errorMessage: string, env: NodeJS.ProcessEnv = process.env): { stdout: string; stderr: string } {
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

function runPackageTool(args: [string, ...string[]], errorMessage: string): void {
  const [script, ...scriptArgs] = args;
  if (script === "check" || script === "build") {
    runPackageScript(script, scriptArgs, run, errorMessage);
    return;
  }
  const executable = args[1];
  if (!executable) fail("A package executable is required.");
  const command = packageExecCommand(executable, args.slice(2));
  run(command.command, command.args, errorMessage);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadEnvFile(envFilePath: string): void {
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
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function readWranglerProjectName(): string {
  try {
    const tomlPath = path.resolve(process.cwd(), "wrangler.toml");
    if (fs.existsSync(tomlPath)) {
      const content = fs.readFileSync(tomlPath, "utf8");

      const m = content.match(/^\s*name\s*=\s*["']([^"']+)["']/m);
      const projectName = m?.[1];
      if (projectName) return projectName.trim();
    }
  } catch (error) {
    console.warn(`[deploy] Unable to read wrangler.toml project name: ${error instanceof Error ? error.message : String(error)}`);
  }
  return "";
}

function getCloudflarePagesProjectName(): string {
  const envProject =
    process.env.CLOUDFLARE_PAGES_PROJECT_NAME ||
    process.env.CLOUDFLARE_PROJECT_NAME ||
    process.env.CF_PAGES_PROJECT_NAME ||
    "";

  const wranglerProject = readWranglerProjectName();

  return (options.project || envProject || wranglerProject).trim();
}

function readPackageProjectName(): string {
  try {
    const pkgPath = path.resolve(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return String(pkg?.name || "").trim();
  } catch {
    return "";
  }
}

function readCurrentGitBranch(): string {
  const result = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    stdio: "pipe",
    encoding: "utf8",
  });
  return result.status === 0 ? String(result.stdout || "").trim() : "";
}

async function getPagesProductionBranch(projectName: string): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) fail('Cloudflare account ID and API token are required.');
  const url =
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}` +
    `/pages/projects/${encodeURIComponent(projectName)}`;

  let response: Response;
  try {
    response = await globalThis.fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
  } catch (error) {
    fail(`Unable to read the Cloudflare Pages production branch: ${error instanceof Error ? error.message : String(error)}`);
  }

  let payload: CloudflarePayload;
  try {
    payload = (await response.json()) as CloudflarePayload;
  } catch {
    fail("Cloudflare returned an unreadable response while checking the production branch.");
  }

  const result = typeof payload.result === 'object' && payload.result !== null
    ? payload.result as Record<string, unknown>
    : {};
  const branch = String(result.production_branch || "").trim();
  if (!response.ok || payload.success === false || !branch) {
    fail(
      `Unable to determine the production branch for Cloudflare Pages project '${projectName}'. ` +
        "Pass --branch=<production-branch> explicitly or check the API token permissions."
    );
  }
  return branch;
}

function assertSafeDistPath(distPath: string): void {
  const cwd = process.cwd();
  const relative = path.relative(cwd, distPath);

  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    fail(`Refusing to use unsafe dist path '${options.dist}'. It must stay inside the project.`);
  }
  const generatedName = ['dist', 'build', 'output'].some(prefix =>
    relative === prefix || ['-', '_', '.'].some(separator => relative.startsWith(`${prefix}${separator}`))
  );
  const safeName = [...relative].every(char => /[A-Za-z0-9._-]/.test(char));
  if (!options.skipClean && (!generatedName || !safeName)) {
    fail(`Refusing to delete custom output path '${options.dist}'. Use --skip-clean for a prebuilt custom directory.`);
  }
}

function normalizePagesProjects(payload: unknown): PagesProject[] {
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== 'object' || payload === null) return [];
  const object = payload as CloudflarePayload;
  if (Array.isArray(object.result)) return object.result;
  if (Array.isArray(object.projects)) return object.projects;
  if (typeof object.result === 'object' && object.result !== null) {
    const projects = (object.result as Record<string, unknown>).projects;
    if (Array.isArray(projects)) return projects;
  }
  return [];
}

function getProjectName(project: PagesProject): string {
  return String(project.name || project["Project Name"] || "");
}

function updateEnvValue(envFilePath: string, key: string, value: string): void {
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

function createPagesProject(projectName: string, env: NodeJS.ProcessEnv): void {
  const productionBranch = options.branch || readCurrentGitBranch() || "main";
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

function ensurePagesProject(projectName: string, env: NodeJS.ProcessEnv): void {
  info(`==> ${t("cf.verify")}: '${projectName}'`);
  const wrangler = packageExecCommand("wrangler", ["pages", "project", "list", "--json"]);
  const output = runCapture(
    wrangler.command,
    wrangler.args,
    "Unable to list Cloudflare Pages projects. Check .env.cloudflare token/account permissions.",
    env
  );

  let payload: unknown;
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
ensurePackageManagerRuntime();
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

const wranglerEnv: NodeJS.ProcessEnv = {
  ...process.env,
  XDG_CONFIG_HOME: wranglerConfigHome,
};
ensurePagesProject(projectName, wranglerEnv);
const deploymentBranch = options.branch || (await getPagesProductionBranch(projectName));
info(`==> Cloudflare Pages production branch: ${deploymentBranch}`);

const distPath = path.resolve(process.cwd(), options.dist);
assertSafeDistPath(distPath);
if (!options.skipClean && fs.existsSync(distPath)) {
  info(`==> ${t("common.cleaning")} '${options.dist}'...`, "yellow");
  fs.rmSync(distPath, { recursive: true, force: true });
}

if (process.env.DEPLOY_CHECKED !== "1") {
  info(`==> ${t("common.deploymentCheck")}`);
  runPackageTool(["check"], "Project checks failed.");
}

info(`==> ${t("common.building")}`);
runPackageTool(
  options.dist === 'dist' ? ["build"] : ["build", "--outDir", options.dist],
  "Build failed."
);

if (!fs.existsSync(distPath)) {
  fail(`${t("common.distMissing")}: '${options.dist}'.`);
}

if (process.platform === "win32") {
  info("==> Windows system detected. Waiting 2 seconds for file system locks to release...", "yellow");
  await sleep(2000);
}

info(`==> ${t("notice.cfProject")}: ${projectName}`);
info(`==> ${t("cf.deploying")}: '${projectName}'`);
const deployArgs: string[] = [
  "pages",
  "deploy",
  options.dist,
  "--project-name",
  projectName,
];
deployArgs.push("--branch", deploymentBranch);
const wranglerDeploy = packageExecCommand("wrangler", deployArgs);
run(wranglerDeploy.command, wranglerDeploy.args, "Wrangler deploy failed.", wranglerEnv);

info(`==> ${t("common.deployCompleted")}`, "green");
