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

const YT_SEARCH_QUERIES = [
  "energy transition",
  "renewable energy",
  "power grid utilities",
  "nuclear power energy",
  "oil and gas",
  "clean energy tech",
  "commodity trading markets",
  "battery grid storage",
  "electric utility power",
  "crude oil production",
  "lng gas trading",
  "carbon capture climate",
  "hydrogen energy power",
  "fusion energy reactor",
  "geothermal energy power",
  "climate tech companies",
  "energy economics finance",
  "uranium mining nuclear",
  "electricity trading power",
  "metals trading mining"
];

// Keywords to require in channel title or description to ensure relevance
const ALLOWED_KEYWORDS = [
  "energy", "oil", "gas", "nuclear", "solar", "wind", "grid", "power", "utility", "utilities", 
  "electricity", "renewables", "battery", "storage", "commodity", "commodities", "crude", 
  "lng", "petroleum", "carbon", "mining", "metals", "uranium", "fossil", "coal", "decarbon", 
  "climate", "clean energy", "petrochemical", "electrification", "geothermal", "biomass", 
  "hydrogen", "hydrocarbon"
];

// Blacklisted self-help / non-industry words
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

function parseSubscribers(subText?: string): number | null {
  if (!subText) return null;
  // Matches "15.2K subscribers", "1.2M subscribers", "450 subscribers"
  const match = subText.match(/^([\d\.]+)([K|M]?)\s+subscribers/i);
  if (match) {
    const val = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === 'K') return Math.round(val * 1000);
    if (unit === 'M') return Math.round(val * 1000000);
    return Math.round(val);
  }
  return null;
}

function classifyCategory(title: string, desc: string): { category: Category; subcategory: string; role: ParticipantRole; energyType: string } {
  const combined = `${title} ${desc}`.toLowerCase();
  
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

  return { category, subcategory, role, energyType };
}

function isValidEnergyChannel(title: string, desc: string): boolean {
  const combined = `${title} ${desc}`.toLowerCase();
  
  // Check blacklist
  for (const word of BLACKLIST_KEYWORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    if (regex.test(combined)) {
      return false;
    }
  }
  
  // Require at least one allowed keyword
  for (const kw of ALLOWED_KEYWORDS) {
    const regex = new RegExp(`\\b${kw}\\b`, "i");
    if (regex.test(combined)) {
      return true;
    }
  }
  
  return false;
}

async function searchYouTubeChannels(query: string): Promise<any[]> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAg%253D%253D`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return [];
    const html = await res.text();
    const matches = html.match(/ytInitialData\s*=\s*({.+?});/);
    if (!matches) return [];
    
    const data = JSON.parse(matches[1]);
    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
    if (!contents || !Array.isArray(contents)) return [];
    
    const results: any[] = [];
    for (const item of contents) {
      if (item.channelRenderer) {
        const cr = item.channelRenderer;
        const channelId = cr.channelId;
        const title = cr.title?.simpleText || cr.title?.runs?.[0]?.text;
        const handle = cr.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl;
        const subText = cr.subscriberCountText?.simpleText;
        const descSnippet = cr.descriptionSnippet?.runs?.map((r: any) => r.text).join('') || "";
        
        if (channelId && title && handle) {
          results.push({
            channelId,
            title,
            handle,
            subText,
            description: descSnippet
          });
        }
      }
    }
    return results;
  } catch (e) {
    console.error(`Error searching YouTube for "${query}":`, e);
    return [];
  }
}

async function main() {
  console.log("Loading nodes.json...");
  const raw = readFileSync(DATA_PATH, "utf-8");
  const parsed = JSON.parse(raw) as { nodes: NodeData[] };
  const existingNodes = parsed.nodes;
  console.log(`Loaded ${existingNodes.length} existing nodes.`);
  
  const existingIds = new Set(existingNodes.map(n => n.id));
  const existingChannelIds = new Set(existingNodes.map(n => n.channelId).filter(Boolean));
  const existingYoutubeUrls = new Set(existingNodes.map(n => n.youtubeUrl).filter(Boolean));

  console.log(`Starting YouTube channel search for ${YT_SEARCH_QUERIES.length} queries (500ms throttled)...`);
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  let addedCount = 0;
  
  for (let i = 0; i < YT_SEARCH_QUERIES.length; i++) {
    const query = YT_SEARCH_QUERIES[i];
    console.log(`[${i + 1}/${YT_SEARCH_QUERIES.length}] Searching YouTube: "${query}"...`);
    
    const results = await searchYouTubeChannels(query);
    console.log(`  -> Found ${results.length} raw channel results.`);
    
    for (const r of results) {
      const youtubeUrl = `https://www.youtube.com${r.handle}`;
      
      // De-duplicate
      if (existingChannelIds.has(r.channelId) || existingYoutubeUrls.has(youtubeUrl)) {
        continue;
      }
      
      // Filter relevance
      if (!isValidEnergyChannel(r.title, r.description)) {
        continue;
      }
      
      const id = slugify(r.title);
      if (existingIds.has(id)) {
        continue;
      }
      
      const classification = classifyCategory(r.title, r.description);
      const subs = parseSubscribers(r.subText);
      
      const newNode: NodeData = {
        id,
        channel: r.title,
        host: r.title, // Default to channel name as host for company/editorial channels
        channelId: r.channelId,
        youtubeUrl,
        youtubeSubscribers: subs,
        category: classification.category,
        subcategory: classification.subcategory,
        marketParticipantRole: classification.role,
        energyType: classification.energyType,
        region: "US", // Default
        priority: "MEDIUM",
        isXOnly: false,
        isPodcastOnly: false,
        xFollowers: null,
        outreachChannels: ["email"]
      };
      
      existingNodes.push(newNode);
      existingIds.add(id);
      existingChannelIds.add(r.channelId);
      existingYoutubeUrls.add(youtubeUrl);
      addedCount++;
      
      console.log(`  -> ADDED YouTube: "${r.title}" (Subscribers: ${subs || 'Unknown'}, Category: ${classification.category})`);
    }
    
    if (i < YT_SEARCH_QUERIES.length - 1) {
      await delay(500);
    }
  }

  console.log(`\nSourcing run complete! Added ${addedCount} brand new YouTube channels.`);
  console.log(`Total database size now: ${existingNodes.length} prospects.`);
  
  writeFileSync(DATA_PATH, JSON.stringify({ nodes: existingNodes }, null, 2) + "\n", "utf-8");
  console.log("Database written successfully!");
}

main().catch(console.error);
