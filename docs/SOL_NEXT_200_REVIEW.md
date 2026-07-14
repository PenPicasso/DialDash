# Sol Review: Invalidated Next-200 Attempt

Date invalidated: 2026-07-14
Branch: `codex/sol-next-200`

The automatic `200 DISQUALIFIED_CONFIRMED` result from commit `408ac2b` is invalid and must not be counted as completed prospect research.

Sol found that the previous generator:

- Converted missing evidence directly into confirmed rejection.
- Treated existing database fields as if they were fresh offer/contact research.
- Reused four generic bulk-resolution sentences across 167 records.
- Used a documentation-consistency audit that could not detect false-negative decisions.
- Did not globally sort the combined judgment and false-negative-audit lanes.

Official-source spot checks immediately disproved at least two rejection rationales: Martyn Lee has a direct contact route and Patreon/sponsor transaction, while Markham Hislop's official Energi Media page shows current content, named ownership, contact, subscriptions, sponsorships, and fee-for-service revenue. Both still require video-gap review, but neither can be factually rejected for the recorded reason.

The invalid tracked ledger was removed. The replacement Terra Medium mission is in `docs/TERRA_MEDIUM_NEXT_200.md`. The trustworthy completed-review count remains 214 unique prospect identities until that mission passes Terra validation and a subsequent Sol audit.
