import fs from "node:fs";
import path from "node:path";
import { chromium, expect } from "@playwright/test";

const baseUrl = process.env.SMOKE_BASE_URL || "https://refund-raider.vercel.app";
const outputDir = path.join(process.cwd(), ".data");
const intakeFilePath = path.join(outputDir, "prod-e2e-intake.txt");

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  intakeFilePath,
  [
    "From: Best Buy Support <support@bestbuy.com>",
    "Subject: Your Best Buy order",
    "Order placed on March 18, 2026",
    "https://www.bestbuy.com",
    "My headphones arrived cracked and the left ear cup is broken.",
    "Please refund me."
  ].join("\n"),
  "utf8"
);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const diagnostics = [];

page.on("console", (message) => {
  diagnostics.push(`console:${message.type()}:${message.text()}`);
});
page.on("pageerror", (error) => {
  diagnostics.push(`pageerror:${error.message}`);
});

async function waitForCaseState(caseId, predicate, description, timeoutMs = 60_000) {
  const startedAt = Date.now();
  let lastStatus = "unknown";

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/v1/cases/${caseId}`);
      lastStatus = String(response.status);

      if (response.ok) {
        const body = await response.json();
        const caseDetail = body.data?.caseDetail;
        if (caseDetail && predicate(caseDetail)) {
          return caseDetail;
        }
      }
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  throw new Error(`Timed out waiting for ${description}. Last observed status: ${lastStatus}`);
}

try {
  await page.goto(`${baseUrl}/cases/new?auth=error`, {
    waitUntil: "networkidle",
    timeout: 60_000
  });
  await expect(page.getByText(/Google sign-in did not complete/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Sign in with Google" })).toBeVisible({
    timeout: 15_000
  });

  await page.goto(`${baseUrl}/cases/new`, {
    waitUntil: "networkidle",
    timeout: 60_000
  });
  await page.getByTestId("proof-upload").setInputFiles(intakeFilePath);
  await page.getByTestId("autofill-case").click();
  await expect(page.getByTestId("merchant-name")).toHaveValue("Best Buy", { timeout: 20_000 });
  await expect(page.getByTestId("purchase-date")).toHaveValue("2026-03-18", { timeout: 20_000 });
  await expect(page.getByTestId("merchant-contact-email")).toHaveValue("support@bestbuy.com", {
    timeout: 20_000
  });

  await page.getByTestId("create-case").click();
  await expect(page).toHaveURL(/\/cases\/case_/, { timeout: 90_000 });
  const caseId = page.url().split("/cases/")[1];
  if (!caseId) {
    throw new Error("Could not determine the case id from the live case URL.");
  }
  await expect(page.getByTestId("eligibility-card")).toContainText(/eligible|research/i, {
    timeout: 90_000
  });
  await expect(page.getByTestId("evidence-card").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("draft-subject")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("draft-body")).toContainText(/refund/i, { timeout: 30_000 });

  // Use a reserved documentation domain so the live test never targets a real merchant inbox.
  await page.getByTestId("merchant-email").fill("nobody@example.com");
  const approveResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/drafts/") &&
      response.url().includes("/approve") &&
      response.request().method() === "POST",
    { timeout: 30_000 }
  );
  await page.getByTestId("approve-draft").click();
  const approveResponse = await approveResponsePromise;
  if (!approveResponse.ok()) {
    throw new Error(`Approve route failed with status ${approveResponse.status()}`);
  }

  await waitForCaseState(
    caseId,
    (caseDetail) =>
      caseDetail.activeDraft?.status === "approved" &&
      Array.isArray(caseDetail.timeline) &&
      caseDetail.timeline.some((event) => event.actionType === "draft_approved"),
    "the approved draft state"
  );

  const sendResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/drafts/") &&
      response.url().includes("/send") &&
      response.request().method() === "POST",
    { timeout: 30_000 }
  );
  await page.getByTestId("send-draft").click();
  const sendResponse = await sendResponsePromise;
  if (!sendResponse.ok()) {
    throw new Error(`Send route failed with status ${sendResponse.status()}`);
  }

  const finalCaseDetail = await waitForCaseState(
    caseId,
    (caseDetail) =>
      caseDetail.case?.status === "waiting" &&
      caseDetail.activeDraft?.status === "sent" &&
      Array.isArray(caseDetail.timeline) &&
      caseDetail.timeline.some((event) => event.actionType === "email_sent"),
    "the sent case state"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        finalUrl: page.url(),
        caseId,
        authBannerVerified: true,
        approveStatus: approveResponse.status(),
        sendStatus: sendResponse.status(),
        finalCaseStatus: finalCaseDetail.case.status,
        finalDraftStatus: finalCaseDetail.activeDraft.status
      },
      null,
      2
    )
  );
} catch (error) {
  const screenshotPath = path.join(outputDir, "prod-e2e-failure.png");
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  console.error(
    JSON.stringify(
      {
        ok: false,
        baseUrl,
        error: error instanceof Error ? error.message : String(error),
        url: page.url(),
        screenshotPath,
        diagnostics: diagnostics.slice(-20)
      },
      null,
      2
    )
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
