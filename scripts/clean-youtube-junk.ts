import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_PATH = join(__dirname, "..", "data", "nodes.json");

const BANNED_PATTERNS = [
  "co.,ltd", "co., ltd", "pvt. ltd", "private limited", "limited", "ltd.", "ltd", "llc", "corp", "corporation", 
  "incorporated", "inc.", "inc", "co.", "co "
];

const BANNED_KEYWORDS = [
  "steel", "jewelry", "diamond", "gold silver", "timantti", "luhihi", "optatube", "alder", 
  "cozero", "summit 2026", "greenated", "gigascale", "evergreen climate", "clima tech", 
  "allstream", "manufacturing", "caterpillar", "legal risk", "accounting", "wealth management", 
  "financial planning", "measurement", "breaking bias", "dfsfs", "unknown", "pasha-fine",
  "cheetos", "bridal", "marriage", "dating", "motivational", "meditation", "kundalini",
  "chakras", "healer", "healing", "spirituality", "astrology", "psychic", "tarot", "yoga",
  "fitness", "coaching", "mindset", "reiki", "precious metals", "valve guy", "north dakota oil",
  "measurements", "c-suite", "business builders", "measurement", "machine learning in oil",
  "breaking bias", "hse", "weldfab", "namibia oil", "2020 annual review", "offshore podcast",
  "ready to make", "sound off", "story of nuclear", "better podcast", "better podcast",
  "national security coalition", "national security", "ontario's energy status",
  "electrification unplugged", "current events - the electric utility", "good energy",
  "morning energy show", "take control", "secretos de la", "bears", "uptime wind energy",
  "wednesdays", "corn and crude", "angry clean energy", "chemistry for the future",
  "simple", "camryn orr", "cars", "article6", "cool effect", "kickster", "icap", "vcm.fyi",
  "pretty petroleum", "cheetos", "petra's", "dfsfs", "spring 2009", "general energy markets",
  "efficiency markets", "bridal", "brand energy", "trend energy", "influence show",
  "encircled", "freedom with energy", "creative energy", "small business energy",
  "energy play", "segmentación", "electricity required Finland", "back on the grid",
  "artists in presidents", "all stream insiders", "workforce of tomorrow", "namibia",
  "measurement", "accounting", "planning", "builder", "builders", "valve", "mineral rights",
  "deleted-pub-owner", "inception-point-ai"
];

function main() {
  console.log("Loading nodes.json...");
  const raw = readFileSync(DATA_PATH, "utf-8");
  const data = JSON.parse(raw) as { nodes: any[] };
  const initialCount = data.nodes.length;

  const cleaned = data.nodes.filter(node => {
    const chanLower = node.channel.toLowerCase();
    const hostLower = node.host.toLowerCase();
    const idLower = node.id.toLowerCase();

    // Skip verification for our high-value seed nodes (keep them safe!)
    const seedIds = new Set([
      "arjun-murti", "stephen-lacey", "abaxx-technologies", "peter-tertzakian", "energy-vs-climate",
      "jason-bordoff", "bill-nussey", "laurent-segalen", "aurora-energy-research", "bret-kugelmass",
      "dieter-helm", "tim-gould", "robin-mills", "emre-hatipoglu", "jim-krane", "john-quiggin",
      "sandeep-pai", "anas-alhajji", "amrita-sen", "gary-ross", "paul-sankey", "helima-croft",
      "saad-rahim", "bjarne-schieldrop", "giovanni-staunovo", "bob-mcnally", "fereidun-fesharaki",
      "jorge-montepeque", "jan-stuart", "francisco-blanch", "damien-courvalin", "javier-blas",
      "samir-madani", "eric-nuttall", "josh-young", "rory-johnston", "doomberg", "goehring-rozencwajg",
      "jeff-currie", "nikos-tsafos", "thierry-bros", "leslie-palti-guzman", "charif-souki",
      "mike-fulwood", "nat-bullard", "jesse-jenkins", "ramez-naam", "assaad-razzouk",
      "kingsmill-bond", "michael-barnard", "daniel-yergin", "fatih-birol", "luke-gromen",
      "harris-kupperman", "zoltan-pozsar", "adam-rozencwajg", "leigh-goehring", "mike-rothman",
      "livia-gallarati", "vandana-hari", "wael-sawan", "amin-nasser", "toby-rice", "vicki-hollub",
      "oil-sands-magazine", "art-berman", "mike-shellman", "energy-aspects", "platts",
      "oilprice-com", "doomberg-substack", "robert-bryce", "emmet-penney", "cody-simms",
      "jason-jacobs", "mark-nelson", "madi-hilly"
    ]);

    if (seedIds.has(node.id)) {
      return true;
    }

    // Exclude based on banned corporate suffixes
    for (const pattern of BANNED_PATTERNS) {
      if (chanLower.endsWith(pattern) || chanLower.includes(" " + pattern + " ") || chanLower.includes(" " + pattern + ".")) {
        console.log(`Dropping corporate node: ${node.id} (${node.channel})`);
        return false;
      }
    }

    // Exclude based on banned keywords
    for (const kw of BANNED_KEYWORDS) {
      if (chanLower.includes(kw) || hostLower.includes(kw) || idLower.includes(kw)) {
        console.log(`Dropping banned keyword "${kw}": ${node.id} (${node.channel})`);
        return false;
      }
    }

    return true;
  });

  console.log(`\nCleanup complete! Kept ${cleaned.length} out of ${initialCount} nodes (Dropped ${initialCount - cleaned.length} nodes).`);
  
  writeFileSync(DATA_PATH, JSON.stringify({ nodes: cleaned }, null, 2) + "\n", "utf-8");
  console.log("nodes.json written successfully!");
}

main();
