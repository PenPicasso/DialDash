# Terra Mission: Next 200 C

## Scope

Research the fixed `next-200-c` cohort in eight batches of 25. These are the highest-ranked dashboard prospects not present in the initial reviewed set, `next-200`, or `next-200-b`.

Work only on `codex/sol-next-200` or a branch/worktree created from it. Do not modify `main`, deploy, push, use Firecrawl, or write `data/nodes.json`.

The fixed inputs are:

```text
storage/sol-next-200-c/manifest.json
storage/sol-next-200-c/batch-1.json
...
storage/sol-next-200-c/batch-8.json
```

Do not regenerate the cohort after research starts. Do not substitute records from the final remainder.

## Start

```bash
npm run validate:sol-next-200-c
```

For each batch `N`, build the deterministic evidence pack and conservative draft:

```bash
npm run research:terra-medium-next-200-c-evidence -- --batch=N
npm run draft:terra-medium-next-200-c -- --batch=N
```

The draft is a starting point only. It must never be relabeled `COMPLETE` in bulk.

## Required Review

For every prospect, use official first-party evidence wherever available and explicitly review:

1. Owned long-form and the true latest publication across podcast, YouTube, newsletter, and official-site channels.
2. At least three historical publication dates and the resulting cadence.
3. Content owner, on-mic host, and economic buyer as separate roles.
4. A public contact route tied to the named person or controlled business.
5. The actual commercial transaction from an official offer, pricing, services, sponsorship, membership, booking, fund, donation, or support page.
6. The observed TOF, MOF, and BOF leading to that transaction.
7. The video-distribution and educational-quality gap. A quality claim requires three inspected recent owned videos.
8. A prospect-specific pitch hook tied to the verified content, buyer, and transaction.

Search snippets can locate evidence but are not evidence. Do not infer an offer from a job title. A stale podcast feed does not prove total inactivity until other owned channels are checked.

## Decision Rules

- `PURSUE_NOW`: every hard gate is proven with official evidence.
- `NURTURE`: the prospect may fit but any required gate remains unresolved.
- `DISQUALIFIED_CONFIRMED`: one factual hard gate is proven. Missing evidence is never a confirmed rejection.

Allowed factual gates:

```text
INACTIVE_OVER_90_DAYS
CORPORATE_MONOLITH
WRONG_ICP
NON_ENGLISH
DUPLICATE_ACCOUNT
NO_NAMED_HUMAN_BY_DESIGN
EXISTING_STRONG_VIDEO_CAPABILITY
NO_COMMERCIAL_TRANSACTION
```

`CORPORATE_MONOLITH` requires a large institution-controlled content and buyer chain. Company ownership alone is insufficient. `NO_COMMERCIAL_TRANSACTION` requires affirmative official evidence; failure to find an offer is `NURTURE`.

## Complete Record Contract

Write `data/terra-medium-next-200-c/batch-N.json`. Every record must include:

```json
{
  "id": "stable-id",
  "decision": "PURSUE_NOW | NURTURE | DISQUALIFIED_CONFIRMED",
  "decisionReason": "Prospect-specific factual explanation",
  "researchCompleteness": "COMPLETE",
  "researchAudit": {
    "reviewedBy": "Terra Medium",
    "reviewedAt": "ISO timestamp",
    "checks": {
      "ownedLongForm": { "status": "CONFIRMED | UNRESOLVED | NOT_APPLICABLE", "note": "Prospect-specific result", "evidenceUrls": ["https://..."] },
      "cadence": { "status": "...", "note": "...", "evidenceUrls": ["https://..."] },
      "roles": { "status": "...", "note": "...", "evidenceUrls": ["https://..."] },
      "contact": { "status": "...", "note": "...", "evidenceUrls": ["https://..."] },
      "offer": { "status": "...", "note": "...", "evidenceUrls": ["https://..."] },
      "funnel": { "status": "...", "note": "...", "evidenceUrls": ["https://..."] },
      "videoGap": { "status": "...", "note": "...", "evidenceUrls": ["https://..."] },
      "pitchHook": { "status": "...", "note": "...", "evidenceUrls": ["https://..."] }
    }
  },
  "unresolvedGates": ["Required for NURTURE"],
  "factualHardGate": "Required only for DISQUALIFIED_CONFIRMED",
  "evidence": [
    { "url": "https://official-source", "proves": "Exact fact established" }
  ],
  "auditedAt": "ISO timestamp"
}
```

Promotions must also contain the structured owner/host/buyer, contact, owned long-form with three dates and median cadence, offer, observed funnel, video gap, and pitch hook fields enforced by the validator. Omit unknown optional values rather than inventing them.

## Batch Loop

After every batch:

```bash
npm run validate:terra-medium-next-200-c -- --batch=N
npm run validate:methodology
npm run validate:data
```

Stop and correct the current batch if any command fails. Commit after batches 2, 4, 6, and 8 so the run is resumable.

After all eight batches pass:

```bash
npm run compose:terra-medium-next-200-c
npm run lint
npm run typecheck
npm run validate:methodology
npm run validate:data
```

Leave the composed cohort `PENDING`. Terra must not create Sol verdicts or claim completion. Sol reviews every promotion, every nurture decision, and the deterministic rejection sample afterward.

## Copy-Paste Instruction

Process the fixed DialDash `next-200-c` cohort using `docs/TERRA_NEXT_200_C.md`. Work in eight batches of 25. Use official first-party evidence and no Firecrawl. Missing evidence is `NURTURE`, never confirmed rejection. For every prospect complete the eight evidence-backed research checks covering owned long-form and true latest publication, three-date cadence, owner/host/buyer, contact, actual offer, observed TOF/MOF/BOF, three-sample video gap, and transaction-specific pitch hook. Write `data/terra-medium-next-200-c/batch-N.json`; validate the batch, methodology, and production data after every 25. Stop on failure. Do not modify `main`, deploy, push, or write `data/nodes.json`. Compose after batch 8 and leave the result `PENDING` for Sol review.
