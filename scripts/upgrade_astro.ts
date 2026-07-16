#!/usr/bin/env node
/**
 * Safely upgrade Astro-related packages.
 *
 * Cross-platform: Windows, macOS, Linux.
 * Package manager: pnpm when available, otherwise npm.
 *
 * Usage:
 *   pnpm upgrade:astro -- --lang=en --dry-run
 *   pnpm upgrade:astro -- --lang=zh-tw --clean-install
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import {
  color,
  ensureNodeRuntime,
  ensurePackageManagerRuntime,
  getPackageManager,
  packageScriptCommand,
  type PackageCommand,
  type PackageManager,
} from "./deploy_runtime.ts";
import { normalizeLanguage } from "./deploy_i18n.ts";

const CLEAN_TARGETS = ["node_modules", ".astro", "dist"];

const i18n = {
  "zh-tw": {
    title: "安全升級 Astro",
    found: "偵測到 Astro 相關套件",
    none: "沒有找到 Astro 相關套件，已停止。",
    dirty: "git working tree 不是乾淨狀態。為了讓升級容易回復，腳本預設會停止。",
    dirtyHint: "請先提交或備份變更；如果確定要繼續，請加入 --allow-dirty。",
    dryRun: "Dry run：不會修改 package.json、lockfile、node_modules 或 build 輸出。",
    commandPlan: "將執行的指令",
    cleanMode: "乾淨重裝模式",
    cleanModeDetail: "會先刪除可再生目錄，再升級與驗證。",
    cleanTarget: "清理目標",
    confirm: "輸入 yes 開始升級，輸入其他內容取消：",
    cancelled: "已取消升級。",
    updating: "正在升級 Astro 相關套件...",
    verify: "正在執行升級後驗證...",
    done: "Astro 相關套件已升級並完成驗證。",
    packageJsonMissing: "找不到 package.json。",
    invalidPackage: "偵測到不安全的套件名稱，已停止",
    latest: "升級目標",
    latestValue: "latest（安全預設：交給套件管理器解析目前最新版本）",
    pm: "套件管理器",
    note: "此腳本不寫死 astro check/build，而是使用 package.json 既有的 check/lint/build scripts 驗證。",
    noLockDelete: "安全提示：腳本不會自動刪除 lockfile；lockfile 可保留可回溯與可重現安裝。",
  },
  "zh-cn": {
    title: "安全升级 Astro",
    found: "检测到 Astro 相关套件",
    none: "没有找到 Astro 相关套件，已停止。",
    dirty: "git working tree 不是干净状态。为了让升级容易恢复，脚本默认会停止。",
    dirtyHint: "请先提交或备份变更；如果确定要继续，请加入 --allow-dirty。",
    dryRun: "Dry run：不会修改 package.json、lockfile、node_modules 或 build 输出。",
    commandPlan: "将执行的指令",
    cleanMode: "干净重装模式",
    cleanModeDetail: "会先删除可再生目录，再升级与验证。",
    cleanTarget: "清理目标",
    confirm: "输入 yes 开始升级，输入其他内容取消：",
    cancelled: "已取消升级。",
    updating: "正在升级 Astro 相关套件...",
    verify: "正在执行升级后验证...",
    done: "Astro 相关套件已升级并完成验证。",
    packageJsonMissing: "找不到 package.json。",
    invalidPackage: "检测到不安全的套件名称，已停止",
    latest: "升级目标",
    latestValue: "latest（安全默认：交给套件管理器解析目前最新版本）",
    pm: "套件管理器",
    note: "此脚本不写死 astro check/build，而是使用 package.json 既有的 check/lint/build scripts 验证。",
    noLockDelete: "安全提示：脚本不会自动删除 lockfile；lockfile 可保留可回溯与可重现安装。",
  },
  en: {
    title: "Safe Astro Upgrade",
    found: "Detected Astro-related packages",
    none: "No Astro-related packages were found. Stopped.",
    dirty: "The git working tree is not clean. To keep upgrades easy to revert, the script stops by default.",
    dirtyHint: "Commit or back up your changes first, or pass --allow-dirty to continue explicitly.",
    dryRun: "Dry run: package.json, lockfiles, node_modules, and build output will not be modified.",
    commandPlan: "Commands to run",
    cleanMode: "Clean install mode",
    cleanModeDetail: "Generated dependency/build folders will be removed before upgrading and verifying.",
    cleanTarget: "Clean target",
    confirm: "Type yes to start upgrading, anything else to cancel: ",
    cancelled: "Upgrade cancelled.",
    updating: "Upgrading Astro-related packages...",
    verify: "Running post-upgrade verification...",
    done: "Astro-related packages were upgraded and verified.",
    packageJsonMissing: "package.json was not found.",
    invalidPackage: "Unsafe package name detected; stopped",
    latest: "Upgrade target",
    latestValue: "latest (safe default: let the package manager resolve the current latest version)",
    pm: "Package manager",
    note: "This script does not hard-code astro check/build. It uses the existing package.json check/lint/build scripts for verification.",
    noLockDelete: "Safety note: the script does not delete lockfiles automatically; lockfiles preserve reproducible and reversible installs.",
  },
};
type TextKey = keyof typeof i18n.en;
type PackageJson = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

const argv = process.argv.slice(2).filter(arg => arg !== "--");
const lang = normalizeLanguage(argv.find(arg => arg.startsWith("--lang="))?.slice("--lang=".length) || process.env.DEPLOY_LANG || "zh-tw");
const text = (key: TextKey): string => i18n[lang][key] ?? i18n.en[key] ?? key;

const options = {
  dryRun: argv.includes("--dry-run"),
  yes: argv.includes("--yes") || argv.includes("-y"),
  allowDirty: argv.includes("--allow-dirty"),
  cleanInstall: argv.includes("--clean-install"),
  skipCheck: argv.includes("--skip-check"),
  skipLint: argv.includes("--skip-lint"),
  skipBuild: argv.includes("--skip-build"),
};

function frame(title: string): void {
  console.log(color.amber(`\n${"=".repeat(76)}`));
  console.log(color.amber(` ${title}`));
  console.log(color.amber("=".repeat(76)));
}

function fail(message: string): never {
  console.error(color.red(`\n[upgrade-astro] ${message}`));
  process.exit(1);
}

function run(command: string, args: string[], errorMessage: string, env: NodeJS.ProcessEnv = process.env): void {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.error || result.status !== 0) fail(errorMessage);
}

function runCapture(command: string, args: string[]) {
  return spawnSync(command, args, { stdio: "pipe", encoding: "utf8", env: process.env });
}

function readPackageJson(): PackageJson {
  if (!fs.existsSync("package.json")) fail(text("packageJsonMissing"));
  return JSON.parse(fs.readFileSync("package.json", "utf8")) as PackageJson;
}

function isAstroRelated(name: string): boolean {
  return (
    name === "astro" ||
    name.startsWith("@astrojs/") ||
    name.startsWith("astro-") ||
    name.includes("-astro") ||
    name === "prettier-plugin-astro" ||
    name === "astro-eslint-parser"
  );
}

function assertSafePackageName(name: string): void {
  const allowed = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-/@";
  const charsAreSafe = [...name].every(char => allowed.includes(char));
  const atCount = [...name].filter(char => char === "@").length;
  const slashCount = [...name].filter(char => char === "/").length;
  const scopedShape = name.startsWith("@") ? slashCount === 1 && atCount === 1 : slashCount === 0 && atCount === 0;
  if (!charsAreSafe || !scopedShape || name.includes("..") || name.endsWith("/") || name.length > 214) {
    fail(`${text("invalidPackage")}: ${name}`);
  }
}

function astroPackages(pkg: PackageJson): string[] {
  const sections: Array<'dependencies' | 'devDependencies' | 'optionalDependencies'> = [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
  ];
  const names = new Set<string>();
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

function gitIsDirty(): boolean {
  const probe = runCapture("git", ["status", "--porcelain"]);
  if (probe.error || probe.status !== 0) return false;
  return probe.stdout.trim().length > 0;
}

function updateCommand(pm: PackageManager, packages: string[]): PackageCommand {
  return {
    command: pm.command,
    args: [...pm.scriptPrefix.slice(0, -1), "up", ...packages, "--latest"],
    display: `${pm.displayPrefix} up ${packages.join(" ")} --latest`,
  };
}

function scriptExists(pkg: PackageJson, name: string): boolean {
  return typeof pkg.scripts?.[name] === "string" && pkg.scripts[name].trim() !== "";
}

function verifyCommands(pkg: PackageJson): PackageCommand[] {
  const names: Array<[string, boolean]> = [
    ["check", !options.skipCheck],
    ["lint", !options.skipLint],
    ["build", !options.skipBuild],
  ];
  return names
    .filter(([name, enabled]) => enabled && scriptExists(pkg, name))
    .map(([name]) => packageScriptCommand(name));
}

function safeCleanPath(target: string): string {
  if (!CLEAN_TARGETS.includes(target)) fail(`${text("invalidPackage")}: ${target}`);
  const cwd = fs.realpathSync(process.cwd());
  const absolute = path.resolve(cwd, target);
  const relative = path.relative(cwd, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    fail(`${text("invalidPackage")}: ${target}`);
  }
  return absolute;
}

function removeCleanTargets(): void {
  if (!options.cleanInstall) return;
  frame(text("cleanMode"));
  console.log(color.dim(text("cleanModeDetail")));
  console.log(color.dim(text("noLockDelete")));
  for (const target of CLEAN_TARGETS) {
    const absolute = safeCleanPath(target);
    console.log(`${text("cleanTarget")}: ${target}`);
    if (!options.dryRun && fs.existsSync(absolute)) {
      fs.rmSync(absolute, { recursive: true, force: true });
    }
  }
}

async function confirm(): Promise<boolean> {
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
  ensurePackageManagerRuntime();
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
  if (options.cleanInstall) {
    console.log(color.dim(`${text("cleanMode")}: ${CLEAN_TARGETS.join(", ")}`));
    console.log(color.dim(text("noLockDelete")));
  }
  console.log(`\n${text("found")}:`);
  for (const name of packages) console.log(`  - ${name}`);

  frame(text("commandPlan"));
  if (options.cleanInstall) console.log(`${text("cleanMode")}: ${CLEAN_TARGETS.join(", ")}`);
  console.log(update.display);
  for (const command of verify) console.log(command.display);
  if (options.dryRun) {
    console.log(color.amber(`\n${text("dryRun")}`));
    return;
  }

  if (!(await confirm())) {
    console.log(color.amber(text("cancelled")));
    return;
  }

  removeCleanTargets();

  console.log(color.cyan(`\n==> ${text("updating")}`));
  run(update.command, update.args, text("updating"));

  console.log(color.cyan(`\n==> ${text("verify")}`));
  for (const command of verify) run(command.command, command.args, command.display);

  console.log(color.green(`\n==> ${text("done")}`));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
