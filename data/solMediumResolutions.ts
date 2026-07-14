import type { NodeData } from "../lib/types";

export type SolMediumResolution = {
  decision: NonNullable<NodeData["methodologyDecision"]>;
  reason: string;
  evidenceUrls?: string[];
  offerUrl?: string;
  bofOffer?: string;
  contentOwnerName?: string;
  economicBuyerName?: string;
  contactUrl?: string;
  pitchHook?: string;
};

const reviewedAt = "2026-07-14T14:44:12.000Z";

const pursue: Record<string, SolMediumResolution> = {
  "emmet-penney": {
    decision: "PURSUE_NOW",
    reason: "Emmet owns the active Nuclear Barbarians podcast, is reachable directly, and sells Grid Brief Premium. The audio-first show has no verified owned YouTube engine, so short educational clips can drive a measurable paid-newsletter transaction.",
    evidenceUrls: [
      "https://www.nuclearbarbarians.com/podcast",
      "https://www.nuclearbarbarians.com/p/what-i-read-this-year",
      "https://x.com/emmetpenney",
    ],
    offerUrl: "https://www.nuclearbarbarians.com/p/what-i-read-this-year",
    bofOffer: "Grid Brief Premium subscription",
    contentOwnerName: "Emmet Penney",
    economicBuyerName: "Emmet Penney",
    contactUrl: "https://x.com/emmetpenney",
    pitchHook: "Turn the Matt Loszak conversation into a map-led clip explaining where Aalo's first plants fit in the US grid, then point the final frame to the deeper analysis available through Grid Brief Premium.",
  },
  "giles-parkinson": {
    decision: "PURSUE_NOW",
    reason: "RenewEconomy states that Giles founded and still owns the publication, co-hosts its active podcast, and monetizes through advertising. His direct author page supplies a named contact route; podcast reach is large while repeatable short-video distribution remains weak.",
    evidenceUrls: [
      "https://reneweconomy.com.au/about/",
      "https://reneweconomy.com.au/author/giles/",
      "https://reneweconomy.com.au/category/podcasts/energy-insiders/",
    ],
    offerUrl: "https://reneweconomy.com.au/about/",
    bofOffer: "RenewEconomy advertising inventory",
    contentOwnerName: "Giles Parkinson",
    economicBuyerName: "Giles Parkinson",
    contactUrl: "https://reneweconomy.com.au/author/giles/",
    pitchHook: "Clip the newest Energy Insiders argument into a chart-led Australian grid explainer and use the close to demonstrate to prospective advertisers how RenewEconomy's two-million-play podcast audience can also be reached in social video.",
  },
  "peter-tertzakian": {
    decision: "PURSUE_NOW",
    reason: "Peter is the named founder and host, Studio.Energy explicitly invites visitors to book him, and its official contact route reaches the owner. The active podcast has some YouTube presence but lacks a consistent educational short-form layer tied to speaking demand.",
    evidenceUrls: [
      "https://studio.energy/our-founder",
      "https://studio.energy/contact",
      "https://www.arcenergyinstitute.com/category/podcast/",
    ],
    offerUrl: "https://studio.energy/our-founder",
    bofOffer: "Paid speaking and Energyphile books",
    contentOwnerName: "Peter Tertzakian",
    economicBuyerName: "Peter Tertzakian",
    contactUrl: "https://studio.energy/contact",
    pitchHook: "Build a numbers-on-screen clip from the latest ARC Energy Ideas episode that visualizes the market mechanism Peter explains, then route viewers to Studio.Energy's request-to-book transaction.",
  },
  "david-roberts": {
    decision: "PURSUE_NOW",
    reason: "David owns Volts, publishes an active podcast/newsletter, publicly lists his direct email, and states that paid subscriptions are the business model. Volts has a YouTube channel but no proportionate, systematic educational-clipping engine for its 93,000-plus subscriber audience.",
    evidenceUrls: [
      "https://www.volts.wtf/",
      "https://www.volts.wtf/subscribe",
      "https://www.volts.wtf/p/welcome-to-volts",
    ],
    offerUrl: "https://www.volts.wtf/subscribe",
    bofOffer: "Paid Volts subscription",
    contentOwnerName: "David Roberts",
    economicBuyerName: "David Roberts",
    contactUrl: "https://www.volts.wtf/p/welcome-to-volts",
    pitchHook: "Turn the newest Volts interview into a Vox-style systems explainer with persistent numbers, labeled infrastructure, and maps, then send viewers to the paid subscription that directly funds David's podcast production.",
  },
};

const nurture: Record<string, SolMediumResolution> = {
  "dr-chris-keefer": {
    decision: "NURTURE",
    reason: "Decouple has a named owner, direct contact, active long form, and a support transaction, but its donation-funded economics and existing video footprint make a $997 monthly conversion less certain than the pursue queue.",
    evidenceUrls: ["https://decouplemedia.org/", "https://www.decouplemedia.org/donate", "https://x.com/Dr_Keefer"],
    offerUrl: "https://www.decouplemedia.org/donate",
    bofOffer: "Decouple listener support and donations",
  },
  "libbe-halevy": {
    decision: "NURTURE",
    reason: "Libbe owns and hosts the weekly show and asks listeners for recurring support, but the donation-funded transaction has a weaker ability to support the initial monthly package.",
    evidenceUrls: ["https://nuclearhotseat.com/about/", "https://nuclearhotseat.com/donate/"],
    offerUrl: "https://nuclearhotseat.com/donate/",
    bofOffer: "Recurring Nuclear Hotseat listener donations",
  },
  "laurent-segalen": {
    decision: "NURTURE",
    reason: "Laurent is a co-owner/host with a real energy-transaction business, but Redefining Energy already operates an owned video channel and the incremental distribution gap was not strong enough for the first outreach tranche.",
    evidenceUrls: ["https://redefining-energy.com/", "https://www.megawatt-x.com/", "https://x.com/MegawattXinfo"],
    offerUrl: "https://www.megawatt-x.com/",
    bofOffer: "Megawatt-X renewable-energy transaction services",
  },
  "trisha-curtis": {
    decision: "NURTURE",
    reason: "Trisha is PetroNerds' founder, host, and consulting buyer, but the owned feed did not expose enough history to verify cadence deterministically and the existing YouTube channel makes the gap less urgent.",
    evidenceUrls: ["https://petronerds.com/podcast-2/5/", "https://petronerds.com/about/"],
    offerUrl: "https://petronerds.com/about/",
    bofOffer: "PetroNerds research, advising, and consulting",
  },
  "vivek-chandra": {
    decision: "NURTURE",
    reason: "Vivek owns Kerogen Consultants and offers a clear LNG advisory transaction, but cadence is currently uneven and his owned YouTube presence reduces the immediacy of the distribution gap.",
    evidenceUrls: ["https://www.natgas.info/about/kerogen-consultants", "https://www.natgas.info/"],
    offerUrl: "https://www.natgas.info/about/kerogen-consultants",
    bofOffer: "Kerogen LNG advisory and training services",
  },
};

const existingProduction = [
  "mark-lacour",
  "geoffrey-cann",
  "kyle-hill",
  "zach-shahan",
];

const ownershipOrBuyerFailure = [
  "christiana-figueres",
  "andy-stone",
  "david-greely",
  "aaron-murphy",
  "elena-melchert",
  "cleantech-africa",
  "tony-schwartz",
  "megan-kalbach",
  "maryssa-barron",
  "shayle-kann",
  "ntma-talks",
  "rbn-energy",
  "energy-vs-climate",
  "initial-studio",
  "charge-events",
  "ee-times-on-air",
  "chemical-week",
  "enlit-europe",
  "general-fusion",
  "premier-american-uranium",
  "smart-grid-forums",
  "anew-climate",
  "beyond-the-grid",
  "sunclean-tech",
  "climate-salad",
  "zero-carbon-zone",
  "etrm-world",
];

const wrongIcpOrMismatchedMedia = [
  "james-altucher",
  "tom-ruwitch",
  "amber-kanwar",
  "zack-nani",
  "tim-roberts",
  "claire-bahn",
  "alfred-johnson",
  "marine-cornelis",
  "lisa-cohn",
  "ron-baker",
  "force-finance",
  "mia-funk",
  "michael-a-gayed",
  "paul-schuster",
  "witness-radio",
  "damien-wrsten",
  "1st-live-trading",
  "financial-time-capsule",
  "john-farrell",
];

const missingTransactionOrGap = [
  "lara-pierpoint",
  "assaad-razzouk",
  "chris-frostad",
  "joe-batir",
  "phil-zeringue",
  "limitless-potential-technologies",
  "geotermal-itb",
  "the-climate-cycle",
  "grid-elevated",
  "illinois-energyprof",
  "albert-bryan",
  "jennifer-zajac",
  "michelle-fraser",
];

const inactive = ["duncan-campbell"];

function exclusions(ids: string[], reason: string) {
  return Object.fromEntries(ids.map((id) => [id, { decision: "DISQUALIFIED", reason } satisfies SolMediumResolution]));
}

export const solMediumResolutions: Record<string, SolMediumResolution> = {
  ...pursue,
  ...nurture,
  ...exclusions(existingProduction, "First-party review found an established in-house or commercial video-production engine. The prospect fails the weak-video-distribution hard gate."),
  ...exclusions(ownershipOrBuyerFailure, "The active media belongs to an organization, network, fund, publisher, or event brand and the named host was not independently verified as the economic buyer for this transaction."),
  ...exclusions(wrongIcpOrMismatchedMedia, "The refreshed owned-media evidence is outside the energy creator ICP or the stored channel belongs to an unrelated subject/person. The record cannot support an energy-specific outreach claim."),
  ...exclusions(missingTransactionOrGap, "Strong-model review did not verify both a creator-controlled commercial transaction and a commercially meaningful video-distribution gap. A missing hard gate is a final exclusion for this run."),
  ...exclusions(inactive, "Owned long-form publication is outside the 90-day activity window and historical cadence is declining. The activity hard gate fails."),
};

export const solMediumReviewedAt = reviewedAt;
