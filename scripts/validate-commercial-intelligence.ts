import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CommercialIntelligence, NodeData } from "../lib/types";

const root = join(__dirname, "..");
const nodes = (JSON.parse(readFileSync(join(root, "data", "nodes.json"), "utf8")) as { nodes: NodeData[] }).nodes;
const review = JSON.parse(readFileSync(join(root, "data", "full-review.json"), "utf8")) as {
  total: number;
  records: Array<Partial<NodeData> & { id: string; commercialIntelligence?: CommercialIntelligence }>;
};
const errors: string[] = [];
const records = new Map(review.records.map((record) => [record.id, record]));
const validBasis = new Set(["VERIFIED", "ESTIMATED", "INFERRED"]);
const validConfidence = new Set(["HIGH", "MEDIUM", "LOW"]);

if (review.total !== nodes.length || records.size !== nodes.length) {
  errors.push(`expected ${nodes.length} commercial records; found total=${review.total}, unique=${records.size}`);
}

for (const node of nodes) {
  const record = records.get(node.id);
  const intelligence = record?.commercialIntelligence;
  if (!intelligence) {
    errors.push(`${node.id}: missing commercial intelligence`);
    continue;
  }
  if (intelligence.methodologyVersion !== "commercial-intelligence-v1") errors.push(`${node.id}: wrong methodology version`);
  if (!intelligence.primaryRevenueEngine.trim()) errors.push(`${node.id}: missing primary revenue engine`);
  if (!intelligence.contentCommercialRole.trim()) errors.push(`${node.id}: missing content commercial role`);
  if (!intelligence.revenueLeverage.trim()) errors.push(`${node.id}: missing revenue leverage`);
  if (!intelligence.valueConversation.trim()) errors.push(`${node.id}: missing value conversation`);
  if (!intelligence.customerEconomics.buyerUnit.trim()) errors.push(`${node.id}: missing buyer unit`);
  if (!validBasis.has(intelligence.customerEconomics.pricingVisibility)) errors.push(`${node.id}: invalid pricing visibility`);
  if (!intelligence.customerEconomics.pricingNote.trim()) errors.push(`${node.id}: missing pricing note`);
  if (!validConfidence.has(intelligence.confidence.level) || !intelligence.confidence.note.trim()) errors.push(`${node.id}: incomplete confidence note`);
  if (!intelligence.revenueStack.length || intelligence.revenueStack.length > 3) errors.push(`${node.id}: revenue stack must contain 1-3 engines`);
  intelligence.revenueStack.forEach((entry, index) => {
    if (entry.rank !== index + 1) errors.push(`${node.id}: revenue stack is not sequential`);
    if (!entry.engine.trim() || !entry.rationale.trim() || !validBasis.has(entry.evidenceBasis)) errors.push(`${node.id}: invalid revenue stack entry ${index + 1}`);
  });
  if (new Set(intelligence.revenueStack.map((entry) => entry.engine)).size !== intelligence.revenueStack.length) {
    errors.push(`${node.id}: duplicate revenue stack engine`);
  }
  for (const evidence of intelligence.evidence) {
    if (!/^https?:\/\//i.test(evidence.url) || !evidence.supports.trim()) errors.push(`${node.id}: invalid commercial evidence`);
  }
  if (record?.reviewDecision !== node.reviewDecision && node.reviewDecision) {
    errors.push(`${node.id}: commercial overlay changed an existing review decision`);
  }
}

for (const id of ["rory-johnston", "arjun-murti"]) {
  const intelligence = records.get(id)?.commercialIntelligence;
  if (!intelligence || intelligence.confidence.level !== "HIGH") errors.push(`${id}: exemplar must have high-confidence intelligence`);
}
if (records.get("rory-johnston")?.commercialIntelligence?.customerEconomics.pricingVisibility !== "VERIFIED") {
  errors.push("rory-johnston: official public subscription pricing must be tagged VERIFIED");
}
const arjunStack = records.get("arjun-murti")?.commercialIntelligence?.revenueStack.map((entry) => entry.engine) || [];
for (const engine of ["Advisory and consulting mandates", "Investment and fund economics", "Board and governance roles"]) {
  if (!arjunStack.includes(engine)) errors.push(`arjun-murti: missing ${engine}`);
}

if (errors.length) {
  console.error(`Commercial intelligence validation failed (${errors.length}):`);
  errors.slice(0, 50).forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const confidence = review.records.reduce<Record<string, number>>((counts, record) => {
  const level = record.commercialIntelligence!.confidence.level;
  counts[level] = (counts[level] || 0) + 1;
  return counts;
}, {});
const pricing = review.records.reduce<Record<string, number>>((counts, record) => {
  const level = record.commercialIntelligence!.customerEconomics.pricingVisibility;
  counts[level] = (counts[level] || 0) + 1;
  return counts;
}, {});
console.log(JSON.stringify({ status: "PASSED", total: review.total, confidence, pricing }, null, 2));
