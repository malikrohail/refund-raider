import type { CaseDetailPayload } from "@/lib/contracts/domain";

export type OperatorProviderState = {
  provider: string;
  mode: "live" | "mock";
  readiness: "ready" | "demo_safe" | "missing_config" | "provider_failure";
  configured: boolean;
  demoSafe: boolean;
  label: string;
  message: string;
};

export type OperatorRuntimePayload = {
  providers: Record<string, OperatorProviderState>;
} | null;

export type OperatorStepState = "complete" | "active" | "pending" | "blocked";

export type OperatorStep = {
  label: string;
  state: OperatorStepState;
  detail: string;
};

export type OperatorService = {
  label: string;
  state: "ready" | "missing" | "waiting" | "active";
  detail: string;
};

export type OperatorStatus = {
  activeChannel: string;
  nextAction: string;
  steps: OperatorStep[];
  services: OperatorService[];
};

function getProviderServiceState(provider?: OperatorProviderState): OperatorService["state"] {
  if (!provider) {
    return "waiting";
  }

  if (provider.readiness === "ready") {
    return "ready";
  }

  if (provider.readiness === "demo_safe") {
    return "active";
  }

  return "missing";
}

export function deriveOperatorStatus(
  caseDetail: CaseDetailPayload,
  providerRuntime: OperatorRuntimePayload
): OperatorStatus {
  const activeChannel = caseDetail.activeActionPlan?.primaryChannel?.replaceAll("_", " ") ?? "research first";

  let nextAction = "Refresh research to gather evidence.";
  if (caseDetail.activeStrategy && !caseDetail.activeActionPlan) {
    nextAction = "Build the action plan so the operator can choose email or manual follow-through.";
  } else if (caseDetail.activeActionPlan && !caseDetail.activeDraft) {
    nextAction = "Create the draft for the selected path.";
  } else if (caseDetail.activeDraft?.status === "draft") {
    nextAction = "Approve the draft so execution can proceed.";
  } else if (caseDetail.activeDraft?.status === "approved") {
    nextAction = "Send the approved message and move the case into waiting.";
  } else if (caseDetail.case.status === "waiting") {
    nextAction = "Wait for merchant response or schedule the follow-up.";
  }

  const steps: OperatorStep[] = [
    {
      label: "Intake captured",
      state: "complete",
      detail: `${caseDetail.case.merchantName} · ${caseDetail.case.issueSummary}`
    },
    {
      label: "Evidence gathered",
      state: caseDetail.activeStrategy
        ? "complete"
        : caseDetail.case.status === "researching"
          ? "active"
          : "pending",
      detail: caseDetail.activeStrategy
        ? "Verdict and deadline are visible."
        : "Research must run before the operator can choose a path."
    },
    {
      label: "Action path chosen",
      state: caseDetail.activeActionPlan
        ? "complete"
        : caseDetail.activeStrategy
          ? "active"
          : "pending",
      detail: caseDetail.activeActionPlan
        ? `Primary channel: ${activeChannel}.`
        : "The operator still needs to choose email or manual follow-through."
    },
    {
      label: "Execution chain",
      state:
        caseDetail.case.status === "waiting" || caseDetail.case.status === "sent"
          ? "complete"
          : caseDetail.activeActionPlan
            ? "active"
            : "pending",
      detail:
        caseDetail.case.status === "waiting" || caseDetail.case.status === "sent"
          ? "Execution happened. The case is now waiting on the merchant."
          : "The operator will execute only after the chosen email or manual path is actually ready."
    }
  ];

  const services: OperatorService[] = [
    {
      label: "Firecrawl",
      state: getProviderServiceState(providerRuntime?.providers.firecrawl),
      detail: providerRuntime?.providers.firecrawl?.message ?? "Research provider status unknown."
    },
    {
      label: "Email",
      state: getProviderServiceState(providerRuntime?.providers.email),
      detail: providerRuntime?.providers.email?.message ?? "Email provider status unknown."
    },
    {
      label: "Gmail",
      state: getProviderServiceState(providerRuntime?.providers.gmail),
      detail: providerRuntime?.providers.gmail?.message ?? "Gmail provider status unknown."
    }
  ];

  return {
    activeChannel,
    nextAction,
    steps,
    services
  };
}
