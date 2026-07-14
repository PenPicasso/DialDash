# Sol Review: Next 200

Date: 2026-07-14  
Branch: `codex/sol-next-200`  
Methodology: `sol-recovery-v3`

## Cohort

This is a preview-only, non-production review. It contains:

- 167 still-unreviewed judgment cases from the deterministic Sol queue.
- 33 highest-ranked deterministic rejects as a false-negative audit.
- Eight fixed batches of 25.

`data/nodes.json` was not changed. Firecrawl was not used.

## Outcome

- `PURSUE_NOW`: 0
- `NURTURE`: 0
- `DISQUALIFIED_CONFIRMED`: 200
- Evidence-and-hard-gate audit: 46/46 documented checks passed.

The 46/46 number is a documentation and gate-consistency measurement. It is not statistical ground-truth decision precision.

## Why This Cohort Did Not Produce Outreach Accounts

The key issue is incomplete evidence, not an assertion that every account has no business at all:

- 200 lack a verified first-party commercial-offer page in the evidence layer.
- 186 lack active or semi-active source-derived historical cadence.
- 154 lack a public outreach path tied to a person or buyer.
- 73 lack a separately verified named owner and economic buyer.
- 72 lack a verified owned English long-form source.
- 16 lack a commercially meaningful distribution/educational-quality gap.
- 5 fail creator-controlled ownership.

No record may be promoted when any of those gates is unresolved. The ledger preserves the original evidence URLs and names each failed gate so a future recovery run can appeal a specific claim with a first-party source.

## Reproduce

```bash
npm run research:sol-next-200
npm run validate:sol-next-200 -- --batch=1
npm run review:sol-next-200
npm run validate:sol-next-200-review -- --batch=1
```

Run the equivalent validation command for batches 2 through 8 before using this report.
