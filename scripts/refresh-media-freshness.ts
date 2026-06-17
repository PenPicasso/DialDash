import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { NodeData } from "../lib/types";

type Database = { nodes: NodeData[] };
type MediaHit = {
  publishedAt: string;
  date: string;
  title?: string;
  evidenceUrl?: string;
  source: "youtube" | "rss" | "apple_podcasts" | "itunes_lookup";
  channelId?: string;
  feedUrl?: string;
  appleUrl?: string;
};

type LatestHit = MediaHit & {
  platform: "youtube" | "podcast";
};

const DATA_PATH = join(__dirname, "..", "data", "nodes.json");
const REQUEST_TIMEOUT_MS = 15000;
const NODE_TIMEOUT_MS = 60000;
const CONCURRENCY = 3;

const args = new Set(process.argv.slice(2));
const writeChanges = !args.has("--no-write");
const includeAll = args.has("--all");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;

function decodeHtml(value?: string) {
  if (!value) return undefined;
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .trim();
}

function extractFirst(body: string, pattern: RegExp) {
  return decodeHtml(pattern.exec(body)?.[1]);
}

function toIso(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function toDate(value: string) {
  return value.slice(0, 10);
}

function newer<T extends { publishedAt: string }>(a?: T, b?: T) {
  if (!a) return b;
  if (!b) return a;
  return new Date(b.publishedAt).getTime() > new Date(a.publishedAt).getTime() ? b : a;
}

function applePodcastId(url?: string) {
  return url?.match(/\/id(\d+)/)?.[1];
}

function normalizeYoutubeUrl(url?: string) {
  if (!url) return undefined;
  return url.replace(/\/null$/, "").trim();
}

function isResolvableYoutubeChannelUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("youtube.com")) return false;
    if (parsed.pathname.startsWith("/watch")) return false;
    if (parsed.pathname.startsWith("/playlist")) return false;
    if (parsed.pathname.startsWith("/shorts/")) return false;
    return (
      parsed.pathname.startsWith("/@") ||
      parsed.pathname.startsWith("/channel/") ||
      parsed.pathname.startsWith("/c/") ||
      parsed.pathname.startsWith("/user/")
    );
  } catch {
    return false;
  }
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DialDashFreshness/1.0)",
        Accept: "application/rss+xml, application/xml, text/xml, text/html;q=0.8, */*;q=0.5",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) return undefined;
    return await response.text();
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson<T>(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DialDashFreshness/1.0)",
        Accept: "application/json",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) return undefined;
    return (await response.json()) as T;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

async function withTimeout<T>(label: string, promise: Promise<T>, fallback: T): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeout = setTimeout(() => {
      console.warn(`timeout: ${label}`);
      resolve(fallback);
    }, NODE_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function parseYoutubeEntry(xml: string, feedUrl: string): MediaHit | undefined {
  const entry = /<entry>([\s\S]*?)<\/entry>/i.exec(xml)?.[1];
  if (!entry) return undefined;

  const publishedAt = toIso(extractFirst(entry, /<published>([\s\S]*?)<\/published>/i));
  if (!publishedAt) return undefined;

  const videoId = extractFirst(entry, /<yt:videoId>([\s\S]*?)<\/yt:videoId>/i);
  const link = /<link[^>]+href="([^"]+)"/i.exec(entry)?.[1];

  return {
    publishedAt,
    date: toDate(publishedAt),
    title: extractFirst(entry, /<title>([\s\S]*?)<\/title>/i),
    evidenceUrl: link || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : feedUrl),
    source: "youtube",
  };
}

function parsePodcastFeed(xml: string, feedUrl: string, source: MediaHit["source"]): MediaHit | undefined {
  const item = /<item\b[^>]*>([\s\S]*?)<\/item>/i.exec(xml)?.[1];
  if (item) {
    const publishedAt = toIso(
      extractFirst(item, /<pubDate>([\s\S]*?)<\/pubDate>/i) ||
        extractFirst(item, /<dc:date>([\s\S]*?)<\/dc:date>/i)
    );
    if (publishedAt) {
      return {
        publishedAt,
        date: toDate(publishedAt),
        title: extractFirst(item, /<title>([\s\S]*?)<\/title>/i),
        evidenceUrl: extractFirst(item, /<link>([\s\S]*?)<\/link>/i) || feedUrl,
        source,
      };
    }
  }

  const entry = /<entry\b[^>]*>([\s\S]*?)<\/entry>/i.exec(xml)?.[1];
  if (entry) {
    const publishedAt = toIso(
      extractFirst(entry, /<published>([\s\S]*?)<\/published>/i) ||
        extractFirst(entry, /<updated>([\s\S]*?)<\/updated>/i)
    );
    if (publishedAt) {
      const href = /<link[^>]+href="([^"]+)"/i.exec(entry)?.[1];
      return {
        publishedAt,
        date: toDate(publishedAt),
        title: extractFirst(entry, /<title>([\s\S]*?)<\/title>/i),
        evidenceUrl: href || feedUrl,
        source,
      };
    }
  }

  const channelDate = toIso(
    extractFirst(xml, /<lastBuildDate>([\s\S]*?)<\/lastBuildDate>/i) ||
      extractFirst(xml, /<pubDate>([\s\S]*?)<\/pubDate>/i)
  );

  if (!channelDate) return undefined;

  return {
    publishedAt: channelDate,
    date: toDate(channelDate),
    title: extractFirst(xml, /<title>([\s\S]*?)<\/title>/i),
    evidenceUrl: feedUrl,
    source,
  };
}

function extractRssUrlFromYoutubePage(html: string) {
  return (
    /<link[^>]+type="application\/rss\+xml"[^>]+href="([^"]+)"/i.exec(html)?.[1]?.replace(/&amp;/g, "&") ||
    /https:\/\/www\.youtube\.com\/feeds\/videos\.xml\?channel_id=(UC[a-zA-Z0-9_-]+)/.exec(html)?.[0]
  );
}

function extractChannelIdFromYoutubePage(html: string) {
  const patterns = [
    /"channelId":"(UC[a-zA-Z0-9_-]+)"/,
    /"externalId":"(UC[a-zA-Z0-9_-]+)"/,
    /channel_id=(UC[a-zA-Z0-9_-]+)/,
    /\/channel\/(UC[a-zA-Z0-9_-]+)/,
    /"browseId":"(UC[a-zA-Z0-9_-]+)"/,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) return match[1];
  }

  return undefined;
}

function parseYoutubeFeedMeta(xml: string) {
  const head = xml.split(/<entry>/i)[0] || xml;
  const author = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/i.exec(head)?.[1];

  return {
    title: extractFirst(head, /<title>([\s\S]*?)<\/title>/i),
    author: decodeHtml(author),
  };
}

function youtubePathTokens(url?: string) {
  if (!url) return [];

  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\/+/, "");
    if (path.startsWith("watch") || path.startsWith("playlist") || path.startsWith("shorts/")) return [];
    return tokens(path.replace(/^(@|c\/|user\/|channel\/)/, ""));
  } catch {
    return [];
  }
}

function youtubeFeedScore(node: NodeData, youtubeUrl: string | undefined, xml: string) {
  const meta = parseYoutubeFeedMeta(xml);
  const candidateText = normalizeForMatch(`${meta.title || ""} ${meta.author || ""}`);
  const channel = normalizeForMatch(node.channel);
  const host = normalizeForMatch(node.host || node.pointManName);
  const organization = normalizeForMatch(node.organizationName);
  const genericChannels = new Set(["independent", "unknown", "podcast", "youtube"]);
  let score = 0;

  const pathHits = youtubePathTokens(youtubeUrl).filter((token) => candidateText.includes(token)).length;
  if (pathHits > 0) score += 5 + Math.min(3, pathHits - 1);

  if (channel && !genericChannels.has(channel)) {
    if (candidateText === channel) score += 7;
    else if (candidateText.includes(channel) || channel.includes(candidateText)) score += 5;

    const channelTokens = tokens(channel);
    const tokenHits = channelTokens.filter((token) => candidateText.includes(token)).length;
    if (channelTokens.length > 0) score += Math.min(4, tokenHits);
  }

  for (const name of [host, organization]) {
    const nameTokens = tokens(name);
    const tokenHits = nameTokens.filter((token) => candidateText.includes(token)).length;
    if (tokenHits > 0) score += Math.min(3, tokenHits);
  }

  return score;
}

function isCredibleYoutubeFeed(node: NodeData, youtubeUrl: string | undefined, xml: string) {
  return youtubeFeedScore(node, youtubeUrl, xml) >= 3;
}

async function refreshYoutube(node: NodeData): Promise<MediaHit | undefined> {
  const youtubeUrl = normalizeYoutubeUrl(node.youtubeUrl);
  if (!youtubeUrl || node.isXOnly) return undefined;

  const directChannelId = node.channelId || /\/channel\/(UC[a-zA-Z0-9_-]+)/.exec(youtubeUrl)?.[1];
  const feedCandidates: Array<{ url: string; channelId?: string; canWriteChannelId: boolean }> = [];

  if (directChannelId) {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${directChannelId}`;
    const xml = await fetchText(feedUrl);
    if (xml && isCredibleYoutubeFeed(node, youtubeUrl, xml)) {
      const hit = parseYoutubeEntry(xml, feedUrl);
      if (hit) {
        hit.channelId = directChannelId;
        return hit;
      }
    }
  }

  if (isResolvableYoutubeChannelUrl(youtubeUrl)) {
    const html = await fetchText(youtubeUrl);
    if (html) {
      const rssUrl = extractRssUrlFromYoutubePage(html);
      const rssChannelId = rssUrl ? /channel_id=(UC[a-zA-Z0-9_-]+)/.exec(rssUrl)?.[1] : undefined;
      if (rssUrl) {
        feedCandidates.push({
          url: rssUrl,
          channelId: rssChannelId,
          canWriteChannelId: !node.channelId,
        });
      }
      const resolvedChannelId = extractChannelIdFromYoutubePage(html);
      if (resolvedChannelId) {
        feedCandidates.push({
          url: `https://www.youtube.com/feeds/videos.xml?channel_id=${resolvedChannelId}`,
          channelId: resolvedChannelId,
          canWriteChannelId: !node.channelId,
        });
      }
    }
  }

  const seenFeeds = new Set<string>();
  for (const candidate of feedCandidates) {
    if (seenFeeds.has(candidate.url)) continue;
    seenFeeds.add(candidate.url);
    const xml = await fetchText(candidate.url);
    if (!xml) continue;
    if (!isCredibleYoutubeFeed(node, youtubeUrl, xml)) continue;
    const hit = parseYoutubeEntry(xml, candidate.url);
    if (hit) {
      if (candidate.canWriteChannelId) {
        hit.channelId = candidate.channelId || /channel_id=(UC[a-zA-Z0-9_-]+)/.exec(candidate.url)?.[1];
      }
      return hit;
    }
  }

  return undefined;
}

type AppleLookupResult = {
  resultCount: number;
  results: Array<{
    wrapperType?: string;
    kind?: string;
    collectionViewUrl?: string;
    feedUrl?: string;
    releaseDate?: string;
    collectionName?: string;
    artistName?: string;
  }>;
};

type ApplePodcastResult = AppleLookupResult["results"][number];

function normalizeForMatch(value?: string) {
  return (value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value?: string) {
  return normalizeForMatch(value)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !["the", "and", "with", "podcast", "show"].includes(token));
}

function isPodcastResult(result?: ApplePodcastResult): result is ApplePodcastResult {
  return Boolean(
    result?.wrapperType === "track" &&
      result.kind === "podcast" &&
      result.feedUrl &&
      result.collectionViewUrl?.includes("podcasts.apple.com")
  );
}

function scorePodcastResult(node: NodeData, result: ApplePodcastResult) {
  const collection = normalizeForMatch(result.collectionName);
  const artist = normalizeForMatch(result.artistName);
  const channel = normalizeForMatch(node.channel);
  const host = normalizeForMatch(node.host || node.pointManName);
  const organization = normalizeForMatch(node.organizationName);
  const candidateText = `${collection} ${artist}`;
  let score = 0;

  if (channel && collection) {
    if (collection === channel) score += 8;
    else if (collection.includes(channel) || channel.includes(collection)) score += 6;

    const channelTokens = tokens(channel);
    const tokenHits = channelTokens.filter((token) => candidateText.includes(token)).length;
    if (channelTokens.length > 0) score += Math.min(4, tokenHits);
  }

  for (const name of [host, organization]) {
    if (!name) continue;
    const nameTokens = tokens(name);
    const tokenHits = nameTokens.filter((token) => candidateText.includes(token)).length;
    if (tokenHits > 0) score += Math.min(3, tokenHits);
  }

  return score;
}

async function fetchAppleResults(url: string) {
  const result = await fetchJson<AppleLookupResult>(url);
  return result?.results?.filter(isPodcastResult) || [];
}

async function lookupApplePodcast(node: NodeData) {
  const id = applePodcastId(node.podcastAppleUrl);
  const candidates: ApplePodcastResult[] = [];

  if (id) {
    candidates.push(...(await fetchAppleResults(`https://itunes.apple.com/lookup?id=${id}&media=podcast&entity=podcast`)));
  }

  if (candidates.length === 0) {
    const terms = Array.from(
      new Set(
        [
          `${node.channel || ""} ${node.host || ""}`.trim(),
          `${node.channel || ""} ${node.organizationName || ""}`.trim(),
          node.channel,
          node.host,
        ].filter((term): term is string => Boolean(term))
      )
    );

    for (const term of terms) {
      candidates.push(
        ...(await fetchAppleResults(
          `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=podcast&entity=podcast&limit=5`
        ))
      );
      if (candidates.some((candidate) => scorePodcastResult(node, candidate) >= 4)) break;
    }
  }

  const uniqueCandidates = Array.from(
    new Map(candidates.map((candidate) => [candidate.collectionViewUrl || candidate.feedUrl || "", candidate])).values()
  );
  const scored = uniqueCandidates
    .map((candidate) => ({ candidate, score: scorePodcastResult(node, candidate) }))
    .sort((a, b) => b.score - a.score);

  return scored.find((entry) => entry.score >= 4)?.candidate;
}

async function refreshPodcast(node: NodeData): Promise<MediaHit | undefined> {
  let best: MediaHit | undefined;

  if (node.rssUrl && !node.rssUrl.includes("youtube.com/feeds/videos.xml")) {
    const xml = await fetchText(node.rssUrl);
    if (xml) {
      best = newer(best, parsePodcastFeed(xml, node.rssUrl, "rss"));
    }
  }

  if (node.podcastAppleUrl || node.isPodcastOnly || node.rssUrl) {
    const apple = await lookupApplePodcast(node);

    if (apple?.collectionViewUrl) {
      node.podcastAppleUrl = apple.collectionViewUrl;
    }
    if (apple?.feedUrl) {
      const xml = await fetchText(apple.feedUrl);
      if (xml) {
        const appleFeedHit = parsePodcastFeed(xml, apple.feedUrl, "apple_podcasts");
        if (appleFeedHit) {
          best = newer(best, appleFeedHit);
          node.rssUrl = apple.feedUrl;
        }
      }
    }

    const releaseAt = toIso(apple?.releaseDate);
    if (releaseAt) {
      best = newer(best, {
        publishedAt: releaseAt,
        date: toDate(releaseAt),
        title: apple?.collectionName,
        evidenceUrl: apple?.collectionViewUrl || node.podcastAppleUrl,
        source: "itunes_lookup",
        feedUrl: apple?.feedUrl,
        appleUrl: apple?.collectionViewUrl,
      });
    }
  }

  return best;
}

function clearMediaFields(node: NodeData) {
  delete node.latestYoutubePublishedAt;
  delete node.latestYoutubePublishDate;
  delete node.latestYoutubeTitle;
  delete node.latestYoutubeEvidenceUrl;
  delete node.latestYoutubeCheckedAt;
  delete node.latestPodcastPublishedAt;
  delete node.latestPodcastPublishDate;
  delete node.latestPodcastTitle;
  delete node.latestPodcastEvidenceUrl;
  delete node.latestPodcastSource;
  delete node.latestPodcastCheckedAt;
  delete node.latestMediaPublishedAt;
  delete node.latestMediaPublishDate;
  delete node.latestMediaSource;
  delete node.latestMediaTitle;
  delete node.lastMediaFreshnessAuditAt;
}

async function refreshNode(node: NodeData, checkedAt: string) {
  clearMediaFields(node);

  const [youtube, podcast] = await Promise.all([
    refreshYoutube(node),
    refreshPodcast(node),
  ]);

  if (youtube) {
    node.latestYoutubePublishedAt = youtube.publishedAt;
    node.latestYoutubePublishDate = youtube.date;
    node.latestYoutubeTitle = youtube.title;
    node.latestYoutubeEvidenceUrl = youtube.evidenceUrl;
    node.latestYoutubeCheckedAt = checkedAt;
    if (youtube.channelId) node.channelId = youtube.channelId;
  } else if (node.youtubeUrl && !node.isXOnly) {
    node.latestYoutubeCheckedAt = checkedAt;
  }

  if (podcast) {
    node.latestPodcastPublishedAt = podcast.publishedAt;
    node.latestPodcastPublishDate = podcast.date;
    node.latestPodcastTitle = podcast.title;
    node.latestPodcastEvidenceUrl = podcast.evidenceUrl;
    node.latestPodcastSource = podcast.source === "rss" ? "rss" : podcast.source === "apple_podcasts" ? "apple_podcasts" : "itunes_lookup";
    node.latestPodcastCheckedAt = checkedAt;
  } else if (node.podcastAppleUrl || node.rssUrl || node.isPodcastOnly) {
    node.latestPodcastCheckedAt = checkedAt;
  }

  const latest = newer<LatestHit>(
    youtube ? { ...youtube, platform: "youtube" } : undefined,
    podcast ? { ...podcast, platform: "podcast" } : undefined
  );

  if (latest) {
    node.latestMediaPublishedAt = latest.publishedAt;
    node.latestMediaPublishDate = latest.date;
    node.latestMediaSource = latest.platform;
    node.latestMediaTitle = latest.title;
    node.lastPublishDate = latest.date;
    node.lastKnownPublishDate = latest.date;
    node.sourceOfLastPublishDate = latest.platform;
    node.cadenceEvidenceUrl = latest.evidenceUrl;
  }

  node.lastMediaFreshnessAuditAt = checkedAt;

  return { youtube: Boolean(youtube), podcast: Boolean(podcast), latest: Boolean(latest) };
}

async function run() {
  const db = JSON.parse(readFileSync(DATA_PATH, "utf-8")) as Database;
  const checkedAt = new Date().toISOString();
  const allTargets = db.nodes.filter((node) => includeAll || node.actionabilityStatus === "READY");
  const targets = typeof limit === "number" && Number.isFinite(limit) ? allTargets.slice(0, limit) : allTargets;
  const stats = { processed: 0, youtube: 0, podcast: 0, latest: 0 };

  console.log(`refreshing ${targets.length}/${allTargets.length} media records (${writeChanges ? "write" : "dry-run"})`);

  for (let index = 0; index < targets.length; index += CONCURRENCY) {
    const batch = targets.slice(index, index + CONCURRENCY);
    console.log(`batch ${index + 1}-${Math.min(index + CONCURRENCY, targets.length)}: ${batch.map((node) => node.id).join(", ")}`);
    const results = await Promise.all(
      batch.map((node) =>
        withTimeout(node.id, refreshNode(node, checkedAt), { youtube: false, podcast: false, latest: false })
      )
    );

    for (const result of results) {
      stats.processed++;
      if (result.youtube) stats.youtube++;
      if (result.podcast) stats.podcast++;
      if (result.latest) stats.latest++;
    }

    console.log(
      `refreshed ${Math.min(index + CONCURRENCY, targets.length)}/${targets.length} ` +
      `(youtube=${stats.youtube}, podcast=${stats.podcast}, latest=${stats.latest})`
    );
  }

  if (writeChanges) {
    writeFileSync(DATA_PATH, `${JSON.stringify(db, null, 2)}\n`);
  }

  console.log(JSON.stringify({ ...stats, writeChanges, includeAll }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
