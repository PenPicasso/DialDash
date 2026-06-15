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

// Curated search terms covering different sub-sectors of the energy and commodity ecosystem
const SEARCH_TERMS = [
  // 1. Broad Energy & Transition
  "The Energy Transition Show",
  "Energy Evolution S&P Global",
  "Switched On BloombergNEF",
  "Redefining Energy",
  "The Carbon Copy",
  "Columbia Energy Exchange",
  "Energy 360 CSIS",
  "Horizon Wood Mackenzie",
  "The Energy Gang",
  "Energy Policy Now",
  "Energy Policy Now Kleinman",
  "Capitalism and Climate",
  "Catalyst Shayle Kann",
  "My Climate Journey",
  "WoodMac Horizons",
  "Outrage and Optimism",
  "The Last Optimist Mark Mills",
  "Hydrogen Podcast Paul Rodden",
  "Power Hungry Robert Bryce",
  "Clean Law Harvard",
  
  // 2. Oil & Gas (Upstream, Midstream, Downstream, LNG)
  "Oil and Gas This Week",
  "Oil and Gas Industry Leaders",
  "Oil and Gas Startups",
  "Digital Oil and Gas",
  "Oil and Gas Onshore",
  "The Crude Report Argus",
  "Global LNG Hub Argus",
  "Argus Crude Oil",
  "Argus LNG",
  "Argus European Gas",
  "Argus Global Gasoline",
  "Argus Biofuels",
  "Argus LPG",
  "Platts Oil Markets",
  "Platts Gas Markets",
  "Platts Bunker Fuel",
  "Argus Jet Fuel",
  "Energy News Beat Podcast",
  "The Oil History Podcast",
  "The Oilfield Decarbonization Podcast",
  "Oil Sands Magazine",
  "Black Gold Energy Gary Ross",
  "Shale Profile",
  "Cornerstone Analytics",
  "Black Gold Oil",
  "Macro Commodities",
  "Energy Tidbits Dan Tsubouchi",
  
  // 3. Power, Utilities & Grid
  "Grid Talk Marty Rosenberg",
  "DER Task Force Grid",
  "Local Energy Rules Grid",
  "Voltcast Nexans",
  "Public Power Now",
  "Smart Grid Today",
  "Grid Geeks",
  "Power Engineering Podcast",
  "Power Play Bloomberg",
  "Smart Grid Today Utility",
  "DER Task Force",
  "Local Energy Rules",
  "Voltcast",
  "Public Power Now Utility",
  "Grid Talk",
  
  // 4. Renewables & Storage
  "Clean Power Hour Solar",
  "Solar Insiders Australia",
  "Clean Energy Show",
  "The Solar Podcast",
  "Wind Power Podcast",
  "Clean Power Hour Solar Storage",
  "Solar Insiders",
  "Wind Power Monthly",
  "Solar Power World",
  "Wind Energy Podcast",
  "Battery Generation Podcast",
  "Energy Storage Podcast",
  "Clean Energy Show Canada",
  "Political Climate Podcast",
  "Solar Podcast Solar Energy",
  
  // 5. Nuclear
  "Titans of Nuclear",
  "Decouple Podcast",
  "Nuclear Barbarians",
  "The Nuclear Energy Show",
  "Atomic Trends",
  "Nuclear Hotseat",
  "Decouple Nuclear",
  "Nuclear Energy Policy",
  "Atomic Show",
  "Titans of Nuclear Bret Kugelmass",
  
  // 6. Commodity & Energy Markets
  "Odd Lots Bloomberg",
  "Lots More Odd Lots",
  "Smarter Markets",
  "HC Insider Podcast",
  "The Commodity Podcast",
  "Commodity Technology Podcast",
  "Argus Media Podcasts",
  "ICIS Chemical Podcast",
  "Platts Commodity Podcast",
  "The Derivative Podcast",
  "S&P Global Platts Commodities",
  "Platts Future Energy",
  "Argus Clean Ammonia",
  "Argus Carbon Markets",
  "Platts Gas Petrochemical",
  "Argus Base Metals",
  "Argus Steel",
  "Argus Rare Earths",
  "Argus Iron Ore",
  "Metal Bulletin Podcast",
  "LME Podcast",
  "Commodities Focus S&P",
  "Coal Daily Argus",
  "Argus Metals Metals Markets",
  "Nansen Energy Research Norwegian",
  
  // 7. General Macro Commodities & Finance
  "MacroVoices",
  "The Derivative Podcast Futures",
  "Argus Freight Shipping",
  "Argus Tanker Freight",
  "Argus Dry Bulk",
  "Odd Lots Supply Chain"
];

// Helper to slugify name
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

// Clean up iTunes artistName to extract a human Host Name
function cleanHostName(artistName: string): string {
  if (!artistName) return "Unknown Host";
  let clean = artistName.trim();
  
  // Remove company names/sponsors commonly prepended in iTunes
  clean = clean.replace(/S&P Global Platts|BloombergNEF|Canary Media|Argus Media|Wood Mackenzie|CSIS|OGGN|Digital Wildcatters/gi, "");
  
  // Split on delimiters and take the first host or clean it up
  const delimiters = [/ & /, /, /, / and /, / \/ /];
  for (const delim of delimiters) {
    if (clean.match(delim)) {
      clean = clean.split(delim)[0];
    }
  }
  
  clean = clean.trim();
  
  // Remove leading/trailing non-word characters
  clean = clean.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "");
  
  // Fallback if empty
  if (!clean || clean.length < 3 || clean.toLowerCase() === "various" || clean.toLowerCase() === "editor") {
    return "Various Hosts";
  }
  
  return clean;
}

// Auto-classify category based on keywords
function classifyCategory(channel: string): { category: Category; subcategory: string; role: ParticipantRole; energyType: string } {
  const normChan = channel.toLowerCase();
  
  // Defaults
  let category: Category = "Energy Media & Research";
  let subcategory = "Podcasts & Channels";
  let role: ParticipantRole = "MEDIA & INFORMATION";
  let energyType = "Energy Markets";

  // Nuclear
  if (normChan.includes("nuclear") || normChan.includes("atomic") || normChan.includes("fission") || normChan.includes("fusion")) {
    category = "Nuclear";
    subcategory = "Conventional Fission";
    role = "MEDIA & INFORMATION";
    energyType = "Nuclear Power";
  }
  // Renewables
  else if (normChan.includes("solar") || normChan.includes("wind") || normChan.includes("clean") || normChan.includes("storage") || normChan.includes("battery") || normChan.includes("hydrogen") || normChan.includes("renew")) {
    category = "Renewables";
    role = "MEDIA & INFORMATION";
    energyType = "Clean Energy";
    if (normChan.includes("solar")) {
      subcategory = "Solar";
    } else if (normChan.includes("wind")) {
      subcategory = "Wind";
    } else if (normChan.includes("storage") || normChan.includes("battery")) {
      subcategory = "Energy Storage";
    } else if (normChan.includes("hydrogen")) {
      subcategory = "Alternative Fuels";
    } else {
      subcategory = "Alternative Fuels";
    }
  }
  // Power & Utilities
  else if (normChan.includes("grid") || normChan.includes("utility") || normChan.includes("utilities") || normChan.includes("power") || normChan.includes("electricity")) {
    category = "Power & Utilities";
    subcategory = "Grid Infrastructure";
    role = "MEDIA & INFORMATION";
    energyType = "Power Generation";
  }
  // Oil & Gas
  else if (normChan.includes("oil") || normChan.includes("gas") || normChan.includes("upstream") || normChan.includes("lng") || normChan.includes("shale") || normChan.includes("crude") || normChan.includes("refining") || normChan.includes("drill")) {
    category = "Fossil Fuels";
    subcategory = "Upstream";
    role = "MEDIA & INFORMATION";
    energyType = "Oil & Gas Markets";
  }
  // Commodity Markets
  else if (normChan.includes("commodity") || normChan.includes("commodities") || normChan.includes("market") || normChan.includes("markets") || normChan.includes("trade") || normChan.includes("trading") || normChan.includes("pricing") || normChan.includes("price") || normChan.includes("metal") || normChan.includes("freight") || normChan.includes("coal") || normChan.includes("futures")) {
    category = "Commodity & Energy Markets";
    subcategory = "Physical & Financial Trading";
    role = "TRADERS & ANALYSTS";
    energyType = "Commodity Arbitrage";
  }
  // Advisory / Policy / Education
  else if (normChan.includes("policy") || normChan.includes("exchange") || normChan.includes("advisory") || normChan.includes("consult") || normChan.includes("law") || normChan.includes("intel") || normChan.includes("research")) {
    category = "Energy Advisory & Expertise";
    subcategory = "Management Consulting";
    role = "ADVISORS & EXPERTS";
    energyType = "Geopolitics & Strategy";
  }

  return { category, subcategory, role, energyType };
}

// Fetch podcast details from iTunes API
async function fetchPodcastFromItunes(term: string): Promise<Partial<NodeData> | null> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=podcast&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return null;
    const data = await res.json() as { resultCount: number; results: any[] };
    if (data.resultCount > 0) {
      const p = data.results[0];
      if (!p.feedUrl || !p.collectionViewUrl) return null;
      
      const channel = p.trackName;
      const artist = p.artistName;
      const host = cleanHostName(artist);
      const id = slugify(host);
      
      const classification = classifyCategory(channel);

      return {
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
    }
  } catch (e: any) {
    // Ignore timeout or API error
  }
  return null;
}

async function main() {
  console.log("Loading nodes.json...");
  const raw = readFileSync(DATA_PATH, "utf-8");
  const parsed = JSON.parse(raw) as { nodes: NodeData[] };
  const existingNodes = parsed.nodes;

  console.log(`Loaded ${existingNodes.length} existing nodes.`);
  
  // Track existing links and host IDs to avoid duplicates
  const existingHosts = new Set(existingNodes.map(n => n.id));
  const existingAppleUrls = new Set(existingNodes.map(n => n.podcastAppleUrl).filter(Boolean));
  const existingRssUrls = new Set(existingNodes.map(n => n.rssUrl).filter(Boolean));

  console.log(`Starting iTunes API Sourcing for ${SEARCH_TERMS.length} search queries (300ms throttled)...`);
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  let addedCount = 0;
  
  for (let i = 0; i < SEARCH_TERMS.length; i++) {
    const term = SEARCH_TERMS[i];
    console.log(`[${i + 1}/${SEARCH_TERMS.length}] Searching: "${term}"...`);
    
    const result = await fetchPodcastFromItunes(term);
    if (result && result.id) {
      // Check for duplicates
      if (existingHosts.has(result.id)) {
        console.log(`  -> Duplicate ID found (${result.id}). Skipping.`);
      } else if (result.podcastAppleUrl && existingAppleUrls.has(result.podcastAppleUrl)) {
        console.log(`  -> Duplicate Apple Podcast URL. Skipping.`);
      } else if (result.rssUrl && existingRssUrls.has(result.rssUrl)) {
        console.log(`  -> Duplicate RSS URL. Skipping.`);
      } else {
        console.log(`  -> RESOLVED: "${result.channel}" by ${result.host} (ID: ${result.id}, Category: ${result.category})`);
        existingNodes.push(result as NodeData);
        existingHosts.add(result.id);
        if (result.podcastAppleUrl) existingAppleUrls.add(result.podcastAppleUrl);
        if (result.rssUrl) existingRssUrls.add(result.rssUrl);
        addedCount++;
      }
    } else {
      console.log(`  -> No result found.`);
    }
    
    // Throttle
    if (i < SEARCH_TERMS.length - 1) {
      await delay(300);
    }
  }

  console.log(`\nSourcing run complete! Added ${addedCount} brand new prospects.`);
  console.log(`Total database size now: ${existingNodes.length} prospects.`);

  // Write updated nodes back to JSON
  writeFileSync(DATA_PATH, JSON.stringify({ nodes: existingNodes }, null, 2) + "\n", "utf-8");
  console.log("Database written successfully!");
}

main().catch(console.error);
