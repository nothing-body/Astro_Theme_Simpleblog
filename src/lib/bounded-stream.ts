export async function readBoundedBytes(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number
): Promise<Uint8Array> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new Error('The byte limit must be a positive safe integer.');
  }
  if (!body) return new Uint8Array();

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel('Body exceeds the configured byte limit.');
        throw new Error('Body exceeds the configured byte limit.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export async function readBoundedUtf8(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number
): Promise<string> {
  return new TextDecoder('utf-8', { fatal: true }).decode(
    await readBoundedBytes(body, maxBytes)
  );
}
