import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { auditProspectActionability, normalizeCategory } from "../lib/prospectActionability";
import type { Category, NodeData } from "../lib/types";

const ROOT = join(__dirname, "..");
const DATA_PATH = join(ROOT, "data", "nodes.json");
const RUNS_DIR = join(ROOT, "storage", "prospect-runs");
const CACHE_DIR = join(ROOT, "storage", "prospect-cache");

const args = process.argv.slice(2);
const limit = Number(args.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || args[args.indexOf("--limit") + 1] || 25);
const enrich = args.includes("--enrich");
const stdoutOnly = args.includes("--stdout-only");

loadLocalEnv();

type Candidate = {
  type: "podcast" | "newsletter";
  title: string;
  orgName: string;
  desc: string;
  sourceUrl?: string;
  rssUrl?: string;
  appleUrl?: string;
  leadSource: string;
};

type RejectedCandidate = {
  candidate: Candidate;
  reasons: string[];
  node?: NodeData;
};

const SEARCH_TERMS = [
  "energy markets podcast",
  "oil gas market podcast",
  "power grid podcast",
  "electricity markets podcast",
  "renewable energy finance podcast",
  "battery storage podcast",
  "nuclear energy podcast",
  "energy transition newsletter",
  "commodity markets podcast",
  "lng market podcast",
];

async function main() {
  const db = JSON.parse(readFileSync(DATA_PATH, "utf-8")) as { nodes: NodeData[] };
  const existingIds = new Set(db.nodes.map((node) => node.id.toLowerCase()));
  const existingUrls = new Set(
    db.nodes
      .flatMap((node) => [node.youtubeUrl, node.podcastAppleUrl, node.rssUrl, node.sourceUrl])
      .filter((url): url is string => Boolean(url))
      .map((url) => url.toLowerCase()),
  );

  const candidates = await gatherCandidates(limit);
  const accepted: NodeData[] = [];
  const rejected: RejectedCandidate[] = [];

  for (const candidate of candidates) {
    const result = await candidateToNode(candidate, existingIds, existingUrls);
    if (result.reasons.length === 0 && result.node?.actionabilityStatus === "READY") {
      accepted.push(result.node);
      existingIds.add(result.node.id.toLowerCase());
      [result.node.sourceUrl, result.node.podcastAppleUrl, result.node.rssUrl].forEach((url) => {
        if (url) existingUrls.add(url.toLowerCase());
      });
    } else {
      rejected.push({ candidate, reasons: result.reasons, node: result.node });
    }
  }

  const metrics = {
    generatedAt: new Date().toISOString(),
    limit,
    enrich,
    candidates: candidates.length,
    accepted: accepted.length,
    rejected: rejected.length,
    productionWrite: false,
    note: "Dry-run staging never writes data/nodes.json.",
  };

  if (!stdoutOnly) {
    mkdirSync(RUNS_DIR, { recursive: true });
    const runDir = join(RUNS_DIR, toRunId(metrics.generatedAt));
    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(runDir, "candidates.json"), JSON.stringify(candidates, null, 2) + "\n", "utf-8");
    writeFileSync(join(runDir, "accepted.json"), JSON.stringify(accepted, null, 2) + "\n", "utf-8");
    writeFileSync(join(runDir, "rejected.json"), JSON.stringify(rejected, null, 2) + "\n", "utf-8");
    writeFileSync(join(runDir, "metrics.json"), JSON.stringify(metrics, null, 2) + "\n", "utf-8");
    console.log(`Staged prospect run written to ${runDir}`);
  }

  console.log(`Dry run complete. candidates=${metrics.candidates}, accepted=${metrics.accepted}, rejected=${metrics.rejected}`);
}

async function gatherCandidates(maxCount: number): Promise<Candidate[]> {
  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  for (const term of SEARCH_TERMS) {
    if (candidates.length >= maxCount) break;
    const podcasts = await sourceApplePodcasts(term, Math.min(10, maxCount - candidates.length));
    for (const podcast of podcasts) {
      const key = `${podcast.sourceUrl || podcast.title}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(podcast);
      if (candidates.length >= maxCount) break;
    }
  }

  if (enrich && candidates.length < maxCount) {
    const newsletters = await sourceSubstackNewsletters(Math.min(10, maxCount - candidates.length));
    for (const newsletter of newsletters) {
      const key = `${newsletter.sourceUrl || newsletter.title}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(newsletter);
      if (candidates.length >= maxCount) break;
    }
  }

  return candidates;
}

async function sourceApplePodcasts(term: string, maxCount: number): Promise<Candidate[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=podcast&limit=${maxCount}&country=US`;
  const json = await fetchJsonCached(url, `itunes:${term}:${maxCount}`);
  const results = Array.isArray(json?.results) ? json.results : [];

  return results.map((item: any) => ({
    type: "podcast" as const,
    title: String(item.trackName || ""),
    orgName: String(item.artistName || item.trackName || "Independent"),
    desc: String(item.primaryGenreName || "Energy podcast"),
    sourceUrl: item.collectionViewUrl,
    rssUrl: item.feedUrl,
    appleUrl: item.collectionViewUrl,
    leadSource: "apple_podcasts",
  }));
}

async function sourceSubstackNewsletters(maxCount: number): Promise<Candidate[]> {
  if (!process.env.TAVILY_API_KEY) return [];
  const query = "site:substack.com energy markets newsletter analyst";
  const json = await tavilySearchCached(query);
  const results = Array.isArray(json?.results) ? json.results : [];

  return results
    .filter((result: any) => typeof result.url === "string" && result.url.includes("substack.com"))
    .slice(0, maxCount)
    .map((result: any) => ({
      type: "newsletter" as const,
      title: String(result.title || "Energy newsletter"),
      orgName: String(result.title || "Independent newsletter"),
      desc: String(result.content || "Energy markets newsletter"),
      sourceUrl: result.url,
      leadSource: "tavily_substack",
    }));
}

async function candidateToNode(
  candidate: Candidate,
  existingIds: Set<string>,
  existingUrls: Set<string>,
): Promise<{ node?: NodeData; reasons: string[] }> {
  const reasons: string[] = [];
  const pointMan = cleanHumanName(candidate.orgName) || extractName(candidate.desc) || extractName(candidate.title);

  if (!pointMan) reasons.push("could not resolve named human point-man deterministically");

  const duplicateUrl = [candidate.sourceUrl, candidate.appleUrl, candidate.rssUrl]
    .filter((url): url is string => Boolean(url))
    .some((url) => existingUrls.has(url.toLowerCase()));
  if (duplicateUrl) reasons.push("duplicate source URL already exists");

  const id = slugify(pointMan || candidate.title);
  if (existingIds.has(id.toLowerCase())) reasons.push("duplicate point-man id already exists");

  const contactText = enrich ? await lookupContactText(candidate, pointMan) : "";
  const email = extractEmail(contactText);
  const xProfile = extractXProfile(contactText);
  const linkedinUrl = extractLinkedin(contactText);
  const cadence = candidate.rssUrl ? await checkRssCadence(candidate.rssUrl) : undefined;

  const category = classifyCategory(`${candidate.title} ${candidate.desc}`);
  const node: NodeData = {
    id,
    channel: candidate.title,
    host: pointMan ? `${pointMan} / ${candidate.title}` : candidate.title,
    energyType: category === "Fossil Fuels" ? "Oil & Gas Markets" : category,
    category,
    subcategory: candidate.type === "podcast" ? "Podcasts" : "Newsletters",
    region: "Global",
    priority: "MEDIUM",
    xProfile,
    xFollowers: null,
    youtubeSubscribers: null,
    isXOnly: false,
    isPodcastOnly: candidate.type === "podcast",
    podcastAppleUrl: candidate.appleUrl,
    rssUrl: candidate.rssUrl,
    email,
    outreachChannels: email ? ["email"] : xProfile ? ["x_dm"] : linkedinUrl ? ["linkedin"] : [],
    marketParticipantRole: "MEDIA & INFORMATION",
    publishingCadence: cadence?.publishingCadence,
    isActive: cadence?.isActive,
    lastPublishDate: cadence?.lastPublishDate,
    lastKnownPublishDate: cadence?.lastPublishDate,
    sourceOfLastPublishDate: cadence ? "rss" : undefined,
    cadenceConfidence: cadence ? "MEDIUM" : undefined,
    cadenceEvidenceUrl: cadence ? candidate.rssUrl : undefined,
    pointManName: pointMan,
    organizationName: candidate.title,
    creatorRole: candidate.type === "podcast" ? "Host" : "Author",
    linkedinUrl,
    sourceUrl: candidate.sourceUrl || candidate.appleUrl,
    leadSource: candidate.leadSource,
    verificationTier: "DETERMINISTIC",
  };

  const audited = auditProspectActionability(node);
  if (audited.node.actionabilityStatus !== "READY") {
    reasons.push(...audited.reasons);
  }

  return { node: audited.node, reasons: Array.from(new Set(reasons)) };
}

async function checkRssCadence(url: string): Promise<{ publishingCadence: "active" | "semi-active" | "inactive"; isActive: boolean; lastPublishDate?: string } | undefined> {
  try {
    const text = await fetchTextCached(url, `rss:${url}`);
    const dateMatches = Array.from(text.matchAll(/<(?:pubDate|updated|published)>(.*?)<\/(?:pubDate|updated|published)>/gi))
      .map((match) => new Date(match[1]))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());

    const latest = dateMatches[0];
    if (!latest) return undefined;

    const ageDays = (Date.now() - latest.getTime()) / (1000 * 60 * 60 * 24);
    const publishingCadence = ageDays <= 60 ? "active" : ageDays <= 180 ? "semi-active" : "inactive";
    return {
      publishingCadence,
      isActive: publishingCadence !== "inactive",
      lastPublishDate: latest.toISOString().slice(0, 10),
    };
  } catch {
    return undefined;
  }
}

async function lookupContactText(candidate: Candidate, pointMan?: string | null): Promise<string> {
  if (!process.env.TAVILY_API_KEY) return "";
  const query = pointMan
    ? `"${pointMan}" "${candidate.title}" email twitter linkedin`
    : `"${candidate.title}" host founder email twitter linkedin`;
  const json = await tavilySearchCached(query);
  const answer = typeof json?.answer === "string" ? json.answer : "";
  const results = Array.isArray(json?.results) ? json.results : [];
  return `${answer} ${results.map((result: any) => `${result.title || ""} ${result.content || ""} ${result.url || ""}`).join(" ")}`;
}

async function tavilySearchCached(query: string): Promise<any> {
  const key = `tavily:${query}`;
  const cached = readCacheJson(key);
  if (cached) return cached;

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: "basic",
      include_answer: true,
      max_results: 5,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) return {};
  const json = await response.json();
  writeCacheJson(key, json);
  return json;
}

async function fetchJsonCached(url: string, key: string): Promise<any> {
  const cached = readCacheJson(key);
  if (cached) return cached;
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) return {};
  const json = await response.json();
  writeCacheJson(key, json);
  return json;
}

async function fetchTextCached(url: string, key: string): Promise<string> {
  const cached = readCacheText(key);
  if (cached) return cached;
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) return "";
  const text = await response.text();
  writeCacheText(key, text);
  return text;
}

function readCacheJson(key: string): any | undefined {
  const path = cachePath(key, "json");
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeCacheJson(key: string, value: any) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath(key, "json"), JSON.stringify(value, null, 2), "utf-8");
}

function readCacheText(key: string): string | undefined {
  const path = cachePath(key, "txt");
  if (!existsSync(path)) return undefined;
  return readFileSync(path, "utf-8");
}

function writeCacheText(key: string, value: string) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath(key, "txt"), value, "utf-8");
}

function cachePath(key: string, ext: "json" | "txt"): string {
  const digest = createHash("sha256").update(key).digest("hex");
  return join(CACHE_DIR, `${digest}.${ext}`);
}

function loadLocalEnv() {
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

function cleanHumanName(value?: string): string | undefined {
  if (!value) return undefined;
  const name = value
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(podcast|show|media|energy|newsletter|network|official|inc|llc|ltd|limited|group|institute|association)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = name.split(/\s+/);
  if (words.length < 2 || words.length > 4) return undefined;
  if (words.some((word) => !/^[A-Z][a-zA-Z'.-]+$/.test(word))) return undefined;
  return words.join(" ");
}

function extractName(text?: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(/(?:hosted|founded|created|written|presented)\s+by\s+([A-Z][a-zA-Z'.-]+\s+[A-Z][a-zA-Z'.-]+)/i);
  return cleanHumanName(match?.[1]);
}

function extractEmail(text: string): string | undefined {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
}

function extractXProfile(text: string): string | undefined {
  const handle = text.match(/(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,15})/)?.[1];
  return handle ? `https://x.com/${handle}` : undefined;
}

function extractLinkedin(text: string): string | undefined {
  const slug = text.match(/linkedin\.com\/in\/([A-Za-z0-9\-_%]+)/i)?.[1];
  return slug ? `https://www.linkedin.com/in/${slug}` : undefined;
}

function classifyCategory(text: string): Category {
  const lower = text.toLowerCase();
  if (lower.includes("oil") || lower.includes("gas") || lower.includes("lng") || lower.includes("coal")) return "Fossil Fuels";
  if (lower.includes("grid") || lower.includes("utility") || lower.includes("electricity") || lower.includes("power")) return "Power & Utilities";
  if (lower.includes("solar") || lower.includes("wind") || lower.includes("renewable") || lower.includes("hydrogen") || lower.includes("battery")) return "Renewables";
  if (lower.includes("nuclear") || lower.includes("uranium")) return "Nuclear";
  if (lower.includes("commodity") || lower.includes("trading") || lower.includes("market")) return "Commodity & Energy Markets";
  return normalizeCategory("Energy Media & Research");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function toRunId(isoDate: string): string {
  return isoDate.replace(/[:.]/g, "-");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
