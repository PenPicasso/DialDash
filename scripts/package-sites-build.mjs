import { cpSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve(".open-next");
const target = resolve("dist");

if (!existsSync(resolve(source, "worker.js"))) {
  throw new Error("OpenNext worker output was not generated.");
}

rmSync(target, { force: true, recursive: true });
cpSync(source, target, { recursive: true });
