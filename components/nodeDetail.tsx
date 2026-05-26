"use client";

import { NodeData, CATEGORY_COLORS, Category } from "@/lib/types";
import { X, Youtube, ExternalLink, Mail, Podcast, Radio, CheckCircle, AlertTriangle, HelpCircle, Award } from "lucide-react";
import { VideoPreview } from "./videoPreview";

type Props = {
  node: NodeData;
  onClose: () => void;
};

export function NodeDetail({ node, onClose }: Props) {
  const catColor = CATEGORY_COLORS[node.category as Category] || "#888";

  // Helper to determine Funnel Stages (TOF, MOF, BOF)
  const getFunnelData = () => {
    // 1. TOF
    const tofChannels: string[] = [];
    let hasVideoGap = false;
    let videoGapReason = "";

    if (node.xProfile) {
      tofChannels.push("X (Twitter)");
    }
    if (node.youtubeUrl && !node.isXOnly) {
      tofChannels.push("YouTube");
    }

    if (node.isPodcastOnly) {
      hasVideoGap = true;
      videoGapReason = "Podcast-only (No video strategy)";
    } else if (node.isXOnly) {
      hasVideoGap = true;
      videoGapReason = "X-only (No video channel)";
    } else if (node.youtubeSubscribers && node.youtubeSubscribers < 10000) {
      hasVideoGap = true;
      videoGapReason = "Underutilized YouTube (<10k subs)";
    } else if (!node.youtubeUrl) {
      hasVideoGap = true;
      videoGapReason = "No YouTube channel detected";
    }

    // 2. MOF
    const mofChannels: string[] = [];
    const lowerChannel = (node.channel || "").toLowerCase();
    const lowerRss = (node.rssUrl || "").toLowerCase();
    const isSubstack = lowerRss.includes("substack") || lowerChannel.includes("substack");

    if (isSubstack) {
      mofChannels.push("Substack Newsletter");
    } else if (node.rssUrl && node.rssUrl.includes("feed")) {
      mofChannels.push("Email Newsletter Feed");
    }

    if (node.podcastAppleUrl || node.isPodcastOnly || node.rssUrl?.includes("podcast") || node.rssUrl?.includes("libsyn") || node.rssUrl?.includes("podbean")) {
      mofChannels.push("Audio Podcast");
    }

    if (node.marketParticipantRole === "ADVISORS & EXPERTS" || node.subcategory === "Education" || node.subcategory === "Management Consulting") {
      mofChannels.push("Webinars & Industry Events");
    }

    if (mofChannels.length === 0) {
      mofChannels.push("Organic Blog / Articles");
    }

    // 3. BOF
    let bofModel = "";
    let bofDetail = "";
    if (node.marketParticipantRole === "TRADERS & ANALYSTS") {
      bofModel = "Paid Research & Intelligence Subscriptions";
      bofDetail = "Monetizes via premium research reports, newsletter upgrades, and commodity analytics dashboards.";
    } else if (node.marketParticipantRole === "ADVISORS & EXPERTS") {
      bofModel = "High-Ticket Corporate Advisory & Training";
      bofDetail = "Monetizes via executive advisory hours, training packages, and custom market studies.";
    } else if (node.marketParticipantRole === "CAPITAL ALLOCATORS") {
      bofModel = "Asset Equity & LP/GP Fund Allocations";
      bofDetail = "Monetizes via asset ownership yields, management fees, and seed equity investments.";
    } else if (node.marketParticipantRole === "MEDIA & INFORMATION") {
      bofModel = "Corporate Sponsorships & Paid Events / Ad Networks";
      bofDetail = "Monetizes via podcast episode slots, newsletter advertising slots, premium live summits, and paid corporate event hosting.";
    } else if (node.marketParticipantRole === "OPERATORS") {
      bofModel = "Commercial Resource Operations & Offtake";
      bofDetail = "Monetizes via energy production offtake agreements, operational fees, and infrastructure development.";
    } else {
      bofModel = "Bespoke Consulting & Commercial Contracts";
      bofDetail = "Monetizes via professional consulting retainers and custom commercial service agreements.";
    }

    return {
      tof: {
        channels: tofChannels.length > 0 ? tofChannels.join(" & ") : "N/A",
        hasVideoGap,
        videoGapReason
      },
      mof: {
        channels: mofChannels.join(" + ")
      },
      bof: {
        model: bofModel,
        detail: bofDetail
      }
    };
  };

  const funnel = getFunnelData();

  // Format cadence label
  const getCadenceDisplay = () => {
    if (node.publishingCadence === "active") {
      return (
        <span className="flex items-center gap-1 text-emerald-500 font-semibold text-xs">
          <CheckCircle size={14} /> Active ({node.frequencyEpisodesPerMonth || 0} eps/mo)
        </span>
      );
    }
    if (node.publishingCadence === "semi-active") {
      return (
        <span className="flex items-center gap-1 text-amber-500 font-semibold text-xs">
          <CheckCircle size={14} /> Semi-active ({node.frequencyEpisodesPerMonth || 0} eps/mo)
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-red-500 font-semibold text-xs">
        <AlertTriangle size={14} /> Inactive
      </span>
    );
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[390px] bg-white dark:bg-[#111111] border-l border-border/80 z-50 shadow-2xl transition-all duration-300 ease-in-out animate-in slide-in-from-right duration-250 overflow-y-auto">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
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

        {/* Warning Banner for Manual Review */}
        {node.needsManualReview && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6 text-xs text-amber-500 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertTriangle className="shrink-0 mt-0.5" size={16} />
            <div>
              <span className="font-bold block mb-0.5">Needs Manual Review</span>
              <span className="opacity-95 leading-relaxed">{node.notes || "This profile requires manual verification of publishing activity."}</span>
            </div>
          </div>
        )}

        {/* Score & Priority Header Badge */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-black/10 dark:bg-white/5 border border-border mb-6">
          <Award className="text-accent shrink-0" size={24} />
          <div>
            <div className="text-xs text-muted uppercase font-bold tracking-wider">Outbound Score</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-foreground">{node.calculatedScore ?? "N/A"}</span>
              <span className="text-xs text-muted">/ 100</span>
              <span
                className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                  node.priority === "HOT"
                    ? "bg-accent/15 text-accent border border-accent/25"
                    : node.priority === "WARM"
                    ? "bg-orange-500/15 text-orange-400 border border-orange-500/25"
                    : node.priority === "MEDIUM"
                    ? "bg-blue-500/15 text-blue-400 border border-blue-500/25"
                    : "bg-muted/15 text-muted border border-border"
                }`}
              >
                {node.priority}
              </span>
            </div>
          </div>
        </div>

        {/* Tags */}
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
          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-panel border border-border text-foreground/70">
            {node.region}
          </span>
        </div>

        {/* General Metadata */}
        <div className="border-t border-border/60 pt-4 pb-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Ecosystem Role</span>
            <span className="font-semibold text-foreground text-xs uppercase tracking-wide">{node.marketParticipantRole}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted">Energy Focus</span>
            <span className="font-semibold text-foreground text-xs">{node.energyType}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted">Publishing Status</span>
            {getCadenceDisplay()}
          </div>

          {node.lastPublishDate && (
            <div className="flex justify-between">
              <span className="text-muted">Last Active Date</span>
              <span className="font-semibold text-foreground text-xs">{node.lastPublishDate}</span>
            </div>
          )}
        </div>

        {/* Funnel Strategy Breakdown */}
        <div className="border-t border-border/60 pt-5 pb-5 space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Funnel Strategy Breakdown
          </h3>
          <div className="relative pl-4 border-l border-border/80 space-y-5 py-1">
            {/* TOF */}
            <div className="relative">
              <div className="absolute -left-[20.5px] top-1 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-500/10" />
              <div className="text-xs font-bold text-foreground">Top of Funnel (TOF)</div>
              <div className="text-xs text-muted mt-0.5">{funnel.tof.channels}</div>
              {funnel.tof.hasVideoGap && (
                <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded font-medium">
                  ⚠️ {funnel.tof.videoGapReason}
                </span>
              )}
            </div>

            {/* MOF */}
            <div className="relative">
              <div className="absolute -left-[20.5px] top-1 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-500/10" />
              <div className="text-xs font-bold text-foreground">Middle of Funnel (MOF)</div>
              <div className="text-xs text-muted mt-0.5">{funnel.mof.channels}</div>
            </div>

            {/* BOF */}
            <div className="relative">
              <div className="absolute -left-[20.5px] top-1 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" />
              <div className="text-xs font-bold text-foreground">Bottom of Funnel (BOF)</div>
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{funnel.bof.model}</div>
              <div className="text-[11px] text-muted-foreground leading-relaxed mt-1 bg-black/5 dark:bg-white/5 p-2 rounded-lg border border-border/50">
                {funnel.bof.detail}
              </div>
            </div>
          </div>

          {/* Pitch Strategy Hook */}
          <div className="p-3 rounded-xl bg-accent/5 border border-accent/15 text-xs text-muted-foreground leading-relaxed animate-pulse-slow">
            <span className="font-bold text-accent block mb-1">Outreach Hook Recommendation</span>
            Pitch clipping and short-form video optimization to 2-3X their TOF reach, capturing warm organic leads for their <span className="font-semibold text-foreground">{funnel.bof.model.toLowerCase()}</span> model.
          </div>
        </div>

        {/* Verification & Cadence Confidence */}
        <div className="border-t border-border/60 pt-4 pb-4 space-y-3 text-sm">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
            Verification Metrics
          </h3>
          <div className="flex justify-between items-center">
            <span className="text-muted">Confidence Level</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                node.cadenceConfidence === "HIGH"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                  : node.cadenceConfidence === "MEDIUM"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                  : "bg-muted/15 text-muted border border-border"
              }`}
            >
              {node.cadenceConfidence || "LOW"}
            </span>
          </div>

          {node.lastVerifiedAt && (
            <div className="flex justify-between">
              <span className="text-muted">Last Checked</span>
              <span className="font-semibold text-foreground text-xs">
                {new Date(node.lastVerifiedAt).toLocaleDateString()}
              </span>
            </div>
          )}

          {node.sourceOfLastPublishDate && (
            <div className="flex justify-between">
              <span className="text-muted">Evidence Source</span>
              <span className="font-semibold text-foreground text-xs capitalize">
                {node.sourceOfLastPublishDate}
              </span>
            </div>
          )}

          {node.verificationSourcesChecked && node.verificationSourcesChecked.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-muted text-xs block">Checked Sources</span>
              <div className="flex flex-wrap gap-1.5">
                {node.verificationSourcesChecked.map((src) => (
                  <span
                    key={src}
                    className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/5 border border-border text-[10px] text-muted-foreground uppercase font-bold"
                  >
                    {src.replace("_", " ")}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Social / Audience Stats */}
        <div className="border-t border-border/60 pt-4 pb-4 space-y-3 text-sm">
          {node.xFollowers !== null && (
            <div className="flex justify-between">
              <span className="text-muted">X Followers</span>
              <span className="font-semibold text-foreground">
                {node.xFollowers.toLocaleString()}
              </span>
            </div>
          )}
          {node.youtubeSubscribers !== null && (
            <div className="flex justify-between">
              <span className="text-muted">YouTube Subscribers</span>
              <span className="font-semibold text-foreground">
                {node.youtubeSubscribers.toLocaleString()}
              </span>
            </div>
          )}
          {node.isXOnly && (
            <div className="text-xs text-muted/80 italic">X-only operator (no YouTube channel)</div>
          )}
          {node.isPodcastOnly && (
            <div className="text-xs text-accent/80 font-medium flex items-center gap-1">
              <Podcast size={14} /> Podcast-first / Audio-first Operator
            </div>
          )}
        </div>

        {/* Link Integrity & Outreach Audit Panel */}
        <div className="border-t border-border/60 pt-5 pb-5 space-y-3.5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Outreach & Link Audit
          </h3>
          <div className="space-y-2">
            {/* RSS Link */}
            {node.rssUrl && (
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-[#FAFAFA] dark:bg-white/5 border border-border/60">
                <span className="font-semibold flex items-center gap-1.5 text-foreground/80">
                  <Radio size={14} className="text-orange-500" />
                  RSS Feed URL
                </span>
                {node.brokenLinks?.includes("rssUrl") ? (
                  <span className="flex items-center gap-1 text-red-500 font-bold">
                    <AlertTriangle size={12} /> Broken
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle size={12} /> Live
                  </span>
                )}
              </div>
            )}

            {/* Apple Podcasts */}
            {node.podcastAppleUrl && (
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-[#FAFAFA] dark:bg-white/5 border border-border/60">
                <span className="font-semibold flex items-center gap-1.5 text-foreground/80">
                  <Podcast size={14} className="text-purple-500" />
                  Apple Podcasts Page
                </span>
                {node.brokenLinks?.includes("podcastAppleUrl") ? (
                  <span className="flex items-center gap-1 text-red-500 font-bold">
                    <AlertTriangle size={12} /> Broken
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle size={12} /> Active
                  </span>
                )}
              </div>
            )}

            {/* YouTube Link */}
            {node.youtubeUrl && !node.isXOnly && (
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-[#FAFAFA] dark:bg-white/5 border border-border/60">
                <span className="font-semibold flex items-center gap-1.5 text-foreground/80">
                  <Youtube size={14} className="text-red-500" />
                  YouTube Channel
                </span>
                {node.brokenLinks?.includes("youtubeUrl") ? (
                  <span className="flex items-center gap-1 text-red-500 font-bold">
                    <AlertTriangle size={12} /> Broken
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle size={12} /> Live
                  </span>
                )}
              </div>
            )}

            {/* X Profile */}
            {node.xProfile && (
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-[#FAFAFA] dark:bg-white/5 border border-border/60">
                <span className="font-semibold flex items-center gap-1.5 text-foreground/80">
                  <ExternalLink size={14} className="text-blue-400" />
                  X Profile
                </span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle size={12} /> Verified
                </span>
              </div>
            )}

            {/* Email Outreach */}
            <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-[#FAFAFA] dark:bg-white/5 border border-border/60">
              <span className="font-semibold flex items-center gap-1.5 text-foreground/80">
                <Mail size={14} className="text-gray-400" />
                Email Channel
              </span>
              {node.email ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle size={12} /> {node.email}
                </span>
              ) : (
                <span className="text-muted-foreground italic">
                  Not Found (DM Required)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button Links */}
        <div className="space-y-2 mb-6">
          <div className="flex gap-2">
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

          {/* Podcast distribution links */}
          {(node.podcastAppleUrl || node.podcastSpotifyUrl || node.rssUrl) && (
            <div className="bg-black/10 dark:bg-white/5 border border-border rounded-lg p-3 space-y-2">
              <div className="text-xs font-bold text-foreground/80 flex items-center gap-1.5 mb-1">
                <Podcast size={14} className="text-accent" /> Listen on Podcasts
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {node.podcastAppleUrl && (
                  <a
                    href={node.podcastAppleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded bg-panel border border-border hover:bg-black/5 dark:hover:bg-white/5 text-foreground/80 flex items-center gap-1"
                  >
                    Apple Podcasts
                  </a>
                )}
                {node.podcastSpotifyUrl && (
                  <a
                    href={node.podcastSpotifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded bg-panel border border-border hover:bg-black/5 dark:hover:bg-white/5 text-foreground/80 flex items-center gap-1"
                  >
                    Spotify
                  </a>
                )}
                {node.rssUrl && (
                  <a
                    href={node.rssUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded bg-panel border border-border hover:bg-black/5 dark:hover:bg-white/5 text-foreground/80 flex items-center gap-1.5"
                  >
                    <Radio size={12} className="text-orange-500" /> RSS Feed
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Video Preview In-Flow */}
        {node.channelId && !node.isXOnly && (
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
              Latest Videos
            </h3>
            <VideoPreview
              channelId={node.channelId}
              youtubeUrl={node.youtubeUrl}
              channelName={node.channel}
              inline={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
