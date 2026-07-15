import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

type Decision = "PURSUE_NOW" | "NURTURE" | "DISQUALIFIED_CONFIRMED";
type TerraRecord = {
  id: string;
  decision: Decision;
  decisionReason?: string;
  researchCompleteness?: "DRAFT" | "COMPLETE";
  factualHardGate?: string;
  unresolvedGates?: string[];
  evidence?: Array<{ url?: string; proves?: string }>;
  researchAudit?: {
    checks?: Record<string, { status?: string; note?: string; evidenceUrls?: string[] }>;
  };
};
type ManifestRecord = { id: string; auditSample?: boolean };
type AuditVerdict = { id: string; correct: boolean; notes: string };

const root = join(__dirname, "..");
const cohort = process.argv.find((arg) => arg.startsWith("--cohort="))?.split("=")[1] || "next-200";
const verbose = process.argv.includes("--verbose");
const minimumPrecision = 0.9;
if (!/^[a-z0-9-]+$/.test(cohort)) throw new Error("Cohort must use lowercase letters, numbers, and hyphens only.");

const terraPath = join(root, "data", `terra-medium-${cohort}.json`);
const manifestPath = join(root, "storage", `sol-${cohort}`, "manifest.json");
if (!existsSync(terraPath) || !existsSync(manifestPath)) throw new Error("Missing composed Terra result or Sol manifest.");
const terra = JSON.parse(readFileSync(terraPath, "utf8")) as {
  records: TerraRecord[];
  solReviewStatus?: string;
  warning?: string;
  solReview?: Record<string, unknown>;
};
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { records: ManifestRecord[] };
const durableVerdictPath = join(root, "data", `sol-${cohort}-audit-verdicts.json`);
const verdictPath = existsSync(durableVerdictPath)
  ? durableVerdictPath
  : join(root, "storage", `sol-${cohort}`, "audit-verdicts.json");
const verdicts = existsSync(verdictPath)
  ? JSON.parse(readFileSync(verdictPath, "utf8")) as AuditVerdict[]
  : [];
const verdictById = new Map(verdicts.map((verdict) => [verdict.id, verdict]));
const byManifest = new Map(manifest.records.map((record) => [record.id, record]));
const genericDraft = /remaining owner, buyer, contact, transaction, funnel, and video-quality gates require manual/i;
const bulkRouteAudit = /recorded first-party routes do not yet establish|recorded feed and Apple listing do not strongly bind/i;
const genericEvidenceClaim = "Official feed, Apple podcast listing, or recorded first-party route reviewed for this Terra audit.";

const records = terra.records.map((record) => {
  const substantiveChecks = ["roles", "contact", "offer", "funnel", "videoGap", "pitchHook"];
  const allSubstantiveChecksUnresolved = substantiveChecks.every((check) => record.researchAudit?.checks?.[check]?.status === "UNRESOLVED");
  const generatedRouteAudit = bulkRouteAudit.test(record.decisionReason || "")
    && allSubstantiveChecksUnresolved
    && Boolean(record.evidence?.length)
    && record.evidence?.every((item) => item.proves === genericEvidenceClaim);
  const implicitDraft = record.researchCompleteness !== "COMPLETE"
    || genericDraft.test(record.decisionReason || "")
    || generatedRouteAudit;
  const confirmedExclusion = record.decision === "DISQUALIFIED_CONFIRMED"
    && Boolean(record.factualHardGate)
    && Boolean(record.evidence?.some((item) => /^https?:\/\//i.test(item.url || "")))
    && !record.unresolvedGates?.length;
  const complete = !implicitDraft || confirmedExclusion;
  return {
    id: record.id,
    auditSample: Boolean(byManifest.get(record.id)?.auditSample),
    outcome: complete ? "ACCEPTED" : "RETURNED_TO_RESEARCH",
    reason: complete
      ? "Decision contains prospect-specific completed research or a factual exclusion with cited evidence."
      : generatedRouteAudit
        ? "The bulk-generated route audit leaves buyer, contact, offer, funnel, video gap, and pitch hook unresolved; COMPLETE is unsupported."
        : "The record is still an automated draft with unresolved manual gates.",
  };
});

const sample = records.filter((record) => record.auditSample);
const reviewedSample = sample.filter((record) => verdictById.has(record.id));
const correctSample = reviewedSample.filter((record) => verdictById.get(record.id)?.correct);
const precision = reviewedSample.length ? correctSample.length / reviewedSample.length : undefined;
const sampleComplete = reviewedSample.length === sample.length && sample.length > 0;
const returnedToResearch = records.filter((record) => record.outcome === "RETURNED_TO_RESEARCH").length;
const precisionPassed = precision !== undefined && precision >= minimumPrecision;
const passed = returnedToResearch === 0 && sampleComplete && precisionPassed;
const report = {
  methodology: "sol-terra-review-v1",
  cohort,
  reviewedAt: new Date().toISOString(),
  status: passed ? "PASSED" : "FAILED",
  minimumPrecision,
  totals: { records: records.length, accepted: records.length - returnedToResearch, returnedToResearch },
  audit: {
    requested: sample.length,
    reviewed: reviewedSample.length,
    correct: correctSample.length,
    coverage: sample.length ? Number((reviewedSample.length / sample.length).toFixed(4)) : 0,
    precision: precision === undefined ? null : Number(precision.toFixed(4)),
    passed: sampleComplete && precisionPassed,
  },
  blockers: passed ? [] : [
    ...(returnedToResearch ? [`${returnedToResearch} records remain automated drafts.`] : []),
    ...(sample.length === 0 ? ["The deterministic audit sample is empty."] : []),
    ...(!sampleComplete ? [`Only ${reviewedSample.length}/${sample.length} deterministic audit records have explicit Sol verdicts.`] : []),
    ...(precision !== undefined && precision < minimumPrecision ? [`Audited precision ${Math.round(precision * 100)}% is below the 90% gate.`] : []),
  ],
  records,
};
const outputRoot = join(root, "storage", `sol-${cohort}`);
mkdirSync(outputRoot, { recursive: true });
writeFileSync(join(outputRoot, "review.json"), `${JSON.stringify(report, null, 2)}\n`);
if (passed) {
  terra.solReviewStatus = "PASSED";
  terra.warning = "Sol's deterministic audit passed; production remains unchanged until an explicit promotion workflow is approved.";
  terra.solReview = {
    reviewedAt: report.reviewedAt,
    accepted: report.totals.accepted,
    returnedToResearch: report.totals.returnedToResearch,
    auditRequested: report.audit.requested,
    auditReviewed: report.audit.reviewed,
    auditPrecision: report.audit.precision,
  };
  writeFileSync(terraPath, `${JSON.stringify(terra, null, 2)}\n`);
}
console.log(JSON.stringify(verbose ? report : {
  methodology: report.methodology,
  cohort: report.cohort,
  status: report.status,
  minimumPrecision: report.minimumPrecision,
  totals: report.totals,
  audit: report.audit,
  blockers: report.blockers,
  reportPath: join(outputRoot, "review.json"),
}, null, 2));
if (!passed) process.exitCode = 1;
