import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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
copyFileSync(resolve(source, "worker.js"), resolve(serverTarget, "app.js"));
writeFileSync(
  resolve(serverTarget, "index.js"),
  `export default {
  async fetch(request, env, ctx) {
    try {
      const { default: app } = await import("./app.js");
      return await app.fetch(request, env, ctx);
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      return new Response(message, {
        status: 500,
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
