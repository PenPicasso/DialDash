import { spawnSync } from "node:child_process";

const runner = process.platform === "win32" ? "npx.cmd" : "npx";

function run(args, env = process.env) {
  const result = spawnSync(runner, args, {
    env,
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.env.DIALDASH_OPENNEXT_INNER === "1") {
  run(["next", "build"]);
  process.exit(0);
}

run(["opennextjs-cloudflare", "build"], {
  ...process.env,
  DIALDASH_OPENNEXT_INNER: "1",
});
const packageResult = spawnSync(process.execPath, ["scripts/package-sites-build.mjs"], {
  stdio: "inherit",
});
if (packageResult.error) throw packageResult.error;
if (packageResult.status !== 0) process.exit(packageResult.status ?? 1);
