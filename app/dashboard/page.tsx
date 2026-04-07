"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import data from "@/data/nodes.json";
import { NodeData } from "@/lib/types";
import { VideoPreview } from "@/components/videoPreview";
import { NodeDetail } from "@/components/nodeDetail";
import { Search, Youtube, ExternalLink, Moon, Sun, Table2, Network } from "lucide-react";

const NetworkGraph = dynamic(() => import("@/components/networkGraph"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-muted">
      Loading graph...
    </div>
  ),
});

const allNodes = data.nodes as NodeData[];

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [region, setRegion] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "graph">("graph");
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [isDark, setIsDark] = useState(true);

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
    const matchRegion = region ? node.region === region : true;
    return matchSearch && matchPriority && matchCategory && matchRegion;
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
          {/* View toggle */}
          <div className="flex bg-panel border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2.5 transition-colors ${
                viewMode === "table"
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:text-foreground"
              }`}
              title="Table View"
            >
              <Table2 size={18} />
            </button>
            <button
              onClick={() => setViewMode("graph")}
              className={`p-2.5 transition-colors ${
                viewMode === "graph"
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:text-foreground"
              }`}
              title="Graph View"
            >
              <Network size={18} />
            </button>
          </div>
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2.5 rounded-lg bg-panel border border-border hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-muted hover:text-foreground"
            title="Toggle Theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            type="text"
            placeholder="Search hosts or channels..."
            className="w-full bg-white dark:bg-[#111] text-[#111] dark:text-[#e5e5e5] placeholder-[#777] dark:placeholder-[#888] border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="bg-white dark:bg-[#111] text-[#111] dark:text-[#e5e5e5] border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">All Priorities</option>
          {priorities.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          className="bg-white dark:bg-[#111] text-[#111] dark:text-[#e5e5e5] border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="bg-white dark:bg-[#111] text-[#111] dark:text-[#e5e5e5] border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        >
          <option value="">All Regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Main Content */}
      {viewMode === "graph" ? (
        <div className="rounded-xl border border-border overflow-hidden bg-panel/80 backdrop-blur-md shadow-xl h-[72vh] animate-in fade-in duration-500">
          <NetworkGraph
            nodes={filteredNodes}
            onNodeClick={(node) => setSelectedNode(node)}
            searchQuery={search}
            activeCategory={category}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-panel/80 backdrop-blur-md shadow-xl relative animate-in fade-in duration-500">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel/90 text-muted uppercase text-xs font-semibold tracking-wider border-b border-border">
              <tr>
                <th className="px-6 py-4">Host & Channel</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Region</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Followers</th>
                <th className="px-6 py-4 text-right">Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredNodes.map((node) => (
                <tr
                  key={node.id}
                  className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group relative cursor-pointer"
                  onClick={() => setSelectedNode(node)}
                  onMouseEnter={() => setHoveredChannel(node.channel)}
                  onMouseLeave={() => setHoveredChannel(null)}
                >
                  <td className="px-6 py-4 relative">
                    <div className="font-bold text-foreground group-hover:text-accent transition-colors">
                      {node.host}
                    </div>
                    <div className="text-muted text-xs mt-1">
                      {node.channel || (node.isXOnly ? "X only" : "")}
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
                      className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                        node.priority === "HOT"
                          ? "bg-accent/10 text-accent border border-accent/20"
                          : node.priority === "WARM"
                          ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                          : "bg-panel border border-border text-foreground"
                      }`}
                    >
                      {node.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted font-medium text-xs">
                    {node.xFollowers
                      ? `${(node.xFollowers / 1000).toFixed(0)}K X`
                      : ""}
                    {node.xFollowers && node.youtubeSubscribers ? " · " : ""}
                    {node.youtubeSubscribers
                      ? `${(node.youtubeSubscribers / 1000).toFixed(0)}K YT`
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
      )}

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
