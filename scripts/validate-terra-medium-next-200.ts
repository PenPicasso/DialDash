import { existsSync, readFileSync } from "fs";
import { join } from "path";

type Decision = "PURSUE_NOW" | "NURTURE" | "DISQUALIFIED_CONFIRMED";
type Resolution = {
  id: string;
  researchCompleteness?: "DRAFT" | "COMPLETE";
  researchAudit?: {
    reviewedBy?: string;
    reviewedAt?: string;
    checks?: Record<string, { status?: "CONFIRMED" | "UNRESOLVED" | "NOT_APPLICABLE"; note?: string; evidenceUrls?: string[] }>;
  };
  decision: Decision;
  decisionReason: string;
  contentOwner?: string;
  onMicHost?: string;
  economicBuyer?: string;
  contact?: { channel?: string; value?: string; evidenceUrl?: string };
  ownedLongForm?: { type?: string; latestTitle?: string; latestPublishedAt?: string; evidenceUrl?: string; recentPublicationDates?: string[]; cadenceStatus?: string; medianIntervalDays?: number };
  offer?: { description?: string; evidenceUrl?: string };
  observedFunnel?: { tof?: string[]; mof?: string[]; bof?: string[] };
  videoGap?: { distribution?: string; educationalQuality?: string; reason?: string; evidenceUrls?: string[] };
  pitchHook?: string;
  factualHardGate?: string;
  unresolvedGates?: string[];
  evidence?: Array<{ url: string; proves: string }>;
  auditedAt?: string;
};

const root = join(__dirname, "..");
const batch = Number(process.argv.find((arg) => arg.startsWith("--batch="))?.split("=")[1] || 0);
const cohort = process.argv.find((arg) => arg.startsWith("--cohort="))?.split("=")[1] || "next-200";
const allowDraft = process.argv.includes("--allow-draft");
if (!/^[a-z0-9-]+$/.test(cohort)) throw new Error("Cohort must use lowercase letters, numbers, and hyphens only.");
if (!Number.isInteger(batch) || batch < 1 || batch > 8) throw new Error("Pass --batch=1 through --batch=8.");
const manifestPath = join(root, "storage", `sol-${cohort}`, `batch-${batch}.json`);
const resultPath = join(root, "data", `terra-medium-${cohort}`, `batch-${batch}.json`);
if (!existsSync(manifestPath)) throw new Error(`Create the ${cohort} manifest first.`);
if (!existsSync(resultPath)) throw new Error(`Missing Terra Medium result: ${resultPath}`);

const expected = JSON.parse(readFileSync(manifestPath, "utf8")) as { records: Array<{ id: string }> };
const result = JSON.parse(readFileSync(resultPath, "utf8")) as { methodology: string; cohort?: string; batch: number; records: Resolution[] };
const errors: string[] = [];
const expectedIds = expected.records.map((record) => record.id).sort();
const actualIds = result.records.map((record) => record.id).sort();
const url = (value?: string) => Boolean(value && /^https?:\/\//i.test(value));
const genericRejection = /could not verify|did not verify|missing evidence|unverified|incomplete chain|cannot be (?:factually )?rejected|remaining .+ require manual/i;
const factualHardGates = new Set([
  "INACTIVE_OVER_90_DAYS",
  "CORPORATE_MONOLITH",
  "WRONG_ICP",
  "NON_ENGLISH",
  "DUPLICATE_ACCOUNT",
  "NO_NAMED_HUMAN_BY_DESIGN",
  "EXISTING_STRONG_VIDEO_CAPABILITY",
  "NO_COMMERCIAL_TRANSACTION",
]);
const now = Date.now();
const ninetyDaysMs = 90 * 24 * 60 * 60 * 1_000;
const requiredAuditChecks = ["ownedLongForm", "cadence", "roles", "contact", "offer", "funnel", "videoGap", "pitchHook"];

if (result.methodology !== "terra-medium-recovery-v1" || result.batch !== batch || (result.cohort && result.cohort !== cohort)) errors.push("Unexpected methodology, cohort, or batch number.");
if (result.records.length !== 25 || JSON.stringify(expectedIds) !== JSON.stringify(actualIds)) errors.push("Result IDs must exactly match the fixed 25-record batch.");
if (new Set(actualIds).size !== 25) errors.push("Batch contains duplicate IDs.");

for (const record of result.records) {
  const structurallyCompleteExclusion = record.decision === "DISQUALIFIED_CONFIRMED" && Boolean(record.factualHardGate) && !record.unresolvedGates?.length;
  if (!allowDraft && record.researchCompleteness !== "COMPLETE" && !structurallyCompleteExclusion) errors.push(`${record.id}: research is a deterministic draft, not a completed manual review.`);
  if (record.researchCompleteness === "DRAFT" && record.decision !== "NURTURE") errors.push(`${record.id}: a draft record must remain NURTURE.`);
  if (record.researchCompleteness === "COMPLETE") {
    if (!record.researchAudit?.reviewedBy || !record.researchAudit?.reviewedAt) errors.push(`${record.id}: complete research requires a named reviewer and review timestamp.`);
    const reviewedAt = new Date(record.researchAudit?.reviewedAt || "").getTime();
    if (!Number.isFinite(reviewedAt) || reviewedAt > now + 60_000) errors.push(`${record.id}: complete research has an invalid review timestamp.`);
    for (const check of requiredAuditChecks) {
      const audit = record.researchAudit?.checks?.[check];
      if (!audit || !audit.status || !audit.note || audit.note.length < 24) errors.push(`${record.id}: complete research is missing the ${check} audit note.`);
      if (audit?.status !== "NOT_APPLICABLE" && !audit?.evidenceUrls?.some(url)) errors.push(`${record.id}: ${check} needs a first-party evidence URL or an explicit NOT_APPLICABLE finding.`);
    }
    const auditUrls = new Set(requiredAuditChecks.flatMap((check) => record.researchAudit?.checks?.[check]?.evidenceUrls || []).filter(url));
    if (auditUrls.size < 2) errors.push(`${record.id}: complete research requires at least two distinct evidence URLs across the audit.`);
  }
  if (!record.decisionReason || !record.auditedAt || !record.evidence?.length) errors.push(`${record.id}: missing reason, audit timestamp, or evidence.`);
  const auditedAt = new Date(record.auditedAt || "").getTime();
  if (!Number.isFinite(auditedAt) || auditedAt > now + 60_000) errors.push(`${record.id}: invalid or future audit timestamp.`);
  for (const item of record.evidence || []) if (!url(item.url) || item.proves.length < 12) errors.push(`${record.id}: invalid or unexplained evidence URL.`);
  if (record.ownedLongForm?.latestPublishedAt) {
    const latest = new Date(record.ownedLongForm.latestPublishedAt).getTime();
    if (!Number.isFinite(latest) || latest > now + 60_000) errors.push(`${record.id}: invalid or future latest publication.`);
  }
  for (const publishedAt of record.ownedLongForm?.recentPublicationDates || []) {
    const timestamp = new Date(publishedAt).getTime();
    if (!Number.isFinite(timestamp) || timestamp > now + 60_000) errors.push(`${record.id}: invalid or future cadence date.`);
  }
  if (record.decision === "PURSUE_NOW") {
    if (!record.contentOwner || !record.onMicHost || !record.economicBuyer || !record.contact?.value || !url(record.contact.evidenceUrl)) errors.push(`${record.id}: promotion missing owner, on-mic host, buyer, or verified contact.`);
    if (!record.ownedLongForm?.latestPublishedAt || !url(record.ownedLongForm.evidenceUrl) || (record.ownedLongForm.recentPublicationDates?.length || 0) < 3) errors.push(`${record.id}: promotion missing true latest publication or historical cadence dates.`);
    if (!["ACTIVE", "SEMI_ACTIVE"].includes(record.ownedLongForm?.cadenceStatus || "")) errors.push(`${record.id}: promotion failed cadence status.`);
    if (!Number.isFinite(record.ownedLongForm?.medianIntervalDays) || (record.ownedLongForm?.medianIntervalDays || 0) < 0) errors.push(`${record.id}: promotion missing calculated median cadence.`);
    const latest = new Date(record.ownedLongForm?.latestPublishedAt || "").getTime();
    if (!Number.isFinite(latest) || now - latest > ninetyDaysMs) errors.push(`${record.id}: promotion latest publication is older than 90 days.`);
    if (!record.offer?.description || !url(record.offer.evidenceUrl)) errors.push(`${record.id}: promotion missing a first-party offer.`);
    if (!record.observedFunnel?.tof?.length || !record.observedFunnel.mof?.length || !record.observedFunnel.bof?.length) errors.push(`${record.id}: promotion missing observed TOF/MOF/BOF.`);
    if (!record.videoGap?.reason || !record.videoGap.evidenceUrls?.length || record.videoGap.educationalQuality === "UNVERIFIED") errors.push(`${record.id}: promotion missing inspected video-gap evidence.`);
    if (record.videoGap?.educationalQuality === "WEAK" && (record.videoGap.evidenceUrls?.length || 0) < 3) errors.push(`${record.id}: weak-quality claim requires three inspected video samples.`);
    if (!record.pitchHook || record.pitchHook.length < 80) errors.push(`${record.id}: promotion missing a transaction-specific pitch hook.`);
    if (record.unresolvedGates?.length || record.factualHardGate) errors.push(`${record.id}: promotion cannot retain unresolved or failed gates.`);
  }
  if (record.decision === "NURTURE" && !record.unresolvedGates?.length) errors.push(`${record.id}: NURTURE must name unresolved gates.`);
  if (record.researchCompleteness === "DRAFT" && !record.unresolvedGates?.includes("SOURCE_IDENTITY") && /ownership remains unverified/i.test(record.evidence?.map((item) => item.proves).join(" ") || "")) errors.push(`${record.id}: unverified source ownership must remain an explicit gate.`);
  if (record.decision === "DISQUALIFIED_CONFIRMED") {
    if (!record.factualHardGate || genericRejection.test(record.decisionReason)) errors.push(`${record.id}: confirmed rejection requires a factual hard gate, not missing evidence.`);
    if (record.factualHardGate && !factualHardGates.has(record.factualHardGate)) errors.push(`${record.id}: unrecognized factual hard gate.`);
    if (record.unresolvedGates?.length) errors.push(`${record.id}: confirmed rejection cannot retain unresolved gates.`);
  }
}

console.log(`Terra Medium ${cohort} validation batch ${batch}`);
console.log(`- records: ${result.records.length}`);
console.log(`- decisions: ${JSON.stringify(result.records.reduce<Record<string, number>>((counts, record) => { counts[record.decision] = (counts[record.decision] || 0) + 1; return counts; }, {}))}`);
console.log(`- errors: ${errors.length}`);
for (const error of errors) console.error(`ERROR: ${error}`);
if (errors.length) process.exit(1);
