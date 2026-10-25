# Larger restaurant list photos — 25 October 2026

Dany requested larger restaurant images on the main browsing page, with clean professional spacing, before publishing. Dany authorized publication from `design3.0` on 25 October 2026. Frontend source `9fff4b6` is pushed and verified live: Workers Build `2fc1f18c-5d55-43a2-b7b3-80d96151f865` succeeded, health reports `Design 3.0` / `9fff4b6`, and HTML/service-worker stamps plus app.js/styles.css/lib/detail-view.js source hashes match. Later documentation-only builds may carry newer stamps with the same frontend. No production-data or schema change is included.

## Layout decision

Use the existing list and give its image column more of the already reserved row area. Preserve names → location/cuisine → price/dishes/playlists, the separate restaurant score, square row corners and the current theme/type. Keep full images centered with `object-fit: contain`; no cropping, stretching or new compression. Thumbnail delivery and main-photo/fallback selection are unchanged.

| Viewport | Previous frame | New frame | Image/frame area multiplier |
|---|---:|---:|---:|
| ≤360px | 56px | 88px | 2.47× |
| 361–479px | 72px | 104px | 2.09× |
| 480–980px | 72px | 112px | 2.42× |
| 981–1200px | 80px | 112px | 1.96× |
| ≥1201px | 80px | 128px | 2.56× |

Padding remains 16px desktop / 12px phone, column gaps 12px / 8px narrow, and text-group gaps 8px. Existing 176px/200px row minimums remain; long content may grow. The final pass also allows long desktop names to wrap instead of hiding them with an ellipsis. Loading placeholders inherit the new media dimensions, keeping startup geometry consistent.

## Skill and evidence

Used the existing Impeccable layout playbook. An independent read-only layout reviewer assessed hierarchy, grouping, rhythm, density and extreme content from current source and existing rendered evidence; the parent separately ran the mechanical scan. The spatial thesis is a larger image anchor beside the existing readable metadata groups, without adding cards, new controls or decorative containers.

The layout detector reported `[]` before and after. Source inspection confirmed shared image/loading geometry and unchanged full-image fitting. Batched visual inspection covered phone/desktop and both themes; a long-name clipping finding on desktop was corrected before the one confirmation pass.

A disposable local browser script used fabricated restaurants with landscape/portrait framing images and a no-photo placeholder; all external requests were blocked. The 10 combinations (320/390/515/1024/1440px × light/dark) passed page/row overflow, full-name fit, square frames, containment, image/text separation and name/rating separation. [Measured geometry](validation.json). Fixture images deliberately use simple framing graphics, not production photographs.

- Relevant browser regressions: **153 passed / 17 intentional skips** (navigation, native taps, startup, list/photo selection and visual rhythm).
- After the desktop long-name correction: **102 passed / 8 intentional skips** in the affected list/startup/visual files.
- Syntax and unit checks: **143 passed** (`npm run check`).
- Local in-app browser refreshed and measured a **112px** frame at a **520px** viewport, replacing its former 72px frame.

[Phone framing preview](screenshots/list-390-light.png) · [Narrow desktop names](screenshots/list-1024-light.png) · [Dark wider phone](screenshots/list-515-dark.png) · [Current local preview](screenshots/local-preview.png)

Physical iOS/Safari and a formal usability study remain outside this local Chromium verification. Non-square images retain some theme-colored space because the earlier explicit no-crop choice remains in force.
