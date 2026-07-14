import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { XMLParser } from "fast-xml-parser";
import type { NodeData } from "../lib/types";

type ManifestRecord = {
  id: string;
  fitRank?: number;
  fitScore?: number;
  ownedLongForm?: { evidenceUrl?: string };
  evidence?: string[];
};

type FeedItem = { title: string; publishedAt?: string; url?: string };
type Probe = { url: string; ok: boolean; status?: number; finalUrl?: string; title?: string; error?: string };

const root = join(__dirname, "..");
const batch = Number(process.argv.find((arg) => arg.startsWith("--batch="))?.split("=")[1] || 0);
const cohort = process.argv.find((arg) => arg.startsWith("--cohort="))?.split("=")[1] || "next-200";
if (!/^[a-z0-9-]+$/.test(cohort)) throw new Error("Cohort must use lowercase letters, numbers, and hyphens only.");
if (!Number.isInteger(batch) || batch < 1 || batch > 8) throw new Error("Pass --batch=1 through --batch=8.");

const now = Date.now();
const parser = new XMLParser({ ignoreAttributes: false, trimValues: true, parseTagValue: false });
const energyPattern = /\b(energy|power|electric|grid|utility|oil|gas|lng|petroleum|nuclear|uranium|solar|wind|renewable|climate|carbon|hydrogen|battery|storage|geothermal|coal|mining|commodity|pipeline|refinery|offshore|upstream|downstream)\b/i;

function list<T>(value: T | T[] | undefined): T[] {
  return Array.isArray(value) ? value : value === undefined ? [] : [value];
}

function text(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "#text" in value) return String((value as { "#text": unknown })["#text"]).trim();
  return "";
}

function date(value: unknown) {
  const timestamp = new Date(text(value)).getTime();
  return Number.isFinite(timestamp) && timestamp <= now + 60_000 ? new Date(timestamp).toISOString() : undefined;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return undefined;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

async function appleFeed(appleUrl?: string) {
  const id = appleUrl?.match(/\/id(\d+)/)?.[1];
  if (!id) return undefined;
  try {
    const response = await fetch(`https://itunes.apple.com/lookup?id=${id}&entity=podcast`, { signal: AbortSignal.timeout(12_000) });
    const payload = await response.json() as { results?: Array<Record<string, unknown>> };
    const match = payload.results?.find((item) => item.wrapperType === "track" && item.kind === "podcast");
    const feedUrl = typeof match?.feedUrl === "string" ? match.feedUrl : undefined;
    const officialAppleUrl = typeof match?.collectionViewUrl === "string" ? match.collectionViewUrl : undefined;
    return feedUrl && officialAppleUrl?.startsWith("https://podcasts.apple.com/") ? { feedUrl, appleUrl: officialAppleUrl } : undefined;
  } catch {
    return undefined;
  }
}

async function feed(url?: string) {
  if (!url) return undefined;
  try {
    const response = await fetch(url, { headers: { "user-agent": "DialDash Terra Medium evidence/1.0" }, redirect: "follow", signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return { url, ok: false, status: response.status };
    const xml = parser.parse(await response.text()) as Record<string, unknown>;
    const channel = ((xml.rss as Record<string, unknown> | undefined)?.channel || xml.feed || {}) as Record<string, unknown>;
    const rawItems = list((channel.item || channel.entry) as Record<string, unknown> | Record<string, unknown>[] | undefined).slice(0, 12);
    const items: FeedItem[] = rawItems.map((item) => ({
      title: text(item.title),
      publishedAt: date(item.pubDate || item.published || item.updated || item["dc:date"]),
      url: text(item.link),
    })).filter((item) => item.title || item.publishedAt);
    const publications = items.map((item) => item.publishedAt).filter((value): value is string => Boolean(value));
    const timestamps = publications.map((value) => new Date(value).getTime()).sort((a, b) => b - a);
    const intervals = timestamps.slice(0, -1).map((value, index) => (value - timestamps[index + 1]) / 86_400_000).filter((value) => value >= 0);
    const latestGapDays = timestamps.length ? Number(((now - timestamps[0]) / 86_400_000).toFixed(1)) : undefined;
    const medianIntervalDays = median(intervals);
    return {
      url,
      ok: true,
      finalUrl: response.url,
      channelTitle: text(channel.title),
      items,
      recentPublicationDates: publications.slice(0, 6),
      latestGapDays,
      medianIntervalDays: medianIntervalDays === undefined ? undefined : Number(medianIntervalDays.toFixed(1)),
      cadenceStatus: latestGapDays === undefined ? "UNVERIFIED" : latestGapDays <= 30 ? "ACTIVE" : latestGapDays <= 90 ? "SEMI_ACTIVE" : "INACTIVE",
      energyTitleCount: items.filter((item) => energyPattern.test(item.title)).length,
    };
  } catch (error) {
    return { url, ok: false, error: error instanceof Error ? error.message : "unknown error" };
  }
}

async function probe(url?: string): Promise<Probe | undefined> {
  if (!url) return undefined;
  try {
    const response = await fetch(url, { headers: { "user-agent": "DialDash Terra Medium evidence/1.0" }, redirect: "follow", signal: AbortSignal.timeout(15_000) });
    const body = (response.headers.get("content-type") || "").includes("text/html") ? await response.text() : "";
    return { url, ok: response.ok, status: response.status, finalUrl: response.url, title: body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() };
  } catch (error) {
    return { url, ok: false, error: error instanceof Error ? error.message : "unknown error" };
  }
}

async function pooled<T, R>(items: T[], worker: (item: T) => Promise<R>) {
  const queue = [...items];
  const output: R[] = [];
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item) output.push(await worker(item));
    }
  }));
  return output;
}

async function main() {
  const manifest = JSON.parse(readFileSync(join(root, "storage", `sol-${cohort}`, `batch-${batch}.json`), "utf8")) as { records: ManifestRecord[] };
  const nodes = (JSON.parse(readFileSync(join(root, "data", "nodes.json"), "utf8")) as { nodes: NodeData[] }).nodes;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const records = await pooled(manifest.records, async (record) => {
    const node = byId.get(record.id);
    if (!node) throw new Error(`Missing production lookup row ${record.id}`);
    const direct = await feed(node.rssUrl);
    const apple = direct?.ok ? undefined : await appleFeed(node.podcastAppleUrl);
    const ownedFeed = direct?.ok ? direct : apple?.feedUrl ? await feed(apple.feedUrl) : direct;
    const sourceUrls = [...new Set([
      ownedFeed?.url,
      apple?.appleUrl,
      node.youtubeUrl,
      node.xProfile,
      node.contactUrl,
      node.offerUrl,
      node.sourceEvidenceUrl,
      record.ownedLongForm?.evidenceUrl,
      ...(record.evidence || []),
    ].filter((value): value is string => Boolean(value && /^https?:\/\//i.test(value))))];
    const probes = await pooled(sourceUrls.slice(0, 8), probe);
    const staleFeed = Boolean(ownedFeed?.ok && ownedFeed.latestGapDays !== undefined && ownedFeed.latestGapDays > 90 && ownedFeed.recentPublicationDates.length >= 3);
    return {
      id: record.id,
      fitRank: record.fitRank,
      fitScore: record.fitScore,
      known: {
        host: node.host,
        organization: node.organizationName,
        contentOwner: node.contentOwnerName,
        onMicHost: node.onMicHost,
        economicBuyer: node.economicBuyerName,
        pointMan: node.pointManName,
        contact: node.email || node.contactInfo,
        contactUrl: node.contactUrl,
        offer: node.bofOffer,
        offerUrl: node.offerUrl,
      },
      appleDiscovery: apple,
      ownedFeed,
      sourceProbes: probes,
      deterministicFinding: staleFeed
        ? { decision: "MANUAL_REVIEW", finding: "STALE_FEED_REQUIRES_CROSS_CHANNEL_TRUE_LATEST" }
        : { decision: "MANUAL_REVIEW" },
      manualChecks: ["content owner and on-mic host", "economic buyer", "public contact path", "actual commercial offer", "observed TOF/MOF/BOF", "three-video distribution and educational-quality gap", "transaction-specific pitch hook"],
    };
  });
  records.sort((a, b) => (a.fitRank || Number.MAX_SAFE_INTEGER) - (b.fitRank || Number.MAX_SAFE_INTEGER));
  const outputRoot = join(root, "storage", `terra-medium-${cohort}`);
  mkdirSync(outputRoot, { recursive: true });
  writeFileSync(join(outputRoot, `evidence-batch-${batch}.json`), `${JSON.stringify({ methodology: "terra-medium-evidence-v1", cohort, batch, generatedAt: new Date().toISOString(), firecrawlCalls: 0, records }, null, 2)}\n`);
  console.log(JSON.stringify({ cohort, batch, records: records.length, staleFeedsNeedingCrossChannelCheck: records.filter((record) => record.deterministicFinding.finding).length, manualReview: records.length }, null, 2));
}

void main();
