# Optional OpenPhish External-Link Check

This public template includes only an API-free external-link notice. It does **not** include a lookup API, Cloudflare KV binding, synchronization Worker, or OpenPhish data. This guide describes an optional, separately deployed reputation feature. Adding it requires your own backend, storage, frontend integration, security review, and permission to use the feed.

Before implementation, read the [OpenPhish feed page](https://openphish.com/phishing_feeds.html) and [OpenPhish Terms of Use](https://openphish.com/terms.html). The Community Feed is limited, currently updates every 12 hours, and can contain false positives or false negatives. Its terms restrict use, disclosure, and redistribution. Commercial or public-service use may require prior permission or a different license.

## Recommended architecture

```text
browser
  -> your POST /api/example-reputation-check
  -> normalize URL
  -> SHA-256 exact-match lookup
  -> your private storage

protected scheduler
  -> download the official Community Feed
  -> validate and normalize entries
  -> hash and publish a new snapshot
  -> publish metadata last
```

Keep the feed and storage private. A browser lookup should call only your API; it should never send the destination directly to OpenPhish.

Use one stable API contract on every provider:

```json
{ "url": "https://example.com/path" }
```

```json
{
  "status": "no-known-threats",
  "checkedAt": "2026-01-01T00:00:00.000Z",
  "threatTypes": []
}
```

For an exact match, return `potentially-unsafe` with `["PHISHING"]`. Invalid requests, stale data, storage failures, timeouts, and unexpected responses should return a non-2xx status and keep the Continue action disabled.

## Shared security rules

Implement the synchronization and lookup cores in TypeScript and keep provider adapters thin.

- Accept only `https:` and `http:` URLs. Reject credentials, malformed hostnames, fragments, localhost, private IP ranges, link-local addresses, and non-public destinations.
- Normalize the URL once and use the same normalization function in both synchronization and lookup code.
- Hash normalized URLs with SHA-256. Do not expose the raw feed through an API, generated asset, repository, build artifact, or log.
- Use bounded buckets, such as the first two hex characters of the hash, instead of one storage record per URL.
- Write a new A/B snapshot first and metadata last. Stamp every bucket with a snapshot identifier; a lookup must reject a valid-looking bucket whose identifier does not match metadata, then use only a verified fresh previous snapshot.
- Store `lastCheckedAt`, `updatedAt`, entry count, active/previous slots, active/previous snapshot identifiers, and schema version in metadata.
- Enforce a maximum feed size, maximum line count, request timeout, content type, minimum valid entry count, and maximum URL length before publishing.
- Allow only `POST` and `OPTIONS` on the public lookup endpoint. Limit request bodies, for example to 4096 bytes.
- Use exact HTTPS origins for CORS. Never reflect arbitrary origins and never combine credentials with `*`.
- Add frontend debounce or cooldown for accidental repeat clicks, but also configure provider-native rate limiting or WAF rules.
- Log generic error codes, not full destination URLs, feed entries, bearer tokens, or response bodies.

The official feed URL currently points to:

```text
https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt
```

Fetch it with an explicit redirect policy:

```ts
const response = await fetch(FEED_URL, {
  headers: { Accept: 'text/plain' },
  redirect: 'manual',
});

if (response.status >= 300 && response.status < 400) {
  throw new Error('Feed redirects are not allowed.');
}
if (!response.ok) {
  throw new Error(`Feed request failed with ${response.status}.`);
}
```

`redirect: "manual"` is the most compatible Cloudflare Workers choice. Do not use `redirect: "follow"` for this request, because redirects can move the download to an unreviewed host. Some Cloudflare deployments reject `redirect: "error"` even when generic Fetch typings accept it, so enforce the policy manually.

## A 36-hour synchronization interval

OpenPhish currently updates the Community Feed every 12 hours. Your service does not need to download on every source update. A portable 36-hour schedule is best implemented as:

1. Run a lightweight scheduler every hour.
2. Read `lastCheckedAt` from private metadata.
3. Download only when at least 36 hours have elapsed.
4. Allow a protected manual synchronization endpoint to bypass the interval for initialization or recovery.
5. Set lookup freshness above the interval, for example 48 hours, so normal scheduler delay does not immediately disable the service.

A standard five-field cron expression cannot represent a continuous 36-hour interval without drift. The hourly due check keeps the same TypeScript scheduling logic on every platform:

```cron
0 * * * *
```

## Storage alternatives by platform

Cloudflare KV is not the only option. The stable contract should be a small storage interface for `get`, `put`, and metadata publication, not a provider SDK embedded in the synchronization or lookup logic.

| Deployment                        | Recommended storage          | How functions connect                                                                                                 |
| --------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Cloudflare                        | Workers KV                   | Bind the same namespace to the Worker and Pages project; use `env.KV` or `context.env.KV`                             |
| Netlify                           | Netlify Blobs                | Call `getStore()` inside Functions; Netlify supplies the current Project ID and token at runtime                      |
| Vercel                            | Marketplace Redis or Upstash | Connect the database to the project in Marketplace; Vercel injects provider connection environment variables          |
| Supabase                          | Postgres                     | Edge Functions use server-side project secrets; RLS blocks direct browser access                                      |
| Single VPS                        | SQLite                       | The API and synchronizer share one database file stored outside the web root                                          |
| Replicated VPS or Docker          | Redis or Postgres            | Expose the database only on localhost or a private container network and pass credentials through uncommitted secrets |
| GitHub, GitLab, or Codeberg Pages | No private mutable storage   | The static frontend must call an HTTPS API hosted on one of the platforms above                                       |

Keep the shared TypeScript core dependent only on an `OpenPhishStore` interface and implement a thin adapter per provider. The frontend should read only `PUBLIC_REPUTATION_ENDPOINT`, so moving providers normally changes the endpoint and exact CSP origin, not the leaving-page logic.

## Migrating the backend away from Cloudflare

Treat Cloudflare bindings as an adapter, not as the application core. A migration should replace infrastructure-specific entry points while preserving URL normalization, hashing, snapshot validation, freshness checks, response schemas, and fail-closed behavior.

| Existing Cloudflare component | Portable replacement                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| Workers KV                    | Netlify Blobs, managed Redis, Postgres, or private SQLite                             |
| Cron Trigger                  | Provider scheduler, CI schedule, or a protected VPS cron job                          |
| Worker or Pages Function      | Netlify Function, Vercel Function, Supabase Edge Function, or a private HTTPS service |
| Worker secret                 | The target platform's server-side secret manager                                      |
| Cloudflare rate limit         | Provider-native rate limiting, reverse-proxy limits, or a trusted API gateway         |

Use this migration order:

1. Implement only a new `OpenPhishStore` adapter and platform entry point. Do not fork the normalization or lookup rules.
2. Create a private destination store and import a freshly generated snapshot. Never copy raw feed files through a public repository, browser storage, deployment log, or public artifact.
3. Add server-side secrets directly in the destination platform. Use placeholders such as `YOUR_SYNC_SECRET`; never place a real token, account ID, namespace ID, project ID, database URL, or service-role key in documentation or tracked files.
4. Deploy the new API on an unrelated example route such as `https://reputation-api.example.net/api/example-reputation-check`. Configure an exact frontend-origin allowlist and an exact CSP `connect-src` origin.
5. Test valid requests, malformed URLs, private-network destinations, stale metadata, unavailable storage, rate limits, and synchronization rollback before routing real users to the new service.
6. Change only `PUBLIC_REPUTATION_ENDPOINT` and the exact CSP origin in the frontend, then rebuild and deploy the static site.
7. Observe the new service without logging destination URLs or credentials. After the new snapshot and scheduler remain healthy, revoke old secrets, remove old bindings, and delete the old endpoint.

Do not run two independent synchronizers against the same active metadata record during migration. Either give the new service a separate store or use a single-writer handover, otherwise concurrent publication can mix snapshot metadata and buckets. Keep the old endpoint available only for a short rollback window, and never weaken CORS or CSP to make the transition easier.

## Cloudflare Workers and Pages

Use a synchronization Worker and either a Pages Function or another Worker for lookup. Both runtimes must bind the same KV namespace using the identifier expected by code, for example `KV`. The dashboard namespace name and the binding identifier do not have to match.

Generic Worker configuration:

```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "YOUR_SYNC_WORKER",
  "main": "src/index.ts",
  "compatibility_date": "YYYY-MM-DD",
  "triggers": {
    "crons": ["0 * * * *"]
  },
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "YOUR_KV_NAMESPACE_ID",
      "preview_id": "YOUR_PREVIEW_KV_NAMESPACE_ID"
    }
  ]
}
```

In a Worker, storage is available as `env.KV`. In a Pages Function, it is available as `context.env.KV`. Bind the same namespace separately in the Worker and Pages project; creating a namespace alone does not attach it to either runtime.

Store a manual synchronization token as a Worker secret:

```bash
pnpm exec wrangler secret put SYNC_TOKEN --config path/to/wrangler.jsonc
```

Compare the bearer token in constant time where practical. The manual endpoint should accept only `POST`, return generic failures, and never reveal whether a token prefix was correct.

Choose a private route instead of copying the example `/api/example-reputation-check`, then add a Cloudflare rate-limiting rule for your exact route. A conservative starting point is 30 requests per minute per source IP with a Managed Challenge or temporary block, then adjust from Security Analytics. On plans that support method matching, limit only `POST`; otherwise use the exact path and leave enough room for cross-origin `OPTIONS` preflights. Do not rate-limit the entire site, and do not treat route secrecy, frontend debounce, or CORS as bot protection.

## Netlify

Use three pieces:

- A scheduled function for the hourly due check.
- A separate HTTP function for your private lookup route, such as `/api/example-reputation-check`.
- Netlify Blobs or an external database for the private hash buckets and metadata.

Scheduled functions cannot be invoked by URL in production, so keep initialization and recovery in a separately authenticated HTTP function. With Netlify Blobs, use a site-wide store and strong consistency where the metadata publication order matters:

```ts
import { getStore } from '@netlify/blobs';

const store = getStore({
  name: 'openphish',
  consistency: 'strong',
});
```

Declare the hourly schedule in `netlify.toml`, and keep the due-check logic in shared TypeScript rather than duplicating it in configuration.

Connection steps:

1. Install `@netlify/blobs` and place the synchronization and lookup Functions under `netlify/functions/`.
2. Use the same store name, such as `openphish`, in both Functions.
3. When a Function runs on Netlify, `getStore()` automatically receives the current Project ID and access token; do not publish them as browser environment variables.
4. Use `consistency: "strong"` for metadata and newly published buckets. Netlify Blobs has no transaction or concurrency-lock primitive, so snapshot identifiers and metadata-last publication are still required.
5. A Scheduled Function runs from its schedule or the dashboard **Run now** action. Keep a separate `SYNC_TOKEN`-protected HTTP Function for first initialization.

## Vercel

Use:

- `/api/openphish-sync` as a protected Vercel Function called by Vercel Cron.
- Your private lookup route as the public, rate-limited lookup function.
- A Marketplace Redis provider, Upstash, or another durable database.

The former Vercel KV product is no longer the portable default. Keep storage access behind a small interface so a Redis or database provider can be changed without rewriting normalization, hashing, or response logic.

Example hourly cron:

```json
{
  "crons": [
    {
      "path": "/api/openphish-sync",
      "schedule": "0 * * * *"
    }
  ]
}
```

Protect the route with `CRON_SECRET`, and remember that Vercel Cron runs only for production deployments.

Connection steps:

1. Open the Vercel project's **Storage / Marketplace**, install Redis or Upstash, and connect it to the project.
2. Vercel adds provider connection values to project environment variables. Never commit the connection string.
3. Redeploy after adding or changing the resource. For local testing, use `vercel env pull` and keep the generated local env file ignored.
4. Implement a Redis adapter that stores each bucket and metadata as separate keys. Write a new snapshot with a pipeline or bounded batch, then publish metadata separately.
5. Where Marketplace Allowed Environments are available, restrict production data to Production and use a separate empty resource for Preview.

## Supabase Edge Functions

Deploy one Edge Function for synchronization and one for lookup. Store buckets and metadata in Postgres tables with row-level security that denies anonymous direct access.

Schedule the synchronization function with `pg_cron` and `pg_net`. Store the service-role key and synchronization secret in Supabase Vault or platform secrets, never in SQL committed to the repository. The lookup function should use a narrowly scoped database operation rather than exposing tables through the public REST API.

Connection steps:

1. Create private bucket and metadata tables in the same Supabase project, keyed by snapshot/bucket and by one fixed metadata key.
2. Enable RLS and do not create policies that expose feed data directly to `anon` or `authenticated`.
3. Deploy separate TypeScript synchronization and lookup Edge Functions. A service-role credential is server-only and must never appear in `PUBLIC_*` variables or browser code.
4. Create the hourly job from **Integrations > Cron**, or use `pg_cron` with `pg_net`; keep invocation credentials in Vault.
5. Write the new snapshot in a database transaction and update metadata last. Lookup should execute only a fixed exact-match query or restricted RPC.

## VPS and VPS Docker

For one server, SQLite is the simplest replacement. Store it outside the web root, for example `/var/lib/simpleblog/openphish.db`, own it with the dedicated API account, set permissions to `600`, and ensure Nginx and backup download paths cannot serve it. Run synchronization and lookup on the same host, update in a transaction, and do not let several containers write the same SQLite file concurrently.

For replicas, rolling container updates, or higher concurrency, use Redis or Postgres:

1. Create a private Docker network and do not publish the database port on `0.0.0.0`.
2. Connect services by an internal service name such as `redis://redis:6379` or a private Postgres hostname.
3. Keep credentials only in an uncommitted VPS env file, Docker secret, or systemd credential.
4. Use a systemd timer, cron, or scheduler container for the hourly due check and acquire a single-run lock before synchronization.
5. Expose only your reverse-proxied lookup route; keep synchronization limited to localhost, the private network, or strong authentication.

## GitHub Pages, GitLab Pages, and Codeberg Pages

These products publish static files. They cannot safely run the lookup API or hold mutable private feed data.

Use their CI scheduler only to call an authenticated synchronization endpoint hosted on Cloudflare, Netlify, Vercel, Supabase, or another backend. GitHub Actions, GitLab pipeline schedules, and Woodpecker can all trigger that endpoint, but the bearer token must remain in encrypted CI secrets.

Do not commit the raw feed, generated hash buckets, secrets, or deployment-specific IDs to the Pages repository. Besides increasing the attack surface, publishing feed-derived data may conflict with OpenPhish terms.

## Frontend integration

Because this template intentionally does not ship the private implementation, add your own language-aware leaving page and TypeScript client only after the backend is working.

When the lookup API is on another origin, add only that exact HTTPS origin to `connect-src` in `public/_headers`, `vercel.json`, and `deploy/nginx-security-headers.conf`. Do not use the broad `connect-src https:` shortcut.

### Enable API-mode self-checks

The default self-check verifies the API-free notice. It does not permanently forbid `fetch`, KV, Functions, or Workers. When implementation indicators appear, the check requires an explicit, non-secret audit manifest so it can switch to API mode:

Windows PowerShell:

```powershell
Copy-Item link-reputation.audit.example.json link-reputation.audit.json
```

macOS or Linux:

```bash
cp link-reputation.audit.example.json link-reputation.audit.json
```

Edit only the file paths and `backendLocation`; do not put endpoints, tokens, storage IDs, account IDs, project IDs, or database credentials in this manifest. Commit the manifest because CI needs it to know which files belong to the feature.

- Set `strategy` to `local-feed` for OpenPhish, URLhaus, or another feed downloaded into private storage. This requires `sync` and `storage` files; `upstream` remains empty.
- Set `strategy` to `remote-api` for Google Safe Browsing, Google Web Risk, VirusTotal, or another server-to-server reputation service. This requires `upstream` files; `sync` and `storage` may remain empty when no private cache is used.
- Set `provider` to the public service name and list every user-facing explanation under `disclosure`. The self-check confirms that the configured provider is named, but a human must still verify that the explanation accurately describes what data leaves the site.
- Use `same-repository` when the client, API, synchronizer, shared core, and storage adapter are all available in this repository. Every group must list the real TypeScript or Astro files.
- Use `external-service` when this repository contains only the browser client. Leave `api`, `core`, `sync`, `storage`, and `upstream` empty. The self-check will validate the client/disclosure and warn that the separate backend repository still needs its own security checks.

In API mode, `LINKCHECK020` through `LINKCHECK029` verify the declared files for an environment-based endpoint, POST JSON, finite timeouts, response type/status checks, exact CORS handling, body limits, SSRF defenses, non-public credentials, and provider disclosure. Local-feed mode additionally checks hashing, snapshot freshness, redirect rejection, bounded downloads, and storage adapters. Remote-api mode instead checks a fixed upstream allowlist and safe provider-response handling. These static checks catch missing controls but cannot prove a remote service is correctly configured, so also complete the runtime verification checklist below.

### Using Google Safe Browsing instead

Google Safe Browsing v5 supports direct URL searches and hash-list workflows. Keep the API key on the server and let the browser call only your own reputation endpoint. A direct URL search sends the lookup URL to Google, so the leaving-page disclosure must not claim that the destination stays local. Google's Safe Browsing API is intended for non-commercial use; revenue-generating use should evaluate Google Web Risk and the applicable terms.

Example manifest differences:

```json
{
  "version": 2,
  "mode": "api",
  "strategy": "remote-api",
  "provider": "Google Safe Browsing",
  "backendLocation": "same-repository",
  "files": {
    "client": ["src/components/LeavingNotice.astro", "src/scripts/reputation-client.ts"],
    "api": ["functions/api/example-reputation-check.ts"],
    "core": ["src/server/reputation-core.ts"],
    "sync": [],
    "storage": [],
    "upstream": ["src/server/google-safe-browsing.ts"],
    "disclosure": ["src/components/LeavingNotice.astro", "PRIVACY.md"]
  }
}
```

Use the exact fixed origin `https://safebrowsing.googleapis.com` in the server-side allowlist. Never expose its API key through `PUBLIC_*`, browser code, query strings generated in the browser, or committed `.env` files. Review the [Safe Browsing overview](https://developers.google.com/safe-browsing), [v5 URL Search reference](https://developers.google.com/safe-browsing/reference/rest/v5/urls/search), and [terms](https://developers.google.com/safe-browsing/terms) before implementation.

The page should:

- Put the destination in a URL fragment such as `#to=...` so it is not sent in ordinary server request logs.
- Preserve that fragment when switching languages.
- Cache a recent result in `sessionStorage` only long enough to translate the same result after a locale switch.
- Never convert an unavailable, malformed, or timed-out result into an allowed link.
- Keep the destination escaped as text with `textContent`; do not assign it through `innerHTML`.
- Explain that “no known match” is not proof that a site is safe.

## Verification checklist

1. Run TypeScript diagnostics, lint, unit tests, security checks, and a production build.
2. Test malformed JSON, oversized bodies, unsupported methods, invalid origins, local IPs, credentials, Unicode hostnames, and nonexistent paths.
3. Confirm stale or missing metadata fails closed.
4. Confirm a feed redirect, oversized feed, invalid entry ratio, or storage failure never publishes new metadata.
5. Confirm the raw feed and destination URLs do not appear in logs or browser assets.
6. Confirm the lookup API is protected by rate limits and exact CORS origins.
7. Confirm all three language routes preserve the destination and translate an existing result without a second lookup.
8. Review the OpenPhish terms again before making the service public or commercial.
