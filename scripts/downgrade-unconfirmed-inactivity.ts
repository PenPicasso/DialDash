import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..");
let changed = 0;

for (let batch = 1; batch <= 8; batch += 1) {
  const path = join(root, "data", "terra-medium-next-200", `batch-${batch}.json`);
  if (!existsSync(path)) continue;
  const data = JSON.parse(readFileSync(path, "utf8")) as { records: Array<Record<string, unknown>> };
  for (const record of data.records) {
    if (record.decision !== "DISQUALIFIED_CONFIRMED" || record.factualHardGate !== "INACTIVE_OVER_90_DAYS") continue;
    record.decision = "NURTURE";
    record.decisionReason = "The official podcast or video source is more than 90 days old, but the true latest publication across every owned channel has not been cross-checked. This is unresolved inactivity evidence, not a factual rejection.";
    delete record.factualHardGate;
    record.unresolvedGates = [
      "CROSS_CHANNEL_TRUE_LATEST",
      "FIRST_PARTY_OWNER_HOST_BUYER",
      "VERIFIED_PERSON_TIED_CONTACT",
      "VERIFIED_COMMERCIAL_OFFER",
      "OBSERVED_TOF_MOF_BOF",
      "THREE_SAMPLE_VIDEO_GAP",
      "TRANSACTION_SPECIFIC_PITCH_HOOK"
    ];
    changed += 1;
  }
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

console.log(JSON.stringify({ downgradedToNurture: changed }, null, 2));
