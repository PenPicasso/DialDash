/**
 * Refresh follower/subscriber counts for all prospects in nodes.json.
 *
 * Usage: npx tsx scripts/refresh-followers.ts
 *
 * Uses snscrape for X follower counts (must be installed: pip install snscrape).
 * Uses YouTube channel page scraping for subscriber counts (no API key needed).
 */

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

const DATA_PATH = join(__dirname, "..", "data", "nodes.json");

type NodeData = {
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
};

function extractXHandle(url: string): string | null {
  if (!url || url.includes("search?")) return null;
  const match = url.match(/x\.com\/([^/?]+)/);
  return match ? match[1] : null;
}

function getXFollowers(handle: string): number | null {
  try {
    const result = execSync(
      `snscrape --jsonl twitter-user ${handle} 2>/dev/null | head -1`,
      { encoding: "utf-8", timeout: 15000 }
    );
    if (result.trim()) {
      const data = JSON.parse(result.trim());
      return data.followersCount ?? null;
    }
  } catch {
    console.log(`  [X] Could not fetch @${handle}`);
  }
  return null;
}

function getYouTubeSubscribers(channelUrl: string): number | null {
  if (!channelUrl) return null;
  try {
    const result = execSync(
      `curl -s "${channelUrl}" | grep -oP '"subscriberCountText":\\{"simpleText":"[^"]*"' | head -1`,
      { encoding: "utf-8", timeout: 15000 }
    );
    const match = result.match(/"simpleText":"([^"]+)"/);
    if (match) {
      const text = match[1]; // e.g. "12.3K subscribers"
      const num = text.replace(/[^0-9.KMB]/gi, "");
      const multiplier = num.includes("M")
        ? 1_000_000
        : num.includes("K")
        ? 1_000
        : num.includes("B")
        ? 1_000_000_000
        : 1;
      const base = parseFloat(num.replace(/[KMB]/gi, ""));
      return Math.round(base * multiplier);
    }
  } catch {
    console.log(`  [YT] Could not fetch ${channelUrl}`);
  }
  return null;
}

async function main() {
  console.log("Reading nodes.json...");
  const raw = readFileSync(DATA_PATH, "utf-8");
  const data = JSON.parse(raw) as { nodes: NodeData[] };

  let updated = 0;

  for (const node of data.nodes) {
    console.log(`\nProcessing: ${node.host}`);

    // X followers
    const handle = extractXHandle(node.xProfile);
    if (handle) {
      const followers = getXFollowers(handle);
      if (followers !== null && followers !== node.xFollowers) {
        console.log(`  X: ${node.xFollowers ?? "?"} -> ${followers}`);
        node.xFollowers = followers;
        updated++;
      }
    }

    // YouTube subscribers
    if (node.youtubeUrl && !node.isXOnly) {
      const subs = getYouTubeSubscribers(node.youtubeUrl);
      if (subs !== null && subs !== node.youtubeSubscribers) {
        console.log(`  YT: ${node.youtubeSubscribers ?? "?"} -> ${subs}`);
        node.youtubeSubscribers = subs;
        updated++;
      }
    }

    // Rate limit delay
    await new Promise((r) => setTimeout(r, 500));
  }

  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`\nDone. Updated ${updated} values across ${data.nodes.length} prospects.`);
}

main().catch(console.error);
