import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { NodeData } from "../lib/types";

const DATA_PATH = join(__dirname, "..", "data", "nodes.json");
const args = process.argv.slice(2);
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const limit = Math.max(1, Math.min(100, Number(limitArg?.split("=")[1] || 25)));
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = join(__dirname, "..", "storage", "prospect-runs", `research-${runId}`);

function missingGates(node: NodeData) {
  const missing: string[] = [];
  if (!node.contentOwnerName) missing.push("content owner");
  if (!node.economicBuyerName) missing.push("economic buyer");
  if (!node.offerUrl) missing.push("first-party offer URL");
  if (!node.bofOffer || /unknown|requires|verify/i.test(node.bofOffer)) missing.push("observed BOF transaction");
  if (!node.email && !node.xProfile && !node.linkedinUrl && !node.contactUrl) missing.push("public outreach path");
  if (!node.latestMediaPublishedAt) missing.push("owned-channel publishing date");
  if (!node.sourceEvidenceUrl) missing.push("official source evidence");
  return missing;
}

function researchQueries(node: NodeData) {
  const person = node.pointManName || node.host;
  const organization = node.organizationName || node.channel;
  let sourceHost = "";
  try {
    sourceHost = new URL(node.sourceEvidenceUrl || node.youtubeUrl || node.podcastAppleUrl || "").hostname.replace(/^www\./, "");
  } catch {
    sourceHost = "";
  }
  return [
    sourceHost ? `site:${sourceHost} ${person} ${organization}` : `\"${person}\" \"${organization}\" official`,
    `\"${person}\" \"${organization}\" consulting OR membership OR subscription OR advisory OR course OR book`,
    `\"${person}\" \"${organization}\" contact OR email OR LinkedIn OR X`,
  ];
}

const database = JSON.parse(readFileSync(DATA_PATH, "utf8")) as { nodes: NodeData[] };
const candidates = database.nodes
  .filter((node) => node.needsDeepResearch && node.methodologyDecision !== "PURSUE_NOW")
  .sort((a, b) => (a.fitRank || Number.MAX_SAFE_INTEGER) - (b.fitRank || Number.MAX_SAFE_INTEGER))
  .slice(0, limit)
  .map((node) => ({
    id: node.id,
    fitRank: node.fitRank,
    fitScore: node.fitScore,
    currentDecision: node.methodologyDecision,
    person: node.pointManName || node.host,
    organization: node.organizationName || node.channel,
    category: node.category,
    knownSources: {
      sourceEvidenceUrl: node.sourceEvidenceUrl,
      youtubeUrl: node.youtubeUrl,
      podcastAppleUrl: node.podcastAppleUrl,
      rssUrl: node.rssUrl,
      xProfile: node.xProfile,
      linkedinUrl: node.linkedinUrl,
    },
    missingGates: missingGates(node),
    queries: researchQueries(node),
  }));

const payload = {
  runId,
  generatedAt: new Date().toISOString(),
  methodologyVersion: "signability-v3",
  sourcePolicy: [
    "Use owned podcast, YouTube, newsletter, and official organization/person pages first.",
    "Do not use Firecrawl.",
    "Do not infer an offer from a job title or a date from a related company channel.",
    "Return REVIEW/NURTURE when evidence is unresolved; never manufacture a READY/PURSUE_NOW gate.",
  ],
  requiredOutput: [
    "contentOwnerName",
    "economicBuyerName",
    "offerUrl and observed bofOffer",
    "public contactUrl/email/X/LinkedIn",
    "owned-channel latestMediaPublishedAt with evidence URL",
    "observed TOF/MOF/BOF and proposed Energy Dial funnel",
    "decision, confidence, and plain-language reasons",
  ],
  candidates,
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, "research-queue.json"), `${JSON.stringify(payload, null, 2)}\n`);
writeFileSync(join(outputDir, "README.md"), `# Ranked research batch\n\n${candidates.length} unresolved prospects, ordered by current fit rank. Production data was not changed.\n`);

console.log(JSON.stringify({ outputDir, count: candidates.length, firstRank: candidates[0]?.fitRank, lastRank: candidates.at(-1)?.fitRank }, null, 2));
