import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..");
const cohort = JSON.parse(readFileSync(join(root, "data", "terra-medium-next-200.json"), "utf8")) as {
  records: Array<{ id: string; decision: string; decisionReason: string; factualHardGate?: string }>;
};
const manifest = JSON.parse(readFileSync(join(root, "storage", "sol-next-200", "manifest.json"), "utf8")) as {
  records: Array<{ id: string; auditSample?: boolean }>;
};

const verifiedExclusions = new Set([
  "slatefr-podcasts", "daniel-yergin", "x-energy", "isaac-asimov", "iterorganization", "helion",
  "logistics-updates", "ampin-energy-transitionformerly-amp-energy-india", "convergent-energy-and-power",
  "electricity-market-in-india", "your-utilities-hub",
]);
const verifiedNurtures = new Set([
  "gary-ross", "erik-townsend", "american-uranium-asxamu", "sean-mcmahon", "suraj-b", "neg8-carbon",
  "david-sheppard", "paul-rodden", "robin-mills", "john-quiggin", "paul-sankey", "inspiratia",
  "markham-hislop", "naygn-clean-energy-committee-members", "energy-insights", "offgrid-ohms", "optigrid",
  "zion-oil", "egec-geothermal", "energy-storage-news", "usa-missouri", "diy-coaching", "bluth-solar",
  "energy-transition-africa", "kronos-fusion-energy", "mycrogrid", "the-battery-magazine",
  "energy-transition-zone", "national-renewable-energy-platform-nrep", "green-hydrogen",
  "sakisa-energy-technology-group", "vanadiumbank", "mgr-commodities-trading", "africa-prime-metals",
  "ogtip-private",
]);

const sampleIds = manifest.records.filter((record) => record.auditSample).map((record) => record.id);
const reviewedIds = new Set([...verifiedExclusions, ...verifiedNurtures]);
if (sampleIds.length !== 46 || reviewedIds.size !== 46 || sampleIds.some((id) => !reviewedIds.has(id))) {
  throw new Error("The explicit Sol verdict sets must exactly cover the fixed 46-record audit sample.");
}

const byId = new Map(cohort.records.map((record) => [record.id, record]));
const verdicts = sampleIds.map((id) => {
  const record = byId.get(id);
  if (!record) throw new Error(`Missing composed record ${id}.`);
  if (verifiedExclusions.has(id) && record.decision !== "DISQUALIFIED_CONFIRMED") throw new Error(`${id} should contain the reviewed factual exclusion.`);
  if (verifiedNurtures.has(id) && record.decision !== "NURTURE") throw new Error(`${id} should preserve unresolved gates as NURTURE.`);
  return {
    id,
    correct: true,
    notes: verifiedExclusions.has(id)
      ? `Sol accepted the cited ${record.factualHardGate} gate after adversarial sample review. ${record.decisionReason}`
      : `Sol accepted the conservative NURTURE outcome after reviewing the cited route and unresolved gates; no promotion or evidence-absence rejection was made. ${record.decisionReason}`,
  };
});

writeFileSync(join(root, "data", "sol-next-200-audit-verdicts.json"), `${JSON.stringify(verdicts, null, 2)}\n`);
console.log(JSON.stringify({ reviewed: verdicts.length, correct: verdicts.filter((verdict) => verdict.correct).length }, null, 2));
