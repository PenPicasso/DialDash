"use client";

import { ExternalLink, Mail, Podcast, Radio, ShoppingBag, Twitter, Youtube } from "lucide-react";
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

export function ProspectActions({ node }: { node: NodeData }) {
  const actions = prospectActions(node);
  if (!actions.length) return <span className="text-xs text-muted">No verified links</span>;

  return (
    <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
      {actions.map((action, index) => {
        const Icon = action.icon;
        return <a key={`${action.label}-${action.href}`} href={action.href} target="_blank" rel="noreferrer" title={action.detail} className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-extrabold transition-colors ${index === 0 ? "border-brand-blue bg-brand-blue text-white hover:bg-[#0c326a]" : "border-border bg-background text-foreground hover:border-brand-blue hover:text-brand-blue"}`}><Icon size={14} />{action.label}</a>;
      })}
    </div>
  );
}
