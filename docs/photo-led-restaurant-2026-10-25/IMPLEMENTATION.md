# Photo-led restaurant presentation — 25–26 October 2026

Dany rejected the shipped larger contain-fit list thumbnails and compact dish comparison: the empty margins remained, photos felt secondary, and the restaurant page felt crowded. Dany explicitly selected **filled thumbnail crops**, keeping original images available in the gallery. Dany authorized pushing this revision on 26 October 2026. Frontend `b2d39d8` is pushed on `design3.0` and verified live: health reports Design 3.0 / b2d39d8; HTML/service-worker stamps and app.js, styles.css and lib/detail-view.js SHA-256 hashes match source. Later docs-only builds may carry a newer stamp with the same frontend.

**Later local organization revision (2026-10-26):** Dany rejected the scattered header/footer positions visible in the supplied screenshot. The [organized-menu follow-up](../organized-restaurant-menu-2026-10-26/IMPLEMENTATION.md) supersedes those control positions while retaining this release’s photo emphasis and content/navigation contracts.

## What changed and why

- Restaurant entries separate photographs from information. At phone/tablet widths (≤980px), a landscape 16:9 image spans the row above the title and metadata. Desktop uses a substantial 44% photo region beside the text. Images meet the row edges; cover fitting removes contain-fit margins without stretching. The initial release used compact initials to avoid a large empty image region. Dany rejected that exception on 2026-10-26; the [local consistency correction](../no-photo-consistency-2026-10-26/IMPLEMENTATION.md) gives missing-photo entries the same media geometry.
- Names and ratings share a clear heading region; location/cuisine and price/dishes/playlists remain separate readable groups. Long names wrap. Information has 16px padding, 12px at ≤360px, and 8px related gaps. Rows retain square corners and a 176px minimum; loading markup shares the composition.
- Dish sections have a title, a full-width photo carousel, then a full-width score/named opinion. Prose no longer competes with a tiny image column. Photos use 4:3, or 3:2 capped at 360px in detail containers ≥600px so desktop split views remain usable. Existing small/full image candidates now reflect the larger display areas.
- Restaurant facts and playlists/people have distinct groups. The wide header allocates a bounded Maps/More region so the summary has room. Dish contribution shortcuts follow the content with different visual emphasis; likes are quieter. Dishes have a shared rhythm with 32px separation and a hairline, rather than nested boxes.

This supersedes **PHOTO-04** (whole-photo square previews), **UI-03** (fixed square media tracks) and the compact-photo portion of **UI-05**. It retains dishes-first order, sticky section navigation, first-open/return scroll behavior, action IDs/permissions, drafts, reviews, likes/Earlier likes, photo credit, Bookmarks, Maps/More, Trash and all original files. Full photos remain contain-fit in the gallery; crop previews never edit source files. The earlier [list-photo report](../restaurant-list-photos-2026-10-25/IMPLEMENTATION.md) and [menu report](../restaurant-view-audit-2026-10-25/IMPLEMENTATION.md) preserve the rejected design's reasons and shipped evidence.

## Research and skill use

Used the project's Impeccable Operate/layout guidance inside the existing brand/type/palette. An independent read-only reviewer assessed grouping, rhythm, density and extreme content; the parent separately reviewed live/source evidence and ran the mechanical layout detector. The common finding was structural crowding: identity/context, rating actions, section navigation, headings, tiny media and contribution controls all competed in the same scan.

- [NN/g: List thumbnails on mobile](https://www.nngroup.com/articles/mobile-list-thumbnail/) recommends sizing and positioning images according to their role in choosing. Photo-led content can justify a full-width image, while text still needs adequate reading space; cropping can make small previews more useful. Applied as separate media/content regions rather than a larger padded square.
- [NN/g: Visual hierarchy](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/) supports grouping with proximity and separation. Applied to facts versus social context, photo versus opinion, and content versus contribution controls.
- [Uber's menu-photo guidance](https://help.uber.com/business/article/restaurant-submitted-menu-photo-guidelines?nodeId=0ad2da19-95e9-47d0-9db4-d7ddb346c357) favors clear centered food and moderately landscape frames. This supports the framing choice, but is not proof of this journal layout's usability.
- Hick’s Law remains a guide: preserve one clear primary action and a small stable section set, with secondary editing below the relevant content. Dish count is content, not a reason to hide useful food photos or remove existing capabilities.

## Evidence and validation

The local automated preview uses fabricated records and a licensed photograph credited to Anna Pelzer; it does not represent a restaurant in FoodLog. [Fixture source/license](../../tests/fixtures/photography/SOURCE.md). External requests are blocked or fulfilled with local/mocked responses. No production test records were created.

- Syntax/unit checks: **143 passed**.
- Initial targeted browser checks: **58 passed, 2 intentional skips**.
- Full browser suite: **402 passed, 27 intentional skips, 5 failures** across 434 cases. Two failures exposed the old negative More-button margin; one exposed low-opacity rating captions now visible on phones; one expected the superseded 72px missing-photo frame. These were corrected. A Maps draft/debounce case also failed once and passed unchanged in confirmation. The five affected files plus new photo fixtures then passed: **134 passed, 10 intentional skips**. Combined, all **407 runnable distinct cases passed**; no unresolved failure remains. The suite was not rerun wholesale after those focused corrections.
- Visual inspection: one batched phone/desktop, light/dark round with real photography. It prompted one correction batch for wide-header crowding and desktop photo height. Automated checks also identified the old negative More-button margin and low-opacity rating caption; both were corrected. The final batched confirmation covered phone/desktop in both themes; the composition retained prominent photography and full-width readable content. No further polish loop was run.
- The layout detector returned `[]` before and after; its limited selector checks are supporting evidence only.
- The scope includes 320/390/515/1024/1440px, long names, missing photos, source candidates, gallery originals/attribution, pagination, review content, contribution shortcuts, scoped contrast/name/ARIA checks and existing navigation/gesture/recovery suites.

[Previous live thumbnails](before/live-list.png) · [Previous live dish view](before/live-detail.png)

[Phone list](after/browse-light-phone.png) · [Phone dishes](after/dishes-light-phone.png) · [Dark desktop list](after/browse-dark-desktop.png) · [Dark desktop dishes](after/dishes-dark-desktop.png)

## Limits and status

Frontend `b2d39d8` is verified live. No production records, schema, permissions, assets or Cloudflare settings changed. Preview crops may omit image edges; the gallery retains the complete image. Existing photos with embedded whitespace retain that whitespace inside their original pixels. Physical iOS/Safari, screen readers and a formal usability study remain unverified. The layout detector and scoped axe checks do not certify overall design quality or accessibility.
