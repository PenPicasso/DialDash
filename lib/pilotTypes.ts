export type PilotCohort = "CURRENT_READY" | "RECOVERY_REVIEW" | "NEW_SOURCE";

export type PilotDecision = "PURSUE_NOW" | "NURTURE" | "DISQUALIFIED";

export type GateStatus = "PASS" | "FAIL" | "CAUTION";

export type EvidenceSourceType =
  | "OFFICIAL_SITE"
  | "APPLE_PODCASTS"
  | "RSS"
  | "YOUTUBE_API"
  | "YOUTUBE_FRAME"
  | "PUBLIC_PROFILE"
  | "FIRECRAWL";

export type PilotEvidence = {
  id: string;
  label: string;
  url: string;
  sourceType: EvidenceSourceType;
  claim: string;
};

export type PilotScore = {
  contentSupply: number;
  distributionGap: number;
  commercialOffer: number;
  audienceLeverage: number;
  reachability: number;
  visualFit: number;
  total: number;
};

export type PilotGate = {
  gate: string;
  status: GateStatus;
  explanation: string;
  evidenceIds: string[];
};

export type PilotFunnelStage = {
  stage: "TOF" | "MOF" | "BOF";
  label: string;
  observed: string[];
  gap: string;
  proposed: string[];
  evidenceIds: string[];
};

export type PilotOutreach = {
  primaryChannel: string;
  publicContact: string;
  contactConfidence: "VERIFIED" | "PUBLIC_UNTESTED" | "MISSING";
  sequence: string[];
  dm: string;
  emailFollowUp: string;
};

export type PilotSample = {
  sourceTitle: string;
  sourceDate: string;
  sourceUrl: string;
  angle: string;
  visualPlan: string[];
  caveat?: string;
};

export type FirecrawlComparison = {
  used: boolean;
  sourceStatus: string;
  addedEvidence: string[];
  decisionChanged: boolean;
  conclusion: string;
};

export type PilotReport = {
  id: string;
  rank: number;
  cohort: PilotCohort;
  baselineStatus: "READY" | "REJECTED" | "NEW";
  person: string;
  organization: string;
  role: string;
  economicBuyer: string;
  contentOwner: string;
  decision: PilotDecision;
  confidence: number;
  score: PilotScore;
  summary: string;
  methodNote: string;
  gates: PilotGate[];
  freshness: {
    status: "ACTIVE" | "SEMI_ACTIVE" | "INACTIVE" | "UNVERIFIED";
    latestTitle: string;
    latestDate: string;
    cadence: string;
    evidenceIds: string[];
  };
  video: {
    ownedChannel: string;
    subscribers: number | null;
    shortCountLast30: number | null;
    shortCountLast30Days: number | null;
    engine: string;
    qualityObservation: string;
    evidenceIds: string[];
  };
  actualOffer: {
    type: string;
    description: string;
    evidenceIds: string[];
  };
  funnel: PilotFunnelStage[];
  whyTheyMayBuy: string[];
  whyTheyMayNotBuy: string[];
  sample: PilotSample;
  outreach: PilotOutreach;
  firecrawl: FirecrawlComparison;
  evidence: PilotEvidence[];
};

export type PilotPayload = {
  id: string;
  asOfDate: string;
  title: string;
  description: string;
  methodologyVersion: string;
  experiment: {
    deterministicSecondsCold: number;
    deterministicSecondsCached: number;
    firecrawlSeconds: number;
    firecrawlPagesAttempted: number;
    firecrawlValidPages: number;
    firecrawlMeaningfulContactAdds: number;
    firecrawlDecisionChanges: number;
    productionRowsChanged: number;
  };
  reports: PilotReport[];
};
