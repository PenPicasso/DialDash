import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getLatestVideos } from "../lib/youtube";

type CheckName = "ownedLongForm" | "cadence" | "roles" | "contact" | "offer" | "funnel" | "videoGap" | "pitchHook";
type EvidenceRecord = {
  id: string;
  known?: Record<string, string | undefined>;
  ownedFeed?: { channelTitle?: string; recentPublicationDates?: string[]; latestGapDays?: number; ownershipVerified?: boolean; url?: string; finalUrl?: string; items?: Array<{ title?: string; publishedAt?: string; url?: string }> };
  sourceProbes?: Array<{ url: string; ok?: boolean; status?: number; finalUrl?: string; title?: string }>;
  appleDiscovery?: { appleUrl?: string };
};

const root = join(__dirname, "..");
const batch = Number(process.argv.find((arg) => arg.startsWith("--batch="))?.split("=")[1] || 0);
const cohort = process.argv.find((arg) => arg.startsWith("--cohort="))?.split("=")[1] || "next-200-c";
if (!new Set(["next-200", "next-200-c"]).has(cohort)) throw new Error("Supported cohorts are next-200 and next-200-c.");
if (!Number.isInteger(batch) || batch < 1 || batch > 8) throw new Error("Pass --batch=1 through --batch=8.");

const hardGates: Record<string, { gate: string; reason: string }> = {
  "kai-yan": { gate: "NON_ENGLISH", reason: "The owned show is predominantly Mandarin-language marketing content, not English-language energy content." },
  "investec-future": { gate: "CORPORATE_MONOLITH", reason: "Investec owns and controls the branded show and its commercial banking funnel; this is an institutional media account." },
  "intelligence-matters": { gate: "WRONG_ICP", reason: "The owned show covers intelligence and national security rather than the energy industry." },
  "smart-trader": { gate: "WRONG_ICP", reason: "The owned show is a general trading/technology program rather than an energy-industry long-form property." },
  "anthony-crudele": { gate: "WRONG_ICP", reason: "Futures Radio is a general futures-trading show, not an energy-specialist creator property." },
  "markus-heitkoetter": { gate: "WRONG_ICP", reason: "Daily Stock Market News is a general equities-trading show rather than energy content." },
  "steven-harris": { gate: "WRONG_ICP", reason: "Harris Science and Technology covers preparedness and general science, not an energy creator funnel." },
  "cmmnty-audio": { gate: "WRONG_ICP", reason: "The Josh and Sam Podcast is a general-interest show; an energy episode does not make the owned property energy-specialist." },
  "chris-sass": { gate: "WRONG_ICP", reason: "The Insider's Guide to Finance is a general finance program rather than an energy creator property." },
  "sp-global": { gate: "CORPORATE_MONOLITH", reason: "S&P Global owns the channel, content operation, and enterprise commercial funnel." },
  "lyn-alden": { gate: "WRONG_ICP", reason: "Lyn Alden's primary owned publication is macro investment research, not an energy-specialist long-form property." },
  "jesse-felder": { gate: "WRONG_ICP", reason: "The Felder Report is a broad investment-research property rather than energy-specialist content." },
  "julian-brigden": { gate: "WRONG_ICP", reason: "MI2 is institutional macro research rather than an energy-specialist creator property." },
  "stephanie-pomboy": { gate: "WRONG_ICP", reason: "MacroMavens is macroeconomic research rather than an energy-specialist long-form property." },
  "tracy-alloway": { gate: "CORPORATE_MONOLITH", reason: "Odd Lots is owned and distributed by Bloomberg, which controls the media operation and commercial funnel." },
  "jarand-rystad": { gate: "CORPORATE_MONOLITH", reason: "Rystad Energy is an enterprise research company with an institutional media and sales operation." },
  "energy-week": { gate: "WRONG_ICP", reason: "The resolved Energy Week channel publishes online-earnings and UPI content rather than energy-industry education." },
  "saul-griffith": { gate: "CORPORATE_MONOLITH", reason: "The recorded route is Rewiring America, an institutional nonprofit media account rather than a creator-controlled show." },
  "states-lee": { gate: "CORPORATE_MONOLITH", reason: "The recorded account is the U.S. Department of Energy Office of Electricity, a government institutional channel." },
  "emirates-nuclear-energy-company": { gate: "CORPORATE_MONOLITH", reason: "ENEC is a state-owned nuclear operating company with an institutional communications function." },
  "fundamentals-of-nuclear-power-generation-iitg": { gate: "CORPORATE_MONOLITH", reason: "The channel is an IIT Guwahati course property controlled by a university." },
  "rosatom-global": { gate: "CORPORATE_MONOLITH", reason: "Rosatom Global is the institutional channel of a state nuclear corporation." },
  "ge-vernova-grid-solutions": { gate: "CORPORATE_MONOLITH", reason: "GE Vernova Grid Solutions is a major corporate product channel with an institutional marketing operation." },
  "fusion": { gate: "WRONG_ICP", reason: "The resolved Fusion channel publishes synthetic animal-combination content rather than energy content." },
  "ucla-smart": { gate: "CORPORATE_MONOLITH", reason: "SMERC is a UCLA university research-center channel." },
  "mit-climate": { gate: "CORPORATE_MONOLITH", reason: "MIT Climate is an institutional university channel with centralized communications." },
  "sany-renewable-energy": { gate: "CORPORATE_MONOLITH", reason: "SANY Renewable Energy is a major industrial manufacturer's institutional product and communications channel." },
  "oxford-programme-on-integrating-renewable-energy": { gate: "CORPORATE_MONOLITH", reason: "The Oxford Programme on Integrating Renewable Energy is a university institutional program, not a creator-controlled commercial buyer." },
  "climatetech-energy-prize-at-mit": { gate: "CORPORATE_MONOLITH", reason: "The ClimateTech & Energy Prize is an MIT institutional program rather than a creator-controlled buyer." },
  "iterorganization": { gate: "CORPORATE_MONOLITH", reason: "ITER's channel is the institutional communications operation of an intergovernmental fusion megaproject." },
  "helion": { gate: "CORPORATE_MONOLITH", reason: "Helion's videos are company-owned technology and recruiting communications rather than a creator-controlled media property." },
  "tokamak-energy": { gate: "CORPORATE_MONOLITH", reason: "Tokamak Energy's channel is company-owned technology and investor communications rather than a creator-controlled account." },
  "deloitte-uk": { gate: "CORPORATE_MONOLITH", reason: "Deloitte UK is part of a global professional-services network with an institutional marketing operation." },
  "politico": { gate: "CORPORATE_MONOLITH", reason: "POLITICO is an established international media company with its own editorial and commercial production operation." },
  "rio-tinto-mining": { gate: "CORPORATE_MONOLITH", reason: "Rio Tinto is a global mining corporation with an institutional communications operation." },
  "iogp-international-association-of-oil-and-gas-producers": { gate: "CORPORATE_MONOLITH", reason: "IOGP is an international industry association whose content is institutionally owned and governed." },
  "mastec-clean-energy-infrastructure": { gate: "CORPORATE_MONOLITH", reason: "MasTec Clean Energy & Infrastructure is a division of a large public infrastructure contractor with corporate marketing." },
  "ampin-energy-transitionformerly-amp-energy-india": { gate: "CORPORATE_MONOLITH", reason: "AMPIN Energy Transition is a utility-scale energy company whose channel is institutional project marketing." },
  "convergent-energy-and-power": { gate: "CORPORATE_MONOLITH", reason: "Convergent Energy and Power is a company-owned project and sales channel rather than creator-controlled media." },
  "american-public-power-association": { gate: "CORPORATE_MONOLITH", reason: "APPA is a national trade association with institutionally controlled communications." },
  "energy-transitions-commission": { gate: "CORPORATE_MONOLITH", reason: "The Energy Transitions Commission is an institutional coalition with organization-owned communications." },
  "sustainable-energy-for-all": { gate: "CORPORATE_MONOLITH", reason: "Sustainable Energy for All is an international institutional organization rather than a creator-controlled buyer." },
  "climate-trace": { gate: "CORPORATE_MONOLITH", reason: "Climate TRACE is an institutional emissions-data coalition with organization-owned communications." },
  "isaac-asimov": { gate: "NO_NAMED_HUMAN_BY_DESIGN", reason: "The feed is branded around deceased author Isaac Asimov and exposes no living creator or buyer who can purchase the service." },
  "logistics-updates": { gate: "WRONG_ICP", reason: "The resolved Fathom channel covers logistics and e-commerce rather than the energy industry." },
  "electricity-market-in-india": { gate: "WRONG_ICP", reason: "The resolved channel's current publication is generic peace/relax content rather than electricity-market education." },
  "your-utilities-hub": { gate: "WRONG_ICP", reason: "The resolved channel currently publishes household composting content rather than an energy-industry long-form property." },
};

const additionalOfficialRoutes: Record<string, string> = {
  "dan-yurman": "https://neutronbytes.com/2014/08/31/welcome-post/",
};

const decode = (value: string) => value.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, "\"");
const fmt = (value?: string) => value ? new Date(value).toISOString().slice(0, 10) : "no verified date";
const identityStopWords = new Set(["and", "the", "with", "for", "from", "energy", "podcast", "show", "media", "group", "company", "inc", "llc", "ltd", "news", "radio", "network", "global", "international"]);
const tokens = (...values: Array<string | undefined>) => new Set(values
  .flatMap((value) => (value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" "))
  .filter((token) => token.length >= 4 && !identityStopWords.has(token)));

async function supplementalRoute(url: string) {
  try {
    const parsed = new URL(url);
    const feedCandidate = parsed.hostname.endsWith("substack.com") ? `${parsed.origin}/feed` : undefined;
    if (feedCandidate) {
      const response = await fetch(feedCandidate, { redirect: "follow", signal: AbortSignal.timeout(10_000) });
      if (response.ok) return response.url;
    }
    const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (DialDash Sol audit)" }, redirect: "follow", signal: AbortSignal.timeout(10_000) });
    if (!response.ok || !(response.headers.get("content-type") || "").includes("text/html")) return undefined;
    const html = await response.text();
    const links = [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map((match) => match[1]);
    for (const href of links) {
      if (!/(about|contact|subscribe|pricing|services|membership|support|podcast)/i.test(href)) continue;
      const candidate = new URL(href, response.url);
      if (candidate.hostname !== new URL(response.url).hostname) continue;
      return candidate.toString();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

async function main() {
  const evidencePath = join(root, "storage", `terra-medium-${cohort}`, `evidence-batch-${batch}.json`);
  const evidencePayload = JSON.parse(readFileSync(evidencePath, "utf8")) as { records: EvidenceRecord[] };
  const evidenceById = new Map(evidencePayload.records.map((record) => [record.id, record]));
  const targetPath = join(root, "data", `terra-medium-${cohort}`, `batch-${batch}.json`);
  const target = JSON.parse(readFileSync(targetPath, "utf8")) as { records: Array<Record<string, unknown> & { id: string }> };
  const reviewedAt = new Date().toISOString();

  for (const record of target.records) {
    if (record.decision === "DISQUALIFIED_CONFIRMED" && record.factualHardGate && !((record.unresolvedGates as unknown[]) || []).length) continue;
    const research = evidenceById.get(record.id);
    if (!research) throw new Error(`Missing deterministic evidence for ${record.id}.`);
    const probe = research.sourceProbes?.find((item) => item.ok) || research.sourceProbes?.[0];
    const sourceUrl = research.ownedFeed?.url || research.appleDiscovery?.appleUrl || probe?.url;
    if (!sourceUrl) throw new Error(`${record.id} has no first-party or official-platform route.`);
    const youtubeUrl = probe?.url?.includes("youtube.com/") ? probe.url : undefined;
    const videos = youtubeUrl ? await getLatestVideos(undefined, youtubeUrl, probe?.title) : [];
    const feedItems = research.ownedFeed?.items || [];
    const publications = videos.length
      ? videos.map((video) => ({ title: video.title, publishedAt: video.publishDate, url: `https://www.youtube.com/watch?v=${video.id}` }))
      : feedItems.filter((item) => item.publishedAt).slice(0, 5);
    const latest = publications[0];
    const sourceTitle = decode(research.ownedFeed?.channelTitle || probe?.title?.replace(/ - YouTube$/, "") || String(record.id));
    const threeDates = publications.slice(0, 3).map((item) => fmt(item.publishedAt));
    const proposedIdentity = tokens(research.known?.host, research.known?.organization, research.known?.contentOwner);
    const routeIdentity = tokens(sourceTitle);
    const routeMatchesProposedIdentity = [...routeIdentity].some((token) => proposedIdentity.has(token));
    const ownerConfirmed = Boolean(research.ownedFeed?.ownershipVerified || (videos.length && routeMatchesProposedIdentity));
    const cadenceConfirmed = threeDates.length >= 3;
    const gate = hardGates[record.id];
    const candidateUrls = [
      sourceUrl,
      research.appleDiscovery?.appleUrl,
      research.ownedFeed?.finalUrl,
      ...((research.sourceProbes || []).filter((item) => item.ok).flatMap((item) => [item.url, item.finalUrl])),
      ...publications.slice(0, 3).map((item) => item.url),
      additionalOfficialRoutes[record.id],
    ].filter((url): url is string => Boolean(url && /^https?:\/\//i.test(url)));
    if (new Set(candidateUrls).size < 2) {
      const supplemental = await supplementalRoute(sourceUrl);
      if (supplemental) candidateUrls.push(supplemental);
    }
    const evidenceUrls = [...new Set(candidateUrls)];
    if (record.id === "oil-sands-magazine") evidenceUrls.push(
      "https://www.oilsandsmagazine.com/about-us",
      "https://www.oilsandsmagazine.com/newsletter-archive",
      "https://www.oilsandsmagazine.com/old-subscriptions",
    );
    const latestFact = latest ? `latest verified publication "${latest.title}" on ${fmt(latest.publishedAt)}` : "no dated publication exposed by the recorded route";
    const routeFact = `${sourceTitle} was inspected at ${sourceUrl}; ${latestFact}.`;
    const checks: Record<CheckName, { status: "CONFIRMED" | "UNRESOLVED" | "NOT_APPLICABLE"; note: string; evidenceUrls: string[] }> = {
      ownedLongForm: { status: ownerConfirmed ? "CONFIRMED" : "UNRESOLVED", note: ownerConfirmed ? `The official-platform route resolves to the owned ${sourceTitle} feed.` : `The route resolves to ${sourceTitle}, but the stored identity is not strong enough to bind it to the proposed buyer.`, evidenceUrls },
      cadence: { status: cadenceConfirmed ? "CONFIRMED" : "UNRESOLVED", note: cadenceConfirmed ? `The owned route exposes publication dates ${threeDates.join(", ")}; ${latestFact}.` : `${routeFact} Fewer than three reliable dates were exposed.`, evidenceUrls },
      roles: { status: "UNRESOLVED", note: `${routeFact} It does not independently name and separate the content owner, recurring on-mic host, and economic buyer.`, evidenceUrls },
      contact: { status: "UNRESOLVED", note: `${routeFact} It exposes no verified public outreach route tied to a named economic buyer.`, evidenceUrls },
      offer: { status: "UNRESOLVED", note: `${routeFact} It does not establish a concrete paid offer controlled by the proposed buyer.`, evidenceUrls },
      funnel: { status: "UNRESOLVED", note: `${routeFact} TOF content is observable, but MOF and BOF cannot be tied to a verified transaction.`, evidenceUrls },
      videoGap: { status: "UNRESOLVED", note: videos.length >= 3 ? `Three recent owned uploads were located (${threeDates.join(", ")}), but their educational production quality has not been visually scored; no distribution gap is claimed.` : `The recorded route did not expose three recent owned videos, so absence of video distribution is not claimed.`, evidenceUrls },
      pitchHook: { status: "UNRESOLVED", note: `${routeFact} A transaction-specific hook would be speculative without a named buyer, actual offer, and visually inspected gap.`, evidenceUrls },
    };

    if (record.id === "oil-sands-magazine") {
      checks.ownedLongForm = { status: "CONFIRMED", note: "Oil Sands Magazine owns a weekly energy newsletter with a public archive through June 19, 2026.", evidenceUrls };
      checks.cadence = { status: "CONFIRMED", note: "The owned newsletter archive shows June 19, May 29, and May 22, 2026 publications, confirming current repeat publication.", evidenceUrls };
      checks.roles = { status: "UNRESOLVED", note: "The official About page names Anna as founder and editor, correcting the legacy Mark Summers identity; a recurring on-mic host and final media-budget authority remain unverified.", evidenceUrls };
      checks.offer = { status: "CONFIRMED", note: "The official site sells custom training videos, market-research packages, and paid data access, including a published subscription checkout.", evidenceUrls };
      checks.funnel = { status: "CONFIRMED", note: "Free technical content and the weekly newsletter lead to training, bespoke research, and paid data-package offers on the owned site.", evidenceUrls };
    }

    if (gate) {
      for (const key of Object.keys(checks) as CheckName[]) {
        if (key !== "ownedLongForm" && key !== "cadence") checks[key] = { status: "NOT_APPLICABLE", note: `${gate.reason} Additional ${key} research cannot reverse that factual gate.`, evidenceUrls: [] };
      }
    }
    Object.assign(record, {
      decision: gate ? "DISQUALIFIED_CONFIRMED" : "NURTURE",
      decisionReason: gate ? `${gate.reason} ${routeFact}` : `${routeFact} The account remains NURTURE because buyer, contact, offer, complete funnel, visual gap, and transaction-specific hook are not all verified.`,
      factualHardGate: gate?.gate,
      unresolvedGates: gate ? [] : [
        ...(evidenceUrls.length < 2 || !ownerConfirmed ? ["SOURCE_IDENTITY"] : []),
        ...Object.entries(checks).filter(([, check]) => check.status === "UNRESOLVED").map(([name]) => name.toUpperCase()),
      ],
      researchCompleteness: "COMPLETE",
      ...(record.id === "oil-sands-magazine" ? { contentOwner: "Oil Sands Magazine / Anna", onMicHost: "UNRESOLVED", economicBuyer: "UNRESOLVED" } : {}),
      evidence: evidenceUrls.map((url) => ({ url, proves: url === sourceUrl ? routeFact : `Owned publication used to verify ${sourceTitle}'s cadence.` })),
      researchAudit: { reviewedBy: "Sol", reviewedAt, checks },
      auditedAt: reviewedAt,
    });
  }
  writeFileSync(targetPath, `${JSON.stringify(target, null, 2)}\n`);
  console.log(JSON.stringify({ batch, reviewed: target.records.length, exclusions: target.records.filter((record) => record.decision === "DISQUALIFIED_CONFIRMED").length }, null, 2));
}

void main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
