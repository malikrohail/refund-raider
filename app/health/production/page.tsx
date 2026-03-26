import { ProductionHealthPanel } from "@/components/productionHealthPanel";
import { getPersistenceRuntimeState } from "@/server/db/fileStore";
import { getGmailRuntimeState } from "@/server/integrations/gmail";
import { getEmailRuntimeState } from "@/server/providers/email";
import { getFirecrawlRuntimeState } from "@/server/providers/firecrawl";
import { getOcrRuntimeState } from "@/server/providers/ocr";
import { getAgentRuntime } from "@/server/services/elevenLabsAgentService";

export default async function ProductionHealthPage() {
  const [intakeAgent, caseAgent] = await Promise.all([
    getAgentRuntime("intake"),
    getAgentRuntime("case")
  ]);

  const providers = [
    getPersistenceRuntimeState(),
    getFirecrawlRuntimeState(),
    getEmailRuntimeState(),
    getOcrRuntimeState(),
    getGmailRuntimeState()
  ];

  return (
    <ProductionHealthPanel
      intakeAgent={{ ...intakeAgent, label: "Intake agent" }}
      caseAgent={{ ...caseAgent, label: "Case agent" }}
      providers={providers}
    />
  );
}
