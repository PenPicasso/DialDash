import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { solNext200CFindings } from "../data/solNext200CFindings";

const root = join(__dirname, "..");
const batch = Number(process.argv.find((arg) => arg.startsWith("--batch="))?.split("=")[1] || 0);
if (!Number.isInteger(batch) || batch < 1 || batch > 8) throw new Error("Pass --batch=1 through --batch=8.");
const findings = solNext200CFindings.filter((finding) => finding.batch === batch);
if (findings.length !== 25) throw new Error(`Batch ${batch} requires 25 Sol findings; found ${findings.length}.`);
const path = join(root, "data", "terra-medium-next-200-c", `batch-${batch}.json`);
const payload = JSON.parse(readFileSync(path, "utf8")) as { records: Array<Record<string, unknown> & { id: string }> };
const replacements = new Map(findings.map((finding) => [finding.id, finding]));
const reviewedAt = new Date().toISOString();
payload.records = payload.records.map((record) => {
  const finding = replacements.get(record.id);
  if (!finding) return record;
  return {
    ...record,
    ...(finding.overrides || {}),
    decision: finding.decision,
    decisionReason: finding.decisionReason,
    factualHardGate: finding.factualHardGate,
    unresolvedGates: finding.unresolvedGates,
    researchCompleteness: "COMPLETE",
    researchAudit: { reviewedBy: "Sol", reviewedAt, checks: finding.checks },
    evidence: finding.evidenceUrls.map((url) => ({
      url,
      proves: Object.values(finding.checks)
        .find((check) => check.evidenceUrls?.includes(url) && check.status === "CONFIRMED")?.note
        || finding.checks.ownedLongForm.note,
    })),
    auditedAt: reviewedAt,
  };
});
const replaced = payload.records.filter((record) => replacements.has(record.id)).length;
if (replaced !== 25) throw new Error(`Expected 25 batch records, replaced ${replaced}.`);
writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify({ batch, replaced }, null, 2));
