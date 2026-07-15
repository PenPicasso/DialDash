import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

type Record = { id: string; batch: number; cohortLane: string; auditSample: boolean; recommendedDisposition: string; hardGateStatus?: globalThis.Record<string, boolean> };
type PriorReview = { reports?: Array<{ id: string }>; prospects?: Array<{ id: string; existingNodeId?: string }>; records?: Array<{ id: string }> };
const root = join(__dirname, "..");
const cohort = process.argv.find((arg) => arg.startsWith("--cohort="))?.split("=")[1] || "next-200";
if (!/^[a-z0-9-]+$/.test(cohort)) throw new Error("Cohort must use lowercase letters, numbers, and hyphens only.");
const manifest = JSON.parse(readFileSync(join(root, "storage", `sol-${cohort}`, "manifest.json"), "utf8")) as {
  methodology: string;
  cohort?: string;
  cohortHash?: string;
  records: Record[];
  selection: { judgmentCases: number; deterministicFalseNegativeAudit: number; excludedCohorts?: string[] };
};
const requestedBatch = Number(process.argv.find((arg) => arg.startsWith("--batch="))?.split("=")[1] || 0);
const rows = requestedBatch ? manifest.records.filter((record) => record.batch === requestedBatch) : manifest.records;
const errors: string[] = [];

if (manifest.methodology !== "sol-recovery-v3") errors.push("Unexpected methodology version.");
if (manifest.cohort && manifest.cohort !== cohort) errors.push("Manifest cohort does not match the requested cohort.");
if (manifest.records.length !== 200) errors.push("Cohort must contain exactly 200 records.");
if (new Set(manifest.records.map((record) => record.id)).size !== 200) errors.push("Cohort contains duplicate IDs.");
const expectedHash = createHash("sha256").update(manifest.records.map((record) => record.id).join("\n")).digest("hex");
if (manifest.cohortHash !== expectedHash) errors.push("Cohort hash does not match the fixed ordered record IDs.");
const excludedIds = new Set<string>();
for (const file of ["terra-review.json", "sol-review-round-2.json", "pilot-manifest.json"]) {
  const payload = JSON.parse(readFileSync(join(root, "data", file), "utf8")) as PriorReview;
  for (const record of payload.reports || []) excludedIds.add(record.id);
  for (const record of payload.prospects || []) excludedIds.add(record.existingNodeId || record.id);
}
for (const excludedCohort of manifest.selection.excludedCohorts || []) {
  const path = join(root, "data", `terra-medium-${excludedCohort}.json`);
  if (!existsSync(path)) errors.push(`Excluded cohort is missing: ${excludedCohort}.`);
  else {
    const payload = JSON.parse(readFileSync(path, "utf8")) as PriorReview;
    for (const record of payload.records || []) excludedIds.add(record.id);
  }
}
const overlaps = manifest.records.filter((record) => excludedIds.has(record.id));
if (overlaps.length) errors.push(`Cohort overlaps ${overlaps.length} prior reviewed or excluded records.`);
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
