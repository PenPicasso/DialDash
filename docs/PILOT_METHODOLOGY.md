# DialDash 15-Prospect Methodology Pilot

## Objective

Find prospects who can realistically become the first Energy Dial client. The pilot optimizes for the chance of a signed client, not the number of populated database fields.

The service being sold is educational short-form video. Energy Dial preserves what the expert says and improves comprehension with relevant maps, arrows, diagrams, numbers, persistent bullet points, contextual footage, restrained pacing, and technically accurate thumbnails. It is not rapid-cut retention bait.

## Experiment Design

The 15-record cohort is intentionally adversarial:

- 5 records currently marked `READY`.
- 5 records currently marked `REJECTED` that might be recoverable.
- 5 newly sourced records.

Every prospect receives the same deterministic baseline:

1. Resolve the current content owner and economic buyer from official pages.
2. Validate the podcast through Apple plus its owned RSS/Atom feed.
3. Calculate recency and historical cadence from up to 12 dated episodes.
4. Resolve the owned YouTube channel and inspect the latest 30 uploads through the free YouTube Data API.
5. Count short-form uploads, but keep frequency separate from quality.
6. Verify the real commercial offer from an official service, membership, subscription, fund, event, or pricing page.
7. Accept only public contact paths. Never infer or guess an email.
8. Build the current funnel from observed evidence, then build a separate proposed Energy Dial funnel.

Firecrawl is a second matched pass on the same primary page. Its results do not enter the deterministic baseline. A Firecrawl response is valid only when the source page itself returns a non-error status; polished markdown from a 404 page does not count.

## Hard Gates

A `PURSUE_NOW` prospect must have all of the following:

- An owned English-language long-form source that can be clipped.
- A latest owned episode within 90 days.
- A named content owner and a plausible economic buyer. These may be different people.
- A verified public outreach path.
- An observed commercial offer, not a generic offer inferred from an industry role.
- No corporate-monolith condition.
- A meaningful distribution or educational-quality gap.

Failure of a hard gate overrides the numeric score.

## Cadence Method

- `ACTIVE`: latest owned episode is 30 days old or newer.
- `SEMI_ACTIVE`: latest owned episode is 31-90 days old.
- `INACTIVE`: latest owned episode is older than 90 days.

Historical cadence can downgrade an otherwise active show. The runner compares the median spacing of the three most recent intervals with the earlier baseline. It downgrades when recent spacing is at least 2.5 times the baseline and at least seven days slower. This catches a formerly daily show that has drifted to monthly publishing.

## Video Method

An owned YouTube upload of 180 seconds or less counts as short form. The latest 30 uploads are grouped as:

- `ESTABLISHED`: at least 15 recent short uploads.
- `PARTIAL`: 9-14 recent short uploads.
- `LIGHT`: 3-8 recent short uploads.
- `MINIMAL`: 0-2, or no recent short despite an older short archive.
- `NO_OWNED_CHANNEL`: no identity-matched owned channel.

This is a distribution measure, not a quality verdict. A manual frame/edit check separately assesses whether the clips use relevant explanatory visuals or only captions, talking heads, or generic stock footage.

## Scoring

The score ranks prospects only after hard gates:

- Content supply: 0-20.
- Distribution gap: 0-25.
- Commercial offer: 0-20.
- Audience leverage: 0-15.
- Reachability: 0-10.
- Educational visual fit: 0-10.

Evidence confidence is shown separately. A high score with weak evidence is not actionable.

## Funnel Standard

The current funnel and proposed funnel are different objects.

- TOF is discovery: X, LinkedIn, YouTube Shorts, and other public distribution.
- MOF is depth and capture: the full podcast/video, newsletter, membership, and explicit CTA bridge.
- BOF is the real commercial transaction: paid research, advisory, consulting, recruiting, subscriptions, sponsorships, events, fund relationships, or services.

The proposed funnel must connect each short to one specific full episode and then to the prospect's observed offer. It must not say merely "more awareness."

## Research Result

The cold deterministic pass took 85 seconds; the cached pass took 37 seconds. The Firecrawl matched pass took 94 seconds for 15 pages.

Firecrawl returned a response for every page, but one was a branded 404 and is not valid evidence. It added one materially useful contact set, for ship.energy. It did not change any final decision. The correct policy is therefore deterministic-first, with Firecrawl reserved for high-value records whose official pages are blocked or whose contact path remains incomplete.

## Outreach Recommendation

Do not post a prospect's speculative sample publicly before permission. Public tagging creates a rights and trust problem before the relationship exists.

Recommended sequence:

1. Produce one private, finished 20-45 second sample from a recent episode.
2. Send a short DM with one specific observation, the private link, and the three-clip free trial.
3. If they respond positively, ask about the desired platform, approval owner, and current publishing workflow.
4. Close the $997 founding package asynchronously when possible with a one-page scope and payment link. Offer a 15-minute call, but do not force one.
5. If the DM is ignored, send one email 2-3 business days later referencing the same sample. Do not contact every channel on the same day.
6. Use a call for the $8,000 long-form package because scope, approvals, and production risk are materially larger.

A VSL is not required for the first client. A focused proof page with three strong samples, clear scope, turnaround, and a payment or call CTA is enough.

## Raw Clips

Deliver the raw/select cut privately as a client asset if useful. Do not recommend posting the raw cut beside the finished clip. That comparison muddies attribution and can make the premium edit look optional. If the client wants a test, compare different posts in different weeks with the same CTA and measurement window.

## Working Pricing Recommendation

Treat `$997/month` as a founding-client price, not the permanent list price.

| Package | Monthly output | Founding price | Source review included |
| --- | ---: | ---: | ---: |
| Weekly | 4 educational clips | $997 | 4 source hours |
| Twice weekly | 8 educational clips | $1,850 | 8 source hours |
| Weekday daily | 20 educational clips | $3,750 | 16 source hours |

Charge `$150` for each additional source hour. This handles the real difference between reviewing a 20-minute episode and a 90-minute episode without creating confusing duration-based packages.

The proposed `$8,000` long-form offer needs a fixed scope before sale. A workable starting point is four long-form edits per month, up to 90 delivered minutes each, four thumbnails, 48-hour turnaround after asset receipt, and a defined revision limit. Derivative shorts should either be explicitly included or sold as a separate package.

## Creative Evidence Standard

Relevant visual signaling is the defensible creative principle: arrows, labels, headings, and persistent numbers should direct attention to the idea being explained. Decorative B-roll and unrelated sound effects should be minimized because irrelevant details can interfere with retention and transfer.

Research references:

- [Why does signaling enhance multimedia learning? Evidence from eye movements](https://www.sciencedirect.com/science/article/pii/S0747563209001459)
- [A meta-analysis of the signaling principle in multimedia learning environments](https://rex.libraries.wsu.edu/esploro/outputs/journalArticle/A-meta-analysis-of-signaling-principle-in/99900601052901842)
- [A review and meta-analysis of the seductive detail effect](https://www.sciencedirect.com/science/article/abs/pii/S1747938X12000413)

Do not claim that any sound or image automatically improves recall. The visual or audio cue must be relevant to the spoken idea.
