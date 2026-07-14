import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..");
const cohort = process.argv.find((arg) => arg.startsWith("--cohort="))?.split("=")[1] || "next-200";
if (!/^[a-z0-9-]+$/.test(cohort)) throw new Error("Cohort must use lowercase letters, numbers, and hyphens only.");
const inputRoot = join(root, "data", `terra-medium-${cohort}`);
const records: Array<{ id?: string }> = [];
for (let batch = 1; batch <= 8; batch += 1) {
  const path = join(inputRoot, `batch-${batch}.json`);
  if (!existsSync(path)) throw new Error(`Missing batch ${batch}; Terra Medium must complete all eight batches first.`);
  const result = JSON.parse(readFileSync(path, "utf8")) as { methodology?: string; batch?: number; records?: Array<{ id?: string }> };
  if (result.methodology !== "terra-medium-recovery-v1" || result.batch !== batch || result.records?.length !== 25) {
    throw new Error(`Batch ${batch} has invalid methodology, batch number, or record count.`);
  }
  records.push(...result.records);
}
if (records.length !== 200) throw new Error(`Expected 200 Terra Medium records, found ${records.length}.`);
if (records.some((record) => !record.id) || new Set(records.map((record) => record.id)).size !== 200) {
  throw new Error("Terra Medium result contains missing or duplicate prospect IDs.");
}
const output = {
  methodology: "terra-medium-recovery-v1",
  cohort,
  generatedAt: new Date().toISOString(),
  solReviewStatus: "PENDING",
  warning: "These are Terra Medium research decisions. They are not final until Sol audits every promotion, every nurture record, and a deterministic rejection sample.",
  total: records.length,
  records,
};
mkdirSync(inputRoot, { recursive: true });
writeFileSync(join(root, "data", `terra-medium-${cohort}.json`), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ cohort, total: records.length, solReviewStatus: output.solReviewStatus }, null, 2));
