"use client";

import { useState, useEffect } from "react";
import data from "@/data/nodes.json";
import { CATEGORIES, NodeData } from "@/lib/types";
import { VideoPreview } from "@/components/videoPreview";
import { NodeDetail } from "@/components/nodeDetail";
import { Search, Youtube, ExternalLink, Moon, Sun, AlertTriangle } from "lucide-react";



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
  const [actionability, setActionability] = useState("");
  const [reachability, setReachability] = useState("");
  const [outreach, setOutreach] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [funnel, setFunnel] = useState("");

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark]);

  const categories = CATEGORIES;
  const priorities = Array.from(new Set(allNodes.map((n) => n.priority).filter(Boolean)));
  const actionabilityStates = Array.from(new Set(allNodes.flatMap((n) => (n.actionabilityStatus ? [n.actionabilityStatus] : []))));
  const reachabilityStates = Array.from(new Set(allNodes.flatMap((n) => (n.reachabilityStatus ? [n.reachabilityStatus] : []))));
  const outreachChannels = Array.from(new Set(allNodes.flatMap((n) => (n.bestOutreachChannel ? [n.bestOutreachChannel] : []))));
  const leadSources = Array.from(new Set(allNodes.flatMap((n) => (n.leadSource ? [n.leadSource] : []))));

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
    const matchActionability = actionability ? node.actionabilityStatus === actionability : true;
    const matchReachability = reachability ? node.reachabilityStatus === reachability : true;
    const matchOutreach = outreach ? node.bestOutreachChannel === outreach : true;
    const matchLeadSource = leadSource ? node.leadSource === leadSource : true;
    const matchFunnel =
      funnel === "video-gap"
        ? Boolean(node.videoGapReason && !node.videoGapReason.toLowerCase().includes("existing large"))
        : funnel === "podcast-newsletter"
        ? Boolean(node.mofChannels?.some((channel) => ["Podcast", "Newsletter"].includes(channel)))
        : true;
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
      matchActionability &&
      matchReachability &&
      matchOutreach &&
      matchLeadSource &&
      matchFunnel &&
      matchFormat
    );
  });

  const nodeCount = filteredNodes.length;
  const xOnlyCount = filteredNodes.filter((n) => n.isXOnly).length;
  const readyCount = filteredNodes.filter((n) => n.actionabilityStatus === "READY").length;
  const reviewCount = filteredNodes.filter((n) => n.actionabilityStatus === "REVIEW").length;

  return (
    <div className="min-h-screen bg-background text-foreground p-8 font-sans transition-colors duration-300">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-1 flex items-center gap-3">
            <span className="text-gradient">Energy Dial</span> Network
          </h1>
          <p className="text-muted text-sm">
            {nodeCount} prospects &middot; {readyCount} READY &middot; {reviewCount} REVIEW &middot; {xOnlyCount} X-only
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

        {/* Actionability, Reachability & Lead Source */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-2 border-t border-border/40">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Actionability</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActionability("")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  actionability === ""
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                    : "bg-[#FAFAFA] dark:bg-[#18181B] text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 border-border/60"
                }`}
              >
                All States
              </button>
              {actionabilityStates.map((state) => (
                <button
                  key={state}
                  onClick={() => setActionability(state)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                    actionability === state
                      ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                      : state === "READY"
                      ? "bg-[#FAFAFA] dark:bg-[#18181B] text-[#059669] border-emerald-500/30 hover:bg-emerald-500/5"
                      : "bg-[#FAFAFA] dark:bg-[#18181B] text-[#D97706] border-amber-500/30 hover:bg-amber-500/5"
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Reachability</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setReachability("")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  reachability === ""
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                    : "bg-[#FAFAFA] dark:bg-[#18181B] text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 border-border/60"
                }`}
              >
                All Reachability
              </button>
              {reachabilityStates.map((state) => (
                <button
                  key={state}
                  onClick={() => setReachability(state)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                    reachability === state
                      ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                      : "bg-[#FAFAFA] dark:bg-[#18181B] text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 border-border/60"
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Funnel Opportunity</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFunnel("")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  funnel === ""
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                    : "bg-[#FAFAFA] dark:bg-[#18181B] text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 border-border/60"
                }`}
              >
                All Funnels
              </button>
              <button
                onClick={() => setFunnel("video-gap")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  funnel === "video-gap"
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                    : "bg-[#FAFAFA] dark:bg-[#18181B] text-[#D97706] border-amber-500/30 hover:bg-amber-500/5"
                }`}
              >
                Video Gap
              </button>
              <button
                onClick={() => setFunnel("podcast-newsletter")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  funnel === "podcast-newsletter"
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                    : "bg-[#FAFAFA] dark:bg-[#18181B] text-[#2563EB] border-blue-500/30 hover:bg-blue-500/5"
                }`}
              >
                Podcast / Newsletter
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-border/40">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Best Outreach Channel</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setOutreach("")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  outreach === ""
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                    : "bg-[#FAFAFA] dark:bg-[#18181B] text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 border-border/60"
                }`}
              >
                All Outreach
              </button>
              {outreachChannels.map((channel) => (
                <button
                  key={channel}
                  onClick={() => setOutreach(channel)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                    outreach === channel
                      ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                      : "bg-[#FAFAFA] dark:bg-[#18181B] text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 border-border/60"
                  }`}
                >
                  {channel.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Lead Source</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setLeadSource("")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  leadSource === ""
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                    : "bg-[#FAFAFA] dark:bg-[#18181B] text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 border-border/60"
                }`}
              >
                All Sources
              </button>
              {leadSources.map((source) => (
                <button
                  key={source}
                  onClick={() => setLeadSource(source)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                    leadSource === source
                      ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-sm"
                      : "bg-[#FAFAFA] dark:bg-[#18181B] text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 border-border/60"
                  }`}
                >
                  {source.replace("_", " ")}
                </button>
              ))}
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
                <th className="px-6 py-4">Actionability</th>
                <th className="px-6 py-4">Outreach</th>
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
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                        node.actionabilityStatus === "READY"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                          : node.actionabilityStatus === "REJECTED"
                          ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                      }`}
                    >
                      {node.actionabilityStatus || "REVIEW"}
                    </span>
                    {node.reachabilityStatus && (
                      <div className="text-muted text-[10px] mt-1 font-bold uppercase">
                        {node.reachabilityStatus} reach
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-semibold text-foreground/80 uppercase">
                      {node.bestOutreachChannel ? node.bestOutreachChannel.replace("_", " ") : "Missing"}
                    </div>
                    <div className="text-muted text-[10px] mt-1">
                      {node.leadSource ? node.leadSource.replace("_", " ") : "legacy"}
                    </div>
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
                  <td colSpan={8} className="px-6 py-12 text-center text-muted">
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
