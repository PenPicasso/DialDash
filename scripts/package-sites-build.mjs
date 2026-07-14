import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve(".open-next");
const target = resolve("dist");

if (!existsSync(resolve(source, "worker.js"))) {
  throw new Error("OpenNext worker output was not generated.");
}

rmSync(target, { force: true, recursive: true });
cpSync(source, target, { recursive: true });

mkdirSync(resolve(target, "server"), { recursive: true });
writeFileSync(
  resolve(target, "server", "index.js"),
  'export { default } from "../worker.js";\n',
  "utf8"
);

mkdirSync(resolve(target, ".openai"), { recursive: true });
copyFileSync(
  resolve(".openai", "hosting.json"),
  resolve(target, ".openai", "hosting.json")
);
