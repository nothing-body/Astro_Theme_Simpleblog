#!/usr/bin/env node
import process from 'node:process';
import { run } from './checks/core.ts';
import { packageScriptCommand } from './deploy_runtime.ts';

const scripts = process.argv.slice(2);
if (scripts.length === 0 || scripts.some(script => !/^[a-z0-9:-]+$/i.test(script))) {
  throw new Error('Provide one or more valid package script names.');
}

for (const script of scripts) {
  const command = packageScriptCommand(script);
  run(command.command, command.args, `Package script '${script}'`);
}
