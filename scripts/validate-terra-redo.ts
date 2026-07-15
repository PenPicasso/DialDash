import { existsSync, readFileSync } from "fs";
import { join } from "path";

type QueueRecord = { id: string; sourceBatch: number };
type Resolution = {
  id: string;
  researchCompleteness?: string;
  researchAudit?: { reviewedBy?: string; reviewedAt?: string; checks?: Record<string, { status?: string; note?: string; evidenceUrls?: string[] }> };
  decision?: string;
  decisionReason?: string;
  factualHardGate?: string;
  unresolvedGates?: string[];
  evidence?: Array<{ url?: string }>;
  contentOwner?: string;
  onMicHost?: string;
  economicBuyer?: string;
  contact?: { value?: string; evidenceUrl?: string };
  ownedLongForm?: { latestPublishedAt?: string; evidenceUrl?: string; recentPublicationDates?: string[]; cadenceStatus?: string };
  offer?: { description?: string; evidenceUrl?: string };
  observedFunnel?: { tof?: string[]; mof?: string[]; bof?: string[] };
  videoGap?: { reason?: string; evidenceUrls?: string[]; educationalQuality?: string };
  pitchHook?: string;
};

const root = join(__dirname, "..");
const cohort = process.argv.find((arg) => arg.startsWith("--cohort="))?.split("=")[1] || "next-200-b";
const batch = Number(process.argv.find((arg) => arg.startsWith("--batch="))?.split("=")[1] || 0);
if (!/^[a-z0-9-]+$/.test(cohort) || !Number.isInteger(batch) || batch < 1) throw new Error("Pass a valid --cohort and positive --batch=N.");
const queuePath = join(root, "storage", `terra-redo-${cohort}`, `batch-${batch}.json`);
if (!existsSync(queuePath)) throw new Error(`Missing redo queue batch ${batch}.`);
const queue = JSON.parse(readFileSync(queuePath, "utf8")) as { records: QueueRecord[] };
const sourceCache = new Map<number, Map<string, Resolution>>();
const checks = ["ownedLongForm", "cadence", "roles", "contact", "offer", "funnel", "videoGap", "pitchHook"];
const errors: string[] = [];
const url = (value?: string) => Boolean(value && /^https?:\/\//i.test(value));
const generic = /remaining owner, buyer, contact|require manual first-party review/i;

for (const queued of queue.records) {
  if (!sourceCache.has(queued.sourceBatch)) {
    const path = join(root, "data", `terra-medium-${cohort}`, `batch-${queued.sourceBatch}.json`);
    const payload = JSON.parse(readFileSync(path, "utf8")) as { records: Resolution[] };
    sourceCache.set(queued.sourceBatch, new Map(payload.records.map((record) => [record.id, record])));
  }
  const record = sourceCache.get(queued.sourceBatch)?.get(queued.id);
  if (!record) { errors.push(`${queued.id}: missing from source batch ${queued.sourceBatch}.`); continue; }
  if (record.researchCompleteness !== "COMPLETE" || !record.researchAudit?.reviewedBy || !record.researchAudit.reviewedAt) errors.push(`${queued.id}: missing completed research audit.`);
  if (generic.test(record.decisionReason || "")) errors.push(`${queued.id}: retained generic draft language.`);
  for (const check of checks) {
    const audit = record.researchAudit?.checks?.[check];
    if (!audit?.status || !audit.note || audit.note.length < 24) errors.push(`${queued.id}: incomplete ${check} audit.`);
    if (audit?.status !== "NOT_APPLICABLE" && !audit?.evidenceUrls?.some(url)) errors.push(`${queued.id}: ${check} lacks evidence.`);
  }
  const evidenceUrls = new Set((record.evidence || []).map((item) => item.url).filter((value): value is string => Boolean(value && url(value))));
  if (evidenceUrls.size < 2) errors.push(`${queued.id}: fewer than two distinct review sources.`);
  if (record.decision === "NURTURE" && !record.unresolvedGates?.length) errors.push(`${queued.id}: NURTURE lacks explicit unresolved gates.`);
  if (record.decision === "DISQUALIFIED_CONFIRMED" && (!record.factualHardGate || record.unresolvedGates?.length)) errors.push(`${queued.id}: confirmed exclusion lacks a clean factual hard gate.`);
  if (record.decision === "PURSUE_NOW") {
    if (!record.contentOwner || !record.onMicHost || !record.economicBuyer || !record.contact?.value || !url(record.contact.evidenceUrl)) errors.push(`${queued.id}: promotion lacks owner, host, buyer, or contact.`);
    if (!record.ownedLongForm?.latestPublishedAt || !url(record.ownedLongForm.evidenceUrl) || (record.ownedLongForm.recentPublicationDates?.length || 0) < 3 || !["ACTIVE", "SEMI_ACTIVE"].includes(record.ownedLongForm.cadenceStatus || "")) errors.push(`${queued.id}: promotion lacks current owned long-form cadence.`);
    if (!record.offer?.description || !url(record.offer.evidenceUrl) || !record.observedFunnel?.tof?.length || !record.observedFunnel.mof?.length || !record.observedFunnel.bof?.length) errors.push(`${queued.id}: promotion lacks offer or observed funnel.`);
    if (!record.videoGap?.reason || !record.videoGap.evidenceUrls?.length || record.videoGap.educationalQuality === "UNVERIFIED" || !record.pitchHook || record.pitchHook.length < 80) errors.push(`${queued.id}: promotion lacks video-gap proof or pitch hook.`);
    if (record.unresolvedGates?.length || record.factualHardGate) errors.push(`${queued.id}: promotion retains unresolved or failed gates.`);
  }
}

console.log(`Terra redo validation ${cohort} batch ${batch}`);
console.log(`- records: ${queue.records.length}`);
console.log(`- source batches: ${[...sourceCache.keys()].join(", ")}`);
console.log(`- errors: ${errors.length}`);
for (const error of errors) console.error(`ERROR: ${error}`);
if (errors.length) process.exit(1);
