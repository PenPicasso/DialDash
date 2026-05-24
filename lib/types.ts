export type Category =
  | "Oil & Gas"
  | "Power & Utilities"
  | "Renewables"
  | "Nuclear"
  | "Infrastructure & Logistics"
  | "Commodity & Energy Markets"
  | "Energy Media & Research"
  | "Energy Advisory & Expertise";

export const CATEGORY_COLORS: Record<Category, string> = {
  "Oil & Gas": "#ef4444",              // Vibrant Red
  "Power & Utilities": "#f59e0b",      // Amber
  "Renewables": "#10b981",             // Emerald Green
  "Nuclear": "#8b5cf6",                // Purple
  "Infrastructure & Logistics": "#6366f1", // Indigo
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
  needsManualReview?: boolean;
  brokenLinks?: string[];
};

