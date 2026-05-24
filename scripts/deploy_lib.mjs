import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { packageScriptCommand } from "./deploy_runtime.mjs";
import { getLanguage, t } from "./deploy_i18n.mjs";

export const GIT_PROVIDERS = [
  {
    id: "github",
    name: "GitHub",
    defaultRemote: "github",
    ciFile: ".github/workflows/deploy.yml",
    notesKey: "notice.gitCredentials",
  },
  {
    id: "gitlab",
    name: "GitLab",
    defaultRemote: "gitlab",
    ciFile: ".gitlab-ci.yml",
    notesKey: "notice.gitCredentials",
  },
  {
    id: "codeberg",
    name: "Codeberg",
    defaultRemote: "codeberg",
    ciFile: ".woodpecker.yml",
    notesKey: "notice.gitCredentials",
  },
];

export const DEPLOY_TARGETS = [
  {
    id: "cf",
    name: "Cloudflare Pages",
    packageScript: "uploaddist:cf:node",
    directAlias: "deploy:cf:only",
    envFile: ".env.cloudflare",
    requiredEnv: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_PAGES_PROJECT_NAME"],
    noteKeys: ["target.cf.note1", "target.cf.note2"],
  },
  {
    id: "vps",
    name: "VPS",
    packageScript: "uploaddist:vps:node",
    directAlias: "deploy:vps:only",
    envFile: ".env.vps",
    requiredEnv: ["VPS_HOST", "VPS_USER", "VPS_TARGET_DIR"],
    noteKeys: ["target.vps.note1", "target.vps.note2", "notice.vpsPassphrase", "notice.vpsNonRoot"],
  },
  {
    id: "vercel",
    name: "Vercel",
    packageScript: "uploaddist:vercel:node",
    directAlias: "deploy:vercel:only",
    envFile: ".env.vercel",
    requiredEnv: ["VERCEL_TOKEN"],
    noteKeys: ["target.vercel.note1", "target.vercel.note2"],
  },
];

export const DEPLOY_COMBOS = [
  ["cf"],
  ["vps"],
  ["vercel"],
  ["cf", "vps"],
  ["cf", "vercel"],
  ["vps", "vercel"],
  ["cf", "vps", "vercel"],
];

export const DIRECT_COMBO_ALIASES = new Map([
  ["cf", "deploy:cf:only"],
  ["vps", "deploy:vps:only"],
  ["vercel", "deploy:vercel:only"],
  ["cf+vps", "deploy:cf:vps"],
  ["cf+vercel", "deploy:cf:vercel"],
  ["vps+vercel", "deploy:vps:vercel"],
  ["cf+vps+vercel", "deploy:all"],
]);

export const EXTRA_FLAGS = [
  { key: "skip-clean", label: "--skip-clean", scope: ["cf", "vps", "vercel"], value: false, descKey: "flag.skipClean" },
  { key: "dist", label: "--dist=<dir>", scope: ["cf", "vps"], value: true, placeholder: "dist", descKey: "flag.dist" },
  { key: "cf-project", label: "--cf-project=<name>", scope: ["cf"], value: true, placeholder: "my-pages-project", descKey: "flag.cfProject" },
  { key: "cf-branch", label: "--cf-branch=<branch>", scope: ["cf"], value: true, placeholder: "main", descKey: "flag.cfBranch" },
  { key: "cf-env", label: "--cf-env=<file>", scope: ["cf"], value: true, placeholder: ".env.cloudflare", descKey: "flag.cfEnv" },
  { key: "vps-env", label: "--vps-env=<file>", scope: ["vps"], value: true, placeholder: ".env.vps", descKey: "flag.vpsEnv" },
  { key: "vps-passphrase", label: "--vps-passphrase=<passphrase>", scope: ["vps"], value: true, placeholder: "your_key_passphrase", descKey: "flag.vpsPassphrase" },
  { key: "vercel-env", label: "--vercel-env=<file>", scope: ["vercel"], value: true, placeholder: ".env.vercel", descKey: "flag.vercelEnv" },
  { key: "vercel-preview", label: "--vercel-preview", scope: ["vercel"], value: false, descKey: "flag.vercelPreview" },
  { key: "vercel-no-prebuilt", label: "--vercel-no-prebuilt", scope: ["vercel"], value: false, descKey: "flag.vercelNoPrebuilt" },
  { key: "git-remote", label: "--git-remote=<remote>", scope: ["git"], value: true, placeholder: "origin", descKey: "flag.gitRemote" },
  { key: "git-branch", label: "--git-branch=<branch>", scope: ["git"], value: true, placeholder: "main", descKey: "flag.gitBranch" },
  { key: "git-set-upstream", label: "--git-set-upstream", scope: ["git"], value: false, descKey: "flag.gitSetUpstream" },
  { key: "git-follow-tags", label: "--git-follow-tags", scope: ["git"], value: false, descKey: "flag.gitFollowTags" },
  { key: "dry-run", label: "--dry-run", scope: ["all"], value: false, descKey: "flag.dryRun" },
];

export function comboId(targetIds) {
  return targetIds.join("+");
}

export function targetById(id) {
  return DEPLOY_TARGETS.find(target => target.id === id);
}

export function providerById(id) {
  return GIT_PROVIDERS.find(provider => provider.id === id);
}

export function modeLabel(mode) {
  const targetNames = mode.targets.map(id => targetById(id)?.name ?? id).join(" + ");
  if (mode.provider) {
    const providerName = providerById(mode.provider)?.name ?? mode.provider;
    return t("mode.git", { provider: providerName, targets: targetNames });
  }
  return t("mode.direct", { targets: targetNames });
}

export function createDeployModes() {
  const directModes = DEPLOY_COMBOS.map(targets => ({ id: `direct:${comboId(targets)}`, provider: "", targets }));
  const gitModes = GIT_PROVIDERS.flatMap(provider =>
    DEPLOY_COMBOS.map(targets => ({ id: `${provider.id}:${comboId(targets)}`, provider: provider.id, targets }))
  );
  return [...directModes, ...gitModes];
}

export function parseMode(rawMode) {
  const mode = String(rawMode ?? "").trim().toLowerCase();
  if (mode && !mode.includes(":")) return parseMode(`direct:${mode}`);
  return createDeployModes().find(item => item.id === mode) ?? null;
}

export function parseArgs(argv) {
  const result = { mode: "", yes: false, options: new Map() };
  for (const arg of argv) {
    if (arg === "--yes" || arg === "-y") result.yes = true;
    else if (arg.startsWith("--mode=")) result.mode = arg.slice("--mode=".length);
    else if (arg.startsWith("--")) {
      const eqIndex = arg.indexOf("=");
      if (eqIndex === -1) result.options.set(arg.slice(2), true);
      else result.options.set(arg.slice(2, eqIndex), arg.slice(eqIndex + 1));
    }
  }
  return result;
}

export function commandToString(command, commandArgs) {
  return [command, ...commandArgs].map(part => {
    if (/^[A-Za-z0-9_./:=@+-]+$/.test(part)) return part;
    return `"${String(part).replaceAll('"', '\\"')}"`;
  }).join(" ");
}

export function displayCommandToString(commandInfo) {
  return commandInfo.display || commandToString(commandInfo.command, commandInfo.args);
}

export function runCommand(command, commandArgs, env = process.env) {
  const result = spawnSync(command, commandArgs, { stdio: "inherit", env });
  if (result.error || result.status !== 0) process.exit(result.status ?? 1);
}

export function runCapture(command, commandArgs) {
  return spawnSync(command, commandArgs, { stdio: "pipe", encoding: "utf8", env: process.env });
}

export function currentGitBranch() {
  const result = runCapture("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  return result.status === 0 ? result.stdout.trim() : "";
}

export function readEnvFileValues(envFilePath) {
  const fullPath = path.resolve(process.cwd(), envFilePath);
  const values = new Map();
  if (!fs.existsSync(fullPath)) return values;
  for (const rawLine of fs.readFileSync(fullPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (key) values.set(key, value);
  }
  return values;
}

export function destinationArgs(targetId, options) {
  const args = [];
  if (targetId === "cf") {
    if (options.has("skip-clean")) args.push("--skip-clean");
    if (options.has("dist")) args.push(`--dist=${options.get("dist")}`);
    if (options.has("cf-project")) args.push(`--project=${options.get("cf-project")}`);
    if (options.has("cf-branch")) args.push(`--branch=${options.get("cf-branch")}`);
    if (options.has("cf-env")) args.push(`--env=${options.get("cf-env")}`);
  }
  if (targetId === "vps") {
    if (options.has("skip-clean")) args.push("--skip-clean");
    if (options.has("dist")) args.push(`--dist=${options.get("dist")}`);
    if (options.has("vps-env")) args.push(`--env=${options.get("vps-env")}`);
  }
  if (targetId === "vercel") {
    if (options.has("skip-clean")) args.push("--skip-clean");
    if (options.has("vercel-env")) args.push(`--env=${options.get("vercel-env")}`);
    if (options.has("vercel-preview")) args.push("--preview");
    if (options.has("vercel-no-prebuilt")) args.push("--no-prebuilt");
  }
  return args;
}

export function plannedCommands(mode, options) {
  const commands = [];
  if (mode.provider) {
    const provider = providerById(mode.provider);
    const remote = String(options.get("git-remote") || provider?.defaultRemote || mode.provider);
    const branch = String(options.get("git-branch") || currentGitBranch() || "main");
    const gitArgs = ["push"];
    if (options.has("git-set-upstream")) gitArgs.push("--set-upstream");
    if (options.has("git-follow-tags")) gitArgs.push("--follow-tags");
    gitArgs.push(remote, branch);
    commands.push({ label: modeLabel(mode), command: "git", args: gitArgs, display: commandToString("git", gitArgs), kind: "git", env: { ...process.env, DEPLOY_LANG: getLanguage() } });
    return commands;
  }

  for (const targetId of mode.targets) {
    const target = targetById(targetId);
    if (!target) continue;
    const extraArgs = destinationArgs(targetId, options);
    const command = packageScriptCommand(target.packageScript, extraArgs);
    const env = { ...process.env, DEPLOY_LANG: getLanguage() };
    const hasHiddenPassphrase = targetId === "vps" && options.has("vps-passphrase");
    if (hasHiddenPassphrase) env.VPS_SSH_PASSPHRASE = String(options.get("vps-passphrase"));
    const display = mode.targets.length === 1 && extraArgs.length === 0
      ? command.display.replace(target.packageScript, target.directAlias)
      : command.display;
    commands.push({
      label: t("mode.direct", { targets: target.name }),
      command: command.command,
      args: command.args,
      display: hasHiddenPassphrase ? `${display}  # VPS_SSH_PASSPHRASE=[hidden]` : display,
      env,
      kind: targetId,
    });
  }
  return commands;
}

export function directModeAlias(mode) {
  if (mode.provider) return "";
  return DIRECT_COMBO_ALIASES.get(comboId(mode.targets)) ?? "";
}

export function ciCommandForTargets(targetIds) {
  return `pnpm deploy:switch --mode=direct:${comboId(targetIds)} --yes`;
}
