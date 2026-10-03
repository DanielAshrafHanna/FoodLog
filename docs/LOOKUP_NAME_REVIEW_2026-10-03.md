# Lookup spelling and alias review — 2026-10-03

Read-only production preview. No rename or semantic merge has been applied. The 41 restaurant rows (including recoverable rows) and their location/cuisine/update timestamps were hashed before rollout preparation; production schema remains unchanged.

Existing locations: Alexandria, Maadi, Madenet Nasr, Masr El Gdida, Mohandsein, New cauro, Sheikh Zayed, sheraton, tagamo3, Zamalek.

Existing cuisines: American, Bowls, Chinese, International, Italian, Japanese, Korean, Mexican, Seafood, Sushi, Vietnamese, Yemeni.

| Existing label | Proposed preferred label / action | Review needed |
| --- | --- | --- |
| New cauro | New Cairo; retain New cauro as an alias | Confirm spelling correction and intended area. |
| Madenet Nasr | Nasr City; retain Madenet Nasr, Madinat Nasr, Madinet Nasr, مدينة نصر | Confirm display-name preference. Implementation currently retains Madenet Nasr. |
| Mohandsein | Mohandessin; retain old spelling | Confirm intended area and preferred English spelling. |
| Masr El Gdida | Keep current name; consider Heliopolis / مصر الجديدة aliases | Confirm geographic equivalence before registering aliases. |
| sheraton | Sheraton; optionally qualify district/city | Confirm area context; do not confuse with a hotel brand or another city. |
| tagamo3 | Keep separate for now; consider Tagamoa / التجمع after review | Do not automatically equate it with all of New Cairo or Fifth Settlement. |
| Sushi / Japanese | Keep both | One is a food category, the other a broader cuisine; similarity is not identity. |
| Bowls / International | Keep both | No factual basis for a merge. |

The prepared migration preserves all current preferred labels. It registers unambiguous search aliases for Maadi, Madenet Nasr, Zamalek, Alexandria, Sheikh Zayed, and several cuisine translations only when the target exists and no conflicting entry owns that alias. Reviewed future corrections should retain old names as aliases and update associations transactionally, with a concrete preview before production changes.

No normalized duplicate location/cuisine labels were apparent in the returned production lookup list. Typographical and semantic variants still require human review. A constraint cannot infer that two different place names represent the same area.
