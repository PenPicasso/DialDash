"use client";

import { useState, useEffect, useCallback } from "react";
import data from "@/data/nodes.json";
import { Search, Youtube, Sun, Moon, ChevronDown, TrendingUp, Users, Zap, Video, Plus, X } from "lucide-react";
import type { ChannelStats } from "@/lib/youtube";

type NodeData = {
    channel: string;
    host: string;
    channelId: string;
    energyType: string;
    region: string;
    youtubeUrl: string;
    xProfile?: string;
};

type PipelineStatus = "not_contacted" | "pitched" | "in_talks" | "client" | "passed";

type FunnelData = {
    front: string[];
    middle: string[];
    bottom: string[];
};

const STATUS_CONFIG: Record<PipelineStatus, { label: string; className: string }> = {
    not_contacted: { label: "Not Contacted", className: "status-not_contacted" },
    pitched: { label: "Pitched", className: "status-pitched" },
    in_talks: { label: "In Talks", className: "status-in_talks" },
    client: { label: "Client", className: "status-client" },
    passed: { label: "Passed", className: "status-passed" },
};

const FUNNEL_OPTIONS = {
    front: ["YouTube", "X / Twitter", "LinkedIn", "TikTok", "Instagram"],
    middle: ["Newsletter", "Blog", "Podcast (Audio)", "Events", "Conferences", "Courses", "Community"],
    bottom: ["Advisory", "Private Equity", "Consulting", "Speaking", "Books", "SaaS", "Memberships", "Sponsored"],
};

const FUNNEL_COLORS = {
    front: { bg: "bg-info-soft", text: "text-info", border: "border-info/20", label: "Front of Funnel", sublabel: "Awareness & Reach" },
    middle: { bg: "bg-warning-soft", text: "text-warning", border: "border-warning/20", label: "Mid Funnel", sublabel: "Engagement & Nurture" },
    bottom: { bg: "bg-success-soft", text: "text-success", border: "border-success/20", label: "Bottom of Funnel", sublabel: "Monetization" },
};

const allNodes = data.nodes as NodeData[];

function XLogo({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}

function formatUploadDate(dateStr: string): string {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

function daysAgo(dateStr: string): string {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

export default function Dashboard() {
    const [search, setSearch] = useState("");
    const [energyType, setEnergyType] = useState("");
    const [region, setRegion] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [isDark, setIsDark] = useState(true);
    const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
    const [statuses, setStatuses] = useState<Record<string, PipelineStatus>>({});
    const [funnels, setFunnels] = useState<Record<string, FunnelData>>({});
    const [channelStats, setChannelStats] = useState<Record<string, ChannelStats>>({});
    const [loadingStats, setLoadingStats] = useState<Record<string, boolean>>({});

    // Load saved data from localStorage
    useEffect(() => {
        try {
            const savedStatuses = localStorage.getItem("dialdash_statuses");
            if (savedStatuses) setStatuses(JSON.parse(savedStatuses));
        } catch { /* ignore */ }
        try {
            const savedFunnels = localStorage.getItem("dialdash_funnels");
            if (savedFunnels) setFunnels(JSON.parse(savedFunnels));
        } catch { /* ignore */ }
    }, []);

    // Theme
    useEffect(() => {
        document.documentElement.classList.toggle("dark", isDark);
    }, [isDark]);

    // Fetch stats for all channels (batched 3 at a time)
    const fetchStats = useCallback(async () => {
        const batchSize = 3;
        for (let i = 0; i < allNodes.length; i += batchSize) {
            const batch = allNodes.slice(i, i + batchSize);
            await Promise.all(
                batch.map(async (node) => {
                    setLoadingStats((prev) => ({ ...prev, [node.channel]: true }));
                    try {
                        const params = new URLSearchParams();
                        if (node.channelId) params.append("channelId", node.channelId);
                        if (node.youtubeUrl) params.append("youtubeUrl", node.youtubeUrl);
                        const res = await fetch(`/api/youtube?${params.toString()}`);
                        if (res.ok) {
                            const stats = await res.json();
                            setChannelStats((prev) => ({ ...prev, [node.channel]: stats }));
                        }
                    } catch { /* skip */ }
                    setLoadingStats((prev) => ({ ...prev, [node.channel]: false }));
                })
            );
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const updateStatus = (channel: string, status: PipelineStatus) => {
        const next = { ...statuses, [channel]: status };
        setStatuses(next);
        localStorage.setItem("dialdash_statuses", JSON.stringify(next));
    };

    const updateFunnel = (channel: string, funnel: FunnelData) => {
        const next = { ...funnels, [channel]: funnel };
        setFunnels(next);
        localStorage.setItem("dialdash_funnels", JSON.stringify(next));
    };

    const energyTypes = Array.from(new Set(allNodes.map((n) => n.energyType).filter(Boolean))).sort();
    const regions = Array.from(new Set(allNodes.map((n) => n.region).filter(Boolean))).sort();

    const filteredNodes = allNodes.filter((node) => {
        const matchSearch =
            node.channel.toLowerCase().includes(search.toLowerCase()) ||
            node.host.toLowerCase().includes(search.toLowerCase());
        const matchType = energyType ? node.energyType === energyType : true;
        const matchRegion = region ? node.region === region : true;
        const nodeStatus = statuses[node.channel] || "not_contacted";
        const matchStatus = statusFilter ? nodeStatus === statusFilter : true;
        return matchSearch && matchType && matchRegion && matchStatus;
    });

    const totalProspects = allNodes.length;
    const activeCount = Object.values(channelStats).filter(
        (s) => s.lastUploadDate && (Date.now() - new Date(s.lastUploadDate).getTime()) < 30 * 24 * 60 * 60 * 1000
    ).length;
    const clientCount = Object.values(statuses).filter((s) => s === "client").length;
    const pipelineCount = Object.values(statuses).filter((s) => s === "pitched" || s === "in_talks").length;

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
            {/* Header */}
            <header className="border-b border-border px-6 py-4 fade-in">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent-soft flex items-center justify-center">
                            <Zap size={18} className="text-accent" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold tracking-tight">
                                <span className="text-gradient">Dial Dash</span>
                            </h1>
                            <p className="text-xs text-muted -mt-0.5">Energy Dial Prospect Intelligence</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsDark(!isDark)}
                        className="p-2 rounded-lg border border-border hover:bg-panel-hover text-muted hover:text-foreground transition-all"
                    >
                        {isDark ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                </div>
            </header>

            <main className="max-w-[1400px] mx-auto px-6 py-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 fade-in fade-in-delay-1">
                    <StatCard icon={<Users size={16} />} label="Prospects" value={totalProspects} />
                    <StatCard icon={<Video size={16} />} label="Active (30d)" value={activeCount} accent />
                    <StatCard icon={<TrendingUp size={16} />} label="In Pipeline" value={pipelineCount} />
                    <StatCard icon={<Zap size={16} />} label="Clients" value={clientCount} success />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-5 fade-in fade-in-delay-2">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
                        <input
                            type="text"
                            placeholder="Search channels or hosts..."
                            className="w-full bg-panel border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <FilterSelect value={energyType} onChange={setEnergyType} options={energyTypes} placeholder="Energy Type" />
                    <FilterSelect value={region} onChange={setRegion} options={regions} placeholder="Region" />
                    <FilterSelect
                        value={statusFilter}
                        onChange={setStatusFilter}
                        options={Object.keys(STATUS_CONFIG)}
                        labels={Object.fromEntries(Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label]))}
                        placeholder="Status"
                    />
                </div>

                {/* Table */}
                <div className="rounded-xl border border-border overflow-hidden bg-panel fade-in fade-in-delay-3">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
                                <th className="px-5 py-3 font-medium">Channel & Host</th>
                                <th className="px-5 py-3 font-medium">Type</th>
                                <th className="px-5 py-3 font-medium hidden md:table-cell">Region</th>
                                <th className="px-5 py-3 font-medium">Status</th>
                                <th className="px-5 py-3 font-medium">Last Upload</th>
                                <th className="px-5 py-3 font-medium hidden lg:table-cell">Frequency</th>
                                <th className="px-5 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredNodes.map((node) => {
                                const stats = channelStats[node.channel];
                                const isLoading = loadingStats[node.channel];
                                const isExpanded = expandedChannel === node.channel;
                                const nodeStatus = statuses[node.channel] || "not_contacted";
                                const nodeFunnel = funnels[node.channel] || { front: [], middle: [], bottom: [] };

                                return (
                                    <ChannelRow
                                        key={node.channel}
                                        node={node}
                                        stats={stats}
                                        isLoading={isLoading}
                                        isExpanded={isExpanded}
                                        status={nodeStatus}
                                        funnel={nodeFunnel}
                                        onToggleExpand={() => setExpandedChannel(isExpanded ? null : node.channel)}
                                        onStatusChange={(s) => updateStatus(node.channel, s)}
                                        onFunnelChange={(f) => updateFunnel(node.channel, f)}
                                    />
                                );
                            })}
                            {filteredNodes.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center text-muted">
                                        No channels match your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 text-xs text-muted text-center fade-in fade-in-delay-4">
                    {filteredNodes.length} of {totalProspects} prospects
                </div>
            </main>
        </div>
    );
}

/* ── Channel Row ─────────────────────────────────────────────── */

function ChannelRow({
    node, stats, isLoading, isExpanded, status, funnel,
    onToggleExpand, onStatusChange, onFunnelChange,
}: {
    node: NodeData;
    stats?: ChannelStats;
    isLoading?: boolean;
    isExpanded: boolean;
    status: PipelineStatus;
    funnel: FunnelData;
    onToggleExpand: () => void;
    onStatusChange: (s: PipelineStatus) => void;
    onFunnelChange: (f: FunnelData) => void;
}) {
    const statusCfg = STATUS_CONFIG[status];

    return (
        <>
            <tr
                className="border-b border-border-subtle hover:bg-panel-hover transition-colors cursor-pointer group"
                onClick={onToggleExpand}
            >
                <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center text-accent font-bold text-xs flex-shrink-0">
                            {node.channel[0]}
                        </div>
                        <div className="min-w-0">
                            <div className="font-medium text-foreground truncate group-hover:text-accent transition-colors">
                                {node.channel}
                            </div>
                            <div className="text-xs text-muted truncate">{node.host}</div>
                        </div>
                        <ChevronDown
                            size={14}
                            className={`text-muted-soft transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                        />
                    </div>
                </td>
                <td className="px-5 py-3.5 text-muted text-xs">{node.energyType}</td>
                <td className="px-5 py-3.5 text-muted text-xs hidden md:table-cell">{node.region}</td>
                <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <select
                        value={status}
                        onChange={(e) => onStatusChange(e.target.value as PipelineStatus)}
                        className={`text-xs font-medium px-2 py-1 rounded-md border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent/30 ${statusCfg.className}`}
                    >
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <option key={key} value={key}>{cfg.label}</option>
                        ))}
                    </select>
                </td>
                <td className="px-5 py-3.5">
                    {isLoading ? (
                        <div className="h-4 w-20 bg-border rounded animate-shimmer" />
                    ) : stats?.lastUploadDate ? (
                        <div>
                            <div className="text-xs font-medium text-foreground">
                                {formatUploadDate(stats.lastUploadDate)}
                            </div>
                            <div className="text-[10px] text-muted">{daysAgo(stats.lastUploadDate)}</div>
                        </div>
                    ) : (
                        <span className="text-xs text-muted-soft">—</span>
                    )}
                </td>
                <td className="px-5 py-3.5 hidden lg:table-cell">
                    {isLoading ? (
                        <div className="h-4 w-16 bg-border rounded animate-shimmer" />
                    ) : stats ? (
                        <span className="text-xs text-muted">{stats.uploadFrequency}</span>
                    ) : (
                        <span className="text-xs text-muted-soft">—</span>
                    )}
                </td>
                <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                        <a
                            href={node.youtubeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-md hover:bg-panel-hover text-muted hover:text-[#ff0000] transition-colors"
                            title="YouTube Channel"
                        >
                            <Youtube size={15} />
                        </a>
                        {node.xProfile && (
                            <a
                                href={node.xProfile}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-md hover:bg-panel-hover text-muted hover:text-foreground transition-colors"
                                title="X Profile"
                            >
                                <XLogo size={14} />
                            </a>
                        )}
                    </div>
                </td>
            </tr>

            {/* Expanded Row */}
            {isExpanded && (
                <tr className="border-b border-border-subtle">
                    <td colSpan={7} className="px-5 py-5 bg-panel-hover/30 row-expand">
                        <ExpandedPanel
                            node={node}
                            stats={stats}
                            isLoading={isLoading}
                            funnel={funnel}
                            onFunnelChange={onFunnelChange}
                        />
                    </td>
                </tr>
            )}
        </>
    );
}

/* ── Expanded Panel (Stats + Funnel + Videos) ────────────────── */

function ExpandedPanel({
    node, stats, isLoading, funnel, onFunnelChange,
}: {
    node: NodeData;
    stats?: ChannelStats;
    isLoading?: boolean;
    funnel: FunnelData;
    onFunnelChange: (f: FunnelData) => void;
}) {
    return (
        <div className="flex flex-col gap-5">
            {/* Row 1: Channel Stats */}
            {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted">
                    <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    Loading channel data...
                </div>
            ) : stats?.lastUploadDate ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {stats.subscriberCount && (
                        <MiniStat label="Subscribers" value={stats.subscriberCount} />
                    )}
                    <MiniStat label="Videos (30d)" value={stats.videosLast30Days.toString()} />
                    <MiniStat label="Frequency" value={stats.uploadFrequency} />
                    <MiniStat label="Shorts Detected" value={stats.shortsCount.toString()} />
                    <MiniStat
                        label="Shorts Opportunity"
                        value={stats.shortsCount === 0 ? "High" : "Low"}
                        highlight={stats.shortsCount === 0}
                    />
                </div>
            ) : (
                <div className="text-sm text-muted">
                    Could not load channel data. URL may need updating.
                </div>
            )}

            {/* Row 2: Business Funnel */}
            <div>
                <div className="text-xs text-muted uppercase tracking-wider mb-3 font-medium">
                    Business Ecosystem
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(["front", "middle", "bottom"] as const).map((stage) => (
                        <FunnelStage
                            key={stage}
                            stage={stage}
                            selected={funnel[stage]}
                            options={FUNNEL_OPTIONS[stage]}
                            colors={FUNNEL_COLORS[stage]}
                            onChange={(items) =>
                                onFunnelChange({ ...funnel, [stage]: items })
                            }
                        />
                    ))}
                </div>
            </div>

            {/* Row 3: Recent Videos */}
            {stats && stats.recentVideos.length > 0 && (
                <div>
                    <div className="text-xs text-muted uppercase tracking-wider mb-2 font-medium">
                        Recent Videos
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {stats.recentVideos.map((vid) => (
                            <a
                                key={vid.id}
                                href={`https://youtube.com/watch?v=${vid.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="group/vid flex gap-3 p-2 rounded-lg hover:bg-panel-hover transition-colors"
                            >
                                <img
                                    src={vid.thumbnail}
                                    alt=""
                                    className="w-28 h-16 object-cover rounded-md flex-shrink-0"
                                />
                                <div className="min-w-0 flex flex-col justify-center">
                                    <div className="text-xs font-medium text-foreground line-clamp-2 group-hover/vid:text-accent transition-colors">
                                        {vid.title}
                                    </div>
                                    <div className="text-[10px] text-muted mt-1">
                                        {daysAgo(vid.publishDate)}
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Funnel Stage ────────────────────────────────────────────── */

function FunnelStage({
    stage, selected, options, colors, onChange,
}: {
    stage: string;
    selected: string[];
    options: string[];
    colors: { bg: string; text: string; border: string; label: string; sublabel: string };
    onChange: (items: string[]) => void;
}) {
    const [showAdd, setShowAdd] = useState(false);
    const unselected = options.filter((o) => !selected.includes(o));

    const toggle = (item: string) => {
        if (selected.includes(item)) {
            onChange(selected.filter((s) => s !== item));
        } else {
            onChange([...selected, item]);
        }
    };

    return (
        <div className={`rounded-lg border ${colors.border} p-3 ${colors.bg}`}>
            <div className="flex items-center justify-between mb-2">
                <div>
                    <div className={`text-xs font-semibold ${colors.text}`}>{colors.label}</div>
                    <div className="text-[10px] text-muted">{colors.sublabel}</div>
                </div>
                {unselected.length > 0 && (
                    <button
                        onClick={() => setShowAdd(!showAdd)}
                        className={`p-1 rounded-md hover:bg-panel-hover ${colors.text} transition-colors`}
                        title="Add item"
                    >
                        <Plus size={12} />
                    </button>
                )}
            </div>

            {/* Selected items */}
            <div className="flex flex-wrap gap-1.5">
                {selected.map((item) => (
                    <span
                        key={item}
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}
                    >
                        {item}
                        <button
                            onClick={() => toggle(item)}
                            className="hover:opacity-70 transition-opacity"
                        >
                            <X size={10} />
                        </button>
                    </span>
                ))}
                {selected.length === 0 && !showAdd && (
                    <span className="text-[11px] text-muted italic">None added yet</span>
                )}
            </div>

            {/* Add dropdown */}
            {showAdd && unselected.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {unselected.map((item) => (
                        <button
                            key={item}
                            onClick={() => { toggle(item); if (unselected.length === 1) setShowAdd(false); }}
                            className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
                        >
                            + {item}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ── Shared Components ───────────────────────────────────────── */

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="bg-panel border border-border rounded-lg px-3 py-2">
            <div className="text-[10px] text-muted uppercase tracking-wider">{label}</div>
            <div className={`text-sm font-semibold mt-0.5 ${highlight ? "text-accent" : "text-foreground"}`}>
                {value}
            </div>
        </div>
    );
}

function StatCard({
    icon, label, value, accent, success,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    accent?: boolean;
    success?: boolean;
}) {
    const color = success ? "text-success" : accent ? "text-accent" : "text-foreground";
    return (
        <div className="bg-panel border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="text-muted">{icon}</div>
            <div>
                <div className={`text-xl font-bold tracking-tight ${color}`}>{value}</div>
                <div className="text-[11px] text-muted">{label}</div>
            </div>
        </div>
    );
}

function FilterSelect({
    value, onChange, options, labels, placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    labels?: Record<string, string>;
    placeholder: string;
}) {
    return (
        <select
            className="bg-panel border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 cursor-pointer text-foreground min-w-[130px]"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="">{`All ${placeholder}${placeholder.endsWith("s") ? "es" : "s"}`}</option>
            {options.map((opt) => (
                <option key={opt} value={opt}>
                    {labels ? labels[opt] : opt}
                </option>
            ))}
        </select>
    );
}
