import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { terraRedoFindings } from "../data/terraRedoFindings";

const root = join(__dirname, "..");
const redoBatch = Number(process.argv.find((arg) => arg.startsWith("--batch="))?.split("=")[1] || 0);
if (!Number.isInteger(redoBatch) || redoBatch < 1) throw new Error("Pass a positive --batch=N.");
const findings = terraRedoFindings.filter((finding) => finding.redoBatch === redoBatch);
if (!findings.length) throw new Error(`No findings exist for redo batch ${redoBatch}.`);
const reviewedAt = new Date().toISOString();
const bySourceBatch = new Map<number, typeof findings>();
for (const finding of findings) bySourceBatch.set(finding.sourceBatch, [...(bySourceBatch.get(finding.sourceBatch) || []), finding]);

for (const [sourceBatch, sourceFindings] of bySourceBatch) {
  const path = join(root, "data", "terra-medium-next-200-b", `batch-${sourceBatch}.json`);
  const payload = JSON.parse(readFileSync(path, "utf8")) as { records: Array<Record<string, unknown> & { id: string }> };
  const replacements = new Map(sourceFindings.map((finding) => [finding.id, finding]));
  payload.records = payload.records.map((record) => {
    const finding = replacements.get(record.id);
    if (!finding) return record;
    const checks = Object.fromEntries(Object.entries(finding.checks).map(([key, check]) => [key, {
      ...check,
      evidenceUrls: check.evidenceUrls || (check.status === "NOT_APPLICABLE" ? [] : finding.evidenceUrls),
    }]));
    return {
      ...record,
      ...(finding.overrides || {}),
      decision: finding.decision,
      decisionReason: finding.decisionReason,
      factualHardGate: finding.factualHardGate,
      unresolvedGates: finding.unresolvedGates || [],
      researchCompleteness: "COMPLETE",
      researchAudit: { reviewedBy: "Terra Medium", reviewedAt, checks },
      evidence: finding.evidenceUrls.map((url) => ({ url, proves: "First-party or official-platform evidence used in the completed Terra recovery review." })),
      auditedAt: reviewedAt,
    };
  });
  const replaced = payload.records.filter((record) => replacements.has(record.id)).length;
  if (replaced !== sourceFindings.length) throw new Error(`Source batch ${sourceBatch}: expected ${sourceFindings.length} replacements, found ${replaced}.`);
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
}
console.log(JSON.stringify({ redoBatch, findings: findings.length, sourceBatches: [...bySourceBatch.keys()] }, null, 2));
