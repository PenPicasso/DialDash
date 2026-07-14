import { createHash } from "crypto";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

type LightReport = {
  id: string;
  fitRank?: number;
  fitScore?: number;
  host?: string;
  organization?: string;
  recommendedDisposition: "PURSUE_NOW" | "NURTURE" | "DISQUALIFIED" | "ESCALATE";
  hardGateStatus?: Record<string, boolean>;
  ambiguities?: string[];
  evidence?: string[];
  sourceRun?: string;
};

type Queue = { solReview: LightReport[]; deterministicDisqualifications: LightReport[] };
type Review = { reports: Array<{ id: string }> };
type Pilot = { prospects: Array<{ id: string; existingNodeId?: string }> };

const root = join(__dirname, "..");
const outputRoot = join(root, "storage", "sol-next-200");
const queuePath = join(root, "storage", "prospect-runs", "sol-review-2026-07-14T15-05-47-171Z", "sol-review-queue.json");

function reviewedIds() {
  const first = JSON.parse(readFileSync(join(root, "data", "terra-review.json"), "utf8")) as Review;
  const second = JSON.parse(readFileSync(join(root, "data", "sol-review-round-2.json"), "utf8")) as Review;
  const pilot = JSON.parse(readFileSync(join(root, "data", "pilot-manifest.json"), "utf8")) as Pilot;
  return new Set([...first.reports, ...second.reports].map((record) => record.id).concat(pilot.prospects.map((record) => record.existingNodeId || record.id)));
}

function rank(value?: number) {
  return value || Number.MAX_SAFE_INTEGER;
}

const queue = JSON.parse(readFileSync(queuePath, "utf8")) as Queue;
const complete = reviewedIds();
const judgment = queue.solReview.filter((record) => !complete.has(record.id)).sort((a, b) => rank(a.fitRank) - rank(b.fitRank));
const falseNegativeAudit = queue.deterministicDisqualifications
  .filter((record) => !complete.has(record.id) && !judgment.some((candidate) => candidate.id === record.id))
  .sort((a, b) => rank(a.fitRank) - rank(b.fitRank))
  .slice(0, 33);
const records = [...judgment, ...falseNegativeAudit]
  .sort((a, b) => rank(a.fitRank) - rank(b.fitRank))
  .slice(0, 200)
  .map((record, index) => ({
    ...record,
    batch: Math.floor(index / 25) + 1,
    cohortLane: judgment.some((candidate) => candidate.id === record.id) ? "JUDGMENT" : "FALSE_NEGATIVE_AUDIT",
    auditSample: Number.parseInt(createHash("sha256").update(`sol-next-200:${record.id}`).digest("hex").slice(0, 2), 16) % 5 === 0,
  }));

if (records.length !== 200) throw new Error(`Expected 200 records, found ${records.length}.`);
if (new Set(records.map((record) => record.id)).size !== records.length) throw new Error("Cohort contains duplicate IDs.");

mkdirSync(outputRoot, { recursive: true });
const manifest = {
  methodology: "sol-recovery-v3",
  generatedAt: new Date().toISOString(),
  sourceQueue: queuePath,
  selection: {
    judgmentCases: judgment.length,
    deterministicFalseNegativeAudit: falseNegativeAudit.length,
    priorReviewIdsExcluded: complete.size,
  },
  cohortHash: createHash("sha256").update(records.map((record) => record.id).join("\n")).digest("hex"),
  records,
};
writeFileSync(join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
for (let batch = 1; batch <= 8; batch += 1) {
  writeFileSync(join(outputRoot, `batch-${batch}.json`), `${JSON.stringify({ ...manifest, records: records.filter((record) => record.batch === batch) }, null, 2)}\n`);
}
console.log(JSON.stringify({ total: records.length, judgment: judgment.length, falseNegativeAudit: falseNegativeAudit.length, batches: 8, firstRank: records[0]?.fitRank, lastRank: records.at(-1)?.fitRank }, null, 2));
