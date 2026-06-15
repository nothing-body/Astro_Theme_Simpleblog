#!/usr/bin/env node

// Legacy compatibility entrypoint.
// The maintained project audit now lives in analysis.mjs. Keep this file so
// older documentation or local aliases that call scripts/self-check.mjs still
// run the current checker instead of the removed mojibake implementation.
await import('./analysis.mjs');
