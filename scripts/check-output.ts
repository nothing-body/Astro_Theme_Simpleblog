import { Audit } from './checks/core.ts';
import { checkOutput } from './checks/output.ts';

const audit = new Audit();
try {
  checkOutput(audit);
} catch (error) {
  audit.error('CHECK001', error instanceof Error ? error.message : String(error));
}
audit.print();
if (audit.failed) process.exitCode = 1;
