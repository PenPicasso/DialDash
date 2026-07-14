import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

type Probe = { url: string; ok: boolean; finalUrl?: string; title?: string };
type EvidenceRecord = {
  id: string;
  fitRank?: number;
  known: {
    contentOwner?: string;
    onMicHost?: string;
    economicBuyer?: string;
    pointMan?: string;
    contact?: string;
    contactUrl?: string;
    offer?: string;
    offerUrl?: string;
  };
  ownedFeed?: {
    url: string;
    ok: boolean;
    channelTitle?: string;
    items?: Array<{ title?: string; publishedAt?: string; url?: string }>;
    recentPublicationDates?: string[];
    cadenceStatus?: string;
    medianIntervalDays?: number;
    latestGapDays?: number;
  };
  sourceProbes: Array<Probe | undefined>;
  deterministicFinding: { decision: string; factualHardGate?: string; finding?: string };
};

const root = join(__dirname, "..");
const batch = Number(process.argv.find((arg) => arg.startsWith("--batch="))?.split("=")[1] || 0);
const cohort = process.argv.find((arg) => arg.startsWith("--cohort="))?.split("=")[1] || "next-200";
if (!/^[a-z0-9-]+$/.test(cohort)) throw new Error("Cohort must use lowercase letters, numbers, and hyphens only.");
if (!Number.isInteger(batch) || batch < 1 || batch > 8) throw new Error("Pass --batch=1 through --batch=8.");
const evidencePath = join(root, "storage", `terra-medium-${cohort}`, `evidence-batch-${batch}.json`);
if (!existsSync(evidencePath)) throw new Error(`Run research:terra-medium-evidence for batch ${batch} first.`);

const input = JSON.parse(readFileSync(evidencePath, "utf8")) as { records: EvidenceRecord[] };
const auditedAt = new Date().toISOString();

function source(record: EvidenceRecord) {
  if (record.ownedFeed?.ok) return { url: record.ownedFeed.url, proves: "The official owned feed supplies the channel identity, current episode titles, and publication dates." };
  const probe = record.sourceProbes.find((item) => item?.ok) || record.sourceProbes.find(Boolean);
  if (!probe) throw new Error(`${record.id}: no source URL is available for an evidence-safe NURTURE record.`);
  return { url: probe.finalUrl || probe.url, proves: probe.ok ? "The source URL resolves and supplies the currently available public prospect evidence." : "The source URL is the recorded public route, but its contents still require manual verification." };
}

const records = input.records.map((record) => {
  const latest = record.ownedFeed?.items?.find((item) => item.publishedAt);
  const ownedLongForm = record.ownedFeed?.ok && latest?.publishedAt ? {
    type: "PODCAST",
    latestTitle: latest.title || record.ownedFeed.channelTitle || "Latest owned-feed publication",
    latestPublishedAt: latest.publishedAt,
    evidenceUrl: record.ownedFeed.url,
    recentPublicationDates: record.ownedFeed.recentPublicationDates || [],
    cadenceStatus: record.ownedFeed.cadenceStatus || "UNVERIFIED",
    medianIntervalDays: record.ownedFeed.medianIntervalDays,
  } : undefined;

  const unresolvedGates = [
    !ownedLongForm ? "OWNED_CURRENT_LONG_FORM" : undefined,
    !ownedLongForm || (ownedLongForm.recentPublicationDates?.length || 0) < 3 ? "THREE_PUBLICATION_CADENCE" : undefined,
    "FIRST_PARTY_OWNER_HOST_BUYER",
    "VERIFIED_PERSON_TIED_CONTACT",
    "VERIFIED_COMMERCIAL_OFFER",
    "OBSERVED_TOF_MOF_BOF",
    "THREE_SAMPLE_VIDEO_GAP",
    "TRANSACTION_SPECIFIC_PITCH_HOOK",
    record.deterministicFinding.finding === "STALE_FEED_REQUIRES_CROSS_CHANNEL_TRUE_LATEST" ? "CROSS_CHANNEL_TRUE_LATEST" : undefined,
  ].filter((value): value is string => Boolean(value));
  const freshness = ownedLongForm
    ? `The official feed verifies ${ownedLongForm.latestTitle} at ${ownedLongForm.latestPublishedAt} with ${ownedLongForm.cadenceStatus.toLowerCase()} cadence.`
    : "No valid owned feed was resolved from the official URLs in this deterministic pass.";
  return {
    id: record.id,
    decision: "NURTURE",
    decisionReason: `${freshness} The remaining owner, buyer, contact, transaction, funnel, and video-quality gates require manual first-party review, so this record cannot be promoted or factually rejected.`,
    contentOwner: record.known.contentOwner,
    onMicHost: record.known.onMicHost,
    economicBuyer: record.known.economicBuyer,
    ownedLongForm,
    unresolvedGates,
    evidence: [source(record)],
    auditedAt,
  };
});

const outputRoot = join(root, "data", `terra-medium-${cohort}`);
mkdirSync(outputRoot, { recursive: true });
writeFileSync(join(outputRoot, `batch-${batch}.json`), `${JSON.stringify({ methodology: "terra-medium-recovery-v1", cohort, batch, records }, null, 2)}\n`);
console.log(JSON.stringify({ cohort, batch, records: records.length, decisions: records.reduce<Record<string, number>>((counts, record) => { counts[record.decision] = (counts[record.decision] || 0) + 1; return counts; }, {}) }, null, 2));
