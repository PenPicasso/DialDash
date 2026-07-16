import { readFileSync, statSync } from "fs";
import { join } from "path";
import type { NodeData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const dataPath = join(process.cwd(), "data", "nodes.json");
const reviewPath = join(process.cwd(), "data", "full-review.json");
let cache: { modifiedAt: number; nodes: NodeData[] } | undefined;

function readNodes() {
  const modifiedAt = Math.max(statSync(dataPath).mtimeMs, statSync(reviewPath).mtimeMs);
  if (!cache || cache.modifiedAt !== modifiedAt) {
    const nodes = (JSON.parse(readFileSync(dataPath, "utf8")) as { nodes: NodeData[] }).nodes;
    const review = JSON.parse(readFileSync(reviewPath, "utf8")) as { records: Array<Partial<NodeData> & { id: string }> };
    const reviewById = new Map(review.records.map((record) => [record.id, record]));
    cache = {
      modifiedAt,
      nodes: nodes.map((node) => ({ ...node, ...reviewById.get(node.id) })),
    };
  }
  return cache.nodes;
}

export function GET(request: Request) {
  const nodes = readNodes();
  const scope = new URL(request.url).searchParams.get("scope") || "all";
  const selected = scope === "pursue"
    ? nodes.filter((node) => node.reviewDecision === "PURSUE_NOW")
    : scope === "research"
      ? nodes.filter((node) => node.reviewDecision === "NURTURE")
      : nodes;
  const summary = {
    total: nodes.length,
    reviewed: nodes.filter((node) => node.reviewStatus === "PASSED").length,
    pursue: nodes.filter((node) => node.reviewDecision === "PURSUE_NOW").length,
    nurture: nodes.filter((node) => node.reviewDecision === "NURTURE").length,
    excluded: nodes.filter((node) => node.reviewDecision === "DISQUALIFIED_CONFIRMED").length,
    strongReady: nodes.filter((node) => node.actionabilityStatus === "READY" && node.reachabilityStatus === "STRONG").length,
    mediaVerified: nodes.filter((node) => node.actionabilityStatus === "READY" && Boolean(node.latestYoutubePublishedAt || node.latestPodcastPublishedAt || node.latestNewsletterPublishedAt)).length,
  };

  return Response.json({ nodes: selected, summary }, {
    headers: { "Cache-Control": "private, max-age=0, must-revalidate" },
  });
}
