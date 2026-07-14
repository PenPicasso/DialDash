import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const source = resolve(".open-next");
const target = resolve("dist");

if (!existsSync(resolve(source, "worker.js"))) {
  throw new Error("OpenNext worker output was not generated.");
}

rmSync(target, { force: true, recursive: true });
cpSync(source, target, { recursive: true });

const serverTarget = resolve(target, "server");
mkdirSync(serverTarget, { recursive: true });
cpSync(source, serverTarget, { recursive: true });
const appTarget = resolve(serverTarget, "app.js");
copyFileSync(resolve(source, "worker.js"), appTarget);

// Sites does not need OpenNext's optional cache/queue Durable Objects.
const appSource = readFileSync(appTarget, "utf8").replace(
  /^export \{ (?:DOQueueHandler|DOShardedTagCache|BucketCachePurge) \} from .*;\r?\n/gm,
  "",
);
writeFileSync(appTarget, appSource);
writeFileSync(
  resolve(serverTarget, "index.js"),
  `export default {
  async fetch(request, env, ctx) {
    try {
      const { default: app } = await import("./app.js");
      return await app.fetch(request, env, ctx);
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      return new Response(`DIALDASH_RUNTIME_DIAGNOSTIC\n${message}`, {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
  },
};
`,
);

mkdirSync(resolve(target, ".openai"), { recursive: true });
copyFileSync(
  resolve(".openai", "hosting.json"),
  resolve(target, ".openai", "hosting.json")
);
