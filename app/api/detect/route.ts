import { NextResponse } from "next/server";
import { getTranscript } from "@/lib/transcript";
import { detectClipMoments } from "@/lib/clipDetector";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
        return NextResponse.json({ error: "Missing videoId parameter" }, { status: 400 });
    }

    try {
        const lines = await getTranscript(videoId);
        if (!lines || lines.length === 0) {
            return NextResponse.json({ moments: [] });
        }

        const moments = detectClipMoments(lines);
        return NextResponse.json({ moments });
    } catch (error) {
        return NextResponse.json({ error: "Failed to detect clips" }, { status: 500 });
    }
}
