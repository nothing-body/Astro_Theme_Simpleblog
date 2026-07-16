import { readBoundedJsonResponse } from './deploy_http';

test('reads a bounded JSON API response', async () => {
  await expect(
    readBoundedJsonResponse(
      new Response(JSON.stringify({ ok: true }), {
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }),
      1024,
      'Example'
    )
  ).resolves.toEqual({ ok: true });
});

test('rejects oversized and non-JSON responses before parsing', async () => {
  await expect(
    readBoundedJsonResponse(
      new Response('x'.repeat(20), {
        headers: { 'content-type': 'application/json' },
      }),
      10,
      'Example'
    )
  ).rejects.toThrow(/byte limit|content length/i);

  await expect(
    readBoundedJsonResponse(
      new Response('<html></html>', {
        headers: { 'content-type': 'text/html' },
      }),
      1024,
      'Example'
    )
  ).rejects.toThrow(/content type/i);
});
