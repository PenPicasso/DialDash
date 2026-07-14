import { createHash } from "crypto";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { XMLParser } from "fast-xml-parser";
import type { NodeData } from "../lib/types";

type Probe = { url: string; ok: boolean; status?: number; finalUrl?: string; title?: string; error?: string };
type Feed = Probe & { latestTitle?: string; latestPublishedAt?: string; recentTitles?: string[]; energyTitleCount?: number };

const root = join(__dirname, "..");
const outputRoot = join(root, "storage", "sol-round-2");
const parser = new XMLParser({ ignoreAttributes: false, trimValues: true, parseTagValue: false });
const now = Date.now();
const energy = /\b(energy|power|electric|grid|utility|oil|gas|lng|petroleum|nuclear|uranium|solar|wind|renewable|climate|carbon|hydrogen|battery|storage|geothermal|coal|mining|commodity|commodities|pipeline|refinery|offshore|upstream|downstream)\b/i;

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
      energyTitleCount: normalized.filter((item) => energy.test(item.title)).length,
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

  const records = await pooled(selected, async (node) => ({
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
      rss: await feed(node.rssUrl),
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
  }));
  records.sort((a, b) => (a.fitRank || Number.MAX_SAFE_INTEGER) - (b.fitRank || Number.MAX_SAFE_INTEGER));
  mkdirSync(outputRoot, { recursive: true });
  writeFileSync(join(outputRoot, "manifest.json"), `${JSON.stringify({
    methodology: "sol-recovery-v2",
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
