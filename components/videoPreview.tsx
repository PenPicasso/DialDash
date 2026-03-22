"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { YouTubeVideo } from "@/lib/youtube";
import { Flame } from "lucide-react";

export function VideoPreview({ channelId, youtubeUrl, channelName }: { channelId?: string, youtubeUrl?: string, channelName?: string }) {
    const [videos, setVideos] = useState<YouTubeVideo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        async function fetchVideos() {
            if (!channelId && !youtubeUrl && !channelName) return;

            setLoading(true);
            setError("");
            try {
                const params = new URLSearchParams();
                if (channelId) params.append("channelId", channelId);
                if (youtubeUrl) params.append("youtubeUrl", youtubeUrl);
                if (channelName) params.append("channelName", channelName || "");

                const res = await fetch(`/api/youtube?${params.toString()}`);
                if (!res.ok) throw new Error("Failed");
                const data = await res.json();
                if (active) setVideos(data);
            } catch (e) {
                if (active) setError("Could not load videos");
            } finally {
                if (active) setLoading(false);
            }
        }
        fetchVideos();
        return () => { active = false; };
    }, [channelId, youtubeUrl, channelName]);

    if (loading) return <div className="p-4 text-sm text-muted animate-pulse">Loading latest videos...</div>;
    if (error) return <div className="p-4 text-sm text-red-400">{error}</div>;
    if (videos.length === 0) return <div className="p-4 text-sm text-muted">No recent videos found.</div>;

    return (
        <div className="absolute z-50 ml-4 w-80 rounded-xl glass-panel shadow-2xl p-4 flex flex-col gap-3 top-0 transform translate-x-[105%] text-left">
            <h4 className="text-sm font-semibold tracking-wide text-foreground uppercase border-b border-border pb-2">
                Latest Uploads
            </h4>
            <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                {videos.map((vid) => {
                    const daysSince = (new Date().getTime() - new Date(vid.publishDate).getTime()) / (1000 * 3600 * 24);
                    const isHot = daysSince < 14;

                    return (
                        <div key={vid.id} className="group relative flex flex-col gap-1 cursor-pointer transition-all hover:bg-white/5 p-2 rounded-lg -mx-2">
                            <div className="relative w-full aspect-video rounded-md overflow-hidden bg-black/40">
                                <img
                                    src={vid.thumbnail}
                                    alt={vid.title}
                                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                                />
                                {isHot && (
                                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-md">
                                        <Flame size={12} /> CLIP OPPORTUNITY 🔥
                                    </div>
                                )}
                            </div>
                            <div className="text-sm font-medium mt-1 line-clamp-2 text-foreground/90 group-hover:text-accent transition-colors">
                                {vid.title}
                            </div>
                            <div className="text-xs text-muted">
                                {formatDistanceToNow(new Date(vid.publishDate), { addSuffix: true })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
