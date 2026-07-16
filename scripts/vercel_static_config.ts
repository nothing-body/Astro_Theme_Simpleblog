const STATIC_CONFIG_KEYS = [
  'cleanUrls',
  'headers',
  'redirects',
  'rewrites',
  'trailingSlash',
] as const;

export function createVercelStaticConfig(source: unknown): Record<string, unknown> {
  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    throw new Error('vercel.json must contain a JSON object.');
  }

  const input = source as Record<string, unknown>;
  const result: Record<string, unknown> = {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    framework: null,
  };
  for (const key of STATIC_CONFIG_KEYS) {
    if (input[key] !== undefined) result[key] = input[key];
  }
  return result;
}
