import { readBoundedUtf8 } from '../src/lib/bounded-stream.ts';

function isJsonContentType(value: string): boolean {
  const mediaType = value.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  return mediaType === 'application/json' || mediaType.endsWith('+json');
}

export async function readBoundedJsonResponse(
  response: Response,
  maxBytes: number,
  service: string
): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!isJsonContentType(contentType)) {
    throw new Error(`${service} returned an unexpected content type.`);
  }

  const declaredLength = response.headers.get('content-length');
  if (declaredLength) {
    const bytes = Number(declaredLength);
    if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > maxBytes) {
      throw new Error(`${service} returned an invalid or excessive content length.`);
    }
  }

  const body = await readBoundedUtf8(response.body, maxBytes);
  if (!body.trim()) return {};
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new Error(`${service} returned invalid JSON.`);
  }
}
