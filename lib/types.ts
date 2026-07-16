export type Category =
  | "Fossil Fuels"
  | "Power & Utilities"
  | "Renewables"
  | "Nuclear"
  | "Energy Enablers"
  | "Commodity & Energy Markets"
  | "Energy Media & Research"
  | "Energy Advisory & Expertise";

export const CATEGORIES: Category[] = [
  "Fossil Fuels",
  "Power & Utilities",
  "Renewables",
  "Nuclear",
  "Energy Enablers",
  "Commodity & Energy Markets",
  "Energy Media & Research",
  "Energy Advisory & Expertise",
];

export const CATEGORY_COLORS: Record<Category, string> = {
  "Fossil Fuels": "#ef4444",              // Vibrant Red
  "Power & Utilities": "#f59e0b",      // Amber
  "Renewables": "#10b981",             // Emerald Green
  "Nuclear": "#8b5cf6",                // Purple
  "Energy Enablers": "#6366f1", // Indigo
  "Commodity & Energy Markets": "#ec4899", // Pink
  "Energy Media & Research": "#3b82f6", // Blue
  "Energy Advisory & Expertise": "#14b8a6", // Teal
};

export type NodeData = {
  id: string;
  channel: string;
  host: string;
  channelId?: string;
  energyType: string;
  category: Category;
  subcategory: string;
  region: string;
  priority: "HOT" | "WARM" | "MEDIUM" | "COLD";
  youtubeUrl?: string;
  xProfile?: string;
  xFollowers: number | null;
  youtubeSubscribers: number | null;
  isXOnly: boolean;
  isPodcastOnly?: boolean;
  podcastAppleUrl?: string;
  podcastSpotifyUrl?: string;
  rssUrl?: string;
  email?: string;
  outreachChannels?: string[];
  marketParticipantRole:
    | "OPERATORS"
    | "SERVICE COMPANIES"
    | "CAPITAL ALLOCATORS"
    | "TRADERS & ANALYSTS"
    | "MEDIA & INFORMATION"
    | "ADVISORS & EXPERTS"
    | "INFRASTRUCTURE"
    | "REGULATORY";
  calculatedScore?: number;
  isActive?: boolean;
  lastPublishDate?: string;
  publishingCadence?: "active" | "semi-active" | "inactive";
  frequencyEpisodesPerMonth?: number;
  notes?: string;
  lastVerifiedAt?: string;
  verificationSourcesChecked?: string[];
  cadenceConfidence?: "HIGH" | "MEDIUM" | "LOW";
  cadenceEvidenceUrl?: string;
  lastKnownPublishDate?: string;
  sourceOfLastPublishDate?: string;
  latestYoutubePublishedAt?: string;
  latestYoutubePublishDate?: string;
  latestYoutubeTitle?: string;
  latestYoutubeEvidenceUrl?: string;
  latestYoutubeCheckedAt?: string;
  youtubeFreshnessStatus?: "CURRENT" | "STALE" | "MISSING" | "ERROR" | "UNVERIFIED";
  youtubeFreshnessError?: string;
  latestPodcastPublishedAt?: string;
  latestPodcastPublishDate?: string;
  latestPodcastTitle?: string;
  latestPodcastEvidenceUrl?: string;
  latestPodcastSource?: "rss" | "apple_podcasts" | "itunes_lookup";
  latestPodcastCheckedAt?: string;
  podcastFreshnessStatus?: "CURRENT" | "STALE" | "MISSING" | "ERROR" | "UNVERIFIED";
  podcastFreshnessError?: string;
  latestNewsletterPublishedAt?: string;
  latestNewsletterTitle?: string;
  latestNewsletterEvidenceUrl?: string;
  latestNewsletterCheckedAt?: string;
  newsletterFreshnessStatus?: "CURRENT" | "STALE" | "MISSING" | "ERROR" | "UNVERIFIED";
  newsletterFreshnessError?: string;
  latestMediaPublishedAt?: string;
  latestMediaPublishDate?: string;
  latestMediaSource?: "youtube" | "podcast" | "newsletter";
  latestMediaTitle?: string;
  lastMediaFreshnessAuditAt?: string;
  mediaRefreshVersion?: string;
  needsManualReview?: boolean;
  brokenLinks?: string[];
  
  // Point-Man & Reachability Fields
  pointManName?: string;
  contentOwnerName?: string;
  economicBuyerName?: string;
  organizationName?: string;
  creatorRole?: string;
  bestOutreachChannel?: string;
  linkedinUrl?: string;
  contactUrl?: string;
  sourceUrl?: string;
  confidenceScore?: number;
  reachabilityScore?: number;
  reachabilityStatus?: "STRONG" | "WEAK";
  manualReviewReason?: string;
  actionabilityStatus?: "READY" | "REVIEW" | "REJECTED";
  sourceEvidenceUrl?: string;
  videoGapReason?: string;
  tofChannels?: string[];
  mofChannels?: string[];
  bofOffer?: string;
  offerUrl?: string;
  pitchHook?: string;
  leadSource?: string;
  verificationTier?: "DETERMINISTIC" | "LLM_ASSISTED" | "MANUAL" | "LEGACY";
  lastActionabilityAuditAt?: string;
  actionabilityReasons?: string[];
  rejectionReason?: string;
  fitScore?: number;
  fitRank?: number;
  fitScoreBreakdown?: {
    contentSupply: number;
    distributionGap: number;
    commercialOffer: number;
    audienceLeverage: number;
    reachability: number;
    visualFit: number;
  };
  methodologyDecision?: "PURSUE_NOW" | "NURTURE" | "DISQUALIFIED";
  methodologyConfidence?: number;
  methodologyVersion?: string;
  methodologyReasons?: string[];
  needsDeepResearch?: boolean;
  researchReviewTier?: "SOL_MEDIUM";
  researchReviewedAt?: string;
  researchDecisionReason?: string;
  researchEvidenceUrls?: string[];
  reviewDecision?: "PURSUE_NOW" | "NURTURE" | "DISQUALIFIED_CONFIRMED";
  reviewDecisionReason?: string;
  reviewHardGate?: string;
  reviewUnresolvedGates?: string[];
  reviewEvidenceUrls?: string[];
  reviewCohort?: string;
  reviewStatus?: "PASSED";
  reviewOwner?: string;
  reviewHost?: string;
  reviewBuyer?: string;
  reviewPointMan?: string;
  reviewContact?: string;
  reviewOffer?: string;
  reviewPitchHook?: string;
  reviewVideoGap?: string;
  reviewLatestPublishedAt?: string;
  reviewLatestTitle?: string;
  reviewTof?: string[];
  reviewMof?: string[];
  reviewBof?: string[];
  reviewedAt?: string;
};

