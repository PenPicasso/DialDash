import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const secretPath = resolve("storage/media-freshness-secrets.json");
if (!existsSync(secretPath)) throw new Error(`Missing local secret file: ${secretPath}`);

const secrets = JSON.parse(readFileSync(secretPath, "utf8").replace(/^\uFEFF/, ""));
const env = {
  ...process.env,
  DIALDASH_FRESHNESS_URL: secrets.url,
  DIALDASH_FRESHNESS_INGESTION_KEY: secrets.ingestionKey,
  DIALDASH_SITES_BYPASS_TOKEN: secrets.sitesBypassToken,
};
const snapshot = resolve("storage/media-freshness-live.json");

function run(command, args) {
  const result = spawnSync(command, args, { env, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status || 1);
}

run("npm", ["run", "collect:media", "--", "--all", `--output=${snapshot}`]);
run("npm", ["run", "validate:media-freshness", "--", `--input=${snapshot}`]);
run("npm", ["run", "upload:media-freshness", "--", `--input=${snapshot}`]);
