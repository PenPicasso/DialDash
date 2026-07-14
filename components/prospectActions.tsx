"use client";

import { ChevronDown, ExternalLink, Mail, Podcast, Radio, ShoppingBag, Twitter, Youtube } from "lucide-react";
import { primaryMedia } from "@/lib/freshness";
import type { NodeData } from "@/lib/types";

type Action = { label: string; href: string; icon: typeof ExternalLink; detail: string };

function prospectActions(node: NodeData) {
  const latest = primaryMedia(node);
  const actions: Action[] = [];
  if (latest?.href) actions.push({ label: "Latest episode", href: latest.href, icon: ExternalLink, detail: latest.title || latest.label });
  if (node.youtubeUrl && !node.isXOnly) actions.push({ label: "YouTube channel", href: node.youtubeUrl, icon: Youtube, detail: "Owned video channel" });
  if (node.podcastAppleUrl) actions.push({ label: "Apple Podcasts", href: node.podcastAppleUrl, icon: Podcast, detail: "Podcast page" });
  if (node.rssUrl) actions.push({ label: "RSS feed", href: node.rssUrl, icon: Radio, detail: "Source feed" });
  if (node.xProfile) actions.push({ label: "X profile", href: node.xProfile, icon: Twitter, detail: "Public outreach/profile" });
  if (node.offerUrl) actions.push({ label: "Verified offer", href: node.offerUrl, icon: ShoppingBag, detail: node.bofOffer || "Commercial offer" });
  if (node.email) actions.push({ label: "Email", href: `mailto:${node.email}`, icon: Mail, detail: node.email });
  if (node.contactUrl) actions.push({ label: "Contact", href: node.contactUrl, icon: Mail, detail: "Verified public contact path" });
  if (node.sourceEvidenceUrl && !actions.some((action) => action.href === node.sourceEvidenceUrl)) actions.push({ label: "Source evidence", href: node.sourceEvidenceUrl, icon: ExternalLink, detail: "Research evidence" });
  return actions;
}

export function ProspectActions({ node, compact = false }: { node: NodeData; compact?: boolean }) {
  const actions = prospectActions(node);
  const primary = actions[0];
  if (!primary) return <span className="text-xs text-muted">No verified links</span>;
  const PrimaryIcon = primary.icon;

  return (
    <div className="inline-flex items-stretch" onClick={(event) => event.stopPropagation()}>
      <a href={primary.href} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1.5 rounded-l-md border border-brand-blue bg-brand-blue px-2.5 font-bold text-white transition-colors hover:bg-[#0c326a] ${compact ? "h-8 text-[11px]" : "h-9 text-xs"}`} title={primary.detail}>
        <PrimaryIcon size={14} />{compact ? "Open" : primary.label}
      </a>
      {actions.length > 1 && (
        <details className="group/actions relative">
          <summary className={`flex cursor-pointer list-none items-center rounded-r-md border border-l-0 border-brand-blue bg-brand-blue px-2 text-white transition-colors hover:bg-[#0c326a] [&::-webkit-details-marker]:hidden ${compact ? "h-8" : "h-9"}`} aria-label="More prospect links"><ChevronDown size={14} className="transition-transform group-open/actions:rotate-180" /></summary>
          <div className="absolute right-0 top-[calc(100%+6px)] z-40 w-64 overflow-hidden rounded-lg border border-border bg-panel p-1.5 text-left shadow-xl">
            {actions.slice(1).map((action) => {
              const Icon = action.icon;
              return <a key={`${action.label}-${action.href}`} href={action.href} target="_blank" rel="noreferrer" className="flex items-start gap-2.5 rounded-md px-3 py-2.5 hover:bg-brand-blue/5"><Icon size={15} className="mt-0.5 shrink-0 text-brand-blue" /><span className="min-w-0"><span className="block text-xs font-extrabold text-foreground">{action.label}</span><span className="mt-0.5 block truncate text-[10px] text-muted" title={action.detail}>{action.detail}</span></span></a>;
            })}
          </div>
        </details>
      )}
    </div>
  );
}
