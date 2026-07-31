import type {
  CommercialEvidenceBasis,
  CommercialIntelligence,
  NodeData,
} from "./types";

type EngineDefinition = {
  engine: string;
  pattern: RegExp;
  revenueModel: string;
  valueEstimate: string;
  leverage: string;
};

const ENGINE_DEFINITIONS: EngineDefinition[] = [
  {
    engine: "Paid research and intelligence",
    pattern: /\b(research|intelligence|subscription\w*|subscriber\w*|member\w*|membership\w*|premium)\b/i,
    revenueModel: "Recurring individual, team, or enterprise access to specialist analysis.",
    valueEstimate: "Recurring account value can expand through renewals, team seats, and institutional use.",
    leverage: "increase qualified subscriber acquisition, improve free-to-paid conversion, and keep renewal value visible",
  },
  {
    engine: "Advisory and consulting mandates",
    pattern: /\b(advisory|advisor\w*|advice|consulting|consultant\w*|strategy|bespoke|custom market|expert service|market stud)/i,
    revenueModel: "Relationship-led projects, retainers, or strategic advisory mandates.",
    valueEstimate: "Typically a high-value B2B relationship where one qualified mandate can outweigh broad audience revenue.",
    leverage: "create more executive trust before a sales conversation and increase qualified advisory enquiries",
  },
  {
    engine: "Board and governance roles",
    pattern: /\b(board\w*|director\w*|governance|trustee\w*)\b/i,
    revenueModel: "Annual board appointments and governance responsibilities.",
    valueEstimate: "High-value, low-volume appointments whose economics depend on company size, committee work, and equity structure.",
    leverage: "reinforce decision-quality authority with executives, investors, and nomination networks",
  },
  {
    engine: "Investment and fund economics",
    pattern: /\b(invest\w*|fund\w*|capital allocation|investment portfolio\w*|private equity|venture|asset management|\bGP\b|\bLP\b|partnership\w*)\b/i,
    revenueModel: "Management fees, carried interest, investment returns, or participation in asset economics.",
    valueEstimate: "Long-cycle institutional value tied to capital formation, deal access, and investment performance.",
    leverage: "increase qualified investor and operator relationships while strengthening proprietary deal flow",
  },
  {
    engine: "Sponsorship and advertising",
    pattern: /\b(sponsor\w*|advertis\w*|media kit|brand partner\w*|audience access)\b/i,
    revenueModel: "Campaign, episode, newsletter, or portfolio sponsorship inventory.",
    valueEstimate: "Campaign value rises with buyer relevance, repeat exposure, and measurable access to a specialist audience.",
    leverage: "create more sellable inventory, improve sponsor outcomes, and support larger or repeat campaigns",
  },
  {
    engine: "Events and speaking",
    pattern: /\b(event\w*|conference\w*|speaking|speaker\w*|keynote\w*|presentation\w*|workshop\w*)\b/i,
    revenueModel: "Speaking fees, event tickets, partnerships, or event-led commercial relationships.",
    valueEstimate: "Episodic revenue with additional value from enterprise relationships created around the engagement.",
    leverage: "increase qualified bookings and keep expertise visible between major events",
  },
  {
    engine: "Education and training",
    pattern: /\b(course\w*|training|coaching|mentor\w*|mastermind\w*|education|academy|cohort\w*|certification\w*)\b/i,
    revenueModel: "Per-seat, cohort, corporate training, or coaching revenue.",
    valueEstimate: "Revenue scales through enrolment, repeat cohorts, corporate seats, and higher-value advisory ascension.",
    leverage: "increase qualified enrolment and make the path from free expertise to paid learning clearer",
  },
  {
    engine: "Data and software subscriptions",
    pattern: /\b(software|saas|dashboard\w*|database\w*|data platform\w*|data product\w*|analytics platform\w*|analytics subscription\w*)\b/i,
    revenueModel: "Recurring software, data, or analytics access.",
    valueEstimate: "Recurring account value grows through adoption, additional users, and enterprise expansion.",
    leverage: "turn subject-matter authority into more qualified product trials and enterprise conversations",
  },
  {
    engine: "Recruiting and talent services",
    pattern: /\b(recruit\w*|executive search|hiring|talent|staffing|workforce|contractor\w*)\b/i,
    revenueModel: "Retained search, placement fees, embedded talent, or workforce contracts.",
    valueEstimate: "High-value B2B fees tied to successful placements, retained searches, and repeat hiring demand.",
    leverage: "attract more hiring decision-makers and make category expertise tangible before a search mandate",
  },
  {
    engine: "Enterprise services and projects",
    pattern: /\b(writing|ghostwriting|white paper\w*|service\w*|project\w*|procurement|ppa|offtake|microgrid\w*|efficiency|engineering|equipment|solution\w*|implementation)\b/i,
    revenueModel: "Project, product, procurement, or enterprise service contracts.",
    valueEstimate: "High-value, longer-cycle contracts where credibility and buyer timing materially affect conversion.",
    leverage: "create more qualified commercial enquiries and shorten the education phase of complex sales",
  },
  {
    engine: "Audience support and donations",
    pattern: /\b(donat\w*|listener support|reader support|patron\w*|contribution\w*|nonprofit)\b/i,
    revenueModel: "One-time or recurring audience contributions.",
    valueEstimate: "Lower-ticket recurring support that compounds through retention and a larger base of committed listeners.",
    leverage: "increase supporter conversion and remind existing supporters why the work deserves recurring funding",
  },
  {
    engine: "Books and intellectual property",
    pattern: /\b(book\w*|licens\w*|intellectual property|publication sales)\b/i,
    revenueModel: "Book, publication, or licensed intellectual-property sales.",
    valueEstimate: "Mostly transactional revenue with additional authority and downstream speaking or advisory value.",
    leverage: "increase qualified purchases while using the intellectual property to open higher-value conversations",
  },
];

const FALLBACK_ENGINE_BY_ROLE: Record<NodeData["marketParticipantRole"], string> = {
  "TRADERS & ANALYSTS": "Paid research and intelligence",
  "MEDIA & INFORMATION": "Sponsorship and advertising",
  "ADVISORS & EXPERTS": "Advisory and consulting mandates",
  "CAPITAL ALLOCATORS": "Investment and fund economics",
  "OPERATORS": "Enterprise services and projects",
  "SERVICE COMPANIES": "Enterprise services and projects",
  "INFRASTRUCTURE": "Enterprise services and projects",
  "REGULATORY": "Institutional mandate and stakeholder influence",
};

const engineByName = new Map(ENGINE_DEFINITIONS.map((definition) => [definition.engine, definition]));

function text(...values: Array<unknown>): string {
  return values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");
}

function uniqueUrls(...values: Array<unknown>): string[] {
  return Array.from(new Set(
    values
      .flatMap((value) => Array.isArray(value) ? value : [value])
      .filter((value): value is string => typeof value === "string" && /^https?:\/\//i.test(value)),
  ));
}

function inferredDefinition(engine: string): EngineDefinition {
  return engineByName.get(engine) || {
    engine,
    pattern: /$^/,
    revenueModel: "Institutional funding, mandate delivery, or stakeholder influence rather than a public creator offer.",
    valueEstimate: "No defensible customer-level economics are visible from the current public evidence.",
    leverage: "improve stakeholder understanding and make the institution's expertise easier to find and use",
  };
}

function extractVisiblePrice(value: string): string | undefined {
  const patterns = [
    /[$£€]\s?\d[\d,]*(?:\.\d{1,2})?(?:\s*(?:\/|per)\s*(?:month|year|week))?/i,
    /\d[\d,]*(?:\.\d{1,2})?\s*(?:USD|GBP|EUR)(?:\s*(?:\/|per)\s*(?:month|year|week))?/i,
  ];
  const prices = patterns.flatMap((pattern) => value.match(new RegExp(pattern.source, "gi")) || []);
  return prices.length ? Array.from(new Set(prices)).slice(0, 3).join(", ") : undefined;
}

function evidenceSupport(url: string, node: NodeData): string {
  if (url === node.offerUrl || /\/(pricing|subscribe|services|work-with|donate|media-kit|about)/i.test(url)) {
    return "Official offer, monetization, or conversion-path evidence";
  }
  if (/youtube\.com|youtu\.be/i.test(url)) return "Owned video-distribution evidence";
  if (/rss|feed|podcasts\.apple|spotify|substack/i.test(url)) return "Owned long-form and publishing evidence";
  return "First-party ownership, role, or commercial-context evidence";
}

function buildEvidence(node: NodeData, extra: string[] = []): CommercialIntelligence["evidence"] {
  return uniqueUrls(
    extra,
    node.reviewEvidenceUrls,
    node.offerUrl,
    node.sourceEvidenceUrl,
    node.latestYoutubeEvidenceUrl,
    node.latestPodcastEvidenceUrl,
  ).slice(0, 6).map((url) => ({ url, supports: evidenceSupport(url, node) }));
}

function basisFor(node: NodeData, offerText: string): CommercialEvidenceBasis {
  if (node.reviewOffer && node.reviewEvidenceUrls?.length) return "VERIFIED";
  if (node.offerUrl && offerText) return "ESTIMATED";
  return "INFERRED";
}

function confidenceFor(
  node: NodeData,
  basis: CommercialEvidenceBasis,
  evidenceCount: number,
): CommercialIntelligence["confidence"] {
  const unresolved = node.reviewUnresolvedGates || [];
  if (basis === "VERIFIED" && evidenceCount >= 2 && unresolved.length === 0) {
    return {
      level: "HIGH",
      note: "The revenue engine and commercial role are supported by reviewed first-party evidence. Pricing is only treated as verified when a public price is visible.",
    };
  }
  if (basis !== "INFERRED" && evidenceCount > 0) {
    return {
      level: "MEDIUM",
      note: `The offer model is evidence-backed, but ${unresolved.length ? `the review still has unresolved ${unresolved.join(", ").toLowerCase()} gates` : "customer value or pricing is not public"}.`,
    };
  }
  return {
    level: "LOW",
    note: `This is a role-based commercial hypothesis, not a verified offer. ${node.reviewDecision === "DISQUALIFIED_CONFIRMED" ? "The existing hard-gate decision still applies." : "Verify the buyer, offer, and transaction before using it in outreach."}`,
  };
}

function prospectOverrides(node: NodeData): CommercialIntelligence | undefined {
  if (node.id === "rory-johnston") {
    const evidence = buildEvidence(node, ["https://www.commoditycontext.com/about"]);
    return {
      methodologyVersion: "commercial-intelligence-v1",
      primaryRevenueEngine: "Paid research and intelligence",
      revenueStack: [
        { rank: 1, engine: "Paid research and intelligence", evidenceBasis: "VERIFIED", rationale: "Commodity Context publicly sells a full research service and community to individual and institutional readers." },
        { rank: 2, engine: "Advisory and consulting mandates", evidenceBasis: "VERIFIED", rationale: "The official offer includes expert advisory, model walkthroughs, and bespoke research." },
        { rank: 3, engine: "Events and speaking", evidenceBasis: "VERIFIED", rationale: "Keynotes and corporate presentations are listed as additional services." },
      ],
      contentCommercialRole: "Commodity Context's free analysis and podcast appearances demonstrate Rory's judgment, build an audience of market professionals, and move the most engaged readers toward paid research or a direct institutional engagement.",
      revenueLeverage: "The business outcome is more qualified paid subscribers and more institutional advisory enquiries from each research cycle, with repeated executive touchpoints supporting conversion and renewal.",
      valueConversation: "Your analysis already reaches financial, oil-industry, and policy teams. The value question is whether each major thesis creates enough repeated, decision-useful touchpoints to convert more of that audience into paid research accounts and bespoke advisory conversations.",
      customerEconomics: {
        buyerUnit: "Individual market professional or institutional research/advisory account",
        revenueModel: "Recurring research subscription with higher-value bespoke advisory, presentations, and research engagements.",
        valueEstimate: "$75 per month or $750 per year for the published research subscription; institutional services are custom-priced.",
        pricingVisibility: "VERIFIED",
        pricingNote: "The subscription price is published on the official about page. No public fee was found for bespoke services.",
      },
      evidence,
      confidence: {
        level: "HIGH",
        note: "The primary offer, public subscription price, institutional audience, and additional services are stated on Rory's official site.",
      },
    };
  }

  if (node.id === "arjun-murti") {
    const evidence = buildEvidence(node, [
      "https://veriten.com/public-engagement/",
      "https://veriten.com/bio/arjun-murti/",
      "https://veriten.com/2023/03/veriten-welcomes-arjun-murti-as-partner/",
    ]);
    return {
      methodologyVersion: "commercial-intelligence-v1",
      primaryRevenueEngine: "Advisory and consulting mandates",
      revenueStack: [
        { rank: 1, engine: "Advisory and consulting mandates", evidenceBasis: "VERIFIED", rationale: "Veriten describes itself as a research, strategy, and investing firm, with Arjun leading Energy Macro and Policy." },
        { rank: 2, engine: "Investment and fund economics", evidenceBasis: "VERIFIED", rationale: "Veriten states that public engagement informs its investment perspectives, and Arjun is a partner in the firm." },
        { rank: 3, engine: "Board and governance roles", evidenceBasis: "VERIFIED", rationale: "Arjun's official biography lists current public-company directorships and advisory-board roles." },
      ],
      contentCommercialRole: "Super-Spiked is a public authority and relationship engine: it puts Arjun's judgment in front of executives, board members, investors, and regulators, while informing Veriten's advisory and investment perspectives.",
      revenueLeverage: "The business outcome is stronger executive mindshare when advisory mandates, investment relationships, and governance opportunities are forming, not simply more media views.",
      valueConversation: "Super-Spiked already reaches the people who make capital-allocation and policy decisions. The value question is whether each weekly argument is being distributed in a form that stays present with executives, investors, and boards long enough to create more qualified Veriten conversations.",
      customerEconomics: {
        buyerUnit: "Enterprise advisory client, investment counterparty, or governance organization",
        revenueModel: "High-value institutional advisory and investment relationships, with board compensation as a separate authority-linked economic layer.",
        valueEstimate: "Likely high-value and low-volume; no defensible public fee or mandate size was found.",
        pricingVisibility: "ESTIMATED",
        pricingNote: "The commercial engines are first-party verified, but their prices and client-level economics are not public.",
      },
      evidence,
      confidence: {
        level: "HIGH",
        note: "Official Veriten pages connect the content to advisory and investment perspectives and verify Arjun's partner and board roles; only pricing remains undisclosed.",
      },
    };
  }

  return undefined;
}

export function buildCommercialIntelligence(node: NodeData): CommercialIntelligence {
  const override = prospectOverrides(node);
  if (override) return override;

  const offerText = text(node.reviewOffer, node.reviewBof, node.bofOffer);
  const fallbackContext = text(
    node.creatorRole,
    node.marketParticipantRole,
    node.subcategory,
    node.notes,
  );
  const context = offerText || fallbackContext;
  const basis = basisFor(node, offerText);
  const matches = ENGINE_DEFINITIONS
    .map((definition) => ({ definition, index: context.search(definition.pattern) }))
    .filter(({ index }) => index >= 0)
    .sort((a, b) => a.index - b.index)
    .map(({ definition }) => definition);
  const fallback = inferredDefinition(FALLBACK_ENGINE_BY_ROLE[node.marketParticipantRole]);
  const stackDefinitions = Array.from(new Map(
    (matches.length ? matches : [fallback]).map((definition) => [definition.engine, definition]),
  ).values()).slice(0, 3);
  const primary = stackDefinitions[0];
  const evidence = buildEvidence(node);
  const visiblePrice = extractVisiblePrice(offerText);
  const pricingVisibility: CommercialEvidenceBasis = visiblePrice
    ? "VERIFIED"
    : basis === "VERIFIED"
      ? "ESTIMATED"
      : "INFERRED";
  const buyer = node.reviewBuyer || node.economicBuyerName || node.reviewPointMan || node.pointManName || "the economic buyer";
  const channel = node.channel || node.host;
  const tof = text(node.reviewTof, node.tofChannels) || "public content";
  const mof = text(node.reviewMof, node.mofChannels) || channel;
  const offer = node.reviewOffer || node.bofOffer || primary.revenueModel;
  const qualifiedBasis = basis === "VERIFIED" ? "reviewed offer evidence" : basis === "ESTIMATED" ? "the linked offer context" : "the prospect's role and category";

  return {
    methodologyVersion: "commercial-intelligence-v1",
    primaryRevenueEngine: primary.engine,
    revenueStack: stackDefinitions.map((definition, index) => ({
      rank: index + 1,
      engine: definition.engine,
      evidenceBasis: matches.length ? basis : "INFERRED",
      rationale: `${qualifiedBasis} connects ${channel} to ${definition.revenueModel.toLowerCase()}`,
    })),
    contentCommercialRole: `${channel} uses ${tof} to create discovery and ${mof} to build enough subject-matter trust for ${buyer} to convert demand into ${offer}.`,
    revenueLeverage: `Use each long-form idea to ${primary.leverage}. The useful measure is qualified movement toward the offer, not raw clip volume.`,
    valueConversation: `The conversation with ${buyer} should be: how much more commercial value could ${channel} create if each strong idea repeatedly reached the right buyers and moved them toward ${primary.engine.toLowerCase()}?`,
    customerEconomics: {
      buyerUnit: buyer,
      revenueModel: primary.revenueModel,
      valueEstimate: visiblePrice
        ? `Publicly visible price evidence includes ${visiblePrice}; confirm scope and billing terms before outreach.`
        : primary.valueEstimate,
      pricingVisibility,
      pricingNote: visiblePrice
        ? "A price appears in the reviewed offer text; verify it is still current on the cited first-party page."
        : pricingVisibility === "ESTIMATED"
          ? "The offer is evidence-backed, but no public prospect-specific price was found. The economics are directional."
          : "Neither a public prospect-specific price nor a fully verified offer was found. Do not quote a value externally.",
    },
    evidence,
    confidence: confidenceFor(node, basis, evidence.length),
  };
}
