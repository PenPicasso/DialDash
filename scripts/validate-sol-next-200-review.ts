import { readFileSync } from "fs";
import { join } from "path";

type Report = { id: string; batch: number; decision: string; decisionSource: string; decisionReason: string; failedGates: string[]; sourceEvidenceUrls: string[]; owner?: string; buyer?: string; contactUrl?: string; offerUrl?: string; pitchHook?: string };
const root = join(__dirname, "..");
const review = JSON.parse(readFileSync(join(root, "data", "sol-review-next-200.json"), "utf8")) as { methodology: string; total: number; reports: Report[]; audit: { passRate: number; passed: boolean } };
const requestedBatch = Number(process.argv.find((arg) => arg.startsWith("--batch="))?.split("=")[1] || 0);
const rows = requestedBatch ? review.reports.filter((record) => record.batch === requestedBatch) : review.reports;
const errors: string[] = [];

if (review.methodology !== "sol-recovery-v3" || review.total !== 200 || review.reports.length !== 200) errors.push("Unexpected review cohort.");
if (new Set(review.reports.map((record) => record.id)).size !== 200) errors.push("Review has duplicate IDs.");
if (!review.audit.passed || review.audit.passRate < 0.9) errors.push("Evidence-and-hard-gate audit is below the 90% stop threshold.");
for (let batch = 1; batch <= 8; batch += 1) if (review.reports.filter((record) => record.batch === batch).length !== 25) errors.push(`Batch ${batch} must contain 25 records.`);
for (const record of rows) {
  if (!record.decisionReason || record.sourceEvidenceUrls.length === 0) errors.push(`${record.id}: missing decision reason or source evidence.`);
  if (record.decision === "PURSUE_NOW" && (!record.owner || !record.buyer || !record.contactUrl || !record.offerUrl || !record.pitchHook)) errors.push(`${record.id}: promotion is missing a hard gate.`);
  if (record.decision === "DISQUALIFIED_CONFIRMED" && record.decisionSource !== "PRIOR_STRONG_MODEL_RESOLUTION" && record.failedGates.length === 0) errors.push(`${record.id}: failed-gate exclusion lacks a gate.`);
}
console.log(`Sol next-200 review validation${requestedBatch ? ` batch ${requestedBatch}` : ""}`);
console.log(`- records checked: ${rows.length}`);
console.log(`- errors: ${errors.length}`);
for (const error of errors) console.error(`ERROR: ${error}`);
if (errors.length) process.exit(1);
