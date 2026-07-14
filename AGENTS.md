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

### Acquisition-system branch

Branch: `codex/dialdash-acquisition-system`. This is preview-only until the user approves it; do not merge to `main` or promote production.

The `signability-v3` methodology has fit-ranked all 840 rows using recomputable evidence dimensions. Current methodology state:
- `PURSUE_NOW`: 4 evidence-cleared accounts.
- `NURTURE`: 110 ranked research candidates.
- `DISQUALIFIED`: 726 hard-gate or duplicate-account exclusions.
- 822 rows still require deeper buyer/offer research; this is explicit and must not be represented as completed verification.

Legacy `READY`/`REJECTED` remains in the data for compatibility, but it is not the current sales queue. Use `methodologyDecision` and `fitRank` for outreach prioritization.

All 840 rows were refreshed with `media-v3-owned-channels`. `latestMediaPublishedAt` is derived from the newest source-specific YouTube, podcast, or newsletter timestamp during ranking; a validator prevents the primary date from drifting behind channel evidence. Shared owned-media accounts are collapsed to one best buyer candidate.

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
- `npm run refresh:media -- --all --stale-only`: resumable all-record refresh using a sidecar checkpoint; no Firecrawl or Vercel cron.
- `npm run rank:prospects -- --write`: recompute `signability-v3`, derive primary freshness, and collapse duplicate owned-media accounts.
- `npm run validate:methodology`: validate rank arithmetic, gates, active-account uniqueness, and primary/channel date consistency.
- `npm run research:batch -- --limit=25`: export the next unresolved fit-ranked research queue under ignored `storage/prospect-runs/`; production is unchanged.
- `npm run validate:data`: validate schema, canonical categories, READY gates, HOT contact completeness, and duplicate warnings.
- `npm run source:dry-run -- --limit 25 --no-write`: stage new candidates under `storage/prospect-runs/` without touching production data.
- `npm run typecheck`: non-mutating TypeScript check using `--incremental false`.
- `npm run lint`: non-interactive ESLint check.
- `npm run build`: production Next.js build.

Never run legacy sourcing as a production write unless explicitly requested. `scripts/source-and-sift-reachable.ts` now stages by default; `--write-production` is required to modify `data/nodes.json`.

## Dashboard Notes

The dashboard now includes:
- Default `PURSUE_NOW` view, a `Research next` queue, fit rank/score, and methodology decisions.
- Contextual action menu for the latest episode, YouTube, Apple Podcasts, RSS, X, verified offer, contact, and source evidence.
- Source-specific YouTube, podcast, and newsletter freshness; hover/focus shows each channel and its audit state.
- Compact dropdown filters for actionability, reachability, funnel opportunity, best outreach channel, lead source, format, category, priority, and confidence.
- Brand colors sampled from the provided Energy Dial logo reference: orange `#FE8007` and blue `#113E80`. Do not add the logo asset itself unless the user explicitly asks.
- `Latest`/freshness column showing only source-specific YouTube or podcast freshness as `Today`, `Yesterday`, or `<days>d ago`; future-dated records should display a short absolute date instead of a relative freshness label.
- Default dashboard view is `READY` only. UI labels `REJECTED` rows as `Archived` because those records failed hard actionability gates and should not be treated as active sales targets.
- Prospect data is loaded from `/api/prospects` instead of importing `data/nodes.json` into the client page, so the initial dashboard HTML stays light. The table renders in batches of 100.
- The freshness column prioritizes YouTube and Apple Podcast/RSS evidence and expands on hover to show both platform signals.
- Detail drawer showing TOF/MOF/BOF and the stored prospect-specific pitch hook.
- Prospect rows use one stable `Details` action. Verified YouTube, podcast, X, email, and offer links render as direct buttons inside the detail drawer; do not restore a floating row dropdown that obscures adjacent prospects.
- `/pilot` contains the expanded first-client acquisition playbook and links to `/portal/demo`.
- `/portal/demo` is a manual-first client workspace preview. Media remains in Google Drive, payment uses a configured Flutterwave link, and feedback is browser-local until a real metadata backend is added.

## Freshness Methodology

Do not use generic `lastPublishDate` or `lastKnownPublishDate` as the dashboard freshness source. Those fields may be legacy cadence evidence and can be stale or platform-ambiguous.

`npm run refresh:media` must populate source-specific fields:
- YouTube: `latestYoutubePublishedAt`, `latestYoutubeTitle`, `latestYoutubeEvidenceUrl`.
- Podcast: `latestPodcastPublishedAt`, `latestPodcastTitle`, `latestPodcastEvidenceUrl`, `latestPodcastSource`.
- Newsletter: `latestNewsletterPublishedAt`, `latestNewsletterTitle`, `latestNewsletterEvidenceUrl`.
- Primary media: `latestMediaPublishedAt`, `latestMediaSource`, `latestMediaTitle`.

Apple/iTunes lookup results are valid only when the result is a podcast result (`wrapperType: "track"`, `kind: "podcast"`), has a `feedUrl`, and links to `podcasts.apple.com`. Do not overwrite podcast fields from music, album, audiobook, or other Apple media results.

A Codex automation named `Refresh DialDash media` runs daily at 07:00 Africa/Lagos with a light model in an isolated worktree. It refreshes, reranks, and validates only; it must not push, deploy, use Firecrawl, or touch `main`.

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
