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

const nextPages = resolve(".next", "server", "app");
const target = resolve("dist");

if (!existsSync(resolve(".next", "static")) || !existsSync(resolve(nextPages, "dashboard.html"))) {
  throw new Error("The Next.js static assets and prerendered dashboard were not generated.");
}

rmSync(target, { force: true, recursive: true });
mkdirSync(target, { recursive: true });
const assetsTarget = resolve(target, "assets");
mkdirSync(assetsTarget, { recursive: true });
if (existsSync(resolve("public"))) cpSync(resolve("public"), assetsTarget, { recursive: true });
cpSync(resolve(".next", "static"), resolve(assetsTarget, "_next", "static"), { recursive: true });
const pages = [
  ["index.html", "index.html"],
  ["dashboard.html", "dashboard/index.html"],
  ["pilot.html", "pilot/index.html"],
  ["portal/demo.html", "portal/demo/index.html"],
  ["report.html", "report/index.html"],
  ["_not-found.html", "404.html"],
];

for (const [sourcePage, targetPage] of pages) {
  const output = resolve(assetsTarget, targetPage);
  mkdirSync(resolve(output, ".."), { recursive: true });
  copyFileSync(resolve(nextPages, sourcePage), output);
}

const baseNodes = JSON.parse(readFileSync(resolve("data", "nodes.json"), "utf8")).nodes;
const review = JSON.parse(readFileSync(resolve("data", "full-review.json"), "utf8"));
const reviewById = new Map(review.records.map((record) => [record.id, record]));
const nodes = baseNodes.map((node) => ({ ...node, ...reviewById.get(node.id) }));
const summary = {
  total: nodes.length,
  reviewed: nodes.filter((node) => node.reviewStatus === "PASSED").length,
  pursue: nodes.filter((node) => node.reviewDecision === "PURSUE_NOW").length,
  nurture: nodes.filter((node) => node.reviewDecision === "NURTURE").length,
  excluded: nodes.filter((node) => node.reviewDecision === "DISQUALIFIED_CONFIRMED").length,
  strongReady: nodes.filter(
    (node) => node.actionabilityStatus === "READY" && node.reachabilityStatus === "STRONG",
  ).length,
  mediaVerified: nodes.filter(
    (node) =>
      node.actionabilityStatus === "READY" &&
      Boolean(
        node.latestYoutubePublishedAt ||
          node.latestPodcastPublishedAt ||
          node.latestNewsletterPublishedAt,
      ),
  ).length,
};
const dataTarget = resolve(assetsTarget, "sites-data");
mkdirSync(dataTarget, { recursive: true });

for (const [scope, selected] of [
  ["all", nodes],
  ["pursue", nodes.filter((node) => node.reviewDecision === "PURSUE_NOW")],
  ["research", nodes.filter((node) => node.reviewDecision === "NURTURE")],
]) {
  writeFileSync(
    resolve(dataTarget, `prospects-${scope}.json`),
    JSON.stringify({ nodes: selected, summary }),
  );
}

const serverTarget = resolve(target, "server");
mkdirSync(serverTarget, { recursive: true });
writeFileSync(
  resolve(serverTarget, "index.js"),
  `const pageRoutes = new Map([
  ["/", "/index.html"],
  ["/dashboard", "/dashboard/index.html"],
  ["/dashboard/", "/dashboard/index.html"],
  ["/pilot", "/pilot/index.html"],
  ["/pilot/", "/pilot/index.html"],
  ["/portal/demo", "/portal/demo/index.html"],
  ["/portal/demo/", "/portal/demo/index.html"],
  ["/report", "/report/index.html"],
  ["/report/", "/report/index.html"],
]);

function assetRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  url.search = "";
  return new Request(url, request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/prospects") {
      const requestedScope = url.searchParams.get("scope");
      const scope = requestedScope === "pursue" || requestedScope === "research"
        ? requestedScope
        : "all";
      const response = await env.ASSETS.fetch(
        assetRequest(request, "/sites-data/prospects-" + scope + ".json"),
      );
      const headers = new Headers(response.headers);
      headers.set("cache-control", "private, max-age=60, stale-while-revalidate=300");
      headers.set("content-type", "application/json; charset=utf-8");
      return new Response(response.body, { status: response.status, headers });
    }

    const page = pageRoutes.get(url.pathname);
    if (page) {
      return env.ASSETS.fetch(assetRequest(request, page));
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return assetResponse;
    return env.ASSETS.fetch(assetRequest(request, "/404.html"));
  },
};
`,
);

mkdirSync(resolve(target, ".openai"), { recursive: true });
copyFileSync(
  resolve(".openai", "hosting.json"),
  resolve(target, ".openai", "hosting.json"),
);
