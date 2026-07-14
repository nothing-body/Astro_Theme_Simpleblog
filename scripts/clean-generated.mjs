#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.cwd());

for (const name of ['.astro', 'dist']) {
  const target = path.resolve(root, name);
  if (path.dirname(target) !== root) {
    throw new Error(`Refusing to clean path outside the project root: ${target}`);
  }
  fs.rmSync(target, { recursive: true, force: true });
}
