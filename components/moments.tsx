"use client";

import { useEffect, useState } from "react";
import { ClipMoment } from "@/lib/clipDetector";
import { BarChart2, Loader2, PlayCircle } from "lucide-react";

export function MomentsPanel({ videoId, onClose }: { videoId: string; onClose: () => void }) {
    const [moments, setMoments] = useState<ClipMoment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchMoments() {
            try {
                const res = await fetch(`/api/detect?videoId=${videoId}`);
                if (!res.ok) throw new Error("Failed");
                const data = await res.json();
                setMoments(data.moments || []);
            } catch (e) {
                setError("Error analyzing transcript");
            } finally {
                setLoading(false);
            }
        }
        fetchMoments();
    }, [videoId]);

    return (
        <div className="fixed inset-y-0 right-0 w-96 glass-panel shadow-2xl p-6 flex flex-col z-50 border-l border-border animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <PlayCircle className="text-accent" /> CLIP MOMENTS
                </h2>
                <button onClick={onClose} className="text-muted hover:text-white transition-colors">
                    &times;
                </button>
            </div>

            {loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-muted gap-3">
                    <Loader2 className="animate-spin text-accent" size={32} />
                    <p className="text-sm">Analyzing transcript signals...</p>
                </div>
            )}

            {error && <div className="text-red-400 text-sm p-4 bg-red-900/20 rounded-lg">{error}</div>}

            {!loading && !error && moments.length === 0 && (
                <div className="text-muted text-sm text-center mt-10">No high-scoring clip moments detected.</div>
            )}

            {!loading && !error && (
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-2">
                    {moments.map((m, idx) => (
                        <div key={idx} className="bg-panel border border-border/50 rounded-lg p-4 hover:border-accent/40 transition-colors group">
                            <a
                                href={`https://youtube.com/watch?v=${videoId}&t=${m.seconds}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-accent font-mono text-sm font-bold hover:underline mb-2 block"
                            >
                                {m.timestamp}
                            </a>
                            <p className="text-sm text-foreground/90 leading-relaxed italic border-l-2 border-accent/30 pl-3 py-1">
                                "{m.text}"
                            </p>

                            <div className="flex items-center gap-2 mt-3 text-xs">
                                <span className="bg-white/10 px-2 py-0.5 rounded text-muted font-medium">Score: {m.score}</span>
                                {m.isGraphMoment && (
                                    <span className="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded flex items-center gap-1 font-medium">
                                        <BarChart2 size={12} /> GRAPH MOMENT 📊
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
