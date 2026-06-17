import { readFileSync } from "fs";
import { join } from "path";
import { CATEGORIES, NodeData } from "../lib/types";
import { isCorporateMonolith } from "../lib/prospectActionability";

const DATA_PATH = join(__dirname, "..", "data", "nodes.json");
const db = JSON.parse(readFileSync(DATA_PATH, "utf-8")) as { nodes: NodeData[] };
const validCategories = new Set<string>(CATEGORIES);
const errors: string[] = [];
const warnings: string[] = [];

function hasText(value?: string | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function addUnique(
  seen: Map<string, NodeData>,
  label: string,
  value: string | undefined,
  node: NodeData,
  severity: "error" | "warning" = "error",
) {
  if (!hasText(value)) return;
  const normalized = value.trim().toLowerCase();
  const prior = seen.get(normalized);
  if (prior && (label === "id" || prior.id !== node.id)) {
    const message = `duplicate ${label}: ${value} used by ${prior.id} and ${node.id}`;
    const bothReady = prior.actionabilityStatus === "READY" && node.actionabilityStatus === "READY";
    if (label === "id" || (severity === "error" && bothReady)) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  } else {
    seen.set(normalized, node);
  }
}

const ids = new Map<string, NodeData>();
const urls = new Map<string, NodeData>();
const xProfiles = new Map<string, NodeData>();
const linkedinProfiles = new Map<string, NodeData>();
const emails = new Map<string, NodeData>();

const stats = {
  total: db.nodes.length,
  ready: 0,
  review: 0,
  rejected: 0,
  hot: 0,
};

for (const node of db.nodes) {
  if (!hasText(node.id)) {
    errors.push("node with missing id");
    continue;
  }

  addUnique(ids, "id", node.id, node);
  addUnique(urls, "youtubeUrl", node.youtubeUrl, node);
  addUnique(urls, "podcastAppleUrl", node.podcastAppleUrl, node, "warning");
  addUnique(urls, "rssUrl", node.rssUrl, node, "warning");
  addUnique(urls, "sourceUrl", node.sourceUrl, node, "warning");
  addUnique(xProfiles, "xProfile", node.xProfile, node);
  addUnique(linkedinProfiles, "linkedinUrl", node.linkedinUrl, node);
  addUnique(emails, "email", node.email, node);

  if (!validCategories.has(node.category)) {
    errors.push(`${node.id}: invalid category "${node.category}"`);
  }

  if (node.priority === "HOT") {
    stats.hot++;
    if (!hasText(node.email) && !hasText(node.xProfile) && !hasText(node.linkedinUrl) && !hasText(node.bestOutreachChannel)) {
      errors.push(`${node.id}: HOT prospect has no explicit outreach path`);
    }
  }

  if (!hasText(node.pitchHook)) {
    errors.push(`${node.id}: missing funnel-aware pitchHook`);
  }

  if (node.actionabilityStatus === "READY") {
    stats.ready++;
    if (!hasText(node.pointManName) && !hasText(node.host)) errors.push(`${node.id}: READY missing point-man`);
    if (!hasText(node.organizationName) && !hasText(node.channel)) errors.push(`${node.id}: READY missing organization`);
    if (!hasText(node.bestOutreachChannel)) errors.push(`${node.id}: READY missing bestOutreachChannel`);
    if (!hasText(node.sourceEvidenceUrl)) errors.push(`${node.id}: READY missing sourceEvidenceUrl`);
    if (node.publishingCadence !== "active" && node.publishingCadence !== "semi-active") {
      errors.push(`${node.id}: READY lacks active/semi-active publishing evidence`);
    }
    if (!node.reachabilityStatus) errors.push(`${node.id}: READY missing reachabilityStatus`);
    if (isCorporateMonolith(node)) errors.push(`${node.id}: READY appears to be a corporate monolith`);
    if (!node.tofChannels?.length) errors.push(`${node.id}: READY missing tofChannels`);
    if (!node.mofChannels?.length) errors.push(`${node.id}: READY missing mofChannels`);
    if (!hasText(node.bofOffer)) errors.push(`${node.id}: READY missing bofOffer`);
    if (!hasText(node.videoGapReason)) errors.push(`${node.id}: READY missing videoGapReason`);
    if (!hasText(node.latestYoutubePublishedAt) && !hasText(node.latestPodcastPublishedAt)) {
      warnings.push(`${node.id}: READY missing verified YouTube/podcast freshness`);
    }
  } else if (node.actionabilityStatus === "REJECTED") {
    stats.rejected++;
  } else {
    stats.review++;
    if (!node.actionabilityStatus) warnings.push(`${node.id}: missing actionabilityStatus`);
  }
}

console.log("Data validation summary:");
console.log(`- total: ${stats.total}`);
console.log(`- HOT: ${stats.hot}`);
console.log(`- READY: ${stats.ready}`);
console.log(`- REVIEW: ${stats.review}`);
console.log(`- REJECTED: ${stats.rejected}`);

if (warnings.length > 0) {
  console.log(`\nWarnings (${warnings.length}):`);
  warnings.slice(0, 20).forEach((warning) => console.log(`- ${warning}`));
  if (warnings.length > 20) console.log(`- ...and ${warnings.length - 20} more`);
}

if (errors.length > 0) {
  console.error(`\nErrors (${errors.length}):`);
  errors.slice(0, 50).forEach((error) => console.error(`- ${error}`));
  if (errors.length > 50) console.error(`- ...and ${errors.length - 50} more`);
  process.exit(1);
}

console.log("\nData validation passed.");
