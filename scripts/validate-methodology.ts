import { readFileSync } from "fs";
import { join } from "path";
import type { NodeData } from "../lib/types";

const DATA_PATH = join(__dirname, "..", "data", "nodes.json");
const nodes = (JSON.parse(readFileSync(DATA_PATH, "utf8")) as { nodes: NodeData[] }).nodes;
const errors: string[] = [];
const ranks = new Set<number>();
const activeOwnedChannels = new Map<string, string>();

for (const node of nodes) {
  if (!node.fitRank || node.fitRank < 1 || node.fitRank > nodes.length) errors.push(`${node.id}: invalid fitRank`);
  else if (ranks.has(node.fitRank)) errors.push(`${node.id}: duplicate fitRank ${node.fitRank}`);
  else ranks.add(node.fitRank);

  const breakdown = node.fitScoreBreakdown;
  if (!breakdown) {
    errors.push(`${node.id}: missing fitScoreBreakdown`);
  } else {
    const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
    if (total !== node.fitScore) errors.push(`${node.id}: score arithmetic ${total} != ${node.fitScore}`);
    if (breakdown.contentSupply > 20 || breakdown.distributionGap > 25 || breakdown.commercialOffer > 20 || breakdown.audienceLeverage > 15 || breakdown.reachability > 10 || breakdown.visualFit > 10) {
      errors.push(`${node.id}: score component exceeds maximum`);
    }
  }

  if (!node.methodologyDecision || !node.methodologyVersion || node.methodologyConfidence === undefined) {
    errors.push(`${node.id}: missing methodology fields`);
  }

  if (node.methodologyDecision === "PURSUE_NOW") {
    if (!node.offerUrl) errors.push(`${node.id}: PURSUE_NOW without verified offer URL`);
    if (!node.contentOwnerName || !node.economicBuyerName) errors.push(`${node.id}: PURSUE_NOW without owner/buyer`);
    if (!node.email && !node.xProfile && !node.linkedinUrl && !node.contactUrl) errors.push(`${node.id}: PURSUE_NOW without public contact`);
    if (!node.latestMediaPublishedAt) errors.push(`${node.id}: PURSUE_NOW without latest owned media`);
    if (node.needsDeepResearch) errors.push(`${node.id}: PURSUE_NOW still marked for deep research`);
  }

  const channelDates = [node.latestYoutubePublishedAt, node.latestPodcastPublishedAt, node.latestNewsletterPublishedAt]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);
  const primaryDate = node.latestMediaPublishedAt ? new Date(node.latestMediaPublishedAt).getTime() : undefined;
  if (channelDates.length && primaryDate !== Math.max(...channelDates)) {
    errors.push(`${node.id}: primary latest date does not match newest owned-channel date`);
  }

  if (node.methodologyDecision !== "DISQUALIFIED") {
    const ownedChannel = node.rssUrl || node.podcastAppleUrl || node.youtubeUrl;
    if (ownedChannel) {
      const key = ownedChannel.split("?")[0].replace(/\/$/, "").toLowerCase();
      const existing = activeOwnedChannels.get(key);
      if (existing) errors.push(`${node.id}: active duplicate owned-media account also used by ${existing}`);
      else activeOwnedChannels.set(key, node.id);
    }
  }
}

if (ranks.size !== nodes.length) errors.push(`expected ${nodes.length} unique ranks, found ${ranks.size}`);

const decisions = nodes.reduce<Record<string, number>>((counts, node) => {
  counts[node.methodologyDecision || "UNKNOWN"] = (counts[node.methodologyDecision || "UNKNOWN"] || 0) + 1;
  return counts;
}, {});

console.log("Methodology validation");
console.log(`- records: ${nodes.length}`);
console.log(`- decisions: ${JSON.stringify(decisions)}`);
console.log(`- deep research: ${nodes.filter((node) => node.needsDeepResearch).length}`);
console.log(`- errors: ${errors.length}`);

if (errors.length) {
  errors.slice(0, 100).forEach((error) => console.error(`ERROR ${error}`));
  process.exit(1);
}
