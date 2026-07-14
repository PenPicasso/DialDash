import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
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
copyFileSync(
  resolve(source, "worker.js"),
  resolve(serverTarget, "index.js")
);

mkdirSync(resolve(target, ".openai"), { recursive: true });
copyFileSync(
  resolve(".openai", "hosting.json"),
  resolve(target, ".openai", "hosting.json")
);
