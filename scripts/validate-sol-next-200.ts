import { readFileSync } from "fs";
import { join } from "path";

type Record = { id: string; batch: number; cohortLane: string; auditSample: boolean; recommendedDisposition: string; hardGateStatus?: Record<string, boolean> };
const root = join(__dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "storage", "sol-next-200", "manifest.json"), "utf8")) as { methodology: string; records: Record[]; selection: { judgmentCases: number; deterministicFalseNegativeAudit: number } };
const requestedBatch = Number(process.argv.find((arg) => arg.startsWith("--batch="))?.split("=")[1] || 0);
const rows = requestedBatch ? manifest.records.filter((record) => record.batch === requestedBatch) : manifest.records;
const errors: string[] = [];

if (manifest.methodology !== "sol-recovery-v3") errors.push("Unexpected methodology version.");
if (manifest.records.length !== 200) errors.push("Cohort must contain exactly 200 records.");
if (new Set(manifest.records.map((record) => record.id)).size !== 200) errors.push("Cohort contains duplicate IDs.");
if (manifest.selection.judgmentCases !== 167 || manifest.selection.deterministicFalseNegativeAudit !== 33) errors.push("Cohort lanes must be 167 judgment records plus 33 false-negative audit records.");
for (let batch = 1; batch <= 8; batch += 1) if (manifest.records.filter((record) => record.batch === batch).length !== 25) errors.push(`Batch ${batch} must contain 25 records.`);
for (const record of rows) {
  if (!record.id || !record.cohortLane) errors.push("Record is missing identity or cohort lane.");
  if (record.recommendedDisposition === "PURSUE_NOW" && !Object.values(record.hardGateStatus || {}).every(Boolean)) errors.push(`${record.id}: light pass cannot be promoted with a failed gate.`);
}

console.log(`Sol next-200 manifest validation${requestedBatch ? ` batch ${requestedBatch}` : ""}`);
console.log(`- records checked: ${rows.length}`);
console.log(`- judgment lane: ${manifest.records.filter((record) => record.cohortLane === "JUDGMENT").length}`);
console.log(`- false-negative audit lane: ${manifest.records.filter((record) => record.cohortLane === "FALSE_NEGATIVE_AUDIT").length}`);
console.log(`- errors: ${errors.length}`);
for (const error of errors) console.error(`ERROR: ${error}`);
if (errors.length) process.exit(1);
