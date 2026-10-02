import type { NodeData } from "./types";

export const LIVE_MEDIA_SCHEMA_VERSION = "dialdash-media-live-v1";

export const LIVE_MEDIA_FIELDS = [
  "latestYoutubePublishedAt",
  "latestYoutubePublishDate",
  "latestYoutubeTitle",
  "latestYoutubeEvidenceUrl",
  "latestYoutubeCheckedAt",
  "youtubeFreshnessStatus",
  "youtubeFreshnessError",
  "latestPodcastPublishedAt",
  "latestPodcastPublishDate",
  "latestPodcastTitle",
  "latestPodcastEvidenceUrl",
  "latestPodcastSource",
  "latestPodcastCheckedAt",
  "podcastFreshnessStatus",
  "podcastFreshnessError",
  "latestNewsletterPublishedAt",
  "latestNewsletterTitle",
  "latestNewsletterEvidenceUrl",
  "latestNewsletterCheckedAt",
  "newsletterFreshnessStatus",
  "newsletterFreshnessError",
  "latestMediaPublishedAt",
  "latestMediaPublishDate",
  "latestMediaSource",
  "latestMediaTitle",
  "lastMediaFreshnessAuditAt",
  "mediaRefreshVersion",
] as const;

export type LiveMediaField = (typeof LIVE_MEDIA_FIELDS)[number];
export type LiveMediaRecord = { prospectId: string } & {
  [Field in LiveMediaField]?: NodeData[Field] | null;
};

export type LiveMediaPayload = {
  schemaVersion: typeof LIVE_MEDIA_SCHEMA_VERSION;
  run: {
    id: string;
    status: "SEEDED" | "COMPLETE";
    completedAt: string;
    expectedCount: number;
    recordCount: number;
    refreshVersion: string;
  };
  records: LiveMediaRecord[];
};

export function pickLiveMediaRecord(node: NodeData): LiveMediaRecord {
  const record = { prospectId: node.id } as LiveMediaRecord;
  for (const field of LIVE_MEDIA_FIELDS) {
    const value = node[field];
    if (value !== undefined) Object.assign(record, { [field]: value });
  }
  return record;
}

export function mergeLiveMedia(nodes: NodeData[], records: Iterable<LiveMediaRecord>): NodeData[] {
  const byId = new Map(Array.from(records, (record) => [record.prospectId, record]));
  return nodes.map((node) => {
    const record = byId.get(node.id);
    if (!record) return node;
    const merged = { ...node };
    for (const field of LIVE_MEDIA_FIELDS) {
      const value = record[field];
      if (value === null) delete merged[field];
      else if (value !== undefined) Object.assign(merged, { [field]: value });
    }
    return merged;
  });
}

export function isLiveMediaPayload(value: unknown): value is LiveMediaPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<LiveMediaPayload>;
  return payload.schemaVersion === LIVE_MEDIA_SCHEMA_VERSION &&
    Boolean(payload.run?.id && payload.run.completedAt) &&
    Array.isArray(payload.records) &&
    payload.records.every((record) => Boolean(record?.prospectId));
}
