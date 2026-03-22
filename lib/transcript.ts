import { YoutubeTranscript } from "youtube-transcript";

export interface TranscriptLine {
    text: string;
    duration: number;
    offset: number;
}

export async function getTranscript(videoId: string): Promise<TranscriptLine[]> {
    try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        return transcript;
    } catch (error) {
        console.error(`Failed to fetch transcript for video ${videoId}:`, error);
        return [];
    }
}
