import { NextResponse } from "next/server";
import { getLatestVideos } from "@/lib/youtube";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId") || undefined;
    const youtubeUrl = searchParams.get("youtubeUrl") || undefined;
    const channelName = searchParams.get("channelName") || undefined;

    if (!channelId && !youtubeUrl && !channelName) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    try {
        const videos = await getLatestVideos(channelId, youtubeUrl, channelName);
        return NextResponse.json(videos);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 });
    }
}
