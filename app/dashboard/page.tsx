"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, NodeData } from "@/lib/types";
import { isLiveMediaPayload, mergeLiveMedia, type LiveMediaPayload, type LiveMediaRecord } from "@/lib/liveMediaFreshness";
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  ChevronRight,
  Command,
  FlaskConical,
  LayoutDashboard,
  LockKeyhole,
  Moon,
  Search,
  SearchCheck,
  SlidersHorizontal,
  Sun,
  UserRoundCheck,
  X,
} from "lucide-react";
import { MediaFreshness } from "@/components/mediaFreshness";

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
  summary: {
    total: number;
    reviewed: number;
    pursue: number;
    nurture: number;
    excluded: number;
    strongReady: number;
    mediaVerified: number;
  };
};

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
        <option value="pursue">Pursue now</option>
        <option value="research">Nurture</option>
        <option value="excluded">Factual exclusions</option>
        <option value="all">All reviewed</option>
        <option value="ready">Legacy workable</option>
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

function DecisionPill({ decision }: { decision?: NodeData["reviewDecision"] }) {
  if (decision === "PURSUE_NOW") return <span className="inline-flex min-w-[108px] justify-center rounded-full border border-brand-orange/30 bg-brand-orange/10 px-2.5 py-1 text-xs font-extrabold text-brand-orange">Pursue now</span>;
  if (decision === "NURTURE") return <span className="inline-flex min-w-[108px] justify-center rounded-full border border-brand-blue/25 bg-brand-blue/5 px-2.5 py-1 text-xs font-extrabold text-brand-blue">Nurture</span>;
  return <span className="inline-flex min-w-[108px] justify-center rounded-full border border-border bg-background px-2.5 py-1 text-xs font-bold text-muted">Excluded</span>;
}

function ReviewFreshness({ node }: { node: NodeData }) {
  if (node.reviewDecision === "DISQUALIFIED_CONFIRMED") {
    return (
      <div className="min-w-0 rounded-md border border-border bg-background px-3 py-2">
        <div className="text-[10px] font-extrabold text-foreground">Evidence reviewed</div>
        <div className="mt-0.5 text-[9px] font-bold uppercase text-muted">See Sol outcome</div>
      </div>
    );
  }
  return <div className="min-w-0 overflow-hidden"><MediaFreshness node={node} /></div>;
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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [summary, setSummary] = useState<ProspectPayload["summary"]>();
  const [loadedAll, setLoadedAll] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [confidence, setConfidence] = useState("");
  const [actionability, setActionability] = useState("");
  const [methodologyDecision, setMethodologyDecision] = useState("PURSUE_NOW");
  const [reachability, setReachability] = useState("");
  const [outreach, setOutreach] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [funnel, setFunnel] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [focusOnly, setFocusOnly] = useState(false);
  const [focusedIds, setFocusedIds] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const freshnessRecordsRef = useRef<Map<string, LiveMediaRecord>>(new Map());
  const [freshnessRun, setFreshnessRun] = useState<LiveMediaPayload["run"]>();

  useEffect(() => {
    try {
      setFocusedIds(JSON.parse(localStorage.getItem("dialdash:focus:v1") || "[]") as string[]);
      setIsDark(localStorage.getItem("dialdash:theme:v1") === "dark");
    } catch {
      setFocusedIds([]);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      } else if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (event.key === "Escape") {
        setCommandOpen(false);
        setSelectedNode(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadProspects() {
      try {
        const response = await fetch("/api/prospects?scope=pursue", {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Failed to load prospects");
        const payload = (await response.json()) as ProspectPayload;
        if (active) {
          setNodes(mergeLiveMedia(payload.nodes, freshnessRecordsRef.current.values()));
          setSummary(payload.summary);
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
    const needsAll = filtersOpen || Boolean(search) || methodologyDecision !== "PURSUE_NOW";
    if (!needsAll || loadedAll) return;
    const controller = new AbortController();
    setLoadState("loading");
    fetch("/api/prospects?scope=all", { signal: controller.signal, headers: { Accept: "application/json" } })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load prospects");
        return response.json() as Promise<ProspectPayload>;
      })
      .then((payload) => {
        setNodes(mergeLiveMedia(payload.nodes, freshnessRecordsRef.current.values()));
        setSummary(payload.summary);
        setLoadedAll(true);
        setLoadState("ready");
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setLoadState("error");
      });
    return () => controller.abort();
  }, [filtersOpen, loadedAll, methodologyDecision, search]);

  useEffect(() => {
    let active = true;
    let controller: AbortController | undefined;

    async function loadFreshness() {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch("/api/media-freshness", {
          signal: controller.signal,
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Failed to load live media freshness");
        const payload: unknown = await response.json();
        if (!active || !isLiveMediaPayload(payload)) return;
        const map = new Map(payload.records.map((record) => [record.prospectId, record]));
        freshnessRecordsRef.current = map;
        setFreshnessRun(payload.run);
        setNodes((current) => mergeLiveMedia(current, map.values()));
        setSelectedNode((current) => current ? mergeLiveMedia([current], map.values())[0] : null);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.warn("Live media freshness is unavailable; using the deployment snapshot.");
        }
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") loadFreshness();
    };
    loadFreshness();
    const interval = window.setInterval(loadFreshness, 15 * 60 * 1000);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("dialdash:theme:v1", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleFocus = (nodeId: string) => {
    setFocusedIds((current) => {
      const next = current.includes(nodeId)
        ? current.filter((id) => id !== nodeId)
        : [...current, nodeId];
      localStorage.setItem("dialdash:focus:v1", JSON.stringify(next));
      return next;
    });
  };

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
      methodology: compact(nodes.map((node) => node.reviewDecision)).map((value) => ({
        label: value === "PURSUE_NOW" ? "Pursue now" : value === "NURTURE" ? "Nurture" : "Factual exclusion",
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
        node.reviewPointMan,
        node.reviewBuyer,
        node.reviewOwner,
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
      const matchMethodology = methodologyDecision ? node.reviewDecision === methodologyDecision : true;
      const matchReachability = reachability ? node.reachabilityStatus === reachability : true;
      const matchOutreach = outreach ? node.bestOutreachChannel === outreach : true;
      const matchLeadSource = leadSource ? node.leadSource === leadSource : true;
      const matchFocus = focusOnly ? focusedIds.includes(node.id) : true;
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
        matchMethodology &&
        matchReachability &&
        matchOutreach &&
        matchLeadSource &&
        matchFocus &&
        matchFunnel &&
        matchFormat
      );
    }).sort((a, b) => (a.fitRank || Number.MAX_SAFE_INTEGER) - (b.fitRank || Number.MAX_SAFE_INTEGER));
  }, [
    actionability,
    category,
    confidence,
    deferredSearch,
    formatFilter,
    funnel,
    focusOnly,
    focusedIds,
    leadSource,
    methodologyDecision,
    nodes,
    outreach,
    priority,
    reachability,
  ]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [actionability, category, confidence, deferredSearch, focusOnly, formatFilter, funnel, leadSource, methodologyDecision, outreach, priority, reachability]);

  const loadedStats = useMemo(
    () => ({
      total: nodes.length,
      ready: nodes.filter((node) => node.actionabilityStatus === "READY").length,
      archived: nodes.filter((node) => node.actionabilityStatus === "REJECTED").length,
      hotReady: nodes.filter((node) => node.actionabilityStatus === "READY" && node.priority === "HOT").length,
      strongReady: nodes.filter((node) => node.actionabilityStatus === "READY" && node.reachabilityStatus === "STRONG").length,
      mediaVerified: nodes.filter(
        (node) =>
          node.actionabilityStatus === "READY" &&
          Boolean(node.latestYoutubePublishedAt || node.latestYoutubePublishDate || node.latestPodcastPublishedAt || node.latestPodcastPublishDate || node.latestNewsletterPublishedAt)
      ).length,
      reviewed: nodes.filter((node) => node.reviewStatus === "PASSED").length,
      pursue: nodes.filter((node) => node.reviewDecision === "PURSUE_NOW").length,
      nurture: nodes.filter((node) => node.reviewDecision === "NURTURE").length,
      excluded: nodes.filter((node) => node.reviewDecision === "DISQUALIFIED_CONFIRMED").length,
    }),
    [nodes]
  );
  const databaseStats = summary || loadedStats;
  const freshnessIsStale = freshnessRun ? Date.now() - new Date(freshnessRun.completedAt).getTime() > 30 * 60 * 60 * 1000 : false;

  const visibleNodes = filteredNodes.slice(0, visibleCount);
  const hasMoreRows = visibleNodes.length < filteredNodes.length;
  const viewPreset =
    methodologyDecision === "PURSUE_NOW" && !actionability && !priority && !reachability
      ? "pursue"
      : methodologyDecision === "NURTURE" && !actionability && !priority && !reachability
        ? "research"
        : methodologyDecision === "DISQUALIFIED_CONFIRMED" && !actionability && !priority && !reachability
          ? "excluded"
    : actionability === "READY" && !methodologyDecision && !priority && !reachability
      ? "ready"
          : !actionability && !methodologyDecision && !priority && !reachability
            ? "all"
            : "custom";

  const advancedFilterCount = [category, formatFilter, confidence, outreach, leadSource, funnel, actionability].filter(Boolean).length;
  const hasAdvancedFilters = advancedFilterCount > 0;
  const hasActiveFilters = Boolean(
      search ||
      methodologyDecision !== "PURSUE_NOW" ||
      actionability ||
      priority ||
      reachability ||
      focusOnly ||
      hasAdvancedFilters
  );

  const resetToWorkable = () => {
    setSearch("");
    setPriority("");
    setCategory("");
    setFormatFilter("");
    setConfidence("");
    setActionability("");
    setMethodologyDecision("PURSUE_NOW");
    setReachability("");
    setOutreach("");
    setLeadSource("");
    setFunnel("");
    setFocusOnly(false);
  };

  const applyViewPreset = (value: string) => {
    if (value === "pursue") {
      setMethodologyDecision("PURSUE_NOW");
      setActionability("");
      setPriority("");
      setReachability("");
    } else if (value === "research") {
      setMethodologyDecision("NURTURE");
      setActionability("");
      setPriority("");
      setReachability("");
    } else if (value === "excluded") {
      setMethodologyDecision("DISQUALIFIED_CONFIRMED");
      setActionability("");
      setPriority("");
      setReachability("");
    } else if (value === "ready") {
      setMethodologyDecision("");
      setActionability("READY");
      setPriority("");
      setReachability("");
    } else if (value === "all") {
      setMethodologyDecision("");
      setActionability("");
      setPriority("");
      setReachability("");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <nav className="sticky top-0 z-40 border-b border-border/80 bg-panel/95 px-4 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex h-16 max-w-[1560px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-7">
            <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5" aria-label="DialDash dashboard">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-blue text-sm font-black text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)]">DD</span>
              <span className="hidden text-base font-black tracking-tight sm:block">Dial<span className="text-brand-orange">Dash</span></span>
            </Link>
            <div className="hidden items-center gap-1 lg:flex">
              <Link href="/dashboard" className="inline-flex h-9 items-center gap-2 rounded-md bg-brand-blue/8 px-3 text-xs font-extrabold text-brand-blue"><LayoutDashboard size={15} />Prospects</Link>
              <Link href="/report" className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-bold text-muted hover:bg-background hover:text-foreground"><SearchCheck size={15} />Report</Link>
              <Link href="/pilot" className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-bold text-muted hover:bg-background hover:text-foreground"><FlaskConical size={15} />Research</Link>
              <Link href="/pilot" className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-bold text-muted hover:bg-background hover:text-foreground"><BookOpen size={15} />Playbook</Link>
              <Link href="/portal/demo" className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-bold text-muted hover:bg-background hover:text-foreground"><UserRoundCheck size={15} />Client portal</Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-500/8 px-2.5 py-1 text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-300 sm:inline-flex"><LockKeyhole size={11} />Private workspace</span>
            <button onClick={() => setCommandOpen(true)} className="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-md border border-border bg-background text-xs font-bold text-muted hover:border-brand-blue hover:text-brand-blue sm:w-auto sm:px-2.5" type="button" title="Open command menu" aria-label="Open command menu"><Command size={14} /><span className="hidden sm:inline">Menu</span><kbd className="hidden rounded border border-border bg-panel px-1.5 py-0.5 text-[9px] sm:inline">Ctrl K</kbd></button>
            <button onClick={() => setIsDark(!isDark)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted transition-colors hover:border-brand-blue hover:text-brand-blue" title="Toggle theme" type="button">{isDark ? <Sun size={17} /> : <Moon size={17} />}</button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-[1560px] p-4 md:p-8">
      <header className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-orange">Prospect intelligence</div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">Your next Energy Dial clients</h1>
          <p className="mt-1.5 text-sm text-muted">
            {databaseStats.reviewed} fully reviewed &middot; {databaseStats.pursue} pursue now &middot; {databaseStats.nurture} nurture &middot; {databaseStats.excluded} excluded
          </p>
          {freshnessRun && (
            <div className={`mt-2 inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase ${freshnessIsStale ? "text-amber-600" : "text-emerald-700 dark:text-emerald-300"}`}>
              {freshnessIsStale && <AlertTriangle size={12} />}
              Media checked {freshnessRun.completedAt ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(freshnessRun.completedAt)) : "previously"}
              {freshnessIsStale ? " · refresh overdue" : ` · ${freshnessRun.recordCount} live records`}
            </div>
          )}
        </div>
        <button type="button" onClick={() => setFocusOnly((current) => !current)} className={`inline-flex h-10 items-center gap-2 self-start rounded-md border px-3 text-xs font-extrabold transition-colors md:self-auto ${focusOnly ? "border-brand-orange bg-brand-orange text-white" : "border-border bg-panel text-foreground hover:border-brand-orange"}`}>
          {focusOnly ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
          Focus queue <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${focusOnly ? "bg-white/20" : "bg-background text-muted"}`}>{focusedIds.length}</span>
        </button>
      </header>

      <section className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Reviewed" value={databaseStats.reviewed} tone="blue" title="All 840 records have a completed Sol-reviewed decision." />
        <Metric label="Pursue Now" value={databaseStats.pursue} tone="orange" />
        <Metric label="Nurture" value={databaseStats.nurture} />
        <Metric label="Excluded" value={databaseStats.excluded} title="Only factual hard-gate exclusions; missing evidence remains nurture." />
      </section>

      <section className="mb-5 rounded-xl border border-border bg-panel p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <ViewPresetSelect value={viewPreset} onChange={applyViewPreset} />

          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-blue" size={18} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search host, show, buyer or organization...  ( / )"
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
              label="Decision"
              value={methodologyDecision}
              allLabel="All decisions"
              options={filterOptions.methodology}
              onChange={setMethodologyDecision}
            />
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

      <div className="grid min-w-0 gap-3 md:hidden">
        {loadState === "loading" && Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-44 animate-pulse rounded-lg border border-border bg-panel" />
        ))}
        {loadState === "ready" && visibleNodes.map((node) => (
          <article key={node.id} onClick={() => setSelectedNode(node)} className="w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-panel p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-base font-extrabold">{node.host}</h2>
                  {node.fitRank && <span className="rounded bg-brand-blue/10 px-1.5 py-0.5 text-[9px] font-extrabold text-brand-blue">#{node.fitRank}</span>}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{node.channel}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" aria-label={focusedIds.includes(node.id) ? `Remove ${node.host} from focus queue` : `Add ${node.host} to focus queue`} onClick={(event) => { event.stopPropagation(); toggleFocus(node.id); }} className={`grid h-8 w-8 place-items-center rounded-md border ${focusedIds.includes(node.id) ? "border-brand-orange/35 bg-brand-orange/10 text-brand-orange" : "border-border text-muted"}`}>{focusedIds.includes(node.id) ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}</button>
                <DecisionPill decision={node.reviewDecision} />
              </div>
            </div>
            <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 border-y border-border py-3">
              <ReviewFreshness node={node} />
              <div className="min-w-0 rounded-md bg-background px-3 py-2">
                <div className="text-[9px] font-bold uppercase text-muted">Outreach</div>
                <div className="mt-1 line-clamp-2 text-xs font-extrabold">{node.bestOutreachChannel ? titleCase(node.bestOutreachChannel) : "Needs research"}</div>
                <div className="mt-1 text-[9px] font-bold text-brand-blue">Sol reviewed</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="truncate text-[10px] font-bold uppercase text-muted">{node.category} / {node.region}</span>
              <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedNode(node); }} className="inline-flex h-9 items-center gap-1 rounded-md bg-brand-blue px-3 text-xs font-extrabold text-white hover:bg-[#0c326a]">
                Details<ChevronRight size={14} />
              </button>
            </div>
          </article>
        ))}
        {hasMoreRows && loadState === "ready" && (
          <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="rounded-lg border border-border bg-panel px-4 py-3 text-sm font-bold text-brand-blue">
            Show next {Math.min(PAGE_SIZE, filteredNodes.length - visibleNodes.length)}
          </button>
        )}
      </div>

      <div className="hidden rounded-xl border border-border bg-panel shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-[205px]" />
              <col className="w-[165px]" />
              <col className="w-[70px]" />
              <col className="w-[160px]" />
              <col className="w-[130px]" />
              <col className="w-[165px]" />
              <col className="w-[100px]" />
              <col className="w-[85px]" />
              <col className="w-[100px]" />
            </colgroup>
            <thead className="border-b border-border bg-background text-[10px] font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-4">Host & Channel</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Region</th>
                <th className="px-5 py-4">Media Freshness</th>
                <th className="px-5 py-4">Decision</th>
                <th className="px-5 py-4">Outreach</th>
                <th className="px-5 py-4">Priority</th>
                <th className="px-5 py-4">Audience</th>
                <th className="px-5 py-4 text-right">Actions</th>
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
                      className="prospect-row table-row-hover group relative cursor-pointer hover:bg-black/[0.025] dark:hover:bg-white/[0.035]"
                      onClick={() => setSelectedNode(node)}
                    >
                      <td className="relative px-5 py-4">
                        <button type="button" aria-label={focusedIds.includes(node.id) ? `Remove ${node.host} from focus queue` : `Add ${node.host} to focus queue`} onClick={(event) => { event.stopPropagation(); toggleFocus(node.id); }} className={`absolute right-2 top-3 grid h-7 w-7 place-items-center rounded-md opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 ${focusedIds.includes(node.id) ? "bg-brand-orange/10 text-brand-orange opacity-100" : "text-muted hover:bg-background hover:text-brand-orange"}`}>{focusedIds.includes(node.id) ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}</button>
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
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                          <span>{node.channel || (node.isXOnly ? (node.isPodcastOnly ? "Podcast only" : "X only") : "")}</span>
                          {node.fitRank && <span className="rounded bg-brand-blue/8 px-1.5 py-0.5 text-[9px] font-extrabold text-brand-blue">#{node.fitRank}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="text-xs font-semibold text-foreground/85">{node.category}</div>
                        <div className="text-xs text-muted">{node.subcategory}</div>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-foreground/80">{node.region}</td>
                      <td className="px-5 py-4">
                        <ReviewFreshness node={node} />
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex min-h-[68px] w-[110px] flex-col items-start">
                          <DecisionPill decision={node.reviewDecision} />
                        {!node.reviewDecision && <div className="mt-1.5"><StatusPill status={node.actionabilityStatus} /></div>}
                        <div className="mt-1 w-full text-center text-[10px] font-bold uppercase text-muted">Sol reviewed</div>
                        {node.reviewDecision === "NURTURE" && node.reviewUnresolvedGates && node.reviewUnresolvedGates.length > 0 && (
                          <div className="mt-1 w-full text-center text-[10px] font-bold uppercase text-brand-blue dark:text-blue-300">{node.reviewUnresolvedGates.length} open gates</div>
                        )}
                        </div>
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
                          {(node.fitScore !== undefined || node.calculatedScore !== undefined) && (
                            <span className="rounded-md border border-border bg-background px-2 py-1 text-xs font-bold text-foreground/80">
                              {node.fitScore ?? node.calculatedScore}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-muted">
                        {followers.length ? followers.join(" / ") : "Unknown"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button type="button" onClick={(event) => { event.stopPropagation(); setSelectedNode(node); }} className="inline-flex h-8 items-center gap-1 rounded-md border border-brand-blue/30 px-2.5 text-[11px] font-extrabold text-brand-blue hover:bg-brand-blue/5">
                          Details<ChevronRight size={13} />
                        </button>
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
      </main>

      {commandOpen && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/35 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={() => setCommandOpen(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-panel shadow-2xl" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="DialDash command menu">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3"><Command size={17} className="text-brand-blue" /><div><div className="text-sm font-extrabold">Go to a working view</div><div className="text-[10px] text-muted">Keyboard-first navigation for the prospect queue</div></div><button type="button" onClick={() => setCommandOpen(false)} className="ml-auto rounded p-1 text-muted hover:bg-background"><X size={16} /></button></div>
            <div className="grid gap-1 p-2">
              {[
                { label: "Pursue now", detail: "Evidence-cleared prospects ready for outreach", value: "pursue" },
                { label: "Research next", detail: "Promising records that need one more verification pass", value: "research" },
                { label: "My focus queue", detail: `${focusedIds.length} prospects saved in this workspace`, value: "focus" },
                { label: "Search prospects", detail: "Jump directly to host, show, buyer or organization search", value: "search" },
                { label: "Research and playbook", detail: "Open the methodology pilot and acquisition system", value: "research" },
                { label: "Client portal", detail: "Preview the delivery and feedback experience", value: "portal" },
              ].map((item) => (
                <button key={item.value} type="button" onClick={() => { if (item.value === "focus") setFocusOnly(true); else if (item.value === "search") setTimeout(() => searchInputRef.current?.focus(), 0); else if (item.value === "research") window.location.href = "/pilot"; else if (item.value === "portal") window.location.href = "/portal/demo"; else applyViewPreset(item.value); setCommandOpen(false); }} className="flex items-center gap-3 rounded-md px-3 py-3 text-left hover:bg-brand-blue/5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-background text-brand-blue">{item.value === "focus" ? <BookmarkCheck size={15} /> : item.value === "search" ? <Search size={15} /> : <ChevronRight size={15} />}</span>
                  <span><span className="block text-sm font-extrabold">{item.label}</span><span className="block text-xs text-muted">{item.detail}</span></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
