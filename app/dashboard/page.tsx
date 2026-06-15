"use client";

import { useEffect, useMemo, useState } from "react";
import data from "@/data/nodes.json";
import { CATEGORIES, NodeData } from "@/lib/types";
import { VideoPreview } from "@/components/videoPreview";
import { NodeDetail } from "@/components/nodeDetail";
import { AlertTriangle, ExternalLink, Moon, Search, Sun, Youtube } from "lucide-react";

const allNodes = data.nodes as NodeData[];

type FilterOption = {
  label: string;
  value: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const formatOptions: FilterOption[] = [
  { label: "Podcast only", value: "podcast-no-video" },
  { label: "YouTube / video", value: "video" },
  { label: "X only", value: "x-only" },
];

const funnelOptions: FilterOption[] = [
  { label: "Video gap", value: "video-gap" },
  { label: "Podcast / newsletter", value: "podcast-newsletter" },
];

const confidenceOptions: FilterOption[] = [
  { label: "High", value: "HIGH" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Low", value: "LOW" },
];

function compact(values: Array<string | undefined | null>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value)))
  ).sort((a, b) => a.localeCompare(b));
}

function titleCase(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parsePublishDate(dateValue?: string) {
  if (!dateValue) return null;

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ? `${dateValue}T12:00:00`
    : dateValue;
  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatAbsoluteDate(dateValue?: string) {
  const parsed = parsePublishDate(dateValue);

  if (!parsed) return "No date";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatLatestDate(dateValue?: string) {
  const parsed = parsePublishDate(dateValue);

  if (!parsed) return "Unknown";

  const diffMs = Date.now() - parsed.getTime();

  if (diffMs < -MS_PER_DAY) return formatAbsoluteDate(dateValue);
  if (diffMs < MS_PER_DAY) return "Today";
  if (diffMs < 2 * MS_PER_DAY) return "Yesterday";

  return `${Math.floor(diffMs / MS_PER_DAY)}d ago`;
}

function getLatestDate(node: NodeData) {
  return node.lastPublishDate || node.lastKnownPublishDate;
}

function formatCount(value: number | null | undefined) {
  if (!value) return "";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return `${value}`;
}

function SelectFilter({
  label,
  value,
  allLabel,
  options,
  onChange,
}: {
  label: string;
  value: string;
  allLabel: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0 space-y-1.5">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-input-bg px-3 pr-9 text-sm font-medium text-foreground outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function actionabilityClasses(status?: NodeData["actionabilityStatus"]) {
  if (status === "READY") {
    return "border-brand-orange/30 bg-brand-orange/10 text-brand-orange";
  }

  if (status === "REJECTED") {
    return "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400";
  }

  return "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400";
}

function priorityClasses(priority: NodeData["priority"]) {
  if (priority === "HOT") {
    return "border-brand-orange/35 bg-brand-orange/10 text-brand-orange";
  }

  if (priority === "WARM") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  if (priority === "MEDIUM") {
    return "border-brand-blue/25 bg-brand-blue/10 text-brand-blue dark:text-blue-300";
  }

  return "border-border bg-panel text-foreground/75";
}

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [isDark, setIsDark] = useState(false);
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

  const filterOptions = useMemo(() => {
    const priorityOrder = ["HOT", "WARM", "MEDIUM", "COLD"];

    return {
      priorities: priorityOrder
        .filter((value) => allNodes.some((node) => node.priority === value))
        .map((value) => ({ label: titleCase(value), value })),
      categories: CATEGORIES.map((value) => ({ label: value, value })),
      actionability: compact(allNodes.map((node) => node.actionabilityStatus)).map((value) => ({
        label: titleCase(value),
        value,
      })),
      reachability: compact(allNodes.map((node) => node.reachabilityStatus)).map((value) => ({
        label: titleCase(value),
        value,
      })),
      outreach: compact(allNodes.map((node) => node.bestOutreachChannel)).map((value) => ({
        label: titleCase(value),
        value,
      })),
      leadSources: compact(allNodes.map((node) => node.leadSource)).map((value) => ({
        label: titleCase(value),
        value,
      })),
    };
  }, []);

  const filteredNodes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return allNodes.filter((node) => {
      const searchFields = [
        node.channel,
        node.host,
        node.pointManName,
        node.organizationName,
        node.subcategory,
      ];
      const matchSearch = normalizedSearch
        ? searchFields.some((field) => field?.toLowerCase().includes(normalizedSearch))
        : true;
      const matchPriority = priority ? node.priority === priority : true;
      const matchCategory = category ? node.category === category : true;
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
        matchConfidence &&
        matchActionability &&
        matchReachability &&
        matchOutreach &&
        matchLeadSource &&
        matchFunnel &&
        matchFormat
      );
    });
  }, [
    actionability,
    category,
    confidence,
    formatFilter,
    funnel,
    leadSource,
    outreach,
    priority,
    reachability,
    search,
  ]);

  const stats = useMemo(
    () => ({
      total: filteredNodes.length,
      ready: filteredNodes.filter((node) => node.actionabilityStatus === "READY").length,
      rejected: filteredNodes.filter((node) => node.actionabilityStatus === "REJECTED").length,
      hot: filteredNodes.filter((node) => node.priority === "HOT").length,
      strongReach: filteredNodes.filter((node) => node.reachabilityStatus === "STRONG").length,
    }),
    [filteredNodes]
  );

  const hasActiveFilters = Boolean(
    search ||
      priority ||
      category ||
      formatFilter ||
      confidence ||
      actionability ||
      reachability ||
      outreach ||
      leadSource ||
      funnel
  );

  const resetFilters = () => {
    setSearch("");
    setPriority("");
    setCategory("");
    setFormatFilter("");
    setConfidence("");
    setActionability("");
    setReachability("");
    setOutreach("");
    setLeadSource("");
    setFunnel("");
  };

  return (
    <div className="min-h-screen bg-background p-4 text-foreground transition-colors duration-300 md:p-8">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-1 flex items-center gap-3 text-4xl font-extrabold tracking-tight">
            <span className="text-gradient">Energy Dial</span> Network
          </h1>
          <p className="text-sm text-muted">
            {stats.total} prospects &middot; {stats.ready} READY &middot; {stats.hot} HOT &middot; {stats.strongReach} strong reach
          </p>
        </div>
        <button
          onClick={() => setIsDark(!isDark)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-panel text-muted transition-colors hover:border-brand-blue hover:text-brand-blue"
          title="Toggle theme"
          type="button"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <section className="mb-6 grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-brand-orange/35 bg-panel p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Ready</div>
          <div className="mt-2 text-2xl font-extrabold text-brand-orange">{stats.ready}</div>
        </div>
        <div className="rounded-lg border border-brand-blue/25 bg-panel p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Strong Reach</div>
          <div className="mt-2 text-2xl font-extrabold text-brand-blue dark:text-blue-300">{stats.strongReach}</div>
        </div>
        <div className="rounded-lg border border-border bg-panel p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Hot</div>
          <div className="mt-2 text-2xl font-extrabold text-foreground">{stats.hot}</div>
        </div>
        <div className="rounded-lg border border-border bg-panel p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Rejected</div>
          <div className="mt-2 text-2xl font-extrabold text-foreground/70">{stats.rejected}</div>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-border bg-panel p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative md:col-span-2 xl:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-blue" size={18} />
            <input
              type="text"
              placeholder="Search host, channel, person, organization..."
              className="h-10 w-full rounded-lg border border-border bg-input-bg pl-10 pr-3 text-sm font-medium text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <SelectFilter
            label="Status"
            value={actionability}
            allLabel="All statuses"
            options={filterOptions.actionability}
            onChange={setActionability}
          />
          <SelectFilter
            label="Category"
            value={category}
            allLabel="All categories"
            options={filterOptions.categories}
            onChange={setCategory}
          />
          <SelectFilter
            label="Priority"
            value={priority}
            allLabel="All priorities"
            options={filterOptions.priorities}
            onChange={setPriority}
          />
          <SelectFilter
            label="Format"
            value={formatFilter}
            allLabel="All formats"
            options={formatOptions}
            onChange={setFormatFilter}
          />
          <SelectFilter
            label="Reach"
            value={reachability}
            allLabel="All reach"
            options={filterOptions.reachability}
            onChange={setReachability}
          />
          <SelectFilter
            label="Outreach"
            value={outreach}
            allLabel="All outreach"
            options={filterOptions.outreach}
            onChange={setOutreach}
          />
          <SelectFilter
            label="Source"
            value={leadSource}
            allLabel="All sources"
            options={filterOptions.leadSources}
            onChange={setLeadSource}
          />
          <SelectFilter
            label="Funnel"
            value={funnel}
            allLabel="All funnels"
            options={funnelOptions}
            onChange={setFunnel}
          />
          <SelectFilter
            label="Confidence"
            value={confidence}
            allLabel="All confidence"
            options={confidenceOptions}
            onChange={setConfidence}
          />
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
          <span>{hasActiveFilters ? "Filtered view" : "Full prospect list"}</span>
          <button
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="rounded-md px-2 py-1 font-bold text-brand-blue transition-colors hover:bg-brand-blue/10 disabled:pointer-events-none disabled:opacity-40"
            type="button"
          >
            Reset filters
          </button>
        </div>
      </section>

      <div className="overflow-hidden rounded-xl border border-border bg-panel shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="border-b border-border bg-background text-[10px] font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-4">Host & Channel</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Region</th>
                <th className="px-5 py-4">Latest</th>
                <th className="px-5 py-4">Actionability</th>
                <th className="px-5 py-4">Outreach</th>
                <th className="px-5 py-4">Priority</th>
                <th className="px-5 py-4">Followers</th>
                <th className="px-5 py-4 text-right">Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredNodes.map((node) => {
                const latestDate = getLatestDate(node);
                const followers = [
                  node.xFollowers ? `${formatCount(node.xFollowers)} X` : "",
                  node.youtubeSubscribers
                    ? `${formatCount(node.youtubeSubscribers)} YT`
                    : node.isPodcastOnly
                      ? "Podcast"
                      : "",
                ].filter(Boolean);

                return (
                  <tr
                    key={node.id}
                    className="table-row-hover group relative cursor-pointer hover:bg-black/[0.025] dark:hover:bg-white/[0.035]"
                    onClick={() => setSelectedNode(node)}
                    onMouseEnter={() => setHoveredChannel(node.channel)}
                    onMouseLeave={() => setHoveredChannel(null)}
                  >
                    <td className="relative px-5 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-foreground transition-colors group-hover:text-brand-orange">
                        {node.host}
                        {node.needsManualReview && (
                          <span title="Needs manual review / cadence conflict">
                            <AlertTriangle size={13} className="shrink-0 text-amber-500" />
                          </span>
                        )}
                        {node.publishingCadence === "active" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Active cadence" />
                        )}
                        {node.publishingCadence === "semi-active" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Semi-active cadence" />
                        )}
                        {node.publishingCadence === "inactive" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" title="Inactive cadence" />
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {node.channel || (node.isXOnly ? (node.isPodcastOnly ? "Podcast only" : "X only") : "")}
                      </div>
                      {hoveredChannel === node.channel && node.channel && !node.isXOnly && (
                        <div onClick={(event) => event.stopPropagation()}>
                          <VideoPreview
                            channelId={node.channelId}
                            youtubeUrl={node.youtubeUrl}
                            channelName={node.channel}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-xs font-semibold text-foreground/85">{node.category}</div>
                      <div className="text-xs text-muted">{node.subcategory}</div>
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-foreground/80">{node.region}</td>
                    <td className="px-5 py-4">
                      <div className="text-xs font-extrabold text-foreground" title={formatAbsoluteDate(latestDate)}>
                        {formatLatestDate(latestDate)}
                      </div>
                      <div className="mt-1 text-[10px] uppercase text-muted">
                        {node.sourceOfLastPublishDate || node.publishingCadence || "unchecked"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-bold ${actionabilityClasses(node.actionabilityStatus)}`}
                      >
                        {node.actionabilityStatus || "REVIEW"}
                      </span>
                      {node.reachabilityStatus && (
                        <div className="mt-1 text-[10px] font-bold uppercase text-brand-blue dark:text-blue-300">
                          {node.reachabilityStatus} reach
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-xs font-bold uppercase text-foreground/85">
                        {node.bestOutreachChannel ? titleCase(node.bestOutreachChannel) : "Missing"}
                      </div>
                      <div className="mt-1 text-[10px] text-muted">
                        {node.leadSource ? titleCase(node.leadSource) : "Legacy"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${priorityClasses(node.priority)}`}>
                          {node.priority}
                        </span>
                        {node.calculatedScore !== undefined && (
                          <span className="rounded-md border border-border bg-background px-2 py-1 text-xs font-bold text-foreground/80">
                            {node.calculatedScore}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-muted">
                      {followers.length ? followers.join(" / ") : "Unknown"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-80 transition-opacity group-hover:opacity-100">
                        {node.youtubeUrl && !node.isXOnly && (
                          <a
                            href={node.youtubeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg p-2 text-muted transition-colors hover:bg-brand-orange/10 hover:text-brand-orange"
                            title="Open channel"
                            aria-label={`Open ${node.channel || node.host} on YouTube`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Youtube size={16} />
                          </a>
                        )}
                        {node.xProfile && (
                          <a
                            href={node.xProfile}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg p-2 text-muted transition-colors hover:bg-brand-blue/10 hover:text-brand-blue dark:hover:text-blue-300"
                            title="Open X profile"
                            aria-label={`Open ${node.host} X profile`}
                            onClick={(event) => event.stopPropagation()}
                          >
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
                  <td colSpan={9} className="px-6 py-12 text-center text-muted">
                    No prospects found matching the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedNode && <NodeDetail node={selectedNode} onClose={() => setSelectedNode(null)} />}
    </div>
  );
}
