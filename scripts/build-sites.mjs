import { spawnSync } from "node:child_process";

function run(command, args) {
  const executable = process.platform === "win32" ? `${command}.cmd` : command;
  const result = spawnSync(executable, args, {
    env: process.env,
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npx", ["next", "build"]);
const packageResult = spawnSync(process.execPath, ["scripts/package-sites-build.mjs"], {
  stdio: "inherit",
});
if (packageResult.error) throw packageResult.error;
if (packageResult.status !== 0) process.exit(packageResult.status ?? 1);
