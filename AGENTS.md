# DialDash Agent Operating Record

This file is the background coordination record for Codex, Antigravity, and any other agent working in this repository. Update it after material product, data, deployment, or pipeline changes.

## Current Product Intent

DialDash is the Energy Dial prospect dashboard. The goal is not raw lead volume; it is a large database of signable clipping/video-repurposing prospects.

Primary ICP:
- Global English-language energy creators.
- Audio/newsletter-first operators are preferred.
- A prospect is actionable only when a named human point-man, outreach path, active/semi-active content evidence, and funnel-aware pitch hook are present.

## Non-negotiable Strict ICP Gates

A prospect may be promoted to `READY` only when every applicable gate is supported by direct public evidence:

- Global English-language energy operator in Fossil Fuels, Power & Utilities, Renewables, Nuclear, Energy Enablers, Commodity & Energy Markets, Energy Media & Research, or Energy Advisory & Expertise.
- Named, visible human point-man who hosts, authors, presents, advises, or leads the content.
- Usable direct outreach path and an active X presence.
- Active or semi-active long-form publishing on YouTube or an Apple/Spotify-distributed podcast. Prefer prospects with little or weak short-form output because the service opportunity is clearer.
- Boutique scale evidenced by either approximately $1M-$50M revenue or 5-200 employees. Never guess either metric.
- Prefer founder-led or expert-led operators. Exclude majors, giant utilities, large EPCs, corporate monoliths, generic news brands, aggregators, and prospects without a direct point-man.

Quality beats count. Missing or contradictory evidence must remain staged or `REJECTED`; agents must never relax gates, fabricate enrichment, or promote a prospect merely to increase database size.

## Jules Automation

- Failed deployment repair is event-driven from a failed GitHub deployment status. Jules may reproduce the failure, make the smallest durable code fix, add regression coverage, and open a pull request. It must not deploy or merge automatically.
- Prospect enrichment is manual through the `Jules repair and enrichment` workflow. Default to 10 prospects and never exceed 25 in one task.
- Enrichment must prioritize existing READY/HOT or near-READY prospects, cite direct evidence for every changed fact, and open a reviewable pull request.
- Jules credentials belong only in the `JULES_API_KEY` GitHub Actions secret.

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
- `latestYoutubePublishedAt`
- `latestPodcastPublishedAt`
- `latestMediaPublishedAt`
- `lastMediaFreshnessAuditAt`

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

## Methodology Pilot (Isolated Branch)

Branch: `codex/prospect-methodology-pilot`

This branch contains a read-only, adversarial 15-prospect pilot. It must not be merged into `main` or used to promote records until the user reviews the results.

Pilot composition and result:
- 5 current READY records audited.
- 5 rejected records tested for recovery.
- 5 newly sourced records.
- `PURSUE_NOW`: 9.
- `NURTURE`: 3.
- `DISQUALIFIED`: 3.
- Production rows changed: 0.

The pilot corrects several legacy methodology failures:
- Match freshness to the owned show/channel and named person; do not borrow dates from a related company channel.
- Separate the content owner, on-mic host, and economic buyer. They may be different people.
- Verify the prospect's actual offer from an official page; do not infer BOF from a job title.
- Treat short-form volume and short-form explanatory quality as separate observations.
- Build the observed TOF/MOF/BOF funnel first, then a separate proposed Energy Dial funnel tied to the real transaction.
- Let failed hard gates override the numeric score.

Firecrawl remains an escalation tool. The corrected matched pass produced 14 valid pages, rejected one branded 404, added one meaningful contact set, added four raw decision inputs, and changed no final decision. Deterministic research remains the default.

Pilot files and surfaces:
- `data/pilot-manifest.json`: fixed 5/5/5 cohort and official source inputs.
- `scripts/research-pilot.ts`: deterministic podcast, cadence, YouTube, contact, and offer research with optional matched Firecrawl pass.
- `data/pilotReports.ts`: the 15 plain-language, evidence-linked decision reports.
- `docs/PILOT_METHODOLOGY.md`: methodology, outreach policy, and working pricing.
- `npm run validate:pilot`: validates cohort counts, ranks, score arithmetic, hard-gate overrides, source references, and zero production writes.
- `/pilot`: review workspace with methodology and offer-playbook views.
- `/api/pilot`: static, read-only payload for other agents and automation.

Pilot review feedback is saved in browser local storage under `dialdash:pilot-feedback:v1` and can be exported as JSON. It is deliberately not written to Vercel's filesystem. Agentation is available only in local development for visual annotations.

## Important Scripts

Use these from the repo root:
- `npm run audit:actionability`: recompute actionability, funnel fields, pitch hooks, and final READY/REJECTED status.
- `npm run refresh:media`: refresh source-specific YouTube/podcast freshness for READY rows.
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
- `Latest`/freshness column showing only source-specific YouTube or podcast freshness as `Today`, `Yesterday`, or `<days>d ago`; future-dated records should display a short absolute date instead of a relative freshness label.
- Default dashboard view is `READY` only. UI labels `REJECTED` rows as `Archived` because those records failed hard actionability gates and should not be treated as active sales targets.
- Prospect data is loaded from `/api/prospects` instead of importing `data/nodes.json` into the client page, so the initial dashboard HTML stays light. The table renders in batches of 100.
- The freshness column prioritizes YouTube and Apple Podcast/RSS evidence and expands on hover to show both platform signals.
- Detail drawer showing TOF/MOF/BOF and the stored prospect-specific pitch hook.

## Freshness Methodology

Do not use generic `lastPublishDate` or `lastKnownPublishDate` as the dashboard freshness source. Those fields may be legacy cadence evidence and can be stale or platform-ambiguous.

`npm run refresh:media` must populate source-specific fields:
- YouTube: `latestYoutubePublishedAt`, `latestYoutubeTitle`, `latestYoutubeEvidenceUrl`.
- Podcast: `latestPodcastPublishedAt`, `latestPodcastTitle`, `latestPodcastEvidenceUrl`, `latestPodcastSource`.
- Primary media: `latestMediaPublishedAt`, `latestMediaSource`, `latestMediaTitle`.

Apple/iTunes lookup results are valid only when the result is a podcast result (`wrapperType: "track"`, `kind: "podcast"`), has a `feedUrl`, and links to `podcasts.apple.com`. Do not overwrite podcast fields from music, album, audiobook, or other Apple media results.

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

The methodology pilot is published separately:
- Branch: `codex/prospect-methodology-pilot`.
- Draft PR: `https://github.com/PenPicasso/DialDash/pull/2` targeting `main`.
- Stable Vercel preview alias: `https://dial-dash-git-codex-c8c810-runitbackstudios-gmailcoms-projects.vercel.app/pilot`.
- Vercel target: preview only. Deployment Protection requires a Vercel login in a normal browser session.
- GitHub/Vercel status check passed for commit `e66d22a`; do not promote or merge until the user reviews the 15 reports.

If the user says "make it the main one", merge/push to `main` and deploy/promote production after the checks pass.

## Security Notes

Do not commit `.env.local`, API keys, generated run artifacts, or logs. A prior external handoff contained a Firecrawl key in plain text; rotate that key if the handoff was shared outside the trusted workspace.
