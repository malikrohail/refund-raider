import { describe, expect, it } from "vitest";
import { deriveOperatorStatus } from "../../src/lib/operator/operatorStatus";
import type { CaseDetailPayload } from "../../src/lib/contracts/domain";

function buildCaseDetail(overrides: Partial<CaseDetailPayload> = {}): CaseDetailPayload {
  return {
    case: {
      id: "case_123",
      userId: "user_123",
      merchantName: "Cursor",
      merchantUrl: "https://cursor.com",
      issueSummary: "cancel subscription during trial period",
      issueType: "subscription_cancellation",
      desiredOutcome: "full_refund",
      caseKind: "cancellation",
      purchaseDate: "2026-03-24",
      paymentMethod: "credit_card",
      status: "planning",
      automationConfidence: "medium",
      consentState: "not_required",
      priority: "normal",
      currency: "USD",
      orderTotalAmount: null,
      merchantContactEmail: null,
      createdAt: "2026-03-25T00:00:00.000Z",
      updatedAt: "2026-03-25T00:00:00.000Z"
    },
    artifacts: [],
    latestResearchRun: null,
    policySources: [],
    activeStrategy: null,
    merchantProfile: null,
    activeActionPlan: null,
    actionRuns: [],
    approvals: [],
    followUps: [],
    currentAutomationSession: null,
    browserSnapshots: [],
    browserCommands: [],
    automationEvents: [],
    activeDraft: null,
    timeline: [],
    ...overrides
  };
}

describe("deriveOperatorStatus", () => {
  it("keeps the execution chain focused on the chosen path without a browser-runtime dependency", () => {
    const status = deriveOperatorStatus(
      buildCaseDetail({
        activeStrategy: {
          id: "strategy_123",
          caseId: "case_123",
          eligibility: "eligible",
          recommendedPath: "support_form_first",
          fallbackPath: null,
          deadlineAt: null,
          plainEnglishSummary: "Eligible",
          reasoningNotes: {},
          createdAt: "2026-03-25T00:00:00.000Z",
          updatedAt: "2026-03-25T00:00:00.000Z"
        },
        activeActionPlan: {
          id: "plan_123",
          caseId: "case_123",
          status: "ready",
          summary: "Prepare the manual support path.",
          recommendedOutcome: "cancellation",
          primaryChannel: "ops_queue",
          fallbackChannel: "email",
          automationConfidence: "low",
          requiresConsent: false,
          opsFallbackReason: null,
          createdAt: "2026-03-25T00:00:00.000Z",
          updatedAt: "2026-03-25T00:00:00.000Z"
        }
      }),
      {
        providers: {
          firecrawl: {
            provider: "firecrawl",
            mode: "live",
            readiness: "ready",
            configured: true,
            demoSafe: false,
            label: "Firecrawl",
            message: "ready"
          },
          email: {
            provider: "email",
            mode: "live",
            readiness: "ready",
            configured: true,
            demoSafe: false,
            label: "Email",
            message: "ready"
          },
          gmail: {
            provider: "gmail",
            mode: "mock",
            readiness: "demo_safe",
            configured: false,
            demoSafe: true,
            label: "Gmail",
            message: "optional"
          }
        }
      }
    );

    expect(status.steps.at(-1)?.state).toBe("active");
    expect(status.nextAction).toContain("Create the draft");
    expect(status.services.find((service) => service.label === "Browser runtime")).toBeUndefined();
  });

  it("marks execution complete once the case is waiting on the merchant", () => {
    const status = deriveOperatorStatus(
      buildCaseDetail({
        case: {
          ...buildCaseDetail().case,
          status: "waiting"
        },
        activeStrategy: {
          id: "strategy_123",
          caseId: "case_123",
          eligibility: "eligible",
          recommendedPath: "support_email_first",
          fallbackPath: null,
          deadlineAt: null,
          plainEnglishSummary: "Eligible",
          reasoningNotes: {},
          createdAt: "2026-03-25T00:00:00.000Z",
          updatedAt: "2026-03-25T00:00:00.000Z"
        },
        activeActionPlan: {
          id: "plan_123",
          caseId: "case_123",
          status: "completed",
          summary: "Send email.",
          recommendedOutcome: "cancellation",
          primaryChannel: "email",
          fallbackChannel: null,
          automationConfidence: "high",
          requiresConsent: false,
          opsFallbackReason: null,
          createdAt: "2026-03-25T00:00:00.000Z",
          updatedAt: "2026-03-25T00:00:00.000Z"
        },
        activeDraft: {
          id: "draft_123",
          caseId: "case_123",
          strategyId: "strategy_123",
          status: "sent",
          subject: "Cancel",
          body: "Please cancel.",
          tone: "firm_polite",
          approvedAt: "2026-03-25T00:00:00.000Z",
          sentAt: "2026-03-25T00:00:00.000Z",
          createdAt: "2026-03-25T00:00:00.000Z",
          updatedAt: "2026-03-25T00:00:00.000Z"
        }
      }),
      null
    );

    expect(status.steps.at(-1)?.state).toBe("complete");
    expect(status.nextAction).toContain("Wait for merchant response");
  });
});
