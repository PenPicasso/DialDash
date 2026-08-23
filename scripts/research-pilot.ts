import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";
import type { NodeData } from "../lib/types";

type Cohort = "CURRENT_READY" | "RECOVERY_REVIEW" | "NEW_SOURCE";

type ManifestProspect = {
  id: string;
  cohort: Cohort;
  existingNodeId?: string;
  person: string;
  organization: string;
  podcastName: string;
  primaryUrl: string;
  officialUrls: string[];
  appleUrl?: string;
  rssUrl?: string;
  youtubeChannelId?: string;
  youtubeQuery?: string;
};

type Manifest = {
  id: string;
  asOfDate: string;
  description: string;
  prospects: ManifestProspect[];
};

type Episode = {
  title: string;
  publishedAt: string;
  url?: string;
  durationSeconds?: number;
};

type PodcastResearch = {
  appleUrl?: string;
  rssUrl?: string;
  feedTitle?: string;
  feedAuthor?: string;
  latest?: Episode;
  episodes: Episode[];
  daysSinceLatest?: number;
  baselineMedianIntervalDays?: number;
  recentMedianIntervalDays?: number;
  slowdownRatio?: number;
  cadence: "ACTIVE" | "SEMI_ACTIVE" | "INACTIVE" | "UNVERIFIED";
  cadenceReason: string;
};

type WebsiteResearch = {
  url: string;
  finalUrl?: string;
  status?: number;
  title?: string;
  emails: string[];
  socialLinks: string[];
  offerSignals: string[];
  textCharacters: number;
  error?: string;
};

type YoutubeVideo = {
  id: string;
  title: string;
  publishedAt: string;
  durationSeconds: number;
  views: number;
  url: string;
};

type YoutubeResearch = {
  channelId?: string;
  channelTitle?: string;
  channelUrl?: string;
  subscribers?: number;
  totalVideos?: number;
  latest?: YoutubeVideo;
  latestShort?: YoutubeVideo;
  recentVideos: YoutubeVideo[];
  shortCountLast30: number;
  shortCountLast30Days: number;
  engineStatus: "NO_OWNED_CHANNEL" | "MINIMAL" | "LIGHT" | "PARTIAL" | "ESTABLISHED" | "UNVERIFIED";
  engineReason: string;
};

type FirecrawlResearch = {
  attempted: boolean;
  cacheHit: boolean;
  success: boolean;
  sourceStatusCode?: number;
  elapsedMs: number;
  markdownCharacters: number;
  emails: string[];
  links: string[];
  offerSignals: string[];
  incrementalEmails: string[];
  incrementalOfferSignals: string[];
  error?: string;
};

type ProspectResearch = {
  id: string;
  cohort: Cohort;
  person: string;
  organization: string;
  podcastName: string;
  existingNode?: Pick<
    NodeData,
    | "id"
    | "actionabilityStatus"
    | "priority"
    | "pointManName"
    | "organizationName"
    | "pitchHook"
    | "rejectionReason"
    | "youtubeUrl"
    | "podcastAppleUrl"
    | "rssUrl"
  >;
  podcast: PodcastResearch;
  youtube: YoutubeResearch;
  websites: WebsiteResearch[];
  deterministic: {
    emails: string[];
    socialLinks: string[];
    offerSignals: string[];
    evidenceUrls: string[];
  };
  firecrawl?: FirecrawlResearch;
};

const ROOT = join(__dirname, "..");
const MANIFEST_PATH = join(ROOT, "data", "pilot-manifest.json");
const DATA_PATH = join(ROOT, "data", "nodes.json");
const RUNS_DIR = join(ROOT, "storage", "prospect-pilot");
const CACHE_DIR = join(ROOT, "storage", "pilot-cache");
const REQUEST_TIMEOUT_MS = 20_000;
const withFirecrawl = process.argv.includes("--with-firecrawl");
const noCache = process.argv.includes("--no-cache");
const stdoutOnly = process.argv.includes("--stdout-only");
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  textNodeName: "#text",
  trimValues: true,
  parseTagValue: false,
  cdataPropName: "#cdata",
});

loadLocalEnv();

async function main() {
  const startedAt = new Date();
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
  const database = JSON.parse(readFileSync(DATA_PATH, "utf8")) as { nodes: NodeData[] };
  const existingById = new Map(database.nodes.map((node) => [node.id, node]));
  const results: ProspectResearch[] = [];

  console.log(`Pilot ${manifest.id}: researching ${manifest.prospects.length} prospects`);
  console.log(`Firecrawl comparison: ${withFirecrawl ? "enabled" : "disabled"}`);

  for (const prospect of manifest.prospects) {
    console.log(`- ${prospect.id}: deterministic research`);
    const result = await researchProspect(prospect, existingById.get(prospect.existingNodeId || ""));

    if (withFirecrawl) {
      console.log(`  ${prospect.id}: Firecrawl matched pass`);
      result.firecrawl = await researchWithFirecrawl(prospect, result.deterministic);
    }

    results.push(result);
  }

  const completedAt = new Date();
  const metrics = {
    pilotId: manifest.id,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    elapsedSeconds: Math.round((completedAt.getTime() - startedAt.getTime()) / 1000),
    prospects: results.length,
    cohorts: countBy(results, (result) => result.cohort),
    cadence: countBy(results, (result) => result.podcast.cadence),
    videoEngines: countBy(results, (result) => result.youtube.engineStatus),
    deterministicContactsFound: results.filter((result) => result.deterministic.emails.length > 0).length,
    firecrawlEnabled: withFirecrawl,
    firecrawlSuccesses: results.filter((result) => result.firecrawl?.success).length,
    firecrawlContactsAdded: results.filter((result) => (result.firecrawl?.incrementalEmails.length || 0) > 0).length,
    firecrawlRawInputsAdded: results.filter(
      (result) =>
        (result.firecrawl?.incrementalEmails.length || 0) > 0 ||
        (result.firecrawl?.incrementalOfferSignals.length || 0) > 0,
    ).length,
    productionWrite: false,
  };

  const artifact = {
    manifest: {
      id: manifest.id,
      asOfDate: manifest.asOfDate,
      description: manifest.description,
    },
    methodology: {
      podcastRecency: "ACTIVE <=30 days, SEMI_ACTIVE 31-90 days, INACTIVE >90 days",
      cadenceAdjustment: "Downgrade to SEMI_ACTIVE when recent median spacing is >=2.5x baseline and at least 7 days slower",
      youtubeShortDefinition: "Owned upload with duration <=180 seconds",
      youtubeEngine: "ESTABLISHED >=15 of latest 30; PARTIAL 9-14; LIGHT 3-8; MINIMAL 0-2",
      evidencePolicy: "Official pages, Apple podcast results, RSS/Atom feeds, and owned YouTube channels only",
      firecrawlPolicy: "Second matched scrape of the same primary URL; never used to create the deterministic baseline",
    },
    metrics,
    prospects: results,
  };

  if (!stdoutOnly) {
    const runId = completedAt.toISOString().replace(/[:.]/g, "-");
    const runDir = join(RUNS_DIR, runId);
    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(runDir, "research.json"), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    writeFileSync(join(runDir, "metrics.json"), `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
    console.log(`Artifacts: ${runDir}`);
  }

  console.log(JSON.stringify(metrics, null, 2));
}

async function researchProspect(prospect: ManifestProspect, existingNode?: NodeData): Promise<ProspectResearch> {
  const [podcast, websites, youtube] = await Promise.all([
    researchPodcast(prospect),
    researchWebsites(prospect.officialUrls),
    researchYoutube(prospect),
  ]);
  const emails = unique(websites.flatMap((website) => website.emails));
  const socialLinks = unique(websites.flatMap((website) => website.socialLinks));
  const offerSignals = unique(websites.flatMap((website) => website.offerSignals));

  return {
    id: prospect.id,
    cohort: prospect.cohort,
    person: prospect.person,
    organization: prospect.organization,
    podcastName: prospect.podcastName,
    existingNode: existingNode
      ? {
          id: existingNode.id,
          actionabilityStatus: existingNode.actionabilityStatus,
          priority: existingNode.priority,
          pointManName: existingNode.pointManName,
          organizationName: existingNode.organizationName,
          pitchHook: existingNode.pitchHook,
          rejectionReason: existingNode.rejectionReason,
          youtubeUrl: existingNode.youtubeUrl,
          podcastAppleUrl: existingNode.podcastAppleUrl,
          rssUrl: existingNode.rssUrl,
        }
      : undefined,
    podcast,
    youtube,
    websites,
    deterministic: {
      emails,
      socialLinks,
      offerSignals,
      evidenceUrls: unique([
        ...websites.filter((website) => website.status && website.status < 400).map((website) => website.finalUrl || website.url),
        podcast.appleUrl,
        podcast.rssUrl,
        podcast.latest?.url,
        youtube.channelUrl,
        youtube.latest?.url,
      ]),
    },
  };
}

async function researchPodcast(prospect: ManifestProspect): Promise<PodcastResearch> {
  const apple = await resolveApplePodcast(prospect);
  const rssUrl = apple?.feedUrl || prospect.rssUrl;

  if (!rssUrl) {
    return {
      appleUrl: apple?.collectionViewUrl || prospect.appleUrl,
      cadence: "UNVERIFIED",
      cadenceReason: "No verified RSS/Atom feed was resolved.",
      episodes: [],
    };
  }

  const xml = await fetchTextCached(rssUrl, `rss:${rssUrl}`);
  if (!xml) {
    return {
      appleUrl: apple?.collectionViewUrl || prospect.appleUrl,
      rssUrl,
      cadence: "UNVERIFIED",
      cadenceReason: "The verified feed URL did not return parseable content.",
      episodes: [],
    };
  }

  try {
    const parsed = xmlParser.parse(xml) as Record<string, unknown>;
    const feed = parseFeed(parsed);
    const episodes = feed.episodes
      .filter((episode) => new Date(episode.publishedAt).getTime() <= Date.now() + 2 * 86_400_000)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .filter((episode, index, all) => all.findIndex((candidate) => candidate.publishedAt === episode.publishedAt && candidate.title === episode.title) === index)
      .slice(0, 20);
    const cadence = calculateCadence(episodes);

    return {
      appleUrl: apple?.collectionViewUrl || prospect.appleUrl,
      rssUrl,
      feedTitle: feed.title,
      feedAuthor: feed.author,
      latest: episodes[0],
      episodes,
      ...cadence,
    };
  } catch (error) {
    return {
      appleUrl: apple?.collectionViewUrl || prospect.appleUrl,
      rssUrl,
      cadence: "UNVERIFIED",
      cadenceReason: `Structured feed parse failed: ${error instanceof Error ? error.message : "unknown error"}`,
      episodes: [],
    };
  }
}

function parseFeed(parsed: Record<string, unknown>) {
  const rss = asRecord(parsed.rss);
  const channel = asRecord(rss?.channel);
  if (channel) {
    const episodes = asArray(channel.item)
      .map((item) => parseFeedItem(asRecord(item)))
      .filter((episode): episode is Episode => Boolean(episode));

    return {
      title: valueText(channel.title),
      author: valueText(channel["itunes:author"]) || valueText(channel.author),
      episodes,
    };
  }

  const atom = asRecord(parsed.feed);
  if (atom) {
    const episodes = asArray(atom.entry)
      .map((entry) => parseFeedItem(asRecord(entry)))
      .filter((episode): episode is Episode => Boolean(episode));

    return {
      title: valueText(atom.title),
      author: valueText(asRecord(asArray(atom.author)[0])?.name),
      episodes,
    };
  }

  throw new Error("RSS channel or Atom feed root not found");
}

function parseFeedItem(item?: Record<string, unknown>): Episode | undefined {
  if (!item) return undefined;
  const dateValue =
    valueText(item.pubDate) ||
    valueText(item["dc:date"]) ||
    valueText(item.published) ||
    valueText(item.updated);
  const date = dateValue ? new Date(dateValue) : undefined;
  if (!date || Number.isNaN(date.getTime())) return undefined;

  const linkValue = asArray(item.link)
    .map((link) => valueText(link) || valueText(asRecord(link)?.["@href"]))
    .find((link) => link?.startsWith("http"));

  return {
    title: valueText(item.title) || "Untitled episode",
    publishedAt: date.toISOString(),
    url: linkValue,
    durationSeconds: parseDuration(valueText(item["itunes:duration"])),
  };
}

function calculateCadence(episodes: Episode[]): Omit<PodcastResearch, "appleUrl" | "rssUrl" | "feedTitle" | "feedAuthor" | "latest" | "episodes"> {
  if (episodes.length === 0) {
    return { cadence: "UNVERIFIED", cadenceReason: "No dated episodes were found." };
  }

  const daysSinceLatest = Math.max(0, (Date.now() - new Date(episodes[0].publishedAt).getTime()) / 86_400_000);
  const intervals = episodes.slice(0, 12).slice(0, -1).map((episode, index) => {
    const newerDate = new Date(episode.publishedAt).getTime();
    const olderDate = new Date(episodes[index + 1].publishedAt).getTime();
    return Math.abs(newerDate - olderDate) / 86_400_000;
  });
  const recentMedianIntervalDays = median(intervals.slice(0, 3));
  const baselinePool = intervals.slice(3);
  const baselineMedianIntervalDays = median(baselinePool.length >= 2 ? baselinePool : intervals);
  const slowdownRatio =
    recentMedianIntervalDays !== undefined && baselineMedianIntervalDays && baselineMedianIntervalDays > 0
      ? recentMedianIntervalDays / baselineMedianIntervalDays
      : undefined;

  let cadence: PodcastResearch["cadence"] = "ACTIVE";
  let cadenceReason = `Latest owned episode is ${Math.floor(daysSinceLatest)} days old.`;

  if (daysSinceLatest > 90) {
    cadence = "INACTIVE";
    cadenceReason += " This exceeds the 90-day hard gate.";
  } else if (daysSinceLatest > 30) {
    cadence = "SEMI_ACTIVE";
    cadenceReason += " This is inside the 31-90 day semi-active band.";
  } else if (
    slowdownRatio !== undefined &&
    slowdownRatio >= 2.5 &&
    recentMedianIntervalDays !== undefined &&
    baselineMedianIntervalDays !== undefined &&
    recentMedianIntervalDays - baselineMedianIntervalDays >= 7
  ) {
    cadence = "SEMI_ACTIVE";
    cadenceReason += ` Recent spacing (${round(recentMedianIntervalDays)}d) is ${round(slowdownRatio)}x the historical baseline (${round(baselineMedianIntervalDays)}d).`;
  }

  return {
    daysSinceLatest: round(daysSinceLatest),
    baselineMedianIntervalDays: roundOptional(baselineMedianIntervalDays),
    recentMedianIntervalDays: roundOptional(recentMedianIntervalDays),
    slowdownRatio: roundOptional(slowdownRatio),
    cadence,
    cadenceReason,
  };
}

async function researchWebsites(urls: string[]) {
  return Promise.all(urls.map(researchWebsite));
}

async function researchWebsite(url: string): Promise<WebsiteResearch> {
  try {
    const html = await fetchTextCached(url, `html:${url}`);
    if (!html) {
      return { url, emails: [], socialLinks: [], offerSignals: [], textCharacters: 0, error: "No response body" };
    }
    const cachedMeta = readCacheJson<{ finalUrl?: string; status?: number }>(`meta:${url}`);
    const $ = cheerio.load(html);
    $("script, style, noscript, svg").remove();
    $("br, p, div, li, section, article, h1, h2, h3, h4").append(" ");
    const text = $("body").text().replace(/\s+/g, " ").trim();
    const links = $("a[href]")
      .map((_, element) => $(element).attr("href"))
      .get()
      .filter((href): href is string => Boolean(href));
    const emails = unique([
      ...links.filter((href) => href.startsWith("mailto:")).map((href) => href.slice(7).split("?")[0].toLowerCase()),
      ...extractEmails(text),
    ]).filter(isLikelyContactEmail);
    const socialLinks = unique(
      links
        .map((href) => absoluteUrl(href, cachedMeta?.finalUrl || url))
        .filter((href): href is string => Boolean(href && isProfileSocialUrl(href))),
    );

    return {
      url,
      finalUrl: cachedMeta?.finalUrl,
      status: cachedMeta?.status,
      title: $("title").first().text().trim() || undefined,
      emails,
      socialLinks,
      offerSignals: detectOfferSignals(text),
      textCharacters: text.length,
    };
  } catch (error) {
    return {
      url,
      emails: [],
      socialLinks: [],
      offerSignals: [],
      textCharacters: 0,
      error: error instanceof Error ? error.message : "Unknown website error",
    };
  }
}

async function researchYoutube(prospect: ManifestProspect): Promise<YoutubeResearch> {
  if (!process.env.GOOGLE_API_KEY) {
    return {
      shortCountLast30: 0,
      shortCountLast30Days: 0,
      recentVideos: [],
      engineStatus: "UNVERIFIED",
      engineReason: "GOOGLE_API_KEY is not configured for free YouTube Data API checks.",
    };
  }

  const channelId = prospect.youtubeChannelId || (await resolveYoutubeChannel(prospect));
  if (!channelId) {
    return {
      shortCountLast30: 0,
      shortCountLast30Days: 0,
      recentVideos: [],
      engineStatus: "NO_OWNED_CHANNEL",
      engineReason: "No owned YouTube channel could be resolved with sufficient identity confidence.",
    };
  }

  try {
    const channelJson = await youtubeApi("channels", {
      part: "snippet,statistics,contentDetails",
      id: channelId,
    });
    const channel = channelJson.items?.[0];
    if (!channel) throw new Error("YouTube channel not found");
    const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
    const playlistJson = uploads
      ? await youtubeApi("playlistItems", { part: "contentDetails", playlistId: uploads, maxResults: 30 })
      : { items: [] };
    const videoIds = (playlistJson.items || []).map((item: any) => item.contentDetails?.videoId).filter(Boolean);
    const videosJson = videoIds.length
      ? await youtubeApi("videos", { part: "snippet,contentDetails,statistics", id: videoIds.join(",") })
      : { items: [] };
    const recentVideos: YoutubeVideo[] = (videosJson.items || []).map((video: any) => ({
      id: video.id,
      title: video.snippet?.title || "Untitled video",
      publishedAt: video.snippet?.publishedAt,
      durationSeconds: parseIsoDuration(video.contentDetails?.duration),
      views: Number(video.statistics?.viewCount || 0),
      url: `https://www.youtube.com/watch?v=${video.id}`,
    }));
    const shorts = recentVideos.filter((video) => video.durationSeconds <= 180);
    const shortCountLast30Days = shorts.filter(
      (video) => Date.now() - new Date(video.publishedAt).getTime() <= 30 * 86_400_000,
    ).length;
    const latestShort = shorts[0];
    const status = classifyYoutubeEngine(shorts.length, latestShort);

    return {
      channelId,
      channelTitle: channel.snippet?.title,
      channelUrl: `https://www.youtube.com/channel/${channelId}`,
      subscribers: Number(channel.statistics?.subscriberCount || 0),
      totalVideos: Number(channel.statistics?.videoCount || 0),
      latest: recentVideos[0],
      latestShort,
      recentVideos,
      shortCountLast30: shorts.length,
      shortCountLast30Days,
      engineStatus: status,
      engineReason: `${shorts.length} of the latest ${recentVideos.length} owned uploads are <=180 seconds; ${shortCountLast30Days} were published in the last 30 days.`,
    };
  } catch (error) {
    return {
      channelId,
      shortCountLast30: 0,
      shortCountLast30Days: 0,
      recentVideos: [],
      engineStatus: "UNVERIFIED",
      engineReason: `YouTube verification failed: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }
}

function classifyYoutubeEngine(shortCount: number, latestShort?: YoutubeVideo): YoutubeResearch["engineStatus"] {
  const recent = latestShort && Date.now() - new Date(latestShort.publishedAt).getTime() <= 30 * 86_400_000;
  if (shortCount >= 15 && recent) return "ESTABLISHED";
  if (shortCount >= 9 && recent) return "PARTIAL";
  if (shortCount >= 3 && recent) return "LIGHT";
  return "MINIMAL";
}

async function resolveYoutubeChannel(prospect: ManifestProspect): Promise<string | undefined> {
  if (!prospect.youtubeQuery) return undefined;
  const json = await youtubeApi("search", {
    part: "snippet",
    type: "channel",
    q: prospect.youtubeQuery,
    maxResults: 5,
  });
  const scored = (json.items || [])
    .map((item: any) => ({
      id: item.id?.channelId as string | undefined,
      score: identityScore(
        `${item.snippet?.title || ""} ${item.snippet?.description || ""}`,
        [prospect.person, prospect.organization, prospect.podcastName],
      ),
    }))
    .filter((candidate: { id?: string; score: number }) => candidate.id)
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score);
  return scored[0]?.score >= 4 ? scored[0].id : undefined;
}

async function researchWithFirecrawl(
  prospect: ManifestProspect,
  deterministic: ProspectResearch["deterministic"],
): Promise<FirecrawlResearch> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return {
      attempted: false,
      cacheHit: false,
      success: false,
      sourceStatusCode: undefined,
      elapsedMs: 0,
      markdownCharacters: 0,
      emails: [],
      links: [],
      offerSignals: [],
      incrementalEmails: [],
      incrementalOfferSignals: [],
      error: "FIRECRAWL_API_KEY is not configured.",
    };
  }

  const key = `firecrawl:${prospect.primaryUrl}`;
  const cached = noCache ? undefined : readCacheJson<any>(key);
  const started = Date.now();
  let responseJson = cached;
  let cacheHit = Boolean(cached);

  try {
    if (!responseJson) {
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: prospect.primaryUrl, formats: ["markdown", "links"] }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      responseJson = await response.json();
      if (!response.ok) throw new Error(`Firecrawl ${response.status}: ${responseJson?.error || response.statusText}`);
      writeCacheJson(key, responseJson);
      cacheHit = false;
    }

    const markdown = String(responseJson?.data?.markdown || "");
    const sourceStatusCode = Number(responseJson?.data?.metadata?.statusCode || 0) || undefined;
    const links = unique((responseJson?.data?.links || []).filter((link: unknown): link is string => typeof link === "string"));
    const emails = extractEmails(markdown);
    const offerSignals = detectOfferSignals(markdown);
    const sourceSucceeded = !sourceStatusCode || sourceStatusCode < 400;

    return {
      attempted: true,
      cacheHit,
      success: Boolean(responseJson?.success && markdown && sourceSucceeded),
      sourceStatusCode,
      elapsedMs: Date.now() - started,
      markdownCharacters: markdown.length,
      emails,
      links,
      offerSignals,
      incrementalEmails: emails.filter((email) => !deterministic.emails.includes(email)),
      incrementalOfferSignals: offerSignals.filter((signal) => !deterministic.offerSignals.includes(signal)),
      error: sourceSucceeded ? undefined : `Target page returned HTTP ${sourceStatusCode}.`,
    };
  } catch (error) {
    return {
      attempted: true,
      cacheHit,
      success: false,
      sourceStatusCode: undefined,
      elapsedMs: Date.now() - started,
      markdownCharacters: 0,
      emails: [],
      links: [],
      offerSignals: [],
      incrementalEmails: [],
      incrementalOfferSignals: [],
      error: error instanceof Error ? error.message : "Unknown Firecrawl error",
    };
  }
}

type AppleResult = {
  wrapperType?: string;
  kind?: string;
  collectionName?: string;
  artistName?: string;
  collectionViewUrl?: string;
  feedUrl?: string;
};

async function resolveApplePodcast(prospect: ManifestProspect): Promise<AppleResult | undefined> {
  const id = prospect.appleUrl?.match(/\/id(\d+)/)?.[1];
  const candidates: AppleResult[] = [];
  if (id) {
    const lookup = await fetchJsonCached<any>(
      `https://itunes.apple.com/lookup?id=${id}&media=podcast&entity=podcast`,
      `apple:lookup:${id}`,
    );
    candidates.push(...(lookup?.results || []));
  }

  if (!candidates.some(isPodcastResult)) {
    const query = `${prospect.podcastName} ${prospect.person}`;
    const search = await fetchJsonCached<any>(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=podcast&entity=podcast&limit=10`,
      `apple:search:${query}`,
    );
    candidates.push(...(search?.results || []));
  }

  return candidates
    .filter(isPodcastResult)
    .map((candidate) => ({
      candidate,
      score: identityScore(`${candidate.collectionName || ""} ${candidate.artistName || ""}`, [prospect.podcastName, prospect.person]),
    }))
    .sort((a, b) => b.score - a.score)
    .find((entry) => entry.score >= 3)?.candidate;
}

function isPodcastResult(result: AppleResult) {
  return Boolean(
    result.wrapperType === "track" &&
      result.kind === "podcast" &&
      result.feedUrl &&
      result.collectionViewUrl?.includes("podcasts.apple.com"),
  );
}

function identityScore(candidate: string, expectedValues: string[]) {
  const candidateTokens = new Set(tokens(candidate));
  return expectedValues.reduce((score, value) => {
    const expected = tokens(value);
    const hits = expected.filter((token) => candidateTokens.has(token)).length;
    return score + Math.min(4, hits);
  }, 0);
}

async function youtubeApi(path: string, params: Record<string, string | number>) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  url.searchParams.set("key", process.env.GOOGLE_API_KEY || "");
  const cacheKey = `youtube:${path}:${url.searchParams.toString().replace(/key=[^&]+/, "key=hidden")}`;
  return fetchJsonCached<any>(url.toString(), cacheKey);
}

async function fetchTextCached(url: string, key: string) {
  const cached = noCache ? undefined : readCacheText(key);
  if (cached !== undefined) return cached;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DialDashPilot/1.0)",
        Accept: "text/html, application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.5",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    writeCacheJson(`meta:${url}`, { status: response.status, finalUrl: response.url });
    if (!response.ok) return undefined;
    const text = await response.text();
    writeCacheText(key, text);
    return text;
  } catch {
    return undefined;
  }
}

async function fetchJsonCached<T>(url: string, key: string): Promise<T | undefined> {
  const cached = noCache ? undefined : readCacheJson<T>(key);
  if (cached !== undefined) return cached;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DialDashPilot/1.0)", Accept: "application/json" },
      redirect: "follow",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return undefined;
    const json = (await response.json()) as T;
    writeCacheJson(key, json);
    return json;
  } catch {
    return undefined;
  }
}

function cachePath(key: string, extension: "json" | "txt") {
  const digest = createHash("sha256").update(key).digest("hex");
  return join(CACHE_DIR, `${digest}.${extension}`);
}

function readCacheJson<T>(key: string): T | undefined {
  const path = cachePath(key, "json");
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return undefined;
  }
}

function writeCacheJson(key: string, value: unknown) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath(key, "json"), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readCacheText(key: string) {
  const path = cachePath(key, "txt");
  return existsSync(path) ? readFileSync(path, "utf8") : undefined;
}

function writeCacheText(key: string, value: string) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath(key, "txt"), value, "utf8");
}

function extractEmails(value: string) {
  return unique(
    (value.match(/(?<![A-Z0-9._%+-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}(?![A-Z])/gi) || [])
      .map((email) => email.toLowerCase())
      .filter(isLikelyContactEmail),
  );
}

function isLikelyContactEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain || local.length > 64 || domain.length > 253) return false;
  if (/^\d{3,}/.test(local) || /^\.|\.$|\.\./.test(local)) return false;
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(email)) return false;
  if (/mastodon\./i.test(domain)) return false;
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local) && /^[a-z0-9.-]+\.[a-z]{2,24}$/i.test(domain);
}

function isProfileSocialUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname.toLowerCase();

    if (host === "linkedin.com") return path.startsWith("/in/") || path.startsWith("/company/") || path.startsWith("/showcase/");
    if (host === "x.com" || host === "twitter.com") {
      return /^\/[a-z0-9_]{1,15}\/?$/i.test(parsed.pathname) && !path.startsWith("/intent/");
    }
    if (host === "youtube.com") {
      return path.startsWith("/@") || path.startsWith("/channel/") || path.startsWith("/c/") || path.startsWith("/user/") || path.startsWith("/playlist");
    }
    return false;
  } catch {
    return false;
  }
}

const OFFER_SIGNAL_PATTERNS: Array<[string, RegExp]> = [
  ["paid membership", /paid (?:membership|subscriber)|membership starts|member subscription/i],
  ["paid subscription", /paid subscription|subscribe.*\$|subscription-based|premium subscription/i],
  ["consulting", /consulting|consultation|book (?:a|an) (?:call|consultation)/i],
  ["advisory", /advisory|advisor|strategic advice/i],
  ["research", /paid research|research service|market intelligence|custom research/i],
  ["investment fund", /venture fund|investment fund|portfolio compan|investor access/i],
  ["recruitment", /recruitment|talent solutions|staffing|guaranteed hire/i],
  ["training", /training course|training packages|executive coaching|mastermind/i],
  ["events", /paid events|conference|event access|sponsorship/i],
  ["advertising", /advertising|media pack|sponsor an episode|newsletter advertising/i],
  ["commercial services", /our services|work with us|work with me|become a client/i],
];

function detectOfferSignals(value: string) {
  return OFFER_SIGNAL_PATTERNS.filter(([, pattern]) => pattern.test(value)).map(([label]) => label);
}

function parseDuration(value?: string) {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) return Number(value);
  const parts = value.split(":").map(Number);
  if (parts.some(Number.isNaN)) return undefined;
  return parts.reduce((seconds, part) => seconds * 60 + part, 0);
}

function parseIsoDuration(value?: string) {
  if (!value) return 0;
  const match = /P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/.exec(value);
  if (!match) return 0;
  return (Number(match[1]) || 0) * 86_400 + (Number(match[2]) || 0) * 3_600 + (Number(match[3]) || 0) * 60 + (Number(match[4]) || 0);
}

function absoluteUrl(href: string, base: string) {
  try {
    return new URL(href, base).toString();
  } catch {
    return undefined;
  }
}

function tokens(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 2 && !["the", "and", "with", "podcast", "show", "energy"].includes(token));
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function valueText(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  const record = asRecord(value);
  if (!record) return undefined;
  const text = record["#text"] ?? record["#cdata"];
  return typeof text === "string" || typeof text === "number" ? String(text).trim() : undefined;
}

function median(values: number[]) {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function roundOptional(value?: number) {
  return value === undefined ? undefined : round(value);
}

function unique(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function countBy<T>(values: T[], key: (value: T) => string) {
  return Object.fromEntries(
    Array.from(values.reduce((counts, value) => counts.set(key(value), (counts.get(key(value)) || 0) + 1), new Map<string, number>())),
  );
}

function loadLocalEnv() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
