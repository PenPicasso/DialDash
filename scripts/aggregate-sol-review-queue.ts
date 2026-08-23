import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { solMediumResolutions } from "../data/solMediumResolutions";

type LightReport = {
  id: string;
  fitRank?: number;
  fitScore?: number;
  recommendedDisposition: "PURSUE_NOW" | "NURTURE" | "DISQUALIFIED" | "ESCALATE";
  ambiguities?: string[];
  hardGateStatus?: Record<string, boolean>;
};

type Batch = {
  runId: string;
  generatedAt: string;
  reports: LightReport[];
};

const root = join(__dirname, "..", "storage", "prospect-runs");
const args = process.argv.slice(2);
const prefix = args.find((value) => value.startsWith("--prefix="))?.slice("--prefix=".length) || "light-research-";
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = join(root, `sol-review-${runId}`);

const batches = readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
  .map((entry) => ({ directory: entry.name, path: join(root, entry.name, "reports.json") }))
  .filter((entry) => existsSync(entry.path))
  .map((entry) => ({ directory: entry.directory, batch: JSON.parse(readFileSync(entry.path, "utf8")) as Batch }))
  .sort((a, b) => a.batch.generatedAt.localeCompare(b.batch.generatedAt));

const byId = new Map<string, LightReport & { sourceRun: string }>();
for (const { directory, batch } of batches) {
  for (const report of batch.reports) byId.set(report.id, { ...report, sourceRun: directory });
}

const reports = [...byId.values()]
  .filter((report) => !solMediumResolutions[report.id])
  .sort((a, b) => (a.fitRank || Number.MAX_SAFE_INTEGER) - (b.fitRank || Number.MAX_SAFE_INTEGER));
const counts = reports.reduce<Record<string, number>>((result, report) => {
  result[report.recommendedDisposition] = (result[report.recommendedDisposition] || 0) + 1;
  return result;
}, {});
const solReview = reports.filter((report) => report.recommendedDisposition === "ESCALATE" || report.recommendedDisposition === "NURTURE");
const precisionAudit = reports.filter((report) => report.recommendedDisposition === "PURSUE_NOW").every((report) => Object.values(report.hardGateStatus || {}).every(Boolean));

mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, "sol-review-queue.json"), `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  sourceBatchCount: batches.length,
  excludedPreviouslyReviewed: Object.keys(solMediumResolutions).length,
  uniqueRecords: reports.length,
  decisions: counts,
  promotionPrecisionPass: precisionAudit,
  reviewInstructions: [
    "Review every ESCALATE before altering its methodology decision.",
    "Review NURTURE only when a first-party owner, buyer, offer, or video-gap source can materially change priority.",
    "Do not use Firecrawl. Do not promote without an owned source, active cadence, named buyer, public outreach path, official offer, and real video gap.",
  ],
  solReview,
  deterministicDisqualifications: reports.filter((report) => report.recommendedDisposition === "DISQUALIFIED"),
}, null, 2)}\n`);
writeFileSync(join(outputDir, "README.md"), `# Sol review queue\n\n- Source batches: ${batches.length}\n- Unique records: ${reports.length}\n- Escalate or nurture review: ${solReview.length}\n- Deterministic disqualifications: ${counts.DISQUALIFIED || 0}\n- Promotion precision gate: ${precisionAudit ? "passed" : "failed"}\n`);

console.log(JSON.stringify({ outputDir, sourceBatchCount: batches.length, uniqueRecords: reports.length, decisions: counts, solReview: solReview.length, promotionPrecisionPass: precisionAudit }, null, 2));
