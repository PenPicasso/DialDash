import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isLiveMediaPayload, LIVE_MEDIA_SCHEMA_VERSION } from "../lib/liveMediaFreshness";

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

async function main() {
  const inputArg = process.argv.find((arg) => arg.startsWith("--input="));
  if (!inputArg) throw new Error("Use --input=<snapshot.json>");
  const payload: unknown = JSON.parse(readFileSync(resolve(inputArg.split("=").slice(1).join("=")), "utf8"));
  if (!isLiveMediaPayload(payload)) throw new Error("Invalid live freshness snapshot.");

  const startedAt = new Date(new Date(payload.run.completedAt).getTime() - 1000).toISOString();
  await request("/api/internal/media-freshness/run", {
    method: "POST",
    body: JSON.stringify({
      runId: payload.run.id,
      schemaVersion: LIVE_MEDIA_SCHEMA_VERSION,
      refreshVersion: payload.run.refreshVersion,
      expectedCount: payload.records.length,
      startedAt,
    }),
  });

  for (let index = 0; index < payload.records.length; index += 35) {
    const records = payload.records.slice(index, index + 35);
    await request("/api/internal/media-freshness/batch", { method: "POST", body: JSON.stringify({ runId: payload.run.id, records }) });
    console.log(`uploaded ${Math.min(index + records.length, payload.records.length)}/${payload.records.length}`);
  }

  await request("/api/internal/media-freshness/complete", {
    method: "POST",
    body: JSON.stringify({ runId: payload.run.id, completedAt: payload.run.completedAt }),
  });
  const live = await request("/api/media-freshness", { method: "GET" });
  if (live.run?.id !== payload.run.id || live.run?.recordCount !== payload.records.length) throw new Error("Live verification did not return the completed run.");
  console.log(JSON.stringify({ status: "PASSED", runId: payload.run.id, records: payload.records.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
