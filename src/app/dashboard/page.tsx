import { DashboardShell } from "@/components/dashboard-shell";
import { getAgentGDP } from "@/lib/agent-gdp";
import { listReports } from "@/lib/research-db";
import { getGDPHistory } from "@/lib/gdp-history";
import type { AgentGDP } from "@/lib/agent-gdp";
import type { ResearchReport } from "@/lib/research-db";
import type { GDPSnapshot } from "@/lib/gdp-history";

export const revalidate = 3600;

export default async function DashboardPage() {
  let gdp: AgentGDP | null = null;
  let reports: ResearchReport[] = [];
  let history: GDPSnapshot[] = [];

  try { gdp = await getAgentGDP(); } catch { /* unavailable */ }
  try { reports = await listReports(5); } catch { /* unavailable */ }
  try { history = await getGDPHistory(30); } catch { /* unavailable */ }

  return <DashboardShell gdp={gdp} reports={reports} history={history} />;
}
