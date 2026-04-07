"use client";

import { NodeData, CATEGORY_COLORS, Category } from "@/lib/types";
import { X, Youtube, ExternalLink } from "lucide-react";
import { VideoPreview } from "./videoPreview";

type Props = {
  node: NodeData;
  onClose: () => void;
};

export function NodeDetail({ node, onClose }: Props) {
  const catColor = CATEGORY_COLORS[node.category as Category] || "#888";

  return (
    <div className="fixed right-0 top-0 h-full w-[380px] bg-panel/95 backdrop-blur-xl border-l border-border z-50 shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">{node.host}</h2>
            {node.channel && (
              <p className="text-sm text-muted mt-1">{node.channel}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-muted hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <span
            className="px-2.5 py-1 rounded-md text-xs font-bold border"
            style={{
              backgroundColor: catColor + "15",
              borderColor: catColor + "40",
              color: catColor,
            }}
          >
            {node.category}
          </span>
          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-panel border border-border text-foreground/70">
            {node.subcategory}
          </span>
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-bold ${
              node.priority === "HOT"
                ? "bg-accent/10 text-accent border border-accent/20"
                : "bg-panel border border-border text-foreground"
            }`}
          >
            {node.priority}
          </span>
          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-panel border border-border text-foreground/70">
            {node.region}
          </span>
        </div>

        <div className="space-y-3 mb-6">
          {node.xFollowers !== null && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">X Followers</span>
              <span className="font-semibold text-foreground">
                {node.xFollowers.toLocaleString()}
              </span>
            </div>
          )}
          {node.youtubeSubscribers !== null && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">YouTube Subscribers</span>
              <span className="font-semibold text-foreground">
                {node.youtubeSubscribers.toLocaleString()}
              </span>
            </div>
          )}
          {node.isXOnly && (
            <div className="text-xs text-muted italic">X-only (no YouTube channel)</div>
          )}
        </div>

        <div className="flex gap-2 mb-6">
          {node.xProfile && (
            <a
              href={node.xProfile}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <ExternalLink size={14} />
              View on X
            </a>
          )}
          {node.youtubeUrl && !node.isXOnly && (
            <a
              href={node.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Youtube size={14} />
              YouTube
            </a>
          )}
        </div>

        {node.channelId && !node.isXOnly && (
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
              Latest Videos
            </h3>
            <VideoPreview
              channelId={node.channelId}
              youtubeUrl={node.youtubeUrl}
              channelName={node.channel}
            />
          </div>
        )}
      </div>
    </div>
  );
}
