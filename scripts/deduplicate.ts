import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_PATH = join(__dirname, "..", "data", "nodes.json");

function main() {
  console.log("Loading nodes.json for deduplication...");
  const raw = readFileSync(DATA_PATH, "utf-8");
  const data = JSON.parse(raw) as { nodes: any[] };
  const initialCount = data.nodes.length;

  const seenIds = new Set<string>();
  const seenYoutube = new Set<string>();
  const seenApple = new Set<string>();
  const seenRss = new Set<string>();

  const uniqueNodes = [];

  for (const node of data.nodes) {
    if (seenIds.has(node.id)) {
      console.log(`Dropping duplicate ID: ${node.id}`);
      continue;
    }

    if (node.youtubeUrl && seenYoutube.has(node.youtubeUrl.toLowerCase())) {
      console.log(`Dropping duplicate YouTube URL: ${node.youtubeUrl} (ID: ${node.id})`);
      continue;
    }

    if (node.podcastAppleUrl && seenApple.has(node.podcastAppleUrl.toLowerCase())) {
      console.log(`Dropping duplicate Apple Podcast URL: ${node.podcastAppleUrl} (ID: ${node.id})`);
      continue;
    }

    if (node.rssUrl && seenRss.has(node.rssUrl.toLowerCase())) {
      console.log(`Dropping duplicate RSS URL: ${node.rssUrl} (ID: ${node.id})`);
      continue;
    }

    // Mark as seen
    seenIds.add(node.id);
    if (node.youtubeUrl) seenYoutube.add(node.youtubeUrl.toLowerCase());
    if (node.podcastAppleUrl) seenApple.add(node.podcastAppleUrl.toLowerCase());
    if (node.rssUrl) seenRss.add(node.rssUrl.toLowerCase());

    uniqueNodes.push(node);
  }

  console.log(`Deduplication complete! Kept ${uniqueNodes.length} out of ${initialCount} nodes.`);
  writeFileSync(DATA_PATH, JSON.stringify({ nodes: uniqueNodes }, null, 2) + "\n", "utf-8");
}

main();
