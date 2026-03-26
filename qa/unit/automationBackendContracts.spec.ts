import { describe, expect, it } from "vitest";
import {
  browserExtensionHandshakeSchema,
  browserSnapshotSchema,
  completeBrowserCommandSchema,
  createAutomationSessionSchema,
  queueBrowserCommandSchema
} from "../../src/lib/validation/schemas";

describe("automation backend contracts", () => {
  it("accepts the browser session and browser command payloads used by the backend", () => {
    expect(createAutomationSessionSchema.parse({ caseId: "case_123" })).toEqual({
      caseId: "case_123"
    });

    expect(
      browserExtensionHandshakeSchema.parse({
        tabId: "tab_123",
        pageUrl: "https://support.example.com/returns",
        pageTitle: "Returns"
      })
    ).toEqual({
      tabId: "tab_123",
      pageUrl: "https://support.example.com/returns",
      pageTitle: "Returns"
    });

    expect(
      browserSnapshotSchema.parse({
        pageUrl: "https://support.example.com/returns",
        pageTitle: "Returns",
        visibleText: "Returns policy",
        domSummary: "Policy page with return instructions",
        screenshotDataUrl: "data:image/png;base64,abc123",
        metadata: { source: "browser_extension" }
      })
    ).toEqual({
      pageUrl: "https://support.example.com/returns",
      pageTitle: "Returns",
      visibleText: "Returns policy",
      domSummary: "Policy page with return instructions",
      screenshotDataUrl: "data:image/png;base64,abc123",
      metadata: { source: "browser_extension" }
    });

    expect(
      queueBrowserCommandSchema.parse({
        actionType: "navigate",
        description: "Open the merchant support page",
        targetUrl: "https://support.example.com/contact",
        metadata: { requestedBy: "agent" }
      })
    ).toEqual({
      actionType: "navigate",
      description: "Open the merchant support page",
      targetUrl: "https://support.example.com/contact",
      metadata: { requestedBy: "agent" }
    });

    expect(
      completeBrowserCommandSchema.parse({
        status: "completed",
        resultSummary: "Reached the support form",
        metadata: { durationMs: 1234 }
      })
    ).toEqual({
      status: "completed",
      resultSummary: "Reached the support form",
      metadata: { durationMs: 1234 }
    });
  });

  it("rejects malformed browser automation payloads at the edge", () => {
    expect(() => createAutomationSessionSchema.parse({ caseId: "" })).toThrow();
    expect(() => browserExtensionHandshakeSchema.parse({ pageUrl: "not-a-url" })).toThrow();
    expect(() => browserSnapshotSchema.parse({ pageUrl: "not-a-url" })).toThrow();
    expect(() => queueBrowserCommandSchema.parse({ actionType: "click" })).toThrow();
    expect(() => completeBrowserCommandSchema.parse({ status: "pending" as never })).toThrow();
  });

  it("keeps the browser action and completion enums locked down", () => {
    expect(queueBrowserCommandSchema.shape.actionType.options).toEqual([
      "click",
      "type",
      "navigate",
      "scroll",
      "wait_for_text",
      "extract",
      "press_key"
    ]);

    expect(completeBrowserCommandSchema.shape.status.options).toEqual(["completed", "failed"]);
  });
});
