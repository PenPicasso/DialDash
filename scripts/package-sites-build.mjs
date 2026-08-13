import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const nextPages = resolve(".next", "server", "app");
const target = resolve("dist");

if (!existsSync(resolve(".next", "static")) || !existsSync(resolve(nextPages, "dashboard.html"))) {
  throw new Error("The Next.js static assets and prerendered dashboard were not generated.");
}

rmSync(target, { force: true, recursive: true });
mkdirSync(target, { recursive: true });
const assetsTarget = resolve(target, "assets");
mkdirSync(assetsTarget, { recursive: true });
if (existsSync(resolve("public"))) cpSync(resolve("public"), assetsTarget, { recursive: true });
cpSync(resolve(".next", "static"), resolve(assetsTarget, "_next", "static"), { recursive: true });
const pages = [
  ["index.html", "index.html"],
  ["dashboard.html", "dashboard/index.html"],
  ["pilot.html", "pilot/index.html"],
  ["portal/demo.html", "portal/demo/index.html"],
  ["report.html", "report/index.html"],
  ["_not-found.html", "404.html"],
];

for (const [sourcePage, targetPage] of pages) {
  const output = resolve(assetsTarget, targetPage);
  mkdirSync(resolve(output, ".."), { recursive: true });
  copyFileSync(resolve(nextPages, sourcePage), output);
}

const baseNodes = JSON.parse(readFileSync(resolve("data", "nodes.json"), "utf8")).nodes;
const review = JSON.parse(readFileSync(resolve("data", "full-review.json"), "utf8"));
const reviewById = new Map(review.records.map((record) => [record.id, record]));
const nodes = baseNodes.map((node) => ({ ...node, ...reviewById.get(node.id) }));
const summary = {
  total: nodes.length,
  reviewed: nodes.filter((node) => node.reviewStatus === "PASSED").length,
  pursue: nodes.filter((node) => node.reviewDecision === "PURSUE_NOW").length,
  nurture: nodes.filter((node) => node.reviewDecision === "NURTURE").length,
  excluded: nodes.filter((node) => node.reviewDecision === "DISQUALIFIED_CONFIRMED").length,
  strongReady: nodes.filter(
    (node) => node.actionabilityStatus === "READY" && node.reachabilityStatus === "STRONG",
  ).length,
  mediaVerified: nodes.filter(
    (node) =>
      node.actionabilityStatus === "READY" &&
      Boolean(
        node.latestYoutubePublishedAt ||
          node.latestPodcastPublishedAt ||
          node.latestNewsletterPublishedAt,
      ),
  ).length,
};
const dataTarget = resolve(assetsTarget, "sites-data");
mkdirSync(dataTarget, { recursive: true });

const mediaRecords = baseNodes.map((node) => {
  const record = { prospectId: node.id };
  for (const field of [
    "latestYoutubePublishedAt", "latestYoutubePublishDate", "latestYoutubeTitle", "latestYoutubeEvidenceUrl", "latestYoutubeCheckedAt", "youtubeFreshnessStatus", "youtubeFreshnessError",
    "latestPodcastPublishedAt", "latestPodcastPublishDate", "latestPodcastTitle", "latestPodcastEvidenceUrl", "latestPodcastSource", "latestPodcastCheckedAt", "podcastFreshnessStatus", "podcastFreshnessError",
    "latestNewsletterPublishedAt", "latestNewsletterTitle", "latestNewsletterEvidenceUrl", "latestNewsletterCheckedAt", "newsletterFreshnessStatus", "newsletterFreshnessError",
    "latestMediaPublishedAt", "latestMediaPublishDate", "latestMediaSource", "latestMediaTitle", "lastMediaFreshnessAuditAt", "mediaRefreshVersion",
  ]) if (node[field] !== undefined) record[field] = node[field];
  return record;
});
const seedCompletedAt = baseNodes.reduce((latest, node) => node.lastMediaFreshnessAuditAt > latest ? node.lastMediaFreshnessAuditAt : latest, "");
writeFileSync(resolve(dataTarget, "prospect-ids.json"), JSON.stringify({ ids: baseNodes.map((node) => node.id) }));
writeFileSync(resolve(dataTarget, "media-freshness-seed.json"), JSON.stringify({
  schemaVersion: "dialdash-media-live-v1",
  run: { id: "deployment-seed", status: "SEEDED", completedAt: seedCompletedAt, expectedCount: mediaRecords.length, recordCount: mediaRecords.length, refreshVersion: "media-v3-owned-channels" },
  records: mediaRecords,
}));

for (const [scope, selected] of [
  ["all", nodes],
  ["pursue", nodes.filter((node) => node.reviewDecision === "PURSUE_NOW")],
  ["research", nodes.filter((node) => node.reviewDecision === "NURTURE")],
]) {
  writeFileSync(
    resolve(dataTarget, `prospects-${scope}.json`),
    JSON.stringify({ nodes: selected, summary }),
  );
}

const serverTarget = resolve(target, "server");
mkdirSync(serverTarget, { recursive: true });
copyFileSync(resolve("sites", "worker.mjs"), resolve(serverTarget, "index.js"));

mkdirSync(resolve(target, ".openai"), { recursive: true });
copyFileSync(
  resolve(".openai", "hosting.json"),
  resolve(target, ".openai", "hosting.json"),
);
if (existsSync(resolve("drizzle"))) cpSync(resolve("drizzle"), resolve(target, ".openai", "drizzle"), { recursive: true });
