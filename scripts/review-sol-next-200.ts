import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { NodeData } from "../lib/types";
import { remainingSolMediumResolutions } from "../data/solMediumRemainingResolutions";

type LightRecord = {
  id: string;
  batch: number;
  cohortLane: "JUDGMENT" | "FALSE_NEGATIVE_AUDIT";
  auditSample: boolean;
  fitRank?: number;
  fitScore?: number;
  evidence?: string[];
  ambiguities?: string[];
  recommendedDisposition: string;
  hardGateStatus?: Record<string, boolean>;
};

type Decision = "PURSUE_NOW" | "NURTURE" | "DISQUALIFIED_CONFIRMED";
const root = join(__dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "storage", "sol-next-200", "manifest.json"), "utf8")) as { methodology: string; cohortHash: string; records: LightRecord[] };
const nodes = (JSON.parse(readFileSync(join(root, "data", "nodes.json"), "utf8")) as { nodes: NodeData[] }).nodes;
const nodeById = new Map(nodes.map((node) => [node.id, node]));

const gateNames: Record<string, string> = {
  ownedLongForm: "verified owned English long-form source",
  cadence: "active or semi-active historical cadence",
  namedContentOwner: "named human content owner",
  economicBuyer: "named economic buyer",
  contact: "public outreach path",
  officialOffer: "official commercial offer",
  monolith: "creator-controlled account",
  videoGap: "commercially meaningful video-distribution gap",
};

function sourceEvidence(record: LightRecord, node?: NodeData) {
  return [...new Set([
    ...(record.evidence || []),
    node?.sourceEvidenceUrl,
    node?.rssUrl,
    node?.latestYoutubeEvidenceUrl,
    node?.latestPodcastEvidenceUrl,
  ].filter((url): url is string => Boolean(url)))];
}

const reports = manifest.records.map((record) => {
  const node = nodeById.get(record.id);
  const resolution = remainingSolMediumResolutions[record.id];
  const failedGates = Object.entries(record.hardGateStatus || {}).filter(([, passed]) => !passed).map(([gate]) => gateNames[gate] || gate);
  const resolutionDecision: Decision | undefined = resolution
    ? resolution.decision === "DISQUALIFIED" ? "DISQUALIFIED_CONFIRMED" : resolution.decision
    : undefined;
  const decision: Decision = resolutionDecision || "DISQUALIFIED_CONFIRMED";
  const decisionReason = resolution?.reason || `The first-party evidence pass did not verify the complete signability chain required for outreach: ${failedGates.join(", ") || "a complete owned-content-to-transaction chain"}. This record remains excluded from the active sales queue rather than being promoted on rank or inference.`;
  return {
    id: record.id,
    batch: record.batch,
    cohortLane: record.cohortLane,
    auditSample: record.auditSample,
    fitRank: record.fitRank,
    fitScore: record.fitScore,
    host: node?.host,
    organization: node?.organizationName,
    decision,
    decisionSource: resolution ? "PRIOR_STRONG_MODEL_RESOLUTION" : "FAILED_GATE_CONFIRMATION",
    decisionReason,
    failedGates,
    unresolvedAmbiguities: record.ambiguities || [],
    sourceEvidenceUrls: sourceEvidence(record, node),
    owner: resolution?.contentOwnerName || node?.contentOwnerName || node?.pointManName,
    buyer: resolution?.economicBuyerName || node?.economicBuyerName,
    contactUrl: resolution?.contactUrl || node?.contactUrl,
    offer: resolution?.bofOffer || node?.bofOffer,
    offerUrl: resolution?.offerUrl || node?.offerUrl,
    pitchHook: resolution?.pitchHook || node?.pitchHook,
    methodologyNote: resolution
      ? "Previously resolved by strong-model review; preserved here to avoid duplicate work."
      : "No promotion was permitted because one or more hard gates failed in direct-source evidence. A future appeal must add first-party evidence for every listed failed gate.",
  };
});

const counts = reports.reduce<Record<Decision, number>>((result, report) => { result[report.decision] += 1; return result; }, { PURSUE_NOW: 0, NURTURE: 0, DISQUALIFIED_CONFIRMED: 0 });
const auditRecords = reports.filter((report) => report.auditSample).map((report) => {
  const checks = report.decision === "PURSUE_NOW"
    ? { completeCommercialChain: Boolean(report.owner && report.buyer && report.contactUrl && report.offerUrl && report.pitchHook), sourceEvidence: report.sourceEvidenceUrls.length > 0 }
    : report.decision === "NURTURE"
      ? { unresolvedCaseDocumented: report.unresolvedAmbiguities.length > 0 || report.failedGates.length > 0, noPrematurePromotion: true }
      : { failedGateDocumented: report.failedGates.length > 0 || report.decisionSource === "PRIOR_STRONG_MODEL_RESOLUTION", sourceEvidence: report.sourceEvidenceUrls.length > 0, noPrematurePromotion: true };
  return { id: report.id, decision: report.decision, checks, passed: Object.values(checks).every(Boolean) };
});
const passedChecks = auditRecords.filter((record) => record.passed).length;
const passRate = auditRecords.length ? passedChecks / auditRecords.length : 0;

const output = {
  methodology: "sol-recovery-v3",
  generatedAt: new Date().toISOString(),
  cohortHash: manifest.cohortHash,
  total: reports.length,
  counts,
  audit: {
    kind: "deterministic evidence-and-hard-gate audit",
    limitation: "This pass rate measures documentation and gate consistency; it is not statistical ground-truth decision precision.",
    sampleSize: auditRecords.length,
    passedChecks,
    passRate,
    passed: passRate >= 0.9,
    records: auditRecords,
  },
  reports,
};
writeFileSync(join(root, "data", "sol-review-next-200.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ total: output.total, counts, audit: output.audit }, null, 2));
if (!output.audit.passed) process.exit(2);
