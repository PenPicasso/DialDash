export interface YouTubeVideo {
    id: string;
    title: string;
    thumbnail: string;
    publishDate: string;
}

export interface ChannelStats {
    lastUploadDate: string | null;
    uploadFrequency: string;
    videosLast30Days: number;
    shortsCount: number;
    totalVideos: number;
    recentVideos: YouTubeVideo[];
    subscriberCount: string | null;
}

/**
 * Fetches channel stats from YouTube RSS feed (no API key needed).
 */
export async function getChannelStats(
    channelId?: string,
    youtubeUrl?: string
): Promise<ChannelStats> {
    const emptyStats: ChannelStats = {
        lastUploadDate: null,
        uploadFrequency: "Unknown",
        videosLast30Days: 0,
        shortsCount: 0,
        totalVideos: 0,
        recentVideos: [],
        subscriberCount: null,
    };

    let videos: YouTubeVideo[] = [];
    let resolvedChannelId: string | null = null;

    // 1. Try channelId RSS
    if (channelId && channelId.startsWith("UC") && channelId.length > 10) {
        videos = await tryFetchRss(
            `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
        );
        if (videos.length > 0) resolvedChannelId = channelId;
    }

    // 2. Resolve from handle URL
    if (videos.length === 0 && youtubeUrl && youtubeUrl.includes("@")) {
        const result = await resolveChannelId(youtubeUrl);
        if (result) {
            resolvedChannelId = result;
            videos = await tryFetchRss(
                `https://www.youtube.com/feeds/videos.xml?channel_id=${result}`
            );
        }
    }

    // 3. Try /channel/ URL pattern
    if (videos.length === 0 && youtubeUrl && youtubeUrl.includes("/channel/")) {
        const idMatch = youtubeUrl.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/);
        if (idMatch) {
            resolvedChannelId = idMatch[1];
            videos = await tryFetchRss(
                `https://www.youtube.com/feeds/videos.xml?channel_id=${idMatch[1]}`
            );
        }
    }

    if (videos.length === 0) return emptyStats;

    // Calculate stats
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const videosLast30Days = videos.filter(
        (v) => new Date(v.publishDate) >= thirtyDaysAgo
    ).length;

    const shortsCount = videos.filter((v) => {
        const title = v.title.toLowerCase();
        return title.includes("#shorts") || title.includes("#short");
    }).length;

    // Upload frequency from date spread
    const uploadFrequency = calculateFrequency(videos);

    // Try to get subscriber count (best-effort)
    let subscriberCount: string | null = null;
    if (youtubeUrl) {
        subscriberCount = await getSubscriberCount(youtubeUrl);
    }

    return {
        lastUploadDate: videos[0]?.publishDate || null,
        uploadFrequency,
        videosLast30Days,
        shortsCount,
        totalVideos: videos.length,
        recentVideos: videos.slice(0, 3),
        subscriberCount,
    };
}

function calculateFrequency(videos: YouTubeVideo[]): string {
    if (videos.length < 2) return "Rare";

    const dates = videos
        .map((v) => new Date(v.publishDate).getTime())
        .sort((a, b) => b - a);

    const newestMs = dates[0];
    const oldestMs = dates[dates.length - 1];
    const spanDays = (newestMs - oldestMs) / (1000 * 60 * 60 * 24);

    if (spanDays === 0) return "Daily";

    const uploadsPerWeek = (videos.length / spanDays) * 7;

    if (uploadsPerWeek >= 5) return "Daily";
    if (uploadsPerWeek >= 2) return `${Math.round(uploadsPerWeek)}x/week`;
    if (uploadsPerWeek >= 0.8) return "Weekly";
    const uploadsPerMonth = uploadsPerWeek * 4.33;
    if (uploadsPerMonth >= 2) return `${Math.round(uploadsPerMonth)}x/month`;
    return "Monthly";
}

async function getSubscriberCount(youtubeUrl: string): Promise<string | null> {
    try {
        const res = await fetch(youtubeUrl, {
            headers: { "User-Agent": "Mozilla/5.0" },
            redirect: "follow",
        });
        if (!res.ok) return null;
        const html = await res.text();

        // Extract subscriber count from YouTube page JSON
        const subMatch = html.match(/"subscriberCountText":\s*\{[^}]*"simpleText":\s*"([^"]+)"/);
        if (subMatch) {
            return subMatch[1].replace(" subscribers", "").trim();
        }

        // Fallback pattern
        const subMatch2 = html.match(/"subscriberCountText":"([^"]+)"/);
        if (subMatch2) {
            return subMatch2[1].replace(" subscribers", "").trim();
        }

        return null;
    } catch {
        return null;
    }
}

async function resolveChannelId(handleUrl: string): Promise<string | null> {
    try {
        const res = await fetch(handleUrl, {
            headers: { "User-Agent": "Mozilla/5.0" },
            redirect: "follow",
        });
        if (!res.ok) return null;
        const html = await res.text();

        const patterns = [
            /"channelId":"(UC[a-zA-Z0-9_-]+)"/,
            /channel_id=(UC[a-zA-Z0-9_-]+)/,
            /"externalId":"(UC[a-zA-Z0-9_-]+)"/,
            /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)">/,
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match) return match[1];
        }
        return null;
    } catch {
        return null;
    }
}

async function tryFetchRss(rssUrl: string): Promise<YouTubeVideo[]> {
    try {
        const response = await fetch(rssUrl);
        if (!response.ok) return [];
        const xml = await response.text();
        return parseRssXml(xml);
    } catch {
        return [];
    }
}

function parseRssXml(xml: string): YouTubeVideo[] {
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    const videoIdRegex = /<yt:videoId>(.*?)<\/yt:videoId>/;
    const titleRegex = /<title>(.*?)<\/title>/;
    const publishedRegex = /<published>(.*?)<\/published>/;

    const videos: YouTubeVideo[] = [];
    let match;

    while ((match = entryRegex.exec(xml)) !== null && videos.length < 15) {
        const entryBody = match[1];
        const videoId = videoIdRegex.exec(entryBody)?.[1] || "";
        const title = titleRegex.exec(entryBody)?.[1] || "Untitled";
        const published = publishedRegex.exec(entryBody)?.[1] || "";

        if (videoId) {
            videos.push({
                id: videoId,
                title: decodeHtmlEntities(title),
                thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
                publishDate: published,
            });
        }
    }
    return videos;
}

function decodeHtmlEntities(str: string): string {
    return str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}
