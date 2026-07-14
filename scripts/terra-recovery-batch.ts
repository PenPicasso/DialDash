import { createHash } from "crypto";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { XMLParser } from "fast-xml-parser";
import type { NodeData } from "../lib/types";

type FeedItem = { title: string; publishedAt?: string; link?: string; description?: string };
type FeedAssessment = {
  id: string;
  host: string;
  pointMan?: string;
  fitRank?: number;
  fitScore?: number;
  rssUrl: string;
  channelTitle?: string;
  latest?: FeedItem;
  recentItems: FeedItem[];
  energyHits: number;
  energyTitleEntries: number;
  identityHits: number;
  sourceIntegrity: "HIGH" | "MEDIUM" | "LOW";
  disposition: "RESEARCHABLE" | "MISMATCH" | "SOURCE_ERROR";
  reason: string;
};

const DATA_PATH = join(__dirname, "..", "data", "nodes.json");
const STORAGE_ROOT = join(__dirname, "..", "storage", "terra-recovery");
const args = process.argv.slice(2);
const batch = Math.max(1, Math.min(4, Number(args.find((arg) => arg.startsWith("--batch="))?.split("=")[1] || 1)));
const refresh = args.includes("--refresh");
const limit = 25;
const now = Date.now();
const parser = new XMLParser({ ignoreAttributes: false, trimValues: true, parseTagValue: false });

const energyPattern = /\b(energy|electric(?:ity)?|power|grid|utility|utilities|oil|gas|lng|petrol(?:eum)?|nuclear|uranium|solar|wind|renewable|climate|carbon|emissions|hydrogen|battery|storage|heat pump|geothermal|coal|mining|commodit(?:y|ies)|pipeline|refiner(?:y|ies)|offshore|upstream|downstream)\b/gi;
const titleEnergyPattern = /\b(energy|electric(?:ity)?|grid|utility|utilities|oil|gas|lng|petrol(?:eum)?|nuclear|uranium|solar|wind|renewable|climate|carbon|emissions|hydrogen|battery|storage|heat pump|geothermal|coal|mining|commodit(?:y|ies)|pipeline|refiner(?:y|ies)|offshore|upstream|downstream)\b/i;

function string(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function values(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
}

function first(value: unknown) {
  return values(value)[0];
}

function date(value: unknown) {
  const text = string(value);
  const timestamp = new Date(text).getTime();
  return Number.isFinite(timestamp) && timestamp <= now + 60_000 ? new Date(timestamp).toISOString() : undefined;
}

function terms(value: string) {
  return value.toLowerCase().match(/[a-z0-9]{4,}/g)?.filter((term) => !["energy", "podcast", "show", "with", "from", "the", "and"].includes(term)) || [];
}

function toItem(raw: unknown): FeedItem {
  const item = (raw || {}) as Record<string, unknown>;
  const enclosure = first(item.enclosure) as Record<string, unknown> | undefined;
  return {
    title: string(item.title) || "Untitled episode",
    publishedAt: date(item.pubDate || item.published || item["dc:date"]),
    link: string(item.link) || string(enclosure?.["@_url"]),
    description: string(item.description || item["content:encoded"] || item.summary),
  };
}

async function fetchFeed(node: NodeData): Promise<FeedAssessment> {
  const base = {
    id: node.id,
    host: node.host,
    pointMan: node.pointManName || node.contentOwnerName,
    fitRank: node.fitRank,
    fitScore: node.fitScore,
    rssUrl: node.rssUrl!,
  };
  try {
    const response = await fetch(node.rssUrl!, { headers: { "user-agent": "DialDash Terra recovery audit/1.0" }, signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = parser.parse(await response.text()) as Record<string, unknown>;
    const channel = (xml.rss as Record<string, unknown> | undefined)?.channel || (xml.feed as Record<string, unknown> | undefined) || {};
    const record = channel as Record<string, unknown>;
    const rawItems = record.item || record.entry;
    const recentItems = values(rawItems).slice(0, 10).map(toItem);
    const channelTitle = string(record.title);
    const corpus = `${channelTitle} ${recentItems.map((item) => `${item.title} ${item.description || ""}`).join(" ")}`;
    const energyHits = (corpus.match(energyPattern) || []).length;
    const energyTitleEntries = recentItems.filter((item) => titleEnergyPattern.test(item.title)).length;
    const identityTerms = [...terms(node.pointManName || ""), ...terms(node.contentOwnerName || ""), ...terms(node.organizationName || "")];
    const identityCorpus = `${channelTitle} ${recentItems.map((item) => item.title).join(" ")}`.toLowerCase();
    const identityHits = [...new Set(identityTerms)].filter((term) => identityCorpus.includes(term)).length;
    const latest = recentItems.find((item) => item.publishedAt);
    const domainSignals = /energy|power|oil|gas|nuclear|renew|climate|solar|grid|utility|petro|hydrogen/i.test(node.rssUrl || "");
    const energyBrandedChannel = titleEnergyPattern.test(channelTitle);
    const sourceIntegrity = energyHits >= 8 && energyTitleEntries >= 2 && (energyBrandedChannel || identityHits >= 1 || domainSignals)
      ? "HIGH"
      : energyHits >= 3 && energyTitleEntries >= 2
        ? "MEDIUM"
        : "LOW";
    const disposition = sourceIntegrity === "LOW" ? "MISMATCH" : "RESEARCHABLE";
    return {
      ...base,
      channelTitle,
      latest,
      recentItems,
      energyHits,
      energyTitleEntries,
      identityHits,
      sourceIntegrity,
      disposition,
      reason: disposition === "MISMATCH"
        ? "The actual feed's latest ten entries do not provide enough energy-topic evidence to support this record's energy-creator claim."
        : "The actual feed has current energy-topic evidence and is eligible for first-party owner, offer, contact, funnel, and video-gap research.",
    };
  } catch (error) {
    return {
      ...base,
      recentItems: [],
      energyHits: 0,
      energyTitleEntries: 0,
      identityHits: 0,
      sourceIntegrity: "LOW",
      disposition: "SOURCE_ERROR",
      reason: `The RSS source could not be verified: ${error instanceof Error ? error.message : "unknown error"}.`,
    };
  }
}

async function pooled<T, R>(items: T[], worker: (item: T) => Promise<R>) {
  const output: R[] = [];
  const queue = [...items];
  let completed = 0;
  const workers = Array.from({ length: 10 }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item) {
        output.push(await worker(item));
        completed += 1;
        if (completed % 25 === 0 || completed === items.length) console.log(`audited ${completed}/${items.length} feeds`);
      }
    }
  });
  await Promise.all(workers);
  return output;
}

async function main() {
const nodes = (JSON.parse(readFileSync(DATA_PATH, "utf8")) as { nodes: NodeData[] }).nodes;
const candidates = nodes
  .filter((node) => node.methodologyDecision === "DISQUALIFIED" && node.rssUrl && node.isPodcastOnly && node.latestPodcastPublishedAt && now - new Date(node.latestPodcastPublishedAt).getTime() <= 90 * 86_400_000)
  .sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0) || (a.fitRank || Number.MAX_SAFE_INTEGER) - (b.fitRank || Number.MAX_SAFE_INTEGER));
const auditPath = join(STORAGE_ROOT, "source-integrity-audit.json");
const cached = !refresh && (() => {
  try {
    const parsed = JSON.parse(readFileSync(auditPath, "utf8")) as { assessed?: FeedAssessment[] };
    return Array.isArray(parsed.assessed) ? parsed.assessed : undefined;
  } catch {
    return undefined;
  }
})();
const assessed = cached || await pooled(candidates, fetchFeed);
const ranked = assessed
  .filter((item) => item.disposition === "RESEARCHABLE" && item.latest?.publishedAt && now - new Date(item.latest.publishedAt).getTime() <= 90 * 86_400_000)
  .sort((a, b) => (b.sourceIntegrity === "HIGH" ? 1 : 0) - (a.sourceIntegrity === "HIGH" ? 1 : 0) || (b.fitScore || 0) - (a.fitScore || 0) || (a.fitRank || Number.MAX_SAFE_INTEGER) - (b.fitRank || Number.MAX_SAFE_INTEGER))
  .slice(0, 100);

mkdirSync(STORAGE_ROOT, { recursive: true });
if (!cached) {
  writeFileSync(auditPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), assessed, selectedCount: ranked.length }, null, 2)}\n`);
}

const records = ranked.slice((batch - 1) * limit, batch * limit);
const sampled = records.filter((record) => Number.parseInt(createHash("sha256").update(record.id).digest("hex").slice(0, 2), 16) % 5 === 0);
const output = {
  generatedAt: new Date().toISOString(),
  batch,
  totalSelected: ranked.length,
  records,
  auditSample: sampled.map((record) => record.id),
  rules: [
    "Do not promote or change data/nodes.json from this output.",
    "Use official first-party pages to verify owner, buyer, contact, offer, and funnel.",
    "No Firecrawl. Missing evidence is UNVERIFIED, never DISQUALIFIED_CONFIRMED.",
    "A YouTube channel is not a failure by itself; inspect short-form distribution quality.",
  ],
};
writeFileSync(join(STORAGE_ROOT, `batch-${batch}.json`), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ batch, cache: Boolean(cached), assessed: assessed.length, selected: ranked.length, records: records.length, sample: sampled.length, highIntegrity: ranked.filter((item) => item.sourceIntegrity === "HIGH").length }, null, 2));
}

void main();
