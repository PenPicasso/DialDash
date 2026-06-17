"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { CATEGORIES, NodeData } from "@/lib/types";
import {
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Moon,
  Search,
  SlidersHorizontal,
  Sun,
  X,
  Youtube,
} from "lucide-react";

const VideoPreview = dynamic(
  () => import("@/components/videoPreview").then((mod) => mod.VideoPreview),
  { ssr: false, loading: () => null }
);

const NodeDetail = dynamic(
  () => import("@/components/nodeDetail").then((mod) => mod.NodeDetail),
  { ssr: false }
);

type FilterOption = {
  label: string;
  value: string;
};

type ProspectPayload = {
  nodes: NodeData[];
};

type FreshnessSignal = {
  label: string;
  value: string;
  source: string;
  href?: string;
  date?: string;
  title?: string;
  available: boolean;
  verified: boolean;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 100;

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

function actionabilityLabel(value: string) {
  if (value === "READY") return "Ready";
  if (value === "REJECTED") return "Archived";
  return titleCase(value);
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

function formatCount(value: number | null | undefined) {
  if (!value) return "";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return `${value}`;
}

function formatSource(source?: string) {
  if (!source) return "Unverified";
  if (source === "apple_podcasts") return "Apple Podcasts";
  if (source === "itunes_lookup") return "Apple Lookup";
  return titleCase(source);
}

function getMediaFreshness(node: NodeData) {
  const youtubeDate = node.latestYoutubePublishedAt || node.latestYoutubePublishDate;
  const podcastDate = node.latestPodcastPublishedAt || node.latestPodcastPublishDate;
  const podcastHref = node.latestPodcastEvidenceUrl || node.podcastAppleUrl || node.rssUrl;

  const signals: FreshnessSignal[] = [
    {
      label: "YouTube",
      value: youtubeDate ? formatLatestDate(youtubeDate) : node.youtubeUrl && !node.isXOnly ? "Needs check" : "Missing",
      source: youtubeDate ? "Verified YouTube" : node.youtubeUrl && !node.isXOnly ? "No fetched date" : "No channel",
      href: node.latestYoutubeEvidenceUrl || node.youtubeUrl,
      date: youtubeDate,
      title: node.latestYoutubeTitle,
      available: Boolean(node.youtubeUrl && !node.isXOnly),
      verified: Boolean(youtubeDate),
    },
    {
      label: "Podcast",
      value: podcastDate ? formatLatestDate(podcastDate) : podcastHref ? "Needs check" : "Missing",
      source: podcastDate ? `via ${formatSource(node.latestPodcastSource)}` : podcastHref ? "No fetched date" : "No feed/page",
      href: podcastHref,
      date: podcastDate,
      title: node.latestPodcastTitle,
      available: Boolean(podcastHref),
      verified: Boolean(podcastDate),
    },
  ];

  const datedSignals = signals
    .filter((signal) => signal.date)
    .sort((a, b) => {
      const aTime = parsePublishDate(a.date)?.getTime() || 0;
      const bTime = parsePublishDate(b.date)?.getTime() || 0;
      return bTime - aTime;
    });

  const primary = datedSignals[0] || signals.find((signal) => signal.available) || {
    label: "Media",
    value: "Needs check",
    source: "No verified media date",
    available: false,
    verified: false,
  };

  return { primary, signals, verified: datedSignals.length > 0 };
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

function Metric({
  label,
  value,
  tone = "neutral",
  title,
}: {
  label: string;
  value: number | string;
  tone?: "orange" | "blue" | "neutral";
  title?: string;
}) {
  const toneClass =
    tone === "orange"
      ? "border-brand-orange/35 text-brand-orange"
      : tone === "blue"
        ? "border-brand-blue/25 text-brand-blue dark:text-blue-300"
        : "border-border text-foreground";

  return (
    <div className={`rounded-lg border bg-panel px-4 py-3 ${toneClass}`} title={title}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function ViewPresetSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-[160px] space-y-1.5">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
        View
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-border bg-input-bg px-3 pr-9 text-sm font-bold text-foreground outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
      >
        <option value="ready">Workable</option>
        <option value="hot">Hot ready</option>
        <option value="strong">Strong reach</option>
        <option value="all">All records</option>
        <option value="custom" disabled>
          Custom filters
        </option>
      </select>
    </label>
  );
}

function StatusPill({ status }: { status?: NodeData["actionabilityStatus"] }) {
  if (status === "READY") {
    return (
      <span className="rounded-full border border-brand-orange/30 bg-brand-orange/10 px-2.5 py-1 text-xs font-bold text-brand-orange">
        Ready
      </span>
    );
  }

  if (status === "REJECTED") {
    return (
      <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-bold text-muted">
        Archived
      </span>
    );
  }

  return (
    <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
      Review
    </span>
  );
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

function FreshnessCell({ node }: { node: NodeData }) {
  const freshness = getMediaFreshness(node);
  const toneClass = freshness.verified
    ? "border-brand-blue/30 bg-brand-blue/5"
    : "border-amber-500/30 bg-amber-500/10";

  return (
    <div className="group/fresh inline-block min-w-[132px]" onClick={(event) => event.stopPropagation()}>
      <div className={`rounded-lg border px-3 py-2 transition-all duration-150 group-hover/fresh:w-[260px] group-hover/fresh:shadow-sm ${toneClass}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-foreground">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  freshness.verified ? "bg-brand-blue" : "bg-amber-500"
                }`}
              />
              {freshness.primary.value}
            </div>
            <div className="mt-0.5 truncate text-[10px] font-bold uppercase text-muted">
              {freshness.primary.label}
            </div>
          </div>
          <ChevronDown
            size={14}
            className="mt-0.5 shrink-0 text-muted transition-transform group-hover/fresh:rotate-180"
          />
        </div>
        <div className="grid max-h-0 gap-2 overflow-hidden opacity-0 transition-all duration-150 group-hover/fresh:mt-3 group-hover/fresh:max-h-36 group-hover/fresh:opacity-100">
          {freshness.signals.map((signal) => (
            <div key={signal.label} className="grid grid-cols-[68px_1fr] gap-2 text-[11px]">
              <span className="font-bold text-foreground">{signal.label}</span>
              <span className="min-w-0 text-right text-muted">
                {signal.href ? (
                  <a
                    href={signal.href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-brand-blue hover:underline dark:text-blue-300"
                  >
                    {signal.value}
                  </a>
                ) : (
                  signal.value
                )}
                <span className="block text-[9px] uppercase">{signal.source}</span>
                {signal.title && (
                  <span className="block truncate text-[10px] normal-case text-muted" title={signal.title}>
                    {signal.title}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [confidence, setConfidence] = useState("");
  const [actionability, setActionability] = useState("READY");
  const [reachability, setReachability] = useState("");
  const [outreach, setOutreach] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [funnel, setFunnel] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadProspects() {
      try {
        const response = await fetch("/api/prospects", {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Failed to load prospects");
        const payload = (await response.json()) as ProspectPayload;
        if (active) {
          setNodes(payload.nodes);
          setLoadState("ready");
        }
      } catch (error) {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) {
          setLoadState("error");
        }
      }
    }

    loadProspects();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

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
        .filter((value) => nodes.some((node) => node.priority === value))
        .map((value) => ({ label: titleCase(value), value })),
      categories: CATEGORIES.map((value) => ({ label: value, value })),
      actionability: compact(nodes.map((node) => node.actionabilityStatus)).map((value) => ({
        label: actionabilityLabel(value),
        value,
      })),
      reachability: compact(nodes.map((node) => node.reachabilityStatus)).map((value) => ({
        label: titleCase(value),
        value,
      })),
      outreach: compact(nodes.map((node) => node.bestOutreachChannel)).map((value) => ({
        label: titleCase(value),
        value,
      })),
      leadSources: compact(nodes.map((node) => node.leadSource)).map((value) => ({
        label: titleCase(value),
        value,
      })),
    };
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return nodes.filter((node) => {
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
    deferredSearch,
    formatFilter,
    funnel,
    leadSource,
    nodes,
    outreach,
    priority,
    reachability,
  ]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [actionability, category, confidence, deferredSearch, formatFilter, funnel, leadSource, outreach, priority, reachability]);

  const databaseStats = useMemo(
    () => ({
      total: nodes.length,
      ready: nodes.filter((node) => node.actionabilityStatus === "READY").length,
      archived: nodes.filter((node) => node.actionabilityStatus === "REJECTED").length,
      hotReady: nodes.filter((node) => node.actionabilityStatus === "READY" && node.priority === "HOT").length,
      strongReady: nodes.filter((node) => node.actionabilityStatus === "READY" && node.reachabilityStatus === "STRONG").length,
      mediaVerified: nodes.filter(
        (node) =>
          node.actionabilityStatus === "READY" &&
          Boolean(node.latestYoutubePublishedAt || node.latestYoutubePublishDate || node.latestPodcastPublishedAt || node.latestPodcastPublishDate)
      ).length,
    }),
    [nodes]
  );

  const visibleNodes = filteredNodes.slice(0, visibleCount);
  const hasMoreRows = visibleNodes.length < filteredNodes.length;
  const viewPreset =
    actionability === "READY" && !priority && !reachability
      ? "ready"
      : actionability === "READY" && priority === "HOT" && !reachability
        ? "hot"
        : actionability === "READY" && reachability === "STRONG" && !priority
          ? "strong"
          : !actionability && !priority && !reachability
            ? "all"
            : "custom";

  const advancedFilterCount = [category, formatFilter, confidence, outreach, leadSource, funnel].filter(Boolean).length;
  const hasAdvancedFilters = advancedFilterCount > 0;
  const hasActiveFilters = Boolean(
    search ||
      actionability !== "READY" ||
      priority ||
      reachability ||
      hasAdvancedFilters
  );

  const resetToWorkable = () => {
    setSearch("");
    setPriority("");
    setCategory("");
    setFormatFilter("");
    setConfidence("");
    setActionability("READY");
    setReachability("");
    setOutreach("");
    setLeadSource("");
    setFunnel("");
  };

  const applyViewPreset = (value: string) => {
    if (value === "ready") {
      setActionability("READY");
      setPriority("");
      setReachability("");
    } else if (value === "hot") {
      setActionability("READY");
      setPriority("HOT");
      setReachability("");
    } else if (value === "strong") {
      setActionability("READY");
      setPriority("");
      setReachability("STRONG");
    } else if (value === "all") {
      setActionability("");
      setPriority("");
      setReachability("");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 text-foreground transition-colors duration-300 md:p-8">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-1 flex items-center gap-3 text-4xl font-extrabold tracking-tight">
            <span className="text-gradient">Energy Dial</span> Network
          </h1>
          <p className="text-sm text-muted">
            {databaseStats.ready} workable prospects &middot; {databaseStats.hotReady} hot &middot; {databaseStats.archived} archived by quality gates
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

      <section className="mb-5 grid gap-3 md:grid-cols-4">
        <Metric label="Workable" value={databaseStats.ready} tone="orange" />
        <Metric label="Hot Ready" value={databaseStats.hotReady} />
        <Metric label="Strong Reach" value={databaseStats.strongReady} tone="blue" />
        <Metric label="Media Fresh" value={loadState === "loading" ? "..." : databaseStats.mediaVerified} />
      </section>

      <section className="mb-5 rounded-xl border border-border bg-panel p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <ViewPresetSelect value={viewPreset} onChange={applyViewPreset} />

          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-blue" size={18} />
            <input
              type="text"
              placeholder="Search host, channel, point-man, organization..."
              className="h-11 w-full rounded-lg border border-border bg-input-bg pl-10 pr-3 text-sm font-medium text-foreground outline-none transition-colors placeholder:text-placeholder focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold transition-colors ${
              filtersOpen || hasAdvancedFilters
                ? "border-brand-orange/40 bg-brand-orange/10 text-brand-orange"
                : "border-border bg-background text-foreground/75 hover:border-brand-orange hover:text-brand-orange"
            }`}
          >
            <SlidersHorizontal size={16} />
            Filters
            {hasAdvancedFilters && (
              <span className="rounded-full bg-brand-orange px-1.5 py-0.5 text-[10px] text-white">
                {advancedFilterCount}
              </span>
            )}
          </button>
        </div>

        {filtersOpen && (
          <div className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-2 xl:grid-cols-5">
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
              label="Format"
              value={formatFilter}
              allLabel="All formats"
              options={formatOptions}
              onChange={setFormatFilter}
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
        )}

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
          <span>
            Showing {visibleNodes.length} of {filteredNodes.length || 0}
            {loadState === "loading" ? " prospects..." : " prospects"}
          </span>
          <button
            onClick={resetToWorkable}
            disabled={!hasActiveFilters}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-bold text-brand-blue transition-colors hover:bg-brand-blue/10 disabled:pointer-events-none disabled:opacity-40"
            type="button"
          >
            <X size={13} />
            Reset
          </button>
        </div>
      </section>

      <div className="rounded-xl border border-border bg-panel shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1140px] text-left text-sm">
            <thead className="border-b border-border bg-background text-[10px] font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-4">Host & Channel</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Region</th>
                <th className="px-5 py-4">Media Freshness</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Outreach</th>
                <th className="px-5 py-4">Priority</th>
                <th className="px-5 py-4">Audience</th>
                <th className="px-5 py-4 text-right">Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loadState === "loading" &&
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={9} className="px-5 py-4">
                      <div className="h-8 animate-pulse rounded-lg bg-black/5 dark:bg-white/5" />
                    </td>
                  </tr>
                ))}

              {loadState === "error" && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-red-500">
                    Could not load prospects. Refresh the page and try again.
                  </td>
                </tr>
              )}

              {loadState === "ready" &&
                visibleNodes.map((node) => {
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
                        <FreshnessCell node={node} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill status={node.actionabilityStatus} />
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

              {loadState === "ready" && filteredNodes.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-muted">
                    No prospects found matching the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {hasMoreRows && (
          <div className="border-t border-border p-4 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-bold text-foreground transition-colors hover:border-brand-blue hover:text-brand-blue"
            >
              Show next {Math.min(PAGE_SIZE, filteredNodes.length - visibleNodes.length)}
            </button>
          </div>
        )}
      </div>

      {selectedNode && <NodeDetail node={selectedNode} onClose={() => setSelectedNode(null)} />}
    </div>
  );
}
