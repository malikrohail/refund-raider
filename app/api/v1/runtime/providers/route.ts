import { ok } from "@/lib/api/response";
import { env, getMissingServerEnv, getProviderRuntimeState, isDemoSafeModeEnabled } from "@/lib/config/env";
import { getPersistenceRuntimeState } from "@/server/db/fileStore";
import { getGmailRuntimeState } from "@/server/integrations/gmail";
import { getEmailRuntimeState } from "@/server/providers/email";
import { getFirecrawlRuntimeState } from "@/server/providers/firecrawl";
import { getOcrRuntimeState } from "@/server/providers/ocr";
import { getAgentRuntime } from "@/server/services/elevenLabsAgentService";

export async function GET() {
  const demoSafeMode = isDemoSafeModeEnabled();
  const elevenLabsRuntime = await getAgentRuntime("case");

  return ok({
    runtime: {
      demoSafeMode,
      defaultProviderMode: demoSafeMode ? "mock" : "live",
      message: demoSafeMode
        ? "Demo safety mode is enabled, so providers will stay on mock output unless a surface opts into live mode explicitly."
        : "Demo safety mode is off, so providers may run live when configured."
    },
    providers: {
      database: getPersistenceRuntimeState(),
      firecrawl: getFirecrawlRuntimeState(),
      email: getEmailRuntimeState(),
      elevenLabs:
        elevenLabsRuntime.mode === "configured"
          ? {
              ...getProviderRuntimeState("elevenlabs", true),
              message: `elevenlabs is live and ready with ${elevenLabsRuntime.toolNames.length} attached tools.`
            }
          : elevenLabsRuntime.mode === "misconfigured"
            ? {
                provider: "elevenlabs",
                mode: "live" as const,
                readiness: "provider_failure" as const,
                configured: Boolean(env.elevenLabsApiKey && elevenLabsRuntime.agentId !== "mock-agent"),
                demoSafe: false,
                label: "misconfigured",
                message:
                  elevenLabsRuntime.configurationState === "missing_tools"
                    ? `elevenlabs agent is live but missing tools: ${elevenLabsRuntime.missingToolNames.join(", ")}`
                    : "elevenlabs agent is not fully configured yet."
              }
            : getProviderRuntimeState("elevenlabs", false),
      ocr: getOcrRuntimeState(),
      gmail: getGmailRuntimeState()
    },
    missingServerEnv: getMissingServerEnv()
  });
}
