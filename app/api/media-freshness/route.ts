import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LIVE_MEDIA_SCHEMA_VERSION, pickLiveMediaRecord } from "@/lib/liveMediaFreshness";
import type { NodeData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  const nodes = (JSON.parse(readFileSync(join(process.cwd(), "data", "nodes.json"), "utf8")) as { nodes: NodeData[] }).nodes;
  const completedAt = nodes.reduce((latest, node) => {
    const value = node.lastMediaFreshnessAuditAt || "";
    return value > latest ? value : latest;
  }, "") || new Date(0).toISOString();
  const records = nodes.map(pickLiveMediaRecord);

  return Response.json({
    schemaVersion: LIVE_MEDIA_SCHEMA_VERSION,
    run: {
      id: "local-static-seed",
      status: "SEEDED",
      completedAt,
      expectedCount: records.length,
      recordCount: records.length,
      refreshVersion: "media-v3-owned-channels",
    },
    records,
  }, { headers: { "Cache-Control": "private, max-age=0, must-revalidate" } });
}
