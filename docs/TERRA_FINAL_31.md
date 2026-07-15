# Terra Final 31 Mission

Research the fixed final 31 DialDash dashboard prospects in two batches: 25 and 6. This cohort excludes all 809 dashboard records that already passed Sol review.

## Rules

- Use official first-party pages, owned feeds, Apple Podcasts, YouTube, and public contact/offer routes.
- Do not use Firecrawl.
- Missing or ambiguous evidence is `NURTURE`, never a confirmed rejection.
- Do not promote unless all eight actionability checks are confirmed.
- Do not modify `data/nodes.json`, `main`, Vercel, or production.

## Commands

For each batch `N` (1 then 2):

```bash
npm run research:terra-final-31-evidence -- --batch=N
npm run draft:terra-final-31 -- --batch=N
npm run validate:terra-final-31 -- --batch=N --allow-draft
```

Terra must then replace each draft with a prospect-specific review covering owned long-form and true latest publication, three-date cadence, owner/host/buyer, public contact, actual offer, observed TOF/MOF/BOF, inspected video gap, and transaction-specific pitch hook. Mark `researchCompleteness: "COMPLETE"` only after that review, then rerun the validator without `--allow-draft`.

After both batches pass:

```bash
npm run compose:terra-final-31
```

Leave the composition `PENDING` for Sol review.
