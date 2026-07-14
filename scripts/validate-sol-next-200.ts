import { readFileSync } from "fs";
import { join } from "path";

type Record = { id: string; batch: number; cohortLane: string; auditSample: boolean; recommendedDisposition: string; hardGateStatus?: Record<string, boolean> };
const root = join(__dirname, "..");
const cohort = process.argv.find((arg) => arg.startsWith("--cohort="))?.split("=")[1] || "next-200";
if (!/^[a-z0-9-]+$/.test(cohort)) throw new Error("Cohort must use lowercase letters, numbers, and hyphens only.");
const manifest = JSON.parse(readFileSync(join(root, "storage", `sol-${cohort}`, "manifest.json"), "utf8")) as { methodology: string; cohort?: string; records: Record[]; selection: { judgmentCases: number; deterministicFalseNegativeAudit: number } };
const requestedBatch = Number(process.argv.find((arg) => arg.startsWith("--batch="))?.split("=")[1] || 0);
const rows = requestedBatch ? manifest.records.filter((record) => record.batch === requestedBatch) : manifest.records;
const errors: string[] = [];

if (manifest.methodology !== "sol-recovery-v3") errors.push("Unexpected methodology version.");
if (manifest.cohort && manifest.cohort !== cohort) errors.push("Manifest cohort does not match the requested cohort.");
if (manifest.records.length !== 200) errors.push("Cohort must contain exactly 200 records.");
if (new Set(manifest.records.map((record) => record.id)).size !== 200) errors.push("Cohort contains duplicate IDs.");
const actualJudgment = manifest.records.filter((record) => record.cohortLane === "JUDGMENT").length;
const actualAudit = manifest.records.filter((record) => record.cohortLane === "FALSE_NEGATIVE_AUDIT").length;
if (manifest.selection.judgmentCases !== actualJudgment || manifest.selection.deterministicFalseNegativeAudit !== actualAudit || actualJudgment + actualAudit !== 200) errors.push("Cohort lane metadata does not match its records.");
for (let batch = 1; batch <= 8; batch += 1) if (manifest.records.filter((record) => record.batch === batch).length !== 25) errors.push(`Batch ${batch} must contain 25 records.`);
for (const record of rows) {
  if (!record.id || !record.cohortLane) errors.push("Record is missing identity or cohort lane.");
  if (record.recommendedDisposition === "PURSUE_NOW" && !Object.values(record.hardGateStatus || {}).every(Boolean)) errors.push(`${record.id}: light pass cannot be promoted with a failed gate.`);
}

console.log(`Sol ${cohort} manifest validation${requestedBatch ? ` batch ${requestedBatch}` : ""}`);
console.log(`- records checked: ${rows.length}`);
console.log(`- judgment lane: ${actualJudgment}`);
console.log(`- false-negative audit lane: ${actualAudit}`);
console.log(`- errors: ${errors.length}`);
for (const error of errors) console.error(`ERROR: ${error}`);
if (errors.length) process.exit(1);
