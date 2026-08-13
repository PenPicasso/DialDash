import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isLiveMediaPayload, LIVE_MEDIA_FIELDS } from "../lib/liveMediaFreshness";

const inputArg = process.argv.find((arg) => arg.startsWith("--input="));
if (!inputArg) throw new Error("Use --input=<snapshot.json>");
const path = resolve(inputArg.split("=").slice(1).join("="));
const payload: unknown = JSON.parse(readFileSync(path, "utf8"));
if (!isLiveMediaPayload(payload)) throw new Error("Snapshot does not match the live freshness schema.");

const allowed = new Set<string>(["prospectId", ...LIVE_MEDIA_FIELDS]);
const ids = new Set<string>();
const errors: string[] = [];
for (const record of payload.records) {
  if (ids.has(record.prospectId)) errors.push(`${record.prospectId}: duplicate record`);
  ids.add(record.prospectId);
  for (const [field, value] of Object.entries(record)) {
    if (!allowed.has(field)) errors.push(`${record.prospectId}: forbidden field ${field}`);
    if (value !== undefined && value !== null && typeof value !== "string") errors.push(`${record.prospectId}: ${field} is not a string or null`);
    if ((field.endsWith("PublishedAt") || field.endsWith("CheckedAt") || field === "lastMediaFreshnessAuditAt") && value) {
      const time = new Date(String(value)).getTime();
      if (!Number.isFinite(time) || time > Date.now() + 86_400_000) errors.push(`${record.prospectId}: invalid date in ${field}`);
    }
  }
}
if (payload.run.expectedCount !== payload.records.length || payload.run.recordCount !== payload.records.length) errors.push("run counts do not match record count");
if (errors.length) {
  console.error(errors.slice(0, 50).join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({ status: "PASSED", records: payload.records.length, runId: payload.run.id, completedAt: payload.run.completedAt }, null, 2));
