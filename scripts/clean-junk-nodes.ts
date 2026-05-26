import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_PATH = join(__dirname, "..", "data", "nodes.json");

const BAD_IDS = new Set([
  "dfsfs",
  "unknown",
  "naina-sharma",
  "prafulla-chandra-bhanu",
  "josephine-preucil",
  "miken",
  "abbeygale-campos",
  "petra-wilde",
  "lucardow",
  "bridal-business-club",
  "sophie-wilson-from-on-track-studio",
  "lea-schwegler",
  "energy-x-follow",
  "tyrone-uzzell",
  "energyhill",
  "natalie-conroy",
  "tommy-arno-funz",
  "ncleo-de-marketing",
  "victor-cansino",
  "artists-in-presidents",
  "ty-moughan",
  "sarah-lucille",
  "stefanie-bruns-business-mentor",
  "camryn-orr",
  "divyam-patel",
  "hys",
  "sse",
  "ting",
  "pasha-fine-jewelry",
  "jennifer-cormier"
]);

const BAD_KEYWORDS = [
  "bridal", "cheetos", "jewelry", "diamond ring", "dating", "motivational", "meditation",
  "kundalini", "chakras", "healer", "healing", "spirituality", "astrology", "psychic",
  "tarot", "yoga", "fitness", "coaching", "mindset", "marriage", "relationship", "relationships",
  "personal growth", "parenting", "manifestation", "manifesting", "reiki"
];

function main() {
  console.log("Loading nodes.json...");
  const raw = readFileSync(DATA_PATH, "utf-8");
  const data = JSON.parse(raw) as { nodes: any[] };
  const initialCount = data.nodes.length;

  const cleaned = data.nodes.filter(node => {
    if (BAD_IDS.has(node.id)) {
      console.log(`Dropping junk ID: ${node.id} (${node.channel})`);
      return false;
    }

    const chanLower = node.channel.toLowerCase();
    const hostLower = node.host.toLowerCase();
    const idLower = node.id.toLowerCase();

    // Check blacklist keywords
    for (const kw of BAD_KEYWORDS) {
      if (chanLower.includes(kw) || hostLower.includes(kw) || idLower.includes(kw)) {
        console.log(`Dropping blacklisted keyword "${kw}": ${node.id} (${node.channel})`);
        return false;
      }
    }

    // Exclude school presentations / uncommercial
    if (chanLower.includes("coal and petroleum") || chanLower.includes("petroleum good or bad") || chanLower.includes("petroleum explained")) {
      console.log(`Dropping school project: ${node.id} (${node.channel})`);
      return false;
    }

    return true;
  });

  console.log(`\nCleanup complete! Kept ${cleaned.length} out of ${initialCount} nodes (Dropped ${initialCount - cleaned.length} nodes).`);
  
  writeFileSync(DATA_PATH, JSON.stringify({ nodes: cleaned }, null, 2) + "\n", "utf-8");
  console.log("nodes.json written successfully!");
}

main();
