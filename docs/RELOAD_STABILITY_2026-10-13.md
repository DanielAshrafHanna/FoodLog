# Chrome reload stability — 13 October 2026

## Scope and diagnosis

Dany reported main elements disappearing and returning when reloading in Chrome. A full reload creates a new document; the earlier in-app Refresh log already retains cached rows. This change keeps that behavior and improves the initial document and its handoff to JavaScript.

Baseline: three real Pixel Chrome reloads of live `e2f1753`, without clearing storage or writing records. Each had one document navigation and zero controller changes. The header/search/account geometry stayed fixed. Cached places appeared at 928/829/895ms, after an initial empty list and a 6px playlist strip. Add appeared at 1686/1004/1056ms; Bookmarks at 2882/2078/2166ms. First contentful paint was 760/560/604ms. CLS was 0.00160/0/0, so the visible staging mattered even though these samples already had low measured layout shift.

The dependency waterfall explains part of the delay: app.js finished around 538ms in one sample; its 13 required modules were only requested at 564–566ms and needed another 206–262ms. Bookmarks also lacked access state in its render fingerprint, so it could remain hidden until a later data response. The existing worker handler unconditionally reloaded on controller changes; that did not occur in these three ordinary reloads, but could cause an unnecessary second reload when a matching new release installed/claimed the page.

## Changes

- Build-generated modulepreloads expose the eager dependency graph in the document head; dynamic imports remain lazy. No framework migration.
- The initial HTML reserves real playlist/count geometry and four non-interactive square-media row placeholders. Loading rows stay still. The same template is reused by cold startup; cached records replace it at the first app render and stay visible during remote refresh.
- Add and Bookmarks have disabled pending slots, then enable as soon as real approval resolves. Confirmed guests/waiting accounts retain restricted controls and their genuine access panels. Cached approval never authorizes editing. Unknown counts use a dash instead of a false zero.
- The initial All places chip is keyed and reused, avoiding a duplicate disabled placeholder. Filters repaint when access/loading changes.
- A message-port worker/document build comparison skips reload for a matching release. An older document still reloads once; legacy/unknown replies keep previous update behavior. Stale controller replies are discarded. OAuth bypass and network-first navigation remain intact.
- Faster startup exposed a like-error timing defect: a request failing during drawer opening could return to the same submitting-count fingerprint and hide its retry message. Selected-dish errors now participate in the detail fingerprint.

## Research and skills

Applied installed Find Skills, Frontend UI Engineering, Animation Performance and project Impeccable optimization guidance. Reviewed the official Cloudflare web-perf skill online, including its source and tool requirements. It was not installed: its expected Chrome DevTools MCP is unavailable here; equivalent resource timing, layout sampling and worker diagnostics used the existing Playwright/CDP/ADB tools. No new MCP configuration or dependency was needed.

Primary references:

- [Chrome/web.dev: preload modules](https://web.dev/articles/modulepreload): expose mandatory dependencies before fetching/parsing the entry point.
- [Chrome/web.dev: optimize CLS](https://web.dev/articles/optimize-cls): measure actual shifts and reserve space for arriving content.
- [NN/g: skeleton screens](https://www.nngroup.com/articles/skeleton-screens/): placeholders should resemble the completed layout.
- [Chrome: handling worker updates](https://developer.chrome.com/docs/workbox/handling-service-worker-updates): control the update/reload handoff deliberately.
- [Official Cloudflare web-perf skill](https://github.com/cloudflare/skills/blob/main/skills/web-perf/SKILL.md), discovered through [Skills](https://www.skills.sh/cloudflare/skills/web-perf).

## Validation and release

Local validation: 142 unit checks and 389 browser checks passed, with 25 platform-specific skips. This includes real matching-worker installation without reload and delayed session/approval/data scenarios. The earlier full run found the drawer retry-message defect (and a focused reproduction failed 2/3 mobile attempts); the final full run passes after the fingerprint fix. Fixture loading/ready layouts were visually checked on phone/desktop in two bounded passes; the duplicate initial playlist chip was corrected between them. Design detector: zero primary findings; existing advisory findings remain, with no new suppressions. Live comparison is pending publication. Production records and permissions are unchanged. Phone samples describe one device, browser, account and network; physical iOS and slow-network production coverage remain unverified.
