# DialDash Agent Operating Record

This file is the background coordination record for Codex, Antigravity, and any other agent working in this repository. Update it after material product, data, deployment, or pipeline changes.

## Current Product Intent

DialDash is the Energy Dial prospect dashboard. The goal is not raw lead volume; it is a large database of signable clipping/video-repurposing prospects.

Primary ICP:
- Global English-language energy creators.
- Audio/newsletter-first operators are preferred.
- A prospect is actionable only when a named human point-man, outreach path, active/semi-active content evidence, and funnel-aware pitch hook are present.

## Data Contract

Canonical categories:
- Fossil Fuels
- Power & Utilities
- Renewables
- Nuclear
- Energy Enablers
- Commodity & Energy Markets
- Energy Media & Research
- Energy Advisory & Expertise

Actionability states:
- `READY`: can be worked for outreach now.
- `REJECTED`: failed hard gates such as missing contact path, inactive publishing evidence, or corporate monolith status.
- `REVIEW`: reserved only for future ambiguous cases that need human or paid-verifier review. Current database should not leave legacy rows in REVIEW.

Key fields added for agents:
- `actionabilityStatus`
- `actionabilityReasons`
- `rejectionReason`
- `bestOutreachChannel`
- `sourceEvidenceUrl`
- `videoGapReason`
- `tofChannels`
- `mofChannels`
- `bofOffer`
- `pitchHook`
- `leadSource`
- `verificationTier`
- `lastActionabilityAuditAt`

## Current State

As of the latest audit:
- Total prospects: 840
- READY: 198
- REJECTED: 642
- REVIEW: 0
- HOT: 177
- Every row has a funnel-aware `pitchHook`.
- Legacy `Oil & Gas` category values were normalized to `Fossil Fuels`.

The 642 former REVIEW rows were finished by applying the hard gates and marking non-actionable rows as `REJECTED` with reasons embedded in `actionabilityReasons` and `rejectionReason`.

## Important Scripts

Use these from the repo root:
- `npm run audit:actionability`: recompute actionability, funnel fields, pitch hooks, and final READY/REJECTED status.
- `npm run validate:data`: validate schema, canonical categories, READY gates, HOT contact completeness, and duplicate warnings.
- `npm run source:dry-run -- --limit 25 --no-write`: stage new candidates under `storage/prospect-runs/` without touching production data.
- `npm run typecheck`: non-mutating TypeScript check using `--incremental false`.
- `npm run lint`: non-interactive ESLint check.
- `npm run build`: production Next.js build.

Never run legacy sourcing as a production write unless explicitly requested. `scripts/source-and-sift-reachable.ts` now stages by default; `--write-production` is required to modify `data/nodes.json`.

## Dashboard Notes

The dashboard now includes:
- Compact dropdown filters for actionability, reachability, funnel opportunity, best outreach channel, lead source, format, category, priority, and confidence.
- Brand colors sampled from the provided Energy Dial logo reference: orange `#FE8007` and blue `#113E80`. Do not add the logo asset itself unless the user explicitly asks.
- `Latest` column showing the last known post date as `Today`, `Yesterday`, or `<days>d ago`; future-dated records should display a short absolute date instead of a relative freshness label.
- Detail drawer showing TOF/MOF/BOF and the stored prospect-specific pitch hook.

## Verification Baseline

Before pushing material changes, run:

```bash
npm run lint
npm run typecheck
npm run validate:data
npm run build
```

For UI changes, also smoke-test `/dashboard` locally or on a Vercel preview and confirm:
- READY/REJECTED counts render.
- `Latest` column renders.
- Detail drawer opens.
- Pitch hook renders.
- No browser console errors.

## Deployment Notes

The branch `codex/quality-gated-prospect-scaling` was deployed to Vercel preview successfully before this record was added. Preview deployments may return `401` to unauthenticated users because Vercel Deployment Protection is enabled on the project.

If the user says "make it the main one", merge/push to `main` and deploy/promote production after the checks pass.

## Security Notes

Do not commit `.env.local`, API keys, generated run artifacts, or logs. A prior external handoff contained a Firecrawl key in plain text; rotate that key if the handoff was shared outside the trusted workspace.
