# Cloudflare release setup

## Repository configuration

- Worker: `foodlog`
- Production branch: `cursor/ux-flow-improvements-ee5a`
- Worker entry point: `cloudflare-worker.mjs`
- Static asset directory and binding: `dist/` as `ASSETS`
- Worker-first routes: `/config.js` and `/api/*`
- Runtime variables: preserved with Wrangler `keep_vars`; secrets are never written to `dist/` or `/api/health`
- Observability: invocation logs and traces enabled with query-string redaction
- Custom domain: intentionally omitted from `wrangler.jsonc`, so the existing dashboard-managed domain remains unchanged

The build writes stamped files only to ignored `dist/`. It does not edit tracked HTML, service-worker, or Worker source. The release is generated as `UX Preview · YYYY.MM.DD · <short SHA>` and exposed in `release.json`.

## Workers Builds settings to connect after approval

- Production branch: `cursor/ux-flow-improvements-ee5a`
- Build command: `npm ci && npm run check && npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: repository root

This produces one atomic Worker and Static Assets deployment per successful push. The previous raw-GitHub proxy and manual Worker `VERSION` constant are no longer part of the source-controlled Worker.

## Health and release checks

- `GET /api/health` returns only `{ "status": "ok", "release": { "channel", "buildId", "builtAt" } }`.
- `/config.js` remains dynamic and `no-store` because it contains the public Supabase project configuration used by the browser.
- `/api/maps/resolve` remains Worker-handled and continues to accept only bounded HTTPS Google Maps URLs.
- All other paths are served by `env.ASSETS`.
- The owner release bar is shown only when the authenticated email exactly matches `danielhanna0001@gmail.com`, case-insensitively.

## Verification and rollback

Before changing production:

1. Run `npm ci`, `npm run check`, `npm run test:e2e`, and `npm run cloudflare:check`.
2. Verify a Cloudflare preview's static assets, `/config.js`, Maps resolution, `/api/health`, release-label consistency, and observability.
3. Confirm the current custom-domain route and runtime variable bindings are unchanged.
4. Roll back by selecting the last known-good Worker deployment/version in Cloudflare, then verify `/api/health` and the owner release label agree.

No Cloudflare dashboard connection or production deployment is performed by the source changes alone.
