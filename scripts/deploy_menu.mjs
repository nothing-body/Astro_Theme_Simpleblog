#!/usr/bin/env node
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  EXTRA_FLAGS,
  ciCommandForTargets,
  createDeployModes,
  directModeAlias,
  displayCommandToString,
  modeLabel,
  parseMode,
  plannedCommands,
  providerById,
  readEnvFileValues,
  runCommand,
  targetById,
} from "./deploy_lib.mjs";
import { ensureGitignoreSafety } from "./deploy_safety.mjs";
import { color, ensureNodeRuntime, packageScriptCommand, warnAboutPackageManager, warnIfPnpmMissing } from "./deploy_runtime.mjs";
import { LANGUAGES, setLanguage, t } from "./deploy_i18n.mjs";

const modes = createDeployModes();
const selectedOptions = new Map();

function frame(title) {
  const width = 76;
  const text = ` ${title} `;
  console.log(color.amber(`\n${"=".repeat(width)}`));
  console.log(color.amber(text.padEnd(width, " ")));
  console.log(color.amber("=".repeat(width)));
}

function hr() {
  console.log(color.dim("-".repeat(76)));
}

function item(index, label) {
  console.log(`${color.amber(String(index).padStart(2, " "))}. ${label}`);
}

function row(label, value) {
  console.log(`${color.dim(label.padEnd(24, " "))} ${value}`);
}

async function ask(rl, questionKeyOrText) {
  const question = questionKeyOrText.includes(".") ? t(questionKeyOrText) : questionKeyOrText;
  return (await rl.question(color.amber(question))).trim();
}

async function chooseLanguage(rl) {
  frame(t("lang.title"));
  LANGUAGES.forEach((lang, index) => item(index + 1, lang.label));
  while (true) {
    const answer = await ask(rl, `${t("lang.prompt")} `);
    const lang = LANGUAGES[Number(answer) - 1];
    if (lang) {
      setLanguage(lang.id);
      return;
    }
    console.log(color.red(t("common.invalid")));
  }
}

function envFileForTarget(targetId) {
  if (targetId === "cf") return String(selectedOptions.get("cf-env") || ".env.cloudflare");
  if (targetId === "vps") return String(selectedOptions.get("vps-env") || ".env.vps");
  if (targetId === "vercel") return String(selectedOptions.get("vercel-env") || ".env.vercel");
  return "";
}

function envValuesForTarget(targetId) {
  return readEnvFileValues(envFileForTarget(targetId));
}

function cloudflareProjectName() {
  const override = String(selectedOptions.get("cf-project") || "").trim();
  if (override) return override;
  const values = envValuesForTarget("cf");
  return (
    values.get("CLOUDFLARE_PAGES_PROJECT_NAME") ||
    values.get("CLOUDFLARE_PROJECT_NAME") ||
    values.get("CF_PAGES_PROJECT_NAME") ||
    `(${t("common.notSet")})`
  );
}

function vpsValue(key, fallback = `(${t("common.notSet")})`) {
  return envValuesForTarget("vps").get(key) || process.env[key] || fallback;
}

function flagApplies(flag, mode) {
  if (flag.scope.includes("all")) return true;
  if (mode.provider && flag.scope.includes("git")) return true;
  return mode.targets.some(target => flag.scope.includes(target));
}

function addableFlags(mode) {
  return EXTRA_FLAGS.filter(flag => flagApplies(flag, mode));
}

function renderCurrentOptions() {
  frame(t("common.addedOptions"));
  if (selectedOptions.size === 0) {
    console.log(color.dim(t("common.noAddedOptions")));
    return;
  }
  for (const [key, value] of selectedOptions) {
    console.log(value === true ? `  --${key}` : `  --${key}=${key === "vps-passphrase" ? "[hidden]" : value}`);
  }
}

function renderCommands(title, mode, options = selectedOptions) {
  frame(title);
  for (const command of plannedCommands(mode, options)) {
    console.log(color.cyan(`> ${command.label}`));
    console.log(`  ${displayCommandToString(command)}`);
  }
}

function renderBaseAndCurrentCommands(mode) {
  const alias = directModeAlias(mode);
  frame(t("common.baseCommand"));
  if (alias) row(t("common.shortcut"), packageScriptCommand(alias).display);
  for (const command of plannedCommands(mode, new Map())) {
    console.log(color.cyan(`> ${command.label}`));
    console.log(`  ${displayCommandToString(command)}`);
  }
  renderCurrentOptions();
  renderCommands(t("common.currentCommand"), mode);
}

function showTargetNotes(mode) {
  frame(`${t("menu.notes")} - ${modeLabel(mode)}`);
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
  row(t("notice.localDist"), "dist (or --dist=<dir>)");
  console.log(`\n${t("notice.directBuild")}`);

  for (const targetId of mode.targets) {
    const target = targetById(targetId);
    if (!target) continue;
    hr();
    console.log(color.cyan(`[${target.name}]`));
    row(t("common.envFile"), envFileForTarget(targetId));
    row(t("common.requiredKeys"), target.requiredEnv.join(", "));
    if (targetId === "cf") {
      row(t("notice.cfProject"), cloudflareProjectName());
      console.log(`- ${t("notice.cfCreate")}`);
    }
    if (targetId === "vps") {
      row(t("notice.vpsUser"), vpsValue("VPS_USER"));
      row(t("notice.vpsTarget"), vpsValue("VPS_TARGET_DIR"));
    }
    for (const key of target.noteKeys ?? []) console.log(`- ${t(key)}`);
  }
}

async function chooseMode(rl) {
  while (true) {
    frame(t("menu.main"));
    item(1, t("menu.guide"));
    modes.forEach((mode, index) => item(index + 2, modeLabel(mode)));
    item(0, t("common.exit"));

    const answer = await ask(rl, "common.select");
    if (answer === "0") return null;
    if (answer === "1") {
      showDeploymentGuideNotice();
      continue;
    }

    const index = Number(answer) - 2;
    if (Number.isInteger(index) && modes[index]) return modes[index];
    console.log(color.red(t("common.invalid")));
  }
}

async function chooseAndAddFlag(rl, mode) {
  const flags = addableFlags(mode);
  frame(t("menu.addOption"));
  flags.forEach((flag, index) => {
    item(index + 1, flag.label);
    console.log(`    ${color.dim(t(flag.descKey))}`);
  });
  item(0, t("common.back"));

  const answer = await ask(rl, "common.select");
  if (answer === "0") return;

  const flag = flags[Number(answer) - 1];
  if (!flag) {
    console.log(color.red(t("common.invalid")));
    return;
  }

  if (flag.value) {
    const value = await ask(rl, t("menu.optionValue", { flag: flag.label, example: flag.placeholder ?? "value" }));
    if (!value) {
      console.log(color.amber(t("menu.noValue")));
      return;
    }
    selectedOptions.set(flag.key, value);
  } else {
    selectedOptions.set(flag.key, true);
  }

  console.log(color.green(`${t("menu.added")}: ${flag.label}`));
}

function showFlagDescriptions(mode) {
  frame(t("common.optionDescriptions"));
  console.log(t("common.onlyExplains"));
  hr();
  for (const flag of addableFlags(mode)) {
    console.log(color.cyan(`> ${flag.label}`));
    console.log(`  ${t(flag.descKey)}`);
  }
}

async function addFlagMenu(rl, mode) {
  while (true) {
    frame(`${t("menu.addOptions")} - ${modeLabel(mode)}`);
    renderBaseAndCurrentCommands(mode);
    hr();
    item(1, t("menu.addOption"));
    item(2, t("common.optionDescriptions"));
    item(3, t("menu.clearOptions"));
    item(4, t("menu.finishDeploy"));
    item(5, t("menu.backClear"));

    const answer = await ask(rl, "common.select");
    if (answer === "1") await chooseAndAddFlag(rl, mode);
    else if (answer === "2") showFlagDescriptions(mode);
    else if (answer === "3") {
      selectedOptions.clear();
      console.log(color.green(t("menu.cleared")));
    } else if (answer === "4") {
      await confirmAndRun(rl, mode);
      return "deployed";
    } else if (answer === "5") {
      selectedOptions.clear();
      console.log(color.amber(t("menu.backCleared")));
      return "back";
    } else {
      console.log(color.red(t("common.invalid")));
    }
  }
}

async function showManualCommands(rl, mode) {
  while (true) {
    frame(t("menu.manual"));
    item(1, t("menu.manualBase"));
    item(2, t("menu.manualDetails"));
    item(0, t("common.back"));
    const answer = await ask(rl, "common.select");
    if (answer === "0") return;
    if (answer === "1") {
      renderCommands(t("menu.manualBase"), mode, new Map());
      if (mode.provider) row(t("notice.ciCommand"), ciCommandForTargets(mode.targets));
    } else if (answer === "2") {
      showFlagDescriptions(mode);
    } else {
      console.log(color.red(t("common.invalid")));
    }
  }
}

function showDeploymentGuideNotice() {
  frame(t("menu.guide"));
  console.log(t("menu.guideBody"));
}

function showBeforeDeployNotice(mode) {
  showTargetNotes(mode);
  renderCommands(t("common.commandsToRun"), mode);
}

async function confirmAndRun(rl, mode) {
  ensureNodeRuntime();
  warnAboutPackageManager();
  await ensureGitignoreSafety();
  showBeforeDeployNotice(mode);

  if (selectedOptions.has("dry-run")) {
    console.log(color.amber(`\n${t("common.dryRun")}: no deployment will be executed.`));
    return;
  }

  const answer = (await ask(rl, `\n${t("common.yesPrompt")}`)).toLowerCase();
  if (answer !== "yes" && answer !== "y") {
    console.log(color.amber(t("common.cancelled")));
    selectedOptions.clear();
    return;
  }

  for (const command of plannedCommands(mode, selectedOptions)) {
    console.log(color.green(`\n==> ${command.label}`));
    runCommand(command.command, command.args, command.env);
  }
  warnIfPnpmMissing();
}

async function modeMenu(rl, mode) {
  while (true) {
    frame(`${t("menu.mode")} - ${modeLabel(mode)}`);
    showTargetNotes(mode);
    renderCurrentOptions();
    hr();
    item(1, t("menu.deployDirect"));
    item(2, t("menu.addOptions"));
    item(3, t("menu.manual"));
    item(4, t("menu.notes"));
    item(5, t("menu.exitScript"));
    item(0, t("common.back"));

    const answer = await ask(rl, "common.select");
    if (answer === "0") {
      selectedOptions.clear();
      return "back";
    }
    if (answer === "5") return "exit";
    if (answer === "1") {
      await confirmAndRun(rl, mode);
      return "back";
    }
    if (answer === "2") {
      const result = await addFlagMenu(rl, mode);
      if (result === "deployed") return "back";
    } else if (answer === "3") {
      await showManualCommands(rl, mode);
    } else if (answer === "4") {
      showTargetNotes(mode);
    } else {
      console.log(color.red(t("common.invalid")));
    }
  }
}

async function main() {
  ensureNodeRuntime();
  const modeArg = process.argv.find(arg => arg.startsWith("--mode="));
  const preselectedMode = modeArg ? parseMode(modeArg.slice("--mode=".length)) : null;
  const hasLangArg = process.argv.some(arg => arg.startsWith("--lang=")) || process.env.DEPLOY_LANG;
  const rl = createInterface({ input, output });

  try {
    if (!hasLangArg) await chooseLanguage(rl);
    while (true) {
      const mode = preselectedMode ?? await chooseMode(rl);
      if (!mode) return;
      selectedOptions.clear();

      const result = await modeMenu(rl, mode);
      if (result === "exit" || preselectedMode) return;
    }
  } finally {
    rl.close();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
