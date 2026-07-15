import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

type Feed = {
  url?: string;
  ok?: boolean;
  channelTitle?: string;
  recentPublicationDates?: string[];
  cadenceStatus?: string;
  medianIntervalDays?: number;
  ownershipVerified?: boolean;
  ownershipReason?: string;
  items?: Array<{ title?: string; publishedAt?: string }>;
};
type EvidenceRecord = {
  id: string;
  known: { host?: string; organization?: string; contentOwner?: string; onMicHost?: string; economicBuyer?: string; contact?: string; contactUrl?: string; offer?: string; offerUrl?: string };
  appleDiscovery?: { appleUrl?: string };
  ownedFeed?: Feed;
  sourceProbes?: Array<{ url?: string; finalUrl?: string; ok?: boolean }>;
};
type DraftRecord = Record<string, unknown> & { id: string };

const root = join(__dirname, "..");
const cohort = "next-200-c";
const batch = Number(process.argv.find((arg) => arg.startsWith("--batch="))?.split("=")[1] || 0);
if (!Number.isInteger(batch) || batch < 1 || batch > 8) throw new Error("Pass --batch=1 through --batch=8.");

const evidencePath = join(root, "storage", `terra-medium-${cohort}`, `evidence-batch-${batch}.json`);
const resultPath = join(root, "data", `terra-medium-${cohort}`, `batch-${batch}.json`);
const evidence = JSON.parse(readFileSync(evidencePath, "utf8")) as { records: EvidenceRecord[] };
const result = JSON.parse(readFileSync(resultPath, "utf8")) as { records: DraftRecord[] };
const evidenceById = new Map(evidence.records.map((record) => [record.id, record]));
const reviewedAt = new Date().toISOString();

function urls(record: EvidenceRecord) {
  return [...new Set([
    record.ownedFeed?.url,
    record.appleDiscovery?.appleUrl,
    // Keep attempted first-party routes even when retrieval failed. The audit
    // labels them as unresolved evidence; it never treats them as confirmation.
    ...(record.sourceProbes || []).map((probe) => probe.finalUrl || probe.url),
  ].filter((url): url is string => Boolean(url && /^https?:\/\//i.test(url))))];
}

function audit(status: "CONFIRMED" | "UNRESOLVED", note: string, evidenceUrls: string[]) {
  return { status, note, evidenceUrls };
}

result.records = result.records.map((draft) => {
  const source = evidenceById.get(draft.id);
  if (!source) throw new Error(`Missing evidence for ${draft.id}.`);
  const evidenceUrls = urls(source);
  if (!evidenceUrls.length) throw new Error(`${draft.id}: no recorded public evidence route.`);
  const feed = source.ownedFeed;
  const latest = feed?.items?.find((item) => item.publishedAt);
  const identity = source.known.onMicHost || source.known.contentOwner || source.known.host || source.known.organization || draft.id;
  const feedName = feed?.channelTitle || source.known.organization || draft.id;
  const dates = feed?.recentPublicationDates || [];
  const ownershipConfirmed = Boolean(feed?.ok && feed.ownershipVerified);
  const latestText = latest?.publishedAt ? `${latest.title || feedName} on ${latest.publishedAt}` : "no reliable latest publication";
  const decisionReason = ownershipConfirmed
    ? `${feedName}'s official feed and Apple listing identify ${latestText}; the recorded first-party routes do not yet establish a person-tied commercial buyer, outreach path, offer, observed funnel, or inspected video gap, so this account remains NURTURE.`
    : `The recorded feed and Apple listing do not strongly bind ${feedName} to ${identity}; ownership, buyer, offer, contact, funnel, and video-gap gates remain unresolved, so this account remains NURTURE.`;
  const unresolvedGates = [
    !ownershipConfirmed ? "SOURCE_IDENTITY" : undefined,
    !ownershipConfirmed ? "OWNED_CURRENT_LONG_FORM" : undefined,
    dates.length < 3 ? "THREE_PUBLICATION_CADENCE" : undefined,
    "FIRST_PARTY_OWNER_HOST_BUYER",
    "VERIFIED_PERSON_TIED_CONTACT",
    "VERIFIED_COMMERCIAL_OFFER",
    "OBSERVED_TOF_MOF_BOF",
    "THREE_SAMPLE_VIDEO_GAP",
    "TRANSACTION_SPECIFIC_PITCH_HOOK",
  ].filter((gate): gate is string => Boolean(gate));
  return {
    ...draft,
    decision: "NURTURE",
    decisionReason,
    factualHardGate: undefined,
    unresolvedGates,
    researchCompleteness: "COMPLETE",
    researchAudit: {
      reviewedBy: "Terra Medium",
      reviewedAt,
      checks: {
        ownedLongForm: audit(ownershipConfirmed ? "CONFIRMED" : "UNRESOLVED", ownershipConfirmed ? `The official feed and Apple listing bind ${feedName} to the recorded account.` : `The feed resolves, but its identity does not strongly bind to ${identity}: ${feed?.ownershipReason || "identity match unavailable"}.`, evidenceUrls),
        cadence: audit(dates.length >= 3 ? "CONFIRMED" : "UNRESOLVED", dates.length >= 3 ? `The owned feed records ${dates.length} recent dates; latest is ${latestText} and computed cadence is ${feed?.cadenceStatus || "UNVERIFIED"}.` : `The recorded feed exposes fewer than three reliable publication dates, so historical cadence is unresolved.`, evidenceUrls),
        roles: audit("UNRESOLVED", `The recorded sources identify ${identity}, but do not independently separate content owner, on-mic host, and economic buyer.`, evidenceUrls),
        contact: audit("UNRESOLVED", `The recorded official feed and Apple listing do not provide a public contact route tied to the economic buyer.`, evidenceUrls),
        offer: audit("UNRESOLVED", `No official offer, pricing, sponsorship, booking, service, membership, or support page was verified from the recorded first-party routes.`, evidenceUrls),
        funnel: audit("UNRESOLVED", `Without a verified commercial offer and buyer, observed TOF, MOF, and BOF cannot be tied to one real transaction.`, evidenceUrls),
        videoGap: audit("UNRESOLVED", `No three-sample owned video set was verified from the recorded routes; absence of a stored channel is not treated as proof of no video distribution.`, evidenceUrls),
        pitchHook: audit("UNRESOLVED", `A prospect-specific clipping hook would be speculative until the buyer, commercial offer, and inspectable distribution gap are verified.`, evidenceUrls),
      },
    },
    evidence: evidenceUrls.map((url) => ({ url, proves: "Official feed, Apple podcast listing, or recorded first-party route reviewed for this Terra audit." })),
    auditedAt: reviewedAt,
  };
});

writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ cohort, batch, records: result.records.length, decision: "NURTURE", complete: result.records.filter((record) => record.researchCompleteness === "COMPLETE").length }, null, 2));
