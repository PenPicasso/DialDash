import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

type ReviewRecord = { id: string; outcome: "ACCEPTED" | "RETURNED_TO_RESEARCH"; auditSample: boolean };
type ManifestRecord = { id: string; batch: number; fitRank?: number; fitScore?: number; cohortLane?: string; auditSample?: boolean };

const root = join(__dirname, "..");
const cohort = process.argv.find((arg) => arg.startsWith("--cohort="))?.split("=")[1] || "next-200-b";
if (!/^[a-z0-9-]+$/.test(cohort)) throw new Error("Cohort must use lowercase letters, numbers, and hyphens only.");
const reviewPath = join(root, "storage", `sol-${cohort}`, "review.json");
const manifestPath = join(root, "storage", `sol-${cohort}`, "manifest.json");
if (!existsSync(reviewPath) || !existsSync(manifestPath)) throw new Error("Run the Sol review before preparing a Terra redo queue.");

const review = JSON.parse(readFileSync(reviewPath, "utf8")) as { records: ReviewRecord[] };
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { records: ManifestRecord[] };
const manifestById = new Map(manifest.records.map((record) => [record.id, record]));
const records = review.records
  .filter((record) => record.outcome === "RETURNED_TO_RESEARCH")
  .map((record) => ({ ...record, manifest: manifestById.get(record.id) }))
  .sort((left, right) => (left.manifest?.fitRank || Number.MAX_SAFE_INTEGER) - (right.manifest?.fitRank || Number.MAX_SAFE_INTEGER));
if (!records.length) throw new Error("No returned records found.");
if (records.some((record) => !record.manifest)) throw new Error("A returned record is missing from the fixed Sol manifest.");

const outputRoot = join(root, "storage", `terra-redo-${cohort}`);
mkdirSync(outputRoot, { recursive: true });
const batches = Array.from({ length: Math.ceil(records.length / 25) }, (_, index) => ({
  batch: index + 1,
  records: records.slice(index * 25, (index + 1) * 25).map(({ manifest: source, auditSample }) => ({
    id: source!.id,
    sourceBatch: source!.batch,
    fitRank: source!.fitRank,
    fitScore: source!.fitScore,
    cohortLane: source!.cohortLane,
    auditSample,
  })),
}));
const output = {
  methodology: "terra-redo-v1",
  cohort,
  generatedAt: new Date().toISOString(),
  total: records.length,
  batches,
};
writeFileSync(join(outputRoot, "manifest.json"), `${JSON.stringify(output, null, 2)}\n`);
for (const batch of batches) writeFileSync(join(outputRoot, `batch-${batch.batch}.json`), `${JSON.stringify({ ...output, batches: undefined, batch: batch.batch, records: batch.records }, null, 2)}\n`);
console.log(JSON.stringify({ cohort, returnedToResearch: records.length, batches: batches.map((batch) => batch.records.length), outputRoot }, null, 2));
