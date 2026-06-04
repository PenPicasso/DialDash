import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// Load environment variables from .env.local
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

const TAVILY_KEY = process.env.TAVILY_API_KEY;
const JINA_KEY = process.env.JINA_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
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

  // Point-Man & Reachability Fields
  pointManName?: string;
  organizationName?: string;
  creatorRole?: string;
  bestOutreachChannel?: string;
  linkedinUrl?: string;
  sourceUrl?: string;
  confidenceScore?: number;
  reachabilityScore?: number;
  reachabilityStatus?: "STRONG" | "WEAK";
  manualReviewReason?: string;
};

// Blacklist of corporate monoliths, large news desks, NGOs, and generic agencies
const MONOLITH_BLACKLIST = [
  "bloomberg",
  "s&p global",
  "s and p global",
  "platts",
  "reuters",
  "mckinsey",
  "boston consulting group",
  "bcg",
  "bain & company",
  "wood mac",
  "wood mackenzie",
  "goldman sachs",
  "morgan stanley",
  "jp morgan",
  "chevron",
  "exxon",
  "shell",
  "bp plc",
  "saudi aramco",
  "world bank",
  "international energy agency",
  "iea",
  "united nations",
  "irena",
  "cop28",
  "cop29",
  "greenpeace",
  "sierra club"
];

// Helper: Slugify text for unique IDs
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

// Check if a name/organization matches a monolith
function isMonolith(text: string): boolean {
  const lower = text.toLowerCase();
  return MONOLITH_BLACKLIST.some(m => lower.includes(m));
}

// Clean and validate human names (strict but allows accents and prefixes/connectors)
function cleanAndValidateName(rawName: string): string | null {
  if (!rawName) return null;
  // Strip academic titles
  let name = rawName.replace(/^(Dr\.|Prof\.|Professor|Associate Professor|Assistant Professor|Sir|Lord|Lady)\s+/i, "");
  // Strip trailing academic degrees or suffixes like Ph.D, PhD, PE, Jr, Sr, III
  name = name.replace(/,\s*(?:Ph\.?D|P\.?E|Jr\.?|Sr\.?|III|II|IV)\b/gi, "");
  // Clean whitespace
  name = name.replace(/\s+/g, " ").trim();

  const words = name.split(/\s+/);
  if (words.length < 2 || words.length > 4) return null;

  // Blacklist of common non-name words in English
  const blacklist = new Set([
    "and", "of", "the", "is", "a", "an", "or", "in", "at", "for", "with", "by", "from", "on", "to", "co", 
    "host", "founder", "author", "writer", "editor", "podcast", "show", "energy", "oil", "gas", "power", "grid", 
    "research", "group", "media", "university", "institute", "center", "school", "college", "association", 
    "society", "alliance", "coalition", "corporation", "corp", "inc", "limited", "ltd", "llc", "global", 
    "news", "weekly", "daily", "bulletin", "insights", "analytics", "advisors", "capital", "partners", 
    "investors", "associates", "consulting", "services", "ventures", "management", "solutions", "systems",
    "today", "network", "channel", "official", "various", "guest", "hosts", "speakers", "net", "zero",
    "carbon", "climate", "clean", "renewables", "fossil", "fuels", "nuclear", "now", "founding", "about",
    "us", "team", "people", "staff", "board", "contact", "home", "page", "blog", "articles", "press"
  ]);

  for (const w of words) {
    const lower = w.toLowerCase();
    if (blacklist.has(lower)) return null;
  }

  // Check if each word starts with an uppercase letter or is a common prefix/connector
  const connectors = new Set(["van", "der", "de", "du", "von", "ten", "ter", "la", "le", "da", "di", "do", "dos", "y", "e", "al"]);
  
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (i > 0 && connectors.has(w.toLowerCase())) {
      continue;
    }
    
    // Must start with Unicode uppercase character
    if (!/^\p{Lu}/u.test(w)) {
      return null;
    }
  }

  return name;
}

// Call Gemini API with automatic model fallback
async function callGeminiAPI(prompt: string, jsonMode = false, failFast = false): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not defined");

  const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
  
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    let retries = 3;
    let delay = 15000; // Start with 15s delay to clear transient/per-second limits
    
    while (retries > 0) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined
          }),
          signal: AbortSignal.timeout(90000)
        });
        
        if (response.ok) {
          const data = await response.json() as any;
          return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }
        
        const errText = await response.text();
        
        if (response.status === 429) {
          if (failFast) {
            throw new Error(`Rate limit exceeded (429) on model ${model} (failFast enabled)`);
          }
          console.warn(`  -> [Gemini Warning] Model ${model} rate limited (429). Retrying in ${delay / 1000}s... (Retries left: ${retries - 1})`);
          await new Promise(r => setTimeout(r, delay));
          retries--;
          delay *= 2.0; // Exponential backoff to 30s, 60s
          continue;
        }
        
        console.warn(`  -> [Gemini Warning] Model ${model} failed with status ${response.status}: ${errText}`);
        break; // Fail immediately on non-429 for this model
        
      } catch (e: any) {
        if (failFast && (e.message?.includes("429") || e.message?.includes("limit"))) {
          throw e;
        }
        console.warn(`  -> [Gemini Warning] Model ${model} threw error:`, e.message || e);
        if (e.name === "TimeoutError" || e.message.includes("timeout") || e.message.includes("aborted")) {
          console.warn(`  -> Retrying due to timeout...`);
          retries--;
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        break;
      }
    }
  }
  throw new Error("All Gemini models failed");
}

// Generate active niche creators in a category
async function generateGeminiCandidates(category: Category, limit = 50): Promise<any[]> {
  console.log(`[Gemini] Generating candidates for category: "${category}"...`);
  const prompt = `
  Generate a JSON list of exactly ${limit} real, active, and reachable energy-market creators, independent analysts, Substack newsletter writers, podcast hosts, YouTubers, and boutique energy advisory founders for the category "${category}".
  
  Rules:
  - Do NOT include generic placeholder or dummy data. Every single item must correspond to a real person and brand in the energy market.
  - Do NOT include large corporate media/institutions (e.g. Bloomberg, S&P Global, Reuters, McKinsey, etc.).
  - Focus on independent analysts, hosts, writers, boutique advisory founders, and specialists.
  - Choose type from: "podcast" | "substack" | "youtube" | "advisory" | "academic" | "newsletter"
  
  Format the output as a JSON array of objects, with these fields:
  - type: "podcast" | "substack" | "youtube" | "advisory" | "academic" | "newsletter"
  - title: Name of the show, newsletter, or firm
  - orgName: Company or brand name
  - pointManName: The verified human founder, host, or lead analyst (e.g. "Rusty Braziel")
  - desc: A brief description of what they focus on
  - sourceUrl: Primary website/Substack/YouTube URL
  
  Return ONLY the JSON array, with no other text, markdown formatting, or explanation.
  `;

  try {
    const jsonText = await callGeminiAPI(prompt, true, true);
    await new Promise(resolve => setTimeout(resolve, 5000)); // Delay to respect rate limits
    const results = JSON.parse(jsonText);
    if (Array.isArray(results)) {
      return results;
    }
  } catch (e: any) {
    console.error(`  -> [Gemini Error] Sourcing failed for category "${category}":`, e.message || e);
  }
  return [];
}

// Call Jina AI Reader to convert page to Markdown and extract point man bios
async function extractBioWithJina(url: string): Promise<{ pointMan?: string; role?: string; bioText?: string }> {
  if (!JINA_KEY) return {};
  const readerUrl = `https://r.jina.ai/${url}`;
  console.log(`  -> [Jina AI] Reading page: ${url}...`);
  try {
    const res = await fetch(readerUrl, {
      headers: {
        "Authorization": `Bearer ${JINA_KEY}`,
        "User-Agent": "Mozilla/5.0"
      },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return {};
    const text = await res.text();
    
    // Parse for common Host/Founder signatures
    const lines = text.split("\n");
    let pointMan: string | undefined;
    let role: string | undefined;
    
    for (const line of lines.slice(0, 100)) { // Scan first 100 lines
      const hostMatch = line.match(/(?:hosted|presented|written)\s+by\s+([A-Z][a-z\u00C0-\u017F]+\s+[A-Z][a-z\u00C0-\u017F]+)/i);
      const founderMatch = line.match(/(?:founder|creator|author|director)\s*:\s*([A-Z][a-z\u00C0-\u017F]+\s+[A-Z][a-z\u00C0-\u017F]+)/i);
      if (hostMatch) {
        const validated = cleanAndValidateName(hostMatch[1]);
        if (validated) {
          pointMan = validated;
          role = "Host";
          break;
        }
      }
      if (founderMatch) {
        const validated = cleanAndValidateName(founderMatch[1]);
        if (validated) {
          pointMan = validated;
          role = "Founder";
          break;
        }
      }
    }
    return { pointMan, role, bioText: text.substring(0, 500) };
  } catch (e) {
    // Fail silently
  }
  return {};
}

// Call Tavily Search API
async function searchTavily(query: string): Promise<{ answer?: string; results: { title: string; url: string; content: string }[] }> {
  if (!TAVILY_KEY) return { results: [] };
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query,
        search_depth: "basic",
        include_answer: true
      }),
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return { results: [] };
    const json = await res.json() as any;
    return {
      answer: json.answer,
      results: (json.results || []).map((r: any) => ({ title: r.title, url: r.url, content: r.content }))
    };
  } catch (e: any) {
    console.error(`  -> [Tavily Error] Search failed for "${query}":`, e.message || e);
    return { results: [] };
  }
}

// Sourcing 1: OpenAlex (Academic Leads / Researchers)
async function sourceOpenAlex(term: string): Promise<any[]> {
  const url = `https://api.openalex.org/authors?search=${encodeURIComponent(term)}&limit=50`;
  console.log(`[OpenAlex] Searching authors for: "${term}"...`);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const json = await res.json() as { results: any[] };
    return (json.results || []).filter(r => r.last_known_institution);
  } catch (e) {
    return [];
  }
}

// Sourcing 2: iTunes Sourcing (Broad Podcast Sourcing)
async function sourceItunes(term: string): Promise<any[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=podcast&limit=50`;
  console.log(`[iTunes] Searching podcasts for: "${term}"...`);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const json = await res.json() as { results: any[] };
    return json.results || [];
  } catch (e) {
    return [];
  }
}

// Sourcing 3: YouTube Search Sourcing
async function sourceYoutube(query: string): Promise<any[]> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAg%253D%253D`;
  console.log(`[YouTube] Scraping channel results for: "${query}"...`);
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
        results.push({
          channelId: cr.channelId,
          title: cr.title?.simpleText || cr.title?.runs?.[0]?.text,
          handle: cr.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl,
          description: cr.descriptionSnippet?.runs?.map((r: any) => r.text).join('') || ""
        });
      }
    }
    return results;
  } catch (e) {
    return [];
  }
}

// Sourcing 4: Substack Sourcing (via Tavily)
async function sourceSubstacks(niche: string): Promise<any[]> {
  const query = `site:substack.com energy ${niche} newsletter`;
  console.log(`[Tavily] Finding Substacks for: "${query}"...`);
  const search = await searchTavily(query);
  const results: any[] = [];
  for (const r of search.results) {
    if (r.url.includes("substack.com") && !r.url.includes("/p/")) {
      results.push({
        title: r.title,
        url: r.url,
        description: r.content
      });
    }
  }
  return results;
}

let isGeminiBlocked = false;

// Helper to extract category from text based on search keywords
function resolveCategoryFromText(text: string, title: string): Category {
  const lower = (text + " " + title).toLowerCase();
  if (lower.includes("grid") || lower.includes("transmission") || lower.includes("electricity") || lower.includes("utility") || lower.includes("utilities") || lower.includes("power market") || lower.includes("power grid")) {
    return "Power & Utilities";
  }
  if (lower.includes("solar") || lower.includes("wind") || lower.includes("renewables") || lower.includes("clean energy") || lower.includes("hydrogen") || lower.includes("decarbonization") || lower.includes("climate")) {
    return "Renewables";
  }
  if (lower.includes("nuclear") || lower.includes("uranium") || lower.includes("smr") || lower.includes("fission") || lower.includes("fusion")) {
    return "Nuclear";
  }
  if (lower.includes("oil") || lower.includes("gas") || lower.includes("fossil") || lower.includes("coal") || lower.includes("lng") || lower.includes("upstream") || lower.includes("petroleum") || lower.includes("drilling")) {
    return "Fossil Fuels";
  }
  if (lower.includes("commodity") || lower.includes("commodities") || lower.includes("trading") || lower.includes("market analyst") || lower.includes("analysts") || lower.includes("pricing")) {
    return "Commodity & Energy Markets";
  }
  if (lower.includes("advisory") || lower.includes("consulting") || lower.includes("expert") || lower.includes("advisors") || lower.includes("boutique") || lower.includes("corporate advisor")) {
    return "Energy Advisory & Expertise";
  }
  if (lower.includes("software") || lower.includes("enabler") || lower.includes("enablers") || lower.includes("infrastructure") || lower.includes("capital") || lower.includes("investment")) {
    return "Energy Enablers";
  }
  return "Energy Media & Research";
}

// Local regex based name extractor from text
function extractNameFromText(text: string): string | null {
  if (!text) return null;
  const patterns = [
    /(?:hosted|founded|created|written|moderated)\s+by\s+([A-Z][a-zA-Z\u00C0-\u017F\-\'\s]+)/i,
    /(?:host|founder|creator|author|analyst|editor)\s+(?:is|was)\s+([A-Z][a-zA-Z\u00C0-\u017F\-\'\s]+)/i,
    /([A-Z][a-zA-Z\u00C0-\u017F\-\'\s]+)\s+(?:is|was)\s+the\s+(?:host|founder|creator|author|analyst)/i,
    /(?:founder|host|creator|author)\s+([A-Z][a-zA-Z\u00C0-\u017F\-\'\s]+)/i
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match) {
      const candidateName = match[1].trim();
      const words = candidateName.split(/\s+/);
      const nameWords: string[] = [];
      for (const w of words) {
        if (/^[A-Z]/.test(w) || ["van", "der", "de", "von", "da", "di", "do", "y", "e"].includes(w.toLowerCase())) {
          nameWords.push(w);
        } else {
          break;
        }
      }
      if (nameWords.length >= 2 && nameWords.length <= 4) {
        const fullName = nameWords.join(" ");
        const validated = cleanAndValidateName(fullName);
        if (validated) return validated;
      }
    }
  }

  // Fallback: check all pairs of capitalized words
  const words = text.split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i].replace(/[^\w]/g, "");
    const w2 = words[i+1].replace(/[^\w]/g, "");
    if (w1.length > 1 && w2.length > 1 && /^[A-Z]/.test(w1) && /^[A-Z]/.test(w2)) {
      const candidateName = `${w1} ${w2}`;
      const validated = cleanAndValidateName(candidateName);
      if (validated) return validated;
    }
  }
  return null;
}

// Local rule-based sifting & Tavily enrichment
async function siftAndEnrichLocally(
  candidate: {
    type: string;
    title: string;
    orgName: string;
    sourceUrl: string;
    desc: string;
    pointManName?: string;
    rssUrl?: string;
    appleUrl?: string;
  },
  existingIds: Set<string>,
  existingX: Set<string>,
  existingYt: Set<string>
): Promise<{ node: NodeData; rejectedReason?: string } | null> {
  if (isMonolith(candidate.title) || isMonolith(candidate.orgName) || isMonolith(candidate.desc)) {
    return { node: {} as NodeData, rejectedReason: "Monolith" };
  }

  let pointMan: string | null = null;
  let organization = candidate.orgName || "";
  let role = "Creator";

  if (candidate.pointManName) {
    pointMan = cleanAndValidateName(candidate.pointManName);
  }

  if (!pointMan) {
    if (candidate.type === "academic") {
      pointMan = cleanAndValidateName(candidate.title);
      organization = candidate.orgName || "Research Institution";
      role = "Research Lead";
    } else if (candidate.type === "podcast") {
      const nameFromArtist = cleanAndValidateName(candidate.orgName);
      if (nameFromArtist) {
        pointMan = nameFromArtist;
        organization = candidate.title;
        role = "Host";
      } else {
        pointMan = extractNameFromText(candidate.desc || "");
        if (!pointMan) {
          pointMan = extractNameFromText(candidate.title || "");
        }
      }
    } else if (candidate.type === "youtube" || candidate.type === "newsletter") {
      const nameFromTitle = cleanAndValidateName(candidate.title);
      if (nameFromTitle) {
        pointMan = nameFromTitle;
        organization = candidate.orgName || candidate.title;
        role = "Creator";
      } else {
        pointMan = extractNameFromText(candidate.desc || "");
      }
    }
  }

  let xProfile: string | undefined;
  let linkedinUrl: string | undefined;
  let email: string | undefined;
  let reachScore = 1; // start with 1 for sourceUrl

  const searchQuery = `who is the founder or host or author of "${candidate.title}" "${candidate.orgName || ''}" energy X profile twitter linkedin email`;
  const searchInfo = await searchTavily(searchQuery);
  await new Promise(resolve => setTimeout(resolve, 800)); // Rate limit buffer

  if (!pointMan) {
    if (searchInfo.answer) {
      pointMan = extractNameFromText(searchInfo.answer);
    }
    if (!pointMan) {
      for (const r of searchInfo.results) {
        pointMan = extractNameFromText(r.content);
        if (pointMan) break;
      }
    }
  }

  if (!pointMan) {
    return { node: {} as NodeData, rejectedReason: "Could not resolve human point-man locally" };
  }

  const cleanName = cleanAndValidateName(pointMan);
  if (!cleanName) {
    return { node: {} as NodeData, rejectedReason: `Invalid human name: "${pointMan}"` };
  }

  reachScore++; // for pointManName

  if (!organization || organization.toLowerCase() === cleanName.toLowerCase()) {
    organization = candidate.orgName || candidate.title || "Independent";
  }

  if (isMonolith(cleanName) || isMonolith(organization)) {
    return { node: {} as NodeData, rejectedReason: "Resolved point-man or organization matches monolith" };
  }

  const allText = (searchInfo.answer || "") + " " + searchInfo.results.map(r => r.content).join(" ");
  
  const liMatch = allText.match(/linkedin\.com\/in\/([a-zA-Z0-9\-_%]+)/i);
  if (liMatch) {
    linkedinUrl = `https://www.linkedin.com/in/${liMatch[1]}`;
    reachScore++;
  }

  const xMatch = allText.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,15})/i);
  if (xMatch && !["home", "share", "intent", "search", "hashtag", "settings"].includes(xMatch[1].toLowerCase())) {
    xProfile = `https://x.com/${xMatch[1]}`;
    reachScore++;
  }

  const emailMatch = allText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (emailMatch) {
    email = emailMatch[1];
    reachScore++;
  }

  const id = slugify(cleanName);
  if (existingIds.has(id)) {
    return { node: {} as NodeData, rejectedReason: "Duplicate ID" };
  }

  if (xProfile && existingX.has(xProfile)) {
    return { node: {} as NodeData, rejectedReason: "Duplicate X Profile" };
  }

  if (candidate.sourceUrl && existingYt.has(candidate.sourceUrl)) {
    return { node: {} as NodeData, rejectedReason: "Duplicate Source URL" };
  }

  if (reachScore < 2) {
    return { node: {} as NodeData, rejectedReason: `Failed Reachability Test (Score: ${reachScore})` };
  }

  const reachStatus = reachScore < 3 ? "WEAK" : "STRONG";
  const bestOutreach = email ? "email" : xProfile ? "x_dm" : linkedinUrl ? "linkedin" : "email";
  const cat = resolveCategoryFromText(candidate.desc || "" + " " + candidate.title, candidate.title);
  
  let hostValue = "";
  if (organization && organization.toLowerCase() !== cleanName.toLowerCase() && organization !== "Independent") {
    hostValue = `${cleanName} / ${organization}`;
  } else {
    hostValue = cleanName;
  }

  const newNode: NodeData = {
    id,
    channel: organization,
    host: hostValue,
    energyType: "Energy Market",
    category: cat,
    subcategory: candidate.type === "academic" ? "Academic Research" : candidate.type === "podcast" ? "Podcasts" : candidate.type === "youtube" ? "YouTube Channel" : "Newsletters",
    region: "US",
    priority: "MEDIUM",
    youtubeUrl: candidate.type === "youtube" ? candidate.sourceUrl : undefined,
    xProfile,
    xFollowers: null,
    youtubeSubscribers: null,
    isXOnly: false,
    isPodcastOnly: candidate.type === "podcast",
    podcastAppleUrl: candidate.appleUrl || undefined,
    rssUrl: candidate.rssUrl || undefined,
    email,
    outreachChannels: [bestOutreach],
    marketParticipantRole: candidate.type === "academic" ? "ADVISORS & EXPERTS" : "MEDIA & INFORMATION",
    needsManualReview: cleanName.toLowerCase() === organization.toLowerCase(),
    manualReviewReason: cleanName.toLowerCase() === organization.toLowerCase() ? "Point-man name matches organization name" : undefined,
    
    pointManName: cleanName,
    organizationName: organization,
    creatorRole: role,
    bestOutreachChannel: bestOutreach,
    linkedinUrl,
    sourceUrl: candidate.sourceUrl,
    confidenceScore: reachScore * 16 + 10,
    reachabilityScore: reachScore,
    reachabilityStatus: reachStatus
  };

  return { node: newNode };
}

// LLM-based Sifting & Verification
async function siftAndEnrichWithGemini(
  candidate: {
    type: string;
    title: string;
    orgName: string;
    sourceUrl: string;
    desc: string;
    pointManName?: string;
    rssUrl?: string;
    appleUrl?: string;
  },
  existingIds: Set<string>,
  existingX: Set<string>,
  existingYt: Set<string>
): Promise<{ node: NodeData; rejectedReason?: string } | null> {
  if (isMonolith(candidate.title) || isMonolith(candidate.orgName) || isMonolith(candidate.desc)) {
    return { node: {} as NodeData, rejectedReason: "Monolith" };
  }

  // Fallback immediately if Gemini has been blocked by rate limit exhaustion
  if (isGeminiBlocked) {
    return siftAndEnrichLocally(candidate, existingIds, existingX, existingYt);
  }

  // 1. Perform Tavily Search to gather snippets
  let searchQuery = "";
  if (candidate.pointManName) {
    searchQuery = `"${candidate.pointManName}" "${candidate.orgName || ''}" energy X profile twitter linkedin email`;
  } else {
    searchQuery = `who is the founder or host or author of "${candidate.title}" "${candidate.orgName || ''}" energy X profile twitter linkedin email`;
  }

  const searchInfo = await searchTavily(searchQuery);
  await new Promise(resolve => setTimeout(resolve, 800)); // Rate limit buffer

  // Gather snippets
  const snippets = searchInfo.results.map(r => ({
    title: r.title,
    url: r.url,
    snippet: r.content
  }));

  // 2. Query Gemini to verify and structure the candidate
  const prompt = `
  You are a precise data verification assistant for Energy Dial.
  We are analyzing a candidate prospect:
  Title: "${candidate.title}"
  Organization: "${candidate.orgName || ''}"
  Type: "${candidate.type}"
  Source URL: "${candidate.sourceUrl || ''}"
  Initial Point-Man (if any): "${candidate.pointManName || ''}"
  Description: "${candidate.desc || ''}"

  We did a web search to verify the human operator, socials, and reachability. Here are the search results:
  ${JSON.stringify(snippets, null, 2)}

  Your task:
  1. Verify if there is a specific human point-man (founder, host, author, analyst, or research lead). It must be a specific human name (e.g. "Rusty Braziel" or "David Roberts"), not a company name or "Head of Media" or generic account.
     - If the prospect is a large institution or corporate monolith (e.g. Bloomberg, S&P Global, Reuters, McKinsey, Chevron, Exxon, Shell, IEA, IRENA, Wood Mackenzie, etc.), set pointManName to null.
     - If no specific human host/founder/analyst can be identified, set pointManName to null.
  2. Resolve:
     - pointManName: The human point-man's full name (properly capitalized, e.g. "Rusty Braziel", not "RBN Energy").
     - organizationName: The name of the organization or brand (e.g. "RBN Energy").
     - creatorRole: The role of the point man (e.g. "Founder", "Host", "Author", "Analyst", "Research Lead").
     - xProfile: Personal X/Twitter profile URL (e.g. https://x.com/username) if found. Set to null if not found or if it's a generic corporate brand account.
     - linkedinUrl: Personal LinkedIn profile URL (e.g. https://www.linkedin.com/in/username) if found. Set to null if not found.
     - email: Public email address for outreach if found. Set to null if not found.
     - sourceUrl: Primary website/Substack/YouTube URL.
     - category: Primary category. Must be one of the following exact strings:
       "Fossil Fuels" | "Power & Utilities" | "Renewables" | "Nuclear" | "Energy Enablers" | "Commodity & Energy Markets" | "Energy Media & Research" | "Energy Advisory & Expertise"
     - subcategory: Specific subcategory, e.g. "Upstream", "Grid", "Solar", "SMRs", "Trading", "Podcasts", "Newsletters", "Consulting", "Software", etc.
     - marketParticipantRole: Participant role. Must be one of:
       "OPERATORS" | "SERVICE COMPANIES" | "CAPITAL ALLOCATORS" | "TRADERS & ANALYSTS" | "MEDIA & INFORMATION" | "ADVISORS & EXPERTS" | "INFRASTRUCTURE" | "REGULATORY"
     - energyType: Brief description of energy sector focus (e.g. "Oil & Gas Markets", "Grid Infrastructure", "Clean Energy").
     - reachScore: Count how many of the following are present (0 to 5):
       - pointManName is present (not null)
       - xProfile is present (not null)
       - linkedinUrl is present (not null)
       - email is present (not null)
       - sourceUrl is a valid URL
     - needsManualReview: set to true if pointManName is identical to organizationName, or if the organization is borderline large and needs manual validation of company size.
     - manualReviewReason: why review is needed (or null).

  Return ONLY a JSON object in this format (no markdown code blocks, no text around it):
  {
    "pointManName": string | null,
    "organizationName": string,
    "creatorRole": string | null,
    "xProfile": string | null,
    "linkedinUrl": string | null,
    "email": string | null,
    "sourceUrl": string,
    "category": string,
    "subcategory": string,
    "marketParticipantRole": string,
    "energyType": string,
    "reachScore": number,
    "needsManualReview": boolean,
    "manualReviewReason": string | null
  }
  `;

  let siftResult;
  try {
    const geminiText = await callGeminiAPI(prompt, true, true);
    await new Promise(resolve => setTimeout(resolve, 3500)); // Rate limit buffer
    siftResult = JSON.parse(geminiText);
  } catch (e: any) {
    console.warn(`  -> Gemini call failed: ${e.message}. Marking Gemini as blocked and falling back to local parsing.`);
    isGeminiBlocked = true;
    return siftAndEnrichLocally(candidate, existingIds, existingX, existingYt);
  }

  if (!siftResult.pointManName) {
    return { node: {} as NodeData, rejectedReason: "No personal host or founder point-man identified" };
  }

  // Validate the name structures
  const cleanName = cleanAndValidateName(siftResult.pointManName);
  if (!cleanName) {
    return { node: {} as NodeData, rejectedReason: `Invalid human name format: "${siftResult.pointManName}"` };
  }

  const id = slugify(cleanName);
  if (existingIds.has(id)) {
    return { node: {} as NodeData, rejectedReason: "Duplicate ID" };
  }

  if (siftResult.xProfile && existingX.has(siftResult.xProfile)) {
    return { node: {} as NodeData, rejectedReason: "Duplicate X Profile" };
  }

  if (candidate.sourceUrl && existingYt.has(candidate.sourceUrl)) {
    return { node: {} as NodeData, rejectedReason: "Duplicate Source URL" };
  }

  // Double check monolith after LLM resolution
  if (isMonolith(cleanName) || isMonolith(siftResult.organizationName)) {
    return { node: {} as NodeData, rejectedReason: "Resolved point-man or organization matches monolith" };
  }

  // Enforce Creator Reachability Test (minimum 2 indicators)
  if (siftResult.reachScore < 2) {
    return { node: {} as NodeData, rejectedReason: `Failed Reachability Test (Score: ${siftResult.reachScore})` };
  }

  const reachStatus = siftResult.reachScore < 3 ? "WEAK" : "STRONG";
  const bestOutreach = siftResult.email ? "email" : siftResult.xProfile ? "x_dm" : siftResult.linkedinUrl ? "linkedin" : "email";

  let hostValue = "";
  if (siftResult.organizationName && siftResult.organizationName.toLowerCase() !== cleanName.toLowerCase()) {
    hostValue = `${cleanName} / ${siftResult.organizationName}`;
  } else {
    hostValue = cleanName;
  }

  const newNode: NodeData = {
    id,
    channel: siftResult.organizationName || candidate.title,
    host: hostValue,
    energyType: siftResult.energyType || "Energy Transition",
    category: siftResult.category as Category,
    subcategory: siftResult.subcategory || "General",
    region: "US", // Default
    priority: "MEDIUM",
    youtubeUrl: candidate.type === "youtube" ? candidate.sourceUrl : (siftResult.sourceUrl?.includes("youtube.com") ? siftResult.sourceUrl : undefined),
    xProfile: siftResult.xProfile || undefined,
    xFollowers: null,
    youtubeSubscribers: null,
    isXOnly: false,
    isPodcastOnly: candidate.type === "podcast",
    podcastAppleUrl: candidate.appleUrl || undefined,
    rssUrl: candidate.rssUrl || undefined,
    email: siftResult.email || undefined,
    outreachChannels: [bestOutreach],
    marketParticipantRole: siftResult.marketParticipantRole as ParticipantRole,
    needsManualReview: siftResult.needsManualReview || cleanName.toLowerCase() === (siftResult.organizationName || "").toLowerCase(),
    manualReviewReason: siftResult.manualReviewReason || (cleanName.toLowerCase() === (siftResult.organizationName || "").toLowerCase() ? "Point-man name matches organization name" : undefined),
    
    // Point-Man & Reachability fields
    pointManName: cleanName,
    organizationName: siftResult.organizationName,
    creatorRole: siftResult.creatorRole || "Creator",
    bestOutreachChannel: bestOutreach,
    linkedinUrl: siftResult.linkedinUrl || undefined,
    sourceUrl: siftResult.sourceUrl || candidate.sourceUrl,
    confidenceScore: siftResult.reachScore * 16 + 10,
    reachabilityScore: siftResult.reachScore,
    reachabilityStatus: reachStatus
  };

  return { node: newNode };
}

async function main() {
  console.log("Loading nodes.json database...");
  const raw = readFileSync(DATA_PATH, "utf-8");
  const db = JSON.parse(raw) as { nodes: NodeData[] };
  
  const existingIds = new Set(db.nodes.map(n => n.id));
  const existingX = new Set(db.nodes.map(n => n.xProfile).filter(Boolean));
  const existingYt = new Set(db.nodes.map(n => n.youtubeUrl).filter(Boolean));
  const existingApple = new Set(db.nodes.map(n => n.podcastAppleUrl).filter(Boolean));
  const existingRss = new Set(db.nodes.map(n => n.rssUrl).filter(Boolean));

  console.log(`Loaded ${db.nodes.length} existing nodes.`);

  const TARGET_ADDED = 6;
  let candidatesPool: any[] = [];
  
  // 1. Sourcing Candidates from Gemini (Targeting balance)
  const categories: Category[] = [
    "Energy Advisory & Expertise",
    "Energy Enablers",
    "Commodity & Energy Markets",
    "Nuclear",
    "Power & Utilities",
    "Fossil Fuels",
    "Renewables",
    "Energy Media & Research"
  ];

  for (const cat of categories) {
    const list = await generateGeminiCandidates(cat, 30);
    for (const item of list) {
      candidatesPool.push(item);
    }
    await new Promise(resolve => setTimeout(resolve, 15000)); // Delay between categories
  }

  // 2. Sourcing from Search APIs (iTunes, YouTube, OpenAlex, Substack)
  const alexTerms = [
    "microgrids grid", "energy economics", "grid integration", "wind turbine tech", 
    "solar PV solar", "battery materials", "geothermal drilling", "hydropower energy", 
    "nuclear engineering", "carbon capture utilization", "bioenergy conversion", "energy storage systems"
  ];
  for (const t of alexTerms) {
    const authors = await sourceOpenAlex(t);
    for (const a of authors) {
      candidatesPool.push({
        type: "academic",
        title: a.display_name,
        orgName: a.last_known_institution?.display_name || "Research Institute",
        sourceUrl: a.id,
        desc: `Academic researcher specializing in energy, grid, or materials at ${a.last_known_institution?.display_name || 'institution'}`
      });
    }
  }

  const podcastTerms = [
    "microgrid energy", "grid integration", "wind solar power", "battery storage technology", 
    "geothermal power", "energy trading markets", "oil and gas upstream", "lng market pricing", 
    "nuclear energy transition", "carbon capture technology", "energy advisory podcast", "boutique advisory consulting"
  ];
  for (const t of podcastTerms) {
    const podcasts = await sourceItunes(t);
    for (const p of podcasts) {
      candidatesPool.push({
        type: "podcast",
        title: p.trackName,
        orgName: p.artistName || "Independent Podcast",
        sourceUrl: p.collectionViewUrl,
        rssUrl: p.feedUrl,
        appleUrl: p.collectionViewUrl,
        desc: p.primaryGenreName + " podcast focusing on energy, infrastructure, and commodity markets"
      });
    }
  }

  const ytTerms = [
    "microgrids energy storage", "grid integration utilities", "wind turbine engineering", 
    "solar farm developer", "geothermal power generation", "energy trading commentary", 
    "upstream oil gas analysis", "lng infrastructure pipeline", "smrs nuclear technology"
  ];
  for (const t of ytTerms) {
    const channels = await sourceYoutube(t);
    for (const c of channels) {
      candidatesPool.push({
        type: "youtube",
        title: c.title,
        orgName: c.title,
        sourceUrl: `https://www.youtube.com${c.handle}`,
        desc: c.description
      });
    }
  }

  const substackTerms = [
    "microgrid systems", "battery technologies", "clean energy financing", 
    "energy regulation law", "natural gas pipeline", "crude oil commentary"
  ];
  for (const t of substackTerms) {
    const substacks = await sourceSubstacks(t);
    for (const s of substacks) {
      candidatesPool.push({
        type: "substack",
        title: s.title,
        orgName: s.title,
        sourceUrl: s.url,
        desc: s.description || "Substack newsletter focusing on energy markets"
      });
    }
  }

  console.log(`\nCandidate gathering completed. Pool size: ${candidatesPool.length} candidates.`);
  
  // De-duplicate candidatesPool against itself by title or sourceUrl
  const seenTitles = new Set<string>();
  const seenUrls = new Set<string>();
  const uniquePool: any[] = [];
  
  for (const c of candidatesPool) {
    const slugTitle = slugify(c.title);
    if (seenTitles.has(slugTitle)) continue;
    if (c.sourceUrl && seenUrls.has(c.sourceUrl)) continue;
    seenTitles.add(slugTitle);
    if (c.sourceUrl) seenUrls.add(c.sourceUrl);
    uniquePool.push(c);
  }
  
  console.log(`De-duplicated pool size: ${uniquePool.length} candidates.`);
  console.log(`Starting sifting to add exactly ${TARGET_ADDED} candidates...`);

  let sourcedCount = uniquePool.length;
  let rejectedCount = 0;
  let addedCount = 0;
  let manualReviewCount = 0;

  const rejectedMonoliths: string[] = [];
  const pointManOverrides: string[] = [];
  const addedNodes: NodeData[] = [];

  for (const candidate of uniquePool) {
    if (addedCount >= TARGET_ADDED) {
      console.log(`\nReached target of ${TARGET_ADDED} added nodes. Halting.`);
      break;
    }

    // Skip if already in database (duplicate check)
    if (candidate.sourceUrl && (existingYt.has(candidate.sourceUrl) || existingApple.has(candidate.sourceUrl))) {
      console.log(`  -> SKIPPED duplicate url: "${candidate.title}"`);
      continue;
    }
    if (candidate.appleUrl && existingApple.has(candidate.appleUrl)) {
      console.log(`  -> SKIPPED duplicate appleUrl: "${candidate.title}"`);
      continue;
    }

    try {
      const result = await siftAndEnrichWithGemini(candidate, existingIds, existingX, existingYt);
      if (!result) continue;

      if (result.rejectedReason) {
        rejectedCount++;
        if (result.rejectedReason.includes("Monolith") || result.rejectedReason.includes("monolith")) {
          rejectedMonoliths.push(candidate.title);
        }
        console.log(`  -> REJECTED: "${candidate.title}" (${candidate.type}) - Reason: ${result.rejectedReason}`);
        continue;
      }

      const node = result.node;
      
      // Successfully sifted & verified
      db.nodes.push(node);
      addedNodes.push(node);
      existingIds.add(node.id);
      if (node.xProfile) existingX.add(node.xProfile);
      if (node.youtubeUrl) existingYt.add(node.youtubeUrl);
      
      addedCount++;
      if (node.needsManualReview) manualReviewCount++;

      if (node.host.includes(" / ")) {
        pointManOverrides.push(node.host);
      }

      console.log(`  -> ADDED [${addedCount}/${TARGET_ADDED}]: ${node.host} (Category: ${node.category}, Reachability: ${node.reachabilityStatus})`);

      // Write changes incrementally to prevent data loss
      if (addedCount % 1 === 0) {
        writeFileSync(DATA_PATH, JSON.stringify(db, null, 2) + "\n", "utf-8");
      }

    } catch (e: any) {
      console.error(`Error sifting candidate ${candidate.title}:`, e.message || e);
    }
  }

  // Final database write
  writeFileSync(DATA_PATH, JSON.stringify(db, null, 2) + "\n", "utf-8");
  console.log("\nDatabase written successfully!");

  // Output test batch metrics report
  console.log("\n=================== BATCH PIPELINE RUN SUMMARY ===================");
  console.log(`* Number Sourced: ${sourcedCount}`);
  console.log(`* Number Rejected: ${rejectedCount}`);
  console.log(`* Number Added: ${addedCount}`);
  console.log(`* Number Needing Manual Review: ${manualReviewCount}`);
  
  console.log("\n--- EXAMPLES OF REJECTED MONOLITHS ---");
  console.log(rejectedMonoliths.slice(0, 15).map(m => `- ${m}`).join("\n"));
  
  console.log("\n--- EXAMPLES OF RBN-STYLE CASES (Host resolved to Point Man / Organization) ---");
  console.log(pointManOverrides.slice(0, 15).map(o => `- ${o}`).join("\n"));
  console.log("==================================================================");
}

main().catch(console.error);
