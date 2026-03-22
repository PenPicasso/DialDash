export interface YouTubeVideo {
    id: string;
    title: string;
    thumbnail: string;
    publishDate: string;
    viewCount?: string;
}

/**
 * Fetches the latest videos from a YouTube channel using various RSS feed patterns.
 * This approach does not require an API key.
 */
export async function getLatestVideos(
    channelId?: string,
    youtubeUrl?: string,
    channelName?: string
): Promise<YouTubeVideo[]> {
    // Strategy: try multiple RSS feed approaches in order of reliability

    // 1. Try channel_id RSS first (most reliable)
    if (channelId && channelId.startsWith("UC")) {
        const videos = await tryFetchRss(
            `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
        );
        if (videos.length > 0) return videos;
    }

    // 2. If we have a handle URL, resolve the real channel ID from the page
    if (youtubeUrl && youtubeUrl.includes("@")) {
        const resolvedId = await resolveChannelId(youtubeUrl);
        if (resolvedId) {
            const videos = await tryFetchRss(
                `https://www.youtube.com/feeds/videos.xml?channel_id=${resolvedId}`
            );
            if (videos.length > 0) return videos;
        }
    }

    // 3. If we have a plain channel URL (no handle), try extracting a channel ID
    if (youtubeUrl && youtubeUrl.includes("/channel/")) {
        const idMatch = youtubeUrl.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/);
        if (idMatch) {
            const videos = await tryFetchRss(
                `https://www.youtube.com/feeds/videos.xml?channel_id=${idMatch[1]}`
            );
            if (videos.length > 0) return videos;
        }
    }

    console.warn("Could not fetch videos for:", { channelId, youtubeUrl, channelName });
    return [];
}

/**
 * Resolves a YouTube handle URL (e.g. https://www.youtube.com/@handle) to a channel ID
 * by fetching the channel page and extracting the channel_id meta tag or RSS link.
 */
async function resolveChannelId(handleUrl: string): Promise<string | null> {
    try {
        const res = await fetch(handleUrl, {
            headers: { "User-Agent": "Mozilla/5.0" },
            redirect: "follow",
        });
        if (!res.ok) return null;
        const html = await res.text();

        // Look for channel_id in the page source (multiple patterns)
        const patterns = [
            /\"channelId\":\"(UC[a-zA-Z0-9_-]+)\"/,
            /channel_id=(UC[a-zA-Z0-9_-]+)/,
            /\"externalId\":\"(UC[a-zA-Z0-9_-]+)\"/,
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

/**
 * Attempts to fetch and parse an RSS feed URL. Returns empty array on failure.
 */
async function tryFetchRss(rssUrl: string): Promise<YouTubeVideo[]> {
    try {
        const response = await fetch(rssUrl);
        if (!response.ok) return [];
        const xml = await response.text();
        return parseRssXml(xml);
    } catch (error) {
        console.error("RSS fetch error for", rssUrl, error);
        return [];
    }
}

/**
 * Internal helper to parse the YouTube RSS XML.
 */
function parseRssXml(xml: string): YouTubeVideo[] {
    // Lightweight regex-based parser
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    const videoIdRegex = /<yt:videoId>(.*?)<\/yt:videoId>/;
    const titleRegex = /<title>(.*?)<\/title>/;
    const publishedRegex = /<published>(.*?)<\/published>/;

    const videos: YouTubeVideo[] = [];
    let match;

    while ((match = entryRegex.exec(xml)) !== null && videos.length < 5) {
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

/**
 * Basic utility to decode common HTML entities in RSS titles.
 */
function decodeHtmlEntities(str: string): string {
    return str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}
