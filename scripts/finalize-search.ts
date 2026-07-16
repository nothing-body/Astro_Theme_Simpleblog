import fs from 'node:fs';
import path from 'node:path';

const bundle = path.join(process.cwd(), 'dist', 'pagefind');
const unusedUiAssets = [
  'pagefind-component-ui.css',
  'pagefind-component-ui.js',
  'pagefind-highlight.js',
  'pagefind-modular-ui.css',
  'pagefind-modular-ui.js',
  'pagefind-ui.css',
  'pagefind-ui.js',
] as const;

for (const asset of unusedUiAssets) {
  const file = path.join(bundle, asset);
  if (fs.existsSync(file)) fs.rmSync(file);
}

for (const required of ['pagefind-entry.json', 'pagefind.js', 'pagefind-worker.js']) {
  if (!fs.existsSync(path.join(bundle, required))) {
    throw new Error(`Pagefind did not generate required search asset: ${required}`);
  }
}
