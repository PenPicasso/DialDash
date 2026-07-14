import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

type Decision = "PURSUE_NOW" | "NURTURE" | "DISQUALIFIED_CONFIRMED";
type GapType = "NO_OWNED_CHANNEL" | "MINIMAL" | "WEAK_QUALITY";
type Evidence = { url: string; proves: string };
type ManifestRecord = {
  id: string;
  batch: number;
  auditSample: boolean;
  fitRank?: number;
  fitScore?: number;
  host: string;
  organization?: string;
  known: Record<string, string | undefined>;
  freshness: {
    rss?: SourceFeed;
    youtubeFeed?: SourceFeed;
    appleDiscovery?: { ok: boolean; lookupUrl?: string; appleUrl?: string; feedUrl?: string };
    youtubePublishedAt?: string;
    youtubeEvidenceUrl?: string;
    podcastPublishedAt?: string;
    podcastEvidenceUrl?: string;
  };
};

type Cadence = {
  status: "ACTIVE" | "SEMI_ACTIVE" | "SLOWED" | "INACTIVE" | "UNVERIFIED";
  latestGapDays?: number;
  medianIntervalDays?: number;
  slowdownRatio?: number;
  observedPublications: number;
};
type SourceFeed = { ok: boolean; url: string; title?: string; latestTitle?: string; latestPublishedAt?: string; energyTitleCount?: number; cadence?: Cadence };

type Pursue = {
  buyer: string;
  pointMan: string;
  contact: string;
  contactUrl: string;
  offer: string;
  offerUrl: string;
  tof: string[];
  mof: string[];
  bof: string[];
  pitchHook: string;
  gapType: GapType;
  videoGapReason: string;
  videoGapEvidenceUrls: string[];
  evidence: Evidence[];
};

const root = join(__dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "storage", "sol-round-2", "manifest.json"), "utf8")) as { records: ManifestRecord[]; cohortHash: string };
const now = Date.now();

const pursue: Record<string, Pursue> = {
  "emmet-penney": {
    buyer: "Emmet Penney", pointMan: "Emmet Penney", contact: "emmet@gridbrief.com", contactUrl: "https://www.gridbrief.com/p/about",
    offer: "Paid Grid Brief research subscription and paid Nuclear Barbarians subscription.", offerUrl: "https://www.gridbrief.com/p/announcing-grid-brief-premium",
    tof: ["X", "guest appearances", "free newsletter"], mof: ["Nuclear Barbarians podcast", "Grid Brief newsletter"], bof: ["Grid Brief Premium", "paid Nuclear Barbarians subscription"],
    pitchHook: "Turn each reactor, grid and fuel-cycle interview into sober visual explainers with plant maps, reactor diagrams and persistent figures, then route that attention into Grid Brief Premium and the paid Nuclear Barbarians subscription.",
    gapType: "NO_OWNED_CHANNEL", videoGapReason: "Owned weekly podcast and newsletters are current, while a matched YouTube search returned guest appearances rather than an owned distribution channel.", videoGapEvidenceUrls: ["https://podcasts.apple.com/us/podcast/nuclear-barbarians/id1590198129"],
    evidence: [{ url: "https://www.gridbrief.com/p/announcing-grid-brief-premium", proves: "Emmet explicitly sells a monthly premium energy-research subscription." }, { url: "https://podcasts.apple.com/us/podcast/nuclear-barbarians/id1590198129", proves: "The official listing names Emmet as creator and shows weekly owned long-form through 2026." }],
  },
  "giles-parkinson": {
    buyer: "Giles Parkinson", pointMan: "Giles Parkinson", contact: "Official Giles author email", contactUrl: "https://reneweconomy.com.au/author/giles/",
    offer: "Advertising and audience access across RenewEconomy and its podcast portfolio.", offerUrl: "https://reneweconomy.com.au/about/",
    tof: ["RenewEconomy news", "X", "newsletter", "basic Shorts"], mof: ["Energy Insiders", "Solar Insiders", "The Driven podcast"], bof: ["advertising enquiry"],
    pitchHook: "Upgrade Energy Insiders moments from captioned studio cuts into visual Australian-grid explainers with state maps, market-price overlays and project locations, then point viewers to RenewEconomy's advertiser proposition.",
    gapType: "WEAK_QUALITY", videoGapReason: "Three inspected Shorts are clean captioned studio excerpts but add no maps, charts, project imagery or persistent supporting figures.", videoGapEvidenceUrls: ["https://www.youtube.com/shorts/OdaRDZUjIXg", "https://www.youtube.com/shorts/cNr8xERVb2w", "https://www.youtube.com/shorts/F9U4E6Je_Sw"],
    evidence: [{ url: "https://reneweconomy.com.au/about/", proves: "Giles founded and still owns the publisher, which explicitly operates an advertising model and four podcasts." }, { url: "https://reneweconomy.com.au/author/giles/", proves: "The official profile identifies Giles as founder, editor-in-chief and Energy Insiders co-host and exposes direct contact." }],
  },
  "peter-tertzakian": {
    buyer: "Peter Tertzakian", pointMan: "Peter Tertzakian", contact: "think@studio.energy", contactUrl: "https://studio.energy/our-founder",
    offer: "Paid speaking and booking engagements plus books and the Energyphile platform.", offerUrl: "https://studio.energy/our-founder",
    tof: ["ARC commentary", "X", "existing Shorts"], mof: ["ARC Energy Ideas podcast", "Studio.Energy", "Energyphile"], bof: ["request to book Peter", "book purchase"],
    pitchHook: "Turn ARC Energy Ideas into map- and data-led clips about Canadian assets, pipelines and market structure, then route qualified attention to Peter's speaking booking and Energyphile products.",
    gapType: "WEAK_QUALITY", videoGapReason: "Three inspected Shorts rely on talking heads, captions or a quote card; they do not consistently visualize assets, geography or market data.", videoGapEvidenceUrls: ["https://www.youtube.com/shorts/odaUhsV7pX4", "https://www.youtube.com/shorts/RdMIyeJDiVQ", "https://www.youtube.com/shorts/HpQmbS4lE2c"],
    evidence: [{ url: "https://studio.energy/our-founder", proves: "Peter's official founder page provides a booking CTA, books and direct email." }, { url: "https://www.arcenergyinstitute.com/section/arc-energy-ideas/", proves: "The official institute page shows current Peter-led energy commentary." }],
  },
  "green-insider": {
    buyer: "Mike Nemer", pointMan: "Mike Nemer", contact: "info@erenewable.com", contactUrl: "https://erenewable.com/about-us-2/",
    offer: "Renewable procurement, PPA/VPPA, energy-efficiency and advisory services plus podcast sponsorship.", offerUrl: "https://erenewable.com/services/",
    tof: ["LinkedIn", "newsletter", "guest clips"], mof: ["The Green Insider podcast", "ESG education"], bof: ["services enquiry", "podcast sponsorship"],
    pitchHook: "Convert Green Insider interviews into project explainers with PPA flows, asset maps and procurement checklists, then route buyers to eRENEWABLE's advisory services and sponsor enquiry.",
    gapType: "NO_OWNED_CHANNEL", videoGapReason: "The current owned podcast has no matched owned YouTube channel; search results are guest-hosted appearances and unavailable legacy uploads.", videoGapEvidenceUrls: ["https://erenewable.com/debut-episode-of-the-green-insider-podcast-special-guest-mike-nemer/"],
    evidence: [{ url: "https://erenewable.com/about-us-2/", proves: "The official page names Mike as founder/CEO and provides direct business contact." }, { url: "https://erenewable.com/debut-episode-of-the-green-insider-podcast-special-guest-mike-nemer/", proves: "The official show page connects the podcast to eRENEWABLE and explicitly offers sponsorship." }],
  },
  "mike-mauceli": {
    buyer: "Mike Mauceli", pointMan: "Mike Mauceli", contact: "contact@reienergy.com", contactUrl: "https://www.reienergy.com/about_us",
    offer: "Oil and gas investment partnerships and investor services.", offerUrl: "https://www.reienergy.com/about_us",
    tof: ["guest YouTube distribution", "energy commentary"], mof: ["The Energy Show podcast"], bof: ["REI investment partnership enquiry"],
    pitchHook: "Turn each oil-market interview into restrained basin maps, production curves and tax-structure explainers, then route qualified viewers from The Energy Show into REI's investor enquiry path.",
    gapType: "NO_OWNED_CHANNEL", videoGapReason: "The owned podcast is current, but its YouTube distribution is hosted by the external Rich Dad channel rather than an owned Mike/REI channel.", videoGapEvidenceUrls: ["https://podcasts.apple.com/gb/podcast/the-energy-show/id1454826451"],
    evidence: [{ url: "https://www.reienergy.com/about_us", proves: "The official site describes REI's investment partnerships and gives its business contact." }, { url: "https://podcasts.apple.com/gb/podcast/the-energy-show/id1454826451", proves: "The official listing identifies Mike as creator and CEO and shows current episodes." }],
  },
  "david-roberts": {
    buyer: "David Roberts", pointMan: "David Roberts", contact: "david@volts.wtf", contactUrl: "https://www.volts.wtf/p/welcome-to-volts",
    offer: "Paid Volts newsletter and podcast subscription.", offerUrl: "https://www.volts.wtf/subscribe",
    tof: ["X", "free newsletter", "guest appearances"], mof: ["Volts podcast", "deep-dive newsletter", "community"], bof: ["paid Volts subscription"],
    pitchHook: "Turn Volts interviews into Vox-style policy and technology explainers with diagrams, maps and numbers that preserve David's nuance, then route every clip to the paid Volts subscription.",
    gapType: "NO_OWNED_CHANNEL", videoGapReason: "Volts publishes current owned audio and newsletters, but matched YouTube results were guest appearances rather than an owned Volts distribution channel.", videoGapEvidenceUrls: ["https://www.volts.wtf/"],
    evidence: [{ url: "https://www.volts.wtf/p/welcome-to-volts", proves: "David identifies himself as owner, provides direct email and explains paid subscriber support." }, { url: "https://www.volts.wtf/", proves: "The official publication presents the current newsletter, podcast and community funnel." }],
  },
  "tisha-schuller": {
    buyer: "Tisha Schuller", pointMan: "Tisha Schuller", contact: "info@energythinks.com", contactUrl: "https://energythinks.com/services/real-time-strategic-insights/",
    offer: "Strategic energy advisory, risk assessment, policy analysis and executive insight services.", offerUrl: "https://energythinks.com/services/real-time-strategic-insights/",
    tof: ["LinkedIn", "weekly newsletter", "guest appearances"], mof: ["C.O.B. Tuesday podcast", "Both of These Things Are True"], bof: ["strategic advisory enquiry"],
    pitchHook: "Turn C.O.B. Tuesday conversations into executive-grade policy explainers with regulatory timelines, stakeholder maps and decision summaries, then route attention to Adamantine's advisory enquiry.",
    gapType: "NO_OWNED_CHANNEL", videoGapReason: "The current owned podcast has no matched owned video channel; the prominent YouTube result is an appearance on Veriten's channel.", videoGapEvidenceUrls: ["https://energythinks.com/services/real-time-strategic-insights/"],
    evidence: [{ url: "https://energythinks.com/services/real-time-strategic-insights/", proves: "The official service page names Tisha, specifies advisory deliverables and exposes email and phone contact." }],
  },
  "wes-ashworth": {
    buyer: "Wes Ashworth", pointMan: "Wes Ashworth", contact: "Official Lee Group Search contact", contactUrl: "https://leegroupsearch.com/meet-the-team/wes-ashworth/",
    offer: "Renewable-energy executive search and recruiting engagements.", offerUrl: "https://leegroupsearch.com/renewable-energy-and-cleantech/",
    tof: ["LinkedIn", "existing captioned Shorts"], mof: ["Green Giants podcast", "renewable workforce content"], bof: ["executive search enquiry"],
    pitchHook: "Upgrade Green Giants clips from captioned talking heads into visual workforce explainers with project locations, role shortages and hiring numbers, then route clean-energy employers to Lee Group Search.",
    gapType: "WEAK_QUALITY", videoGapReason: "Three inspected Shorts use clear hooks and captions but remain talking-head cuts without maps, project imagery, diagrams or persistent numerical evidence.", videoGapEvidenceUrls: ["https://www.youtube.com/shorts/QT_ChxslMa8", "https://www.youtube.com/shorts/jOPkFxwCFxc", "https://www.youtube.com/shorts/L3W1ecpf5NY"],
    evidence: [{ url: "https://leegroupsearch.com/meet-the-team/wes-ashworth/", proves: "The official page identifies Wes as President of Executive Search and links a client contact path." }, { url: "https://leegroupsearch.com/renewable-energy-and-cleantech/", proves: "The official offer is renewable and cleantech recruiting." }],
  },
  "laurent-segalen": {
    buyer: "Laurent Segalen", pointMan: "Laurent Segalen", contact: "info@megawatt-x.com", contactUrl: "https://www.megawatt-x.com/",
    offer: "Energy-transition investment, transaction and advisory services through Megawatt-X.", offerUrl: "https://www.megawatt-x.com/",
    tof: ["X", "LinkedIn", "conference appearances"], mof: ["Redefining Energy podcast", "specialist series"], bof: ["Megawatt-X transaction enquiry"],
    pitchHook: "Turn Redefining Energy discussions into investment-grade explainers with asset maps, deal structures and market numbers, then route decision-makers to Megawatt-X.",
    gapType: "NO_OWNED_CHANNEL", videoGapReason: "The current twice-monthly owned podcast has no matched owned YouTube channel; search results are appearances on third-party channels.", videoGapEvidenceUrls: ["https://podcasts.apple.com/gb/podcast/redefining-energy/id1439197083"],
    evidence: [{ url: "https://podcasts.apple.com/gb/podcast/redefining-energy/id1439197083", proves: "The official listing names Laurent as co-owner/host and shows current publication." }, { url: "https://www.megawatt-x.com/", proves: "Laurent's operating company provides the real commercial transaction and contact path." }],
  },
  "libbe-halevy": {
    buyer: "Libbe HaLevy", pointMan: "Libbe HaLevy", contact: "info@nuclearhotseat.com", contactUrl: "https://nuclearhotseat.com/about/",
    offer: "Recurring donations, book sales and audience-supported anti-nuclear media.", offerUrl: "https://nuclearhotseat.com/donate/",
    tof: ["newsletter", "minimal YouTube", "syndicated radio"], mof: ["weekly Nuclear Hotseat podcast"], bof: ["one-time or recurring donation", "book purchase"],
    pitchHook: "Turn the weekly nuclear-news magazine into clear location-led clips with facility maps, timelines and named-source callouts, then route supporters to recurring donations and Libbe's book.",
    gapType: "MINIMAL", videoGapReason: "The owned channel is current but exposes only one visible Short, so weekly audio is not receiving systematic video distribution.", videoGapEvidenceUrls: ["https://www.youtube.com/shorts/uW_sgNeCo1o"],
    evidence: [{ url: "https://nuclearhotseat.com/about/", proves: "The official site identifies Libbe as producer/host and presents the podcast, book and newsletter." }, { url: "https://nuclearhotseat.com/donate/", proves: "The official BOF is audience donation support." }],
  },
  "trisha-curtis": {
    buyer: "Trisha Curtis", pointMan: "Trisha Curtis", contact: "970-289-3691 / official PetroNerds contact", contactUrl: "https://petronerds.com/about/",
    offer: "Oil-market research, advising, consulting and speaking.", offerUrl: "https://petronerds.com/about/",
    tof: ["X", "YouTube", "captioned Shorts", "media appearances"], mof: ["PetroNerds podcast", "market research"], bof: ["research and consulting enquiry", "speaking enquiry"],
    pitchHook: "Turn PetroNerds market commentary into sober oil explainers with basin maps, inventory charts and persistent price figures, then route industry viewers to Trisha's research and consulting work.",
    gapType: "WEAK_QUALITY", videoGapReason: "Three inspected Shorts are mostly direct-to-camera cuts with large captions; even when topical imagery appears, they do not sustain maps, charts or source-backed market context.", videoGapEvidenceUrls: ["https://www.youtube.com/shorts/p-TFLc7MXgY", "https://www.youtube.com/shorts/OkzCcP6vqGY", "https://www.youtube.com/shorts/qMTk-rt7-x0"],
    evidence: [{ url: "https://petronerds.com/podcast-2/5/", proves: "The official page connects Trisha's owned podcast to her client strategy work." }, { url: "https://petronerds.com/about/", proves: "The official business page identifies the research, advisory and consulting transaction." }],
  },
  "paul-chapman": {
    buyer: "Paul Chapman", pointMan: "Paul Chapman", contact: "Direct email link on official profile", contactUrl: "https://www.hcgroup.global/consultants/paul-chapman",
    offer: "Executive search, talent intelligence and advisory services across energy and commodities.", offerUrl: "https://www.hcholdings.global/",
    tof: ["LinkedIn", "HC market commentary"], mof: ["HC Commodities Podcast"], bof: ["executive search or advisory enquiry"],
    pitchHook: "Turn HC Commodities interviews into concise market explainers with trade-flow maps, commodity chains and role-demand figures, then route qualified employers to Paul's search and advisory practice.",
    gapType: "NO_OWNED_CHANNEL", videoGapReason: "The current official podcast is distributed as audio and on HC pages, with no verified owned YouTube distribution in this review.", videoGapEvidenceUrls: ["https://www.hcgroup.global/consultants/paul-chapman"],
    evidence: [{ url: "https://www.hcgroup.global/consultants/paul-chapman", proves: "The official profile names Paul as Managing Partner, host and direct contact and lists current podcast episodes." }, { url: "https://www.hcholdings.global/", proves: "Paul co-owns the search, talent-intelligence and advisory group that represents the commercial transaction." }],
  },
};

const explicitExclusions: Record<string, string> = {
  "dr-chris-keefer": "Existing explanatory-video capability: sampled owned Shorts already use purposeful B-roll, strong topic framing and visual explanation, triggering the user's excellent-clipper exclusion.",
  "vivek-chandra": "Inactive hard gate: the verified owned podcast's latest episode is 2026-03-02, more than 90 days before this audit.",
  "joe-weisenthal": "Corporate monolith: Odd Lots is owned and commercially controlled by Bloomberg.",
  "david-greely": "Corporate product media: Smarter Markets is tied to Abaxx rather than a creator-controlled offer and buyer chain.",
  "jason-bordoff": "Institutional ownership: Columbia University owns and distributes Columbia Energy Exchange.",
  "shayle-kann": "Institutional media ownership: Catalyst is a Latitude Media/Canary Media product rather than a creator-controlled sales account.",
  "joseph-majkut": "Institutional ownership and duplicate account: Energy 360 belongs to CSIS.",
  "robert-bryce": "The recorded podcast feed is inactive, and Robert already operates professionally produced documentary/video distribution, so the weak-video gate is false.",
  "madi-hilly": "No current owned long-form source; the Campaign for a Green Nuclear Deal was publicly closed by its founder.",
  "grant-williams": "Wrong primary ICP: the paid show is broad macro and financial-market research rather than an energy-first creator account.",
  "ashoka-podcast": "Inactive hard gate: the verified Play Energy feed ended in 2023.",
  "creative-process-original-series": "Established multi-channel professional media and university-partnership operation; not a clean creator-owned clipping gap.",
  "mark-p-mills": "Inactive and institutional: The Last Optimist ended in January 2024 and is owned by the Manhattan Institute.",
  "collin-mclelland": "Inactive hard gate: the verified Oil and Gas Startups feed ended in November 2024.",
  "cody-simms": "Duplicate commercial account already covered by the MCJ pilot; the content and transaction should be worked once at account level.",
  "mark-nelson": "No verified owned long-form source; the stored YouTube URL resolves to an unrelated comedy channel.",
  "dan-tsubouchi": "No verified owned audio/video long-form source to clip; Energy Tidbits is a written research product.",
  "bill-loveless": "Institutional and duplicate account: Columbia University owns Columbia Energy Exchange.",
  "bill-nussey": "Inactive hard gate: the verified Freeing Energy podcast ended in February 2023.",
  "sandeep-pai": "Institutional and duplicate account: Energy 360 belongs to CSIS.",
  "javier-blas": "No owned long-form publication was verified; the stored YouTube playlist is not a creator-owned channel.",
  "anas-alhajji": "No current owned audio/video long-form source was verified for clipping.",
  "doomberg": "Named-human hard gate fails: the publication intentionally operates through an anonymous brand persona.",
  "nansen-energy": "Named-human and owned-long-form gates fail; the record is a research brand rather than a verified host-owned show.",
  "cnbc-business": "Corporate monolith: CNBC owns the news feed and its distribution.",
  "trading-markets": "Corporate monolith and wrong primary ICP: eToro owns the general investing show.",
  "empresa-de-pesquisa-energtica": "Government/institutional Portuguese-language account, not a global-English creator-sales prospect.",
  "forward-guidance": "Wrong primary ICP and established media: Blockworks owns the macro/crypto show.",
  "jason-yanowitz": "Wrong primary ICP and established media: Blockworks owns the crypto show.",
  "inflection-point": "Wrong primary ICP and established media: Blockworks owns the crypto show.",
  "icis-chemical-podcasts": "Corporate research publisher: ICIS owns the content and transaction, with no creator-controlled buyer chain.",
};

function latestDate(record: ManifestRecord) {
  const values = [record.freshness.rss?.latestPublishedAt, record.freshness.youtubeFeed?.latestPublishedAt, record.freshness.youtubePublishedAt, record.freshness.podcastPublishedAt]
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  return values[0];
}

function primaryFeed(record: ManifestRecord) {
  return [record.freshness.rss, record.freshness.youtubeFeed]
    .filter((source): source is SourceFeed => Boolean(source?.ok && source.latestPublishedAt))
    .sort((a, b) => new Date(b.latestPublishedAt!).getTime() - new Date(a.latestPublishedAt!).getTime())[0];
}

function passesPublicationGate(record: ManifestRecord) {
  const source = primaryFeed(record);
  return Boolean(source && source.cadence && ["ACTIVE", "SEMI_ACTIVE"].includes(source.cadence.status) && source.cadence.observedPublications >= 2);
}

function fallbackReason(record: ManifestRecord) {
  const latest = latestDate(record);
  if (record.freshness.rss?.ok && (record.freshness.rss.energyTitleCount || 0) === 0) {
    return `Wrong-source hard gate: the live feed is "${record.freshness.rss.title || "unknown"}" and none of its latest twelve titles is energy-focused.`;
  }
  if (latest && now - new Date(latest).getTime() > 90 * 86_400_000) {
    return `Inactive hard gate: the newest verified owned publication is ${latest.slice(0, 10)}, more than 90 days old.`;
  }
  if (!latest) return "No current owned long-form publication could be verified from the supplied first-party sources.";
  return "The live source is not a creator-controlled, energy-first account with a verified buyer, transaction and commercially meaningful video gap.";
}

function exclusionCategory(reason: string) {
  if (/duplicate/i.test(reason)) return "DUPLICATE_ACCOUNT";
  if (/inactive|more than 90 days|ended in/i.test(reason)) return "INACTIVE";
  if (/corporate|institutional|university|government|professional media|professional-media|owned by|publisher/i.test(reason)) return "INSTITUTIONAL_OR_MEDIA";
  if (/wrong.primary.ICP|wrong-source|not energy-first|general investing|non-energy/i.test(reason)) return "WRONG_ICP";
  if (/language|Portuguese|English/i.test(reason)) return "LANGUAGE";
  if (/named-human|anonymous|named human/i.test(reason)) return "NO_NAMED_HUMAN";
  if (/video capability|professionally produced documentary|excellent-clipper/i.test(reason)) return "EXISTING_VIDEO_CAPABILITY";
  if (/No current owned|No verified owned|No owned long-form|written research product|stored YouTube playlist|owned audio\/video/i.test(reason)) return "NO_OWNED_LONG_FORM";
  return "OTHER_HARD_GATE";
}

const reports = manifest.records.map((record) => {
  const verified = pursue[record.id];
  const publicationGatePassed = passesPublicationGate(record);
  const decision: Decision = verified && publicationGatePassed ? "PURSUE_NOW" : verified || record.id === "nathan-gambling-betateach" ? "NURTURE" : "DISQUALIFIED_CONFIRMED";
  const source = primaryFeed(record);
  const reason = verified
    ? publicationGatePassed
      ? `All hard gates passed, including ${source?.cadence?.observedPublications} observed owned publications with a ${source?.cadence?.medianIntervalDays ?? "n/a"}-day median cadence and ${source?.cadence?.latestGapDays}-day current gap.`
      : "Buyer, transaction and video-gap evidence are strong, but owned-source historical cadence did not pass the deterministic promotion gate."
    : record.id === "nathan-gambling-betateach"
      ? "The owned energy content, Nathan's identity and audience are verified, but the durable paid transaction and buyer authority behind BetaTeach are not explicit enough for promotion."
      : explicitExclusions[record.id] || fallbackReason(record);
  return {
    id: record.id,
    batch: record.batch,
    auditSample: record.auditSample,
    fitRank: record.fitRank,
    fitScore: record.fitScore,
    host: record.host,
    organization: record.organization,
    decision,
    decisionReason: reason,
    exclusionCategory: decision === "DISQUALIFIED_CONFIRMED" ? exclusionCategory(reason) : undefined,
    latestPublishedAt: latestDate(record),
    latestTitle: source?.latestTitle,
    sourceEvidenceUrl: source?.url || record.freshness.youtubeEvidenceUrl || record.freshness.podcastEvidenceUrl,
    sourceType: source === record.freshness.youtubeFeed ? "YOUTUBE" : source ? "PODCAST_RSS" : undefined,
    feedDiscoveryUrl: record.freshness.appleDiscovery?.lookupUrl,
    historicalCadence: source?.cadence,
    owner: verified?.buyer,
    buyer: verified?.buyer,
    pointMan: verified?.pointMan,
    contact: verified?.contact,
    contactUrl: verified?.contactUrl,
    offer: verified?.offer,
    offerEvidenceUrl: verified?.offerUrl,
    tof: verified?.tof,
    mof: verified?.mof,
    bof: verified?.bof,
    pitchHook: verified?.pitchHook,
    videoGapType: verified?.gapType,
    videoGapReason: verified?.videoGapReason,
    videoGapEvidenceUrls: verified?.videoGapEvidenceUrls || [],
    evidence: verified?.evidence || [],
    missingGates: decision === "NURTURE"
      ? verified
        ? ["verified active/semi-active historical cadence"]
        : ["first-party durable offer", "economic-buyer authority", "verified BOF transaction"]
      : [],
  };
});

const counts = reports.reduce<Record<Decision, number>>((acc, report) => { acc[report.decision] += 1; return acc; }, { PURSUE_NOW: 0, NURTURE: 0, DISQUALIFIED_CONFIRMED: 0 });
const exclusionCounts = reports.filter((report) => report.exclusionCategory).reduce<Record<string, number>>((acc, report) => {
  acc[report.exclusionCategory!] = (acc[report.exclusionCategory!] || 0) + 1;
  return acc;
}, {});
const auditRecords = reports.filter((report) => report.auditSample).map((report) => {
  const checks = report.decision === "PURSUE_NOW"
    ? {
        publication: Boolean(report.latestPublishedAt && report.sourceEvidenceUrl && report.historicalCadence && ["ACTIVE", "SEMI_ACTIVE"].includes(report.historicalCadence.status)),
        buyerAndContact: Boolean(report.buyer && report.pointMan && report.contact && report.contactUrl),
        transaction: Boolean(report.offer && report.offerEvidenceUrl && report.bof?.length),
        funnelAndPitch: Boolean(report.tof?.length && report.mof?.length && report.pitchHook),
        videoGap: Boolean(report.videoGapReason && report.videoGapEvidenceUrls.length),
        firstPartyEvidence: report.evidence.length > 0,
      }
    : report.decision === "NURTURE"
      ? { unresolvedGatesNamed: report.missingGates.length > 0, noPromotion: true }
      : { specificHardGateNamed: Boolean(report.exclusionCategory && report.decisionReason.length >= 35), noPromotion: true };
  return { id: report.id, decision: report.decision, checks, passed: Object.values(checks).every(Boolean) };
});
const passedChecks = auditRecords.filter((record) => record.passed).length;
const passRate = auditRecords.length ? passedChecks / auditRecords.length : 0;
const output = {
  methodology: "sol-recovery-v2.1",
  generatedAt: new Date().toISOString(),
  cohortHash: manifest.cohortHash,
  total: reports.length,
  counts,
  exclusionCounts,
  audit: {
    kind: "deterministic evidence-and-hard-gate audit",
    limitation: "This pass rate measures evidence completeness and gate consistency; it is not statistical ground-truth precision.",
    sampleSize: auditRecords.length,
    passedChecks,
    passRate,
    passed: passRate >= 0.9,
    records: auditRecords,
  },
  reports,
};
writeFileSync(join(root, "data", "sol-review-round-2.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ total: output.total, counts, audit: output.audit }, null, 2));
if (!output.audit.passed) process.exit(2);
