import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { auditProspectActionability } from "../lib/prospectActionability";
import type { NodeData } from "../lib/types";

const DATA_PATH = join(__dirname, "..", "data", "nodes.json");
const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");

type Database = {
  nodes: NodeData[];
};

const raw = readFileSync(DATA_PATH, "utf-8");
const db = JSON.parse(raw) as Database;
const auditedAt = new Date().toISOString();

const reasonCounts = new Map<string, number>();
const statusCounts = { READY: 0, REVIEW: 0, REJECTED: 0 };

const nodes = db.nodes.map((node) => {
  const result = auditProspectActionability(node, auditedAt);
  result.reasons.forEach((reason) => {
    reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
  });
  statusCounts[result.node.actionabilityStatus || "REVIEW"]++;
  return result.node;
});

const nextJson = JSON.stringify({ nodes }, null, 2) + "\n";
const changed = nextJson !== raw;

console.log("Actionability audit complete.");
console.log(`Total prospects: ${nodes.length}`);
console.log(`READY=${statusCounts.READY}, REVIEW=${statusCounts.REVIEW}, REJECTED=${statusCounts.REJECTED}`);

if (reasonCounts.size > 0) {
  console.log("\nReview reason counts:");
  Array.from(reasonCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([reason, count]) => console.log(`- ${reason}: ${count}`));
}

if (checkOnly) {
  if (changed) {
    console.error("\nActionability fields are not current. Run: npx tsx scripts/audit-actionability.ts");
    process.exit(1);
  }
  process.exit(0);
}

if (changed) {
  writeFileSync(DATA_PATH, nextJson, "utf-8");
  console.log(`\nUpdated ${DATA_PATH}`);
} else {
  console.log("\nNo data changes required.");
}
