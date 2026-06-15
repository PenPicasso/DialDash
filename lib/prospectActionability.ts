import { CATEGORIES, Category, NodeData } from "./types";

export type ActionabilityAudit = {
  node: NodeData;
  reasons: string[];
};

const MONOLITH_TERMS = [
  "bloomberg",
  "s&p global",
  "s and p global",
  "platts",
  "reuters",
  "mckinsey",
  "boston consulting group",
  "bcg",
  "bain & company",
  "wood mackenzie",
  "chevron",
  "exxon",
  "shell",
  "bp plc",
  "saudi aramco",
  "world bank",
  "international energy agency",
  "iea",
  "united nations",
  "irena",
  "greenpeace",
  "sierra club",
];

function hasText(value?: string | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeCategory(category: string | undefined, subcategory?: string): Category {
  const clean = (category || "").trim();
  if ((CATEGORIES as string[]).includes(clean)) return clean as Category;

  if (clean === "Oil & Gas" || clean === "LNG & Gas") return "Fossil Fuels";
  if (clean === "Infrastructure & Logistics") return "Energy Enablers";
  if (clean === "Commodities") return "Commodity & Energy Markets";
  if (clean === "Renewables & Clean") return "Renewables";

  const lower = `${clean} ${subcategory || ""}`.toLowerCase();
  if (lower.includes("oil") || lower.includes("gas") || lower.includes("lng") || lower.includes("coal")) {
    return "Fossil Fuels";
  }
  if (lower.includes("grid") || lower.includes("utility") || lower.includes("power")) {
    return "Power & Utilities";
  }
  if (lower.includes("solar") || lower.includes("wind") || lower.includes("renewable") || lower.includes("hydrogen")) {
    return "Renewables";
  }
  if (lower.includes("nuclear") || lower.includes("uranium")) return "Nuclear";
  if (lower.includes("trading") || lower.includes("commodity") || lower.includes("market")) {
    return "Commodity & Energy Markets";
  }
  if (lower.includes("advisory") || lower.includes("consult")) return "Energy Advisory & Expertise";
  if (lower.includes("software") || lower.includes("climate tech")) return "Energy Enablers";

  return "Energy Media & Research";
}

export function isCorporateMonolith(node: Pick<NodeData, "host" | "channel" | "organizationName">): boolean {
  const text = `${node.host || ""} ${node.channel || ""} ${node.organizationName || ""}`.toLowerCase();
  return MONOLITH_TERMS.some((term) => text.includes(term));
}

export function deriveBestOutreachChannel(node: NodeData): string | undefined {
  if (hasText(node.email)) return "email";
  if (hasText(node.xProfile)) return "x_dm";
  if (hasText(node.linkedinUrl)) return "linkedin";
  return node.outreachChannels?.find((channel) => {
    if (!hasText(channel)) return false;
    if (channel === "x_dm" || channel === "twitter") return false;
    if (channel === "linkedin") return false;
    if (channel === "email") return false;
    return true;
  });
}

export function deriveSourceEvidenceUrl(node: NodeData): string | undefined {
  return [
    node.sourceEvidenceUrl,
    node.cadenceEvidenceUrl,
    node.sourceUrl,
    node.podcastAppleUrl,
    node.youtubeUrl,
    node.rssUrl,
    node.xProfile,
    node.linkedinUrl,
  ].find(hasText);
}

export function deriveTofChannels(node: NodeData): string[] {
  const channels = new Set<string>();
  if (hasText(node.xProfile)) channels.add("X");
  if (hasText(node.linkedinUrl)) channels.add("LinkedIn");
  if (hasText(node.youtubeUrl) && !node.isXOnly) channels.add("YouTube");
  if (hasText(node.sourceUrl)) channels.add("Website");
  return channels.size > 0 ? Array.from(channels) : ["No owned TOF detected"];
}

export function deriveMofChannels(node: NodeData): string[] {
  const text = `${node.channel || ""} ${node.rssUrl || ""} ${node.sourceUrl || ""}`.toLowerCase();
  const channels = new Set<string>();

  if (node.isPodcastOnly || hasText(node.podcastAppleUrl) || text.includes("podcast")) {
    channels.add("Podcast");
  }
  if (text.includes("substack") || text.includes("newsletter") || text.includes("/feed")) {
    channels.add("Newsletter");
  }
  if (hasText(node.youtubeUrl) && !node.isXOnly) channels.add("Long-form video");
  if (channels.size === 0 && hasText(node.sourceUrl)) channels.add("Articles / research");
  if (channels.size === 0) channels.add("Organic thought leadership");

  return Array.from(channels);
}

export function deriveVideoGapReason(node: NodeData): string {
  if (node.isPodcastOnly) return "Audio/newsletter-first prospect with no clear video clipping engine.";
  if (node.isXOnly) return "X-first operator with no owned YouTube/video channel detected.";
  if (!hasText(node.youtubeUrl)) return "No YouTube channel detected for repurposed clips.";
  if (node.youtubeSubscribers !== null && node.youtubeSubscribers !== undefined && node.youtubeSubscribers < 10000) {
    return "Underused YouTube channel below 10k subscribers.";
  }
  if (node.youtubeSubscribers && node.youtubeSubscribers > 150000) {
    return "Existing large video channel; pitch should focus on conversion and clipping throughput.";
  }
  return "Has video presence, but short-form clipping can improve TOF consistency.";
}

export function deriveBofOffer(node: NodeData): string {
  if (node.marketParticipantRole === "TRADERS & ANALYSTS") {
    return "paid research, intelligence subscriptions, and market advisory";
  }
  if (node.marketParticipantRole === "ADVISORS & EXPERTS") {
    return "corporate advisory, training, and custom market studies";
  }
  if (node.marketParticipantRole === "CAPITAL ALLOCATORS") {
    return "fundraising, LP relationships, asset deals, and portfolio visibility";
  }
  if (node.marketParticipantRole === "MEDIA & INFORMATION") {
    return "sponsorships, paid events, ads, and audience products";
  }
  if (node.marketParticipantRole === "OPERATORS") {
    return "commercial contracts, offtake opportunities, and stakeholder trust";
  }
  if (node.marketParticipantRole === "SERVICE COMPANIES") {
    return "qualified B2B pipeline and technical buyer education";
  }
  return "consulting retainers, paid insights, and commercial partnerships";
}

export function derivePitchHook(node: NodeData): string {
  const name = node.pointManName || node.host;
  const mof = (node.mofChannels && node.mofChannels.length > 0 ? node.mofChannels : deriveMofChannels(node)).join(" + ");
  const tof = (node.tofChannels && node.tofChannels.length > 0 ? node.tofChannels : deriveTofChannels(node)).join(" / ") || "X / LinkedIn";
  const bof = node.bofOffer || deriveBofOffer(node);
  const videoGap = node.videoGapReason || deriveVideoGapReason(node);

  return `Pitch ${name} on turning their ${mof} into clipped TOF assets for ${tof}. ${videoGap} Energy Dial helps convert expert content into repeatable short-form distribution that sends warmer attention into their ${bof}.`;
}

export function inferReachabilityStatus(node: NodeData): "STRONG" | "WEAK" | undefined {
  if (node.reachabilityStatus) return node.reachabilityStatus;

  let score = 0;
  if (hasText(node.pointManName) || hasText(node.host)) score++;
  if (hasText(node.email)) score++;
  if (hasText(node.xProfile)) score++;
  if (hasText(node.linkedinUrl)) score++;
  if (hasText(node.sourceUrl) || hasText(node.cadenceEvidenceUrl)) score++;

  if (score >= 3) return "STRONG";
  if (score >= 2) return "WEAK";
  return undefined;
}

export function auditProspectActionability(node: NodeData, auditedAt = new Date().toISOString()): ActionabilityAudit {
  const audited: NodeData = { ...node };
  const reasons: string[] = [];

  audited.category = normalizeCategory(audited.category, audited.subcategory);
  audited.pointManName = audited.pointManName || audited.host;
  audited.organizationName = audited.organizationName || audited.channel || "Independent";
  audited.bestOutreachChannel = deriveBestOutreachChannel(audited);
  audited.sourceEvidenceUrl = deriveSourceEvidenceUrl(audited);
  audited.tofChannels = deriveTofChannels(audited);
  audited.mofChannels = deriveMofChannels(audited);
  audited.videoGapReason = deriveVideoGapReason(audited);
  audited.bofOffer = deriveBofOffer(audited);
  audited.pitchHook = derivePitchHook(audited);
  audited.reachabilityStatus = inferReachabilityStatus(audited);
  audited.leadSource = audited.leadSource || inferLeadSource(audited);
  audited.verificationTier = audited.verificationTier || "LEGACY";
  audited.lastActionabilityAuditAt = auditedAt;

  if (!hasText(audited.pointManName) || audited.pointManName.toLowerCase() === "unknown") {
    reasons.push("missing named human point-man");
  }
  if (!hasText(audited.organizationName)) reasons.push("missing organization or creator brand");
  if (!hasText(audited.bestOutreachChannel)) reasons.push("missing verified outreach path");
  if (!hasText(audited.bestOutreachChannel) && audited.priority === "HOT") {
    audited.priority = "MEDIUM";
  }
  if (!hasText(audited.sourceEvidenceUrl)) reasons.push("missing source evidence URL");
  if (audited.publishingCadence !== "active" && audited.publishingCadence !== "semi-active") {
    reasons.push("no active or semi-active publishing evidence");
  }
  if (isCorporateMonolith(audited)) reasons.push("corporate monolith or large institution");
  if (!hasText(audited.pitchHook)) reasons.push("missing funnel-aware pitch hook");

  audited.actionabilityStatus = reasons.length === 0 ? "READY" : "REVIEW";

  return { node: audited, reasons };
}

function inferLeadSource(node: NodeData): string {
  if (node.isPodcastOnly || node.podcastAppleUrl || node.rssUrl?.toLowerCase().includes("podcast")) {
    return "podcast";
  }
  if (node.rssUrl?.toLowerCase().includes("substack") || node.sourceUrl?.toLowerCase().includes("substack")) {
    return "newsletter";
  }
  if (node.youtubeUrl && !node.isXOnly) return "youtube";
  if (node.isXOnly || node.xProfile) return "x";
  return "legacy";
}
