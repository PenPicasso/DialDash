"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Download,
  ExternalLink,
  FileSearch,
  FlaskConical,
  Mail,
  Podcast,
  Search,
  ShieldCheck,
  XCircle,
  Youtube,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  PilotCohort,
  PilotDecision,
  PilotEvidence,
  PilotPayload,
  PilotReport,
} from "@/lib/pilotTypes";

type View = "review" | "method" | "playbook";
type ReviewState = "UNREVIEWED" | "APPROVED" | "NEEDS_CORRECTION" | "NEEDS_RESEARCH";
type Feedback = { status: ReviewState; note: string; updatedAt: string };
type FeedbackById = Record<string, Feedback>;

const STORAGE_KEY = "dialdash:pilot-feedback:v1";

const decisionMeta: Record<PilotDecision, { label: string; className: string; dot: string }> = {
  PURSUE_NOW: {
    label: "Pursue now",
    className: "border-brand-orange/30 bg-brand-orange/10 text-[#c65e00]",
    dot: "bg-brand-orange",
  },
  NURTURE: {
    label: "Nurture",
    className: "border-brand-blue/25 bg-brand-blue/10 text-brand-blue",
    dot: "bg-brand-blue",
  },
  DISQUALIFIED: {
    label: "Disqualified",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
  },
};

const cohortLabels: Record<PilotCohort, string> = {
  CURRENT_READY: "Current READY audit",
  RECOVERY_REVIEW: "Rejected recovery",
  NEW_SOURCE: "New source",
};

const reviewOptions: Array<{ value: ReviewState; label: string }> = [
  { value: "UNREVIEWED", label: "Unreviewed" },
  { value: "APPROVED", label: "Looks right" },
  { value: "NEEDS_CORRECTION", label: "Something is wrong" },
  { value: "NEEDS_RESEARCH", label: "Needs more research" },
];

const scoreRows = [
  { key: "contentSupply", label: "Content supply", max: 20 },
  { key: "distributionGap", label: "Distribution gap", max: 25 },
  { key: "commercialOffer", label: "Commercial offer", max: 20 },
  { key: "audienceLeverage", label: "Audience leverage", max: 15 },
  { key: "reachability", label: "Reachability", max: 10 },
  { key: "visualFit", label: "Visual fit", max: 10 },
] as const;

function formatNumber(value: number | null) {
  if (value === null) return "Not verified";
  return new Intl.NumberFormat("en", { notation: value >= 10_000 ? "compact" : "standard" }).format(value);
}

function formatAuditDate(dateValue: string, asOfDate: string) {
  const date = new Date(`${dateValue}T12:00:00Z`);
  const asOf = new Date(`${asOfDate}T00:00:00Z`);
  const days = Math.max(0, Math.floor((asOf.getTime() - date.getTime()) / 86_400_000));
  const relative = days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days}d ago`;
  const absolute = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
  return `${relative} - ${absolute}`;
}

function evidenceMap(report: PilotReport) {
  return new Map(report.evidence.map((item) => [item.id, item]));
}

function EvidenceRefs({ ids, report }: { ids: string[]; report: PilotReport }) {
  const byId = evidenceMap(report);
  return (
    <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
      {ids.map((id) => {
        const item = byId.get(id);
        if (!item) return null;
        return (
          <a
            key={id}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            title={`${item.label}: ${item.claim}`}
            className="inline-flex h-5 items-center gap-0.5 rounded border border-brand-blue/20 bg-brand-blue/5 px-1.5 text-[10px] font-bold text-brand-blue hover:border-brand-blue/50"
          >
            {id.replace(/^[^-]+-/, "")}
            <ExternalLink size={9} />
          </a>
        );
      })}
    </span>
  );
}

function DecisionBadge({ decision }: { decision: PilotDecision }) {
  const meta = decisionMeta[decision];
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold ${meta.className}`}>{meta.label}</span>;
}

function GateIcon({ status }: { status: "PASS" | "FAIL" | "CAUTION" }) {
  if (status === "PASS") return <CheckCircle2 size={17} className="text-emerald-600" />;
  if (status === "FAIL") return <XCircle size={17} className="text-rose-600" />;
  return <AlertTriangle size={17} className="text-amber-600" />;
}

function SectionHeading({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="mb-4">
      {eyebrow && <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-blue">{eyebrow}</div>}
      <h3 className="text-lg font-extrabold text-zinc-950">{title}</h3>
    </div>
  );
}

function ReviewControl({
  report,
  feedback,
  onChange,
}: {
  report: PilotReport;
  feedback: Feedback | undefined;
  onChange: (feedback: Feedback) => void;
}) {
  const current = feedback || { status: "UNREVIEWED" as ReviewState, note: "", updatedAt: "" };
  const update = (changes: Partial<Feedback>) => onChange({ ...current, ...changes, updatedAt: new Date().toISOString() });

  return (
    <div className="grid gap-3 border-y border-zinc-200 bg-zinc-50 px-5 py-4 sm:grid-cols-[190px_minmax(0,1fr)] lg:px-7">
      <label className="space-y-1.5">
        <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-500">Your verdict</span>
        <select
          value={current.status}
          onChange={(event) => update({ status: event.target.value as ReviewState })}
          className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 pr-9 text-sm font-bold text-zinc-900 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
        >
          {reviewOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className="space-y-1.5">
        <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-500">What should change?</span>
        <input
          value={current.note}
          onChange={(event) => update({ note: event.target.value })}
          placeholder={`Add a correction or question about ${report.person}`}
          className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
        />
      </label>
    </div>
  );
}

function Queue({
  reports,
  selectedId,
  feedback,
  onSelect,
}: {
  reports: PilotReport[];
  selectedId: string;
  feedback: FeedbackById;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="divide-y divide-zinc-200">
      {reports.map((report) => {
        const selected = report.id === selectedId;
        const reviewState = feedback[report.id]?.status;
        return (
          <button
            type="button"
            key={report.id}
            onClick={() => onSelect(report.id)}
            className={`group grid w-full grid-cols-[30px_minmax(0,1fr)_auto] items-start gap-2 px-3 py-3 text-left transition-colors ${selected ? "bg-brand-blue/[0.07]" : "hover:bg-zinc-50"}`}
          >
            <span className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-md text-xs font-black ${selected ? "bg-brand-blue text-white" : "bg-zinc-100 text-zinc-600"}`}>{report.rank}</span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 truncate text-sm font-extrabold text-zinc-950">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${decisionMeta[report.decision].dot}`} />
                {report.person}
              </span>
              <span className="mt-0.5 block truncate text-xs text-zinc-500">{report.organization}</span>
              {reviewState && reviewState !== "UNREVIEWED" && (
                <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                  {reviewState === "APPROVED" ? <Check size={11} className="text-emerald-600" /> : <CircleDot size={11} className="text-amber-600" />}
                  {reviewOptions.find((option) => option.value === reviewState)?.label}
                </span>
              )}
            </span>
            <span className="flex items-center gap-1 text-sm font-black text-zinc-700">
              {report.score.total}
              <ChevronRight size={14} className={`transition-transform ${selected ? "text-brand-blue" : "text-zinc-300 group-hover:translate-x-0.5"}`} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ProspectReport({
  report,
  asOfDate,
  feedback,
  onFeedback,
}: {
  report: PilotReport;
  asOfDate: string;
  feedback: Feedback | undefined;
  onFeedback: (feedback: Feedback) => void;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="px-5 py-6 lg:px-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <DecisionBadge decision={report.decision} />
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-bold text-zinc-600">Rank {report.rank} of 15</span>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-bold text-zinc-600">{cohortLabels[report.cohort]}</span>
            </div>
            <h2 className="text-3xl font-black text-zinc-950">{report.person}</h2>
            <p className="mt-1 text-sm font-bold text-brand-blue">{report.organization}</p>
            <p className="mt-1 text-sm text-zinc-500">{report.role}</p>
            <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-700">{report.summary}</p>
          </div>
          <div className="grid min-w-[210px] grid-cols-2 gap-px overflow-hidden rounded-md border border-zinc-200 bg-zinc-200 text-center">
            <div className="bg-white px-4 py-4">
              <div className="text-3xl font-black text-brand-orange">{report.score.total}</div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Fit score</div>
            </div>
            <div className="bg-white px-4 py-4">
              <div className="text-3xl font-black text-brand-blue">{report.confidence}%</div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Confidence</div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-3 rounded-md border-l-4 border-brand-blue bg-brand-blue/[0.06] px-4 py-3">
          <FileSearch size={19} className="mt-0.5 shrink-0 text-brand-blue" />
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-brand-blue">What the old method missed</div>
            <p className="mt-1 text-sm leading-6 text-zinc-700">{report.methodNote}</p>
          </div>
        </div>
      </div>

      <ReviewControl report={report} feedback={feedback} onChange={onFeedback} />

      <section className="grid gap-8 border-b border-zinc-200 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-7">
        <div>
          <SectionHeading eyebrow="Decision audit" title="Hard gates" />
          <div className="divide-y divide-zinc-200 border-y border-zinc-200">
            {report.gates.map((gate) => (
              <div key={gate.gate} className="grid gap-2 py-3 sm:grid-cols-[170px_minmax(0,1fr)]">
                <div className="flex items-center gap-2 text-sm font-extrabold text-zinc-900"><GateIcon status={gate.status} />{gate.gate}</div>
                <p className="text-sm leading-6 text-zinc-600">{gate.explanation}<EvidenceRefs ids={gate.evidenceIds} report={report} /></p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionHeading eyebrow="Rank only after gates" title="Score breakdown" />
          <div className="space-y-4">
            {scoreRows.map((row) => {
              const value = report.score[row.key];
              return (
                <div key={row.key}>
                  <div className="mb-1.5 flex justify-between text-xs"><span className="font-bold text-zinc-600">{row.label}</span><span className="font-black text-zinc-900">{value}/{row.max}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full bg-brand-blue" style={{ width: `${(value / row.max) * 100}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200 px-5 py-6 lg:px-7">
        <SectionHeading eyebrow="Freshness and distribution" title="What is actually current" />
        <div className="grid gap-px overflow-hidden rounded-md border border-zinc-200 bg-zinc-200 md:grid-cols-2">
          <div className="bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-brand-blue"><Podcast size={16} />Long form</div>
            <div className="mt-3 text-base font-extrabold text-zinc-950">{report.freshness.latestTitle}</div>
            <div className="mt-1 text-sm font-bold text-brand-orange">{formatAuditDate(report.freshness.latestDate, asOfDate)}</div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{report.freshness.cadence}<EvidenceRefs ids={report.freshness.evidenceIds} report={report} /></p>
          </div>
          <div className="bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-brand-blue"><Youtube size={16} />Owned video</div>
            <div className="mt-3 text-base font-extrabold text-zinc-950">{report.video.ownedChannel}</div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold text-zinc-700">
              <span>{formatNumber(report.video.subscribers)} subscribers</span>
              <span>{report.video.shortCountLast30 ?? "?"} shorts / latest 30</span>
              <span>{report.video.shortCountLast30Days ?? "?"} in 30 days</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{report.video.qualityObservation}<EvidenceRefs ids={report.video.evidenceIds} report={report} /></p>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200 px-5 py-6 lg:px-7">
        <SectionHeading eyebrow="Commercial reality" title="The offer and the buyer" />
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Actual offer</div>
            <div className="mt-1 text-base font-extrabold text-zinc-950">{report.actualOffer.type}</div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{report.actualOffer.description}<EvidenceRefs ids={report.actualOffer.evidenceIds} report={report} /></p>
          </div>
          <dl className="grid grid-cols-[120px_minmax(0,1fr)] content-start gap-x-3 gap-y-3 text-sm">
            <dt className="font-bold text-zinc-500">Economic buyer</dt><dd className="font-semibold text-zinc-900">{report.economicBuyer}</dd>
            <dt className="font-bold text-zinc-500">Content owner</dt><dd className="font-semibold text-zinc-900">{report.contentOwner}</dd>
            <dt className="font-bold text-zinc-500">Best channel</dt><dd className="font-semibold text-zinc-900">{report.outreach.primaryChannel}</dd>
          </dl>
        </div>
      </section>

      <section className="border-b border-zinc-200 px-5 py-6 lg:px-7">
        <SectionHeading eyebrow="Current vs proposed" title="Funnel diagnosis" />
        <div className="overflow-x-auto rounded-md border border-zinc-200">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-[90px_1fr_1fr_1fr] border-b border-zinc-200 bg-zinc-50 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
              <div className="p-3">Stage</div><div className="p-3">Observed now</div><div className="p-3">Conversion gap</div><div className="p-3">Energy Dial system</div>
            </div>
            {report.funnel.map((stage) => (
              <div key={stage.stage} className="grid grid-cols-[90px_1fr_1fr_1fr] border-b border-zinc-200 last:border-b-0">
                <div className="border-r border-zinc-200 p-3"><div className="text-lg font-black text-brand-blue">{stage.stage}</div><div className="text-xs font-bold text-zinc-500">{stage.label}</div></div>
                <div className="border-r border-zinc-200 p-3"><ul className="space-y-1.5 text-sm text-zinc-700">{stage.observed.map((item) => <li key={item} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-400" />{item}</li>)}</ul></div>
                <div className="border-r border-zinc-200 bg-amber-50/40 p-3 text-sm leading-6 text-zinc-700">{stage.gap}<EvidenceRefs ids={stage.evidenceIds} report={report} /></div>
                <div className="bg-brand-blue/[0.035] p-3"><ul className="space-y-1.5 text-sm text-zinc-700">{stage.proposed.map((item) => <li key={item} className="flex gap-2"><Check size={14} className="mt-1 shrink-0 text-brand-blue" />{item}</li>)}</ul></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-8 border-b border-zinc-200 px-5 py-6 md:grid-cols-2 lg:px-7">
        <div>
          <SectionHeading title="Why they may buy" />
          <ul className="space-y-2">{report.whyTheyMayBuy.map((item) => <li key={item} className="flex gap-2 text-sm leading-6 text-zinc-700"><CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-600" />{item}</li>)}</ul>
        </div>
        <div>
          <SectionHeading title="Why they may not" />
          <ul className="space-y-2">{report.whyTheyMayNotBuy.map((item) => <li key={item} className="flex gap-2 text-sm leading-6 text-zinc-700"><AlertTriangle size={16} className="mt-1 shrink-0 text-amber-600" />{item}</li>)}</ul>
        </div>
      </section>

      <section className="border-b border-zinc-200 px-5 py-6 lg:px-7">
        <SectionHeading eyebrow="Private proof, never public first" title="Sample brief" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <a href={report.sample.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-base font-extrabold text-brand-blue hover:underline">{report.sample.sourceTitle}<ExternalLink size={14} /></a>
            <div className="mt-1 text-xs font-bold text-zinc-500">{formatAuditDate(report.sample.sourceDate, asOfDate)}</div>
            <p className="mt-3 text-sm leading-6 text-zinc-700">{report.sample.angle}</p>
            {report.sample.caveat && <p className="mt-3 border-l-2 border-brand-orange pl-3 text-sm font-semibold leading-6 text-zinc-700">{report.sample.caveat}</p>}
          </div>
          <ol className="space-y-2">{report.sample.visualPlan.map((item, index) => <li key={item} className="grid grid-cols-[22px_1fr] gap-2 text-sm leading-6 text-zinc-700"><span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded bg-brand-orange/10 text-[10px] font-black text-[#c65e00]">{index + 1}</span>{item}</li>)}</ol>
        </div>
      </section>

      <section className="border-b border-zinc-200 px-5 py-6 lg:px-7">
        <SectionHeading eyebrow="Close path" title="Outreach sequence" />
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div>
            <div className="flex items-center gap-2 text-sm font-extrabold text-zinc-950"><Mail size={16} className="text-brand-blue" />{report.outreach.primaryChannel}</div>
            <div className="mt-2 break-words text-sm text-zinc-600">{report.outreach.publicContact}</div>
            <div className="mt-3 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">{report.outreach.contactConfidence.replace(/_/g, " ")}</div>
            <ol className="mt-4 space-y-2">{report.outreach.sequence.map((item, index) => <li key={item} className="grid grid-cols-[20px_1fr] gap-2 text-sm leading-6 text-zinc-700"><span className="font-black text-brand-orange">{index + 1}.</span>{item}</li>)}</ol>
          </div>
          <div className="grid gap-3">
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4"><div className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-brand-blue">DM draft</div><p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">{report.outreach.dm}</p></div>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4"><div className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-brand-blue">Email follow-up</div><p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">{report.outreach.emailFollowUp}</p></div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_330px] lg:px-7">
        <div>
          <SectionHeading eyebrow="Claim ledger" title={`Evidence (${report.evidence.length})`} />
          <div className="grid gap-2 sm:grid-cols-2">
            {report.evidence.map((item: PilotEvidence) => (
              <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="group rounded-md border border-zinc-200 p-3 hover:border-brand-blue/40 hover:bg-brand-blue/[0.025]">
                <div className="flex items-start justify-between gap-2"><span className="text-sm font-extrabold text-zinc-950">{item.label}</span><ExternalLink size={13} className="mt-0.5 shrink-0 text-zinc-400 group-hover:text-brand-blue" /></div>
                <div className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-brand-blue">{item.sourceType.replace(/_/g, " ")}</div>
                <p className="mt-2 text-xs leading-5 text-zinc-600">{item.claim}</p>
              </a>
            ))}
          </div>
        </div>
        <div>
          <SectionHeading eyebrow="Matched pass" title="Firecrawl result" />
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center justify-between gap-3"><span className="text-sm font-extrabold text-zinc-950">{report.firecrawl.sourceStatus}</span><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase ${report.firecrawl.decisionChanged ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{report.firecrawl.decisionChanged ? "Changed" : "No change"}</span></div>
            {report.firecrawl.addedEvidence.length > 0 && <p className="mt-3 text-xs leading-5 text-zinc-600">Added: {report.firecrawl.addedEvidence.join(", ")}.</p>}
            <p className="mt-3 text-sm leading-6 text-zinc-700">{report.firecrawl.conclusion}</p>
          </div>
        </div>
      </section>
    </article>
  );
}

function MethodView({ payload }: { payload: PilotPayload }) {
  const scoreItems = ["Content supply: 20", "Distribution gap: 25", "Commercial offer: 20", "Audience leverage: 15", "Reachability: 10", "Educational visual fit: 10"];
  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-5 py-7 lg:px-8"><div className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-blue">Methodology 2.0</div><h2 className="mt-2 text-3xl font-black text-zinc-950">A prospect is a sales decision, not a populated row</h2><p className="mt-3 max-w-3xl text-base leading-7 text-zinc-600">The pilot tests whether Energy Dial can find a recent source, the real buyer, a public contact, a measurable video gap, and a real transaction. Scores rank survivors; they never override failed gates.</p></div>
      <section className="grid gap-8 border-b border-zinc-200 px-5 py-7 lg:grid-cols-2 lg:px-8">
        <div><SectionHeading title="Six hard gates" /><ol className="space-y-3">{["Owned English long-form source", "Latest owned episode within 90 days, adjusted for cadence slowdown", "Named content owner and plausible economic buyer", "Verified public contact path; no guessed email", "Observed commercial offer", "Meaningful distribution or educational-quality gap, with no corporate-monolith failure"].map((item, index) => <li key={item} className="grid grid-cols-[28px_1fr] gap-3 text-sm leading-6 text-zinc-700"><span className="flex h-6 w-6 items-center justify-center rounded bg-brand-blue/10 text-xs font-black text-brand-blue">{index + 1}</span>{item}</li>)}</ol></div>
        <div><SectionHeading title="Score after survival" /><div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-zinc-200 bg-zinc-200">{scoreItems.map((item) => <div key={item} className="bg-white p-3 text-sm font-bold text-zinc-700">{item}</div>)}</div><p className="mt-4 text-sm leading-6 text-zinc-600">Evidence confidence remains separate. A high numerical score with missing identity, contact, cadence, or offer evidence is not actionable.</p></div>
      </section>
      <section className="border-b border-zinc-200 px-5 py-7 lg:px-8"><SectionHeading eyebrow="Matched experiment" title="What Firecrawl actually changed" /><div className="grid gap-px overflow-hidden rounded-md border border-zinc-200 bg-zinc-200 sm:grid-cols-4 lg:grid-cols-7">{[
        [payload.experiment.deterministicSecondsCold, "Cold deterministic"], [payload.experiment.deterministicSecondsCached, "Cached deterministic"], [payload.experiment.firecrawlSeconds, "Firecrawl pass"], [payload.experiment.firecrawlValidPages, "Valid pages"], [payload.experiment.firecrawlMeaningfulContactAdds, "Contact adds"], [payload.experiment.firecrawlDecisionChanges, "Decision changes"], [payload.experiment.productionRowsChanged, "Production writes"],
      ].map(([value, label]) => <div key={label} className="bg-white p-4 text-center"><div className="text-2xl font-black text-brand-blue">{value}</div><div className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">{label}{String(label).includes("deterministic") || label === "Firecrawl pass" ? " (s)" : ""}</div></div>)}</div><p className="mt-4 max-w-4xl text-sm leading-6 text-zinc-600">Firecrawl returned more raw links, but only one materially useful contact set and no decision change. It is now an escalation tool for blocked high-value records, not the default discovery layer. A branded 404 is rejected using the source page status.</p></section>
      <section className="grid gap-8 px-5 py-7 lg:grid-cols-2 lg:px-8"><div><SectionHeading title="Recency and cadence" /><dl className="space-y-3 text-sm"><div className="grid grid-cols-[110px_1fr] gap-3"><dt className="font-extrabold text-emerald-700">Active</dt><dd className="text-zinc-600">0-30 days since the latest owned episode.</dd></div><div className="grid grid-cols-[110px_1fr] gap-3"><dt className="font-extrabold text-amber-700">Semi-active</dt><dd className="text-zinc-600">31-90 days, or a material slowdown versus historical cadence.</dd></div><div className="grid grid-cols-[110px_1fr] gap-3"><dt className="font-extrabold text-rose-700">Inactive</dt><dd className="text-zinc-600">More than 90 days. Hard fail for this initial motion.</dd></div></dl></div><div><SectionHeading title="Pilot acceptance" /><ul className="space-y-2 text-sm leading-6 text-zinc-700">{["At least 12 of 15 survive manual spot-checking", "Every displayed claim links to evidence", "No future or platform-ambiguous latest date", "No invented contact", "Every pursue-now lead has recent content and an observed offer", "Production data remains unchanged"].map((item) => <li key={item} className="flex gap-2"><ShieldCheck size={16} className="mt-1 shrink-0 text-brand-blue" />{item}</li>)}</ul></div></section>
    </div>
  );
}

function PlaybookView() {
  const packages = [
    ["Weekly", "4 educational clips", "$997", "4 source hours"],
    ["Twice weekly", "8 educational clips", "$1,850", "8 source hours"],
    ["Weekday daily", "20 educational clips", "$3,750", "16 source hours"],
  ];
  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-5 py-7 lg:px-8"><div className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-blue">First-client playbook</div><h2 className="mt-2 text-3xl font-black text-zinc-950">Sell technical judgment, not editing volume</h2><p className="mt-3 max-w-4xl text-base leading-7 text-zinc-600">Energy Dial preserves the expert&apos;s words and makes the idea easier to understand with relevant maps, labels, persistent numbers, diagrams, and restrained motion. Petroleum-engineering judgment is the reason the clip selection and visuals stay credible.</p></div>
      <section className="border-b border-zinc-200 px-5 py-7 lg:px-8"><SectionHeading title="Founding pricing" /><div className="overflow-x-auto rounded-md border border-zinc-200"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-zinc-50 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500"><tr><th className="p-3">Package</th><th className="p-3">Monthly output</th><th className="p-3">Founding price</th><th className="p-3">Source review included</th></tr></thead><tbody className="divide-y divide-zinc-200">{packages.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={cell} className={`p-3 ${index === 2 ? "font-black text-brand-orange" : index === 0 ? "font-extrabold text-zinc-950" : "text-zinc-700"}`}>{cell}</td>)}</tr>)}</tbody></table></div><p className="mt-3 text-sm leading-6 text-zinc-600">Charge $150 per source hour above the included allowance. This prices the real labor difference between a 20-minute and a 90-minute source without making the package difficult to understand.</p></section>
      <section className="grid gap-8 border-b border-zinc-200 px-5 py-7 lg:grid-cols-2 lg:px-8"><div><SectionHeading title="Close the $997 package" /><ol className="space-y-3">{["Make one private 20-45 second sample from a recent episode.", "DM one specific observation, the private link, and the three-clip free trial.", "If interest is positive, confirm platform, approval owner, and posting workflow.", "Close asynchronously with a one-page scope and payment link; offer a 15-minute call but do not force it.", "If the DM is ignored, send one email 2-3 business days later using the same sample."].map((item, index) => <li key={item} className="grid grid-cols-[24px_1fr] gap-2 text-sm leading-6 text-zinc-700"><span className="font-black text-brand-orange">{index + 1}.</span>{item}</li>)}</ol></div><div><SectionHeading title="Protect the premium" /><ul className="space-y-3 text-sm leading-6 text-zinc-700"><li className="flex gap-2"><XCircle size={16} className="mt-1 shrink-0 text-rose-600" />Do not post and tag a speculative sample before permission.</li><li className="flex gap-2"><XCircle size={16} className="mt-1 shrink-0 text-rose-600" />Do not recommend publishing the raw cut beside the finished edit.</li><li className="flex gap-2"><CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-600" />Deliver the raw/select cut privately as a client asset when useful.</li><li className="flex gap-2"><CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-600" />Use a call for the $8,000 package because scope and approval risk are larger.</li></ul></div></section>
      <section className="grid gap-8 px-5 py-7 lg:grid-cols-[1fr_1fr] lg:px-8"><div><SectionHeading title="$8,000 long-form starting scope" /><p className="text-sm leading-6 text-zinc-700">Four long-form edits per month, up to 90 delivered minutes each, four thumbnails, 48-hour turnaround after asset receipt, and a defined revision limit. Derivative shorts must be explicitly included or sold separately.</p></div><div><SectionHeading title="Posting reality" /><p className="text-sm leading-6 text-zinc-700">Four clips per month cannot support a daily-posting promise. Recommend weekly posting for the $997 package, twice weekly for the eight-clip package, and weekday daily only for the 20-clip package. The finished edit is the public product; the raw cut is a private asset.</p></div></section>
    </div>
  );
}

export function PilotWorkspace({ payload }: { payload: PilotPayload }) {
  const [view, setView] = useState<View>("review");
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("");
  const [cohortFilter, setCohortFilter] = useState("");
  const [feedback, setFeedback] = useState<FeedbackById>({});
  const [feedbackLoaded, setFeedbackLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setFeedback(JSON.parse(saved) as FeedbackById);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setFeedbackLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (feedbackLoaded) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(feedback));
  }, [feedback, feedbackLoaded]);

  const reports = useMemo(() => [...(payload?.reports || [])].sort((a, b) => a.rank - b.rank), [payload]);
  const filteredReports = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return reports.filter((report) => {
      const searchMatch = !normalized || [report.person, report.organization, report.role].some((value) => value.toLowerCase().includes(normalized));
      return searchMatch && (!decisionFilter || report.decision === decisionFilter) && (!cohortFilter || report.cohort === cohortFilter);
    });
  }, [cohortFilter, decisionFilter, query, reports]);
  const selectedReport = filteredReports.find((report) => report.id === selectedId) || filteredReports[0];

  const counts = useMemo(() => ({
    pursue: reports.filter((report) => report.decision === "PURSUE_NOW").length,
    nurture: reports.filter((report) => report.decision === "NURTURE").length,
    disqualified: reports.filter((report) => report.decision === "DISQUALIFIED").length,
    reviewed: reports.filter((report) => feedback[report.id]?.status && feedback[report.id].status !== "UNREVIEWED").length,
  }), [feedback, reports]);

  function updateFeedback(id: string, value: Feedback) {
    setFeedback((current) => ({ ...current, [id]: value }));
  }

  function exportFeedback() {
    if (!payload) return;
    const exportValue = { pilotId: payload.id, asOfDate: payload.asOfDate, exportedAt: new Date().toISOString(), feedback };
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportValue, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dialdash-pilot-feedback-${payload.asOfDate}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-extrabold text-brand-blue hover:underline"><ArrowLeft size={13} />Prospect database</Link>
            <div className="mt-3 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-orange text-sm font-black text-white">15</div><div><h1 className="text-2xl font-black">Decision pilot</h1><p className="mt-0.5 text-sm text-zinc-500">Evidence audit, funnel design, and first-client playbook - production untouched</p></div></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-1" aria-label="Pilot views">
              {(["review", "method", "playbook"] as View[]).map((item) => <button key={item} type="button" onClick={() => setView(item)} className={`rounded px-3 py-2 text-sm font-extrabold capitalize transition-colors ${view === item ? "bg-white text-brand-blue shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}>{item}</button>)}
            </nav>
            <button type="button" onClick={exportFeedback} title="Download review notes as JSON" className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-extrabold text-zinc-700 hover:border-brand-blue hover:text-brand-blue"><Download size={15} />Feedback</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-4 py-5 sm:px-6 lg:px-8">
        <section className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 sm:grid-cols-3 xl:grid-cols-6">
          {[
            [counts.pursue, "Pursue now", "text-brand-orange"],
            [counts.nurture, "Nurture", "text-brand-blue"],
            [counts.disqualified, "Disqualified", "text-rose-600"],
            [counts.reviewed, "You reviewed", "text-zinc-950"],
            [payload.experiment.firecrawlDecisionChanges, "Firecrawl changes", "text-zinc-950"],
            [payload.experiment.productionRowsChanged, "Production writes", "text-emerald-700"],
          ].map(([value, label, tone]) => <div key={label} className="bg-white px-4 py-3"><div className={`text-2xl font-black ${tone}`}>{value}</div><div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">{label}</div></div>)}
        </section>

        {view === "method" && <MethodView payload={payload} />}
        {view === "playbook" && <PlaybookView />}
        {view === "review" && (
          <div className="grid items-start gap-4 lg:grid-cols-[310px_minmax(0,1fr)]">
            <aside className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]">
              <div className="border-b border-zinc-200 p-3">
                <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-blue" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search 15 prospects" className="h-10 w-full rounded-md border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none placeholder:text-zinc-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10" /></div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <select value={decisionFilter} onChange={(event) => setDecisionFilter(event.target.value)} aria-label="Filter by decision" className="h-9 min-w-0 rounded-md border border-zinc-300 bg-white px-2 pr-8 text-xs font-bold text-zinc-700 outline-none focus:border-brand-blue"><option value="">All decisions</option><option value="PURSUE_NOW">Pursue now</option><option value="NURTURE">Nurture</option><option value="DISQUALIFIED">Disqualified</option></select>
                  <select value={cohortFilter} onChange={(event) => setCohortFilter(event.target.value)} aria-label="Filter by cohort" className="h-9 min-w-0 rounded-md border border-zinc-300 bg-white px-2 pr-8 text-xs font-bold text-zinc-700 outline-none focus:border-brand-blue"><option value="">All cohorts</option><option value="CURRENT_READY">Current ready</option><option value="RECOVERY_REVIEW">Recovery</option><option value="NEW_SOURCE">New</option></select>
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500"><span>{filteredReports.length} prospects</span><span>Score</span></div>
              <div className="max-h-[420px] overflow-y-auto lg:max-h-[calc(100vh-170px)]">{filteredReports.length > 0 ? <Queue reports={filteredReports} selectedId={selectedReport?.id || ""} feedback={feedback} onSelect={setSelectedId} /> : <div className="p-6 text-center text-sm text-zinc-500">No prospects match these filters.</div>}</div>
            </aside>
            {selectedReport ? <ProspectReport report={selectedReport} asOfDate={payload.asOfDate} feedback={feedback[selectedReport.id]} onFeedback={(value) => updateFeedback(selectedReport.id, value)} /> : <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-zinc-500">Choose a prospect to open the report.</div>}
          </div>
        )}

        <footer className="mt-6 flex flex-col gap-2 border-t border-zinc-200 py-5 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between"><span>Audit date {payload.asOfDate} - methodology {payload.methodologyVersion} - local feedback autosaves in this browser</span><span className="inline-flex items-center gap-1.5"><FlaskConical size={13} />15 records only; no production promotion</span></footer>
      </main>
    </div>
  );
}
