# Sol Review: Terra Recovery 100

Date: 2026-07-14  
Branch: `codex/light-model-next-100`  
Methodology: `sol-recovery-v1`

## Outcome

The next 100 recovery records were reviewed in four batches of 25 without writing to `data/nodes.json`.

- `PURSUE_NOW`: 3
- `NURTURE`: 60
- `DISQUALIFIED_CONFIRMED`: 37
- Sol audit sample: 18/18 decisions correct (100%, above the 90% stop threshold)

`NURTURE` is a research queue, not an unqualified bucket. Every one of the 60 has a live, energy-relevant long-form source. They remain unresolved because the commercial chain has not been proven from first-party evidence.

## Work First

### 1. Michelle Fraser

- Owned content: Energy Sector Heroes podcast and YouTube channel.
- Offer: engineering consultancy, one-to-one mentoring, speaking, and mentoring products.
- Buyer and point-man: Michelle Fraser.
- Contact path: official site contact and booking flow.
- Video gap: three sampled Shorts were static podcast artwork over audio. This is a substantial explanatory-video gap despite the channel having a Shorts tab.
- Pitch: turn expert interviews into engineering-career explainers with project maps, equipment callouts, and numbered lessons, then route viewers to consultancy and mentoring.

### 2. Marine Cornelis

- Owned content: Energ'Ethic podcast, articles, and YouTube.
- Offer: strategic advisory retainers, governance reviews, speaking, and moderation.
- Buyer and point-man: Marine Cornelis.
- Contact path: `contact@nextenergyconsumer.eu` and official booking CTA.
- Video gap: only five visible Shorts; three sampled clips were basic remote-call/interview excerpts with captions and no maps, policy diagrams, or explanatory B-roll.
- Pitch: visualize EU policy with maps, tariff diagrams, named regulations, and on-screen consequences, then route viewers to a strategic conversation.

### 3. Amber Kanwar

- Owned content: In the Money podcast, YouTube, and Before the Bell newsletter.
- Offer: keynote speaking, moderation, and emcee engagements.
- Buyer and point-man: Amber Kanwar.
- Contact path: `feedback@inthemoneypod.com` plus official contact form.
- Video gap: at least 30 visible Shorts, but three sampled clips were captioned speaker cuts with no persistent figures, asset maps, source context, or visual teaching aids.
- Pitch: turn commodity, pipeline, mining, and oil interviews into sober market explainers that point to the podcast, newsletter, and speaking inquiry.

## Why 60 Remain In Research

The unresolved gates overlap:

- 60 lack first-party offer evidence.
- 60 lack proven economic-buyer authority.
- 60 lack a fully observed TOF/MOF/BOF transaction.
- 60 lack a verified weak explanatory-video gap.
- 57 lack a verified direct contact path.
- 30 lack a named human point-man.

These are research tasks, not evidence that the prospect has no offer, buyer, contact, or gap.

## Why 37 Were Confirmed Exclusions

The recurring hard gates were:

- Duplicate commercial accounts: multiple hosts or shows mapped to one buyer account, including OGGN and RenewEconomy rows.
- Institutional ownership: Wood Mackenzie, BloombergNEF, universities, associations, and large professional-services firms own the content transaction.
- Corporate product channels: the content is company marketing without a creator-controlled content-to-offer chain.
- Wrong ICP or language: general health, general trading, or non-English shows.
- Existing professional media capability: OGGN, SunCast, Energy Nerd Show, Antenna Group, and established video-native publishers already operate the capability being sold.

## Methodology Corrections

1. A current energy feed proves only source relevance and freshness.
2. Missing research produces `NURTURE`, never a factual rejection.
3. Host, content owner, economic buyer, and outreach point-man are separate identities.
4. Shared commercial accounts collapse to one buyer record.
5. Short-form volume and explanatory quality are separate gates.
6. A `PURSUE_NOW` decision requires first-party offer/contact evidence plus actual clip inspection.
7. No Firecrawl was used.

## Reproduce And Validate

```bash
npm run research:terra-batch -- --batch=1 --refresh
npm run research:terra-youtube
npm run research:terra-compose
npm run audit:terra-youtube
npm run research:sol-terra
npm run validate:terra
```

The review UI is available at `/recovery` on this branch.
