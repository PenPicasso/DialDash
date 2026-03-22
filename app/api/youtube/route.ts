import { NextResponse } from "next/server";
import { getChannelStats } from "@/lib/youtube";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId") || undefined;
    const youtubeUrl = searchParams.get("youtubeUrl") || undefined;

    if (!channelId && !youtubeUrl) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    try {
        const stats = await getChannelStats(channelId, youtubeUrl);
        return NextResponse.json(stats);
    } catch {
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
