import { rmSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createActionPlanForUser,
  approveActionRunForUser,
  executeActionRunForUser
} from "../../src/server/services/actionEngineService";
import {
  createArtifactForUser,
  createCaseForUser,
  createStrategyForUser,
  getCaseDetailForUser,
  startResearchForUser
} from "../../src/server/services/casesService";

const userId = "action-user";
const email = "action@refundraider.local";

beforeEach(() => {
  rmSync(path.join(process.cwd(), ".data"), { recursive: true, force: true });
});

describe("actionEngineService", () => {
  it("requests consent before executing the email action, then completes after approval", async () => {
    const createdCase = await createCaseForUser(userId, email, {
      merchantName: "Best Buy",
      merchantUrl: "https://www.bestbuy.com",
      issueSummary: "My headphones arrived damaged and support is ignoring me.",
      issueType: "damaged_item",
      desiredOutcome: "full_refund",
      purchaseDate: "2026-03-18",
      paymentMethod: "credit_card"
    });

    await createArtifactForUser(userId, createdCase.id, {
      kind: "receipt",
      fileName: "receipt.txt",
      mimeType: "text/plain",
      storagePath: "/tmp/receipt.txt",
      sourceText: "Order #12345 from support@bestbuy.com"
    });

    await startResearchForUser(userId, createdCase.id);
    await createStrategyForUser(userId, createdCase.id);
    await createActionPlanForUser(userId, createdCase.id);

    const plannedDetail = await getCaseDetailForUser(userId, createdCase.id);
    const primaryAction = plannedDetail.actionRuns[0];

    expect(primaryAction).toBeDefined();

    const pendingResult = await executeActionRunForUser(userId, email, primaryAction.id);
    expect(pendingResult.actionRun.status).toBe("waiting_for_consent");
    expect(pendingResult.approval?.status).toBe("pending");

    const approvedResult = await approveActionRunForUser(userId, primaryAction.id);
    expect(approvedResult.approval.status).toBe("approved");

    const executionResult = await executeActionRunForUser(userId, email, primaryAction.id);
    expect(executionResult.actionRun.status).toBe("completed");

    const finalDetail = await getCaseDetailForUser(userId, createdCase.id);
    expect(finalDetail.case.status).toBe("waiting");
    expect(finalDetail.timeline.some((event) => event.actionType === "email_sent")).toBe(true);
  });
});
