import { chromium, expect } from "@playwright/test";

const baseUrl = process.env.SMOKE_BASE_URL || "https://refund-raider.vercel.app";

const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream"
  ]
});

const context = await browser.newContext({
  permissions: ["microphone"]
});
const page = await context.newPage();
const routeEvents = [];
const websocketUrls = [];
const consoleErrors = [];

page.on("response", (response) => {
  if (response.url().includes("/api/v1/agent/intake-session")) {
    routeEvents.push({
      url: response.url(),
      status: response.status()
    });
  }
});

page.on("websocket", (webSocket) => {
  websocketUrls.push(webSocket.url());
});

page.on("console", (message) => {
  if (message.type() === "error") {
    consoleErrors.push(message.text());
  }
});

try {
  await page.goto(`${baseUrl}/cases/new`, {
    waitUntil: "networkidle",
    timeout: 60_000
  });

  await page.getByRole("button", { name: "Start voice intake" }).click();
  await expect(page.getByRole("button", { name: "Voice intake live" })).toBeVisible({
    timeout: 20_000
  });

  const bodyText = await page.locator("body").innerText();
  if (bodyText.includes("Typed fallback is ready below.")) {
    throw new Error("Voice intake fell back to typed mode.");
  }

  if (consoleErrors.length > 0) {
    throw new Error(`Console errors present during voice smoke: ${consoleErrors.join(" | ")}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        routeEvents,
        websocketUrls
      },
      null,
      2
    )
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        baseUrl,
        error: error instanceof Error ? error.message : String(error),
        routeEvents,
        websocketUrls,
        consoleErrors
      },
      null,
      2
    )
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
