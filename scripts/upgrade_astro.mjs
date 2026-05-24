#!/usr/bin/env node
/**
 * Safely upgrade Astro-related packages.
 *
 * Cross-platform: Windows, macOS, Linux.
 * Package managers: pnpm preferred, npm supported.
 *
 * Usage:
 *   pnpm upgrade:astro -- --lang=en --dry-run
 *   pnpm upgrade:astro -- --lang=zh-tw
 *   npm run upgrade:astro -- --lang=en --yes
 */
import fs from "node:fs";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { color, ensureNodeRuntime, getPackageManager, packageScriptCommand, warnAboutPackageManager, warnIfPnpmMissing } from "./deploy_runtime.mjs";
import { normalizeLanguage } from "./deploy_i18n.mjs";

const i18n = {
  "zh-tw": {
    title: "Astro 安全升級",
    found: "偵測到 Astro 相關套件",
    none: "找不到 Astro 相關套件，已停止。",
    dirty: "目前 git working tree 不是乾淨狀態。為了避免升級後難以回復，預設停止。",
    dirtyHint: "請先提交或備份變更，或使用 --allow-dirty 明確允許。",
    dryRun: "模擬執行模式：不會修改 package.json 或 lockfile。",
    commandPlan: "將執行的指令",
    confirm: "輸入 yes 開始升級，輸入其他內容取消：",
    cancelled: "已取消升級。",
    updating: "正在升級 Astro 相關套件...",
    verify: "正在執行升級後驗證...",
    done: "Astro 相關套件升級與驗證完成。",
    noScript: "找不到 package.json script，略過",
    packageJsonMissing: "找不到 package.json。",
    invalidPackage: "偵測到不安全的套件名稱，已停止",
    latest: "升級目標",
    latestValue: "latest（安全預設：交給套件管理器解析最新版本）",
    pm: "套件管理器",
    note: "此腳本不直接寫死 astro check/build，而是使用 package.json 內既有的 check/lint/build scripts 進行驗證。",
  },
  en: {
    title: "Safe Astro Upgrade",
    found: "Detected Astro-related packages",
    none: "No Astro-related packages were found. Stopped.",
    dirty: "The git working tree is not clean. To keep upgrades easy to revert, the script stops by default.",
    dirtyHint: "Commit or back up your changes first, or pass --allow-dirty to continue explicitly.",
    dryRun: "Dry run: package.json and lockfiles will not be modified.",
    commandPlan: "Commands to run",
    confirm: "Type yes to start upgrading, anything else to cancel: ",
    cancelled: "Upgrade cancelled.",
    updating: "Upgrading Astro-related packages...",
    verify: "Running post-upgrade verification...",
    done: "Astro-related packages were upgraded and verified.",
    noScript: "package.json script not found, skipped",
    packageJsonMissing: "package.json was not found.",
    invalidPackage: "Unsafe package name detected; stopped",
    latest: "Upgrade target",
    latestValue: "latest (safe default: let the package manager resolve the current latest version)",
    pm: "Package manager",
    note: "This script does not hard-code astro check/build. It uses the existing package.json check/lint/build scripts for verification.",
  },
};

const argv = process.argv.slice(2).filter(arg => arg !== "--");
const lang = normalizeLanguage(argv.find(arg => arg.startsWith("--lang="))?.slice("--lang=".length) || process.env.DEPLOY_LANG || "zh-tw");
const text = key => i18n[lang]?.[key] ?? i18n.en[key] ?? key;

const options = {
  dryRun: argv.includes("--dry-run"),
  yes: argv.includes("--yes") || argv.includes("-y"),
  allowDirty: argv.includes("--allow-dirty"),
  skipCheck: argv.includes("--skip-check"),
  skipLint: argv.includes("--skip-lint"),
  skipBuild: argv.includes("--skip-build"),
};

function frame(title) {
  console.log(color.amber(`\n${"=".repeat(76)}`));
  console.log(color.amber(` ${title}`));
  console.log(color.amber("=".repeat(76)));
}

function fail(message) {
  console.error(color.red(`\n[upgrade-astro] ${message}`));
  process.exit(1);
}

function run(command, args, errorMessage, env = process.env) {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.error || result.status !== 0) fail(errorMessage);
}

function runCapture(command, args) {
  return spawnSync(command, args, { stdio: "pipe", encoding: "utf8", env: process.env });
}

function readPackageJson() {
  if (!fs.existsSync("package.json")) fail(text("packageJsonMissing"));
  return JSON.parse(fs.readFileSync("package.json", "utf8"));
}

function isAstroRelated(name) {
  return (
    name === "astro" ||
    name.startsWith("@astrojs/") ||
    name.startsWith("astro-") ||
    name.includes("-astro") ||
    name === "prettier-plugin-astro" ||
    name === "astro-eslint-parser"
  );
}

function assertSafePackageName(name) {
  const allowed = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-/@";
  const charsAreSafe = [...name].every(char => allowed.includes(char));
  const atCount = [...name].filter(char => char === "@").length;
  const slashCount = [...name].filter(char => char === "/").length;
  const scopedShape = name.startsWith("@") ? slashCount === 1 && atCount === 1 : slashCount === 0 && atCount === 0;
  if (!charsAreSafe || !scopedShape || name.includes("..") || name.endsWith("/") || name.length > 214) {
    fail(`${text("invalidPackage")}: ${name}`);
  }
}

function astroPackages(pkg) {
  const sections = ["dependencies", "devDependencies", "optionalDependencies"];
  const names = new Set();
  for (const section of sections) {
    const deps = pkg[section] ?? {};
    for (const name of Object.keys(deps)) {
      if (isAstroRelated(name)) {
        assertSafePackageName(name);
        names.add(name);
      }
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function gitIsDirty() {
  const probe = runCapture("git", ["status", "--porcelain"]);
  if (probe.error || probe.status !== 0) return false;
  return probe.stdout.trim().length > 0;
}

function updateCommand(pm, packages) {
  if (pm.name === "pnpm") {
    return {
      command: pm.command,
      args: [...pm.scriptPrefix.slice(0, -1), "up", ...packages, "--latest"],
      display: `${pm.displayPrefix} up ${packages.join(" ")} --latest`,
    };
  }

  const specs = packages.map(name => `${name}@latest`);
  const npmArgs = pm.command === process.execPath && pm.scriptPrefix[0]
    ? [pm.scriptPrefix[0], "install", ...specs]
    : ["install", ...specs];
  return {
    command: pm.command,
    args: npmArgs,
    display: `${pm.displayPrefix.replace(/ run$/, "")} install ${specs.join(" ")}`,
  };
}

function scriptExists(pkg, name) {
  return typeof pkg.scripts?.[name] === "string" && pkg.scripts[name].trim() !== "";
}

function verifyCommands(pkg) {
  const names = [
    ["check", !options.skipCheck],
    ["lint", !options.skipLint],
    ["build", !options.skipBuild],
  ];
  return names
    .filter(([name, enabled]) => enabled && scriptExists(pkg, name))
    .map(([name]) => packageScriptCommand(name));
}

async function confirm() {
  if (options.yes || options.dryRun) return true;
  if (!process.stdin.isTTY) return false;
  const { createInterface } = await import("node:readline/promises");
  const { stdin: input, stdout: output } = await import("node:process");
  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question(color.amber(`\n${text("confirm")}`))).trim().toLowerCase();
    return answer === "yes" || answer === "y";
  } finally {
    rl.close();
  }
}

async function main() {
  ensureNodeRuntime();
  warnAboutPackageManager();
  const pkg = readPackageJson();
  const packages = astroPackages(pkg);
  if (packages.length === 0) fail(text("none"));

  if (!options.dryRun && !options.allowDirty && gitIsDirty()) {
    fail(`${text("dirty")}\n${text("dirtyHint")}`);
  }

  const pm = getPackageManager();
  const update = updateCommand(pm, packages);
  const verify = verifyCommands(pkg);

  frame(text("title"));
  console.log(`${color.dim(text("pm").padEnd(22, " "))} ${pm.name}`);
  console.log(`${color.dim(text("latest").padEnd(22, " "))} ${text("latestValue")}`);
  console.log(color.dim(text("note")));
  console.log(`\n${text("found")}:`);
  for (const name of packages) console.log(`  - ${name}`);

  frame(text("commandPlan"));
  console.log(update.display);
  for (const command of verify) console.log(command.display);
  if (options.dryRun) {
    console.log(color.amber(`\n${text("dryRun")}`));
    warnIfPnpmMissing();
    return;
  }

  if (!(await confirm())) {
    console.log(color.amber(text("cancelled")));
    return;
  }

  console.log(color.cyan(`\n==> ${text("updating")}`));
  run(update.command, update.args, text("updating"));

  console.log(color.cyan(`\n==> ${text("verify")}`));
  for (const command of verify) run(command.command, command.args, command.display);

  console.log(color.green(`\n==> ${text("done")}`));
  warnIfPnpmMissing();
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
