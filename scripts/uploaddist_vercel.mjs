#!/usr/bin/env node
/**
 * Deploy to Vercel through Vercel CLI.
 *
 * Default behavior:
 *   1) Load .env.vercel
 *   2) Run vercel build locally
 *   3) Run vercel deploy --prebuilt --archive=tgz
 *
 * Required:
 *   VERCEL_TOKEN
 *
 * Recommended for non-interactive CI:
 *   VERCEL_ORG_ID
 *   VERCEL_PROJECT_ID
 *
 * Options:
 *   --env=.env.vercel
 *   --preview
 *   --no-prebuilt
 *   --skip-clean
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
  runPackageExec,
  warnAboutPackageManager,
  warnIfPnpmMissing,
} from "./deploy_runtime.mjs";

const args = stripLangArgs(process.argv.slice(2));
const options = {
  env: ".env.vercel",
  production: true,
  prebuilt: true,
  skipClean: false,
};

for (const arg of args) {
  if (arg === "--preview") {
    options.production = false;
    continue;
  }
  if (arg === "--no-prebuilt") {
    options.prebuilt = false;
    continue;
  }
  if (arg === "--skip-clean") {
    options.skipClean = true;
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
  console.error(`\n[vercel-deploy] ${message}`);
  process.exit(1);
}

function redactSensitive(text) {
  if (!text) return text;
  let out = text;
  const token = process.env.VERCEL_TOKEN;
  if (token) out = out.split(token).join("[REDACTED_VERCEL_TOKEN]");
  return out;
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

function run(command, commandArgs, errorMessage, env = process.env) {
  const result = spawnSync(command, commandArgs, {
    stdio: "pipe",
    env,
    encoding: "utf8",
  });

  if (result.stdout) process.stdout.write(redactSensitive(result.stdout));
  if (result.stderr) process.stderr.write(redactSensitive(result.stderr));
  if (result.error || result.status !== 0) fail(errorMessage);
}

function runPnpm(args, errorMessage, env = process.env) {
  if (args.length === 1 && args[0] === "--version") return;
  runPackageExec(args[0], args.slice(1), run, errorMessage, env);
}

function getVercelInvocation() {
  const direct = spawnSync("vercel", ["--version"], { stdio: "ignore" });
  if (!direct.error && direct.status === 0) {
    return {
      command: "vercel",
      direct: true,
    };
  }

  return {
    direct: false,
  };
}

function runVercel(args, errorMessage, env = process.env) {
  if (vercel.direct) {
    run(vercel.command, args, errorMessage, env);
    return;
  }
  const command = packageExecCommand("vercel", args);
  run(command.command, command.args, errorMessage, env);
}

function removeIfExists(targetPath) {
  const fullPath = path.resolve(process.cwd(), targetPath);
  const relative = path.relative(process.cwd(), fullPath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    fail(`Refusing to clean unsafe path '${targetPath}'.`);
  }
  if (fs.existsSync(fullPath)) fs.rmSync(fullPath, { recursive: true, force: true });
}

ensureNodeRuntime();
warnAboutPackageManager();
await ensureGitignoreSafety();
loadEnvFile(options.env);

if (!process.env.VERCEL_TOKEN) {
  fail("VERCEL_TOKEN is missing. Put it in .env.vercel or process env.");
}

const vercelEnv = { ...process.env };
const prodFlag = options.production ? ["--prod"] : [];
const tokenArgs = ["--token", process.env.VERCEL_TOKEN];

runPnpm(["--version"], "pnpm is required for Vercel deploy.");
const vercel = getVercelInvocation();
runVercel(["--version"], "Vercel CLI is required. Install it locally or globally.", vercelEnv);

if (!process.env.VERCEL_ORG_ID || !process.env.VERCEL_PROJECT_ID) {
  info("==> VERCEL_ORG_ID / VERCEL_PROJECT_ID not both set. Vercel may require an existing .vercel/project.json link.", "yellow");
}

if (options.prebuilt) {
  if (!options.skipClean) {
    info(`==> ${t("common.cleaning")} .vercel/output...`, "yellow");
    removeIfExists(".vercel/output");
  }

  info(`==> ${t("vercel.building")} (${options.production ? "production" : "preview"})...`);
  runVercel(["build", ...prodFlag, ...tokenArgs], "Vercel local build failed.", vercelEnv);

  info(`==> ${t("vercel.deploying")}...`);
  runVercel(
    ["deploy", "--prebuilt", "--archive=tgz", ...prodFlag, ...tokenArgs],
    "Vercel prebuilt deploy failed.",
    vercelEnv
  );
} else {
  info(`==> ${t("vercel.remote")} (${options.production ? "production" : "preview"})...`);
  runVercel(["deploy", "--yes", ...prodFlag, ...tokenArgs], "Vercel deploy failed.", vercelEnv);
}

info(`==> ${t("common.deployCompleted")}`, "green");
warnIfPnpmMissing();
