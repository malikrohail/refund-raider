import { describe, expect, it } from "vitest";
import {
  browserAutomationToolDefinitions,
  elevenAgentToolDefinitions
} from "../../src/lib/contracts/agentTools";

describe("elevenAgentToolDefinitions contract", () => {
  it("exposes the documented agent tool surface in the expected order", () => {
    expect(elevenAgentToolDefinitions.map((tool) => tool.name)).toEqual([
      "get_intake_state",
      "update_intake_fields",
      "capture_user_problem",
      "connect_gmail",
      "search_gmail_messages",
      "select_gmail_message",
      "create_case",
      "lookup_policy_evidence",
      "summarize_eligibility",
      "create_refund_draft",
      "send_refund_email",
      "get_case_status",
      "build_action_plan",
      "request_user_consent",
      "execute_case_action",
      "schedule_follow_up",
      "firecrawl_extract",
      "firecrawl_get_extract_status",
      "firecrawl_start_crawl",
      "firecrawl_get_crawl_status"
    ]);
  });

  it("keeps the intake, eligibility, and send contracts explicit", () => {
    const getIntakeStateTool = elevenAgentToolDefinitions.find((tool) => tool.name === "get_intake_state");
    const updateIntakeTool = elevenAgentToolDefinitions.find((tool) => tool.name === "update_intake_fields");
    const captureProblemTool = elevenAgentToolDefinitions.find((tool) => tool.name === "capture_user_problem");
    const connectGmailTool = elevenAgentToolDefinitions.find((tool) => tool.name === "connect_gmail");
    const searchGmailTool = elevenAgentToolDefinitions.find((tool) => tool.name === "search_gmail_messages");
    const selectGmailTool = elevenAgentToolDefinitions.find((tool) => tool.name === "select_gmail_message");
    const createCaseTool = elevenAgentToolDefinitions.find((tool) => tool.name === "create_case");
    const lookupTool = elevenAgentToolDefinitions.find((tool) => tool.name === "lookup_policy_evidence");
    const summarizeTool = elevenAgentToolDefinitions.find((tool) => tool.name === "summarize_eligibility");
    const draftTool = elevenAgentToolDefinitions.find((tool) => tool.name === "create_refund_draft");
    const sendTool = elevenAgentToolDefinitions.find((tool) => tool.name === "send_refund_email");

    expect(getIntakeStateTool?.inputSchema.required).toEqual([]);
    expect(updateIntakeTool?.inputSchema.required).toEqual([]);
    expect(captureProblemTool?.inputSchema.required).toEqual(["rawText"]);
    expect(connectGmailTool?.inputSchema.required).toEqual([]);
    expect(searchGmailTool?.inputSchema.required).toEqual(["query"]);
    expect(selectGmailTool?.inputSchema.required).toEqual(["messageId"]);

    expect(createCaseTool?.inputSchema.required).toEqual([
      "merchantName",
      "issueSummary",
      "issueType",
      "desiredOutcome"
    ]);
    expect(createCaseTool?.inputSchema.properties).toMatchObject({
      merchantName: { type: "string" },
      merchantUrl: { type: "string" },
      issueSummary: { type: "string" },
      issueType: {
        type: "string",
        enum: [
          "damaged_item",
          "missing_item",
          "wrong_item",
          "late_delivery",
          "service_not_rendered",
          "subscription_cancellation",
          "other"
        ]
      },
      desiredOutcome: {
        type: "string",
        enum: ["full_refund", "partial_refund", "replacement", "refund_or_replacement"]
      },
      purchaseDate: { type: "string" },
      paymentMethod: {
        type: "string",
        enum: [
          "credit_card",
          "debit_card",
          "paypal",
          "apple_pay",
          "shop_pay",
          "other",
          "unknown"
        ]
      }
    });

    expect(lookupTool?.inputSchema.required).toEqual(["caseId"]);
    expect(lookupTool?.inputSchema.properties).toEqual({
      caseId: { type: "string" },
      forceRefresh: { type: "boolean" }
    });

    expect(summarizeTool?.inputSchema.required).toEqual(["caseId"]);
    expect(summarizeTool?.inputSchema.properties).toEqual({
      caseId: { type: "string" }
    });

    expect(draftTool?.inputSchema.required).toEqual(["caseId"]);
    expect(draftTool?.inputSchema.properties).toEqual({
      caseId: { type: "string" },
      tone: { type: "string", enum: ["firm_polite", "neutral", "escalation_ready"] }
    });

    expect(sendTool?.inputSchema.required).toEqual(["caseId", "draftId", "to"]);
    expect(sendTool?.inputSchema.properties).toMatchObject({
      caseId: { type: "string" },
      draftId: { type: "string" },
      to: {
        type: "array",
        items: { type: "string" }
      },
      ccUser: { type: "boolean" }
    });
  });

  it("keeps the action and follow-up tools explicit about identifiers", () => {
    const getStatusTool = elevenAgentToolDefinitions.find((tool) => tool.name === "get_case_status");
    const actionPlanTool = elevenAgentToolDefinitions.find((tool) => tool.name === "build_action_plan");
    const consentTool = elevenAgentToolDefinitions.find((tool) => tool.name === "request_user_consent");
    const executeTool = elevenAgentToolDefinitions.find((tool) => tool.name === "execute_case_action");
    const followUpTool = elevenAgentToolDefinitions.find((tool) => tool.name === "schedule_follow_up");
    const firecrawlExtractTool = elevenAgentToolDefinitions.find((tool) => tool.name === "firecrawl_extract");
    const firecrawlExtractStatusTool = elevenAgentToolDefinitions.find((tool) => tool.name === "firecrawl_get_extract_status");
    const firecrawlStartCrawlTool = elevenAgentToolDefinitions.find((tool) => tool.name === "firecrawl_start_crawl");
    const firecrawlCrawlStatusTool = elevenAgentToolDefinitions.find((tool) => tool.name === "firecrawl_get_crawl_status");

    expect(getStatusTool?.inputSchema.required).toEqual(["caseId"]);
    expect(actionPlanTool?.inputSchema.required).toEqual(["caseId"]);
    expect(consentTool?.inputSchema.required).toEqual(["actionId"]);
    expect(executeTool?.inputSchema.required).toEqual(["actionId"]);
    expect(followUpTool?.inputSchema.required).toEqual(["caseId"]);
    expect(followUpTool?.inputSchema.properties).toEqual({
      caseId: { type: "string" },
      title: { type: "string" }
    });
    expect(firecrawlExtractTool?.inputSchema.required).toEqual(["urls", "prompt"]);
    expect(firecrawlExtractStatusTool?.inputSchema.required).toEqual(["extractId"]);
    expect(firecrawlStartCrawlTool?.inputSchema.required).toEqual(["url"]);
    expect(firecrawlCrawlStatusTool?.inputSchema.required).toEqual(["crawlId"]);
  });

  it("exposes the browser automation tool surface for session bootstrap and command execution", () => {
    expect(browserAutomationToolDefinitions.map((tool) => tool.name)).toEqual([
      "start_browser_session",
      "browser_snapshot",
      "browser_navigate",
      "browser_click",
      "browser_type",
      "browser_scroll",
      "browser_wait_for_text",
      "browser_extract",
      "browser_press_key"
    ]);

    const startTool = browserAutomationToolDefinitions.find((tool) => tool.name === "start_browser_session");
    expect(startTool?.inputSchema.required).toEqual(["caseId"]);
  });
});
