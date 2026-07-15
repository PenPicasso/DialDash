# Terra Medium Mission: Redo 179

## Scope

Re-research only the 179 records returned by Sol from `next-200-b`. The queue is fixed at `storage/terra-redo-next-200-b/`. Do not select a new cohort, modify `main`, deploy, use Firecrawl, or write `data/nodes.json`.

Create the queue once:

```bash
npx tsx scripts/prepare-terra-redo.ts --cohort=next-200-b
```

Work the eight queue files in order. Each queue item names its original source batch. Update that prospect in the matching `data/terra-medium-next-200-b/batch-N.json`; preserve the 21 accepted factual exclusions unchanged.

## Research Standard

Use official first-party pages wherever possible. Search deterministically before any model inference. A readable RSS feed or Apple-to-RSS mapping does not establish ownership unless its title strongly matches the prospect identity.

For every returned record, record all eight checks in `researchAudit`:

```json
{
  "researchCompleteness": "COMPLETE",
  "researchAudit": {
    "reviewedBy": "Terra Medium",
    "reviewedAt": "2026-07-15T00:00:00.000Z",
    "checks": {
      "ownedLongForm": { "status": "CONFIRMED", "note": "...", "evidenceUrls": ["https://..."] },
      "cadence": { "status": "CONFIRMED", "note": "...", "evidenceUrls": ["https://..."] },
      "roles": { "status": "CONFIRMED", "note": "...", "evidenceUrls": ["https://..."] },
      "contact": { "status": "UNRESOLVED", "note": "...", "evidenceUrls": ["https://..."] },
      "offer": { "status": "CONFIRMED", "note": "...", "evidenceUrls": ["https://..."] },
      "funnel": { "status": "CONFIRMED", "note": "...", "evidenceUrls": ["https://..."] },
      "videoGap": { "status": "CONFIRMED", "note": "...", "evidenceUrls": ["https://..."] },
      "pitchHook": { "status": "CONFIRMED", "note": "...", "evidenceUrls": ["https://..."] }
    }
  }
}
```

`UNRESOLVED` is valid after real research and means `NURTURE`. Do not use a generic reason. A confirmed rejection requires a factual hard gate and first-party evidence. A promotion must meet all existing validator gates.

## Per Batch

After every completed source batch, run:

```bash
npm run validate:terra-medium-next-200-b -- --batch=N
npm run validate:methodology
npm run validate:data
```

Stop and correct any failure. After all eight source batches pass, re-compose the cohort, add explicit Sol audit verdicts for all 40 sampled records, then run:

```bash
npx tsx scripts/review-terra-medium-cohort.ts --cohort=next-200-b
```

The only acceptable final result is `PASSED` with no returned drafts and at least 90% audited precision.
