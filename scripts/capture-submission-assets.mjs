import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.CAPTURE_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = path.join(process.cwd(), "public", "submission-videos", "assets", "screens");
const intakeFilePath = path.join(process.cwd(), ".data", "submission-intake.txt");

mkdirSync(path.dirname(intakeFilePath), { recursive: true });
mkdirSync(outputDir, { recursive: true });

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

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

await page.goto(`${baseUrl}/cases/new`);
await page.getByTestId("proof-upload").setInputFiles(intakeFilePath);
await page.getByTestId("autofill-case").click();
await page.getByTestId("merchant-name").waitFor({ state: "visible" });
await page.getByTestId("merchant-name").evaluate((input) => input instanceof HTMLInputElement && input.value);
await page.screenshot({ path: path.join(outputDir, "01-intake.png"), fullPage: true });

await page.getByTestId("create-case").click();
await page.waitForURL(/\/cases\/case_/, { timeout: 60000 });
await page.getByTestId("eligibility-card").waitFor({ state: "visible" });
await page.screenshot({ path: path.join(outputDir, "02-overview.png"), fullPage: true });
await page.getByTestId("evidence-card").first().screenshot({
  path: path.join(outputDir, "02-evidence-card.png")
});

await page.getByTestId("agent-input").fill("When is my deadline?");
await page.getByTestId("agent-send").click();
await page.getByText(/important deadline/i).waitFor({ state: "visible", timeout: 30000 });
await page.screenshot({ path: path.join(outputDir, "03-agent.png"), fullPage: true });

await page.getByTestId("draft-body").waitFor({ state: "visible", timeout: 30000 });
await page.getByTestId("draft-body").scrollIntoViewIfNeeded();
await page.getByTestId("merchant-email").fill("support@bestbuy.com");
await page.screenshot({ path: path.join(outputDir, "04-draft.png"), fullPage: true });

await page.getByTestId("approve-draft").click();
await page.waitForFunction(() => {
  const button = document.querySelector('[data-testid="send-draft"]');
  return button instanceof HTMLButtonElement && !button.disabled;
});
await page.getByTestId("send-draft").click();
await page.getByTestId("timeline-event").last().waitFor({ state: "visible", timeout: 30000 });
await page.screenshot({ path: path.join(outputDir, "05-sent.png"), fullPage: true });

await browser.close();

console.log(`Captured submission assets into ${outputDir}`);
