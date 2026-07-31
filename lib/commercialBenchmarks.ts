import type { Category, CommercialEvidenceBasis } from "./types";

export type CommercialBenchmark = {
  id: string;
  engine: string;
  range: string;
  unit: string;
  basis: string;
  caveat: string;
  examples: Array<{
    name: string;
    organization: string;
    avatar: string;
    priceConnection: string;
    url: string;
  }>;
  sources: Array<{
    title: string;
    url: string;
    observation: string;
  }>;
};

export type StackEconomics = {
  benchmarkId: string;
  range: string;
  unit: string;
  visibility: CommercialEvidenceBasis;
  note: string;
};

export const COMMERCIAL_BENCHMARKS: Record<string, CommercialBenchmark> = {
  research: {
    id: "research",
    engine: "Paid research and intelligence",
    range: "$10-$100/month for independent subscriptions; $400-$1,200/year for premium tiers; $1,000-$2,500 for individual institutional reports",
    unit: "subscription, membership, or report",
    basis: "Public first-party prices span creator research memberships through institutional energy reports.",
    caveat: "Enterprise multi-seat subscriptions and bespoke research are usually negotiated and can be materially higher.",
    examples: [
      { name: "Rory Johnston", organization: "Commodity Context", avatar: "Independent oil-market analyst and paid research operator", priceConnection: "His own official page publishes the $75/month or $750/year research price.", url: "https://www.commoditycontext.com/about" },
      { name: "Emmet Penney", organization: "Grid Brief", avatar: "Grid newsletter and podcast operator", priceConnection: "Grid Brief publicly launched Premium at $9.99/month.", url: "https://www.gridbrief.com/p/announcing-grid-brief-premium" },
      { name: "Demetri Kofinas", organization: "Hidden Forces", avatar: "Macro and markets podcast membership operator", priceConnection: "Hidden Forces publishes $15 and $30 monthly membership tiers.", url: "https://hiddenforces.io/subscribe/" },
    ],
    sources: [
      { title: "Grid Brief Premium", url: "https://www.gridbrief.com/p/announcing-grid-brief-premium", observation: "$9.99/month for premium grid research." },
      { title: "Commodity Context", url: "https://www.commoditycontext.com/about", observation: "$75/month or $750/year for oil-market research." },
      { title: "Doomberg", url: "https://newsletter.doomberg.com/about", observation: "$400/year standard and $1,200/year Pro." },
      { title: "Energy Intelligence shop", url: "https://shop.energyintel.com/collections/all", observation: "Many specialist reports are listed at $1,000-$2,500 each." },
    ],
  },
  advisory: {
    id: "advisory",
    engine: "Advisory and consulting mandates",
    range: "$200-$375/hour; roughly $1,600-$3,000/day; $10,000-$75,000 scoped mandate; $100,000-$250,000+ annual strategic relationship",
    unit: "hour, day, project, or annual retainer",
    basis: "Public GSA rate cards establish senior-advisor and partner rates; an SEC filing discloses a $250,000 annual Veriten engagement.",
    caveat: "Project and retainer ranges are derived from public hourly rates and disclosed annual engagements, not a quote from the prospect.",
    examples: [
      { name: "Arjun Murti", organization: "Veriten", avatar: "Energy research, strategy, investing, and executive advisory partner", priceConnection: "Liberty, the buyer, disclosed about $250,000 of annual Veriten consulting. This is an observed firm engagement, not Arjun's rate card or personal income.", url: "https://veriten.com/bio/arjun-murti/" },
      { name: "Eric Woodroof", organization: "Profitable Green Solutions / AEE", avatar: "Energy-efficiency consultant, trainer, and project developer", priceConnection: "His consulting price is not used; public GSA senior-advisor schedules supply the hourly comparable.", url: "https://education.aeecenter.org/products/premier-certified-energy-manager-cem-training-program-washington-dc-july-2026" },
    ],
    sources: [
      { title: "GSA senior-advisor rates", url: "https://www.gsaadvantage.gov/ref_text/47QRAA25D005V/108FBM.3VYS6A_47QRAA25D005V_47QRAA25D005V-3-4-2025-690152.PDF", observation: "Senior Advisor I-II rates of $224.18-$271.26/hour." },
      { title: "GSA consulting schedule", url: "https://www.gsaadvantage.gov/ref_text/GS10F0179M/GS10F0179M_online.htm", observation: "Senior consultant through managing partner rates of $162.09-$374.06/hour." },
      { title: "Liberty Energy 8-K", url: "https://www.sec.gov/Archives/edgar/data/1694028/000169402825000029/lbrt-20250115.htm", observation: "Liberty disclosed approximately $250,000 of Veriten consulting in 2024 and again in 2025." },
    ],
  },
  board: {
    id: "board",
    engine: "Board and governance roles",
    range: "$180,000-$390,000/year total cash and equity for public-company energy board service; committee and chair retainers can add $5,000-$60,000+",
    unit: "annual public-company board seat",
    basis: "SEC proxy statements disclose cash retainers, equity awards, and committee premiums for energy-company directors.",
    caveat: "This is a US public-company benchmark. Private and advisory boards may be unpaid, equity-only, or far below this range.",
    examples: [
      { name: "Arjun Murti", organization: "Liberty Energy and ConocoPhillips boards", avatar: "Energy investor-advisor with public-company directorships", priceConnection: "Company proxy statements publish the board programmes: about $275,000 at Liberty and $335,000 at ConocoPhillips before his committee-chair premium.", url: "https://veriten.com/bio/arjun-murti/" },
    ],
    sources: [
      { title: "Liberty Energy 2025 proxy", url: "https://www.sec.gov/Archives/edgar/data/1694028/000183988225009861/libertyenergy-pre14a_021925.htm", observation: "$100,000 cash plus $175,000 RSUs, with additional committee retainers." },
      { title: "ConocoPhillips 2024 proxy", url: "https://www.sec.gov/Archives/edgar/data/1163165/000130817924000384/cop4258041-def14a.htm", observation: "$115,000 cash plus $220,000 RSUs; Audit and Finance chair adds $35,000." },
      { title: "Chevron 2026 proxy", url: "https://www.sec.gov/Archives/edgar/data/93410/000119312526145617/d77994ddef14a.htm", observation: "$390,000 total annual non-employee director compensation." },
    ],
  },
  investment: {
    id: "investment",
    engine: "Investment and fund economics",
    range: "About 1%-2% of assets under management plus 15%-20% carried interest for private-fund models; investment-advisory schedules commonly decline as assets rise",
    unit: "annual management fee plus performance participation",
    basis: "SEC materials describe the traditional 2-and-20 private-fund structure; filed adviser fee schedules show roughly 1.125%-1.85% asset-based fees.",
    caveat: "This describes the manager's economic model, not the prospect's fund terms, assets, or personal income.",
    examples: [
      { name: "Arjun Murti", organization: "Veriten", avatar: "Energy GP/partner whose public research supports investing relationships", priceConnection: "Veriten's terms are not public. The 1%-2% plus 15%-20% range comes from SEC market materials, so this is an avatar example only.", url: "https://veriten.com/2023/03/veriten-welcomes-arjun-murti-as-partner/" },
    ],
    sources: [
      { title: "SEC private-fund fee discussion", url: "https://www.sec.gov/file/ia-5975pdf", observation: "Describes the traditional 2% management fee plus 20% carried-interest model." },
      { title: "SEC-filed adviser fee schedule", url: "https://reports.adviserinfo.sec.gov/crs/crs_108268.pdf", observation: "Published asset-based schedules range from 1.125% to 1.85%." },
    ],
  },
  sponsorship: {
    id: "sponsorship",
    engine: "Sponsorship and advertising",
    range: "$500 per pre-roll; about $1,500 promotional email; $2,000-$3,000 newsletter sponsorship; $6,000-$18,000/month exclusive energy-podcast sponsorship",
    unit: "placement, campaign, or monthly sponsorship",
    basis: "OGGN publishes a live energy-industry media price catalogue across podcast, newsletter, email, and ad inventory.",
    caveat: "OGGN is a scaled specialist network. Smaller shows may price lower; highly concentrated executive audiences can justify similar or higher value with fewer listeners.",
    examples: [
      { name: "Mark LaCour", organization: "OGGN", avatar: "Oil-and-gas podcast network founder and host", priceConnection: "OGGN, the network he launched, publishes the sponsorship catalogue used for this range.", url: "https://oggn.com/media-kit/" },
    ],
    sources: [
      { title: "OGGN sponsorship catalogue", url: "https://oggn.com/product-category/more-offerings/", observation: "$500 pre-roll, $1,500 email, $2,000-$3,000 newsletter, and $6,000-$18,000 podcast packages." },
      { title: "OGGN dedicated podcast sponsorship", url: "https://oggn.com/product/dedicated-podcast-sponsorship/", observation: "$6,000-$18,000/month for an exclusive weekly show package." },
    ],
  },
  speaking: {
    id: "speaking",
    engine: "Events and speaking",
    range: "$3,000-$20,000 per keynote or event appearance, usually plus travel",
    unit: "event or speaking engagement",
    basis: "An energy-specific podcast network publicly lists its hosts and industry speakers in this range.",
    caveat: "Celebrity, former senior-government, and globally recognized executives can exceed this range; panels and moderation may price lower.",
    examples: [
      { name: "Mark LaCour", organization: "OGGN", avatar: "Energy host, industry speaker, and media-network founder", priceConnection: "OGGN publicly offers its hosts and speakers at $3,000-$20,000 plus travel; the page does not publish a person-specific fee.", url: "https://oggn.com/about-us/" },
    ],
    sources: [
      { title: "OGGN event speaker", url: "https://oggn.com/product/event-speaker/", observation: "$3,000-$20,000 plus travel for an OGGN host or speaker." },
    ],
  },
  training: {
    id: "training",
    engine: "Education and training",
    range: "$2,000-$5,500 per seat for multi-day specialist energy training; roughly $4,400-$6,800 for a standardized corporate workshop before customization",
    unit: "participant seat or workshop",
    basis: "Energy associations and government schedules publish per-seat programme prices and fixed workshop rates.",
    caveat: "Private executive cohorts, in-house delivery, certification, travel, and custom curriculum can make total contract value materially higher.",
    examples: [
      { name: "Eric Woodroof", organization: "Association of Energy Engineers / Profitable Green Solutions", avatar: "Energy-management trainer, consultant, author, and keynote speaker", priceConnection: "AEE names him as an instructor on the same CEM programme that publishes $2,100-$2,445 participant pricing.", url: "https://education.aeecenter.org/products/premier-certified-energy-manager-cem-training-program-washington-dc-july-2026" },
    ],
    sources: [
      { title: "AEE Certified Energy Manager training", url: "https://education.aeecenter.org/products/premier-certified-energy-manager-cem-training-program-november-2025", observation: "$2,100-$2,445 per participant." },
      { title: "Energy Institute LNG course", url: "https://www.energyinst.org/whats-on/academy/course?meta_Id=LNGMASTER", observation: "GBP 1,325 member and GBP 2,310 non-member pricing for two days." },
      { title: "GSA workshop pricing", url: "https://www.gsaadvantage.gov/ref_text/47QTCA25D0026/100SQ0.3VR5KO_47QTCA25D0026_47QTCA25D0026-11-22-2024-303720.PDF", observation: "Standard workshops listed at about $4,398-$6,841." },
    ],
  },
  data: {
    id: "data",
    engine: "Data and software subscriptions",
    range: "$500-$7,500/year for an individual or single signal; roughly $10,000-$25,000/year for a team platform; large enterprise feeds remain custom",
    unit: "annual software or data subscription",
    basis: "Public energy-intelligence and net-zero-platform prices span individual access, data signals, and team subscriptions.",
    caveat: "API rights, redistribution, real-time data, number of meters or users, and enterprise integrations can move pricing well above the benchmark.",
    examples: [
      { name: "Olivier Corradi", organization: "Electricity Maps", avatar: "Technical founder who turns grid expertise and public education into enterprise data sales", priceConnection: "Electricity Maps publishes EUR 6,000/year for one data signal; that is a company price, not Olivier's personal fee.", url: "https://www.electricitymaps.com/company" },
      { name: "John Sodergreen and Het Shah", organization: "Enelyst", avatar: "Energy publisher and market analyst operating a paid intelligence platform", priceConnection: "Enelyst publicly prices platform membership at $550/year.", url: "https://www.enelyst.com/company.html" },
    ],
    sources: [
      { title: "Enelyst pricing", url: "https://www.enelyst.com/pricing.html", observation: "$550/year for energy market intelligence and messaging." },
      { title: "Electricity Maps pricing", url: "https://help.electricitymaps.com/en/articles/13169258-pricing-and-custom-options", observation: "EUR 6,000/year for a real-time day-ahead price signal." },
      { title: "NeuerEnergy G-Cloud pricing", url: "https://assets.applytosupply.digitalmarketplace.service.gov.uk/g-cloud-14/documents/702292/684094855583618-pricing-document-2024-05-07-0844.pdf", observation: "GBP 7,800-18,500/year platform tiers plus onboarding." },
    ],
  },
  recruiting: {
    id: "recruiting",
    engine: "Recruiting and talent services",
    range: "15%-28.25% of first-year salary; approximately $36,000 for mid-level professional search and $75,000 for senior executive search",
    unit: "successful placement or retained search",
    basis: "GSA-awarded recruiting schedules disclose percentage and fixed-fee structures.",
    caveat: "Energy scarcity, role seniority, retained exclusivity, salary level, guarantees, and travel determine the final fee.",
    examples: [
      { name: "David Hunt", organization: "Hyperion Search", avatar: "Cleantech executive-search founder and podcast host", priceConnection: "Hyperion's fee is not public. GSA schedules from Intelletec, JDG, and Korn Ferry provide the 15%-28.25% and fixed-fee comparables.", url: "https://hyperionsearch.com/meet-the-team/david-hunt/" },
    ],
    sources: [
      { title: "GSA Intelletec schedule", url: "https://www.gsaadvantage.gov/ref_text/47QREA23D000A/109YPT.3W0BKH_47QREA23D000A_MAR25UPDATEDCONTRACTPRICELISTINTELLETECSIN56131.PDF", observation: "15%-16% of annual base salary." },
      { title: "GSA retained search schedule", url: "https://www.gsaadvantage.gov/ref_text/47QREA21D0016/47QREA21D0016_MASTandCPricelist_Baseline_JDG_PS0006.pdf", observation: "28.25% of the top of the salary range plus capped expenses." },
      { title: "GSA Korn Ferry schedule", url: "https://www.gsaadvantage.gov/ref_text/GS00F349CA/0XJY7A.3TAB3V_GS-00F-349CA_SENSASOLUTIONSFSSPRICELISTPSS.PDF", observation: "$36,264 mid-level and $74,973 senior executive searches." },
    ],
  },
  enterprise: {
    id: "enterprise",
    engine: "Enterprise services and projects",
    range: "$80-$275/hour for energy engineering, project, and senior-advisor work; roughly $10,000-$100,000+ for a scoped expert project",
    unit: "hour or scoped project",
    basis: "GSA energy-services schedules publish analyst, engineer, project-manager, and advisor rates; project values are derived from 80-400 hours of work.",
    caveat: "Construction, equipment, software, procurement, and implementation contracts can be orders of magnitude larger; this benchmark covers expert-service labor, not project capex.",
    examples: [
      { name: "Eric Woodroof", organization: "Profitable Green Solutions", avatar: "Energy consultant and project developer selling measurable savings and implementation expertise", priceConnection: "His own project fee is not public. Energy Systems Group and senior-advisor GSA schedules supply the labor-rate comparable.", url: "https://www.aeecenter.org/wp-content/uploads/2021/12/PCF-Sample-Questions.pdf" },
    ],
    sources: [
      { title: "GSA Energy Systems Group schedule", url: "https://www.gsaadvantage.gov/ref_text/47QSHA21D001J/0X2Q06.3ST2YV_47QSHA21D001J_ESGMASPRICELIST.PDF", observation: "Energy-service analyst through management rates of roughly $80-$184/hour." },
      { title: "GSA senior-advisor schedule", url: "https://www.gsaadvantage.gov/ref_text/47QRAA25D005V/108FBM.3VYS6A_47QRAA25D005V_47QRAA25D005V-3-4-2025-690152.PDF", observation: "Senior Advisor rates of $224-$271/hour." },
    ],
  },
  support: {
    id: "support",
    engine: "Audience support and donations",
    range: "Voluntary or creator-set; no defensible universal customer value",
    unit: "one-time or recurring contribution",
    basis: "Donation economics depend on audience commitment, suggested tiers, and nonprofit status rather than a standardized service price.",
    caveat: "Use the prospect's live donation page or membership tiers. Do not assign an industry-wide price when none is published.",
    examples: [],
    sources: [],
  },
  intellectual_property: {
    id: "intellectual_property",
    engine: "Books and intellectual property",
    range: "Use listed retail pricing; speaking, bulk orders, and licensing are separate custom transactions",
    unit: "book, bulk order, or licence",
    basis: "Retail products are observable, but licensing rights and bulk economics are prospect-specific.",
    caveat: "A generic range would mix unlike formats and rights. Verify the live product page before outreach.",
    examples: [
      { name: "Alex Epstein", organization: "Center for Industrial Progress", avatar: "Energy author, speaker, and intellectual-property-led expert", priceConnection: "Use his current book or programme pages for retail pricing; bulk orders, licensing, and speaking are separate transactions.", url: "https://alexepstein.com/" },
    ],
    sources: [],
  },
  institutional: {
    id: "institutional",
    engine: "Institutional mandate and stakeholder influence",
    range: "No customer price: this is usually funded by an institutional budget, grant, membership base, or public mandate",
    unit: "institutional programme",
    basis: "The content can support mandate delivery and stakeholder outcomes without representing a creator-controlled transaction.",
    caveat: "Do not invent commercial customer economics for regulatory or institutionally funded content.",
    examples: [
      { name: "Jesse Jenkins", organization: "Princeton ZERO Lab", avatar: "Academic energy-system expert whose content supports an institutional research mandate", priceConnection: "There is no creator customer price to estimate from the role; funding, grants, and institutional budgets are different economics.", url: "https://mae.princeton.edu/people/faculty/jenkins" },
    ],
    sources: [],
  },
};

const ENGINE_TO_BENCHMARK: Record<string, string> = {
  "Paid research and intelligence": "research",
  "Advisory and consulting mandates": "advisory",
  "Board and governance roles": "board",
  "Investment and fund economics": "investment",
  "Sponsorship and advertising": "sponsorship",
  "Events and speaking": "speaking",
  "Education and training": "training",
  "Data and software subscriptions": "data",
  "Recruiting and talent services": "recruiting",
  "Enterprise services and projects": "enterprise",
  "Audience support and donations": "support",
  "Books and intellectual property": "intellectual_property",
  "Institutional mandate and stakeholder influence": "institutional",
};

export function getCommercialBenchmark(engine: string): CommercialBenchmark {
  return COMMERCIAL_BENCHMARKS[ENGINE_TO_BENCHMARK[engine] || "institutional"];
}

export const CATEGORY_COMMERCIAL_GUIDE: Array<{
  category: Category;
  avatars: string;
  likelyEngines: string;
  pricingInterpretation: string;
}> = [
  { category: "Fossil Fuels", avatars: "Independent analysts, operator-advisors, oilfield media hosts, board directors", likelyEngines: "Research, advisory, sponsorship, speaking, board service", pricingInterpretation: "Institutional buyers and public-company boards can support the top end, but operator-owned content may not be independently purchasable." },
  { category: "Power & Utilities", avatars: "Grid analysts, regulatory experts, utility advisors, software/data operators", likelyEngines: "Advisory, training, data subscriptions, board service", pricingInterpretation: "Regulated-market complexity supports specialist fees; distinguish a public mandate from a creator-controlled offer." },
  { category: "Renewables", avatars: "Project advisors, recruiters, developers, executive coaches, investor-hosts", likelyEngines: "Enterprise projects, recruiting, advisory, investment economics", pricingInterpretation: "Recruiting and development contracts can be valuable, but startup budget and project stage create a wide range." },
  { category: "Nuclear", avatars: "Independent researchers, educators, advocates, technical advisors", likelyEngines: "Research subscriptions, training, advisory, audience support", pricingInterpretation: "Technical scarcity supports premium education and advisory; advocacy content may monetize through support rather than services." },
  { category: "Energy Enablers", avatars: "Software founders, data analysts, engineering-service experts, talent operators", likelyEngines: "Data/software, enterprise services, recruiting", pricingInterpretation: "Price by users, data rights, implementation scope, or placement value rather than audience size." },
  { category: "Commodity & Energy Markets", avatars: "Market analysts, traders, fund managers, intelligence publishers", likelyEngines: "Research, data, advisory, investment/fund economics", pricingInterpretation: "Decision value and institutional access matter more than follower count; separate subscriptions from regulated investment economics." },
  { category: "Energy Media & Research", avatars: "Newsletter operators, podcast networks, research publishers, event hosts", likelyEngines: "Subscriptions, reports, sponsorship, speaking and events", pricingInterpretation: "Audience concentration and buyer quality drive sponsorship; depth and decision utility drive research pricing." },
  { category: "Energy Advisory & Expertise", avatars: "Independent consultants, former executives, academics, board members", likelyEngines: "Advisory, speaking, training, board and governance roles", pricingInterpretation: "Use public rate cards and filings as anchors, then adjust for scope, authority, buyer size, and whether the role is public, private, or advisory." },
];

export const PROSPECT_PRICE_OVERRIDES: Record<string, Array<{
  engine: string;
  range: string;
  unit: string;
  visibility: CommercialEvidenceBasis;
  note: string;
  url: string;
}>> = {
  "emmet-penney": [{ engine: "Paid research and intelligence", range: "$9.99/month", unit: "Grid Brief Premium subscription", visibility: "VERIFIED", note: "Published on Grid Brief's official launch page.", url: "https://www.gridbrief.com/p/announcing-grid-brief-premium" }],
  "demetri-kofinas": [{ engine: "Paid research and intelligence", range: "$15/month or $150/year; $30/month or $300/year; top community tier by enquiry", unit: "Hidden Forces membership", visibility: "VERIFIED", note: "Published on the official membership page.", url: "https://hiddenforces.io/subscribe/" }],
  "doomberg": [{ engine: "Paid research and intelligence", range: "$400/year standard; $1,200/year Pro", unit: "Doomberg subscription", visibility: "VERIFIED", note: "Published in Doomberg's official pricing FAQ.", url: "https://newsletter.doomberg.com/about" }],
  "energy-intelligence": [{ engine: "Paid research and intelligence", range: "$1,000-$2,500 per listed specialist report; corporate subscriptions by enquiry", unit: "institutional report or subscription", visibility: "VERIFIED", note: "The official shop lists report prices; corporate subscription pricing is not public.", url: "https://shop.energyintel.com/collections/all" }],
};
