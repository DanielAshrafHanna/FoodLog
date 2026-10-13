# Restaurant tap fix — 13 October 2026

Dany reported pressed feedback without navigation and no clear pattern. A definite stale-click mechanism was reproduced locally and on the physical Pixel 8. A long press opens Place actions and sets a global flag intended to consume that gesture's following click. Opening the dialog can cancel the pointer, so that click never arrives. The flag then consumes an unrelated fresh tap, even on a different restaurant.

The fix scopes suppression to the held row and resets it on a new row gesture or explicit keyboard activation. The original hold-generated click is still ignored. Pending holds cancel on scrolling, blur/hidden page and row removal, and callbacks check the current gesture. The 520ms hold, action menu, normal scrolling, gesture animation, and Enter/Space navigation remain.

Validation: 136 unit tests and 370 full browser passes / 18 platform skips; 42 focused hold/navigation checks and two extra native-touch emulation cases (two desktop skips). The first browser regression failed on the original code in both projects, demonstrating the old behavior. New cases cover subsequent taps on the same/different row, keyboard activation, trailing hold click, scrolling, removal, ordinary short touches, and a mocked background refresh during a press. The targeted detector has zero primary findings and four existing placeholder-radius advisories.

Physical baseline: Pixel 8, Chrome 155.0.8059.39, native Android 700ms stationary hold and taps. Live ac0cca6 failed all three first taps after hold/menu dismissal; the second tap opened each time. Six ordinary native taps passed. No record actions or production test writes.

Implementation 8668842 was pushed to design2.0, passed Cloudflare's build and was verified in live health. Physical repeat is recorded separately after the app's initial service-worker update reload; an incoming call interrupted one repeat during its ordinary-navigation portion. No call controls were deliberately operated; this interrupted run is not treated as a completed test.

Final physical repeat on verified live 8668842 passed all three first taps after hold/menu dismissal (same and different rows), plus six ordinary first taps and their Back navigations. The native-input helper waits 450ms before locating Back because its position moves during the opening slide; an earlier attempt measured the moving target too soon and missed it. Chrome screen bounds matched the coordinate mapping. No immediate-during-slide Back claim is made from the final run.

| Native Pixel check | Before ac0cca6 | After 8668842 |
| --- | --- | --- |
| First tap after hold/menu dismissal | 0/3 opened | 3/3 opened |
| Second tap when first failed | 3/3 opened | Not needed |
| Ordinary first taps | 6/6 opened | 6/6 opened |

This fixes the reproduced stale-gesture cause; these samples do not establish that every possible missed-tap cause is eliminated. Raw device screenshots/logs remain local. The helper restored the original app URL; the temporary ADB forwarding connection was removed after testing. No phone settings or production records were changed.

Design triage: retained the existing documented Helvetica choice under the previously recorded narrow file/value exceptions. No new suppression was added for this tap fix. Existing placeholder-radius advisories remain unchanged, and the design-system sidecar was already refreshed during the earlier audit.
