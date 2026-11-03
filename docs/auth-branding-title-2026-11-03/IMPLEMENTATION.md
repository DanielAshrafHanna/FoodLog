# Google branding and restaurant navigation name — 3 November 2026

Dany requested a friendly Google sign-in name and a slightly larger, bolder restaurant name at the top right of the detail menu.

## Google branding: saved, public display unverified

The existing FoodLog Google Cloud project (foodlog-496621) was identified by its existing application domain and Supabase authorized domain. Only its OAuth **App name** changed from FoodLog to **Dany’s Palate** (ASCII apostrophe in the saved field). Google displayed “Branding changes saved!” and the saved field contained the new name.

The Verification Center reported that verification is not required while the application has **Testing** status. The account chooser was not tested with a real sign-in. This is not evidence that the Supabase domain has disappeared for users. Google’s public brand-verification requirements remain outstanding; the existing homepage, privacy-policy and terms fields were blank and were left unchanged. A later attempt to return to Branding timed out after the successful save.

No audience/publishing status, OAuth client credentials, redirect URLs, scopes, authorized domains, Supabase provider settings, approval rules or permissions changed. No paid custom auth domain was enabled. Completing public branding requires checking Google’s requirements, supplying accurate public branding/policy information and authorization before changing the OAuth publication/audience status. A Git push cannot complete that Google-side work.

Official references: [Supabase Google authentication and branding](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [Google branding requirements](https://support.google.com/cloud/answer/15549049?hl=en), [Google authentication policy](https://developers.google.com/identity/verification/authentication-policy-compliance).

## Restaurant navigation name: local implementation

`styles.css` now uses 16px Atkinson, weight 800 and right alignment at phone/tablet widths. This replaces 14px/700 on narrow phones. The existing 48% maximum width, single-line ellipsis, Back target, sticky header geometry and desktop visibility remain intact (UI-02, NAV-02/03).

Validation used disposable local fixtures with external requests blocked: short and long names at 320, 390 and 980px, in both themes — 12 scenarios passed. Computed typography, no overlap with Back, no page overflow and retained truncation were checked. Native header captures: [light short](header-light-short.png), [light long](header-light-long.png), [dark short](header-dark-short.png), [dark long](header-dark-long.png).

Build passed. Relevant existing restaurant-menu/auth-access browser tests: 18 passed, 2 platform skips. No production test records were written. Physical devices and a real Google authentication callback were not tested. Source pushed as `72ef618` to `design3.0` at Dany’s request; live deployment pending verification; the Google app-name setting itself was saved remotely.
