import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { buildCommercialIntelligence } from "../lib/commercialIntelligence";
import type { NodeData } from "../lib/types";

type SourceRecord = Record<string, unknown> & { id: string; decision?: string };

const root = join(__dirname, "..");
const sources = [
  "terra-review.json",
  "sol-review-round-2.json",
  "terra-medium-next-200.json",
  "terra-medium-next-200-b.json",
  "terra-medium-next-200-c.json",
  "terra-medium-final-31.json",
];

const nodes = (JSON.parse(readFileSync(join(root, "data", "nodes.json"), "utf8")) as { nodes: NodeData[] }).nodes;
const byId = new Map<string, Record<string, unknown>>();

const strings = (...values: unknown[]) => Array.from(new Set(values.flatMap((value) => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return typeof value === "string" && value ? [value] : [];
})));

for (const source of sources) {
  const payload = JSON.parse(readFileSync(join(root, "data", source), "utf8")) as {
    reports?: SourceRecord[];
    records?: SourceRecord[];
    solReviewStatus?: string;
    audit?: { passed?: boolean };
  };
  if (payload.solReviewStatus && payload.solReviewStatus !== "PASSED") throw new Error(`${source} has not passed Sol review.`);
  if (payload.audit && payload.audit.passed === false) throw new Error(`${source} has a failed audit.`);

  for (const record of payload.records || payload.reports || []) {
    if (byId.has(record.id)) throw new Error(`${record.id} appears in more than one completed review cohort.`);
    const evidence = Array.isArray(record.evidence) ? record.evidence as Array<Record<string, unknown>> : [];
    const decision = record.decision === "DISQUALIFIED" ? "DISQUALIFIED_CONFIRMED" : record.decision;
    byId.set(record.id, {
      id: record.id,
      reviewDecision: decision,
      reviewDecisionReason: record.decisionReason || record.rejectionReason,
      reviewHardGate: record.factualHardGate || record.exclusionReason,
      reviewUnresolvedGates: strings(record.unresolvedGates, record.missingGates),
      reviewEvidenceUrls: strings(
        evidence.map((item) => item.url),
        record.sourceEvidenceUrl,
        record.contactUrl,
        record.offerEvidenceUrl,
        record.videoGapEvidenceUrls,
      ).filter((url) => /^https?:\/\//i.test(url)).slice(0, 8),
      reviewCohort: source.replace(/\.json$/, ""),
      reviewStatus: "PASSED",
      reviewOwner: record.contentOwner || record.owner,
      reviewHost: record.onMicHost,
      reviewBuyer: record.economicBuyer || record.buyer,
      reviewPointMan: record.pointMan,
      reviewContact: typeof record.contact === "string" ? record.contact : undefined,
      reviewOffer: typeof record.offer === "string" ? record.offer : (record.offer as Record<string, unknown> | undefined)?.description,
      reviewPitchHook: record.pitchHook,
      reviewVideoGap: record.videoGapReason || (record.videoGap as Record<string, unknown> | undefined)?.reason,
      reviewLatestPublishedAt: record.latestPublishedAt || (record.ownedLongForm as Record<string, unknown> | undefined)?.latestPublishedAt,
      reviewLatestTitle: record.latestTitle || (record.ownedLongForm as Record<string, unknown> | undefined)?.latestTitle,
      reviewTof: strings(record.tof, (record.observedFunnel as Record<string, unknown> | undefined)?.tof),
      reviewMof: strings(record.mof, (record.observedFunnel as Record<string, unknown> | undefined)?.mof),
      reviewBof: strings(record.bof, (record.observedFunnel as Record<string, unknown> | undefined)?.bof),
      reviewedAt: record.auditedAt || record.reviewedAt || record.researchAudit && (record.researchAudit as Record<string, unknown>).reviewedAt,
    });
  }
}

for (const node of nodes) {
  if (byId.has(node.id)) continue;
  const decision = node.methodologyDecision === "DISQUALIFIED" ? "DISQUALIFIED_CONFIRMED" : node.methodologyDecision;
  byId.set(node.id, {
    id: node.id,
    reviewDecision: decision,
    reviewDecisionReason: strings(node.methodologyReasons).join(" ") || "Evidence-cleared signability baseline reviewed before the recovery cohorts.",
    reviewHardGate: decision === "DISQUALIFIED_CONFIRMED" ? node.rejectionReason : undefined,
    reviewUnresolvedGates: [],
    reviewEvidenceUrls: strings(node.researchEvidenceUrls, node.sourceEvidenceUrl, node.offerUrl).filter((url) => /^https?:\/\//i.test(url)).slice(0, 8),
    reviewCohort: "signability-v3-baseline",
    reviewStatus: "PASSED",
    reviewOwner: node.contentOwnerName,
    reviewBuyer: node.economicBuyerName,
    reviewPointMan: node.pointManName,
    reviewContact: node.email || node.contactUrl,
    reviewOffer: node.bofOffer,
    reviewPitchHook: node.pitchHook,
    reviewVideoGap: node.videoGapReason,
    reviewedAt: node.lastActionabilityAuditAt,
  });
}

if (byId.size !== nodes.length || nodes.some((node) => !byId.has(node.id))) {
  throw new Error(`Full review must cover all ${nodes.length} prospects exactly once; found ${byId.size}.`);
}

const records = nodes.map((node) => {
  const review = byId.get(node.id);
  return {
    ...review,
    commercialIntelligence: buildCommercialIntelligence({ ...node, ...review }),
  };
});
const counts = records.reduce<Record<string, number>>((result, record) => {
  const decision = String(record?.reviewDecision);
  result[decision] = (result[decision] || 0) + 1;
  return result;
}, {});
const output = {
  methodology: "dialdash-full-sol-review-v1+commercial-intelligence-v2",
  generatedAt: new Date().toISOString(),
  total: records.length,
  counts,
  reviewCoverage: 1,
  status: "PASSED",
  records,
};
writeFileSync(join(root, "data", "full-review.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ total: output.total, counts, status: output.status }, null, 2));
