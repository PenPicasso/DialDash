# Terra Medium Mission: Redo the Next 200

## Objective

Redo the invalidated 200-prospect cohort in eight fixed batches of 25. Produce prospect-specific, official-source research that can survive a later Sol audit. Do not modify `main`, deploy, use Firecrawl, or write `data/nodes.json`.

The sales objective is the first $997/month Energy Dial client. A usable prospect owns current English energy long-form, has a real transaction and reachable buyer, and has a commercially meaningful short-video distribution or educational-quality gap.

## Start

```bash
npm run research:sol-next-200
npm run validate:sol-next-200
```

Work on `codex/sol-next-200`, or on a worktree branch created from its latest commit. Do not switch branches if another worktree already owns that branch.

Read `storage/sol-next-200/batch-N.json` for the current batch. Old fields, generic rejection maps, and light-model conclusions are discovery hints only. They are not evidence and must not be copied as final decisions.

## Required Research Per Prospect

Use official first-party evidence wherever available and record the exact URL that proves each conclusion:

1. Identify the owned show/channel/newsletter and verify the true latest publication.
2. Record at least three recent publication dates and calculate historical cadence.
3. Separate content owner, on-mic host, and economic buyer.
4. Find a public outreach path tied to the person or their controlled business.
5. Verify the actual commercial offer from an official offer, pricing, membership, sponsorship, services, booking, fund, recruiting, donation, or support page.
6. Write the observed TOF, MOF, and BOF before proposing anything.
7. Inspect the owned YouTube/short-form distribution. For a quality-gap claim, inspect at least three recent clips and save their URLs.
8. Write a pitch hook tied to the verified transaction and the actual episode/content opportunity.

Use owned RSS/Atom, strict Apple podcast lookup, official YouTube channel/feed, official websites, and public X/LinkedIn profiles. Search snippets may locate official pages but are not evidence. Do not use Firecrawl.

## Decision Rules

- `PURSUE_NOW`: every hard gate is verified with official evidence.
- `NURTURE`: the prospect may fit, but one or more gates remain unresolved. Missing evidence always goes here, never to confirmed rejection.
- `DISQUALIFIED_CONFIRMED`: a factual hard gate is proved, such as verified inactivity over 90 days, corporate monolith ownership, wrong/non-English ICP, duplicate account, no named human by design, or existing strong explanatory-video capability.

For `factualHardGate`, use exactly one of: `INACTIVE_OVER_90_DAYS`, `CORPORATE_MONOLITH`, `WRONG_ICP`, `NON_ENGLISH`, `DUPLICATE_ACCOUNT`, `NO_NAMED_HUMAN_BY_DESIGN`, `EXISTING_STRONG_VIDEO_CAPABILITY`, or `NO_COMMERCIAL_TRANSACTION`. The evidence must prove the chosen gate. Use `NO_COMMERCIAL_TRANSACTION` only when an official source affirmatively establishes that there is no relevant transaction; failure to find an offer is `NURTURE`.

Do not reject because an offer, contact, owner, or feed was not found. That is unresolved research. Do not infer an offer from a title such as consultant, founder, investor, or analyst.

## Output

For batch `N`, create `data/terra-medium-next-200/batch-N.json`:

```json
{
  "methodology": "terra-medium-recovery-v1",
  "batch": 1,
  "records": [
    {
      "id": "stable-id",
      "decision": "PURSUE_NOW | NURTURE | DISQUALIFIED_CONFIRMED",
      "decisionReason": "Prospect-specific factual explanation.",
      "contentOwner": "Named person or omitted",
      "onMicHost": "Named host or omitted",
      "economicBuyer": "Named buyer or omitted",
      "contact": {
        "channel": "EMAIL | X_DM | LINKEDIN | CONTACT_FORM",
        "value": "Public address, profile, or route",
        "evidenceUrl": "https://official-or-owned-page"
      },
      "ownedLongForm": {
        "type": "PODCAST | YOUTUBE | NEWSLETTER",
        "latestTitle": "Exact title",
        "latestPublishedAt": "2026-07-14T00:00:00.000Z",
        "evidenceUrl": "https://owned-source",
        "recentPublicationDates": ["ISO date 1", "ISO date 2", "ISO date 3"],
        "cadenceStatus": "ACTIVE | SEMI_ACTIVE | SLOWED | INACTIVE",
        "medianIntervalDays": 7
      },
      "offer": {
        "description": "The real transaction in one factual sentence.",
        "evidenceUrl": "https://official-offer-page"
      },
      "observedFunnel": {
        "tof": ["Observed discovery channel"],
        "mof": ["Owned long-form or nurture asset"],
        "bof": ["Verified transaction"]
      },
      "videoGap": {
        "distribution": "NO_CHANNEL | MINIMAL | LIGHT | PARTIAL | ESTABLISHED",
        "educationalQuality": "WEAK | ADEQUATE | STRONG",
        "reason": "What was observed, without inference.",
        "evidenceUrls": ["https://sample-1", "https://sample-2", "https://sample-3"]
      },
      "pitchHook": "Prospect-specific hook tied to the offer and current content.",
      "factualHardGate": "Required only for confirmed rejection",
      "unresolvedGates": ["Required for NURTURE"],
      "evidence": [
        { "url": "https://source", "proves": "Exactly what this official source establishes" }
      ],
      "auditedAt": "ISO timestamp"
    }
  ]
}
```

Omit unknown optional fields rather than inventing values.

## Batch Loop

For each batch from 1 through 8:

```bash
npm run validate:terra-medium-next-200 -- --batch=N
npm run validate:methodology
npm run validate:data
```

Stop immediately if the Terra validator fails. Correct that batch before starting the next one. Commit after every two batches so progress is resumable, but do not push `main` or deploy.

After batch 8:

```bash
npm run compose:terra-medium-next-200
npm run lint
npm run typecheck
npm run validate:methodology
npm run validate:data
npm run build:next
```

The composed file is still marked `solReviewStatus: PENDING`. Do not call the 200 complete. Hand control back to Sol for review of every `PURSUE_NOW`, every `NURTURE`, and a deterministic sample of confirmed rejections. Sol must inspect decision evidence, not merely schema completeness.

## Copy-Paste Instruction For Terra Medium

Process the fixed DialDash next-200 cohort using `docs/TERRA_MEDIUM_NEXT_200.md`. Work in eight batches of 25. Use official first-party evidence and no Firecrawl. Missing evidence is `NURTURE`, never confirmed rejection. Verify owned long-form and true latest publication, at least three cadence dates, content owner, on-mic host, economic buyer, public contact, actual offer, observed TOF/MOF/BOF, and inspected video gap. Write `data/terra-medium-next-200/batch-N.json`, run the Terra validator plus methodology/data validators after every batch, and stop on any failure. Do not modify `main`, deploy, or write `data/nodes.json`. After all eight batches pass, compose the Terra result and leave it pending Sol review.
