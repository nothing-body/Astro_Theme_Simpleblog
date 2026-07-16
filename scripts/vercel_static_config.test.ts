import { createVercelStaticConfig } from './vercel_static_config';

test('keeps static routing and headers but removes source-build settings', () => {
  expect(
    createVercelStaticConfig({
      framework: 'astro',
      outputDirectory: 'dist',
      buildCommand: 'pnpm build',
      headers: [{ source: '/(.*)', headers: [] }],
      trailingSlash: true,
    })
  ).toEqual({
    $schema: 'https://openapi.vercel.sh/vercel.json',
    framework: null,
    headers: [{ source: '/(.*)', headers: [] }],
    trailingSlash: true,
  });
});

test('rejects non-object Vercel configuration', () => {
  expect(() => createVercelStaticConfig([])).toThrow(/JSON object/);
});
