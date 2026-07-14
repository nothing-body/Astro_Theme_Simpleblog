#!/usr/bin/env node
import { runPackageManager } from './checks/core.ts';

runPackageManager(['audit', '--audit-level', 'low'], 'Dependency vulnerability audit');
