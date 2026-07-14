import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { pilotReports } from "../data/pilotReports";
import type { NodeData } from "../lib/types";

const DATA_PATH = join(__dirname, "..", "data", "nodes.json");
const METHODOLOGY_VERSION = "signability-v3";
const writeChanges = process.argv.includes("--write");
const MONOLITH_PATTERN = /\b(bloomberg|odd lots|cnbc|marketplace|american public media|columbia(?: university| energy exchange)|shell|bp|exxon|chevron|s&p global|wood mackenzie|international energy agency|international renewable energy agency|open university|world bank|deloitte|mckinsey|bain|bcg|kpmg|pwc|ey|ernst and young)\b/i;
const NON_PERSON_PATTERN = /\b(media group|podcast|newsletter|energy|renewable|nuclear|commodit(?:y|ies)|association|commission|university|institute|company|corporation|inc\.?|llc|ltd|limited|network|platform|exchange|capital|power|solar|wind|hydrogen|oil|gas)\b/i;
const pilotById = new Map(pilotReports.reports.map((report) => [report.id, report]));

function daysSince(value?: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? Math.max(0, (Date.now() - timestamp) / 86_400_000) : Number.POSITIVE_INFINITY;
}

function scoreContentSupply(node: NodeData) {
  const recency = daysSince(node.latestMediaPublishedAt || node.latestYoutubePublishedAt || node.latestPodcastPublishedAt);
  if (recency <= 30 && node.publishingCadence !== "semi-active") return 20;
  if (recency <= 30) return 15;
  if (recency <= 90) return 12;
  if (recency <= 180) return 4;
  return 0;
}

function scoreDistributionGap(node: NodeData) {
  const gap = (node.videoGapReason || "").toLowerCase();
  if (node.isPodcastOnly || (!node.youtubeUrl && (node.podcastAppleUrl || node.rssUrl))) return 25;
  if (/no (owned )?youtube|no video|podcast.only/.test(gap)) return 25;
  if (/minimal|underutilized|weak|limited|caption|talking head/.test(gap)) return 20;
  if (node.youtubeSubscribers !== null && node.youtubeSubscribers < 2_500) return 18;
  if (node.youtubeSubscribers !== null && node.youtubeSubscribers < 10_000) return 14;
  if (node.youtubeUrl) return 7;
  return 10;
}

function scoreCommercialOffer(node: NodeData) {
  if (node.offerUrl && node.bofOffer) return 20;
  if (node.sourceEvidenceUrl && node.bofOffer && !/commercial offer requires|needs verification|unknown/i.test(node.bofOffer)) return 15;
  if (node.bofOffer && !/unknown|none|missing/i.test(node.bofOffer)) return 9;
  return 0;
}

function scoreAudienceLeverage(node: NodeData) {
  const audience = (node.xFollowers || 0) + (node.youtubeSubscribers || 0);
  if (audience >= 100_000) return 15;
  if (audience >= 25_000) return 13;
  if (audience >= 10_000) return 11;
  if (audience >= 2_500) return 8;
  if (audience > 0) return 5;
  return 2;
}

function scoreReachability(node: NodeData) {
  if (node.email) return 10;
  if (node.xProfile || node.linkedinUrl || node.contactUrl) return node.reachabilityStatus === "STRONG" ? 9 : 7;
  if (node.bestOutreachChannel && node.bestOutreachChannel !== "MISSING") return 5;
  return 0;
}

function scoreVisualFit(node: NodeData) {
  if (node.isPodcastOnly || node.podcastAppleUrl || node.rssUrl) return 10;
  if (["Fossil Fuels", "Power & Utilities", "Nuclear", "Commodity & Energy Markets"].includes(node.category)) return 9;
  if (node.youtubeUrl && !node.isXOnly) return 7;
  return 3;
}

function confidence(node: NodeData) {
  const checks = [
    Boolean(node.pointManName || node.host),
    Boolean(node.organizationName || node.channel),
    Boolean(node.email || node.xProfile || node.linkedinUrl || node.contactUrl),
    Boolean(node.sourceEvidenceUrl),
    Boolean(node.latestMediaPublishedAt),
    Boolean(node.bofOffer),
    Boolean(node.offerUrl),
    node.verificationTier === "DETERMINISTIC" || node.verificationTier === "MANUAL",
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function hasNamedHuman(node: NodeData) {
  const name = (node.pointManName || node.host || "").trim();
  if (!name || /unknown|independent/i.test(name) || NON_PERSON_PATTERN.test(name)) return false;
  return name.split(/\s+/).filter(Boolean).length >= 2;
}

function normalizeLatestOwnedMedia(node: NodeData): NodeData {
  const channels = [
    { source: "youtube" as const, date: node.latestYoutubePublishedAt, title: node.latestYoutubeTitle },
    { source: "podcast" as const, date: node.latestPodcastPublishedAt, title: node.latestPodcastTitle },
    { source: "newsletter" as const, date: node.latestNewsletterPublishedAt, title: node.latestNewsletterTitle },
  ]
    .filter((channel): channel is { source: "youtube" | "podcast" | "newsletter"; date: string; title: string | undefined } => Boolean(channel.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latest = channels[0];
  if (!latest) return node;
  return {
    ...node,
    latestMediaPublishedAt: latest.date,
    latestMediaPublishDate: latest.date.slice(0, 10),
    latestMediaSource: latest.source,
    latestMediaTitle: latest.title,
  };
}

function applyPilotEvidence(node: NodeData): NodeData {
  const report = pilotById.get(node.id);
  if (!report) return node;
  const offerEvidenceId = report.actualOffer.evidenceIds[0];
  const offerEvidence = report.evidence.find((item) => item.id === offerEvidenceId);
  const liveTimestamp = new Date(node.latestMediaPublishedAt || 0).getTime();
  const pilotTimestamp = new Date(report.freshness.latestDate || 0).getTime();
  const usePilotFreshness = !Number.isFinite(liveTimestamp) || pilotTimestamp > liveTimestamp;

  return {
    ...node,
    contentOwnerName: report.contentOwner,
    economicBuyerName: report.economicBuyer,
    bofOffer: report.actualOffer.description,
    offerUrl: offerEvidence?.url || node.offerUrl,
    contactUrl: report.outreach.publicContact || node.contactUrl,
    bestOutreachChannel: report.outreach.primaryChannel || node.bestOutreachChannel,
    latestMediaPublishedAt: usePilotFreshness ? report.freshness.latestDate : node.latestMediaPublishedAt,
    latestMediaPublishDate: usePilotFreshness ? report.freshness.latestDate : node.latestMediaPublishDate,
    latestMediaTitle: usePilotFreshness ? report.freshness.latestTitle : node.latestMediaTitle,
    methodologyConfidence: report.confidence,
    methodologyDecision: report.decision,
    needsDeepResearch: false,
  };
}

function rank(originalNode: NodeData) {
  const node = applyPilotEvidence(normalizeLatestOwnedMedia(originalNode));
  const pilotReport = pilotById.get(node.id);
  const breakdown = {
    contentSupply: scoreContentSupply(node),
    distributionGap: scoreDistributionGap(node),
    commercialOffer: scoreCommercialOffer(node),
    audienceLeverage: scoreAudienceLeverage(node),
    reachability: scoreReachability(node),
    visualFit: scoreVisualFit(node),
  };
  const fitScore = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  const methodologyConfidence = confidence(node);
  const recent = daysSince(node.latestMediaPublishedAt) <= 90;
  const named = hasNamedHuman(node);
  const reachable = Boolean(node.email || node.xProfile || node.linkedinUrl || node.contactUrl);
  const monolithText = `${node.organizationName || ""} ${node.channel || ""} ${node.rejectionReason || ""} ${(node.actionabilityReasons || []).join(" ")}`;
  const monolith = /corporate monolith/i.test(monolithText) || MONOLITH_PATTERN.test(monolithText);
  const hardFailure = monolith || !named || !reachable || (!recent && node.actionabilityStatus === "REJECTED");
  const methodologyDecision: NodeData["methodologyDecision"] = pilotReport?.decision || (hardFailure
    ? "DISQUALIFIED"
    : node.actionabilityStatus === "READY" && recent && fitScore >= 65 && Boolean(node.offerUrl)
      ? "PURSUE_NOW"
      : "NURTURE");
  const reasons = [
    `${breakdown.contentSupply}/20 content supply`,
    `${breakdown.distributionGap}/25 distribution gap`,
    `${breakdown.commercialOffer}/20 observed-offer evidence`,
    `${breakdown.audienceLeverage}/15 audience leverage`,
    `${breakdown.reachability}/10 reachability`,
    `${breakdown.visualFit}/10 educational visual fit`,
  ];
  if (!node.offerUrl) reasons.push("Offer page still needs first-party verification.");
  if (!recent) reasons.push("No owned-channel episode verified inside 90 days.");
  if (!named) reasons.push("No named human point-man passed the deterministic identity gate.");
  if (monolith) reasons.push("Corporate-monolith pattern requires exclusion or explicit founder-led exception evidence.");

  return {
    ...node,
    contentOwnerName: node.contentOwnerName || node.pointManName || node.host,
    economicBuyerName: node.economicBuyerName || node.pointManName || node.host,
    fitScore,
    fitScoreBreakdown: breakdown,
    methodologyDecision,
    methodologyConfidence: pilotReport?.confidence || methodologyConfidence,
    methodologyVersion: METHODOLOGY_VERSION,
    methodologyReasons: reasons,
    needsDeepResearch: pilotReport ? false : methodologyConfidence < 75 || !node.offerUrl || node.verificationTier === "LEGACY",
  } satisfies NodeData;
}

function canonicalOwnedChannel(node: NodeData) {
  const value = node.rssUrl || node.podcastAppleUrl || node.youtubeUrl;
  if (!value) return undefined;
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.trim().replace(/\/$/, "").toLowerCase();
  }
}

function deduplicateOwnedChannels(nodes: NodeData[]) {
  const groups = new Map<string, NodeData[]>();
  for (const node of nodes) {
    const key = canonicalOwnedChannel(node);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) || []), node]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const ordered = [...group].sort((a, b) =>
      (b.fitScore || 0) - (a.fitScore || 0) ||
      (b.methodologyConfidence || 0) - (a.methodologyConfidence || 0) ||
      Number(Boolean(b.email || b.contactUrl)) - Number(Boolean(a.email || a.contactUrl))
    );
    const retained = ordered[0];
    for (const duplicate of ordered.slice(1)) {
      duplicate.methodologyDecision = "DISQUALIFIED";
      duplicate.needsDeepResearch = false;
      duplicate.methodologyReasons = [
        ...(duplicate.methodologyReasons || []),
        `Duplicate owned-media account; retain ${retained.host} (${retained.id}) as the account-level buyer candidate.`,
      ];
    }
  }
  return nodes;
}

const database = JSON.parse(readFileSync(DATA_PATH, "utf8")) as { nodes: NodeData[] };
const ranked = deduplicateOwnedChannels(database.nodes.map(rank)).sort((a, b) => {
  if (a.methodologyDecision !== b.methodologyDecision) {
    const order = { PURSUE_NOW: 0, NURTURE: 1, DISQUALIFIED: 2 };
    return order[a.methodologyDecision!] - order[b.methodologyDecision!];
  }
  return (b.fitScore || 0) - (a.fitScore || 0);
});

ranked.forEach((node, index) => {
  node.fitRank = index + 1;
});

const summary = {
  methodologyVersion: METHODOLOGY_VERSION,
  total: ranked.length,
  decisions: ranked.reduce<Record<string, number>>((counts, node) => {
    counts[node.methodologyDecision || "UNKNOWN"] = (counts[node.methodologyDecision || "UNKNOWN"] || 0) + 1;
    return counts;
  }, {}),
  deepResearchRequired: ranked.filter((node) => node.needsDeepResearch).length,
  top25: ranked.slice(0, 25).map((node) => ({ rank: node.fitRank, id: node.id, host: node.host, score: node.fitScore, decision: node.methodologyDecision })),
  writeChanges,
};

if (writeChanges) {
  writeFileSync(DATA_PATH, `${JSON.stringify({ nodes: ranked }, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify(summary, null, 2));
