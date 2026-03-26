import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

test.beforeEach(() => {
  rmSync(path.join(process.cwd(), ".data"), { recursive: true, force: true });
});

test("landing page foregrounds the refund wedge and intake CTA", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Talk to an agent that can fix refunds, cancellations, replacements, and billing fights."
    })
  ).toBeVisible();
  await expect(page.getByText("Firecrawl Search, ElevenLabs, Supabase, Resend.")).toBeVisible();
  const primaryCta = page.getByRole("link", { name: "Talk to Refund Raider" }).first();
  await expect(primaryCta).toHaveAttribute("href", "/cases/new");
  await primaryCta.click();
  await expect(page).toHaveURL("/cases/new");
});

test("user can complete the Refund Raider golden path", async ({ page }) => {
  test.setTimeout(120000);
  const intakeFilePath = path.join(process.cwd(), ".data", "e2e-intake.txt");
  mkdirSync(path.dirname(intakeFilePath), { recursive: true });
  writeFileSync(
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

  await page.goto("/cases/new");
  await page.getByTestId("proof-upload").setInputFiles(intakeFilePath);
  await page.getByTestId("autofill-case").click();
  await expect(page.getByTestId("merchant-name")).toHaveValue("Best Buy");
  await expect(page.getByTestId("purchase-date")).toHaveValue("2026-03-18");
  await expect(page.getByTestId("merchant-contact-email")).toHaveValue("support@bestbuy.com");
  await page.getByTestId("create-case").click();

  await expect(page).toHaveURL(/\/cases\/case_/, { timeout: 60000 });
  await expect(page.getByTestId("eligibility-card")).toContainText(/eligible|research/i);
  await expect(page.getByTestId("evidence-card").first()).toBeVisible();
  await page.getByTestId("agent-input").fill("When is my deadline?");
  await page.getByTestId("agent-send").click();
  await expect(page.getByText(/important deadline/i)).toBeVisible();

  await expect(page.getByTestId("draft-subject")).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("draft-body")).toContainText(/refund/i, { timeout: 20000 });
  await expect(page.getByTestId("merchant-email")).toHaveValue("support@bestbuy.com");

  await page.getByTestId("approve-draft").click();
  const sendRequest = page.waitForResponse((response) => {
    return response.url().includes("/api/v1/drafts/") && response.url().includes("/send");
  });
  await page.getByTestId("send-draft").click();
  const sendResponse = await sendRequest;
  expect(sendResponse.ok()).toBe(true);

  await expect(page.getByTestId("timeline-event").last()).toContainText(/email sent/i, { timeout: 20000 });
});

test("invalid case route shows the not-found page", async ({ page }) => {
  await page.goto("/cases/not-a-real-case");

  await expect(page.getByTestId("case-not-found")).toBeVisible();
});
