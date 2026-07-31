import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CATEGORIES, type CommercialIntelligence, type NodeData } from "../lib/types";
import { CATEGORY_COMMERCIAL_GUIDE, COMMERCIAL_BENCHMARKS } from "../lib/commercialBenchmarks";

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
  if (intelligence.methodologyVersion !== "commercial-intelligence-v2") errors.push(`${node.id}: wrong methodology version`);
  if (!intelligence.primaryRevenueEngine.trim()) errors.push(`${node.id}: missing primary revenue engine`);
  if (!intelligence.contentCommercialRole.trim()) errors.push(`${node.id}: missing content commercial role`);
  if (!intelligence.revenueLeverage.trim()) errors.push(`${node.id}: missing revenue leverage`);
  if (!intelligence.valueConversation.trim()) errors.push(`${node.id}: missing value conversation`);
  if (!intelligence.customerEconomics.buyerUnit.trim()) errors.push(`${node.id}: missing buyer unit`);
  if (!validBasis.has(intelligence.customerEconomics.pricingVisibility)) errors.push(`${node.id}: invalid pricing visibility`);
  if (!intelligence.customerEconomics.pricingNote.trim()) errors.push(`${node.id}: missing pricing note`);
  if (!COMMERCIAL_BENCHMARKS[intelligence.customerEconomics.primaryBenchmarkId]) errors.push(`${node.id}: invalid primary benchmark`);
  if (!validConfidence.has(intelligence.confidence.level) || !intelligence.confidence.note.trim()) errors.push(`${node.id}: incomplete confidence note`);
  if (!intelligence.revenueStack.length || intelligence.revenueStack.length > 3) errors.push(`${node.id}: revenue stack must contain 1-3 engines`);
  intelligence.revenueStack.forEach((entry, index) => {
    if (entry.rank !== index + 1) errors.push(`${node.id}: revenue stack is not sequential`);
    if (!entry.engine.trim() || !entry.rationale.trim() || !validBasis.has(entry.evidenceBasis)) errors.push(`${node.id}: invalid revenue stack entry ${index + 1}`);
    if (!entry.economics.range.trim() || !entry.economics.unit.trim() || !entry.economics.note.trim()) errors.push(`${node.id}: incomplete stack economics ${index + 1}`);
    if (!validBasis.has(entry.economics.visibility) || !COMMERCIAL_BENCHMARKS[entry.economics.benchmarkId]) errors.push(`${node.id}: invalid stack economics ${index + 1}`);
  });
  if (intelligence.customerEconomics.primaryBenchmarkId !== intelligence.revenueStack[0]?.economics.benchmarkId) errors.push(`${node.id}: primary economics do not match first revenue engine`);
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
const arjunIntelligence = records.get("arjun-murti")?.commercialIntelligence;
const arjunAdvisory = arjunIntelligence?.revenueStack.find((entry) => entry.engine === "Advisory and consulting mandates")?.economics;
const arjunBoard = arjunIntelligence?.revenueStack.find((entry) => entry.engine === "Board and governance roles")?.economics;
const arjunInvestment = arjunIntelligence?.revenueStack.find((entry) => entry.engine === "Investment and fund economics")?.economics;
if (arjunAdvisory?.visibility !== "VERIFIED" || !arjunAdvisory.range.includes("250,000")) errors.push("arjun-murti: disclosed advisory economics missing");
if (arjunBoard?.visibility !== "VERIFIED" || !arjunBoard.range.includes("275,000")) errors.push("arjun-murti: disclosed board economics missing");
if (arjunInvestment?.visibility !== "ESTIMATED") errors.push("arjun-murti: undisclosed investment terms must remain estimated");

for (const [id, benchmark] of Object.entries(COMMERCIAL_BENCHMARKS)) {
  if (benchmark.id !== id || !benchmark.engine.trim() || !benchmark.range.trim() || !benchmark.unit.trim() || !benchmark.basis.trim() || !benchmark.caveat.trim()) {
    errors.push(`benchmark ${id}: incomplete definition`);
  }
  for (const source of benchmark.sources) {
    if (!/^https?:\/\//i.test(source.url) || !source.title.trim() || !source.observation.trim()) errors.push(`benchmark ${id}: invalid source`);
  }
}
const guideCategories = CATEGORY_COMMERCIAL_GUIDE.map((guide) => guide.category);
if (new Set(guideCategories).size !== CATEGORIES.length || CATEGORIES.some((category) => !guideCategories.includes(category))) {
  errors.push("commercial category guide must cover the eight canonical categories exactly once");
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
