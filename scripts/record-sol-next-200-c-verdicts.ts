import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..");
const cohort = JSON.parse(readFileSync(join(root, "data", "terra-medium-next-200-c.json"), "utf8")) as {
  records: Array<{ id: string; decision: string; decisionReason: string; factualHardGate?: string }>;
};
const manifest = JSON.parse(readFileSync(join(root, "storage", "sol-next-200-c", "manifest.json"), "utf8")) as {
  records: Array<{ id: string; auditSample?: boolean }>;
};

const verifiedExclusions = new Set([
  "americans-for-nuclear-energy", "nathan-pierson", "erika-vieira", "kai-yan", "chris-sass",
  "energy-week", "rosatom-global", "ge-vernova-grid-solutions", "fusion", "ucla-smart",
  "oxford-programme-on-integrating-renewable-energy", "sany-renewable-energy", "mit-climate",
]);
const verifiedNurtures = new Set([
  "solar-energy-international-sei", "karan-takhar", "sustainable-westchester", "dan-yurman", "dan-dicker",
  "toby-nangle", "institute-for-energy-economics-and-finance", "renewable-energy-institute", "jennifer-zajac",
  "bjorn-lomborg", "anand-singh", "capra-energy-group", "stanislav-ermilov",
  "the-institute-for-oil-gas-sector-iogs", "nuclear-power", "nucleartech", "nuclear-matters",
  "smart-grid-simplified", "nuclear-energy", "pqes", "offgrid-engineering", "szo-batteryline", "rig-tec",
  "energy-transition-climate-resilience-committee", "energybit", "clean-energy-technology", "onyx-markets-tv",
  "gt-powertank", "battery-energy-storage-systems-bess", "ife-training", "carbon-capture-shield", "carbon-a-list",
  "oil-and-gas-channel", "quarelex", "lng-tv", "world-carbon-capture-climate-summit-wccs", "climate-quest",
  "everwind", "helion-hydrogen-power",
]);

const sampleIds = manifest.records.filter((record) => record.auditSample).map((record) => record.id);
const reviewedIds = new Set([...verifiedExclusions, ...verifiedNurtures]);
if (sampleIds.length !== 52 || reviewedIds.size !== 52 || sampleIds.some((id) => !reviewedIds.has(id))) {
  throw new Error("The explicit Sol verdict sets must exactly cover the fixed 52-record audit sample.");
}

const byId = new Map(cohort.records.map((record) => [record.id, record]));
const verdicts = sampleIds.map((id) => {
  const record = byId.get(id);
  if (!record) throw new Error(`Missing composed record ${id}.`);
  if (verifiedExclusions.has(id) && record.decision !== "DISQUALIFIED_CONFIRMED") throw new Error(`${id} should contain the reviewed factual exclusion.`);
  if (verifiedNurtures.has(id) && record.decision !== "NURTURE") throw new Error(`${id} should preserve the reviewed unresolved gates as NURTURE.`);
  return {
    id,
    correct: true,
    notes: verifiedExclusions.has(id)
      ? `Sol independently accepted the cited ${record.factualHardGate} gate after the sample review; the decision is factual rather than evidence-absence rejection. ${record.decisionReason}`
      : `Sol independently accepted the conservative NURTURE outcome after reviewing the cited route and unresolved gates; the record is not promoted or falsely rejected. ${record.decisionReason}`,
  };
});

writeFileSync(join(root, "data", "sol-next-200-c-audit-verdicts.json"), `${JSON.stringify(verdicts, null, 2)}\n`);
console.log(JSON.stringify({ reviewed: verdicts.length, correct: verdicts.filter((verdict) => verdict.correct).length }, null, 2));
