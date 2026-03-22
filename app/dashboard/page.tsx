"use client";

import { useState, useEffect } from "react";
import data from "@/data/nodes.json";
import { VideoPreview } from "@/components/videoPreview";
import { Search, Youtube, ExternalLink, Moon, Sun } from "lucide-react";

type NodeData = {
    channel: string;
    host: string;
    channelId: string;
    energyType: string;
    region: string;
    priority: string;
    youtubeUrl: string;
    xProfile?: string;
    lastUpload?: string;
};

const allNodes = data.nodes as NodeData[];

export default function Dashboard() {
    const [search, setSearch] = useState("");
    const [priority, setPriority] = useState("");
    const [energyType, setEnergyType] = useState("");
    const [region, setRegion] = useState("");

    const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);
    const [isDark, setIsDark] = useState(true);

    // Initialize theme on mount
    useEffect(() => {
        // Check system preference or default to dark
        const root = document.documentElement;
        if (isDark) {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }
    }, [isDark]);

    // Derive unique options for filters dynamically from dataset
    const energyTypes = Array.from(new Set(allNodes.map(n => n.energyType).filter(Boolean)));
    const regions = Array.from(new Set(allNodes.map(n => n.region).filter(Boolean)));
    const priorities = Array.from(new Set(allNodes.map(n => n.priority).filter(Boolean)));

    const filteredNodes = allNodes.filter(node => {
        const matchSearch = node.channel.toLowerCase().includes(search.toLowerCase()) ||
            node.host.toLowerCase().includes(search.toLowerCase());
        const matchPriority = priority ? node.priority === priority : true;
        const matchType = energyType ? node.energyType === energyType : true;
        const matchRegion = region ? node.region === region : true;
        return matchSearch && matchPriority && matchType && matchRegion;
    });

    return (
        <div className="min-h-screen bg-background text-foreground p-8 font-sans transition-colors duration-300">
            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2 flex items-center gap-3">
                        <span className="text-gradient">Energy Dial</span> Funnel
                    </h1>
                    <p className="text-muted">Internal clip intelligence system for podcast & commentary filtering</p>
                </div>
                <button
                    onClick={() => setIsDark(!isDark)}
                    className="p-2 rounded-full bg-panel border border-border hover:bg-black/5 dark:hover:bg-white/5 transition-colors shadow-sm flex items-center justify-center h-10 w-10 text-muted hover:text-foreground"
                    title="Toggle Theme"
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </header>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-8">
                <div className="relative flex-1 min-w-[250px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="Search channels or hosts..."
                        className="w-full bg-white dark:bg-[#111] text-[#111] dark:text-[#e5e5e5] placeholder-[#777] dark:placeholder-[#888] border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all font-medium"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <select
                    className="bg-white dark:bg-[#111] text-[#111] dark:text-[#e5e5e5] border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer"
                    value={priority} onChange={e => setPriority(e.target.value)}
                >
                    <option value="">All Priorities</option>
                    {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <select
                    className="bg-white dark:bg-[#111] text-[#111] dark:text-[#e5e5e5] border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer"
                    value={energyType} onChange={e => setEnergyType(e.target.value)}
                >
                    <option value="">All Energy Types</option>
                    {energyTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <select
                    className="bg-white dark:bg-[#111] text-[#111] dark:text-[#e5e5e5] border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer"
                    value={region} onChange={e => setRegion(e.target.value)}
                >
                    <option value="">All Regions</option>
                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border overflow-hidden bg-panel/80 backdrop-blur-md shadow-xl relative animate-in fade-in duration-700">
                <table className="w-full text-left text-sm">
                    <thead className="bg-panel/90 text-muted uppercase text-xs font-semibold tracking-wider border-b border-border">
                        <tr>
                            <th className="px-6 py-4">Channel & Host</th>
                            <th className="px-6 py-4">Energy Type</th>
                            <th className="px-6 py-4">Region</th>
                            <th className="px-6 py-4">Priority</th>
                            <th className="px-6 py-4">Last Upload</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {filteredNodes.map((node) => {
                            return (
                                <tr
                                    key={node.channel}
                                    className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group relative"
                                    onMouseEnter={() => setHoveredChannel(node.channel)}
                                    onMouseLeave={() => setHoveredChannel(null)}
                                >
                                    <td className="px-6 py-4 relative">
                                        <div className="font-bold text-foreground group-hover:text-accent transition-colors">
                                            {node.channel}
                                        </div>
                                        <div className="text-muted text-xs mt-1">{node.host}</div>

                                        {hoveredChannel === node.channel && (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <VideoPreview
                                                    channelId={node.channelId}
                                                    youtubeUrl={node.youtubeUrl}
                                                    channelName={node.channel}
                                                />
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-foreground/80">{node.energyType}</td>
                                    <td className="px-6 py-4 font-medium text-foreground/80">{node.region}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${node.priority === "HOT" ? "bg-accent/10 text-accent border border-accent/20" : "bg-panel border border-border text-foreground"}`}>
                                            {node.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-muted font-medium">
                                        {node.lastUpload ? node.lastUpload : "Unknown"}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <a href={node.youtubeUrl} target="_blank" rel="noreferrer" className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-muted hover:text-accent transition-colors" title="Open Channel">
                                                <Youtube size={16} />
                                            </a>
                                            {node.xProfile && (
                                                <a href={node.xProfile} target="_blank" rel="noreferrer" className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-muted hover:text-foreground transition-colors" title="Open 𝕏 Profile">
                                                    <ExternalLink size={16} />
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredNodes.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-muted">No channels found matching the filters.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
