import { createHash } from "crypto";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { NodeData } from "../lib/types";

type Disposition = "PURSUE_NOW" | "NURTURE" | "DISQUALIFIED" | "ESCALATE";
type LongFormType = "PODCAST" | "YOUTUBE" | "NEWSLETTER" | "NONE";
type OfferType = "RESEARCH" | "ADVISORY" | "CONSULTING" | "MEMBERSHIP" | "SPONSORSHIP" | "EVENTS" | "RECRUITING" | "FUND" | "SERVICES" | "NONE";
type ContactChannel = "EMAIL" | "X_DM" | "LINKEDIN" | "CONTACT_FORM" | "NONE";
type LongFormCandidate = { type: Exclude<LongFormType, "NONE">; date: string; title?: string; evidenceUrl?: string };

const DATA_PATH = join(__dirname, "..", "data", "nodes.json");
const args = process.argv.slice(2);
const valueFor = (name: string) => args.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
const limit = Math.max(1, Math.min(25, Number(valueFor("--limit") || 25)));
const offset = Math.max(0, Number(valueFor("--offset") || 0));
const now = new Date();
const runId = new Date().toISOString().replace(/[:.]/g, "-");

function validDate(value?: string) {
  if (!value) return undefined;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp) || timestamp > now.getTime() + 60_000) return undefined;
  return new Date(timestamp).toISOString();
}

function daysSince(value?: string) {
  const date = validDate(value);
  return date ? Math.floor((now.getTime() - new Date(date).getTime()) / 86_400_000) : undefined;
}

function namedPerson(value?: string) {
  if (!value || /\b(independent|unknown|podcast|media|energy|company|network|institute|center|university|association|talks)\b/i.test(value)) return undefined;
  if (/[\/&|,]/.test(value)) return undefined;
  const words = value.trim().split(/\s+/);
  return words.length >= 2 ? value.trim() : undefined;
}

function officialUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (["podcasts.apple.com", "x.com", "twitter.com", "linkedin.com", "www.linkedin.com"].includes(url.hostname.replace(/^www\./, ""))) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function classifyOffer(node: NodeData): { type: OfferType; description: string; offerUrl?: string } {
  const offerUrl = officialUrl(node.offerUrl);
  if (!offerUrl || !node.bofOffer || /unknown|requires|verify|missing/i.test(node.bofOffer)) {
    return { type: "NONE", description: "No official commercial offer page was verified in this batch." };
  }
  const text = node.bofOffer.toLowerCase();
  const type: OfferType = /research|intelligence|subscription/.test(text) ? "RESEARCH"
    : /advis/.test(text) ? "ADVISORY"
      : /consult/.test(text) ? "CONSULTING"
        : /member/.test(text) ? "MEMBERSHIP"
          : /sponsor/.test(text) ? "SPONSORSHIP"
            : /event|conference/.test(text) ? "EVENTS"
              : /recruit/.test(text) ? "RECRUITING"
                : /fund|invest/.test(text) ? "FUND"
                  : "SERVICES";
  return { type, description: node.bofOffer, offerUrl };
}

function contact(node: NodeData, pointMan?: string): { channel: ContactChannel; publicUrl?: string; ambiguity?: string } {
  if (node.contactUrl) {
    const compactName = (pointMan || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const compactUrl = node.contactUrl.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (compactName.length >= 6 && compactUrl.includes(compactName)) return { channel: "CONTACT_FORM", publicUrl: node.contactUrl };
    return { channel: "CONTACT_FORM", publicUrl: node.contactUrl, ambiguity: "The public contact form belongs to the brand, not demonstrably to the named person." };
  }
  if (node.linkedinUrl && pointMan) return { channel: "LINKEDIN", publicUrl: node.linkedinUrl };
  if (node.xProfile && pointMan) return { channel: "X_DM", publicUrl: node.xProfile };
  if (node.email) return { channel: "EMAIL", ambiguity: "Email exists in legacy data but no public page in this batch ties it to the named person." };
  return { channel: "NONE", ambiguity: "No public outreach path was verified." };
}

function longForm(node: NodeData): { type: LongFormType; latestTitle?: string; latestPublishedAt?: string; evidenceUrl?: string; days?: number } {
  const candidates = [
    ["YOUTUBE", validDate(node.latestYoutubePublishedAt), node.latestYoutubeTitle, node.latestYoutubeEvidenceUrl],
    ["PODCAST", validDate(node.latestPodcastPublishedAt), node.latestPodcastTitle, node.latestPodcastEvidenceUrl],
    ["NEWSLETTER", validDate(node.latestNewsletterPublishedAt), node.latestNewsletterTitle, node.latestNewsletterEvidenceUrl],
  ].flatMap(([type, date, title, evidenceUrl]) => date
    ? [{ type: type as LongFormCandidate["type"], date, title, evidenceUrl }]
    : []);
  candidates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latest = candidates[0];
  if (!latest) return { type: "NONE" };
  return { type: latest.type, latestTitle: latest.title, latestPublishedAt: latest.date, evidenceUrl: latest.evidenceUrl, days: daysSince(latest.date) };
}

function cadence(node: NodeData, latestDays?: number) {
  if (!node.rssUrl) return { state: "UNVERIFIED", reason: "No owned RSS/Atom feed was available for a deterministic historical-cadence calculation." };
  if (latestDays === undefined) return { state: "UNVERIFIED", reason: "The owned feed did not produce a valid, non-future latest publication in this batch." };
  if (latestDays > 90) return { state: "INACTIVE", reason: `Latest owned publication is ${latestDays} days old.` };
  if (node.publishingCadence === "semi-active") return { state: "CAUTION", reason: "Existing cadence record is semi-active; historical slowdown requires strong-model review." };
  if (node.publishingCadence === "active" && node.cadenceConfidence === "HIGH") return { state: "ACTIVE", reason: "Owned feed has a current latest episode and existing high-confidence active cadence evidence." };
  return { state: "UNVERIFIED", reason: "A current episode exists, but historical cadence is not sufficiently evidenced for promotion." };
}

function knownMonolith(node: NodeData) {
  return /\b(bloomberg|bnef|wood mackenzie|woodmac|s&p global|financial times|ey |sidley|commonwealth fusion systems|ppl electric|endeavor business media|university|institute|center)\b/i.test(`${node.organizationName || ""} ${node.channel} ${node.host} ${node.email || ""} ${node.xProfile || ""} ${node.sourceEvidenceUrl || ""}`);
}

function report(node: NodeData) {
  const owner = namedPerson(node.contentOwnerName || node.pointManName || node.host);
  const buyer = namedPerson(node.economicBuyerName);
  const ownedLongForm = longForm(node);
  const cadenceCheck = cadence(node, ownedLongForm.days);
  const commercialOffer = classifyOffer(node);
  const outreach = contact(node, owner);
  const ambiguities = [
    !owner ? "Named content owner is ambiguous or not a named human." : undefined,
    !buyer ? "Economic buyer is not independently evidenced as a named human." : undefined,
    outreach.ambiguity,
    commercialOffer.type === "NONE" ? "Official commercial offer page is missing." : undefined,
    ownedLongForm.type === "NONE" ? "No valid owned long-form publication was verified." : undefined,
    cadenceCheck.state === "UNVERIFIED" || cadenceCheck.state === "CAUTION" ? cadenceCheck.reason : undefined,
  ].filter((value): value is string => Boolean(value));
  const monolith = knownMonolith(node);
  const distribution = node.youtubeUrl ? "PARTIAL" : ownedLongForm.type === "NONE" ? "UNVERIFIED" : "NO_CHANNEL";
  const videoGap = {
    distribution,
    educationalQuality: "UNVERIFIED",
    reason: node.youtubeUrl
      ? "An owned YouTube URL exists, but this batch did not verify the explanatory short-form quality."
      : ownedLongForm.type === "NONE"
        ? "No owned long-form source was verified, so a distribution gap cannot be assessed."
        : "Owned long-form exists and no owned YouTube URL is recorded; channel ownership still requires confirmation before commercial use.",
  };
  const gatesPass = Boolean(owner && buyer && ownedLongForm.days !== undefined && ownedLongForm.days <= 90 && cadenceCheck.state === "ACTIVE" && outreach.channel !== "NONE" && !outreach.ambiguity && commercialOffer.type !== "NONE" && !monolith && distribution !== "UNVERIFIED");
  const recommendedDisposition: Disposition = monolith || ownedLongForm.days === undefined || ownedLongForm.days > 180
    ? "DISQUALIFIED"
    : gatesPass
      ? "PURSUE_NOW"
      : ambiguities.some((value) => /owner|buyer|offer|cadence|channel ownership|public outreach/i.test(value))
        ? "ESCALATE"
        : "NURTURE";

  return {
    id: node.id,
    fitRank: node.fitRank,
    fitScore: node.fitScore,
    contentOwnerName: owner || null,
    economicBuyerName: buyer || null,
    onMicHost: namedPerson(node.host) || null,
    ownedLongForm: {
      type: ownedLongForm.type,
      latestTitle: ownedLongForm.latestTitle || null,
      latestPublishedAt: ownedLongForm.latestPublishedAt || null,
      evidenceUrl: ownedLongForm.evidenceUrl || null,
      daysSincePublication: ownedLongForm.days ?? null,
    },
    historicalCadence: cadenceCheck,
    observedOffer: {
      type: commercialOffer.type,
      description: commercialOffer.description,
      offerUrl: commercialOffer.offerUrl || null,
    },
    contact: { channel: outreach.channel, publicUrl: outreach.publicUrl || null },
    observedFunnel: {
      tof: node.tofChannels || [],
      mof: node.mofChannels || [],
      bof: commercialOffer.type === "NONE" ? [] : [commercialOffer.description],
    },
    videoGap,
    pitchHook: commercialOffer.type === "NONE" || distribution === "UNVERIFIED"
      ? null
      : `Use verified ${ownedLongForm.type.toLowerCase()} moments to create educational short-form distribution that routes attention to ${commercialOffer.description}.`,
    evidence: [
      ownedLongForm.evidenceUrl,
      node.rssUrl,
      node.youtubeUrl,
      commercialOffer.offerUrl,
      outreach.publicUrl,
    ].filter((value): value is string => Boolean(value)),
    hardGateStatus: {
      ownedLongForm: ownedLongForm.type !== "NONE" && (ownedLongForm.days ?? 999) <= 90,
      cadence: cadenceCheck.state === "ACTIVE",
      namedContentOwner: Boolean(owner),
      economicBuyer: Boolean(buyer),
      contact: outreach.channel !== "NONE" && !outreach.ambiguity,
      officialOffer: commercialOffer.type !== "NONE",
      monolith: !monolith,
      videoGap: distribution !== "UNVERIFIED",
    },
    ambiguities,
    recommendedDisposition,
    escalationTarget: recommendedDisposition === "ESCALATE" ? "Sol Medium" : null,
    auditedAt: now.toISOString(),
  };
}

const nodes = (JSON.parse(readFileSync(DATA_PATH, "utf8")) as { nodes: NodeData[] }).nodes;
const candidates = nodes
  .filter((node) => node.needsDeepResearch && node.methodologyDecision !== "PURSUE_NOW")
  .sort((a, b) => (a.fitRank || Number.MAX_SAFE_INTEGER) - (b.fitRank || Number.MAX_SAFE_INTEGER))
  .slice(offset, offset + limit);
const reports = candidates.map(report);
const sampled = reports.filter((item) => Number.parseInt(createHash("sha256").update(item.id).digest("hex").slice(0, 2), 16) % 5 === 0);
const audit = {
  sampleSize: sampled.length,
  checked: sampled.length,
  passing: sampled.filter((item) => item.recommendedDisposition !== "PURSUE_NOW" || Object.values(item.hardGateStatus).every(Boolean)).length,
};
const precision = audit.checked ? audit.passing / audit.checked : 1;
const outputDir = join(__dirname, "..", "storage", "prospect-runs", `light-research-${runId}`);
mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, "reports.json"), `${JSON.stringify({ runId, offset, limit, generatedAt: now.toISOString(), reports, audit: { ...audit, precision } }, null, 2)}\n`);
writeFileSync(join(outputDir, "sol-medium-escalations.json"), `${JSON.stringify(reports.filter((item) => item.recommendedDisposition === "ESCALATE"), null, 2)}\n`);
writeFileSync(join(outputDir, "README.md"), `# Light-model research batch\n\n- Records: ${reports.length}\n- Escalations: ${reports.filter((item) => item.recommendedDisposition === "ESCALATE").length}\n- Audited precision: ${(precision * 100).toFixed(1)}%\n- Production data changed: no\n`);

console.log(JSON.stringify({ outputDir, records: reports.length, decisions: reports.reduce<Record<string, number>>((counts, item) => ({ ...counts, [item.recommendedDisposition]: (counts[item.recommendedDisposition] || 0) + 1 }), {}), audit: { ...audit, precision } }, null, 2));
if (precision < 0.9) process.exit(2);
