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

### Acquisition-system branch

Branch: `codex/dialdash-acquisition-system`. This is preview-only until the user approves it; do not merge to `main` or promote production.

The `signability-v3` methodology has fit-ranked all 840 rows using recomputable evidence dimensions. On `codex/light-model-next-100`, after the light pass and Sol Medium resolution, the current methodology state is:
- `PURSUE_NOW`: 8 evidence-cleared accounts.
- `NURTURE`: 42 ranked research candidates.
- `DISQUALIFIED`: 790 hard-gate or duplicate-account exclusions.
- 749 rows still require deeper buyer/offer research; this is explicit and must not be represented as completed verification.

Legacy `READY`/`REJECTED` remains in the data for compatibility, but it is not the current sales queue. Use `methodologyDecision` and `fitRank` for outreach prioritization.

All 840 rows were refreshed with `media-v3-owned-channels`. `latestMediaPublishedAt` is derived from the newest source-specific YouTube, podcast, or newsletter timestamp during ranking; a validator prevents the primary date from drifting behind channel evidence. Shared owned-media accounts are collapsed to one best buyer candidate.

### Terra Light Recovery Queue

Branch: `codex/light-model-next-100`. This is a staged, recovery-only workflow; do not merge to `main`, deploy, or write its findings into `data/nodes.json` without an explicit Sol review.

The first recovery cohort contains 100 currently publishing, source-validated prospects in four batches of 25:
- Batches 1-2: 50 podcast-led records validated against their live RSS feeds.
- Batch 3: 9 remaining podcast-led records and 16 direct YouTube-channel records.
- Batch 4: 25 direct YouTube-channel records.

Artifacts are ignored under `storage/terra-recovery/`. The runners verify feed/channel ownership, actual latest publication, and energy-topic relevance before a record enters a batch. They deliberately do not infer a buyer, offer, contact path, funnel, or final sales decision. Missing first-party evidence must remain `UNVERIFIED`; only factual evidence can support a confirmed exclusion. No Firecrawl is used.

Run:
- `npm run research:terra-batch -- --batch=1 --refresh` to rebuild the podcast source audit.
- `npm run research:terra-youtube` to validate the YouTube supplement from official channel and uploads feeds.
- `npm run research:terra-compose` to rebuild the four 25-record batches.

Sol review completed on 2026-07-14 using `sol-recovery-v1`:
- `PURSUE_NOW`: 3 (`amber-kanwar`, `marine-cornelis`, `michelle-fraser`).
- `NURTURE`: 60 current energy accounts with one or more commercial gates still unverified.
- `DISQUALIFIED_CONFIRMED`: 37 evidence-backed duplicate, institutional/corporate owner, wrong-ICP/language, or existing professional-media exclusions.
- Deterministic audit sample: 18/18 correct; the 90% stop gate passed.
- Production rows changed: 0.

Tracked review artifacts:
- `data/terra-review.json`: all 100 decisions, evidence, exact missing gates, and pitch hooks for the three pursue records.
- `docs/SOL_TERRA_REVIEW.md`: plain-language review summary.
- `/recovery`: read-only review UI.
- `npm run research:sol-terra`: regenerate the tracked report from the staged cohort and curated Sol evidence.
- `npm run validate:terra`: validate cohort size, decision requirements, batch size, and audit threshold.

Important correction: a Shorts tab or high clip count does not prove strong explanatory distribution. Sol sampled three public Shorts each for the pursue records. Amber Kanwar has high short volume but only captioned speaker cuts; Marine Cornelis has limited basic remote-call clips; Michelle Fraser's sampled Shorts are static cover art over audio. Their opportunity is explanatory quality, not merely clip volume.

### Sol recovery round two

Completed 2026-07-14 on `codex/light-model-next-100` using `sol-recovery-v2.1`:
- 100 new, non-overlapping records in four batches of 25.
- `PURSUE_NOW`: 12.
- `NURTURE`: 1.
- `DISQUALIFIED_CONFIRMED`: 87.
- Deterministic evidence-and-hard-gate sample: 26/26 passed; this is not statistical ground-truth precision. Production rows changed: 0; Firecrawl calls: 0.
- Total review decisions across pilot and both recovery rounds: 215; unique prospect identities: 214 because `bill-derasmo` appeared in both the pilot and round one.

Round-two artifacts:
- `data/sol-review-round-2.json`: all decisions, controlling exclusion categories, verified transactions and pitch hooks.
- `docs/SOL_ROUND_2_REVIEW.md`: plain-language report.
- `/recovery/round-2`: read-only review UI.
- `npm run research:sol-round-2`: rebuild the non-overlapping 100-record manifest and live-source probes.
- `npm run review:sol-round-2`: regenerate the tracked review ledger from the staged manifest and curated Sol evidence.
- `npm run validate:sol-round-2 -- --batch=N`: enforce 25-record boundaries, prior-cohort exclusion, hard promotion gates and the 90% audit threshold.

Sol's adversarial correction added source-derived historical cadence as a promotion gate, strict Apple podcast feed discovery when a stored RSS URL fails, and owned YouTube Atom freshness for PetroNerds. Never claim the deterministic sample pass rate as decision precision.

The 87 exclusions are predominantly wrong-live-feed/ICP matches, institutions or established media, missing owned long-form, inactivity and duplicate accounts. Do not summarize them as contact failures. `nathan-gambling-betateach` is intentionally the only round-two `NURTURE`: content and identity are verified, but the durable paid transaction and buyer authority remain insufficiently explicit.

### Full light-model and Sol review

Branch: `codex/light-model-next-100`. This remains preview-only; do not merge to `main` or promote production until the user approves it.

As of the 2026-07-14 full review:
- All 749 previously unresolved rows were processed deterministically in resumable batches without Firecrawl.
- Sol reviewed 294 escalations and audited 455 deterministic hard-gate exclusions.
- All 822 records in the full run now have a durable strong-review resolution; `needsDeepResearch` is 0 across all 840 rows.
- Current sales decisions are 12 `PURSUE_NOW`, 9 `NURTURE`, and 819 `DISQUALIFIED`.
- Newly cleared immediate prospects are Tisha Schuller, Wes Ashworth, Mike Mauceli, and Mike Nemer via Green Insider/eRENEWABLE.
- Nathan Gambling and Rod Adams remain `NURTURE` because their support/sponsorship economics are weaker than the immediate consulting, recruiting, investment, and energy-services transactions.

Review records are in `data/solMediumRemainingResolutions.ts` and `data/deterministicSolResolutions.ts`. The dashboard detail drawer displays the strong-review reason and first-party evidence links. See `docs/SOL_REVIEW_2026-07-14.md` for the decision summary and review rules.

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

### Light-model 100-record pass

Branch: `codex/light-model-next-100`. This branch is isolated and must not be merged into `main` or deployed without explicit approval.

The first 100 highest-ranked unresolved records were processed in four batches of 25 with direct owned-source refreshes only. The run produced 27 deterministic hard-gate disqualifications and 73 `Sol Medium` escalation reports; it promoted zero records. The main sales queue and methodology decisions were not changed. `data/nodes.json` changed only through source-specific freshness refreshes on this isolated branch.

New batch tooling:
- `npm run refresh:media -- --ids=id-one,id-two`: refresh explicitly selected records regardless of legacy actionability state.
- `npm run research:light-batch -- --offset=0 --limit=25`: write ignored per-record evidence reports and a `Sol Medium` escalation queue under `storage/prospect-runs/` without promoting data.
- `npm run research:sol-queue`: consolidate light-batch reports into one ignored Sol review queue, keeping deterministic rejections separate from records requiring judgement.

### Sol Medium resolution of the 100-record pass

The 73 light-model escalations were reviewed on the same isolated branch and are now closed in `data/solMediumResolutions.ts`. The resolution is deliberately precision-first:
- 4 moved to `PURSUE_NOW`: Emmet Penney, Giles Parkinson, Peter Tertzakian, and David Roberts.
- 5 remain `NURTURE` with resolved economic/cadence/video-gap reasons: Chris Keefer, Libbe HaLevy, Laurent Segalen, Trisha Curtis, and Vivek Chandra.
- 64 are `DISQUALIFIED` for a documented hard-gate class: established production, unresolved owner/buyer, wrong or mismatched ICP media, missing transaction/video gap, or inactivity.

`scripts/rank-prospects.ts` applies these resolutions and embeds the review tier, timestamp, decision reason, and evidence URLs in `data/nodes.json`. `validate:methodology` requires all 73 resolutions to remain represented and closed. This branch still must not be merged, pushed, or deployed without explicit user approval.

### Full Light-Model Queue for Sol Review

On 2026-07-14, the remaining 749 `needsDeepResearch` records were processed in 30 fresh batches of 25 or fewer after the first 100-record pass. This was a deterministic evidence pass only: it did not promote or alter production decisions.
- 455 records have deterministic hard-gate disqualifications.
- 294 records are now the complete Sol review queue because they have a genuine owner, buyer, offer, cadence, contact, or video-gap judgement issue.
- Every batch passed the mechanical promotion-precision check; no record was auto-promoted.

The current local consolidated queue is under `storage/prospect-runs/sol-review-2026-07-14T15-05-47-171Z/sol-review-queue.json`. Regenerate it in any worktree after recreating light batches with `npm run research:sol-queue`. Sol should review the 294 `solReview` entries first, never the deterministic disqualification list, and should persist final decisions through the same resolution-map pattern used for the first 73.

The light-batch report accepts only direct source freshness, explicit first-party offer URLs, and public contact URLs. Missing or ambiguous owner, buyer, offer, cadence, contact, or distribution evidence is an escalation, never a promotion.

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
