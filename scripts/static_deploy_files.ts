import fs from 'node:fs';
import path from 'node:path';

export type StaticDeployFile = {
  absolutePath: string;
  deploymentPath: string;
  size: number;
};

export function assertSafeOutputPath(cwd: string, outputPath: string): void {
  const relative = path.relative(cwd, outputPath);
  if (
    !relative ||
    relative.startsWith('..') ||
    path.isAbsolute(relative) ||
    !['dist', 'build', 'output'].some(prefix => relative === prefix || ['.', '_', '-'].some(separator => relative.startsWith(`${prefix}${separator}`))) ||
    ![...relative].every(character => /[A-Za-z0-9._-]/.test(character))
  ) {
    throw new Error(`Unsafe output directory: ${outputPath}`);
  }
}

export function collectStaticDeployFiles(
  root: string,
  limits: { maxFiles: number; maxTotalBytes: number }
): StaticDeployFile[] {
  const rootStat = fs.lstatSync(root);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error('Build output must be a regular directory, not a symbolic link.');
  }
  const files: StaticDeployFile[] = [];
  let totalBytes = 0;
  let entries = 0;

  function visit(directory: string, depth = 0): void {
    if (depth > 64) throw new Error('Build output exceeds the directory depth limit.');
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (++entries > 200_000) throw new Error('Build output exceeds the directory entry limit.');
      const absolutePath = path.join(directory, entry.name);
      const name = entry.name.toLowerCase();
      if (['.env', '.git', '.ssh', '.npmrc', '.netrc', 'id_rsa', 'id_ed25519'].includes(name) || name.startsWith('.env.') || name.startsWith('credentials') || name.startsWith('service-account') || ['.pem', '.key', '.p8', '.p12', '.pfx', '.ppk', '.keystore'].includes(path.extname(name))) {
        throw new Error(`Build output contains a sensitive file: ${entry.name}`);
      }
      const stat = fs.lstatSync(absolutePath);
      if (stat.isSymbolicLink()) {
        throw new Error(`Build output contains a symbolic link: ${absolutePath}`);
      }
      if (stat.isDirectory()) {
        visit(absolutePath, depth + 1);
        continue;
      }
      if (!stat.isFile()) {
        throw new Error(`Build output contains an unsupported file type: ${absolutePath}`);
      }

      const deploymentPath = path.relative(root, absolutePath).replaceAll('\\', '/');
      if (
        !deploymentPath ||
        deploymentPath.startsWith('../') ||
        deploymentPath.includes('\0')
      ) {
        throw new Error(`Build output contains an unsafe path: ${absolutePath}`);
      }

      totalBytes += stat.size;
      files.push({ absolutePath, deploymentPath, size: stat.size });
      if (files.length > limits.maxFiles) {
        throw new Error(`Build output exceeds the ${limits.maxFiles} file safety limit.`);
      }
      if (totalBytes > limits.maxTotalBytes) {
        throw new Error(
          `Build output exceeds the ${limits.maxTotalBytes / 1024 / 1024} MiB safety limit.`
        );
      }
    }
  }

  visit(root);
  if (files.length === 0) throw new Error('Build output is empty.');
  return files.sort((left, right) =>
    left.deploymentPath.localeCompare(right.deploymentPath)
  );
}
