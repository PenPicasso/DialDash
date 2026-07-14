# Terra Medium Mission: Next 200 B

## Objective

Research the next 200 fit-ranked unresolved DialDash prospects in eight fixed batches of 25. This is a new cohort, not a rerun of the original Terra 200: it excludes every record in `data/terra-medium-next-200.json`.

Do not modify `main`, deploy, use Firecrawl, or write `data/nodes.json`. Missing evidence is always `NURTURE`, never a confirmed rejection.

## Prepare The Fixed Cohort

```bash
npm run research:sol-next-200-b
npm run validate:sol-next-200-b
```

The fixed manifest is written under `storage/sol-next-200-b/`. Do not regenerate it after batch work starts.

## Batch Loop

For each batch from 1 through 8:

```bash
npm run research:terra-medium-next-200-b-evidence -- --batch=N
npm run draft:terra-medium-next-200-b -- --batch=N
```

Then manually enrich the batch using first-party evidence. Verify owned current long-form and true latest publication, at least three cadence dates, content owner, on-mic host, economic buyer, public contact, real offer, observed TOF/MOF/BOF, three inspected owned-video samples, and a transaction-specific pitch hook.

Run after every batch:

```bash
npm run validate:terra-medium-next-200-b -- --batch=N
npm run validate:methodology
npm run validate:data
```

Stop and correct the current batch if a validator fails. Commit after every two completed batches. Do not promote a prospect when any required gate is unresolved.

## Decision Boundary

Use the definitions in `docs/TERRA_MEDIUM_NEXT_200.md`. In particular, a company-owned show is not automatically a `CORPORATE_MONOLITH`; large institutions and enterprises that control both content and transaction qualify, while specialist firms and founder-led teams remain `NURTURE` until creator-sales fit and buyer authority are resolved.

After all eight batches pass:

```bash
npm run compose:terra-medium-next-200-b
npm run lint
npm run typecheck
npm run validate:methodology
npm run validate:data
npm run build:next
```

The composed result is `data/terra-medium-next-200-b.json` and must remain `solReviewStatus: PENDING` for Sol review.
