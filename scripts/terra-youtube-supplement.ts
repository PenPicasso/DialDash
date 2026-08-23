import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { XMLParser } from "fast-xml-parser";
import type { NodeData } from "../lib/types";

type VideoAssessment = {
  id: string;
  host: string;
  organization?: string;
  youtubeUrl: string;
  channelId?: string;
  channelTitle?: string;
  latest?: { title: string; publishedAt?: string; url?: string };
  recentTitles: string[];
  energyTitleEntries: number;
  identityHits: number;
  disposition: "RESEARCHABLE" | "MISMATCH" | "SOURCE_ERROR";
  reason: string;
};

const root = join(__dirname, "..", "storage", "terra-recovery");
const now = Date.now();
const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });
const energyTitlePattern = /\b(energy|electric(?:ity)?|grid|utility|utilities|oil|gas|lng|petrol(?:eum)?|nuclear|uranium|solar|wind|renewable|climate|carbon|emissions|hydrogen|battery|storage|heat pump|geothermal|coal|mining|commodit(?:y|ies)|pipeline|refiner(?:y|ies)|offshore|upstream|downstream)\b/i;

function terms(value: string) {
  return value.toLowerCase().match(/[a-z0-9]{4,}/g)?.filter((term) => !["energy", "podcast", "show", "with", "from", "the", "and"].includes(term)) || [];
}

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function values(value: unknown): unknown[] { return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]; }
function validDate(value: unknown) {
  const parsed = new Date(text(value)).getTime();
  return Number.isFinite(parsed) && parsed <= now + 60_000 ? new Date(parsed).toISOString() : undefined;
}

async function assess(node: NodeData): Promise<VideoAssessment> {
  const base = { id: node.id, host: node.host, organization: node.organizationName, youtubeUrl: node.youtubeUrl! };
  try {
    const page = await fetch(node.youtubeUrl!, { headers: { "user-agent": "Mozilla/5.0 (DialDash Terra recovery audit)" }, signal: AbortSignal.timeout(8_000) });
    const html = await page.text();
    const channelId = html.match(/"externalId":"(UC[\w-]{22})"/)?.[1] || html.match(/"browseId":"(UC[\w-]{22})"/)?.[1];
    if (!page.ok || !channelId) throw new Error(`unable to resolve owned channel (${page.status})`);
    const feed = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, { headers: { "user-agent": "Mozilla/5.0 (DialDash Terra recovery audit)" }, signal: AbortSignal.timeout(8_000) });
    if (!feed.ok) throw new Error(`feed HTTP ${feed.status}`);
    const atom = parser.parse(await feed.text()) as { feed?: { title?: unknown; entry?: unknown } };
    const channelTitle = text(atom.feed?.title);
    const entries = values(atom.feed?.entry).slice(0, 10).map((entry) => {
      const record = entry as Record<string, unknown>;
      const link = values(record.link).map((value) => (value as Record<string, unknown>)?.["@_href"]).find((value) => typeof value === "string");
      return { title: text(record.title), publishedAt: validDate(record.published), url: text(link) };
    });
    const recentTitles = entries.map((entry) => entry.title);
    const energyTitleEntries = recentTitles.filter((title) => energyTitlePattern.test(title)).length;
    const corpus = `${channelTitle} ${recentTitles.join(" ")}`.toLowerCase();
    const identityHits = [...new Set([...terms(node.host), ...terms(node.organizationName || "")])].filter((term) => corpus.includes(term)).length;
    const current = entries[0]?.publishedAt && now - new Date(entries[0].publishedAt).getTime() <= 90 * 86_400_000;
    const disposition = current && energyTitleEntries >= 2 && identityHits >= 1 ? "RESEARCHABLE" : "MISMATCH";
    return {
      ...base, channelId, channelTitle, latest: entries[0], recentTitles, energyTitleEntries, identityHits, disposition,
      reason: disposition === "RESEARCHABLE"
        ? "Official channel page and uploads feed confirm current, energy-relevant owned video distribution."
        : "The official channel did not establish a current, energy-relevant owned video source for this record.",
    };
  } catch (error) {
    return { ...base, recentTitles: [], energyTitleEntries: 0, identityHits: 0, disposition: "SOURCE_ERROR", reason: error instanceof Error ? error.message : "Unknown source error" };
  }
}

async function main() {
  const nodes = (JSON.parse(readFileSync(join(__dirname, "..", "data", "nodes.json"), "utf8")) as { nodes: NodeData[] }).nodes;
  const audioIds = new Set(JSON.parse(readFileSync(join(root, "source-integrity-audit.json"), "utf8")).assessed.map((item: { id: string }) => item.id));
  const candidates = nodes
    .filter((node) => node.methodologyDecision === "DISQUALIFIED" && node.youtubeUrl && node.latestYoutubePublishedAt && now - new Date(node.latestYoutubePublishedAt).getTime() <= 90 * 86_400_000 && !audioIds.has(node.id))
    .sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0) || (a.fitRank || Number.MAX_SAFE_INTEGER) - (b.fitRank || Number.MAX_SAFE_INTEGER))
    .slice(0, 90);
  const output: VideoAssessment[] = [];
  const queue = [...candidates];
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const node = queue.shift();
      if (node) output.push(await assess(node));
    }
  }));
  const selected = output.filter((item) => item.disposition === "RESEARCHABLE").slice(0, 41);
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "youtube-supplement.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), assessed: output, selected }, null, 2)}\n`);
  console.log(JSON.stringify({ assessed: output.length, selected: selected.length, mismatch: output.filter((item) => item.disposition === "MISMATCH").length, sourceError: output.filter((item) => item.disposition === "SOURCE_ERROR").length }, null, 2));
}

void main();
