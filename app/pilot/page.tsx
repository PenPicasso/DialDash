import { PilotWorkspace } from "@/components/pilot/pilotWorkspace";
import { pilotReports } from "@/data/pilotReports";

export default function PilotPage() {
  return <PilotWorkspace payload={pilotReports} />;
}
