# Sol Review: Round Two 100

Date: 2026-07-14  
Branch: `codex/light-model-next-100`  
Methodology: `sol-recovery-v2.1`

## Outcome

The next non-overlapping 100 records were reviewed in four fixed batches of 25. Production `data/nodes.json` was not changed.

- `PURSUE_NOW`: 12
- `NURTURE`: 1
- `DISQUALIFIED_CONFIRMED`: 87
- Deterministic evidence-and-hard-gate sample: 26/26 records passed
- Firecrawl calls: 0

The 26/26 result is an evidence-completeness and gate-consistency pass rate. It is not statistical ground-truth precision, and the dashboard now labels it accordingly.

Batch results:

| Batch | Pursue | Nurture | Excluded |
| --- | ---: | ---: | ---: |
| 1 | 11 | 1 | 13 |
| 2 | 0 | 0 | 25 |
| 3 | 1 | 0 | 24 |
| 4 | 0 | 0 | 25 |

## Work First

1. Emmet Penney - Nuclear Barbarians and Grid Brief subscriptions; no owned YouTube distribution found.
2. Giles Parkinson - owns RenewEconomy; current podcast and advertising model; sampled Shorts are captioned studio cuts.
3. Peter Tertzakian - current ARC Energy Ideas plus speaking/books; sampled Shorts underuse maps and market data.
4. Mike Nemer - Green Insider and eRENEWABLE services/sponsorship; no matched owned YouTube channel.
5. Mike Mauceli - current Energy Show and REI investment partnerships; video distribution sits on the external Rich Dad channel.
6. David Roberts - current Volts podcast/newsletter and paid subscription; no matched owned Volts channel.
7. Tisha Schuller - current podcast/newsletter and explicit strategic-advisory services; no owned video channel found.
8. Wes Ashworth - current Green Giants podcast and renewable recruiting offer; sampled Shorts are captioned talking heads.
9. Laurent Segalen - current Redefining Energy and Megawatt-X transaction business; no matched owned channel.
10. Libbe HaLevy - weekly Nuclear Hotseat and donation/book funnel; only one visible owned Short.
11. Trisha Curtis - PetroNerds research/consulting; sampled Shorts use captions but little explanatory market context.
12. Paul Chapman - current HC Commodities Podcast and co-owned search/advisory business; no verified owned YouTube distribution.

Every promoted account now has a source-derived historical cadence record. Promotion requires at least two observed publications, a true owned-source latest date no more than 90 days old, and an `ACTIVE` or `SEMI_ACTIVE` cadence. Paul Chapman's stale Libsyn URL now fails closed and is recovered only through a strict Apple podcast lookup that verifies `wrapperType: track`, `kind: podcast`, an Apple Podcasts URL and a live feed URL. Trisha Curtis uses the owned PetroNerds YouTube Atom feed rather than a legacy generic date.

Nathan Gambling is the only `NURTURE` record. His owned energy content and identity are clear, but the durable paid BetaTeach transaction and economic-buyer authority were not explicit enough to promote.

## Why 87 Were Excluded

The number is high because the legacy rank was contaminated, not because contact research failed.

- 46 were wrong-ICP or wrong-live-feed matches: marketing, true crime, medicine, BNI, sports, broad finance, politics, cars and entertainment.
- 9 were corporate, university, government or professional-media accounts, including Bloomberg, Columbia, CSIS, CNBC, Blockworks, ICIS and eToro.
- 7 lacked a current owned audio/video long-form source.
- 6 were inactive beyond 90 days.
- 4 were duplicate commercial accounts already reviewed elsewhere.
- 2 lacked a named human owner.
- 1 already had strong explanatory-video capability.
- 12 failed another controlling hard gate, such as non-creator ownership, insufficient energy focus or no complete content-to-transaction chain.

Each record is assigned one controlling exclusion category even when several gates fail. The per-record ledger stores the exact reason.

## Video Audit

Three public Shorts were downloaded and visually inspected for Peter Tertzakian, Giles Parkinson, Wes Ashworth, Chris Keefer and Trisha Curtis. Chris Keefer was excluded because his samples already demonstrate purposeful explanatory B-roll and visual teaching. The other four retain commercially meaningful quality gaps.

## Running Total

- Pilot decisions: 15
- First recovery round: 100
- Second recovery round: 100
- Total review decisions: 215
- Unique reviewed prospect identities: 214, because Bill Derasmo appeared in both the pilot and first recovery cohort

## Reproduce

```bash
npm run research:sol-round-2
npm run review:sol-round-2
npm run validate:sol-round-2 -- --batch=1
npm run validate:sol-round-2 -- --batch=2
npm run validate:sol-round-2 -- --batch=3
npm run validate:sol-round-2 -- --batch=4
```
