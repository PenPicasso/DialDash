import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { isLiveMediaPayload, LIVE_MEDIA_SCHEMA_VERSION, type LiveMediaRecord } from "../lib/liveMediaFreshness";

const baseUrl = process.env.DIALDASH_FRESHNESS_URL?.replace(/\/$/, "");
const ingestionKey = process.env.DIALDASH_FRESHNESS_INGESTION_KEY;
const bypassToken = process.env.DIALDASH_SITES_BYPASS_TOKEN;
if (!baseUrl || !ingestionKey) throw new Error("DIALDASH_FRESHNESS_URL and DIALDASH_FRESHNESS_INGESTION_KEY are required.");

const headers: Record<string, string> = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "x-dialdash-ingestion-key": ingestionKey,
};
if (bypassToken) headers["OAI-Sites-Authorization"] = `Bearer ${bypassToken}`;

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

const sourceGroups = [
  {
    date: "latestYoutubePublishedAt",
    valueFields: ["latestYoutubePublishedAt", "latestYoutubePublishDate", "latestYoutubeTitle", "latestYoutubeEvidenceUrl"],
    status: "youtubeFreshnessStatus",
    error: "youtubeFreshnessError",
  },
  {
    date: "latestPodcastPublishedAt",
    valueFields: ["latestPodcastPublishedAt", "latestPodcastPublishDate", "latestPodcastTitle", "latestPodcastEvidenceUrl", "latestPodcastSource"],
    status: "podcastFreshnessStatus",
    error: "podcastFreshnessError",
  },
  {
    date: "latestNewsletterPublishedAt",
    valueFields: ["latestNewsletterPublishedAt", "latestNewsletterTitle", "latestNewsletterEvidenceUrl"],
    status: "newsletterFreshnessStatus",
    error: "newsletterFreshnessError",
  },
] as const;

function epoch(value: unknown) {
  if (typeof value !== "string") return undefined;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : undefined;
}

function mergeWithLive(records: LiveMediaRecord[], liveRecords: LiveMediaRecord[]) {
  const byId = new Map(liveRecords.map((record) => [record.prospectId, { ...record }]));
  const incomingIds = new Set(records.map((record) => record.prospectId));
  const regressions: Array<{ prospectId: string; field: string; incoming?: string; retained: string }> = [];

  for (const candidate of records) {
    const previous = byId.get(candidate.prospectId);
    const merged = { ...(previous || {}), ...candidate } as LiveMediaRecord;
    if (previous) {
      for (const group of sourceGroups) {
        const oldDate = epoch(previous[group.date]);
        const newDate = epoch(candidate[group.date]);
        if (oldDate === undefined || (newDate !== undefined && newDate >= oldDate)) continue;

        for (const field of group.valueFields) {
          const oldValue = previous[field];
          if (oldValue !== undefined) Object.assign(merged, { [field]: oldValue });
        }
        Object.assign(merged, {
          [group.status]: "ERROR",
          [group.error]: `The latest check returned no date or an older ${group.date} value; the last accepted source value was retained pending review.`,
        });
        regressions.push({
          prospectId: candidate.prospectId,
          field: group.date,
          incoming: typeof candidate[group.date] === "string" ? candidate[group.date] : undefined,
          retained: String(previous[group.date]),
        });
      }

      const oldPrimary = epoch(previous.latestMediaPublishedAt);
      const newPrimary = epoch(candidate.latestMediaPublishedAt);
      if (oldPrimary !== undefined && (newPrimary === undefined || newPrimary < oldPrimary)) {
        for (const field of ["latestMediaPublishedAt", "latestMediaPublishDate", "latestMediaSource", "latestMediaTitle"] as const) {
          const oldValue = previous[field];
          if (oldValue !== undefined) Object.assign(merged, { [field]: oldValue });
        }
      }
    }
    byId.set(candidate.prospectId, merged);
  }

  const mergedRecords = Array.from(byId.values()).sort((a, b) => a.prospectId.localeCompare(b.prospectId));
  const missingLiveIds = liveRecords.filter((record) => !incomingIds.has(record.prospectId)).length;
  return { records: mergedRecords, regressions, missingLiveIds };
}

async function main() {
  const inputArg = process.argv.find((arg) => arg.startsWith("--input="));
  if (!inputArg) throw new Error("Use --input=<snapshot.json>");
  const payload: unknown = JSON.parse(readFileSync(resolve(inputArg.split("=").slice(1).join("=")), "utf8"));
  if (!isLiveMediaPayload(payload)) throw new Error("Invalid live freshness snapshot.");

  // A partial --ids/--limit collection is safe only when merged into the full accepted live snapshot.
  const currentLive = await request("/api/media-freshness", { method: "GET" });
  if (!Array.isArray(currentLive.records) || currentLive.records.length === 0) {
    throw new Error("Current live freshness snapshot is unavailable; refusing to replace it with a partial snapshot.");
  }
  if (payload.records.length < currentLive.records.length) {
    throw new Error("The deployed freshness service currently requires every record to be checked during each collection window. Partial --ids/--limit runs cannot be published safely yet; run the full collection instead.");
  }
  const merged = mergeWithLive(payload.records, currentLive.records as LiveMediaRecord[]);
  if (merged.records.length !== currentLive.records.length) {
    throw new Error(`Merged snapshot has ${merged.records.length} records but live has ${currentLive.records.length}; refusing a changed or incomplete prospect set.`);
  }

  const runId = `media-${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
  const collectionChecks = payload.records
    .map((record) => epoch(record.lastMediaFreshnessAuditAt))
    .filter((value): value is number => value !== undefined);
  if (collectionChecks.length !== payload.records.length) {
    throw new Error("Every collected record must include lastMediaFreshnessAuditAt before upload.");
  }
  const startedAt = new Date(Math.min(...collectionChecks) - 1000).toISOString();

  await request("/api/internal/media-freshness/run", {
    method: "POST",
    body: JSON.stringify({
      runId,
      schemaVersion: LIVE_MEDIA_SCHEMA_VERSION,
      refreshVersion: payload.run.refreshVersion,
      expectedCount: merged.records.length,
      startedAt,
    }),
  });

  for (let index = 0; index < merged.records.length; index += 35) {
    const records = merged.records.slice(index, index + 35);
    await request("/api/internal/media-freshness/batch", { method: "POST", body: JSON.stringify({ runId, records }) });
    console.log(`uploaded ${Math.min(index + records.length, merged.records.length)}/${merged.records.length}`);
  }

  const completedAt = new Date().toISOString();
  await request("/api/internal/media-freshness/complete", {
    method: "POST",
    body: JSON.stringify({ runId, completedAt }),
  });
  const confirmedLive = await request("/api/media-freshness", { method: "GET" });
  if (confirmedLive.run?.id !== runId || confirmedLive.run?.recordCount !== merged.records.length) throw new Error("Live verification did not return the completed run.");
  // Gemma runs server-side with the Site's masked GEMINI_API_KEY and JOULERA_AI_MODEL settings.
  // A failed audit must not undo a successfully completed freshness publication.
  let aiAudit: Record<string, unknown>;
  try {
    const result = await request("/api/internal/media-freshness/ai-audit", {
      method: "POST",
      body: JSON.stringify({ runId }),
    });
    const confirmed =
      result.runId === runId &&
      typeof result.model === "string" &&
      typeof result.issueCount === "number" &&
      typeof result.completedAt === "string" &&
      ["PASS", "PASSED", "REVIEW"].includes(result.status);
    aiAudit = confirmed
      ? {
          status: result.status,
          runId: result.runId,
          model: result.model,
          issueCount: result.issueCount,
          completedAt: result.completedAt,
        }
      : { status: "UNCONFIRMED", runId, responseStatus: result.status };
  } catch (error) {
    aiAudit = {
      status: "FAILED",
      runId,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
  console.log(JSON.stringify({ status: "PASSED", collectionRunId: payload.run.id, runId, records: merged.records.length, partialInputRecords: payload.records.length, retainedRegressions: merged.regressions, priorLiveRowsCarriedForward: merged.missingLiveIds, aiAudit }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
