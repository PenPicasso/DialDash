import { createHash } from "crypto";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { NodeData } from "../lib/types";

type PriorReview = { reports?: Array<{ id: string }>; prospects?: Array<{ id: string; existingNodeId?: string }>; records?: Array<{ id: string }>; solReviewStatus?: string };
const root = join(__dirname, "..");
const priorIds = new Set<string>();

for (const file of ["terra-review.json", "sol-review-round-2.json", "pilot-manifest.json"]) {
  const payload = JSON.parse(readFileSync(join(root, "data", file), "utf8")) as PriorReview;
  for (const record of payload.reports || []) priorIds.add(record.id);
  for (const record of payload.prospects || []) priorIds.add(record.existingNodeId || record.id);
}
for (const cohort of ["next-200", "next-200-b", "next-200-c"]) {
  const payload = JSON.parse(readFileSync(join(root, "data", `terra-medium-${cohort}.json`), "utf8")) as PriorReview;
  if (payload.solReviewStatus !== "PASSED") throw new Error(`${cohort} must pass Sol review before final-31 can be fixed.`);
  for (const record of payload.records || []) priorIds.add(record.id);
}

const nodes = (JSON.parse(readFileSync(join(root, "data", "nodes.json"), "utf8")) as { nodes: NodeData[] }).nodes;
const records = nodes
  .filter((node) => !priorIds.has(node.id))
  .sort((a, b) => (a.fitRank || Number.MAX_SAFE_INTEGER) - (b.fitRank || Number.MAX_SAFE_INTEGER))
  .map((node, index) => ({
    id: node.id,
    fitRank: node.fitRank,
    fitScore: node.fitScore,
    host: node.host,
    organization: node.organizationName,
    recommendedDisposition: node.methodologyDecision === "NURTURE" ? "NURTURE" : "DISQUALIFIED",
    evidence: [node.sourceEvidenceUrl, node.youtubeUrl, node.podcastAppleUrl, node.rssUrl].filter((value): value is string => Boolean(value)),
    ambiguities: node.methodologyReasons,
    batch: index < 25 ? 1 : 2,
    cohortLane: node.methodologyDecision === "NURTURE" ? "JUDGMENT" : "FALSE_NEGATIVE_AUDIT",
    auditSample: Number.parseInt(createHash("sha256").update(`sol-final-31:${node.id}`).digest("hex").slice(0, 2), 16) % 5 === 0,
  }));

if (records.length !== 31 || new Set(records.map((record) => record.id)).size !== 31) {
  throw new Error(`Expected exactly 31 unique remaining dashboard records; found ${records.length}.`);
}

const outputRoot = join(root, "storage", "sol-final-31");
mkdirSync(outputRoot, { recursive: true });
const manifest = {
  methodology: "sol-final-recovery-v1",
  cohort: "final-31",
  generatedAt: new Date().toISOString(),
  priorReviewedDashboardIds: nodes.filter((node) => priorIds.has(node.id)).length,
  cohortHash: createHash("sha256").update(records.map((record) => record.id).join("\n")).digest("hex"),
  records,
};
writeFileSync(join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
for (const batch of [1, 2]) {
  writeFileSync(join(outputRoot, `batch-${batch}.json`), `${JSON.stringify({ ...manifest, batch, records: records.filter((record) => record.batch === batch) }, null, 2)}\n`);
}
console.log(JSON.stringify({ total: records.length, batches: [25, 6], firstRank: records[0]?.fitRank, lastRank: records.at(-1)?.fitRank }, null, 2));
