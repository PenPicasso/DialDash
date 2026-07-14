import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

const root = join(__dirname, "..", "storage", "terra-recovery");
const read = <T>(name: string) => JSON.parse(readFileSync(join(root, name), "utf8")) as T;
const podcastAudit = read<{ assessed: Array<{ disposition: string; latest?: { publishedAt?: string }; sourceIntegrity: string; fitScore?: number; fitRank?: number }> }>("source-integrity-audit.json");
const youtube = read<{ selected: unknown[] }>("youtube-supplement.json");
const now = Date.now();
const podcasts = podcastAudit.assessed
  .filter((record) => record.disposition === "RESEARCHABLE" && record.latest?.publishedAt && now - new Date(record.latest.publishedAt).getTime() <= 90 * 86_400_000)
  .sort((a, b) => (b.sourceIntegrity === "HIGH" ? 1 : 0) - (a.sourceIntegrity === "HIGH" ? 1 : 0) || (b.fitScore || 0) - (a.fitScore || 0) || (a.fitRank || Number.MAX_SAFE_INTEGER) - (b.fitRank || Number.MAX_SAFE_INTEGER));

function output(batch: number, records: unknown[]) {
  const auditSample = records
    .map((record) => record as { id: string })
    .filter((record) => Number.parseInt(createHash("sha256").update(record.id).digest("hex").slice(0, 2), 16) % 5 === 0)
    .map((record) => record.id);
  writeFileSync(join(root, `batch-${batch}.json`), `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    batch,
    totalSelected: 100,
    records,
    auditSample,
    rules: [
      "Staged recovery output only. Do not change data/nodes.json from this file.",
      "Use official first-party evidence for ownership, buyer, contact, offer, funnel, and video-gap review.",
      "Missing evidence is UNVERIFIED, never DISQUALIFIED_CONFIRMED.",
    ],
  }, null, 2)}\n`);
}

output(3, [...podcasts.slice(50, 59), ...youtube.selected.slice(0, 16)]);
output(4, youtube.selected.slice(16, 41));
console.log(JSON.stringify({ podcasts: podcasts.length, youtube: youtube.selected.length, batch3: 25, batch4: 25, total: 100 }, null, 2));
