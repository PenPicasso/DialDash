# DialDash Light-Model Execution Mission

## Objective

Apply the evidence-gated prospect methodology to all 840 records in fit-ranked batches without allowing a low-cost model to invent buyers, offers, contacts, dates, or funnel logic.

The output is a sales queue for the fastest credible path to the first $997 monthly client. It is not a generic enrichment exercise.

## Model Split

### Deterministic code owns

- RSS, Apple Podcast, YouTube, and newsletter dates.
- Source identity checks and future-date rejection.
- Historical cadence calculations.
- Duplicate URL, domain, person, and show checks.
- Hard-gate enforcement.
- Fit-score arithmetic and ranking.
- Evidence URLs and audit timestamps.
- Preservation of the last verified value when a refresh fails.

### Light model owns

- Structured summaries of first-party pages.
- Extracting explicit named people and roles.
- Classifying an observed offer into a fixed taxonomy.
- Drafting a concise evidence-grounded pitch hook.
- Describing the observed TOF, MOF, and BOF without proposing a new funnel yet.
- Writing a one-paragraph research report from already collected evidence.

### Strong model owns

- Content owner versus on-mic host versus economic buyer disputes.
- Founder-led company versus corporate-monolith exceptions.
- Offer interpretation when the official page is ambiguous.
- Whether a video gap is commercially meaningful rather than merely low volume.
- Proposed Energy Dial funnel and sample angle.
- Final outreach copy.
- Every appealed disqualification and every record with conflicting evidence.

## Source Policy

Use, in order:

1. Owned RSS or Atom feed.
2. Apple Podcasts result that passes the podcast wrapper/kind/feed checks.
3. Owned YouTube channel feed or YouTube Data API.
4. Official creator, show, newsletter, service, pricing, membership, event, fund, or company page.
5. Public X or LinkedIn profile for contact-path verification only.
6. Search-engine snippets only to find an official page; snippets are not final evidence.

Do not use Firecrawl. Do not infer a paid offer from a title such as consultant, GP, analyst, or researcher. Do not infer a personal contact from a corporate social account.

## Batch Order

1. Rank all 840 using only deterministic and existing evidence.
2. Run `npm run research:batch -- --limit=25` to export the next unresolved fit-ranked queue without changing production.
3. Process `PURSUE_NOW` pilot survivors first.
4. Process the highest-scoring `NURTURE` records in batches of 25; increase only after sampled precision stays above 90%.
5. Revisit rejected records only when the score identifies a recoverable combination of recent owned content, named human, and public contact.
6. Never spend the same research depth on a bottom-quartile record as a top-25 record.

## Required Output Per Record

```json
{
  "id": "stable-record-id",
  "contentOwnerName": "Named person or null",
  "economicBuyerName": "Named person or null",
  "ownedLongForm": {
    "type": "PODCAST | YOUTUBE | NEWSLETTER | NONE",
    "latestTitle": "Exact title or null",
    "latestPublishedAt": "ISO timestamp or null",
    "evidenceUrl": "Official URL or null"
  },
  "observedOffer": {
    "type": "RESEARCH | ADVISORY | CONSULTING | MEMBERSHIP | SPONSORSHIP | EVENTS | RECRUITING | FUND | SERVICES | NONE",
    "description": "One factual sentence",
    "offerUrl": "Official URL or null"
  },
  "contact": {
    "channel": "EMAIL | X_DM | LINKEDIN | CONTACT_FORM | NONE",
    "publicUrl": "Public evidence URL or null"
  },
  "videoGap": {
    "distribution": "NO_CHANNEL | MINIMAL | LIGHT | PARTIAL | ESTABLISHED | UNVERIFIED",
    "educationalQuality": "WEAK | ADEQUATE | STRONG | UNVERIFIED",
    "reason": "Evidence-grounded sentence"
  },
  "observedFunnel": {
    "tof": [],
    "mof": [],
    "bof": []
  },
  "evidence": [],
  "ambiguities": [],
  "recommendedDisposition": "PURSUE_NOW | NURTURE | DISQUALIFIED | ESCALATE"
}
```

## Hard Gates

A light model may recommend `PURSUE_NOW` only when all are true:

- Owned English long-form source exists.
- Latest owned episode is within 90 days.
- Historical cadence does not show a material slowdown requiring caution.
- Named human content owner exists.
- Plausible economic buyer exists.
- Public, unguessed outreach path exists.
- Official offer page exists.
- No corporate-monolith condition exists.
- A real distribution or educational-quality gap exists.

Any failed or ambiguous gate returns `NURTURE`, `DISQUALIFIED`, or `ESCALATE`. Score never overrides a gate.

## Escalation Rules

Escalate to the strong model when:

- The host and buyer are different.
- The show belongs to a fund, university, large media network, public company, or trade association.
- Multiple channels have similar names.
- Apple, RSS, and YouTube disagree on ownership or freshness.
- An offer appears only in a biography or job title.
- The latest episode is current but cadence has slowed by at least 2.5 times.
- Short-form volume is high but educational visual quality is uncertain.
- A public contact route belongs to the brand rather than the named person.
- The light model uses words such as likely, probably, appears, may, or seems in a gate field.

## Quality Control

- First 30 records: strong-model review of 100%.
- Next 100: strong-model review of every escalation plus a random 20% sample.
- Remaining records: every escalation plus a random 10% sample.
- If sampled precision falls below 90%, stop the batch, correct the prompt/rules, and re-run the affected batch.
- Promotion precision matters more than recall. A valid lead left in `NURTURE` is cheaper than a false `PURSUE_NOW` that wastes a custom sample.

## Acceptance Tests

- No future-dated latest episode.
- No Apple music, album, or audiobook result accepted as a podcast.
- No guessed email.
- No BOF inferred from a title.
- No company-channel freshness borrowed by a person-owned show.
- Every `PURSUE_NOW` claim points to evidence.
- Every fit-score component is recomputable without an LLM.
- Production data changes only through an explicit promotion command.
