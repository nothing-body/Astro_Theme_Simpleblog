import fs from "node:fs";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { color } from "./deploy_runtime.ts";
import { t } from "./deploy_i18n.ts";

const GITIGNORE_PATH = ".gitignore";

const REQUIRED_GITIGNORE_LINES = [
  "# local environment and secret files",
  ".env*",
  ".dev.vars",
  ".dev.vars.*",
  "",
  "# package-manager auth files that may contain tokens",
  ".npmrc",
  ".yarnrc",
  ".pnpmrc",
  ".npmrc.local",
  ".yarnrc.local",
  ".pnpmrc.local",
  "",
  "# logs",
  "debug.log",
  "npm-debug.log*",
  "yarn-debug.log*",
  "yarn-error.log*",
  "pnpm-debug.log*",
  "",
  "# deployment tool state and credentials",
  ".wrangler/",
  ".cloudflare/",
  ".vercel/",
  ".netlify/",
  ".ssh/",
  "",
  "# private keys, certificates, and machine credentials",
  "*.pem",
  "*.key",
  "*.p8",
  "*.p12",
  "*.pfx",
  "*.crt",
  "*.csr",
  "*.jks",
  "*.keystore",
  "id_rsa",
  "id_ed25519",
  "kubeconfig",
  "*.kubeconfig",
  "service-account*.json",
  "credentials*.json",
  "*-credentials.json",
  "",
  "# keep public examples commit-safe",
  "!.env.example",
  "!.env.*.example",
  "",
  "# OS and editor files",
  ".DS_Store",
  ".idea/",
  ".vscode/",
];

const REQUIRED_PATTERNS = REQUIRED_GITIGNORE_LINES.filter(line => line && !line.startsWith("#"));

function normalizedGitignoreLines(content: string): Set<string> {
  return new Set(
    content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("#"))
  );
}

function missingPatterns(content: string): string[] {
  const lines = normalizedGitignoreLines(content);
  return REQUIRED_PATTERNS.filter(pattern => !lines.has(pattern));
}

function appendSafetyBlock(existingContent: string): string {
  const prefix = existingContent.trimEnd();
  const block = REQUIRED_GITIGNORE_LINES.join("\n");
  return `${prefix}${prefix ? "\n\n" : ""}${block}\n`;
}

async function askYesNo(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question(question)).trim().toLowerCase();
    return answer === "yes" || answer === "y";
  } finally {
    rl.close();
  }
}

export async function ensureGitignoreSafety({ prompt = true }: { prompt?: boolean } = {}): Promise<void> {
  const exists = fs.existsSync(GITIGNORE_PATH);
  const content = exists ? fs.readFileSync(GITIGNORE_PATH, "utf8") : "";
  const missing = missingPatterns(content);

  if (exists && missing.length === 0) return;

  console.log(color.amber(`\n========== ${t("safety.title")} ==========`));
  if (!exists) {
    console.log(t("safety.noGitignore"));
  } else {
    console.log(t("safety.missing"));
    for (const pattern of missing) console.log(`  - ${pattern}`);
  }

  if (!prompt) {
    throw new Error(t("safety.failed"));
  }

  const ok = await askYesNo(t("safety.ask"));
  if (!ok) {
    throw new Error(t("safety.failed"));
  }

  fs.writeFileSync(GITIGNORE_PATH, appendSafetyBlock(content), "utf8");
  console.log(color.green(t("safety.updated")));
}
