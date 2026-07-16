#!/usr/bin/env node
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  ciCommandForTargets,
  directModeAlias,
  displayCommandToString,
  modeLabel,
  parseArgs,
  parseMode,
  plannedCommands,
  providerById,
  readEnvFileValues,
  runCommand,
  targetById,
  type DeployCommand,
  type DeployMode,
  type DeployOptions,
  type TargetId,
} from "./deploy_lib.ts";
import { ensureGitignoreSafety } from "./deploy_safety.ts";
import { color, ensureNodeRuntime, ensurePackageManagerRuntime, packageScriptCommand } from "./deploy_runtime.ts";
import { stripLangArgs, t } from "./deploy_i18n.ts";

function box(title: string): void {
  console.log(color.amber(`\n${"=".repeat(76)}`));
  console.log(color.amber(` ${title}`));
  console.log(color.amber("=".repeat(76)));
}

function row(label: string, value: unknown): void {
  console.log(`${color.dim(label.padEnd(24, " "))} ${value}`);
}

function envFileForTarget(targetId: TargetId, options: DeployOptions): string {
  if (targetId === "cf") return String(options.get("cf-env") || ".env.cloudflare");
  if (targetId === "vps") return String(options.get("vps-env") || ".env.vps");
  if (targetId === 'vps-docker') return String(options.get('vps-docker-env') || '.env.vps-docker');
  if (targetId === "vercel") return String(options.get("vercel-env") || ".env.vercel");
  if (targetId === 'netlify') return String(options.get('netlify-env') || '.env.netlify');
  if (targetId === 'supabase') return String(options.get('supabase-env') || '.env.supabase');
  return "";
}

function envValuesForTarget(targetId: TargetId, options: DeployOptions): Map<string, string> {
  return readEnvFileValues(envFileForTarget(targetId, options));
}

function cloudflareProjectName(options: DeployOptions): string {
  const override = String(options.get("cf-project") || "").trim();
  if (override) return override;
  const values = envValuesForTarget("cf", options);
  return (
    values.get("CLOUDFLARE_PAGES_PROJECT_NAME") ||
    values.get("CLOUDFLARE_PROJECT_NAME") ||
    values.get("CF_PAGES_PROJECT_NAME") ||
    `(${t("common.notSet")})`
  );
}

function printDeploymentNotice(mode: DeployMode, options: DeployOptions): void {
  box(t("common.deploymentCheck"));
  row(t("common.mode"), modeLabel(mode));
  row(t("common.directory"), process.cwd());

  if (mode.provider) {
    const provider = providerById(mode.provider);
    row("Git", provider?.name ?? mode.provider);
    row(t("notice.ciFile"), provider?.ciFile ?? `(${t("common.notSet")})`);
    row(t("notice.ciCommand"), ciCommandForTargets(mode.targets));
    console.log(`\n${t("notice.gitCredentials")}`);
    return;
  }

  const alias = directModeAlias(mode);
  if (alias) row(t("common.shortcut"), packageScriptCommand(alias).display);
  console.log(
    `\n${
      mode.targets.length === 1 && mode.targets[0] === 'supabase'
        ? t('notice.directFunctions')
        : t('notice.directBuild')
    }`
  );

  for (const targetId of mode.targets) {
    const target = targetById(targetId);
    if (!target) continue;
    console.log(color.cyan(`\n[${target.name}]`));
    row(t("common.envFile"), envFileForTarget(targetId, options));
    row(t("common.requiredKeys"), target.requiredEnv.join(", "));
    if (targetId === "cf") {
      row(t("notice.cfProject"), cloudflareProjectName(options));
      console.log(`  - ${t("notice.cfCreate")}`);
    }
    if (targetId === "vps" || targetId === 'vps-docker') {
      const values = envValuesForTarget(targetId, options);
      row(t("notice.vpsUser"), values.get("VPS_USER") || process.env.VPS_USER || `(${t("common.notSet")})`);
      row(
        t("notice.vpsTarget"),
        values.get(targetId === 'vps' ? 'VPS_TARGET_DIR' : 'VPS_DOCKER_APP_DIR') ||
          `(${t("common.notSet")})`
      );
    }
    for (const key of target.noteKeys ?? []) console.log(`  - ${t(key)}`);
  }
}

async function confirmDeploy(commands: DeployCommand[]): Promise<boolean> {
  box(t("common.commandsToRun"));
  for (const command of commands) {
    console.log(color.cyan(`> ${command.label}`));
    console.log(`  ${displayCommandToString(command)}`);
  }

  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question(color.amber(`\n${t("common.yesPrompt")}`))).trim().toLowerCase();
    return answer === "yes" || answer === "y";
  } finally {
    rl.close();
  }
}

async function main() {
  ensureNodeRuntime();
  ensurePackageManagerRuntime();
  await ensureGitignoreSafety();

  const parsed = parseArgs(stripLangArgs(process.argv.slice(2)));
  const mode = parseMode(parsed.mode);

  if (!mode) {
    console.error("[deploy-switch] Missing or unsupported --mode.");
    console.error(`Example: ${packageScriptCommand("deploy:switch", ["--mode=direct:cf+vps"]).display}`);
    process.exit(1);
  }

  printDeploymentNotice(mode, parsed.options);

  const commands = plannedCommands(mode, parsed.options);
  if (commands.length === 0) {
    console.error("[deploy-switch] No commands generated.");
    process.exit(1);
  }

  if (parsed.options.has("dry-run")) {
    box(t("common.dryRun"));
    for (const command of commands) console.log(displayCommandToString(command));
    return;
  }

  if (process.env.DEPLOY_CHECKED !== "1") {
    box(t("common.deploymentCheck"));
    const checkCommand = packageScriptCommand("check");
    runCommand(checkCommand.command, checkCommand.args);
  }
  for (const command of commands) {
    command.env = { ...command.env, DEPLOY_CHECKED: "1" };
  }

  const ok = parsed.yes ? true : await confirmDeploy(commands);
  if (!ok) {
    console.log(color.amber(`\n${t("common.cancelled")}`));
    return;
  }

  for (const command of commands) {
    console.log(color.green(`\n==> ${command.label}`));
    runCommand(command.command, command.args, command.env);
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
