import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_PATH = join(__dirname, "..", "data", "nodes.json");

type Category =
  | "Fossil Fuels"
  | "Power & Utilities"
  | "Renewables"
  | "Nuclear"
  | "Energy Enablers"
  | "Commodity & Energy Markets"
  | "Energy Media & Research"
  | "Energy Advisory & Expertise";

type ParticipantRole =
  | "OPERATORS"
  | "SERVICE COMPANIES"
  | "CAPITAL ALLOCATORS"
  | "TRADERS & ANALYSTS"
  | "MEDIA & INFORMATION"
  | "ADVISORS & EXPERTS"
  | "INFRASTRUCTURE"
  | "REGULATORY";

type NodeData = {
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
  marketParticipantRole: ParticipantRole;
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

const BROAD_TERMS = [
  "energy transition",
  "renewable energy",
  "oil and gas",
  "nuclear energy",
  "commodity trading",
  "electric grid",
  "power utilities",
  "solar energy",
  "wind energy",
  "crude oil",
  "clean energy",
  "lng gas",
  "battery storage",
  "carbon markets",
  "mining metals",
  "petroleum",
  "energy policy",
  "hydrogen energy",
  "decarbonization",
  "energy markets",
  "electricity markets",
  "geopolitics energy",
  "climate policy",
  "oil gas upstream",
  "oil gas downstream",
  "power transmission"
];

// Keywords to require in title or description to ensure it's energy/commodity/resources related
const ALLOWED_KEYWORDS = [
  "energy", "oil", "gas", "nuclear", "solar", "wind", "grid", "power", "utility", "utilities", 
  "electricity", "renewables", "battery", "storage", "commodity", "commodities", "crude", 
  "lng", "petroleum", "carbon", "mining", "metals", "uranium", "fossil", "coal", "decarbon", 
  "climate", "clean energy", "petrochemical", "electrification", "geothermal", "biomass", 
  "hydrogen", "hydrocarbon"
];

// Self-help/spiritual/dating keywords to blacklist
const BLACKLIST_KEYWORDS = [
  "spiritual", "meditation", "chakras", "healer", "healing", "soul", "mindset", "motivation", 
  "motivational", "personal growth", "manifest", "manifestation", "astrology", "psychic", 
  "wellness", "yoga", "fitness", "coaching", "relationships", "marriage", "dating", "faith", 
  "christian", "jesus", "bible", "parenting", "therapy", "psychology", "mindfulness", "health"
];

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function cleanHostName(artistName: string): string {
  if (!artistName) return "Various Hosts";
  let clean = artistName.trim();
  
  // Strip common corporate labels
  clean = clean.replace(/S&P Global Platts|BloombergNEF|Canary Media|Argus Media|Wood Mackenzie|CSIS|OGGN|Digital Wildcatters/gi, "");
  
  const delimiters = [/ & /, /, /, / and /, / \/ /];
  for (const delim of delimiters) {
    if (clean.match(delim)) {
      clean = clean.split(delim)[0];
    }
  }
  
  clean = clean.trim();
  clean = clean.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "");
  
  if (!clean || clean.length < 3 || clean.toLowerCase() === "various" || clean.toLowerCase() === "editor") {
    return "Various Hosts";
  }
  return clean;
}

function classifyCategory(channel: string, description: string): { category: Category; subcategory: string; role: ParticipantRole; energyType: string } {
  const combined = `${channel} ${description}`.toLowerCase();
  
  let category: Category = "Energy Media & Research";
  let subcategory = "Podcasts & Channels";
  let role: ParticipantRole = "MEDIA & INFORMATION";
  let energyType = "Energy Markets";

  if (combined.includes("nuclear") || combined.includes("atomic") || combined.includes("fission") || combined.includes("fusion") || combined.includes("uranium")) {
    category = "Nuclear";
    subcategory = "Conventional Fission";
    energyType = "Nuclear Power";
  }
  else if (combined.includes("solar") || combined.includes("wind") || combined.includes("clean") || combined.includes("storage") || combined.includes("battery") || combined.includes("hydrogen") || combined.includes("renew")) {
    category = "Renewables";
    energyType = "Clean Energy";
    if (combined.includes("solar")) {
      subcategory = "Solar";
    } else if (combined.includes("wind")) {
      subcategory = "Wind";
    } else if (combined.includes("storage") || combined.includes("battery")) {
      subcategory = "Energy Storage";
    } else {
      subcategory = "Alternative Fuels";
    }
  }
  else if (combined.includes("grid") || combined.includes("utility") || combined.includes("utilities") || combined.includes("power") || combined.includes("electricity") || combined.includes("transmission")) {
    category = "Power & Utilities";
    subcategory = "Grid Infrastructure";
    energyType = "Power Generation";
  }
  else if (combined.includes("oil") || combined.includes("gas") || combined.includes("upstream") || combined.includes("lng") || combined.includes("shale") || combined.includes("crude") || combined.includes("refining") || combined.includes("drill") || combined.includes("petroleum") || combined.includes("midstream")) {
    category = "Fossil Fuels";
    subcategory = "Upstream";
    energyType = "Oil & Gas Markets";
  }
  else if (combined.includes("commodity") || combined.includes("commodities") || combined.includes("market") || combined.includes("markets") || combined.includes("trade") || combined.includes("trading") || combined.includes("price") || combined.includes("pricing") || combined.includes("metal") || combined.includes("freight") || combined.includes("coal") || combined.includes("futures") || combined.includes("arbitrage")) {
    category = "Commodity & Energy Markets";
    subcategory = "Physical & Financial Trading";
    role = "TRADERS & ANALYSTS";
    energyType = "Commodity Arbitrage";
  }
  else if (combined.includes("policy") || combined.includes("exchange") || combined.includes("advisory") || combined.includes("consult") || combined.includes("law") || combined.includes("intel") || combined.includes("research") || combined.includes("geopolitics")) {
    category = "Energy Advisory & Expertise";
    subcategory = "Management Consulting";
    role = "ADVISORS & EXPERTS";
    energyType = "Geopolitics & Strategy";
  }

  // Double check if media/show characteristics are there
  if (combined.includes("show") || combined.includes("podcast") || combined.includes("episode") || combined.includes("radio") || combined.includes("talk")) {
    role = "MEDIA & INFORMATION";
  }

  return { category, subcategory, role, energyType };
}

function isValidEnergyPodcast(channel: string, description: string): boolean {
  const combined = `${channel} ${description}`.toLowerCase();
  
  // Check blacklist first
  for (const word of BLACKLIST_KEYWORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    if (regex.test(combined)) {
      return false;
    }
  }
  
  // Must match at least one allowed keyword
  for (const kw of ALLOWED_KEYWORDS) {
    const regex = new RegExp(`\\b${kw}\\b`, "i");
    if (regex.test(combined)) {
      return true;
    }
  }
  
  return false;
}

async function searchItunes(term: string): Promise<any[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=podcast&limit=50`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return [];
    const data = await res.json() as { results: any[] };
    return data.results || [];
  } catch (e) {
    return [];
  }
}

async function main() {
  console.log("Loading nodes.json...");
  const raw = readFileSync(DATA_PATH, "utf-8");
  const parsed = JSON.parse(raw) as { nodes: NodeData[] };
  const existingNodes = parsed.nodes;

  console.log(`Loaded ${existingNodes.length} existing nodes.`);
  
  const existingHosts = new Set(existingNodes.map(n => n.id));
  const existingAppleUrls = new Set(existingNodes.map(n => n.podcastAppleUrl).filter(Boolean));
  const existingRssUrls = new Set(existingNodes.map(n => n.rssUrl).filter(Boolean));

  console.log(`Starting broad iTunes API Sourcing for ${BROAD_TERMS.length} search queries (300ms throttled)...`);
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  let addedCount = 0;
  
  for (let i = 0; i < BROAD_TERMS.length; i++) {
    const term = BROAD_TERMS[i];
    console.log(`[${i + 1}/${BROAD_TERMS.length}] Searching: "${term}"...`);
    
    const results = await searchItunes(term);
    console.log(`  -> Found ${results.length} raw results.`);
    
    for (const p of results) {
      if (!p.feedUrl || !p.collectionViewUrl) continue;
      
      const channel = p.trackName;
      const description = p.primaryGenreName + " " + (p.genres ? p.genres.join(" ") : "");
      
      // Perform keyword verification
      if (!isValidEnergyPodcast(channel, description)) {
        continue;
      }
      
      const artist = p.artistName;
      const host = cleanHostName(artist);
      const id = slugify(host === "Various Hosts" ? channel : host);
      
      // Check for duplicates
      if (existingHosts.has(id)) {
        continue;
      } else if (existingAppleUrls.has(p.collectionViewUrl)) {
        continue;
      } else if (existingRssUrls.has(p.feedUrl)) {
        continue;
      }
      
      const classification = classifyCategory(channel, description);
      
      const newNode: NodeData = {
        id,
        channel,
        host,
        podcastAppleUrl: p.collectionViewUrl,
        rssUrl: p.feedUrl,
        category: classification.category,
        subcategory: classification.subcategory,
        marketParticipantRole: classification.role,
        energyType: classification.energyType,
        region: "US", // Default
        priority: "MEDIUM",
        isXOnly: false,
        isPodcastOnly: true,
        xFollowers: null,
        youtubeSubscribers: null,
        outreachChannels: ["email"]
      };
      
      existingNodes.push(newNode);
      existingHosts.add(id);
      existingAppleUrls.add(p.collectionViewUrl);
      existingRssUrls.add(p.feedUrl);
      addedCount++;
      
      console.log(`  -> ADDED: "${channel}" by ${host} (ID: ${id}, Category: ${classification.category})`);
    }
    
    if (i < BROAD_TERMS.length - 1) {
      await delay(300);
    }
  }

  console.log(`\nSourcing run complete! Added ${addedCount} brand new podcasts.`);
  console.log(`Total database size now: ${existingNodes.length} prospects.`);

  writeFileSync(DATA_PATH, JSON.stringify({ nodes: existingNodes }, null, 2) + "\n", "utf-8");
  console.log("Database written successfully!");
}

main().catch(console.error);
