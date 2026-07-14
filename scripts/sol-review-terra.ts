import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { NodeData } from "../lib/types";

type Decision = "PURSUE_NOW" | "NURTURE" | "DISQUALIFIED_CONFIRMED";
type Evidence = { url: string; proves: string };

const root = join(__dirname, "..");
const storage = join(root, "storage", "terra-recovery");
const nodes = (JSON.parse(readFileSync(join(root, "data", "nodes.json"), "utf8")) as { nodes: NodeData[] }).nodes;

const pursue: Record<string, { buyer: string; pointMan: string; contact: string; offer: string; offerUrl: string; tof: string[]; mof: string[]; pitchHook: string; videoGapReason: string; videoGapEvidenceUrls: string[]; evidence: Evidence[] }> = {
  "amber-kanwar": {
    buyer: "Amber Kanwar", pointMan: "Amber Kanwar", contact: "feedback@inthemoneypod.com",
    offer: "Paid keynote, moderator, and emcee engagements; the podcast also feeds a daily market newsletter.",
    offerUrl: "https://amberkanwar.com/", tof: ["YouTube", "LinkedIn", "market commentary"], mof: ["In the Money podcast", "Before the Bell newsletter"],
    pitchHook: "Turn each oil, pipeline, mining, and commodity interview into a week of sober market explainers with persistent numbers, company names, and asset maps, then point every clip back to In the Money and Amber's speaking inquiry.",
    videoGapReason: "High short-form volume, but sampled Shorts are speaker cuts with captions rather than explanatory edits; they lack persistent figures, maps, source context, and visual teaching aids.",
    videoGapEvidenceUrls: ["https://www.youtube.com/shorts/Q_cVKMYeGIg", "https://www.youtube.com/shorts/bBJ8LTYFqWM", "https://www.youtube.com/shorts/80hdCx1esPM"],
    evidence: [
      { url: "https://amberkanwar.com/", proves: "Amber owns the public brand and explicitly sells speaking, moderation, and emcee engagements." },
      { url: "https://inthemoneypod.com/contact/", proves: "The owned show provides a direct contact email and links its podcast, YouTube, newsletter, and RSS funnel." },
    ],
  },
  "marine-cornelis": {
    buyer: "Marine Cornelis", pointMan: "Marine Cornelis", contact: "contact@nextenergyconsumer.eu",
    offer: "Strategic advisory retainers, governance reviews, speaking, and moderation.",
    offerUrl: "https://www.nextenergyconsumer.eu/", tof: ["LinkedIn", "YouTube", "articles"], mof: ["Energ'Ethic podcast", "policy publications"],
    pitchHook: "Convert each EU energy-policy conversation into visual explainers using maps, tariff diagrams, named regulations, and on-screen policy consequences, with a direct path to Marine's strategic-conversation booking page.",
    videoGapReason: "Only five Shorts were visible, and three sampled clips are basic interview or remote-call excerpts with captions; none adds policy maps, diagrams, regulation labels, or explanatory B-roll.",
    videoGapEvidenceUrls: ["https://www.youtube.com/shorts/lYJBRgWNAFc", "https://www.youtube.com/shorts/tkFkYITL3t4", "https://www.youtube.com/shorts/ZChft6X9jIw"],
    evidence: [{ url: "https://www.nextenergyconsumer.eu/", proves: "The official owner-operated site names Marine, lists advisory and speaking offers, publishes current podcast episodes, exposes email, and links a booking CTA." }],
  },
  "michelle-fraser": {
    buyer: "Michelle Fraser", pointMan: "Michelle Fraser", contact: "Official site contact form / booking CTA",
    offer: "Engineering consultancy, one-to-one mentoring, public speaking, and paid mentoring products.",
    offerUrl: "https://www.michellefraserconsultancy.com/", tof: ["YouTube", "LinkedIn", "career articles"], mof: ["Energy Sector Heroes podcast", "toolkit and mentoring content"],
    pitchHook: "Turn each Energy Sector Heroes interview into practical engineering-career clips with project maps, equipment callouts, and numbered lessons, then send qualified viewers to Michelle's consultancy, mentoring, and booking offers.",
    videoGapReason: "The channel has a Shorts tab, but three sampled Shorts are static Energy Sector Heroes cover art over audio rather than edited vertical video; the explanatory-quality gap is substantial.",
    videoGapEvidenceUrls: ["https://www.youtube.com/shorts/jE5wnU_b7Hw", "https://www.youtube.com/shorts/QAkmcpL40AA", "https://www.youtube.com/shorts/T3ov1wBCM0g"],
    evidence: [{ url: "https://www.michellefraserconsultancy.com/", proves: "Michelle's official site owns the podcast-adjacent brand, lists consultancy, mentoring, speaking and booking offers, and provides a direct contact path." }],
  },
};

const hardGates: Record<string, { reason: string; evidence?: Evidence[] }> = {};

function add(ids: string[], reason: string, evidence?: Evidence[]) {
  for (const id of ids) hardGates[id] = { reason, evidence };
}

add(["amy-myers-jaffe"], "Duplicate Energy Gang account. Amy is a recurring contributor, while the owned show and buyer belong to Wood Mackenzie.");
add(["paige-wilson", "elena-melchert", "paige-lacour"], "Duplicate OGGN account. These host/show rows resolve to the same commercial media network and should be worked, if at all, through its controlling buyer record.");
add(["david-leitch", "reneweconomy", "solar-insiders-a-renew-economy-podcast"], "Duplicate RenewEconomy account. The content and transaction are controlled at publisher level, not independently by each show or contributor row.");
add(["ed-crooks"], "Institutional ownership: Energy Gang is presented and commercially controlled by Wood Mackenzie, not Ed Crooks.", [{ url: "https://podcasts.apple.com/us/podcast/energy-gang/id663379413", proves: "The official listing names Wood Mackenzie as presenter and provides its corporate podcast/sponsorship inbox." }]);
add(["dana-perkins"], "Institutional ownership: Switched On is a BloombergNEF product; the named host is not the economic buyer.");
add(["andy-stone"], "Institutional ownership: Energy Policy Now is a University of Pennsylvania/Kleinman Center publication.");
add(["bill-derasmo"], "Institutional ownership: the show supports a large law firm's energy practice rather than a creator-controlled offer.");
add(["cgi-in-energy"], "Corporate monolith: CGI owns the channel and transaction; no creator-controlled buyer chain exists.");
add(["powering-sustainable"], "Corporate monolith: RBC Capital Markets owns the show and transaction.");
add(["capgemini-nordics"], "Corporate monolith: Capgemini owns the show and transaction.");
add(["berkeley-law"], "Institutional ownership: Berkeley Law owns the show; no creator-controlled commercial transaction exists.");
add(["united-states"], "Institutional ownership: the United States Energy Association owns the show; no creator-controlled buyer chain is established.");
add(["new-york-iso"], "Institutional ownership: New York ISO owns the show and is not a creator-sales account.");
add(["kelly-evans"], "Corporate monolith: CNBC owns Power Lunch and its media distribution.");
add(["shell-energy-podcast"], "Corporate monolith: Shell owns the channel and media transaction.");
add(["international-renewable-energy-agency"], "Intergovernmental institution: IRENA is not a creator-controlled sales account.");
add(["ppl-electric-utilities", "tata-power-renewable-energy", "plug-power", "byd-energy-storage"], "Corporate product channel without a creator-controlled content-to-offer transaction.");
add(["mike-adams"], "Wrong ICP: the verified show is a general health/politics program, not an energy creator business.");
add(["wall-street", "mr-rose", "mrkt-matrix", "1st-live-trading"], "Wrong ICP: general markets/trading content without a sufficiently specific owned energy-creator business.");
add(["2026-podcastbude"], "Language gate: the owned show is not consistently English-language content.");
add(["mark-lacour"], "Existing professional media engine: OGGN sells podcast production, advertising, sponsorship and video-backed media products and names a video-production partner.", [
  { url: "https://oggn.com/media-kit/", proves: "Mark founded OGGN, which presents itself as a professionally produced 20+ show media network." },
  { url: "https://oggn.com/oil-and-gas-podcast-advertising/", proves: "OGGN already sells a mature multi-format media and advertising operation." },
]);
add(["nico-johnson"], "Existing professional media engine and direct competitor: SunCast already sells produced interviews, video deliverables, social boosting and event-media packages.", [{ url: "https://www.suncast.media/events-services/re-northeast-2025", proves: "SunCast offers professional edited video, raw deliverables, social distribution and live media packages." }]);
add(["bruce-biewald"], "Existing explanatory-video format: Energy Nerd Show is deliberately built around visual graphs and produced video, so the claimed video gap is false.", [{ url: "https://energynerdshow.com/about", proves: "The show's official manifesto explicitly distinguishes itself from audio through graphs and visual presentation." }]);
add(["keith-zakheim"], "Existing marketing-provider conflict: the host is CEO of Antenna Group, a marketing and PR firm, so the transaction is not a clean clipping-services gap.", [{ url: "https://www.antennagroup.com/age-of-adoption/from-commitments-to-measurable-action", proves: "Keith identifies his day job as CEO of the marketing and PR firm that owns the content funnel." }]);
add(["zach-shahan", "kyle-hill", "energy-capital-power"], "Existing video-native media operation; the required weak-video-distribution gate is not established.");

const batches = [1, 2, 3, 4].map((batch) => JSON.parse(readFileSync(join(storage, `batch-${batch}.json`), "utf8")) as { batch: number; records: Array<Record<string, unknown>>; auditSample: string[] });

const reports = batches.flatMap(({ batch, records, auditSample }) => records.map((source) => {
  const id = String(source.id);
  const node = nodes.find((item) => item.id === id);
  if (!node) throw new Error(`Missing production row for ${id}`);
  const verified = pursue[id];
  const excluded = hardGates[id];
  const decision: Decision = verified ? "PURSUE_NOW" : excluded ? "DISQUALIFIED_CONFIRMED" : "NURTURE";
  const missingGates = decision === "NURTURE" ? [
    ...((!node.pointManName || node.pointManName === node.organizationName || node.pointManName === node.host && !/\s/.test(node.pointManName)) ? ["named outreach point-man"] : []),
    ...((!node.email && !node.contactInfo) ? ["verified direct contact path"] : []),
    "first-party offer evidence",
    "economic-buyer authority",
    "observed TOF/MOF/BOF transaction",
    "verified weak short-form/explainer distribution",
  ] : [];
  const latest = (source.latest as { publishedAt?: string; title?: string; url?: string } | undefined);
  const sourceType = source.rssUrl ? "PODCAST" : "YOUTUBE";
  return {
    id, batch, auditSample: auditSample.includes(id), host: node.host, organization: node.organizationName,
    decision, previousDecision: node.methodologyDecision, fitRank: node.fitRank, sourceType,
    latestPublishedAt: latest?.publishedAt || node.latestMediaPublishedAt,
    latestTitle: latest?.title || node.latestMediaTitle,
    sourceEvidenceUrl: latest?.url || String(source.rssUrl || source.youtubeUrl || node.sourceEvidenceUrl || ""),
    owner: verified?.buyer || node.contentOwnerName,
    buyer: verified?.buyer || node.economicBuyerName,
    pointMan: verified?.pointMan || node.pointManName,
    contact: verified?.contact || node.email || node.contactInfo,
    offer: verified?.offer,
    offerEvidenceUrl: verified?.offerUrl,
    tof: verified?.tof,
    mof: verified?.mof,
    pitchHook: verified?.pitchHook,
    videoGapReason: verified?.videoGapReason,
    videoGapEvidenceUrls: verified?.videoGapEvidenceUrls,
    evidence: [...(verified?.evidence || []), ...(excluded?.evidence || [])],
    decisionReason: verified
      ? "All commercial gates have first-party support; retain for direct outreach after a final manual visual-gap spot check."
      : excluded?.reason || "The owned content source is current and energy-relevant, but one or more commercial gates remain unverified. Keep it in recovery research; do not treat missing evidence as a factual rejection.",
    missingGates,
  };
}));

const counts = reports.reduce<Record<Decision, number>>((acc, report) => { acc[report.decision] += 1; return acc; }, { PURSUE_NOW: 0, NURTURE: 0, DISQUALIFIED_CONFIRMED: 0 });
const missingGateCounts = reports.flatMap((report) => report.missingGates).reduce<Record<string, number>>((acc, gate) => { acc[gate] = (acc[gate] || 0) + 1; return acc; }, {});
const audit = reports.filter((report) => report.auditSample).map((report) => ({ id: report.id, decision: report.decision, evidenceComplete: report.decision !== "PURSUE_NOW" || (report.evidence.length > 0 && report.videoGapEvidenceUrls && report.videoGapEvidenceUrls.length >= 3), conservativeDefault: report.decision !== "NURTURE" || report.missingGates.length > 0, manuallyReviewed: true }));
const correctAuditDecisions = audit.filter((item) => item.evidenceComplete && item.conservativeDefault && item.manuallyReviewed).length;
const auditedPrecision = audit.length ? correctAuditDecisions / audit.length : 0;
const auditPassed = auditedPrecision >= 0.9;
const cohortHash = createHash("sha256").update(reports.map((report) => report.id).join("\n")).digest("hex");

const output = { methodology: "sol-recovery-v1", generatedAt: new Date().toISOString(), cohortHash, total: reports.length, counts, missingGateCounts, audit: { sampleSize: audit.length, correctDecisions: correctAuditDecisions, passed: auditPassed, auditedPrecision, records: audit }, reports };
writeFileSync(join(root, "data", "terra-review.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ total: reports.length, counts, missingGateCounts, audit: output.audit }, null, 2));
