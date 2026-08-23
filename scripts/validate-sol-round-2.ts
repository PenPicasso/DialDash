import { readFileSync } from "fs";
import { join } from "path";

type Report = {
  id: string;
  batch: number;
  decision: string;
  decisionReason?: string;
  latestPublishedAt?: string;
  sourceEvidenceUrl?: string;
  historicalCadence?: { status: string; latestGapDays?: number; medianIntervalDays?: number; observedPublications: number };
  buyer?: string;
  pointMan?: string;
  contact?: string;
  contactUrl?: string;
  offer?: string;
  offerEvidenceUrl?: string;
  pitchHook?: string;
  videoGapType?: string;
  videoGapReason?: string;
  videoGapEvidenceUrls: string[];
  evidence: unknown[];
  missingGates: string[];
};

const root = join(__dirname, "..");
const review = JSON.parse(readFileSync(join(root, "data", "sol-review-round-2.json"), "utf8")) as {
  methodology: string;
  total: number;
  counts: Record<string, number>;
  audit: { kind: string; limitation: string; sampleSize: number; passedChecks: number; passRate: number; passed: boolean };
  reports: Report[];
};
const first = JSON.parse(readFileSync(join(root, "data", "terra-review.json"), "utf8")) as { reports: Array<{ id: string }> };
const pilot = JSON.parse(readFileSync(join(root, "data", "pilot-manifest.json"), "utf8")) as { prospects: Array<{ id: string; existingNodeId?: string }> };
const requestedBatch = Number(process.argv.find((arg) => arg.startsWith("--batch="))?.split("=")[1] || 0);
const rows = requestedBatch ? review.reports.filter((report) => report.batch === requestedBatch) : review.reports;
const previous = new Set([...first.reports.map((report) => report.id), ...pilot.prospects.map((prospect) => prospect.existingNodeId || prospect.id)]);
const errors: string[] = [];

if (review.methodology !== "sol-recovery-v2.1") errors.push("Unexpected methodology version.");
if (review.total !== 100 || review.reports.length !== 100) errors.push("Round two must contain exactly 100 records.");
if (new Set(review.reports.map((report) => report.id)).size !== 100) errors.push("Round two contains duplicate IDs.");
for (const report of review.reports) if (previous.has(report.id)) errors.push(`${report.id}: overlaps a prior completed cohort.`);
for (let batch = 1; batch <= 4; batch += 1) if (review.reports.filter((report) => report.batch === batch).length !== 25) errors.push(`Batch ${batch} does not contain 25 records.`);
if (!review.audit.passed || review.audit.passRate < 0.9) errors.push("Evidence-and-hard-gate audit is below the 90% stop threshold.");
if (!review.audit.limitation.includes("not statistical")) errors.push("Audit must disclose that its pass rate is not statistical precision.");

for (const report of rows) {
  if (!report.decisionReason) errors.push(`${report.id}: missing decision reason.`);
  if (report.decision === "PURSUE_NOW") {
    for (const field of ["buyer", "pointMan", "contact", "contactUrl", "offer", "offerEvidenceUrl", "pitchHook", "videoGapType", "videoGapReason"] as const) {
      if (!report[field]) errors.push(`${report.id}: PURSUE_NOW missing ${field}.`);
    }
    if (report.evidence.length < 1) errors.push(`${report.id}: PURSUE_NOW missing first-party evidence.`);
    if (!report.latestPublishedAt || !report.sourceEvidenceUrl) errors.push(`${report.id}: PURSUE_NOW missing owned-source freshness evidence.`);
    if (!report.historicalCadence || !["ACTIVE", "SEMI_ACTIVE"].includes(report.historicalCadence.status) || report.historicalCadence.observedPublications < 2) {
      errors.push(`${report.id}: PURSUE_NOW failed historical cadence gate.`);
    }
    if (report.latestPublishedAt && Date.now() - new Date(report.latestPublishedAt).getTime() > 90 * 86_400_000) errors.push(`${report.id}: PURSUE_NOW freshness is over 90 days old.`);
    const requiredSamples = report.videoGapType === "WEAK_QUALITY" ? 3 : 1;
    if (report.videoGapEvidenceUrls.length < requiredSamples) errors.push(`${report.id}: video gap requires ${requiredSamples} evidence URL(s).`);
  }
  if (report.decision === "NURTURE" && report.missingGates.length === 0) errors.push(`${report.id}: NURTURE must state unresolved gates.`);
  if (report.decision === "DISQUALIFIED_CONFIRMED" && report.decisionReason.length < 35) errors.push(`${report.id}: exclusion reason is not specific enough.`);
}

console.log(`Sol round-two validation${requestedBatch ? ` batch ${requestedBatch}` : ""}`);
console.log(`- records checked: ${rows.length}`);
console.log(`- decisions: ${JSON.stringify(rows.reduce<Record<string, number>>((acc, row) => { acc[row.decision] = (acc[row.decision] || 0) + 1; return acc; }, {}))}`);
console.log(`- evidence/gate audit: ${(review.audit.passRate * 100).toFixed(1)}% (${review.audit.passedChecks}/${review.audit.sampleSize})`);
console.log(`- audit limitation: ${review.audit.limitation}`);
console.log(`- errors: ${errors.length}`);
for (const error of errors) console.error(`ERROR: ${error}`);
if (errors.length) process.exit(1);
