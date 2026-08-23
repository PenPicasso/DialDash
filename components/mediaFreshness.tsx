"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";
import { formatAbsoluteDate, formatRelativeDate, mediaChannels, primaryMedia } from "@/lib/freshness";
import type { NodeData } from "@/lib/types";

function statusText(status?: NodeData["youtubeFreshnessStatus"], hasDate?: boolean) {
  if (status === "ERROR") return "Refresh failed";
  if (status === "STALE") return "Older than 90d";
  if (status === "CURRENT") return "Verified";
  if (status === "MISSING") return "No channel";
  return hasDate ? "Verified previously" : "Needs check";
}

export function MediaFreshness({ node, expanded = false }: { node: NodeData; expanded?: boolean }) {
  const channels = mediaChannels(node);
  const primary = primaryMedia(node);
  const hasRefreshError = channels.some((channel) => channel.status === "ERROR");

  if (expanded) {
    return (
      <div className="grid gap-2">
        {channels.map((channel) => (
          <div key={channel.key} className="grid grid-cols-[90px_minmax(0,1fr)] gap-3 rounded-md border border-border bg-background p-3 text-xs">
            <div className="font-bold text-foreground">{channel.label}</div>
            <div className="min-w-0 text-right">
              {channel.href ? (
                <a href={channel.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-brand-blue hover:underline">
                  {channel.date ? formatRelativeDate(channel.date) : "Open source"}<ExternalLink size={11} />
                </a>
              ) : (
                <span className="font-bold text-muted">Needs check</span>
              )}
              {channel.date && <div className="mt-0.5 text-[10px] text-muted">{formatAbsoluteDate(channel.date)}</div>}
              {channel.title && <div className="mt-1 truncate text-[11px] text-foreground/75" title={channel.title}>{channel.title}</div>}
              <div className={`mt-1 text-[9px] font-bold uppercase ${channel.status === "ERROR" ? "text-amber-600" : "text-muted"}`}>
                {statusText(channel.status, Boolean(channel.date))}
                {channel.checkedAt ? ` / checked ${formatRelativeDate(channel.checkedAt)}` : ""}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="group/fresh relative inline-block min-w-[146px]" onClick={(event) => event.stopPropagation()}>
      <div className={`rounded-md border bg-background px-3 py-2 transition-shadow group-hover/fresh:shadow-md group-focus-within/fresh:shadow-md ${hasRefreshError ? "border-amber-500/35" : "border-brand-blue/25"}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-foreground">
              {hasRefreshError ? <AlertTriangle size={12} className="text-amber-500" /> : <span className="h-1.5 w-1.5 rounded-full bg-brand-blue" />}
              {primary ? formatRelativeDate(primary.date) : "Needs check"}
            </div>
            <div className="mt-0.5 text-[9px] font-bold uppercase text-muted">{primary?.label || "No verified episode"}</div>
          </div>
          {primary?.href && <a href={primary.href} target="_blank" rel="noreferrer" aria-label={`Open latest ${primary.label} item`} className="rounded p-1 text-brand-blue hover:bg-brand-blue/10"><ExternalLink size={13} /></a>}
        </div>

        <div className="invisible absolute right-0 top-[calc(100%+6px)] z-30 w-[330px] translate-y-1 rounded-lg border border-border bg-panel p-3 opacity-0 shadow-xl transition-all group-hover/fresh:visible group-hover/fresh:translate-y-0 group-hover/fresh:opacity-100 group-focus-within/fresh:visible group-focus-within/fresh:translate-y-0 group-focus-within/fresh:opacity-100">
          <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase text-muted"><span>Owned channels</span><span>{node.lastMediaFreshnessAuditAt ? `Audit ${formatRelativeDate(node.lastMediaFreshnessAuditAt)}` : "Not audited"}</span></div>
          <div className="grid gap-2">
            {channels.map((channel) => (
              <div key={channel.key} className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 border-t border-border/70 pt-2 first:border-0 first:pt-0">
                <span className="text-[11px] font-extrabold text-foreground">{channel.label}</span>
                <div className="min-w-0 text-right">
                  {channel.href ? <a href={channel.href} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-brand-blue hover:underline">{channel.date ? formatRelativeDate(channel.date) : "Open source"}</a> : <span className="text-[11px] text-muted">Needs check</span>}
                  {channel.date && <div className="text-[9px] text-muted">{formatAbsoluteDate(channel.date)}</div>}
                  {channel.title && <div className="mt-0.5 truncate text-[10px] text-foreground/70" title={channel.title}>{channel.title}</div>}
                  <div className={`mt-0.5 text-[9px] font-bold uppercase ${channel.status === "ERROR" ? "text-amber-600" : "text-muted"}`} title={channel.error}>{statusText(channel.status, Boolean(channel.date))}</div>
                </div>
              </div>
            ))}
          </div>
          {node.xProfile && <a href={node.xProfile} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[10px] font-bold text-brand-blue hover:underline"><span>X profile</span><span>Profile link only; no inferred post date</span></a>}
        </div>
      </div>
    </div>
  );
}
