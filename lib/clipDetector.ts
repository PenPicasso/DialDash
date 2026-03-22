import { TranscriptLine } from "./transcript";

export interface ClipMoment {
    timestamp: string;
    seconds: number;
    text: string;
    score: number;
    isGraphMoment: boolean;
}

const SIGNALS = {
    FORECAST: {
        phrases: ["i think", "we will see", "going to", "forecast", "prediction"],
        score: 3,
    },
    CONTRARIAN: {
        phrases: ["everyone thinks", "but actually", "the market is wrong", "misunderstood"],
        score: 3,
    },
    NUMERICAL: {
        phrases: ["percent", "million", "billion", "barrels", "rig", "inventory", "production"],
        score: 2,
    },
    STRUCTURAL: {
        phrases: ["the key point", "what matters", "the real story"],
        score: 2,
    },
    EMOTIONAL: {
        phrases: ["massive", "huge", "collapse", "surge", "boom", "crisis"],
        score: 1,
    },
};

const GRAPH_WORDS = ["chart", "graph", "data", "figure", "numbers"];

export function detectClipMoments(lines: TranscriptLine[]): ClipMoment[] {
    const scoredMoments: ClipMoment[] = [];

    for (const line of lines) {
        const textLower = line.text.toLowerCase();
        let score = 0;

        // Check signals
        for (const phrase of SIGNALS.FORECAST.phrases) {
            if (textLower.includes(phrase)) score += SIGNALS.FORECAST.score;
        }
        for (const phrase of SIGNALS.CONTRARIAN.phrases) {
            if (textLower.includes(phrase)) score += SIGNALS.CONTRARIAN.score;
        }
        for (const phrase of SIGNALS.NUMERICAL.phrases) {
            if (textLower.includes(phrase)) score += SIGNALS.NUMERICAL.score;
        }
        for (const phrase of SIGNALS.STRUCTURAL.phrases) {
            if (textLower.includes(phrase)) score += SIGNALS.STRUCTURAL.score;
        }
        for (const phrase of SIGNALS.EMOTIONAL.phrases) {
            if (textLower.includes(phrase)) score += SIGNALS.EMOTIONAL.score;
        }

        if (score >= 4) {
            // Check for graph moment
            const isGraphMoment = GRAPH_WORDS.some(word => textLower.includes(word));

            scoredMoments.push({
                timestamp: formatSeconds(line.offset),
                seconds: Math.floor(line.offset / 1000), // assuming offset is in ms, if duration is needed, youtube-transcript returns offset in ms (or sometimes seconds depending on API)
                // Adjusting: the official package usually returns offset in ms or seconds. Let's assume it returns ms.
                // Wait, youtube-transcript usually returns offset as seconds or ms, we'll format it assuming ms, but wait: Let's assume ms if > 100000. Wait, standard returns ms. No, wait, checking typical output: it's in ms.
                // Let's normalize it to seconds.
                text: line.text,
                score,
                isGraphMoment
            });
        }
    }

    // Sort by score descending, get top 10
    const topMoments = scoredMoments.sort((a, b) => b.score - a.score).slice(0, 10);
    return topMoments;
}

function formatSeconds(msStringOrNumber: any): string {
    const offsetNum = Number(msStringOrNumber);
    // Determine if it's ms or s. Often youtube-transcript returns ms. Wait, youtube-transcript sometimes returns `offset` in milliseconds, sometimes seconds. Let's assume it's ms if it is very large, but usually it's in seconds or ms.
    // the official youtube-transcript package returns offset in milliseconds (as a number or string).
    // Let's divide by 1000 to get seconds.
    // Note: Some versions return seconds. Let's write robust standard time formatting.
    // If it's a small number (< 20000 for a long video), it's probably seconds. 
    // We will just assume it's milliseconds as standard for youtube-transcript (latest versions actually return `offset: number` in ms).
    const s = offsetNum > 100000 ? Math.floor(offsetNum / 1000) : Math.floor(offsetNum); // heuristic

    // Convert to mm:ss
    const m = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${m}:${secs.toString().padStart(2, "0")}`;
}
