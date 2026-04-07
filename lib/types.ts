export type NodeData = {
  id: string;
  channel: string;
  host: string;
  channelId: string;
  energyType: string;
  category: string;
  subcategory: string;
  region: string;
  priority: string;
  youtubeUrl: string;
  xProfile: string;
  xFollowers: number | null;
  youtubeSubscribers: number | null;
  isXOnly: boolean;
  lastUpload?: string;
};

export type Category =
  | "Oil & Gas"
  | "Commodities"
  | "LNG & Gas"
  | "Renewables & Clean"
  | "Macro & Policy";

export const CATEGORY_COLORS: Record<Category, string> = {
  "Oil & Gas": "#ef4444",
  "Commodities": "#f97316",
  "LNG & Gas": "#8b5cf6",
  "Renewables & Clean": "#22c55e",
  "Macro & Policy": "#3b82f6",
};
