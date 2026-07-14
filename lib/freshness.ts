import type { NodeData } from "./types";

export type ChannelFreshness = {
  key: "youtube" | "podcast" | "newsletter";
  label: string;
  date?: string;
  title?: string;
  href?: string;
  checkedAt?: string;
  status?: NodeData["youtubeFreshnessStatus"];
  error?: string;
};

const MS_PER_DAY = 86_400_000;

export function parsePublishDate(value?: string) {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatAbsoluteDate(value?: string) {
  const parsed = parsePublishDate(value);
  if (!parsed) return "No date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}

export function formatRelativeDate(value?: string, now = Date.now()) {
  const parsed = parsePublishDate(value);
  if (!parsed) return "Needs check";
  const diff = now - parsed.getTime();
  if (diff < -MS_PER_DAY) return formatAbsoluteDate(value);
  if (diff < MS_PER_DAY) return "Today";
  if (diff < 2 * MS_PER_DAY) return "Yesterday";
  return `${Math.floor(diff / MS_PER_DAY)}d ago`;
}

export function mediaChannels(node: NodeData): ChannelFreshness[] {
  const youtubeDate = node.latestYoutubePublishedAt || node.latestYoutubePublishDate;
  const podcastDate = node.latestPodcastPublishedAt || node.latestPodcastPublishDate;
  const channels: ChannelFreshness[] = [
    {
      key: "youtube",
      label: "YouTube",
      date: youtubeDate,
      title: node.latestYoutubeTitle,
      href: node.latestYoutubeEvidenceUrl || node.youtubeUrl,
      checkedAt: node.latestYoutubeCheckedAt,
      status: node.youtubeFreshnessStatus,
      error: node.youtubeFreshnessError,
    },
    {
      key: "podcast",
      label: "Podcast",
      date: podcastDate,
      title: node.latestPodcastTitle,
      href: node.latestPodcastEvidenceUrl || node.podcastAppleUrl || node.rssUrl,
      checkedAt: node.latestPodcastCheckedAt,
      status: node.podcastFreshnessStatus,
      error: node.podcastFreshnessError,
    },
    {
      key: "newsletter",
      label: "Newsletter",
      date: node.latestNewsletterPublishedAt,
      title: node.latestNewsletterTitle,
      href: node.latestNewsletterEvidenceUrl,
      checkedAt: node.latestNewsletterCheckedAt,
      status: node.newsletterFreshnessStatus,
      error: node.newsletterFreshnessError,
    },
  ];
  return channels.filter(
    (channel) => channel.date || channel.href || channel.checkedAt || (channel.status && channel.status !== "MISSING")
  );
}

export function primaryMedia(node: NodeData) {
  return mediaChannels(node)
    .filter((channel) => channel.date)
    .sort((a, b) => (parsePublishDate(b.date)?.getTime() || 0) - (parsePublishDate(a.date)?.getTime() || 0))[0];
}
