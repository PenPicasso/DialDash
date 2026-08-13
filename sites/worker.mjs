const pageRoutes = new Map([
  ["/", "/index.html"],
  ["/dashboard", "/dashboard/index.html"],
  ["/dashboard/", "/dashboard/index.html"],
  ["/pilot", "/pilot/index.html"],
  ["/pilot/", "/pilot/index.html"],
  ["/portal/demo", "/portal/demo/index.html"],
  ["/portal/demo/", "/portal/demo/index.html"],
  ["/report", "/report/index.html"],
  ["/report/", "/report/index.html"],
]);

const schemaVersion = "dialdash-media-live-v1";
const allowedFields = new Set([
  "latestYoutubePublishedAt", "latestYoutubePublishDate", "latestYoutubeTitle", "latestYoutubeEvidenceUrl",
  "latestYoutubeCheckedAt", "youtubeFreshnessStatus", "youtubeFreshnessError",
  "latestPodcastPublishedAt", "latestPodcastPublishDate", "latestPodcastTitle", "latestPodcastEvidenceUrl",
  "latestPodcastSource", "latestPodcastCheckedAt", "podcastFreshnessStatus", "podcastFreshnessError",
  "latestNewsletterPublishedAt", "latestNewsletterTitle", "latestNewsletterEvidenceUrl",
  "latestNewsletterCheckedAt", "newsletterFreshnessStatus", "newsletterFreshnessError",
  "latestMediaPublishedAt", "latestMediaPublishDate", "latestMediaSource", "latestMediaTitle",
  "lastMediaFreshnessAuditAt", "mediaRefreshVersion",
]);
const publicationFields = [
  "latestYoutubePublishedAt", "latestPodcastPublishedAt", "latestNewsletterPublishedAt", "latestMediaPublishedAt",
];

function assetRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  url.search = "";
  return new Request(url, { method: "GET", headers: request.headers });
}

function json(value, status = 200) {
  return Response.json(value, {
    status,
    headers: { "cache-control": "private, max-age=0, must-revalidate" },
  });
}

function authorized(request, env) {
  const supplied = request.headers.get("x-dialdash-ingestion-key");
  return Boolean(env.DIALDASH_FRESHNESS_INGESTION_KEY && supplied && supplied === env.DIALDASH_FRESHNESS_INGESTION_KEY);
}

async function requestJson(request) {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

function validIso(value) {
  if (typeof value !== "string") return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time <= Date.now() + 86_400_000;
}

function validateRecord(record, knownIds) {
  if (!record || typeof record !== "object" || typeof record.prospectId !== "string" || !knownIds.has(record.prospectId)) {
    return "unknown prospectId";
  }
  for (const [key, value] of Object.entries(record)) {
    if (key === "prospectId") continue;
    if (!allowedFields.has(key)) return `field ${key} is not allowed`;
    if (value !== undefined && value !== null && typeof value !== "string") return `field ${key} must be a string or null`;
    if ((key.endsWith("PublishedAt") || key.endsWith("CheckedAt") || key === "lastMediaFreshnessAuditAt") && value && !validIso(value)) {
      return `field ${key} is not a valid non-future timestamp`;
    }
  }
  return undefined;
}

async function knownProspectIds(request, env) {
  const response = await env.ASSETS.fetch(assetRequest(request, "/sites-data/prospect-ids.json"));
  const payload = await response.json();
  return new Set(payload.ids || []);
}

async function latestCompleteRun(db) {
  return db.prepare(
    "SELECT id, refresh_version, expected_count, completed_at FROM freshness_runs WHERE status = 'COMPLETE' ORDER BY completed_at DESC LIMIT 1",
  ).first();
}

async function readLiveFreshness(request, env) {
  if (!env.DB) return env.ASSETS.fetch(assetRequest(request, "/sites-data/media-freshness-seed.json"));
  const run = await latestCompleteRun(env.DB);
  if (!run) return env.ASSETS.fetch(assetRequest(request, "/sites-data/media-freshness-seed.json"));
  const result = await env.DB.prepare(
    "SELECT payload_json FROM media_freshness_snapshots WHERE run_id = ?1 ORDER BY prospect_id",
  ).bind(run.id).all();
  const records = result.results.map((row) => JSON.parse(row.payload_json));
  return json({
    schemaVersion,
    run: {
      id: run.id,
      status: "COMPLETE",
      completedAt: run.completed_at,
      expectedCount: run.expected_count,
      recordCount: records.length,
      refreshVersion: run.refresh_version,
    },
    records,
  });
}

async function createRun(request, env) {
  const body = await requestJson(request);
  if (!body || body.schemaVersion !== schemaVersion || typeof body.runId !== "string" || !validIso(body.startedAt) || !Number.isInteger(body.expectedCount) || body.expectedCount < 1 || body.expectedCount > 840) {
    return json({ error: "Invalid run request" }, 400);
  }
  await env.DB.prepare(
    "INSERT INTO freshness_runs (id, status, schema_version, refresh_version, expected_count, started_at) VALUES (?1, 'PENDING', ?2, ?3, ?4, ?5)",
  ).bind(body.runId, schemaVersion, String(body.refreshVersion || "media-v3-owned-channels"), body.expectedCount, body.startedAt).run();
  return json({ runId: body.runId, status: "PENDING" }, 201);
}

function movedBackwards(current, previous) {
  for (const field of publicationFields) {
    if (!current[field] || !previous?.[field]) continue;
    if (new Date(current[field]).getTime() < new Date(previous[field]).getTime()) return field;
  }
  return undefined;
}

async function uploadBatch(request, env) {
  const body = await requestJson(request);
  if (!body || typeof body.runId !== "string" || !Array.isArray(body.records) || body.records.length < 1 || body.records.length > 40) {
    return json({ error: "A batch must contain 1-40 records" }, 400);
  }
  const run = await env.DB.prepare("SELECT status FROM freshness_runs WHERE id = ?1").bind(body.runId).first();
  if (!run || run.status !== "PENDING") return json({ error: "Run is not pending" }, 409);
  const knownIds = await knownProspectIds(request, env);
  for (const record of body.records) {
    const error = validateRecord(record, knownIds);
    if (error) return json({ error, prospectId: record?.prospectId }, 400);
  }

  const previousRun = await latestCompleteRun(env.DB);
  if (previousRun) {
    const placeholders = body.records.map((_, index) => `?${index + 2}`).join(", ");
    const previous = await env.DB.prepare(
      `SELECT prospect_id, payload_json FROM media_freshness_snapshots WHERE run_id = ?1 AND prospect_id IN (${placeholders})`,
    ).bind(previousRun.id, ...body.records.map((record) => record.prospectId)).all();
    const byId = new Map(previous.results.map((row) => [row.prospect_id, JSON.parse(row.payload_json)]));
    for (const record of body.records) {
      const field = movedBackwards(record, byId.get(record.prospectId));
      if (field && !body.corrections?.[record.prospectId]) {
        return json({ error: `${field} moved backwards without a correction reason`, prospectId: record.prospectId }, 409);
      }
    }
  }

  await env.DB.batch(body.records.map((record) => env.DB.prepare(
    "INSERT OR REPLACE INTO media_freshness_snapshots (run_id, prospect_id, payload_json, checked_at) VALUES (?1, ?2, ?3, ?4)",
  ).bind(body.runId, record.prospectId, JSON.stringify(record), record.lastMediaFreshnessAuditAt || new Date().toISOString())));
  return json({ runId: body.runId, accepted: body.records.length });
}

async function completeRun(request, env) {
  const body = await requestJson(request);
  if (!body || typeof body.runId !== "string" || !validIso(body.completedAt)) return json({ error: "Invalid completion request" }, 400);
  const run = await env.DB.prepare("SELECT status, expected_count FROM freshness_runs WHERE id = ?1").bind(body.runId).first();
  if (!run || run.status !== "PENDING") return json({ error: "Run is not pending" }, 409);
  const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM media_freshness_snapshots WHERE run_id = ?1").bind(body.runId).first("count");
  if (Number(count) !== Number(run.expected_count)) return json({ error: "Run is incomplete", expected: run.expected_count, actual: count }, 409);
  await env.DB.batch([
    env.DB.prepare("UPDATE freshness_runs SET status = 'COMPLETE', completed_at = ?2 WHERE id = ?1").bind(body.runId, body.completedAt),
    env.DB.prepare("DELETE FROM media_freshness_snapshots WHERE run_id IN (SELECT id FROM freshness_runs WHERE status = 'COMPLETE' ORDER BY completed_at DESC LIMIT -1 OFFSET 7)"),
    env.DB.prepare("DELETE FROM freshness_runs WHERE status = 'COMPLETE' AND id NOT IN (SELECT id FROM freshness_runs WHERE status = 'COMPLETE' ORDER BY completed_at DESC LIMIT 7)"),
  ]);
  return json({ runId: body.runId, status: "COMPLETE", recordCount: Number(count) });
}

async function runStatus(url, env) {
  const runId = url.searchParams.get("runId");
  if (!runId) return json({ error: "runId is required" }, 400);
  const run = await env.DB.prepare(
    "SELECT r.*, (SELECT COUNT(*) FROM media_freshness_snapshots s WHERE s.run_id = r.id) AS record_count FROM freshness_runs r WHERE r.id = ?1",
  ).bind(runId).first();
  return run ? json(run) : json({ error: "Run not found" }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/media-freshness" && request.method === "GET") return readLiveFreshness(request, env);

    if (url.pathname.startsWith("/api/internal/media-freshness/")) {
      if (!authorized(request, env)) return json({ error: "Unauthorized" }, 401);
      if (!env.DB) return json({ error: "Freshness database is unavailable" }, 503);
      if (url.pathname.endsWith("/run") && request.method === "POST") return createRun(request, env);
      if (url.pathname.endsWith("/run") && request.method === "GET") return runStatus(url, env);
      if (url.pathname.endsWith("/batch") && request.method === "POST") return uploadBatch(request, env);
      if (url.pathname.endsWith("/complete") && request.method === "POST") return completeRun(request, env);
      return json({ error: "Not found" }, 404);
    }

    if (url.pathname === "/api/prospects") {
      const requestedScope = url.searchParams.get("scope");
      const scope = requestedScope === "pursue" || requestedScope === "research" ? requestedScope : "all";
      const response = await env.ASSETS.fetch(assetRequest(request, "/sites-data/prospects-" + scope + ".json"));
      const headers = new Headers(response.headers);
      headers.set("cache-control", "private, max-age=60, stale-while-revalidate=300");
      headers.set("content-type", "application/json; charset=utf-8");
      return new Response(response.body, { status: response.status, headers });
    }

    const page = pageRoutes.get(url.pathname);
    if (page) return env.ASSETS.fetch(assetRequest(request, page));
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return assetResponse;
    return env.ASSETS.fetch(assetRequest(request, "/404.html"));
  },
};
