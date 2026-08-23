import { createHash } from "crypto";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { XMLParser } from "fast-xml-parser";
import type { NodeData } from "../lib/types";

type Probe = { url: string; ok: boolean; status?: number; finalUrl?: string; title?: string; error?: string };
type CadenceStatus = "ACTIVE" | "SEMI_ACTIVE" | "SLOWED" | "INACTIVE" | "UNVERIFIED";
type Cadence = {
  status: CadenceStatus;
  latestGapDays?: number;
  medianIntervalDays?: number;
  slowdownRatio?: number;
  observedPublications: number;
};
type Feed = Probe & {
  latestTitle?: string;
  latestPublishedAt?: string;
  recentTitles?: string[];
  recentPublishedAt?: string[];
  energyTitleCount?: number;
  cadence?: Cadence;
};
type AppleDiscovery = {
  ok: boolean;
  lookupUrl?: string;
  appleUrl?: string;
  feedUrl?: string;
  collectionName?: string;
  error?: string;
};

const root = join(__dirname, "..");
const outputRoot = join(root, "storage", "sol-round-2");
const parser = new XMLParser({ ignoreAttributes: false, trimValues: true, parseTagValue: false });
const now = Date.now();
const energy = /\b(energy|power|electric|grid|utility|oil|gas|lng|petroleum|nuclear|uranium|solar|wind|renewable|climate|carbon|hydrogen|battery|storage|geothermal|coal|mining|commodity|commodities|pipeline|refinery|offshore|upstream|downstream)\b/i;
const youtubeChannelIds: Record<string, string> = {
  "trisha-curtis": "UCHPx_sYrXJ1LmK__fXjWPfA",
};

function list<T>(value: T | T[] | undefined): T[] {
  return Array.isArray(value) ? value : value === undefined ? [] : [value];
}

function text(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "#text" in value) return String((value as { "#text": unknown })["#text"]).trim();
  return "";
}

function validDate(value: unknown) {
  const timestamp = new Date(text(value)).getTime();
  return Number.isFinite(timestamp) && timestamp <= now + 60_000 ? new Date(timestamp).toISOString() : undefined;
}

function cadence(publications: string[]): Cadence {
  const timestamps = publications
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => b - a);
  if (!timestamps.length) return { status: "UNVERIFIED", observedPublications: 0 };
  const intervals = timestamps.slice(0, -1).map((value, index) => (value - timestamps[index + 1]) / 86_400_000).filter((days) => days >= 0);
  const sorted = [...intervals].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length ? (sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2) : undefined;
  const latestGapDays = Math.max(0, (now - timestamps[0]) / 86_400_000);
  const slowdownRatio = median && median > 0 ? latestGapDays / median : undefined;
  let status: CadenceStatus = latestGapDays <= 30 ? "ACTIVE" : latestGapDays <= 90 ? "SEMI_ACTIVE" : "INACTIVE";
  if (status === "ACTIVE" && slowdownRatio !== undefined && slowdownRatio >= 2.5) status = "SLOWED";
  return {
    status,
    latestGapDays: Number(latestGapDays.toFixed(1)),
    medianIntervalDays: median === undefined ? undefined : Number(median.toFixed(1)),
    slowdownRatio: slowdownRatio === undefined ? undefined : Number(slowdownRatio.toFixed(1)),
    observedPublications: timestamps.length,
  };
}

async function discoverAppleFeed(appleUrl?: string): Promise<AppleDiscovery | undefined> {
  if (!appleUrl) return undefined;
  const id = appleUrl.match(/\/id(\d+)/)?.[1];
  if (!id) return { ok: false, appleUrl, error: "Apple podcast ID not found" };
  const lookupUrl = `https://itunes.apple.com/lookup?id=${id}&entity=podcast`;
  try {
    const response = await fetch(lookupUrl, { headers: { "user-agent": "DialDash Sol review/2.1" }, signal: AbortSignal.timeout(12_000) });
    if (!response.ok) return { ok: false, lookupUrl, appleUrl, error: `Apple lookup returned ${response.status}` };
    const payload = await response.json() as { results?: Array<Record<string, unknown>> };
    const result = payload.results?.find((item) => item.wrapperType === "track" && item.kind === "podcast");
    const feedUrl = typeof result?.feedUrl === "string" ? result.feedUrl : undefined;
    const officialAppleUrl = typeof result?.collectionViewUrl === "string" ? result.collectionViewUrl : undefined;
    if (!feedUrl || !officialAppleUrl?.startsWith("https://podcasts.apple.com/")) {
      return { ok: false, lookupUrl, appleUrl, error: "Lookup result failed strict podcast/feed/Apple URL checks" };
    }
    return {
      ok: true,
      lookupUrl,
      appleUrl: officialAppleUrl,
      feedUrl,
      collectionName: typeof result?.collectionName === "string" ? result.collectionName : undefined,
    };
  } catch (error) {
    return { ok: false, lookupUrl, appleUrl, error: error instanceof Error ? error.message : "unknown error" };
  }
}

async function probe(url?: string): Promise<Probe | undefined> {
  if (!url) return undefined;
  try {
    const response = await fetch(url, { headers: { "user-agent": "DialDash Sol review/2.0" }, redirect: "follow", signal: AbortSignal.timeout(12_000) });
    const body = (response.headers.get("content-type") || "").includes("text/html") ? await response.text() : "";
    return {
      url,
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      title: body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim(),
    };
  } catch (error) {
    return { url, ok: false, error: error instanceof Error ? error.message : "unknown error" };
  }
}

async function feed(url?: string): Promise<Feed | undefined> {
  if (!url) return undefined;
  try {
    const response = await fetch(url, { headers: { "user-agent": "DialDash Sol review/2.0" }, redirect: "follow", signal: AbortSignal.timeout(12_000) });
    if (!response.ok) return { url, ok: false, status: response.status, finalUrl: response.url };
    const parsed = parser.parse(await response.text()) as Record<string, unknown>;
    const channel = ((parsed.rss as Record<string, unknown> | undefined)?.channel || parsed.feed || {}) as Record<string, unknown>;
    const items = list((channel.item || channel.entry) as Record<string, unknown> | Record<string, unknown>[] | undefined).slice(0, 12);
    const normalized = items.map((item) => ({
      title: text(item.title),
      publishedAt: validDate(item.pubDate || item.published || item.updated || item["dc:date"]),
    }));
    const recentPublishedAt = normalized.map((item) => item.publishedAt).filter((value): value is string => Boolean(value));
    const latest = normalized.find((item) => item.publishedAt);
    return {
      url,
      ok: true,
      status: response.status,
      finalUrl: response.url,
      title: text(channel.title),
      latestTitle: latest?.title,
      latestPublishedAt: latest?.publishedAt,
      recentTitles: normalized.map((item) => item.title).filter(Boolean),
      recentPublishedAt,
      energyTitleCount: normalized.filter((item) => energy.test(item.title)).length,
      cadence: cadence(recentPublishedAt),
    };
  } catch (error) {
    return { url, ok: false, error: error instanceof Error ? error.message : "unknown error" };
  }
}

async function pooled<T, R>(items: T[], worker: (item: T) => Promise<R>) {
  const queue = [...items];
  const results: R[] = [];
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item) results.push(await worker(item));
    }
  }));
  return results;
}

async function main() {
  const nodes = (JSON.parse(readFileSync(join(root, "data", "nodes.json"), "utf8")) as { nodes: NodeData[] }).nodes;
  const firstReview = JSON.parse(readFileSync(join(root, "data", "terra-review.json"), "utf8")) as { reports: Array<{ id: string }> };
  const pilot = JSON.parse(readFileSync(join(root, "data", "pilot-manifest.json"), "utf8")) as { prospects: Array<{ id: string; existingNodeId?: string }> };
  const completed = new Set([
    ...firstReview.reports.map((item) => item.id),
    ...pilot.prospects.map((item) => item.existingNodeId || item.id),
  ]);
  const selected = nodes
    .filter((node) => !completed.has(node.id))
    .sort((a, b) => (a.fitRank || Number.MAX_SAFE_INTEGER) - (b.fitRank || Number.MAX_SAFE_INTEGER))
    .slice(0, 100);

  const records = await pooled(selected, async (node) => {
    const directFeed = await feed(node.rssUrl);
    const appleDiscovery = directFeed?.ok ? undefined : await discoverAppleFeed(node.podcastAppleUrl);
    const resolvedFeed = directFeed?.ok ? directFeed : appleDiscovery?.ok ? await feed(appleDiscovery.feedUrl) : directFeed;
    const youtubeFeed = youtubeChannelIds[node.id]
      ? await feed(`https://www.youtube.com/feeds/videos.xml?channel_id=${youtubeChannelIds[node.id]}`)
      : undefined;
    return ({
    id: node.id,
    batch: Math.floor(selected.indexOf(node) / 25) + 1,
    auditSample: Number.parseInt(createHash("sha256").update(`round-2:${node.id}`).digest("hex").slice(0, 2), 16) % 5 === 0,
    fitRank: node.fitRank,
    fitScore: node.fitScore,
    host: node.host,
    organization: node.organizationName,
    category: node.category,
    known: {
      pointMan: node.pointManName,
      contentOwner: node.contentOwnerName,
      buyer: node.economicBuyerName,
      offer: node.bofOffer,
      offerUrl: node.offerUrl,
      contact: node.email || node.contactInfo,
      contactUrl: node.contactUrl,
      xProfile: node.xProfile,
      youtubeUrl: node.youtubeUrl,
      appleUrl: node.podcastAppleUrl,
      rssUrl: node.rssUrl,
    },
    freshness: {
      rss: resolvedFeed,
      originalRss: directFeed?.ok ? undefined : directFeed,
      appleDiscovery,
      youtubeFeed,
      youtubePublishedAt: node.latestYoutubePublishedAt,
      youtubeEvidenceUrl: node.latestYoutubeEvidenceUrl,
      podcastPublishedAt: node.latestPodcastPublishedAt,
      podcastEvidenceUrl: node.latestPodcastEvidenceUrl,
    },
    probes: {
      offer: await probe(node.offerUrl),
      contact: await probe(node.contactUrl),
      youtube: await probe(node.youtubeUrl),
      source: await probe(node.sourceEvidenceUrl),
    },
  });
  });
  records.sort((a, b) => (a.fitRank || Number.MAX_SAFE_INTEGER) - (b.fitRank || Number.MAX_SAFE_INTEGER));
  mkdirSync(outputRoot, { recursive: true });
  writeFileSync(join(outputRoot, "manifest.json"), `${JSON.stringify({
    methodology: "sol-recovery-v2.1",
    generatedAt: new Date().toISOString(),
    completedIdsExcluded: completed.size,
    total: records.length,
    cohortHash: createHash("sha256").update(records.map((record) => record.id).join("\n")).digest("hex"),
    records,
  }, null, 2)}\n`);
  for (let batch = 1; batch <= 4; batch += 1) {
    writeFileSync(join(outputRoot, `batch-${batch}.json`), `${JSON.stringify({ batch, records: records.filter((record) => record.batch === batch) }, null, 2)}\n`);
  }
  console.log(JSON.stringify({ total: records.length, firstRank: records[0]?.fitRank, lastRank: records.at(-1)?.fitRank, batches: [1, 2, 3, 4].map((batch) => records.filter((record) => record.batch === batch).length) }, null, 2));
}

void main();
