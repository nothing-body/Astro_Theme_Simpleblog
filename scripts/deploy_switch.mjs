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
} from "./deploy_lib.mjs";
import { ensureGitignoreSafety } from "./deploy_safety.mjs";
import { color, ensureNodeRuntime, packageScriptCommand, warnAboutPackageManager, warnIfPnpmMissing } from "./deploy_runtime.mjs";
import { stripLangArgs, t } from "./deploy_i18n.mjs";

function box(title) {
  console.log(color.amber(`\n${"=".repeat(76)}`));
  console.log(color.amber(` ${title}`));
  console.log(color.amber("=".repeat(76)));
}

function row(label, value) {
  console.log(`${color.dim(label.padEnd(24, " "))} ${value}`);
}

function envFileForTarget(targetId, options) {
  if (targetId === "cf") return String(options.get("cf-env") || ".env.cloudflare");
  if (targetId === "vps") return String(options.get("vps-env") || ".env.vps");
  if (targetId === "vercel") return String(options.get("vercel-env") || ".env.vercel");
  return "";
}

function envValuesForTarget(targetId, options) {
  return readEnvFileValues(envFileForTarget(targetId, options));
}

function cloudflareProjectName(options) {
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

function printDeploymentNotice(mode, options) {
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
  console.log(`\n${t("notice.directBuild")}`);

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
    if (targetId === "vps") {
      const values = envValuesForTarget("vps", options);
      row(t("notice.vpsUser"), values.get("VPS_USER") || process.env.VPS_USER || `(${t("common.notSet")})`);
      row(t("notice.vpsTarget"), values.get("VPS_TARGET_DIR") || process.env.VPS_TARGET_DIR || `(${t("common.notSet")})`);
    }
    for (const key of target.noteKeys ?? []) console.log(`  - ${t(key)}`);
  }
}

async function confirmDeploy(commands) {
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
  warnAboutPackageManager();
  await ensureGitignoreSafety();

  const parsed = parseArgs(stripLangArgs(process.argv.slice(2)));
  const mode = parseMode(parsed.mode);

  if (!mode) {
    console.error("[deploy-switch] Missing or unsupported --mode.");
    console.error("Example: pnpm deploy:switch --mode=direct:cf+vps");
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
    warnIfPnpmMissing();
    return;
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
  warnIfPnpmMissing();
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
