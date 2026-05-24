"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import data from "@/data/nodes.json";
import { NodeData } from "@/lib/types";
import { VideoPreview } from "@/components/videoPreview";
import { NodeDetail } from "@/components/nodeDetail";
import { Search, Youtube, ExternalLink, Moon, Sun, Table2, AlertTriangle, Podcast } from "lucide-react";



const allNodes = data.nodes as NodeData[];

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [needsReview, setNeedsReview] = useState("");
  const [confidence, setConfidence] = useState("");

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark]);

  const categories = Array.from(new Set(allNodes.map((n) => n.category).filter(Boolean)));
  const regions = Array.from(new Set(allNodes.map((n) => n.region).filter(Boolean)));
  const priorities = Array.from(new Set(allNodes.map((n) => n.priority).filter(Boolean)));

  const filteredNodes = allNodes.filter((node) => {
    const matchSearch =
      node.channel.toLowerCase().includes(search.toLowerCase()) ||
      node.host.toLowerCase().includes(search.toLowerCase());
    const matchPriority = priority ? node.priority === priority : true;
    const matchCategory = category ? node.category === category : true;
    const matchNeedsReview =
      needsReview === "yes"
        ? node.needsManualReview === true
        : needsReview === "no"
        ? !node.needsManualReview
        : true;
    const matchConfidence = confidence ? node.cadenceConfidence === confidence : true;
    const matchFormat =
      formatFilter === "podcast-no-video"
        ? node.isPodcastOnly === true
        : formatFilter === "video"
        ? !node.isXOnly && !node.isPodcastOnly
        : formatFilter === "x-only"
        ? node.isXOnly === true
        : true;
    return (
      matchSearch &&
      matchPriority &&
      matchCategory &&
      matchNeedsReview &&
      matchConfidence &&
      matchFormat
    );
  });

  const nodeCount = filteredNodes.length;
  const xOnlyCount = filteredNodes.filter((n) => n.isXOnly).length;

  return (
    <div className="min-h-screen bg-background text-foreground p-8 font-sans transition-colors duration-300">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-1 flex items-center gap-3">
            <span className="text-gradient">Energy Dial</span> Network
          </h1>
          <p className="text-muted text-sm">
            {nodeCount} prospects &middot; {xOnlyCount} X-only &middot; {nodeCount - xOnlyCount} YouTube
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2.5 rounded-lg bg-panel border border-border hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-muted hover:text-foreground"
            title="Toggle Theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Motion.dev Inline Filter Panel */}
      <div className="bg-white dark:bg-[#111111] border border-border/80 rounded-2xl p-6 mb-8 space-y-6 shadow-sm">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" size={18} />
          <input
            type="text"
            placeholder="Search by host or channel name..."
            className="w-full bg-[#FAFAFA] dark:bg-[#18181B] text-[#111] dark:text-[#E5E5E5] placeholder-muted-foreground/50 border border-border/60 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Priority & Format */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Filter Priority</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPriority("")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  priority === ""
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                    : "bg-[#FAFAFA] dark:bg-[#18181B] text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 border-border/60"
                }`}
              >
                All Priorities
              </button>
              {priorities.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                    priority === p
                      ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                      : "bg-[#FAFAFA] dark:bg-[#18181B] text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 border-border/60"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Filter Format</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFormatFilter("")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  formatFilter === ""
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                    : "bg-[#FAFAFA] dark:bg-[#18181B] text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 border-border/60"
                }`}
              >
                All Formats
              </button>
              <button
                onClick={() => setFormatFilter("podcast-no-video")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  formatFilter === "podcast-no-video"
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                    : "bg-[#FAFAFA] dark:bg-[#18181B] text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 border-border/60"
                }`}
              >
                Podcast Only (No Video Strategy)
              </button>
              <button
                onClick={() => setFormatFilter("video")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  formatFilter === "video"
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                    : "bg-[#FAFAFA] dark:bg-[#18181B] text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 border-border/60"
                }`}
              >
                YouTube / Video
              </button>
              <button
                onClick={() => setFormatFilter("x-only")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  formatFilter === "x-only"
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                    : "bg-[#FAFAFA] dark:bg-[#18181B] text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 border-border/60"
                }`}
              >
                X Only
              </button>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Filter Category</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategory("")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                category === ""
                  ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                  : "bg-[#FAFAFA] dark:bg-[#18181B] text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 border-border/60"
              }`}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  category === c
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                    : "bg-[#FAFAFA] dark:bg-[#18181B] text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 border-border/60"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Review & Confidence */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-border/40">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Verification Review</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setNeedsReview("")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  needsReview === ""
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                    : "bg-[#FAFAFA] dark:bg-[#18181B] text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 border-border/60"
                }`}
              >
                All Review States
              </button>
              <button
                onClick={() => setNeedsReview("yes")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  needsReview === "yes"
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                    : "bg-[#FAFAFA] dark:bg-[#18181B] text-[#D97706] border-amber-500/30 hover:bg-amber-500/5"
                }`}
              >
                Needs Manual Review
              </button>
              <button
                onClick={() => setNeedsReview("no")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  needsReview === "no"
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                    : "bg-[#FAFAFA] dark:bg-[#18181B] text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 border-border/60"
                }`}
              >
                Verified (No Review)
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Verification Confidence</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setConfidence("")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  confidence === ""
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                    : "bg-[#FAFAFA] dark:bg-[#18181B] text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 border-border/60"
                }`}
              >
                All Confidence Levels
              </button>
              <button
                onClick={() => setConfidence("HIGH")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  confidence === "HIGH"
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                    : "bg-[#FAFAFA] dark:bg-[#18181B] text-[#059669] border-emerald-500/30 hover:bg-emerald-500/5"
                }`}
              >
                High Confidence
              </button>
              <button
                onClick={() => setConfidence("MEDIUM")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  confidence === "MEDIUM"
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                    : "bg-[#FAFAFA] dark:bg-[#18181B] text-[#D97706] border-amber-500/30 hover:bg-amber-500/5"
                }`}
              >
                Medium Confidence
              </button>
              <button
                onClick={() => setConfidence("LOW")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  confidence === "LOW"
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                    : "bg-[#FAFAFA] dark:bg-[#18181B] text-[#DC2626] border-red-500/30 hover:bg-red-500/5"
                }`}
              >
                Low Confidence
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="rounded-2xl border border-border/80 overflow-hidden bg-white dark:bg-[#111111] shadow-sm relative animate-in fade-in duration-500">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAFAFA] dark:bg-[#18181B] text-[#555555] dark:text-[#a1a1aa] uppercase text-[10px] font-bold tracking-wider border-b border-border/60">
              <tr>
                <th className="px-6 py-4">Host & Channel</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Region</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Followers</th>
                <th className="px-6 py-4 text-right">Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredNodes.map((node) => (
                <tr
                  key={node.id}
                  className="table-row-hover hover:bg-black/5 dark:hover:bg-white/5 group relative cursor-pointer"
                  onClick={() => setSelectedNode(node)}
                  onMouseEnter={() => setHoveredChannel(node.channel)}
                  onMouseLeave={() => setHoveredChannel(null)}
                >
                  <td className="px-6 py-4 relative">
                    <div className="font-bold text-foreground group-hover:text-accent transition-colors flex items-center gap-1.5">
                      {node.host}
                      {node.needsManualReview && (
                        <span title="Needs manual review / Cadence Conflict">
                          <AlertTriangle size={13} className="text-amber-500 shrink-0 animate-pulse" />
                        </span>
                      )}
                      {node.publishingCadence === "active" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Active cadence" />
                      )}
                      {node.publishingCadence === "semi-active" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Semi-active cadence" />
                      )}
                      {node.publishingCadence === "inactive" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Inactive cadence" />
                      )}
                    </div>
                    <div className="text-muted text-xs mt-1">
                      {node.channel || (node.isXOnly ? (node.isPodcastOnly ? "Podcast only" : "X only") : "")}
                    </div>
                    {hoveredChannel === node.channel &&
                      node.channel &&
                      !node.isXOnly && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <VideoPreview
                            channelId={node.channelId}
                            youtubeUrl={node.youtubeUrl}
                            channelName={node.channel}
                          />
                        </div>
                      )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground/80 text-xs">
                      {node.category}
                    </div>
                    <div className="text-muted text-xs">{node.subcategory}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground/80">
                    {node.region}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                          node.priority === "HOT"
                            ? "bg-[#FEE2E2] text-[#EF4444] border-[#FCA5A5] dark:bg-[#EF4444]/10 dark:text-[#F87171] dark:border-[#EF4444]/25"
                            : node.priority === "WARM"
                            ? "bg-[#FEF3C7] text-[#D97706] border-[#FCD34D] dark:bg-[#D97706]/10 dark:text-[#FBBF24] dark:border-[#D97706]/25"
                            : node.priority === "MEDIUM"
                            ? "bg-[#DBEAFE] text-[#2563EB] border-[#93C5FD] dark:bg-[#2563EB]/10 dark:text-[#60A5FA] dark:border-[#2563EB]/25"
                            : "bg-[#F3F4F6] text-[#374151] border-[#E5E7EB] dark:bg-panel dark:border-border dark:text-foreground"
                        }`}
                      >
                        {node.priority}
                      </span>
                      {node.calculatedScore !== undefined && (
                        <span className="text-xs font-bold text-foreground/80 bg-[#FAFAFA] dark:bg-white/5 border border-border/80 px-2 py-1 rounded-md">
                          {node.calculatedScore}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted font-medium text-xs">
                    {node.xFollowers
                      ? `${(node.xFollowers / 1000).toFixed(0)}K X`
                      : ""}
                    {(node.xFollowers && (node.youtubeSubscribers || node.isPodcastOnly)) ? " · " : ""}
                    {node.youtubeSubscribers
                      ? `${(node.youtubeSubscribers / 1000).toFixed(0)}K YT`
                      : node.isPodcastOnly
                      ? "Podcast"
                      : ""}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                      {node.youtubeUrl && !node.isXOnly && (
                        <a
                          href={node.youtubeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-muted hover:text-accent transition-colors"
                          title="Open Channel"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Youtube size={16} />
                        </a>
                      )}
                      {node.xProfile && (
                        <a
                          href={node.xProfile}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-muted hover:text-foreground transition-colors"
                          title="Open X Profile"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredNodes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted">
                    No prospects found matching the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      {/* Node Detail Panel */}
      {selectedNode && (
        <NodeDetail
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
