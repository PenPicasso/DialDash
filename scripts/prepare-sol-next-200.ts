import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { NodeData } from "../lib/types";

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
type TerraCohort = { records: Array<{ id: string }> };

const root = join(__dirname, "..");
const cohort = process.argv.find((arg) => arg.startsWith("--cohort="))?.split("=")[1] || "next-200";
if (!/^[a-z0-9-]+$/.test(cohort)) throw new Error("Cohort must use lowercase letters, numbers, and hyphens only.");
const excludedCohorts = process.argv
  .filter((arg) => arg.startsWith("--exclude-cohort="))
  .map((arg) => arg.split("=")[1])
  .filter((value): value is string => Boolean(value));
const outputRoot = join(root, "storage", `sol-${cohort}`);
const queuePath = join(root, "storage", "prospect-runs", "sol-review-2026-07-14T15-05-47-171Z", "sol-review-queue.json");
const nodesPath = join(root, "data", "nodes.json");
const cohortSize = 200;
const judgmentTarget = 167;

function reviewedIds() {
  const first = JSON.parse(readFileSync(join(root, "data", "terra-review.json"), "utf8")) as Review;
  const second = JSON.parse(readFileSync(join(root, "data", "sol-review-round-2.json"), "utf8")) as Review;
  const pilot = JSON.parse(readFileSync(join(root, "data", "pilot-manifest.json"), "utf8")) as Pilot;
  return new Set([...first.reports, ...second.reports].map((record) => record.id).concat(pilot.prospects.map((record) => record.existingNodeId || record.id)));
}

function priorCohortIds() {
  const ids = new Set<string>();
  for (const previous of excludedCohorts) {
    const path = join(root, "data", `terra-medium-${previous}.json`);
    if (!existsSync(path)) throw new Error(`Excluded cohort does not exist: ${previous}.`);
    const ledger = JSON.parse(readFileSync(path, "utf8")) as TerraCohort;
    for (const record of ledger.records || []) ids.add(record.id);
  }
  return ids;
}

function rank(value?: number) {
  return value || Number.MAX_SAFE_INTEGER;
}

const complete = reviewedIds();
const prior = priorCohortIds();
const queue = JSON.parse(readFileSync(queuePath, "utf8")) as Queue;
const recoveryPool = (JSON.parse(readFileSync(nodesPath, "utf8")) as { nodes: NodeData[] }).nodes
  .filter((node) => !complete.has(node.id) && !prior.has(node.id) && node.methodologyDecision !== "PURSUE_NOW")
  .sort((a, b) => rank(a.fitRank) - rank(b.fitRank));
const fromNode = (node: NodeData): LightReport => ({
  id: node.id,
  fitRank: node.fitRank,
  fitScore: node.fitScore,
  host: node.host,
  organization: node.organizationName,
  recommendedDisposition: node.methodologyDecision === "NURTURE" ? "NURTURE" : "DISQUALIFIED",
  hardGateStatus: undefined,
  ambiguities: node.methodologyReasons,
  evidence: [node.sourceEvidenceUrl, node.youtubeUrl, node.podcastAppleUrl, node.rssUrl].filter((value): value is string => Boolean(value)),
  sourceRun: "production-fit-rank-recovery",
});
const useRecoveryPool = cohort !== "next-200";
const judgment = useRecoveryPool
  ? recoveryPool.filter((node) => node.methodologyDecision === "NURTURE").map(fromNode)
  : queue.solReview.filter((record) => !complete.has(record.id) && !prior.has(record.id)).sort((a, b) => rank(a.fitRank) - rank(b.fitRank));
const falseNegativeAudit = useRecoveryPool
  ? recoveryPool.filter((node) => node.methodologyDecision !== "NURTURE").map(fromNode)
  : queue.deterministicDisqualifications
    .filter((record) => !complete.has(record.id) && !prior.has(record.id) && !judgment.some((candidate) => candidate.id === record.id))
    .sort((a, b) => rank(a.fitRank) - rank(b.fitRank));
const selectedJudgment = judgment.slice(0, Math.min(judgmentTarget, judgment.length));
const selectedAudit = falseNegativeAudit.slice(0, cohortSize - selectedJudgment.length);
if (selectedJudgment.length + selectedAudit.length !== cohortSize) {
  throw new Error(`Expected ${cohortSize} records after exclusions; found ${selectedJudgment.length + selectedAudit.length}.`);
}
const records = [...selectedJudgment, ...selectedAudit]
  .sort((a, b) => rank(a.fitRank) - rank(b.fitRank))
  .slice(0, 200)
  .map((record, index) => ({
    ...record,
    batch: Math.floor(index / 25) + 1,
    cohortLane: selectedJudgment.some((candidate) => candidate.id === record.id) ? "JUDGMENT" : "FALSE_NEGATIVE_AUDIT",
    auditSample: Number.parseInt(createHash("sha256").update(`sol-${cohort}:${record.id}`).digest("hex").slice(0, 2), 16) % 5 === 0,
  }));

if (records.length !== 200) throw new Error(`Expected 200 records, found ${records.length}.`);
if (new Set(records.map((record) => record.id)).size !== records.length) throw new Error("Cohort contains duplicate IDs.");

mkdirSync(outputRoot, { recursive: true });
const manifest = {
  methodology: "sol-recovery-v3",
  cohort,
  generatedAt: new Date().toISOString(),
  sourceQueue: queuePath,
  selection: {
    judgmentCases: selectedJudgment.length,
    deterministicFalseNegativeAudit: selectedAudit.length,
    priorReviewIdsExcluded: complete.size,
    priorCohortIdsExcluded: prior.size,
    source: useRecoveryPool ? "production-fit-rank-recovery" : "sol-review-queue",
  },
  cohortHash: createHash("sha256").update(records.map((record) => record.id).join("\n")).digest("hex"),
  records,
};
writeFileSync(join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
for (let batch = 1; batch <= 8; batch += 1) {
  writeFileSync(join(outputRoot, `batch-${batch}.json`), `${JSON.stringify({ ...manifest, records: records.filter((record) => record.batch === batch) }, null, 2)}\n`);
}
console.log(JSON.stringify({ cohort, total: records.length, judgment: selectedJudgment.length, falseNegativeAudit: selectedAudit.length, batches: 8, firstRank: records[0]?.fitRank, lastRank: records.at(-1)?.fitRank }, null, 2));
