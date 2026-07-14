import { readFileSync, statSync } from "fs";
import { join } from "path";
import type { NodeData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const dataPath = join(process.cwd(), "data", "nodes.json");
let cache: { modifiedAt: number; nodes: NodeData[] } | undefined;

function readNodes() {
  const modifiedAt = statSync(dataPath).mtimeMs;
  if (!cache || cache.modifiedAt !== modifiedAt) {
    cache = {
      modifiedAt,
      nodes: (JSON.parse(readFileSync(dataPath, "utf8")) as { nodes: NodeData[] }).nodes,
    };
  }
  return cache.nodes;
}

export function GET(request: Request) {
  const nodes = readNodes();
  const scope = new URL(request.url).searchParams.get("scope") || "all";
  const selected = scope === "pursue"
    ? nodes.filter((node) => node.methodologyDecision === "PURSUE_NOW")
    : scope === "research"
      ? nodes.filter((node) => node.methodologyDecision === "NURTURE")
      : nodes;
  const summary = {
    total: nodes.length,
    pursue: nodes.filter((node) => node.methodologyDecision === "PURSUE_NOW").length,
    nurture: nodes.filter((node) => node.methodologyDecision === "NURTURE").length,
    strongReady: nodes.filter((node) => node.actionabilityStatus === "READY" && node.reachabilityStatus === "STRONG").length,
    mediaVerified: nodes.filter((node) => node.actionabilityStatus === "READY" && Boolean(node.latestYoutubePublishedAt || node.latestPodcastPublishedAt || node.latestNewsletterPublishedAt)).length,
  };

  return Response.json({ nodes: selected, summary }, {
    headers: { "Cache-Control": "private, max-age=0, must-revalidate" },
  });
}
