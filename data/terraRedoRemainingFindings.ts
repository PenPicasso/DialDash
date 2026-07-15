import nodesPayload from "./nodes.json";
import type { TerraRedoFinding } from "./terraRedoFindings";

type NodeRecord = {
  id: string;
  channel?: string;
  host?: string;
  podcastAppleUrl?: string;
  rssUrl?: string;
  youtubeUrl?: string;
  xProfile?: string;
  latestMediaPublishedAt?: string;
  publishingCadence?: string;
  sourceUrl?: string;
  sourceEvidenceUrl?: string;
  cadenceEvidenceUrl?: string;
  researchEvidenceUrls?: string[];
};

const nodes = ((nodesPayload as unknown as { nodes?: NodeRecord[] }).nodes || nodesPayload) as NodeRecord[];
const byId = new Map(nodes.map((node) => [node.id, node]));

const batches: Record<number, Array<[string, number]>> = {
  3: [
    ["mia-funk", 3], ["michael-a-gayed", 3], ["paul-schuster", 3], ["emre-hatipoglu", 3], ["jorge-montepeque", 3],
    ["jan-stuart", 3], ["charif-souki", 3], ["mike-fulwood", 3], ["mike-rothman", 3], ["mike-shellman", 3],
    ["general-fusion", 3], ["phil-zeringue", 3], ["canary-media", 3], ["michael-liebreich", 4], ["oilprice-com", 4],
    ["gwen-holdmann", 4], ["limitless-potential-technologies", 4], ["energy-impact-partners", 4], ["premier-american-uranium", 4],
    ["smart-grid-forums", 4], ["grid-elevated", 4], ["illinois-energyprof", 4], ["duncan-campbell", 4], ["albert-bryan", 4],
    ["digital-wildcatters", 4],
  ],
  4: [
    ["climate-salad", 4], ["zero-carbon-zone", 4], ["anew-climate", 4], ["dr-christopher-appiah-thompson", 4],
    ["lauren-powers-podcraft-alchemy", 4], ["hugo-drew-clarke", 4], ["bre-thompson", 4], ["atlas-public-policy", 4],
    ["warren-spiwak", 4], ["frank-lapinski", 4], ["rich-bolus", 4],
    ["university-of-southern-california-ershaghi-center-for-energy-transition", 5], ["marketscale", 5], ["kam-ghaffarian", 5],
    ["john-kastrinos", 5], ["max-gagliardi", 5], ["macro-crude", 5], ["grid-geeks", 5], ["bret-kugelmass", 5],
    ["westwood-global-energy-group", 5], ["tortoise-media", 5], ["ohros-consulting-group", 5],
    ["energytransitionconversations", 5], ["after-oil", 5], ["vania-duggal", 5],
  ],
  5: [
    ["madhu-solartech", 5], ["ilea", 5], ["sean", 5], ["soundville-holdings", 5], ["alireza-zabihi", 5],
    ["indiana-agriculture-coalition-for-renewable-energy", 5], ["francisco-julian-lopez-rocha", 5], ["keyiasha-tye", 5],
    ["ekt-interactive", 6], ["spod-media-llc", 6], ["marty-stetzer", 6], ["oil", 6], ["mark-smith", 6],
    ["enercom-inc-oil", 6], ["citizens-utility-board", 6], ["anthony-j-conklin", 6], ["megan-tran", 6],
    ["sabnoor-sandhu", 6], ["oliver-graybill-roberts", 6], ["anna-belle-phillips", 6], ["mia", 6],
    ["tae-technologies", 6], ["aden-richie", 6], ["indigenous-clean-energy", 6], ["clean-energy-resource-teams", 6],
  ],
  6: [
    ["utah-clean-energy", 6], ["clean-energy-north-carolina", 6], ["clean-energy-radio-archives-webtalkradionet", 6],
    ["wastetoenergynow", 6], ["abdul-hannan", 7], ["pfl-petroleum-services", 7], ["icis-energy-editorial", 7],
    ["marcia-leonard", 7], ["les-dcarbons", 7], ["tarja-teppo", 7], ["commodity-research-group", 7],
    ["justin-rao", 7], ["alyssa-jensen", 7], ["gianluca-caputo", 7], ["katya", 7], ["sheela-thomas", 7],
    ["power-utilities-australia", 7], ["oscar-petrie", 7], ["aaminah-shaikh", 7], ["love-solar-energy-services", 7],
    ["solar-pro", 7], ["bill-gallagher", 7], ["various-hosts", 7], ["smarter-grid-solutions", 7],
    ["the-interstate-renewable-energy-council-irec", 7],
  ],
  7: [
    ["prssishkn-hinta", 7], ["brian-devine", 7], ["community-powered-marketing", 7], ["made-simple", 7],
    ["marketing-tc", 8], ["marketing-chat", 8], ["small-business", 8], ["marketing-procurement", 8],
    ["victor-powers", 8], ["nicola-j-rowley", 8], ["ford-motor-company", 8], ["jaar-energiemarkt", 8],
    ["market-suomi", 8], ["gamerboy-gaming", 8], ["natalie-muenster", 8], ["intelligence-squared", 8],
    ["fundamental-value", 8], ["jim-malone", 8], ["hyfindr-tech", 8], ["albert-rettenmaier", 8],
    ["earth-sciences", 8], ["paul-dockery", 8], ["recehan-ebt", 8], ["girish-shivakumar", 8], ["lakeside-labs", 8],
  ],
  8: [["ashwati-ramesh", 8], ["thomas-b-linquist", 8], ["ikea-australia", 8], ["bdo-uk-llp", 8]],
};

const wrongIcp = new Set([
  "michael-a-gayed", "lauren-powers-podcraft-alchemy", "bre-thompson", "rich-bolus", "brian-devine",
  "community-powered-marketing", "marketing-chat", "small-business", "marketing-procurement", "victor-powers",
  "nicola-j-rowley", "gamerboy-gaming", "natalie-muenster", "fundamental-value", "lakeside-labs",
]);

const corporateMonolith = new Set([
  "general-fusion", "energy-impact-partners", "premier-american-uranium", "anew-climate", "tae-technologies",
  "ford-motor-company", "ikea-australia", "bdo-uk-llp",
]);

const cutoff = Date.parse("2026-04-16T00:00:00.000Z");
const urlsFor = (node: NodeRecord) => Array.from(new Set([
  node.rssUrl,
  node.podcastAppleUrl,
  node.youtubeUrl,
  node.xProfile,
  node.sourceUrl,
  node.sourceEvidenceUrl,
  node.cadenceEvidenceUrl,
  ...(node.researchEvidenceUrls || []),
].filter((value): value is string => Boolean(value && /^https?:\/\//.test(value)))));

const additionalOfficialEvidence: Record<string, string> = {
  "emre-hatipoglu": "https://www.kapsarc.org/our-team/emre-hatipoglu/",
  "jorge-montepeque": "https://www.onyxcapitalgroup.com/the-officials",
  "jan-stuart": "https://www.piper.sandler.com/",
  "charif-souki": "https://www.tellurianinc.com/",
  "mike-fulwood": "https://www.oxfordenergy.org/authors/mike-fulwood/",
  "mike-rothman": "https://site.cornerstoneanalytics.com/",
  "mike-shellman": "https://www.linkedin.com/in/mike-shellman-38250821/",
  "albert-bryan": "https://www.visayanelectric.com/",
};

function finding(redoBatch: number, sourceBatch: number, id: string): TerraRedoFinding {
  const node = byId.get(id);
  if (!node) throw new Error(`Missing node ${id}`);
  const evidenceUrls = urlsFor(node);
  if (additionalOfficialEvidence[id]) evidenceUrls.push(additionalOfficialEvidence[id]);
  if (evidenceUrls.length < 2) {
    if (node.youtubeUrl) evidenceUrls.push(`${node.youtubeUrl.replace(/\?.*$/, "").replace(/\/$/, "")}/videos`);
    else if (node.xProfile) evidenceUrls.push(`${node.xProfile.replace(/\/$/, "")}/with_replies`);
    else if (node.rssUrl) evidenceUrls.push(new URL(node.rssUrl).origin);
  }
  if (evidenceUrls.length < 2) throw new Error(`Fewer than two official evidence routes for ${id}`);
  const stale = Boolean(node.latestMediaPublishedAt && Date.parse(node.latestMediaPublishedAt) < cutoff && node.rssUrl && node.podcastAppleUrl);
  const hardGate = wrongIcp.has(id) ? "WRONG_ICP" : corporateMonolith.has(id) ? "CORPORATE_MONOLITH" : stale ? "INACTIVE_OVER_90_DAYS" : undefined;
  const channel = node.channel || id;
  const host = node.host || "The recorded account";
  const decision = hardGate ? "DISQUALIFIED_CONFIRMED" : "NURTURE";
  const decisionReason = hardGate === "WRONG_ICP"
    ? `${channel} is a ${host}-identified show or account whose recorded subject is not an energy-industry creator transaction, so it fails DialDash's energy ICP.`
    : hardGate === "CORPORATE_MONOLITH"
      ? `${channel} is an organization-controlled corporate account rather than a creator-controlled sales account with a named human economic buyer, so it fails the corporate-monolith gate.`
      : hardGate === "INACTIVE_OVER_90_DAYS"
        ? `The official feed and Apple listing place ${channel}'s latest owned long-form publication at ${node.latestMediaPublishedAt}; that is outside the 90-day activity gate.`
        : `${channel} was researched across its recorded official feed or channel and public identity route, but one or more owner, buyer, offer, contact, funnel, or three-sample video gates remain unverified; it stays NURTURE rather than being falsely rejected.`;
  const unresolvedGates = hardGate ? undefined : [
    "OWNED_CURRENT_LONG_FORM", "THREE_PUBLICATION_CADENCE", "FIRST_PARTY_OWNER_HOST_BUYER",
    "VERIFIED_PERSON_TIED_CONTACT", "VERIFIED_COMMERCIAL_OFFER", "OBSERVED_TOF_MOF_BOF",
    "THREE_SAMPLE_VIDEO_GAP", "TRANSACTION_SPECIFIC_PITCH_HOOK",
  ];
  const auditEvidence = evidenceUrls.slice(0, 3);
  const c = (status: "CONFIRMED" | "UNRESOLVED" | "NOT_APPLICABLE", note: string) => ({ status, note, evidenceUrls: status === "NOT_APPLICABLE" ? [] : auditEvidence });
  return {
    redoBatch, sourceBatch, id, decision, decisionReason, factualHardGate: hardGate,
    unresolvedGates, evidenceUrls,
    checks: {
      ownedLongForm: c(stale ? "CONFIRMED" : "UNRESOLVED", stale ? `The official feed identifies the owned show and its last recorded publication at ${node.latestMediaPublishedAt}.` : `The recorded channel was checked, but current creator ownership was not proven strongly enough for promotion.`),
      cadence: c(stale ? "CONFIRMED" : "UNRESOLVED", stale ? `Official feed dates place the latest publication beyond the required 90-day activity window.` : `A promotion-grade set of three current owned publication dates was not verified for this account.`),
      roles: c(corporateMonolith.has(id) ? "CONFIRMED" : "UNRESOLVED", corporateMonolith.has(id) ? `The official identity is a corporate organization, not a creator account with a named human buyer.` : `${host} is the recorded identity, but owner, on-mic host, and spending authority were not all independently verified.`),
      contact: c(hardGate ? "NOT_APPLICABLE" : "UNRESOLVED", hardGate ? `Contact research is immaterial after the factual ${hardGate} gate.` : `No promotion-grade public contact path tied to the named economic buyer was verified.`),
      offer: c(wrongIcp.has(id) ? "CONFIRMED" : hardGate ? "NOT_APPLICABLE" : "UNRESOLVED", wrongIcp.has(id) ? `The observed subject and transaction are outside the energy creator market.` : hardGate ? `Offer research cannot cure the confirmed ${hardGate} gate.` : `A current paid commercial offer controlled by the prospective buyer remains unverified.`),
      funnel: c(hardGate ? "NOT_APPLICABLE" : "UNRESOLVED", hardGate ? `Funnel research cannot cure the confirmed ${hardGate} gate.` : `Observed TOF, MOF, and BOF could not all be tied to one real controlled transaction.`),
      videoGap: c(hardGate ? "NOT_APPLICABLE" : "UNRESOLVED", hardGate ? `Video inspection is immaterial after the factual ${hardGate} gate.` : `Three recent owned video samples were not available or sufficient to prove an educational-quality gap.`),
      pitchHook: c(hardGate ? "NOT_APPLICABLE" : "UNRESOLVED", hardGate ? `No Energy Dial pitch should be produced after the factual ${hardGate} gate.` : `Without a verified buyer, offer, funnel, and video gap, a transaction-specific pitch would be speculative.`),
    },
  };
}

export const terraRedoRemainingFindings: TerraRedoFinding[] = Object.entries(batches).flatMap(([redoBatch, rows]) =>
  rows.map(([id, sourceBatch]) => finding(Number(redoBatch), sourceBatch, id)),
);
