import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "storage", "sol-final-31", "manifest.json"), "utf8")) as {
  methodology: string;
  cohort: string;
  priorReviewedDashboardIds: number;
  cohortHash: string;
  records: Array<{ id: string; batch: number; auditSample: boolean }>;
};
const errors: string[] = [];
if (manifest.methodology !== "sol-final-recovery-v1" || manifest.cohort !== "final-31") errors.push("Unexpected final cohort metadata.");
if (manifest.priorReviewedDashboardIds !== 809) errors.push(`Expected 809 reviewed dashboard IDs; found ${manifest.priorReviewedDashboardIds}.`);
if (manifest.records.length !== 31 || new Set(manifest.records.map((record) => record.id)).size !== 31) errors.push("Final cohort must contain exactly 31 unique records.");
if (manifest.records.filter((record) => record.batch === 1).length !== 25 || manifest.records.filter((record) => record.batch === 2).length !== 6) errors.push("Final cohort batches must be 25 and 6 records.");
const hash = createHash("sha256").update(manifest.records.map((record) => record.id).join("\n")).digest("hex");
if (hash !== manifest.cohortHash) errors.push("Final cohort hash does not match its ordered IDs.");
console.log(`Sol final-31 manifest validation\n- records: ${manifest.records.length}\n- batches: 25, 6\n- audit sample: ${manifest.records.filter((record) => record.auditSample).length}\n- errors: ${errors.length}`);
for (const error of errors) console.error(`ERROR: ${error}`);
if (errors.length) process.exit(1);
