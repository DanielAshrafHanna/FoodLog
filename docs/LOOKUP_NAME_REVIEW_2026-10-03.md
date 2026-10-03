# Lookup spelling and alias review — 2026-10-03

Original read-only production preview, followed by Dany’s explicit New Cairo/tagamo3 equivalence confirmation. The 41 restaurant rows (including recoverable rows) and their location/cuisine/update timestamps were hashed before rollout preparation; the initial additive registry migration was applied without changing existing rows.

Existing locations: Alexandria, Maadi, Madenet Nasr, Masr El Gdida, Mohandsein, New cauro, Sheikh Zayed, sheraton, tagamo3, Zamalek.

Existing cuisines: American, Bowls, Chinese, International, Italian, Japanese, Korean, Mexican, Seafood, Sushi, Vietnamese, Yemeni.

| Existing label | Proposed preferred label / action | Review needed |
| --- | --- | --- |
| New cauro | New Cairo; retain New cauro as an alias | Approved by Dany; included in the New Cairo identity. |
| Madenet Nasr | Nasr City; retain Madenet Nasr, Madinat Nasr, Madinet Nasr, مدينة نصر | Confirm display-name preference. Implementation currently retains Madenet Nasr. |
| Mohandsein | Mohandessin; retain old spelling | Confirm intended area and preferred English spelling. |
| Masr El Gdida | Keep current name; consider Heliopolis / مصر الجديدة aliases | Confirm geographic equivalence before registering aliases. |
| sheraton | Sheraton; optionally qualify district/city | Confirm area context; do not confuse with a hotel brand or another city. |
| tagamo3 | New Cairo; retain tagamo3/tagamoo3 as aliases | Dany explicitly confirmed equivalence. No unrelated districts were merged. |
| Sushi / Japanese | Keep both | One is a food category, the other a broader cuisine; similarity is not identity. |
| Bowls / International | Keep both | No factual basis for a merge. |

The prepared migration preserves all current preferred labels. It registers unambiguous search aliases for Maadi, Madenet Nasr, Zamalek, Alexandria, Sheikh Zayed, and several cuisine translations only when the target exists and no conflicting entry owns that alias. Reviewed future corrections should retain old names as aliases and update associations transactionally, with a concrete preview before production changes.

No normalized duplicate location/cuisine labels were apparent in the returned production lookup list. Typographical and semantic variants still require human review. A constraint cannot infer that two different place names represent the same area.

The follow-up lookup-management migration merges only the approved names at the registry/alias level; former registry IDs and historical restaurant text are retained. Other proposed corrections remain unapplied.
