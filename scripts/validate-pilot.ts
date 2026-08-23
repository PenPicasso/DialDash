import { pilotReports } from "../data/pilotReports";
import type { PilotCohort, PilotDecision, PilotReport } from "../lib/pilotTypes";

const errors: string[] = [];
const expectedCohorts: Record<PilotCohort, number> = {
  CURRENT_READY: 5,
  RECOVERY_REVIEW: 5,
  NEW_SOURCE: 5,
};
const expectedDecisions: Record<PilotDecision, number> = {
  PURSUE_NOW: 9,
  NURTURE: 3,
  DISQUALIFIED: 3,
};
const scoreMaximums = {
  contentSupply: 20,
  distributionGap: 25,
  commercialOffer: 20,
  audienceLeverage: 15,
  reachability: 10,
  visualFit: 10,
} as const;

function hasText(value: string | undefined | null) {
  return typeof value === "string" && value.trim().length > 0;
}

function countBy<T extends string>(values: T[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function validateEvidenceReferences(report: PilotReport) {
  const evidenceIds = new Set(report.evidence.map((item) => item.id));
  const referenced = [
    ...report.gates.flatMap((gate) => gate.evidenceIds),
    ...report.freshness.evidenceIds,
    ...report.video.evidenceIds,
    ...report.actualOffer.evidenceIds,
    ...report.funnel.flatMap((stage) => stage.evidenceIds),
  ];

  for (const id of referenced) {
    if (!evidenceIds.has(id)) errors.push(`${report.id}: missing evidence object for reference "${id}"`);
  }

  for (const item of report.evidence) {
    if (!hasText(item.claim)) errors.push(`${report.id}: evidence ${item.id} has no claim`);
    try {
      const url = new URL(item.url);
      if (url.protocol !== "https:") errors.push(`${report.id}: evidence ${item.id} must use HTTPS`);
    } catch {
      errors.push(`${report.id}: evidence ${item.id} has an invalid URL`);
    }
  }
}

function validateReport(report: PilotReport) {
  for (const field of ["person", "organization", "role", "economicBuyer", "contentOwner", "summary", "methodNote"] as const) {
    if (!hasText(report[field])) errors.push(`${report.id}: missing ${field}`);
  }

  const scoreParts = Object.keys(scoreMaximums) as Array<keyof typeof scoreMaximums>;
  const scoreTotal = scoreParts.reduce((sum, key) => sum + report.score[key], 0);
  if (scoreTotal !== report.score.total) errors.push(`${report.id}: score total ${report.score.total} does not equal ${scoreTotal}`);
  for (const key of scoreParts) {
    if (report.score[key] < 0 || report.score[key] > scoreMaximums[key]) {
      errors.push(`${report.id}: ${key} score ${report.score[key]} is outside 0-${scoreMaximums[key]}`);
    }
  }

  if (report.gates.length < 6) errors.push(`${report.id}: fewer than six hard-gate checks`);
  if (report.funnel.length !== 3 || report.funnel.map((stage) => stage.stage).join(",") !== "TOF,MOF,BOF") {
    errors.push(`${report.id}: funnel must contain TOF, MOF, and BOF in order`);
  }
  if (!hasText(report.actualOffer.type) || !hasText(report.actualOffer.description)) errors.push(`${report.id}: missing observed offer conclusion`);
  if (!hasText(report.freshness.latestTitle) || !hasText(report.freshness.latestDate)) errors.push(`${report.id}: missing freshness evidence`);
  if (!hasText(report.sample.sourceUrl) || report.sample.visualPlan.length < 2) errors.push(`${report.id}: incomplete sample brief`);
  if (report.whyTheyMayBuy.length === 0 || report.whyTheyMayNotBuy.length === 0) errors.push(`${report.id}: missing balanced buying analysis`);
  if (report.outreach.sequence.length < 2) errors.push(`${report.id}: outreach sequence is incomplete`);

  const latest = new Date(`${report.freshness.latestDate}T12:00:00Z`);
  const asOf = new Date(`${pilotReports.asOfDate}T23:59:59Z`);
  if (Number.isNaN(latest.getTime())) errors.push(`${report.id}: invalid latest date`);
  if (latest > asOf) errors.push(`${report.id}: latest date is after the pilot as-of date`);

  if (report.decision === "PURSUE_NOW") {
    if (report.gates.some((gate) => gate.status === "FAIL")) errors.push(`${report.id}: PURSUE_NOW has a failed hard gate`);
    if (!['ACTIVE', 'SEMI_ACTIVE'].includes(report.freshness.status)) errors.push(`${report.id}: PURSUE_NOW is not active or semi-active`);
    if (report.outreach.contactConfidence === "MISSING") errors.push(`${report.id}: PURSUE_NOW has no public contact`);
    if (/no .*offer verified/i.test(report.actualOffer.type)) errors.push(`${report.id}: PURSUE_NOW has no verified offer`);
  }

  validateEvidenceReferences(report);
}

if (pilotReports.reports.length !== 15) errors.push(`expected 15 reports, found ${pilotReports.reports.length}`);
if (pilotReports.experiment.productionRowsChanged !== 0) errors.push("pilot changed production rows");

const ids = pilotReports.reports.map((report) => report.id);
const ranks = pilotReports.reports.map((report) => report.rank);
if (new Set(ids).size !== ids.length) errors.push("duplicate pilot report IDs");
if (new Set(ranks).size !== ranks.length || Math.min(...ranks) !== 1 || Math.max(...ranks) !== 15) errors.push("ranks must be unique from 1 to 15");

const cohortCounts = countBy(pilotReports.reports.map((report) => report.cohort));
const decisionCounts = countBy(pilotReports.reports.map((report) => report.decision));
for (const [cohort, expected] of Object.entries(expectedCohorts)) {
  if ((cohortCounts[cohort] || 0) !== expected) errors.push(`${cohort}: expected ${expected}, found ${cohortCounts[cohort] || 0}`);
}
for (const [decision, expected] of Object.entries(expectedDecisions)) {
  if ((decisionCounts[decision] || 0) !== expected) errors.push(`${decision}: expected ${expected}, found ${decisionCounts[decision] || 0}`);
}

pilotReports.reports.forEach(validateReport);

console.log("Pilot validation summary:");
console.log(`- reports: ${pilotReports.reports.length}`);
console.log(`- cohorts: ${JSON.stringify(cohortCounts)}`);
console.log(`- decisions: ${JSON.stringify(decisionCounts)}`);
console.log(`- production rows changed: ${pilotReports.experiment.productionRowsChanged}`);

if (errors.length > 0) {
  console.error(`\nErrors (${errors.length}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nPilot validation passed.");
