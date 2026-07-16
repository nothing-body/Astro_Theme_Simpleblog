#!/usr/bin/env node
/*
 * Dependency vulnerability audit.
 *
 * Reads the exact installed dependency graph from pnpm or npm, queries OSV in
 * bounded batches with timeouts and response-size limits, follows pagination,
 * deduplicates advisories, and fails when any installed package/version is
 * affected. It does not upload source code, env files, or application data.
 */
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { packageManagerCommand } from './deploy_runtime.ts';
import { readBoundedJsonResponse } from './deploy_http.ts';

type DependencyNode = {
  name?: string;
  version?: string;
  dependencies?: Record<string, DependencyNode>;
  devDependencies?: Record<string, DependencyNode>;
  optionalDependencies?: Record<string, DependencyNode>;
};
type InstalledPackage = { name: string; version: string };
type OsvVulnerability = {
  id?: string;
  modified?: string;
};
type OsvResult = {
  vulns?: OsvVulnerability[];
  next_page_token?: string;
};
type OsvBatchResponse = {
  results?: OsvResult[];
};
type OsvQuery = {
  package: { ecosystem: 'npm'; name: string };
  version: string;
  page_token?: string;
};

function collectInstalledPackages(roots: DependencyNode[]): InstalledPackage[] {
  const packages = new Map<string, InstalledPackage>();

  function visit(node: DependencyNode, fallbackName?: string): void {
    const name = node.name ?? fallbackName;
    if (name && node.version)
      packages.set(`${name}\0${node.version}`, { name, version: node.version });
    for (const group of [node.dependencies, node.devDependencies, node.optionalDependencies]) {
      for (const [dependencyName, dependency] of Object.entries(group ?? {})) {
        visit(dependency, dependencyName);
      }
    }
  }

  for (const root of roots) visit(root);
  return [...packages.values()].sort(
    (left, right) =>
      left.name.localeCompare(right.name) || left.version.localeCompare(right.version)
  );
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`);
  return (await readBoundedJsonResponse(response, 16 * 1024 * 1024, 'OSV')) as T;
}

const listCommand = packageManagerCommand(['list', '--json', '--depth', 'Infinity']);
const listed = spawnSync(listCommand.command, listCommand.args, {
  cwd: process.cwd(),
  env: process.env,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
  shell: false,
});
if (listed.error || listed.status !== 0 || !listed.stdout.trim()) {
  throw new Error(`Unable to read the installed dependency tree with ${listCommand.display}.`);
}

const installed = collectInstalledPackages(JSON.parse(listed.stdout) as DependencyNode[]);
if (installed.length === 0) throw new Error('The installed dependency tree is empty.');

async function queryOsvBatch(queries: OsvQuery[]): Promise<OsvResult[]> {
  const response = await fetchJson<OsvBatchResponse>('https://api.osv.dev/v1/querybatch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ queries }),
  });
  if (!Array.isArray(response.results) || response.results.length !== queries.length) {
    throw new Error('OSV querybatch returned an invalid result count.');
  }
  return response.results;
}

const findings: Array<InstalledPackage & { id: string }> = [];
const batchSize = 500;
for (let offset = 0; offset < installed.length; offset += batchSize) {
  const packages = installed.slice(offset, offset + batchSize);
  let pending = packages.map<OsvQuery>(item => ({
    package: { ecosystem: 'npm', name: item.name },
    version: item.version,
  }));
  let pendingIndexes = packages.map((_, index) => index);

  while (pending.length > 0) {
    const results = await queryOsvBatch(pending);
    const nextQueries: OsvQuery[] = [];
    const nextIndexes: number[] = [];

    results.forEach((result, resultIndex) => {
      const packageIndex = pendingIndexes[resultIndex];
      if (packageIndex === undefined) {
        throw new Error('OSV querybatch result could not be matched to a package.');
      }
      const item = packages[packageIndex];
      if (!item) throw new Error('OSV querybatch result could not be matched to a package.');
      for (const vulnerability of result.vulns ?? []) {
        if (vulnerability.id) findings.push({ ...item, id: vulnerability.id });
      }
      if (result.next_page_token) {
        nextQueries.push({ ...pending[resultIndex]!, page_token: result.next_page_token });
        nextIndexes.push(packageIndex);
      }
    });

    pending = nextQueries;
    pendingIndexes = nextIndexes;
  }
}

const uniqueFindings = [
  ...new Map(
    findings.map(finding => [`${finding.id}\0${finding.name}\0${finding.version}`, finding])
  ).values(),
];

if (uniqueFindings.length > 0) {
  for (const finding of uniqueFindings.sort(
    (left, right) =>
      left.id.localeCompare(right.id) ||
      left.name.localeCompare(right.name) ||
      left.version.localeCompare(right.version)
  )) {
    console.error(`[VULNERABLE] ${finding.id}: ${finding.name}@${finding.version}`);
    console.error(`  https://osv.dev/${encodeURIComponent(finding.id)}`);
  }
  throw new Error(`${uniqueFindings.length} OSV record(s) affect installed dependencies.`);
}

console.log(`OSV audit passed for ${installed.length} installed npm package version(s).`);
