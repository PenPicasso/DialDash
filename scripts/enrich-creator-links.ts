import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// Manually load env variables from .env.local
const envPath = join(__dirname, "..", ".env.local");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim();
      process.env[key] = val;
    }
  }
}

const API_KEY = process.env.FIRECRAWL_API_KEY;
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

// Helper to extract website from RSS feed
async function getWebsiteFromRss(rssUrl: string): Promise<string | null> {
  try {
    const res = await fetch(rssUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return null;
    const xml = await res.text();
    const linkMatch = xml.match(/<channel>[\s\S]*?<link>([\s\S]*?)<\/link>/i);
    if (linkMatch) {
      const url = linkMatch[1].trim();
      if (url.startsWith("http")) return url;
    }
    const generalLinkMatch = xml.match(/<link>([\s\S]*?)<\/link>/i);
    if (generalLinkMatch) {
      const url = generalLinkMatch[1].trim();
      if (url.startsWith("http")) return url;
    }
  } catch (e) {
    // Fail silently
  }
  return null;
}

// Call Firecrawl Scrape API
async function scrapeWebsiteWithFirecrawl(url: string): Promise<string | null> {
  if (!API_KEY) {
    console.error("FIRECRAWL_API_KEY is not defined in .env.local");
    return null;
  }
  console.log(`[Firecrawl] Scraping homepage: ${url}...`);
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"]
      }),
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) {
      console.error(`[Firecrawl] Scrape failed with status ${res.status}: ${res.statusText}`);
      return null;
    }
    const json = await res.json() as { success: boolean; data?: { markdown?: string } };
    if (json.success && json.data?.markdown) {
      return json.data.markdown;
    }
  } catch (e: any) {
    console.error(`[Firecrawl] Scrape error for ${url}:`, e.message || e);
  }
  return null;
}

// Call Firecrawl Search API
async function searchWithFirecrawl(query: string): Promise<string[]> {
  if (!API_KEY) {
    console.error("FIRECRAWL_API_KEY is not defined");
    return [];
  }
  console.log(`[Firecrawl] Searching web for: "${query}"...`);
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        limit: 3
      }),
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) {
      console.error(`[Firecrawl] Search failed with status ${res.status}: ${res.statusText}`);
      return [];
    }
    const json = await res.json() as { success: boolean; data?: { url: string }[] };
    if (json.success && json.data) {
      return json.data.map(item => item.url);
    }
  } catch (e: any) {
    console.error(`[Firecrawl] Search error for "${query}":`, e.message || e);
  }
  return [];
}

// Extract links from markdown content
function extractLinks(markdown: string): { youtubeUrl?: string; xProfile?: string; email?: string } {
  const result: { youtubeUrl?: string; xProfile?: string; email?: string } = {};

  // Extract YouTube URLs (excl. watches/shares/embeds)
  const ytRegex = /https?:\/\/(?:www\.)?youtube\.com\/(?:channel\/[a-zA-Z0-9_\-]+|@([a-zA-Z0-9_\-\.]+)|user\/[a-zA-Z0-9_\-]+|c\/[a-zA-Z0-9_\-]+)/gi;
  const ytMatches = markdown.match(ytRegex) || [];
  for (const url of ytMatches) {
    const lowerUrl = url.toLowerCase();
    if (!lowerUrl.includes("/watch") && !lowerUrl.includes("/embed") && !lowerUrl.includes("/share") && !lowerUrl.includes("/feed")) {
      result.youtubeUrl = url;
      break; // Take the first clean match
    }
  }

  // Extract X/Twitter URLs
  const xRegex = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,15})/gi;
  const xMatches = markdown.match(xRegex) || [];
  for (const url of xMatches) {
    const lowerUrl = url.toLowerCase();
    const handle = url.split("/").pop() || "";
    const isJunk = ["search", "share", "intent", "home", "explore", "notifications", "messages", "hashtag", "status", "tos", "privacy", "i"].some(j => handle.toLowerCase() === j || lowerUrl.includes(`/${j}/`));
    if (!isJunk && handle.length > 2) {
      // Normalize to x.com
      result.xProfile = `https://x.com/${handle}`;
      break;
    }
  }

  // Extract Email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailMatches = markdown.match(emailRegex) || [];
  for (const email of emailMatches) {
    const lower = email.toLowerCase();
    // Exclude typical static assets
    if (!lower.endsWith(".png") && !lower.endsWith(".jpg") && !lower.endsWith(".jpeg") && !lower.endsWith(".gif") && !lower.endsWith(".svg")) {
      result.email = email;
      break;
    }
  }

  return result;
}

// Clean up YouTube handles to make sure they are direct
function cleanYoutubeUrl(url: string): string {
  // Normalize double slashes or missing www
  return url.replace(/https?:\/\/(?:www\.)?youtube\.com/i, "https://www.youtube.com");
}

async function processSingleNode(node: NodeData): Promise<boolean> {
  console.log(`\n--------------------------------------------`);
  console.log(`Processing: ${node.host} (${node.id})`);
  console.log(`Current links -> YouTube: ${node.youtubeUrl || 'None'}, X: ${node.xProfile || 'None'}, Email: ${node.email || 'None'}`);

  let updated = false;

  // PASS 1: Website scrape if website available or extracted from RSS
  let websiteUrl = null;
  if (node.rssUrl) {
    websiteUrl = await getWebsiteFromRss(node.rssUrl);
    if (websiteUrl) console.log(`  -> Resolved website URL from RSS: ${websiteUrl}`);
  }

  if (websiteUrl) {
    const markdown = await scrapeWebsiteWithFirecrawl(websiteUrl);
    if (markdown) {
      const extracted = extractLinks(markdown);
      if (extracted.youtubeUrl && !node.youtubeUrl) {
        node.youtubeUrl = cleanYoutubeUrl(extracted.youtubeUrl);
        node.isPodcastOnly = false;
        console.log(`  -> [FOUND YT via Scrape]: ${node.youtubeUrl}`);
        updated = true;
      }
      if (extracted.xProfile && !node.xProfile) {
        node.xProfile = extracted.xProfile;
        console.log(`  -> [FOUND X via Scrape]: ${node.xProfile}`);
        updated = true;
      }
      if (extracted.email && !node.email) {
        node.email = extracted.email;
        console.log(`  -> [FOUND Email via Scrape]: ${node.email}`);
        updated = true;
      }
    }
  }

  // PASS 2: Targeted Web Search Fallback if still missing info
  if (!node.youtubeUrl) {
    const query = `"${node.host}" site:youtube.com`;
    const searchUrls = await searchWithFirecrawl(query);
    for (const url of searchUrls) {
      const lower = url.toLowerCase();
      if (lower.includes("youtube.com/") && !lower.includes("/watch") && !lower.includes("/feed") && !lower.includes("/results")) {
        // Double check handle length/junk
        const handle = url.split("/").pop() || "";
        if (handle.length > 2) {
          node.youtubeUrl = cleanYoutubeUrl(url);
          node.isPodcastOnly = false;
          console.log(`  -> [FOUND YT via Search]: ${node.youtubeUrl}`);
          updated = true;
          break;
        }
      }
    }
  }

  if (!node.xProfile) {
    const query = `"${node.host}" site:x.com`;
    const searchUrls = await searchWithFirecrawl(query);
    for (const url of searchUrls) {
      const handle = url.split("/").pop() || "";
      const isJunk = ["search", "share", "intent", "home", "explore", "notifications", "messages", "hashtag", "status", "tos", "privacy"].some(j => handle.toLowerCase() === j);
      if (url.toLowerCase().includes("x.com/") && !isJunk && handle.length > 2) {
        node.xProfile = `https://x.com/${handle}`;
        console.log(`  -> [FOUND X via Search]: ${node.xProfile}`);
        updated = true;
        break;
      }
    }
  }

  return updated;
}

async function main() {
  console.log("Loading nodes.json...");
  const raw = readFileSync(DATA_PATH, "utf-8");
  const data = JSON.parse(raw) as { nodes: NodeData[] };

  // Parse CLI args
  const args = process.argv.slice(2);
  const targetId = args.includes("--id") ? args[args.indexOf("--id") + 1] : null;
  const limitArg = args.includes("--limit") ? parseInt(args[args.indexOf("--limit") + 1]) : null;
  const priorityArg = args.includes("--priority") ? args[args.indexOf("--priority") + 1] : null;

  let candidates = data.nodes;

  if (targetId) {
    candidates = candidates.filter(n => n.id === targetId);
    console.log(`Targeting single ID: ${targetId}`);
  } else {
    // Focus on nodes missing YouTube or X
    candidates = candidates.filter(n => !n.youtubeUrl || !n.xProfile);
    console.log(`Total nodes missing YT or X: ${candidates.length}`);

    if (priorityArg) {
      candidates = candidates.filter(n => n.priority === priorityArg);
      console.log(`Filter by priority "${priorityArg}": ${candidates.length} remaining`);
    }

    if (limitArg) {
      candidates = candidates.slice(0, limitArg);
      console.log(`Limit execution to top ${limitArg} nodes`);
    }
  }

  if (candidates.length === 0) {
    console.log("No candidates to process.");
    return;
  }

  console.log(`Starting Firecrawl Link Enrichment for ${candidates.length} nodes...`);
  
  let updatedCount = 0;
  for (const node of candidates) {
    const isUpdated = await processSingleNode(node);
    if (isUpdated) {
      updatedCount++;
      // Sync in-memory DB back immediately to preserve progress if script aborts
      const index = data.nodes.findIndex(n => n.id === node.id);
      if (index >= 0) {
        data.nodes[index] = node;
      }
      writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
    }
    // Respectful API spacing
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\nLink enrichment run complete! Updated ${updatedCount} nodes.`);
}

main().catch(console.error);
