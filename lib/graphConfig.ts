import { Category, CATEGORY_COLORS } from "./types";

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category as Category] || "#888888";
}

export function computeNodeSize(
  xFollowers: number | null,
  youtubeSubscribers: number | null
): number {
  const maxCount = Math.max(xFollowers || 0, youtubeSubscribers || 0, 1);
  return Math.max(4, Math.log10(maxCount) * 4);
}

export const FORCE_ATLAS_SETTINGS = {
  iterations: 400,
  settings: {
    gravity: 1.5,
    scalingRatio: 8,
    barnesHutOptimize: true,
    strongGravityMode: true,
    slowDown: 5,
  },
};
