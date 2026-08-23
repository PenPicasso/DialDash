import { readFileSync } from "fs";
import { join } from "path";

type Review = {
  methodology: string;
  total: number;
  counts: Record<string, number>;
  audit: { sampleSize: number; correctDecisions: number; passed: boolean; auditedPrecision: number };
  reports: Array<{
    id: string;
    batch: number;
    decision: string;
    decisionReason?: string;
    missingGates?: string[];
    buyer?: string;
    pointMan?: string;
    contact?: string;
    offer?: string;
    offerEvidenceUrl?: string;
    pitchHook?: string;
    videoGapReason?: string;
    videoGapEvidenceUrls?: string[];
    evidence?: unknown[];
  }>;
};

const requestedBatch = Number(process.argv.find((arg) => arg.startsWith("--batch="))?.split("=")[1] || 0);
const review = JSON.parse(readFileSync(join(__dirname, "..", "data", "terra-review.json"), "utf8")) as Review;
const errors: string[] = [];
const rows = requestedBatch ? review.reports.filter((report) => report.batch === requestedBatch) : review.reports;

if (review.methodology !== "sol-recovery-v1") errors.push("Unexpected methodology version.");
if (review.total !== 100 || review.reports.length !== 100) errors.push("Review must contain exactly 100 records.");
if (new Set(review.reports.map((report) => report.id)).size !== 100) errors.push("Review contains duplicate prospect IDs.");
if (requestedBatch && rows.length !== 25) errors.push(`Batch ${requestedBatch} must contain 25 records.`);
if (!review.audit.passed || review.audit.auditedPrecision < 0.9) errors.push("Audited precision is below the 90% stop threshold.");

for (const report of rows) {
  if (!report.decisionReason) errors.push(`${report.id}: missing decision reason.`);
  if (report.decision === "PURSUE_NOW") {
    for (const field of ["buyer", "pointMan", "contact", "offer", "offerEvidenceUrl", "pitchHook", "videoGapReason"] as const) {
      if (!report[field]) errors.push(`${report.id}: PURSUE_NOW missing ${field}.`);
    }
    if ((report.videoGapEvidenceUrls?.length || 0) < 3) errors.push(`${report.id}: PURSUE_NOW needs three visual-gap samples.`);
    if (!report.evidence?.length) errors.push(`${report.id}: PURSUE_NOW missing first-party evidence.`);
  }
  if (report.decision === "NURTURE" && !report.missingGates?.length) errors.push(`${report.id}: NURTURE must name unresolved gates.`);
}

console.log(`Terra Sol review validation${requestedBatch ? ` batch ${requestedBatch}` : ""}`);
console.log(`- records checked: ${rows.length}`);
console.log(`- decisions: ${JSON.stringify(rows.reduce<Record<string, number>>((acc, row) => { acc[row.decision] = (acc[row.decision] || 0) + 1; return acc; }, {}))}`);
console.log(`- audit precision: ${(review.audit.auditedPrecision * 100).toFixed(1)}% (${review.audit.correctDecisions}/${review.audit.sampleSize})`);
console.log(`- errors: ${errors.length}`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exit(1);
}
